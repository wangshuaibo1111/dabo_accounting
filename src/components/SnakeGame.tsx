import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

const GRID_SIZE = 20
const CELL_SIZE = 20
const HIGH_SCORE_KEY = 'snake_high_score'
const MAX_FOOD_ATTEMPTS = 200

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

const DIRECTION_DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
}

function getHighScore(): number {
  try { return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0 } catch { console.warn('读取贪吃蛇最高分失败'); return 0 }
}

function saveHighScore(score: number): void {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(score)) } catch { console.warn('保存贪吃蛇最高分失败') }
}

function createInitialSnake(): Point[] {
  const mid = Math.floor(GRID_SIZE / 2)
  return [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }]
}

function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  for (let i = 0; i < MAX_FOOD_ATTEMPTS; i++) {
    const food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    if (!occupied.has(`${food.x},${food.y}`)) return food
  }
  // 兜底：几乎撑满时遍历找空位
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) return { x, y }
    }
  }
  // 全满了（极少见），返回随机位置
  return { x: 0, y: 0 }
}

interface GameState {
  snake: Point[]
  food: Point
  direction: Direction
  gameOver: boolean
  score: number
  isPaused: boolean
  speed: number
  hasStarted: boolean
}

export default function SnakeGame(): JSX.Element {
  const [state, setState] = useState<GameState>({
    snake: createInitialSnake(),
    food: randomFood(createInitialSnake()),
    direction: 'right',
    gameOver: false,
    score: 0,
    isPaused: false,
    speed: 150,
    hasStarted: false,
  })
  const [highScore, setHighScore] = useState(getHighScore)

  const stateRef = useRef(state)
  stateRef.current = state

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current

      // 游戏未开始：按方向键/WASD/空格开始，方向也同步设置
      if (!s.hasStarted && !s.gameOver) {
        if (e.key in DIRECTION_KEYS) {
          e.preventDefault()
          setState((prev) => ({ ...prev, hasStarted: true, direction: DIRECTION_KEYS[e.key] }))
          return
        }
        if (e.key === ' ') {
          e.preventDefault()
          setState((prev) => ({ ...prev, hasStarted: true }))
          return
        }
        return
      }

      // 方向键
      if (e.key in DIRECTION_KEYS) {
        e.preventDefault()
        const newDir = DIRECTION_KEYS[e.key]
        setState((prev) => {
          if (OPPOSITE[newDir] === prev.direction) return prev
          return { ...prev, direction: newDir }
        })
        return
      }

      // 空格暂停（仅游戏进行中）
      if (e.key === ' ') {
        if (!s.gameOver && s.hasStarted) {
          e.preventDefault()
          setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 游戏循环
  useEffect(() => {
    const s = stateRef.current
    if (s.gameOver || s.isPaused || !s.hasStarted) return

    const tick = () => {
      setState((prev) => {
        if (prev.gameOver || prev.isPaused || !prev.hasStarted) return prev

        const head = prev.snake[0]
        const newHead: Point = {
          x: head.x + DIRECTION_DELTA[prev.direction].x,
          y: head.y + DIRECTION_DELTA[prev.direction].y,
        }

        // 撞墙
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          return { ...prev, gameOver: true }
        }

        // 撞自己 — 排除尾巴（尾巴本回合会被移除，除非吃到了食物）
        const eating = newHead.x === prev.food.x && newHead.y === prev.food.y
        const bodyToCheck = eating ? prev.snake : prev.snake.slice(0, -1)
        if (bodyToCheck.some((p) => p.x === newHead.x && p.y === newHead.y)) {
          return { ...prev, gameOver: true }
        }

        const newSnake = [newHead, ...prev.snake]

        if (eating) {
          const ns = prev.score + 1
          const newSpeed = ns % 5 === 0 ? Math.max(50, prev.speed - 20) : prev.speed
          return {
            ...prev,
            snake: newSnake,
            food: randomFood(newSnake),
            score: ns,
            speed: newSpeed,
          }
        }

        newSnake.pop()
        return { ...prev, snake: newSnake }
      })
    }

    const timer = setInterval(tick, state.speed)
    return () => clearInterval(timer)
  }, [state.speed, state.gameOver, state.isPaused, state.hasStarted])

  // 游戏结束时更新最高分
  useEffect(() => {
    if (state.gameOver && state.score > highScore) {
      setHighScore(state.score)
      saveHighScore(state.score)
    }
  }, [state.gameOver, state.score, highScore])

  const startGame = useCallback(() => {
    setState((prev) => ({ ...prev, hasStarted: true }))
  }, [])

  const restart = useCallback(() => {
    const s = createInitialSnake()
    setState({
      snake: s,
      food: randomFood(s),
      direction: 'right',
      gameOver: false,
      score: 0,
      isPaused: false,
      speed: 150,
      hasStarted: true,
    })
  }, [])

  // 预计算蛇身位置集合（性能优化：O(1) 查找替代 O(n) 扫描）
  const snakePositionSet = useMemo(() => {
    const set = new Set(state.snake.map((p) => `${p.x},${p.y}`))
    const headKey = state.snake.length > 0 ? `${state.snake[0].x},${state.snake[0].y}` : null
    return { set, headKey }
  }, [state.snake])

  const foodKey = `${state.food.x},${state.food.y}`

  return (
    <div className="flex flex-col items-center select-none">
      {/* 头部信息 */}
      <div className="flex items-center gap-6 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-400">🏆 最高分</p>
          <p className="text-2xl font-bold text-amber-500">{highScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">当前分数</p>
          <p className="text-2xl font-bold text-cyan-600">{state.score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">长度</p>
          <p className="text-2xl font-bold text-emerald-600">{state.snake.length}</p>
        </div>
      </div>

      {/* 游戏画布 */}
      <div
        className="relative bg-gray-100 rounded-2xl border-4 border-gray-200 overflow-hidden shadow-inner"
        style={{ width: GRID_SIZE * CELL_SIZE + 4, height: GRID_SIZE * CELL_SIZE + 4 }}
      >
        {/* 网格背景 */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
            const x = i % GRID_SIZE
            const y = Math.floor(i / GRID_SIZE)
            const key = `${x},${y}`
            const head = key === snakePositionSet.headKey
            const body = !head && snakePositionSet.set.has(key)
            const foodCell = key === foodKey
            return (
              <div
                key={i}
                className={`
                  border border-gray-200/50
                  ${head ? 'bg-emerald-500 rounded-sm scale-110' : ''}
                  ${body ? 'bg-emerald-400 rounded-sm' : ''}
                  ${foodCell ? 'bg-rose-400 rounded-full scale-75' : ''}
                  transition-all duration-75
                `}
              />
            )
          })}
        </div>

        {/* 通用遮罩层 */}
        {(!state.hasStarted || state.gameOver || state.isPaused) && (
          <Overlay dim={state.gameOver}>
            {!state.hasStarted && !state.gameOver ? (
              <>
                <p className="text-4xl mb-3">🐍</p>
                <p className="text-gray-700 font-semibold text-lg mb-1">贪吃蛇</p>
                <p className="text-xs text-gray-400 mb-4">方向键/WASD 移动 · 空格暂停</p>
                <button onClick={startGame}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm shadow-cyan-200 active:scale-95"
                >开始游戏</button>
              </>
            ) : state.gameOver ? (
              <>
                <p className="text-3xl mb-2">😵</p>
                <p className="text-gray-700 font-semibold mb-1">游戏结束</p>
                <p className="text-sm text-gray-400 mb-1">得分：{state.score} | 长度：{state.snake.length}</p>
                {state.score > highScore && state.score > 0 && (
                  <p className="text-sm text-amber-500 font-medium mb-2">🎉 新纪录！</p>
                )}
                <button onClick={restart}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-sm shadow-cyan-200 active:scale-95"
                >再来一局</button>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">⏸️</p>
                <p className="text-gray-700 font-semibold">暂停中</p>
                <p className="text-xs text-gray-400 mt-1">按空格键继续</p>
              </>
            )}
          </Overlay>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-4 flex gap-4 items-center">
        <span className="text-xs text-gray-400">⬆⬇⬅➡ / WASD 移动</span>
        <span className="text-xs text-gray-300">|</span>
        <span className="text-xs text-gray-400">空格 暂停</span>
        {state.hasStarted && !state.gameOver && (
          <>
            <span className="text-xs text-gray-300">|</span>
            <button onClick={restart}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >🔄 重新开始</button>
          </>
        )}
      </div>
    </div>
  )
}

/** 遮罩层小组件 */
function Overlay({ dim, children }: { dim?: boolean; children: React.ReactNode }) {
  return (
    <div className={`absolute inset-0 ${dim ? 'bg-black/40' : 'bg-black/30'} flex items-center justify-center rounded-2xl`}>
      <div className="text-center bg-white rounded-2xl px-6 py-5 shadow-lg">{children}</div>
    </div>
  )
}
