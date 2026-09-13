-- Widen document_chunks.source_type to support the new knowledge sections
-- (certifications, services, personal info, career goals) added alongside
-- the existing structured sources.
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;
ALTER TABLE document_chunks ADD CONSTRAINT document_chunks_source_type_check
  CHECK (source_type IN (
    'document','project','profile','skill','experience','education','achievement',
    'certification','service','personal','career'
  ));
