import { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface MinioAdapterOptions {
	endpoint: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/**
	 * Region for the MinIO instance.
	 * @default "us-east-1"
	 */
	region?: string;
}

/**
 * Creates an adapter pre-configured for MinIO.
 * Enables path-style access as required by MinIO.
 */
export function minio(options: MinioAdapterOptions): Adapter {
	const client = new S3Client({
		endpoint: options.endpoint,
		region: options.region ?? "us-east-1",
		credentials: options.credentials,
		forcePathStyle: true,
	});

	return { client };
}
