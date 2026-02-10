import { type Ref, readonly, ref } from "vue";
import type { StorageError } from "../../../core/error/error";
import type { StandardSchemaV1 } from "../../../types/standard-schema";
import type { BaseStorageClient, UploadFileResult } from "../../create-client";
import { normalizeStorageError } from "../../shared/storage-error";

type UploadStatus = "idle" | "loading" | "success" | "error";

type UploadState = {
	isLoading: boolean;
	progress: number;
	error: StorageError | null;
	data: UploadFileResult | null;
	status: UploadStatus;
};

type UploadCallbacks = {
	onProgress?: (progress: number) => void;
	onSuccess?: (result: UploadFileResult) => void;
	onError?: (error: StorageError) => void;
	throwOnError: boolean;
};

type UploadStateRef = Ref<UploadState>;

type UploadActions = {
	reset: () => void;
	setLoading: () => void;
	setProgress: (value: number) => void;
	setSuccess: (value: UploadFileResult) => void;
	setFailure: (value: StorageError) => void;
};

type UploadExecution<M extends StandardSchemaV1> = {
	client: BaseStorageClient<M>;
	file: File;
	metadata: StandardSchemaV1.InferInput<M>;
	actions: UploadActions;
	callbacks: UploadCallbacks;
};

export interface UseUploadOptions {
	onProgress: (progress: number) => void;
	onSuccess: (result: UploadFileResult) => void;
	onError: (error: StorageError) => void;
	throwOnError?: boolean;
}

type UseUploadReturn<M extends StandardSchemaV1> = {
	state: Readonly<UploadStateRef>;
	upload: (
		file: File,
		metadata: StandardSchemaV1.InferInput<M>,
	) => Promise<void>;
	reset: () => void;
};

type UseUploadHook<M extends StandardSchemaV1> = (
	options?: Partial<UseUploadOptions>,
) => UseUploadReturn<M>;

const initialUploadState: UploadState = {
	isLoading: false,
	progress: 0,
	error: null,
	data: null,
	status: "idle",
};

function createUploadActions(state: UploadStateRef): UploadActions {
	return {
		reset: () => {
			state.value = { ...initialUploadState };
		},
		setLoading: () => {
			state.value = { ...initialUploadState, isLoading: true, status: "loading" };
		},
		setProgress: (value: number) => {
			state.value = { ...state.value, progress: value };
		},
		setSuccess: (value: UploadFileResult) => {
			state.value = {
				...state.value,
				isLoading: false,
				data: value,
				error: null,
				status: "success",
			};
		},
		setFailure: (value: StorageError) => {
			state.value = {
				...state.value,
				isLoading: false,
				error: value,
				data: null,
				status: "error",
			};
		},
	};
}

function resolveThrowOnError(
	optionThrowOnError: boolean | undefined,
	clientThrowOnError: boolean | undefined,
): boolean {
	if (optionThrowOnError !== undefined) {
		return optionThrowOnError;
	}

	return clientThrowOnError === true;
}

async function executeUpload<M extends StandardSchemaV1>(
	input: UploadExecution<M>,
): Promise<void> {
	const { client, file, metadata, actions, callbacks } = input;
	try {
		actions.reset();
		actions.setLoading();
		const result = await client.uploadFile(file, metadata, {
			onProgress: (value) => {
				actions.setProgress(value);
				callbacks.onProgress?.(value);
			},
		});
		actions.setSuccess(result);
		callbacks.onSuccess?.(result);
	} catch (error) {
		const storageError = normalizeStorageError(
			error,
			"Upload failed unexpectedly",
		);
		actions.setFailure(storageError);
		callbacks.onError?.(storageError);
		if (callbacks.throwOnError) {
			throw storageError;
		}
	}
}

function useUploadInternal<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
	options?: Partial<UseUploadOptions>,
): UseUploadReturn<M> {
	const state = ref<UploadState>({ ...initialUploadState });
	const actions = createUploadActions(state);
	const shouldThrow = resolveThrowOnError(
		options?.throwOnError,
		client["~options"].throwOnError,
	);

	const upload = async (
		file: File,
		metadata: StandardSchemaV1.InferInput<M>,
	): Promise<void> => {
		await executeUpload({
			client,
			file,
			metadata,
			actions,
			callbacks: {
				onProgress: options?.onProgress,
				onSuccess: options?.onSuccess,
				onError: options?.onError,
				throwOnError: shouldThrow,
			},
		});
	};

	return { state: readonly(state), upload, reset: actions.reset };
}

export function createUseUpload<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
): UseUploadHook<M> {
	return function useUpload(
		options?: Partial<UseUploadOptions>,
	): UseUploadReturn<M> {
		return useUploadInternal(client, options);
	};
}
