import { StorageErrorCode } from "../../core/error/codes";
import { StorageClientError, StorageError } from "../../core/error/error";

export function normalizeStorageError(
	error: unknown,
	fallbackMessage: string,
): StorageError {
	if (error instanceof StorageError) {
		return error;
	}

	if (error instanceof Error) {
		return new StorageClientError({
			code: StorageErrorCode.UNKNOWN_ERROR,
			message: fallbackMessage,
			details: error.stack ?? error.message,
		});
	}

	return new StorageClientError({
		code: StorageErrorCode.UNKNOWN_ERROR,
		message: fallbackMessage,
		details: String(error),
	});
}
