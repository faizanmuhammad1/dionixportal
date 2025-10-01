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
  if (!serviceSpecific || Object.keys(serviceSpecific).length === 0) {
    return null;
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

  const renderWebDevelopment = () => (
    <div className="space-y-4">
      {renderDetail('Domain Suggestions', serviceSpecific.domainSuggestions)}
      {renderDetail('Website References', serviceSpecific.websiteReferences)}
      {renderDetail('Features & Requirements', serviceSpecific.featuresRequirements)}
      {renderDetail('Budget & Timeline', serviceSpecific.budgetTimeline)}
      {renderDetail('Additional Requirements', serviceSpecific.additional_requirements)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderBrandingDesign = () => (
    <div className="space-y-4">
      {renderDetail('Logo Ideas & Concepts', serviceSpecific.logoIdeasConcepts)}
      {renderDetail('Color & Brand Theme', serviceSpecific.colorBrandTheme)}
      {renderDetail('Design Assets Needed', serviceSpecific.designAssetsNeeded)}
      {renderDetail('Target Audience & Industry', serviceSpecific.targetAudienceIndustry)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderAISolutions = () => (
    <div className="space-y-4">
      {renderDetail('AI Solution Types', serviceSpecific.aiSolutionType)}
      {renderDetail('Business Challenge & Use Case', serviceSpecific.businessChallengeUseCase)}
      {renderDetail('Data Availability', serviceSpecific.dataAvailability)}
      {renderDetail('Expected Outcome', serviceSpecific.expectedOutcome)}
      {renderDetail('Budget Range', serviceSpecific.budgetRange)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderDigitalMarketing = () => (
    <div className="space-y-4">
      {renderDetail('Target Audience & Industry', serviceSpecific.targetAudienceIndustry)}
      {renderDetail('Marketing Goals', serviceSpecific.marketingGoals)}
      {renderDetail('Channels of Interest', serviceSpecific.channelsOfInterest)}
      {renderDetail('Monthly Budget Range', serviceSpecific.budgetRangeMonthly)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderCustomProject = () => (
    <div className="space-y-4">
      {renderDetail('Service Description', serviceSpecific.serviceDescription)}
      {renderDetail('Expected Outcome', serviceSpecific.expectedOutcome)}
      {renderDetail('Budget Range', serviceSpecific.budgetRange)}
      {/* Exclude uploaded_references and other file fields */}
    </div>
  );

  const renderServiceDetails = () => {
    switch (serviceType?.toLowerCase()) {
      case 'web':
      case 'web-development':
        return renderWebDevelopment();
      case 'branding':
      case 'branding-design':
        return renderBrandingDesign();
      case 'ai':
      case 'ai-solutions':
        return renderAISolutions();
      case 'marketing':
      case 'digital-marketing':
        return renderDigitalMarketing();
      case 'custom':
      case 'custom-project':
        return renderCustomProject();
      default:
        // Fallback: display all fields generically (excluding uploaded files)
        return (
          <div className="space-y-4">
            {Object.entries(serviceSpecific)
              .filter(([key, value]) => {
                // Exclude uploaded file fields
                const excludedFields = ['uploaded_files', 'uploaded_references', 'uploaded_media', 'media_files'];
                return !excludedFields.includes(key) && value !== null && value !== undefined;
              })
              .map(([key, value]) => 
                renderDetail(
                  key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  value
                )
              )}
          </div>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Service-Specific Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderServiceDetails()}
      </CardContent>
    </Card>
  );
}
