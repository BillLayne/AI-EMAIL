

import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES } from '../constants';

const getCarrierLogo = (carrierName: string): string => {
    if (!carrierName) return AGENCY_DETAILS.logoUrl;
    const lowerCaseName = carrierName.toLowerCase();
    for (const key in CARRIER_LOGOS) {
        if (lowerCaseName.includes(key)) {
            return CARRIER_LOGOS[key];
        }
    }
    return AGENCY_DETAILS.logoUrl;
};

const getCarrierTheme = (carrierName: string): any => {
    if (!carrierName) return CARRIER_THEMES['default'];
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
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York' // Be explicit about timezone
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

const buildHomeCoverageHtml = (formData: EmailFormData, theme: any): string => {
    return `
    <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
    <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 24px 0;">Home Coverage Summary</h3>
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0;"><strong>Property:</strong> ${formData.propertyAddress || 'N/A'}</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">🏠 Dwelling</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.dwellingCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">🏗️ Other Structures</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.otherStructuresCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">📦 Personal Property</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.personalPropertyCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">🏨 Loss of Use</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.lossOfUseCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">🛡️ Personal Liability</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.personalLiabilityCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563;">🏥 Medical Payments</td><td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.medicalPaymentsCoverage || 'N/A'}</td></tr>
            <tr class="detail-row"><td style="font-size: 16px; color: #4b5563; font-weight: 600;">Deductible</td><td style="font-size: 16px; color: #1f2937; text-align: right; font-weight: 600;">${formData.deductible || 'N/A'}</td></tr>
        </table>
    </td></tr>
    `;
};

const buildAutoCoverageHtml = (formData: EmailFormData, theme: any): string => {
    return `
    <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
    <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 12px 0;">Auto Coverage Summary</h3>
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; line-height: 1.6;"><strong>Vehicles:</strong> ${formData.autoVehicles || 'N/A'}<br><strong>Drivers:</strong> ${formData.autoDrivers || 'N/A'}</p>
        ${formData.itemizedCoveragesHtml || '<p style="text-align:center; color:#6b7280;">Detailed coverages are attached in the PDF document.</p>'}
    </td></tr>
    `;
};

const buildRateChangeHtml = (formData: EmailFormData, theme: any): string => {
    const prev = parseFloat(formData.previousQuoteAmount?.replace(/[^0-9.]/g, '') || '0');
    const curr = parseFloat(formData.quoteAmount?.replace(/[^0-9.]/g, '') || '0');
    if (!prev || !curr || prev === curr) return '';

    const diff = curr - prev;
    const diffSign = diff > 0 ? '+' : '-';
    const diffColor = diff > 0 ? '#DC2626' : '#16A34A';

    return `
    <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
    <tr><td class="card" bgcolor="#FFFBEB" style="padding: 32px; border: 1px solid #FBBF24; border-radius: 8px;">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: #92400E; margin: 0 0 24px 0;">Your Renewal Premium</h3>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: center;">
            <tr>
                <td width="45%"><p style="font-size: 16px; color: #4b5563; margin: 0;">Previous Premium</p><p style="font-size: 24px; font-weight: 700; color: #374151; margin: 4px 0 0;">${formData.previousQuoteAmount}</p></td>
                <td width="10%" style="font-size: 24px; color: #9ca3af;">→</td>
                <td width="45%"><p style="font-size: 16px; color: #4b5563; margin: 0;">New Premium</p><p style="font-size: 24px; font-weight: 700; color: ${theme.primary}; margin: 4px 0 0;">${formData.quoteAmount}</p></td>
            </tr>
            <tr>
                <td colspan="3" style="padding-top: 16px;">
                    <p style="background-color: #ffffff; border-radius: 20px; display: inline-block; padding: 4px 12px; font-size: 16px; font-weight: 600; color: ${diffColor}; margin: 0;">
                        Change: ${diffSign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(diff))}
                    </p>
                </td>
            </tr>
        </table>
        <p style="font-size: 15px; color: #B45309; text-align: left; margin: 24px 0 0 0; border-top: 1px solid #FDE68A; padding-top: 24px; line-height: 1.6;">
            <strong>A Note About Your Premium:</strong> ${formData.renewalRateExplanation || 'We understand that seeing a premium change can be unexpected. Rates across the industry are periodically adjusted to account for factors like the rising costs of repairs and an increase in regional claims. We have ensured you still have all available discounts and that your policy continues to provide the best protection for your investment. Please feel free to call us to review your coverage options.'}
        </p>
    </td></tr>
    `;
}

export const assembleRenewalHtml = (formData: EmailFormData, agent: Agent): string => {
    const formattedRenewalDate = formatDate(formData.renewalDue);
    const mailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Question about my renewal: Policy #${formData.policyNumber}`)}`;
    const subject = formData.emailSubject || `Your Policy Renewal Information from ${formData.carrierName || 'Us'}`;
    const carrierLogoUrl = getCarrierLogo(formData.carrierName);
    const theme = getCarrierTheme(formData.carrierName);

    let coverageDetailsHtml = '';
    if (formData.renewalType === 'Home') {
        coverageDetailsHtml = buildHomeCoverageHtml(formData, theme);
    } else if (formData.renewalType === 'Auto') {
        coverageDetailsHtml = buildAutoCoverageHtml(formData, theme);
    }

    const rateChangeHtml = buildRateChangeHtml(formData, theme);

    const totalPremiumText = formData.renewalType === 'Auto' ? `Your ${formData.policyTerm}-month premium is` : 'Your new annual premium is';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        a { text-decoration: none; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
        .card { background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .detail-row td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child td { border-bottom: 0; }
        @media screen and (max-width: 480px) {
            .card { padding: 24px !important; }
            .hero-price { font-size: 48px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding: 16px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse;">
                <tr><td align="center" style="padding: 20px 0;"><img src="${carrierLogoUrl}" alt="${formData.carrierName || 'Insurance'} Logo" width="240" style="display: block; max-height: 80px; width: auto;"></td></tr>
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid ${theme.cardBorder}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center;">
                    <p style="font-size: 22px; color: ${theme.primary}; margin: 0 0 10px 0; font-weight: 700;">Hi ${formData.recipientName || 'Valued Client'}, it's time to renew!</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 8px 0;">Your new monthly premium will be:</p>
                    <p class="hero-price" style="font-size: 60px; font-weight: 900; color: ${theme.accent}; margin: 0 0 8px 0; line-height: 1;">${formData.monthlyPremium || '$0.00'}<span style="font-size: 20px; font-weight: 500;">/mo</span></p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">${totalPremiumText} <strong>${formData.quoteAmount}</strong>. Your policy renews on <strong>${formattedRenewalDate}</strong>.</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 8px auto 0 auto; border-top: 1px solid #e5e7eb; padding-top: 24px; max-width: 450px;">Thank you for your continued trust in us. Please review the key details of your upcoming policy term below. Your full, detailed renewal document is attached to this email.</p>
                </td></tr>
                
                ${rateChangeHtml}
                
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 24px 0;">Renewal Summary</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Holder</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.policyHolder || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Number</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-family: monospace;">${formData.policyNumber || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Renewal Effective Date</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-weight: 700;">${formattedRenewalDate}</td>
                        </tr>
                         <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">New Total Premium</td>
                            <td style="font-size: 18px; color: ${theme.primary}; text-align: right; font-weight: 700;">${formData.quoteAmount || 'N/A'}</td>
                        </tr>
                    </table>
                     <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 24px 0 0 0;">If your payment information is up to date and you have no changes, no action is required. If you'd like to make changes or review your coverage, please contact us!</p>
                </td></tr>

                ${coverageDetailsHtml}

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="${theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${theme.primary};">
                    <h2 style="font-size: 30px; font-weight: 700; color: ${theme.textOnPrimary}; margin: 0 0 16px 0;">Questions About Your Renewal?</h2>
                    <p style="color: ${theme.textOnPrimary}; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.5;">We're here to help! Contact us to review your coverage and ensure it still meets your needs.</p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center" style="border-radius: 8px; background-color: ${theme.accent};">
                        <a href="${mailto}" target="_blank" style="font-size: 18px; font-weight: 700; color: ${theme.primary}; text-decoration: none; border-radius: 8px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">CONTACT US</a>
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
                    <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0 0;">This email is a summary of your renewal. Please refer to the attached official renewal documents for complete details and policy terms.</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
    `;
};