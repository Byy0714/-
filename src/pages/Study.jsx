import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { LEVELS, WORD_MAP } from '../data/words'
import { REVIEW_INTERVALS, REVIEW_STAGES } from '../data/plan'
import Icon from '../components/Icon'
import { Confetti, ProgressBar } from '../components/ui'
import { formatDuration, speak, stopSpeaking } from '../lib/utils'

const gradeMeta = (item) => {
  const stage = item.record?.stage ?? 0
  if (stage + 1 >= REVIEW_STAGES) return '完成第 7 次复习 · 长期记忆'
  return `下次 D+${REVIEW_INTERVALS[stage + 1]}`
}

export default function Study() {
  const {
    course,
    dueKeys,
    newKeys,
    data,
    settings,
    updateSettings,
    learnWord,
    reviewWord,
    notify,
    streak,
  } = useApp()
  const navigate = useNavigate()

  const [queue, setQueue] = useState(() => {
    const items = []
    dueKeys.forEach((key) => {
      const word = WORD_MAP[key]
      if (word) items.push({ uid: `r-${key}-${Math.random()}`, kind: 'review', key, word, reinforce: 0 })
    })
    newKeys.forEach((key) => {
      const word = WORD_MAP[key]
      if (word) items.push({ uid: `n-${key}-${Math.random()}`, kind: 'new', key, word, reinforce: 0 })
    })
    return items
  })
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({
    newLearned: 0,
    reviewed: 0,
    good: 0,
    fuzzy: 0,
    forgot: 0,
    reinforced: 0,
  })
  const startRef = useRef(Date.now())

  const current = queue[index]
  const record = current ? data.words[current.key] : null
  const done = index >= queue.length
  const totalReviewTarget = useMemo(() => queue.filter((q) => q.kind === 'review').length, [queue])
  const totalNewTarget = queue.length - totalReviewTarget
  const percent = queue.length ? Math.round((Math.min(index, queue.length) / queue.length) * 100) : 100

  useEffect(() => {
    if (!current) return
    setRevealed(false)
    if (settings.autoSpeak) speak(current.word.word, 'en-US')
  }, [current, settings.autoSpeak])

  useEffect(() => () => stopSpeaking(), [])

  const goNext = () => {
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  // 原地替换当前卡为「当天巩固」状态，让用户立刻再记一次（最多重排 1 次）
  const requeue = () => {
    if (!current) return
    setQueue((q) =>
      q.map((item, i) =>
        i === index
          ? {
              ...item,
              uid: `${item.uid}-r${item.reinforce + 1}`,
              kind: 'review', // 重排后按复习卡处理
              reinforce: item.reinforce + 1,
            }
          : item
      )
    )
    setStats((s) => ({ ...s, reinforced: s.reinforced + 1 }))
    setRevealed(false)
  }

  // 统一评分：新词 / 复习 共用
  const handleGrade = (grade) => {
    if (!current) return
    const isNew = current.kind === 'new'
    // 哪些等级算「不熟」，需要当天重排巩固
    const weak = grade === 'unfamiliar' || grade === 'vague' || grade === 'forget' || grade === 'fuzzy'

    if (isNew) {
      learnWord(current.key, grade)
      setStats((s) => ({ ...s, newLearned: s.newLearned + 1 }))
    } else {
      reviewWord(current.key, grade)
      setStats((s) => ({
        ...s,
        reviewed: s.reviewed + 1,
        good: s.good + (grade === 'good' ? 1 : 0),
        fuzzy: s.fuzzy + (grade === 'fuzzy' ? 1 : 0),
        forgot: s.forgot + (grade === 'forget' ? 1 : 0),
      }))
      if (grade === 'good' && record && record.stage + 1 >= REVIEW_STAGES) {
        notify('进入长期记忆', `${current.word.word} 已完成 7 次复习`, 'award')
      }
    }

    // 不熟 + 还没重排过 → 当天再练一次
    if (weak && current.reinforce < 1) {
      requeue()
    } else {
      goNext()
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!current) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        // Space 翻面后不做任何操作，必须主动选 1/2/3，防止连按速通
        return
      }
      if (!revealed) return
      if (e.key === '1') handleGrade(current.kind === 'new' ? 'unfamiliar' : 'forget')
      if (e.key === '2') handleGrade(current.kind === 'new' ? 'vague' : 'fuzzy')
      if (e.key === '3') handleGrade(current.kind === 'new' ? 'familiar' : 'good')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, revealed, record])

  const minutes = Math.max(1, Math.round((Date.now() - startRef.current) / 60000))

  if (!course) {
    return (
      <div className="study-gate">
        <div className="gate-card">
          <Icon name="compass" size={36} />
          <h2>还没有学习计划</h2>
          <p>先选择考试范围和每天新词数，再开始今天的记忆。</p>
          <Link to="/plan" className="btn btn-primary btn-lg">
            去制定计划
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    const totalReviewed = stats.reviewed
    const accuracy = totalReviewed ? Math.round((stats.good / totalReviewed) * 100) : 0
    const nothing = queue.length === 0
    return (
      <div className="study-complete">
        {!nothing && <Confetti count={46} />}
        <div className="complete-card">
          <span className="complete-badge">
            <Icon name={nothing ? 'calendar' : 'check'} size={34} />
          </span>
          <span className="eyebrow">{nothing ? 'Rest Day' : 'Session Complete'}</span>
          <h1>{nothing ? '今天没有到期任务' : '今天的记忆已归档'}</h1>
          <p>
            {nothing
              ? '新词已暂停或已学完，暂时没有到期复习。明天再来看看。'
              : '复习队列已按艾宾浩斯节点重新排期，明天会自动回流。'}
          </p>

          <div className="complete-stats">
            <div>
              <b>{stats.newLearned}</b>
              <span>新学单词</span>
            </div>
            <div>
              <b>{stats.reviewed}</b>
              <span>完成复习</span>
            </div>
            <div>
              <b>{accuracy}%</b>
              <span>复习记得率</span>
            </div>
            <div>
              <b>{formatDuration(minutes)}</b>
              <span>本次用时</span>
            </div>
          </div>

          {stats.reviewed > 0 && (
            <div className="grade-summary">
              <span className="g-good">记得 {stats.good}</span>
              <span className="g-fuzzy">模糊 {stats.fuzzy}</span>
              <span className="g-forget">忘记 {stats.forgot}</span>
            </div>
          )}

          <div className="complete-actions">
            <Link to="/" className="btn btn-primary btn-lg">
              返回今日
            </Link>
            <Link to="/progress" className="btn btn-ghost">
              <Icon name="chart" />
              查看进度
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const level = LEVELS[current.word.level]
  const isReview = current.kind === 'review'
  const stage = record?.stage ?? 0

  return (
    <div className="study-shell">
      <div className="study-aurora" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
      </div>

      <header className="study-top">
        <button className="btn-icon" onClick={() => navigate('/')} aria-label="退出学习">
          <Icon name="close" />
        </button>
        <div className="study-progress">
          <div className="study-progress-meta">
            <span>
              {isReview ? '复习' : '新词'} {Math.min(index + 1, queue.length)} / {queue.length}
            </span>
            <span className="study-counts">
              复习 {Math.min(stats.reviewed, totalReviewTarget)}/{totalReviewTarget} · 新词{' '}
              {Math.min(stats.newLearned, totalNewTarget)}/{totalNewTarget}
            </span>
          </div>
          <ProgressBar value={percent} color="#7C6CFF" color2="#38C8FF" slim />
        </div>
        <button
          className="btn-icon"
          onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
          aria-label="自动发音"
          title={settings.autoSpeak ? '自动发音已开启' : '自动发音已关闭'}
          style={{ opacity: settings.autoSpeak ? 1 : 0.45 }}
        >
          <Icon name="volume" />
        </button>
      </header>

      <main className="study-stage">
        <div className={`flashcard ${revealed ? 'flipped' : ''}`}>
          <div className="flash-inner">
            <section className="flash-face flash-front">
              <div className="flash-topline">
                <span className={`flash-kind ${isReview ? 'review' : 'fresh'}`}>
                  {isReview ? `复习 · 第 ${stage + 1} 次` : '今日新词'}
                </span>
                <span className="flash-level" style={{ color: level.color }}>
                  <i style={{ background: level.color }} />
                  {level.name}
                </span>
              </div>

              <div className="flash-word">
                <h1>{current.word.word}</h1>
                {current.word.phonetic && <span className="phonetic">/{current.word.phonetic}/</span>}
                <button
                  className="sound-btn"
                  onClick={() => speak(current.word.word, 'en-US')}
                  aria-label="播放发音"
                >
                  <Icon name="volume" size={18} />
                  <span className="sound-wave">
                    <i /><i /><i /><i />
                  </span>
                </button>
              </div>

              <div className="flash-hint">
                <span className="hint-line" />
                <span>先在脑中回忆释义，再翻开卡片</span>
                <span className="hint-line" />
              </div>

              <button className="btn btn-primary btn-lg reveal-btn" onClick={() => setRevealed(true)}>
                显示释义
                <span className="kbd">Space</span>
              </button>

              {isReview && (
                <div className="stage-pips" aria-label={`复习进度 ${stage}/7`}>
                  {Array.from({ length: REVIEW_STAGES }, (_, i) => (
                    <i key={i} className={i < stage ? 'done' : i === stage ? 'next' : ''} />
                  ))}
                  <span>{stage}/7</span>
                </div>
              )}
            </section>

            <section className="flash-face flash-back">
              <div className="flash-topline">
                <span className={`flash-kind ${isReview ? 'review' : 'fresh'}`}>
                  {isReview ? `复习 · 第 ${stage + 1} 次` : '今日新词'}
                </span>
                <span className="flash-level" style={{ color: level.color }}>
                  {level.name} · {current.word.freq ? `真题句频 ${current.word.freq}` : '官方考纲新增'}
                </span>
              </div>

              <div className="back-head">
                <div>
                  <h2>{current.word.word}</h2>
                  {current.word.phonetic && (
                    <span className="phonetic">/{current.word.phonetic}/</span>
                  )}
                </div>
                <button
                  className="sound-btn small"
                  onClick={() => speak(current.word.word, 'en-US')}
                  aria-label="播放发音"
                >
                  <Icon name="volume" size={16} />
                </button>
              </div>

              <p className="trans">{current.word.trans}</p>

              {current.word.example && (
                <div className="example">
                  <span className="quote-mark">“</span>
                  <p>{current.word.example}</p>
                  {current.word.exampleCn && <small>{current.word.exampleCn}</small>}
                </div>
              )}

              <div className="grade-area">
                {current.reinforce > 0 && (
                  <span className="reinforce-tag">
                    <Icon name="refresh" size={12} />
                    当天巩固 · 再记一次
                  </span>
                )}
                <span className="grade-label">
                  {isReview ? '这次的回忆程度？' : '这个词你熟悉吗？'}
                </span>
                <div className="grade-buttons">
                  <button
                    className={`grade-btn ${isReview ? 'forget' : 'unfamiliar'}`}
                    onClick={() => handleGrade(isReview ? 'forget' : 'unfamiliar')}
                  >
                    <Icon name="refresh" size={16} />
                    <b>{isReview ? '忘了' : '陌生'}</b>
                    <small>{isReview ? '今天再练一次' : '今天再练一次'}</small>
                    <span className="kbd">1</span>
                  </button>
                  <button
                    className={`grade-btn fuzzy`}
                    onClick={() => handleGrade(isReview ? 'fuzzy' : 'vague')}
                  >
                    <Icon name="moon" size={16} />
                    <b>模糊</b>
                    <small>今天再练一次</small>
                    <span className="kbd">2</span>
                  </button>
                  <button
                    className={`grade-btn good`}
                    onClick={() => handleGrade(isReview ? 'good' : 'familiar')}
                  >
                    <Icon name="check" size={16} />
                    <b>{isReview ? '记得' : '认识'}</b>
                    <small>
                      {isReview ? gradeMeta({ record }) : '直接进入复习'}
                    </small>
                    <span className="kbd">3</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="study-footnote">
          <span>已学 {Object.keys(data.words).length} 词</span>
          <span>·</span>
          <span>连续 {streak} 天</span>
          <span>按 Space 翻面，1 / 2 / 3 选择熟悉程度</span>
        </div>
      </main>
    </div>
  )
}
