import { describe, it, expect } from "vitest"
import { safeParseJSONArray } from "./utils"

describe("工具函数模块", () => {
  // ========== safeParseJSONArray ==========
  describe("safeParseJSONArray", () => {
    it("应正确解析合法的 JSON 数组", () => {
      const result = safeParseJSONArray('["猫粮", "猫砂", "玩具"]')
      expect(result).toEqual(["猫粮", "猫砂", "玩具"])
    })

    it("空数组应返回 fallback", () => {
      const result = safeParseJSONArray("[]")
      expect(result).toEqual(["其他"])
    })

    it("非法的 JSON 字符串应返回 fallback", () => {
      const result = safeParseJSONArray("这不是JSON")
      expect(result).toEqual(["其他"])
    })

    it("空字符串应返回 fallback", () => {
      const result = safeParseJSONArray("")
      expect(result).toEqual(["其他"])
    })

    it("应使用自定义 fallback", () => {
      const result = safeParseJSONArray("坏数据", ["默认值1", "默认值2"])
      expect(result).toEqual(["默认值1", "默认值2"])
    })

    it("非数组的合法 JSON 应返回 fallback", () => {
      const result = safeParseJSONArray('{"a": 1}')
      expect(result).toEqual(["其他"])
    })
  })
})
