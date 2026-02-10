import { describe, expectTypeOf, it } from "vitest";
import type { StorageError } from "../../../core/error/error";
import type { DownloadFileResult, UploadFileResult } from "../../create-client";

type Client = ReturnType<typeof import("../index")["createStorageClient"]>;

type UploadComposable = Client["useUpload"];
type UploadOptions = Parameters<UploadComposable>[0];
type UploadOnSuccess = NonNullable<NonNullable<UploadOptions>["onSuccess"]>;
type UploadOnError = NonNullable<NonNullable<UploadOptions>["onError"]>;

type DownloadComposable = Client["useDownload"];
type DownloadOptions = Parameters<DownloadComposable>[0];
type DownloadOnSuccess = NonNullable<NonNullable<DownloadOptions>["onSuccess"]>;
type DownloadOnError = NonNullable<NonNullable<DownloadOptions>["onError"]>;

describe("useUpload callback argument types", () => {
	it("types onSuccess argument as UploadFileResult", () => {
		type Arg = Parameters<UploadOnSuccess>[0];
		expectTypeOf<Arg>().toEqualTypeOf<UploadFileResult>();
	});

	it("types onError argument as StorageError", () => {
		type Arg = Parameters<UploadOnError>[0];
		expectTypeOf<Arg>().toEqualTypeOf<StorageError>();
	});
});

describe("useDownload callback argument types", () => {
	it("types onSuccess argument as DownloadFileResult", () => {
		type Arg = Parameters<DownloadOnSuccess>[0];
		expectTypeOf<Arg>().toEqualTypeOf<DownloadFileResult>();
	});

	it("types onError argument as StorageError", () => {
		type Arg = Parameters<DownloadOnError>[0];
		expectTypeOf<Arg>().toEqualTypeOf<StorageError>();
	});
});
