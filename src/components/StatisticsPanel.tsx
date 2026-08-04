import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoryStats, DailyStats } from '../types'
import { expenseCategories, incomeCategories, getCategoryIcon } from '../data/categories'

// 饼图配色
const PIE_COLORS = [
  '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#64748b',
]

interface Props {
  expenseCategoryStats: CategoryStats[]
  incomeCategoryStats: CategoryStats[]
  dailyStats: DailyStats[]
}

type ChartTab = 'expense-pie' | 'income-pie' | 'daily-line'

export default function StatisticsPanel({ expenseCategoryStats, incomeCategoryStats, dailyStats }: Props): JSX.Element {
  const [tab, setTab] = useState<ChartTab>('expense-pie')
  const [lineDays, setLineDays] = useState(7)

  // 饼图数据
  const expensePieData = useMemo(() =>
    expenseCategoryStats
      .filter(s => s.total > 0)
      .map(s => ({ name: s.categoryL1, value: s.total, icon: getCategoryIcon(s.categoryL1) })),
    [expenseCategoryStats]
  )

  const incomePieData = useMemo(() =>
    incomeCategoryStats
      .filter(s => s.total > 0)
      .map(s => ({ name: s.categoryL1, value: s.total, icon: getCategoryIcon(s.categoryL1) })),
    [incomeCategoryStats]
  )

  // 折线图数据
  const lineData = useMemo(() => dailyStats.slice(-lineDays), [dailyStats, lineDays])

  const hasAnyData = expensePieData.length > 0 || incomePieData.length > 0 || lineData.some(d => d.expense > 0 || d.income > 0)

  if (!hasAnyData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center">
        <p className="text-gray-400">暂无统计数据</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-100">
        {([
          ['expense-pie', '支出分类', '🍽️'],
          ['income-pie', '收入分类', '💰'],
          ['daily-line', '每日趋势', '📈'],
        ] as [ChartTab, string, string][]).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === key
                ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          ><span>{icon}</span>{label}</button>
        ))}
      </div>

      {/* 图表区 */}
      <div className="p-4 h-72">
        {/* 饼图：支出分类 */}
        {tab === 'expense-pie' && expensePieData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expensePieData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={90}
                paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {expensePieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`¥${value.toFixed(2)}`, '金额']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {tab === 'expense-pie' && expensePieData.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400">本月暂无支出</div>
        )}

        {/* 饼图：收入分类 */}
        {tab === 'income-pie' && incomePieData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomePieData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={90}
                paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {incomePieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`¥${value.toFixed(2)}`, '金额']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {tab === 'income-pie' && incomePieData.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400">本月暂无收入</div>
        )}

        {/* 折线图：每日趋势 */}
        {tab === 'daily-line' && (
          <>
            <div className="flex justify-end gap-1 mb-2">
              {[7, 14, 30].map((n) => (
                <button key={n}
                  onClick={() => setLineDays(n)}
                  className={`px-2 py-0.5 text-xs rounded-lg transition-colors ${
                    lineDays === n ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >近{n}天</button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(d: string) => d.slice(5)}
                  stroke="#e2e8f0"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  stroke="#e2e8f0"
                  tickFormatter={(v: number) => `¥${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                  labelFormatter={(d: string) => `📅 ${d}`}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2}
                  dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#f43f5e', strokeWidth: 0 }}
                  name="支出"
                />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
                  name="收入"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
