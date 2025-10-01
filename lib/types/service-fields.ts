// Standardized service-specific field definitions
// This ensures consistency across submission forms, project creation, and project management

export interface WebDevelopmentFields {
  domain_suggestions?: string;
  website_references?: string;
  features_requirements?: string;
  additional_requirements?: string;
}

export interface BrandingDesignFields {
  logo_ideas_concepts?: string;
  color_brand_theme?: string;
  design_assets_needed?: string[];
  target_audience_industry?: string;
}

export interface DigitalMarketingFields {
  target_audience_industry?: string;
  marketing_goals?: string;
  channels_of_interest?: string[];
  monthly_budget_range?: string;
}

export interface AISolutionsFields {
  ai_solution_type?: string[];
  business_challenge_use_case?: string;
  data_availability?: string;
  expected_outcome?: string;
  budget_range?: string;
}

export interface CustomProjectFields {
  service_description?: string;
  expected_outcome?: string;
  budget_range?: string;
}

export type ServiceSpecificFields = 
  | WebDevelopmentFields 
  | BrandingDesignFields 
  | DigitalMarketingFields 
  | AISolutionsFields 
  | CustomProjectFields;

// Field mapping for backward compatibility
export const FIELD_MAPPINGS = {
  // Web Development
  'domainSuggestions': 'domain_suggestions',
  'domain_suggestions_svc': 'domain_suggestions',
  'websiteReferences': 'website_references',
  'website_references': 'website_references',
  'featuresRequirements': 'features_requirements',
  'features_requirements': 'features_requirements',
  'features_requirements_svc': 'features_requirements',
  
  // Branding Design
  'logoIdeasConcepts': 'logo_ideas_concepts',
  'logoIdeas': 'logo_ideas_concepts',
  'logo_concepts': 'logo_ideas_concepts',
  'colorBrandTheme': 'color_brand_theme',
  'brandTheme': 'color_brand_theme',
  'color_preferences': 'color_brand_theme',
  'brand_theme': 'color_brand_theme',
  'designAssetsNeeded': 'design_assets_needed',
  'design_assets': 'design_assets_needed',
  
  // Digital Marketing
  'targetAudienceIndustry': 'target_audience_industry',
  'marketingGoals': 'marketing_goals',
  'marketing_goals': 'marketing_goals',
  'channelsOfInterest': 'channels_of_interest',
  'channels': 'channels_of_interest',
  'budgetRangeMonthly': 'monthly_budget_range',
  'monthly_budget': 'monthly_budget_range',
  
  // AI Solutions
  'aiSolutionType': 'ai_solution_type',
  'ai_solution_type': 'ai_solution_type',
  'businessChallengeUseCase': 'business_challenge_use_case',
  'business_challenge': 'business_challenge_use_case',
  'dataAvailability': 'data_availability',
  'data_availability': 'data_availability',
  'budgetRange': 'budget_range',
  'budget_range': 'budget_range',
  
  // Custom Project
  'serviceDescription': 'service_description',
  'service_description': 'service_description',
  'expectedOutcome': 'expected_outcome',
  'expected_outcome': 'expected_outcome',
} as const;

// Normalize field names to standard format
export function normalizeServiceFields(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const standardKey = FIELD_MAPPINGS[key as keyof typeof FIELD_MAPPINGS] || key;
    normalized[standardKey] = value;
  }
  
  return normalized;
}

// Get service-specific fields based on service type
export function getServiceFields(serviceType: string): string[] {
  const serviceTypeMap: Record<string, string[]> = {
    'web-development': ['domain_suggestions', 'website_references', 'features_requirements', 'additional_requirements'],
    'branding-design': ['logo_ideas_concepts', 'color_brand_theme', 'design_assets_needed', 'target_audience_industry'],
    'digital-marketing': ['target_audience_industry', 'marketing_goals', 'channels_of_interest', 'monthly_budget_range'],
    'ai-solutions': ['ai_solution_type', 'business_challenge_use_case', 'data_availability', 'expected_outcome', 'budget_range'],
    'custom': ['service_description', 'expected_outcome', 'budget_range'],
  };
  
  return serviceTypeMap[serviceType] || [];
}
