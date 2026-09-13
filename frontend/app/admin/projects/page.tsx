'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function ProjectsPage() {
  return (
    <ResourceManager
      title="Projects"
      description='Toggling "Visibility" to Public is how a project is published to the AI agent.'
      endpoint="/projects"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'slug', label: 'Slug (optional, auto-generated from name)', type: 'text' },
        { key: 'shortDescription', label: 'Short Description', type: 'textarea' },
        { key: 'detailedDescription', label: 'Detailed Description', type: 'textarea' },
        { key: 'problem', label: 'Problem', type: 'textarea' },
        { key: 'solution', label: 'Solution', type: 'textarea' },
        { key: 'architecture', label: 'Architecture', type: 'textarea' },
        { key: 'contribution', label: 'My Contribution', type: 'textarea' },
        { key: 'challenges', label: 'Challenges', type: 'textarea' },
        { key: 'challengeSolutions', label: 'How Challenges Were Solved', type: 'textarea' },
        { key: 'features', label: 'Key Features', type: 'tags' },
        { key: 'technologies', label: 'Technologies', type: 'tags' },
        { key: 'githubUrl', label: 'GitHub URL', type: 'text' },
        { key: 'liveUrl', label: 'Live URL', type: 'text' },
        { key: 'documentationUrl', label: 'Documentation URL', type: 'text' },
        {
          key: 'status', label: 'Status', type: 'select',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
          ],
        },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'private', label: 'Private (hidden from AI)' }, { value: 'public', label: 'Public (AI can reference it)' }],
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
