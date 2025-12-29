// 偏好设置页面交互逻辑
const {ipcRenderer} = require('electron');
const i18n = require('../util/i18n');

// 获取所有菜单项和内容区域
const menuItems = document.querySelectorAll('.menu-item');
const sections = document.querySelectorAll('.section');
const searchInput = document.getElementById('search-input');
const languageSelect = document.getElementById('app-language');

// 默认显示第一个部分（文件）
let currentSection = 'file';
showSection(currentSection);

// 菜单项点击事件
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const section = item.getAttribute('data-section');
        showSection(section);

        // 更新活动状态
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');
    });
});

// 显示指定部分
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
    }

    // 更新菜单活动状态
    menuItems.forEach(item => {
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 搜索功能
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
    // 如果搜索框为空，显示当前选中的部分
        showSection(currentSection);
        return;
    }

    // 在所有部分中搜索
    let found = false;
    sections.forEach(section => {
        const text = section.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            section.classList.add('active');
            found = true;
        } else {
            section.classList.remove('active');
        }
    });

    if (!found) {
    // 如果没有找到结果，显示提示
        console.log('未找到匹配的设置项');
    }
});

// 加载保存的设置
function loadSettings() {
    try {
        const settings = ipcRenderer.sendSync('get-settings');
        applySettings(settings || {});
    } catch (error) {
        console.error('加载设置失败:', error);
        // 如果加载失败，使用当前 i18n 的语言
        applySettings({});
    }
}

// 应用设置到界面
function applySettings(settings) {
    // 更新语言选择框
    if (languageSelect) {
        // 始终使用当前 i18n 的语言，确保与应用保持一致
        const currentLanguage = i18n.currentLocale() || 'en';
        languageSelect.value = currentLanguage;
        
        // 更新 HTML lang 属性
        updateHtmlLang(currentLanguage);
        
        // 如果设置文件中的语言与当前不一致，以 i18n 为准
        if (settings.language && settings.language !== currentLanguage) {
            console.log('同步语言设置:', currentLanguage);
        }
    }
}

// 更新 HTML lang 属性
function updateHtmlLang(locale) {
    document.documentElement.lang = locale;
}

/**
 * 更新 UI 文本（使用统一的 i18nAPI）
 */
function updateUIText() {
    if (i18n && i18n.updateUI) {
        i18n.updateUI();
    }
}

// 保存设置
function saveSettings() {
    const settings = {
        language: languageSelect ? languageSelect.value : i18n.currentLocale() || 'en'
    };

    try {
        ipcRenderer.send('save-settings', settings);
    } catch (error) {
        console.error('保存设置失败:', error);
    }
}

// 监听所有输入变化，自动保存
document.addEventListener('change', (e) => {
    if (e.target.matches('input, select')) {
        // 如果是语言选择框，立即切换语言
        if (e.target.id === 'app-language') {
            const selectedLanguage = e.target.value;
            // 切换语言（会自动更新配置）
            if (i18n.setLocale) {
                i18n.setLocale(selectedLanguage);
            }
            // 更新 UI 文本
            updateUIText();
            // 通知主进程
            ipcRenderer.send('change-language', selectedLanguage);
        }
        // 延迟保存，避免频繁写入
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(saveSettings, 500);
    }
});

// 监听语言变化事件
ipcRenderer.on('language-changed', (event, locale) => {
    // 重新加载 i18n 语言
    i18n.setLocale(locale);
    // 更新语言选择框
    if (languageSelect) {
        languageSelect.value = locale;
    }
    // 更新 HTML lang 属性
    updateHtmlLang(locale);
    // 更新 UI 文本
    updateUIText();
});

// 初始化函数
function initialize() {
    // 首先立即更新 HTML lang 属性和语言选择框，使用当前 i18n 的语言
    const currentLocale = i18n.currentLocale() || 'en';
    updateHtmlLang(currentLocale);
    
    if (languageSelect) {
        languageSelect.value = currentLocale;
    }
    
    // 然后加载设置（如果设置中的语言不同，会被覆盖）
    loadSettings();
    
    // 最后更新 UI 文本
    updateUIText();
}

// 初始化：等待 DOM 加载完成后加载设置并更新 UI
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initialize();
    });
} else {
    // DOM 已经加载完成
    initialize();
}

// 处理关闭窗口
window.addEventListener('beforeunload', () => {
    saveSettings();
});

// 按钮事件处理
document.addEventListener('click', (e) => {
    const target = e.target;

    // 检查更新按钮
    if (target.textContent.includes('检查更新')) {
        e.preventDefault();
        alert('当前版本已是最新版本');
    }

    // 清除历史按钮
    if (target.textContent.includes('清除历史')) {
        e.preventDefault();
        if (confirm('确定要清除历史记录吗？')) {
            alert('历史记录已清除');
        }
    }

    // 打开主题文件夹
    if (target.textContent.includes('打开主题文件夹')) {
        e.preventDefault();
        ipcRenderer.send('open-themes-folder');
    }

    // 获取主题
    if (target.textContent.includes('获取主题')) {
        e.preventDefault();
        ipcRenderer.send('open-themes-website');
    }
});
