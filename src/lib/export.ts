import * as XLSX from 'xlsx'
import type { Record } from '../types'

// ========== CSV 导出 ==========

/**
 * 对 CSV 字段值进行安全转义。
 *
 * 如果字段内容包含逗号、引号或换行符，需要用双引号包裹，
 * 同时把内容中的每个双引号替换为两个双引号（CSV 标准转义规则）。
 * 普通文本直接原样返回。
 */
export function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportCSV(records: Record[], filename?: string): void {
  const headers = ['类型', '金额', '一级分类', '二级分类', '日期', '备注']
  const rows = records.map((r) => [
    r.type === 'income' ? '收入' : '支出',
    r.amount.toFixed(2),
    r.categoryL1,
    r.categoryL2,
    r.date,
    r.note,
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  // 添加 BOM 让 Excel 正确识别中文
  const BOM = '﻿'
  downloadFile(BOM + csvContent, filename || '账单记录.csv', 'text/csv;charset=utf-8')
}

// ========== Excel 导出 ==========

export function exportExcel(records: Record[], filename?: string): void {
  const headers = ['类型', '金额', '一级分类', '二级分类', '日期', '备注']
  const rows = records.map((r) => [
    r.type === 'income' ? '收入' : '支出',
    r.amount,
    r.categoryL1,
    r.categoryL2,
    r.date,
    r.note,
  ])

  // 构建工作表
  const sheetData = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 8 },   // 类型
    { wch: 12 },  // 金额
    { wch: 14 },  // 一级分类
    { wch: 14 },  // 二级分类
    { wch: 12 },  // 日期
    { wch: 30 },  // 备注
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '账单记录')

  // 导出为 .xlsx 文件
  XLSX.writeFile(workbook, filename || '账单记录.xlsx')
}

// ========== 工具函数 ==========

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
