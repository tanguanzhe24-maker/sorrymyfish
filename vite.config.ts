import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputFile = path.join(__dirname, 'girlfriend-note.txt')

type WishEntry = {
  id: string
  time: string
  content: string
}

const NEW_ENTRY_START = '--- 留言记录开始 ---'
const NEW_ENTRY_END = '--- 留言记录结束 ---'

function parseEntries(content: string): WishEntry[] {
  const entries: WishEntry[] = []

  const newEntryRegex = /--- 留言记录开始 ---\n([\s\S]*?)\n--- 留言记录结束 ---/g
  for (const match of content.matchAll(newEntryRegex)) {
    const block = match[1]
    const idMatch = block.match(/ID:\s*(.+)/)
    const timeMatch = block.match(/时间:\s*(.+)/)
    const contentMatch = block.match(/内容:\n([\s\S]*)$/)
    const id = idMatch?.[1]?.trim() || `entry-${Math.random().toString(36).slice(2, 8)}`
    const time = timeMatch?.[1]?.trim() || '未知时间'
    const body = contentMatch?.[1]?.trim() || ''
    if (body) {
      entries.push({
        id,
        time,
        content: body,
      })
    }
  }

  // Backward compatibility: keep older "--- 最新提交内容 ---" blocks readable in history.
  const legacyRegex = /--- 最新提交内容 ---\n时间:\s*(.+?)\n\n([\s\S]*?)(?=\n\n--- 最新提交内容 ---|\n\n--- 留言记录开始 ---|$)/g
  let legacyIndex = 0
  for (const match of content.matchAll(legacyRegex)) {
    const time = match[1].trim()
    const body = match[2].trim()
    if (!body || body === '（等待填写）') {
      continue
    }
    legacyIndex += 1
    entries.push({
      id: `legacy-${legacyIndex}`,
      time,
      content: body,
    })
  }

  return entries.reverse()
}

function serializeEntries(entries: WishEntry[]): string {
  const header = '这是你想让我做到的事：\n\n（这里会保留所有历史留言）\n'
  if (entries.length === 0) {
    return `${header}\n（暂无留言）\n`
  }

  const chronological = [...entries].reverse()
  const blocks = chronological
    .map((entry) => {
      return `${NEW_ENTRY_START}\nID: ${entry.id}\n时间: ${entry.time}\n内容:\n${entry.content}\n${NEW_ENTRY_END}`
    })
    .join('\n\n')

  return `${header}\n${blocks}\n`
}

async function ensureFileExists() {
  try {
    await readFile(outputFile, 'utf-8')
  } catch {
    const starter = '这是你想让我做到的事：\n\n（这里会保留所有历史留言）\n'
    await writeFile(outputFile, starter, 'utf-8')
  }
}

function wishFileApi() {
  return {
    name: 'wish-file-api',
    configureServer(server: { middlewares: { use: (arg0: (req: { method: string; url: string | string[]; on: (arg0: string, arg1: (chunk: any) => void) => void; }, res: { statusCode: number; setHeader: (arg0: string, arg1: string) => void; end: (arg0: string) => void; }, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = typeof req.url === 'string' ? new URL(req.url, 'http://localhost') : null
        if (requestUrl?.pathname !== '/api/wish') {
          next()
          return
        }

        if (req.method === 'GET') {
          void (async () => {
            try {
              await ensureFileExists()
              const existing = await readFile(outputFile, 'utf-8')
              const entries = parseEntries(existing)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ entries }))
            } catch {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: '读取失败' }))
            }
          })()
          return
        }

        if (req.method !== 'POST') {
          if (req.method === 'DELETE') {
            void (async () => {
              try {
                await ensureFileExists()
                const existing = await readFile(outputFile, 'utf-8')
                const entries = parseEntries(existing)
                const id = requestUrl?.searchParams.get('id') ?? null

                if (!id) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: '缺少 id' }))
                  return
                }

                const nextEntries = entries.filter((entry) => entry.id !== id)
                await writeFile(outputFile, serializeEntries(nextEntries), 'utf-8')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: '删除失败' }))
              }
            })()
            return
          }

          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body) as { content?: string; sourceId?: string | null }
            const content = parsed.content?.trim() ?? ''

            if (!content) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: '内容不能为空' }))
              return
            }

            await ensureFileExists()
            const existing = await readFile(outputFile, 'utf-8')
            const entries = parseEntries(existing)

            const now = new Date().toLocaleString('zh-CN', { hour12: false })
            const sourceId = parsed.sourceId ? String(parsed.sourceId) : null
            let id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

            if (sourceId) {
              const index = entries.findIndex((entry) => entry.id === sourceId)
              if (index >= 0) {
                id = sourceId
                entries[index] = {
                  id,
                  time: now,
                  content,
                }
              } else {
                entries.unshift({ id, time: now, content })
              }
            } else {
              entries.unshift({ id, time: now, content })
            }

            await writeFile(outputFile, serializeEntries(entries), 'utf-8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, id }))
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
