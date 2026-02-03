# Metadata Control Per Route - Feature Summary

## What Was Added

You can now **disable metadata requirements for specific routes** while keeping them enabled for others. This is useful for routes like `download` that don't need user-provided metadata.

## Quick Example

```typescript
const storage = createStorage({
  bucket: "my-bucket",
  metadataSchema: z.object({
    userId: z.string(),
    teamId: z.string(),
  }),
});

// ✅ Upload REQUIRES metadata
await storage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "123",
      teamId: "team-456",
    },
  },
});

// ✅ Delete REQUIRES metadata
await storage.api.delete({
  body: {
    key: "file-key",
    metadata: {
      userId: "123",
      teamId: "team-456",
    },
  },
});

// ✅ Download does NOT require metadata
await storage.api.download({
  body: {
    key: "file-key",
    // No metadata needed!
  },
});

// ❌ TypeScript Error - download doesn't accept metadata
await storage.api.download({
  body: {
    key: "file-key",
    metadata: { userId: "123" }, // Error!
  },
});
```

## Implementation Details

### 1. Updated Type System

Added a third parameter to `WithMetadata` to control metadata requirement:

```typescript
export type WithMetadata<
  BaseBody,
  O extends StorageOptions,
  RequireMetadata extends boolean = true,
> = RequireMetadata extends true
  ? O["metadataSchema"] extends StandardSchemaV1
    ? BaseBody & { metadata: ... }
    : BaseBody
  : BaseBody; // Never add metadata if RequireMetadata is false
```

### 2. Route Configuration

Routes can now be configured to not require metadata:

```typescript
// Approach 1: Configuration parameter
export function createUploadRoute<O extends StorageOptions>(
  options: O,
  config: { requireMetadata?: boolean } = { requireMetadata: true },
) {
  const bodySchema = config.requireMetadata !== false && options.metadataSchema
    ? baseSchema.extend({ metadata: ... })
    : baseSchema;
  // ...
}

// Approach 2: Simply don't add metadata (recommended for new routes)
export function createDownloadRoute<O extends StorageOptions>(options: O) {
  const bodySchema = z.object({
    key: z.string(),
  });
  // No metadata added at all
  // ...
}
```

### 3. Type Definitions Per Route

Each route can specify if it requires metadata:

```typescript
// Upload requires metadata (RequireMetadata = true)
export type UploadBody<O> = WithMetadata<{ file: File }, O, true>;

// Download doesn't require metadata (RequireMetadata = false)
export type DownloadBody<O> = WithMetadata<{ key: string }, O, false>;
```

## Files Changed/Added

### Modified:
- `src/types/api.ts` - Added `RequireMetadata` parameter to `WithMetadata`
- `src/api/routes/upload.ts` - Added optional `requireMetadata` config
- `src/types/adapter.ts` - Added `generatePresignedDownloadUrl` method

### Created:
- `src/api/routes/download.ts` - Example route without metadata
- `src/test-route-metadata-config.ts` - Tests for metadata control
- `DISABLING_METADATA.md` - Complete guide on disabling metadata
- `METADATA_CONTROL_SUMMARY.md` - This file

### Updated:
- `src/api/index.ts` - Added download route
- `src/api/routes/index.ts` - Export download route
- `src/adapters/aws-s3/aws-s3.ts` - Added download URL generation
- `src/index.ts` - Added download example

## Use Cases

### Routes That Should NOT Require Metadata:

| Route | Reason |
|-------|--------|
| **download** | Just need the key to download a file |
| **get-info** | Retrieving file info by key |
| **list** | Listing files in a bucket |
| **check-exists** | Checking if a file exists |
| **public-upload** | Public uploads don't need user tracking |

### Routes That SHOULD Require Metadata:

| Route | Reason |
|-------|--------|
| **upload** | Tag files with user/org/project info |
| **delete** | Verify user has permission to delete |
| **update** | Check ownership before modification |
| **move/copy** | Track who performed the operation |
| **share** | Record who shared the file |

## Type Safety Guarantees

✅ **Compile-time errors** if you:
- Provide metadata to a route that doesn't accept it
- Omit metadata from a route that requires it
- Provide wrong types for metadata fields

✅ **IDE support**:
- Autocomplete shows only valid fields
- Type hints for metadata structure
- Inline errors for incorrect usage

✅ **Runtime validation**:
- Metadata validated against schema
- Clear error messages for invalid data

## Testing

Run the type safety tests:

```bash
npx tsc --noEmit
```

All tests in `src/test-route-metadata-config.ts` verify:
- ✅ Upload requires metadata when schema is defined
- ✅ Delete requires metadata when schema is defined
- ✅ Download doesn't require metadata (even with schema)
- ✅ Download rejects metadata field
- ✅ All routes work without schema

## Adding a New Route Without Metadata

1. **Create the route** (don't add metadata to schema):

```typescript
// src/api/routes/my-route.ts
export function createMyRoute<O extends StorageOptions>(options: O) {
  const bodySchema = z.object({
    someField: z.string(),
  });

  return createStorageEndpoint("/my-route", {
    method: "POST",
    body: bodySchema as any,
  }, async (ctx) => {
    // No metadata here
    return { result: "success" };
  });
}
```

2. **Add type definition** with `RequireMetadata = false`:

```typescript
// src/types/api.ts
export type MyRouteBody<O> = WithMetadata<
  { someField: string },
  O,
  false // Don't require metadata
>;

export type MyRouteAPI<O> = (context: {
  body: MyRouteBody<O>;
}) => Promise<{ result: string }>;

// Add to StorageAPI
export type StorageAPI<O> = {
  // ...
  myRoute: MyRouteAPI<O>;
};
```

3. **Register the route**:

```typescript
// src/api/index.ts
const endpoints = {
  // ...
  myRoute: createMyRoute(options),
};
```

## Benefits

| Before | After |
|--------|-------|
| All routes require metadata | Choose per route |
| Download needs metadata | Download is metadata-free |
| One-size-fits-all | Flexible configuration |
| Type system forces metadata everywhere | Type system respects route config |

## Summary

This feature provides **fine-grained control** over metadata requirements:

- ✅ Enable metadata for routes that need it (upload, delete)
- ✅ Disable metadata for routes that don't (download, list)
- ✅ Full type safety for both cases
- ✅ Clear TypeScript errors for mistakes
- ✅ Easy to configure per route

See `DISABLING_METADATA.md` for complete implementation guide!
