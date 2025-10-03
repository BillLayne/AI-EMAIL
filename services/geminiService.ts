import { EmailFormData, CancellationData, Agent, Opportunity, VideoOperation } from '../types';

// API helper for JSON payloads
const apiFetch = async (action: string, payload: any) => {
    const response = await fetch('/api/gemini', { // This endpoint will be a Netlify Function
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for action ${action}:`, errorText);
        throw new Error(`API call failed: ${response.status} ${errorText}`);
    }
    return response.json();
};

// API helper for file uploads
const apiFetchWithFile = async (action: string, payload: any, file: File) => {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('payload', JSON.stringify(payload));
    formData.append('file', file, file.name);

    const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
    });
     if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for action ${action}:`, errorText);
        throw new Error(`API call failed: ${response.status} ${errorText}`);
    }
    return response.json();
};

export const generateSubjectLines = async (formData: EmailFormData): Promise<string[]> => {
  try {
    const data = await apiFetch('generateSubjectLines', { formData });
    return data.result || [];
  } catch (error) {
    console.error("Error generating subject lines:", error);
    return [];
  }
};

export const generatePreheaders = async (formData: EmailFormData): Promise<string[]> => {
  try {
    const data = await apiFetch('generatePreheaders', { formData });
    return data.result || [];
  } catch (error) {
    console.error("Error generating preheaders:", error);
    return [];
  }
};

export const generateEmailBody = async (formData: EmailFormData, agent: Agent): Promise<string> => {
  try {
    const data = await apiFetch('generateEmailBody', { formData, agent });
    return data.result || "<p>Error generating content. Please try again.</p>";
  } catch (error) {
    console.error("Error generating email body:", error);
    return "<p>Error generating content. Please try again.</p>";
  }
};

export const generateHomeQuoteProse = async (formData: EmailFormData): Promise<{ greeting: string, intro: string, ctaText: string } | null> => {
  try {
    const data = await apiFetch('generateHomeQuoteProse', { formData });
    return data.result || null;
  } catch (error) {
    console.error("Error generating home quote prose:", error);
    return null;
  }
};

export const generateAutoQuoteProse = async (formData: EmailFormData): Promise<{ greeting: string, intro: string, ctaText: string } | null> => {
  try {
    const data = await apiFetch('generateAutoQuoteProse', { formData });
    return data.result || null;
  } catch (error) {
    console.error("Error generating auto quote prose:", error);
    return null;
  }
};

export const generateHeroImage = async (prompt: string): Promise<string | null> => {
  if (!prompt) return null;
  try {
    const data = await apiFetch('generateHeroImage', { prompt });
    return data.result || null;
  } catch (error) {
    console.error("Error generating hero image:", error);
    return null;
  }
};

export const generateVideo = async (prompt: string, onProgress: (status: string) => void): Promise<string | null> => {
    if (!prompt) return null;
    try {
        onProgress("Initiating video generation...");
        const initialData = await apiFetch('generateVideo', { prompt });
        let operation: VideoOperation = initialData.result;

        if (!operation || !operation.name) {
            throw new Error("Failed to start video generation.");
        }

        onProgress("Video is in the queue. This may take a few minutes...");
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            onProgress("AI is rendering your video...");
            const pollData = await apiFetch('getVideosOperation', { operation });
            operation = pollData.result;
        }
        
        onProgress("Processing complete!");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (downloadLink) {
            return downloadLink; // Just return the URI
        } else {
            console.error("Video generation finished but no download link found.", operation);
            return null;
        }
    } catch (error) {
        console.error("Error generating video:", error);
        onProgress("Error during video generation.");
        return null;
    }
};

export const generatePromptFromPdf = async (pdfFile: File): Promise<{ policyHolder: string; recipientName: string; customPrompt: string; } | null> => {
    try {
        const data = await apiFetchWithFile('generatePromptFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error generating prompt from PDF:", error);
        return null;
    }
};

export const extractQuoteFromPdf = async (pdfFile: File): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetchWithFile('extractQuoteFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting quote from PDF:", error);
        return null;
    }
};

export const extractAutoQuoteFromPdf = async (pdfFile: File): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetchWithFile('extractAutoQuoteFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting auto quote from PDF:", error);
        return null;
    }
};

export const extractRenewalInfoFromPdf = async (pdfFile: File): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetchWithFile('extractRenewalInfoFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting renewal info from PDF:", error);
        return null;
    }
};

export const extractNewPolicyInfoFromPdf = async (pdfFile: File): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetchWithFile('extractNewPolicyInfoFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting new policy info from PDF:", error);
        return null;
    }
};

export const extractCancellationsFromPdf = async (pdfFile: File): Promise<CancellationData[] | null> => {
    try {
        const data = await apiFetchWithFile('extractCancellationsFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting cancellations from PDF:", error);
        return null;
    }
};

export const extractReceiptInfoFromPdf = async (pdfFile: File): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetchWithFile('extractReceiptInfoFromPdf', {}, pdfFile);
        return data.result || null;
    } catch (error) {
        console.error("Error extracting receipt info from PDF:", error);
        return null;
    }
};

export const extractReceiptInfoFromText = async (text: string): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetch('extractReceiptInfoFromText', { text });
        return data.result || null;
    } catch (error) {
        console.error("Error extracting receipt info from text:", error);
        return null;
    }
};

export const extractChangeInfoFromText = async (text: string): Promise<Partial<EmailFormData> | null> => {
    try {
        const data = await apiFetch('extractChangeInfoFromText', { text });
        return data.result || null;
    } catch (error) {
        console.error("Error extracting change info from text:", error);
        return null;
    }
};

export const generateOpportunities = async (formData: EmailFormData): Promise<Opportunity[]> => {
    try {
        const data = await apiFetch('generateOpportunities', { formData });
        return data.result || [];
    } catch (error)
    {
        console.error("Error generating opportunities:", error);
        return [];
    }
};
  
export const generateRateChangeExplanation = async (previousPremium: string, newPremium: string): Promise<string> => {
    try {
        const data = await apiFetch('generateRateChangeExplanation', { previousPremium, newPremium });
        return data.result || "We understand that seeing a premium increase can be frustrating. Rates across the industry are being adjusted to account for factors like the rising costs of labor and materials for repairs. We've ensured your policy continues to provide the best protection for your investment. Please feel free to call us if you'd like to review your coverage options.";
    } catch (error) {
        console.error("Error generating rate change explanation:", error);
        return "We understand that seeing a premium increase can be frustrating. Rates across the industry are being adjusted to account for factors like the rising costs of labor and materials for repairs. We've ensured your policy continues to provide the best protection for your investment. Please feel free to call us if you'd like to review your coverage options.";
    }
};
