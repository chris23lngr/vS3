import z from "zod";
import type { StorageOptions } from "../../types/options";
import { createStorageEndpoint } from "../create-storage-endpoint";
import { withMetadata } from "../utils/metadata";

/**
 * Creates the delete endpoint
 * @param options - Storage options
 * @param requireMetadata - Whether metadata is required (default: true)
 */
export function createDeleteRoute<O extends StorageOptions>(
	options: O,
	requireMetadata = true,
) {
	const baseSchema = z.object({
		key: z.string(),
	});

	const bodySchema = withMetadata(baseSchema, options, requireMetadata);

	return createStorageEndpoint(
		"/delete",
		{
			method: "POST",
			body: bodySchema as any,
		},
		async (ctx) => {
			const { key } = ctx.body;
			const metadata = "metadata" in ctx.body ? ctx.body.metadata : undefined;

			// Here you can use metadata for authorization checks before deletion
			// For example: check if the user owns the file based on metadata
			console.log("Deleting file:", key, "with metadata:", metadata);

			const adapter = ctx.context.$options.adapter;
			// await adapter.delete(key); // Assuming adapter has a delete method

			return { success: true };
		},
	);
}
