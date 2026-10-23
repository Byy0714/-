import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { EXAM_MAP, LEVELS, MODE_MAP, WORD_MAP } from '../data/words'
import { REVIEW_STAGES } from '../data/plan'
import Icon from '../components/Icon'
import { ProgressBar } from '../components/ui'
import { lastNDays, shortDate, dateKey } from '../lib/utils'

const heatLevel = (n) => {
  if (!n) return 0
  if (n < 10) return 1
  if (n < 25) return 2
  if (n < 50) return 3
  return 4
}

export default function Progress() {
  const { data, course, courseLearned, courseTotal, coursePercent, levelStats, mastered, learning, streak, forecast } =
    useApp()

  const exam = course ? EXAM_MAP[course.exam] : null
  const mode = course ? MODE_MAP[course.mode] : null

  const recent = useMemo(() => {
    return Object.entries(data.words)
      .map(([key, rec]) => ({ key, rec, word: WORD_MAP[key] }))
      .filter((x) => x.word)
      .sort((a, b) => {
        const da = a.rec.last || a.rec.learnedAt || ''
        const db = b.rec.last || b.rec.learnedAt || ''
        return da < db ? 1 : da > db ? -1 : 0
      })
      .slice(0, 8)
  }, [data.words])

  const stageBuckets = useMemo(() => {
    const buckets = Array.from({ length: REVIEW_STAGES + 1 }, () => 0)
    Object.values(data.words).forEach((w) => {
      buckets[Math.min(REVIEW_STAGES, w.stage || 0)] += 1
    })
    return buckets
  }, [data.words])

  const totalTracked = Object.keys(data.words).length
  const today = dateKey()
  const heatDays = lastNDays(56)
  const heatMax = Math.max(1, ...heatDays.map((d) => (data.daily[d]?.n || 0) + (data.daily[d]?.r || 0)))
  const forecastMax = Math.max(1, ...forecast.map((f) => f.count))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Memory Dashboard</span>
          <h1>记忆进度</h1>
          <p className="sub">看清单词的记忆阶段、未来复习负荷，以及每一天留下的痕迹。</p>
        </div>
        <div className="head-chips">
          <span className="chip-soft">
            <Icon name="flame" size={13} />
            连续 {streak} 天
          </span>
          <Link to="/" className="btn btn-primary">
            <Icon name="play" />
            继续学习
          </Link>
        </div>
      </div>

      <div className="stat-grid five">
        <div className="stat-card">
          <span className="stat-ic sky">
            <Icon name="book" />
          </span>
          <div>
            <b>{totalTracked}</b>
            <span>已学单词</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic mint">
            <Icon name="award" />
          </span>
          <div>
            <b>{mastered}</b>
            <span>长期记忆</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic gold">
            <Icon name="refresh" />
          </span>
          <div>
            <b>{learning}</b>
            <span>复习中</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic violet">
            <Icon name="target" />
          </span>
          <div>
            <b>{coursePercent}%</b>
            <span>计划完成</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-ic flame">
            <Icon name="flame" />
          </span>
          <div>
            <b>{streak} 天</b>
            <span>连续学习</span>
          </div>
        </div>
      </div>

      <div className="progress-grid">
        <section className="card course-progress-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Plan Progress</span>
              <h3>{course ? `${exam.name} · ${mode.name}` : '尚未选择计划'}</h3>
            </div>
            {course && (
              <span className="exam-pill" style={{ background: `${exam.color}1f`, color: exam.color }}>
                每天 {course.dailyNew} 词
              </span>
            )}
          </div>

          <div className="big-percent">
            <b>{coursePercent}%</b>
            <span>
              {courseLearned} / {courseTotal} 词
            </span>
          </div>
          <ProgressBar
            value={coursePercent}
            color={exam?.color || '#7C6CFF'}
            color2={exam?.color2 || '#38C8FF'}
          />

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

          <div className="stage-block">
            <div className="preview-label">
              <b>记忆阶段分布</b>
              <span>共 7 次复习，走完即长期记忆</span>
            </div>
            <div className="stage-bar">
              {stageBuckets.map((count, i) => (
                <i
                  key={i}
                  style={{ flex: Math.max(count, 0.001) }}
                  className={count ? 'filled' : ''}
                  title={`${i === 0 ? '新学' : i === REVIEW_STAGES ? '已掌握' : `第 ${i} 次复习后`}：${count} 词`}
                />
              ))}
            </div>
            <div className="stage-legend">
              <span>新学 {stageBuckets[0]}</span>
              <span>复习中 {stageBuckets.slice(1, REVIEW_STAGES).reduce((a, b) => a + b, 0)}</span>
              <span>已掌握 {stageBuckets[REVIEW_STAGES]}</span>
            </div>
          </div>
        </section>

        <section className="card forecast-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Review Forecast</span>
              <h3>未来 14 天复习量</h3>
            </div>
            <span className="chip-soft">
              <Icon name="refresh" size={13} />
              艾宾浩斯排期
            </span>
          </div>
          <div className="forecast-chart">
            {forecast.map((f, i) => (
              <div className={`forecast-col ${i === 0 ? 'today' : ''}`} key={f.date} title={`${f.date} · ${f.count} 词`}>
                <span className="forecast-value">{f.count || ''}</span>
                <span className="forecast-bar-wrap">
                  <i
                    className={`forecast-bar ${f.count === 0 ? 'zero' : ''}`}
                    style={{ height: `${Math.max(3, (f.count / forecastMax) * 100)}%` }}
                  />
                </span>
                <span className="forecast-label">{i === 0 ? '今天' : shortDate(f.date)}</span>
              </div>
            ))}
          </div>
          <p className="forecast-note">
            今天之后的所有复习都已按 1 / 2 / 4 / 7 / 15 / 30 / 58 天回流。逾期词会合并到今天，不会消失。
          </p>
        </section>
      </div>

      <div className="progress-grid second">
        <section className="card heat-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Consistency</span>
              <h3>近 8 周学习热力</h3>
            </div>
            <span className="tiny dim">最深 {heatMax} 词 / 天</span>
          </div>
          <div className="heatmap">
            <div className="heat-weekdays">
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="heat-grid">
              {heatDays.map((day) => {
                const rec = data.daily[day] || { n: 0, r: 0 }
                const total = rec.n + rec.r
                return (
                  <span
                    key={day}
                    className={`heat-cell l${heatLevel(total)}`}
                    title={`${day} · 新词 ${rec.n} · 复习 ${rec.r}`}
                  />
                )
              })}
            </div>
          </div>
          <div className="heat-legend">
            <span>少</span>
            <i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" />
            <span>多</span>
          </div>
          <div className="heat-axis">
            <span>{shortDate(heatDays[0])}</span>
            <span>{shortDate(heatDays[heatDays.length - 1])}</span>
          </div>
        </section>

        <section className="card recent-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Recently Touched</span>
              <h3>最近学习的词</h3>
            </div>
            <span className="tiny dim">按最近学习时间</span>
          </div>
          {recent.length === 0 ? (
            <div className="recent-empty">
              <Icon name="book" size={30} />
              <b>还没有学习记录</b>
              <p>完成第一节课后，这里会出现你最近碰过的单词。</p>
            </div>
          ) : (
            <div className="recent-list">
              {recent.map(({ key, rec, word }) => {
                const meta = LEVELS[word.level]
                return (
                  <div className="recent-row" key={key}>
                    <span className="recent-lv" style={{ background: `${meta.color}22`, color: meta.color }}>
                      {meta.short}
                    </span>
                    <div className="recent-word">
                      <b>{word.word}</b>
                      <span>{word.trans}</span>
                    </div>
                    <div className="recent-stage" title={`${rec.stage}/7`}>
                      {Array.from({ length: REVIEW_STAGES }, (_, i) => (
                        <i key={i} className={i < rec.stage ? 'on' : ''} />
                      ))}
                    </div>
                    <span className="recent-due">
                      {rec.stage >= REVIEW_STAGES ? '已掌握' : rec.due === today ? '今天' : rec.due?.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="progress-foot">
        <span>
          <Icon name="info" size={13} />
          复习进度以本地浏览器为准，清理站点数据会一并清空。
        </span>
        <span className="tiny dim">最近 7 天活跃：{lastNDays(7).filter((d) => data.daily[d]?.n || data.daily[d]?.r).length} 天</span>
      </div>
    </div>
  )
}
