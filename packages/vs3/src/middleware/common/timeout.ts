import { createStorageMiddleware } from "../core/create-middleware";
import type { StorageMiddleware } from "../types";

/** Configuration for the timeout middleware. */
export type TimeoutConfig = {
	readonly timeoutMs: number;
	readonly skipPaths?: readonly string[];
	readonly includePaths?: readonly string[];
};

type TimeoutResult = {
	timeout: { signal: AbortSignal };
};

function validateTimeoutConfig(config: TimeoutConfig): void {
	if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) {
		throw new Error("Timeout middleware requires timeoutMs to be > 0");
	}
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
	const timeoutFn = (
		AbortSignal as { timeout?: (ms: number) => AbortSignal }
	).timeout;

	if (typeof timeoutFn === "function") {
		return timeoutFn(timeoutMs);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const unref = (timeoutId as { unref?: () => void }).unref;
	if (typeof unref === "function") {
		unref();
	}

	return controller.signal;
}

/**
 * Creates a timeout middleware that provides an AbortSignal to downstream handlers.
 * The signal automatically aborts after the configured timeout.
 * Handlers should pass this signal to async operations (e.g., fetch calls).
 */
export function createTimeoutMiddleware(
	config: TimeoutConfig,
): StorageMiddleware<object, TimeoutResult> {
	validateTimeoutConfig(config);
	return createStorageMiddleware(
		{
			name: "timeout",
			skipPaths: config.skipPaths,
			includePaths: config.includePaths,
		},
		async () => {
			return { timeout: { signal: createTimeoutSignal(config.timeoutMs) } };
		},
	);
}
