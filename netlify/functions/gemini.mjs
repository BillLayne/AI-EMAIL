import { GoogleGenerativeAI } from '@google/generative-ai';
import multipart from 'lambda-multipart-parser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    let action, payload, file;

    // Check if it's multipart (file upload)
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const parsed = await multipart.parse(event);
      action = parsed.action;
      payload = JSON.parse(parsed.payload || '{}');

      // lambda-multipart-parser returns files in a 'files' array or 'file' property
      const uploadedFile = parsed.file || (parsed.files && parsed.files[0]);

      if (uploadedFile) {
        file = {
          content: uploadedFile.content || uploadedFile,
          contentType: uploadedFile.contentType || uploadedFile.type || 'application/pdf',
          filename: uploadedFile.filename || uploadedFile.name || 'document.pdf'
        };
      }
    } else {
      const body = JSON.parse(event.body);
      action = body.action;
      payload = body.payload || {};
    }

    let result;

    switch (action) {
      case 'generateSubjectLines':
        result = await generateSubjectLines(payload.formData);
        break;
      case 'generatePreheaders':
        result = await generatePreheaders(payload.formData);
        break;
      case 'generateEmailBody':
        result = await generateEmailBody(payload.formData, payload.agent);
        break;
      case 'generateHomeQuoteProse':
        result = await generateHomeQuoteProse(payload.formData);
        break;
      case 'generateAutoQuoteProse':
        result = await generateAutoQuoteProse(payload.formData);
        break;
      case 'generateHeroImage':
        result = await generateHeroImage(payload.prompt);
        break;
      case 'generateVideo':
        result = await generateVideo(payload.prompt);
        break;
      case 'getVideosOperation':
        result = await getVideosOperation(payload.operation);
        break;
      case 'generatePromptFromPdf':
        result = await generatePromptFromPdf(file);
        break;
      case 'extractQuoteFromPdf':
        result = await extractQuoteFromPdf(file);
        break;
      case 'extractAutoQuoteFromPdf':
        result = await extractAutoQuoteFromPdf(file);
        break;
      case 'extractRenewalInfoFromPdf':
        result = await extractRenewalInfoFromPdf(file);
        break;
      case 'extractNewPolicyInfoFromPdf':
        result = await extractNewPolicyInfoFromPdf(file);
        break;
      case 'extractCancellationsFromPdf':
        result = await extractCancellationsFromPdf(file);
        break;
      case 'extractReceiptInfoFromPdf':
        result = await extractReceiptInfoFromPdf(file);
        break;
      case 'extractReceiptInfoFromText':
        result = await extractReceiptInfoFromText(payload.text);
        break;
      case 'extractChangeInfoFromText':
        result = await extractChangeInfoFromText(payload.text);
        break;
      case 'generateOpportunities':
        result = await generateOpportunities(payload.formData);
        break;
      case 'generateRateChangeExplanation':
        result = await generateRateChangeExplanation(payload.previousPremium, payload.newPremium);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Helper function to generate text
async function generateText(prompt, systemInstruction) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Helper function to validate and prepare file for Gemini
function prepareFileForGemini(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  if (!file.content) {
    throw new Error('File content is missing');
  }

  return {
    inlineData: {
      data: file.content.toString('base64'),
      mimeType: file.contentType || 'application/pdf'
    }
  };
}

// Helper function to parse JSON from AI response
function parseJsonFromText(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }
  throw new Error('No valid JSON found in response');
}

// Helper function to extract HTML from AI response and remove explanatory text
function extractHtmlFromResponse(text) {
  // Try to find HTML in code blocks first
  const htmlBlockMatch = text.match(/```html\s*([\s\S]*?)\s*```/);
  if (htmlBlockMatch) {
    return htmlBlockMatch[1].trim();
  }

  // Try to find complete HTML document (from <!DOCTYPE or <html> to </html>)
  const htmlDocMatch = text.match(/(?:<!DOCTYPE[\s\S]*?)?<html[\s\S]*?<\/html>/i);
  if (htmlDocMatch) {
    return htmlDocMatch[0].trim();
  }

  // Try to find content starting with common HTML email patterns
  const tableMatch = text.match(/(<table[\s\S]*?<\/table>)/i);
  if (tableMatch) {
    return tableMatch[1].trim();
  }

  // If no structured HTML found, remove common AI explanation patterns
  let cleaned = text;

  // Remove markdown code block markers
  cleaned = cleaned.replace(/```html\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Remove lines that start with * (bullet points - likely explanations)
  cleaned = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('*') &&
           !trimmed.startsWith('#') &&
           !trimmed.toLowerCase().startsWith('key improvements') &&
           !trimmed.toLowerCase().startsWith('before sending') &&
           !trimmed.toLowerCase().startsWith('important:') &&
           !trimmed.toLowerCase().includes('remember to set');
  }).join('\n');

  // Remove duplicate title headings at the start (e.g., <h1>Auto Insurance Verification</h1>)
  // This prevents Gmail from showing the title twice
  cleaned = cleaned.replace(/^\s*<h[1-3][^>]*>[^<]*(?:verification|documentation|quote|notice|receipt|welcome|renewal)[^<]*<\/h[1-3]>\s*/i, '');

  return cleaned.trim();
}

async function generateSubjectLines(formData) {
  const prompt = `Generate 3 compelling email subject lines for an insurance email with these details:
Campaign: ${formData.emailCampaign}
Recipient: ${formData.recipientName}
${formData.customPrompt ? `Additional context: ${formData.customPrompt}` : ''}

Return as JSON array: ["subject1", "subject2", "subject3"]`;

  const text = await generateText(prompt, 'You are an expert insurance marketing copywriter.');
  return parseJsonFromText(text);
}

async function generatePreheaders(formData) {
  const prompt = `Generate 3 preheader texts for an insurance email with these details:
Campaign: ${formData.emailCampaign}
Recipient: ${formData.recipientName}
${formData.customPrompt ? `Additional context: ${formData.customPrompt}` : ''}

Return as JSON array: ["preheader1", "preheader2", "preheader3"]`;

  const text = await generateText(prompt, 'You are an expert insurance marketing copywriter.');
  return parseJsonFromText(text);
}

async function generateEmailBody(formData, agent) {
  const prompt = `Generate ONLY the HTML email body content for:
Campaign: ${formData.emailCampaign}
Recipient: ${formData.recipientName}
Agent: ${agent.name} (${agent.email}, ${agent.phone})
${formData.customPrompt ? `Custom instructions: ${formData.customPrompt}` : ''}

IMPORTANT FORMATTING RULES:
1. Return ONLY the HTML code without any explanations, comments, or instructions
2. Do NOT include a subject line or title heading at the top (like <h1>Subject</h1>)
3. Start directly with the greeting or first paragraph
4. Do not include phrases like "Key improvements" or "Before sending"
5. Just pure HTML email body content`;

  const rawResponse = await generateText(prompt, 'You are an expert insurance email copywriter. Generate ONLY pure HTML code without any explanatory text or comments. Do not include a title/subject heading since that will be handled separately.');
  return extractHtmlFromResponse(rawResponse);
}

async function generateHomeQuoteProse(formData) {
  const prompt = `Generate personalized prose for a home insurance quote email:
Recipient: ${formData.recipientName}
${formData.customPrompt ? `Context: ${formData.customPrompt}` : ''}

Return JSON with: { "greeting": "...", "intro": "...", "ctaText": "..." }`;

  const text = await generateText(prompt, 'You are an expert insurance copywriter.');
  return parseJsonFromText(text);
}

async function generateAutoQuoteProse(formData) {
  const prompt = `Generate personalized prose for an auto insurance quote email:
Recipient: ${formData.recipientName}
${formData.customPrompt ? `Context: ${formData.customPrompt}` : ''}

Return JSON with: { "greeting": "...", "intro": "...", "ctaText": "..." }`;

  const text = await generateText(prompt, 'You are an expert insurance copywriter.');
  return parseJsonFromText(text);
}

async function generateHeroImage(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  // Note: Gemini doesn't natively generate images, return placeholder
  return `https://via.placeholder.com/600x300?text=${encodeURIComponent(prompt)}`;
}

async function generateVideo(prompt) {
  // Video generation would require additional setup
  // For now, return a mock operation
  return {
    name: 'operations/video-' + Date.now(),
    done: false
  };
}

async function getVideosOperation(operation) {
  // Mock polling response
  return {
    ...operation,
    done: true,
    response: {
      generatedVideos: [{
        video: {
          uri: 'https://example.com/mock-video.mp4'
        }
      }]
    }
  };
}

async function generatePromptFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract policy holder name, recipient name, and create a brief summary prompt from this PDF. Return JSON: {"policyHolder": "...", "recipientName": "...", "customPrompt": "..."}';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractQuoteFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract home insurance quote information from this PDF. Return JSON with fields like: {"recipientName": "...", "policyNumber": "...", "premium": "...", etc}';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractAutoQuoteFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract auto insurance quote information from this PDF. Return JSON with relevant fields.';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractRenewalInfoFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract renewal information from this insurance PDF. Return JSON with relevant fields.';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractNewPolicyInfoFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract new policy information from this insurance PDF. Return JSON with relevant fields.';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractCancellationsFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract cancellation data from this PDF. Return JSON array of cancellations.';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractReceiptInfoFromPdf(file) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const filePart = prepareFileForGemini(file);

  const prompt = 'Extract receipt information from this PDF. Return JSON with relevant fields.';

  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  return parseJsonFromText(text);
}

async function extractReceiptInfoFromText(text) {
  const prompt = `Extract receipt information from this text: "${text}". Return JSON with relevant fields.`;
  const response = await generateText(prompt, 'You are a data extraction specialist.');
  return parseJsonFromText(response);
}

async function extractChangeInfoFromText(text) {
  const prompt = `Extract policy change information from this text: "${text}". Return JSON with relevant fields.`;
  const response = await generateText(prompt, 'You are a data extraction specialist.');
  return parseJsonFromText(response);
}

async function generateOpportunities(formData) {
  const prompt = `Based on this customer data, suggest cross-sell/upsell opportunities:
${JSON.stringify(formData)}

Return JSON array of opportunities: [{"title": "...", "description": "...", "priority": "high/medium/low"}]`;

  const text = await generateText(prompt, 'You are an insurance sales specialist.');
  return parseJsonFromText(text);
}

async function generateRateChangeExplanation(previousPremium, newPremium) {
  const prompt = `Explain a premium change from $${previousPremium} to $${newPremium} in a friendly, understanding way.

IMPORTANT: Return ONLY the explanation text that will be shown to the customer. Do not include any meta-commentary, suggestions, or notes to me. Just the customer-facing explanation.`;

  const rawResponse = await generateText(prompt, 'You are a customer service specialist for an insurance company. Provide only the customer-facing text without any additional commentary.');

  // Remove any explanatory notes that might start with phrases like "Here's", "Note:", etc.
  let cleaned = rawResponse.trim();

  // Remove common AI meta-commentary patterns
  cleaned = cleaned.split('\n').filter(line => {
    const lower = line.trim().toLowerCase();
    return !lower.startsWith('here\'s') &&
           !lower.startsWith('note:') &&
           !lower.startsWith('tip:') &&
           !lower.startsWith('suggestion:') &&
           !lower.startsWith('you could also') &&
           !lower.startsWith('alternatively');
  }).join('\n').trim();

  return cleaned;
}
