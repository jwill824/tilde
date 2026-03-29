// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'tilde',
			description: 'tilde configures your macOS developer environment from a single config file',
			logo: {
				src: './src/assets/tilde-logo.svg',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/jwill824/tilde' },
			],
			sidebar: [
				{ label: 'Installation', slug: 'installation' },
				{ label: 'Getting Started', slug: 'getting-started' },
				{ label: 'Configuration Reference', slug: 'config-reference' },
			],
		}),
	],
});
