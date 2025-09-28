'use client';

import { ProjectCreationForm } from '@/components/project-creation-form';

export default function CreateProjectPage() {
  return (
    <div className="container mx-auto py-6">
      <ProjectCreationForm
        onSuccess={(projectId) => {
          // Redirect to project details or projects list
          window.location.href = `/projects`;
        }}
        onCancel={() => {
          window.location.href = `/projects`;
        }}
      />
    </div>
  );
}
