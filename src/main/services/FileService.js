/**
 * src/main/services/FileService.js
 * [优化版] 文件服务类
 * 优化点：使用异步 I/O 替代同步操作，避免阻塞主进程事件循环
 */

const fs = require('fs');
const fsPromises = require('fs').promises; // 引入异步 fs API
const path = require('path');
const { dialog } = require('electron');
const mammoth = require('mammoth');
const TurndownService = require('turndown');

class FileService {
    /**
     * @param {Electron.BrowserWindow} targetWindow - 需要发送 IPC 消息的目标窗口
     */
    constructor(targetWindow) {
        this.targetWindow = targetWindow;
    }

    /**
     * 更新目标窗口引用
     * @param {Electron.BrowserWindow} window
     */
    setTargetWindow(window) {
        this.targetWindow = window;
    }

    /**
     * [异步] 读取文件内容，自动尝试 UTF-8 和 Latin1 编码
     * @param {string} filePath - 文件路径
     * @returns {Promise<string|null>} 文件内容
     */
    async readFileContent(filePath) {
        const supportedEncodings = ['utf-8', 'latin1'];

        for (const encoding of supportedEncodings) {
            try {
                return await fsPromises.readFile(filePath, encoding);
            } catch (error) {
                if (encoding === supportedEncodings[supportedEncodings.length - 1]) {
                    console.error(`[FileService] 读取失败，已尝试编码: ${supportedEncodings.join(', ')}`, error.message);
                }
            }
        }
        return null;
    }

    /**
     * [异步] 打开文件并将内容发送到渲染进程
     * @param {string} filePath
     */
    async openFile(filePath) {
        if (!this.targetWindow) return;

        try {
            // 使用 access 检查文件是否存在
            await fsPromises.access(filePath, fs.constants.F_OK);

            // 异步读取内容
            const content = await fsPromises.readFile(filePath, 'utf-8');

            // 发送 'file-opened' 事件
            this.targetWindow.webContents.send('file-opened', {
                path: filePath,
                content: content
            });
        } catch (error) {
            console.error('[FileService] 打开文件错误:', error);
            // 仅在文件确实无法访问时报错，忽略 access 的错误如果是有意为之
            dialog.showErrorBox('打开失败', `无法打开文件: ${error.message}`);
        }
    }

    /**
     * [异步] 在指定目录创建新的 Markdown 文件
     * @param {string} directoryPath - 目标目录
     */
    async createMarkdownFile(directoryPath) {
        if (!this.targetWindow) return;

        try {
            let fileName = '新建文档.md';
            let filePath = path.join(directoryPath, fileName);
            let counter = 1;

            // 异步检查文件是否存在，避免阻塞
            // 辅助函数：检查文件是否存在
            const fileExists = async (path) => {
                try {
                    await fsPromises.access(path, fs.constants.F_OK);
                    return true;
                } catch {
                    return false;
                }
            };

            while (await fileExists(filePath)) {
                fileName = `新建文档 (${counter}).md`;
                filePath = path.join(directoryPath, fileName);
                counter++;
            }

            // 异步写入空文件
            await fsPromises.writeFile(filePath, '', 'utf-8');

            this.targetWindow.webContents.send('file-opened', {
                path: filePath,
                content: ''
            });

            this.targetWindow.focus();

        } catch (error) {
            console.error('[FileService] 创建文件错误:', error);
            dialog.showErrorBox('创建失败', `无法创建文件: ${error.message}`);
        }
    }

    /**
     * [异步] 从 TXT 导入
     */
    async importTextFile() {
        if (!this.targetWindow) return;

        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(this.targetWindow, {
                title: '导入文本文件',
                filters: [{ name: '文本文件', extensions: ['txt'] }],
                properties: ['openFile']
            });

            if (canceled || filePaths.length === 0) return;

            const filePath = filePaths[0];
            const content = await this.readFileContent(filePath);

            if (content === null) {
                dialog.showErrorBox('导入失败', '无法读取文件内容或编码不支持');
                return;
            }

            this.targetWindow.webContents.send('file-imported', {
                content,
                sourcePath: filePath
            });

        } catch (error) {
            console.error('[FileService] TXT 导入错误:', error);
            dialog.showErrorBox('导入错误', error.message);
        }
    }

    /**
     * [异步] 从 Word (.docx) 导入
     */
    async importWordDoc() {
        if (!this.targetWindow) return;

        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(this.targetWindow, {
                title: '导入 Word 文档',
                filters: [{ name: 'Word 文档', extensions: ['docx'] }],
                properties: ['openFile']
            });

            if (canceled || filePaths.length === 0) return;

            const filePath = filePaths[0];
            // 异步读取 buffer
            const buffer = await fsPromises.readFile(filePath);
            const result = await mammoth.convertToMarkdown({ buffer });

            if (result.messages && result.messages.length > 0) {
                console.warn('[FileService] Word 转换警告:', result.messages);
            }

            this.targetWindow.webContents.send('file-imported', {
                content: result.value,
                sourcePath: filePath
            });

        } catch (error) {
            console.error('[FileService] Word 导入错误:', error);
            dialog.showErrorBox('导入错误', error.message);
        }
    }

    /**
     * 配置 Turndown 服务 (HTML -> Markdown)
     * @private
     */
    _createTurndownService() {
        const service = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '*',
            strongDelimiter: '**',
            linkStyle: 'inlined',
            linkReferenceStyle: 'full'
        });

        service.addRule('strikethrough', {
            filter: ['del', 's', 'strike'],
            replacement: content => `~~${content}~~`
        });

        service.addRule('underline', {
            filter: 'u',
            replacement: content => `<u>${content}</u>`
        });

        return service;
    }

    /**
     * [异步] 从 HTML 导入
     */
    async importHtmlFile() {
        if (!this.targetWindow) return;

        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(this.targetWindow, {
                title: '导入 HTML 文件',
                filters: [{ name: 'HTML 文件', extensions: ['html', 'htm'] }],
                properties: ['openFile']
            });

            if (canceled || filePaths.length === 0) return;

            const filePath = filePaths[0];
            const htmlContent = await this.readFileContent(filePath);

            if (!htmlContent) {
                dialog.showErrorBox('导入失败', '无法读取 HTML 文件');
                return;
            }

            const turndownService = this._createTurndownService();
            const markdownContent = turndownService.turndown(htmlContent);

            this.targetWindow.webContents.send('file-imported', {
                content: markdownContent,
                sourcePath: filePath
            });

        } catch (error) {
            console.error('[FileService] HTML 导入错误:', error);
            dialog.showErrorBox('导入错误', error.message);
        }
    }
}

module.exports = FileService;
