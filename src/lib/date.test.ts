import { describe, it, expect } from "vitest"
import {
  formatISODate,
  getMonthStart,
  getNextMonthStart,
  getLastMonth,
} from "./date"

describe("日期工具模块", () => {
  // ========== formatISODate ==========
  describe("formatISODate", () => {
    it("应格式化为 YYYY-MM-DD 格式", () => {
      const date = new Date(2026, 7, 5) // 8月5日（月份从0开始）
      expect(formatISODate(date)).toBe("2026-08-05")
    })

    it("单数月份和日期应补零", () => {
      const date = new Date(2026, 0, 1) // 1月1日
      expect(formatISODate(date)).toBe("2026-01-01")
    })

    it("双数月份和日期不补零", () => {
      const date = new Date(2026, 10, 15) // 11月15日
      expect(formatISODate(date)).toBe("2026-11-15")
    })
  })

  // ========== getMonthStart ==========
  describe("getMonthStart", () => {
    it("应返回该月第一天", () => {
      expect(getMonthStart(2026, 8)).toBe("2026-08-01")
    })

    it("1月应正确返回", () => {
      expect(getMonthStart(2026, 1)).toBe("2026-01-01")
    })
  })

  // ========== getNextMonthStart ==========
  describe("getNextMonthStart", () => {
    it("普通月份应返回下月第一天", () => {
      expect(getNextMonthStart(2026, 3)).toBe("2026-04-01")
    })

    it("12月应跨年返回次年1月", () => {
      expect(getNextMonthStart(2026, 12)).toBe("2027-01-01")
    })

    it("1月应返回2月", () => {
      expect(getNextMonthStart(2026, 1)).toBe("2026-02-01")
    })
  })

  // ========== getLastMonth ==========
  describe("getLastMonth", () => {
    it("应返回上个月的年和月（非1月时）", () => {
      // 当前是8月，上个月是7月
      const result = getLastMonth()
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      if (currentMonth === 1) {
        expect(result.year).toBe(now.getFullYear() - 1)
        expect(result.month).toBe(12)
      } else {
        expect(result.month).toBe(currentMonth - 1)
      }
    })
  })
})
