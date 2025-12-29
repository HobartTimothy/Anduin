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
    const contextMenuHTMLPath = path.join(__dirname, '..', 'renderer', 'contextMenu.html');
    contextMenuHTML = fs.readFileSync(contextMenuHTMLPath, 'utf-8');
} catch (error) {
    console.error('读取右键菜单 HTML 文件失败:', error);
}

// 暴露 contextMenu 模块
contextBridge.exposeInMainWorld('contextMenuAPI', {
    buildContextMenu: contextMenuModule.buildContextMenu,
    showContextMenu: contextMenuModule.showContextMenu,
    hideContextMenu: contextMenuModule.hideContextMenu,
    initContextMenu: contextMenuModule.initContextMenu,
    getMenuHTML: () => contextMenuHTML
});

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
