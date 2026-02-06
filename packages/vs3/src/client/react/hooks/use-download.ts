import { useCallback, useState } from "react";
import type { S3Encryption } from "../../../types/encryption";
import type { StandardSchemaV1 } from "../../../types/standard-schema";
import type {
	BaseStorageClient,
	DownloadFileResult,
	DownloadMode,
} from "../../create-client";

type DownloadStatus = "idle" | "loading" | "success" | "error";

type DownloadState = {
	isLoading: boolean;
	error: unknown;
	data: DownloadFileResult | null;
	status: DownloadStatus;
};

type DownloadStateActions = {
	reset: () => void;
	setLoading: () => void;
	setSuccess: (value: DownloadFileResult) => void;
	setFailure: (value: unknown) => void;
};

type DownloadCallbacks = {
	onSuccess?: (result: DownloadFileResult) => void;
	onError?: (error: unknown) => void;
	throwOnError: boolean;
};

type DownloadOptions = Partial<{
	expiresIn: number;
	encryption: S3Encryption;
	mode: DownloadMode;
}>;

export interface UseDownloadOptions {
	onSuccess: (result: DownloadFileResult) => void;
	onError: (error: unknown) => void;
	throwOnError?: boolean;
}

type UseDownloadReturn = {
	state: DownloadState;
	download: (
		key: string,
		downloadOptions?: DownloadOptions,
	) => Promise<DownloadFileResult | undefined>;
	reset: () => void;
};

type UseDownloadHook<M extends StandardSchemaV1> = (
	options?: Partial<UseDownloadOptions>,
) => UseDownloadReturn;

const initialDownloadState: DownloadState = {
	isLoading: false,
	error: null,
	data: null,
	status: "idle",
};

function useDownloadState(): {
	state: DownloadState;
	actions: DownloadStateActions;
} {
	const [state, setState] = useState<DownloadState>(initialDownloadState);

	const reset = useCallback((): void => {
		setState(initialDownloadState);
	}, []);

	const setLoading = useCallback((): void => {
		setState({ ...initialDownloadState, isLoading: true, status: "loading" });
	}, []);

	const setSuccess = useCallback((value: DownloadFileResult): void => {
		setState({ isLoading: false, error: null, data: value, status: "success" });
	}, []);

	const setFailure = useCallback((value: unknown): void => {
		setState({ isLoading: false, error: value, data: null, status: "error" });
	}, []);

	return { state, actions: { reset, setLoading, setSuccess, setFailure } };
}

function useDownloadHandler<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
	callbacks: DownloadCallbacks,
	actions: DownloadStateActions,
): (
	key: string,
	downloadOptions?: DownloadOptions,
) => Promise<DownloadFileResult | undefined> {
	const { reset, setLoading, setSuccess, setFailure } = actions;
	const { onSuccess, onError, throwOnError } = callbacks;
	return useCallback(
		async (
			key: string,
			downloadOptions?: DownloadOptions,
		): Promise<DownloadFileResult | undefined> => {
			try {
				reset();
				setLoading();
				const result = await client.downloadFile(key, {
					...downloadOptions,
					onSuccess: (value) => {
						setSuccess(value);
						onSuccess?.(value);
					},
				});
				return result;
			} catch (error) {
				setFailure(error);
				onError?.(error);
				if (throwOnError) {
					throw error;
				}
				return undefined;
			}
		},
		[
			client,
			reset,
			setLoading,
			setSuccess,
			setFailure,
			onSuccess,
			onError,
			throwOnError,
		],
	);
}

function useDownloadInternal<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
	options?: Partial<UseDownloadOptions>,
): UseDownloadReturn {
	const { onSuccess, onError, throwOnError = false } = options ?? {};
	const { state, actions } = useDownloadState();

	const download = useDownloadHandler(
		client,
		{ onSuccess, onError, throwOnError },
		actions,
	);

	return { state, download, reset: actions.reset };
}

export function createUseDownload<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
): UseDownloadHook<M> {
	return function useDownload(
		options?: Partial<UseDownloadOptions>,
	): UseDownloadReturn {
		return useDownloadInternal(client, options);
	};
}
