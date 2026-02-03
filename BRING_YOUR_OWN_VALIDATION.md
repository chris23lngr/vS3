# ✅ Your Library Already Supports "Bring Your Own Validation"!

## Summary

Your **current implementation already allows** users to bring their own validation library for metadata! No changes needed.

## How It Works

### Your Library (Uses Zod for Base)

```typescript
// src/api/routes-v2/upload.ts
const baseSchema = z.object({
  file: z.instanceof(File),  // ← Library uses Zod
});

const bodySchema = withMetadata(baseSchema, options, true);
```

### Users (Any Library for Metadata)

```typescript
// User's code - Option 1: Zod
import { z } from "zod";
const storage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
});

// User's code - Option 2: Valibot
import * as v from "valibot";
const storage = createStorage({
  metadataSchema: v.object({ userId: v.string() }),
});

// User's code - Option 3: ArkType
import { type } from "arktype";
const storage = createStorage({
  metadataSchema: type({ userId: "string" }),
});
```

### The Bridge (StandardSchemaV1)

```typescript
// src/api/utils/metadata.ts
export function createMetadataValidator<S extends StandardSchemaV1>(
  schema: S,  // ← Accepts ANY StandardSchemaV1 library
): z.ZodType<StandardSchemaV1.InferInput<S>> {
  return z.custom(
    async (val) => {
      // Validates using StandardSchemaV1 interface
      const result = await schema["~standard"].validate(val);
      if (result.issues) {
        throw new Error(result.issues.map((i) => i.message).join(", "));
      }
      return true;
    },
    { message: "Invalid metadata" },
  ) as any;
}
```

## What Makes This Work

### 1. StandardSchemaV1 Interface

All modern validation libraries implement this interface:

```typescript
interface StandardSchemaV1 {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (value: unknown) => Result | Promise<Result>;
  };
}
```

**Libraries that support it:**
- ✅ Zod v3.23+
- ✅ Valibot v0.30+
- ✅ ArkType v2.0+
- ✅ And more...

### 2. Your Wrapper Function

`createMetadataValidator` wraps any StandardSchemaV1 schema in a Zod custom validator:

```typescript
// Takes ANY StandardSchemaV1 schema
createMetadataValidator(userSchema)

// Returns a Zod validator that calls the user's schema
z.custom(async (val) => {
  const result = await userSchema["~standard"].validate(val);
  return result;
})
```

### 3. Composition via `withMetadata`

```typescript
export function withMetadata<T, O>(
  baseSchema: z.ZodObject<T>,     // ← Your Zod schema
  options: O,
  requireMetadata = true,
) {
  if (requireMetadata && options.metadataSchema) {
    return baseSchema.extend({
      metadata: createMetadataValidator(options.metadataSchema), // ← User's schema
    });
  }
  return baseSchema;
}
```

**Result:**
```typescript
z.object({
  file: z.instanceof(File),        // ← Validated by Zod
  metadata: userCustomValidator    // ← Validated by user's library
})
```

## Real Examples

### Example 1: User with Zod (Most Common)

```typescript
import { createStorage } from "your-library";
import { z } from "zod";

const storage = createStorage({
  bucket: "uploads",
  adapter: s3Adapter,
  metadataSchema: z.object({
    userId: z.string().uuid(),
    uploadedBy: z.string().email(),
    tags: z.array(z.string()),
  }),
});

// ✅ Full type safety with Zod
await storage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      uploadedBy: "user@example.com",
      tags: ["document", "important"],
    },
  },
});
```

### Example 2: User with Valibot (Smaller Bundle)

```typescript
import { createStorage } from "your-library";
import * as v from "valibot";

const storage = createStorage({
  bucket: "uploads",
  adapter: s3Adapter,
  metadataSchema: v.object({
    userId: v.pipe(v.string(), v.uuid()),
    uploadedBy: v.pipe(v.string(), v.email()),
    tags: v.array(v.string()),
  }),
});

// ✅ Full type safety with Valibot
// ✅ 80% smaller than Zod (~10KB vs ~50KB)
await storage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      uploadedBy: "user@example.com",
      tags: ["document", "important"],
    },
  },
});
```

### Example 3: User with ArkType (Best DX)

```typescript
import { createStorage } from "your-library";
import { type } from "arktype";

const storage = createStorage({
  bucket: "uploads",
  adapter: s3Adapter,
  metadataSchema: type({
    userId: "string.uuid",
    uploadedBy: "string.email",
    tags: "string[]",
  }),
});

// ✅ Full type safety with ArkType
// ✅ Cleanest syntax
await storage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      uploadedBy: "user@example.com",
      tags: ["document", "important"],
    },
  },
});
```

## Installation Instructions for Users

### If User Wants Zod
```bash
npm install your-library zod
```

### If User Wants Valibot
```bash
npm install your-library valibot
```

### If User Wants ArkType
```bash
npm install your-library arktype
```

### If User Doesn't Need Metadata
```bash
npm install your-library
# No validation library needed!
```

## Your package.json Recommendation

```json
{
  "name": "your-storage-library",
  "version": "1.0.0",
  "dependencies": {
    "zod": "^4.0.0",
    "better-call": "^1.2.1",
    "@aws-sdk/client-s3": "^3.0.0"
  },
  "peerDependencies": {
    "zod": "^3.23.0 || ^4.0.0",
    "valibot": ">=0.30.0",
    "arktype": ">=2.0.0"
  },
  "peerDependenciesMeta": {
    "zod": {
      "optional": true
    },
    "valibot": {
      "optional": true
    },
    "arktype": {
      "optional": true
    }
  }
}
```

**Explanation:**
- `dependencies`: Your library bundles Zod for base schemas
- `peerDependencies`: Users can install their preferred library
- `peerDependenciesMeta.optional`: They only need to install if using metadata

## Benefits Recap

### ✅ For You (Library Author)
- Use Zod for base schemas (simple, consistent)
- Support all StandardSchemaV1 libraries (flexible)
- No extra code needed (already works!)

### ✅ For Users
- Choose their preferred validation library
- Use what they already have in their project
- Smaller bundles (Valibot is 80% smaller than Zod)
- No validation library needed if no metadata

## Type Safety Proof

The types work correctly with all libraries:

```typescript
// With Zod
const zodStorage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
});

zodStorage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "123",  // ✓ TypeScript knows this is string
      // userId: 123,  // ✗ Error: Type 'number' is not assignable
    },
  },
});

// With Valibot - same type safety!
const valibotStorage = createStorage({
  metadataSchema: v.object({ userId: v.string() }),
});

valibotStorage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "123",  // ✓ TypeScript knows this is string
      // userId: 123,  // ✗ Error: Type 'number' is not assignable
    },
  },
});
```

## Documentation for Users

Add this to your README:

```markdown
## Validation Library

This library uses Zod internally for base body validation. For metadata validation,
you can use any StandardSchemaV1-compatible library:

- **Zod** - Most popular, full-featured (~50KB)
- **Valibot** - Lightweight alternative (~10KB)
- **ArkType** - Best DX with TypeScript-like syntax

### Example with Zod
\`\`\`typescript
import { z } from "zod";
const storage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
});
\`\`\`

### Example with Valibot
\`\`\`typescript
import * as v from "valibot";
const storage = createStorage({
  metadataSchema: v.object({ userId: v.string() }),
});
\`\`\`

### Without Metadata
\`\`\`typescript
const storage = createStorage({
  bucket: "test",
  adapter: myAdapter,
  // No metadataSchema = no validation library needed
});
\`\`\`
```

## Summary

✅ **Your current implementation already supports this!**
✅ **No code changes needed**
✅ **Users can bring any StandardSchemaV1 library**
✅ **Full type safety maintained**
✅ **Flexible and future-proof**

The StandardSchemaV1 interface is the key - it provides a common protocol that all modern validation libraries implement, allowing seamless interoperability! 🎉
