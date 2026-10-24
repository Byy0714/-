/**
 * 原生语音合成桥接（仅 Android APK 使用）。
 *
 * Android WebView 不实现 Web Speech API 的 speechSynthesis，
 * 所以 APK 里发音会静默失效。这里改为调用 Android 原生 TextToSpeech。
 * 网站 / 桌面版不存在 Capacitor 运行时，本模块不会被加载，行为完全不变。
 */

let plugin = null
let readyPromise = null
let resolvedLang = null
let requestSeq = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 是否运行在 Capacitor 原生容器（APK）里 */
export const isNativeApp = () =>
  typeof window !== 'undefined' &&
  typeof window.Capacitor?.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform()

/** 原生 TTS 引擎是异步初始化的，轮询 stop() 直到就绪 */
const waitForEngine = async (tts) => {
  for (let i = 0; i < 40; i += 1) {
    try {
      await tts.stop()
      return true
    } catch {
      await sleep(100)
    }
  }
  return false
}

/** 预热：启动时调用一次，让原生引擎尽早完成初始化 */
export const loadNativeTts = () => {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    // 网站 / 桌面版没有 Capacitor 运行时，直接退出
    if (typeof window === 'undefined' || !window.Capacitor) return null
    // 原生桥由 Android 在页面开始加载时注入，可能略晚于首个模块脚本
    for (let i = 0; i < 20 && !isNativeApp(); i += 1) {
      await sleep(50)
    }
    if (!isNativeApp()) return null
    try {
      const mod = await import('@capacitor-community/text-to-speech')
      plugin = mod.TextToSpeech
      await waitForEngine(plugin)
      return plugin
    } catch {
      return null
    }
  })()
  return readyPromise
}

export const getNativeTts = () => plugin

/** 连点发音时只播最后一次 */
export const bumpRequest = () => {
  requestSeq += 1
  return requestSeq
}
export const isLatestRequest = (id) => id === requestSeq

const LANG_CANDIDATES = ['en-US', 'en-GB', 'en']

/** 选一个设备上真实可用的英语语言包 */
const pickLang = async (tts, fallback) => {
  if (resolvedLang) return resolvedLang
  for (const lang of LANG_CANDIDATES) {
    try {
      const { supported } = await tts.isLanguageSupported({ lang })
      if (supported) {
        resolvedLang = lang
        return lang
      }
    } catch {
      /* 继续尝试下一个 */
    }
  }
  resolvedLang = fallback
  return fallback
}

export const speakNative = async (tts, text, lang, rate, onEnd) => {
  try {
    const target = await pickLang(tts, lang)
    await tts.speak({ text, lang: target, rate, pitch: 1, volume: 1 })
  } catch {
    // 首次启动时引擎可能还没初始化完成，稍后重试一次
    try {
      await sleep(250)
      await tts.speak({ text, lang: resolvedLang || lang, rate, pitch: 1, volume: 1 })
    } catch {
      /* 设备确实不支持时静默失败 */
    }
  } finally {
    if (onEnd) onEnd()
  }
}

export const stopNative = (tts) => {
  requestSeq += 1
  tts.stop().catch(() => {})
}
