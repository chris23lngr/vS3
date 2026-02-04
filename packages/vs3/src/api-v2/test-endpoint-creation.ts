import z from "zod";
import { createUploadRoute } from "./routes";

const endpoint = createUploadRoute(
	z.object({
		userId: z.string(),
		age: z.number(),
	}),
);

endpoint({
	body: {
		file: {
			name: "test.txt",
			size: 100,
			contentType: "text/plain",
		},
		metadata: {},
	},
});
