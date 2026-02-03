import z from "zod";
import type { StandardSchemaV1 } from "../../types/standard-schema";
import type { StorageOptions } from "../../types/options";

/**
 * Creates a Zod schema that validates using StandardSchemaV1
 */
export function createMetadataValidator<S extends StandardSchemaV1>(
	schema: S,
): z.ZodType<StandardSchemaV1.InferInput<S>> {
	return z.custom(
		async (val) => {
			const result = await schema["~standard"].validate(val);
			if (result.issues) {
				throw new Error(
					result.issues.map((issue) => issue.message).join(", "),
				);
			}
			return true;
		},
		{ message: "Invalid metadata" },
	) as any;
}

/**
 * Extends a body schema with metadata field if needed
 * @param baseSchema - The base Zod schema for the route body
 * @param options - Storage options containing metadataSchema
 * @param requireMetadata - Whether this route requires metadata (default: true)
 */
export function withMetadata<
	T extends z.ZodRawShape,
	O extends StorageOptions,
>(
	baseSchema: z.ZodObject<T>,
	options: O,
	requireMetadata = true,
): z.ZodObject<T> | z.ZodObject<T & { metadata: z.ZodType }> {
	if (requireMetadata && options.metadataSchema) {
		return baseSchema.extend({
			metadata: createMetadataValidator(options.metadataSchema),
		} as any);
	}
	return baseSchema;
}
