/**
 * 右键上下文菜单模块
 * 负责构建、显示和隐藏上下文菜单
 */

let currentOpenSubmenu = null; // 跟踪当前打开的子菜单，确保一次只展开一个

/**
 * 构建右键上下文菜单
 * @param {Function} handleMenuCommand - 处理菜单命令的函数
 * @param {string} menuHTML - 菜单 HTML 内容（可选，如果不提供则尝试从 window.contextMenuAPI 获取）
 * @returns {HTMLElement} 菜单 DOM 元素
 */
function buildContextMenu(handleMenuCommand, menuHTML = null) {
    const menu = document.createElement('div');
    menu.id = 'md-context-menu';
    menu.className = 'context-menu';

    // 如果没有提供 menuHTML，尝试从 window.contextMenuAPI 获取
    if (!menuHTML) {
        try {
            // 检查 contextMenuAPI 是否可用
            if (typeof window !== 'undefined' && window.contextMenuAPI) {
                if (typeof window.contextMenuAPI.getMenuHTML === 'function') {
                    menuHTML = window.contextMenuAPI.getMenuHTML();
                } else {
                    console.error('getMenuHTML 方法不存在', {
                        contextMenuAPI: window.contextMenuAPI,
                        availableMethods: Object.keys(window.contextMenuAPI || {})
                    });
                }
            } else {
                console.warn('contextMenuAPI 不可用，且未传入 menuHTML');
            }
        } catch (error) {
            console.error('获取菜单 HTML 时出错:', error);
        }
    }

    if (menuHTML && menuHTML.trim().length > 0) {
        menu.innerHTML = menuHTML;
    } else {
        // 如果加载失败，使用空内容（避免错误）
        menu.innerHTML = '';
        console.warn('菜单 HTML 加载失败，使用空菜单', {
            menuHTMLLength: menuHTML ? menuHTML.length : 0,
            menuHTMLPreview: menuHTML ? menuHTML.substring(0, 100) : 'null'
        });
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
 * @param {string} menuHTML - 菜单 HTML 内容（可选）
 */
function showContextMenu(x, y, handleMenuCommand, menuHTML = null) {
    let menu = document.getElementById('md-context-menu');
    if (!menu) {
        menu = buildContextMenu(handleMenuCommand, menuHTML);
    }
    if (!menu) {
        console.error('showContextMenu: 无法创建菜单元素');
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
 * @param {string} menuHTML - 菜单 HTML 内容（可选）
 */
function initContextMenu(editor, handleMenuCommand, menuHTML = null) {
    if (!editor) {
        console.error('initContextMenu: editor 元素不存在');
        return;
    }
    if (!handleMenuCommand) {
        console.error('initContextMenu: handleMenuCommand 函数不存在');
        return;
    }

    // 编辑器右键菜单事件
    editor.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, handleMenuCommand, menuHTML);
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
