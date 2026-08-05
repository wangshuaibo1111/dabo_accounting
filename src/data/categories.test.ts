import { describe, it, expect } from "vitest"
import {
  expenseCategories,
  incomeCategories,
  getCategories,
  getCategoryL1List,
  getCategoryL2List,
  isPresetCategory,
  mergeCategories,
  getEditableCategories,
  getCategoryIcon,
} from "./categories"

describe("分类数据模块", () => {
  // ========== getCategories ==========
  describe("getCategories", () => {
    it("应返回支出分类列表", () => {
      const result = getCategories("expense")
      expect(result).toBe(expenseCategories)
      expect(result.length).toBe(11)
    })

    it("应返回收入分类列表", () => {
      const result = getCategories("income")
      expect(result).toBe(incomeCategories)
      expect(result.length).toBe(5)
    })
  })

  // ========== getCategoryL1List ==========
  describe("getCategoryL1List", () => {
    it("应返回所有一级支出分类名称", () => {
      const list = getCategoryL1List("expense")
      expect(list).toContain("餐饮饮食")
      expect(list).toContain("交通出行")
      expect(list).toContain("其他支出")
      expect(list.length).toBe(11)
    })

    it("应返回所有一级收入分类名称", () => {
      const list = getCategoryL1List("income")
      expect(list).toContain("工资收入")
      expect(list).toContain("其他收入")
      expect(list.length).toBe(5)
    })
  })

  // ========== getCategoryL2List ==========
  describe("getCategoryL2List", () => {
    it("应返回指定一级分类的二级分类", () => {
      const list = getCategoryL2List("expense", "餐饮饮食")
      expect(list).toEqual(["三餐", "零食", "水果", "饮品", "外卖", "聚餐"])
    })

    it("一级分类不存在时应返回空数组", () => {
      const list = getCategoryL2List("expense", "不存在的分类")
      expect(list).toEqual([])
    })
  })

  // ========== isPresetCategory ==========
  describe("isPresetCategory", () => {
    it("预置分类应返回 true", () => {
      expect(isPresetCategory("餐饮饮食", "expense")).toBe(true)
      expect(isPresetCategory("工资收入", "income")).toBe(true)
    })

    it("非预置分类应返回 false", () => {
      expect(isPresetCategory("自定义分类", "expense")).toBe(false)
      expect(isPresetCategory("不存在的", "income")).toBe(false)
    })
  })

  // ========== mergeCategories ==========
  describe("mergeCategories", () => {
    it("应合并预置和用户自定义分类", () => {
      const userCats = [
        { id: "u1", name: "宠物开销", icon: "🐱", children: ["猫粮", "猫砂"] },
      ]
      const merged = mergeCategories("expense", userCats)
      // 预置 11 个 + 自定义 1 个
      expect(merged.length).toBe(12)
      // 预置分类在前
      expect(merged[0].isPreset).toBe(true)
      expect(merged[0].name).toBe("餐饮饮食")
      // 自定义分类在后
      const custom = merged[11]
      expect(custom.isPreset).toBe(false)
      expect(custom.name).toBe("宠物开销")
      expect(custom.userCategoryId).toBe("u1")
    })

    it("无用户分类时应只返回预置分类", () => {
      const merged = mergeCategories("income", [])
      expect(merged.length).toBe(5)
      expect(merged.every((c) => c.isPreset)).toBe(true)
    })
  })

  // ========== getEditableCategories ==========
  describe("getEditableCategories", () => {
    it("应只返回用户自定义分类（非预置）", () => {
      const userCats = [
        { id: "u1", name: "宠物开销", icon: "🐱", children: ["猫粮"] },
        { id: "u2", name: "健身", icon: "💪", children: ["健身房", "蛋白粉"] },
      ]
      const editable = getEditableCategories("expense", userCats)
      expect(editable.length).toBe(2)
      expect(editable.every((c) => !c.isPreset)).toBe(true)
      expect(editable[0].name).toBe("宠物开销")
    })
  })

  // ========== getCategoryIcon ==========
  describe("getCategoryIcon", () => {
    it("应返回支出分类的图标", () => {
      expect(getCategoryIcon("餐饮饮食")).toBe("🍽️")
      expect(getCategoryIcon("交通出行")).toBe("🚗")
    })

    it("应返回收入分类的图标", () => {
      expect(getCategoryIcon("工资收入")).toBe("💼")
    })

    it("不存在的分类应返回默认图标 📦", () => {
      expect(getCategoryIcon("不存在的")).toBe("📦")
    })
  })

  // ========== 预置分类数据完整性 ==========
  describe("预置分类数据完整性", () => {
    it("每个支出分类都应有名称、图标和至少一个子分类", () => {
      for (const cat of expenseCategories) {
        expect(cat.name).toBeTruthy()
        expect(cat.icon).toBeTruthy()
        expect(cat.children.length).toBeGreaterThan(0)
      }
    })

    it("每个收入分类都应有名称、图标和至少一个子分类", () => {
      for (const cat of incomeCategories) {
        expect(cat.name).toBeTruthy()
        expect(cat.icon).toBeTruthy()
        expect(cat.children.length).toBeGreaterThan(0)
      }
    })

    it("支出分类总数应为 11 个", () => {
      expect(expenseCategories.length).toBe(11)
    })

    it("收入分类总数应为 5 个", () => {
      expect(incomeCategories.length).toBe(5)
    })
  })
})
