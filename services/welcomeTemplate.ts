

import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES, CARRIER_CONTACTS } from '../constants';

const getCarrierData = (carrierName: string) => {
    if (!carrierName) return { ...CARRIER_CONTACTS['default'], logo: AGENCY_DETAILS.logoUrl, theme: CARRIER_THEMES['default'] };

    const lowerCaseName = carrierName.toLowerCase();
    for (const key in CARRIER_CONTACTS) {
        if (lowerCaseName.includes(key)) {
            const contact = CARRIER_CONTACTS[key];
            return {
                ...contact,
                logo: CARRIER_LOGOS[key] || AGENCY_DETAILS.logoUrl,
                theme: CARRIER_THEMES[key] || CARRIER_THEMES['default'],
            };
        }
    }
    return { 
        name: carrierName,
        paymentLink: '#',
        servicePhone: 'N/A',
        claimsPhone: 'N/A',
        logo: AGENCY_DETAILS.logoUrl, 
        theme: CARRIER_THEMES['default'] 
    };
};

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

const buildHomeCoverageHtml = (formData: EmailFormData, theme: any): string => {
    // Only render if there's actual coverage data
    if (!formData.dwellingCoverage && !formData.personalLiabilityCoverage) return '';
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
    // Only render if there's actual coverage data
    if (!formData.itemizedCoveragesHtml) return '';
    return `
    <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
    <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 12px 0;">Auto Coverage Summary</h3>
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 24px 0; line-height: 1.6;"><strong>Vehicles:</strong> ${formData.autoVehicles || 'N/A'}<br><strong>Drivers:</strong> ${formData.autoDrivers || 'N/A'}</p>
        ${formData.itemizedCoveragesHtml || '<p style="text-align:center; color:#6b7280;">Detailed coverages are attached in the PDF document.</p>'}
    </td></tr>
    `;
};


export const assembleWelcomeHtml = (formData: EmailFormData, agent: Agent): string => {
    const formattedEffectiveDate = formatDate(formData.policyEffectiveDate);
    const agencyMailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Question about my new policy #${formData.policyNumber}`)}`;
    
    const carrier = getCarrierData(formData.carrierName);
    const subject = formData.emailSubject || `Welcome! Your New ${carrier.name} Policy Is Here`;

    let coverageDetailsHtml = '';
    if (formData.renewalType === 'Home') {
        coverageDetailsHtml = buildHomeCoverageHtml(formData, carrier.theme);
    } else if (formData.renewalType === 'Auto') {
        coverageDetailsHtml = buildAutoCoverageHtml(formData, carrier.theme);
    }

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
        .detail-row td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child td { border-bottom: 0; }
        @media screen and (max-width: 480px) {
            .card { padding: 24px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding: 16px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse;">
                <tr><td align="center" style="padding: 20px 0;"><img src="${carrier.logo}" alt="${carrier.name} Logo" width="240" style="display: block; max-height: 80px; width: auto;"></td></tr>
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid ${carrier.theme.cardBorder}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center;">
                    <p style="font-size: 32px; margin: 0; line-height: 1;">🎉</p>
                    <p style="font-size: 22px; color: ${carrier.theme.primary}; margin: 10px 0 0 0; font-weight: 700;">Welcome, ${formData.recipientName || 'Valued Client'}!</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 8px 0 0 0;">We are thrilled to have you as a new client and thank you for choosing us to protect what matters most.</p>
                </td></tr>
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${carrier.theme.primary}; margin: 0 0 24px 0;">Your New Policy Details</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Holder</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.policyHolder || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Insurance Carrier</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${carrier.name || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Number</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-family: monospace;">${formData.policyNumber || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Type</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.renewalType} Insurance</td>
                        </tr>
                        <tr class="detail-row">
                             <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Total Premium</td>
                             <td style="font-size: 18px; color: ${carrier.theme.primary}; text-align: right; font-weight: 700;">${formData.quoteAmount || 'N/A'}</td>
                        </tr>
                         <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Effective Date</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-weight: 700;">${formattedEffectiveDate}</td>
                        </tr>
                    </table>
                     <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 24px 0 0 0;">A summary of your new policy documents and ID cards has been attached to this email for your records.</p>
                </td></tr>

                ${coverageDetailsHtml}

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td class="card" style="padding: 32px; border-radius: 8px; text-align: center; background-color: #f9fafb;">
                    <p style="font-size: 24px; margin: 0; line-height: 1;">📬</p>
                    <h3 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 12px 0 8px 0;">What to Expect Next</h3>
                    <p style="font-size: 15px; color: #4b5563; margin: 0; line-height: 1.6;">
                        Your official policy documents, ID cards, and billing information will be sent directly from <strong>${carrier.name}</strong> via mail and should arrive within 7-10 business days.
                    </p>
                </td></tr>

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>

                <tr><td class="card" style="padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td valign="top">
                                <h3 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0;">Important Contacts for ${carrier.name}</h3>
                                <p style="font-size: 15px; color: #4b5563; margin: 0 0 8px;"><strong>Customer Service:</strong> <a href="tel:${carrier.servicePhone.replace(/[^0-9]/g, '')}" style="color: ${carrier.theme.primary}; font-weight: 600;">${carrier.servicePhone}</a></p>
                                <p style="font-size: 15px; color: #4b5563; margin: 0 0 8px;"><strong>Claims (24/7):</strong> <a href="tel:${carrier.claimsPhone.replace(/[^0-9]/g, '')}" style="color: ${carrier.theme.primary}; font-weight: 600;">${carrier.claimsPhone}</a></p>
                                <p style="font-size: 15px; color: #4b5563; margin: 0;"><strong>Online Payments:</strong> <a href="${carrier.paymentLink}" target="_blank" style="color: ${carrier.theme.primary}; font-weight: 600; text-decoration: underline;">${carrier.name} Website</a></p>
                            </td>
                        </tr>
                    </table>
                </td></tr>

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="${carrier.theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${carrier.theme.primary};">
                    <h2 style="font-size: 30px; font-weight: 700; color: ${carrier.theme.textOnPrimary}; margin: 0 0 16px 0;">We're Here For You</h2>
                    <p style="color: ${carrier.theme.textOnPrimary}; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.5;">While your policy is with ${carrier.name}, remember that we are your local agent. For policy reviews, questions, or help with a claim, please contact us first!</p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center" style="border-radius: 8px; background-color: ${carrier.theme.accent};">
                        <a href="${agencyMailto}" target="_blank" style="font-size: 18px; font-weight: 700; color: ${carrier.theme.textOnAccent}; text-decoration: none; border-radius: 8px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">CONTACT OUR AGENCY</a>
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
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
    `;
};
