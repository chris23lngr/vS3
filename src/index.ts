import { S3Client } from "@aws-sdk/client-s3";
import { aws } from "./adapters";
import { createStorage } from "./storage";

export const storage = createStorage({
	bucket: "test",
	adapter: aws({
		client: new S3Client({
			region: "us-east-1",
			credentials: {
				accessKeyId: "accessKeyId",
				secretAccessKey: "secretAccessKey",
			},
		}),
	}),
});

const uploadUrl = storage.api.upload({
	body: {
		file: new File([], "DAS IST EIN TEXT.txt"),
	},
	metadata: {
		userId: "1234567890",
	},
});

uploadUrl.then((result) => {
	console.log(result);
});
