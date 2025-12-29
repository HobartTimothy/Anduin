// 偏好设置页面交互逻辑
const {ipcRenderer} = require('electron');
const i18n = require('../util/i18n');
const i18nUI = require('../util/i18nUI'); // 引入 UI 更新工具
const themeManager = require('../util/theme');
const themeUI = require('../util/themeUI');

// 获取所有菜单项和内容区域
const menuItems = document.querySelectorAll('.menu-item');
const sections = document.querySelectorAll('.section');
const searchInput = document.getElementById('search-input');
const languageSelect = document.getElementById('app-language');
const themeSelect = document.getElementById('theme-select');

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

// 初始化主题选择框
function initThemeSelect() {
    if (!themeSelect) return;
    
    // 1. 清空现有选项
    themeSelect.innerHTML = '';
    
    // 2. 动态生成选项
    const themes = themeManager.getAvailableThemes();
    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        themeSelect.appendChild(option);
    });
    
    // 3. 选中当前主题
    const currentTheme = themeManager.getCurrentTheme();
    if (currentTheme) {
        themeSelect.value = currentTheme.id;
    }
    
    // 4. 绑定变更事件
    themeSelect.addEventListener('change', (e) => {
        const newThemeId = e.target.value;
        // 通知主进程切换主题（主进程会广播到所有窗口）
        ipcRenderer.send('change-theme', newThemeId);
        // 本地立即更新预览
        themeManager.setTheme(newThemeId);
        themeUI.applyTheme();
    });
}

// 加载保存的设置
function loadSettings() {
    try {
        const settings = ipcRenderer.sendSync('get-settings');
        // 这里可以加载其他设置（除了语言，语言已在 initialize() 中设置）
        // TODO: 加载其他设置项到界面
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 更新 HTML lang 属性
function updateHtmlLang(locale) {
    document.documentElement.lang = locale;
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

// 监听语言选择框变化
if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
        const newLocale = e.target.value;
        
        console.log('[Preferences] 用户切换语言:', newLocale);
        
        // 1. 在本地实例设置并保存 (这一步会写入 json 配置文件)
        i18n.setLocale(newLocale);
        
        // 2. 发送给主进程，让主进程通知其他窗口
        ipcRenderer.send('change-language', newLocale);
        
        // 3. 立即更新当前页面 UI (虽然监听了事件，但为了响应速度可以立即执行)
        i18nUI.updateUI();
    });
}

// 监听所有其他输入变化，自动保存
document.addEventListener('change', (e) => {
    if (e.target.matches('input, select') && e.target.id !== 'app-language') {
        // 延迟保存，避免频繁写入
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(saveSettings, 500);
    }
});

// 监听来自主进程的广播 (用于多窗口同步)
ipcRenderer.on('language-changed', (event, locale) => {
    console.log('[Preferences] 收到同步事件:', locale);
    
    // 标记已接收到主进程的语言设置
    initialLanguageReceived = true;
    
    // 如果是别的窗口触发的改变，这里也需要同步
    if (i18n.currentLocale() !== locale) {
        i18n.setLocale(locale); // 只需要加载内存，不需要再存盘（因为 preferences 已经保存了）
    }
    
    // 更新 HTML lang 属性
    updateHtmlLang(locale);
    // 更新 UI 文本
    i18nUI.updateUI();
    
    // 在下一个事件循环中更新语言选择框
    // 确保在 UI 更新完成后再设置选择框的值
    setTimeout(() => {
        setLanguageSelectValue(locale);
    }, 0);
});

// 监听主题变化事件
ipcRenderer.on('theme-changed', (event, themeId) => {
    console.log('[Preferences] 收到主题变化事件:', themeId);
    
    // 更新内存中的状态
    themeManager.setTheme(themeId);
    
    // 更新主题选择框
    if (themeSelect && themeSelect.value !== themeId) {
        themeSelect.value = themeId;
    }
    
    // 应用新样式
    themeUI.applyTheme();
});

// 设置语言选择框的值（使用多重保障确保设置成功）
function setLanguageSelectValue(locale) {
    if (!languageSelect) {
        console.warn('[设置语言] 语言选择框元素不存在');
        return;
    }
    
    console.log('[设置语言] 尝试设置为:', locale);
    console.log('[设置语言] 当前选项:', Array.from(languageSelect.options).map(opt => ({value: opt.value, text: opt.textContent, selected: opt.selected})));
    
    // 方法1: 直接设置 value
    languageSelect.value = locale;
    
    // 方法2: 如果方法1失败，手动设置 selected 属性
    if (languageSelect.value !== locale) {
        console.warn('[设置语言] 方法1失败，尝试方法2');
        Array.from(languageSelect.options).forEach(option => {
            option.selected = (option.value === locale);
        });
    }
    
    // 方法3: 如果还是失败，通过 selectedIndex 设置
    if (languageSelect.value !== locale) {
        console.warn('[设置语言] 方法2失败，尝试方法3');
        const targetIndex = Array.from(languageSelect.options).findIndex(opt => opt.value === locale);
        if (targetIndex >= 0) {
            languageSelect.selectedIndex = targetIndex;
        }
    }
    
    console.log('[设置语言] 最终值:', languageSelect.value);
    console.log('[设置语言] 选中的选项:', languageSelect.selectedOptions[0] ? {
        value: languageSelect.selectedOptions[0].value,
        text: languageSelect.selectedOptions[0].textContent
    } : 'none');
}

// 标记是否已从主进程接收到初始语言设置
let initialLanguageReceived = false;

// 初始化函数
function initialize() {
    // 1. 获取当前语言 (i18n 内部会自动从配置文件读取)
    const currentLocale = i18n.currentLocale() || 'en';
    console.log('[Preferences] 初始化语言:', currentLocale);
    
    // 2. 更新 HTML lang 属性
    updateHtmlLang(currentLocale);
    
    // 3. 加载其他设置
    loadSettings();
    
    // 4. 初始化主题选择框
    initThemeSelect();
    
    // 5. 应用当前主题
    themeUI.applyTheme();
    
    // 6. 更新当前页面的文本
    i18nUI.updateUI();
    
    // 7. 等待一小段时间，让主进程有机会发送 language-changed 事件
    // 如果主进程没有发送，我们就使用本地的语言设置
    setTimeout(() => {
        if (!initialLanguageReceived) {
            console.log('[Preferences] 使用本地语言设置（主进程事件未到达）');
            setLanguageSelectValue(currentLocale);
        } else {
            console.log('[Preferences] 已收到主进程语言设置，跳过本地设置');
        }
    }, 100); // 等待100ms
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
