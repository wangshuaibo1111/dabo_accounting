import { describe, it, expect } from "vitest"
import {
  parseCSVLine,
  parseCSVText,
  validateRow,
  getAllCategoryL1Names,
  getDefaultL2,
} from "./import"

// ============================================================
// parseCSVLine — CSV 行解析
// ============================================================
describe("parseCSVLine — CSV 行解析", () => {
  it("简单逗号分隔的字段", () => {
    const result = parseCSVLine("支出,25.50,餐饮饮食,三餐,2024-08-04,食堂午饭")
    expect(result).toEqual(["支出", "25.50", "餐饮饮食", "三餐", "2024-08-04", "食堂午饭"])
  })

  it("引号包裹的字段（内含逗号）", () => {
    const result = parseCSVLine('支出,100.00,购物消费,衣服鞋帽,2024-08-04,"红色, XL码"')
    expect(result).toEqual(["支出", "100.00", "购物消费", "衣服鞋帽", "2024-08-04", "红色, XL码"])
  })

  it("引号内转义的双引号", () => {
    const result = parseCSVLine('支出,50.00,其他,其他,2024-08-04,"他说""你好"""')
    expect(result).toEqual(["支出", "50.00", "其他", "其他", "2024-08-04", '他说"你好"'])
  })

  it("空字段处理", () => {
    const result = parseCSVLine("支出,100,,,2024-08-04,")
    expect(result).toEqual(["支出", "100", "", "", "2024-08-04", ""])
  })

  it("空行应返回包含空字符串的数组", () => {
    const result = parseCSVLine("")
    expect(result).toEqual([""])
  })

  it("单个字段（无逗号）", () => {
    const result = parseCSVLine("支出")
    expect(result).toEqual(["支出"])
  })

  it("字段前后空格应去除", () => {
    const result = parseCSVLine(" 支出 , 100 , 餐饮饮食 , 三餐 ")
    expect(result).toEqual(["支出", "100", "餐饮饮食", "三餐"])
  })

  it("仅包含引号的字段应返回空字符串", () => {
    const result = parseCSVLine('支出,"",餐饮饮食')
    expect(result).toEqual(["支出", "", "餐饮饮食"])
  })

  it("含换行符的引号字段", () => {
    const result = parseCSVLine('支出,100,其他,其他,2024-08-04,"第一行\n第二行"')
    expect(result).toEqual(["支出", "100", "其他", "其他", "2024-08-04", "第一行\n第二行"])
  })
})

// ============================================================
// parseCSVText — CSV 文本解析
// ============================================================
describe("parseCSVText — CSV 文本解析", () => {
  const validCSV = [
    "类型,金额,一级分类,二级分类,日期,备注",
    "支出,25.50,餐饮饮食,三餐,2024-08-04,食堂午饭",
    "收入,5000.00,工资收入,月薪,2024-08-01,8月工资",
  ].join("\n")

  it("应正确解析标准 CSV 文本", () => {
    const rows = parseCSVText(validCSV)
    expect(rows.length).toBe(2)
    expect(rows[0]).toEqual({
      type: "支出",
      amount: "25.50",
      categoryL1: "餐饮饮食",
      categoryL2: "三餐",
      date: "2024-08-04",
      note: "食堂午饭",
    })
    expect(rows[1]).toEqual({
      type: "收入",
      amount: "5000.00",
      categoryL1: "工资收入",
      categoryL2: "月薪",
      date: "2024-08-01",
      note: "8月工资",
    })
  })

  it("应跳过空行", () => {
    const csv = [
      "类型,金额,一级分类,二级分类,日期,备注",
      "支出,25.50,餐饮饮食,三餐,2024-08-04,午饭",
      "",
      "支出,10.00,交通出行,公交地铁,2024-08-04,地铁",
    ].join("\n")
    const rows = parseCSVText(csv)
    expect(rows.length).toBe(2)
  })

  it("只有表头没有数据时应返回空数组", () => {
    const csv = "类型,金额,一级分类,二级分类,日期,备注"
    const rows = parseCSVText(csv)
    expect(rows).toEqual([])
  })

  it("空文本应返回空数组", () => {
    const rows = parseCSVText("")
    expect(rows).toEqual([])
  })

  it("仅空白字符的文本应返回空数组", () => {
    const rows = parseCSVText("   \n  \n  ")
    expect(rows).toEqual([])
  })

  it("应正确处理 BOM 头", () => {
    const csv = "﻿类型,金额,一级分类,二级分类,日期,备注\n支出,25.50,餐饮饮食,三餐,2024-08-04,午饭"
    const rows = parseCSVText(csv)
    expect(rows.length).toBe(1)
    expect(rows[0].type).toBe("支出")
  })

  it("应正确处理 CRLF 换行符", () => {
    const csv = "类型,金额,一级分类,二级分类,日期,备注\r\n支出,25.50,餐饮饮食,三餐,2024-08-04,午饭"
    const rows = parseCSVText(csv)
    expect(rows.length).toBe(1)
    expect(rows[0].amount).toBe("25.50")
  })

  it("引号包裹的字段内含逗号应正确解析", () => {
    const csv = '类型,金额,一级分类,二级分类,日期,备注\n支出,100.00,购物消费,衣服鞋帽,2024-08-04,"红色, XL码"'
    const rows = parseCSVText(csv)
    expect(rows.length).toBe(1)
    expect(rows[0].note).toBe("红色, XL码")
  })

  it("表头不匹配时返回空数组（找不到标准表头）", () => {
    const csv = "名称,价格,类别\n测试,100,其他"
    const rows = parseCSVText(csv)
    expect(rows).toEqual([])
  })
})

// ============================================================
// validateRow — 单行数据校验
// ============================================================
describe("validateRow — 单行数据校验", () => {
  const validL1Names = getAllCategoryL1Names()

  it("完全合法的行应无错误", () => {
    const errors = validateRow(
      { type: "支出", amount: "25.50", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "午饭" },
      2,
      validL1Names
    )
    expect(errors).toEqual([])
  })

  it("合法的收入行应无错误", () => {
    const errors = validateRow(
      { type: "收入", amount: "5000.00", categoryL1: "工资收入", categoryL2: "月薪", date: "2024-08-01", note: "" },
      3,
      validL1Names
    )
    expect(errors).toEqual([])
  })

  it("无效的类型应报错", () => {
    const errors = validateRow(
      { type: "转账", amount: "100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      2,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].row).toBe(2)
    expect(errors[0].message).toContain("转账")
    expect(errors[0].message).toContain("不是有效的类型")
  })

  it("空类型应报错", () => {
    const errors = validateRow(
      { type: "", amount: "100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      5,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的类型")
  })

  it("非数字金额应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "abc", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      3,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的金额")
  })

  it("负数金额应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "-100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      3,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的金额")
  })

  it("零金额应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "0", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      3,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的金额")
  })

  it("空金额应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024-08-04", note: "" },
      4,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的金额")
  })

  it("空一级分类应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "100", categoryL1: "", categoryL2: "三餐", date: "2024-08-04", note: "" },
      6,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("一级分类不能为空")
  })

  it("不存在的一级分类应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "100", categoryL1: "不存在的分类X", categoryL2: "其他", date: "2024-08-04", note: "" },
      7,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不存在的分类X")
    expect(errors[0].message).toContain("不是有效的分类")
  })

  it("无效的日期格式应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "2024/08/04", note: "" },
      8,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的日期")
  })

  it("空日期应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "", note: "" },
      9,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的日期")
  })

  it("非法的日期字符串应报错", () => {
    const errors = validateRow(
      { type: "支出", amount: "100", categoryL1: "餐饮饮食", categoryL2: "三餐", date: "不是日期", note: "" },
      10,
      validL1Names
    )
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("不是有效的日期")
  })

  it("同时多个字段有错应返回多条错误", () => {
    const errors = validateRow(
      { type: "转账", amount: "abc", categoryL1: "", categoryL2: "", date: "bad-date", note: "" },
      11,
      validL1Names
    )
    // 类型错 + 金额错 + 一级分类空 + 日期错 = 4条
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================
// getAllCategoryL1Names — 获取所有有效分类名
// ============================================================
describe("getAllCategoryL1Names — 获取所有有效分类名", () => {
  it("应包含支出和收入的所有一级分类", () => {
    const names = getAllCategoryL1Names()
    expect(names.has("餐饮饮食")).toBe(true)
    expect(names.has("交通出行")).toBe(true)
    expect(names.has("工资收入")).toBe(true)
    expect(names.has("红包退款")).toBe(true)
    // 总共 11 个支出 + 5 个收入 = 16 个（无重名）
    expect(names.size).toBeGreaterThanOrEqual(15)
  })
})

// ============================================================
// getDefaultL2 — 获取默认二级分类
// ============================================================
describe("getDefaultL2 — 获取默认二级分类", () => {
  it("应返回支出分类的第一个子分类", () => {
    expect(getDefaultL2("餐饮饮食", "expense")).toBe("三餐")
    expect(getDefaultL2("交通出行", "expense")).toBe("公交地铁")
  })

  it("应返回收入分类的第一个子分类", () => {
    expect(getDefaultL2("工资收入", "income")).toBe("月薪")
    expect(getDefaultL2("兼职副业", "income")).toBe("freelance")
  })

  it('不存在的分类应返回"其他"', () => {
    expect(getDefaultL2("不存在的分类", "expense")).toBe("其他")
    expect(getDefaultL2("不存在的", "income")).toBe("其他")
  })
})
