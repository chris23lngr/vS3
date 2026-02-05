import type { Adapter } from "./adapter";
import type { FileInfo } from "./file";
import type { BeforeHookResult } from "./hooks";
import type { StandardSchemaV1 } from "./standard-schema";

export type StorageOptions<M extends StandardSchemaV1 = StandardSchemaV1> = {
	bucket: string;

	adapter: Adapter;

	/**
	 * Maximum allowed file size in bytes.
	 * Files exceeding this limit will be rejected with a FILE_TOO_LARGE error.
	 * Must be a positive number. If not specified, no size limit is enforced.
	 *
	 * @example
	 * ```typescript
	 * maxFileSize: 5 * 1024 * 1024, // 5 MB
	 * ```
	 */
	maxFileSize?: number;

	/**
	 * Allowed file types for uploads.
	 * Supports MIME types (e.g. "image/png" or "image/*") and file extensions (e.g. ".png", ".jpg").
	 * When provided, uploads that do not match are rejected with INVALID_FILE_INFO.
	 *
	 * **Note:** Extensions "jpeg" and "jpg" are treated as equivalent.
	 *
	 * @example
	 * ```typescript
	 * allowedFileTypes: ["image/png", "image/jpeg", ".pdf"],
	 * ```
	 */
	allowedFileTypes?: string[];

	metadataSchema?: M;

	baseUrl?: string;

	apiPath?: string;

	generateKey?: (
		fileInfo: FileInfo,
		metadata: StandardSchemaV1.InferInput<M>,
	) => string | Promise<string>;

	hooks?: {
		beforeUpload?: (
			fileInfo: FileInfo,
			metadata: StandardSchemaV1.InferOutput<M>,
		) => BeforeHookResult | Promise<BeforeHookResult>;

		afterUpload?: (
			fileInfo: FileInfo,
			metadata: StandardSchemaV1.InferOutput<M>,
			key: string,
		) => void | Promise<void>;
	};
};
