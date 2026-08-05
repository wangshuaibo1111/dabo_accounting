---
name: rebuild-app
description: 重新打包应用 — 自动检测打包方式，生成可部署的构建产物
---

# 重新打包应用技能

当用户调用 `/rebuild-app` 或说"重新打包""构建应用""打包exe""重新构建"等时，按以下流程执行。

---

## 执行流程

### 第 1 步：检测打包方式 🔍

检查 `package.json` 中的脚本和项目配置，确定当前可用的打包方式：

```bash
grep -E '"(build|package|dist|make|tauri|electron)' package.json
```

同时检查相关配置文件是否存在：

```bash
ls vite.config.ts electron-builder.yml src-tauri/Cargo.toml 2>/dev/null
```

根据检测结果确定打包方式，告知用户当前项目支持什么。

---

### 第 2 步：清理旧构建产物 🧹

删除上次的构建输出，确保全新构建：

```bash
# Git Bash / macOS / Linux
rm -rf dist/ out/ release/
# 如果上述命令不可用（Windows CMD），改用：
# cmd //c "rd /s /q dist 2>nul & rd /s /q out 2>nul & rd /s /q release 2>nul"
```

---

### 第 3 步：确认依赖 📦

同 `/run-app` 第 1 步，检查 `node_modules` 是否存在，不存在则 `npm install`。

---

### 第 4 步：执行构建 🏗️

根据第 1 步检测到的打包方式执行对应命令：

| 打包方式 | 命令 |
|---------|------|
| Vite Web 构建 | `npm run build` |
| Electron | `npm run package` 或 `npx electron-builder` |
| Tauri | `npm run tauri build` |
| Capacitor | `npx cap sync && npx cap build` |

如果检测到多种方式，询问用户选择哪种。

---

### 第 5 步：验证构建结果 ✅

检查产物是否生成：

- `dist/` 目录 → Web 静态文件，可部署到任意静态服务器
- `out/` 或 `release/` 目录 → 桌面应用安装包
- 列出产物的文件名和大小：

```bash
find dist/ out/ release/ -type f -name "*.exe" -o -name "*.dmg" -o -name "*.html" 2>/dev/null | head -20
```

---

### 第 6 步：报告结果 📊

用表格告知用户：

| 项目 | 内容 |
|------|------|
| 打包方式 | xxx |
| 产物位置 | `dist/` 或 `release/` |
| 产物大小 | xxx MB |
| 如何使用 | 打开方式说明 |

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 构建报错 | 展示错误信息，分析原因 |
| 磁盘空间不足 | 提醒用户清理空间 |
| TypeScript 类型错误 | 先修复类型错误再构建 |
| 当前不支持 exe 打包 | 诚实告知，说明原因，给出替代方案（Web 构建 + PWA） |

---

## 禁止行为

- ❌ 构建失败不告知用户
- ❌ 跳过清理步骤导致残留旧文件
- ❌ 明明不能打 exe 却假装可以
