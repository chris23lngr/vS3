import { createFetch } from "@better-fetch/fetch";
import z from "zod";
import { DEFAULT_API_PATH, DEFAULT_BASE_URL } from "../core/consts";
import { errorSchema, StorageError } from "../core/error/error";
import type { StandardSchemaV1 } from "../types/standard-schema";
import { createFetchSchema } from "./fetch-schema";
import type { StorageClientOptions } from "./types";

type ClientFnOptions = {
	onError?: (error: StorageError) => void;
	onSuccess?: (data: unknown) => void;
};

export function createBaseClient<
	M extends StandardSchemaV1 = StandardSchemaV1,
	O extends StorageClientOptions<M> = StorageClientOptions<M>,
>(options: O) {
	const { baseURL = DEFAULT_BASE_URL, apiPath = DEFAULT_API_PATH } = options;

	const apiUrl = new URL(apiPath, baseURL);

	const $fetch = createFetch({
		baseURL: apiUrl.toString(),
		customFetchImpl: fetch,
		schema: createFetchSchema(options),
		errorSchema: errorSchema,
	});

	return {
		$fetch,
		uploadFile: async (
			file: File,
			metadata: StandardSchemaV1.InferInput<NonNullable<O["metadataSchema"]>>,
			options?: Partial<ClientFnOptions>,
		) => {
			try {
				const response = await $fetch("/test", {
					body: {
						fileInfo: {
							contentType: file.type,
							name: file.name,
							size: file.size ?? 0,
						},
						metadata,
					},
				});
			} catch (error) {
				if (error instanceof StorageError) {
					options?.onError?.(error);
				}

				throw error;
			}
		},
	};
}

const client = createBaseClient({
	metadataSchema: z.object({
		userId: z.string(),
	}),
});

client.$fetch("/test", {
	body: {
		fileInfo: {
			name: "test.txt",
			size: 100,
			contentType: "text/plain",
		},
		metadata: {},
	},
});

client.uploadFile(new File([], "test.txt"), {
	userId: "234",
});
