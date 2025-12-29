// 偏好设置页面交互逻辑
const {ipcRenderer} = require('electron');

// 获取所有菜单项和内容区域
const menuItems = document.querySelectorAll('.menu-item');
const sections = document.querySelectorAll('.section');
const searchInput = document.getElementById('search-input');

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
        if (settings) {
            applySettings(settings);
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 应用设置到界面
function applySettings(_settings) {
    // 这里可以根据保存的设置更新界面状态
    // 例如：
    // document.getElementById('some-checkbox').checked = settings.someOption;
}

// 保存设置
function saveSettings() {
    const settings = {
    // 收集所有设置项的值
    // 例如：
    // someOption: document.getElementById('some-checkbox').checked,
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
    // 延迟保存，避免频繁写入
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(saveSettings, 500);
    }
});

// 加载设置
loadSettings();

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

