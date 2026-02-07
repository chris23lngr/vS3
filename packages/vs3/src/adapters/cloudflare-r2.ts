import { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface CloudflareR2AdapterOptions {
	accountId: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/**
	 * Optional jurisdiction for data locality.
	 * @see https://developers.cloudflare.com/r2/reference/data-location/
	 */
	jurisdiction?: "eu" | "fedramp";
}

/**
 * Creates an adapter pre-configured for Cloudflare R2.
 */
export function cloudflareR2(options: CloudflareR2AdapterOptions): Adapter {
	const jurisdictionSuffix = options.jurisdiction
		? `.${options.jurisdiction}`
		: "";
	const endpoint = `https://${options.accountId}${jurisdictionSuffix}.r2.cloudflarestorage.com`;

	const client = new S3Client({
		region: "auto",
		endpoint,
		credentials: options.credentials,
	});

	return { client };
}
