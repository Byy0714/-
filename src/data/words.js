/**
 * 词库与课程数据
 * 全量词条来自 https://gitee.com/gjh888/youdaokaoshendict（CET4 / CET6）
 * 频率分级依据 https://english-exam.lazynote.cn/exam-words/ 的真题句频
 *
 * 分级规则：
 *   高频  ≥ 25 句
 *   中频  12 – 24 句
 *   低频  < 12 句，或未出现在真题词频库中
 * 学习顺序固定为：高频 → 中频 → 低频
 */

import cet4Raw from './vocab/cet4.json'
import cet6Raw from './vocab/cet6.json'

export const HIGH_MIN = 25
export const MID_MIN = 12

export const LEVELS = [
  {
    id: 0,
    key: 'high',
    name: '高频',
    short: '高',
    desc: '真题中出现 25 句以上，考场复现率最高',
    color: '#FF8A7A',
    glow: 'rgba(255,122,106,0.28)',
  },
  {
    id: 1,
    key: 'mid',
    name: '中频',
    short: '中',
    desc: '真题中出现 12–24 句，阅读与听力主力词',
    color: '#FFC65C',
    glow: 'rgba(255,198,92,0.24)',
  },
  {
    id: 2,
    key: 'low',
    name: '低频',
    short: '低',
    desc: '真题复现较少或未收录，用于兜底覆盖',
    color: '#8B93B5',
    glow: 'rgba(139,147,181,0.2)',
  },
]

const toWord = (exam, row) => {
  const [word, phonetic, trans, freq, example, exampleCn] = row
  const level = freq >= HIGH_MIN ? 0 : freq >= MID_MIN ? 1 : 2
  return {
    key: `${exam}:${word.toLowerCase()}`,
    exam,
    word,
    phonetic: (phonetic || '').trim().replace(/^\/+|\/+$/g, ''),
    trans,
    freq,
    example,
    exampleCn,
    level,
  }
}

export const WORDS = {
  cet4: cet4Raw.map((row) => toWord('cet4', row)),
  cet6: cet6Raw.map((row) => toWord('cet6', row)),
}

export const WORD_MAP = Object.fromEntries(
  [...WORDS.cet4, ...WORDS.cet6].map((word) => [word.key, word])
)

const countsOf = (list) => ({
  total: list.length,
  high: list.filter((w) => w.level === 0).length,
  mid: list.filter((w) => w.level === 1).length,
  low: list.filter((w) => w.level === 2).length,
})

export const EXAMS = [
  {
    id: 'cet4',
    name: '四级',
    en: 'CET-4',
    glyph: 'C4',
    color: '#6E7BFF',
    color2: '#38C8FF',
    desc: '大学英语四级词汇，覆盖 3739 个词条，按真题词频重排。',
    ...countsOf(WORDS.cet4),
  },
  {
    id: 'cet6',
    name: '六级',
    en: 'CET-6',
    glyph: 'C6',
    color: '#FF7A9C',
    color2: '#FFB168',
    desc: '大学英语六级词汇，2345 个词条，聚焦更高阶表达。',
    ...countsOf(WORDS.cet6),
  },
]

export const EXAM_MAP = Object.fromEntries(EXAMS.map((e) => [e.id, e]))

/** 已按「高频 → 中频 → 低频」排好序的课程词表 */
export const COURSE_LISTS = {
  cet4: {
    core: WORDS.cet4.filter((w) => w.level < 2),
    all: WORDS.cet4,
  },
  cet6: {
    core: WORDS.cet6.filter((w) => w.level < 2),
    all: WORDS.cet6,
  },
}

export const MODES = [
  {
    id: 'core',
    name: '中高频速学',
    short: '速学',
    tag: '推荐',
    desc: '只学真题里反复出现的高频与中频词，用最短时间拿下考场主力词汇。',
    icon: 'bolt',
    color: '#FFC65C',
  },
  {
    id: 'all',
    name: '全词汇学习',
    short: '全量',
    desc: '按高频 → 中频 → 低频完整覆盖考纲词库，适合长线备考与查漏补缺。',
    icon: 'layers',
    color: '#7C6CFF',
  },
]

export const MODE_MAP = Object.fromEntries(MODES.map((m) => [m.id, m]))

export const courseWords = (exam, mode) => COURSE_LISTS[exam]?.[mode] || []

export const courseCount = (exam, mode) => courseWords(exam, mode).length

export const levelCounts = (list) => countsOf(list)

export const getWord = (key) => WORD_MAP[key]
