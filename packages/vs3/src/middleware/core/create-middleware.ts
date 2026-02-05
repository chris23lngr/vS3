import type {
	MiddlewareConfig,
	MiddlewareHandler,
	StorageMiddleware,
} from "../types";

function validateConfig(config: MiddlewareConfig): void {
	const hasSkipPaths = config.skipPaths && config.skipPaths.length > 0;
	const hasIncludePaths = config.includePaths && config.includePaths.length > 0;
	if (hasSkipPaths && hasIncludePaths) {
		throw new Error(
			`Middleware "${config.name}": skipPaths and includePaths are mutually exclusive`,
		);
	}
}

/**
 * Creates a storage middleware from a config and handler.
 * Throws if both skipPaths and includePaths are provided.
 */
export function createStorageMiddleware<TContext = object, TResult = object>(
	config: MiddlewareConfig,
	handler: MiddlewareHandler<TContext, TResult>,
): StorageMiddleware<TContext, TResult> {
	validateConfig(config);
	return { config, handler };
}
