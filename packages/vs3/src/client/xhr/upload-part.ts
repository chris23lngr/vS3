import {
	calculateRetryDelay,
	DEFAULT_RETRY_CONFIG,
	type RetryConfig,
	sleep,
} from "../../core/resilience/retry";
import { XhrFactory } from "./xhr-factory";

export type XhrUploadPartResult = { partNumber: number; eTag: string };

type UploadPartParams = {
	presignedUrl: string;
	partNumber: number;
	body: Blob;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	onProgress?: (loaded: number) => void;
};

type RetryExecutionParams = {
	maxAttempts: number;
	retryConfig: RetryConfig;
	execute: () => Promise<XhrUploadPartResult>;
};

const DEFAULT_RETRY_ATTEMPTS = 3;

function resolveMaxAttempts(retry?: undefined | true | number): number {
	if (typeof retry === "number") return Math.max(1, retry);
	if (retry === true) return DEFAULT_RETRY_ATTEMPTS;
	return 1;
}

function normalizeError(error: unknown): Error | DOMException {
	if (error instanceof DOMException || error instanceof Error) return error;
	return new Error("Part upload failed with an unknown error");
}

async function executeWithRetries({
	maxAttempts,
	retryConfig,
	execute,
}: RetryExecutionParams): Promise<XhrUploadPartResult> {
	let attempt = 0;
	let lastError: Error | DOMException | undefined;

	while (attempt < maxAttempts) {
		try {
			return await execute();
		} catch (error) {
			const normalizedError = normalizeError(error);
			lastError = normalizedError;
			attempt++;

			if (
				normalizedError instanceof DOMException &&
				normalizedError.name === "AbortError"
			) {
				throw normalizedError;
			}

			if (attempt >= maxAttempts) {
				throw normalizedError;
			}

			const delayMs = calculateRetryDelay(attempt, retryConfig);
			await sleep(delayMs);
		}
	}

	throw lastError ?? new Error("Part upload failed: no attempts made");
}

function createPartUploadRequest(
	params: UploadPartParams,
): Promise<XhrUploadPartResult> {
	return new Promise((resolve, reject) => {
		const xhr = new XhrFactory(params.signal);
		xhr.open("PUT", params.presignedUrl, true);
		xhr.appendHeaders(params.headers);

		xhr.appendRawProgressHandler(params.onProgress);

		xhr.appendErrorHandler((_status, statusText, cleanup) => {
			cleanup();
			reject(new Error(`Part upload error: ${statusText}`));
		});

		xhr.appendAbortHandler(() => {
			reject(new DOMException("Part upload aborted", "AbortError"));
		});

		xhr.appendLoadHandler((success, _status, statusText, cleanup) => {
			if (success) {
				const eTag = xhr.getResponseHeader("etag");
				cleanup();
				if (!eTag) {
					reject(
						new Error("S3 did not return an ETag header for the uploaded part"),
					);
					return;
				}
				resolve({ partNumber: params.partNumber, eTag });
				return;
			}
			cleanup();
			reject(new Error(`Part upload failed: ${statusText}`));
		});

		xhr.send(params.body);
	});
}

export function xhrUploadPart(
	params: UploadPartParams,
	options?: { retry?: undefined | true | number; retryConfig?: RetryConfig },
): Promise<XhrUploadPartResult> {
	const { retry, retryConfig = DEFAULT_RETRY_CONFIG } = options ?? {};
	const maxAttempts = resolveMaxAttempts(retry);

	return executeWithRetries({
		maxAttempts,
		retryConfig,
		execute: () => createPartUploadRequest(params),
	});
}
