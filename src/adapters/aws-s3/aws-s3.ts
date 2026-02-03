import type { S3Client } from "@aws-sdk/client-s3";
import type { Adapter } from "../../types/adapter";

interface CreateAwsS3AdapterOptions {
	client: S3Client;
}

export function createAwsS3Adapter(
	options: CreateAwsS3AdapterOptions,
): Adapter {
	return {
		generatePresignedUploadUrl(key, fileInfo, options) {
			const {
				acl = "private",
				contentType = "*",
				expiresIn = 3600,
				metadata = {},
			} = options ?? {};

			return `${JSON.stringify({ fileInfo, key, acl, contentType, expiresIn, metadata })}`;
		},
		generatePresignedDownloadUrl(key, options) {
			const { expiresIn = 3600 } = options ?? {};

			return `${JSON.stringify({ key, expiresIn, action: "download" })}`;
		},
	};
}
