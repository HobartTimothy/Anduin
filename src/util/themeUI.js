const path = require('path');
const themeManager = require('./theme');

/**
 * 在当前文档中应用当前主题
 * @param {Document} doc - DOM Document 对象，默认为全局 document
 */
function applyTheme(doc = typeof document !== 'undefined' ? document : null) {
    if (!doc) return;

    const currentTheme = themeManager.getCurrentTheme();
    if (!currentTheme) return;

    // 方式1: 使用 CSS 类名（当前实现方式）
    if (currentTheme.className) {
        // 移除所有主题类
        const allThemeClasses = themeManager.getAvailableThemes()
            .map(t => t.className)
            .filter(c => c);
        
        allThemeClasses.forEach(className => {
            doc.body.classList.remove(className);
        });

        // 添加当前主题类
        doc.body.classList.add(currentTheme.className);
        
        // 可选：给 body 添加主题 ID 属性，方便做特定覆盖
        doc.body.setAttribute('data-theme', currentTheme.id);
        
        return;
    }

    // 方式2: 使用独立的 CSS 文件（未来扩展支持）
    if (currentTheme.css) {
        const themeLinkId = 'app-theme-style';
        let linkElement = doc.getElementById(themeLinkId);

        // 计算 CSS 文件的最终路径
        let cssPath;
        if (currentTheme.isAbsolutePath) {
            cssPath = currentTheme.css;
        } else {
            // 假设主题文件位于 src/themes/ 目录下
            // 注意：在打包后的 Electron 应用中，路径处理可能需要根据实际情况调整
            cssPath = path.join(__dirname, '..', 'themes', currentTheme.css);
        }

        if (!linkElement) {
            linkElement = doc.createElement('link');
            linkElement.id = themeLinkId;
            linkElement.rel = 'stylesheet';
            doc.head.appendChild(linkElement);
        }

        linkElement.href = cssPath;
        
        // 给 body 添加主题 ID 属性
        doc.body.setAttribute('data-theme', currentTheme.id);
    }
}

/**
 * 监听主题变化并自动更新 UI
 * @param {Object} ipcRenderer - Electron ipcRenderer 实例
 */
function listenForThemeChanges(ipcRenderer) {
    if (!ipcRenderer) return;

    ipcRenderer.on('theme-changed', (event, themeId) => {
        // 更新内存中的状态
        themeManager.setTheme(themeId);
        // 应用新样式
        applyTheme();
    });
}

module.exports = {
    applyTheme,
    listenForThemeChanges,
    getCurrentTheme: () => themeManager.getCurrentTheme(),
    getAvailableThemes: () => themeManager.getAvailableThemes(),
    setTheme: (themeId) => themeManager.setTheme(themeId)
};

