const {contextBridge, ipcRenderer} = require('electron');

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
