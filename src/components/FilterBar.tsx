import type { Category, FilterOptions } from '../types'

interface Props {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  categories: Category[]
}

/**
 * 账单筛选栏组件。
 *
 * 提供五种筛选方式：开始日期、结束日期、一级分类、记录类型（支出/收入/全部）、关键词搜索。
 * 任一筛选条件生效时，右上角出现"清除"按钮，一键重置所有条件。
 * 筛选条件的变更会实时通过 onFilterChange 通知父组件重新查询数据。
 */
export default function FilterBar({ filters, onFilterChange, categories }: Props): JSX.Element {
  // 判断是否有任何筛选条件已激活
  const hasActive = filters.startDate || filters.endDate || filters.categoryL1 || filters.keyword || filters.type !== 'all'

  // 一键清除所有筛选条件，恢复默认状态
  const clearFilters = () => {
    onFilterChange({ startDate: null, endDate: null, categoryL1: null, keyword: '', type: 'all' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">🔍 筛选</span>
        {hasActive && (
          <button onClick={clearFilters} className="text-xs text-cyan-500 hover:text-cyan-600 font-medium">清除</button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="date" value={filters.startDate || ''}
          onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || null })}
          className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />
        <span className="text-gray-300 self-center text-xs">至</span>
        <input type="date" value={filters.endDate || ''}
          onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || null })}
          className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />

        <select value={filters.categoryL1 || ''}
          onChange={(e) => onFilterChange({ ...filters, categoryL1: e.target.value || null })}
          className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
          ))}
        </select>

        <select value={filters.type}
          onChange={(e) => onFilterChange({ ...filters, type: e.target.value as FilterOptions['type'] })}
          className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <option value="all">全部类型</option>
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>

        <input type="text" value={filters.keyword}
          onChange={(e) => onFilterChange({ ...filters, keyword: e.target.value })}
          placeholder="搜索备注..."
          className="px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 flex-1 min-w-[100px]"
        />
      </div>
    </div>
  )
}
