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

export default function Modal({ children, onClose, maxWidth = 'max-w-md', closeOnBackdrop = true, innerClassName = '' }: Props): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} mx-4 animate-in ${innerClassName}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
