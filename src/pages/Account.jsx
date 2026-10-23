import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, AVATAR_GRADIENTS } from '../store/AppContext'
import { EXAM_MAP, MODE_MAP } from '../data/words'
import Icon from '../components/Icon'
import { Avatar, Modal, Toggle } from '../components/ui'

export default function Account() {
  const {
    profile,
    profiles,
    course,
    data,
    settings,
    updateSettings,
    createProfile,
    selectProfile,
    leaveProfile,
    deleteProfile,
    resetProgress,
    getProfileSummary,
    notify,
    streak,
    mastered,
    exportProgress,
    parseBackup,
    applyBackup,
  } = useApp()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [gradient, setGradient] = useState(AVATAR_GRADIENTS[0])
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [pendingBackup, setPendingBackup] = useState(null)
  const fileRef = useRef(null)

  const exam = course ? EXAM_MAP[course.exam] : null
  const mode = course ? MODE_MAP[course.mode] : null
  const learned = Object.keys(data.words).length

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const res = createProfile(name, gradient)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setName('')
    notify('本地账号已创建', `${res.profile.name} 已切换到新账号`, 'user')
    navigate('/plan')
  }

  const switchTo = (id) => {
    if (id === profile?.id) return
    const target = profiles.find((p) => p.id === id)
    selectProfile(id)
    const summary = getProfileSummary(id)
    notify('已切换账号', `现在是 ${target?.name} 的学习空间`, 'shuffle')
    navigate(summary.course ? '/' : '/plan')
  }

  const doConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'delete') {
      const isSelf = confirm.id === profile?.id
      const remaining = profiles.filter((p) => p.id !== confirm.id)
      deleteProfile(confirm.id)
      setConfirm(null)
      if (isSelf) {
        if (remaining.length) {
          selectProfile(remaining[0].id)
          navigate(getProfileSummary(remaining[0].id).course ? '/' : '/plan')
        } else {
          navigate('/')
        }
      }
    } else if (confirm.type === 'import') {
      if (pendingBackup) {
        applyBackup(pendingBackup.data)
        setPendingBackup(null)
        setConfirm(null)
        notify('进度恢复成功', '备份数据已写入当前账号', 'upload')
      }
    } else {
      resetProgress()
      setConfirm(null)
    }
  }

  const handleExport = () => {
    exportProgress()
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await parseBackup(file)
      setPendingBackup(result)
      setConfirm({ type: 'import' })
    } catch (err) {
      notify('导入失败', err?.message || '备份文件解析失败', 'info')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="page account-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Local Profiles</span>
          <h1>本地账号</h1>
          <p className="sub">所有账号与学习进度只保存在这台设备的浏览器里，不上传任何服务器。</p>
        </div>
        <div className="head-chips">
          <span className="chip-soft">
            <Icon name="lock" size={13} />
            仅此设备
          </span>
          <button className="btn btn-ghost" onClick={leaveProfile}>
            <Icon name="logout" />
            退出到选择页
          </button>
        </div>
      </div>

      <div className="account-grid">
        <div className="account-main">
          <section className="card account-current">
            <div className="account-glow" aria-hidden="true" />
            <div className="account-identity">
              <Avatar name={profile?.name} gradient={profile?.gradient} size={72} />
              <div>
                <span className="eyebrow">当前账号</span>
                <h2>{profile?.name}</h2>
                <span className="account-meta">
                  创建于 {profile?.createdAt} · 第 {profiles.findIndex((p) => p.id === profile?.id) + 1} /
                  {profiles.length} 个本地账号
                </span>
              </div>
            </div>

            <div className="account-stats">
              <div>
                <b>{learned}</b>
                <span>已学单词</span>
              </div>
              <div>
                <b>{mastered}</b>
                <span>长期记忆</span>
              </div>
              <div>
                <b>{streak} 天</b>
                <span>连续学习</span>
              </div>
            </div>

            <div className="account-course">
              <span className="account-course-ic" style={{ color: exam?.color || '#8B93B5' }}>
                <Icon name={exam ? 'route' : 'compass'} />
              </span>
              <div>
                <b>{course ? `${exam.name} · ${mode.name}` : '尚未选择学习计划'}</b>
                <span>
                  {course
                    ? `每天 ${course.dailyNew} 个新词 · 起于 ${course.startedAt}`
                    : '去「计划」页选择考试范围与每日词量'}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/plan')}>
                {course ? '调整计划' : '去制定计划'}
                <Icon name="chevron-right" size={14} />
              </button>
            </div>

            <div className="account-actions">
              <button
                className="btn btn-danger-ghost"
                onClick={() => setConfirm({ type: 'reset' })}
                disabled={!learned}
              >
                <Icon name="refresh" />
                清空学习记录
              </button>
              <button
                className="btn btn-danger-ghost"
                onClick={() => setConfirm({ type: 'delete', id: profile?.id })}
              >
                <Icon name="trash" />
                删除此账号
              </button>
            </div>
          </section>

          <section className="card switch-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">Switch</span>
                <h3>切换本地账号</h3>
              </div>
              <span className="tiny dim">{profiles.length} 个账号</span>
            </div>
            <div className="profile-list">
              {profiles.map((p) => {
                const summary = getProfileSummary(p.id)
                const isCurrent = p.id === profile?.id
                return (
                  <div className={`profile-row ${isCurrent ? 'current' : ''}`} key={p.id}>
                    <Avatar name={p.name} gradient={p.gradient} size={42} />
                    <span className="profile-info">
                      <b>
                        {p.name}
                        {isCurrent && <em className="profile-badge">当前</em>}
                      </b>
                      <small>
                        {summary.course
                          ? `已学 ${summary.learned} 词 · 掌握 ${summary.mastered}`
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
                      {isCurrent ? (
                        <span className="tiny dim">使用中</span>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => switchTo(p.id)}>
                          切换
                        </button>
                      )}
                      <button
                        className="btn-icon danger"
                        onClick={() => setConfirm({ type: 'delete', id: p.id })}
                        aria-label={`删除 ${p.name}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="account-side">
          <section className="card create-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">New Profile</span>
                <h3>新建本地账号</h3>
              </div>
              <span className="chip-soft">
                <Icon name="plus" size={13} />
                离线可用
              </span>
            </div>
            <p className="create-tip">名称不可与已有账号重复，创建后立即切换到新账号。</p>
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
                aria-label="新账号名称"
              />
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
                <Avatar name={name || '新'} gradient={gradient} size={30} />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim()}>
                <Icon name="plus" size={16} />
                创建并开始
              </button>
              {error && (
                <p className="form-error" role="alert">
                  <Icon name="info" size={14} />
                  {error}
                </p>
              )}
            </form>
          </section>

          <section className="card settings-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">Preferences</span>
                <h3>学习偏好</h3>
              </div>
            </div>
            <div className="setting-row">
              <span className="setting-copy">
                <b>自动发音</b>
                <span>翻到新卡片时自动朗读单词</span>
              </span>
              <Toggle
                checked={settings.autoSpeak}
                onChange={(value) => updateSettings({ autoSpeak: value })}
                label="自动发音"
              />
            </div>
            <div className="setting-row">
              <span className="setting-copy">
                <b>艾宾浩斯复习</b>
                <span>第 1 / 2 / 4 / 7 / 15 / 30 / 58 天自动回流</span>
              </span>
              <span className="setting-static">固定开启</span>
            </div>
          </section>

          <section className="card backup-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">Backup</span>
                <h3>进度备份与恢复</h3>
              </div>
              <Icon name="archive" size={18} />
            </div>
            <p className="create-tip">
              导出当前账号的全部学习进度为 JSON 文件，换域名、清缓存或换设备后可导入恢复。
            </p>
            <div className="backup-actions">
              <button className="btn btn-ghost" onClick={handleExport}>
                <Icon name="download" size={15} />
                导出进度 JSON
              </button>
              <button className="btn btn-primary" onClick={handleImportClick}>
                <Icon name="upload" size={15} />
                导入 JSON 恢复
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <p className="backup-note">
              <Icon name="info" size={12} />
              导入会用备份数据覆盖当前账号进度，请先确认当前账号是目标账号。
            </p>
          </section>

          <section className="card data-card">
            <div className="card-head">
              <div>
                <span className="eyebrow">Storage</span>
                <h3>数据保存在哪里</h3>
              </div>
              <Icon name="info" size={18} />
            </div>
            <ul className="data-list">
              <li>账号列表与每个账号的学习记录都写入浏览器 localStorage。</li>
              <li>部署到网站后同样有效，但只对同一域名、同一浏览器可见。</li>
              <li>清理站点数据、换浏览器或换设备后，本地进度不会自动同步。</li>
            </ul>
            <p className="data-foot">
              <Icon name="lock" size={13} />
              无需注册登录，也不会上传任何个人信息
            </p>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === 'delete'
            ? '删除本地账号？'
            : confirm?.type === 'import'
              ? '恢复进度备份？'
              : '清空学习记录？'
        }
        width={420}
      >
        <p className="modal-text">
          {confirm?.type === 'delete'
            ? `账号「${profiles.find((p) => p.id === confirm.id)?.name || ''}」及其全部学习进度会从本机永久删除，无法恢复。`
            : confirm?.type === 'import'
              ? `将用来自「${pendingBackup?.profileName || '备份文件'}」的进度覆盖当前账号「${profile?.name || ''}」的所有数据，此操作不可撤销。`
              : '该账号下所有单词记忆阶段、复习排期与学习记录都会被清空，学习计划会保留。'}
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
            取消
          </button>
          {confirm?.type === 'import' ? (
            <button className="btn btn-primary" onClick={doConfirm}>
              <Icon name="upload" size={15} />
              确认恢复
            </button>
          ) : (
            <button className="btn btn-danger" onClick={doConfirm}>
              <Icon name="trash" size={15} />
              确认{confirm?.type === 'delete' ? '删除' : '清空'}
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}
