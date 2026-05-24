import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// `base: './'` keeps asset paths relative so the same build works
// at any sub-path (e.g. https://user.github.io/exprome/).
export default defineConfig({
  base: './',
  plugins: [svelte()],
});
