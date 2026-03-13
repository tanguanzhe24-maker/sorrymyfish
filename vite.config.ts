import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputFile = path.join(__dirname, 'girlfriend-note.txt')

function wishFileApi() {
  return {
    name: 'wish-file-api',
    configureServer(server: { middlewares: { use: (arg0: (req: { method: string; url: string | string[]; on: (arg0: string, arg1: (chunk: any) => void) => void; }, res: { statusCode: number; setHeader: (arg0: string, arg1: string) => void; end: (arg0: string) => void; }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/wish') {
          next()
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body) as { content?: string }
            const content = parsed.content?.trim() ?? ''

            if (!content) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: '内容不能为空' }))
              return
            }

            let prefix = ''
            try {
              const existing = await readFile(outputFile, 'utf-8')
              const marker = '\n\n--- 最新提交内容 ---\n'
              const markerIndex = existing.indexOf(marker)
              prefix = markerIndex >= 0 ? existing.slice(0, markerIndex) : existing
            } catch {
              prefix = '这是你想让我做到的事：\n'
            }

            const now = new Date().toLocaleString('zh-CN', { hour12: false })
            const finalText = `${prefix}\n\n--- 最新提交内容 ---\n时间: ${now}\n\n${content}\n`
            await writeFile(outputFile, finalText, 'utf-8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '写入失败' }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    wishFileApi(),
  ],
})
