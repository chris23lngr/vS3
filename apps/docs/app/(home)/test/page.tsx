export default function TestPage() {
	return (
		<main className="py-20">
			<section className="relative min-h-svh overflow-hidden py-20" id="hero">
				<div className="mx-auto w-full max-w-7xl px-8">
					<h1 className="max-w-4xl font-semibold text-4xl text-zinc-800 leading-[1.3]">
						Test
					</h1>
				</div>
				<div className="mx-auto mt-12 flex w-full max-w-7xl items-center justify-start gap-12 px-8">
					<button
						className="hidden rounded-sm bg-background px-3 py-1 font-medium text-sm text-zinc-800 shadow-sm ring-1 ring-zinc-200/70"
						type="button"
					>
						<span>Hello world</span>
					</button>
					<button
						className="inset-shadow-2xs inset-shadow-white/20 flex h-7 cursor-pointer items-center justify-center rounded-sm bg-linear-to-b from-violet-500 to-violet-600 px-3 py-1 font-medium text-sm text-white shadow-xs ring-1 ring-violet-600 transition-all hover:opacity-90"
						type="button"
					>
						<span>Hello world</span>
					</button>
					<button
						className="inset-shadow-zinc-100 flex h-7 cursor-pointer items-center justify-center rounded-sm bg-background px-3 py-1 font-medium text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-700/10 transition-all hover:opacity-90"
						type="button"
					>
						<span>Hello world</span>
					</button>
				</div>
			</section>
		</main>
	);
}
