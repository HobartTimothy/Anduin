## Anduin
markdown 文本编辑器（基于 Node.js + Electron）

### 运行

```bash
npm install
npm run dev
```

### 打包为可执行程序

#### 1. 准备图标文件（可选）

图标文件位于 `resources/icons/icon.jpg`。electron-builder 会自动将其转换为各平台所需的格式：
- Windows: `.ico` 或 `.jpg`
- macOS: `.icns`（自动生成）
- Linux: `.png`（自动生成）

如果需要更高质量的图标，可以准备：
- macOS: `icon.icns` (1024x1024)
- Linux: `icon.png` (512x512)
- Windows: `icon.ico` 或 `icon.jpg`

#### 2. Windows 打包

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

#### 3. macOS 打包

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

#### 4. Linux 打包

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

#### 5. 多平台打包

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

### 自动发布到 GitHub Release

项目配置了 GitHub Actions 自动发布流程。当你推送一个新的 Git Tag 时，会自动构建并发布到 GitHub Release。

#### 使用方法

1. **创建并推送 Tag：**
   ```bash
   # 创建 tag（推荐使用语义化版本，如 v1.0.0）
   git tag v1.0.0
   git push origin v1.0.0
   
   # 或者创建带注释的 tag
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **GitHub Actions 会自动：**
   - 在 Windows、macOS、Linux 三个平台上构建应用
   - Windows 和 Linux 会同时构建 64 位和 32 位版本
   - 将构建产物上传到 GitHub Release
   - 创建 Release 页面，包含所有平台的安装包

#### Workflow 文件说明

项目提供了两个 workflow 文件：

- **`.github/workflows/release.yml`**（推荐）：
  - 使用 electron-builder 内置的 publish 功能
  - 更简单，自动处理 Release 创建和文件上传
  - 需要配置 `GH_TOKEN` 环境变量（GitHub Actions 自动提供）

- **`.github/workflows/release-with-action.yml`**（备选）：
  - 使用 `softprops/action-gh-release` 手动创建 Release
  - 更灵活，可以自定义 Release 说明
  - 适合需要更精细控制 Release 内容的场景

#### 注意事项

- Tag 名称建议使用语义化版本格式：`v1.0.0`、`v1.0.1`、`v2.0.0-beta.1` 等
- 如果 tag 名称包含 `-`（如 `v1.0.0-beta.1`），会自动标记为预发布版本
- 确保 GitHub Actions 有足够的权限（在仓库设置中启用 Actions 和 Release 权限）
- 默认使用 `release.yml`，如需使用备选方案，可以重命名或删除 `release.yml`

### 功能概览

- **Markdown 编辑**：左侧编辑区 + 右侧实时预览
- **菜单栏**：文件 / 编辑 / 段落 / 格式 / 视图 / 主题 / 帮助（参考 Typora）
- **格式操作**：标题、列表、任务列表、加粗、斜体、行内代码、代码块等
- **表格编辑**：插入表格、表格工具栏、对齐、删除等功能
- **主题**：Github 与 Night 主题切换
- **跨平台支持**：Windows（64 位 + 32 位）、macOS（Intel + Apple Silicon）、Linux（64 位 + 32 位）
- **系统集成**：文件关联、右键菜单支持（Windows）

你可以在此基础上继续扩展数学工具、表格、图片插入等高级功能。

