/**
 * 文件处理工具类
 * 提供文件打开、创建、导入等常用文件操作方法
 */

// 引入文件系统模块
const fs = require('fs');
// 引入路径模块
const path = require('path');
// 引入对话框模块
const {dialog} = require('electron');
// 引入 mammoth 库
const mammoth = require('mammoth');
/**
 * @typedef {Object} MammothResult
 * @property {string} value - 转换后的 Markdown 内容
 * @property {Array<string>} messages - 转换过程中的警告信息
 */
// 引入 Turndown 库
const TurndownService = require('turndown');

class FileUtils {
    /**
     * 构造函数
     * @param {Electron.BrowserWindow} mainWindow - Electron 主窗口实例
     */
    constructor(mainWindow) {
        /**
         * @type {Electron.BrowserWindow}
         */
        this.mainWindow = mainWindow;
    }

    /**
     * 读取文件内容，支持多种编码格式（UTF-8、Latin1）
     * @param {string} filePath - 文件路径
     * @returns {string|null} 文件内容，读取失败返回 null
     */
    readFileWithEncoding(filePath) {
        try {
            // 尝试以 UTF-8 编码读取文件
            return fs.readFileSync(filePath, 'utf-8');
        } catch (encodingError) {
            // 如果 UTF-8 读取失败，尝试 Latin1 编码（兼容更多编码）
            try {
                return fs.readFileSync(filePath, 'latin1');
            } catch (error) {
                console.error('读取文件失败:', error);
                return null;
            }
        }
    }

    /**
     * 打开文件并发送到渲染进程
     * @param {string} filePath - 要打开的文件路径
     */
    openFile(filePath) {
        if (!this.mainWindow) {
            return;
        }

        try {
            // 检查文件是否存在
            if (fs.existsSync(filePath)) {
                // 读取文件内容（UTF-8 编码）
                const content = fs.readFileSync(filePath, 'utf-8');

                // 通过 IPC 发送文件内容到渲染进程
                this.mainWindow.webContents.send('file-opened', {
                    path: filePath,
                    content: content
                });
            }
        } catch (error) {
            console.error('打开文件失败:', error);
            // 显示错误对话框
            dialog.showErrorBox('错误', `无法打开文件: ${error.message}`);
        }
    }

    /**
     * 在指定目录创建新的 Markdown 文件
     * @param {string} targetDir - 目标目录路径
     */
    createNewMdFile(targetDir) {
        if (!this.mainWindow) {
            return;
        }

        try {
            // 生成新文件名
            let fileName = '新建 Markdown 文件.md';
            let filePath = path.join(targetDir, fileName);
            let counter = 1;

            // 如果文件已存在，添加数字后缀（如：新建 Markdown 文件 (1).md）
            while (fs.existsSync(filePath)) {
                fileName = `新建 Markdown 文件 (${counter}).md`;
                filePath = path.join(targetDir, fileName);
                counter++;
            }

            // 创建新文件（空内容）
            fs.writeFileSync(filePath, '', 'utf-8');

            // 打开新创建的文件
            if (this.mainWindow) {
                this.mainWindow.webContents.send('file-opened', {
                    path: filePath,
                    content: ''
                });

                // 聚焦主窗口
                this.mainWindow.focus();
            }
        } catch (error) {
            console.error('创建文件失败:', error);
            dialog.showErrorBox('错误', `无法创建文件: ${error.message}`);
        }
    }

    /**
     * 从 TXT 文件导入内容，支持多种编码格式（UTF-8、Latin1）
     */
    async importFromFile() {
        if (!this.mainWindow) {
            return;
        }

        try {
            // 显示文件选择对话框
            // @type {Electron.BrowserWindow}
            const window = this.mainWindow;
            const result = await dialog.showOpenDialog(window, {
                title: '选择要导入的txt文件',
                filters: [
                    {name: '文本文件', extensions: ['txt']}
                ],
                // 只能选择单个文件
                properties: ['openFile']
            });

            // 用户取消选择
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return;
            }

            // 获取文件路径
            const filePath = result.filePaths[0];

            // 验证文件是否存在
            if (!fs.existsSync(filePath)) {
                dialog.showErrorBox('错误', '文件不存在');
                return;
            }

            // 读取文件内容（支持多种编码）
            const content = this.readFileWithEncoding(filePath);
            if (content === null) {
                dialog.showErrorBox('错误', '无法读取文件，可能是不支持的编码格式');
                return;
            }

            // 发送导入的内容到渲染进程
            this.mainWindow.webContents.send('file-imported', {
                content: content,
                sourcePath: filePath
            });
        } catch (error) {
            console.error('导入文件失败:', error);
            dialog.showErrorBox('错误', `无法导入文件: ${error.message}`);
        }
    }

    /**
     * 从 Word 文档（.docx）导入内容并转换为 Markdown
     * 使用 mammoth 库进行转换
     */
    async importFromWord() {
        if (!this.mainWindow) {
            return;
        }

        try {
            // 显示文件选择对话框
            // @type {Electron.BrowserWindow}
            const window = this.mainWindow;
            const result = await dialog.showOpenDialog(window, {
                title: '选择要导入的Word文档',
                filters: [
                    {name: 'Word文档', extensions: ['docx']},
                    {name: '所有文件', extensions: ['*']}
                ],
                properties: ['openFile']
            });

            // 用户取消选择
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return;
            }

            const filePath = result.filePaths[0];

            // 验证文件是否存在
            if (!fs.existsSync(filePath)) {
                dialog.showErrorBox('错误', '文件不存在');
                return;
            }

            // 读取 Word 文档为 Buffer
            const buffer = fs.readFileSync(filePath);
            // 使用 mammoth 将 Word 文档转换为 Markdown
            // @type {MammothResult}
            const resultMammoth = await mammoth.convertToMarkdown({buffer: buffer});

            const content = resultMammoth.value;

            // 如果有警告信息（如格式转换问题），记录但不阻止导入
            if (resultMammoth.messages && resultMammoth.messages.length > 0) {
                console.warn('Word导入警告:', resultMammoth.messages);
            }

            // 发送导入的内容到渲染进程
            this.mainWindow.webContents.send('file-imported', {
                content: content,
                sourcePath: filePath
            });
        } catch (error) {
            console.error('导入Word文档失败:', error);
            dialog.showErrorBox('错误', `无法导入Word文档: ${error.message}`);
        }
    }

    /**
     * 从 HTML 文件导入内容并转换为 Markdown
     * 使用 TurndownService 库进行转换
     */
    async importFromHTML() {
        if (!this.mainWindow) {
            return;
        }

        try {
            // 显示文件选择对话框
            // @type {Electron.BrowserWindow}
            const window = this.mainWindow;
            const result = await dialog.showOpenDialog(window, {
                title: '选择要导入的HTML文件',
                filters: [
                    {name: 'HTML文件', extensions: ['html', 'htm']},
                    {name: '所有文件', extensions: ['*']}
                ],
                properties: ['openFile']
            });

            // 用户取消选择
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return;
            }

            const filePath = result.filePaths[0];

            // 验证文件是否存在
            if (!fs.existsSync(filePath)) {
                dialog.showErrorBox('错误', '文件不存在');
                return;
            }

            // 读取 HTML 文件内容（支持多种编码）
            const htmlContent = this.readFileWithEncoding(filePath);
            if (htmlContent === null) {
                dialog.showErrorBox('错误', '无法读取文件，可能是不支持的编码格式');
                return;
            }

            // 初始化 TurndownService，配置转换选项
            /** @type {TurndownService} */
            const turndownService = new TurndownService({
                headingStyle: 'atx', // 使用 # 风格的标题（如：## 标题）
                codeBlockStyle: 'fenced', // 使用 ``` 风格的代码块
                bulletListMarker: '-', // 使用 - 作为无序列表标记
                emDelimiter: '*', // 使用 * 作为斜体标记
                strongDelimiter: '**', // 使用 ** 作为粗体标记
                linkStyle: 'inlined', // 使用内联链接样式 [text](url)
                linkReferenceStyle: 'full' // 使用完整引用样式
            });

            // 添加自定义规则：删除线（<del>, <s>, <strike> 标签）
            turndownService.addRule('strikethrough', {
                filter: ['del', 's', 'strike'],
                replacement: function (content) {
                    return '~~' + content + '~~';
                }
            });

            // 添加自定义规则：下划线（<u> 标签，Markdown 不支持，保留 HTML 标签）
            turndownService.addRule('underline', {
                filter: 'u',
                replacement: function (content) {
                    return '<u>' + content + '</u>';
                }
            });

            // 转换 HTML 为 Markdown
            const markdownContent = turndownService.turndown(htmlContent);

            // 发送导入的内容到渲染进程
            this.mainWindow.webContents.send('file-imported', {
                content: markdownContent,
                sourcePath: filePath
            });
        } catch (error) {
            console.error('导入HTML文件失败:', error);
            dialog.showErrorBox('错误', `无法导入HTML文件: ${error.message}`);
        }
    }
}

// 导出类
module.exports = FileUtils;
