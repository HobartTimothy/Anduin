/**
 * 右键上下文菜单模块
 * 负责构建、显示和隐藏上下文菜单
 */

let currentOpenSubmenu = null; // 跟踪当前打开的子菜单，确保一次只展开一个

/**
 * 构建右键上下文菜单
 * @param {Function} handleMenuCommand - 处理菜单命令的函数
 * @returns {HTMLElement} 菜单 DOM 元素
 */
function buildContextMenu(handleMenuCommand) {
    const menu = document.createElement('div');
    menu.id = 'md-context-menu';
    menu.className = 'context-menu';

    // 从 preload.js 暴露的 API 获取菜单 HTML 内容
    let menuHTML = '';
    if (window.contextMenuAPI && typeof window.contextMenuAPI.getMenuHTML === 'function') {
        menuHTML = window.contextMenuAPI.getMenuHTML();
    }

    if (menuHTML) {
        menu.innerHTML = menuHTML;
    } else {
        // 如果加载失败，使用空内容（避免错误）
        menu.innerHTML = '';
        console.warn('菜单 HTML 加载失败，使用空菜单');
    }

    document.body.appendChild(menu);

    // 处理子菜单 hover 显示 - 确保一次只展开一个子菜单
    let hideTimeout = null;

    const submenuItems = menu.querySelectorAll('.has-submenu');
    submenuItems.forEach(item => {
        const submenu = item.querySelector('.context-submenu');
        if (!submenu) {
            return;
        }

        item.addEventListener('mouseenter', () => {
            // 清除之前的隐藏定时器
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // 如果当前已经有打开的子菜单且不是当前这个，先关闭它
            if (currentOpenSubmenu && currentOpenSubmenu !== submenu) {
                currentOpenSubmenu.style.display = 'none';
            }

            // 打开当前子菜单
            submenu.style.display = 'block';
            currentOpenSubmenu = submenu;

            // 调整子菜单位置，确保不超出屏幕
            setTimeout(() => {
                const rect = item.getBoundingClientRect();
                const submenuRect = submenu.getBoundingClientRect();
                if (rect.right + submenuRect.width > window.innerWidth) {
                    submenu.style.left = 'auto';
                    submenu.style.right = '100%';
                    submenu.style.marginRight = '4px';
                    submenu.style.marginLeft = '0';
                } else {
                    submenu.style.left = '100%';
                    submenu.style.right = 'auto';
                    submenu.style.marginLeft = '4px';
                    submenu.style.marginRight = '0';
                }
            }, 0);
        });

        item.addEventListener('mouseleave', (e) => {
            // 检查鼠标是否移动到子菜单
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && (submenu.contains(relatedTarget) || submenu === relatedTarget)) {
                return; // 鼠标移动到子菜单，不隐藏
            }
            hideTimeout = setTimeout(() => {
                submenu.style.display = 'none';
                if (currentOpenSubmenu === submenu) {
                    currentOpenSubmenu = null;
                }
            }, 150);
        });

        // 子菜单hover时保持显示
        submenu.addEventListener('mouseenter', () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
            submenu.style.display = 'block';
            currentOpenSubmenu = submenu;
        });

        submenu.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                submenu.style.display = 'none';
                if (currentOpenSubmenu === submenu) {
                    currentOpenSubmenu = null;
                }
            }, 150);
        });
    });

    menu.addEventListener('click', (e) => {
        const target = e.target.closest('[data-command]');
        if (!target) {
            return;
        }
        const cmd = target.getAttribute('data-command');
        if (cmd === 'edit-cut') {
            document.execCommand('cut');
        } else if (cmd === 'edit-copy') {
            document.execCommand('copy');
        } else if (cmd === 'edit-paste') {
            document.execCommand('paste');
        } else {
            handleMenuCommand(cmd);
        }
        hideContextMenu();
    });

    return menu;
}

/**
 * 显示右键上下文菜单
 * @param {number} x - 菜单显示的 X 坐标
 * @param {number} y - 菜单显示的 Y 坐标
 * @param {Function} handleMenuCommand - 处理菜单命令的函数
 */
function showContextMenu(x, y, handleMenuCommand) {
    const menu = document.getElementById('md-context-menu') || buildContextMenu(handleMenuCommand);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('visible');
}

/**
 * 隐藏右键上下文菜单
 */
function hideContextMenu() {
    const menu = document.getElementById('md-context-menu');
    if (menu) {
        menu.classList.remove('visible');
        // 隐藏所有子菜单
        const submenus = menu.querySelectorAll('.context-submenu');
        submenus.forEach(submenu => {
            submenu.style.display = 'none';
        });
        // 重置当前打开的子菜单
        currentOpenSubmenu = null;
    }
}

/**
 * 初始化上下文菜单
 * @param {HTMLElement} editor - 编辑器 DOM 元素
 * @param {Function} handleMenuCommand - 处理菜单命令的函数
 */
function initContextMenu(editor, handleMenuCommand) {
    // 编辑器右键菜单事件
    editor.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, handleMenuCommand);
    });

    // 点击事件监听 - 点击菜单外部时隐藏菜单
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('md-context-menu');
        if (!menu) {
            return;
        }
        if (!menu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // ESC 键隐藏菜单
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
        }
    });
}

module.exports = {
    buildContextMenu,
    showContextMenu,
    hideContextMenu,
    initContextMenu
};

