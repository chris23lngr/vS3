import { createSchema } from "@better-fetch/fetch";
import { routeRegistry } from "../api/registry";
import type { InferredTypes } from "../types/infer";
import type { StorageClientOptions } from "./types";

export const createFetchSchema = <
	T extends InferredTypes,
	O extends StorageClientOptions<T>,
>(
	_options: O,
) => {
	return createSchema(routeRegistry);

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
