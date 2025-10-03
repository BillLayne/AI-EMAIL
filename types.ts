
export interface Agent {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface Opportunity {
  title: string;
  suggestionText: string;
  promptToInject: string;
}

export interface EmailFormData {
  documentType: string;
  policyHolder: string;
  recipientEmail: string;
  recipientName: string;
  tone: 'Warm' | 'Direct' | 'Short';
  emailSubject: string;
  emailPreheader: string;
  agentId: string;
  
  // Quote fields
  quoteType: string;
  quoteAmount: string;
  monthlyPremium: string;
  policyTerm: '6' | '12';
  coverageStart: string;
  quoteExpires: string;
  isUpdatedQuote: boolean;
  
  // Renewal fields
  renewalDue: string;
  includeIcs: 'yes' | 'no';
  policyNumber: string;
  renewalType: 'Home' | 'Auto' | 'Other';
  previousQuoteAmount?: string; // For renewal comparison
  renewalRateExplanation?: string; // AI-generated text

  // Welcome fields
  policyEffectiveDate: string;

  // Late Payment fields
  lateCancellationDate: string;
  lateAmountDue: string;
  latePaymentLink: string;
  latePolicyType: string;

  // Receipt fields
  receiptAmount: string;
  receiptDatePaid: string;
  receiptConfirmationNumber: string;
  receiptPaymentMethod: string;
  receiptProduct: 'Auto' | 'Home' | 'Commercial' | 'Other';

  // Change / Underwriting Request fields
  changeRequestType: 'request' | 'confirmation';

  // Body
  customPrompt: string;

  // Hero image
  heroUrl: string;
  heroAlt: string;
  heroLink: string;

  // Marketing
  enableUtm: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;

  // Footer
  includeFacebookBanner: boolean;

  // Detailed Home Quote Fields
  carrierName: string;
  homePolicyType: string;
  propertyAddress: string;
  dwellingCoverage: string;
  otherStructuresCoverage: string;
  personalPropertyCoverage: string;
  lossOfUseCoverage: string;
  personalLiabilityCoverage: string;
  medicalPaymentsCoverage: string;
  deductible: string;
  endorsements: string; // A text area for custom endorsements

  // Detailed Auto Quote Fields
  autoVehicles: string; // Text area for "2023 Toyota Camry, 2021 Ford F-150"
  autoDrivers: string;  // Text area for "John Doe, Jane Doe"
  autoBodilyInjury: string; // e.g., "$100,000 / $300,000"
  autoPropertyDamage: string;
  autoMedicalPayments: string;
  autoUninsuredMotorist: string;
  autoComprehensiveDeductible: string;
  autoCollisionDeductible: string;
  autoExtraCoverages: string; // Text area for "Roadside Assistance|24/7 towing and support..."
  itemizedCoveragesHtml?: string; // AI-generated HTML for per-vehicle breakdown

  // AI Opportunities
  selectedOpportunityPrompt?: string;
}

export interface CancellationData {
  policyNumber: string;
  namedInsured: string;
  cancellationDate: string;
  amountDue: string;
}

export interface Template {
  id: string;
  name: string;
  savedAt: number;
  data: Partial<EmailFormData>;
}

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export interface Recipient {
  email: string;
  firstName: string;
  policyHolder: string;
}

export interface RecipientList {
  id: string;
  name: string;
  savedAt: number;
  recipients: Recipient[];
}

export interface GeneratedVideo {
    video: {
      uri: string;
    }
}

export interface VideoOperation {
    name: string;
    done: boolean;
    response?: {
        generatedVideos: GeneratedVideo[];
    }
}
