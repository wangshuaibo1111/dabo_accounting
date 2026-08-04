import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import type { Record, NewRecord, RecordType, CategoryStats, DailyStats } from '../types'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const DB_STORAGE_KEY = 'dabo_accounting_db_v2'

let SQL: SqlJsStatic | null = null
let db: Database | null = null

// 初始化 SQL.js 并加载/创建数据库
export async function initDatabase(): Promise<void> {
  if (db) return

  SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })

  const savedData = localStorage.getItem(DB_STORAGE_KEY)
  if (savedData) {
    try {
      const binaryData = base64ToUint8Array(savedData)
      db = new SQL.Database(binaryData)
      return
    } catch {
      console.warn('无法加载已保存的数据库，将创建新数据库')
    }
  }

  db = new SQL.Database()
  createTables()
  saveDatabase()
}

function createTables(): void {
  if (!db) throw new Error('数据库未初始化')

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'expense',
      amount REAL NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_category_l1 ON records(category_l1)`)
}

function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  try {
    localStorage.setItem(DB_STORAGE_KEY, uint8ArrayToBase64(data))
  } catch (e) {
    console.error('保存数据库失败:', e)
  }
}

function getDB(): Database {
  if (!db) throw new Error('数据库未初始化')
  return db
}

// ========== CRUD ==========

export function addRecord(record: NewRecord): Record {
  const database = getDB()
  const now = new Date().toISOString()
  const id = uuidv4()

  const full: Record = { ...record, id, createdAt: now, updatedAt: now }

  database.run(
    `INSERT INTO records (id, type, amount, category_l1, category_l2, date, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [full.id, full.type, full.amount, full.categoryL1, full.categoryL2, full.date, full.note, full.createdAt, full.updatedAt]
  )

  saveDatabase()
  return full
}

export function deleteRecord(id: string): boolean {
  getDB().run('DELETE FROM records WHERE id = ?', [id])
  saveDatabase()
  return true
}

// ========== 查询 ==========

export interface QueryOptions {
  startDate?: string | null
  endDate?: string | null
  categoryL1?: string | null
  keyword?: string
  type?: RecordType | 'all'
}

export function queryRecords(options: QueryOptions = {}): Record[] {
  const database = getDB()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options.startDate) { conditions.push('date >= ?'); params.push(options.startDate) }
  if (options.endDate) { conditions.push('date <= ?'); params.push(options.endDate) }
  if (options.categoryL1) { conditions.push('category_l1 = ?'); params.push(options.categoryL1) }
  if (options.keyword) { conditions.push('note LIKE ?'); params.push(`%${options.keyword}%`) }
  if (options.type && options.type !== 'all') { conditions.push('type = ?'); params.push(options.type) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const stmt = database.prepare(
    `SELECT * FROM records ${where} ORDER BY date DESC, created_at DESC`
  )
  stmt.bind(params)

  const results: Record[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      id: row.id as string,
      type: (row.type as RecordType) || 'expense',
      amount: row.amount as number,
      categoryL1: row.category_l1 as string,
      categoryL2: row.category_l2 as string,
      date: row.date as string,
      note: (row.note as string) || '',
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    })
  }
  stmt.free()
  return results
}

// ========== 统计 ==========

export function getMonthlyStats(year: number, month: number) {
  const database = getDB()
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  const stmt = database.prepare(
    `SELECT type, SUM(amount) as total, COUNT(*) as count
     FROM records WHERE date LIKE ? GROUP BY type`
  )
  stmt.bind([`${prefix}%`])

  let income = 0, expense = 0, count = 0
  while (stmt.step()) {
    const row = stmt.getAsObject()
    if (row.type === 'income') income = (row.total as number) || 0
    else expense = (row.total as number) || 0
    count += (row.count as number) || 0
  }
  stmt.free()

  return { month: prefix, income, expense, balance: income - expense, count }
}

export function getCategoryStats(type: RecordType, startDate?: string, endDate?: string): CategoryStats[] {
  const database = getDB()
  const conditions: string[] = ['type = ?']
  const params: string[] = [type]

  if (startDate) { conditions.push('date >= ?'); params.push(startDate) }
  if (endDate) { conditions.push('date <= ?'); params.push(endDate) }

  const where = `WHERE ${conditions.join(' AND ')}`
  const stmt = database.prepare(
    `SELECT category_l1, SUM(amount) as total, COUNT(*) as count
     FROM records ${where} GROUP BY category_l1 ORDER BY total DESC`
  )
  stmt.bind(params)

  const results: CategoryStats[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      categoryL1: row.category_l1 as string,
      total: row.total as number,
      count: row.count as number,
    })
  }
  stmt.free()
  return results
}

export function getDailyStats(days: number): DailyStats[] {
  const database = getDB()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

  const stmt = database.prepare(
    `SELECT date, type, SUM(amount) as total
     FROM records WHERE date >= ? GROUP BY date, type ORDER BY date ASC`
  )
  stmt.bind([startStr])

  const map = new Map<string, DailyStats>()
  // 初始化所有日期
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - days + 1 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, { date: key, income: 0, expense: 0 })
  }

  while (stmt.step()) {
    const row = stmt.getAsObject()
    const existing = map.get(row.date as string)
    if (existing) {
      if (row.type === 'income') existing.income = (row.total as number) || 0
      else existing.expense = (row.total as number) || 0
    }
  }
  stmt.free()

  return Array.from(map.values())
}

// ========== 工具 ==========

function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i])
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
