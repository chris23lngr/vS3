# Vue.js Integration Plan

## Current Client Architecture

```
src/client/
├── create-client.ts          # Framework-agnostic core (uploadFile, downloadFile)
├── types.ts                  # StorageClientOptions (shared)
├── fetch-schema.ts           # API schema for better-fetch
├── browser/
│   └── download.ts           # Browser download helpers (framework-agnostic)
├── xhr/
│   ├── upload.ts             # XHR upload with progress (framework-agnostic)
│   ├── xhr-factory.ts        # XHR factory
│   └── types.ts
└── react/
    ├── index.ts              # createStorageClient() → { useUpload, useDownload }
    └── hooks/
        ├── use-upload.ts     # React hook wrapping client.uploadFile
        ├── use-download.ts   # React hook wrapping client.downloadFile
        └── storage-error.ts  # Error normalization (framework-agnostic!)
```

The core architecture is well-designed for multi-framework support. `createBaseClient` has zero React imports and provides a clean promise-based API. Each React hook is a thin reactive wrapper around it.

---

## Issues With the Current Client Setup

### 1. Dead dependencies — `nanostores` and `@nanostores/react`

Both `nanostores` and `@nanostores/react` are listed as hard `dependencies` in `package.json`, but neither is imported anywhere in the codebase. The React hooks use raw `useState`/`useCallback`. These are dead weight that increases install size for every consumer.

### 2. `normalizeStorageError` is misplaced

`storage-error.ts` lives under `client/react/hooks/` but contains zero React code. It is a pure utility function. Both the future Vue composables and any other framework binding would need the same logic, forcing either duplication or a cross-framework import from the React directory.

### 3. `throwOnError` leaks framework concerns into the core

`StorageClientOptions.throwOnError` (in `client/types.ts`) is documented as hook-specific behavior ("Whether to throw an error if hook operation fails"). This is a framework-binding concern that leaked into the shared client options type. Both React hooks read it from `client["~options"].throwOnError`, coupling the core config to framework behavior.

### 4. State type duplication

`UploadState`/`DownloadState`, `UploadStatus`/`DownloadStatus`, and the callback types (`UploadCallbacks`/`DownloadCallbacks`) define the same state machine pattern twice. As more frameworks are added, this pattern will be duplicated further.

---

## Proposed Plan

### Phase 0 — Pre-requisites (Housekeeping)

| # | Task | Rationale |
|---|------|-----------|
| 0.1 | Remove `nanostores` and `@nanostores/react` from dependencies | Dead dependencies; no code uses them |
| 0.2 | Extract `normalizeStorageError` to `client/shared/storage-error.ts` | Framework-agnostic utility needed by both React and Vue |
| 0.3 | Re-export from `client/react/hooks/storage-error.ts` to avoid breaking changes (or update React imports) | Non-breaking migration |

### Phase 1 — Vue Composables

Create the Vue integration mirroring the React structure:

```
src/client/vue/
├── index.ts                    # createStorageClient() → { useUpload, useDownload }
└── composables/
    ├── use-upload.ts           # Vue composable wrapping client.uploadFile
    └── use-download.ts         # Vue composable wrapping client.downloadFile
```

**`vue/index.ts`** — Factory function (identical pattern to React):

```typescript
export function createStorageClient<M extends StandardSchemaV1>(
  options?: StorageClientOptions<M>
) {
  const client = createBaseClient(options ?? {});
  return {
    useUpload: createUseUpload<M>(client),
    useDownload: createUseDownload<M>(client),
  };
}
```

**`composables/use-upload.ts`** — Vue composable:

- Uses `ref()` instead of `useState()`
- Uses `readonly()` to expose immutable state
- Returns `{ state, upload, reset }` (same shape as React)
- No `useCallback` equivalent needed — Vue composables are plain functions, not re-invoked on every render

**`composables/use-download.ts`** — Same pattern for downloads.

### Phase 2 — Build & Package Configuration

| # | Change | File |
|---|--------|------|
| 2.1 | Add `vue` entry point to tsup config | `tsup.config.ts` |
| 2.2 | Add `"./vue"` subpath export (ESM + CJS + types) | `package.json` → `exports` |
| 2.3 | Add `"vue"` to `typesVersions` | `package.json` → `typesVersions` |
| 2.4 | Add `vue` as optional peer dependency (`>=3.3`) | `package.json` → `peerDependencies` + `peerDependenciesMeta` |

**tsup entry addition:**

```typescript
entry: {
  index: "src/index.ts",
  react: "src/client/react/index.ts",
  vue: "src/client/vue/index.ts",        // new
  "next-js": "src/integrations/next-js.ts",
  adapters: "src/adapters/index.ts",
  "middleware-auth": "src/middleware/auth/index.ts",
},
```

**Consumer usage:**

```typescript
import { createStorageClient } from "vs3/vue";
```

### Phase 3 — Testing

| # | Task |
|---|------|
| 3.1 | Unit tests for `useUpload` composable (mock `createBaseClient`) |
| 3.2 | Unit tests for `useDownload` composable |
| 3.3 | Verify build output (ESM, CJS, `.d.ts` for `vue` entry) |

Vue composable tests can use `@vue/test-utils` or test the reactive state directly since composables are plain functions (callable outside components, unlike React hooks).

### Phase 4 — Documentation & Example App (Optional / Roadmap)

| # | Task |
|---|------|
| 4.1 | Add Vue usage example to docs |
| 4.2 | Create a Vue example app under `apps/` (aligned with ROADMAP.md milestone 7) |

---

## Work Estimate

| Phase | Scope | Files Changed/Created |
|-------|-------|-----------------------|
| Phase 0 | Housekeeping | ~3–4 files modified |
| Phase 1 | Vue composables | 3 new files |
| Phase 2 | Build/package config | 2 files modified |
| Phase 3 | Tests | 2–3 new test files |
| **Total** | | **~5 new files, ~5 modified files** |

The Vue composables themselves are straightforward — the React hooks are ~175 lines each, and the Vue equivalents will be simpler (no `useCallback` memoization needed, no closure-over-setState patterns). Expect ~120–140 lines per composable.

---

## Key Design Decision: Vue Reactivity vs Nanostores

| Approach | Pros | Cons |
|----------|------|------|
| **Vue's native `ref()`/`reactive()` (Recommended)** | Zero additional deps; idiomatic Vue; better tree-shaking; smaller bundle | Vue-specific code |
| Nanostores + `@nanostores/vue` | Shared state layer across frameworks | Extra dependency; less idiomatic; nanostores is already unused in React hooks |

**Recommendation:** Use Vue's native reactivity. The React hooks already use raw React state — following the same principle for Vue keeps each integration idiomatic and dependency-free. Drop the unused nanostores dependencies entirely.

---

## Risks & Assumptions

- **Assumption:** Vue `>=3.3` is the minimum target (Composition API is stable, generics in `defineComponent` available).
- **Risk:** `@aws-sdk/client-s3` is a heavy peer dependency. Vue users on Nuxt may have different bundling expectations — worth noting in docs but not a blocker.
- **Risk:** The `throwOnError` config coupling (issue #3 above) means Vue composables must also read from `client["~options"].throwOnError`. This works but is architecturally suboptimal. A future refactor could move this to the framework layer.
