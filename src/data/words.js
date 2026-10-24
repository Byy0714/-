/**
 * 词库与课程数据
 * 词条来源：
 *   1. https://cet.neea.edu.cn/res/Home/1704/55b02330ac17274664f06d9d3db8249d.pdf
 *      全国大学英语四、六级考试大纲（2016 年修订版）官方词表
 *   2. https://gitee.com/gjh888/youdaokaoshendict 有道考神词库（音标 / 释义 / 例句）
 *   3. https://www.oxfordlearnersdictionaries.com 牛津高阶（补充注音与例句）
 *
 * 四级仍按真题句频自动分级：
 *   高频  ≥ 25 句
 *   中频  12 – 24 句
 *   低频  < 12 句，或未出现在真题词频库中
 * 六级在扩充时已整体上调一级（中频→高频、低频→中频，新并入词为低频），
 * 因此六级词条自带 level 字段，不再由 freq 反推。
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
    desc: '考场复现率最高，优先攻克',
    color: '#FF8A7A',
    glow: 'rgba(255,122,106,0.28)',
  },
  {
    id: 1,
    key: 'mid',
    name: '中频',
    short: '中',
    desc: '真题中较常出现，阅读与听力主力',
    color: '#FFC65C',
    glow: 'rgba(255,198,92,0.24)',
  },
  {
    id: 2,
    key: 'low',
    name: '低频',
    short: '低',
    desc: '复现较少或考纲拓展词，用于兜底覆盖',
    color: '#8B93B5',
    glow: 'rgba(139,147,181,0.2)',
  },
]

const cleanPhone = (phonetic) => (phonetic || '').trim().replace(/^\/+|\/+$/g, '')

/** 词条支持两种格式：四级用紧凑数组，六级用带 level 的对象 */
const toWord = (exam, row) => {
  if (!Array.isArray(row)) {
    return {
      key: `${exam}:${String(row.word).toLowerCase()}`,
      exam,
      word: row.word,
      phonetic: cleanPhone(row.phonetic),
      trans: row.trans,
      freq: row.freq ?? 0,
      example: row.example || '',
      exampleCn: row.exampleCn || '',
      level: row.level ?? 2,
    }
  }

  const [word, phonetic, trans, freq, example, exampleCn] = row
  const level = freq >= HIGH_MIN ? 0 : freq >= MID_MIN ? 1 : 2
  return {
    key: `${exam}:${word.toLowerCase()}`,
    exam,
    word,
    phonetic: cleanPhone(phonetic),
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
    desc: `大学英语六级词汇，覆盖 ${countsOf(WORDS.cet6).total} 个词条，对齐官方考纲大纲。`,
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
