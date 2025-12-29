/**
 * 关于对话框脚本
 * 处理对话框的交互和链接点击
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    const {shell, ipcRenderer} = require('electron');
    const path = require('path');
    const fs = require('fs');

    // 应用主题
    function applyTheme() {
        try {
            const settings = ipcRenderer.sendSync('get-settings');
            const theme = settings?.theme || 'github'; // 默认使用 github 主题
            const themes = ['github-theme', 'newsprint-theme', 'night-theme', 'pixyll-theme', 'whitey-theme'];
            // 移除所有主题类
            themes.forEach((t) => document.body.classList.remove(t));
            // 添加当前主题类
            const themeClass = `${theme}-theme`;
            document.body.classList.add(themeClass);
        } catch (error) {
            console.error('应用主题失败:', error);
            // 默认使用 github 主题
            document.body.classList.add('github-theme');
        }
    }

    // 应用主题
    applyTheme();

    // 获取应用信息
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    let packageInfo;
    try {
        packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
        console.error('无法读取 package.json:', error);
        packageInfo = {version: '0.1.0'};
    }

    // 更新版本信息
    const versionElement = document.getElementById('version');
    if (versionElement) {
        versionElement.textContent = packageInfo.version || '0.1.0';
    }

    // 更新平台信息
    const platform = process.platform;
    let platformText = '';
    if (platform === 'win32') {
        platformText = 'for Windows (x64)';
    } else if (platform === 'darwin') {
        platformText = 'for macOS';
    } else if (platform === 'linux') {
        platformText = 'for Linux';
    }
    const platformElement = document.getElementById('platform-info');
    if (platformElement) {
        platformElement.textContent = platformText;
    }

    // 作者链接
    const authorLink = document.getElementById('author-link');
    if (authorLink) {
        authorLink.addEventListener('click', (e) => {
            e.preventDefault();
            shell.openExternal('https://github.com/HobartTimothy').catch((err) => {
                console.error('打开外部链接失败:', err);
            });
        });
    }

    // 网站链接
    const websiteLink = document.getElementById('website-link');
    if (websiteLink) {
        websiteLink.addEventListener('click', (e) => {
            e.preventDefault();
            shell.openExternal('https://github.com/HobartTimothy/Anduin').catch((err) => {
                console.error('打开外部链接失败:', err);
            });
        });
    }

    // GitHub 链接
    const githubLink = document.getElementById('github-link');
    if (githubLink) {
        githubLink.addEventListener('click', (e) => {
            e.preventDefault();
            shell.openExternal('https://github.com/HobartTimothy/Anduin').catch((err) => {
                console.error('打开外部链接失败:', err);
            });
        });
    }
});
