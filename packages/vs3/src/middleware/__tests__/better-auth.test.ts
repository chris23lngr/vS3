import type { Auth } from "better-auth";
import { describe, expect, it, vi } from "vitest";
import { StorageErrorCode } from "../../core/error/codes";
import { StorageServerError } from "../../core/error/error";
import { createBetterAuthMiddleware } from "../auth/better-auth";
import { executeMiddlewareChain } from "../core/execute-chain";
import type { StorageMiddlewareContext } from "../types";

function createMiddlewareContext(request: Request): StorageMiddlewareContext {
	let path: string;
	try {
		path = new URL(request.url).pathname;
	} catch {
		path = request.url;
	}
	return {
		method: request.method,
		path,
		request,
		headers: request.headers,
		context: {},
	};
}

function createRequest(
	path = "/upload-url",
	options?: { headers?: Record<string, string> },
): Request {
	return new Request(`http://localhost${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...options?.headers,
		},
	});
}

type MockAuth = {
	api: {
		getSession: ReturnType<typeof vi.fn>;
	};
};

function createMockAuth(
	getSessionResult: { user: { id: string } } | null = null,
): MockAuth {
	return {
		api: {
			getSession: vi.fn().mockResolvedValue(getSessionResult),
		},
	};
}

describe("createBetterAuthMiddleware", () => {
	it("returns auth context when session exists", async () => {
		const mockAuth = createMockAuth({ user: { id: "ba-user-1" } });
		const middleware = createBetterAuthMiddleware({
			auth: mockAuth as unknown as Auth,
		});

		const request = createRequest();
		const ctx = createMiddlewareContext(request);
		const result = await middleware.handler(ctx);

		expect(result).toEqual({
			auth: { userId: "ba-user-1", metadata: undefined },
		});
		expect(mockAuth.api.getSession).toHaveBeenCalledWith({
			headers: request.headers,
		});
	});

	it("throws UNAUTHORIZED when no session exists", async () => {
		const mockAuth = createMockAuth(null);
		const middleware = createBetterAuthMiddleware({
			auth: mockAuth as unknown as Auth,
		});

		const request = createRequest();
		const ctx = createMiddlewareContext(request);

		await expect(middleware.handler(ctx)).rejects.toThrow(StorageServerError);

		try {
			await middleware.handler(ctx);
		} catch (error) {
			expect(error).toBeInstanceOf(StorageServerError);
			expect((error as StorageServerError).code).toBe(
				StorageErrorCode.UNAUTHORIZED,
			);
		}
	});

	it("passes request headers to getSession", async () => {
		const mockAuth = createMockAuth({ user: { id: "u1" } });
		const middleware = createBetterAuthMiddleware({
			auth: mockAuth as unknown as Auth,
		});

		const request = createRequest("/test", {
			headers: { authorization: "Bearer my-token" },
		});
		const ctx = createMiddlewareContext(request);
		await middleware.handler(ctx);

		const callArg = mockAuth.api.getSession.mock.calls[0][0] as {
			headers: Headers;
		};
		expect(callArg.headers.get("authorization")).toBe("Bearer my-token");
	});

	it("forwards skipPaths config to the middleware", async () => {
		const mockAuth = createMockAuth({ user: { id: "u1" } });
		const middleware = createBetterAuthMiddleware({
			auth: mockAuth as unknown as Auth,
			skipPaths: ["/health"],
		});

		const request = createRequest("/health");
		const ctx = createMiddlewareContext(request);
		const chainResult = await executeMiddlewareChain([middleware], ctx);

		expect(mockAuth.api.getSession).not.toHaveBeenCalled();
		expect((chainResult.context as Record<string, unknown>).auth).toBeUndefined();
	});

	it("forwards onAuthFailure config", async () => {
		const mockAuth = createMockAuth(null);
		const customResponse = new Response("Forbidden", { status: 403 });
		const onAuthFailure = vi.fn().mockReturnValue(customResponse);

		const middleware = createBetterAuthMiddleware({
			auth: mockAuth as unknown as Auth,
			onAuthFailure,
		});

		const request = createRequest();
		const ctx = createMiddlewareContext(request);

		await expect(middleware.handler(ctx)).rejects.toBe(customResponse);
		expect(onAuthFailure).toHaveBeenCalled();
	});
});
