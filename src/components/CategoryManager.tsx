import { useState, useEffect, useCallback } from 'react'
import {
  getUserCategories, addUserCategory, updateUserCategory, deleteUserCategory,
  type UserCategoryRow,
} from '../lib/database'
import { mergeCategories, type CategoryInfo } from '../data/categories'
import type { RecordType } from '../types'

// 常用图标备选
const ICON_OPTIONS = [
  '🍽️', '🚗', '🛒', '🏠', '💊', '📚', '🎮', '📱', '🎁', '💰', '📦',
  '✈️', '🐱', '🌱', '🎵', '💻', '☕', '👗', '🏥', '🎓', '🎂', '⚽',
  '💄', '🔧', '📷', '🎨', '🚲', '🌍', '💡', '🔥',
]

interface Props {
  onClose: () => void
  onCategoriesChanged: () => void
}

export default function CategoryManager({ onClose, onCategoriesChanged }: Props): JSX.Element {
  const [tab, setTab] = useState<RecordType>('expense')
  const [userCats, setUserCats] = useState<UserCategoryRow[]>([])
  const [editMode, setEditMode] = useState<'new' | string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('📦')
  const [editChildren, setEditChildren] = useState<string[]>(['其他'])
  const [newChild, setNewChild] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const loadCategories = useCallback(() => {
    if (tab === 'expense') setUserCats(getUserCategories('expense'))
    else setUserCats(getUserCategories('income'))
  }, [tab])

  useEffect(() => { loadCategories() }, [loadCategories])

  const allCategories = mergeCategories(
    tab,
    userCats.map((uc) => ({ id: uc.id, name: uc.name, icon: uc.icon, children: safeParseJSON(uc.children, ['其他']) }))
  )

  const startEdit = (cat: CategoryInfo) => {
    if (cat.isPreset) return
    const uc = userCats.find((u) => u.id === cat.userCategoryId)
    if (!uc) return
    setEditMode(uc.id)
    setEditName(uc.name)
    setEditIcon(uc.icon)
    setEditChildren(safeParseJSON(uc.children, ['其他']))
  }

  const startAdd = () => {
    setEditMode('new')
    setEditName('')
    setEditIcon('📦')
    setEditChildren(['其他'])
  }

  const handleSave = () => {
    const name = editName.trim()
    if (!name) return
    const cleanChildren = editChildren.filter((c) => c.trim())
    if (cleanChildren.length === 0) cleanChildren.push('其他')

    if (editMode && editMode !== 'new') {
      updateUserCategory(editMode, name, editIcon, cleanChildren)
    } else {
      addUserCategory(tab, name, editIcon, cleanChildren)
    }
    setEditMode(null)
    loadCategories()
    onCategoriesChanged()
  }

  const handleDelete = (id: string) => {
    deleteUserCategory(id)
    setShowDeleteConfirm(null)
    loadCategories()
    onCategoriesChanged()
  }

  const addChild = () => {
    const child = newChild.trim()
    if (child && !editChildren.includes(child)) {
      setEditChildren([...editChildren, child])
    }
    setNewChild('')
  }

  const removeChild = (idx: number) => {
    if (editChildren.length <= 1) return
    setEditChildren(editChildren.filter((_, i) => i !== idx))
  }

  const showForm = editMode !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !showForm) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-700">
            {showForm ? (editMode !== 'new' ? '✏️ 编辑分类' : '➕ 新增分类') : '📂 管理分类'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {!showForm ? (
            <>
              {/* Tab 切换 */}
              <div className="flex border-b border-gray-100">
                {(['expense', 'income'] as RecordType[]).map((t) => (
                  <button key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      tab === t ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >{t === 'expense' ? '🍽️ 支出分类' : '💰 收入分类'}</button>
                ))}
              </div>

              {/* 分类列表 */}
              <div className="px-5 py-3 space-y-2">
                {allCategories.map((cat) => (
                  <div key={cat.userCategoryId || cat.name}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                      cat.isPreset ? 'bg-stone-50' : 'bg-white border border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                        {cat.isPreset && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">预置</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {cat.children.join('、')}
                      </p>
                    </div>
                    {!cat.isPreset && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(cat)}
                          className="text-gray-400 hover:text-cyan-500 px-1.5 py-1 text-xs transition-colors"
                        >✏️</button>
                        <button onClick={() => setShowDeleteConfirm(cat.userCategoryId!)}
                          className="text-gray-400 hover:text-rose-500 px-1.5 py-1 text-xs transition-colors"
                        >🗑️</button>
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={startAdd}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-cyan-300 hover:text-cyan-500 transition-colors"
                >+ 新增分类</button>
              </div>

              <div className="px-5 pb-4">
                <p className="text-[11px] text-gray-400 bg-amber-50 rounded-lg p-2.5">
                  💡 预置分类不可修改。新增的分类可以自由编辑和删除。删除分类不会影响已有的记账记录。
                </p>
              </div>
            </>
          ) : (
            /* 编辑/新增表单 */
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">分类名称</label>
                <input type="text" value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="例如：旅行开销"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  选择图标 <span className="text-lg ml-1">{editIcon}</span>
                </label>
                <div className="grid grid-cols-10 gap-1.5">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon}
                      onClick={() => setEditIcon(icon)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
                        editIcon === icon ? 'bg-cyan-100 ring-1 ring-cyan-400 scale-110' : 'hover:bg-gray-100'
                      }`}
                    >{icon}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">二级分类</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editChildren.map((child, idx) => (
                    <span key={idx}
                      className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-600"
                    >
                      {child}
                      <button onClick={() => removeChild(idx)}
                        className="text-gray-400 hover:text-rose-500 ml-0.5"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newChild}
                    onChange={(e) => setNewChild(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChild() } }}
                    placeholder="新增小类..."
                    maxLength={10}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <button onClick={addChild}
                    className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs text-gray-500 hover:bg-gray-200 transition-colors"
                  >添加</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          {showForm ? (
            <>
              <button onClick={() => setEditMode(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
              >取消</button>
              <button onClick={handleSave}
                disabled={!editName.trim()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  !editName.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm shadow-cyan-200'
                }`}
              >保存</button>
            </>
          ) : (
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
            >完成</button>
          )}
        </div>
      </div>

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20"
          onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-xs w-full animate-in" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-gray-700 font-medium mb-1">确定要删除这个分类吗？</p>
            <p className="text-center text-xs text-gray-400 mb-4">已有记账记录不受影响</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
              >取消</button>
              <button onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2 rounded-xl text-sm text-white bg-rose-500 hover:bg-rose-600 transition-colors font-medium"
              >删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function safeParseJSON(json: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return fallback
  } catch {
    return fallback
  }
}
