# Dependency Model - Bring Your Own Validation Library

## Architecture

Your library has a **hybrid validation approach**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Storage Library                      │
│                                                              │
│  ┌────────────────────┐        ┌──────────────────────┐   │
│  │  Base Body Schema  │        │  Metadata Schema     │   │
│  │  (Library-defined) │        │  (User-defined)      │   │
│  │                    │        │                      │   │
│  │  Uses: Zod         │  ←+→   │  Uses: ANY library   │   │
│  │  ✓ z.object()      │        │  ✓ Zod               │   │
│  │  ✓ z.instanceof()  │        │  ✓ Valibot           │   │
│  │  ✓ z.string()      │        │  ✓ ArkType           │   │
│  │                    │        │  ✓ Etc.              │   │
│  └────────────────────┘        └──────────────────────┘   │
│           │                              │                  │
│           └──────────┬───────────────────┘                  │
│                      ▼                                      │
│         ┌─────────────────────────┐                        │
│         │  Combined Schema        │                        │
│         │  z.object({             │                        │
│         │    file: File,          │                        │
│         │    metadata: UserSchema │                        │
│         │  })                     │                        │
│         └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Library's Base Schema (Zod)

Your library defines the base body structure:

```typescript
// Inside your library - routes/upload.ts
const baseSchema = z.object({
  file: z.instanceof(File),
});
```

### 2. User's Metadata Schema (Any Library)

Users provide their metadata schema using **any** StandardSchemaV1 library:

```typescript
// User's code
import { z } from "zod";
// OR
import * as v from "valibot";
// OR
import { type } from "arktype";

const storage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
  // OR
  metadataSchema: v.object({ userId: v.string() }),
  // OR
  metadataSchema: type({ userId: "string" }),
});
```

### 3. Composition (StandardSchemaV1 Interface)

Your library composes them using the StandardSchemaV1 interface:

```typescript
// src/api/utils/metadata.ts
export function createMetadataValidator<S extends StandardSchemaV1>(
  schema: S,
): z.ZodType<StandardSchemaV1.InferInput<S>> {
  return z.custom(
    async (val) => {
      // Uses StandardSchemaV1's validate method
      // Works with ANY library that implements this interface!
      const result = await schema["~standard"].validate(val);

      if (result.issues) {
        throw new Error(result.issues.map(i => i.message).join(", "));
      }
      return true;
    },
    { message: "Invalid metadata" },
  ) as any;
}
```

## Package Dependencies

### Your Library's `package.json`

```json
{
  "name": "your-storage-library",
  "dependencies": {
    "zod": "^4.0.0",           // ← For base schemas
    "better-call": "^x.x.x",
    "@aws-sdk/client-s3": "^x.x.x"
  },
  "peerDependencies": {
    // Users install their own validation library
    "zod": "^3.0.0 || ^4.0.0",
    "valibot": "^0.30.0",
    "arktype": "^2.0.0"
  },
  "peerDependenciesMeta": {
    // All validation libraries are optional
    "zod": { "optional": true },
    "valibot": { "optional": true },
    "arktype": { "optional": true }
  }
}
```

### User's `package.json`

**Option 1: User wants Zod for metadata**
```json
{
  "dependencies": {
    "your-storage-library": "^1.0.0",
    "zod": "^4.0.0"  // ← User installs Zod
  }
}
```

**Option 2: User wants Valibot for metadata**
```json
{
  "dependencies": {
    "your-storage-library": "^1.0.0",
    "valibot": "^0.30.0"  // ← User installs Valibot
  }
}
```

**Option 3: User doesn't use metadata**
```json
{
  "dependencies": {
    "your-storage-library": "^1.0.0"
    // No validation library needed!
  }
}
```

## Bundle Size Impact

### Your Library Bundle

```
your-storage-library.js:
  - Zod: ~50KB (for base schemas)
  - Better-call: ~XKB
  - Your code: ~XKB
  - Total: ~XXX KB
```

### User's Bundle

**If user uses Zod:**
- No duplicate Zod (they share the bundled version)
- Or use their own version (peer dependency)

**If user uses Valibot:**
```
user-bundle.js:
  - Your library: ~XXX KB (includes Zod for base)
  - Valibot: ~10KB (much smaller!)
  - User code
```

**If user doesn't use metadata:**
```
user-bundle.js:
  - Your library: ~XXX KB (includes Zod for base)
  - User code
```

## Benefits

### ✅ For Library Authors (You)

1. **Consistent base validation** - Always use Zod for base schemas
2. **No abstraction overhead** - Direct Zod usage for base
3. **Flexible metadata** - Support any StandardSchemaV1 library
4. **Simpler maintenance** - One validation library for base

### ✅ For Library Users

1. **Freedom of choice** - Use any validation library for metadata
2. **Smaller bundles** - Can use lightweight libraries (Valibot ~10KB vs Zod ~50KB)
3. **Consistency** - Use same library across their app
4. **Optional metadata** - No validation library needed if no metadata

## Real-World Examples

### Example 1: Zod User

```typescript
// User already uses Zod in their app
import { z } from "zod";
import { createStorage } from "your-library";

// User's existing schemas
const userSchema = z.object({ name: z.string() });

// Your storage uses the same library - consistency!
const storage = createStorage({
  metadataSchema: z.object({ userId: z.string() }),
});
```

### Example 2: Valibot User (Smaller Bundle)

```typescript
// User prefers Valibot for smaller bundle size
import * as v from "valibot";
import { createStorage } from "your-library";

// User's existing schemas
const userSchema = v.object({ name: v.string() });

// Your storage respects their choice
const storage = createStorage({
  metadataSchema: v.object({ userId: v.string() }),
});
```

### Example 3: No Metadata

```typescript
// User doesn't need metadata
import { createStorage } from "your-library";

const storage = createStorage({
  bucket: "test",
  adapter: myAdapter,
  // No metadataSchema = no need to install validation library
});
```

## Validation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   User Makes Request                         │
│  storage.api.upload({                                        │
│    body: { file: ..., metadata: { userId: "123" } }         │
│  })                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  1. Zod validates base body   │
         │     { file: instanceof(File) }│
         │     ✓ Fast, built-in          │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  2. User's library validates  │
         │     metadata via              │
         │     StandardSchemaV1          │
         │     interface                 │
         │     ✓ Any library works       │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  3. Combined validated object │
         │     {                         │
         │       file: File,             │
         │       metadata: {             │
         │         userId: string        │
         │       }                       │
         │     }                         │
         └───────────────────────────────┘
```

## Type Safety

Both base AND metadata are fully type-safe:

```typescript
// User defines metadata schema with Valibot
import * as v from "valibot";

const storage = createStorage({
  metadataSchema: v.object({
    userId: v.string(),
    role: v.picklist(["admin", "user"]),
  }),
});

// TypeScript knows the exact shape!
storage.api.upload({
  body: {
    file: myFile,
    metadata: {
      userId: "123",
      role: "admin",  // ✓ Autocomplete works
      // role: "guest" // ✗ Error: not in picklist
    },
  },
});
```

## Migration Path

### Currently Using Zod?
✅ No changes needed - continue using Zod for metadata

### Want to Switch to Valibot?
1. Install Valibot
2. Convert metadata schemas from Zod to Valibot syntax
3. Everything else stays the same

### Don't Need Metadata?
1. Don't provide `metadataSchema`
2. Don't install any validation library
3. Smaller bundle size

## Summary

| Component | Library | Who Controls | Changeable? |
|-----------|---------|--------------|-------------|
| Base body schema (file, key, etc.) | **Zod** | Your library | ❌ No |
| Metadata schema | **User's choice** | User | ✅ Yes |
| Validation interface | **StandardSchemaV1** | Standard | ❌ No |

**Key Insight:**
- Your library bundles Zod for base schemas (consistent, reliable)
- Users bring their own library for metadata (flexible, optional)
- StandardSchemaV1 bridges them together (interoperable)

**Result:** Best of both worlds! 🎉
