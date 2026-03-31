// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://thingstead.io',
	base: '/tilde/docs/',
	integrations: [
		starlight({
			title: 'tilde',
			description: 'tilde configures your macOS developer environment from a single config file',
			favicon: '/favicon.svg',
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
				{ label: 'Configuration Format', slug: 'config-format' },
			],
			customCss: ['./src/styles/tilde-theme.css'],
		}),
	],
});
