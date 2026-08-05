import { useState, useMemo } from 'react'
import type { Record } from '../types'
import { exportCSV, exportExcel } from '../lib/export'
import { formatISODate, getMonthStart, getDaysAgo, getLastMonthEnd } from '../lib/date'

interface Props {
  records: Record[]
  onClose: () => void
}

type ExportFormat = 'csv' | 'excel'

/**
 * 导出账单弹窗组件。
 *
 * 用户可选择导出格式（Excel 或 CSV）、时间范围（支持快捷选择本月/上月/近7天/近30天/全部），
 * 预览区域实时显示将导出的记录数及收支合计。文件名自动包含日期范围。
 */
export default function ExportDialog({ records, onClose }: Props): JSX.Element {
  const today = new Date()
  const todayStr = formatISODate(today)
  const monthStart = getMonthStart(today.getFullYear(), today.getMonth() + 1)

  const [startDate, setStartDate] = useState<string>(monthStart)
  const [endDate, setEndDate] = useState<string>(todayStr)
  const [format, setFormat] = useState<ExportFormat>('excel')

  // 根据日期筛选记录
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
      return true
    })
  }, [records, startDate, endDate])

  const handleExport = () => {
    if (filteredRecords.length === 0) return

    const dateLabel = startDate === endDate
      ? startDate
      : `${startDate}_${endDate}`

    if (format === 'csv') {
      exportCSV(filteredRecords, `大博记账_${dateLabel}.csv`)
    } else {
      exportExcel(filteredRecords, `大博记账_${dateLabel}.xlsx`)
    }
    onClose()
  }

  // 快捷时间段
  const quickRanges = [
    { label: '本月', start: monthStart, end: todayStr },
    { label: '上月', start: getLastMonthStart(), end: getLastMonthEnd() },
    { label: '近7天', start: getDaysAgo(6), end: todayStr },
    { label: '近30天', start: getDaysAgo(29), end: todayStr },
    { label: '全部', start: '', end: '' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700">📤 导出账单</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">&times;</button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 space-y-4">
          {/* 格式选择 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">导出格式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('excel')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  format === 'excel'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                }`}
              >
                📊 Excel (.xlsx)
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  format === 'csv'
                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                }`}
              >
                📄 CSV (.csv)
              </button>
            </div>
          </div>

          {/* 时间范围 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">时间范围</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-2.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-gray-300 text-xs">至</span>
              <input type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-2.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
            {/* 快捷选择 */}
            <div className="flex flex-wrap gap-1.5">
              {quickRanges.map((r) => (
                <button key={r.label}
                  onClick={() => { setStartDate(r.start); setEndDate(r.end) }}
                  className="px-2.5 py-1 text-xs rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >{r.label}</button>
              ))}
            </div>
          </div>

          {/* 导出预览 */}
          <div className="bg-stone-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">将导出</span>
              <span className="text-sm font-semibold text-gray-700">{filteredRecords.length} 条记录</span>
            </div>
            {filteredRecords.length > 0 && (
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                <span>收入 {filteredRecords.filter(r => r.type === 'income').length} 笔</span>
                <span>支出 {filteredRecords.filter(r => r.type === 'expense').length} 笔</span>
                <span>
                  合计 ¥{filteredRecords.reduce((sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
          >取消</button>
          <button onClick={handleExport}
            disabled={filteredRecords.length === 0}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filteredRecords.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm shadow-cyan-200'
            }`}
          >导出 {format === 'excel' ? 'Excel' : 'CSV'}</button>
        </div>
      </div>
    </div>
  )
}

// ===== 日期工具（封装共享函数） =====

function getLastMonthStart(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1, 1)
  return getMonthStart(d.getFullYear(), d.getMonth() + 1)
}
