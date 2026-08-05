interface Props {
  onOpenCategoryManager: () => void
  onOpenImport: () => void
  onOpenExport: () => void
}

/**
 * 设置页面组件。
 *
 * 集中展示应用的设置入口：管理分类、导入 CSV、导出账单。
 * 每个入口以卡片形式呈现，点击后触发父组件传入的回调。
 */
export default function SettingsPage({ onOpenCategoryManager, onOpenImport, onOpenExport }: Props): JSX.Element {
  const items = [
    {
      icon: '📂',
      title: '管理分类',
      desc: '新增、编辑或删除自定义分类',
      onClick: onOpenCategoryManager,
      color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    },
    {
      icon: '📥',
      title: '导入CSV',
      desc: '从CSV文件批量导入账单记录',
      onClick: onOpenImport,
      color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    },
    {
      icon: '📤',
      title: '导出账单',
      desc: '导出为CSV或Excel文件，支持筛选日期范围',
      onClick: onOpenExport,
      color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    },
  ]

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-700 mb-4">⚙️ 设置</h2>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={item.onClick}
            className="group w-full flex items-center gap-4 bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-all text-left"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${item.color}`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <span className="ml-auto text-gray-300 group-hover:text-gray-400 transition-colors">→</span>
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm">
        <p className="text-xs text-gray-400 mb-1">关于</p>
        <p className="text-sm font-medium text-gray-600">大博记账 v1.0</p>
        <p className="text-xs text-gray-400 mt-1">数据存储在浏览器本地，安全放心</p>
      </div>
    </div>
  )
}
