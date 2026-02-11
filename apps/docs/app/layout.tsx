import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { TriangleAlertIcon } from "lucide-react";
import { Inter } from "next/font/google";
import { Banner } from "@/components/banner";

const inter = Inter({
	subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html className={inter.className} lang="en" suppressHydrationWarning>
			<Banner>
				<TriangleAlertIcon className="size-4 fill-yellow-900 text-yellow-500" />
				We are currently working on a new version of the documentation.
			</Banner>
			<body className="flex min-h-screen flex-col">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
