import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { COURSE_LISTS, EXAMS, LEVELS, MODES, courseCount } from '../data/words'
import {
  NEW_WORD_SECONDS,
  REVIEW_OFFSETS,
  REVIEW_WORD_SECONDS,
  buildSchedule,
  sampleSchedule,
} from '../data/plan'
import Icon from '../components/Icon'
import { addDays, formatDuration } from '../lib/utils'

const PRESETS = [10, 20, 30, 50, 80]

const dateLabel = (key) => {
  const d = new Date(`${key}T12:00:00`)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export default function Plan() {
  const { course, data, startCourse, updateCourse, notify } = useApp()
  const navigate = useNavigate()

  const [examId, setExamId] = useState(course?.exam || 'cet4')
  const [mode, setMode] = useState(course?.mode || 'core')
  const [dailyNew, setDailyNew] = useState(course?.dailyNew || 20)

  const exam = EXAMS.find((e) => e.id === examId)
  const total = courseCount(examId, mode)
  const list = COURSE_LISTS[examId][mode]
  const levels = [0, 1, 2].map((level) => ({
    level,
    meta: LEVELS[level],
    count: list.filter((w) => w.level === level).length,
  }))

  const schedule = useMemo(() => buildSchedule(total, dailyNew), [total, dailyNew])
  const bars = useMemo(() => sampleSchedule(schedule, 52), [schedule])
  const chartMax = Math.max(1, ...bars.map((b) => b.newWords + b.reviewWords))

  const samePlan = course && course.exam === examId && course.mode === mode
  const today = new Date()
  const finishKey = addDays(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`,
    Math.max(0, schedule.learnDays - 1)
  )
  const allDoneKey = addDays(finishKey, REVIEW_OFFSETS[REVIEW_OFFSETS.length - 1])
  const reviewTotal = Math.round(schedule.totalReviews)

  const start = () => {
    if (samePlan) {
      updateCourse({ dailyNew })
      notify('计划已更新', `每天 ${dailyNew} 个新词，已学词不受影响`, 'check')
    } else {
      startCourse({ exam: examId, mode, dailyNew })
      notify(
        '学习计划已开始',
        `${exam.name} · ${MODES.find((m) => m.id === mode).name} · 每天 ${dailyNew} 词`,
        'route'
      )
    }
    navigate('/')
  }

  return (
    <div className="page plan-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Plan Builder</span>
          <h1>定制你的记忆节奏</h1>
          <p className="sub">
            选考试、选词量范围、选每天新词数。右侧会实时算出完成时间与每个复习节点的额外词量。
          </p>
        </div>
        {course && (
          <span className="chip-soft">
            <Icon name="info" size={13} />
            已学 {Object.keys(data.words).length} 词会保留
          </span>
        )}
      </div>

      <div className="plan-layout">
        <div className="plan-left">
          <section className="card step-card">
            <div className="step-head">
              <span className="step-num">01</span>
              <div>
                <h3>选择考试</h3>
                <p>频率数据按四六级真题语料分别统计</p>
              </div>
            </div>
            <div className="exam-grid">
              {EXAMS.map((e) => (
                <button
                  key={e.id}
                  className={`exam-card ${examId === e.id ? 'on' : ''}`}
                  onClick={() => setExamId(e.id)}
                  style={{ '--ec': e.color, '--ec2': e.color2 }}
                >
                  <span className="exam-glyph" style={{ background: `${e.color}1f`, color: e.color }}>
                    {e.glyph}
                  </span>
                  <span className="exam-copy">
                    <b>{e.name}词汇</b>
                    <small>{e.en} · {e.total} 词</small>
                    <span className="exam-composition">
                      <i style={{ width: `${(e.high / e.total) * 100}%`, background: LEVELS[0].color }} />
                      <i style={{ width: `${(e.mid / e.total) * 100}%`, background: LEVELS[1].color }} />
                      <i style={{ flex: 1, background: LEVELS[2].color }} />
                    </span>
                    <small className="exam-freq">
                      高频 {e.high} · 中频 {e.mid} · 低频 {e.low}
                    </small>
                  </span>
                  <span className="exam-check">
                    <Icon name="check" size={14} />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card step-card">
            <div className="step-head">
              <span className="step-num">02</span>
              <div>
                <h3>选择学习范围</h3>
                <p>所有课程都严格按 高频 → 中频 → 低频 推进</p>
              </div>
            </div>
            <div className="mode-grid">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`mode-card ${mode === m.id ? 'on' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  <div className="mode-top">
                    <span className="mode-ic" style={{ background: `${m.color}1f`, color: m.color }}>
                      <Icon name={m.icon} />
                    </span>
                    {m.tag && <span className="mode-tag">{m.tag}</span>}
                  </div>
                  <b>{m.name}</b>
                  <small>{m.desc}</small>
                  <div className="mode-count">
                    <b>{courseCount(examId, m.id)}</b>
                    <span>个词条</span>
                  </div>
                  <span className="mode-check">
                    <Icon name="check" size={14} />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card step-card">
            <div className="step-head">
              <span className="step-num">03</span>
              <div>
                <h3>每天新学多少个词</h3>
                <p>复习量会自动叠加在下方预览里</p>
              </div>
            </div>
            <div className="daily-value">
              <b>{dailyNew}</b>
              <span>词 / 天</span>
            </div>
            <input
              type="range"
              className="range"
              min="5"
              max="100"
              step="5"
              value={dailyNew}
              onChange={(e) => setDailyNew(Number(e.target.value))}
              style={{ '--fill': `${((dailyNew - 5) / 95) * 100}%` }}
              aria-label="每天新词数量"
            />
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className={`preset ${dailyNew === p ? 'on' : ''}`}
                  onClick={() => setDailyNew(p)}
                >
                  {p} 词
                  <small>{formatDuration((p * NEW_WORD_SECONDS) / 60)}</small>
                </button>
              ))}
            </div>
            <div className="plan-levels">
              <span className="tiny dim">本范围词频构成</span>
              <div className="stack-bar">
                {levels.map((row) => (
                  <i
                    key={row.level}
                    style={{
                      width: `${(row.count / Math.max(1, total)) * 100}%`,
                      background: row.meta.color,
                    }}
                    title={`${row.meta.name} ${row.count} 词`}
                  />
                ))}
              </div>
              <div className="stack-legend">
                {levels.map((row) => (
                  <span key={row.level}>
                    <i style={{ background: row.meta.color }} />
                    {row.meta.name} {row.count}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="plan-preview">
          <div className="preview-card">
            <div className="preview-head">
              <div>
                <span className="eyebrow">Live Preview</span>
                <h3>{exam.name} · {MODES.find((m) => m.id === mode).name}</h3>
              </div>
              <span className="pulse-dot" />
            </div>

            <div className="preview-hero">
              <div>
                <b>{schedule.learnDays}</b>
                <span>天学完新词</span>
              </div>
              <div>
                <b>{Math.round(schedule.avgMinutes)}</b>
                <span>日均分钟</span>
              </div>
              <div>
                <b>{reviewTotal.toLocaleString('zh-CN')}</b>
                <span>总复习次数</span>
              </div>
            </div>

            <div className="preview-date">
              <span>
                <Icon name="calendar" size={14} />
                新词完成：{dateLabel(finishKey)}
              </span>
              <span>
                <Icon name="check-circle" size={14} />
                全部复习：{dateLabel(allDoneKey)}
              </span>
            </div>

            <div className="preview-section">
              <div className="preview-label">
                <b>艾宾浩斯额外复习量</b>
                <span>到这些天数时，复习会累计叠加</span>
              </div>
              <div className="review-timeline">
                {REVIEW_OFFSETS.map((offset, i) => (
                  <div className="review-step" key={offset}>
                    <span className="review-dot">{i + 1}</span>
                    <b>D+{offset}</b>
                    <span>{schedule.reviewAt[offset]} 词</span>
                    {i < REVIEW_OFFSETS.length - 1 && <i className="review-line" />}
                  </div>
                ))}
              </div>
              <p className="preview-note">
                以每天 {dailyNew} 个新词计，稳态下每天会额外出现约{' '}
                <b>{dailyNew * REVIEW_OFFSETS.length}</b> 个复习词；峰值日共{' '}
                <b>{schedule.peakWords}</b> 词，约 {Math.round(schedule.peakMinutes)} 分钟。
              </p>
            </div>

            <div className="preview-section">
              <div className="preview-label">
                <b>每日负荷曲线</b>
                <span>新词 + 复习</span>
              </div>
              <div className="load-chart">
                {bars.map((bar, i) => {
                  const h = ((bar.newWords + bar.reviewWords) / chartMax) * 100
                  const reviewH = bar.total ? (bar.reviewWords / (bar.newWords + bar.reviewWords)) * 100 : 0
                  return (
                    <div
                      className="load-col"
                      key={`${bar.day}-${i}`}
                      title={`第 ${bar.dayStart || bar.day} 天 · 新词 ${bar.newWords} · 复习 ${bar.reviewWords}`}
                    >
                      <span className="load-stack" style={{ height: `${Math.max(3, h)}%` }}>
                        <i className="load-review" style={{ height: `${reviewH}%` }} />
                        <i className="load-new" style={{ height: `${100 - reviewH}%` }} />
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="chart-axis">
                <span>第 1 天</span>
                <span>第 {bars[Math.floor(bars.length / 2)]?.day} 天</span>
                <span>第 {bars[bars.length - 1]?.day} 天</span>
              </div>
              <div className="chart-legend">
                <span><i className="lg-new" />新词</span>
                <span><i className="lg-review" />复习</span>
                <span className="tiny dim">前 58 天复习逐步叠加</span>
              </div>
            </div>

            <div className="preview-total">
              <span>完成整个计划约需</span>
              <b>{formatDuration(schedule.totalMinutes)}</b>
              <small>按新词 {NEW_WORD_SECONDS}s、复习 {REVIEW_WORD_SECONDS}s 估算</small>
            </div>

            <button className="btn btn-primary btn-lg preview-start" onClick={start}>
              <Icon name={samePlan ? 'check' : 'play'} />
              {samePlan ? '保存每日新词数' : course ? '切换到这个计划' : '开始这个计划'}
            </button>
            <p className="preview-foot">
              <Icon name="info" size={13} />
              切换计划不会清空已学单词；相同词条不会重复学习。
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
