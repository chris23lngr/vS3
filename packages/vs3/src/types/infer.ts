import type { StandardSchemaV1 } from "./standard-schema";

/**
 * Aggregated type bundle shared between server and client instances.
 *
 * Exposed on every storage instance via `$Infer` and accepted as a single
 * generic by client factories (`createStorageClient`, `createBaseClient`).
 *
 * New shared types should be added here so that a single generic carries
 * all type information between server and client.
 */
export type InferredTypes<M extends StandardSchemaV1 = StandardSchemaV1> = {
	readonly metadata: M;
};
