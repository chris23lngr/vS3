import type { StorageContext } from "../types/context";
import type { StorageOptions } from "../types/options";

export function createContext<O extends StorageOptions>(
	options: O,
): StorageContext<O> {
	return {
		$options: options,
	};
}
