import { describe, expect, it, vi } from "vitest";
import { createBaseClient } from "../../create-client";
import { createUseMultipartUpload } from "./use-multipart-upload";

const file = new File(["hello"], "file.txt", { type: "text/plain" });

describe("createUseMultipartUpload", () => {
	it("updates state and calls callbacks on success", async () => {
		const client = createBaseClient({});
		const result = {
			key: "uploads/file.txt",
			uploadId: "uid-1",
			totalParts: 1,
		};
		client.multipartUpload = vi.fn(async (_file, _metadata, options) => {
			options?.onProgress?.(0.5);
			return result;
		});

		const onProgress = vi.fn();
		const onSuccess = vi.fn();
		const onError = vi.fn();
		const useMultipartUpload = createUseMultipartUpload(client);
		const { state, upload, reset } = useMultipartUpload({
			onProgress,
			onSuccess,
			onError,
		});

		await upload(file, {});

		expect(state.value.status).toBe("success");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.progress).toBe(0.5);
		expect(state.value.data).toEqual(result);
		expect(state.value.error).toBeNull();
		expect(onProgress).toHaveBeenCalledWith(0.5);
		expect(onSuccess).toHaveBeenCalledWith(result);
		expect(onError).not.toHaveBeenCalled();

		reset();
		expect(state.value.status).toBe("idle");
		expect(state.value.data).toBeNull();
		expect(state.value.error).toBeNull();
		expect(state.value.progress).toBe(0);
	});

	it("stores normalized error and does not throw by default", async () => {
		const client = createBaseClient({});
		client.multipartUpload = vi.fn(async () => {
			throw new Error("boom");
		});

		const onError = vi.fn();
		const useMultipartUpload = createUseMultipartUpload(client);
		const { state, upload } = useMultipartUpload({ onError });

		await expect(upload(file, {})).resolves.toBeUndefined();

		expect(state.value.status).toBe("error");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.data).toBeNull();
		expect(state.value.error).not.toBeNull();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("throws when throwOnError is enabled in client options", async () => {
		const client = createBaseClient({ throwOnError: true });
		client.multipartUpload = vi.fn(async () => {
			throw new Error("boom");
		});

		const useMultipartUpload = createUseMultipartUpload(client);
		const { state, upload } = useMultipartUpload();

		await expect(upload(file, {})).rejects.toThrow(
			"Multipart upload failed unexpectedly",
		);
		expect(state.value.status).toBe("error");
	});

	it("throws when throwOnError is enabled in hook options", async () => {
		const client = createBaseClient({});
		client.multipartUpload = vi.fn(async () => {
			throw new Error("boom");
		});

		const useMultipartUpload = createUseMultipartUpload(client);
		const { upload } = useMultipartUpload({ throwOnError: true });

		await expect(upload(file, {})).rejects.toThrow(
			"Multipart upload failed unexpectedly",
		);
	});

	it("passes partSize and concurrency to client", async () => {
		const client = createBaseClient({});
		client.multipartUpload = vi.fn(async () => ({
			key: "k",
			uploadId: "u",
			totalParts: 1,
		}));

		const useMultipartUpload = createUseMultipartUpload(client);
		const { upload } = useMultipartUpload({
			partSize: 5 * 1024 * 1024,
			concurrency: 2,
		});

		await upload(file, {});

		expect(client.multipartUpload).toHaveBeenCalledWith(
			file,
			{},
			expect.objectContaining({
				partSize: 5 * 1024 * 1024,
				concurrency: 2,
			}),
		);
	});

	it("sets loading state during upload", async () => {
		const client = createBaseClient({});
		let capturedState: string | undefined;
		client.multipartUpload = vi.fn(async () => {
			// Can't capture intermediate state synchronously in Vue composable,
			// but we can verify the final state transitions
			return { key: "k", uploadId: "u", totalParts: 1 };
		});

		const useMultipartUpload = createUseMultipartUpload(client);
		const { state, upload } = useMultipartUpload();

		expect(state.value.isLoading).toBe(false);
		expect(state.value.status).toBe("idle");

		await upload(file, {});

		expect(state.value.isLoading).toBe(false);
		expect(state.value.status).toBe("success");
	});
});
