import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { EXAMS, EXAM_MAP, LEVELS, MODE_MAP, WORD_MAP } from '../data/words'
import { REVIEW_OFFSETS } from '../data/plan'
import Icon from '../components/Icon'
import { ProgressBar, Ring, Toggle } from '../components/ui'
import { lastNDays, shortDate, weekdayShort } from '../lib/utils'

export default function Dashboard() {
  const {
    profile,
    course,
    paused,
    setPaused,
    dueCount,
    newRemaining,
    newKeys,
    todayRecord,
    todayDone,
    todayTotal,
    streak,
    mastered,
    stats,
    courseTotal,
    courseLearned,
    coursePercent,
    levelStats,
    planDay,
    data,
  } = useApp()
  const navigate = useNavigate()

  const exam = course ? EXAM_MAP[course.exam] : null
  const mode = course ? MODE_MAP[course.mode] : null
  const percent = todayTotal === 0 ? (course ? 100 : 0) : Math.round((todayDone / todayTotal) * 100)
  const nextLevel = newKeys.length ? WORD_MAP[newKeys[0]]?.level : null
  const nextWord = newKeys.length ? WORD_MAP[newKeys[0]] : null

  const week = lastNDays(7).map((day) => {
    const rec = data.daily[day] || { n: 0, r: 0 }
    return { day, total: rec.n + rec.r }
  })
  const weekMax = Math.max(1, ...week.map((d) => d.total))

  const dateText = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  if (!course) {
    return (
      <div className="page">
        <section className="onboard-hero">
          <div className="onboard-copy">
            <span className="eyebrow">Welcome · {profile?.name}</span>
            <h1>先选一条属于你的词汇路线</h1>
            <p>
              四级或六级、速学或全量、每天背多少——都由你决定。
              选择时我们会直接算出完成时间和每天因复习额外增加的词量。
            </p>
            <div className="onboard-actions">
              <Link to="/plan" className="btn btn-primary btn-lg">
                <Icon name="compass" />
                制定学习计划
              </Link>
              <span className="tiny dim">已收录 6,084 个词条 · 无需注册</span>
            </div>
          </div>
          <div className="onboard-cards">
            {EXAMS.map((e) => (
              <Link key={e.id} to="/plan" className="mini-exam-card" style={{ '--ec': e.color }}>
                <span className="exam-glyph" style={{ background: `${e.color}22`, color: e.color }}>
                  {e.glyph}
                </span>
                <b>{e.name}词汇</b>
                <span>{e.total} 词 · 中高频 {e.high + e.mid}</span>
                <i className="mini-bar">
                  <em style={{ width: `${((e.high + e.mid) / e.total) * 100}%`, background: e.color }} />
                </i>
              </Link>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{dateText}</span>
          <h1>
            早上好，{profile?.name}
            <span className="head-dot">.</span>
          </h1>
          <p className="sub">
            计划第 {planDay} 天 · {exam.name} {mode.name} · 按词频从高到低推进
          </p>
        </div>
        <div className="head-chips">
          <span className={`chip-soft ${paused ? 'warn' : ''}`}>
            <Icon name={paused ? 'pause' : 'play'} size={13} />
            {paused ? '已暂停新词' : '新词进行中'}
          </span>
          <Link to="/plan" className="btn btn-ghost">
            <Icon name="settings" />
            调整计划
          </Link>
        </div>
      </div>

      <section className="today-hero">
        <div className="today-hero-bg" aria-hidden="true">
          <span className="hero-grid" />
          <span className="hero-word w1">memory</span>
          <span className="hero-word w2">review</span>
          <span className="hero-word w3">frequency</span>
        </div>

        <div className="today-main">
          <span className="eyebrow">Today's Mission</span>
          <h2>
            {todayTotal === 0
              ? '今天的任务已经清空'
              : `还有 ${todayTotal} 个词，等你收进记忆`}
          </h2>
          <div className="today-counts">
            <div className="today-count">
              <span className="dot review" />
              <div>
                <b>{dueCount}</b>
                <span>待复习</span>
              </div>
            </div>
            <div className="today-count">
              <span className="dot fresh" />
              <div>
                <b>{newRemaining}</b>
                <span>今日新词</span>
              </div>
            </div>
            <div className="today-count">
              <span className="dot done" />
              <div>
                <b>{todayDone}</b>
                <span>今日已完成</span>
              </div>
            </div>
          </div>
          <div className="today-actions">
            <button
              className="btn btn-primary btn-lg glow"
              onClick={() => navigate('/study')}
              disabled={todayTotal === 0 && todayDone === 0}
            >
              <Icon name={todayTotal === 0 ? 'check-circle' : 'play'} />
              {todayTotal === 0 ? '今日已完成' : todayDone > 0 ? '继续学习' : '开始今日学习'}
            </button>
            {nextWord && (
              <span className="next-hint">
                下一个 · <b>{nextWord.word}</b>
                <i className={`lv-dot lv-${nextLevel}`} />
                {LEVELS[nextLevel].name}
              </span>
            )}
            {paused && <span className="pause-hint">新词已暂停，今日只做复习</span>}
          </div>
        </div>

        <div className="today-ring">
          <Ring value={percent} size={156} stroke={10} color="#7C6CFF" color2="#38C8FF">
            <b>{percent}%</b>
            <span>今日进度</span>
          </Ring>
          <div className="ring-caption">
            今日已学 {todayRecord.n} 个新词 · 复习 {todayRecord.r} 个
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-ic flame">
            <Icon name="flame" />
          </span>
          <div>
            <b>{streak} 天</b>
            <span>连续学习</span>
          </div>
          <i className="stat-spark" />
        </div>
        <div className="stat-card">
          <span className="stat-ic mint">
            <Icon name="check-circle" />
          </span>
          <div>
            <b>{mastered}</b>
            <span>已掌握单词</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic sky">
            <Icon name="clock" />
          </span>
          <div>
            <b>{stats.todayTimeText || '0 分钟'}</b>
            <span>今日学习时长</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic gold">
            <Icon name="target" />
          </span>
          <div>
            <b>{coursePercent}%</b>
            <span>计划完成度</span>
          </div>
        </div>
      </div>

      <div className="dash-columns">
        <section className="card course-overview">
          <div className="card-head">
            <div>
              <span className="eyebrow">Current Plan</span>
              <h3>当前学习计划</h3>
            </div>
            <span className="exam-pill" style={{ background: `${exam.color}1f`, color: exam.color }}>
              {exam.en}
            </span>
          </div>

          <div className="course-line">
            <div>
              <b>{exam.name} · {mode.name}</b>
              <span>每天 {course.dailyNew} 个新词 · 已学 {courseLearned} / {courseTotal}</span>
            </div>
            <b className="course-percent">{coursePercent}%</b>
          </div>
          <ProgressBar value={coursePercent} color={exam.color} color2={exam.color2} />

          <div className="level-breakdown">
            {levelStats.map((row) => {
              const meta = LEVELS[row.level]
              const pct = row.total ? (row.learned / row.total) * 100 : 0
              return (
                <div className="level-row" key={row.level}>
                  <span className="lv-name" style={{ color: meta.color }}>
                    <i style={{ background: meta.color }} />
                    {meta.name}
                  </span>
                  <span className="lv-track">
                    <i style={{ width: `${pct}%`, background: meta.color }} />
                  </span>
                  <span className="lv-num">
                    {row.learned}
                    <em>/{row.total}</em>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="review-nodes">
            <span className="tiny dim">艾宾浩斯复习节点</span>
            <div className="node-row">
              {REVIEW_OFFSETS.map((day, i) => (
                <span className="node" key={day}>
                  <b>D+{day}</b>
                  <i>{i + 1}</i>
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="dash-side">
          <section className={`card pause-card ${paused ? 'is-paused' : ''}`}>
            <div className="card-head">
              <div>
                <span className="eyebrow">Rhythm</span>
                <h3>暂停新词</h3>
              </div>
              <Toggle checked={paused} onChange={setPaused} label="暂停新词" />
            </div>
            <p>
              {paused
                ? '已停止推进新词，但到期复习仍会按艾宾浩斯节点正常出现。想恢复时随时关闭。'
                : '某天不想背新词时打开它，只做复习，已建立的学习节奏不会被打断。'}
            </p>
            <div className="pause-meta">
              <Icon name={paused ? 'pause' : 'refresh'} size={14} />
              {paused ? '复习队列仍会自动更新' : '到期复习不会被暂停'}
            </div>
          </section>

          <section className="card week-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">Last 7 Days</span>
                <h3>近 7 天节奏</h3>
              </div>
              <span className="tiny dim">词 / 天</span>
            </div>
            <div className="week-bars">
              {week.map((d) => (
                <div className="week-col" key={d.day} title={`${d.day} · ${d.total} 词`}>
                  <span className="week-bar-wrap">
                    <i
                      className={`week-bar ${d.total === 0 ? 'zero' : ''}`}
                      style={{ height: `${Math.max(4, (d.total / weekMax) * 100)}%` }}
                    />
                  </span>
                  <b>{d.total || ''}</b>
                  <span>{weekdayShort(d.day)}</span>
                </div>
              ))}
            </div>
            <div className="week-foot">
              <span>{shortDate(week[0].day)} — {shortDate(week[6].day)}</span>
              <Link to="/progress" className="link-inline">
                查看完整进度
                <Icon name="chevron-right" size={13} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
