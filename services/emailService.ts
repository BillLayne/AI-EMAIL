import { AGENCY_DETAILS, EMAIL_STYLES } from '../constants';
import { EmailFormData, Agent } from '../types';

interface AssembleOptions {
  includeFacebookBanner: boolean;
  includeHero: boolean;
  heroUrl: string;
  heroAlt: string;
  heroHref: string;
}

function buildHeroRow(url: string, alt: string, href: string): string {
    if (!url) return '';
    // Use the responsive-img class and simplify inline styles. The width="600" is for Outlook.
    const img = `<img src="${url}" alt="${alt || 'Hero image'}" width="600" border="0" style="display: block; width: 100%; max-width: 600px; height: auto;" class="responsive-img">`;
    const inner = href && /^https?:/i.test(href) ? `<a href="${href}" target="_blank" style="text-decoration:none;color:inherit">${img}</a>` : img;
    // Removed the background color from the TD as it's not needed if the image fills the container.
    return `<tr><td style="padding:0;text-align:center;">${inner}</td></tr>`;
}

function applyUtmToHtml(html: string, formData: EmailFormData): string {
  if (!formData.enableUtm) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || !/^https?:/i.test(href)) return;
      try {
        const url = new URL(href);
        if (formData.utmSource) url.searchParams.set('utm_source', formData.utmSource);
        if (formData.utmMedium) url.searchParams.set('utm_medium', formData.utmMedium);
        const campaign = formData.utmCampaign || (formData.documentType?.replace(/\s/g, '_').toLowerCase() || 'email') + '-' + new Date().toISOString().slice(0, 10);
        url.searchParams.set('utm_campaign', campaign);
        if (formData.utmContent) url.searchParams.set('utm_content', formData.utmContent);
        a.setAttribute('href', url.toString());
      } catch (e) {
        // Ignore invalid URLs
      }
    });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  } catch (e) {
    console.error("Error applying UTM parameters:", e);
    return html;
  }
}

export function assembleEmailHtml(
  subject: string,
  preheader: string,
  bodyHtml: string,
  formData: EmailFormData,
  agent: Agent
): string {

  const options: AssembleOptions = {
    includeFacebookBanner: formData.includeFacebookBanner,
    includeHero: !!formData.heroUrl && (/^https?:/i.test(formData.heroUrl) || /^data:image/i.test(formData.heroUrl)),
    heroUrl: formData.heroUrl,
    heroAlt: formData.heroAlt,
    heroHref: formData.heroLink,
  };

  const agentMailtoLink = `mailto:${agent.email}`;

  const finalHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>${subject}</title>
<style>
html,body{margin:0 auto!important;padding:0!important;height:100%!important;width:100%!important;background:${EMAIL_STYLES.backgroundColor}}
*{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}
div[style*="margin: 16px 0"]{margin:0!important}
table,td{mso-table-lspace:0pt!important;mso-table-rspace:0pt!important}table{border-spacing:0!important;border-collapse:collapse!important;table-layout:fixed!important;margin:0 auto!important}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
a{text-decoration:none}
.apple-link a{color:inherit!important;font-family:inherit!important;font-size:inherit!important;font-weight:inherit!important;line-height:inherit!important;text-decoration:none!important}
.gmail-button{background:${EMAIL_STYLES.accentColor};border-radius:8px;color:#0b2545;display:inline-block;font-family:${EMAIL_STYLES.fontFamily};font-size:16px;font-weight:800;line-height:24px;padding:12px 24px;text-align:center;text-decoration:none;width:auto!important;max-width:100%}
:root{color-scheme:light dark; supported-color-schemes:light dark}
@media (prefers-color-scheme: dark){
 body, .email-bg{background:${EMAIL_STYLES.dark.background}!important}
 .content-container{background:${EMAIL_STYLES.dark.containerBackground}!important}
 .main-text,h1,h2,h3,h4,h5,h6,p,li,td:not(.ignore-dark),span:not(.ignore-dark),strong{color:${EMAIL_STYLES.dark.text}!important}
 .light-text,.footer-text{color:${EMAIL_STYLES.dark.lightText}!important}
 .darkmode-primary-color, a[href^="tel"], a[href^="mailto"]{color:${EMAIL_STYLES.dark.primaryLink}!important}
 .quote-box,.info-box{background:${EMAIL_STYLES.dark.quoteBoxBg}!important;border-color:${EMAIL_STYLES.dark.quoteBoxBorder}!important}
 .gmail-button{background:${EMAIL_STYLES.accentColor}!important;color:#0b2545!important;box-shadow:0 2px 8px rgba(26,95,122,.4)!important}
}
[data-ogsc] body,[data-ogsc] .email-bg{background:${EMAIL_STYLES.dark.background}!important}
[data-ogsc] .content-container{background:${EMAIL_STYLES.dark.containerBackground}!important}
[data-ogsc] .main-text,[data-ogsc] h1,[data-ogsc] h2,[data-ogsc] h3,[data-ogsc] h4,[data-ogsc] h5,[data-ogsc] h6,[data-ogsc] p,[data-ogsc] li,[data-ogsc] td:not(.ignore-dark),[data-ogsc] span:not(.ignore-dark),[data-ogsc] strong{color:${EMAIL_STYLES.dark.text}!important}
[data-ogsc] .light-text,.footer-text{color:${EMAIL_STYLES.dark.lightText}!important}
[data-ogsc] .darkmode-primary-color,[data-ogsc] a[href^="tel"],[data-ogsc] a[href^="mailto"]{color:${EMAIL_STYLES.dark.primaryLink}!important}
@media screen and (max-width:600px){
 .email-container{width:100%!important;margin:auto!important}
 h1{font-size:24px!important}
 .content-padding{padding:20px!important}
 .responsive-img{width:100%!important;height:auto!important}
}
/* Dark Mode Preview Simulation */
.dark-mode-preview, .dark-mode-preview > center, .dark-mode-preview .email-bg { background-color: ${EMAIL_STYLES.dark.background} !important; }
.dark-mode-preview .content-container { background-color: ${EMAIL_STYLES.dark.containerBackground} !important; }
.dark-mode-preview .main-text, .dark-mode-preview h1, .dark-mode-preview h2, .dark-mode-preview h3, .dark-mode-preview p, .dark-mode-preview li, .dark-mode-preview strong { color: ${EMAIL_STYLES.dark.text} !important; }
.dark-mode-preview .footer-text, .dark-mode-preview .light-text { color: ${EMAIL_STYLES.dark.lightText} !important; }
.dark-mode-preview .darkmode-primary-color, .dark-mode-preview a[href^="tel"], .dark-mode-preview a[href^="mailto"] { color: ${EMAIL_STYLES.dark.primaryLink} !important; }
</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: ${EMAIL_STYLES.backgroundColor};" class="email-bg">
<center style="width: 100%; background-color: ${EMAIL_STYLES.backgroundColor};" class="email-bg">
<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
  ${preheader}&zwnj;&nbsp;&#847;
</div>
<div style="max-width: 600px; margin: 24px auto;" class="email-container">
<table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto; background:${EMAIL_STYLES.containerBackground}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <tr><td style="background:linear-gradient(135deg, ${EMAIL_STYLES.primaryColor}, ${EMAIL_STYLES.secondaryColor}); padding: 38px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 28px; line-height: 1.2; color: #ffffff; font-weight: 800;">${AGENCY_DETAILS.name}</h1>
    <p style="margin: 8px 0 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 16px; color: #ffffff; opacity: .92;">${AGENCY_DETAILS.tagline}</p>
  </td></tr>
  ${options.includeHero ? buildHeroRow(options.heroUrl, options.heroAlt, options.heroHref) : ''}
  <tr><td style="padding: 34px 30px 38px; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 16px; line-height: 1.6; color: ${EMAIL_STYLES.textColor}; text-align: left;" class="content-container main-text content-padding">
    ${bodyHtml}
  </td></tr>
  ${options.includeFacebookBanner ? `<tr><td style="padding: 0; background-color: #ffffff; text-align: center;">
    <a href="${AGENCY_DETAILS.facebookUrl}" target="_blank" style="display: block;">
      <img src="https://i.imgur.com/bpM4lpc.jpg?2" alt="Like Us on Facebook" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0; border-radius: 0 0 12px 12px;" width="600">
    </a></td></tr>` : ''}
  <tr><td style="background-color: ${EMAIL_STYLES.backgroundColor}; padding: 26px 22px; text-align: center; border-top: 1px solid #e2e8f0;" class="email-bg">
    <p style="margin: 0 0 8px; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 16px; color: ${EMAIL_STYLES.textColor}; font-weight: 800;" class="main-text">${agent.name}</p>
    <p style="margin: 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 14px; color: ${EMAIL_STYLES.lightTextColor};" class="footer-text apple-link">${AGENCY_DETAILS.address}</p>
    <p style="margin: 8px 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 14px; color: ${EMAIL_STYLES.lightTextColor};" class="footer-text">
      <a href="${AGENCY_DETAILS.phoneLink}" style="color: ${EMAIL_STYLES.primaryColor}; font-weight: 800; margin: 0 8px;" class="darkmode-primary-color">${agent.phone}</a> |
      <a href="${agentMailtoLink}" style="color: ${EMAIL_STYLES.primaryColor}; font-weight: 800; margin: 0 8px;" class="darkmode-primary-color">${agent.email}</a>
    </p>
    <p style="margin: 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 14px; color: ${EMAIL_STYLES.lightTextColor};" class="footer-text">
      <a href="${AGENCY_DETAILS.website}" target="_blank" rel="noopener" style="color: ${EMAIL_STYLES.primaryColor}; font-weight: 800;" class="darkmode-primary-color">${AGENCY_DETAILS.website.replace(/^https?:\/\//, '')}</a>
    </p>
    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 16px auto 0;">
      <tr>
        <td style="padding: 0 8px;">
          <a href="${AGENCY_DETAILS.facebookUrl}" target="_blank">
            <img src="https://raw.githubusercontent.com/BillLayne/bill-layne-images/5657f7d5b50febe47431864b103e9823806f6d13/logos/facebook%20logo.webp" width="36" height="36" alt="Facebook" style="display: block; border: 0;">
          </a>
        </td>
         <td style="padding: 0 8px;">
            <a href="${AGENCY_DETAILS.reviewUrl}" target="_blank">
                <img src="https://raw.githubusercontent.com/BillLayne/bill-layne-images/5657f7d5b50febe47431864b103e9823806f6d13/logos/google%20image%20link.webp" width="36" height="36" alt="Google Reviews" style="display: block; border: 0;">
            </a>
        </td>
      </tr>
    </table>
    <div style="margin-top: 14px;">
      <a href="${AGENCY_DETAILS.reviewUrl}" target="_blank" style="background:${EMAIL_STYLES.accentColor};border-radius:6px;color:#0b2545;display:inline-block;font-family:${EMAIL_STYLES.fontFamily};font-size:13px;font-weight:900;padding:9px 14px;text-decoration:none">⭐ Review Us on Google</a>
    </div>
    ${formData.documentType === 'Promotional / Newsletter' ? `<p style="margin: 14px 0 0; font-family: ${EMAIL_STYLES.fontFamily}; font-size: 12px; color: ${EMAIL_STYLES.lightTextColor};" class="footer-text">
      This email was sent to ${formData.recipientEmail || '{{RecipientEmail}}'}.<br>Don't want promotional emails? <a href="${AGENCY_DETAILS.mailtoLink}?subject=Please%20unsubscribe%20me" style="color:${EMAIL_STYLES.lightTextColor};text-decoration:underline">Unsubscribe here</a>.
    </p>` : ''}
  </td></tr>
</table>
</div>
</center>
</body></html>`;

  return applyUtmToHtml(finalHtml, formData);
}