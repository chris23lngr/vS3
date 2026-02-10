import { describe, expect, it } from "vitest";
import { resolveThrowOnError } from "./resolve-throw-on-error";

describe("resolveThrowOnError", () => {
	it("prefers option value when set", () => {
		expect(resolveThrowOnError(true, false)).toBe(true);
		expect(resolveThrowOnError(false, true)).toBe(false);
	});

	it("falls back to client value when option is undefined", () => {
		expect(resolveThrowOnError(undefined, true)).toBe(true);
		expect(resolveThrowOnError(undefined, false)).toBe(false);
		expect(resolveThrowOnError(undefined, undefined)).toBe(false);
	});
});
