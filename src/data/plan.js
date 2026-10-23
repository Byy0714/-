/**
 * 艾宾浩斯复习排程
 * 参考：https://www.wordsscroll.com/seo/ebbinghaus-review-schedule.html
 * 每个新词在首次学习后的第 1、2、4、7、15、30、58 天各复习一次。
 */

export const REVIEW_INTERVALS = [1, 1, 2, 3, 8, 15, 28]
export const REVIEW_OFFSETS = [1, 2, 4, 7, 15, 30, 58]
export const REVIEW_STAGES = REVIEW_OFFSETS.length
export const NEW_WORD_SECONDS = 22
export const REVIEW_WORD_SECONDS = 7

export const STAGE_LABELS = ['第 1 次', '第 2 次', '第 3 次', '第 4 次', '第 5 次', '第 6 次', '第 7 次']

/** 距首次学习第 n 天要复习 */
export const reviewOffsetOf = (stage) => REVIEW_OFFSETS[stage] || null

/** 当前阶段答对后，距离下一次复习的天数 */
export const nextInterval = (stage) => REVIEW_INTERVALS[stage] || 0

/**
 * 模拟整个计划的每日负荷（假设每天按时完成，且每次复习都记得）。
 * @returns {{
 *   learnDays:number, totalDays:number, total:number, totalReviews:number,
 *   totalMinutes:number, peakWords:number, peakMinutes:number, avgMinutes:number,
 *   days:Array<{day:number,newWords:number,reviewWords:number,total:number,minutes:number}>,
 *   reviewAt:Object<number,number>, lastReviewDay:number
 * }}
 */
export function buildSchedule(total, dailyNew) {
  const perDay = Math.max(1, Math.floor(dailyNew))
  const safeTotal = Math.max(0, Math.floor(total))
  const learnDays = Math.ceil(safeTotal / perDay)
  const tail = REVIEW_OFFSETS[REVIEW_OFFSETS.length - 1]
  const lastDay = learnDays + tail

  const newByDay = {}
  for (let day = 1; day <= learnDays; day += 1) {
    newByDay[day] = Math.min(perDay, safeTotal - (day - 1) * perDay)
  }

  const days = []
  let totalReviews = 0
  let totalMinutes = 0
  let peakWords = 0
  let peakMinutes = 0
  for (let day = 1; day <= lastDay; day += 1) {
    const newWords = newByDay[day] || 0
    let reviewWords = 0
    REVIEW_OFFSETS.forEach((offset) => {
      reviewWords += newByDay[day - offset] || 0
    })
    if (!newWords && !reviewWords) continue
    const minutes = (newWords * NEW_WORD_SECONDS + reviewWords * REVIEW_WORD_SECONDS) / 60
    totalReviews += reviewWords
    totalMinutes += minutes
    peakWords = Math.max(peakWords, newWords + reviewWords)
    peakMinutes = Math.max(peakMinutes, minutes)
    days.push({ day, newWords, reviewWords, total: newWords + reviewWords, minutes })
  }

  // 到第 D+offset 天时，因艾宾浩斯复习而累计额外需要记忆的词量
  const reviewAt = {}
  REVIEW_OFFSETS.forEach((offset, i) => {
    reviewAt[offset] = Math.min(safeTotal, perDay * (i + 1))
  })

  return {
    learnDays,
    totalDays: learnDays + tail,
    total: safeTotal,
    totalReviews,
    totalMinutes,
    peakWords,
    peakMinutes,
    avgMinutes: learnDays ? totalMinutes / Math.max(1, learnDays) : 0,
    days,
    reviewAt,
    lastReviewDay: lastDay,
  }
}

/** 取计划中某一天的负荷 */
export const scheduleAt = (schedule, day) =>
  schedule.days.find((d) => d.day === day) || { day, newWords: 0, reviewWords: 0, total: 0, minutes: 0 }

/** 用于图表的最多 N 根柱子 */
export function sampleSchedule(schedule, maxBars = 64) {
  const { days } = schedule
  if (days.length <= maxBars) return days
  const bucket = Math.ceil(days.length / maxBars)
  const out = []
  for (let i = 0; i < days.length; i += bucket) {
    const slice = days.slice(i, i + bucket)
    out.push({
      day: slice[slice.length - 1].day,
      dayStart: slice[0].day,
      bucket,
      newWords: Math.round(slice.reduce((s, d) => s + d.newWords, 0) / slice.length),
      reviewWords: Math.round(slice.reduce((s, d) => s + d.reviewWords, 0) / slice.length),
      total: Math.round(slice.reduce((s, d) => s + d.total, 0) / slice.length),
      minutes: slice.reduce((s, d) => s + d.minutes, 0) / slice.length,
    })
  }
  return out
}
