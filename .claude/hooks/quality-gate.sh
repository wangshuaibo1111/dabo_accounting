#!/bin/bash
# ============================================================
# Git Commit 质量门 — PreToolUse 钩子（守门员）
#
# 拦截所有 Bash(git commit ...) 调用，检查是否持有两张有效通行证：
#   - tester.json         (单元测试通过)
#   - quality-engineer.json (质量审查通过)
#
# 放行条件：两张证都存在、未过期(10分钟内)、passed=true
# 阻止条件：缺证、过期、passed=false
#
# 例外放行：git commit --amend、git commit --no-verify
# ============================================================

set -euo pipefail

# --- 读取 stdin JSON，提取命令 ---
INPUT=$(cat 2>/dev/null || echo '{}')

# 从 JSON 中提取 command 字段
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || \
         echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

# 只拦截包含 "git commit" 的命令（排除 git commit --amend）
if ! echo "$COMMAND" | grep -qE 'git commit'; then
  exit 0
fi

# --- 例外放行 ---

# --amend：修改已有提交，不需要重新检查
if echo "$COMMAND" | grep -q '\-\-amend'; then
  echo "[quality-gate] --amend 提交通行，跳过检查" >&2
  exit 0
fi

# --no-verify：用户明确跳过
if echo "$COMMAND" | grep -q '\-\-no-verify'; then
  echo "[quality-gate] --no-verify 提交通行，跳过检查" >&2
  exit 0
fi

# 环境变量跳过
if [ "${BYPASS_QUALITY_GATE:-0}" = "1" ]; then
  echo "[quality-gate] BYPASS_QUALITY_GATE=1，跳过检查" >&2
  exit 0
fi

# --- 检查通行证 ---

MARKER_DIR=".claude/.quality-gate"
NOW=$(date +%s)
MAX_AGE=600  # 10 分钟 = 600 秒

check_pass() {
  local file="$1"
  local name="$2"

  # 文件不存在
  if [ ! -f "$file" ]; then
    echo "[quality-gate] ❌ 阻止：缺少「${name}」通行证" >&2
    echo "[quality-gate]    请先运行 /gitcommit-agent 或手动执行 tester + quality-engineer" >&2
    return 1
  fi

  # 提取时间戳并检查是否过期
  local ts
  ts=$(grep -o '"timestamp":"[^"]*"' "$file" 2>/dev/null | head -1 | sed 's/"timestamp":"//;s/"$//')
  if [ -n "$ts" ]; then
    # 尝试用 date 命令转换 ISO 8601 → Unix 时间戳
    local ts_epoch
    ts_epoch=$(date -d "$ts" +%s 2>/dev/null || echo 0)
    if [ "$ts_epoch" = "0" ]; then
      # 备用方案：用 python3 解析
      ts_epoch=$(python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('${ts/+00:00/Z}'.replace('Z','+00:00')).timestamp()))" 2>/dev/null || echo 0)
    fi

    if [ "$ts_epoch" != "0" ]; then
      local age=$((NOW - ts_epoch))
      if [ $age -gt $MAX_AGE ]; then
        echo "[quality-gate] ❌ 阻止：「${name}」通行证已过期（${age}秒前，有效期${MAX_AGE}秒）" >&2
        echo "[quality-gate]    请重新运行检查" >&2
        return 1
      fi
    fi
  fi

  # 检查 passed 字段
  local passed
  passed=$(grep -o '"passed":[^,}]*' "$file" 2>/dev/null | head -1 | sed 's/"passed"://;s/[[:space:]]//g')
  if [ "$passed" != "true" ]; then
    local summary
    summary=$(grep -o '"summary":"[^"]*"' "$file" 2>/dev/null | head -1 | sed 's/"summary":"//;s/"$//')
    echo "[quality-gate] ❌ 阻止：「${name}」检查未通过 — ${summary:-未提供原因}" >&2
    return 1
  fi

  echo "[quality-gate] ✅ 「${name}」通行证有效" >&2
  return 0
}

RESULT=0
check_pass "$MARKER_DIR/tester.json" "单元测试" || RESULT=1
check_pass "$MARKER_DIR/quality-engineer.json" "质量审查" || RESULT=1

if [ $RESULT -ne 0 ]; then
  echo "[quality-gate] ⛔ 提交被阻止。请修复问题后重新运行 /gitcommit-agent" >&2
  exit 2
fi

echo "[quality-gate] ✅ 两张通行证均有效，放行提交" >&2
exit 0
