import type { S3Operations } from "../internal/s3-operations.types";
import type { StorageOptions } from "./options";

export type StorageContext<O extends StorageOptions = StorageOptions> = {
	readonly $options: O;
	readonly $operations: S3Operations;
	readonly $middleware?: Record<string, unknown>;
};
