
import { EmailFormData, Template, Agent } from './types';

export const AGENCY_DETAILS = {
  name: "Bill Layne Insurance Agency",
  shortName: "Bill Layne Ins",
  logoUrl: "https://i.imgur.com/uVVShPM.png",
  address: "1283 N Bridge St, Elkin, NC 28621",
  phone: "336-835-1993",
  email: "Bill@NCAutoandHome.com",
  website: "https://www.billlayneinsurance.com/",
  tagline: "Protecting North Carolina Families",
  reviewUrl: "https://g.page/r/CXGq9B7-jzu7EBM/review",
  mapsUrl: "https://www.google.com/maps?q=1283+N+Bridge+St,+Elkin,+NC+28621",
  facebookUrl: "https://facebook.com/BillLayneInsurance",
  get phoneLink() { return `tel:${this.phone.replace(/[^0-9]/g, '')}`; },
  get mailtoLink() { return `mailto:${this.email}`; }
};

export const AGENTS: Agent[] = [
  { id: 'team', name: 'The Team at Bill Layne Insurance Agency', title: 'Your Service Team', email: 'Save@NCAutoandHome.com', phone: AGENCY_DETAILS.phone },
  { id: 'robin', name: 'Robin Holbrook', title: 'Agent', email: 'Robin@BillLayneInsurance.com', phone: AGENCY_DETAILS.phone },
  { id: 'tina', name: 'Tina Jennings', title: 'Agent', email: 'Tina@BillLayneInsurance.com', phone: AGENCY_DETAILS.phone },
  { id: 'scott', name: 'Scott Holbrook', title: 'Agent', email: 'Scott@BillLayneInsurance.com', phone: AGENCY_DETAILS.phone },
  { id: 'debbie', name: 'Debbie Garner', title: 'Agent', email: 'Debbie@BillLayneinsurance.com', phone: AGENCY_DETAILS.phone },
  { id: 'bill', name: 'Bill Layne', title: 'Agent', email: 'Bill@BillLayneInsurance.com', phone: AGENCY_DETAILS.phone },
];

export const LATE_PAYMENT_CARRIERS = [
  { id: 'nationwide', name: 'Nationwide', paymentLink: 'https://www.nationwide.com/bill-pay', phone: '877-669-6877' },
  { id: 'progressive', name: 'Progressive', paymentLink: 'https://account.apps.progressive.com/access/ez-payment/policy-info', phone: '800-776-4737' },
  { id: 'national_general', name: 'National General', paymentLink: 'https://www.mynatgenpolicy.com/pay', phone: '888-293-5108' },
  { id: 'dairyland', name: 'Dairyland', paymentLink: 'https://www.dairylandinsurance.com/make-a-payment', phone: '800-334-0090' },
  { id: 'foremost', name: 'Foremost', paymentLink: 'https://www.myforemostaccount.com/fmcss/makeapayment', phone: '800-527-3905' },
  { id: 'nc_grange', name: 'NC Grange', paymentLink: 'https://ncgrangemutual.ncgrangemutual.com/payments/', phone: '800-662-7777' },
  { id: 'alamance_farmers', name: 'Alamance Farmers', paymentLink: 'https://alamance.britecorepro.com/login/securePayment', phone: '336-226-7959' },
];

export const CARRIER_CONTACTS: { [key: string]: any } = {
    'nationwide': { id: 'nationwide', name: 'Nationwide', paymentLink: 'https://www.nationwide.com/bill-pay', servicePhone: '877-669-6877', claimsPhone: '800-421-3535' },
    'progressive': { id: 'progressive', name: 'Progressive', paymentLink: 'https://account.apps.progressive.com/access/ez-payment/policy-info', servicePhone: '800-776-4737', claimsPhone: '800-776-4737' },
    'national general': { id: 'national_general', name: 'National General', paymentLink: 'https://www.mynatgenpolicy.com/pay', servicePhone: '888-293-5108', claimsPhone: '800-462-2123' },
    'dairyland': { id: 'dairyland', name: 'Dairyland', paymentLink: 'https://www.dairylandinsurance.com/make-a-payment', servicePhone: '800-334-0090', claimsPhone: '800-334-0090' },
    'foremost': { id: 'foremost', name: 'Foremost', paymentLink: 'https://www.myforemostaccount.com/fmcss/makeapayment', servicePhone: '800-527-3905', claimsPhone: '800-527-3907' },
    'grange': { id: 'nc_grange', name: 'NC Grange', paymentLink: 'https://ncgrangemutual.ncgrangemutual.com/payments/', servicePhone: '800-662-7777', claimsPhone: '877-444-6742' },
    'alamance': { id: 'alamance_farmers', name: 'Alamance Farmers', paymentLink: 'https://alamance.britecorepro.com/login/securePayment', servicePhone: '336-226-7959', claimsPhone: '336-226-7959' },
};


export const CARRIER_LOGOS: { [key: string]: string } = {
  'foremost': 'https://i.imgur.com/rHIo4r5.jpg',
  'alamance': 'https://i.imgur.com/KhV6zop.png',
  'grange': 'https://i.imgur.com/Fesnkng.png',
  'progressive': 'https://i.imgur.com/7N1vfo0.png',
  'national general': 'https://i.imgur.com/HF8oPAF.png',
  'nationwide': 'https://i.imgur.com/Mv5V7tV.png',
  'dairyland': 'https://i.imgur.com/gS3703v.png' // Example Dairyland logo
};

export const CARRIER_THEMES: { [key: string]: any } = {
  'foremost': { primary: '#004B8E', accent: '#004B8E', textOnPrimary: '#FFFFFF', textOnAccent: '#FFFFFF', cardBorder: '#004B8E' },
  'alamance': { primary: '#003A5D', accent: '#8DB943', textOnPrimary: '#FFFFFF', textOnAccent: '#003A5D', cardBorder: '#8DB943' },
  'grange': { primary: '#005A41', accent: '#F3B71B', textOnPrimary: '#FFFFFF', textOnAccent: '#005A41', cardBorder: '#F3B71B' },
  'progressive': { primary: '#003F64', accent: '#007AC3', textOnPrimary: '#FFFFFF', textOnAccent: '#FFFFFF', cardBorder: '#007AC3' },
  'national general': { primary: '#0078C8', accent: '#5CB941', textOnPrimary: '#FFFFFF', textOnAccent: '#FFFFFF', cardBorder: '#5CB941' },
  'nationwide': { primary: '#00659E', accent: '#E31B23', textOnPrimary: '#FFFFFF', textOnAccent: '#FFFFFF', cardBorder: '#00659E' },
  'dairyland': { primary: '#006699', accent: '#FFCC00', textOnPrimary: '#FFFFFF', textOnAccent: '#006699', cardBorder: '#006699' },
  'default': { primary: '#003366', accent: '#FFC300', textOnPrimary: '#FFFFFF', textOnAccent: '#003366', cardBorder: '#FFC300' },
};

export const EMAIL_STYLES = {
  primaryColor: "#003366", // Deep Blue from new template
  secondaryColor: "#1a5f7a",
  accentColor: "#FFC300",  // Golden Yellow from new template
  textColor: "#1f2937",
  lightTextColor: "#4b5563",
  backgroundColor: "#f8fafc", // Lighter grey from new template
  containerBackground: "#ffffff",
  fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Inter, Arial, sans-serif",
  dark: {
    background: "#111827",
    containerBackground: "#1f2937",
    text: "#e5e7eb",
    lightText: "#9ca3af",
    primaryLink: "#FFC300", // Use new accent for dark links
    quoteBoxBg: "#374151",
    quoteBoxBorder: "#4b5563"
  }
};

export const DOCUMENT_TYPES = [
  "Insurance Quote",
  "New Policy Welcome",
  "Policy Renewal",
  "Change / Underwriting Request",
  "Late Payment Notice",
  "Receipt",
  "AI Prompt",
  "Auto Documentation",
  "Home Documentation",
  "Commercial Documentation",
  "General Documentation",
  "Custom Message",
  "Promotional / Newsletter",
];

export const TONE_OPTIONS: EmailFormData['tone'][] = ["Warm", "Direct", "Short"];

export const QUOTE_TYPE_OPTIONS = ["Home", "Auto", "Life", "Renters", "Business", "General"];

export const RENEWAL_TYPE_OPTIONS: EmailFormData['renewalType'][] = ["Home", "Auto", "Other"];

export const RECEIPT_PRODUCT_OPTIONS: EmailFormData['receiptProduct'][] = ["Auto", "Home", "Commercial", "Other"];

export const INITIAL_FORM_DATA: EmailFormData = {
  documentType: '',
  policyHolder: '',
  recipientEmail: '',
  recipientName: '',
  tone: 'Warm',
  emailSubject: '',
  emailPreheader: '',
  agentId: 'team',
  
  // Quote fields
  quoteType: 'Home',
  quoteAmount: '',
  monthlyPremium: '',
  policyTerm: '12',
  coverageStart: '',
  quoteExpires: '',
  isUpdatedQuote: false,
  
  // Renewal fields
  renewalDue: '',
  includeIcs: 'yes',
  policyNumber: '',
  renewalType: 'Home',
  previousQuoteAmount: '', // For renewal comparison
  renewalRateExplanation: '', // AI-generated text

  // Welcome fields
  policyEffectiveDate: '',

  // Late Payment fields
  lateCancellationDate: '',
  lateAmountDue: '',
  latePaymentLink: '',
  latePolicyType: 'Auto',

  // Receipt fields
  receiptAmount: '',
  receiptDatePaid: '',
  receiptConfirmationNumber: '',
  receiptPaymentMethod: '',
  receiptProduct: 'Auto',

  // Change / Underwriting Request fields
  changeRequestType: 'request',

  // Body
  customPrompt: '',

  // Hero image
  heroUrl: '',
  heroAlt: '',
  heroLink: '',

  // Marketing
  enableUtm: true,
  utmSource: 'email',
  utmMedium: 'email',
  utmCampaign: '',
  utmContent: '',

  // Footer
  includeFacebookBanner: false,

  // Detailed Home Quote Fields
  carrierName: 'nationwide', // Default for late pay dropdown
  homePolicyType: '',
  propertyAddress: '',
  dwellingCoverage: '',
  otherStructuresCoverage: '',
  personalPropertyCoverage: '',
  lossOfUseCoverage: '',
  personalLiabilityCoverage: '',
  medicalPaymentsCoverage: '',
  deductible: '',
  endorsements: '', // A text area for custom endorsements

  // Detailed Auto Quote Fields
  autoVehicles: '', // Text area for "2023 Toyota Camry, 2021 Ford F-150"
  autoDrivers: '',  // Text area for "John Doe, Jane Doe"
  autoBodilyInjury: '', // e.g., "$100,000 / $300,000"
  autoPropertyDamage: '',
  autoMedicalPayments: '',
  autoUninsuredMotorist: '',
  autoComprehensiveDeductible: '',
  autoCollisionDeductible: '',
  autoExtraCoverages: '', // Text area for "Roadside Assistance|24/7 towing and support..."
  itemizedCoveragesHtml: '', // AI-generated HTML for per-vehicle breakdown

  // AI Opportunities
  selectedOpportunityPrompt: '',
};

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'default-auto-docs',
    name: 'Auto Proof of Insurance',
    savedAt: Date.now(),
    data: {
      documentType: 'Auto Documentation',
      emailSubject: `Your Auto Ins Docs from ${AGENCY_DETAILS.shortName}`,
      emailPreheader: 'Here are your requested auto insurance documents. Please keep a copy for your records.',
      tone: 'Direct',
    }
  },
  {
    id: 'default-home-docs',
    name: 'Home Insurance Declaration',
    savedAt: Date.now(),
    data: {
      documentType: 'Home Documentation',
      emailSubject: `Your Home Ins Docs from ${AGENCY_DETAILS.shortName}`,
      emailPreheader: 'Your homeowner\'s policy declaration page is attached. Please review and contact us with questions.',
      tone: 'Warm',
    }
  },
  {
    id: 'default-quote-followup',
    name: 'Insurance Quote Follow-up',
    savedAt: Date.now(),
    data: {
      documentType: 'Insurance Quote',
      quoteType: 'Home',
      emailSubject: `Your Insurance Quote from ${AGENCY_DETAILS.shortName}`,
      emailPreheader: 'Your personalized insurance quote is ready! See the details inside.',
      tone: 'Warm',
    }
  },
  {
    id: 'default-newsletter-promo',
    name: 'Newsletter / Promotion',
    savedAt: Date.now(),
    data: {
      documentType: 'Promotional / Newsletter',
      emailSubject: `News & Offers from ${AGENCY_DETAILS.shortName}`,
      emailPreheader: 'Check out our latest tips, updates, and special offers!',
      customPrompt: 'Write a short newsletter about the importance of reviewing insurance coverage annually. Mention that our team is available for a free policy review.',
      tone: 'Warm',
      heroAlt: 'Bill Layne Insurance Agency logo',
      heroUrl: 'https://i.imgur.com/uVVShPM.png'
    }
  }
];

export const RECIPIENT_LISTS_STORAGE_KEY = 'billLayneAiRecipientLists_v1';
