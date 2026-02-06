# vs3 Documentation Site Outline

## Top-Level Navigation
1. Home
2. Getting Started
3. Quickstart
4. Core Concepts
5. Server Setup
6. Client Usage
7. Security & Middleware
8. Validation
9. Encryption
10. Integrations
11. Reference
12. Errors & Troubleshooting
13. Recipes
14. Changelog / Migration
15. FAQ

## Page Details

### Home
- One-line pitch: type-safe S3 storage with presigned URLs, validation, middleware, and framework integrations.
- Quick value props (type safety, validation, presigned upload/download, React hooks, middleware).
- Minimal flow diagram: Client → API → S3 (upload/download).
- CTAs to Quickstart and Server Setup.

### Getting Started
- Requirements: Node >= 18, AWS SDK, S3 bucket.
- Install: `pnpm add vs3 @aws-sdk/client-s3`.
- Mental model: storage, adapter, routes, metadata schema, client.
- Checklist for first upload.

### Quickstart
- Server: `createStorage` with AWS S3 adapter and `bucket`.
- API handler wiring (fetch-compatible handler).
- Client: `createStorageClient` from `vs3/react`.
- Upload and download example with expected result.

### Core Concepts
- Storage: `createStorage` returns `api`, `handler`, and `~options`.
- Adapter: interface and responsibilities (presigned upload/download, delete).
- Routes: `/upload-url` and `/download-url`.
- Metadata schema: Standard Schema V1 and Zod usage.
- Hooks: `beforeUpload`, `afterUpload`, `beforeDownload`, `afterDownload`.
- Client vs server validation responsibilities.

### Server Setup
- `StorageOptions` deep dive:
  - `bucket`, `adapter`, `maxFileSize`, `allowedFileTypes`.
  - `contentValidators`, `contentValidatorTimeoutMs`.
  - `metadataSchema`, `apiPath`, `baseUrl`.
  - `middlewares`, `generateKey`, `hooks`.
- AWS S3 adapter:
  - `createAwsS3Adapter` usage and bucket resolution.
  - Presigned URL options: `expiresIn`, `acl`, metadata, encryption.
- API routing:
  - `handler` in fetch-style runtimes.
  - Custom `apiPath`.

### Client Usage
- `vs3/react` setup with `createStorageClient`.
- `useUpload` API: progress, success, error, result shape.
- `useDownload` API: modes (`url`, `direct-download`, `preview`).
- Client-side validation: `maxFileSize`, `allowedFileTypes`.
- Upload retries and abort behavior.

### Security & Middleware
- Request signing:
  - `createRequestSigner` and `createClientRequestSigner`.
  - Timestamps, nonce usage, replay prevention.
- Signature verification:
  - `createVerifySignatureMiddleware` configuration.
- Built-in middleware:
  - CORS, rate limit, logging, timeout.
- Middleware chaining and error propagation.

### Validation
- File size and type validation.
- Filename sanitization rules.
- Custom content validators (sync/async).
- Validator timeouts and failure reporting.

### Encryption
- Supported S3 encryption modes:
  - `SSE-S3`, `SSE-KMS`, `SSE-C`.
- Upload vs download handling and required headers.

### Integrations
- Next.js: `toNextJsRouteHandler` usage.
- Example mapping of `handler` to Next.js routes.

### Reference
- Root exports:
  - `createStorage`, `aws` adapter, validation helpers, security helpers, middleware utilities.
- `vs3/react` exports:
  - `createStorageClient`.
- `vs3/integrations/next-js` exports:
  - `toNextJsRouteHandler`.
- Types:
  - `StorageOptions`, `Adapter`, `S3Encryption`, `Storage`, validation and security types.

### Errors & Troubleshooting
- Error model: `StorageError`, `StorageServerError`, `StorageClientError`.
- Error code list and meanings (e.g., `FILE_TOO_LARGE`, `SIGNATURE_INVALID`).
- Common fixes:
  - Client/server validation mismatch.
  - Missing metadata.
  - Invalid object key.

### Recipes
- Custom key generation (user-based paths).
- Content policy validation example.
- Hook-based access control.
- Signed request setup example.

### Changelog / Migration
- Link to `CHANGELOG.md` and breaking changes.

### FAQ
- Why metadata schema?
- Can I use vs3 without React?
- How to switch buckets dynamically?
