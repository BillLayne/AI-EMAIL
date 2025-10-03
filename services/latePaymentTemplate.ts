import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES, LATE_PAYMENT_CARRIERS } from '../constants';

const getCarrierData = (carrierId: string) => {
    const carrier = LATE_PAYMENT_CARRIERS.find(c => c.id === carrierId);
    if (carrier) {
        const lowerCaseName = carrier.name.toLowerCase();
        const logo = CARRIER_LOGOS[Object.keys(CARRIER_LOGOS).find(key => lowerCaseName.includes(key)) || ''] || AGENCY_DETAILS.logoUrl;
        const theme = CARRIER_THEMES[Object.keys(CARRIER_THEMES).find(key => lowerCaseName.includes(key)) || 'default'];
        return { ...carrier, logo, theme };
    }
    // Fallback for names typed manually that might not be in the list
    const carrierName = carrierId || '';
    const lowerCaseName = carrierName.toLowerCase();
    const logo = CARRIER_LOGOS[Object.keys(CARRIER_LOGOS).find(key => lowerCaseName.includes(key)) || ''] || AGENCY_DETAILS.logoUrl;
    const theme = CARRIER_THEMES[Object.keys(CARRIER_THEMES).find(key => lowerCaseName.includes(key)) || 'default'];
    return {
        id: carrierName,
        name: carrierName,
        paymentLink: '#',
        phone: AGENCY_DETAILS.phone,
        logo,
        theme
    }
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Add time zone offset to treat date as local
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

export const assembleLatePaymentHtml = (formData: EmailFormData, agent: Agent): string => {
    const formattedCancellationDate = formatDate(formData.lateCancellationDate);
    const agencyMailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Payment Assistance for Policy #${formData.policyNumber}`)}`;
    
    const carrier = getCarrierData(formData.carrierName);
    const carrierPhoneTel = carrier.phone.replace(/[^0-9]/g, '');

    const subject = formData.emailSubject || `URGENT: Your ${carrier.name} Policy is Pending Cancellation`;

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
                <tr><td bgcolor="#FFFBEB" class="card" style="padding: 32px; border: 2px solid #FBBF24; border-radius: 8px; text-align: center;">
                    <p style="font-size: 32px; margin: 0; line-height: 1;">⚠️</p>
                    <p style="font-size: 22px; color: #92400E; margin: 10px 0 0 0; font-weight: 700;">Urgent Action Required</p>
                    <p style="font-size: 16px; color: #B45309; margin: 8px 0 0 0;">Hi ${formData.recipientName || 'Valued Client'}, your policy is at risk of cancellation due to non-payment.</p>
                </td></tr>
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${carrier.theme.primary}; margin: 0 0 24px 0;">Payment Due Details</h3>
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
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Type</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.latePolicyType || 'N/A'}</td>
                        </tr>
                         <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Amount Due</td>
                            <td style="font-size: 20px; color: #DC2626; text-align: right; font-weight: 700;">${formData.lateAmountDue || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Cancellation Date</td>
                            <td style="font-size: 16px; color: #DC2626; text-align: right; font-weight: 700;">${formattedCancellationDate}</td>
                        </tr>
                    </table>
                     <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 24px 0 0 0;">To avoid a lapse in your coverage, please submit your payment by the cancellation date.</p>
                </td></tr>

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="${carrier.theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${carrier.theme.primary};">
                    <h2 style="font-size: 30px; font-weight: 700; color: ${carrier.theme.textOnPrimary}; margin: 0 0 16px 0;">Submit Your Payment</h2>
                    <p style="color: ${carrier.theme.textOnPrimary}; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.5;">Please use one of the options below to make a payment and keep your policy active.</p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center">
                        <tr>
                            <td align="center" style="border-radius: 8px; background-color: ${carrier.theme.accent};">
                                <a href="${carrier.paymentLink}" target="_blank" style="font-size: 18px; font-weight: 700; color: ${carrier.theme.textOnAccent}; text-decoration: none; border-radius: 8px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">Pay Online at ${carrier.name}</a>
                            </td>
                        </tr>
                         <tr><td style="padding: 10px; font-size: 16px; color: ${carrier.theme.textOnPrimary}; opacity: 0.9;">or</td></tr>
                        <tr>
                            <td align="center" style="border-radius: 8px; border: 1px solid ${carrier.theme.accent};">
                                <a href="tel:${carrierPhoneTel}" target="_blank" style="font-size: 16px; font-weight: 600; color: ${carrier.theme.textOnPrimary}; text-decoration: none; border-radius: 8px; padding: 12px 24px; display: inline-block;">Call to Pay: ${carrier.phone}</a>
                            </td>
                        </tr>
                    </table>
                     <p style="font-size: 14px; color: ${carrier.theme.textOnPrimary}; opacity: 0.8; margin: 24px 0 0 0;">Having trouble? <a href="${agencyMailto}" target="_blank" style="color: ${carrier.theme.textOnPrimary}; font-weight: 600; text-decoration: underline;">Contact our agency for assistance</a>.</p>
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
                    <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0 0;">If you have already submitted your payment, please disregard this notice. If you have any questions or concerns, please contact our office immediately.</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
    `;
};