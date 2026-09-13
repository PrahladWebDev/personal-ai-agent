'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

export default function ServicesPage() {
  return (
    <ResourceManager
      title="Services"
      description="What you offer — freelance/consulting services the AI can describe when asked 'What services do you offer?'"
      endpoint="/services"
      fields={[
        { key: 'name', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. Full Stack Development' },
        { key: 'shortDescription', label: 'Short Description', type: 'textarea' },
        { key: 'detailedDescription', label: 'Detailed Description', type: 'textarea' },
        { key: 'technologies', label: 'Technologies', type: 'tags' },
        {
          key: 'experienceLevel', label: 'Experience Level', type: 'select',
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ],
        },
        {
          key: 'availability', label: 'Availability', type: 'select',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'limited', label: 'Limited' },
            { value: 'unavailable', label: 'Unavailable' },
          ],
        },
        { key: 'serviceUrl', label: 'Service URL (optional)', type: 'text' },
        {
          key: 'visibility', label: 'Visibility', type: 'select',
          options: [{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }],
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'availability', label: 'Availability' },
        { key: 'visibility', label: 'Visibility' },
      ]}
    />
  );
}
