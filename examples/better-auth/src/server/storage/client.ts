"use client";

import { createStorageClient } from "vs3/react";
import type { storage } from "./server";

export const storageClient = createStorageClient<typeof storage.$Infer>({
	apiPath: "/api/storage",
});
