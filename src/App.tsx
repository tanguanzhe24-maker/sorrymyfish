import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type WishEntry = {
  id: string;
  time: string;
  content: string;
  sourceId?: string;
};

const SUMMARY_LINES = [
  '⁍ 及时察觉你的小情绪 提出实质性的帮助 并且不能逼你 （我会永远支持你）',
  '⁍ 沟通时更温和 不要让你感受到压力或被批评',
  '⁍ 希望我尝试理解你，而不是觉得你“总是惹我生气”或“你做不到”',
  '⁍ 减少“我应该怎么安慰你”的焦虑感，接受你的独立性',
  '⁍ 关注彼此付出 而不是只关注谁在安慰谁 谁没做到',
  '⁍ 尊重你的私人空间 不用时时刻刻监控你的情绪或反应',
  '⁍ 同时我也会独立思考 提升自己 让你看到我努力',
  '\n',
  '你希望我更独立、更成熟、更理解你的方式，给你空间，同时努力改善自己，让你看到我的成长，而不是单方面追着你或焦虑你的情绪。',
];

const photoFrames = [
  {
    src: '/photos/1110.jpg',
    alt: '我们的甜蜜回忆一',
    caption: '在一起的开始',
    className: 'photo photo-1',
  },
  {
    src: '/photos/birthday.JPG',
    alt: '我们的生日时刻',
    caption: '生日快乐呀宝宝',
    className: 'photo photo-2',
  },
  {
    src: '/photos/kedah.jpg',
    alt: '我们一起去的地方',
    caption: '和你去哪都开心',
    className: 'photo photo-3',
  },
  {
    src: '/photos/zootopia.jpg',
    alt: '我们的可爱合照',
    caption: '想继续陪你很久',
    className: 'photo photo-4',
  },
];

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [wishText, setWishText] = useState('');
  const [entries, setEntries] = useState<WishEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/wish');
        if (!response.ok) {
          throw new Error('读取失败');
        }
        const data = (await response.json()) as { entries: WishEntry[] };
        setEntries(data.entries ?? []);
      } catch {
        setMessage('读取历史留言失败，请确认你是用 npm run dev 启动。');
      } finally {
        setIsLoadingEntries(false);
      }
    };

    fetchEntries();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntro(false);
    }, 4300);
    return () => window.clearTimeout(timer);
  }, []);

  const floatingHearts = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = wishText.trim();
    if (!trimmed) {
      setMessage('请先写下留言内容。');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: trimmed,
          sourceId: editingId,
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const listRes = await fetch('/api/wish');
      const listData = (await listRes.json()) as { entries: WishEntry[] };
      setEntries(listData.entries ?? []);

      setWishText('');
      const edited = Boolean(editingId);
      setEditingId(null);
      setMessage(edited ? '已更新这条留言。' : '已保存新留言。');
    } catch {
      setMessage('写入失败，请确认你是用 npm run dev 启动。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: WishEntry) => {
    const confirmed = window.confirm('确定要删除这条历史留言吗？删除后无法恢复。');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/wish?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      const listRes = await fetch('/api/wish');
      const listData = (await listRes.json()) as { entries: WishEntry[] };
      setEntries(listData.entries ?? []);

      if (editingId === entry.id) {
        setWishText('');
        setEditingId(null);
      }

      setMessage('已删除这条历史留言。');
    } catch {
      setMessage('删除失败，请稍后重试。');
    }
  };

  const loadEntryForEdit = (entry: WishEntry) => {
    setWishText(entry.content);
    setEditingId(entry.id);
    setMessage(`已载入 ${entry.time} 的留言，你可以修改后再保存。`);
  };

  return (
    <div className="apology-page">
      {showIntro && (
        <section className="intro-screen" aria-label="开场爱心动画">
          <div className="intro-hearts" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => (
              <span
                key={i}
                className="burst-heart"
                style={{
                  ['--delay' as string]: `${(i % 8) * 0.18}s`,
                  ['--x' as string]: `${(i * 39) % 100}%`,
                }}
              >
                ❤
              </span>
            ))}
          </div>

          <div className="intro-content">
            <p className="intro-kicker">给最重要的小瑜</p>
            <h1>对不起，是我做得不够好</h1>
            <p>我想听你真正的感受，也想把你说的每件事都认真做到。</p>
            <button type="button" className="skip-btn" onClick={() => setShowIntro(false)}>
              直接进入
            </button>
          </div>
        </section>
      )}

      <main className={`home ${showIntro ? 'hidden' : 'visible'}`}>
        <div className="ambient-hearts" aria-hidden="true">
          {floatingHearts.map((heart) => (
            <span
              key={heart}
              className="float-heart"
              style={{
                ['--i' as string]: `${heart}`,
              }}
            >
              ♥
            </span>
          ))}
        </div>

        <section className="memory-wall" aria-label="我们的回忆相框">
          {photoFrames.map((frame) => (
            <figure key={frame.className} className={frame.className}>
              <img src={frame.src} alt={frame.alt} loading="lazy" />
              <figcaption>{frame.caption}</figcaption>
            </figure>
          ))}
        </section>

        <section className="note-card" aria-label="心里话填写区">
          <p className="label">我的总结</p>
          <h2>我会按这个方向认真改</h2>
          <div className="summary-block">
            {SUMMARY_LINES.map((line, idx) => (
              <p key={`${idx}-${line}`}>{line || ' '}</p>
            ))}
          </div>

          <div className="divider" aria-hidden="true" />

          <h2>你可以写新留言，也可以修改历史留言</h2>
          <form onSubmit={handleSubmit}>
            <textarea
              value={wishText}
              onChange={(event) => setWishText(event.target.value)}
              placeholder="把你现在想告诉我的，写在这里..."
              rows={8}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : editingId ? '保存当前修改' : '保存留言'}
            </button>
            {message && <p className="submit-message">{message}</p>}
          </form>

          <div className="history-panel" aria-label="历史留言列表">
            <h3>历史留言（可查看并编辑）</h3>
            {isLoadingEntries ? (
              <p className="history-empty">正在读取留言...</p>
            ) : entries.length === 0 ? (
              <p className="history-empty">还没有留言记录。</p>
            ) : (
              <ul className="history-list">
                {entries.map((entry) => (
                  <li key={entry.id} className="history-item">
                    <p className="history-time">{entry.time}</p>
                    <p className="history-content">{entry.content}</p>
                    <div className="history-actions">
                      <button type="button" className="history-edit-btn" onClick={() => loadEntryForEdit(entry)}>
                        载入并编辑这条
                      </button>
                      <button type="button" className="history-delete-btn" onClick={() => handleDelete(entry)}>
                        删除这条
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
