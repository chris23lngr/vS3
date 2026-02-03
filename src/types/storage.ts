import type { StorageOptions } from "./options";

export type Storage<O extends StorageOptions> = {
	api: {};

	handler: (req: Request) => Promise<Response>;

	"~options": O;
};
