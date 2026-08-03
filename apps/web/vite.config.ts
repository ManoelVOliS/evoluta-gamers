/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    // @evoluta-gamers/shared é workspace (symlink), então o Vite não o
    // pré-empacota por padrão e serve o dist CJS bruto via /@fs/. O
    // `export * from './domain'` compilado vira um loop de atribuição
    // (`__exportStar`), que a análise estática de ESM do navegador não
    // consegue enxergar como exports nomeados — "does not provide an export
    // named X". Forçar o pré-bundle faz o esbuild resolver isso executando o
    // CJS de verdade, em vez de só analisar o texto.
    include: ['@evoluta-gamers/shared'],
  },
  server: {
    // 5173 é do eVOLUTA Hub. Porta própria pra rodar os dois lado a lado.
    port: 5273,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  test: {
    silent: 'passed-only',
    unstubEnvs: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
      exclude: [
        'src/components/ui/**',
        'src/assets/**',
        'src/tanstack-table.d.ts',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/routes/**',
      ],
    },
  },
})
