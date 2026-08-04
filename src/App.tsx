import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  initDatabase, addRecord, deleteRecord, queryRecords,
  getMonthlyStats, getCategoryStats, getDailyStats,
  getUserCategories, type UserCategoryRow,
} from './lib/database'
import { getCategoryIcon, mergeCategories } from './data/categories'
import type { Record as AppRecord, NewRecord, FilterOptions, MonthlyStats, CategoryStats, DailyStats } from './types'
import AddExpenseDialog from './components/AddExpenseDialog'
import AddIncomeDialog from './components/AddIncomeDialog'
import ExpenseList from './components/ExpenseList'
import FilterBar from './components/FilterBar'
import StatisticsPanel from './components/StatisticsPanel'
import ExportDialog from './components/ExportDialog'
import ImportDialog from './components/ImportDialog'
import CategoryManager from './components/CategoryManager'

function App(): JSX.Element {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [records, setRecords] = useState<AppRecord[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showIncomeDialog, setShowIncomeDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [userCategories, setUserCategories] = useState<{ expense: UserCategoryRow[]; income: UserCategoryRow[] }>({ expense: [], income: [] })
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: null, endDate: null, categoryL1: null, keyword: '', type: 'all',
  })
  const [categoryStats, setCategoryStats] = useState<{ expense: CategoryStats[]; income: CategoryStats[] }>({ expense: [], income: [] })
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])

  // 初始化
  useEffect(() => {
    initDatabase()
      .then(() => { setDbReady(true); refreshData(); loadUserCategories() })
      .catch((err: Error) => { console.error(err); setDbError(err.message) })
  }, [])

  // 刷新
  const refreshData = useCallback(() => {
    const result = queryRecords({
      startDate: filters.startDate, endDate: filters.endDate,
      categoryL1: filters.categoryL1, keyword: filters.keyword || undefined,
      type: filters.type,
    })
    setRecords(result)

    const now = new Date()
    setMonthlyStats(getMonthlyStats(now.getFullYear(), now.getMonth() + 1))

    // 统计图表数据
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`
    setCategoryStats({
      expense: getCategoryStats('expense', `${thisMonth}-01`, `${nextMonth}-01`),
      income: getCategoryStats('income', `${thisMonth}-01`, `${nextMonth}-01`),
    })
    setDailyStats(getDailyStats(30))
  }, [filters])

  useEffect(() => { if (dbReady) refreshData() }, [dbReady, refreshData])

  // 操作
  const handleAddRecord = useCallback((data: NewRecord) => {
    addRecord(data); refreshData()
  }, [refreshData])
  const handleBatchImport = useCallback((records: NewRecord[]) => {
    records.forEach((r) => addRecord(r))
    refreshData()
  }, [refreshData])
  const handleDelete = useCallback((id: string) => {
    deleteRecord(id); refreshData()
  }, [refreshData])

  // 加载用户自定义分类
  const loadUserCategories = useCallback(() => {
    setUserCategories({
      expense: getUserCategories('expense'),
      income: getUserCategories('income'),
    })
  }, [])

  // 合并预置+用户分类（转换为 Category 格式兼容旧组件）
  const mergedExpenseCategories = useMemo(() => {
    return toCategoryList(mergeCategories('expense',
      userCategories.expense.map(uc => ({ id: uc.id, name: uc.name, icon: uc.icon, children: safeParse(uc.children, ['其他']) }))
    ))
  }, [userCategories.expense])

  const mergedIncomeCategories = useMemo(() => {
    return toCategoryList(mergeCategories('income',
      userCategories.income.map(uc => ({ id: uc.id, name: uc.name, icon: uc.icon, children: safeParse(uc.children, ['其他']) }))
    ))
  }, [userCategories.income])

  // 合并分类（支出+收入）用于筛选下拉
  const allCategories = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; children: string[] }>()
    ;[...mergedExpenseCategories, ...mergedIncomeCategories].forEach(c => {
      if (!map.has(c.name)) map.set(c.name, c)
    })
    return Array.from(map.values())
  }, [mergedExpenseCategories, mergedIncomeCategories])

  // 加载中
  if (!dbReady && !dbError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">正在加载...</p>
        </div>
      </div>
    )
  }

  // 错误
  if (dbError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">加载失败</p>
          <p className="text-gray-400 text-sm">{dbError}</p>
        </div>
      </div>
    )
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 顶部导航 — 毛玻璃 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-700 tracking-tight">📒 大博记账</h1>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowImportDialog(true)}
              className="text-gray-400 hover:text-cyan-500 px-1.5 py-1.5 rounded-lg text-xs transition-colors"
              title="导入CSV"
            >📥</button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="text-gray-400 hover:text-cyan-500 px-1.5 py-1.5 rounded-lg text-xs transition-colors"
              title="管理分类"
            >📂</button>
            <button
              onClick={() => setShowExportDialog(true)}
              className="text-gray-400 hover:text-cyan-500 px-1.5 py-1.5 rounded-lg text-xs transition-colors"
              title="导出账单"
            >📤</button>
            <button
              onClick={() => setShowIncomeDialog(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm shadow-emerald-200 flex items-center gap-1"
            ><span>+</span> 记收入</button>
            <button
              onClick={() => setShowExpenseDialog(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm shadow-rose-200 flex items-center gap-1"
            ><span>+</span> 记支出</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* 月度统计 — 三栏卡片 */}
        {monthlyStats && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">收入</p>
              <p className="text-lg font-bold text-emerald-500">+¥{monthlyStats.income.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">支出</p>
              <p className="text-lg font-bold text-rose-500">-¥{monthlyStats.expense.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">结余</p>
              <p className={`text-lg font-bold ${monthlyStats.balance >= 0 ? 'text-cyan-500' : 'text-rose-500'}`}>
                {monthlyStats.balance >= 0 ? '+' : ''}¥{monthlyStats.balance.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* 统计图表 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            📊 统计
            <span className={`text-xs transition-transform ${showStats ? 'rotate-180' : ''}`}>▾</span>
          </button>
          <span className="text-xs text-gray-400">{today.getFullYear()}年{today.getMonth() + 1}月 · 共{monthlyStats?.count || 0}笔</span>
        </div>

        {showStats && (
          <StatisticsPanel
            expenseCategoryStats={categoryStats.expense}
            incomeCategoryStats={categoryStats.income}
            dailyStats={dailyStats}
          />
        )}

        {/* 筛选栏 */}
        <FilterBar filters={filters} onFilterChange={setFilters} categories={allCategories.map(c => ({ name: c.name, icon: c.icon, children: c.children }))} />

        {/* 记录列表 */}
        {records.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-gray-400 text-lg">还没有记录</p>
            <p className="text-gray-400 text-sm mt-1">点击上方按钮开始记账</p>
          </div>
        ) : (
          <ExpenseList records={records} onDelete={handleDelete} getCategoryIcon={getCategoryIcon} />
        )}
      </main>

      {/* 弹窗 */}
      {showExpenseDialog && (
        <AddExpenseDialog categories={mergedExpenseCategories} today={todayStr}
          onSave={(data) => { handleAddRecord(data); setShowExpenseDialog(false) }}
          onClose={() => setShowExpenseDialog(false)}
        />
      )}
      {showIncomeDialog && (
        <AddIncomeDialog categories={mergedIncomeCategories} today={todayStr}
          onSave={(data) => { handleAddRecord(data); setShowIncomeDialog(false) }}
          onClose={() => setShowIncomeDialog(false)}
        />
      )}
      {showExportDialog && (
        <ExportDialog records={records} onClose={() => setShowExportDialog(false)} />
      )}
      {showImportDialog && (
        <ImportDialog
          onImport={(records) => { handleBatchImport(records); }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          onCategoriesChanged={loadUserCategories}
        />
      )}
    </div>
  )
}

// 将 CategoryInfo[] 转为 Category[]
function toCategoryList(infoList: { name: string; icon: string; children: string[] }[]): { name: string; icon: string; children: string[] }[] {
  return infoList.map(c => ({ name: c.name, icon: c.icon, children: [...c.children] }))
}

// 安全解析 JSON
function safeParse(json: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return fallback
  } catch {
    return fallback
  }
}

export default App
