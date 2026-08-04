// 记录类型
export type RecordType = 'expense' | 'income'

// 账目记录（支出或收入）
export interface Record {
  id: string
  type: RecordType
  amount: number
  categoryL1: string
  categoryL2: string
  date: string // YYYY-MM-DD
  note: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// 新记录（不含自动生成字段）
export type NewRecord = Omit<Record, 'id' | 'createdAt' | 'updatedAt'>

// 分类结构
export interface Category {
  name: string
  icon: string
  children: string[]
}

// 筛选条件
export interface FilterOptions {
  startDate: string | null
  endDate: string | null
  categoryL1: string | null
  keyword: string
  type: RecordType | 'all'
}

// 月度统计
export interface MonthlyStats {
  month: string
  income: number
  expense: number
  balance: number
  count: number
}

// 按分类统计
export interface CategoryStats {
  categoryL1: string
  total: number
  count: number
}

// 每日统计（用于折线图）
export interface DailyStats {
  date: string
  income: number
  expense: number
}
