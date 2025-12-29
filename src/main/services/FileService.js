/**
 * src/main/services/FileService.js
 * (原 src/util/fileUtils.js)
 * 文件服务类
 * 负责主进程中的所有文件 I/O 操作、导入导出及文件创建逻辑
 */

const fs = require('fs');
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
     * 更新目标窗口引用 (当窗口重建时使用)
     * @param {Electron.BrowserWindow} window 
     */
    setTargetWindow(window) {
        this.targetWindow = window;
    }

    /**
     * 读取文件内容，自动尝试 UTF-8 和 Latin1 编码
     * @param {string} filePath - 文件路径
     * @returns {string|null} 文件内容
     */
    readFileContent(filePath) {
        const supportedEncodings = ['utf-8', 'latin1'];
        
        for (const encoding of supportedEncodings) {
            try {
                return fs.readFileSync(filePath, encoding);
            } catch (error) {
                if (encoding === supportedEncodings[supportedEncodings.length - 1]) {
                    console.error(`[FileService] 读取失败，已尝试编码: ${supportedEncodings.join(', ')}`, error.message);
                }
            }
        }
        return null;
    }

    /**
     * 打开文件并将内容发送到渲染进程
     * @param {string} filePath 
     */
    openFile(filePath) {
        if (!this.targetWindow) return;

        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // 发送 'file-opened' 事件
                this.targetWindow.webContents.send('file-opened', {
                    path: filePath,
                    content: content
                });
            }
        } catch (error) {
            console.error('[FileService] 打开文件错误:', error);
            dialog.showErrorBox('打开失败', `无法打开文件: ${error.message}`);
        }
    }

    /**
     * 在指定目录创建新的 Markdown 文件
     * @param {string} directoryPath - 目标目录
     */
    createMarkdownFile(directoryPath) {
        if (!this.targetWindow) return;

        try {
            let fileName = '新建文档.md';
            let filePath = path.join(directoryPath, fileName);
            let counter = 1;

            // 避免文件名冲突
            while (fs.existsSync(filePath)) {
                fileName = `新建文档 (${counter}).md`;
                filePath = path.join(directoryPath, fileName);
                counter++;
            }

            fs.writeFileSync(filePath, '', 'utf-8');

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
     * 从 TXT 导入
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
            const content = this.readFileContent(filePath);

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
     * 从 Word (.docx) 导入
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
            const buffer = fs.readFileSync(filePath);
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
     * 从 HTML 导入
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
            const htmlContent = this.readFileContent(filePath);

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

