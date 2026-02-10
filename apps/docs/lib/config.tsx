import { GithubIcon } from "@/components/icons/github";

export const SiteConfig = {
	owner: "chris23lngr",
	name: "vs3",
	url: "https://vs3.dev",
	repository: {
		owner: "chris23lngr",
		name: "vs3",
		url: "https://github.com/chris23lngr/vs3",
		defaultBranch: "master",
	},
	nav: {
		items: [
			{
				label: "Documentation",
				href: "/docs",
			},
			{
				label: "Changelog",
				href:
					"https://github.com/chris23lngr/vS3/blob/master/packages/vs3/CHANGELOG.md",
			},
			{
				label: "GitHub",
				href: "https://github.com/chris23lngr/vs3",
				icon: <GithubIcon />,
			},
		],
	},
	paths: {
		home: "/",
		docs: "/docs",
		changelog:
			"https://github.com/chris23lngr/vS3/blob/master/packages/vs3/CHANGELOG.md",
	},
};
