import { createFetch } from "@better-fetch/fetch";
import { DEFAULT_API_PATH, DEFAULT_BASE_URL } from "../core/consts";
import { StorageErrorCode } from "../core/error/codes";
import {
	errorSchema,
	StorageClientError,
	StorageError,
} from "../core/error/error";
import type { StandardSchemaV1 } from "../types/standard-schema";
import { createFetchSchema } from "./fetch-schema";
import type { StorageClientOptions } from "./types";
import { xhrUpload } from "./xhr/upload";

type ClientFnOptions = {
	onError?: (error: StorageError) => void;
	onSuccess?: (data: { key: string; presignedUrl: string }) => void;
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
			options?: Partial<
				ClientFnOptions & {
					retry?: undefined | true | number;
					onProgress?: (progress: number) => void;
					abort: () => void;
				}
			>,
		) => {
			const { onError, onSuccess, onProgress } = options ?? {};

			try {
				const response = await $fetch("/upload-url", {
					body: {
						fileInfo: {
							contentType: file.type,
							name: file.name,
							size: file.size ?? 0,
						},
						metadata,
					},
				});

				if (response.error) {
					throw new StorageClientError({
						code: StorageErrorCode.UNKNOWN_ERROR,
						details: `${response.error.status}: ${response.error.message ?? "Unknown error"}`,
						message: response.error.message ?? "Unknown error",
					});
				}

				const { key, presignedUrl } = response.data;

				const uploadResult = await xhrUpload(presignedUrl, file, {
					onProgress,
				});

				const result = {
					key,
					presignedUrl,
					uploadUrl: uploadResult.uploadUrl,
					status: uploadResult.status,
					statusText: uploadResult.statusText,
				};

				onSuccess?.({ key, presignedUrl });
				return result;
			} catch (error) {
				if (error instanceof StorageError) {
					onError?.(error);
					throw error;
				}

				const storageError = new StorageClientError({
					code: StorageErrorCode.NETWORK_ERROR,
					message:
						error instanceof Error ? error.message : "Upload failed unexpectedly",
					details: error instanceof Error ? error.stack : String(error),
				});

				onError?.(storageError);
				throw storageError;
			}
		},
	};
}

export type BaseStorageClient<
	M extends StandardSchemaV1 = StandardSchemaV1,
	O extends StorageClientOptions<M> = StorageClientOptions<M>,
> = ReturnType<typeof createBaseClient<M, O>>;
