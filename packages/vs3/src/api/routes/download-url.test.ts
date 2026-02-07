import { describe, expect, it, vi } from "vitest";
import z from "zod";
import { StorageErrorCode } from "../../core/error/codes";
import { StorageServerError } from "../../core/error/error";
import type { S3Operations } from "../../internal/s3-operations.types";
import type { Adapter } from "../../types/adapter";
import type { StorageContext } from "../../types/context";
import type { StorageOptions } from "../../types/options";
import { createDownloadUrlRoute } from "./download-url";

const createMockAdapter = (): Adapter => ({ client: {} }) as unknown as Adapter;

const createMockOperations = (
	overrides?: Partial<S3Operations>,
): S3Operations => ({
	generatePresignedUploadUrl: vi.fn(),
	generatePresignedDownloadUrl: vi
		.fn()
		.mockResolvedValue("https://example.com/download"),
	objectExists: vi.fn().mockResolvedValue(true),
	deleteObject: vi.fn(),
	...overrides,
});

const createContextOptions = (
	overrides: Partial<StorageOptions> = {},
): { options: StorageOptions; operations: S3Operations } => {
	const operations = createMockOperations();
	return {
		options: {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
			...overrides,
		},
		operations,
	};
};

const callEndpoint = <T extends (input?: any) => any>(
	endpoint: T,
	input: unknown,
) => endpoint(input as Parameters<T>[0]);

describe("download-url route", () => {
	it("returns a presigned URL for a valid key", async () => {
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions();

		const result = await callEndpoint(endpoint, {
			body: { key: "uploads/photo.png" },
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(result).toEqual({
			presignedUrl: "https://example.com/download",
		});
	});

	it("passes expiresIn and encryption to operations", async () => {
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions();

		await callEndpoint(endpoint, {
			body: {
				key: "uploads/photo.png",
				expiresIn: 300,
				encryption: { type: "SSE-S3" },
			},
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(operations.generatePresignedDownloadUrl).toHaveBeenCalledWith(
			"uploads/photo.png",
			expect.objectContaining({
				expiresIn: 300,
				encryption: { type: "SSE-S3" },
			}),
		);
	});

	it("returns downloadHeaders when operations provides them", async () => {
		const endpoint = createDownloadUrlRoute();
		const operations = createMockOperations({
			generatePresignedDownloadUrl: vi.fn().mockResolvedValue({
				url: "https://example.com/download",
				headers: {
					"x-amz-server-side-encryption": "AES256",
				},
			}),
		});
		const options: StorageOptions = {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
		};

		const result = await callEndpoint(endpoint, {
			body: { key: "uploads/photo.png" },
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(result).toMatchObject({
			presignedUrl: "https://example.com/download",
			downloadHeaders: {
				"x-amz-server-side-encryption": "AES256",
			},
		});
	});

	it("throws INTERNAL_SERVER_ERROR when context is missing", async () => {
		const endpoint = createDownloadUrlRoute();

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/photo.png" },
				context: {},
			}),
		).rejects.toMatchObject({
			code: StorageErrorCode.INTERNAL_SERVER_ERROR,
			message: "Storage context is not available.",
		});
	});

	it("throws FORBIDDEN when beforeDownload hook rejects", async () => {
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions({
			hooks: {
				beforeDownload: vi
					.fn()
					.mockResolvedValue({ success: false, reason: "Not allowed" }),
			},
		});

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/private.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toMatchObject({
			code: StorageErrorCode.FORBIDDEN,
			message: "Not allowed",
		});
	});

	it("calls afterDownload hook after success", async () => {
		const afterDownload = vi.fn().mockResolvedValue(undefined);
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions({
			hooks: { afterDownload },
		});

		await callEndpoint(endpoint, {
			body: { key: "uploads/photo.png" },
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(afterDownload).toHaveBeenCalledWith("uploads/photo.png");
	});

	it("works without any hooks configured", async () => {
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions();

		const result = await callEndpoint(endpoint, {
			body: { key: "uploads/photo.png" },
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(result).toEqual({
			presignedUrl: "https://example.com/download",
		});
	});

	it("rejects keys with path traversal", async () => {
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions();

		await expect(
			callEndpoint(endpoint, {
				body: { key: "../../../etc/passwd" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toMatchObject({
			code: StorageErrorCode.INVALID_FILE_INFO,
			message: "Invalid object key.",
		});
	});

	it("propagates afterDownload hook errors", async () => {
		const afterDownload = vi.fn().mockRejectedValue(new Error("hook failed"));
		const endpoint = createDownloadUrlRoute();
		const { options, operations } = createContextOptions({
			hooks: { afterDownload },
		});

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/photo.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toThrow("hook failed");
	});

	it("bubbles operations errors", async () => {
		const endpoint = createDownloadUrlRoute();
		const operations = createMockOperations({
			generatePresignedDownloadUrl: vi.fn(() => {
				throw new StorageServerError({
					code: StorageErrorCode.INTERNAL_SERVER_ERROR,
					message: "Adapter error",
					details: "fail",
				});
			}),
		});
		const options: StorageOptions = {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
		};

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/photo.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toMatchObject({
			code: StorageErrorCode.INTERNAL_SERVER_ERROR,
			message: "Adapter error",
		});
	});

	it("throws NOT_FOUND when object does not exist", async () => {
		const endpoint = createDownloadUrlRoute();
		const operations = createMockOperations({
			objectExists: vi.fn().mockResolvedValue(false),
		});
		const options: StorageOptions = {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
		};

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/missing.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toMatchObject({
			code: StorageErrorCode.NOT_FOUND,
			message: "Object not found.",
		});
	});

	it("does not call generatePresignedDownloadUrl when object is missing", async () => {
		const endpoint = createDownloadUrlRoute();
		const operations = createMockOperations({
			objectExists: vi.fn().mockResolvedValue(false),
		});
		const options: StorageOptions = {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
		};

		try {
			await callEndpoint(endpoint, {
				body: { key: "uploads/missing.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			});
		} catch {
			// expected
		}

		expect(operations.generatePresignedDownloadUrl).not.toHaveBeenCalled();
	});

	it("propagates objectExists operations errors", async () => {
		const endpoint = createDownloadUrlRoute();
		const operations = createMockOperations({
			objectExists: vi.fn().mockRejectedValue(new Error("S3 service error")),
		});
		const options: StorageOptions = {
			bucket: "test-bucket",
			adapter: createMockAdapter(),
		};

		await expect(
			callEndpoint(endpoint, {
				body: { key: "uploads/photo.png" },
				context: {
					$options: options,
					$operations: operations,
				} satisfies Omit<StorageContext, "$middleware">,
			}),
		).rejects.toThrow("S3 service error");
	});

	it("works with metadata schema provided but not required", async () => {
		const metadataSchema = z.object({ userId: z.string() });
		const endpoint = createDownloadUrlRoute(metadataSchema);
		const { options, operations } = createContextOptions({ metadataSchema });

		const result = await callEndpoint(endpoint, {
			body: { key: "uploads/photo.png" },
			context: {
				$options: options,
				$operations: operations,
			} satisfies Omit<StorageContext, "$middleware">,
		});

		expect(result).toEqual({
			presignedUrl: "https://example.com/download",
		});
	});
});
