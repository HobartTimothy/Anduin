/**
 * src/main/index.js
 * Anduin - Markdown 编辑器主进程入口
 * [优化版] 使用异步 I/O 提升性能 + 语言切换自动关闭偏好设置
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
const fsPromises = require('fs').promises; // 引入异步 fs

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
let primaryWindow = null;
let preferencesWindow = null;
let aboutWindow = null;
let initialFilePath = null;
let createTargetDir = null;
let fileService = null;

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
    // 读取设置以获取调试模式状态
    const settings = readSettings();
    const debugMode = settings.debugMode || false;
    
    const template = createMenuTemplate(
        sendMessageToRenderer,
        fileService,
        primaryWindow,
        openPreferencesWindow,
        debugMode // 传入 debugMode
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

ipcMain.on('open-themes-folder', async () => {
    const themesPath = path.join(app.getPath('userData'), 'themes');
    try {
        // 异步创建目录
        await fsPromises.mkdir(themesPath, {recursive: true});
        await shell.openPath(themesPath);
    } catch (err) {
        console.error('打开主题文件夹失败:', err);
    }
});

ipcMain.on('open-themes-website', () => {
    shell.openExternal('https://theme.typora.io/').catch((err) => {
        console.error('打开主题网站失败:', err);
    });
});

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * 读取用户设置 (同步 - 用于初始化)
 */
function readSettings() {
    const settingsPath = getSettingsPath();
    try {
        if (fs.existsSync(settingsPath)) {
            const content = fs.readFileSync(settingsPath, 'utf-8').trim();
            // 检查文件内容是否为空
            if (!content) {
                console.warn('设置文件为空，使用默认设置');
                return {};
            }
            return JSON.parse(content);
        }
    } catch (error) {
        console.error('读取设置失败:', error);
        // 如果文件损坏，尝试删除它以便下次重新创建
        try {
            if (fs.existsSync(settingsPath)) {
                fs.unlinkSync(settingsPath);
                console.log('已删除损坏的设置文件');
            }
        } catch (deleteError) {
            console.error('删除损坏的设置文件失败:', deleteError);
        }
    }
    return {};
}

/**
 * 写入用户设置 (异步)
 */
async function writeSettings(settings) {
    const settingsPath = getSettingsPath();
    try {
        await fsPromises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('保存设置失败:', error);
        return false;
    }
}

ipcMain.on('save-settings', (event, settings) => {
    writeSettings(settings); // 触发异步保存，不阻塞
    setupAppMenu(); // 刷新菜单以应用调试模式更改
});

ipcMain.on('get-settings', (event) => {
    const settings = readSettings();
    if (!settings.language) {
        settings.language = i18n.currentLocale() || 'en';
    }
    event.returnValue = settings;
});

ipcMain.on('open-preferences', () => {
    openPreferencesWindow();
});

ipcMain.on('change-language', (event, locale) => {
    console.log('[Main] 收到语言切换请求:', locale);

    // 获取当前设置中的调试模式状态
    const settings = readSettings();
    const debugMode = settings.debugMode || false;

    // 1. 更新主进程的 i18n 实例
    i18n.setLocale(locale);

    // 2. 重新构建并设置原生应用菜单 (传入 debugMode)
    changeLanguage(locale, sendMessageToRenderer, fileService, primaryWindow, openPreferencesWindow, debugMode);

    // 3. 更新设置
    settings.language = locale;
    writeSettings(settings); // 异步保存

    // 4. 广播通知所有打开的窗口
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('language-changed', locale);
    });

    // 5. 语言切换后自动关闭偏好设置窗口
    if (preferencesWindow && !preferencesWindow.isDestroyed()) {
        preferencesWindow.close();
    }
});

ipcMain.on('change-theme', (event, themeId) => {
    console.log('[Main] 收到主题切换请求:', themeId);

    themeManager.setTheme(themeId);

    const settings = readSettings();
    settings.theme = themeId;
    writeSettings(settings); // 异步保存

    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('theme-changed', themeId);
    });
});

ipcMain.on('open-about', () => {
    openAboutWindow();
});

ipcMain.on('close-about-window', () => {
    if (aboutWindow) {
        aboutWindow.close();
    }
});

// 使用 async/await 优化文件导出
ipcMain.handle('export-pdf', async (event, data) => {
    try {
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 PDF',
            defaultPath: data.defaultFilename + '.pdf',
            filters: [{name: 'PDF文件', extensions: ['pdf']}]
        });

        if (canceled || !filePath) return {success: false, cancelled: true};

        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });

        const fullHtml = createStyledHtml(data.html, data.title);
        await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));
        await new Promise(resolve => setTimeout(resolve, AppConfig.DELAYS.RENDER));

        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            marginsType: 0,
            pageSize: 'A4'
        });

        // 异步写入文件
        await fsPromises.writeFile(filePath, pdfData);
        pdfWindow.close();

        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出PDF失败:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('export-html', async (event, data) => {
    try {
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 HTML',
            defaultPath: data.defaultFilename + '.html',
            filters: [{name: 'HTML文件', extensions: ['html', 'htm']}]
        });

        if (canceled || !filePath) return {success: false, cancelled: true};

        const htmlContent = data.withStyles
            ? createStyledHtml(data.html, data.title)
            : createPlainHtml(data.html, data.title);

        // 异步写入文件
        await fsPromises.writeFile(filePath, htmlContent, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出HTML失败:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('print-document', async (event, data) => {
    let printWindow = null;
    try {
        printWindow = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: false, contextIsolation: true }
        });

        const fullHtml = createStyledHtml(data.html, data.title);
        await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));
        await new Promise(resolve => setTimeout(resolve, AppConfig.DELAYS.RENDER));

        const printOptions = {
            silent: false,
            printBackground: true,
            deviceName: ''
        };

        printWindow.webContents.print(printOptions, () => {
            setTimeout(() => {
                if (printWindow && !printWindow.isDestroyed()) {
                    printWindow.close();
                }
            }, AppConfig.DELAYS.PRINT_CLOSE);
        });

        return {success: true};
    } catch (error) {
        console.error('打印失败:', error);
        if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
        }
        return {success: false, error: error.message};
    }
});

ipcMain.handle('export-image', async (event, data) => {
    try {
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为图像',
            defaultPath: data.defaultFilename + '.png',
            filters: [
                {name: 'PNG图像', extensions: ['png']},
                {name: 'JPEG图像', extensions: ['jpg', 'jpeg']}
            ]
        });

        if (canceled || !filePath) return {success: false, cancelled: true};

        const image = await primaryWindow.webContents.capturePage();
        const buffer = filePath.toLowerCase().endsWith('.png')
            ? image.toPNG()
            : image.toJPEG(90);

        // 异步写入文件
        await fsPromises.writeFile(filePath, buffer);
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出图像失败:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('save-file', async (event, data) => {
    try {
        let filePath = data.filePath;

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

            if (canceled || !selectedPath) return {success: false, cancelled: true};
            filePath = selectedPath;
        }

        // 异步写入文件
        await fsPromises.writeFile(filePath, data.content, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('保存文件失败:', error);
        return {success: false, error: error.message};
    }
});

ipcMain.handle('export-markdown', async (event, data) => {
    try {
        const {filePath, canceled} = await dialog.showSaveDialog(primaryWindow, {
            title: '导出为 Markdown',
            defaultPath: data.defaultFilename + '.md',
            filters: [{name: 'Markdown文件', extensions: ['md', 'markdown']}]
        });

        if (canceled || !filePath) return {success: false, cancelled: true};

        // 异步写入文件
        await fsPromises.writeFile(filePath, data.content, 'utf-8');
        return {success: true, path: filePath};
    } catch (error) {
        console.error('导出Markdown失败:', error);
        return {success: false, error: error.message};
    }
});

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

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return {cancelled: true};
        }
        return {filePath: result.filePaths[0]};
    } catch (error) {
        console.error('选择图片文件失败:', error);
        return {cancelled: true, error: error.message};
    }
});

// HTML 模板生成函数 (保持不变)
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
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #666; }
        p { margin-bottom: 16px; }
        code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 16px 0; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        table th, table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        table th { background: #f6f8fa; font-weight: 600; }
        ul, ol { padding-left: 2em; margin: 16px 0; }
        li { margin: 4px 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; }
        hr { border: none; border-top: 2px solid #eee; margin: 24px 0; }
    </style>
</head>
<body>
${content}
</body>
</html>`;
}

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

app.on('open-file', (event, filePath) => {
    event.preventDefault();
    initialFilePath = filePath;
    if (primaryWindow && fileService) {
        fileService.openFile(filePath);
    } else {
        createPrimaryWindow(filePath);
    }
});

app.on('ready', () => {
    parseCommandLineArgs();
    createPrimaryWindow(initialFilePath);
    if (createTargetDir && primaryWindow && fileService) {
        primaryWindow.webContents.once('did-finish-load', () => {
            fileService.createMarkdownFile(createTargetDir);
        });
    }
});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('activate', () => {
    if (primaryWindow === null) {
        createPrimaryWindow();
    }
});

// ==================== 单实例锁定 ====================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
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
