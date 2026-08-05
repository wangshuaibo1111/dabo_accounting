import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onClose: () => void
  /** 弹窗最大宽度，默认 'max-w-md' */
  maxWidth?: string
  /** 点击背景是否关闭，默认 true */
  closeOnBackdrop?: boolean
  /** 额外的内层容器类名 */
  innerClassName?: string
}

/**
 * 通用弹窗容器组件。
 *
 * 提供统一的弹出层外观：半透明遮罩 + 居中白色卡片。
 * 点击遮罩（背景）默认关闭弹窗，可通过 closeOnBackdrop 关闭此行为。
 * 内部的点击事件不会冒泡到遮罩层（阻止意外关闭）。
 */
export default function Modal({ children, onClose, maxWidth = 'max-w-md', closeOnBackdrop = true, innerClassName = '' }: Props): JSX.Element {
  return (
    // 遮罩层 — 点击空白处关闭
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose() }}
    >
      {/* 卡片内容 — stopPropagation 防止点击卡片内部触发遮罩关闭 */}
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} mx-4 animate-in ${innerClassName}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
