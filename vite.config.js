import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const requiredEnv = (key) => {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }

    return env[key]
  }
  const backendBaseUrl = requiredEnv('VITE_BACKEND_BASE_URL')
  const frontendBaseUrl = requiredEnv('VITE_FRONTEND_BASE_URL')
  requiredEnv('VITE_API_BASE_URL')
  const publicBasePath = env.VITE_PUBLIC_BASE_PATH || '/'
  const frontendUrl = new URL(frontendBaseUrl)
  const proxyTargets = backendBaseUrl
    ? {
        '/api': backendBaseUrl,
        '/app-contents-images': backendBaseUrl,
        '/brands-images': backendBaseUrl,
        '/mobile-banners-images': backendBaseUrl,
        '/admin-notifications-images': backendBaseUrl,
        '/testimonials-images': backendBaseUrl,
        '/categories-images': backendBaseUrl,
        '/documents': backendBaseUrl,
        '/service-images': backendBaseUrl,
        '/service-package-sections-images': backendBaseUrl,
        '/service-packages-images': backendBaseUrl,
        '/settings-images': backendBaseUrl,
        '/storage': backendBaseUrl,
      }
    : {}

  return {
    base: publicBasePath,
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: frontendUrl.port ? Number(frontendUrl.port) : 5173,
      strictPort: Boolean(frontendUrl.port),
      proxy: proxyTargets,
    },
  }
})
