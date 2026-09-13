'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function CertificationsPage() {
  return (
    <ResourceManager
      title="Certifications"
      description="Professional certifications and credentials. Answers questions like 'What certifications do you have?'"
      endpoint="/certifications"
      fields={[
        { key: 'name', label: 'Certification Name', type: 'text', required: true },
        { key: 'issuingOrganization', label: 'Issuing Organization', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'issueDate', label: 'Issue Date', type: 'date' },
        { key: 'expirationDate', label: 'Expiration Date (optional)', type: 'date' },
        { key: 'credentialId', label: 'Credential ID (optional)', type: 'text' },
        { key: 'credentialUrl', label: 'Credential URL (optional)', type: 'text' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'issuing_organization', label: 'Issuer' },
        { key: 'issue_date', label: 'Issued' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
