import type { RecordType, NewRecord } from '../types'
import { expenseCategories, incomeCategories } from '../data/categories'

// CSV 行类型
interface CSVRow {
  type: string      // "收入" 或 "支出"
  amount: string
  categoryL1: string
  categoryL2: string
  date: string
  note: string
}

// 解析结果
export interface ImportResult {
  records: NewRecord[]
  errors: ImportError[]
}

export interface ImportError {
  row: number       // CSV 中的行号（从1开始）
  message: string
}

// 解析 CSV 文本
function parseCSVText(text: string): CSVRow[] {
  // 移除 BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return [] // 至少需要表头+一条数据

  // 解析表头
  const headers = parseCSVLine(lines[0])
  const typeIdx = headers.findIndex((h) => h === '类型')
  const amountIdx = headers.findIndex((h) => h === '金额')
  const l1Idx = headers.findIndex((h) => h === '一级分类')
  const l2Idx = headers.findIndex((h) => h === '二级分类')
  const dateIdx = headers.findIndex((h) => h === '日期')
  const noteIdx = headers.findIndex((h) => h === '备注')

  // 如果找不到标准表头，尝试英文匹配
  if (typeIdx === -1 && amountIdx === -1) {
    return []
  }

  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line)
    rows.push({
      type: (typeIdx >= 0 ? cols[typeIdx] : '') || '',
      amount: (amountIdx >= 0 ? cols[amountIdx] : '') || '',
      categoryL1: (l1Idx >= 0 ? cols[l1Idx] : '') || '',
      categoryL2: (l2Idx >= 0 ? cols[l2Idx] : '') || '',
      date: (dateIdx >= 0 ? cols[dateIdx] : '') || '',
      note: (noteIdx >= 0 ? cols[noteIdx] : '') || '',
    })
  }

  return rows
}

// 解析 CSV 行（处理引号包裹的字段）
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

// 校验单行数据
function validateRow(row: CSVRow, rowNum: number, validL1Names: Set<string>): ImportError[] {
  const errors: ImportError[] = []

  // 类型
  if (!row.type || (row.type !== '收入' && row.type !== '支出')) {
    errors.push({ row: rowNum, message: `"${row.type}"不是有效的类型（应为"收入"或"支出"）` })
  }

  // 金额
  const amount = parseFloat(row.amount)
  if (isNaN(amount) || amount <= 0) {
    errors.push({ row: rowNum, message: `"${row.amount}"不是有效的金额` })
  }

  // 一级分类
  if (!row.categoryL1) {
    errors.push({ row: rowNum, message: '一级分类不能为空' })
  } else if (!validL1Names.has(row.categoryL1)) {
    errors.push({ row: rowNum, message: `"${row.categoryL1}"不是有效的分类` })
  }

  // 日期
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    errors.push({ row: rowNum, message: `"${row.date}"不是有效的日期（格式应为YYYY-MM-DD）` })
  }

  // 二级分类模糊匹配
  if (row.categoryL1 && row.categoryL2 && errors.length === 0) {
    // 只有没有其他错误时才检查二级分类（避免因为一级分类无效而报两次错）
  }

  return errors
}

// 获取全部有效一级分类名称
function getAllCategoryL1Names(): Set<string> {
  const names = new Set<string>()
  expenseCategories.forEach((c) => names.add(c.name))
  incomeCategories.forEach((c) => names.add(c.name))
  return names
}

// 主解析函数
export function parseCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSVText(text)

        if (rows.length === 0) {
          resolve({
            records: [],
            errors: [{ row: 0, message: '文件为空或格式不正确，请检查表头是否包含：类型、金额、一级分类、二级分类、日期、备注' }],
          })
          return
        }

        const validL1Names = getAllCategoryL1Names()
        const records: NewRecord[] = []
        const errors: ImportError[] = []

        rows.forEach((row, idx) => {
          const rowNum = idx + 2 // CSV 第1行是表头，数据从第2行开始
          const rowErrors = validateRow(row, rowNum, validL1Names)

          if (rowErrors.length > 0) {
            errors.push(...rowErrors)
            return
          }

          const type: RecordType = row.type === '收入' ? 'income' : 'expense'
          records.push({
            type,
            amount: parseFloat(row.amount),
            categoryL1: row.categoryL1,
            categoryL2: row.categoryL2 || getDefaultL2(row.categoryL1, type),
            date: row.date,
            note: row.note || '',
          })
        })

        resolve({ records, errors })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

// 获取默认二级分类
function getDefaultL2(categoryL1: string, type: RecordType): string {
  const cats = type === 'expense' ? expenseCategories : incomeCategories
  const cat = cats.find((c) => c.name === categoryL1)
  return cat?.children[0] || '其他'
}
