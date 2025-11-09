'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/lib/project-service';
import { ProjectFormData } from '@/lib/types/project';
import { Loader2 } from 'lucide-react';

// Simplified schema for step 1 only
const manualIntakeSchema = z.object({
  project_name: z.string().min(3, 'Project name must be at least 3 characters'),
  project_type: z.enum(['Web Development', 'Branding Design', 'AI Solutions', 'Digital Marketing', 'Custom Project']),
  description: z.string().optional(),
  client_name: z.string().optional(),
  budget: z.number().min(0, 'Budget must be positive'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
});

type ManualIntakeValues = z.infer<typeof manualIntakeSchema>;

interface ManualProjectIntakeProps {
  onSuccess?: (projectId: string) => void;
  onCancel?: () => void;
}

export function ManualProjectIntake({ onSuccess, onCancel }: ManualProjectIntakeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualIntakeValues>({
    resolver: zodResolver(manualIntakeSchema),
    defaultValues: {
      project_name: '',
      project_type: 'Web Development',
      description: '',
      client_name: '',
      budget: 0,
      start_date: '',
      end_date: '',
      priority: 'Medium',
    },
  });

  const onSubmit = async (data: ManualIntakeValues) => {
    setIsSubmitting(true);
    try {
      const projectData: ProjectFormData = {
        name: data.project_name,
        type: data.project_type.toLowerCase().replace(' ', '-') as any,
        description: data.description || undefined,
        client_name: data.client_name || undefined,
        budget: data.budget,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        status: 'planning' as any,
        priority: data.priority.toLowerCase() as any,
        service_specific: {},
        company_number: '',
        company_email: '',
        company_address: '',
        about_company: '',
        social_links: [],
        public_contacts: {},
        media_links: [],
        bank_details: {},
      };

      const project = await projectService.createProject(projectData);
      
      toast({
        title: 'Project Created',
        description: 'Project has been successfully created.',
      });

      // Reset form
      form.reset();
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

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-xl text-gray-900">Manual Project Intake</CardTitle>
          <CardDescription className="text-gray-600">
            Enter basic project information to create a new project
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Select 
                  value={form.watch('project_type')} 
                  onValueChange={(value) => form.setValue('project_type', value as any)}
                >
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
                <Label htmlFor="budget">Budget ($) *</Label>
                <Input
                  id="budget"
                  type="number"
                  {...form.register('budget', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
                {form.formState.errors.budget && (
                  <p className="text-sm text-red-500">{form.formState.errors.budget.message}</p>
                )}
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
                <Label htmlFor="priority">Priority *</Label>
                <Select 
                  value={form.watch('priority')} 
                  onValueChange={(value) => form.setValue('priority', value as any)}
                >
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

