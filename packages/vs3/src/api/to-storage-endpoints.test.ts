import { describe, expect, it } from "vitest";
import { getCurrentStorageContext } from "../context/endpoint-context";
import type { StorageContext } from "../types/context";
import type { StorageOptions } from "../types/options";
import { toStorageEndpoints } from "./to-storage-endpoints";

type TestEndpoint = ((ctx: any) => Promise<any>) & {
	path: string;
	options: { method: "POST" };
};

const createStorageContext = (): StorageContext<StorageOptions> => ({
	$options: {
		bucket: "test-bucket",
		adapter: {
			generatePresignedUploadUrl: async () => "url",
			generatePresignedDownloadUrl: async () => "url",
			deleteObject: async () => {},
		},
	},
});

describe("toStorageEndpoints", () => {
	it("wraps endpoints and injects storage context", async () => {
		const endpoint: TestEndpoint = Object.assign(
			async (ctx: any) => {
				const current = await getCurrentStorageContext();
				return {
					path: ctx.path,
					hasOptions: Boolean(ctx.context?.$options),
					bucket: current.context.$options.bucket,
				};
			},
			{ path: "/upload-url", options: { method: "POST" as const } },
		);

		const storageContext = createStorageContext();
		const api = toStorageEndpoints({ uploadUrl: endpoint }, storageContext);

		const result = await api.uploadUrl({ body: { test: true } });

		expect(result).toEqual({
			path: "/upload-url",
			hasOptions: true,
			bucket: "test-bucket",
		});
	});

	it("ensures $options is always present in context", async () => {
		const endpoint: TestEndpoint = Object.assign(
			async (ctx: any) => {
				// Verify $options exists and has expected properties
				expect(ctx.context).toBeDefined();
				expect(ctx.context.$options).toBeDefined();
				expect(ctx.context.$options.bucket).toBe("test-bucket");
				expect(ctx.context.$options.adapter).toBeDefined();
				return { success: true };
			},
			{ path: "/test", options: { method: "POST" as const } },
		);

		const storageContext = createStorageContext();
		const api = toStorageEndpoints({ test: endpoint }, storageContext);

		const result = await api.test({ body: {} });
		expect(result).toEqual({ success: true });
	});

	it("throws error when storage context is invalid (missing $options)", async () => {
		const endpoint: TestEndpoint = Object.assign(
			async (ctx: any) => ({ data: ctx }),
			{ path: "/test", options: { method: "POST" as const } },
		);

		// Pass an invalid context without $options
		const invalidContext = {} as StorageContext<StorageOptions>;
		const api = toStorageEndpoints({ test: endpoint }, invalidContext);

		await expect(api.test({ body: {} })).rejects.toThrow(
			"Invalid storage context: $options is missing",
		);
	});

	it("converts incoming headers to Headers", async () => {
		const endpoint: TestEndpoint = Object.assign(
			async (ctx: any) => ({
				isHeaders: ctx.headers instanceof Headers,
				headerValue: ctx.headers?.get?.("x-test") ?? null,
			}),
			{ path: "/upload-url", options: { method: "POST" as const } },
		);

		const api = toStorageEndpoints(
			{ uploadUrl: endpoint },
			Promise.resolve(createStorageContext()),
		);

		const result = await api.uploadUrl({
			body: { test: true },
			headers: { "x-test": "ok" },
		});

		expect(result).toEqual({ isHeaders: true, headerValue: "ok" });
	});

	it("preserves endpoint path and options", () => {
		const endpoint: TestEndpoint = Object.assign(async () => null, {
			path: "/upload-url",
			options: { method: "POST" as const },
		});

		const api = toStorageEndpoints(
			{ uploadUrl: endpoint },
			createStorageContext(),
		);

		expect(api.uploadUrl.path).toBe("/upload-url");
		expect(api.uploadUrl.options).toEqual({ method: "POST" });
	});
});
