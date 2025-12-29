/**
 * 关于对话框脚本
 * 处理对话框的交互和链接点击
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    const {shell, ipcRenderer} = require('electron');
    const path = require('path');
    const fs = require('fs');
    const i18n = require('../util/i18n');
    const i18nUI = require('../util/i18nUI');
    const themeUI = require('../util/themeUI');

    // 应用主题
    themeUI.applyTheme(document);

    // 初始化国际化
    i18nUI.updateUI(document);

    // 监听语言变化事件
    ipcRenderer.on('language-changed', (event, locale) => {
        console.log('[About] 收到语言变化事件:', locale);
        
        // 重新加载语言包（注意：这里只加载内存即可，因为 preferences 已经保存了文件）
        if (i18n.loadLanguage) {
            i18n.loadLanguage(locale);
        } else if (i18n.setLocale) {
            // 如果没有 loadLanguage，使用 setLocale（但不要保存，因为 preferences 已经保存了）
            i18n.setLocale(locale);
        }
        
        // 更新界面
        i18nUI.updateUI(document);
        
        // 语言变化后，需要重新更新平台信息（因为 i18n 可能覆盖了它）
        updatePlatformInfo();
    });

    // 监听主题变化事件
    ipcRenderer.on('theme-changed', (event, themeId) => {
        console.log('[About] 收到主题变化事件:', themeId);
        themeUI.applyTheme(document);
    });

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

    // 更新平台信息的函数
    function updatePlatformInfo() {
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
            // 保存原来的i18n key
            const i18nKey = platformElement.getAttribute('data-i18n');
            // 直接设置文本（平台信息不需要国际化）
            platformElement.textContent = platformText;
        }
    }

    // 更新平台信息
    updatePlatformInfo();

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
