import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { WORD_MAP, courseWords } from '../data/words'
import { REVIEW_INTERVALS, REVIEW_STAGES } from '../data/plan'
import {
  addDays,
  calcStreak,
  dateKey,
  daysBetween,
  formatDuration,
  nextNDays,
  uid,
} from '../lib/utils'

/* ============================================================
   本地存储安全层
   - 命名空间锁定在 cetpass_*，版本号升级时自动迁移旧数据
   - 迁移策略：只复制不删除，新旧 key 同时存在，避免升级失败导致数据丢失
   - ⚠️ 任何修改前必须阅读项目根目录 STORAGE_RULES.md，违反其中红线可能导致用户数据丢失
   ============================================================ */
const STORAGE_VERSION = 2
const KEY_PREFIX = 'cetpass_'
const PROFILES_KEY = `${KEY_PREFIX}profiles_v${STORAGE_VERSION}`
const ACTIVE_KEY = `${KEY_PREFIX}active_v${STORAGE_VERSION}`
const STATE_PREFIX = `${KEY_PREFIX}state_v${STORAGE_VERSION}_`

// 数据结构版本：未来如果 words / daily 的字段变化，在这里升级并写迁移逻辑
const SCHEMA_VERSION = 1

// 历史版本号（用于自动迁移）。升级 STORAGE_VERSION 时把旧值加到这里。
const LEGACY_VERSIONS = [1]

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#7C6CFF,#38C8FF)',
  'linear-gradient(135deg,#FF6FA5,#FFB168)',
  'linear-gradient(135deg,#3BE0A9,#38C8FF)',
  'linear-gradient(135deg,#FFC65C,#FF7A6B)',
  'linear-gradient(135deg,#9B8CFF,#FF8AD4)',
  'linear-gradient(135deg,#4ADEDE,#7C6CFF)',
]

const emptyData = () => ({
  schemaVersion: SCHEMA_VERSION,
  course: null,
  words: {},
  daily: {},
  paused: false,
  settings: { autoSpeak: true },
  createdAt: Date.now(),
})

/**
 * 跨版本读取单个 key：先读当前版本，不存在则回退到历史版本。
 * 用于防止「升级后 key 改名 → 用户数据读不到 → 看起来丢了」的问题。
 */
const getItemFallback = (currentKey) => {
  try {
    const raw = localStorage.getItem(currentKey)
    if (raw !== null) return raw
  } catch {
    /* 忽略 */
  }
  // 回退历史版本
  for (const v of LEGACY_VERSIONS) {
    if (v === STORAGE_VERSION) continue
    const legacyKey = currentKey.replace(`_v${STORAGE_VERSION}`, `_v${v}`)
    try {
      const raw = localStorage.getItem(legacyKey)
      if (raw !== null) return raw
    } catch {
      /* 忽略 */
    }
  }
  return null
}

/**
 * 数据结构迁移。每次 SCHEMA_VERSION 升级时，在这里补一段 fromVersion→toVersion 的处理。
 * 原则：只补字段、不删字段、不改已有值，最大程度兼容旧数据。
 */
const migrateData = (saved) => {
  const fromVersion = saved?.schemaVersion || 0
  let data = saved
  // 0 → 1：补齐 schemaVersion
  if (fromVersion < 1) {
    data = { schemaVersion: 1, ...data }
  }
  // 未来升级示例：
  // if (fromVersion < 2) { data = { ...data, newField: defaultValue } }
  return { ...data, schemaVersion: SCHEMA_VERSION }
}

const readProfiles = () => {
  try {
    const raw = getItemFallback(PROFILES_KEY)
    const list = JSON.parse(raw || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const writeProfiles = (list) => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list))
    return { ok: true }
  } catch (err) {
    if (err?.name === 'QuotaExceededError') return { ok: false, quota: true }
    return { ok: false }
  }
}

const readData = (id) => {
  try {
    const raw = getItemFallback(STATE_PREFIX + id)
    if (!raw) return emptyData()
    const saved = JSON.parse(raw)
    const migrated = migrateData(saved)
    return {
      ...emptyData(),
      ...migrated,
      words: migrated.words || {},
      daily: migrated.daily || {},
      settings: { ...emptyData().settings, ...(migrated.settings || {}) },
    }
  } catch {
    // JSON 损坏：返回空数据，但不删除原 key，给用户留手动恢复的机会
    return emptyData()
  }
}

const writeData = (id, data) => {
  try {
    localStorage.setItem(STATE_PREFIX + id, JSON.stringify(data))
    return { ok: true }
  } catch (err) {
    if (err?.name === 'QuotaExceededError') return { ok: false, quota: true }
    return { ok: false }
  }
}

const loadSession = () => {
  const profiles = readProfiles()
  let activeId = null
  try {
    activeId = getItemFallback(ACTIVE_KEY)
  } catch {
    activeId = null
  }
  const profile = profiles.find((p) => p.id === activeId) || null
  if (!profile) return { profile: null, data: emptyData() }
  return { profile, data: readData(profile.id) }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(loadSession)
  const [profiles, setProfiles] = useState(readProfiles)
  const [toasts, setToasts] = useState([])
  const timers = useRef([])
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    if (!session.profile) return
    const res = writeData(session.profile.id, session.data)
    try {
      localStorage.setItem(ACTIVE_KEY, session.profile.id)
    } catch {
      /* 忽略 */
    }
    if (!res.ok && res.quota) {
      notify(
        '存储空间不足',
        '浏览器本地存储已满，当前学习进度可能未保存。请在账号页删除旧账号或清理浏览器数据后再继续。',
        'info'
      )
    }
  }, [session])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    []
  )

  // 页面关闭/刷新前强制落盘，避免 useEffect 还没来得及写入就被卸载
  useEffect(() => {
    const flush = () => {
      const s = sessionRef.current
      if (!s.profile) return
      try {
        localStorage.setItem(STATE_PREFIX + s.profile.id, JSON.stringify(s.data))
        localStorage.setItem(ACTIVE_KEY, s.profile.id)
      } catch {
        /* 忽略 */
      }
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [])

  const notify = useCallback((title, message = '', icon = 'sparkles') => {
    const id = uid('toast')
    setToasts((t) => [...t.slice(-3), { id, title, message, icon }])
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3600)
    timers.current.push(timer)
  }, [])

  const createProfile = useCallback((name, gradient) => {
    const clean = name.trim()
    if (!clean) return { ok: false, error: '给这个本地账号起一个名字' }
    if (clean.length > 12) return { ok: false, error: '名字最多 12 个字符' }
    if (profiles.some((p) => p.name.trim().toLowerCase() === clean.toLowerCase())) {
      return { ok: false, error: '这个名称已经被使用，换一个吧' }
    }
    const profile = {
      id: uid('u'),
      name: clean,
      gradient: gradient || AVATAR_GRADIENTS[profiles.length % AVATAR_GRADIENTS.length],
      createdAt: dateKey(),
    }
    const nextProfiles = [...profiles, profile]
    writeProfiles(nextProfiles)
    setProfiles(nextProfiles)
    setSession({ profile, data: emptyData() })
    return { ok: true, profile }
  }, [profiles])

  const selectProfile = useCallback((id) => {
    const profile = profiles.find((p) => p.id === id)
    if (!profile) return
    setSession({ profile, data: readData(id) })
  }, [profiles])

  const leaveProfile = useCallback(() => {
    try {
      localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* 忽略 */
    }
    setSession({ profile: null, data: emptyData() })
  }, [])

  const deleteProfile = useCallback(
    (id) => {
      const nextProfiles = profiles.filter((p) => p.id !== id)
      writeProfiles(nextProfiles)
      setProfiles(nextProfiles)
      try {
        localStorage.removeItem(STATE_PREFIX + id)
      } catch {
        /* 忽略 */
      }
      if (session.profile?.id === id) {
        leaveProfile()
        notify('本地账号已删除', '该账号的学习记录同时被移除', 'trash')
      }
    },
    [profiles, session.profile, leaveProfile, notify]
  )

  const getProfileSummary = useCallback((id) => {
    const data = readData(id)
    const words = Object.values(data.words || {})
    return {
      learned: words.length,
      mastered: words.filter((w) => w.stage >= REVIEW_STAGES).length,
      streak: calcStreak(data.daily || {}),
      course: data.course,
      todayDone:
        (data.daily?.[dateKey()]?.n || 0) + (data.daily?.[dateKey()]?.r || 0),
    }
  }, [])

  const startCourse = useCallback((course) => {
    setSession((prev) => ({
      ...prev,
      data: { ...prev.data, course: { ...course, startedAt: dateKey() } },
    }))
  }, [])

  const updateCourse = useCallback((patch) => {
    setSession((prev) => ({
      ...prev,
      data: { ...prev.data, course: prev.data.course ? { ...prev.data.course, ...patch } : null },
    }))
  }, [])

  const setPaused = useCallback((paused) => {
    setSession((prev) => ({ ...prev, data: { ...prev.data, paused } }))
  }, [])

  const updateSettings = useCallback((patch) => {
    setSession((prev) => ({
      ...prev,
      data: { ...prev.data, settings: { ...prev.data.settings, ...patch } },
    }))
  }, [])

  const learnWord = useCallback((key, grade) => {
    const today = dateKey()
    setSession((prev) => {
      if (prev.data.words[key]) return prev
      const word = WORD_MAP[key]
      if (!word) return prev
      const daily = prev.data.daily[today] || { n: 0, r: 0, s: 0 }
      // 新词首次记录：默认 stage 0、due D+1
      const base = {
        stage: 0,
        due: addDays(today, 1),
        learnedAt: today,
        last: today,
        reviews: 0,
        lapses: 0,
        fuzzy: 0,
      }
      let entry = base
      if (grade === 'familiar') {
        // 认识：直接进入第 1 阶段
        entry = { ...base, stage: 1, due: addDays(today, REVIEW_INTERVALS[1]) }
      } else if (grade === 'vague') {
        // 模糊：标记一次模糊，明天复习
        entry = { ...base, fuzzy: 1 }
      } else {
        // 陌生：标记一次遗忘，明天重新学
        entry = { ...base, lapses: 1 }
      }
      return {
        ...prev,
        data: {
          ...prev.data,
          words: { ...prev.data.words, [key]: entry },
          daily: {
            ...prev.data.daily,
            [today]: { ...daily, n: daily.n + 1, s: daily.s + 22 },
          },
        },
      }
    })
  }, [])

  const reviewWord = useCallback((key, grade) => {
    const today = dateKey()
    setSession((prev) => {
      const existing = prev.data.words[key]
      if (!existing) return prev
      const daily = prev.data.daily[today] || { n: 0, r: 0, s: 0 }
      const base = { ...existing, last: today, reviews: (existing.reviews || 0) + 1 }
      let next = base
      if (grade === 'good') {
        const stage = existing.stage + 1
        if (stage >= REVIEW_STAGES) {
          next = { ...base, stage: REVIEW_STAGES, due: null }
        } else {
          next = { ...base, stage, due: addDays(today, REVIEW_INTERVALS[stage]) }
        }
      } else if (grade === 'fuzzy') {
        next = { ...base, due: addDays(today, 1), fuzzy: (existing.fuzzy || 0) + 1 }
      } else {
        next = {
          ...base,
          stage: 0,
          due: addDays(today, 1),
          lapses: (existing.lapses || 0) + 1,
        }
      }
      return {
        ...prev,
        data: {
          ...prev.data,
          words: { ...prev.data.words, [key]: next },
          daily: {
            ...prev.data.daily,
            [today]: { ...daily, r: daily.r + 1, s: daily.s + 7 },
          },
        },
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      data: { ...emptyData(), course: prev.data.course, settings: prev.data.settings },
    }))
    notify('学习记录已清空', '课程计划保留，单词进度重新开始', 'refresh')
  }, [notify])

  /* ---------- 进度备份与恢复 ---------- */
  // 导出当前账号的全部进度为 JSON（不涉及 key 变更，安全）
  const exportProgress = useCallback(() => {
    if (!session.profile) return
    const payload = {
      app: 'cetpass',
      format: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        name: session.profile.name,
        gradient: session.profile.gradient,
      },
      data: session.data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cetpass-${session.profile.name}-${dateKey()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('已导出进度备份', `文件：cetpass-${session.profile.name}-${dateKey()}.json`, 'download')
  }, [session, notify])

  // 解析备份文件：校验 + 迁移，返回可应用的数据（不写入，等用户确认）
  const parseBackup = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const payload = JSON.parse(String(e.target?.result || ''))
          if (payload.app !== 'cetpass' || !payload.data || typeof payload.data !== 'object') {
            throw new Error('文件格式不正确，不是 CETPass 备份')
          }
          const data = migrateData(payload.data)
          // 基础结构校验
          if (typeof data.words !== 'object' || data.words === null) {
            throw new Error('备份数据缺少 words 字段')
          }
          resolve({
            ok: true,
            data,
            profileName: payload.profile?.name || '未命名账号',
            exportedAt: payload.exportedAt,
          })
        } catch (err) {
          reject(err instanceof Error ? err : new Error('备份文件解析失败'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }, [])

  // 用备份数据覆盖当前账号的进度（用户已确认）
  const applyBackup = useCallback((data) => {
    setSession((prev) => ({
      ...prev,
      data: { ...migrateData(data), schemaVersion: SCHEMA_VERSION },
    }))
    notify('进度已恢复', '备份数据已写入当前账号', 'upload')
  }, [notify])

  const derived = useMemo(() => {
    const data = session.data
    const today = dateKey()
    if (!session.profile) {
      return {
        today,
        dueKeys: [],
        newKeys: [],
        courseWords: [],
        courseLearned: 0,
        courseTotal: 0,
        coursePercent: 0,
        newPool: [],
        newRemaining: 0,
        todayRecord: { n: 0, r: 0, s: 0 },
        todayDone: 0,
        todayTotal: 0,
        todayPercent: 0,
        streak: 0,
        mastered: 0,
        learning: 0,
        dueCount: 0,
        forecast: [],
        levelStats: [],
        planDay: 0,
        stats: {},
      }
    }

    const allWords = data.words || {}
    const dueKeys = Object.entries(allWords)
      .filter(([, v]) => v.stage < REVIEW_STAGES && v.due && v.due <= today)
      .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : b[1].stage - a[1].stage))
      .map(([key]) => key)

    const list = data.course ? courseWords(data.course.exam, data.course.mode) : []
    const learnedInCourse = list.filter((w) => allWords[w.key]).length
    const newPool = list.filter((w) => !allWords[w.key])
    const todayRecord = data.daily[today] || { n: 0, r: 0, s: 0 }
    const remainingQuota = data.course
      ? Math.max(0, data.course.dailyNew - (todayRecord.n || 0))
      : 0
    const newRemaining = data.paused ? 0 : Math.min(remainingQuota, newPool.length)
    const newKeys = newPool.slice(0, newRemaining).map((w) => w.key)

    const todayDone = (todayRecord.n || 0) + (todayRecord.r || 0)
    const todayTotal = todayDone + dueKeys.length + newRemaining
    const todayPercent = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

    const words = Object.values(allWords)
    const mastered = words.filter((w) => w.stage >= REVIEW_STAGES).length
    const learning = words.length - mastered

    const forecast = nextNDays(14).map((date, index) => {
      let count = 0
      Object.values(allWords).forEach((w) => {
        if (w.stage >= REVIEW_STAGES || !w.due) return
        if (w.due === date || (index === 0 && w.due < date)) count += 1
      })
      return { date, count }
    })

    const levelStats = [0, 1, 2].map((level) => {
      const total = list.filter((w) => w.level === level).length
      const learned = list.filter((w) => w.level === level && allWords[w.key]).length
      return { level, total, learned }
    })

    const planDay = data.course?.startedAt ? daysBetween(data.course.startedAt, today) + 1 : 0
    const todaySeconds = todayRecord.s || 0

    return {
      today,
      dueKeys,
      newKeys,
      courseWords: list,
      courseLearned: learnedInCourse,
      courseTotal: list.length,
      coursePercent: list.length ? Math.round((learnedInCourse / list.length) * 100) : 0,
      newPool,
      newRemaining,
      todayRecord,
      todayDone,
      todayTotal,
      todayPercent,
      streak: calcStreak(data.daily, today),
      mastered,
      learning,
      dueCount: dueKeys.length,
      forecast,
      levelStats,
      planDay,
      stats: {
        learned: words.length,
        todayMinutes: Math.round(todaySeconds / 60),
        todayTimeText: formatDuration(todaySeconds / 60),
        totalMinutes: Math.round(
          words.reduce((sum, w) => sum + 22 + (w.reviews || 0) * 7, 0) / 60
        ),
      },
    }
  }, [session])

  const value = {
    profile: session.profile,
    profiles,
    data: session.data,
    course: session.data.course,
    paused: session.data.paused,
    settings: session.data.settings,
    ...derived,
    toasts,
    notify,
    createProfile,
    selectProfile,
    getProfileSummary,
    leaveProfile,
    deleteProfile,
    startCourse,
    updateCourse,
    setPaused,
    updateSettings,
    learnWord,
    reviewWord,
    resetProgress,
    exportProgress,
    parseBackup,
    applyBackup,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
