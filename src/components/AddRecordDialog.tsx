import { useState } from 'react'
import type { Category, NewRecord, RecordType } from '../types'

// 支出和收入使用不同的颜色主题
const COLORS: Record<RecordType, {
  border: string; bg: string; titleColor: string; title: string
  prefix: string; prefixColor: string
  badge: string; badgeActive: string; hover: string
  btn: string; btnHover: string; placeholder: string
}> = {
  expense: {
    border: 'border-rose-100', bg: 'bg-rose-50/50', titleColor: 'text-rose-600',
    title: '💸 记支出', prefix: '-¥', prefixColor: 'text-rose-400',
    badge: 'bg-gray-50 text-gray-600', badgeActive: 'bg-rose-500 text-white shadow-sm',
    hover: 'hover:bg-rose-50', btn: 'bg-rose-500', btnHover: 'hover:bg-rose-600',
    placeholder: '例如：食堂午饭',
  },
  income: {
    border: 'border-emerald-100', bg: 'bg-emerald-50/50', titleColor: 'text-emerald-700',
    title: '💰 记收入', prefix: '+¥', prefixColor: 'text-emerald-500',
    badge: 'bg-gray-50 text-gray-600', badgeActive: 'bg-emerald-500 text-white shadow-sm',
    hover: 'hover:bg-emerald-50', btn: 'bg-emerald-500', btnHover: 'hover:bg-emerald-600',
    placeholder: '例如：1月工资',
  },
}

// 输入框获得焦点后的光环颜色
const FOCUS_RING: Record<RecordType, string> = {
  expense: 'focus:ring-rose-400',
  income: 'focus:ring-emerald-400',
}

interface Props {
  /** 收入还是支出 */
  recordType: RecordType
  /** 可选的一级分类列表 */
  categories: Category[]
  /** 当天日期 YYYY-MM-DD */
  today: string
  /** 保存回调，传入不含 id/createdAt/updatedAt 的新记录 */
  onSave: (record: NewRecord) => void
  /** 关闭弹窗回调 */
  onClose: () => void
}

/**
 * 添加记账记录的弹窗组件。
 *
 * 支出和收入共用此组件，通过 recordType 区分颜色主题和文案。
 * 会自动处理分类列表为空的情况（不会崩溃，而是使用空值兜底）。
 */
export default function AddRecordDialog({ recordType, categories, today, onSave, onClose }: Props): JSX.Element {
  // 安全获取第一个分类，避免 categories 为空时崩溃
  const defaultL1 = categories.length > 0 ? categories[0].name : ''
  const defaultL2 = categories.length > 0 && categories[0].children.length > 0 ? categories[0].children[0] : ''

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [categoryL1, setCategoryL1] = useState(defaultL1)
  const [categoryL2, setCategoryL2] = useState(defaultL2)
  const [note, setNote] = useState('')

  const selectedCategory = categories.find((c) => c.name === categoryL1)
  const children = selectedCategory ? selectedCategory.children : []

  const colors = COLORS[recordType]
  const focusRing = FOCUS_RING[recordType]

  // 切换一级分类时，自动选中该分类的第一个子分类
  const handleCategoryL1Change = (l1: string) => {
    setCategoryL1(l1)
    const cat = categories.find((c) => c.name === l1)
    if (cat?.children.length) setCategoryL2(cat.children[0])
  }

  // 点击保存：校验必填字段，然后调用父组件传入的 onSave
  const handleSave = () => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) { alert('请输入有效的金额'); return }
    if (!date) { alert('请选择日期'); return }
    if (!categoryL1) { alert('请先创建分类'); return }

    onSave({
      type: recordType,
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 标题栏 — 颜色随 recordType 变化 */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border} ${colors.bg}`}>
          <h2 className={`text-lg font-semibold ${colors.titleColor}`}>{colors.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 金额输入 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">金额 (¥)</label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium ${colors.prefixColor}`}>
                {colors.prefix}
              </span>
              <input
                type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className={`w-full pl-12 pr-3 py-2.5 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent`}
              />
            </div>
          </div>

          {/* 日期选择 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent`}
            />
          </div>

          {/* 一级分类选择 — 网格排列 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">分类</label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">暂无分类，请先在设置中创建</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button key={cat.name}
                    onClick={() => handleCategoryL1Change(cat.name)}
                    className={`py-2 px-1 rounded-xl text-sm font-medium transition-all ${
                      categoryL1 === cat.name
                        ? colors.badgeActive
                        : `bg-gray-50 text-gray-600 ${colors.hover}`
                    }`}
                  ><span className="mr-1">{cat.icon}</span>{cat.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* 二级分类选择 — 横向排列 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">小类</label>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button key={child}
                  onClick={() => setCategoryL2(child)}
                  className={`py-1.5 px-3 rounded-xl text-sm transition-all ${
                    categoryL2 === child
                      ? colors.badgeActive
                      : `bg-gray-50 text-gray-600 ${colors.hover}`
                  }`}
                >{child}</button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">备注 (可选)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={colors.placeholder} maxLength={200}
              className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent`}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition-colors"
          >取消</button>
          <button onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors ${colors.btn} ${colors.btnHover}`}
          >保存</button>
        </div>
      </div>
    </div>
  )
}
