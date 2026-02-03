import z from "zod";
import { createStorageEndpoint } from "../create-storage-endpoint";

export const upload = createStorageEndpoint(
	"/generate-upload-url",
	{
		method: "POST",
		body: z.object({
			file: z.instanceof(File),
		}),
	},
	async (ctx) => {
		const { file } = ctx.body;
		const adapter = ctx.context.$options.adapter;
		const uploadUrl = await adapter.generatePresignedUploadUrl(file.name, {
			contentType: file.type,
			size: file.size,
			name: file.name,
		});
		return { uploadUrl };
	},
);
