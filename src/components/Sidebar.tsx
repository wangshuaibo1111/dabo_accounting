import { useState } from 'react'
import type { PageType } from '../types'

type NavKey = PageType | 'add'

interface NavItem {
  key: NavKey
  icon: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', icon: '🏠', label: '主页' },
  { key: 'add', icon: '➕', label: '记一笔' },
  { key: 'stats', icon: '📊', label: '统计' },
  { key: 'settings', icon: '⚙️', label: '设置' },
]

interface Props {
  activePage: PageType
  onNavigate: (page: PageType) => void
  onAddExpense: () => void
  onAddIncome: () => void
}

export default function Sidebar({ activePage, onNavigate, onAddExpense, onAddIncome }: Props): JSX.Element {
  const [showAddMenu, setShowAddMenu] = useState(false)

  const handleNav = (key: NavKey) => {
    setShowAddMenu(false)
    if (key !== 'add') onNavigate(key)
  }

  const getBtnClass = (item: NavItem): string => {
    const isAdd = item.key === 'add'
    const isSnake = item.key === 'snake'
    const isActive = item.key === activePage

    if (isAdd) return 'w-10 h-10 rounded-xl flex items-center justify-center relative transition-all bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600'
    if (isSnake && isActive) return 'w-10 h-10 rounded-xl flex items-center justify-center relative transition-all bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600'
    if (isActive) return 'w-10 h-10 rounded-xl flex items-center justify-center relative transition-all bg-cyan-50 text-cyan-600'
    return 'w-10 h-10 rounded-xl flex items-center justify-center relative transition-all text-gray-400 hover:bg-gray-100 hover:text-gray-700'
  }

  return (
    <nav className="fixed left-0 top-0 h-full w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-1 z-20 shadow-sm">
      <div className="mb-3 text-lg cursor-default" title="大博记账">📒</div>
      <div className="w-8 h-px bg-gray-100 mb-1" />

      {NAV_ITEMS.map((item) => (
        <div key={item.key} className="relative">
          <button
            onClick={() => item.key === 'add' ? setShowAddMenu((v) => !v) : handleNav(item.key)}
            className={`group ${getBtnClass(item)}`}
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
            {/* 悬停提示 */}
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50
              before:content-[''] before:absolute before:left-[-5px] before:top-1/2 before:-translate-y-1/2 before:border-5 before:border-transparent before:border-r-gray-800"
            >{item.label}</span>
          </button>

          {item.key === 'add' && showAddMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} />
              <div className="absolute left-12 top-0 z-40 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 px-1 w-36 animate-in">
                <button onClick={() => { onAddExpense(); setShowAddMenu(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 transition-colors text-sm"
                >
                  <span className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-base shrink-0">💸</span>
                  <span className="text-gray-700 font-medium">记支出</span>
                </button>
                <button onClick={() => { onAddIncome(); setShowAddMenu(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
                >
                  <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base shrink-0">💰</span>
                  <span className="text-gray-700 font-medium">记收入</span>
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex-1" />

      {/* 贪吃蛇 */}
      <button
        onClick={() => onNavigate('snake')}
        className={`group ${getBtnClass({ key: 'snake', icon: '🐍', label: '贪吃蛇' })}`}
        title="贪吃蛇"
      >
        <span className="text-xl">🐍</span>
        <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50
          before:content-[''] before:absolute before:left-[-5px] before:top-1/2 before:-translate-y-1/2 before:border-5 before:border-transparent before:border-r-gray-800"
        >贪吃蛇</span>
      </button>
    </nav>
  )
}
