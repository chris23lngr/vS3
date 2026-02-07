import { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface WasabiAdapterOptions {
	/**
	 * Wasabi region (e.g. "us-east-1", "eu-central-1", "ap-northeast-1").
	 */
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
}

/**
 * Creates an adapter pre-configured for Wasabi Hot Cloud Storage.
 */
export function wasabi(options: WasabiAdapterOptions): Adapter {
	const client = new S3Client({
		endpoint: `https://s3.${options.region}.wasabisys.com`,
		region: options.region,
		credentials: options.credentials,
	});

	return { client };
}
