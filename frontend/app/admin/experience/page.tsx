'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function ExperiencePage() {
  return (
    <ResourceManager
      title="Experience"
      endpoint="/experience"
      fields={[
        { key: 'company', label: 'Company', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text', required: true },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'isCurrent', label: 'Current Role', type: 'checkbox' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'responsibilities', label: 'Responsibilities', type: 'tags' },
        { key: 'technologies', label: 'Technologies', type: 'tags' },
        { key: 'achievements', label: 'Achievements', type: 'tags' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'role', label: 'Role' },
        { key: 'company', label: 'Company' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
