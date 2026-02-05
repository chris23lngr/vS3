import { describe, expect, it } from "vitest";
import { formatFileSize } from "./format-file-size";

describe("formatFileSize", () => {
	it("formats 0 bytes", () => {
		expect(formatFileSize(0)).toBe("0 bytes");
	});

	it("formats 1 byte", () => {
		expect(formatFileSize(1)).toBe("1 byte");
	});

	it("formats bytes less than 1 KB", () => {
		expect(formatFileSize(500)).toBe("500 bytes");
		expect(formatFileSize(1023)).toBe("1023 bytes");
	});

	it("formats kilobytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(1536)).toBe("1.5 KB");
		expect(formatFileSize(2048)).toBe("2.0 KB");
	});

	it("formats megabytes", () => {
		expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
		expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
		expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});

	it("formats gigabytes", () => {
		expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
		expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
	});

	it("formats terabytes", () => {
		expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB");
		expect(formatFileSize(5.2 * 1024 * 1024 * 1024 * 1024)).toBe("5.2 TB");
	});

	it("clamps very large sizes to TB", () => {
		const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
		expect(formatFileSize(petabyte)).toBe("1024.0 TB");

		const exabyte = petabyte * 1024;
		expect(formatFileSize(exabyte)).toContain("TB");
		expect(formatFileSize(exabyte)).not.toContain("undefined");
	});

	it("handles fractional values correctly", () => {
		expect(formatFileSize(1536.5)).toBe("1.5 KB");
		expect(formatFileSize(1024 * 1024 * 1.234)).toBe("1.2 MB");
	});
});
