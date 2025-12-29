const {contextBridge, ipcRenderer} = require('electron');

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
