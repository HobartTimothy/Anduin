/**
 * 主题菜单模块
 * 负责构建、显示和隐藏主题选择菜单
 * 使用与右键菜单相同的样式
 */

// 尝试获取主题管理模块（在渲染进程中可能不可用，需要从 preload 获取）
let themeManager = null;
try {
    // 在 Node.js 环境中直接 require
    if (typeof require !== 'undefined') {
        themeManager = require('../util/theme');
    }
} catch (e) {
    // 如果 require 失败，说明在渲染进程中，需要通过 window.themeAPI 获取
    console.log('无法直接 require themeManager，将在运行时从 window.themeAPI 获取');
}

/**
 * 获取主题列表
 * @returns {Array} 主题列表
 */
function getThemes() {
    if (themeManager) {
        return themeManager.getAvailableThemes().map(t => ({
            id: t.id,
            label: t.name
        }));
    }
    // 回退到默认主题列表
    return [
        { id: 'github', label: 'Github' },
        { id: 'newsprint', label: 'Newsprint' },
        { id: 'night', label: 'Night' },
        { id: 'pixyll', label: 'Pixyll' },
        { id: 'whitey', label: 'Whitey' }
    ];
}

/**
 * 构建主题菜单
 * @param {Function} handleThemeChange - 处理主题切换的函数
 * @param {string} currentTheme - 当前主题名称
 * @returns {HTMLElement} 菜单 DOM 元素
 */
function buildThemeMenu(handleThemeChange, currentTheme = 'github') {
    const menu = document.createElement('div');
    menu.id = 'md-theme-menu';
    menu.className = 'context-menu'; // 使用与右键菜单相同的样式类

    const themes = getThemes();

    let menuHTML = '';
    themes.forEach((theme, index) => {
        const isChecked = theme.id === currentTheme;
        menuHTML += `
            <div class="context-menu-item" data-command="theme-${theme.id}" data-theme="${theme.id}">
                <span class="context-menu-item-label">${theme.label}</span>
                ${isChecked ? '<span class="context-menu-item-shortcut">✓</span>' : ''}
            </div>
        `;
    });

    menu.innerHTML = menuHTML;
    document.body.appendChild(menu);

    // 处理菜单项点击
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const target = e.target.closest('[data-command]');
        if (!target) {
            return;
        }
        
        const themeId = target.getAttribute('data-theme');
        if (themeId && handleThemeChange) {
            handleThemeChange(themeId);
        }
        hideThemeMenu();
    });

    return menu;
}

/**
 * 显示主题菜单
 * @param {number} x - 菜单显示的 X 坐标
 * @param {number} y - 菜单显示的 Y 坐标
 * @param {Function} handleThemeChange - 处理主题切换的函数
 * @param {string} currentTheme - 当前主题名称
 */
function showThemeMenu(x, y, handleThemeChange, currentTheme = 'github') {
    let menu = document.getElementById('md-theme-menu');
    if (!menu) {
        menu = buildThemeMenu(handleThemeChange, currentTheme);
    } else {
        // 更新当前主题的选中状态
        const items = menu.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            const themeId = item.getAttribute('data-theme');
            const checkmark = item.querySelector('.context-menu-item-shortcut');
            if (themeId === currentTheme) {
                if (!checkmark) {
                    const check = document.createElement('span');
                    check.className = 'context-menu-item-shortcut';
                    check.textContent = '✓';
                    item.appendChild(check);
                }
            } else {
                if (checkmark && checkmark.textContent === '✓') {
                    checkmark.remove();
                }
            }
        });
    }

    if (!menu) {
        console.error('showThemeMenu: 无法创建菜单元素');
        return;
    }

    // 先显示菜单（但暂时不可见），以便计算尺寸
    menu.style.visibility = 'hidden';
    menu.classList.add('visible');
    menu.style.display = 'block';

    // 设置初始位置
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // 确保菜单在视口内
    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    // 如果菜单超出右边界，调整位置
    if (rect.right > windowWidth) {
        finalX = windowWidth - rect.width - 10;
    }
    // 如果菜单超出下边界，调整位置
    if (rect.bottom > windowHeight) {
        finalY = windowHeight - rect.height - 10;
    }
    // 如果菜单超出左边界，调整位置
    if (rect.left < 0) {
        finalX = 10;
    }
    // 如果菜单超出上边界，调整位置
    if (rect.top < 0) {
        finalY = 10;
    }

    // 应用最终位置并显示
    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;
    menu.style.visibility = 'visible';
}

/**
 * 隐藏主题菜单
 */
function hideThemeMenu() {
    const menu = document.getElementById('md-theme-menu');
    if (menu) {
        menu.classList.remove('visible');
        menu.style.display = 'none';
        menu.style.visibility = '';
    }
}

/**
 * 初始化主题菜单
 * @param {Function} handleThemeChange - 处理主题切换的函数
 * @param {Function} getCurrentTheme - 获取当前主题的函数
 */
function initThemeMenu(handleThemeChange, getCurrentTheme) {
    // 点击事件监听 - 点击菜单外部时隐藏菜单
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('md-theme-menu');
        if (!menu) {
            return;
        }
        // 检查菜单是否可见
        const isVisible = menu.classList.contains('visible') || menu.style.display === 'block';
        if (isVisible) {
            // 检查点击目标是否在菜单内
            const clickedInMenu = menu.contains(e.target);
            if (!clickedInMenu) {
                hideThemeMenu();
            }
        }
    }, true);

    // ESC 键隐藏菜单
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const menu = document.getElementById('md-theme-menu');
            if (menu) {
                const isVisible = menu.classList.contains('visible') || menu.style.display === 'block';
                if (isVisible) {
                    hideThemeMenu();
                }
            }
        }
    });
}

module.exports = {
    buildThemeMenu,
    showThemeMenu,
    hideThemeMenu,
    initThemeMenu
};

