import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Record, RecordType } from "../types"

// ============================================================
// 导入被测模块（escapeCSV 是纯函数，不需要 mock）
// ============================================================
import { escapeCSV, exportCSV } from "./export"

// ============================================================
// 全局 DOM mock — 让 downloadFile 在 Node 环境下运行
// ============================================================

let capturedBlobContent: string = ""
let capturedBlobType: string = ""
let capturedFilename: string = ""
let capturedUrl: string = ""

beforeEach(() => {
  capturedBlobContent = ""
  capturedBlobType = ""
  capturedFilename = ""
  capturedUrl = "blob:mock-url"

  // Mock Blob
  vi.stubGlobal("Blob", class MockBlob {
    parts: BlobPart[]
    type: string
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      this.parts = parts
      this.type = options?.type || ""
      capturedBlobContent = parts.join("")
      capturedBlobType = this.type
    }
  })

  // Mock URL
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((_blob: unknown) => {
      return capturedUrl
    }),
    revokeObjectURL: vi.fn(),
  })

  // Mock document
  const mockLink = {
    href: "",
    download: "",
    click: vi.fn(),
  }

  vi.stubGlobal("document", {
    createElement: vi.fn((_tag: string) => {
      capturedFilename = mockLink.download  // will be set later
      return mockLink
    }),
    body: {
      appendChild: vi.fn((el: typeof mockLink) => {
        capturedFilename = el.download
      }),
      removeChild: vi.fn(),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================
// 测试数据
// ============================================================

function makeRecord(overrides: Partial<Record> = {}): Record {
  return {
    id: "1",
    type: "expense" as RecordType,
    amount: 25.50,
    categoryL1: "餐饮饮食",
    categoryL2: "三餐",
    date: "2024-08-04",
    note: "食堂午饭",
    createdAt: "2024-08-04T12:00:00.000Z",
    updatedAt: "2024-08-04T12:00:00.000Z",
    ...overrides,
  }
}

// ============================================================
// escapeCSV — CSV 字段转义
// ============================================================
describe("escapeCSV — CSV 字段转义", () => {
  it("普通文本不需要转义", () => {
    expect(escapeCSV("三餐")).toBe("三餐")
    expect(escapeCSV("餐饮饮食")).toBe("餐饮饮食")
    expect(escapeCSV("2024-08-04")).toBe("2024-08-04")
    expect(escapeCSV("25.50")).toBe("25.50")
  })

  it("包含逗号的文本应用引号包裹", () => {
    expect(escapeCSV("红色, XL码")).toBe('"红色, XL码"')
    expect(escapeCSV("a,b,c")).toBe('"a,b,c"')
  })

  it("包含引号的文本应转义内部引号", () => {
    expect(escapeCSV('他说"你好"')).toBe('"他说""你好"""')
  })

  it("包含换行符的文本应用引号包裹", () => {
    expect(escapeCSV("第一行\n第二行")).toBe('"第一行\n第二行"')
  })

  it("同时包含逗号和引号", () => {
    const result = escapeCSV('大号, 红色, "限量版"')
    expect(result).toBe('"大号, 红色, ""限量版"""')
  })

  it("空字符串不需要转义", () => {
    expect(escapeCSV("")).toBe("")
  })

  it("纯英文字母数字不需要转义", () => {
    expect(escapeCSV("hello123")).toBe("hello123")
  })
})

// ============================================================
// exportCSV — CSV 导出
// ============================================================
describe("exportCSV — CSV 导出", () => {
  it("应生成包含 BOM 的正确 CSV 头", () => {
    exportCSV([], "test.csv")
    expect(capturedBlobContent.startsWith("﻿")).toBe(true)
    expect(capturedBlobContent).toContain("类型,金额,一级分类,二级分类,日期,备注")
  })

  it("空记录应只包含表头（和 BOM）", () => {
    exportCSV([], "empty.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines.length).toBe(1)
    expect(lines[0]).toBe("﻿类型,金额,一级分类,二级分类,日期,备注")
  })

  it("应正确输出支出记录", () => {
    exportCSV([makeRecord()], "single.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines.length).toBe(2)
    expect(lines[1]).toBe("支出,25.50,餐饮饮食,三餐,2024-08-04,食堂午饭")
  })

  it("应正确输出收入记录", () => {
    const incomeRecord = makeRecord({
      id: "2",
      type: "income",
      amount: 5000,
      categoryL1: "工资收入",
      categoryL2: "月薪",
      date: "2024-08-01",
      note: "8月工资",
    })
    exportCSV([incomeRecord], "income.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines[1]).toBe("收入,5000.00,工资收入,月薪,2024-08-01,8月工资")
  })

  it("多条记录应全部输出", () => {
    const records = [
      makeRecord(),
      makeRecord({ id: "2", type: "income", amount: 5000, categoryL1: "工资收入", categoryL2: "月薪", date: "2024-08-01", note: "8月工资" }),
      makeRecord({ id: "3", amount: 100, categoryL1: "购物消费", categoryL2: "衣服鞋帽", date: "2024-08-03", note: "红色, XL码" }),
    ]
    exportCSV(records, "all.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines.length).toBe(4)
    expect(lines[1]).toContain("食堂午饭")
    expect(lines[2]).toContain("8月工资")
    expect(lines[3]).toContain("红色, XL码")
  })

  it("包含逗号的备注应正确转义", () => {
    const recordWithComma = makeRecord({ id: "4", note: "红色, XL码" })
    exportCSV([recordWithComma], "special.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines[1]).toContain('"红色, XL码"')
  })

  it("包含引号的备注应正确转义", () => {
    const recordWithQuote = makeRecord({ id: "5", note: '限量"纪念"版' })
    exportCSV([recordWithQuote], "quote.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines[1]).toContain('"限量""纪念""版"')
  })

  it("无备注的记录应输出空字段", () => {
    const recordNoNote = makeRecord({ id: "6", note: "" })
    exportCSV([recordNoNote], "nonote.csv")
    const lines = capturedBlobContent.split("\n")
    expect(lines[1].endsWith(",")).toBe(true)
  })

  it("默认文件名为 账单记录.csv", () => {
    exportCSV([makeRecord()])
    expect(capturedFilename).toBe("账单记录.csv")
  })

  it("自定义文件名应生效", () => {
    exportCSV([makeRecord()], "我的账单.csv")
    expect(capturedFilename).toBe("我的账单.csv")
  })

  it("MIME 类型应为 text/csv", () => {
    exportCSV([makeRecord()])
    expect(capturedBlobType).toBe("text/csv;charset=utf-8")
  })
})
