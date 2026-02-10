import Link from "next/link";
import type React from "react";
import { SiteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export function DocsFooter({
	className,
	...props
}: React.ComponentProps<"footer">) {
	return (
		<footer
			className={cn("border-zinc-200 border-t py-8", className)}
			data-slot="docs-footer"
			{...props}
		>
			<div className="mx-auto w-full max-w-7xl px-8">
				<div className="flex items-center justify-center gap-4">
					<Link
						className="font-medium text-sm text-zinc-700 hover:text-violet-600"
						href={SiteConfig.paths.home}
					>
						Home
					</Link>
					<span className="text-zinc-500">·</span>
					<Link
						className="font-medium text-sm text-zinc-700 hover:text-violet-600"
						href={SiteConfig.paths.docs}
					>
						Documentation
					</Link>
					<span className="text-zinc-500">·</span>
					<Link
						className="font-medium text-sm text-zinc-700 hover:text-violet-600"
						href={SiteConfig.paths.changelog}
					>
						Changelog
					</Link>
					<span className="text-zinc-500">·</span>
					<Link
						className="font-medium text-sm text-zinc-700 hover:text-violet-600"
						href={SiteConfig.repository.url}
						target="_blank"
					>
						GitHub
					</Link>
				</div>
				<p className="mt-4 text-center text-xs text-zinc-500">
					&copy; {new Date().getFullYear()} {SiteConfig.owner}. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
