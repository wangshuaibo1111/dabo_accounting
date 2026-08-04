import type { Category, FilterOptions } from '../types'

interface Props {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  categories: Category[]
}

export default function FilterBar({ filters, onFilterChange, categories }: Props): JSX.Element {
  const hasActive = filters.startDate || filters.endDate || filters.categoryL1 || filters.keyword || filters.type !== 'all'

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
