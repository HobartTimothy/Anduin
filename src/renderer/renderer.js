/**
 * 渲染进程主文件
 * 负责处理 Markdown 编辑器的所有前端逻辑，包括：
 * - Markdown 渲染和预览
 * - 编辑模式切换（对比模式、源代码模式、结果模式）
 * - 文件操作和导出
 * - 菜单命令处理
 * - 右键上下文菜单
 * - 与主进程的 IPC 通信
 */


// ==================== 模块导入 ====================
const {marked} = require('marked'); // Markdown 解析库
const {ipcRenderer} = require('electron'); // Electron IPC 渲染进程接口
const path = require('path'); // 路径处理工具
const {createCommandHandlers} = require('./commandHandlers'); // 命令处理器模块

// ==================== DOM 元素引用 ====================
const editor = document.getElementById('editor'); // Markdown 编辑器文本域
const preview = document.getElementById('preview'); // 预览面板
const resultPane = document.getElementById('result-pane'); // 结果模式编辑面板
const appRoot = document.getElementById('app-root'); // 应用根容器，用于切换模式样式

// ==================== 全局状态变量 ====================

/**
 * 当前编辑模式
 * - 'split': 对比模式，同时显示编辑器和预览
 * - 'source': 源代码模式，只显示编辑器
 * - 'result': 结果模式，只显示渲染后的 HTML（可编辑）
 */
let currentMode = 'split';
// 使用引用对象来存储当前文件路径，以便在命令处理器中修改
const currentFilePathRef = {current: null};

// 防抖定时器，用于优化 Markdown 渲染性能
let renderDebounceTimer = null;
const RENDER_DEBOUNCE_DELAY = 150; // 防抖延迟时间（毫秒）

/**
 * 渲染 Markdown 文本为 HTML
 * @param {string} text - 要渲染的 Markdown 文本
 * @param {boolean} immediate - 是否立即渲染（跳过防抖）
 */
function renderMarkdown(text, immediate = false) {
    if (immediate) {
        // 立即渲染，清除防抖定时器
        if (renderDebounceTimer) {
            clearTimeout(renderDebounceTimer);
            renderDebounceTimer = null;
        }
        _doRenderMarkdown(text);
    } else {
        // 使用防抖，延迟渲染
        if (renderDebounceTimer) {
            clearTimeout(renderDebounceTimer);
        }
        renderDebounceTimer = setTimeout(() => {
            _doRenderMarkdown(text);
            renderDebounceTimer = null;
        }, RENDER_DEBOUNCE_DELAY);
    }
}

/**
 * 执行实际的 Markdown 渲染
 * @param {string} text - 要渲染的 Markdown 文本
 * @private
 */
function _doRenderMarkdown(text) {
    try {
        const rawHtml = marked.parse(text || '');
        // 对于桌面本地应用，简单场景下可以直接使用 marked 的输出
        preview.innerHTML = rawHtml;
        // 如果当前是结果模式，同时更新结果面板
        if (currentMode === 'result') {
            resultPane.innerHTML = rawHtml;
        }
    } catch (error) {
        console.error('Markdown 渲染错误:', error);
        preview.innerHTML = '<p style="color: red;">渲染错误: ' + error.message + '</p>';
    }
}

/**
 * 设置编辑器显示模式
 * @param {string} mode - 模式名称：'split'（对比模式）、'source'（源代码模式）、'result'（结果模式）
 */
function setMode(mode) {
    currentMode = mode;
    // 更新根容器的类名，用于应用对应的 CSS 样式
    appRoot.className = `app-root mode-${mode}`;

    if (mode === 'result') {
        // 切换到结果模式时，将当前 markdown 渲染到结果面板
        isUpdatingResultPane = true;
        const markdown = editor.value || '';
        resultPane.innerHTML = marked.parse(markdown);

        // 确保 result-pane 可以编辑
        resultPane.contentEditable = 'true';

        // 延迟聚焦，确保 DOM 已更新
        setTimeout(() => {
            resultPane.focus();
            // 将光标移动到末尾
            const range = document.createRange();
            range.selectNodeContents(resultPane);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            isUpdatingResultPane = false;
        }, 50);
    } else if (mode === 'source') {
        // 切换到源代码模式时，聚焦编辑器
        editor.focus();
    } else {
        // 对比模式：同时显示编辑器和预览
        renderMarkdown(editor.value, true); // 模式切换时立即渲染
    }
}

// ==================== 初始化 ====================
// 初始化默认模式为对比模式
setMode('split');

// 加载保存的主题设置
try {
    const settings = ipcRenderer.sendSync('get-settings') || {};
    if (settings.theme) {
        setTheme(settings.theme, false); // 加载时不保存，避免覆盖
    } else {
        // 默认使用 github 主题，首次使用时保存
        setTheme('github', true);
    }
} catch (error) {
    console.error('加载主题失败:', error);
    // 默认使用 github 主题
    setTheme('github', true);
}

// ==================== 事件监听 ====================
/**
 * 编辑器输入事件监听
 * 当用户在编辑器中输入时，实时更新预览（结果模式除外）
 */
editor.addEventListener('input', () => {
    if (currentMode !== 'result') {
        renderMarkdown(editor.value);
    }
});

/**
 * HTML 到 Markdown 转换函数
 * 将 HTML 内容转换为 Markdown 格式，用于结果模式的编辑功能
 * @param {string} html - 要转换的 HTML 字符串
 * @returns {string} 转换后的 Markdown 字符串
 */
function htmlToMarkdown(html) {
    if (!html) {
        return '';
    }

    // 创建一个临时 div 来解析 HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    /**
     * 递归转换 DOM 节点为 Markdown
     * @param {Node} node - DOM 节点
     * @returns {string} 转换后的 Markdown 字符串
     */
    function convertNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const tagName = node.tagName.toLowerCase();
        const children = Array.from(node.childNodes).map(convertNode).join('');

        switch (tagName) {
            case 'h1':
                return `# ${children}\n\n`;
            case 'h2':
                return `## ${children}\n\n`;
            case 'h3':
                return `### ${children}\n\n`;
            case 'h4':
                return `#### ${children}\n\n`;
            case 'h5':
                return `##### ${children}\n\n`;
            case 'h6':
                return `###### ${children}\n\n`;
            case 'p':
                return `${children}\n\n`;
            case 'strong':
            case 'b':
                return `**${children}**`;
            case 'em':
            case 'i':
                return `*${children}*`;
            case 'u':
                return `<u>${children}</u>`;
            case 'code':
                return node.parentNode.tagName === 'PRE' ? children : `\`${children}\``;
            case 'pre':
                return `\`\`\`\n${children}\n\`\`\`\n\n`;
            case 'blockquote':
                return `> ${children.split('\n').join('\n> ')}\n\n`;
            case 'ul':
                return `${children}\n`;
            case 'ol':
                return `${children}\n`;
            case 'li': {
                const parent = node.parentNode;
                const isOrdered = parent.tagName === 'OL';
                const index = Array.from(parent.children).indexOf(node);
                const prefix = isOrdered ? `${index + 1}. ` : '- ';
                return `${prefix}${children}\n`;
            }
            case 'a': {
                const href = node.getAttribute('href') || '';
                return `[${children}](${href})`;
            }
            case 'img': {
                const src = node.getAttribute('src') || '';
                const alt = node.getAttribute('alt') || '';
                return `![${alt}](${src})`;
            }
            case 'hr':
                return '---\n\n';
            case 'br':
                return '\n';
            default:
                return children;
        }
    }

    return Array.from(tempDiv.childNodes).map(convertNode).join('').trim();
}

// ==================== 结果模式编辑处理 ====================
let resultEditTimeout = null; // 防抖定时器
let isUpdatingResultPane = false; // 标记是否正在更新结果面板，防止循环更新

/**
 * 结果模式输入事件处理
 * 当用户在结果面板中编辑时，将 HTML 转换为 Markdown 并同步到编辑器
 */
resultPane.addEventListener('input', () => {
    // 只在结果模式且不在更新状态时处理
    if (currentMode !== 'result' || isUpdatingResultPane) {
        return;
    }

    // 防抖处理：延迟 500ms 执行，避免频繁转换
    if (resultEditTimeout) {
        clearTimeout(resultEditTimeout);
    }

    resultEditTimeout = setTimeout(() => {
        try {
            // 保存当前光标位置（暂未使用，但保留用于未来优化）
            const selection = window.getSelection();
            // 将结果面板的 HTML 转换为 Markdown
            const html = resultPane.innerHTML;
            const markdown = htmlToMarkdown(html);
            editor.value = markdown;

            // 重新渲染结果面板（确保格式一致）
            isUpdatingResultPane = true;
            resultPane.innerHTML = marked.parse(markdown);

            // 尝试恢复光标位置（简化处理：移动到末尾）
            if (resultPane.firstChild) {
                const newRange = document.createRange();
                newRange.selectNodeContents(resultPane);
                newRange.collapse(false); // 移动到末尾
                selection.removeAllRanges();
                selection.addRange(newRange);
            }

            isUpdatingResultPane = false;
        } catch (error) {
            console.error('结果模式编辑错误:', error);
            isUpdatingResultPane = false;
        }
    }, 500);
});

/**
 * 结果模式粘贴事件处理
 * 在结果模式中粘贴时，只粘贴纯文本，避免引入格式问题
 */
resultPane.addEventListener('paste', (e) => {
    if (currentMode !== 'result') {
        return;
    }

    e.preventDefault(); // 阻止默认粘贴行为
    const text = e.clipboardData.getData('text/plain'); // 获取剪贴板中的纯文本

    // 插入纯文本到当前光标位置
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents(); // 删除选中的内容
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
});

// ==================== 格式化辅助函数 ====================
/**
 * 在选中文本前后添加标记（如加粗、斜体等）
 * @param {string} before - 选中文本前要添加的标记
 * @param {string} after - 选中文本后要添加的标记（默认与 before 相同）
 */
function surroundSelection(before, after = before) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selected = value.slice(start, end);
    const newText = before + selected + after;
    editor.value = value.slice(0, start) + newText + value.slice(end);
    editor.focus();
    // 重新选中被标记的文本
    editor.selectionStart = start + before.length;
    editor.selectionEnd = start + before.length + selected.length;
    renderMarkdown(editor.value);
}

/**
 * 切换行前缀（用于标题、列表等格式）
 * 如果行已有该前缀则移除，否则添加
 * @param {string} prefix - 要切换的前缀（如 '# '、'- '、'1. ' 等）
 */
function toggleLinePrefix(prefix) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    // 对选中的每一行进行前缀切换
    const lines = selected.split('\n').map((line) => {
        if (line.startsWith(prefix)) {
            return line.slice(prefix.length); // 已有前缀则移除
        }
        return prefix + line; // 无前缀则添加
    });

    const newSelected = lines.join('\n');
    editor.value = before + newSelected + after;
    editor.focus();
    editor.selectionStart = start;
    editor.selectionEnd = start + newSelected.length;
    renderMarkdown(editor.value);
}

/**
 * 获取当前光标所在行的范围
 * @returns {{lineStart: number, lineEnd: number}} 行的起始和结束位置
 */
function getCurrentLineRange() {
    const value = editor.value;
    const pos = editor.selectionStart;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = value.indexOf('\n', pos);
    if (lineEnd === -1) {
        lineEnd = value.length;
    } // 如果是最后一行
    return {lineStart, lineEnd};
}

/**
 * 在光标位置插入文本
 * @param {string} text - 要插入的文本
 */
function insertTextAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    editor.value = value.slice(0, start) + text + value.slice(end);
    const newPos = start + text.length;
    editor.focus();
    // 将光标移动到插入文本的末尾
    editor.selectionStart = editor.selectionEnd = newPos;
    renderMarkdown(editor.value);
}

/**
 * 调整标题级别（提升或降低）
 * @param {number} delta - 级别变化量（正数降低级别，负数提升级别）
 */
function adjustHeadingLevel(delta) {
    const {lineStart, lineEnd} = getCurrentLineRange();
    const value = editor.value;
    const line = value.slice(lineStart, lineEnd);
    // 匹配标题格式：1-6 个 # 号后跟空格和标题文本
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
        return;
    } // 如果不是标题格式，直接返回
    let level = match[1].length + delta;
    // 限制标题级别在 1-6 之间
    if (level < 1) {
        level = 1;
    }
    if (level > 6) {
        level = 6;
    }
    const newLine = `${'#'.repeat(level)} ${match[2]}`;
    editor.value = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
    editor.focus();
    editor.selectionStart = editor.selectionEnd = lineStart + newLine.length;
    renderMarkdown(editor.value);
}

/**
 * 设置应用主题
 * @param {string} theme - 主题名称（如 'github'、'newsprint'、'night' 等）
 * @param {boolean} save - 是否保存到设置，默认为 true
 */
function setTheme(theme, save = true) {
    const themes = ['github-theme', 'newsprint-theme', 'night-theme', 'pixyll-theme', 'whitey-theme'];
    // 移除所有主题类
    themes.forEach((t) => document.body.classList.remove(t));
    // 添加新主题类
    const cls = `${theme}-theme`;
    document.body.classList.add(cls);
    
    // 保存主题到设置
    if (save) {
        try {
            const settings = ipcRenderer.sendSync('get-settings') || {};
            settings.theme = theme;
            ipcRenderer.send('save-settings', settings);
        } catch (error) {
            console.error('保存主题失败:', error);
        }
    }
}

/**
 * 待实现功能提示
 * @param {string} featureName - 功能名称
 */
function notImplemented(featureName) {
    alert(`"${featureName}"功能待实现。`);
}

// ==================== 导出功能 ====================
let lastExportSettings = null; // 保存上一次的导出设置，用于快速重新导出

/**
 * 获取导出数据
 * @returns {{content: string, html: string, title: string, defaultFilename: string}} 导出所需的数据
 */
function getExportData() {
    const content = editor.value; // Markdown 原始内容
    const html = preview.innerHTML; // 渲染后的 HTML

    let title = '未命名';
    let defaultFilename = '未命名';

    // 如果当前有打开的文件，使用文件名作为标题和默认文件名
    if (currentFilePathRef.current) {
        const parsedPath = path.parse(currentFilePathRef.current);
        title = parsedPath.name;
        defaultFilename = parsedPath.name;
    }

    return {
        content,
        html,
        title,
        defaultFilename
    };
}

/**
 * 导出为 PDF
 */
async function exportToPDF() {
    const data = getExportData();

    const result = await ipcRenderer.invoke('export-pdf', data);

    if (result.success) {
        alert('PDF导出成功！\n保存位置：' + result.path);
        lastExportSettings = {type: 'pdf', path: result.path, data};
    } else if (!result.cancelled) {
        alert('导出失败：' + (result.error || '未知错误'));
    }
}

/**
 * 导出为 HTML
 * @param {boolean} withStyles - 是否包含样式（默认 true）
 */
async function exportToHTML(withStyles = true) {
    const data = getExportData();
    data.withStyles = withStyles;

    const result = await ipcRenderer.invoke('export-html', data);

    if (result.success) {
        alert('HTML导出成功！\n保存位置：' + result.path);
        lastExportSettings = {type: 'html', path: result.path, data};
    } else if (!result.cancelled) {
        alert('导出失败：' + (result.error || '未知错误'));
    }
}

/**
 * 导出为图片
 */
async function exportToImage() {
    const data = getExportData();

    const result = await ipcRenderer.invoke('export-image', data);

    if (result.success) {
        alert('图像导出成功！\n保存位置：' + result.path);
        lastExportSettings = {type: 'image', path: result.path, data};
    } else if (!result.cancelled) {
        alert('导出失败：' + (result.error || '未知错误'));
    }
}

/**
 * 打印文档
 */
async function printDocument() {
    const data = getExportData();

    const result = await ipcRenderer.invoke('print-document', {
        html: data.html,
        title: data.title
    });

    if (!result.success) {
        alert('打印失败：' + (result.error || '未知错误'));
    }
    // 打印成功不需要提示，因为用户已经在打印对话框中操作了
}

/**
 * 导出为 Markdown
 */
async function exportToMarkdown() {
    const data = getExportData();

    const result = await ipcRenderer.invoke('export-markdown', data);

    if (result.success) {
        alert('Markdown导出成功！\n保存位置：' + result.path);
        lastExportSettings = {type: 'markdown', path: result.path, data};
    } else if (!result.cancelled) {
        alert('导出失败：' + (result.error || '未知错误'));
    }
}

/**
 * 使用上一次的导出设置重新导出
 */
async function exportWithLastSettings() {
    if (!lastExportSettings) {
        alert('没有上一次的导出设置');
        return;
    }

    const {type} = lastExportSettings;
    switch (type) {
        case 'pdf':
            await exportToPDF();
            break;
        case 'html':
            await exportToHTML(lastExportSettings.data.withStyles);
            break;
        case 'image':
            await exportToImage();
            break;
        case 'markdown':
            await exportToMarkdown();
            break;
        default:
            alert('不支持的导出格式');
    }
}

/**
 * 覆盖上一次导出的文件
 */
function exportAndOverwrite() {
    if (!lastExportSettings || !lastExportSettings.path) {
        alert('没有上一次的导出文件');
        return;
    }

    alert('覆盖导出功能待实现');
}

/**
 * 插入链接
 * 如果选中了文本，则使用选中文本作为链接文本；否则使用默认文本
 */
function insertLink() {
    const url = window.prompt('输入链接地址：', 'https://');
    if (!url) {
        return;
    }
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selected = value.slice(start, end) || '链接文本';
    const md = `[${selected}](${url})`;
    editor.value = value.slice(0, start) + md + value.slice(end);
    editor.focus();
    editor.selectionStart = start;
    editor.selectionEnd = start + md.length;
    renderMarkdown(editor.value);
}

/**
 * 插入图片
 * 支持选择本地图片文件（包括 GIF）或输入图片 URL
 */
async function insertImage() {
    try {
        // 首先尝试打开文件选择对话框选择本地图片
        const result = await ipcRenderer.invoke('select-image-file');
        
        if (result && result.filePath) {
            // 用户选择了本地文件
            const filePath = result.filePath;
            // 将文件路径转换为 file:// URL 格式
            // Windows 路径需要转换为 file:///C:/path/to/file 格式
            let imageUrl = filePath.replace(/\\/g, '/');
            // 确保以 file:/// 开头（Windows 路径需要三个斜杠）
            if (!imageUrl.startsWith('file://')) {
                imageUrl = `file:///${imageUrl}`;
            }
            const alt = window.prompt('输入图片说明（可选）：', '') || '';
            const md = `![${alt}](${imageUrl})`;
            insertTextAtCursor(md);
        } else if (result && result.cancelled) {
            // 用户取消了文件选择，可以选择输入 URL
            const url = window.prompt('输入图片地址（或取消以退出）：', 'https://');
            if (url) {
                const alt = window.prompt('输入图片说明（可选）：', '') || '';
                const md = `![${alt}](${url})`;
                insertTextAtCursor(md);
            }
        }
    } catch (error) {
        console.error('插入图片失败:', error);
        // 如果文件选择失败，回退到 URL 输入方式
        const url = window.prompt('输入图片地址：', 'https://');
        if (url) {
            const alt = window.prompt('输入图片说明（可选）：', '') || '';
            const md = `![${alt}](${url})`;
            insertTextAtCursor(md);
        }
    }
}

// ==================== 命令处理器映射 ====================
/**
 * 命令处理器映射对象
 * 将菜单命令名称映射到对应的处理函数
 * 这些命令由主进程通过 IPC 发送
 */
// 创建命令处理器映射对象，传入所有依赖
const commandHandlers = createCommandHandlers({
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
    exportToPDF,
    exportToHTML,
    exportToImage,
    exportWithLastSettings,
    exportAndOverwrite,
    printDocument,
    currentFilePathRef
});

/**
 * 处理菜单命令
 * @param {string} channel - 命令通道名称
 */
function handleMenuCommand(channel) {
    const handler = commandHandlers[channel];
    if (handler) {
        handler();
    }
}

// ==================== IPC 通信监听 ====================
/**
 * 监听主进程发送的菜单命令
 * 从 commandHandlers 自动生成 channels 列表，为每个命令注册 IPC 监听器
 */
const channels = Object.keys(commandHandlers);

channels.forEach((ch) => {
    ipcRenderer.on(ch, () => handleMenuCommand(ch));
});

/**
 * 处理文件打开事件
 * 当主进程打开文件后，将文件内容加载到编辑器
 */
ipcRenderer.on('file-opened', (event, data) => {
    if (data && data.path) {
        currentFilePathRef.current = data.path;
        editor.value = data.content || '';
        renderMarkdown(editor.value, true); // 文件加载时立即渲染
        editor.focus();
        // 保存当前文件路径，用于后续保存和导出
        editor.dataset.currentPath = data.path;
    }
});

/**
 * 处理文件导入事件
 * 将导入的内容追加到当前编辑器内容
 */
ipcRenderer.on('file-imported', (event, data) => {
    if (data && data.content !== undefined) {
        // 获取当前编辑器内容
        const currentContent = editor.value || '';

        // 如果当前内容不为空，在导入内容前添加换行
        const separator = currentContent && !currentContent.endsWith('\n') ? '\n\n' : '';

        // 将导入的内容追加到当前内容
        editor.value = currentContent + separator + data.content;

        // 更新预览（导入时立即渲染）
        renderMarkdown(editor.value, true);

        // 将光标移动到文档末尾
        editor.focus();
        editor.selectionStart = editor.selectionEnd = editor.value.length;

        // 滚动到底部
        editor.scrollTop = editor.scrollHeight;
    }
});

// ==================== 初始化渲染 ====================
// 初始渲染空内容（立即渲染）
renderMarkdown('', true);

// ==================== 右键上下文菜单 ====================
let currentOpenSubmenu = null; // 跟踪当前打开的子菜单，确保一次只展开一个

/**
 * 构建右键上下文菜单
 * @returns {HTMLElement} 菜单 DOM 元素
 */
function buildContextMenu() {
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
 */
function showContextMenu(x, y) {
    const menu = document.getElementById('md-context-menu') || buildContextMenu();
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

// ==================== 上下文菜单事件监听 ====================
/**
 * 编辑器右键菜单事件
 * 在编辑器中右键时显示上下文菜单
 */
editor.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
});

/**
 * 点击事件监听
 * 点击菜单外部时隐藏菜单
 */
document.addEventListener('click', (e) => {
    const menu = document.getElementById('md-context-menu');
    if (!menu) {
        return;
    }
    if (!menu.contains(e.target)) {
        hideContextMenu();
    }
});

/**
 * 键盘事件监听
 * 按 ESC 键时隐藏菜单
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideContextMenu();
    }
    // Win+. 快捷键由系统处理，不拦截
});
