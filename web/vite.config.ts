import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Backend URL - default port 3001 for consistency with Docker
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: BACKEND_URL,
				changeOrigin: true
			},
			'/health': {
				target: BACKEND_URL,
				changeOrigin: true
			}
		}
	},
	// Prevent Vite from clearing the console on startup (useful for Tauri)
	clearScreen: false
});
