'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function SkillsPage() {
  return (
    <ResourceManager
      title="Skills"
      description="Technologies and skills the AI agent can talk about."
      endpoint="/skills"
      fields={[
        { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. React Native' },
        {
          key: 'categoryId', label: 'Category', type: 'select',
          optionsEndpoint: '/skills/categories',
          optionsPlaceholder: 'No category',
        },
        {
          key: 'experienceLevel', label: 'Experience Level', type: 'select',
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ],
        },
        { key: 'yearsExperience', label: 'Years of Experience', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'category_name', label: 'Category', render: (row) => row.category_name || '—' },
        { key: 'experience_level', label: 'Level' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
