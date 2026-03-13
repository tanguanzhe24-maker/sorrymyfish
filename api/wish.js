import { kv } from '@vercel/kv';

const STORE_KEY = 'apology:wish:entries';

function nowTime() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

async function readEntries() {
  const data = await kv.get(STORE_KEY);
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((item) => item && typeof item.id === 'string' && typeof item.time === 'string' && typeof item.content === 'string');
}

async function writeEntries(entries) {
  await kv.set(STORE_KEY, entries);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const entries = await readEntries();
      res.status(200).json({ entries });
      return;
    } catch {
      res.status(500).json({ error: '读取失败' });
      return;
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const content = typeof body?.content === 'string' ? body.content.trim() : '';
      const sourceId = typeof body?.sourceId === 'string' && body.sourceId.trim() ? body.sourceId.trim() : null;

      if (!content) {
        res.status(400).json({ error: '内容不能为空' });
        return;
      }

      const entries = await readEntries();
      const time = nowTime();

      if (sourceId) {
        const index = entries.findIndex((entry) => entry.id === sourceId);
        if (index >= 0) {
          entries[index] = {
            ...entries[index],
            time,
            content,
          };
          await writeEntries(entries);
          res.status(200).json({ success: true, id: sourceId });
          return;
        }
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      entries.unshift({ id, time, content });
      await writeEntries(entries);
      res.status(200).json({ success: true, id });
      return;
    } catch {
      res.status(500).json({ error: '写入失败' });
      return;
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = typeof req.query?.id === 'string' ? req.query.id : null;
      if (!id) {
        res.status(400).json({ error: '缺少 id' });
        return;
      }

      const entries = await readEntries();
      const nextEntries = entries.filter((entry) => entry.id !== id);
      await writeEntries(nextEntries);
      res.status(200).json({ success: true });
      return;
    } catch {
      res.status(500).json({ error: '删除失败' });
      return;
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method Not Allowed' });
}
