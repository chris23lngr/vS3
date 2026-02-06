import { useCallback, useState } from "react";
import type { S3Encryption } from "../../../types/encryption";
import type { StandardSchemaV1 } from "../../../types/standard-schema";
import type {
	BaseStorageClient,
	DownloadFileResult,
} from "../../create-client";

type DownloadStatus = "idle" | "loading" | "success" | "error";

export interface UseDownloadOptions {
	onSuccess: (result: DownloadFileResult) => void;
	onError: (error: unknown) => void;
}

export function createUseDownload<M extends StandardSchemaV1>(
	client: BaseStorageClient<M>,
) {
	return function useDownload(options?: Partial<UseDownloadOptions>) {
		const { onSuccess, onError } = options ?? {};

		const [isLoading, setIsLoading] = useState<boolean>(false);
		const [error, setError] = useState<unknown>(null);
		const [data, setData] = useState<DownloadFileResult | null>(null);
		const [status, setStatus] = useState<DownloadStatus>("idle");

		const resetState = useCallback(() => {
			setIsLoading(false);
			setError(null);
			setData(null);
			setStatus("idle");
		}, []);

		const download = useCallback(
			async (
				key: string,
				downloadOptions?: Partial<{
					expiresIn: number;
					encryption: S3Encryption;
				}>,
			) => {
				try {
					resetState();
					setIsLoading(true);
					setStatus("loading");

					const result = await client.downloadFile(key, {
						...downloadOptions,
						onSuccess: (res) => {
							setData(res);
							setStatus("success");
							onSuccess?.(res);
						},
					});

					setIsLoading(false);
					setData(result);
					return result;
				} catch (err) {
					setIsLoading(false);
					setError(err);
					setStatus("error");
					onError?.(err);
					throw err;
				}
			},
			[resetState, onSuccess, onError],
		);

		return {
			state: {
				isLoading,
				error,
				data,
				status,
			},
			download,
			reset: resetState,
		};
	};
}
