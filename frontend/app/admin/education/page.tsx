'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function EducationPage() {
  return (
    <ResourceManager
      title="Education"
      endpoint="/education"
      fields={[
        { key: 'institution', label: 'Institution', type: 'text', required: true },
        { key: 'degree', label: 'Degree', type: 'text' },
        { key: 'fieldOfStudy', label: 'Field of Study', type: 'text' },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'institution', label: 'Institution' },
        { key: 'degree', label: 'Degree' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
