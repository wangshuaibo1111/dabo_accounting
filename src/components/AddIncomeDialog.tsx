import { useState } from 'react'
import type { Category, NewRecord } from '../types'

interface Props {
  categories: Category[]
  today: string
  onSave: (record: NewRecord) => void
  onClose: () => void
}

export default function AddIncomeDialog({ categories, today, onSave, onClose }: Props): JSX.Element {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [categoryL1, setCategoryL1] = useState(categories[0].name)
  const [categoryL2, setCategoryL2] = useState(categories[0].children[0])
  const [note, setNote] = useState('')

  const selectedCategory = categories.find((c) => c.name === categoryL1)
  const children = selectedCategory ? selectedCategory.children : []

  const handleCategoryL1Change = (l1: string) => {
    setCategoryL1(l1)
    const cat = categories.find((c) => c.name === l1)
    if (cat?.children.length) setCategoryL2(cat.children[0])
  }

  const handleSave = () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) { alert('请输入有效的金额'); return }
    if (!date) { alert('请选择日期'); return }

    onSave({
      type: 'income',
      amount: Math.round(amountNum * 100) / 100,
      categoryL1,
      categoryL2,
      date,
      note: note.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-700">💰 记收入</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 金额 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">金额 (¥)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-lg font-medium">+¥</span>
              <input
                type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
          </div>

          {/* 一级分类 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">分类</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button key={cat.name}
                  onClick={() => handleCategoryL1Change(cat.name)}
                  className={`py-2 px-1 rounded-xl text-sm font-medium transition-all ${
                    categoryL1 === cat.name
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-emerald-50'
                  }`}
                ><span className="mr-1">{cat.icon}</span>{cat.name}</button>
              ))}
            </div>
          </div>

          {/* 二级分类 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">小类</label>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button key={child}
                  onClick={() => setCategoryL2(child)}
                  className={`py-1.5 px-3 rounded-xl text-sm transition-all ${
                    categoryL2 === child
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-emerald-50'
                  }`}
                >{child}</button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">备注 (可选)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="例如：1月工资" maxLength={200}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition-colors"
          >取消</button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >保存</button>
        </div>
      </div>
    </div>
  )
}
