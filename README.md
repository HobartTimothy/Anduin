<div align="center">

# <img src="resources/icons/icon.jpg" alt="Anduin" width="64" height="64">

# Anduin

**一个优雅的 Markdown 文本编辑器**

[![License](https://img.shields.io/badge/license-Apache%20License-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-37.3.1-47848F.svg)](https://www.electronjs.org/)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)](package.json)

*基于 Node.js + Electron 构建*

</div>

---

## 📖 简介

Anduin 是一款现代化的 Markdown 文本编辑器，提供直观的双栏编辑体验：左侧编辑区与右侧实时预览。界面简洁优雅，功能强大，支持跨平台使用。

## ✨ 主要特性

- 📝 **双栏编辑**：左侧编辑区 + 右侧实时预览
- 🎨 **主题切换**：支持 Github 与 Night 主题
- 📋 **丰富的格式支持**：
  - 标题、列表、任务列表
  - 加粗、斜体、行内代码、代码块
  - 表格编辑（插入、对齐、删除等）
- 🖥️ **跨平台支持**：
  - Windows（64 位 + 32 位）
  - macOS（Intel + Apple Silicon）
  - Linux（64 位 + 32 位）
- 🔗 **系统集成**：
  - 文件关联（`.md` 文件）
  - 右键菜单支持（Windows）
- 📱 **菜单栏**：文件 / 编辑 / 段落 / 格式 / 视图 / 主题 / 帮助

## 🚀 快速开始

### 环境要求

- Node.js（推荐最新 LTS 版本）
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 运行开发版本

```bash
npm run dev
```

## 📦 打包发布

### 图标文件

应用图标位于 `resources/icons/icon.jpg`。electron-builder 会自动将其转换为各平台所需的格式：

- **Windows**: `.ico` 或 `.jpg`
- **macOS**: `.icns`（自动生成）
- **Linux**: `.png`（自动生成）

如果需要更高质量的图标，可以准备：
- macOS: `icon.icns` (1024x1024)
- Linux: `icon.png` (512x512)
- Windows: `icon.ico` 或 `icon.jpg`

### Windows 打包

```bash
# 打包为安装程序（推荐）
npm run build

# 或者打包为目录（用于测试）
npm run build:dir
```

打包完成后，安装程序将生成在 `dist/` 目录下。

**Windows 打包说明：**
- 支持 64 位 (x64) 和 32 位 (ia32) 架构
- 生成 NSIS 安装程序
- 默认会同时构建两个架构版本

**Windows 安装程序功能：**

- **文件关联**：将 `.md` 文件关联到 Anduin
- **右键菜单**：
  - **使用 Anduin 打开**：在任何文件或 `.md` 文件上右键，选择"使用 Anduin 打开"
  - **新建 Markdown 文件**：在文件夹或文件夹背景上右键，选择"新建 Markdown 文件"

### macOS 打包

**注意：** macOS 打包需要在 macOS 系统上进行。

```bash
# 打包为 DMG 安装包
npm run build:mac

# 或者打包为目录（用于测试）
npm run build:mac -- --dir
```

打包完成后，DMG 文件将生成在 `dist/` 目录下。

**macOS 打包说明：**
- 支持 x64 和 arm64 (Apple Silicon) 架构
- 生成 DMG 安装包
- 需要 macOS 系统才能打包

### Linux 打包

```bash
# 打包为 AppImage 和 DEB 包
npm run build:linux

# 或者打包为目录（用于测试）
npm run build:linux -- --dir
```

打包完成后，AppImage 和 DEB 文件将生成在 `dist/` 目录下。

**Linux 打包说明：**
- 支持 64 位 (x64) 和 32 位 (ia32) 架构
- 生成 AppImage（通用，无需安装）和 DEB（Debian/Ubuntu）两种格式
- 默认会同时构建两个架构版本
- 自动配置桌面文件关联 `.md` 文件

### 多平台打包

```bash
# 打包所有平台（Windows、macOS、Linux）
npm run build:all

# 或者生成所有平台的发布版本
npm run dist:all
```

**注意：**
- Windows 打包可以在任何系统上进行
- macOS 打包必须在 macOS 系统上进行
- Linux 打包可以在 Linux 或 macOS 系统上进行

## 🤖 自动发布

项目支持通过 GitHub Actions 实现自动化构建和发布。当Publish Release时，会自动触发构建流程，生成各平台的安装包并发布到 GitHub Release中。

### 前置准备

1. **配置 GitHub Token：**
   - 在 GitHub 仓库设置中，确保 Actions 权限已启用
   - GitHub Actions 会自动使用内置的 `GITHUB_TOKEN`，无需额外配置

2. **创建工作流文件：**
   - 在项目根目录创建 `.github/workflows/release.yml` 文件
   - 配置 electron-builder 的发布策略

### 发布流程

1. **更新版本号：**
   ```bash
   # 在 package.json 中更新 version 字段
   # 例如：从 "0.1.0" 更新到 "0.1.1"
   ```

2. **创建并推送 Tag：**
   ```bash
   # 创建带注释的 tag（推荐）
   git tag -a v0.1.1 -m "Release version 0.1.1"
   git push origin v0.1.1
   
   # 或者创建轻量级 tag
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. **自动构建和发布：**
   - GitHub Actions 检测到新 Publish Release 后自动触发工作流
   - 在 Windows、macOS、Linux 三个平台上并行构建
   - 构建完成后自动上传到 GitHub Release

### 构建产物

自动发布流程会生成以下安装包：

- **Windows：**
  - NSIS 安装程序（x64）
  
- **macOS：**
  - DMG 安装包（x64 + arm64）
  
- **Linux：**
  - AppImage（x64）
  - DEB 包（x64）

### 版本命名规范

- 使用语义化版本（Semantic Versioning）：`主版本号.次版本号.修订号`
- Tag 名称格式：`v` + 版本号，如 `v0.1.0`、`v1.0.0`、`v2.1.3`
- 预发布版本：使用 `-` 分隔，如 `v1.0.0-beta.1`、`v1.0.0-rc.1`
- 预发布版本会自动标记为 GitHub Release 的预发布状态

### 工作流配置示例

在 `.github/workflows/release.yml` 中配置：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/**
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 注意事项

- 确保 `package.json` 中的版本号与 tag 名称一致（tag 去掉 `v` 前缀）
- macOS 构建需要在 macOS 运行器上执行（GitHub Actions 自动处理）
- 首次发布前，建议先在本地测试构建流程
- 如果构建失败，可以在 GitHub Actions 页面查看详细日志

## 🛠️ 开发

### 代码检查

```bash
# 检查代码
npm run lint

# 自动修复代码问题
npm run lint:fix
```

## 📄 许可证

本项目采用 Apache License 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 👤 作者

**Robert.HU**

- 项目主页：[Website](#)
- GitHub：[Anduin](#)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

<div align="center">

**Made with ❤️ by Robert.HU**

</div>
