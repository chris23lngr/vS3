import type { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { describe, expect, it, vi } from "vitest";
import type { Adapter } from "../types/adapter";
import { createContext } from "./create-context";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: vi.fn().mockResolvedValue("https://example.com/presigned"),
}));

const createMockAdapter = (): Adapter => ({
	client: {
		send: vi.fn().mockResolvedValue({}),
	} as unknown as S3Client,
});

describe("createContext", () => {
	it("creates $operations from the adapter client", () => {
		const adapter = createMockAdapter();
		const ctx = createContext({ bucket: "bucket-a", adapter });

		expect(ctx.$operations).toBeDefined();
		expect(ctx.$operations.generatePresignedUploadUrl).toBeTypeOf("function");
		expect(ctx.$operations.generatePresignedDownloadUrl).toBeTypeOf("function");
		expect(ctx.$operations.objectExists).toBeTypeOf("function");
		expect(ctx.$operations.deleteObject).toBeTypeOf("function");
	});

	it("preserves storage options on $options", () => {
		const adapter = createMockAdapter();
		const ctx = createContext({
			bucket: "bucket-a",
			adapter,
			maxFileSize: 10,
			allowedFileTypes: ["image/png"],
			baseUrl: "https://example.com",
		});

		expect(ctx.$options.bucket).toBe("bucket-a");
		expect(ctx.$options.maxFileSize).toBe(10);
		expect(ctx.$options.allowedFileTypes).toEqual(["image/png"]);
		expect(ctx.$options.baseUrl).toBe("https://example.com");
	});

	it("operations use getSignedUrl with the adapter client", async () => {
		const adapter = createMockAdapter();
		const ctx = createContext({ bucket: "bucket-a", adapter });

		const fileInfo = {
			name: "photo.png",
			size: 123,
			contentType: "image/png",
		};

		await ctx.$operations.generatePresignedUploadUrl("key", fileInfo);

		expect(getSignedUrl).toHaveBeenCalledWith(
			adapter.client,
			expect.anything(),
			expect.anything(),
		);
	});

	it("operations resolve bucket from storage options", async () => {
		const adapter = createMockAdapter();
		const ctx = createContext({ bucket: "bucket-a", adapter });

		await ctx.$operations.objectExists("key");

		const sendMock = adapter.client.send as ReturnType<typeof vi.fn>;
		const command = sendMock.mock.calls[0][0] as HeadObjectCommand;
		expect(command.input.Bucket).toBe("bucket-a");
	});

	it("operations allow bucket override", async () => {
		const adapter = createMockAdapter();
		const ctx = createContext({ bucket: "bucket-a", adapter });

		await ctx.$operations.objectExists("key", { bucket: "bucket-b" });

		const sendMock = adapter.client.send as ReturnType<typeof vi.fn>;
		const command = sendMock.mock.calls[0][0] as HeadObjectCommand;
		expect(command.input.Bucket).toBe("bucket-b");
	});
});
