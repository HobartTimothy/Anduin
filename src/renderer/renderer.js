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
// 使用暴露的 API（contextIsolation 启用后，require 不可用）
if (!window.nodeAPI || !window.electronAPI || !window.commandHandlersAPI || !window.contextMenuAPI) {
    throw new Error('必需的 API 未暴露。请确保 preload.js 正确加载。');
}
const marked = window.nodeAPI.marked; // Markdown 解析库
const ipcRenderer = window.electronAPI; // IPC 渲染进程接口
const path = window.nodeAPI.path; // 路径处理工具
const {createCommandHandlers} = window.commandHandlersAPI; // 命令处理器模块
const {initContextMenu} = window.contextMenuAPI; // 上下文菜单模块

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
        try {
            resultPane.innerHTML = marked.parse(markdown);
        } catch (error) {
            console.error('Markdown 渲染错误:', error);
            resultPane.innerHTML = '<p style="color: red;">渲染错误: ' + error.message + '</p>';
        }

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
 * 编辑器回车键事件处理
 * 在列表项中按回车时，自动创建新的列表项
 */
editor.addEventListener('keydown', (e) => {
    // 只在源代码模式下处理，且只处理回车键
    if (currentMode === 'result' || e.key !== 'Enter') {
        return;
    }
    
    const listInfo = detectListMarker();
    
    // 如果当前行是列表项，处理自动创建新列表项
    if (listInfo.isList) {
        e.preventDefault(); // 阻止默认的回车行为
        
        const {lineStart, lineEnd} = getCurrentLineRange();
        const value = editor.value;
        const currentLine = value.slice(lineStart, lineEnd);
        const cursorPos = editor.selectionStart;
        
        // 检查光标是否在列表项内容的末尾（即列表项为空或光标在标记之后）
        const contentStart = lineStart + listInfo.indent.length + listInfo.marker.length;
        const lineContent = currentLine.slice(listInfo.indent.length + listInfo.marker.length);
        
        // 如果当前列表项为空（只有标记），则退出列表
        if (lineContent.trim() === '') {
            // 删除当前空行，插入普通换行
            // lineEnd 不包含换行符，所以需要检查下一行
            const nextLineStart = lineEnd < value.length && value[lineEnd] === '\n' ? lineEnd + 1 : lineEnd;
            const newValue = value.slice(0, lineStart) + '\n' + value.slice(nextLineStart);
            editor.value = newValue;
            editor.selectionStart = editor.selectionEnd = lineStart;
            renderMarkdown(editor.value);
            return;
        }
        
        // 如果光标在列表标记之后，创建新的列表项
        if (cursorPos >= contentStart) {
            const nextMarker = getNextListMarker(listInfo);
            const insertPos = lineEnd;
            const newValue = value.slice(0, insertPos) + '\n' + nextMarker + value.slice(insertPos);
            editor.value = newValue;
            const newCursorPos = insertPos + 1 + nextMarker.length;
            editor.selectionStart = editor.selectionEnd = newCursorPos;
            renderMarkdown(editor.value);
        }
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
 * 获取当前行的内容
 * @returns {string} 当前行的内容
 */
function getCurrentLine() {
    const {lineStart, lineEnd} = getCurrentLineRange();
    return editor.value.slice(lineStart, lineEnd);
}

/**
 * 检测当前行是否是列表项，并提取列表标记信息
 * @returns {{isList: boolean, indent: string, marker: string, number: number|null, orderedFormat: string|null}} 列表信息
 */
function detectListMarker() {
    const line = getCurrentLine();
    
    // 匹配列表项：支持缩进 + 列表标记
    // 无序列表：- 或 * 或 +
    // 有序列表：数字. 或 数字)
    // 任务列表：- [ ] 或 - [x] 或 * [ ] 等
    const listPattern = /^(\s*)([-*+]|\d+([.)]))\s+(.*)$/;
    const taskPattern = /^(\s*)([-*+])\s+(\[[ xX]\])/;
    
    // 先检查是否是任务列表
    const taskMatch = line.match(taskPattern);
    if (taskMatch) {
        return {
            isList: true,
            indent: taskMatch[1],
            marker: taskMatch[2] + ' ' + taskMatch[3] + ' ',
            number: null,
            isTask: true,
            orderedFormat: null
        };
    }
    
    // 检查普通列表
    const listMatch = line.match(listPattern);
    if (listMatch) {
        const indent = listMatch[1];
        const marker = listMatch[2];
        const isOrdered = /^\d+/.test(marker);
        
        if (isOrdered) {
            // 有序列表：提取数字和格式（. 或 )）
            // marker 可能是 "1." 或 "1)"，需要分别提取数字和格式
            const numberMatch = marker.match(/^(\d+)([.)])$/);
            if (numberMatch) {
                const number = parseInt(numberMatch[1]);
                const format = numberMatch[2]; // . 或 )
                return {
                    isList: true,
                    indent: indent,
                    marker: marker + ' ',
                    number: number,
                    isTask: false,
                    orderedFormat: format
                };
            } else {
                // 如果匹配失败，使用默认格式
                const number = parseInt(marker);
                return {
                    isList: true,
                    indent: indent,
                    marker: marker + ' ',
                    number: number,
                    isTask: false,
                    orderedFormat: '.'
                };
            }
        } else {
            // 无序列表
            return {
                isList: true,
                indent: indent,
                marker: marker + ' ',
                number: null,
                isTask: false,
                orderedFormat: null
            };
        }
    }
    
    return {isList: false};
}

/**
 * 获取下一行的列表标记（用于有序列表的编号递增）
 * @param {Object} listInfo - 当前列表信息
 * @returns {string} 下一行的列表标记
 */
function getNextListMarker(listInfo) {
    if (listInfo.isTask) {
        // 任务列表：保持相同的标记格式
        return listInfo.indent + listInfo.marker;
    } else if (listInfo.number !== null) {
        // 有序列表：递增编号，保持原有格式（. 或 )）
        const format = listInfo.orderedFormat || '.';
        return listInfo.indent + (listInfo.number + 1) + format + ' ';
    } else {
        // 无序列表：保持相同的标记
        return listInfo.indent + listInfo.marker;
    }
}

/**
 * 在光标位置插入文本
 * @param {string} text - 要插入的文本
 */
function insertTextAtCursor(text) {
    if (!text) {
        console.warn('insertTextAtCursor: 文本为空，跳过插入');
        return;
    }
    
    // 确保编辑器存在且可用
    if (!editor) {
        console.error('insertTextAtCursor: 编辑器元素不存在');
        return;
    }
    
    // 确保编辑器获得焦点
    editor.focus();
    
    // 获取当前光标位置，如果不可用则使用文档末尾
    const start = (editor.selectionStart !== undefined && editor.selectionStart !== null) 
        ? editor.selectionStart 
        : (editor.value ? editor.value.length : 0);
    const end = (editor.selectionEnd !== undefined && editor.selectionEnd !== null) 
        ? editor.selectionEnd 
        : (editor.value ? editor.value.length : 0);
    const value = editor.value || '';
    
    console.log('insertTextAtCursor - 插入前:', {
        start,
        end,
        valueLength: value.length,
        textToInsert: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });
    
    // 插入文本
    const newValue = value.slice(0, start) + text + value.slice(end);
    editor.value = newValue;
    const newPos = start + text.length;
    
    // 将光标移动到插入文本的末尾
    try {
        editor.selectionStart = newPos;
        editor.selectionEnd = newPos;
    } catch (e) {
        console.warn('设置光标位置失败:', e);
    }
    
    console.log('insertTextAtCursor - 插入后:', {
        newPos,
        newValueLength: newValue.length,
        cursorPosition: editor.selectionStart
    });
    
    // 触发 input 事件以确保其他监听器能够响应
    try {
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        editor.dispatchEvent(inputEvent);
    } catch (e) {
        console.warn('触发 input 事件失败:', e);
    }
    
    // 渲染 Markdown
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
 * 显示输入对话框（替代 window.prompt）
 * @param {string} message - 提示信息
 * @param {string} defaultValue - 默认值
 * @returns {Promise<string|null>} 用户输入的值，如果取消则返回 null
 */
function showInputDialog(message, defaultValue = '') {
    return new Promise((resolve) => {
        // 保存当前活动元素，以便对话框关闭后恢复焦点
        const previousActiveElement = document.activeElement;
        
        // 创建模态遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 300px;
            max-width: 500px;
        `;
        
        // 创建消息标签
        const label = document.createElement('label');
        label.textContent = message;
        label.style.cssText = `
            display: block;
            margin-bottom: 10px;
            font-size: 14px;
            color: #333;
        `;
        
        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 15px;
        `;
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;
        
        // 创建确定按钮
        const okButton = document.createElement('button');
        okButton.textContent = '确定';
        okButton.style.cssText = `
            padding: 6px 16px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        okButton.onmouseover = () => okButton.style.background = '#005a9e';
        okButton.onmouseout = () => okButton.style.background = '#007acc';
        
        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            padding: 6px 16px;
            background: #f0f0f0;
            color: #333;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelButton.onmouseover = () => cancelButton.style.background = '#e0e0e0';
        cancelButton.onmouseout = () => cancelButton.style.background = '#f0f0f0';
        
        // 组装对话框
        buttonContainer.appendChild(okButton);
        buttonContainer.appendChild(cancelButton);
        dialog.appendChild(label);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 聚焦输入框并选中默认值（延迟确保 DOM 已渲染）
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
        
        // 恢复焦点的辅助函数
        const restoreFocus = () => {
            // 延迟恢复焦点，确保对话框完全关闭
            setTimeout(() => {
                // 如果之前有活动元素且是编辑器，恢复焦点
                if (previousActiveElement && (previousActiveElement === editor || previousActiveElement === resultPane)) {
                    previousActiveElement.focus();
                } else if (currentMode === 'result' && resultPane) {
                    // 结果模式：聚焦结果面板
                    resultPane.focus();
                } else if (editor) {
                    // 其他模式：聚焦编辑器
                    editor.focus();
                }
            }, 50);
        };
        
        // 确定按钮处理
        const handleOk = () => {
            const value = input.value;
            document.body.removeChild(overlay);
            restoreFocus();
            resolve(value);
        };
        
        // 取消按钮处理
        const handleCancel = () => {
            document.body.removeChild(overlay);
            restoreFocus();
            resolve(null);
        };
        
        okButton.addEventListener('click', handleOk);
        cancelButton.addEventListener('click', handleCancel);
        
        // 按 Enter 键确定，按 Esc 键取消
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleOk();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
        
        // 点击遮罩层取消
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        });
    });
}

/**
 * 插入链接
 * 如果选中了文本，则使用选中文本作为链接文本；否则使用默认文本
 */
async function insertLink() {
    const url = await showInputDialog('输入链接地址：', 'https://');
    if (!url) {
        return;
    }
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const selected = value.slice(start, end) || '链接文本';
    const md = `[${selected}](${url})`;
    editor.value = value.slice(0, start) + md + value.slice(end);
    // 延迟聚焦，确保对话框完全关闭
    setTimeout(() => {
        editor.focus();
        editor.selectionStart = start;
        editor.selectionEnd = start + md.length;
    }, 100);
    renderMarkdown(editor.value);
}

/**
 * 插入图片
 * 支持选择本地图片文件（包括 GIF）或输入图片 URL
 */
async function insertImage() {
    try {
        // 确保编辑器获得焦点
        editor.focus();
        
        // 首先尝试打开文件选择对话框选择本地图片
        const result = await ipcRenderer.invoke('select-image-file');
        
        console.log('图片选择结果:', result); // 调试信息
        
        if (result && result.filePath) {
            // 用户选择了本地文件
            const filePath = result.filePath;
            console.log('选择的文件路径:', filePath); // 调试信息
            
            // 将文件路径转换为 file:// URL 格式
            // 使用 path 模块规范化路径，然后转换为 URL
            const normalizedPath = path.normalize(filePath);
            let imageUrl = normalizedPath.replace(/\\/g, '/');
            
            // Windows 路径处理：确保正确格式
            // 如果路径是绝对路径（如 C:/path/to/file），需要转换为 file:///C:/path/to/file
            if (!imageUrl.startsWith('file://')) {
                // 对于 Windows 绝对路径（如 C:/...），需要三个斜杠
                if (imageUrl.match(/^[A-Za-z]:/)) {
                    imageUrl = `file:///${imageUrl}`;
                } else {
                    // 相对路径或其他情况
                    imageUrl = `file:///${imageUrl}`;
                }
            }
            
            // 对路径进行编码，确保特殊字符正确处理
            // 注意：encodeURI 不会编码 : / 等字符，这对 file:// URL 是正确的
            const encodedUrl = encodeURI(imageUrl).replace(/#/g, '%23');
            
            const alt = (await showInputDialog('输入图片说明（可选）：', '')) || '';
            const md = `![${alt}](${encodedUrl})`;
            
            console.log('生成的 Markdown:', md); // 调试信息
            console.log('编辑器当前值长度:', editor.value.length); // 调试信息
            console.log('光标位置:', editor.selectionStart, editor.selectionEnd); // 调试信息
            
            insertTextAtCursor(md);
            
            // 验证插入是否成功
            setTimeout(() => {
                console.log('插入后编辑器值长度:', editor.value.length); // 调试信息
                console.log('插入后光标位置:', editor.selectionStart, editor.selectionEnd); // 调试信息
            }, 100);
            
            return;
        }
        
        // 用户取消了文件选择或没有选择文件，可以选择输入 URL
        if (result && result.cancelled) {
            const url = await showInputDialog('输入图片地址（或取消以退出）：', 'https://');
            if (url && url.trim()) {
                const alt = (await showInputDialog('输入图片说明（可选）：', '')) || '';
                const md = `![${alt}](${url.trim()})`;
                console.log('生成的 Markdown (URL):', md); // 调试信息
                insertTextAtCursor(md);
            }
        } else {
            // 如果 result 为空或格式不正确，回退到 URL 输入方式
            const url = await showInputDialog('输入图片地址（或取消以退出）：', 'https://');
            if (url && url.trim()) {
                const alt = (await showInputDialog('输入图片说明（可选）：', '')) || '';
                const md = `![${alt}](${url.trim()})`;
                console.log('生成的 Markdown (回退):', md); // 调试信息
                insertTextAtCursor(md);
            }
        }
    } catch (error) {
        console.error('插入图片失败:', error);
        // 如果文件选择失败，回退到 URL 输入方式
        const url = await showInputDialog('输入图片地址：', 'https://');
        if (url && url.trim()) {
            const alt = (await showInputDialog('输入图片说明（可选）：', '')) || '';
            const md = `![${alt}](${url.trim()})`;
            console.log('生成的 Markdown (错误处理):', md); // 调试信息
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
    currentFilePathRef,
    ipcRenderer,
    path
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
        
        // 确保编辑器获得焦点（延迟执行，确保文件对话框已关闭）
        setTimeout(() => {
            if (currentMode !== 'result') {
                editor.focus();
            } else {
                resultPane.focus();
            }
        }, 100);

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
// 初始化上下文菜单（在 commandHandlers 创建后调用）
initContextMenu(editor, handleMenuCommand);
