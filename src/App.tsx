import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

const STORAGE_KEY = 'girlfriend-wish-note';

const photoFrames = [
  {
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80',
    alt: '花束与温柔氛围',
    className: 'photo photo-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=500&q=80',
    alt: '浪漫约会场景',
    className: 'photo photo-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=500&q=80',
    alt: '爱心灯光装饰',
    className: 'photo photo-3',
  },
  {
    src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80',
    alt: '温暖夕阳回忆',
    className: 'photo photo-4',
  },
];

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [wishText, setWishText] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWishText(saved);
    }
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
      setMessage('请先写下你的想法，我会认真看。');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      localStorage.setItem(STORAGE_KEY, trimmed);
      setMessage('已写入项目里的 txt 文件。');
    } catch {
      setMessage('写入失败，请确认你是用 npm run dev 启动。');
    } finally {
      setIsSaving(false);
    }
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
            <p className="intro-kicker">给最重要的你</p>
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

        {photoFrames.map((frame) => (
          <figure key={frame.className} className={frame.className}>
            <img src={frame.src} alt={frame.alt} loading="lazy" />
          </figure>
        ))}

        <section className="note-card" aria-label="心里话填写区">
          <p className="label">想说的话，我都在听</p>
          <h2>请告诉我，你希望我怎么做</h2>
          <form onSubmit={handleSubmit}>
            <textarea
              value={wishText}
              onChange={(event) => setWishText(event.target.value)}
              placeholder="例如：希望你以后遇到问题先好好沟通，不要冷处理..."
              rows={8}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '提交并写入 txt'}
            </button>
            {message && <p className="submit-message">{message}</p>}
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
