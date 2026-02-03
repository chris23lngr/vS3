# Type-Safe Dynamic Metadata Schema - Solution Overview

## Problem Statement

You needed a way to:
1. Define metadata schemas for file operations
2. Make metadata **required** when a schema is defined
3. Make metadata **type-safe** based on the schema
4. Apply this pattern to **all routes** (upload, delete, etc.)
5. Get **compile-time errors** for incorrect usage

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Defines Options                         │
│                                                                  │
│  const storage = createStorage({                                │
│    bucket: "test",                                              │
│    metadataSchema: z.object({ userId: z.string() })            │
│  })                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Type Parameter Flow                            │
│                                                                  │
│  createStorage<O extends StorageOptions>                        │
│         │                                                        │
│         ├─► getEndpoints<O>(context, options)                  │
│         │          │                                            │
│         │          ├─► createUploadRoute<O>(options)           │
│         │          │        │                                   │
│         │          │        └─► Conditional Schema Building     │
│         │          │                                            │
│         │          └─► createDeleteRoute<O>(options)           │
│         │                   │                                   │
│         │                   └─► Conditional Schema Building     │
│         │                                                        │
│         └─► toStorageEndpoints<O>(endpoints, context)          │
│                    │                                            │
│                    └─► Returns: StorageAPI<O>                   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Conditional Types                             │
│                                                                  │
│  type WithMetadata<BaseBody, O> =                               │
│    O["metadataSchema"] extends StandardSchemaV1                 │
│      ? BaseBody & { metadata: InferInput<O["metadataSchema"]> }│
│      : BaseBody                                                 │
│                                                                  │
│  ┌────────────────────┬────────────────────┐                   │
│  │  With Schema       │  Without Schema    │                   │
│  ├────────────────────┼────────────────────┤                   │
│  │  {                 │  {                 │                   │
│  │    file: File,     │    file: File      │                   │
│  │    metadata: {     │  }                 │                   │
│  │      userId: string│                    │                   │
│  │    }               │                    │                   │
│  │  }                 │                    │                   │
│  └────────────────────┴────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Runtime Schema Building                         │
│                                                                  │
│  const baseSchema = z.object({ file: z.instanceof(File) });    │
│                                                                  │
│  const bodySchema = options.metadataSchema                      │
│    ? baseSchema.extend({                                        │
│        metadata: createStandardSchemaValidator(                 │
│          options.metadataSchema                                 │
│        )                                                         │
│      })                                                          │
│    : baseSchema;                                                │
│                                                                  │
│  ┌──────────────────────────────────────────┐                  │
│  │  StandardSchemaV1 Validator              │                  │
│  │  - Works with Zod, Valibot, ArkType      │                  │
│  │  - Validates at runtime                  │                  │
│  │  - Throws on validation errors           │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    End Result: Type Safety                       │
│                                                                  │
│  ✅ storage.api.upload({                                        │
│      body: {                                                    │
│        file: myFile,                                            │
│        metadata: { userId: "123" }  // Required & type-safe    │
│      }                                                          │
│    })                                                           │
│                                                                  │
│  ❌ storage.api.upload({                                        │
│      body: { file: myFile }  // Error: metadata missing        │
│    })                                                           │
│                                                                  │
│  ❌ storage.api.upload({                                        │
│      body: {                                                    │
│        file: myFile,                                            │
│        metadata: { userId: 123 }  // Error: wrong type         │
│      }                                                          │
│    })                                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Implementation Files

### 1. Type Definitions (`src/types/api.ts`)
```typescript
// Conditional type that adds metadata when schema exists
type WithMetadata<BaseBody, O extends StorageOptions> =
  O["metadataSchema"] extends StandardSchemaV1
    ? BaseBody & { metadata: StandardSchemaV1.InferInput<...> }
    : BaseBody;

// API type with conditional metadata
type StorageAPI<O extends StorageOptions> = {
  upload: (context: { body: WithMetadata<{ file: File }, O> }) => ...;
  delete: (context: { body: WithMetadata<{ key: string }, O> }) => ...;
};
```

### 2. Route Factory (`src/api/routes/upload.ts`)
```typescript
export function createUploadRoute<O extends StorageOptions>(options: O) {
  const baseSchema = z.object({ file: z.instanceof(File) });

  // Conditionally add metadata validation
  const bodySchema = options.metadataSchema
    ? baseSchema.extend({
        metadata: createStandardSchemaValidator(options.metadataSchema)
      })
    : baseSchema;

  return createStorageEndpoint("/generate-upload-url", {
    method: "POST",
    body: bodySchema,
  }, async (ctx) => {
    // metadata is available here with proper typing
    const metadata = "metadata" in ctx.body ? ctx.body.metadata : undefined;
    // ...
  });
}
```

### 3. Type Transformation (`src/api/to-storage-endpoints.ts`)
```typescript
export function toStorageEndpoints<O extends StorageOptions, E extends ...>(
  endpoints: E,
  ctx: StorageContext<O>
): StorageAPI<O> {  // Returns properly typed API
  // Transforms server endpoints to client-callable methods
  // with proper type inference
}
```

## Benefits

| Feature | Before | After |
|---------|--------|-------|
| Metadata typing | `any` or manual types | Automatically inferred from schema |
| Type safety | Manual validation | Compile-time + runtime validation |
| API consistency | Different patterns per route | Unified pattern for all routes |
| IDE support | Limited autocomplete | Full autocomplete with type hints |
| Error detection | Runtime only | Compile-time + runtime |
| Extensibility | Hard to add routes | Easy pattern to follow |

## Real-World Example

```typescript
// Define your storage with a complex metadata schema
const storage = createStorage({
  bucket: "my-production-bucket",
  adapter: s3Adapter,
  metadataSchema: z.object({
    userId: z.string().uuid(),
    teamId: z.string().uuid(),
    permissions: z.array(z.enum(["read", "write", "delete"])),
    tags: z.array(z.string()).optional(),
    customData: z.record(z.string(), z.any()).optional(),
  }),
});

// TypeScript knows exactly what metadata should look like
await storage.api.upload({
  body: {
    file: documentFile,
    metadata: {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      teamId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      permissions: ["read", "write"],
      tags: ["important", "Q4-2024"],
      customData: { project: "alpha" }
    }
  }
});

// IDE will show errors immediately for any mistakes:
// - Missing required fields
// - Wrong types
// - Invalid enum values
// - Extra fields not in schema
```

## Testing

The implementation includes comprehensive tests (`src/test-types.ts`) that verify:

- ✅ Metadata required when schema is defined
- ✅ Metadata has correct types from schema
- ✅ Optional fields work correctly
- ✅ Wrong types cause compile errors
- ✅ Extra fields cause compile errors
- ✅ Metadata not allowed when no schema

Run: `npx tsc --noEmit` to verify all type checks pass.

## Extending to New Routes

Adding a new route is straightforward:

1. Copy the pattern from `upload.ts` or `delete.ts`
2. Add type definitions to `src/types/api.ts`
3. Register in `src/api/index.ts`

See `IMPLEMENTATION_GUIDE.md` for step-by-step instructions.

## Summary

This implementation provides:
- ✅ **Type-safe** metadata schemas
- ✅ **Automatic** type inference
- ✅ **Compile-time** error detection
- ✅ **Runtime** validation
- ✅ **Scalable** pattern for all routes
- ✅ **Production-ready** solution

The solution leverages TypeScript's advanced type system (conditional types, type inference, generics) combined with runtime validation to create a robust, developer-friendly API that catches errors early and provides excellent IDE support.
