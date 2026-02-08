import {
	createInMemoryNonceStore,
	createRequestSigner,
} from "../../core/security/request-signer";
import { createStorageMiddleware } from "../core/create-middleware";
import type { StorageMiddleware } from "../types";
import type {
	VerificationResult,
	VerifySignatureMiddlewareConfig,
} from "./types";
import { verifySignedRequest } from "./verify-request";

/**
 * Canonical name used to identify the signature verification middleware.
 * Exported so other layers (e.g. the routing layer) can reference it
 * without duplicating a magic string.
 */
export const VERIFY_SIGNATURE_MIDDLEWARE_NAME = "verify-signature" as const;

type SignatureMiddlewareResult = {
	signature: VerificationResult;
};

/**
 * Creates a signature verification middleware that integrates with the
 * middleware chain system. Returns a StorageMiddleware that adds
 * `{ signature: VerificationResult }` to the accumulated context.
 */
export function createVerifySignatureMiddleware(
	config: VerifySignatureMiddlewareConfig,
): StorageMiddleware<object, SignatureMiddlewareResult> {
	const signer = createRequestSigner(config);
	const nonceStore =
		config.requireNonce && !config.nonceStore
			? createInMemoryNonceStore()
			: config.nonceStore;

	return createStorageMiddleware(
		{
			name: VERIFY_SIGNATURE_MIDDLEWARE_NAME,
			skipPaths: config.skipPaths,
		},
		async (ctx) => {
			const result = await verifySignedRequest({
				request: ctx.request,
				config,
				signer,
				nonceStore,
			});
			return { signature: result };
		},
	);
}
