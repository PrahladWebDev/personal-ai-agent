'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function SocialLinksPage() {
  return (
    <ResourceManager
      title="Social Links"
      endpoint="/social-links"
      fields={[
        { key: 'platform', label: 'Platform', type: 'text', required: true, placeholder: 'GitHub, LinkedIn, X…' },
        { key: 'url', label: 'URL', type: 'text', required: true },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'platform', label: 'Platform' },
        { key: 'url', label: 'URL' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
