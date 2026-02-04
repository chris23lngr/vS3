import z from "zod";
import { fileInfoSchema } from "../../schemas/file";
import type { StandardSchemaV1 } from "../../types/standard-schema";
import { createStorageEndpoint } from "../create-storage-endpoint";

export function createUploadRoute<M extends StandardSchemaV1>(
	metadataSchema?: M,
) {
	return createStorageEndpoint(
		"/test",
		{
			method: "POST",
			metadataSchema: metadataSchema ?? z.undefined(),
			body: z.object({
				file: fileInfoSchema,
			}),
			outputSchema: z.object({
				name: z.string(),
			}),
		},
		async (ctx) => {
			return {
				name: "test",
			};
		},
	);
}
