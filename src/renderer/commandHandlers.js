/**
 * 命令处理器模块
 * 包含所有菜单命令的处理函数
 * 这些命令由主进程通过 IPC 发送
 * 
 * 注意：path 和 ipcRenderer 现在通过 dependencies 参数传入
 */

/**
 * 创建命令处理器映射对象
 * @param {Object} dependencies - 依赖对象，包含所有需要的函数和变量
 * @param {HTMLElement} dependencies.editor - Markdown 编辑器 DOM 元素
 * @param {Function} dependencies.renderMarkdown - 渲染 Markdown 函数
 * @param {Function} dependencies.setMode - 设置编辑器模式函数
 * @param {Function} dependencies.setTheme - 设置主题函数
 * @param {Function} dependencies.notImplemented - 未实现功能提示函数
 * @param {Function} dependencies.surroundSelection - 在选中文本前后添加标记函数
 * @param {Function} dependencies.toggleLinePrefix - 切换行前缀函数
 * @param {Function} dependencies.getCurrentLineRange - 获取当前行范围函数
 * @param {Function} dependencies.insertTextAtCursor - 在光标位置插入文本函数
 * @param {Function} dependencies.adjustHeadingLevel - 调整标题级别函数
 * @param {Function} dependencies.insertLink - 插入链接函数
 * @param {Function} dependencies.insertImage - 插入图片函数
 * @param {Function} dependencies.showInsertTableDialog - 显示插入表格对话框函数
 * @param {Function} dependencies.exportToPDF - 导出为 PDF 函数
 * @param {Function} dependencies.exportToHTML - 导出为 HTML 函数
 * @param {Function} dependencies.exportToImage - 导出为图片函数
 * @param {Function} dependencies.exportWithLastSettings - 使用上次设置导出函数
 * @param {Function} dependencies.exportAndOverwrite - 覆盖上次导出函数
 * @param {Function} dependencies.printDocument - 打印文档函数
 * @param {Object} dependencies.currentFilePathRef - 当前文件路径的引用对象（用于修改）
 * @param {Object} dependencies.ipcRenderer - IPC 渲染进程接口
 * @param {Object} dependencies.path - 路径处理工具
 * @returns {Object} 命令处理器映射对象
 */
function createCommandHandlers(dependencies) {
    const {
        editor,
        renderMarkdown,
        setMode,
        setTheme,
        notImplemented,
        surroundSelection,
        toggleLinePrefix,
        getCurrentLineRange,
        insertTextAtCursor,
        adjustHeadingLevel,
        insertLink,
        insertImage,
        showInsertTableDialog,
        exportToPDF,
        exportToHTML,
        exportToImage,
        exportWithLastSettings,
        exportAndOverwrite,
        printDocument,
        currentFilePathRef,
        ipcRenderer,
        path
    } = dependencies;

    return {
        // 文件菜单
        'file-new': () => {
            editor.value = '';
            editor.focus();
            renderMarkdown('', true); // 新建文件时立即渲染
        },
        'file-new-window': () => notImplemented('新建窗口'),
        'file-open': () => notImplemented('打开文件'),
        'file-open-folder': () => notImplemented('打开文件夹'),
        'file-quick-open': () => notImplemented('快速打开'),
        'file-save': async () => {
            const content = editor.value || '';
            let filePath = currentFilePathRef.current; // 如果已打开文件，使用当前路径
            let defaultFilename = '未命名';

            // 如果当前有打开的文件，使用文件名作为默认文件名
            if (filePath) {
                const parsedPath = path.parse(filePath);
                defaultFilename = parsedPath.name;
            }

            const result = await ipcRenderer.invoke('save-file', {
                content: content,
                filePath: filePath, // 如果已打开文件，直接保存；否则为 null，会弹出对话框
                defaultFilename: defaultFilename
            });

            if (result.success) {
                // 更新当前文件路径
                currentFilePathRef.current = result.path;
                editor.dataset.currentPath = result.path;
                // 可以显示保存成功的提示（可选）
                // alert('文件已保存：' + result.path);
            } else if (!result.cancelled) {
                alert('保存失败：' + (result.error || '未知错误'));
            }
            
            // 恢复编辑器焦点（延迟执行，确保对话框已关闭）
            setTimeout(() => {
                editor.focus();
            }, 100);
        },
        'file-save-as': async () => {
            const content = editor.value || '';
            let defaultFilename = '未命名';

            // 如果当前有打开的文件，使用文件名作为默认文件名
            if (currentFilePathRef.current) {
                const parsedPath = path.parse(currentFilePathRef.current);
                defaultFilename = parsedPath.name;
            }

            // 另存为总是弹出对话框，不传入 filePath
            const result = await ipcRenderer.invoke('save-file', {
                content: content,
                filePath: null, // 强制弹出对话框
                defaultFilename: defaultFilename
            });

            if (result.success) {
                // 更新当前文件路径
                currentFilePathRef.current = result.path;
                editor.dataset.currentPath = result.path;
                // 可以显示保存成功的提示（可选）
                // alert('文件已保存：' + result.path);
            } else if (!result.cancelled) {
                alert('保存失败：' + (result.error || '未知错误'));
            }
            
            // 恢复编辑器焦点（延迟执行，确保对话框已关闭）
            setTimeout(() => {
                editor.focus();
            }, 100);
        },
        'file-move-to': () => notImplemented('移动到'),
        'file-save-all': () => notImplemented('保存全部打开的文件'),
        'file-properties': () => notImplemented('文件属性'),
        'file-open-location': () => notImplemented('打开文件位置'),
        'file-show-sidebar': () => notImplemented('在侧边栏中显示'),
        'file-delete': () => notImplemented('删除文件'),
        'file-import-word': () => {
            // Word导入功能现在由主进程直接处理
            // 此处理器保留用于向后兼容
        },
        'file-import-html': () => {
            // HTML导入功能现在由主进程直接处理
            // 此处理器保留用于向后兼容
        },
        'file-export-pdf': () => exportToPDF(),
        'file-export-html': () => exportToHTML(true),
        'file-export-html-plain': () => exportToHTML(false),
        'file-export-image': () => exportToImage(),
        'file-export-docx': () => notImplemented('导出为 Word (.docx)'),
        'file-export-odt': () => notImplemented('导出为 OpenOffice'),
        'file-export-rtf': () => notImplemented('导出为 RTF'),
        'file-export-epub': () => notImplemented('导出为 Epub'),
        'file-export-latex': () => notImplemented('导出为 LaTeX'),
        'file-export-mediawiki': () => notImplemented('导出为 Media Wiki'),
        'file-export-rst': () => notImplemented('导出为 reStructuredText'),
        'file-export-textile': () => notImplemented('导出为 Textile'),
        'file-export-opml': () => notImplemented('导出为 OPML'),
        'file-export-last': () => exportWithLastSettings(),
        'file-export-overwrite': () => exportAndOverwrite(),
        'file-export-settings': () => notImplemented('导出设置'),
        'file-print': () => printDocument(),
        'file-preferences': () => {
            ipcRenderer.send('open-preferences');
        },
        'file-close': () => {
            if (confirm('确定要关闭当前文件吗？')) {
                editor.value = '';
                renderMarkdown('');
            }
        },

        // 编辑菜单
        'edit-copy-image': () => notImplemented('拷贝图片'),
        'edit-copy-plain': () => notImplemented('复制为纯文本'),
        'edit-copy-md': () => notImplemented('复制为 Markdown'),
        'edit-copy-html': () => notImplemented('复制为 HTML 代码'),
        'edit-copy-rich': () => notImplemented('复制内容并保留格式'),
        'edit-paste-plain': () => notImplemented('粘贴为纯文本'),
        'edit-move-row-up': () => notImplemented('上移表行'),
        'edit-move-row-down': () => notImplemented('下移表行'),
        'edit-delete': () => notImplemented('删除'),
        'edit-delete-range-paragraph': () => notImplemented('删除本段'),
        'edit-delete-range-line': () => notImplemented('删除本行'),
        'edit-math-block': () => notImplemented('数学工具/公式块'),
        'edit-smart-punctuation': () => notImplemented('智能标点'),
        'edit-newline-n': () => notImplemented('换行符转换为 \\n'),
        'edit-newline-rn': () => notImplemented('换行符转换为 \\r\\n'),
        'edit-spaces-newlines': () => notImplemented('空格与换行'),
        'edit-spellcheck': () => notImplemented('拼写检查'),
        'edit-find': () => notImplemented('查找'),
        'edit-find-next': () => notImplemented('查找下一个'),
        'edit-replace': () => notImplemented('替换'),
        'edit-emoji': () => {
            // 使用系统表情符号选择器（Win+. 快捷键由系统处理）
            // 在 Windows 上，系统会自动处理 Win+. 快捷键
            // 这里不需要做任何操作，让系统处理即可
        },

        // 格式菜单
        'toggle-underline': () => surroundSelection('<u>', '</u>'),
        'format-strike': () => surroundSelection('~~', '~~'),
        'format-comment': () => surroundSelection('<!-- ', ' -->'),
        'format-link': insertLink,
        'format-link-edit': () => notImplemented('编辑链接'),
        'format-link-remove': () => notImplemented('移除链接'),
        'format-image-insert': insertImage,
        'format-image-edit': () => notImplemented('编辑图片'),
        'format-clear-style': () => notImplemented('清除样式'),

        // 视图菜单 - 模式切换
        'view-mode-split': () => setMode('split'),
        'toggle-source-mode': () => setMode('source'),
        'toggle-result-mode': () => setMode('result'),
        'view-toggle-sidebar': () => notImplemented('显示 / 隐藏侧边栏'),
        'view-outline': () => notImplemented('大纲'),
        'view-documents': () => notImplemented('文档列表'),
        'view-file-tree': () => notImplemented('文件树'),
        'view-pane': () => notImplemented('窗格'),
        'view-focus-mode': () => notImplemented('专注模式'),
        'view-typewriter-mode': () => notImplemented('打字机模式'),
        'view-toggle-statusbar': () => notImplemented('显示状态栏'),
        'view-word-count': () => {
            const text = editor.value || '';
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            alert(`字数：${words}\n字符数：${chars}`);
        },
        'view-switch-window': () => notImplemented('应用内窗口切换'),

        // 格式化命令
        'toggle-bold': () => surroundSelection('**', '**'),
        'toggle-italic': () => surroundSelection('*', '*'),
        'toggle-inline-code': () => surroundSelection('`', '`'),
        'insert-code-block': () => surroundSelection('\n```language\n', '\n```\n'),
        'toggle-heading-1': () => toggleLinePrefix('# '),
        'toggle-heading-2': () => toggleLinePrefix('## '),
        'toggle-heading-3': () => toggleLinePrefix('### '),
        'toggle-heading-4': () => toggleLinePrefix('#### '),
        'toggle-heading-5': () => toggleLinePrefix('##### '),
        'toggle-heading-6': () => toggleLinePrefix('###### '),
        'heading-promote': () => adjustHeadingLevel(-1),
        'heading-demote': () => adjustHeadingLevel(1),
        'toggle-paragraph': () => toggleLinePrefix(''),
        'toggle-ol': () => toggleLinePrefix('1. '),
        'toggle-ul': () => toggleLinePrefix('- '),
        'toggle-task-list': () => toggleLinePrefix('- [ ] '),
        'paragraph-insert-table': async () => {
            const result = await showInsertTableDialog();
            if (!result) {
                return; // 用户取消了对话框
            }
            const {cols, rows} = result;
            // 生成表头行
            let table = '\n';
            const headerCells = Array(cols).fill('列').map((_, i) => `列${i + 1}`);
            table += '| ' + headerCells.join(' | ') + ' |\n';
            // 生成分隔行
            table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
            // 生成数据行
            for (let i = 0; i < rows; i++) {
                const dataCells = Array(cols).fill('').map(() => '');
                table += '| ' + dataCells.join(' | ') + ' |\n';
            }
            table += '\n';
            insertTextAtCursor(table);
        },
        'paragraph-math-block': () => surroundSelection('\n$$\n', '\n$$\n'),
        'paragraph-toggle-quote': () => toggleLinePrefix('> '),
        'paragraph-insert-above': () => {
            const {lineStart} = getCurrentLineRange();
            const value = editor.value;
            editor.value = value.slice(0, lineStart) + '\n' + value.slice(lineStart);
            editor.focus();
            editor.selectionStart = editor.selectionEnd = lineStart;
            renderMarkdown(editor.value);
        },
        'paragraph-insert-below': () => {
            const {lineEnd} = getCurrentLineRange();
            const value = editor.value;
            const insertPos = value.charAt(lineEnd) === '\n' ? lineEnd + 1 : lineEnd;
            editor.value = value.slice(0, insertPos) + '\n' + value.slice(insertPos);
            editor.focus();
            editor.selectionStart = editor.selectionEnd = insertPos + 1;
            renderMarkdown(editor.value);
        },
        'paragraph-hr': () => insertTextAtCursor('\n\n---\n\n'),
        'paragraph-footnote': () => insertTextAtCursor('[^1]'),
        'paragraph-toc': () => insertTextAtCursor('\n\n<!-- TOC -->\n\n'),
        'paragraph-yaml-front-matter': () => {
            const value = editor.value;
            if (value.startsWith('---\n')) {
                return;
            }
            const yaml = '---\n' + 'title: \n' + 'date: \n' + '---\n\n';
            editor.value = yaml + value;
            editor.focus();
            editor.selectionStart = editor.selectionEnd = yaml.length;
            renderMarkdown(editor.value);
        },
        'paragraph-code-tools-run': () => notImplemented('代码工具'),
        'paragraph-task-toggle-state': () => notImplemented('任务状态'),
        'paragraph-list-indent': () => notImplemented('列表增加缩进'),
        'paragraph-list-outdent': () => notImplemented('列表减少缩进'),
        'paragraph-link-ref': () => insertTextAtCursor('[链接文本][ref]\n\n[ref]: https://example.com'),

        // 主题菜单
        'theme-github': () => setTheme('github'),
        'theme-newsprint': () => setTheme('newsprint'),
        'theme-night': () => setTheme('night'),
        'theme-pixyll': () => setTheme('pixyll'),
        'theme-whitey': () => setTheme('whitey'),

        // 帮助菜单
        'help-whats-new': () => notImplemented('最新内容'),
        'help-quick-start': () => notImplemented('快速上手'),
        'help-markdown-ref': () => notImplemented('Markdown 参考手册'),
        'help-pandoc': () => notImplemented('安装并使用 Pandoc'),
        'help-custom-themes': () => notImplemented('自定义主题'),
        'help-images': () => notImplemented('在编辑器中使用图片'),
        'help-data-recovery': () => notImplemented('数据恢复与版本控制'),
        'help-more-resources': () => notImplemented('更多资源'),
        'help-log': () => notImplemented('日志'),
        'help-changelog': () => notImplemented('更新日志'),
        'help-privacy': () => notImplemented('隐私条款'),
        'help-website': () => notImplemented('官方网站'),
        'help-check-updates': () => notImplemented('检查更新'),
        'help-about': () => {
            ipcRenderer.send('open-about');
        }
    };
}

module.exports = {createCommandHandlers};
