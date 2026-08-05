/**
 * 安全解析 JSON 数组，失败时返回默认值
 */
export function safeParseJSONArray(json: string, fallback: string[] = ['其他']): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return fallback
  } catch {
    console.warn('JSON 解析失败，使用默认值:', json.substring(0, 50))
    return fallback
  }
}
