import { defineConfig } from 'vite'

// MV3 não é uma SPA servida por HTTP: cada entrada vira um arquivo fixo que o
// manifest referencia pelo nome — por isso sem hash em `entryFileNames`.
export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        'content-script': 'src/content-script.ts',
        popup: 'popup.html',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})
