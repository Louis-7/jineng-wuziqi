import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: served from https://<user>.github.io/<repo>/
// so assets must be prefixed with /<repo>/ to load correctly in production.
// If you later deploy to a custom domain or a user/organization root site, change `base` to '/'.
const REPO_NAME = 'jineng-wuziqi';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [react()],
});
