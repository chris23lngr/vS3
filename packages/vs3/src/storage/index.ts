import { S3Client } from "@aws-sdk/client-s3";
import z from "zod";
import { aws } from "../adapters";
import { getEndpoints, router } from "../api-v2/router";
import { createContext } from "../context/create-context";
import type { StorageOptions } from "../types/options";
import type { StandardSchemaV1 } from "../types/standard-schema";

export function createStorage<O extends StorageOptions>(options: O) {
	const context = createContext(options);

	const { api } = getEndpoints(context, options);

	const { handler } = router(options, context);

	return {
		api,
		handler,
		"~options": options,
		$Infer: {
			metadata: options.metadataSchema as unknown as StandardSchemaV1<
				StandardSchemaV1.InferInput<NonNullable<O["metadataSchema"]>>,
				StandardSchemaV1.InferOutput<NonNullable<O["metadataSchema"]>>
			>,
		},
	};
}

const storage = createStorage({
	bucket: "test",
	adapter: aws({
		client: new S3Client({
			region: "us-east-1",
			credentials: {
				accessKeyId: "test",
				secretAccessKey: "test",
			},
		}),
	}),
	metadataSchema: z.object({
		userId: z.string(),
		age: z.number().optional(),
	}),
});

storage.api.upload({
	body: {
		file: {
			contentType: "text/plain",
			name: "test.txt",
			size: 100,
		},
		metadata: {},
	},
});
