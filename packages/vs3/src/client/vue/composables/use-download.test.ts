import { describe, expect, it, vi } from "vitest";
import { createBaseClient } from "../../create-client";
import { createUseDownload } from "./use-download";

describe("createUseDownload", () => {
	it("updates state and calls callbacks on success", async () => {
		const client = createBaseClient({});
		const result = {
			presignedUrl: "https://example.com/download",
			downloadHeaders: { authorization: "token" },
		};
		client.downloadFile = vi.fn(async (_key, options) => {
			options?.onSuccess?.(result);
			return result;
		});

		const onSuccess = vi.fn();
		const onError = vi.fn();
		const useDownload = createUseDownload(client);
		const { state, download, reset } = useDownload({ onSuccess, onError });

		const downloadResult = await download("uploads/file.txt");

		expect(downloadResult).toEqual(result);
		expect(state.value.status).toBe("success");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.data).toEqual(result);
		expect(state.value.error).toBeNull();
		expect(onSuccess).toHaveBeenCalledWith(result);
		expect(onError).not.toHaveBeenCalled();

		reset();
		expect(state.value.status).toBe("idle");
		expect(state.value.data).toBeNull();
		expect(state.value.error).toBeNull();
	});

	it("stores normalized error and returns undefined by default", async () => {
		const client = createBaseClient({});
		client.downloadFile = vi.fn(async () => {
			throw new Error("boom");
		});

		const onError = vi.fn();
		const useDownload = createUseDownload(client);
		const { state, download } = useDownload({ onError });

		await expect(download("uploads/file.txt")).resolves.toBeUndefined();

		expect(state.value.status).toBe("error");
		expect(state.value.isLoading).toBe(false);
		expect(state.value.data).toBeNull();
		expect(state.value.error).not.toBeNull();
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it("throws when throwOnError is enabled in options", async () => {
		const client = createBaseClient({});
		client.downloadFile = vi.fn(async () => {
			throw new Error("boom");
		});

		const useDownload = createUseDownload(client);
		const { state, download } = useDownload({ throwOnError: true });

		await expect(download("uploads/file.txt")).rejects.toThrow(
			"Download failed unexpectedly",
		);
		expect(state.value.status).toBe("error");
	});
});
