"use client";

import { storageClient } from "@/server/storage/client";

export function DownloadDemo() {
	const { download, state } = storageClient.useDownload();

	return (
		<div>
			<form
				action={async (formData) => {
					await download(formData.get("key") as string);
				}}
				id="download-demo"
			>
				<input className="border" name="key" placeholder="Key" type="text" />
				<button type="submit">Download</button>
			</form>

			<div>
				<pre>{JSON.stringify({ state }, null, 2)}</pre>
			</div>
		</div>
	);
}
