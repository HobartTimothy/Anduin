/**
 * src/main/index.js
 * Anduin - Markdown 编辑器主进程入口
 */

// 1. 错误抑制逻辑 (Keep Clean)
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const originalStdoutWrite = process.stdout.write.bind(process.stdout);

function isIgnorableConsoleMessage(chunk) {
    if (!chunk) return false;
    const text = typeof chunk === 'string' ? chunk : chunk.toString();
    return text.includes('libpng warning: iCCP') ||
           text.includes('cHRM chunk does not match sRGB');
}

process.stderr.write = (chunk, encoding, fd) => {
    return isIgnorableConsoleMessage(chunk) ? true : originalStderrWrite(chunk, encoding, fd);
};

process.stdout.write = (chunk, encoding, fd) => {
    return isIgnorableConsoleMessage(chunk) ? true : originalStdoutWrite(chunk, encoding, fd);
};

// 2. 模块导入
const { app, BrowserWindow, Menu, shell, dialog, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// 导入重构后的服务和工具
const FileService = require('./services/FileService');
const { createMenuTemplate, changeLanguage } = require('./menus');
const i18n = require('../shared/i18n');
const themeManager = require('../shared/theme');

// 3. 配置常量
const AppConfig = {
    WINDOWS: {
        PRIMARY: { width: 1280, height: 800 },
        PREFERENCES: { width: 900, height: 600 },
        ABOUT: { width: 550, height: 280 }
    },
    DELAYS: {
        FOCUS: 100,
        RENDER: 500,
        PRINT_CLOSE: 1000
    }
};

// 4. 全局状态
let primaryWindow = null;      // 重命名: mainWindow -> primaryWindow
let preferencesWindow = null;
let aboutWindow = null;
let initialFilePath = null;    // 重命名: fileToOpen -> initialFilePath
let createTargetDir = null;    // 重命名: newMdPath -> createTargetDir
let fileService = null;        // 重命名: fileUtils -> fileService

/**
 * 创建主应用窗口
 * @param {string|null} filePathToLoad - 启动时加载的文件路径
 */
function createPrimaryWindow(filePathToLoad = null) {
    primaryWindow = new BrowserWindow({
        width: AppConfig.WINDOWS.PRIMARY.width,
        height: AppConfig.WINDOWS.PRIMARY.height,
        icon: path.join(__dirname, '../../resources/icons/icon.jpg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true
        },
        focusable: true,
        show: false
    });

    primaryWindow.once('ready-to-show', () => {
        primaryWindow.show();
        primaryWindow.focus();
    });

    primaryWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    primaryWindow.on('closed', () => {
        primaryWindow = null;
        if (fileService) fileService.setTargetWindow(null);
    });

    primaryWindow.on('focus', () => {
        setTimeout(() => {
            if (primaryWindow && !primaryWindow.isDestroyed()) {
                primaryWindow.webContents.focus();
            }
        }, AppConfig.DELAYS.FOCUS);
    });

    // 初始化文件服务
    fileService = new FileService(primaryWindow);

    // 过滤 DevTools 消息
    primaryWindow.webContents.on('console-message', ({ message }) => {
        if (message && (
            message.includes('Autofill.enable') || 
            message.includes('Autofill.setAddresses')
        )) {
            return;
        }
    });

    // 窗口加载完成后的初始化操作
    primaryWindow.webContents.once('did-finish-load', () => {
        const currentLocale = i18n.currentLocale() || 'en';
        primaryWindow.webContents.send('language-changed', currentLocale);
        
        const currentThemeId = themeManager.getCurrentTheme().id;
        primaryWindow.webContents.send('theme-changed', currentThemeId);
        
        if (filePathToLoad) {
            fileService.openFile(filePathToLoad);
        }
    });

    setupAppMenu();
}


function setupAppMenu() {
    const template = createMenuTemplate(
        sendMessageToRenderer, 
        fileService, 
        primaryWindow, 
        openPreferencesWindow
    );
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function sendMessageToRenderer(channel, payload) {
    primaryWindow?.webContents.send(channel, payload);
}

function openPreferencesWindow() {
    if (preferencesWindow) {
        preferencesWindow.focus();
        return;
    }

    preferencesWindow = new BrowserWindow({
        width: AppConfig.WINDOWS.PREFERENCES.width,
        height: AppConfig.WINDOWS.PREFERENCES.height,
        parent: primaryWindow,
        modal: false,
        icon: path.join(__dirname, '../../resources/icons/icon.jpg'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: '偏好设置',
        resizable: true,
        minimizable: true,
        maximizable: true
    });

    preferencesWindow.loadFile(path.join(__dirname, '../preferences/preferences.html'));

    preferencesWindow.webContents.once('did-finish-load', () => {
        const currentLocale = i18n.currentLocale() || 'en';
        preferencesWindow.webContents.send('language-changed', currentLocale);
    });

    preferencesWindow.on('closed', () => {
        preferencesWindow = null;
    });

    preferencesWindow.setMenuBarVisibility(false);
}

function openAboutWindow() {
    if (aboutWindow) {
        aboutWindow.focus();
        return;
    }

    aboutWindow = new BrowserWindow({
        width: AppConfig.WINDOWS.ABOUT.width,
        height: AppConfig.WINDOWS.ABOUT.height,
        parent: primaryWindow,
        modal: true,
        icon: path.join(__dirname, '../../resources/icons/icon.jpg'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: '关于 Anduin',
        resizable: false,
        minimizable: false,
        maximizable: false,
        frame: true,
        autoHideMenuBar: true
    });

    aboutWindow.loadFile(path.join(__dirname, '../about/about.html'));

    aboutWindow.webContents.once('did-finish-load', () => {
        const currentLocale = i18n.currentLocale() || 'en';
        aboutWindow.webContents.send('language-changed', currentLocale);
    });

    aboutWindow.on('closed', () => {
        aboutWindow = null;
    });
}

// ==================== IPC 事件处理 ====================

/**
 * 打开主题文件夹
 * 在用户数据目录下创建 themes 文件夹（如果不存在）并打开
 */
ipcMain.on('open-themes-folder', () => {
    const themesPath = path.join(app.getPath('userData'), 'themes');
    // 如果文件夹不存在，则创建
    if (!fs.existsSync(themesPath)) {
        fs.mkdirSync(themesPath, {recursive: true});
    }
    // 在文件管理器中打开主题文件夹
    shell.openPath(themesPath).catch((err) => {
        console.error('打开主题文件夹失败:', err);
    });
});

/**
 * 打开主题网站
 * 在默认浏览器中打开 Typora 主题网站
 */
ipcMain.on('open-themes-website', () => {
    shell.openExternal('https://theme.typora.io/').catch((err) => {
        console.error('打开主题网站失败:', err);
    });
});

/**
 * 获取设置文件路径
 * @returns {string} 设置文件完整路径
 */
function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * 读取用户设置
 * @returns {Object} 设置对象
 */
function readSettings() {
    const settingsPath = getSettingsPath();
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
    } catch (error) {
        console.error('读取设置失败:', error);
    }
    return {};
}

/**
 * 写入用户设置
 * @param {Object} settings - 要保存的设置对象
 * @returns {boolean} 是否保存成功
 */
function writeSettings(settings) {
    const settingsPath = getSettingsPath();
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        return false;
    }
}

/**
 * 保存用户设置
 * @param {Object} event - IPC 事件对象
 * @param {Object} settings - 要保存的设置对象
 */
ipcMain.on('save-settings', (event, settings) => {
    writeSettings(settings);
});

/**
 * 获取用户设置
 * @param {Object} event - IPC 事件对象
 * @returns {Object} 设置对象，如果文件不存在则返回空对象
 */
ipcMain.on('get-settings', (event) => {
    const settings = readSettings();
    // 确保语言设置存在，如果不存在则从 i18n 获取
    if (!settings.language) {
        settings.language = i18n.currentLocale() || 'en';
    }
    event.returnValue = settings;
});

/**
 * 打开偏好设置窗口
 */
ipcMain.on('open-preferences', () => {
    openPreferencesWindow();
});

/**
 * 处理语言切换
 */
ipcMain.on('change-language', (event, locale) => {
    console.log('[Main] 收到语言切换请求:', locale);
    
    // 1. 更新主进程的 i18n 实例（这对原生菜单很重要）
    i18n.setLocale(locale);
    
    // 2. 重新构建并设置原生应用菜单
    changeLanguage(locale, sendMessageToRenderer, fileService, primaryWindow, openPreferencesWindow);
    
    // 3. 同步更新 settings.json 中的语言设置
    const settings = readSettings();
    settings.language = locale;
    writeSettings(settings);
    
    // 4. 广播通知所有打开的窗口（主窗口、偏好设置窗口、关于窗口等）
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('language-changed', locale);
    });
});

/**
 * 处理主题切换
 */
ipcMain.on('change-theme', (event, themeId) => {
    console.log('[Main] 收到主题切换请求:', themeId);
    
    // 1. 保存主题设置
    themeManager.setTheme(themeId);
    
    // 2. 同步更新 settings.json 中的主题设置（保持向后兼容）
    const settings = readSettings();
    settings.theme = themeId;
    writeSettings(settings);
    
    // 3. 广播通知所有打开的窗口（主窗口、偏好设置窗口、关于窗口等）
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('theme-changed', themeId);
    });
});

/**
 * 打开关于窗口
 */
ipcMain.on('open-about', () => {
    openAboutWindow();
});

/**
 * 关闭关于窗口
 */
ipcMain.on('close-about-window', () => {
    if (aboutWindow) {
        aboutWindow.close();
    }
});

/**
 * 导出为 PDF 格式
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 html、title、defaultFilename 的数据对象
 * @returns {Object} 导出结果对象
 */
ipcMain.handle('export-pdf', async (event, data) => {
    try {
        // 显示保存对话框
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 PDF',
            defaultPath: data.defaultFilename + '.pdf',
            filters: [
                {name: 'PDF文件', extensions: ['pdf']}
            ]
        });

        // 用户取消保存
        if (canceled || !filePath) {
            return {success: false, cancelled: true};
        }

        // 创建一个隐藏的窗口用于生成 PDF
        const pdfWindow = new BrowserWindow({
            show: false, // 不显示窗口
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // 创建完整的 HTML 文档（带样式）
        const fullHtml = createStyledHtml(data.html, data.title);

        // 通过 data URL 加载 HTML 内容
        await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

        // 等待页面完全加载（延迟确保样式和内容都已渲染）
        await new Promise(resolve => setTimeout(resolve, AppConfig.DELAYS.RENDER));

        // 使用 Electron 的 printToPDF API 生成 PDF
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true, // 打印背景
            marginsType: 0, // 无边距
            pageSize: 'A4' // A4 纸张大小
        });

        // 保存 PDF 文件
        fs.writeFileSync(filePath, pdfData);
        pdfWindow.close(); // 关闭临时窗口

        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出PDF失败:', error);
        return {success: false, error: error.message};
    }
});

/**
 * 导出为 HTML 格式
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 html、title、defaultFilename、withStyles 的数据对象
 * @returns {Object} 导出结果对象
 */
ipcMain.handle('export-html', async (event, data) => {
    try {
        // 显示保存对话框
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 HTML',
            defaultPath: data.defaultFilename + '.html',
            filters: [
                {name: 'HTML文件', extensions: ['html', 'htm']}
            ]
        });

        // 用户取消保存
        if (canceled || !filePath) {
            return {success: false, cancelled: true};
        }

        // 根据 withStyles 参数决定使用带样式或纯 HTML
        const htmlContent = data.withStyles
            ? createStyledHtml(data.html, data.title) // 带样式的 HTML
            : createPlainHtml(data.html, data.title); // 纯 HTML（无样式）

        // 保存 HTML 文件
        fs.writeFileSync(filePath, htmlContent, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出HTML失败:', error);
        return {success: false, error: error.message};
    }
});

/**
 * 打印文档
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 html、title 的数据对象
 * @returns {Object} 打印结果对象
 */

ipcMain.handle('print-document', async (event, data) => {
    let printWindow = null;
    try {
        // 创建一个隐藏的窗口用于打印
        printWindow = new BrowserWindow({
            show: false, // 不显示窗口
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // 创建完整的 HTML 文档（带样式）
        const fullHtml = createStyledHtml(data.html, data.title);

        // 通过 data URL 加载 HTML 内容
        await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

        // 等待页面完全加载（延迟确保样式和内容都已渲染）
        await new Promise(resolve => setTimeout(resolve, AppConfig.DELAYS.RENDER));

        // 使用 Electron 的 print API 弹出打印对话框
        const printOptions = {
            silent: false, // 显示打印对话框
            printBackground: true, // 打印背景
            deviceName: '' // 使用默认打印机
        };

        // 调用打印方法，这会弹出系统的打印对话框
        // 注意：print() 方法会立即返回，不会等待用户完成打印操作
        printWindow.webContents.print(printOptions, () => {
            // 打印操作完成后的回调（用户确认或取消打印对话框后触发）
            // 延迟关闭窗口，确保打印对话框已经完全关闭
            setTimeout(() => {
                if (printWindow && !printWindow.isDestroyed()) {
                    printWindow.close();
                }
            }, AppConfig.DELAYS.PRINT_CLOSE);
        });

        return {success: true};
    } catch (error) {
        console.error('打印失败:', error);
        // 确保在出错时也关闭窗口
        if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
        }
        return {success: false, error: error.message};
    }
});

/**
 * 导出为图像格式（PNG 或 JPEG）
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 defaultFilename 的数据对象
 * @returns {Object} 导出结果对象
 */
ipcMain.handle('export-image', async (event, data) => {
    try {
        // 显示保存对话框
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为图像',
            defaultPath: data.defaultFilename + '.png',
            filters: [
                {name: 'PNG图像', extensions: ['png']},
                {name: 'JPEG图像', extensions: ['jpg', 'jpeg']}
            ]
        });

        // 用户取消保存
        if (canceled || !filePath) {
            return {success: false, cancelled: true};
        }

        // 捕获主窗口的页面截图
        const image = await primaryWindow.webContents.capturePage();
        // 根据文件扩展名决定保存格式
        const buffer = filePath.toLowerCase().endsWith('.png')
            ? image.toPNG() // PNG 格式（无损）
            : image.toJPEG(90); // JPEG 格式（质量 90%）

        // 保存图像文件
        fs.writeFileSync(filePath, buffer);
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出图像失败:', error);
        return {success: false, error: error.message};
    }
});

/**
 * 保存文件
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 content、filePath（可选）、defaultFilename（可选）的数据对象
 * @returns {Object} 保存结果对象
 */
ipcMain.handle('save-file', async (event, data) => {
    try {
        let filePath = data.filePath; // 如果提供了文件路径，直接使用

        // 如果没有提供文件路径，显示保存对话框
        if (!filePath) {
            const defaultFilename = data.defaultFilename || '未命名';
            const {filePath: selectedPath, canceled} = await dialog.showSaveDialog(primaryWindow, {
                title: '保存文件',
                defaultPath: defaultFilename + '.md',
                filters: [
                    {name: 'Markdown文件', extensions: ['md', 'markdown']},
                    {name: '所有文件', extensions: ['*']}
                ]
            });

            // 用户取消保存
            if (canceled || !selectedPath) {
                return {success: false, cancelled: true};
            }

            filePath = selectedPath;
        }

        // 保存内容到文件
        fs.writeFileSync(filePath, data.content, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('保存文件失败:', error);
        return {success: false, error: error.message};
    }
});

/**
 * 导出为 Markdown 格式
 * @param {Object} event - IPC 事件对象
 * @param {Object} data - 包含 content、defaultFilename 的数据对象
 * @returns {Object} 导出结果对象
 */
ipcMain.handle('export-markdown', async (event, data) => {
    try {
        // 显示保存对话框
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 Markdown',
            defaultPath: data.defaultFilename + '.md',
            filters: [
                {name: 'Markdown文件', extensions: ['md', 'markdown']}
            ]
        });

        // 用户取消保存
        if (canceled || !filePath) {
            return {success: false, cancelled: true};
        }

        // 保存 Markdown 内容到文件
        fs.writeFileSync(filePath, data.content, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出Markdown失败:', error);
        return {success: false, error: error.message};
    }
});

/**
 * 选择图片文件（包括 GIF）
 * @returns {Object} 选择结果对象，包含 filePath 或 cancelled 标志
 */
ipcMain.handle('select-image-file', async () => {
    try {
        const result = await dialog.showOpenDialog(primaryWindow, {
            title: '选择图片文件',
            filters: [
                {name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']},
                {name: 'GIF 文件', extensions: ['gif']},
                {name: '所有文件', extensions: ['*']}
            ],
            properties: ['openFile']
        });

        // 用户取消选择
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return {cancelled: true};
        }

        // 返回选择的文件路径
        return {filePath: result.filePaths[0]};
    } catch (error) {
        console.error('选择图片文件失败:', error);
        return {cancelled: true, error: error.message};
    }
});

/**
 * 创建带样式的完整 HTML 文档
 * @param {string} content - HTML 内容
 * @param {string} title - 文档标题，默认为 '未命名'
 * @returns {string} 完整的 HTML 文档字符串
 */
function createStyledHtml(content, title = '未命名') {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #666; }
        p { margin-bottom: 16px; }
        code {
            background: #f6f8fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
        }
        pre code {
            background: none;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            color: #666;
            margin: 16px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        table th {
            background: #f6f8fa;
            font-weight: 600;
        }
        ul, ol {
            padding-left: 2em;
            margin: 16px 0;
        }
        li {
            margin: 4px 0;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        hr {
            border: none;
            border-top: 2px solid #eee;
            margin: 24px 0;
        }
    </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * 创建纯 HTML 文档（无样式）
 * @param {string} content - HTML 内容
 * @param {string} title - 文档标题，默认为 '未命名'
 * @returns {string} 完整的 HTML 文档字符串
 */
function createPlainHtml(content, title = '未命名') {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * 处理命令行参数
 * 支持两种参数：
 * 1. --new-md <目录路径> - 在指定目录创建新 Markdown 文件
 * 2. <文件路径> - 打开指定的 .md 文件
 */
function parseCommandLineArgs() {
    const args = process.argv.slice(1);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--new-md' && i + 1 < args.length) {
            createTargetDir = args[i + 1];
            break;
        } else if (args[i] && !args[i].startsWith('--') && !args[i].includes('electron')) {
            const potentialPath = path.resolve(args[i]);
            if (fs.existsSync(potentialPath) && path.extname(potentialPath).toLowerCase() === '.md') {
                initialFilePath = potentialPath;
                break;
            }
        }
    }
}

// ==================== Electron 应用生命周期事件 ====================

/**
 * 处理文件关联打开事件（当用户双击 .md 文件时）
 * 在 macOS 上，当应用未运行时双击文件会触发此事件
 */
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    initialFilePath = filePath;

    if (primaryWindow && fileService) {
        fileService.openFile(filePath);
    } else {
        createPrimaryWindow(filePath);
    }
});

/**
 * 应用准备就绪事件
 * 当 Electron 完成初始化时触发
 */
app.on('ready', () => {
    parseCommandLineArgs();
    createPrimaryWindow(initialFilePath);

    if (createTargetDir && primaryWindow && fileService) {
        primaryWindow.webContents.once('did-finish-load', () => {
            fileService.createMarkdownFile(createTargetDir);
        });
    }
});

/**
 * 所有窗口关闭事件
 * 在 Windows 和 Linux 上，所有窗口关闭时退出应用
 * 在 macOS 上，应用通常保持运行状态
 */
app.on('window-all-closed', () => {
    // 注销所有全局快捷键
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前注销全局快捷键
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

/**
 * 应用激活事件（macOS）
 * 当用户点击 Dock 图标时触发
 */
app.on('activate', () => {
    if (primaryWindow === null) {
        createPrimaryWindow();
    }
});

// ==================== 单实例锁定（防止多实例运行） ====================

/**
 * 请求单实例锁定
 * 如果应用已经在运行，新实例会收到 second-instance 事件
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // 如果无法获得锁，说明已有实例在运行，退出当前实例
    app.quit();
} else {
    /**
     * 第二个实例启动事件
     * 当用户尝试启动第二个实例时触发（如双击文件）
     * @param {Object} event - 事件对象
     * @param {Array} commandLine - 命令行参数数组
     * @param {string} workingDirectory - 工作目录
     */
    app.on('second-instance', (event, commandLine) => {
        if (primaryWindow) {
            if (primaryWindow.isMinimized()) primaryWindow.restore();
            primaryWindow.focus();

            const filePath = commandLine.find(arg => 
                !arg.startsWith('--') && 
                !arg.includes('electron') && 
                path.extname(arg).toLowerCase() === '.md' && 
                fs.existsSync(arg)
            );

            if (filePath && fileService) {
                fileService.openFile(filePath);
            }
        }
    });
}

