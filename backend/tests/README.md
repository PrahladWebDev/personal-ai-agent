# Tests

Unit tests here cover pure logic (chunking, prompt building, prompt-injection
detection) with no external dependencies, so they run with `npm test` with
no database or network required.

Integration tests that need a real Postgres+pgvector instance (auth flow,
end-to-end RAG retrieval, and the most important privacy test - "a private
document must never appear in a public chat answer") are documented in
`tests/INTEGRATION.md` and are intended to run against the dockerized
`postgres` service in CI, since they require the extension and real data.
