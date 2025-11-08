import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ServiceSpecificDetailsProps {
  serviceType: string;
  serviceSpecific: Record<string, any>;
  className?: string;
}

export function ServiceSpecificDetails({ 
  serviceType, 
  serviceSpecific, 
  className = "" 
}: ServiceSpecificDetailsProps) {
  // Filter out empty values and excluded fields
  const filteredServiceSpecific = serviceSpecific 
    ? Object.fromEntries(
        Object.entries(serviceSpecific).filter(([key, value]) => {
          const excludedFields = ['uploaded_files', 'uploaded_references', 'uploaded_media', 'media_files', 'selected_service', 'selectedService'];
          return !excludedFields.includes(key) && 
                 value !== null && 
                 value !== undefined && 
                 value !== '' &&
                 !(Array.isArray(value) && value.length === 0) &&
                 !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
        })
      )
    : {};
  
  // Check if we have any meaningful data - also check original serviceSpecific for fields that might be filtered
  const hasAnyData = Object.keys(filteredServiceSpecific).length > 0 || 
    (serviceSpecific && Object.keys(serviceSpecific).some(key => {
      const excludedFields = ['uploaded_files', 'uploaded_references', 'uploaded_media', 'media_files', 'selected_service', 'selectedService'];
      if (excludedFields.includes(key)) return false;
      const value = serviceSpecific[key];
      return value !== null && value !== undefined && value !== '' &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
    }));
  
  // If we have a service type, always try to render (even if data is empty)
  // This ensures the section shows up for all projects with a type
  if (!serviceSpecific && !serviceType) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Service-Specific Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No service-specific details available for this project type.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // If we have a service type but no data, still render the structure
  // This helps identify when data should be present but isn't
  if (!hasAnyData && serviceType) {
    // Try to render anyway - the render functions will handle empty values
  }

  // Helper function to render details with proper overflow handling
  const renderDetail = (label: string, value: any) => {
    if (!value) return null;
    
    // Handle arrays (like multiple URLs, domains, etc.)
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <p className="font-semibold text-sm text-gray-900">{label}:</p>
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {String(item)}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    
    // Handle long text strings
    const stringValue = String(value);
    const isLongText = stringValue.length > 100 || stringValue.includes('\n');
    
    if (isLongText) {
      return (
        <div className="space-y-2">
          <p className="font-semibold text-sm text-gray-900">{label}:</p>
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
            {stringValue}
          </div>
        </div>
      );
    }
    
    // Handle short text
    return (
      <div className="space-y-1">
        <p className="font-semibold text-sm text-gray-900">{label}:</p>
        <p className="text-sm text-gray-700 break-words">{stringValue}</p>
      </div>
    );
  };

  const renderWebDevelopment = () => {
    // Check all possible field name variations
    const domainSuggestions = filteredServiceSpecific.domainSuggestions 
      || filteredServiceSpecific.domain_suggestions
      || serviceSpecific.domainSuggestions 
      || serviceSpecific.domain_suggestions;
    
    const websiteReferences = filteredServiceSpecific.websiteReferences 
      || filteredServiceSpecific.website_references
      || filteredServiceSpecific.references
      || serviceSpecific.websiteReferences 
      || serviceSpecific.website_references
      || serviceSpecific.references;
    
    const featuresRequirements = filteredServiceSpecific.featuresRequirements 
      || filteredServiceSpecific.features_requirements
      || filteredServiceSpecific.features
      || serviceSpecific.featuresRequirements 
      || serviceSpecific.features_requirements
      || serviceSpecific.features;
    
    const budgetTimeline = filteredServiceSpecific.budgetTimeline 
      || filteredServiceSpecific.budget_timeline
      || serviceSpecific.budgetTimeline 
      || serviceSpecific.budget_timeline;
    
    const additionalRequirements = filteredServiceSpecific.additional_requirements 
      || filteredServiceSpecific.additionalRequirements
      || serviceSpecific.additional_requirements 
      || serviceSpecific.additionalRequirements;

    return (
      <div className="space-y-4">
        {renderDetail('Domain Suggestions', domainSuggestions)}
        {renderDetail('Website References', websiteReferences)}
        {renderDetail('Features & Requirements', featuresRequirements)}
        {renderDetail('Budget & Timeline', budgetTimeline)}
        {renderDetail('Additional Requirements', additionalRequirements)}
        {/* Exclude uploaded_references and other file fields */}
      </div>
    );
  };

  const renderBrandingDesign = () => (
    <div className="space-y-4">
      {renderDetail('Logo Ideas & Concepts', filteredServiceSpecific.logoIdeasConcepts || filteredServiceSpecific.logo_ideas_concepts)}
      {renderDetail('Color & Brand Theme', filteredServiceSpecific.colorBrandTheme || filteredServiceSpecific.color_brand_theme)}
      {renderDetail('Design Assets Needed', filteredServiceSpecific.designAssetsNeeded || filteredServiceSpecific.design_assets_needed)}
      {renderDetail('Target Audience & Industry', filteredServiceSpecific.targetAudienceIndustry || filteredServiceSpecific.target_audience_industry)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderAISolutions = () => (
    <div className="space-y-4">
      {renderDetail('AI Solution Types', filteredServiceSpecific.aiSolutionType || filteredServiceSpecific.ai_solution_type)}
      {renderDetail('Business Challenge & Use Case', filteredServiceSpecific.businessChallengeUseCase || filteredServiceSpecific.business_challenge_use_case)}
      {renderDetail('Data Availability', filteredServiceSpecific.dataAvailability || filteredServiceSpecific.data_availability)}
      {renderDetail('Expected Outcome', filteredServiceSpecific.expectedOutcome || filteredServiceSpecific.expected_outcome)}
      {renderDetail('Budget Range', filteredServiceSpecific.budgetRange || filteredServiceSpecific.budget_range)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderDigitalMarketing = () => (
    <div className="space-y-4">
      {renderDetail('Target Audience & Industry', filteredServiceSpecific.targetAudienceIndustry || filteredServiceSpecific.target_audience_industry)}
      {renderDetail('Marketing Goals', filteredServiceSpecific.marketingGoals || filteredServiceSpecific.marketing_goals)}
      {renderDetail('Channels of Interest', filteredServiceSpecific.channelsOfInterest || filteredServiceSpecific.channels_of_interest)}
      {renderDetail('Monthly Budget Range', filteredServiceSpecific.budgetRangeMonthly || filteredServiceSpecific.budget_range_monthly)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderCustomProject = () => (
    <div className="space-y-4">
      {renderDetail('Service Description', filteredServiceSpecific.serviceDescription || filteredServiceSpecific.service_description)}
      {renderDetail('Expected Outcome', filteredServiceSpecific.expectedOutcome || filteredServiceSpecific.expected_outcome)}
      {renderDetail('Budget Range', filteredServiceSpecific.budgetRange || filteredServiceSpecific.budget_range)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderServiceDetails = () => {
    let hasRenderedContent = false;
    const renderedElements: React.ReactNode[] = [];
    
    const rendered = (() => {
      switch (serviceType?.toLowerCase()) {
        case 'web':
        case 'web-development':
        case 'web_development':
          const webDev = renderWebDevelopment();
          // Check if webDev has any non-null children
          if (webDev && React.isValidElement(webDev)) {
            const children = React.Children.toArray((webDev as React.ReactElement).props.children);
            hasRenderedContent = children.some(child => child !== null && child !== undefined);
          }
          return webDev;
        case 'branding':
        case 'branding-design':
        case 'branding_design':
          return renderBrandingDesign();
        case 'ai':
        case 'ai-solutions':
        case 'ai_solutions':
          return renderAISolutions();
        case 'marketing':
        case 'digital-marketing':
        case 'digital_marketing':
          return renderDigitalMarketing();
        case 'custom':
        case 'custom-project':
        case 'custom_project':
          return renderCustomProject();
        default:
          // Fallback: display all fields generically (excluding uploaded files)
          if (Object.keys(filteredServiceSpecific).length > 0) {
            return (
              <div className="space-y-4">
                {Object.entries(filteredServiceSpecific)
                  .map(([key, value]) => 
                    renderDetail(
                      key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, l => l.toUpperCase()),
                      value
                    )
                  )}
              </div>
            );
          }
          return null;
      }
    })();
    
    // If nothing meaningful was rendered and we have a service type, show a helpful message
    if (serviceType && (!rendered || !hasRenderedContent)) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground italic">
            Service-specific details have not been provided for this {serviceType} project.
          </p>
          {serviceSpecific && Object.keys(serviceSpecific).length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              <p className="font-medium mb-1">Available fields in database:</p>
              <p className="font-mono text-xs">
                {Object.keys(serviceSpecific)
                  .filter(k => !['uploaded_files', 'uploaded_references', 'uploaded_media', 'media_files', 'selected_service', 'selectedService'].includes(k))
                  .join(', ')}
              </p>
              <p className="mt-1 text-xs italic">(All fields are currently empty)</p>
            </div>
          )}
        </div>
      );
    }
    
    return rendered;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Service-Specific Details</CardTitle>
        {serviceType && (
          <p className="text-xs text-muted-foreground mt-1">
            Project Type: {serviceType}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {renderServiceDetails()}
      </CardContent>
    </Card>
  );
}
