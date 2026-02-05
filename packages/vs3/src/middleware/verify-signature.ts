import { StorageErrorCode } from "../core/error/codes";
import { StorageServerError } from "../core/error/error";
import { createRequestSigner } from "../core/security/request-signer";
import type {
	AuthHook,
	AuthHookResult,
	NonceStore,
	RequestSigningConfig,
} from "../types/security";

/**
 * Configuration for the signature verification middleware.
 */
export type VerifySignatureMiddlewareConfig = RequestSigningConfig & {
	/**
	 * Optional nonce store for replay attack prevention.
	 * If not provided and requireNonce is true, an in-memory store will be used.
	 */
	nonceStore?: NonceStore;

	/**
	 * Optional auth hook for additional token validation.
	 * Called after signature verification succeeds.
	 */
	authHook?: AuthHook;

	/**
	 * Skip signature verification for certain paths.
	 * Useful for health checks or public endpoints.
	 */
	skipPaths?: string[];

	/**
	 * Custom error handler for verification failures.
	 * If not provided, a StorageServerError will be thrown.
	 */
	onVerificationFailure?: (reason: string, request: Request) => Response | never;
};

/**
 * Extracts a header value from a Request or Headers object.
 */
function getHeader(headers: Headers, name: string): string | undefined {
	return headers.get(name) ?? undefined;
}

/**
 * Reads the request body as text.
 * Handles cases where body might have already been read.
 */
async function readRequestBody(request: Request): Promise<string> {
	try {
		const clone = request.clone();
		return await clone.text();
	} catch {
		return "";
	}
}

/**
 * Extracts the path from a request URL.
 */
function extractPath(request: Request): string {
	try {
		const url = new URL(request.url);
		return url.pathname;
	} catch {
		return request.url;
	}
}

/**
 * Creates a verification failure response.
 */
function createVerificationError(
	code: StorageErrorCode,
	message: string,
	details?: unknown,
): StorageServerError {
	return new StorageServerError({
		code,
		message,
		details,
	});
}

/**
 * Result of verification containing extracted auth info.
 */
export type VerificationResult = {
	verified: true;
	timestamp: number;
	nonce?: string;
	auth?: {
		userId?: string;
		metadata?: Record<string, unknown>;
	};
};

/**
 * Creates a signature verification middleware function.
 *
 * @example
 * ```typescript
 * const verifySignature = createVerifySignatureMiddleware({
 *   secret: process.env.SIGNING_SECRET,
 *   timestampToleranceMs: 5 * 60 * 1000, // 5 minutes
 *   requireNonce: true,
 * });
 *
 * // In your request handler
 * async function handler(request: Request) {
 *   const result = await verifySignature(request);
 *   // Request is verified, proceed with handling
 * }
 * ```
 */
export function createVerifySignatureMiddleware(
	config: VerifySignatureMiddlewareConfig,
): (request: Request) => Promise<VerificationResult> {
	const signer = createRequestSigner(config);
	const skipPaths = new Set(config.skipPaths ?? []);

	return async (request: Request): Promise<VerificationResult> => {
		const path = extractPath(request);

		// Skip verification for configured paths
		if (skipPaths.has(path)) {
			return {
				verified: true,
				timestamp: Date.now(),
			};
		}

		// Extract signature headers
		const signature = getHeader(request.headers, "x-signature");
		const timestampStr = getHeader(request.headers, "x-timestamp");
		const nonce = getHeader(request.headers, "x-nonce");

		// Validate signature presence
		if (!signature) {
			throw createVerificationError(
				StorageErrorCode.SIGNATURE_MISSING,
				"Request signature is missing. Include the 'x-signature' header.",
				{ header: "x-signature" },
			);
		}

		// Validate timestamp presence
		if (!timestampStr) {
			throw createVerificationError(
				StorageErrorCode.TIMESTAMP_MISSING,
				"Request timestamp is missing. Include the 'x-timestamp' header.",
				{ header: "x-timestamp" },
			);
		}

		const timestamp = Number.parseInt(timestampStr, 10);
		if (!Number.isFinite(timestamp)) {
			throw createVerificationError(
				StorageErrorCode.TIMESTAMP_MISSING,
				"Request timestamp is invalid. Must be a valid Unix timestamp in milliseconds.",
				{ header: "x-timestamp", value: timestampStr },
			);
		}

		// Validate nonce presence if required
		if (config.requireNonce && !nonce) {
			throw createVerificationError(
				StorageErrorCode.NONCE_MISSING,
				"Request nonce is missing. Include the 'x-nonce' header.",
				{ header: "x-nonce" },
			);
		}

		// Read request body
		const body = await readRequestBody(request);

		// Verify signature
		const verificationResult = await signer.verify(
			{
				method: request.method,
				path,
				body,
				signature,
				timestamp,
				nonce,
			},
			config.nonceStore,
		);

		if (!verificationResult.valid) {
			const errorMap: Record<string, { code: StorageErrorCode; message: string }> = {
				signature_mismatch: {
					code: StorageErrorCode.SIGNATURE_INVALID,
					message: "Request signature verification failed. The signature does not match.",
				},
				timestamp_expired: {
					code: StorageErrorCode.TIMESTAMP_EXPIRED,
					message: "Request timestamp has expired. The request is too old or from the future.",
				},
				timestamp_invalid: {
					code: StorageErrorCode.TIMESTAMP_MISSING,
					message: "Request timestamp is invalid.",
				},
				nonce_missing: {
					code: StorageErrorCode.NONCE_MISSING,
					message: "Request nonce is required but missing.",
				},
				nonce_reused: {
					code: StorageErrorCode.NONCE_REUSED,
					message: "Request nonce has already been used. Each request must have a unique nonce.",
				},
			};

			const errorInfo = errorMap[verificationResult.reason];
			if (errorInfo) {
				throw createVerificationError(errorInfo.code, errorInfo.message, {
					reason: verificationResult.reason,
				});
			}

			throw createVerificationError(
				StorageErrorCode.SIGNATURE_INVALID,
				"Request signature verification failed.",
				{ reason: verificationResult.reason },
			);
		}

		// Run optional auth hook
		let authResult: AuthHookResult | undefined;
		if (config.authHook) {
			const headers: Record<string, string | undefined> = {};
			request.headers.forEach((value, key) => {
				headers[key] = value;
			});

			authResult = await config.authHook({ request, headers });

			if (!authResult.authenticated) {
				throw createVerificationError(
					StorageErrorCode.UNAUTHORIZED,
					authResult.reason ?? "Authentication failed.",
					{ authHookFailed: true },
				);
			}
		}

		return {
			verified: true,
			timestamp,
			nonce,
			auth: authResult?.authenticated
				? {
						userId: authResult.userId,
						metadata: authResult.metadata,
					}
				: undefined,
		};
	};
}

/**
 * Creates a client-side request signer that can be used to sign outgoing requests.
 *
 * @example
 * ```typescript
 * const signRequest = createClientRequestSigner({
 *   secret: "shared-secret",
 * });
 *
 * // Sign a request before sending
 * const { headers } = await signRequest({
 *   method: "POST",
 *   path: "/api/storage/upload-url",
 *   body: JSON.stringify({ fileInfo: { ... } }),
 * });
 *
 * fetch("/api/storage/upload-url", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     ...headers,
 *   },
 *   body: JSON.stringify({ fileInfo: { ... } }),
 * });
 * ```
 */
export function createClientRequestSigner(config: RequestSigningConfig): {
	sign: (input: {
		method: string;
		path: string;
		body?: string;
		nonce?: string;
	}) => Promise<{
		headers: Record<string, string>;
		timestamp: number;
		signature: string;
	}>;
} {
	const signer = createRequestSigner(config);

	return {
		sign: async (input) => {
			const result = await signer.sign({
				method: input.method,
				path: input.path,
				body: input.body,
				nonce: input.nonce,
			});

			return {
				headers: result.headers as Record<string, string>,
				timestamp: result.timestamp,
				signature: result.signature,
			};
		},
	};
}

export type { VerifySignatureMiddlewareConfig };
