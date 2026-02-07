import { HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { createS3Operations } from "./s3-operations";

function createMockClient(overrides: Partial<S3Client> = {}): S3Client {
	return {
		send: vi.fn(),
		...overrides,
	} as unknown as S3Client;
}

const resolveBucket = (bucket?: string): string => bucket ?? "default-bucket";

describe("createS3Operations", () => {
	describe("objectExists", () => {
		it("returns true when HeadObject succeeds", async () => {
			const client = createMockClient({
				send: vi.fn().mockResolvedValue({}),
			});
			const ops = createS3Operations({ client, resolveBucket });

			const result = await ops.objectExists("photos/cat.png");

			expect(result).toBe(true);
			expect(client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
		});

		it("returns false when S3 responds with NotFound", async () => {
			const notFound = Object.assign(new Error("NotFound"), {
				name: "NotFound",
				$metadata: { httpStatusCode: 404 },
			});
			const client = createMockClient({
				send: vi.fn().mockRejectedValue(notFound),
			});
			const ops = createS3Operations({ client, resolveBucket });

			const result = await ops.objectExists("photos/missing.png");

			expect(result).toBe(false);
		});

		it("returns false when S3 responds with 404 metadata only", async () => {
			const error = Object.assign(new Error("Unknown"), {
				name: "UnknownError",
				$metadata: { httpStatusCode: 404 },
			});
			const client = createMockClient({
				send: vi.fn().mockRejectedValue(error),
			});
			const ops = createS3Operations({ client, resolveBucket });

			const result = await ops.objectExists("photos/missing.png");

			expect(result).toBe(false);
		});

		it("throws non-404 errors", async () => {
			const forbidden = Object.assign(new Error("Forbidden"), {
				name: "Forbidden",
				$metadata: { httpStatusCode: 403 },
			});
			const client = createMockClient({
				send: vi.fn().mockRejectedValue(forbidden),
			});
			const ops = createS3Operations({ client, resolveBucket });

			await expect(ops.objectExists("photos/secret.png")).rejects.toThrow(
				"Forbidden",
			);
		});

		it("uses bucket override when provided", async () => {
			const client = createMockClient({
				send: vi.fn().mockResolvedValue({}),
			});
			const ops = createS3Operations({ client, resolveBucket });

			await ops.objectExists("key.txt", { bucket: "other-bucket" });

			const command = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[0][0] as HeadObjectCommand;
			expect(command.input.Bucket).toBe("other-bucket");
			expect(command.input.Key).toBe("key.txt");
		});

		it("uses default bucket from resolveBucket", async () => {
			const client = createMockClient({
				send: vi.fn().mockResolvedValue({}),
			});
			const ops = createS3Operations({ client, resolveBucket });

			await ops.objectExists("key.txt");

			const command = (client.send as ReturnType<typeof vi.fn>).mock
				.calls[0][0] as HeadObjectCommand;
			expect(command.input.Bucket).toBe("default-bucket");
		});
	});
});
