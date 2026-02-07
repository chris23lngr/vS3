import type { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../types/adapter";

interface CreateAdapterOptions {
	client: S3Client;
}

/**
 * Creates an adapter from an existing, pre-configured S3Client.
 * Use this when you need full control over the client configuration
 * or when no built-in preset matches your provider.
 */
export function createAdapter(options: CreateAdapterOptions): Adapter {
	return { client: options.client };
}
