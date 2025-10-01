'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { projectService } from '@/lib/project-service';
import { ProjectFormData, ProjectType } from '@/lib/types/project';
import { useToast } from '@/hooks/use-toast';
import { uploadProjectFile } from '@/lib/storage';

// Form validation schema - Step 1 stays the same, other steps match JSON structure
const projectFormSchema = z.object({
  // Step 1: Core Project Details (keep same as current)
  project_name: z.string().min(3, 'Project name must be at least 3 characters'),
  project_type: z.enum(['Web Development', 'Branding Design', 'AI Solutions', 'Digital Marketing', 'Custom Project']),
  description: z.string().optional(),
  client_name: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),

  // Step 2: Service-Specific Information (matches client step 1)
  // Web Development fields
  domainSuggestions: z.string().optional(),
  websiteReferences: z.string().optional(),
  featuresRequirements: z.string().optional(),
  budgetTimeline: z.string().optional(),
  
  // Branding Design fields
  logoIdeasConcepts: z.string().optional(),
  colorBrandTheme: z.string().optional(),
  designAssetsNeeded: z.array(z.string()).default([]),
  
  // Digital Marketing fields
  targetAudienceIndustry: z.string().optional(),
  marketingGoals: z.string().optional(),
  channelsOfInterest: z.array(z.string()).default([]),
  budgetRangeMonthly: z.string().optional(),
  
  // AI Solutions fields
  aiSolutionType: z.array(z.string()).default([]),
  businessChallengeUseCase: z.string().optional(),
  dataAvailability: z.string().optional(),
  budgetRange: z.string().optional(),
  
  // Other/Custom fields
  serviceDescription: z.string().optional(),
  expectedOutcome: z.string().optional(),

  // Step 3: Company & Contact Information (matches client step 2)
  contactBusinessNumber: z.string().min(1, 'Business phone number is required'),
  contactCompanyEmail: z.string().email('Valid email is required'),
  contactCompanyAddress: z.string().min(1, 'Company address is required'),
  aboutCompanyDetails: z.string().min(1, 'About company is required'),

  // Step 4: Social Media & Public Contact Info (matches client step 3)
  socialLinks: z.string().optional(),
  publicBusinessNumber: z.string().optional(),
  publicCompanyEmail: z.string().email().optional().or(z.literal('')),
  publicCompanyAddress: z.string().optional(),

  // Step 5: Media & Banking Information (matches client step 4)
  mediaLinks: z.string().optional(),
  mediaFiles: z.array(z.any()).default([]),
  paymentIntegrationNeeds: z.array(z.string()).default([]),
  account_name: z.string().optional(),
  account_number: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectCreationFormProps {
  onSuccess?: (projectId: string) => void;
  onCancel?: () => void;
}

export function ProjectCreationForm({ onSuccess, onCancel }: ProjectCreationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [socialLinks, setSocialLinks] = useState<string[]>(['']);
  const [mediaLinks, setMediaLinks] = useState<string[]>(['']);
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      // Step 1: Keep same as current
      project_name: '',
      project_type: 'Web Development',
      description: '',
      client_name: '',
      budget: 0,
      start_date: '',
      end_date: '',
      priority: 'Medium',
      
      // Step 2: Service-specific fields
      domainSuggestions: '',
      websiteReferences: '',
      featuresRequirements: '',
      budgetTimeline: '',
      logoIdeasConcepts: '',
      colorBrandTheme: '',
      designAssetsNeeded: [],
      targetAudienceIndustry: '',
      marketingGoals: '',
      channelsOfInterest: [],
      budgetRangeMonthly: '',
      aiSolutionType: [],
      businessChallengeUseCase: '',
      dataAvailability: '',
      budgetRange: '',
      serviceDescription: '',
      expectedOutcome: '',
      
      // Step 3: Company & Contact Information
      contactBusinessNumber: '',
      contactCompanyEmail: '',
      contactCompanyAddress: '',
      aboutCompanyDetails: '',
      
      // Step 4: Social Media & Public Contact
      socialLinks: '',
      publicBusinessNumber: '',
      publicCompanyEmail: '',
      publicCompanyAddress: '',
      
      // Step 5: Media & Banking
      mediaLinks: '',
      mediaFiles: [],
      paymentIntegrationNeeds: [],
      account_name: '',
      account_number: '',
      iban: '',
      swift: '',
    },
  });

  const watchedValues = form.watch();
  const totalSteps = 6;

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    // Files are handled separately, not stored in form
  }, [uploadedFiles, form]);

  const removeFile = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    // Files are handled separately, not stored in form
  }, [uploadedFiles, form]);

  const addSocialLink = useCallback(() => {
    setSocialLinks(prev => [...prev, '']);
  }, []);

  const updateSocialLink = useCallback((index: number, value: string) => {
    setSocialLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = value;
      return newLinks;
    });
    // Social links are handled separately
  }, [form, socialLinks]);

  const removeSocialLink = useCallback((index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addMediaLink = useCallback(() => {
    setMediaLinks(prev => [...prev, '']);
  }, []);

  const updateMediaLink = useCallback((index: number, value: string) => {
    setMediaLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = value;
      return newLinks;
    });
    // Media links are handled separately
  }, [form, mediaLinks]);

  const removeMediaLink = useCallback((index: number) => {
    setMediaLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      // Build service_specific object based on project_type
      const serviceSpecific: Record<string, any> = {};
      
      if (data.project_type === 'Web Development') {
        if (data.domainSuggestions) serviceSpecific.domainSuggestions = data.domainSuggestions;
        if (data.websiteReferences) serviceSpecific.websiteReferences = data.websiteReferences;
        if (data.featuresRequirements) serviceSpecific.featuresRequirements = data.featuresRequirements;
        if (data.budgetTimeline) serviceSpecific.budgetTimeline = data.budgetTimeline;
      } else if (data.project_type === 'Branding Design') {
        if (data.logoIdeasConcepts) serviceSpecific.logoIdeasConcepts = data.logoIdeasConcepts;
        if (data.colorBrandTheme) serviceSpecific.colorBrandTheme = data.colorBrandTheme;
        if (data.designAssetsNeeded.length > 0) serviceSpecific.designAssetsNeeded = data.designAssetsNeeded;
      } else if (data.project_type === 'Digital Marketing') {
        if (data.targetAudienceIndustry) serviceSpecific.targetAudienceIndustry = data.targetAudienceIndustry;
        if (data.marketingGoals) serviceSpecific.marketingGoals = data.marketingGoals;
        if (data.channelsOfInterest.length > 0) serviceSpecific.channelsOfInterest = data.channelsOfInterest;
        if (data.budgetRangeMonthly) serviceSpecific.budgetRangeMonthly = data.budgetRangeMonthly;
      } else if (data.project_type === 'AI Solutions') {
        if (data.aiSolutionType.length > 0) serviceSpecific.aiSolutionType = data.aiSolutionType;
        if (data.businessChallengeUseCase) serviceSpecific.businessChallengeUseCase = data.businessChallengeUseCase;
        if (data.dataAvailability) serviceSpecific.dataAvailability = data.dataAvailability;
        if (data.budgetRange) serviceSpecific.budgetRange = data.budgetRange;
      } else if (data.project_type === 'Custom Project') {
        if (data.serviceDescription) serviceSpecific.serviceDescription = data.serviceDescription;
        if (data.expectedOutcome) serviceSpecific.expectedOutcome = data.expectedOutcome;
      }

      // Build bank details object
      const bankDetails: Record<string, any> = {};
      if (data.account_name) bankDetails.account_name = data.account_name;
      if (data.account_number) bankDetails.account_number = data.account_number;
      if (data.iban) bankDetails.iban = data.iban;
      if (data.swift) bankDetails.swift = data.swift;

      const projectData: ProjectFormData = {
        name: data.project_name,
        type: data.project_type.toLowerCase().replace(' ', '-') as any,
        description: data.description,
        client_name: data.client_name,
        budget: data.budget,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'planning' as any,
        priority: data.priority.toLowerCase() as any,
        service_specific: serviceSpecific,
        company_number: data.contactBusinessNumber,
        company_email: data.contactCompanyEmail,
        company_address: data.contactCompanyAddress,
        about_company: data.aboutCompanyDetails,
        social_links: data.socialLinks ? [data.socialLinks] : [],
        public_contacts: {
          phone: data.publicBusinessNumber,
          email: data.publicCompanyEmail,
          address: data.publicCompanyAddress,
        },
        media_links: data.mediaLinks ? [data.mediaLinks] : [],
        bank_details: bankDetails,
      };

      const project = await projectService.createProject(projectData);
      
      // Handle uploaded files - upload them to attachments
      if (uploadedFiles.length > 0) {
        try {
          for (const file of uploadedFiles) {
            // Upload file to storage first
            const uploaded = await uploadProjectFile({
              projectId: project.id,
              file: file,
            });
            
            // Then add to attachments
            await projectService.addAttachment(project.id, {
              storage_path: uploaded.path,
              file_name: file.name,
              file_size: file.size,
              content_type: file.type,
            });
          }
        } catch (error) {
          console.error('Error uploading files:', error);
          // Don't fail the entire project creation if file upload fails
        }
      }
      
      toast({
        title: 'Project Created',
        description: 'Your project has been successfully created.',
      });

      onSuccess?.(project.id);
    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="text-xl text-gray-900">Project Details</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              {...form.register('project_name')}
              placeholder="Enter project name"
            />
            {form.formState.errors.project_name && (
              <p className="text-sm text-red-500">{form.formState.errors.project_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_type">Project Type *</Label>
            <Select onValueChange={(value) => form.setValue('project_type', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Web Development">Web Development</SelectItem>
                <SelectItem value="Branding Design">Branding Design</SelectItem>
                <SelectItem value="AI Solutions">AI Solutions</SelectItem>
                <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                <SelectItem value="Custom Project">Custom Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Brief project description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              {...form.register('client_name')}
              placeholder="Client or company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              {...form.register('budget', { valueAsNumber: true })}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              {...form.register('start_date')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              {...form.register('end_date')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select onValueChange={(value) => form.setValue('priority', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => {
    const projectType = watchedValues.project_type;
    
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-xl text-gray-900">Service-Specific Information</CardTitle>
          <CardDescription className="text-gray-600">
            Tell us more about your {projectType} project needs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {projectType === 'Web Development' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domainSuggestions">Domain Suggestions</Label>
                <Textarea
                  {...form.register('domainSuggestions')}
                  placeholder="e.g., mycompany.com, mybusiness.net"
                  rows={3}
                />
                <p className="text-sm text-gray-500">Do you have any domain preferences or suggestions?</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="websiteReferences">Website References</Label>
                <Textarea
                  {...form.register('websiteReferences')}
                  placeholder="Share links to websites you like..."
                  rows={3}
                />
                <p className="text-sm text-gray-500">Share links to websites you like for inspiration</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="featuresRequirements">Features & Requirements</Label>
                <Textarea
                  {...form.register('featuresRequirements')}
                  placeholder="Describe the features and functionality you need..."
                  rows={4}
                />
                <p className="text-sm text-gray-500">Be as specific as possible about what you want your website to do</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budgetTimeline">Budget & Timeline</Label>
                <Textarea
                  {...form.register('budgetTimeline')}
                  placeholder="What's your budget range and when do you need it completed?"
                  rows={3}
                />
                <p className="text-sm text-gray-500">This helps us provide accurate quotes and timelines</p>
              </div>
            </div>
          )}
          
          {projectType === 'Branding Design' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoIdeasConcepts">Logo Ideas & Concepts</Label>
                <Textarea
                  {...form.register('logoIdeasConcepts')}
                  placeholder="Describe your vision for the logo..."
                  rows={3}
                />
                <p className="text-sm text-gray-500">Share any ideas, concepts, or inspiration for your logo</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="colorBrandTheme">Color & Brand Theme</Label>
                <Textarea
                  {...form.register('colorBrandTheme')}
                  placeholder="What colors and themes represent your brand?"
                  rows={3}
                />
                <p className="text-sm text-gray-500">Describe your brand's personality and preferred colors</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="designAssetsNeeded">Design Assets Needed</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Logo Design', 'Business Cards', 'Letterhead', 'Social Media Graphics', 'Website Design', 'Print Materials', 'Brand Guidelines', 'Other'].map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option}
                        onChange={(e) => {
                          const current = form.getValues('designAssetsNeeded') || [];
                          if (e.target.checked) {
                            form.setValue('designAssetsNeeded', [...current, option]);
                          } else {
                            form.setValue('designAssetsNeeded', current.filter(item => item !== option));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500">Select all the design assets you need</p>
              </div>
            </div>
          )}
          
          {projectType === 'Digital Marketing' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAudienceIndustry">Target Audience & Industry</Label>
                <Textarea
                  {...form.register('targetAudienceIndustry')}
                  placeholder="Who is your target audience and what industry are you in?"
                  rows={3}
                />
                <p className="text-sm text-gray-500">Help us understand your market and customers</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="marketingGoals">Marketing Goals</Label>
                <Textarea
                  {...form.register('marketingGoals')}
                  placeholder="What do you want to achieve with digital marketing?"
                  rows={3}
                />
                <p className="text-sm text-gray-500">Be specific about your marketing objectives</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="channelsOfInterest">Channels of Interest</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Google Ads', 'Facebook/Instagram Ads', 'LinkedIn Marketing', 'SEO Optimization', 'Email Marketing', 'Content Marketing', 'Influencer Marketing', 'Other'].map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option}
                        onChange={(e) => {
                          const current = form.getValues('channelsOfInterest') || [];
                          if (e.target.checked) {
                            form.setValue('channelsOfInterest', [...current, option]);
                          } else {
                            form.setValue('channelsOfInterest', current.filter(item => item !== option));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500">Which marketing channels interest you most?</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budgetRangeMonthly">Monthly Marketing Budget</Label>
                <Select onValueChange={(value) => form.setValue('budgetRangeMonthly', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under $1,000">Under $1,000</SelectItem>
                    <SelectItem value="$1,000 - $5,000">$1,000 - $5,000</SelectItem>
                    <SelectItem value="$5,000 - $10,000">$5,000 - $10,000</SelectItem>
                    <SelectItem value="$10,000 - $25,000">$10,000 - $25,000</SelectItem>
                    <SelectItem value="$25,000+">$25,000+</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">This helps us recommend the right strategies</p>
              </div>
            </div>
          )}
          
          {projectType === 'AI Solutions' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiSolutionType">AI Solution Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Chatbots & Virtual Assistants', 'Predictive Analytics', 'Process Automation', 'Machine Learning Models', 'Natural Language Processing', 'Computer Vision', 'Recommendation Systems', 'Other'].map((option) => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option}
                        onChange={(e) => {
                          const current = form.getValues('aiSolutionType') || [];
                          if (e.target.checked) {
                            form.setValue('aiSolutionType', [...current, option]);
                          } else {
                            form.setValue('aiSolutionType', current.filter(item => item !== option));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500">What type of AI solutions are you interested in?</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessChallengeUseCase">Business Challenge & Use Case</Label>
                <Textarea
                  {...form.register('businessChallengeUseCase')}
                  placeholder="Describe the business problem you want to solve..."
                  rows={3}
                />
                <p className="text-sm text-gray-500">Help us understand how AI can solve your specific challenges</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataAvailability">Data Availability</Label>
                <Select onValueChange={(value) => form.setValue('dataAvailability', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="We have extensive data">We have extensive data</SelectItem>
                    <SelectItem value="We have some data">We have some data</SelectItem>
                    <SelectItem value="We have limited data">We have limited data</SelectItem>
                    <SelectItem value="We need help collecting data">We need help collecting data</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">AI solutions require data - what's your current data situation?</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select onValueChange={(value) => form.setValue('budgetRange', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under $10,000">Under $10,000</SelectItem>
                    <SelectItem value="$10,000 - $50,000">$10,000 - $50,000</SelectItem>
                    <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
                    <SelectItem value="$100,000+">$100,000+</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">AI solutions vary in complexity and cost</p>
              </div>
            </div>
          )}
          
          {projectType === 'Custom Project' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceDescription">Service Description</Label>
                <Textarea
                  {...form.register('serviceDescription')}
                  placeholder="Describe the service you need..."
                  rows={4}
                />
                <p className="text-sm text-gray-500">Tell us about your specific requirements</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expectedOutcome">Expected Outcome</Label>
                <Textarea
                  {...form.register('expectedOutcome')}
                  placeholder="What results are you hoping to achieve?"
                  rows={3}
                />
                <p className="text-sm text-gray-500">Help us understand your goals and expectations</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStep3 = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
        <CardTitle className="text-xl text-gray-900">Company & Contact Information</CardTitle>
        <CardDescription className="text-gray-600">Tell us about your company</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="contactBusinessNumber">Business Phone Number *</Label>
          <Input
            id="contactBusinessNumber"
            {...form.register('contactBusinessNumber')}
            placeholder="e.g., +1 (555) 123-4567"
          />
          <p className="text-sm text-gray-500">We'll use this to contact you about your project</p>
          {form.formState.errors.contactBusinessNumber && (
            <p className="text-sm text-red-500">{form.formState.errors.contactBusinessNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactCompanyEmail">Company Email *</Label>
          <Input
            id="contactCompanyEmail"
            type="email"
            {...form.register('contactCompanyEmail')}
            placeholder="contact@yourcompany.com"
          />
          <p className="text-sm text-gray-500">Your business email address</p>
          {form.formState.errors.contactCompanyEmail && (
            <p className="text-sm text-red-500">{form.formState.errors.contactCompanyEmail.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactCompanyAddress">Company Address *</Label>
          <Textarea
            id="contactCompanyAddress"
            {...form.register('contactCompanyAddress')}
            placeholder="Your business address..."
            rows={3}
          />
          <p className="text-sm text-gray-500">Your business location</p>
          {form.formState.errors.contactCompanyAddress && (
            <p className="text-sm text-red-500">{form.formState.errors.contactCompanyAddress.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="aboutCompanyDetails">About Your Company *</Label>
          <Textarea
            id="aboutCompanyDetails"
            {...form.register('aboutCompanyDetails')}
            placeholder="Tell us about your company, what you do, and your mission..."
            rows={4}
          />
          <p className="text-sm text-gray-500">Help us understand your business better</p>
          {form.formState.errors.aboutCompanyDetails && (
            <p className="text-sm text-red-500">{form.formState.errors.aboutCompanyDetails.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
        <CardTitle className="text-xl text-gray-900">Social Media & Public Contact Info</CardTitle>
        <CardDescription className="text-gray-600">Share your public business information</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="socialLinks">Social Media Links</Label>
          <Textarea
            id="socialLinks"
            {...form.register('socialLinks')}
            placeholder="Share your social media profiles..."
            rows={3}
          />
          <p className="text-sm text-gray-500">Include links to your social media profiles</p>
          <p className="text-xs text-gray-400">Example: https://facebook.com/yourcompany, https://instagram.com/yourcompany</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publicBusinessNumber">Public Business Number</Label>
          <Input
            id="publicBusinessNumber"
            {...form.register('publicBusinessNumber')}
            placeholder="e.g., +1 (555) 123-4567"
          />
          <p className="text-sm text-gray-500">Phone number for customer inquiries</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publicCompanyEmail">Public Company Email</Label>
          <Input
            id="publicCompanyEmail"
            type="email"
            {...form.register('publicCompanyEmail')}
            placeholder="info@yourcompany.com"
          />
          <p className="text-sm text-gray-500">Email address for customer inquiries</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publicCompanyAddress">Public Company Address</Label>
          <Textarea
            id="publicCompanyAddress"
            {...form.register('publicCompanyAddress')}
            placeholder="Your public business address..."
            rows={3}
          />
          <p className="text-sm text-gray-500">Address for customer visits or correspondence</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
        <CardTitle className="text-xl text-gray-900">Media & Banking Information</CardTitle>
        <CardDescription className="text-gray-600">Share your media assets and payment preferences</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {/* Media Assets Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Media Assets</h3>
          
          <div className="space-y-2">
            <Label htmlFor="mediaLinks">Images / Video Links</Label>
            <Textarea
              id="mediaLinks"
              {...form.register('mediaLinks')}
              placeholder="Share links to your media content..."
              rows={3}
            />
            <p className="text-sm text-gray-500">Include links to testimonials, portfolio images, videos, or any other media you'd like to showcase</p>
            <p className="text-xs text-gray-400">Example: https://youtube.com/watch?v=example, https://drive.google.com/portfolio-images</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaFiles">Upload Images / Videos</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">Drop files here or click to upload</p>
              <Input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button type="button" variant="outline">
                  Choose Files
                </Button>
              </Label>
            </div>
            <p className="text-sm text-gray-500">Upload high-quality images and videos that represent your brand. Supported formats: JPG, PNG, GIF, MP4, MOV.</p>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Files:</p>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Integration Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Integration</h3>
          
          <div className="space-y-2">
            <Label htmlFor="paymentIntegrationNeeds">Payment Integration Needs</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Stripe Integration', 'PayPal Integration', 'Bank Transfer Setup', 'Subscription Billing', 'Invoice Generation', 'Refund Processing', 'Multi-currency Support', 'Payment Analytics'].map((option) => (
                <label key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={option}
                    onChange={(e) => {
                      const current = form.getValues('paymentIntegrationNeeds') || [];
                      if (e.target.checked) {
                        form.setValue('paymentIntegrationNeeds', [...current, option]);
                      } else {
                        form.setValue('paymentIntegrationNeeds', current.filter(item => item !== option));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">Select the payment features you need for your business. This helps us configure the right payment solutions.</p>
            <p className="text-xs text-gray-400">Choose all that apply - we'll set up the payment infrastructure you need</p>
          </div>
        </div>

        {/* Banking Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Banking Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                {...form.register('account_name')}
                placeholder="e.g. John Doe Business Account"
              />
              <p className="text-sm text-gray-500">The legal name on the bank account</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                {...form.register('account_number')}
                placeholder="e.g. 12345678"
              />
              <p className="text-sm text-gray-500">Your domestic bank account number</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                {...form.register('iban')}
                placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
              />
              <p className="text-sm text-gray-500">International Bank Account Number for international transfers</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="swift">SWIFT / BIC</Label>
              <Input
                id="swift"
                {...form.register('swift')}
                placeholder="e.g. ABCDGB2L"
              />
              <p className="text-sm text-gray-500">Bank SWIFT/BIC code for international transfers</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep6 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Review & Confirm</CardTitle>
        <CardDescription>Review your project details before submitting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Project Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span> {watchedValues.project_name}
              </div>
              <div>
                <span className="text-gray-500">Type:</span> {watchedValues.project_type}
              </div>
              <div>
                <span className="text-gray-500">Budget:</span> ${watchedValues.budget}
              </div>
              <div>
                <span className="text-gray-500">Priority:</span> {watchedValues.priority}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium">Company Information</h4>
            <div className="text-sm space-y-1">
              <div><span className="text-gray-500">Email:</span> {watchedValues.contactCompanyEmail}</div>
              <div><span className="text-gray-500">Business Number:</span> {watchedValues.contactBusinessNumber}</div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium">Files & Media</h4>
            <div className="text-sm">
              <div><span className="text-gray-500">Uploaded Files:</span> {uploadedFiles.length}</div>
              <div><span className="text-gray-500">Media Links:</span> {mediaLinks.filter(link => link.trim() !== '').length}</div>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            By submitting this form, you confirm that all information is accurate and complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep1();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">New Project</h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              Step {currentStep} of {totalSteps}
            </Badge>
          </div>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="mb-6 h-2" />
        
        {/* Step Navigation */}
        <div className="flex items-center justify-between mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i + 1 <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : i + 1 === currentStep + 1 
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  i + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderCurrentStep()}

        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onCancel : previousStep}
            className="px-6 py-2"
          >
            {currentStep === 1 ? 'Cancel' : '← Previous'}
          </Button>

          {currentStep < totalSteps ? (
            <Button type="button" onClick={nextStep} className="px-6 py-2 bg-blue-600 hover:bg-blue-700">
              Next →
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="px-8 py-2 bg-green-600 hover:bg-green-700">
              {isSubmitting ? 'Creating Project...' : '✓ Create Project'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
