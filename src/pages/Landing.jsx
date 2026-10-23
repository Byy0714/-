import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, AVATAR_GRADIENTS } from '../store/AppContext'
import { EXAMS, MODE_MAP } from '../data/words'
import Icon from '../components/Icon'
import { Avatar } from '../components/ui'

const FEATURES = [
  {
    icon: 'chart',
    title: '真题词频分级',
    desc: '按四六级真题句频拆出高频 / 中频 / 低频，先背最值得背的。',
    color: '#FF8A7A',
  },
  {
    icon: 'refresh',
    title: '艾宾浩斯 7 次复习',
    desc: '第 1 / 2 / 4 / 7 / 15 / 30 / 58 天自动回流，不用手排表。',
    color: '#38C8FF',
  },
  {
    icon: 'user',
    title: '纯本地多账号',
    desc: '无需注册，同名不可创建；进度保存在本机浏览器。',
    color: '#3BE0A9',
  },
]

const FLOATING = [
  { word: 'abandon', cn: '放弃', top: '18%', left: '8%', delay: '0s' },
  { word: 'inevitable', cn: '不可避免的', top: '66%', left: '4%', delay: '1.2s' },
  { word: 'contribute', cn: '促成', top: '28%', left: '76%', delay: '0.6s' },
  { word: 'sustainable', cn: '可持续的', top: '78%', left: '70%', delay: '1.8s' },
]

export default function Landing() {
  const { profiles, createProfile, selectProfile, getProfileSummary } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [gradient, setGradient] = useState(AVATAR_GRADIENTS[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const res = createProfile(name, gradient)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setBusy(true)
    setName('')
    setTimeout(() => navigate('/plan'), 220)
  }

  return (
    <div className="landing">
      <div className="aurora" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="landing-grid">
        <section className="landing-hero">
          <div className="brand landing-brand">
            <span className="brand-mark">
              <span>C</span>
            </span>
            <span className="brand-text">
              <b>CETPass</b>
              <small>四六级词频记忆引擎</small>
            </span>
          </div>

          <div className="hero-badge">
            <span className="pulse-dot" />
            无需注册 · 本地开始 · 数据留在本机
          </div>

          <h1 className="landing-title">
            把四六级词汇
            <br />
            刻进<span className="grad-text">长期记忆</span>
          </h1>
          <p className="landing-sub">
            用真题词频决定先背什么，用艾宾浩斯曲线决定什么时候复习。
            你只需要每天打开，剩下的交给排程引擎。
          </p>

          <div className="hero-stats">
            <div>
              <b>6,084</b>
              <span>全量词条</span>
            </div>
            <div>
              <b>1,372</b>
              <span>中高频核心</span>
            </div>
            <div>
              <b>7</b>
              <span>次科学复习</span>
            </div>
          </div>

          <div className="feature-list">
            {FEATURES.map((f) => (
              <div className="feature-item" key={f.title}>
                <span className="feature-ic" style={{ color: f.color, background: `${f.color}1f` }}>
                  <Icon name={f.icon} />
                </span>
                <div>
                  <b>{f.title}</b>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {FLOATING.map((w) => (
            <span
              className="float-word"
              key={w.word}
              style={{ top: w.top, left: w.left, animationDelay: w.delay }}
            >
              <b>{w.word}</b>
              <i>{w.cn}</i>
            </span>
          ))}
        </section>

        <section className="landing-panel">
          <div className="panel-glow" />
          <div className="panel-head">
            <div>
              <span className="eyebrow">Local Profiles</span>
              <h2>选择本地账号</h2>
            </div>
            <span className="chip-soft">
              <Icon name="lock" size={13} />
              仅此设备
            </span>
          </div>

          <div className="profile-list">
            {profiles.length === 0 && (
              <div className="profile-empty">
                <span className="empty-orbit">
                  <Icon name="user" size={26} />
                </span>
                <b>还没有本地账号</b>
                <p>在下方输入名字即可开始，学习记录会保存在浏览器里。</p>
              </div>
            )}
            {profiles.map((p) => {
              const summary = getProfileSummary(p.id)
              const exam = EXAMS.find((x) => x.id === summary.course?.exam)
              const mode = MODE_MAP[summary.course?.mode]
              return (
                <button
                  key={p.id}
                  className="profile-row"
                  onClick={() => {
                    selectProfile(p.id)
                    navigate(summary.course ? '/' : '/plan')
                  }}
                >
                  <Avatar name={p.name} gradient={p.gradient} size={44} />
                  <span className="profile-info">
                    <b>{p.name}</b>
                    <small>
                      {summary.course
                        ? `${exam?.name} · ${mode?.name} · 已学 ${summary.learned} 词`
                        : '尚未选择备考计划'}
                    </small>
                  </span>
                  <span className="profile-meta">
                    {summary.streak > 0 && (
                      <span className="mini-streak">
                        <Icon name="flame" size={12} />
                        {summary.streak}
                      </span>
                    )}
                    <span className="profile-go">
                      继续
                      <Icon name="arrow-right" size={15} />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="create-block">
            <div className="create-label">
              <span>新建本地账号</span>
              <i>名称不可重复</i>
            </div>
            <form onSubmit={submit} className="create-form">
              <input
                className={`input ${error ? 'has-error' : ''}`}
                placeholder="例如：小林 / Alex"
                value={name}
                maxLength={12}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                aria-label="本地账号名称"
              />
              <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
                <Icon name="plus" size={16} />
                本地开始
              </button>
            </form>
            <div className="gradient-picker">
              {AVATAR_GRADIENTS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`grad-dot ${gradient === g ? 'on' : ''}`}
                  style={{ background: g }}
                  onClick={() => setGradient(g)}
                  aria-label="选择头像颜色"
                />
              ))}
              <span className="tiny dim">选择头像颜色</span>
            </div>
            {error && (
              <p className="form-error" role="alert">
                <Icon name="info" size={14} />
                {error}
              </p>
            )}
          </div>

          <p className="panel-foot warn">
            <Icon name="info" size={14} />
            进度使用浏览器 localStorage 保存。更换域名、清理站点数据或换设备后不会同步。
          </p>
        </section>
      </div>
    </div>
  )
}
