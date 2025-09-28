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
import { ProjectFormData, ProjectType, ProjectPriority } from '@/lib/types/project';
import { useToast } from '@/hooks/use-toast';

// Form validation schema
const projectFormSchema = z.object({
  // Step 1: Core Project Details
  project_name: z.string().min(3, 'Project name must be at least 3 characters'),
  project_type: z.enum(['Web Development', 'Branding Design', 'AI Solutions', 'Digital Marketing', 'Custom Project']),
  description: z.string().optional(),
  client_name: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),

  // Step 2: Conditional Requirements (Dynamic per type)
  project_details: z.record(z.any()).default({}),

  // Step 3: Company Info
  business_number: z.string().optional(),
  company_email: z.string().email().optional().or(z.literal('')),
  company_address: z.string().optional(),
  about_company: z.string().optional(),

  // Step 4: Public Contact
  social_media_links: z.array(z.string()).default([]),
  public_business_number: z.string().optional(),
  public_company_email: z.string().email().optional().or(z.literal('')),
  public_company_address: z.string().optional(),

  // Step 5: Media & Payment
  media_links: z.array(z.string()).default([]),
  uploaded_files: z.array(z.any()).default([]),
  bank_details: z.string().optional(),
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
      project_name: '',
      project_type: 'Web Development',
      description: '',
      client_name: '',
      budget: 0,
      start_date: '',
      end_date: '',
      priority: 'Medium',
      project_details: {},
      business_number: '',
      company_email: '',
      company_address: '',
      about_company: '',
      social_media_links: [],
      public_business_number: '',
      public_company_email: '',
      public_company_address: '',
      media_links: [],
      uploaded_files: [],
      bank_details: '',
    },
  });

  const watchedValues = form.watch();
  const totalSteps = 6;

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    form.setValue('uploaded_files', [...uploadedFiles, ...files]);
  }, [uploadedFiles, form]);

  const removeFile = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    form.setValue('uploaded_files', newFiles);
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
    form.setValue('social_media_links', socialLinks.filter(link => link.trim() !== ''));
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
    form.setValue('media_links', mediaLinks.filter(link => link.trim() !== ''));
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
      const projectData: ProjectFormData = {
        ...data,
        uploaded_files: uploadedFiles,
        social_media_links: socialLinks.filter(link => link.trim() !== ''),
        media_links: mediaLinks.filter(link => link.trim() !== ''),
      };

      const project = await projectService.createProject(projectData);
      
      toast({
        title: 'Project Created',
        description: 'Your project has been successfully created.',
      });

      onSuccess?.(project.project_id);
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
        <CardDescription className="text-gray-600">Let's start with the basics about your project</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Select onValueChange={(value) => form.setValue('project_type', value as ProjectType)}>
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
            placeholder="Describe your project..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              {...form.register('client_name')}
              placeholder="Enter client name"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select onValueChange={(value) => form.setValue('priority', value as ProjectPriority)}>
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
      </CardContent>
    </Card>
  );

  const renderStep2 = () => {
    const projectType = watchedValues.project_type;
    
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="text-xl text-gray-900">Project Requirements</CardTitle>
          <CardDescription className="text-gray-600">
            Tell us more about your {projectType} project needs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {projectType === 'Web Development' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website_type">Website Type</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.website_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select website type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing-page">Landing Page</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="blog">Blog/Content Site</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="saas">SaaS Application</SelectItem>
                      <SelectItem value="corporate">Corporate Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.platform', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                      <SelectItem value="react">React</SelectItem>
                      <SelectItem value="vue">Vue.js</SelectItem>
                      <SelectItem value="angular">Angular</SelectItem>
                      <SelectItem value="custom">Custom Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Required Features</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Responsive Design', 'SEO Optimization', 'Contact Forms', 'User Authentication', 'Payment Integration', 'Admin Dashboard'].map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`feature-${feature}`}
                        onChange={(e) => {
                          const currentFeatures = form.getValues('project_details.features') || [];
                          if (e.target.checked) {
                            form.setValue('project_details.features', [...currentFeatures, feature]);
                          } else {
                            form.setValue('project_details.features', currentFeatures.filter(f => f !== feature));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`feature-${feature}`} className="text-sm">{feature}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {projectType === 'Branding Design' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_scope">Brand Scope</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.brand_scope', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logo-only">Logo Only</SelectItem>
                      <SelectItem value="logo-guidelines">Logo + Brand Guidelines</SelectItem>
                      <SelectItem value="full-branding">Full Brand Identity</SelectItem>
                      <SelectItem value="rebrand">Complete Rebrand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    {...form.register('project_details.industry')}
                    placeholder="e.g., Technology, Healthcare, Finance"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_values">Brand Values & Personality</Label>
                <Textarea
                  id="brand_values"
                  {...form.register('project_details.brand_values')}
                  placeholder="Describe your brand values, personality, and what makes you unique..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          {projectType === 'AI Solutions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_type">AI Solution Type</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.ai_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI solution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatbot">AI Chatbot</SelectItem>
                      <SelectItem value="automation">Process Automation</SelectItem>
                      <SelectItem value="analytics">AI Analytics</SelectItem>
                      <SelectItem value="recommendation">Recommendation Engine</SelectItem>
                      <SelectItem value="nlp">Natural Language Processing</SelectItem>
                      <SelectItem value="computer-vision">Computer Vision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_requirements">Data Requirements</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.data_requirements', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data requirements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal Data</SelectItem>
                      <SelectItem value="moderate">Moderate Data</SelectItem>
                      <SelectItem value="large">Large Dataset</SelectItem>
                      <SelectItem value="big-data">Big Data</SelectItem>
                      <SelectItem value="real-time">Real-time Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai_goals">AI Goals & Objectives</Label>
                <Textarea
                  id="ai_goals"
                  {...form.register('project_details.ai_goals')}
                  placeholder="Describe what you want the AI to accomplish, your specific use cases, and expected outcomes..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          {projectType === 'Digital Marketing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marketing_goals">Marketing Goals</Label>
                  <Select onValueChange={(value) => form.setValue('project_details.marketing_goals', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand-awareness">Brand Awareness</SelectItem>
                      <SelectItem value="lead-generation">Lead Generation</SelectItem>
                      <SelectItem value="sales-increase">Sales Increase</SelectItem>
                      <SelectItem value="traffic-growth">Traffic Growth</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="conversion">Conversion Optimization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Input
                    id="target_audience"
                    {...form.register('project_details.target_audience')}
                    placeholder="e.g., Small business owners, Tech professionals"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketing_channels">Marketing Channels</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Social Media', 'Google Ads', 'Facebook Ads', 'Email Marketing', 'Content Marketing', 'SEO'].map((channel) => (
                    <div key={channel} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`channel-${channel}`}
                        onChange={(e) => {
                          const currentChannels = form.getValues('project_details.channels') || [];
                          if (e.target.checked) {
                            form.setValue('project_details.channels', [...currentChannels, channel]);
                          } else {
                            form.setValue('project_details.channels', currentChannels.filter(c => c !== channel));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`channel-${channel}`} className="text-sm">{channel}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {projectType === 'Custom Project' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_scope">Project Scope</Label>
                <Textarea
                  id="project_scope"
                  {...form.register('project_details.project_scope')}
                  placeholder="Describe your project in detail. What do you need? What are your goals? What's the scope of work?"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technical_requirements">Technical Requirements</Label>
                <Textarea
                  id="technical_requirements"
                  {...form.register('project_details.technical_requirements')}
                  placeholder="Any specific technical requirements, integrations, or constraints?"
                  rows={3}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Your company details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_number">Business Number</Label>
            <Input
              id="business_number"
              {...form.register('business_number')}
              placeholder="Enter business number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_email">Company Email</Label>
            <Input
              id="company_email"
              type="email"
              {...form.register('company_email')}
              placeholder="Enter company email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_address">Company Address</Label>
          <Textarea
            id="company_address"
            {...form.register('company_address')}
            placeholder="Enter company address"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="about_company">About Company</Label>
          <Textarea
            id="about_company"
            {...form.register('about_company')}
            placeholder="Tell us about your company..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Public Contact Information</CardTitle>
        <CardDescription>Information that will be publicly visible</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Social Media Links</Label>
          {socialLinks.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => updateSocialLink(index, e.target.value)}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeSocialLink(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addSocialLink}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Social Media Link
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="public_business_number">Public Business Number</Label>
            <Input
              id="public_business_number"
              {...form.register('public_business_number')}
              placeholder="Enter public business number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="public_company_email">Public Company Email</Label>
            <Input
              id="public_company_email"
              type="email"
              {...form.register('public_company_email')}
              placeholder="Enter public company email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="public_company_address">Public Company Address</Label>
          <Textarea
            id="public_company_address"
            {...form.register('public_company_address')}
            placeholder="Enter public company address"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Media & Payment</CardTitle>
        <CardDescription>Upload files and payment information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Upload Files</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">Drop files here or click to upload</p>
            <Input
              type="file"
              multiple
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

        <div className="space-y-2">
          <Label>Media Links</Label>
          {mediaLinks.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => updateMediaLink(index, e.target.value)}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeMediaLink(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addMediaLink}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Media Link
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_details">Bank Details</Label>
          <Textarea
            id="bank_details"
            {...form.register('bank_details')}
            placeholder="Enter bank details..."
            rows={3}
          />
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
              <div><span className="text-gray-500">Email:</span> {watchedValues.company_email}</div>
              <div><span className="text-gray-500">Business Number:</span> {watchedValues.business_number}</div>
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
            <h2 className="text-3xl font-bold text-gray-900">Create New Project</h2>
            <p className="text-gray-600 mt-1">Tell us about your project and we'll help you get started</p>
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
