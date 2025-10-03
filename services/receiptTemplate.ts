import { EmailFormData, Agent } from '../types';
import { AGENCY_DETAILS, CARRIER_LOGOS, CARRIER_THEMES, CARRIER_CONTACTS } from '../constants';

const getCarrierData = (carrierNameInput: string) => {
    const carrierName = carrierNameInput || '';
    const lowerCaseName = carrierName.toLowerCase();

    // Find the best matching key from our known carriers by checking if the input name includes a known key
    const carrierKey = Object.keys(CARRIER_CONTACTS).find(key => lowerCaseName.includes(key));

    if (carrierKey) {
        const contact = CARRIER_CONTACTS[carrierKey];
        return {
            ...contact,
            logo: CARRIER_LOGOS[carrierKey] || AGENCY_DETAILS.logoUrl,
            theme: CARRIER_THEMES[carrierKey] || CARRIER_THEMES['default'],
        };
    }

    // If no match is found, this is a carrier we don't have constants for.
    // Return the name as provided and use default agency assets.
    return {
        name: carrierName,
        paymentLink: '#',
        phone: AGENCY_DETAILS.phone,
        logo: AGENCY_DETAILS.logoUrl,
        theme: CARRIER_THEMES['default']
    };
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

export const assembleReceiptHtml = (formData: EmailFormData, agent: Agent): string => {
    const formattedDatePaid = formatDate(formData.receiptDatePaid);
    const agencyMailto = `mailto:${agent.email}?subject=${encodeURIComponent(`Question about payment for Policy #${formData.policyNumber}`)}`;
    
    const carrier = getCarrierData(formData.carrierName);
    const subject = formData.emailSubject || `Your Payment Receipt from ${carrier.name}`;

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
            .hero-price { font-size: 48px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding: 16px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse;">
                <tr><td align="center" style="padding: 20px 0;"><img src="${carrier.logo}" alt="${carrier.name} Logo" width="240" style="display: block; max-height: 80px; width: auto;"></td></tr>
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-top: 8px solid ${carrier.theme.cardBorder}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center;">
                    <p style="font-size: 22px; color: ${carrier.theme.primary}; margin: 0 0 10px 0; font-weight: 700;">Payment Receipt</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 8px 0;">Thank you for your payment, ${formData.recipientName || 'Valued Client'}!</p>
                    <p class="hero-price" style="font-size: 60px; font-weight: 900; color: ${carrier.theme.accent}; margin: 0 0 8px 0; line-height: 1;">${formData.receiptAmount || '$0.00'}</p>
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;"><strong>Paid on ${formattedDatePaid}</strong></p>
                    <p style="font-size: 16px; color: #4b5563; margin: 8px auto 0 auto; border-top: 1px solid #e5e7eb; padding-top: 24px; max-width: 450px;">Your payment has been successfully processed. Please keep this receipt for your records.</p>
                </td></tr>
                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                
                <tr><td class="card" bgcolor="#ffffff" style="padding: 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <h3 style="font-size: 24px; font-weight: 700; text-align: center; color: ${carrier.theme.primary}; margin: 0 0 24px 0;">Transaction Summary</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Date Paid</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-weight: 700;">${formattedDatePaid}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Confirmation #</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-family: monospace;">${formData.receiptConfirmationNumber || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Payment Method</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.receiptPaymentMethod || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Holder</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.policyHolder || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Policy Number</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right; font-family: monospace;">${formData.policyNumber || 'N/A'}</td>
                        </tr>
                        <tr class="detail-row">
                            <td style="font-size: 16px; color: #4b5563; font-weight: 600;">Product / Service</td>
                            <td style="font-size: 16px; color: #1f2937; text-align: right;">${formData.receiptProduct} Insurance</td>
                        </tr>
                    </table>
                </td></tr>

                <tr><td style="font-size:0; line-height:0;" height="40">&nbsp;</td></tr>
                <tr><td bgcolor="${carrier.theme.primary}" style="padding: 32px; border-radius: 8px; text-align: center; background-color: ${carrier.theme.primary};">
                    <h2 style="font-size: 30px; font-weight: 700; color: ${carrier.theme.textOnPrimary}; margin: 0 0 16px 0;">Questions?</h2>
                    <p style="color: ${carrier.theme.textOnPrimary}; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.5;">If you have any questions about this payment or your policy, please don't hesitate to reach out.</p>
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