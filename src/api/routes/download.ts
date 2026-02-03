import z from "zod";
import type { StorageOptions } from "../../types/options";
import { createStorageEndpoint } from "../create-storage-endpoint";
import { withMetadata } from "../utils/metadata";

/**
 * Creates the download endpoint
 * Download does NOT require metadata
 */
export function createDownloadRoute<O extends StorageOptions>(options: O) {
	const baseSchema = z.object({
		key: z.string(),
	});

	// Explicitly disable metadata for download
	const bodySchema = withMetadata(baseSchema, options, false);

	return createStorageEndpoint(
		"/generate-download-url",
		{
			method: "POST",
			body: bodySchema as any,
		},
		async (ctx) => {
			const { key } = ctx.body;

			const adapter = ctx.context.$options.adapter;
			const downloadUrl = await adapter.generatePresignedDownloadUrl(key, {
				expiresIn: 3600,
			});

			return { downloadUrl };
		},
	);
}
