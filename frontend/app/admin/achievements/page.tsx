'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function AchievementsPage() {
  return (
    <ResourceManager
      title="Achievements"
      description="Certifications, awards, and other achievements."
      endpoint="/achievements"
      fields={[
        { key: 'title', label: 'Title', type: 'text', required: true },
        {
          key: 'category', label: 'Category', type: 'select',
          options: [
            { value: 'certification', label: 'Certification' },
            { value: 'award', label: 'Award' },
            { value: 'achievement', label: 'Achievement' },
            { value: 'other', label: 'Other' },
          ],
        },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'url', label: 'URL', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
