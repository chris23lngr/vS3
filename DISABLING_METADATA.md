# Disabling Metadata for Specific Routes

## Overview

By default, when you define a `metadataSchema` in your storage options, all routes will require metadata. However, some routes (like download) don't need metadata to be provided by the user. This guide shows you how to disable metadata requirements for specific routes.

## Two Approaches

### Approach 1: Route-Level Configuration (For Existing Routes)

You can pass a configuration object to route factories to disable metadata:

```typescript
// In your route factory
export function createUploadRoute<O extends StorageOptions>(
  options: O,
  config: { requireMetadata?: boolean } = { requireMetadata: true },
) {
  const baseSchema = z.object({
    file: z.instanceof(File),
  });

  // Only add metadata if requireMetadata is true AND metadataSchema exists
  const bodySchema = config.requireMetadata !== false && options.metadataSchema
    ? baseSchema.extend({
        metadata: createStandardSchemaValidator(options.metadataSchema),
      })
    : baseSchema;

  // ... rest of implementation
}
```

Then when creating endpoints:

```typescript
const endpoints = {
  upload: createUploadRoute(options), // metadata required (default)
  uploadPublic: createUploadRoute(options, { requireMetadata: false }), // no metadata
};
```

### Approach 2: No Metadata from the Start (Recommended for New Routes)

Simply don't add metadata to the schema at all:

```typescript
// src/api/routes/download.ts
export function createDownloadRoute<O extends StorageOptions>(options: O) {
  // Just define your base schema - no metadata
  const bodySchema = z.object({
    key: z.string(),
  });

  return createStorageEndpoint(
    "/generate-download-url",
    {
      method: "POST",
      body: bodySchema as any,
    },
    async (ctx) => {
      const { key } = ctx.body;
      // No metadata available here
      // ...
    },
  );
}
```

## Type Definitions

Update your API types to specify which routes don't require metadata:

```typescript
// src/types/api.ts

// Add a third parameter to WithMetadata to control if metadata is required
export type WithMetadata<
  BaseBody,
  O extends StorageOptions,
  RequireMetadata extends boolean = true,
> = RequireMetadata extends true
  ? O["metadataSchema"] extends StandardSchemaV1
    ? BaseBody & {
        metadata: StandardSchemaV1.InferInput<NonNullable<O["metadataSchema"]>>;
      }
    : BaseBody
  : BaseBody; // If RequireMetadata is false, never add metadata

// Download doesn't require metadata
export type DownloadBody<O extends StorageOptions> = WithMetadata<
  { key: string },
  O,
  false // Set to false to disable metadata requirement
>;

export type DownloadAPI<O extends StorageOptions> = (context: {
  body: DownloadBody<O>;
}) => Promise<{ downloadUrl: string }>;

// Add to StorageAPI
export type StorageAPI<O extends StorageOptions> = {
  upload: UploadAPI<O>;
  download: DownloadAPI<O>;
  // ... other routes
};
```

## Examples

### Example 1: Storage with Metadata Schema

```typescript
const storage = createStorage({
  bucket: "my-bucket",
  metadataSchema: z.object({
    userId: z.string(),
  }),
});

// ✅ Upload requires metadata
await storage.api.upload({
  body: {
    file: myFile,
    metadata: { userId: "123" }, // Required!
  },
});

// ✅ Download does NOT require metadata
await storage.api.download({
  body: {
    key: "file-key",
    // No metadata field!
  },
});

// ❌ Error - can't add metadata to download
await storage.api.download({
  body: {
    key: "file-key",
    metadata: { userId: "123" }, // TypeScript error!
  },
});
```

### Example 2: Storage without Metadata Schema

```typescript
const storage = createStorage({
  bucket: "my-bucket",
  // No metadataSchema
});

// ✅ Upload doesn't require metadata (no schema defined)
await storage.api.upload({
  body: {
    file: myFile,
  },
});

// ✅ Download doesn't require metadata
await storage.api.download({
  body: {
    key: "file-key",
  },
});
```

## Common Use Cases

### Routes That Should NOT Require Metadata:

1. **Download** - Just need the key to download
2. **List** - Listing files doesn't need metadata
3. **Get Info** - Getting file info by key
4. **Public Upload** - Public uploads might not need user metadata

### Routes That SHOULD Require Metadata:

1. **Upload** - Tag files with user/org info
2. **Delete** - Authorization checks before deletion
3. **Update** - Verify ownership before updates
4. **Move/Copy** - Track who performed the operation

## Testing

Create tests to verify metadata requirements:

```typescript
// Test that download doesn't accept metadata even with schema defined
const storage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
});

// Should compile without error
storage.api.download({
  body: { key: "test" },
});

// Should be a TypeScript error
storage.api.download({
  body: {
    key: "test",
    // @ts-expect-error - metadata not allowed
    metadata: { userId: "123" },
  },
});
```

Run: `npx tsc --noEmit` to verify type checks pass.

## Summary

To disable metadata for a route:

1. **Don't add metadata to the body schema** in the route implementation
2. **Set RequireMetadata to false** in the type definition
3. **Update StorageAPI** to include the new route type

This gives you fine-grained control over which routes require metadata while maintaining full type safety!

## Visual Comparison

```
┌─────────────────────────────────────────────────────────────┐
│  With Metadata Schema Defined                               │
├─────────────────────────┬───────────────────────────────────┤
│  Route                  │  Metadata Required?               │
├─────────────────────────┼───────────────────────────────────┤
│  upload                 │  ✅ YES - metadata required       │
│  delete                 │  ✅ YES - metadata required       │
│  download               │  ❌ NO - metadata not allowed     │
│  list                   │  ❌ NO - metadata not allowed     │
└─────────────────────────┴───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Without Metadata Schema                                    │
├─────────────────────────┬───────────────────────────────────┤
│  Route                  │  Metadata Required?               │
├─────────────────────────┼───────────────────────────────────┤
│  upload                 │  ❌ NO - no schema defined        │
│  delete                 │  ❌ NO - no schema defined        │
│  download               │  ❌ NO - no schema defined        │
│  list                   │  ❌ NO - no schema defined        │
└─────────────────────────┴───────────────────────────────────┘
```
