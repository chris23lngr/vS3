import z from "zod";
import type { StandardSchemaV1 } from "../../types/standard-schema";
import { createStorageEndpoint } from "../create-storage-endpoint";
import { routeRegistry } from "../registry";

export function createUploadRoute<M extends StandardSchemaV1>(
	metadataSchema?: M,
) {
	const schemas = routeRegistry["/test"];

	return createStorageEndpoint(
		"/test",
		{
			method: "POST",
			metadataSchema: metadataSchema ?? z.undefined(),
			body: schemas.body,
			outputSchema: schemas.output,
		},
		async (ctx) => {
			const adapter = ctx.context.$options.adapter;

			const key = await ctx.context.$options.generateKey?.(
				ctx.body.fileInfo,
				ctx.body.metadata,
			);

			// const url = await adapter.generatePresignedUploadUrl(
			// 	"randomkey",
			// 	ctx.body.file,
			// );

			return {
				name: key ?? "undefined",
			};
		},
	);
}
