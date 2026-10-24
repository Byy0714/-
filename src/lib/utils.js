/** 通用工具函数 */

import {
  bumpRequest,
  getNativeTts,
  isLatestRequest,
  isNativeApp,
  loadNativeTts,
  speakNative,
  stopNative,
} from './nativeTts'

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const dateKey = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const parseDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const addDays = (key, days) => {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export const shiftDate = (days) => addDays(dateKey(), days)

export const daysBetween = (a, b) =>
  Math.round((parseDateKey(b) - parseDateKey(a)) / 86400000)

export const lastNDays = (n, end = dateKey()) => {
  const out = []
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(end, -i))
  return out
}

export const nextNDays = (n, start = dateKey()) => {
  const out = []
  for (let i = 0; i < n; i += 1) out.push(addDays(start, i))
  return out
}

export const shortDate = (key) => {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

export const weekdayShort = (key) => {
  const d = parseDateKey(key)
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}

export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} 分钟`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}

export const formatNumber = (n) => Number(n || 0).toLocaleString('zh-CN')

/** 连续学习天数：从今天（或昨天）往前数有学习记录的天数 */
export const calcStreak = (daily = {}, today = dateKey()) => {
  let cursor = daily[today]?.n || daily[today]?.r ? today : addDays(today, -1)
  if (!(daily[cursor]?.n || daily[cursor]?.r)) return 0
  let count = 0
  while (daily[cursor] && (daily[cursor].n || daily[cursor].r)) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

export const speak = (text, lang = 'en-US', { rate = 0.9, onEnd } = {}) => {
  if (!text) {
    if (onEnd) onEnd()
    return false
  }

  // Android APK：WebView 不支持 speechSynthesis，走原生 TextToSpeech
  const native = getNativeTts()
  if (native) {
    bumpRequest() // 作废仍在排队的请求
    speakNative(native, text, lang, rate, onEnd)
    return true
  }
  if (isNativeApp()) {
    // 原生插件还在加载中，就绪后再播（只播最后一次点击）
    const id = bumpRequest()
    loadNativeTts().then((tts) => {
      if (!tts || !isLatestRequest(id)) return
      speakNative(tts, text, lang, rate, onEnd)
    })
    return true
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd()
    return false
  }
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    u.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const exact = voices.find((v) => v.lang === lang)
    const loose = voices.find((v) => v.lang.replace('_', '-').startsWith(lang.split('-')[0]))
    if (exact || loose) u.voice = exact || loose
    u.onend = () => {
      if (onEnd) onEnd()
    }
    u.onerror = () => {
      if (onEnd) onEnd()
    }
    window.speechSynthesis.speak(u)
    return true
  } catch {
    if (onEnd) onEnd()
    return false
  }
}

export const stopSpeaking = () => {
  const native = getNativeTts()
  if (native) {
    stopNative(native)
    return
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/** 根据中文释义生成选项干扰项时的清洗 */
export const cleanTrans = (text = '') =>
  text.replace(/^[a-z]+\.\s*/i, '').replace(/\s+/g, ' ').trim()
