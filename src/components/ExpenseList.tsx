import type { Record as AppRecord } from '../types'

interface Props {
  records: AppRecord[]
  onDelete: (id: string) => void
  getCategoryIcon: (categoryL1: string) => string
}

function groupByDate(records: AppRecord[]): Map<string, AppRecord[]> {
  const groups = new Map<string, AppRecord[]>()
  for (const r of records) {
    const list = groups.get(r.date) || []
    list.push(r)
    groups.set(r.date, list)
  }
  return groups
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  const date = new Date(dateStr)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (dateStr === todayStr) return '今天'
  if (dateStr === yesterdayStr) return '昨天'
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekDay}`
}

export default function ExpenseList({ records, onDelete, getCategoryIcon }: Props): JSX.Element {
  const groups = groupByDate(records)

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([date, items]) => {
        const dayIncome = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0)
        const dayExpense = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0)
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-medium text-gray-500">{formatDateLabel(date)}</span>
              <span className="text-xs text-gray-400">
                {dayExpense > 0 && <span className="text-rose-500 mr-2">支 ¥{dayExpense.toFixed(2)}</span>}
                {dayIncome > 0 && <span className="text-emerald-500">收 ¥{dayIncome.toFixed(2)}</span>}
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {items.map((record, index) => (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < items.length - 1 ? 'border-b border-gray-50' : ''
                  } hover:bg-gray-50/50 transition-colors group`}
                >
                  <span className="text-2xl flex-shrink-0">{getCategoryIcon(record.categoryL1)}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 truncate">{record.categoryL2}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{record.categoryL1}</span>
                    </div>
                    {record.note && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{record.note}</p>
                    )}
                  </div>

                  <span className={`text-base font-semibold flex-shrink-0 ${
                    record.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
                  </span>

                  <button
                    onClick={() => onDelete(record.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
