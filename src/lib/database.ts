import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import type { Record, NewRecord, RecordType, CategoryStats, DailyStats } from '../types'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const DB_STORAGE_KEY = 'dabo_accounting_db_v2'

let SQL: SqlJsStatic | null = null
let db: Database | null = null

/**
 * 启动数据库。
 *
 * 加载 SQL.js（WebAssembly 版 SQLite），然后尝试从浏览器本地存储中恢复上次保存的数据库。
 * 如果本地存储中没有数据或数据损坏，则创建一个全新的空数据库。
 * 数据库文件通过 localStorage 以 Base64 编码保存。
 */
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
      // 确保旧数据库也包含最新的表结构
      createTables()
      saveDatabase()
      return
    } catch {
      // 备份损坏数据（只保留最新一份，清理旧备份避免撑满 localStorage）
      const backupPrefix = `${DB_STORAGE_KEY}_backup_`
      // 删除所有旧备份
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key?.startsWith(backupPrefix)) localStorage.removeItem(key)
      }
      // 写入新备份
      const backupKey = `${backupPrefix}${Date.now()}`
      try { localStorage.setItem(backupKey, savedData) } catch { /* ignore */ }
      console.warn('无法加载已保存的数据库，原始数据已备份至浏览器存储，将创建新数据库。备份键名：', backupKey)
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

  // 用户自定义分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      children TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_categories_type ON user_categories(type)`)
}

/**
 * 将内存中的数据库序列化为 Base64 字符串，存入浏览器本地存储。
 * 这样用户刷新页面或关闭浏览器后，数据不会丢失。
 */
function saveDatabase(): void {
  if (!db) return
  // 导出整个 SQLite 数据库为二进制数组
  const data = db.export()
  try {
    localStorage.setItem(DB_STORAGE_KEY, uint8ArrayToBase64(data))
  } catch (e) {
    // localStorage 写满或浏览器隐私模式等导致保存失败
    // 数据在内存 SQLite 中仍然安全，不抛异常以免崩溃整个应用
    console.error('保存数据库失败（可能是存储空间不足）:', e)
  }
}

function getDB(): Database {
  if (!db) throw new Error('数据库未初始化')
  return db
}

// ========== 数据的增删改查（CRUD）==========

/** 新增一条记录，自动生成唯一 ID 和时间戳，保存后返回完整记录 */
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

/** 根据 ID 删除一条记录。注意：即使 ID 不存在也不会报错 */
export function deleteRecord(id: string): void {
  getDB().run('DELETE FROM records WHERE id = ?', [id])
  saveDatabase()
}

// ========== 查询 ==========

/** 查询记录时可用的筛选条件 */
export interface QueryOptions {
  startDate?: string | null
  endDate?: string | null
  categoryL1?: string | null
  keyword?: string
  type?: RecordType | 'all'
}

/** 按条件查询记录，未指定条件时返回全部。结果按日期+创建时间倒序排列 */
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

// ========== 用户自定义分类 CRUD ==========

export interface UserCategoryRow {
  id: string
  type: string
  name: string
  icon: string
  children: string   // JSON string in DB
  created_at: string
  updated_at: string
}

// 获取某类型的所有用户自定义分类
export function getUserCategories(type: string): UserCategoryRow[] {
  const database = getDB()
  const stmt = database.prepare(
    'SELECT * FROM user_categories WHERE type = ? ORDER BY created_at ASC'
  )
  stmt.bind([type])

  const results: UserCategoryRow[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      id: row.id as string,
      type: row.type as string,
      name: row.name as string,
      icon: (row.icon as string) || '📦',
      children: (row.children as string) || '[]',
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    })
  }
  stmt.free()
  return results
}

// 新增用户分类
export function addUserCategory(type: string, name: string, icon: string, children: string[]): UserCategoryRow {
  const database = getDB()
  const now = new Date().toISOString()
  const id = uuidv4()

  database.run(
    `INSERT INTO user_categories (id, type, name, icon, children, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, type, name, icon, JSON.stringify(children), now, now]
  )
  saveDatabase()

  return {
    id, type, name, icon,
    children: JSON.stringify(children),
    created_at: now, updated_at: now,
  }
}

// 更新用户分类（名称、图标、子分类）
export function updateUserCategory(id: string, name: string, icon: string, children: string[]): boolean {
  const database = getDB()
  const now = new Date().toISOString()

  database.run(
    `UPDATE user_categories SET name = ?, icon = ?, children = ?, updated_at = ? WHERE id = ?`,
    [name, icon, JSON.stringify(children), now, id]
  )
  saveDatabase()

  // 同步更新使用该分类的记录（如果分类名变了）
  // 注意：由于分类名可能出现在 records.category_l1 中，改名时需要更新 records 表
  // 这里暂保持简单，让用户在改名后手动更新；也可以通过触发器或应用层同步

  return true
}

// 删除用户分类
export function deleteUserCategory(id: string): boolean {
  getDB().run('DELETE FROM user_categories WHERE id = ?', [id])
  saveDatabase()
  return true
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
