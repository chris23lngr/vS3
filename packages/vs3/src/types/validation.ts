import type { FileInfo } from "./file";

/**
 * Result returned by a content validator.
 * If the validation passes, return `{ valid: true }`.
 * If the validation fails, return `{ valid: false, reason: "..." }`.
 */
export type ContentValidationResult =
	| { valid: true }
	| { valid: false; reason: string };

/**
 * Context provided to content validators.
 * Contains information about the file being validated and any metadata.
 */
export type ContentValidationContext<TMetadata = unknown> = {
	/**
	 * Information about the file being uploaded.
	 */
	fileInfo: FileInfo;

	/**
	 * Parsed and validated metadata associated with the upload.
	 */
	metadata: TMetadata;
};

/**
 * A content validator function that validates file uploads.
 * Can be synchronous or asynchronous.
 *
 * @example
 * ```typescript
 * // Synchronous validator
 * const maxSizeValidator: ContentValidator = (ctx) => {
 *   if (ctx.fileInfo.size > 1024 * 1024) {
 *     return { valid: false, reason: "File too large" };
 *   }
 *   return { valid: true };
 * };
 *
 * // Async validator (e.g., database check)
 * const quotaValidator: ContentValidator = async (ctx) => {
 *   const usage = await getUserStorageUsage(ctx.metadata.userId);
 *   if (usage + ctx.fileInfo.size > MAX_QUOTA) {
 *     return { valid: false, reason: "Storage quota exceeded" };
 *   }
 *   return { valid: true };
 * };
 * ```
 */
export type ContentValidator<TMetadata = unknown> = (
	context: ContentValidationContext<TMetadata>,
) => ContentValidationResult | Promise<ContentValidationResult>;

/**
 * Configuration for a named content validator.
 * Used when you want to provide a name for error reporting.
 */
export type NamedContentValidator<TMetadata = unknown> = {
	/**
	 * Name of the validator for error reporting.
	 */
	name: string;

	/**
	 * The validator function.
	 */
	validate: ContentValidator<TMetadata>;
};

/**
 * A content validator can be either a function or a named validator object.
 */
export type ContentValidatorInput<TMetadata = unknown> =
	| ContentValidator<TMetadata>
	| NamedContentValidator<TMetadata>;

/**
 * Result from running all content validators.
 */
export type ContentValidationRunResult = {
	/**
	 * Whether all validators passed.
	 */
	valid: boolean;

	/**
	 * If validation failed, contains the failure details.
	 */
	failure?: {
		/**
		 * Name of the validator that failed (if provided).
		 */
		validatorName?: string;

		/**
		 * Index of the validator that failed in the validators array.
		 */
		validatorIndex: number;

		/**
		 * Reason for the validation failure.
		 */
		reason: string;
	};
};

/**
 * Options for running content validators.
 */
export type RunContentValidatorsOptions<TMetadata = unknown> = {
	/**
	 * Array of validators to run.
	 */
	validators: ContentValidatorInput<TMetadata>[];

	/**
	 * Context to pass to each validator.
	 */
	context: ContentValidationContext<TMetadata>;

	/**
	 * Optional timeout in milliseconds for each validator.
	 * If a validator takes longer than this, it will be considered failed.
	 * Default: no timeout.
	 */
	timeoutMs?: number;
};
