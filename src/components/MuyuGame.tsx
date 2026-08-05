import { useRef, useEffect, useState, useCallback } from 'react'

// ========== localStorage 持久化 ==========
const STORAGE_KEY = 'muyu_daily'

function getTodayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadTodayCount(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { date: string; count: number }
      if (data.date === getTodayKey()) return data
    }
  } catch { /* ignore */ }
  return { date: getTodayKey(), count: 0 }
}

function saveTodayCount(data: { date: string; count: number }): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
  catch { /* ignore */ }
}

// ========== 精密木鱼音效合成 ==========
// 模拟真实木鱼的声学特征：短促撞击 + 中频空腔共振 + 高频泛音
let sharedAudioCtx: AudioContext | null = null
let preRenderedBuffer: AudioBuffer | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext()
  }
  return sharedAudioCtx
}

/** 预合成一个高质量木鱼音效波形 */
function buildMuyuBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const duration = 0.45
  const length = Math.floor(sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    let sample = 0

    // ① 撞击瞬态（0-10ms）：木槌敲击 — 只用中低频，避免金属感
    if (t < 0.01) {
      const atk = Math.exp(-t * 400)
      // 只用低频撞击频率，模拟木头碰撞的闷响
      const impactFreqs = [350, 500, 650]
      for (const f of impactFreqs) {
        sample += Math.sin(2 * Math.PI * f * t) * 0.18 * atk
      }
      // 极轻微的噪声模拟木头纹理撞击（大幅降低）
      sample += (Math.random() * 2 - 1) * 0.08 * Math.exp(-t * 500)
    }

    // ② 主体腔体共振（3ms-250ms）：木鱼空腔 — 核心音色，闷而厚
    if (t >= 0.003 && t < 0.35) {
      const t2 = t - 0.003
      const bodyEnv = Math.exp(-t2 * 10)
      // 主共振 ~400Hz，比之前低得多，更接近真实木鱼
      sample += Math.sin(2 * Math.PI * 400 * t) * 0.55 * bodyEnv
      // 失谐共振增加木头厚度感
      sample += Math.sin(2 * Math.PI * 415 * t) * 0.2 * bodyEnv
    }

    // ③ 低音底韵（3ms-350ms）：厚木头的沉闷低频
    if (t >= 0.003 && t < 0.35) {
      const t2 = t - 0.003
      const lowEnv = Math.exp(-t2 * 11)
      sample += Math.sin(2 * Math.PI * 220 * t) * 0.35 * lowEnv
    }

    // ④ 极轻微中高频泛音（3ms-25ms）：木头质感而非金属感
    if (t >= 0.003 && t < 0.025) {
      const t2 = t - 0.003
      const midEnv = Math.exp(-t2 * 100)
      // 只用 900Hz 以下的中频，完全去掉高频金属感
      sample += Math.sin(2 * Math.PI * 750 * t) * 0.06 * midEnv
    }

    // ⑤ 余音袅袅（15ms-300ms）：木头共鸣的自然衰减
    if (t >= 0.015 && t < 0.3) {
      const t2 = t - 0.015
      const tailEnv = Math.exp(-t2 * 14)
      sample += Math.sin(2 * Math.PI * 320 * t) * 0.08 * tailEnv
    }

    // 全局振幅包络 — 稍缓的起音使声音更"圆"而不刺
    const globalEnv = t < 0.002
      ? t / 0.002
      : Math.exp(-t * 5.5)

    data[i] = sample * globalEnv
  }

  // 归一化
  let peak = 0
  for (let i = 0; i < length; i++) {
    if (Math.abs(data[i]) > peak) peak = Math.abs(data[i])
  }
  if (peak > 0.95) {
    const scale = 0.95 / peak
    for (let i = 0; i < length; i++) data[i] *= scale
  }

  return buffer
}

function playMuyuSound(): void {
  try {
    const ctx = getAudioContext()

    // 浏览器策略：用户交互前 AudioContext 可能被挂起
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // 懒加载预合成音效
    if (!preRenderedBuffer) {
      preRenderedBuffer = buildMuyuBuffer(ctx)
    }

    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()
    // 适当放大音量
    gainNode.gain.setValueAtTime(3.5, ctx.currentTime)
    source.buffer = preRenderedBuffer
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
  } catch {
    // 静默失败
  }
}

// ========== 类型 ==========
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface FloatingText {
  x: number
  y: number
  text: string
  life: number
  maxLife: number
}

interface AnimState {
  particles: Particle[]
  floatingTexts: FloatingText[]
  ripple: { x: number; y: number; radius: number; opacity: number } | null
  fishScale: number
  fishScaleTarget: number
  shakeX: number
}

// ========== 粒子颜色 ==========
const PARTICLE_COLORS = [
  '#f59e0b',
  '#fbbf24',
  '#fcd34d',
  '#f97316',
  '#ef4444',
  '#fde68a',
  '#fff7ed',
]

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ========== 木鱼绘制 ==========
function drawMuyu(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scale: number,
  shakeX: number,
): void {
  ctx.save()
  ctx.translate(cx + shakeX, cy)
  ctx.scale(scale, scale)

  const r = radius
  const ry = r * 0.85

  // === 外层阴影 ===
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = r * 0.15
  ctx.shadowOffsetY = r * 0.06
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  const bodyGrad = ctx.createRadialGradient(-r * 0.2, -ry * 0.3, r * 0.1, 0, 0, r)
  bodyGrad.addColorStop(0, '#c4956a')
  bodyGrad.addColorStop(0.5, '#a0724a')
  bodyGrad.addColorStop(0.85, '#6b3c2a')
  bodyGrad.addColorStop(1, '#4a2218')
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.restore()

  // === 装饰圈 ===
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.82, ry * 0.82, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = r * 0.02
  ctx.stroke()

  // === 内圈 ===
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.72, ry * 0.72, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = r * 0.015
  ctx.stroke()

  // === 木纹纹理 ===
  for (let i = 1; i <= 4; i++) {
    const t = 0.2 + i * 0.13
    ctx.beginPath()
    ctx.ellipse(0, ry * 0.1, r * t, ry * t * 0.95, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(0,0,0,${0.06 - i * 0.01})`
    ctx.lineWidth = r * 0.01
    ctx.stroke()
  }

  // === 鱼鳞纹 ===
  const scaleRows = 5
  for (let row = -scaleRows; row <= scaleRows; row++) {
    const cy2 = (row / scaleRows) * ry * 0.5
    const rowWidth = Math.sqrt(1 - (cy2 / (ry * 0.5)) ** 2) * r * 0.55
    const count = Math.floor(rowWidth / (r * 0.15))
    for (let j = 0; j < count; j++) {
      const cx2 = (j - (count - 1) / 2) * r * 0.16
      ctx.beginPath()
      ctx.arc(cx2, cy2 - r * 0.02, r * 0.07, Math.PI, 0)
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // === 木鱼嘴/缝 ===
  const slitY = -ry * 0.35
  const slitLen = r * 0.6
  ctx.beginPath()
  ctx.moveTo(0, slitY - slitLen * 0.55)
  ctx.lineTo(0, slitY + slitLen * 0.55)
  ctx.strokeStyle = '#3a1a0a'
  ctx.lineWidth = r * 0.04
  ctx.lineCap = 'round'
  ctx.stroke()

  // 缝的两端小圆形装饰
  const topEnd = slitY - slitLen * 0.55
  const botEnd = slitY + slitLen * 0.55
  for (const sy of [topEnd, botEnd]) {
    ctx.beginPath()
    ctx.arc(0, sy, r * 0.05, 0, Math.PI * 2)
    ctx.fillStyle = '#3a1a0a'
    ctx.fill()
  }

  // === 顶部把手 ===
  const handleY = -ry * 0.9
  ctx.beginPath()
  ctx.moveTo(-r * 0.12, handleY)
  ctx.quadraticCurveTo(-r * 0.15, -ry * 1.2, -r * 0.08, -ry * 1.35)
  ctx.quadraticCurveTo(0, -ry * 1.45, r * 0.08, -ry * 1.35)
  ctx.quadraticCurveTo(r * 0.15, -ry * 1.2, r * 0.12, handleY)
  ctx.closePath()
  const handleGrad = ctx.createLinearGradient(0, handleY, 0, -ry * 1.45)
  handleGrad.addColorStop(0, '#8b5e3c')
  handleGrad.addColorStop(1, '#5c3120')
  ctx.fillStyle = handleGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // === 高光 ===
  ctx.beginPath()
  ctx.ellipse(-r * 0.25, -ry * 0.3, r * 0.22, ry * 0.18, -0.3, 0, Math.PI * 2)
  const highlightGrad = ctx.createRadialGradient(-r * 0.25, -ry * 0.3, 0, -r * 0.25, -ry * 0.3, r * 0.22)
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.2)')
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlightGrad
  ctx.fill()

  ctx.restore()
}

// ========== 组件 ==========
export default function MuyuGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimState>({
    particles: [],
    floatingTexts: [],
    ripple: null,
    fishScale: 1,
    fishScaleTarget: 1,
    shakeX: 0,
  })
  const countRef = useRef(loadTodayCount())
  const rafRef = useRef(0)
  const [count, setCount] = useState(countRef.current.count)
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 500 })

  // Canvas 尺寸适配
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const w = Math.min(rect.width, 500)
      const h = Math.min(rect.height || 500, 560)
      setCanvasSize({ w, h })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 主渲染循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const s = animRef.current
    const { w, h } = canvasSize

    // 弹回
    s.fishScale += (s.fishScaleTarget - s.fishScale) * 0.2
    // 震动衰减
    s.shakeX *= 0.8
    if (Math.abs(s.shakeX) < 0.1) s.shakeX = 0

    // 涟漪
    if (s.ripple) {
      s.ripple.radius += 1.8
      s.ripple.opacity -= 0.015
      if (s.ripple.opacity <= 0) s.ripple = null
    }

    // 更新粒子
    s.particles = s.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.08
      p.life--
      return p.life > 0
    })

    // 更新浮动文字
    s.floatingTexts = s.floatingTexts.filter(ft => {
      ft.y -= 1.2
      ft.life--
      return ft.life > 0
    })

    // === 绘制 ===
    ctx.clearRect(0, 0, w, h)

    // 背景
    const bgGrad = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.7)
    bgGrad.addColorStop(0, '#fef7ed')
    bgGrad.addColorStop(1, '#f5e6d3')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // 装饰性背景圈
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.38, canvasSize.w * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fill()

    // 涟漪
    if (s.ripple) {
      ctx.beginPath()
      ctx.arc(s.ripple.x, s.ripple.y, s.ripple.radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(180,120,60,${s.ripple.opacity})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 木鱼
    const fishR = canvasSize.w * 0.27
    drawMuyu(ctx, w / 2, h * 0.38, fishR, s.fishScale, s.shakeX)

    // 粒子
    s.particles.forEach(p => {
      const alpha = p.life / p.maxLife
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = hexToRgba(p.color, alpha)
      ctx.fill()
    })

    // 浮动文字
    s.floatingTexts.forEach(ft => {
      const alpha = ft.life / ft.maxLife
      ctx.font = `bold ${Math.floor(canvasSize.w * 0.05)}px "Microsoft YaHei", sans-serif`
      ctx.fillStyle = `rgba(139,90,40,${alpha})`
      ctx.textAlign = 'center'
      ctx.fillText(ft.text, ft.x, ft.y)
    })

    rafRef.current = requestAnimationFrame(animate)
  }, [canvasSize])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])

  // 敲击！
  const handleKnock = useCallback((_clientX: number, _clientY: number) => {
    // 更新计数
    const todayKey = getTodayKey()
    if (countRef.current.date !== todayKey) {
      countRef.current = { date: todayKey, count: 0 }
    }
    countRef.current.count++
    saveTodayCount(countRef.current)
    setCount(countRef.current.count)

    // 音效
    playMuyuSound()

    // 动画
    const s = animRef.current
    const fishCX = canvasSize.w / 2
    const fishCY = canvasSize.h * 0.38

    s.fishScaleTarget = 0.85
    setTimeout(() => { s.fishScaleTarget = 1 }, 80)

    s.shakeX = (Math.random() - 0.5) * 6
    s.ripple = { x: fishCX, y: fishCY, radius: 10, opacity: 0.7 }

    // 粒子爆发
    const particleCount = 25
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const speed = 1.5 + Math.random() * 5
      s.particles.push({
        x: fishCX + (Math.random() - 0.5) * 20,
        y: fishCY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 25 + Math.floor(Math.random() * 20),
        maxLife: 45,
        size: 1.5 + Math.random() * 3.5,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      })
    }

    // 浮动文字
    const texts = ['功德 +1', '善哉', '阿弥陀佛', '般若', '🙏', '✨', '圆满', '自在']
    const txt = texts[Math.floor(Math.random() * texts.length)]
    s.floatingTexts.push({
      x: fishCX + (Math.random() - 0.5) * 60,
      y: fishCY - 40,
      text: txt,
      life: 40,
      maxLife: 40,
    })

    // 限制数量
    if (s.particles.length > 150) s.particles = s.particles.slice(-150)
    if (s.floatingTexts.length > 12) s.floatingTexts = s.floatingTexts.slice(-12)
  }, [canvasSize])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    handleKnock(e.clientX, e.clientY)
  }, [handleKnock])

  const handleCanvasTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length > 0) {
      handleKnock(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleKnock])

  // 键盘支持
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleKnock(0, 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleKnock])

  const todayKey = getTodayKey()
  const isNewDay = countRef.current.date !== todayKey

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center select-none">
      {/* 计数面板 */}
      <div className="text-center mb-2">
        <p className="text-xs text-stone-400 tracking-wider">功 德</p>
        <p className="text-4xl font-bold text-amber-700 tabular-nums">
          {(isNewDay ? 0 : count).toLocaleString()}
        </p>
        <p className="text-xs text-stone-400 mt-0.5">今日敲击次数</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouch}
        className="cursor-pointer rounded-2xl"
        style={{ maxWidth: '100%', maxHeight: '60vh' }}
      />

      {/* 提示 */}
      <p className="text-xs text-stone-300 mt-3 text-center">
        点击木鱼 或 按空格键 · 静心凝神 🙏
      </p>
    </div>
  )
}
