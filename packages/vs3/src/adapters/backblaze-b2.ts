import { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface BackblazeB2AdapterOptions {
	/**
	 * Backblaze B2 region (e.g. "us-west-000", "eu-central-003").
	 */
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
}

/**
 * Creates an adapter pre-configured for Backblaze B2.
 */
export function backblazeB2(options: BackblazeB2AdapterOptions): Adapter {
	const client = new S3Client({
		endpoint: `https://s3.${options.region}.backblazeb2.com`,
		region: options.region,
		credentials: options.credentials,
	});

	return { client };
}
