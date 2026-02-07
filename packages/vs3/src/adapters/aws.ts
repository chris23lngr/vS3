import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

/**
 * Creates an adapter pre-configured for AWS S3.
 *
 * Accepts the same configuration options as the AWS SDK S3Client,
 * excluding `forcePathStyle` which AWS S3 does not require.
 */
export function aws(options: Omit<S3ClientConfig, "forcePathStyle">): Adapter {
	const client = new S3Client(options);
	return { client };
}
