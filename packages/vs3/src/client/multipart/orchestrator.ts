import type { createFetch } from "@better-fetch/fetch";
import type { MultipartUploadPart } from "../../internal/s3-operations.types";
import type { S3Encryption } from "../../types/encryption";
import { type XhrUploadPartResult, xhrUploadPart } from "../xhr/upload-part";

const DEFAULT_PART_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_CONCURRENCY = 4;
const PRESIGN_BATCH_SIZE = 10;

export type MultipartUploadOptions = {
	partSize?: number;
	concurrency?: number;
	onProgress?: (progress: number) => void;
	signal?: AbortSignal;
	retry?: undefined | true | number;
	encryption?: S3Encryption;
};

export type MultipartUploadResult = {
	key: string;
	uploadId: string;
	totalParts: number;
};

type PresignedPart = { partNumber: number; presignedUrl: string };

type OrchestratorParams = {
	$fetch: ReturnType<typeof createFetch>;
	file: File;
	metadata: unknown;
	options: MultipartUploadOptions;
};

function splitFileIntoParts(file: File, partSize: number): Blob[] {
	const parts: Blob[] = [];
	let offset = 0;
	while (offset < file.size) {
		parts.push(file.slice(offset, offset + partSize));
		offset += partSize;
	}
	return parts;
}

async function presignPartsBatch(
	$fetch: ReturnType<typeof createFetch>,
	key: string,
	uploadId: string,
	partNumbers: number[],
): Promise<PresignedPart[]> {
	const response = await $fetch("/multipart/presign-parts", {
		body: {
			key,
			uploadId,
			parts: partNumbers.map((partNumber) => ({ partNumber })),
		},
	});

	if (response.error) {
		throw new Error(response.error.message ?? "Failed to presign upload parts");
	}

	return (response.data as { parts: PresignedPart[] }).parts;
}

type UploadPartsParams = {
	presignedParts: PresignedPart[];
	blobs: Blob[];
	concurrency: number;
	signal?: AbortSignal;
	retry?: undefined | true | number;
	onPartProgress: (partNumber: number, loaded: number) => void;
};

async function uploadPartsWithConcurrency(
	params: UploadPartsParams,
): Promise<XhrUploadPartResult[]> {
	const { presignedParts, blobs, concurrency, signal, retry, onPartProgress } =
		params;
	const results: XhrUploadPartResult[] = [];
	let index = 0;

	async function processNext(): Promise<void> {
		while (index < presignedParts.length) {
			const current = index++;
			const part = presignedParts[current];
			const blob = blobs[part.partNumber - 1];

			const result = await xhrUploadPart(
				{
					presignedUrl: part.presignedUrl,
					partNumber: part.partNumber,
					body: blob,
					signal,
					onProgress: (loaded) => onPartProgress(part.partNumber, loaded),
				},
				{ retry },
			);

			results.push(result);
		}
	}

	const workers = Array.from(
		{ length: Math.min(concurrency, presignedParts.length) },
		() => processNext(),
	);

	await Promise.all(workers);
	return results;
}

async function abortUpload(
	$fetch: ReturnType<typeof createFetch>,
	key: string,
	uploadId: string,
): Promise<void> {
	try {
		await $fetch("/multipart/abort", { body: { key, uploadId } });
	} catch {
		// Best-effort abort — S3 lifecycle policies handle cleanup
	}
}

export async function executeMultipartUpload(
	params: OrchestratorParams,
): Promise<MultipartUploadResult> {
	const { $fetch, file, metadata, options } = params;
	const partSize = options.partSize ?? DEFAULT_PART_SIZE;
	const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

	const body = options.encryption
		? {
				fileInfo: { name: file.name, size: file.size, contentType: file.type },
				metadata,
				encryption: options.encryption,
			}
		: {
				fileInfo: { name: file.name, size: file.size, contentType: file.type },
				metadata,
			};

	const createResponse = await $fetch("/multipart/create", { body });
	if (createResponse.error) {
		throw new Error(
			createResponse.error.message ?? "Failed to create multipart upload",
		);
	}

	const { uploadId, key } = createResponse.data as {
		uploadId: string;
		key: string;
	};

	const blobs = splitFileIntoParts(file, partSize);
	const totalParts = blobs.length;
	const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

	const partProgress = new Map<number, number>();
	const totalSize = file.size;

	function reportProgress(): void {
		if (!options.onProgress) return;
		let loaded = 0;
		for (const bytes of partProgress.values()) {
			loaded += bytes;
		}
		options.onProgress(Math.min(loaded / totalSize, 1));
	}

	try {
		// Presign in batches
		const allPresignedParts: PresignedPart[] = [];
		for (let i = 0; i < allPartNumbers.length; i += PRESIGN_BATCH_SIZE) {
			const batch = allPartNumbers.slice(i, i + PRESIGN_BATCH_SIZE);
			const presigned = await presignPartsBatch($fetch, key, uploadId, batch);
			allPresignedParts.push(...presigned);
		}

		// Upload with concurrency
		const completedParts = await uploadPartsWithConcurrency({
			presignedParts: allPresignedParts,
			blobs,
			concurrency,
			signal: options.signal,
			retry: options.retry,
			onPartProgress: (partNumber, loaded) => {
				partProgress.set(partNumber, loaded);
				reportProgress();
			},
		});

		// Complete
		const parts: MultipartUploadPart[] = completedParts
			.map((p) => ({ partNumber: p.partNumber, eTag: p.eTag }))
			.sort((a, b) => a.partNumber - b.partNumber);

		const completeResponse = await $fetch("/multipart/complete", {
			body: { key, uploadId, parts },
		});

		if (completeResponse.error) {
			throw new Error(
				completeResponse.error.message ?? "Failed to complete multipart upload",
			);
		}

		return { key, uploadId, totalParts };
	} catch (error) {
		await abortUpload($fetch, key, uploadId);
		throw error;
	}
}
