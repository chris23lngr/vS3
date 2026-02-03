import { createRouter } from "better-call";
import type { StorageContext } from "../types/context";
import type { StorageOptions } from "../types/options";
import { upload } from "./routes";
import { toStorageEndpoints } from "./to-storage-endpoints";

export function getEndpoints<C extends StorageContext<StorageOptions>>(
	context: C,
) {
	const endpoints = {
		upload,
	} as const;

	const api = toStorageEndpoints(endpoints, context);

	return {
		api: api as typeof endpoints,
	};
}

export function router<O extends StorageOptions>(
	options: O,
	context: StorageContext<O>,
) {
	const { api } = getEndpoints(context);

	return createRouter(api, {});
}
