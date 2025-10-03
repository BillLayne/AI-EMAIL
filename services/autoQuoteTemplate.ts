import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES } from '../constants';

export interface AutoQuoteProse {
    greeting: string;
    intro: string;
    ctaText: string;
}

const getCarrierLogo = (carrierName: string): string => {
    const lowerCaseName = carrierName.toLowerCase();
    for (const key in CARRIER_LOGOS) {
        if (lowerCaseName.includes(key)) {
            return CARRIER_LOGOS[key];
        }
    }
    return AGENCY_DETAILS.logoUrl; // Default to agency logo
};

const getCarrierTheme = (carrierName: string): any => {
    const lowerCaseName = carrierName.toLowerCase();
    for (const key in CARRIER_THEMES) {
        if (lowerCaseName.includes(key)) {
            return CARRIER_THEMES[key];
        }
    }
    return CARRIER_THEMES['default'];
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    } catch (e) { return dateString; }
};

const buildRateChangeHtml = (formData: EmailFormData, theme: any): string => {
    const prev = parseFloat(formData.previousQuoteAmount?.replace(/[^0-9.]/g, '') || '0');
    const curr = parseFloat(formData.quoteAmount?.replace(/[^0-9.]/g, '') || '0');
    if (!prev || !curr || prev >= curr) return ''; // Only show for increases

    const diff = curr - prev;
    const diffSign = '+';
    const diffColor = '#DC2626';

    return `
    <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
    <tr><td class="card" bgcolor="#FFFBEB" style="padding: 32px; border: 1px solid #FBBF24; border-radius: 8px;">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: #92400E; margin: 0 0 24px 0;">A Note On Your New Quote</h3>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: center;">
            <tr>
                <td width="45%"><p style="font-size: 16px; color: #4b5563; margin: 0;">Previous Premium</p><p style="font-size: 24px; font-weight: 700; color: #374151; margin: 4px 0 0;">${formData.previousQuoteAmount}</p></td>
                <td width="10%" style="font-size: 24px; color: #9ca3af;">→</td>
                <td width="45%"><p style="font-size: 16px; color: #4b5563; margin: 0;">New Quoted Premium</p><p style="font-size: 24px; font-weight: 700; color: ${theme.primary}; margin: 4px 0 0;">${formData.quoteAmount}</p></td>
            </tr>
            <tr>
                <td colspan="3" style="padding-top: 16px;">
                    <p style="background-color: #ffffff; border-radius: 20px; display: inline-block; padding: 4px 12px; font-size: 16px; font-weight: 600; color: ${diffColor}; margin: 0;">
                        Change: ${diffSign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(diff))}
                    </p>
                </td>
            </tr>
        </table>
        ${formData.renewalRateExplanation ? `<p style="font-size: 15px; color: #B45309; text-align: left; margin: 24px 0 0 0; border-top: 1px solid #FDE68A; padding-top: 24px; line-height: 1.6;">
            <strong>An Explanation for the Change:</strong> ${formData.renewalRateExplanation}
        </p>` : ''}
    </td></tr>
    `;
}

const whyChooseUsAndReviewsHtml = (theme: any) => `
<tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
<tr>
    <td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 24px 0;">Why Choose Bill Layne Insurance?</h3>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding: 0 10px 20px; text-align: center; width: 33.33%;">
                    <p style="font-size: 40px; margin: 0; line-height: 1;">🤝</p>
                    <p style="font-size: 16px; font-weight: 600; color: #374151; margin: 8px 0 0;">Personalized Service</p>
                    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">We treat you like family, not a policy number.</p>
                </td>
                <td style="padding: 0 10px 20px; text-align: center; width: 33.33%;">
                    <p style="font-size: 40px; margin: 0; line-height: 1;">⭐</p>
                    <p style="font-size: 16px; font-weight: 600; color: #374151; margin: 8px 0 0;">Top-Rated Carriers</p>
                    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">Access to the best insurance for the best prices.</p>
                </td>
                <td style="padding: 0 10px 20px; text-align: center; width: 33.33%;">
                    <p style="font-size: 40px; margin: 0; line-height: 1;">📍</p>
                    <p style="font-size: 16px; font-weight: 600; color: #374151; margin: 8px 0 0;">Local Expertise</p>
                    <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0;">An independent agency that knows North Carolina.</p>
                </td>
            </tr>
        </table>
        <h4 style="font-size: 20px; font-weight: 700; text-align: center; color: #4b5563; margin: 24px 0 16px 0; border-top: 1px solid #e5e7eb; padding-top: 24px;">Hear From Our Happy Clients</h4>
        <div style="margin-bottom: 16px; background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid ${theme.accent};">
            <p style="margin: 0; font-style: italic; color: #4b5563;">"Bill and his team are always so helpful and responsive. They found me a great rate on my auto insurance and made the whole process easy. Highly recommend!"</p>
            <p style="margin: 8px 0 0; text-align: right; font-weight: 600; color: #374151;">- Sarah J.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid ${theme.accent};">
            <p style="margin: 0; font-style: italic; color: #4b5563;">"I've been with Bill Layne Insurance for years. They always go the extra mile to make sure I have the right coverage. Truly a trustworthy agency."</p>
            <p style="margin: 8px 0 0; text-align: right; font-weight: 600; color: #374151;">- Michael B.</p>
        </div>
    </td>
</tr>
`;

export const assembleAutoQuoteHtml = (formData: EmailFormData, prose: AutoQuoteProse, agent: Agent): string => {
    const formattedStartDate = formatDate(formData.coverageStart);
    const mailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Activate Auto Quote for ${formData.recipientName} (${formData.policyHolder})`)}`;
    const subject = formData.emailSubject || `Your ${formData.carrierName || 'Auto Insurance'} Quote is Ready`;
    const carrierLogoUrl = getCarrierLogo(formData.carrierName);
    const theme = getCarrierTheme(formData.carrierName);
    const rateChangeHtml = buildRateChangeHtml(formData, theme);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { border-collapse: collapse; }
        a { text-decoration: none; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
        .card { background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .vehicle-coverage-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .vehicle-coverage-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        @media screen and (max-width: 480px) {
            .card { padding: 24px !important; }
            .hero-price { font-size: 60px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding: 16px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse;">
                <tr><td align="center" style="padding: 20px 0;"><img src="${carrierLogoUrl}" alt="${formData.carrierName || 'Insurance'} Logo" width="240" style="display: block; max-height: 80px; width: auto;"></td></tr>
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid ${theme.cardBorder}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center;">
                    <p style="font-size: 22px; color: ${theme.primary}; margin: 0 0 10px 0; font-weight: 700;">${prose.greeting}</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 8px 0;">Your Estimated Monthly Premium</p>
                    <p class="hero-price" style="font-size: 72px; font-weight: 900; color: ${theme.accent}; margin: 0 0 8px 0; line-height: 1;">${formData.monthlyPremium}<span style="font-size: 24px; font-weight: 500;">/mo</span></p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Based on a ${formData.policyTerm}-month total premium of <strong>${formData.quoteAmount}</strong>, starting ${formattedStartDate}.</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 8px auto 0 auto; border-top: 1px solid #e5e7eb; padding-top: 24px; max-width: 450px;">${prose.intro}</p>
                </td></tr>
                
                ${rateChangeHtml}
                
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 12px 0;">Policy Details</h3>
                    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; line-height: 1.6;"><strong>Vehicles:</strong> ${formData.autoVehicles || 'N/A'}<br><strong>Drivers:</strong> ${formData.autoDrivers || 'N/A'}</p>
                    
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 24px 0 24px 0; border-top: 1px solid #e5e7eb; padding-top: 24px;">Vehicle Coverage Details</h3>
                    ${formData.itemizedCoveragesHtml || '<p style="text-align:center; color:#6b7280;">Detailed coverages are attached in the PDF document.</p>'}
                </td></tr>
                
                ${whyChooseUsAndReviewsHtml(theme)}

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="${theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${theme.primary};">
                    <h2 style="font-size: 30px; font-weight: 700; color: ${theme.textOnPrimary}; margin: 0 0 16px 0;">Ready to Hit the Road? 🔐</h2>
                    <p style="color: ${theme.textOnPrimary}; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.5;">${prose.ctaText}</p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center" style="border-radius: 8px; background-color: ${theme.accent};">
                        <a href="${mailto}" target="_blank" style="font-size: 18px; font-weight: 700; color: ${theme.primary}; text-decoration: none; border-radius: 8px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">ACTIVATE MY POLICY NOW</a>
                    </td></tr></table>
                </td></tr>
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="#1f2937" style="padding: 24px; text-align: center; color: #ffffff; border-radius: 8px;">
                    <h3 style="font-size: 20px; font-weight: 700; margin: 0;">${agent.name}</h3>
                    <p style="font-size: 18px; margin: 8px 0 0 0;">${agent.title} at ${AGENCY_DETAILS.name}</p>
                    <p style="color: #d1d5db; margin: 4px 0;">${AGENCY_DETAILS.address}</p>
                     <p style="color: #d1d5db; margin: 4px 0;">
                        <strong style="color: #ffffff;">Phone:</strong> <a href="tel:${agent.phone.replace(/[^0-9]/g, '')}" style="color: #d1d5db; text-decoration: underline;">${agent.phone}</a> | 
                        <strong style="color: #ffffff;">Email:</strong> <a href="mailto:${agent.email}" style="color: #d1d5db; text-decoration: underline;">${agent.email}</a>
                    </p>
                    <p style="color: #d1d5db; margin: 4px 0;">
                        <a href="${AGENCY_DETAILS.website}" target="_blank" rel="noopener" style="color: #d1d5db; text-decoration: underline;">${AGENCY_DETAILS.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
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
                    <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0 0;">This is a quote only and is subject to underwriting and rating guidelines. This is not an insurance policy and does not bind coverage.</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
    `;
};