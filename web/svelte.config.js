import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Use static adapter for Tauri builds and rust-embed, auto for development
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;
const isRustEmbed = process.env.RUST_EMBED === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: (isTauri || isRustEmbed)
			? adapterStatic({ 
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false,
				strict: true
			})
			: adapterAuto(),
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components',
			$stores: './src/lib/stores',
			$api: './src/lib/api'
		}
	}
};

export default config;
