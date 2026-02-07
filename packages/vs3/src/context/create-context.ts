import { createS3Operations } from "../internal/s3-operations";
import type { StorageContext } from "../types/context";
import type { StorageOptions } from "../types/options";

export function createContext<O extends StorageOptions>(
	options: O,
): StorageContext<O> {
	const bucket = options.bucket;

	const resolveBucket = (overrideBucket?: string): string => {
		const resolved = overrideBucket ?? bucket;
		if (!resolved) {
			throw new Error(
				"A bucket is required. Provide it in StorageOptions or in the request options.",
			);
		}
		return resolved;
	};

	const operations = createS3Operations({
		client: options.adapter.client,
		resolveBucket,
	});

	return {
		$options: options,
		$operations: operations,
	};
}
