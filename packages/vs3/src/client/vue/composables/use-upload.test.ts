import { describe, expect, it, vi } from "vitest";
import { createBaseClient } from "../../create-client";
import { createUseUpload } from "./use-upload";

const file = new File(["hello"], "file.txt", { type: "text/plain" });

describe("createUseUpload", () => {
	it("updates state and calls callbacks on success", async () => {
		const client = createBaseClient({});
		const result = {
			key: "uploads/file.txt",
			presignedUrl: "https://example.com/presigned",
			uploadUrl: "https://example.com/upload",
			status: 200,
			statusText: "OK",
		};
		client.uploadFile = vi.fn(async (_file, _metadata, options) => {
			options?.onProgress?.(25);
			return result;
		});

		const onProgress = vi.fn();
		const onSuccess = vi.fn();
		const onError = vi.fn();
		const useUpload = createUseUpload(client);
		const { state, upload, reset } = useUpload({
			onProgress,
			onSuccess,
			onError,
		});

		await upload(file, {});

		expect(state.value.status).toBe("success");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.progress).toBe(25);
		expect(state.value.data).toEqual(result);
		expect(state.value.error).toBeNull();
		expect(onProgress).toHaveBeenCalledWith(25);
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
		client.uploadFile = vi.fn(async () => {
			throw new Error("boom");
		});

		const onError = vi.fn();
		const useUpload = createUseUpload(client);
		const { state, upload } = useUpload({ onError });

		await expect(upload(file, {})).resolves.toBeUndefined();

		expect(state.value.status).toBe("error");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.data).toBeNull();
		expect(state.value.error).not.toBeNull();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("throws when throwOnError is enabled in client options", async () => {
		const client = createBaseClient({ throwOnError: true });
		client.uploadFile = vi.fn(async () => {
			throw new Error("boom");
		});

		const useUpload = createUseUpload(client);
		const { state, upload } = useUpload();

		await expect(upload(file, {})).rejects.toThrow("Upload failed unexpectedly");
		expect(state.value.status).toBe("error");
	});
});
