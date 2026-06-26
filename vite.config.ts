import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SMD Box ships as a single self-contained bundle consumed via a plain
// <script>/<link> pair (currently from jsDelivr). The build therefore targets
// library/IIFE output with stable, hash-free names: build/app.js + build/app.css.
//
// Output goes to build/ (gitignored), NOT dist/. The committed dist/ is the
// frozen backward-compatibility bundle served via jsDelivr @latest and is never
// overwritten by a local `npm run build`; CI publishes Pages from build/.
//
// The IIFE `name` below only parks the module namespace on a throwaway global —
// the real public contract (`window.smdbox`) is assigned explicitly in main.tsx,
// so we keep this name deliberately internal to avoid clobbering it.
export default defineConfig({
  plugins: [react()],
  // Some bundled deps branch on process.env.NODE_ENV; provide it for the IIFE build.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.tsx',
      name: '__smdboxBundle',
      formats: ['iife'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'app.[ext]',
        entryFileNames: 'app.js',
      },
    },
  },
});
