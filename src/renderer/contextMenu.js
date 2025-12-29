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
    menu.innerHTML = [
        '<div class="context-menu-row context-menu-icons">',
        '  <div class="context-menu-btn" data-command="edit-cut" title="剪切">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10.97 4.323a1.75 1.75 0 0 0-2.47-2.47L4.75 5.5a.75.75 0 0 0 0 1.06l3.75 3.75a1.75 1.75 0 0 0 2.47-2.47L8.06 6.5l2.91-2.177Zm-1.94 3.354L6.5 5.94 3.59 8.118a1.75 1.75 0 1 0 2.47 2.47L8.06 8.5l.97-.823Z"/></svg>',
        '  </div>',
        '  <div class="context-menu-btn" data-command="edit-copy" title="复制">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5Z"/></svg>',
        '  </div>',
        '  <div class="context-menu-btn" data-command="edit-paste" title="粘贴">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>',
        '  </div>',
        '  <div class="context-menu-btn" data-command="edit-delete" title="删除">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.184 6.378a.25.25 0 0 0 .25.225h5.14a.25.25 0 0 0 .25-.225l.184-6.378a.75.75 0 0 1 1.492.086l-.184 6.378A1.75 1.75 0 0 1 10.27 15H5.23a1.75 1.75 0 0 1-1.742-1.951l.184-6.378a.75.75 0 1 1 1.492-.086ZM6.5 4.75V3h3v1.75a.75.75 0 0 1-1.5 0Z"/></svg>',
        '  </div>',
        '</div>',
        '<div class="context-menu-row">',
        '  <div class="context-menu-item has-submenu">',
        '    <span class="context-menu-item-label">复制 / 粘贴为...</span>',
        '    <div class="context-submenu">',
        '      <div class="context-menu-item" data-command="edit-copy-plain"><span class="context-menu-item-label">复制为纯文本</span></div>',
        '      <div class="context-menu-item" data-command="edit-copy-md"><span class="context-menu-item-label">复制为 Markdown</span></div>',
        '      <div class="context-menu-item" data-command="edit-copy-html"><span class="context-menu-item-label">复制为 HTML 代码</span></div>',
        '      <div class="context-menu-item" data-command="edit-paste-plain"><span class="context-menu-item-label">粘贴为纯文本</span></div>',
        '    </div>',
        '  </div>',
        '</div>',
        '<div class="context-menu-row context-menu-icons">',
        '  <div class="context-menu-btn" data-command="toggle-bold" title="加粗"><strong>B</strong></div>',
        '  <div class="context-menu-btn" data-command="toggle-italic" title="斜体"><em>I</em></div>',
        '  <div class="context-menu-btn" data-command="toggle-inline-code" title="代码">&lt;/&gt;</div>',
        '  <div class="context-menu-btn" data-command="format-link" title="超链接">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83-2.83Z"/></svg>',
        '  </div>',
        '</div>',
        '<div class="context-menu-row context-menu-icons">',
        '  <div class="context-menu-btn" data-command="paragraph-toggle-quote" title="引用">""</div>',
        '  <div class="context-menu-btn" data-command="toggle-ul" title="无序列表">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm3.75-1.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5ZM5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>',
        '  </div>',
        '  <div class="context-menu-btn" data-command="toggle-ol" title="有序列表">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2.003 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Z"/></svg>',
        '  </div>',
        '  <div class="context-menu-btn" data-command="toggle-task-list" title="任务列表">',
        '    <svg width="16" height="16" viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>',
        '  </div>',
        '</div>',
        '<div class="context-menu-row">',
        '  <div class="context-menu-item has-submenu">',
        '    <span class="context-menu-item-label">段落</span>',
        '    <div class="context-submenu">',
        '      <div class="context-menu-item" data-command="toggle-heading-1"><span class="context-menu-item-label">一级标题</span><span class="context-menu-item-shortcut">Ctrl+1</span></div>',
        '      <div class="context-menu-item" data-command="toggle-heading-2"><span class="context-menu-item-label">二级标题</span><span class="context-menu-item-shortcut">Ctrl+2</span></div>',
        '      <div class="context-menu-item" data-command="toggle-heading-3"><span class="context-menu-item-label">三级标题</span><span class="context-menu-item-shortcut">Ctrl+3</span></div>',
        '      <div class="context-menu-item" data-command="toggle-heading-4"><span class="context-menu-item-label">四级标题</span><span class="context-menu-item-shortcut">Ctrl+4</span></div>',
        '      <div class="context-menu-item" data-command="toggle-heading-5"><span class="context-menu-item-label">五级标题</span><span class="context-menu-item-shortcut">Ctrl+5</span></div>',
        '      <div class="context-menu-item" data-command="toggle-heading-6"><span class="context-menu-item-label">六级标题</span><span class="context-menu-item-shortcut">Ctrl+6</span></div>',
        '      <div class="context-menu-separator"></div>',
        '      <div class="context-menu-item" data-command="toggle-paragraph"><span class="context-menu-item-label">段落</span><span class="context-menu-item-shortcut">Ctrl+0</span></div>',
        '    </div>',
        '  </div>',
        '</div>',
        '<div class="context-menu-row">',
        '  <div class="context-menu-item has-submenu">',
        '    <span class="context-menu-item-label">插入</span>',
        '    <div class="context-submenu">',
        '      <div class="context-menu-item" data-command="format-image-insert"><span class="context-menu-item-label">图像</span><span class="context-menu-item-shortcut">Ctrl+Shift+I</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-footnote"><span class="context-menu-item-label">脚注</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-link-ref"><span class="context-menu-item-label">链接引用</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-hr"><span class="context-menu-item-label">水平分割线</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-insert-table"><span class="context-menu-item-label">表格</span><span class="context-menu-item-shortcut">Ctrl+T</span></div>',
        '      <div class="context-menu-item" data-command="insert-code-block"><span class="context-menu-item-label">代码块</span><span class="context-menu-item-shortcut">Ctrl+Shift+K</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-math-block"><span class="context-menu-item-label">公式块</span><span class="context-menu-item-shortcut">Ctrl+Shift+M</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-toc"><span class="context-menu-item-label">内容目录</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-yaml-front-matter"><span class="context-menu-item-label">YAML Front Matter</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-insert-above"><span class="context-menu-item-label">段落（上方）</span></div>',
        '      <div class="context-menu-item" data-command="paragraph-insert-below"><span class="context-menu-item-label">段落（下方）</span></div>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join('');

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

