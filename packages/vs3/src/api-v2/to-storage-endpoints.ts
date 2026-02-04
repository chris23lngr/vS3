import type {
	EndpointContext,
	EndpointOptions,
	InputContext,
} from "better-call";
import { runWithEndpointContext } from "../context/endpoint-context";
import type { StorageAPI } from "../types/api";
import type { StorageContext } from "../types/context";
import type { StorageOptions } from "../types/options";
import type { StandardSchemaV1 } from "../types/standard-schema";
import type {
	StorageEndpoint,
	StorageEndpointOptions,
} from "./create-storage-endpoint";

// Helper type to extract metadataSchema with fallback
type ExtractMetadataSchema<O extends StorageOptions> =
	O["metadataSchema"] extends StandardSchemaV1
		? O["metadataSchema"]
		: StandardSchemaV1;

type InternalContext = Partial<
	InputContext<string, any> & EndpointContext<string, any>
> & {
	path: string;
	asResponse?: boolean | undefined;
	context: StorageContext & {
		returned?: unknown | undefined;
		responseHeaders?: Headers | undefined;
	};
};

type UserInputContext = Partial<
	InputContext<string, any> & EndpointContext<string, any>
>;

export function toStorageEndpoints<
	O extends StorageOptions,
	const E extends Record<
		string,
		Omit<
			StorageEndpoint<
				string,
				ExtractMetadataSchema<O>,
				StorageEndpointOptions<ExtractMetadataSchema<O>>,
				any
			>,
			"wrap"
		>
	>,
>(endpoints: E, ctx: StorageContext<O> | Promise<StorageContext<O>>): E {
	const api: Record<
		string,
		((
			// context: EndpointContext<string, any> & InputContext<string, any>,
			context: {test: string},
		) => Promise<any>) & {
			path?: string | undefined;
			options?: EndpointOptions | undefined;
		}
	> = {};

	for (const [key, endpoint] of Object.entries(endpoints)) {
		api[key] = async (context?: UserInputContext) => {
			const storageContext = await ctx;
			const internalContext: InternalContext = {
				...context,
				context: {
					...storageContext,
				},
				path: endpoint.path,
				headers: context?.headers ? new Headers(context?.headers) : undefined,
			};

			return runWithEndpointContext(internalContext, () =>
				(endpoint as any)(internalContext),
			);
		};
		api[key].path = endpoint.path;
		api[key].options = endpoint.options;
	}
	return api as unknown as E;
}
