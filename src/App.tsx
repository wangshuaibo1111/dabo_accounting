import { useState, useEffect, useMemo } from 'react'
import {
  initDatabase, addRecord, deleteRecord, queryRecords,
  getMonthlyStats, getCategoryStats, getDailyStats,
  getUserCategories, type UserCategoryRow,
} from './lib/database'
import { getCategoryIcon, mergeCategories } from './data/categories'
import { formatISODate, getNextMonthStart } from './lib/date'
import { safeParseJSONArray } from './lib/utils'
import type { Record as AppRecord, NewRecord, FilterOptions, MonthlyStats, CategoryStats, DailyStats, PageType } from './types'
import Sidebar from './components/Sidebar'
import AddRecordDialog from './components/AddRecordDialog'
import ExpenseList from './components/ExpenseList'
import FilterBar from './components/FilterBar'
import StatisticsPanel from './components/StatisticsPanel'
import ExportDialog from './components/ExportDialog'
import ImportDialog from './components/ImportDialog'
import CategoryManager from './components/CategoryManager'
import SettingsPage from './components/SettingsPage'
import SnakeGame from './components/SnakeGame'
import MuyuGame from './components/MuyuGame'

function App(): JSX.Element {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [records, setRecords] = useState<AppRecord[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  // null = 不弹窗, 'expense' = 记支出, 'income' = 记收入
  const [activeDialog, setActiveDialog] = useState<'expense' | 'income' | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [activePage, setActivePage] = useState<PageType>('home')
  const [userCategories, setUserCategories] = useState<{ expense: UserCategoryRow[]; income: UserCategoryRow[] }>({ expense: [], income: [] })
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: null, endDate: null, categoryL1: null, keyword: '', type: 'all',
  })
  const [categoryStats, setCategoryStats] = useState<{ expense: CategoryStats[]; income: CategoryStats[] }>({ expense: [], income: [] })
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])

  // 初始化
  useEffect(() => {
    let cancelled = false
    initDatabase()
      .then(() => {
        if (cancelled) return
        setDbReady(true)
        setUserCategories({ expense: getUserCategories('expense'), income: getUserCategories('income') })
      })
      .catch((err: Error) => { if (!cancelled) { console.error(err); setDbError(err.message) } })
    return () => { cancelled = true }
  }, [])

  // 刷新数据（filters 变化时自动触发）
  useEffect(() => {
    if (!dbReady) return

    const result = queryRecords({
      startDate: filters.startDate, endDate: filters.endDate,
      categoryL1: filters.categoryL1, keyword: filters.keyword || undefined,
      type: filters.type,
    })
    setRecords(result)

    const now = new Date()
    setMonthlyStats(getMonthlyStats(now.getFullYear(), now.getMonth() + 1))

    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonthStart = getNextMonthStart(now.getFullYear(), now.getMonth() + 1)
    setCategoryStats({
      expense: getCategoryStats('expense', thisMonthStart, nextMonthStart),
      income: getCategoryStats('income', thisMonthStart, nextMonthStart),
    })
    setDailyStats(getDailyStats(30))
  }, [dbReady, filters])

  // 添加记录
  const handleAddRecord = (data: NewRecord) => {
    addRecord(data)
    // 通过修改 filters 触发 refresh（实际不变时强制刷新）
    setFilters((f) => ({ ...f }))
  }

  // 批量导入
  const handleBatchImport = (newRecords: NewRecord[]) => {
    let errorCount = 0
    for (const r of newRecords) {
      try {
        addRecord(r)
      } catch (e) {
        errorCount++
        console.error('导入单条记录失败:', r, e)
      }
    }
    // 刷新列表显示实际导入结果
    setFilters((f) => ({ ...f }))
    // 如果有失败的记录，弹窗提示用户
    if (errorCount > 0) {
      alert(`导入完成：${newRecords.length - errorCount} 条成功，${errorCount} 条失败。请查看控制台了解详情。`)
    }
  }

  // 删除
  const handleDelete = (id: string) => {
    deleteRecord(id)
    setFilters((f) => ({ ...f }))
  }

  const loadUserCategories = () => {
    setUserCategories({
      expense: getUserCategories('expense'),
      income: getUserCategories('income'),
    })
  }

  // 用户分类 → mergeCategories 入参格式
  const toMergeInput = (ucs: UserCategoryRow[]) =>
    ucs.map((uc) => ({ id: uc.id, name: uc.name, icon: uc.icon, children: safeParseJSONArray(uc.children) }))

  const mergedExpenseCategories = useMemo(
    () => mergeCategories('expense', toMergeInput(userCategories.expense)),
    [userCategories.expense]
  )

  const mergedIncomeCategories = useMemo(
    () => mergeCategories('income', toMergeInput(userCategories.income)),
    [userCategories.income]
  )

  const allCategories = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; children: string[] }>()
    ;[...mergedExpenseCategories, ...mergedIncomeCategories].forEach((c) => {
      if (!map.has(c.name)) map.set(c.name, c)
    })
    return Array.from(map.values())
  }, [mergedExpenseCategories, mergedIncomeCategories])

  // 导航
  const handleNavigate = (page: PageType) => { setActivePage(page) }

  const today = new Date()
  const todayStr = formatISODate(today)

  // 预计算 FilterBar 的 categories prop
  const filterCategories = useMemo(
    () => allCategories.map((c) => ({ name: c.name, icon: c.icon, children: c.children })),
    [allCategories]
  )

  // 预计算首页 JSX
  const homeContent = useMemo(() => (
    <>
      {monthlyStats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '收入', color: 'text-emerald-500', value: monthlyStats.income, prefix: '+' },
            { label: '支出', color: 'text-rose-500', value: monthlyStats.expense, prefix: '-' },
            { label: '结余', color: monthlyStats.balance >= 0 ? 'text-cyan-500' : 'text-rose-500', value: monthlyStats.balance, prefix: monthlyStats.balance >= 0 ? '+' : '' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.prefix}¥{s.value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{today.getFullYear()}年{today.getMonth() + 1}月 · 共{monthlyStats?.count ?? 0}笔</span>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} categories={filterCategories} />

      {records.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-gray-400 text-lg">还没有记录</p>
          <p className="text-gray-400 text-sm mt-1">点击左侧 + 按钮开始记账</p>
        </div>
      ) : (
        <ExpenseList records={records} onDelete={handleDelete} getCategoryIcon={getCategoryIcon} />
      )}
    </>
  ), [monthlyStats, today, filters, filterCategories, records, handleDelete])

  // 预计算统计页 JSX
  const statsContent = useMemo(() => (
    <div>
      <h2 className="text-base font-semibold text-gray-700 mb-4">📊 统计</h2>
      <StatisticsPanel
        expenseCategoryStats={categoryStats.expense}
        incomeCategoryStats={categoryStats.income}
        dailyStats={dailyStats}
      />
    </div>
  ), [categoryStats, dailyStats])

  // 预计算设置页 JSX
  const settingsContent = useMemo(() => (
    <SettingsPage
      onOpenCategoryManager={() => setShowCategoryManager(true)}
      onOpenImport={() => setShowImportDialog(true)}
      onOpenExport={() => setShowExportDialog(true)}
    />
  ), [])

  const renderPage = () => {
    switch (activePage) {
      case 'stats': return statsContent
      case 'settings': return settingsContent
      case 'snake': return <div><h2 className="text-base font-semibold text-gray-700 mb-4">🐍 贪吃蛇</h2><SnakeGame /></div>
      case 'muyu': return <div><h2 className="text-base font-semibold text-gray-700 mb-4">🪵 敲木鱼</h2><MuyuGame /></div>
      default: return homeContent
    }
  }

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

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onAddRecord={(type) => setActiveDialog(type)}
      />

      <main className="flex-1 ml-14 px-5 py-5 flex justify-center">
        <div className="w-full max-w-3xl">
          {renderPage()}
        </div>
      </main>

      {/* 弹窗 */}
      {activeDialog && (
        <AddRecordDialog
          recordType={activeDialog}
          categories={activeDialog === 'expense' ? mergedExpenseCategories : mergedIncomeCategories}
          today={todayStr}
          onSave={(data) => { handleAddRecord(data); setActiveDialog(null) }}
          onClose={() => setActiveDialog(null)}
        />
      )}
      {showExportDialog && (
        <ExportDialog records={records} onClose={() => setShowExportDialog(false)} />
      )}
      {showImportDialog && (
        <ImportDialog
          onImport={(records) => { handleBatchImport(records) }}
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

export default App
