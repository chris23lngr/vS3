import { createSchema, type FetchSchema } from "@better-fetch/fetch";
import type z from "zod";
import type { ExtendSchemaWithMetadata } from "../api-v2/create-storage-endpoint";
import { routeRegistry } from "../api-v2/registry";
import { mergeSchema } from "../core/utils/merge-schema";
import type { StandardSchemaV1 } from "../types/standard-schema";
import type { StorageClientOptions } from "./types";

export const createFetchSchema = <
	M extends StandardSchemaV1,
	O extends StorageClientOptions<M>,
>(
	options: O,
) => {
	const merge = <
		Z extends z.ZodObject<z.ZodRawShape>,
		S extends StandardSchemaV1,
	>(
		zodSchema: Z,
		standardSchema: S | undefined,
	) => {
		if (!standardSchema) {
			return zodSchema;
		}

		return mergeSchema(zodSchema, standardSchema);
	};
	return createSchema(
		Object.fromEntries(
			Object.entries(routeRegistry).map(([key, value]) => [
				key,
				(() => {
					if (value.requireMetadata) {
						return {
							input: merge(
								value.body,
								options.metadataSchema,
							) as ExtendSchemaWithMetadata<typeof value.body, M>,
							output: value.output,
						} satisfies FetchSchema;
					}

					return {
						input: value.body,
						output: value.output,
					} satisfies FetchSchema;
				})(),
			]),
		),
	);

	// return createSchema({
	// 	"/generate-upload-url": {
	// 		method: "post",
	// 		input: merge(
	// 			z.object({
	// 				file: fileInfoSchema,
	// 			}),
	// 			options.metadataSchema,
	// 		),
	// 		output: z.object({
	// 			uploadUrl: z.string(),
	// 			uploadHeaders: z.record(z.string(), z.string()),
	// 		}),
	// 	},
	// });
};
