# VS3 API Contract

This document defines the **public API surface**, **error/response contracts**, and **stability guarantees** for VS3.

## 1. Public API Surface (Stable)

Only the exports listed below are considered **public and stable**. Anything not listed is **internal** and may change without notice.

### Entry: `vs3`

Exports from `packages/vs3/src/index.ts`:

- `createStorage(options): Storage`
- `aws(options): Adapter`
- `toNextJsRouteHandler(opts): NextJsRouteHandler`
- `Adapter` (type)
- `StorageOptions` (type)
- `Storage` (type)

### Entry: `vs3/adapters`

Exports from `packages/vs3/src/adapters/index.ts`:

- `aws(options): Adapter`
- `generateObjectKey(fileInfo): string`

### Entry: `vs3/integrations/next-js`

Exports from `packages/vs3/src/integrations/next-js.ts`:

- `toNextJsRouteHandler(opts): NextJsRouteHandler`

### Entry: `vs3/react`

Exports from `packages/vs3/src/client/react/index.ts`:

- `createStorageClient(options?): { useUpload: HookFactory }`

## 2. Internal APIs (Unstable)

The following are **internal** and **not** stable:

- Any path not exported by `package.json` `exports`.
- Any module under `packages/vs3/src/api`, `packages/vs3/src/client`, `packages/vs3/src/core`, `packages/vs3/src/context`, or `packages/vs3/src/types`, unless explicitly exported by the public entries above.

Internal APIs may change in any release without deprecation.

## 3. HTTP Endpoint Contract

VS3 currently defines a single storage endpoint in the registry:

### `POST /upload-url`

**Request Body**

```json
{
  "fileInfo": {
    "name": "string",
    "size": 123,
    "contentType": "string"
  },
  "expiresIn": 3600,
  "acl": "public-read"
}
```

**Response Body**

```json
{
  "presignedUrl": "string",
  "key": "string"
}
```

Notes:

- Request schema is defined in `packages/vs3/src/api/registry.ts`.
- Route-specific metadata is validated according to the configured `metadataSchema` in `createStorage`.

## 4. Error Shape Contract

When VS3 surfaces structured errors, they follow this shape:

```json
{
  "origin": "client" | "server",
  "message": "string",
  "code": "StorageErrorCode",
  "details": "unknown"
}
```

- `origin` indicates where the error was created.
- `code` is a stable error identifier (see below).
- `details` may include validation issues or context; it is **not** a stable schema.

### Error Codes (Versioned)

Current error codes are defined in `packages/vs3/src/core/error/codes.ts`:

- `INTERNAL_SERVER_ERROR`
- `METADATA_VALIDATION_ERROR`
- `NETWORK_ERROR`
- `UNKNOWN_ERROR`
- `INVALID_FILE_INFO`

**Versioning policy for error codes**:

- Error codes are stable within a **major** version.
- New error codes may be added in **minor** releases.
- Removing or repurposing a code requires a **major** release.

## 5. Deprecation Policy

- Public APIs are deprecated at least **one major version** before removal.
- Deprecations must include a migration note and replacement guidance.
- Deprecated APIs remain functional until the next major release unless explicitly marked as experimental.

## 6. Compatibility Guarantees

- Public APIs listed in section 1 are stable for the lifetime of a major version.
- Internal APIs are explicitly excluded from compatibility guarantees.
