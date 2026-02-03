# Type-Safe Dynamic Metadata Schema Implementation Guide

## Overview

This implementation allows you to define metadata schemas for your storage system that are fully type-safe at both compile-time and runtime. When a `metadataSchema` is provided, all API endpoints automatically require and validate the metadata field according to the schema.

## How It Works

### 1. Core Concept

The implementation uses **conditional types** and **factory functions** to dynamically construct endpoint types and schemas based on whether a `metadataSchema` is defined in the storage options.

```typescript
type WithMetadata<BaseBody, O extends StorageOptions> =
  O["metadataSchema"] extends StandardSchemaV1
    ? BaseBody & { metadata: StandardSchemaV1.InferInput<NonNullable<O["metadataSchema"]>> }
    : BaseBody;
```

### 2. Architecture

#### Key Components:

1. **`src/types/api.ts`**: Defines conditional types for API methods
2. **`src/api/routes/*.ts`**: Factory functions that create routes with conditional schemas
3. **`src/api/to-storage-endpoints.ts`**: Transforms endpoints to properly typed API methods
4. **`src/types/standard-schema.ts`**: Standard schema interface for validation

### 3. Type Flow

```
StorageOptions<M>
  → createStorage<O>
  → getEndpoints<O>
  → createUploadRoute<O>
  → toStorageEndpoints<O>
  → StorageAPI<O>
```

## Usage Examples

### Example 1: Storage WITH Metadata Schema

```typescript
import { createStorage } from "./storage";
import z from "zod";

const storage = createStorage({
  bucket: "my-bucket",
  adapter: myAdapter,
  metadataSchema: z.object({
    userId: z.string(),
    orgId: z.string().optional(),
    tags: z.array(z.string()),
  }),
});

// ✅ Valid - metadata is provided with correct types
await storage.api.upload({
  body: {
    file: new File([], "document.pdf"),
    metadata: {
      userId: "user123",
      orgId: "org456",
      tags: ["important", "archived"],
    },
  },
});

// ❌ Compile Error - metadata is missing
await storage.api.upload({
  body: {
    file: new File([], "document.pdf"),
  },
});

// ❌ Compile Error - userId has wrong type
await storage.api.upload({
  body: {
    file: new File([], "document.pdf"),
    metadata: {
      userId: 123, // Should be string
      tags: [],
    },
  },
});
```

### Example 2: Storage WITHOUT Metadata Schema

```typescript
const storage = createStorage({
  bucket: "my-bucket",
  adapter: myAdapter,
  // No metadataSchema defined
});

// ✅ Valid - no metadata required
await storage.api.upload({
  body: {
    file: new File([], "document.pdf"),
  },
});

// ❌ Compile Error - metadata field should not exist
await storage.api.upload({
  body: {
    file: new File([], "document.pdf"),
    metadata: { userId: "123" },
  },
});
```

## Adding New Routes

To add a new route that supports dynamic metadata:

### Step 1: Create Route Factory Function

```typescript
// src/api/routes/my-new-route.ts
import z from "zod";
import { createStorageEndpoint } from "../create-storage-endpoint";
import type { StorageOptions } from "../../types/options";
import type { StandardSchemaV1 } from "../../types/standard-schema";

function createStandardSchemaValidator<S extends StandardSchemaV1>(
  schema: S,
): z.ZodType<StandardSchemaV1.InferInput<S>> {
  return z.custom(
    async (val) => {
      const result = await schema["~standard"].validate(val);
      if (result.issues) {
        throw new Error(
          result.issues.map((issue) => issue.message).join(", "),
        );
      }
      return true;
    },
    { message: "Invalid metadata" },
  ) as any;
}

export function createMyNewRoute<O extends StorageOptions>(options: O) {
  const baseSchema = z.object({
    // Your base fields here
    someField: z.string(),
  });

  const bodySchema = options.metadataSchema
    ? baseSchema.extend({
        metadata: createStandardSchemaValidator(options.metadataSchema),
      })
    : baseSchema;

  return createStorageEndpoint(
    "/my-new-route",
    {
      method: "POST",
      body: bodySchema as any,
    },
    async (ctx) => {
      const { someField } = ctx.body;
      const metadata = "metadata" in ctx.body ? ctx.body.metadata : undefined;

      // Your route logic here
      // metadata will be properly typed based on the schema

      return { result: "success" };
    },
  );
}
```

### Step 2: Add Type Definition

```typescript
// src/types/api.ts

// Add body type
export type MyNewRouteBody<O extends StorageOptions> = WithMetadata<
  {
    someField: string;
  },
  O
>;

// Add API method type
export type MyNewRouteAPI<O extends StorageOptions> = (context: {
  body: MyNewRouteBody<O>;
}) => Promise<{ result: string }>;

// Add to StorageAPI
export type StorageAPI<O extends StorageOptions> = {
  upload: UploadAPI<O>;
  delete: DeleteAPI<O>;
  myNewRoute: MyNewRouteAPI<O>; // Add this
};
```

### Step 3: Register Route

```typescript
// src/api/routes/index.ts
export * from "./upload";
export * from "./delete";
export * from "./my-new-route";

// src/api/index.ts
import { createUploadRoute, createDeleteRoute, createMyNewRoute } from "./routes";

export function getEndpoints<O extends StorageOptions>(
  context: StorageContext<O>,
  options: O,
) {
  const endpoints = {
    upload: createUploadRoute(options),
    delete: createDeleteRoute(options),
    myNewRoute: createMyNewRoute(options),
  } as const;

  const api = toStorageEndpoints<O, typeof endpoints>(endpoints, context);

  return { api };
}
```

## Runtime Validation

The implementation performs runtime validation using the StandardSchemaV1 interface, which is compatible with popular validation libraries like Zod, Valibot, and ArkType.

When a request is made, the schema validator:
1. Checks if the metadata matches the defined schema
2. Returns validation errors if the data is invalid
3. Provides proper TypeScript types for the validated data

## Benefits

1. **Type Safety**: Compile-time errors if metadata is missing or has wrong types
2. **Flexibility**: Works with any StandardSchemaV1-compatible validation library
3. **Scalability**: Easy to add new routes with the same pattern
4. **DX**: Auto-completion and type hints in IDEs
5. **Runtime Safety**: Validation at runtime ensures data integrity

## Testing

See `src/test-types.ts` for comprehensive type safety tests that verify:
- Metadata is required when schema is defined
- Metadata has correct types from the schema
- Wrong values cause compile errors
- Metadata is not allowed when no schema is defined

Run type checks with:
```bash
npx tsc --noEmit
```

## Metadata in Hooks

Your metadata schema is also available in hooks:

```typescript
const storage = createStorage({
  bucket: "my-bucket",
  adapter: myAdapter,
  metadataSchema: z.object({
    userId: z.string(),
  }),
  hooks: {
    beforeUpload: async (fileInfo, metadata) => {
      // metadata is typed as { userId: string }
      console.log("User uploading:", metadata.userId);

      // Perform authorization checks
      if (!await canUserUpload(metadata.userId)) {
        return { allow: false, reason: "Unauthorized" };
      }

      return { allow: true };
    },
    afterUpload: async (fileInfo, metadata, key) => {
      // metadata is typed as { userId: string }
      await logUpload(metadata.userId, key);
    },
  },
});
```

## Summary

This implementation provides a robust, type-safe way to handle dynamic metadata schemas across all your API routes. The conditional typing ensures that developers get immediate feedback if they use the API incorrectly, while the runtime validation ensures data integrity.
