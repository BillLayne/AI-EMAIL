import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES } from '../constants';

export interface HomeQuoteProse {
    greeting: string;
    intro: string;
    ctaText: string;
}

const getCarrierData = (carrierName: string) => {
    const lowerCaseName = carrierName.toLowerCase();
    for (const key in CARRIER_THEMES) {
        if (lowerCaseName.includes(key)) {
            return {
                logo: CARRIER_LOGOS[key] || AGENCY_DETAILS.logoUrl,
                theme: CARRIER_THEMES[key],
            };
        }
    }
    return {
        logo: AGENCY_DETAILS.logoUrl,
        theme: CARRIER_THEMES['default'],
    };
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (e) {
        return dateString;
    }
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


export const assembleHomeQuoteHtml = (formData: EmailFormData, prose: HomeQuoteProse, agent: Agent): string => {
    const mailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Activate Home Quote for ${formData.recipientName} (${formData.policyHolder})`)}`;
    const subject = formData.emailSubject || `Your ${formData.carrierName || 'Homeowners'} Quote is Ready`;
    
    const carrier = getCarrierData(formData.carrierName);
    const theme = carrier.theme;

    // Use AI greeting, but ensure "UPDATED" is bold if applicable
    const finalGreeting = formData.isUpdatedQuote 
        ? prose.greeting.replace(/updated/gi, '<strong>UPDATED</strong>')
        : prose.greeting;
    
    const rateChangeHtml = buildRateChangeHtml(formData, theme);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: Inter, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { border-collapse: collapse; }
        a { text-decoration: none; }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
        .card { background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        @media screen and (max-width: 480px) {
            .coverage-label, .coverage-value { display: block; width: 100%; text-align: center; padding: 4px 0; }
            .coverage-value { font-size: 16px !important; margin-top: 4px; }
            .card { padding: 24px !important; }
            .hero-price { font-size: 60px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 16px 8px;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 20px 0 20px 0;">
                            <img src="${carrier.logo}" alt="${formData.carrierName} Logo" width="240" style="display: block; max-height: 80px; width: auto;">
                        </td>
                    </tr>
                    <tr>
                        <td class="card" bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid ${theme.cardBorder}; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center;">
                            <p style="font-size: 20px; color: ${theme.primary}; margin: 0 0 10px 0; font-weight: 600;">${finalGreeting}</p>
                            <p style="font-size: 14px; color: #10B981; margin: 0 0 16px 0; font-weight: 700;">✅ Your new detailed PDF quote is attached to this email.</p>
                            <p style="font-size: 16px; color: #4b5563; margin: 0 0 8px 0;">Estimated Monthly Premium</p>
                            <p class="hero-price" style="font-size: 72px; font-weight: 900; color: ${theme.accent}; margin: 0 0 8px 0; line-height: 1;">${formData.monthlyPremium || '$0'}<span style="font-size: 24px; font-weight: 500;">/mo</span></p>
                            <p style="font-size: 18px; color: #4b5563; margin: 0 0 24px 0;">Based on an annual premium of <strong>${formData.quoteAmount || '$0'}</strong></p>
                            <p style="font-size: 16px; color: #4b5563; margin: 8px auto 0 auto; border-top: 1px solid #e5e7eb; padding-top: 24px; max-width: 450px;">${prose.intro}</p>
                        </td>
                    </tr>
                    ${rateChangeHtml}
                    <tr><td style="font-size: 0; line-height: 0;" height="40">&nbsp;</td></tr>
                    <tr>
                        <td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 24px 0;">🏠 Key Coverage Amounts</h3>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Dwelling (Coverage A)</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.dwellingCoverage || 'N/A'}</td></tr></table></div>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Other Structures (Coverage B)</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.otherStructuresCoverage || 'N/A'}</td></tr></table></div>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Personal Property (Coverage C)</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.personalPropertyCoverage || 'N/A'}</td></tr></table></div>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Loss of Use (Coverage D)</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.lossOfUseCoverage || 'N/A'}</td></tr></table></div>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Personal Liability</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.personalLiabilityCoverage || 'N/A'}</td></tr></table></div>
                            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px;"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="coverage-label" style="font-weight: 700; font-size: 18px; color: #374151; padding: 0;">Medical Payments</td><td class="coverage-value" align="right" style="font-weight: 700; font-size: 18px; color: ${theme.accent}; padding: 0;">${formData.medicalPaymentsCoverage || 'N/A'}</td></tr></table></div>
                            <p style="font-size: 14px; color: #6b7280; margin-top: 16px; text-align: center;"><strong>Primary Deductible:</strong> ${formData.deductible || 'N/A'}</p>
                        </td>
                    </tr>
                    <tr><td style="font-size: 0; line-height: 0;" height="40">&nbsp;</td></tr>
                    <tr>
                        <td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                             <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 16px 0;">What Your Policy Protects Against</h3>
                             <p style="font-size: 14px; text-align: center; color: #4b5563; margin: 4px 0 16px 0;">Your policy protects your home and belongings from a wide range of common perils:</p>
                             <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">🔥</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Fire & Lightning</p></td>
                                    <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">💨</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Wind & Hail</p></td>
                                     <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">💧</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Water Damage</p></td>
                                </tr>
                                 <tr>
                                    <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">🛡️</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Theft & Vandalism</p></td>
                                    <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">💥</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Explosion</p></td>
                                     <td align="center" width="33%" style="padding: 10px;"><p style="font-size: 24px; margin:0;">🌲</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 4px 0;">Falling Objects</p></td>
                                </tr>
                             </table>
                        </td>
                    </tr>
                    <tr><td style="font-size: 0; line-height: 0;" height="40">&nbsp;</td></tr>
                    <tr>
                        <td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                            <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${theme.primary}; margin: 0 0 8px 0;">Bill Layne Insurance Agency Inc.</h3>
                            <p style="font-size: 18px; font-weight: 600; text-align: center; color: ${theme.accent}; margin: 0 0 24px 0;">Your Neighbor, Not a Call Center</p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr><td style="padding-bottom: 24px; text-align: center;"><p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">When you have a question or need to file a claim, you’ll call our local office in Elkin, not an 800 number. We're part of your community, and we're here to provide personal advice and support. You're not just a policy number to us; you're our neighbor.</p></td></tr>
                                <tr><td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
                                    <h4 style="font-weight: 700; font-size: 18px; margin: 0 0 20px 0; text-align: center; color: #4b5563;">What Our Clients Say</h4>
                                    <div style="text-align: center; margin-bottom: 20px; background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 3px solid ${theme.accent};"><p style="color: #FFC300; font-size: 20px; margin: 0 0 8px 0;" role="img" aria-label="5 out of 5 stars">⭐⭐⭐⭐⭐</p><p style="font-size: 14px; color: #4b5563; margin: 0 0 8px 0; font-style: italic; line-height: 1.5;">"Bill was so helpful when we had to file a claim after the big storm last spring. Having a local agent who actually answers the phone made all the difference. I couldn't recommend them more!"</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">- Sarah K.</p></div>
                                    <div style="text-align: center; background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 3px solid ${theme.accent};"><p style="color: #FFC300; font-size: 20px; margin: 0 0 8px 0;" role="img" aria-label="5 out of 5 stars">⭐⭐⭐⭐⭐</p><p style="font-size: 14px; color: #4b5563; margin: 0 0 8px 0; font-style: italic; line-height: 1.5;">"We switched to Bill Layne Insurance a few years ago and not only saved money, but got much better coverage. He took the time to explain everything in plain English. Great, honest service."</p><p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">- Mark T.</p></div>
                                </td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr><td style="font-size: 0; line-height: 0;" height="40">&nbsp;</td></tr>
                    <tr>
                        <td bgcolor="${theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${theme.primary};">
                            <h2 style="font-size: 30px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">Ready to Protect Your Home? 🔐</h2>
                            <p style="color: #e0f2fe; margin: 0 0 24px 0; line-height: 1.5;">${prose.ctaText}</p>
                             <table border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center" style="border-radius: 8px; background-color: ${theme.accent};">
                                        <a href="${mailto}" target="_blank" style="font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">ACTIVATE MY POLICY</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr><td style="font-size: 0; line-height: 0;" height="40">&nbsp;</td></tr>
                    <tr>
                        <td bgcolor="#1f2937" style="padding: 24px; text-align: center; color: #ffffff; border-radius: 8px;">
                            <h3 style="font-size: 20px; font-weight: 700; margin: 0;">Your Agent: ${agent.name}</h3>
                            <p style="font-size: 18px; margin: 8px 0 0 0;">${AGENCY_DETAILS.name}</p>
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
                                    <td style="padding: 0 8px;"><a href="${AGENCY_DETAILS.facebookUrl}" target="_blank"><img src="https://raw.githubusercontent.com/BillLayne/bill-layne-images/5657f7d5b50febe47431864b103e9823806f6d13/logos/facebook%20logo.webp" width="36" height="36" alt="Facebook" style="display: block; border: 0;"></a></td>
                                    <td style="padding: 0 8px;"><a href="${AGENCY_DETAILS.reviewUrl}" target="_blank"><img src="https://raw.githubusercontent.com/BillLayne/bill-layne-images/5657f7d5b50febe47431864b103e9823806f6d13/logos/google%20image%20link.webp" width="36" height="36" alt="Google Reviews" style="display: block; border: 0;"></a></td>
                                </tr>
                            </table>
                            <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0 0;">This is a quote only and is subject to underwriting and rating guidelines. This is not an insurance policy and does not bind coverage.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};