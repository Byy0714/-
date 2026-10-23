import { useMemo, useState } from 'react'
import { EXAMS, LEVELS, MODES, courseWords } from '../data/words'
import Icon from '../components/Icon'
import { LevelTag } from '../components/ui'

const PAGE_SIZE = 50

const LEVEL_FILTERS = [
  { id: -1, name: '全部' },
  ...LEVELS.map((l) => ({ id: l.id, name: l.name, meta: l })),
]

export default function Library() {
  const [exam, setExam] = useState('cet4')
  const [mode, setMode] = useState('all')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState(-1)
  const [page, setPage] = useState(1)

  const examMeta = EXAMS.find((e) => e.id === exam)
  const modeMeta = MODES.find((m) => m.id === mode)

  const allWords = useMemo(() => courseWords(exam, mode), [exam, mode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allWords.filter((w) => {
      if (level >= 0 && w.level !== level) return false
      if (!q) return true
      return (
        w.word.toLowerCase().includes(q) ||
        (w.phonetic || '').toLowerCase().includes(q) ||
        (w.trans || '').toLowerCase().includes(q)
      )
    })
  }, [allWords, query, level])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageWords = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const levelCounts = useMemo(() => {
    const c = [0, 0, 0]
    allWords.forEach((w) => (c[w.level] += 1))
    return c
  }, [allWords])

  const switchExam = (id) => {
    setExam(id)
    setPage(1)
  }
  const switchMode = (id) => {
    setMode(id)
    setPage(1)
  }
  const switchLevel = (id) => {
    setLevel(id)
    setPage(1)
  }

  return (
    <div className="library">
      <div className="page-head">
        <div>
          <span className="eyebrow">Word Library</span>
          <h1>词库浏览</h1>
          <p className="page-sub">
            按考试、课程与词频浏览全部词条，支持单词 / 音标 / 释义检索。
          </p>
        </div>
      </div>

      {/* 考试 + 模式切换 */}
      <div className="lib-toolbar">
        <div className="seg-group">
          {EXAMS.map((e) => (
            <button
              key={e.id}
              className={`seg-btn ${exam === e.id ? 'on' : ''}`}
              onClick={() => switchExam(e.id)}
              style={{ '--c1': e.color, '--c2': e.color2 }}
            >
              {e.name}
              <small>{e.total} 词</small>
            </button>
          ))}
        </div>
        <div className="seg-group">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`seg-btn ${mode === m.id ? 'on' : ''}`}
              onClick={() => switchMode(m.id)}
              style={{ '--c1': m.color, '--c2': m.color }}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索 + 频率筛选 */}
      <div className="lib-filters">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="搜索单词 / 音标 / 释义…"
            aria-label="搜索词条"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="清除搜索">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="chip-row">
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${level === f.id ? 'on' : ''}`}
              onClick={() => switchLevel(f.id)}
              style={f.meta ? { color: f.meta.color, borderColor: `${f.meta.color}66` } : undefined}
            >
              {f.name}
              {f.meta && <i>{levelCounts[f.id]}</i>}
            </button>
          ))}
        </div>
      </div>

      {/* 统计条 */}
      <div className="lib-stats">
        <span>
          <b>{examMeta?.name}</b> · {modeMeta?.name}
        </span>
        <span>
          共 <b>{allWords.length}</b> 词，筛选后 <b>{filtered.length}</b> 条
        </span>
      </div>

      {/* 词条列表 */}
      {pageWords.length === 0 ? (
        <div className="lib-empty">
          <Icon name="search" size={28} />
          <b>没有匹配的词条</b>
          <p>试试换个关键词，或切换考试 / 课程。</p>
        </div>
      ) : (
        <div className="word-grid">
          {pageWords.map((w) => {
            const lv = LEVELS[w.level]
            return (
              <div className="word-card" key={w.key}>
                <div className="word-card-head">
                  <div className="word-main">
                    <b className="word-en">{w.word}</b>
                    {w.phonetic && <span className="word-phon">/{w.phonetic}/</span>}
                  </div>
                  <LevelTag level={w.level} meta={lv} />
                </div>
                <p className="word-trans">{w.trans}</p>
                {w.example && (
                  <div className="word-ex">
                    <span className="word-ex-en">{w.example}</span>
                    {w.exampleCn && <span className="word-ex-cn">{w.exampleCn}</span>}
                  </div>
                )}
                <div className="word-foot">
                  <span className="word-freq" title="真题句频">
                    <Icon name="target" size={12} />
                    {w.freq} 句
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="pager">
          <button
            className="pager-btn"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <Icon name="arrow-left" size={15} />
            上一页
          </button>
          <span className="pager-info">
            第 <b>{safePage}</b> / {totalPages} 页
          </span>
          <button
            className="pager-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            下一页
            <Icon name="arrow-right" size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
