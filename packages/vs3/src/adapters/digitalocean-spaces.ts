import { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface DigitalOceanSpacesAdapterOptions {
	/**
	 * DigitalOcean datacenter region (e.g. "nyc3", "ams3", "sgp1").
	 */
	region: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
}

/**
 * Creates an adapter pre-configured for DigitalOcean Spaces.
 */
export function digitaloceanSpaces(
	options: DigitalOceanSpacesAdapterOptions,
): Adapter {
	const client = new S3Client({
		endpoint: `https://${options.region}.digitaloceanspaces.com`,
		region: options.region,
		credentials: options.credentials,
		forcePathStyle: false,
	});

	return { client };
}
