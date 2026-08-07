#!/bin/bash
# ============================================================
# Git Push 清道夫 — PostToolUse 钩子
#
# 当 git push 成功后，立即删除质量门通行证。
# 保证下一次提交必须重新通过检查。
#
# push 失败时不删除 — 保留通行证供用户重试。
# ============================================================

set -euo pipefail

# --- 读取 stdin JSON ---
INPUT=$(cat 2>/dev/null || echo '{}')

# 提取命令和退出码
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || \
         echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')

# 只处理 git push 命令
if ! echo "$COMMAND" | grep -qE 'git push'; then
  exit 0
fi

# 排除 --dry-run
if echo "$COMMAND" | grep -q '\-\-dry-run'; then
  exit 0
fi

# 检查工具执行是否成功（通过 stdin 中的 exitCode 或 error 字段判断）
EXIT_CODE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exitCode',0))" 2>/dev/null || echo "")
ERROR=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','ok'))" 2>/dev/null || echo "")

# 如果有 error 字段且不是 "ok"，则为失败
if [ -n "$ERROR" ] && [ "$ERROR" != "ok" ] && [ "$ERROR" != "" ]; then
  echo "[cleanup] git push 可能失败，保留通行证" >&2
  exit 0
fi

if [ "$EXIT_CODE" != "" ] && [ "$EXIT_CODE" != "0" ]; then
  echo "[cleanup] git push 失败 (exit=$EXIT_CODE)，保留通行证" >&2
  exit 0
fi

# --- 删除通行证 ---
MARKER_DIR=".claude/.quality-gate"
DELETED=0

if [ -f "$MARKER_DIR/tester.json" ]; then
  rm -f "$MARKER_DIR/tester.json"
  DELETED=1
fi

if [ -f "$MARKER_DIR/quality-engineer.json" ]; then
  rm -f "$MARKER_DIR/quality-engineer.json"
  DELETED=1
fi

if [ $DELETED -eq 1 ]; then
  echo "[cleanup] 🧹 通行证已作废，下次提交需重新检查" >&2
fi

exit 0
