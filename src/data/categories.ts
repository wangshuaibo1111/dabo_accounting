import type { Category } from '../types'

// 用户自定义分类的简化结构（从数据库读取后转换）
export interface UserCategoryInfo {
  id: string
  name: string
  icon: string
  children: string[]
  isPreset: false
}

// 扩展 Category，标记是否为预置
export interface CategoryInfo {
  name: string
  icon: string
  children: string[]
  isPreset: boolean
  userCategoryId?: string   // 用户分类的数据库ID（用于编辑/删除）
}

// 支出分类
export const expenseCategories: Category[] = [
  { name: '餐饮饮食', icon: '🍽️', children: ['三餐', '零食', '水果', '饮品', '外卖', '聚餐'] },
  { name: '交通出行', icon: '🚗', children: ['公交地铁', '出租车', '网约车', '加油充电', '停车费', '火车机票'] },
  { name: '购物消费', icon: '🛒', children: ['衣服鞋帽', '日用百货', '数码产品', '美妆护肤', '家居用品'] },
  { name: '住房居家', icon: '🏠', children: ['房租', '房贷', '物业费', '水电燃气', '维修装修', '日用品'] },
  { name: '医疗健康', icon: '💊', children: ['门诊', '药费', '住院', '体检', '牙科'] },
  { name: '教育培训', icon: '📚', children: ['书籍', '课程', '考试费', '文具'] },
  { name: '休闲娱乐', icon: '🎮', children: ['电影', '游戏', '旅游', '运动健身', 'KTV'] },
  { name: '通讯网络', icon: '📱', children: ['话费', '宽带', '流量'] },
  { name: '人情往来', icon: '🎁', children: ['红包礼品', '请客吃饭', '慈善捐款'] },
  { name: '金融保险', icon: '💰', children: ['保险', '手续费', '理财'] },
  { name: '其他支出', icon: '📦', children: ['临时支出'] },
]

// 收入分类
export const incomeCategories: Category[] = [
  { name: '工资收入', icon: '💼', children: ['月薪', '奖金', '补贴'] },
  { name: '兼职副业', icon: '💻', children: ['freelance', '兼职', '咨询'] },
  { name: '投资收益', icon: '📈', children: ['股票基金', '利息', '房租收入'] },
  { name: '红包退款', icon: '🎊', children: ['红包', '退款', '报销'] },
  { name: '其他收入', icon: '📦', children: ['临时收入'] },
]

/** 根据类型获取对应的预置分类列表（支出 11 个、收入 5 个） */
export function getCategories(type: 'expense' | 'income'): Category[] {
  return type === 'expense' ? expenseCategories : incomeCategories
}

/** 获取某类型下所有一级分类的名称列表 */
export function getCategoryL1List(type: 'expense' | 'income'): string[] {
  return getCategories(type).map((c) => c.name)
}

/** 获取某类型下指定一级分类的二级子分类列表。找不到该分类时返回空数组 */
export function getCategoryL2List(type: 'expense' | 'income', categoryL1: string): string[] {
  const cat = getCategories(type).find((c) => c.name === categoryL1)
  return cat ? cat.children : []
}

/** 判断一个分类名是否是系统预置的（非用户自定义）。预置分类不可编辑或删除 */
export function isPresetCategory(name: string, type: 'expense' | 'income'): boolean {
  const cats = type === 'expense' ? expenseCategories : incomeCategories
  return cats.some((c) => c.name === name)
}

/** 将系统预置分类和用户自定义分类合并为一个列表。预置的在前，用户自建的在后 */
export function mergeCategories(
  type: 'expense' | 'income',
  userCategories: { id: string; name: string; icon: string; children: string[] }[]
): CategoryInfo[] {
  const presets: CategoryInfo[] = (type === 'expense' ? expenseCategories : incomeCategories).map((c) => ({
    name: c.name,
    icon: c.icon,
    children: [...c.children],
    isPreset: true,
  }))

  const customs: CategoryInfo[] = userCategories.map((uc) => ({
    name: uc.name,
    icon: uc.icon,
    children: [...uc.children],
    isPreset: false,
    userCategoryId: uc.id,
  }))

  return [...presets, ...customs]
}

/** 仅返回用户自己创建的分类（预置分类不在其中），用于分类管理页面 */
export function getEditableCategories(
  _type: 'expense' | 'income',
  userCategories: { id: string; name: string; icon: string; children: string[] }[]
): CategoryInfo[] {
  return userCategories.map((uc) => ({
    name: uc.name,
    icon: uc.icon,
    children: [...uc.children],
    isPreset: false,
    userCategoryId: uc.id,
  }))
}

/** 根据一级分类名称查找对应的图标。先在支出中找，再在收入中找，都找不到返回默认图标 📦 */
export function getCategoryIcon(categoryL1: string): string {
  // 先从支出分类找
  let cat = expenseCategories.find((c) => c.name === categoryL1)
  if (cat) return cat.icon
  // 再从收入分类找
  cat = incomeCategories.find((c) => c.name === categoryL1)
  return cat ? cat.icon : '📦'
}
