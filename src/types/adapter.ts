import type z from "zod";
import type { fileInfoSchema } from "../schemas/file";

export type ACL =
	| "public-read"
	| "private"
	| "authenticated-read"
	| "bucket-owner-full-control"
	| "bucket-owner-read";

export type Adapter = {
	/**
	 * Generated a presigned upload url for a given key.
	 *
	 * @param key - The key to generate a presigned upload url for.
	 * @param fileInfo - The file info to generate a presigned upload url for. The
	 * file info is used to validate the file before uploading.
	 * @param options - The options for the presigned upload url.
	 */
	generatePresignedUploadUrl(
		key: string,
		fileInfo: z.infer<typeof fileInfoSchema>,
		options?: Partial<{
			expiresIn: number;
			contentType: string;
			acl: ACL;
			metadata: Record<string, string>;
		}>,
	): string | Promise<string>;
};
