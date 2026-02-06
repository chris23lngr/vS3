import { useCallback, useState } from "react";
import type { StandardSchemaV1 } from "../../../types/standard-schema";
import type { BaseStorageClient } from "../../create-client";

type UploadStatus = "idle" | "loading" | "success" | "error";

type UploadState = {
	isLoading: boolean;
	progress: number;
	error: unknown;
	data: unknown;
	status: UploadStatus;
};

type UploadStateActions = {
	reset: () => void;
	setLoading: () => void;
	setProgress: (value: number) => void;
	setSuccess: (value: unknown) => void;
	setFailure: (value: unknown) => void;
};

type UploadCallbacks = {
	onProgress?: (progress: number) => void;
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
	throwOnError: boolean;
};

export interface UseUploadOptions {
	onProgress: (progress: number) => void;
	onSuccess: () => void;
	onError: (error: unknown) => void;
	throwOnError?: boolean;
}

type UseUploadReturn<M extends StandardSchemaV1> = {
	state: UploadState;
	upload: (
		file: File,
		metadata: StandardSchemaV1.InferInput<M>,
	) => Promise<void>;
	reset: () => void;
};

type UseUploadHook<M extends StandardSchemaV1> = (
	options?: UseUploadOptions,
) => UseUploadReturn<M>;

const initialUploadState: UploadState = {
	isLoading: false,
	progress: 0,
	error: null,
	data: null,
	status: "idle",
};

function useUploadState(): { state: UploadState; actions: UploadStateActions } {
	const [state, setState] = useState<UploadState>(initialUploadState);

	const reset = useCallback((): void => {
		setState({ ...initialUploadState, error: undefined, data: undefined });
	}, []);

	const setLoading = useCallback((): void => {
		setState((current) => ({ ...current, status: "loading" }));
	}, []);

	const setProgress = useCallback((value: number): void => {
		setState((current) => ({ ...current, progress: value }));
	}, []);

	const setSuccess = useCallback((value: unknown): void => {
		setState((current) => ({ ...current, data: value, status: "success" }));
	}, []);

	const setFailure = useCallback((value: unknown): void => {
		setState((current) => ({ ...current, error: value, status: "error" }));
	}, []);

	return {
		state,
		actions: { reset, setLoading, setProgress, setSuccess, setFailure },
	};
}

function useUploadHandler<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
	callbacks: UploadCallbacks,
	actions: UploadStateActions,
): (file: File, metadata: StandardSchemaV1.InferInput<M>) => Promise<void> {
	const { reset, setLoading, setProgress, setSuccess, setFailure } = actions;
	const { onProgress, onSuccess, onError, throwOnError } = callbacks;
	return useCallback(
		async (
			file: File,
			metadata: StandardSchemaV1.InferInput<M>,
		): Promise<void> => {
			try {
				reset();
				setLoading();
				const result = await client.uploadFile(file, metadata, {
					onProgress: (value) => {
						setProgress(value);
						onProgress?.(value);
					},
					onSuccess: ({ key, presignedUrl }) => {
						setSuccess({ key, presignedUrl });
						onSuccess?.();
					},
				});
				setSuccess(result);
			} catch (error) {
				setFailure(error);
				onError?.(error);
				if (throwOnError) {
					throw error;
				}
			}
		},
		[
			client,
			reset,
			setLoading,
			setProgress,
			setSuccess,
			setFailure,
			onProgress,
			onSuccess,
			onError,
			throwOnError,
		],
	);
}

function useUploadInternal<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
	options?: UseUploadOptions,
): UseUploadReturn<M> {
	const { onProgress, onSuccess, onError, throwOnError = false } = options ?? {};
	const { state, actions } = useUploadState();

	const upload = useUploadHandler(
		client,
		{ onProgress, onSuccess, onError, throwOnError },
		actions,
	);

	return { state, upload, reset: actions.reset };
}

export function createUseUpload<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
): UseUploadHook<M> {
	return function useUpload(options?: UseUploadOptions): UseUploadReturn<M> {
		return useUploadInternal(client, options);
	};
}
