import type { S3Client } from "@aws-sdk/client-s3";

/**
 * An adapter provides a pre-configured S3Client for a specific
 * storage provider (AWS, Cloudflare R2, MinIO, etc.).
 *
 * All S3 operations are handled centrally by the vs3 core.
 * The adapter's only responsibility is client configuration.
 */
export type Adapter = {
	readonly client: S3Client;
};
