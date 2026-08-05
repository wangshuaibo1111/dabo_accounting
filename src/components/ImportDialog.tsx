import { useState, useRef, useCallback } from 'react'
import type { NewRecord } from '../types'
import { parseCSVFile, type ImportResult } from '../lib/import'
import { downloadFile } from '../lib/export'
import { getCategoryIcon } from '../data/categories'

interface Props {
  onImport: (records: NewRecord[]) => void
  onClose: () => void
}

type Step = 'select' | 'preview' | 'done'

export default function ImportDialog({ onImport, onClose }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('select')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('请选择 .csv 格式的文件')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await parseCSVFile(file)
      setResult(res)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleConfirm = () => {
    if (result && result.records.length > 0) {
      onImport(result.records)
      setStep('done')
      // 短暂显示成功提示后关闭
      setTimeout(() => onClose(), 800)
    }
  }

  const resetState = () => {
    setStep('select')
    setResult(null)
    setError(null)
  }

  // 下载模板
  const downloadTemplate = () => {
    const template = '类型,金额,一级分类,二级分类,日期,备注\n支出,25.00,餐饮饮食,三餐,2024-08-04,食堂午饭\n收入,5000.00,工资收入,月薪,2024-08-01,8月工资'
    downloadFile('﻿' + template, '大博记账_导入模板.csv', 'text/csv;charset=utf-8')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'done') onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-in max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-700">📥 导入账单</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 'select' && (
            <div className="px-5 py-4 space-y-3">
              {/* 拖拽上传区 */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300 hover:bg-stone-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {loading ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">正在解析文件...</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📁</p>
                    <p className="text-sm text-gray-500 font-medium">点击选择文件或拖拽到此处</p>
                    <p className="text-xs text-gray-400 mt-1">仅支持 .csv 格式</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {error && (
                <div className="bg-rose-50 text-rose-500 rounded-xl p-3 text-sm">{error}</div>
              )}

              {/* 格式说明 */}
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">📋 CSV 文件格式要求</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• 第一行为表头：<code className="bg-white px-1 rounded text-xs">类型,金额,一级分类,二级分类,日期,备注</code></p>
                  <p>• 类型字段填写 "收入" 或 "支出"</p>
                  <p>• 日期格式为 YYYY-MM-DD（如 2024-08-04）</p>
                  <p>• 分类需与 APP 中已有分类一致</p>
                  <p>• 备注为可选项</p>
                </div>
                <button onClick={downloadTemplate}
                  className="mt-2 text-xs text-cyan-500 hover:text-cyan-600 font-medium"
                >📥 下载 CSV 模板</button>
              </div>
            </div>
          )}

          {step === 'preview' && result && (
            <div className="px-5 py-4 space-y-3">
              {/* 统计概览 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-500">可导入</p>
                  <p className="text-lg font-bold text-emerald-600">{result.records.length}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-rose-500">有错误</p>
                  <p className="text-lg font-bold text-rose-600">{result.errors.length}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">总行数</p>
                  <p className="text-lg font-bold text-gray-600">{result.records.length + result.errors.length}</p>
                </div>
              </div>

              {/* 可导入记录预览 */}
              {result.records.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">✅ 可导入的记录</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.records.slice(0, 20).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-sm">{getCategoryIcon(r.categoryL1)}</span>
                        <span className={r.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                          {r.type === 'income' ? '+' : '-'}¥{r.amount.toFixed(2)}
                        </span>
                        <span className="text-gray-400">{r.categoryL1}·{r.categoryL2}</span>
                        <span className="text-gray-400 ml-auto">{r.date}</span>
                      </div>
                    ))}
                    {result.records.length > 20 && (
                      <p className="text-xs text-gray-400 text-center">...还有 {result.records.length - 20} 条</p>
                    )}
                  </div>
                </div>
              )}

              {/* 错误列表 */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">⚠️ 解析错误（将跳过）</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-rose-500 bg-rose-50 rounded-lg px-2.5 py-1.5">
                        第{e.row}行：{e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {step === 'preview' && result && (
          <div className="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
            <button onClick={resetState}
              className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors font-medium"
            >重新选择</button>
            <button onClick={handleConfirm}
              disabled={result.records.length === 0}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                result.records.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm shadow-cyan-200'
              }`}
            >导入 {result.records.length} 条记录</button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-5 py-10 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-700 font-medium">导入成功！</p>
            <p className="text-xs text-gray-400 mt-1">已导入 {result?.records.length || 0} 条记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
