export function resolveThrowOnError(
	optionThrowOnError: boolean | undefined,
	clientThrowOnError: boolean | undefined,
): boolean {
	if (optionThrowOnError !== undefined) {
		return optionThrowOnError;
	}

	return clientThrowOnError === true;
}
