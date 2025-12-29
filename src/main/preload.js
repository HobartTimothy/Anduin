const {contextBridge, ipcRenderer} = require('electron');
const path = require('path');
const fs = require('fs');
const marked = require('marked');

// 暴露 IPC 通信 API
contextBridge.exposeInMainWorld('electronAPI', {
    // IPC 方法
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    sendSync: (channel, ...args) => ipcRenderer.sendSync(channel, ...args),
    on: (channel, callback) => {
        const wrappedCallback = (event, ...args) => callback(event, ...args);
        ipcRenderer.on(channel, wrappedCallback);
        // 返回清理函数
        return () => ipcRenderer.removeListener(channel, wrappedCallback);
    },
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 暴露 Node.js 模块
contextBridge.exposeInMainWorld('nodeAPI', {
    path: path,
    fs: fs,
    marked: marked
});

// 暴露 i18n 模块
const i18n = require('../util/i18n');
const i18nUI = require('../util/i18nUI');

contextBridge.exposeInMainWorld('i18nAPI', {
    // 核心翻译功能
    t: (key, params) => i18n.t(key, params),
    tBatch: (keys) => i18n.tBatch(keys),
    
    // 语言管理
    currentLocale: () => i18n.currentLocale(),
    setLocale: (locale) => i18n.setLocale(locale),
    loadLanguage: (locale) => i18n.loadLanguage(locale),
    isLoaded: () => i18n.isLoaded(),
    
    // UI 更新（在渲染进程中使用）
    updateUI: () => {
        if (typeof document !== 'undefined') {
            i18nUI.updateUI(document);
        }
    },
    updateHtmlLang: () => {
        if (typeof document !== 'undefined') {
            i18nUI.updateHtmlLang(document);
        }
    }
});

// 加载并暴露 commandHandlers 模块
const commandHandlersPath = path.join(__dirname, '..', 'renderer', 'commandHandlers.js');
const {createCommandHandlers} = require(commandHandlersPath);

// 暴露 commandHandlers 模块
contextBridge.exposeInMainWorld('commandHandlersAPI', {
    createCommandHandlers: createCommandHandlers
});

// 加载并暴露 contextMenu 模块
const contextMenuPath = path.join(__dirname, '..', 'renderer', 'contextMenu.js');
const contextMenuModule = require(contextMenuPath);

// 读取右键菜单 HTML 文件
let contextMenuHTML = '';
try {
    // 尝试多个可能的路径（开发环境和生产环境）
    const possiblePaths = [
        path.resolve(__dirname, '..', 'renderer', 'contextMenu.html'),
        path.join(__dirname, '..', 'renderer', 'contextMenu.html'),
        path.join(process.cwd(), 'src', 'renderer', 'contextMenu.html'),
        path.resolve(process.cwd(), 'src', 'renderer', 'contextMenu.html')
    ];

    let loaded = false;
    for (const htmlPath of possiblePaths) {
        try {
            if (fs.existsSync(htmlPath)) {
                const content = fs.readFileSync(htmlPath, 'utf-8');
                if (content && content.trim().length > 0) {
                    contextMenuHTML = content;
                    console.log('成功加载右键菜单 HTML，路径:', htmlPath, '大小:', contextMenuHTML.length, '字符');
                    loaded = true;
                    break;
                }
            }
        } catch (err) {
            // 继续尝试下一个路径
            continue;
        }
    }

    if (!loaded) {
        console.error('读取右键菜单 HTML 文件失败: 所有路径都尝试失败', {
            __dirname: __dirname,
            cwd: process.cwd(),
            triedPaths: possiblePaths.map(p => ({path: p, exists: fs.existsSync(p)}))
        });
    }
} catch (error) {
    console.error('读取右键菜单 HTML 文件失败:', error, {
        message: error.message,
        stack: error.stack,
        __dirname: __dirname
    });
}

// 暴露 contextMenu 模块
// 注意：需要包装函数以确保它们在渲染进程的上下文中运行，并传递 menuHTML
const contextMenuAPI = {
    buildContextMenu: (handleMenuCommand) => {
        // 直接传递 menuHTML，避免在渲染进程中访问 window.contextMenuAPI
        return contextMenuModule.buildContextMenu(handleMenuCommand, contextMenuHTML);
    },
    showContextMenu: (x, y, handleMenuCommand) => {
        // 传递 menuHTML，确保菜单能正确构建
        return contextMenuModule.showContextMenu(x, y, handleMenuCommand, contextMenuHTML);
    },
    hideContextMenu: () => {
        return contextMenuModule.hideContextMenu();
    },
    initContextMenu: (editor, handleMenuCommand) => {
        // 修复：传入 contextMenuHTML，确保在事件触发时 menuHTML 可用
        return contextMenuModule.initContextMenu(editor, handleMenuCommand, contextMenuHTML);
    },
    getMenuHTML: () => {
        console.log('getMenuHTML 被调用，contextMenuHTML 长度:', contextMenuHTML ? contextMenuHTML.length : 0);
        return contextMenuHTML || '';
    }
};

console.log('暴露 contextMenuAPI:', {
    hasBuildContextMenu: typeof contextMenuAPI.buildContextMenu === 'function',
    hasGetMenuHTML: typeof contextMenuAPI.getMenuHTML === 'function',
    menuHTMLLength: contextMenuHTML ? contextMenuHTML.length : 0
});

contextBridge.exposeInMainWorld('contextMenuAPI', contextMenuAPI);

// 加载并暴露 themeMenu 模块
const themeMenuPath = path.join(__dirname, '..', 'renderer', 'themeMenu.js');
const themeMenuModule = require(themeMenuPath);

// 暴露 themeMenu 模块
const themeMenuAPI = {
    buildThemeMenu: (handleThemeChange, currentTheme) => {
        return themeMenuModule.buildThemeMenu(handleThemeChange, currentTheme);
    },
    showThemeMenu: (x, y, handleThemeChange, currentTheme) => {
        return themeMenuModule.showThemeMenu(x, y, handleThemeChange, currentTheme);
    },
    hideThemeMenu: () => {
        return themeMenuModule.hideThemeMenu();
    },
    initThemeMenu: (handleThemeChange, getCurrentTheme) => {
        return themeMenuModule.initThemeMenu(handleThemeChange, getCurrentTheme);
    }
};

contextBridge.exposeInMainWorld('themeMenuAPI', themeMenuAPI);

// 暴露菜单命令 API（保持向后兼容）
contextBridge.exposeInMainWorld('mdEditorAPI', {
    onMenuCommand(callback) {
        const channels = [
            'file-new',
            'file-open',
            'file-save',
            'file-save-as',
            'toggle-heading-1',
            'toggle-heading-2',
            'toggle-heading-3',
            'toggle-paragraph',
            'toggle-ol',
            'toggle-ul',
            'toggle-task-list',
            'toggle-bold',
            'toggle-italic',
            'toggle-underline',
            'toggle-inline-code',
            'insert-code-block',
            'toggle-source-mode',
            'reset-zoom',
            'theme-github',
            'theme-night',
            'help-about'
        ];

        channels.forEach((ch) => {
            ipcRenderer.on(ch, (_, payload) => {
                callback(ch, payload);
            });
        });
    }
});
