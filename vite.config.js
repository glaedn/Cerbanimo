import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const alias = {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }

  if (mode !== 'production' && env.VITE_CERBANIMO_DEV_AUTH_BYPASS === 'true') {
    alias['@auth0/auth0-react'] = path.resolve(__dirname, './src/auth/devAuth0ReactShim.jsx')
  }

  return {
    plugins: [react()],
    resolve: {
      alias,
    },
    server: {
      port: 3000,
    },
  }
})
