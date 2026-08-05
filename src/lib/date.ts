/**
 * 格式化日期为 YYYY-MM-DD 字符串
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 获取某年某月的第一天 YYYY-MM-DD
 */
export function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/**
 * 获取某年某月之后一个月的第一天（正确处理12月跨年）
 */
export function getNextMonthStart(year: number, month: number): string {
  // month 是 1-12
  if (month === 12) {
    return `${year + 1}-01-01`
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/**
 * 获取 N 天前的日期字符串
 */
export function getDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatISODate(d)
}

/**
 * 获取上个月的年和月
 */
export function getLastMonth(): { year: number; month: number } {
  const now = new Date()
  const m = now.getMonth() + 1
  if (m === 1) return { year: now.getFullYear() - 1, month: 12 }
  return { year: now.getFullYear(), month: m - 1 }
}

/**
 * 获取上个月最后一天的日期字符串
 */
export function getLastMonthEnd(): string {
  const d = new Date()
  d.setDate(0)
  return formatISODate(d)
}
