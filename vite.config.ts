import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import pkg from './package.json'

// Serves api/r2.ts logic during `npm run dev` so uploads work without `vercel dev`.
// Credentials are read from non-VITE_ variables in .env.local and never bundled.
function r2DevApi(env: Record<string, string>): Plugin {
  return {
    name: 'r2-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/r2', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return send(405, { error: 'Method not allowed' })
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          let body: unknown = {}
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { body = {} }
          const { handleR2Request } = await server.ssrLoadModule('/api/_r2core.ts')
          const result = await handleR2Request(body, req.headers.authorization, env)
          send(result.status, result.body)
        } catch (error) {
          console.error('R2 dev handler error:', error)
          send(500, { error: 'R2 request failed' })
        }
      })
    },
  }
}

// Dev only: the intro exporter (promo/index.html) saves rendered videos to promo/out
function promoSave(): Plugin {
  return {
    name: 'promo-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__promo/save', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        const { mkdirSync, writeFileSync } = await import('node:fs')
        const { basename, join } = await import('node:path')
        const name = basename(new URL(req.url || '', 'http://x').searchParams.get('name') || 'intro.mp4')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const dir = join(process.cwd(), 'promo', 'out')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, name), Buffer.concat(chunks))
        res.end('ok')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), r2DevApi(loadEnv(mode, process.cwd(), '')), promoSave()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  }
}))
