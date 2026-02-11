import { cn } from "@/lib/utils";

export function Banner({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex w-full items-center justify-center gap-2 bg-zinc-800 px-4 py-2 text-center font-medium text-sm text-white",
				className,
			)}
			{...props}
		/>
	);
}
