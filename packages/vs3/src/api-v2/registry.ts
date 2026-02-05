import z from "zod";
import { fileInfoSchema } from "../schemas/file";
import type { StandardSchemaV1 } from "../types/standard-schema";

type RouteRegistry = Record<
	`/${string}`,
	{
		body: StandardSchemaV1;
		requireMetadata?: boolean;
		output: StandardSchemaV1;
	}
>;

export const routeRegistry = {
	"/test": {
		body: z.object({
			fileInfo: fileInfoSchema,
		}),
		requireMetadata: true,
		output: z.object({
			name: z.string(),
		}),
	},
} as const satisfies RouteRegistry;
