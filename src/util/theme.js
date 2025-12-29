const path = require('path');
const electron = require('electron');
const fs = require('fs');

class ThemeManager {
    constructor() {
        // 兼容主进程和渲染进程获取 app 对象
        this.app = electron.app || electron.remote?.app;
        this.userDataPath = this.app 
            ? this.app.getPath('userData') 
            : path.join(require('os').homedir(), '.anduin');
        this.configPath = path.join(this.userDataPath, 'user-theme-config.json');
        
        // 默认内置主题列表（使用 CSS 类名方式）
        this.defaultThemes = [
            { id: 'github', name: 'Github', css: null, className: 'github-theme' },
            { id: 'newsprint', name: 'Newsprint', css: null, className: 'newsprint-theme' },
            { id: 'night', name: 'Night', css: null, className: 'night-theme' },
            { id: 'pixyll', name: 'Pixyll', css: null, className: 'pixyll-theme' },
            { id: 'whitey', name: 'Whitey', css: null, className: 'whitey-theme' }
        ];

        this.themes = [...this.defaultThemes];
        this.currentThemeId = 'github'; // 默认主题
        
        // 主题文件存放的基础路径（用于未来支持独立 CSS 文件）
        this.themeBasePath = path.join(__dirname, '..', 'themes');

        this.init();
    }

    init() {
        this._loadConfig();
    }

    /**
     * 读取配置文件
     * @private
     */
    _loadConfig() {
        try {
            // 1. 优先从专用配置文件读取
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                
                // 恢复当前选择的主题
                if (config.currentThemeId) {
                    this.currentThemeId = config.currentThemeId;
                }

                // 恢复自定义注册的主题
                if (Array.isArray(config.customThemes)) {
                    // 合并去重
                    const existingIds = new Set(this.themes.map(t => t.id));
                    config.customThemes.forEach(theme => {
                        if (!existingIds.has(theme.id)) {
                            this.themes.push(theme);
                        }
                    });
                }
            }
            
            // 2. 如果没有专用配置，尝试从 settings.json 读取（向后兼容）
            if (this.currentThemeId === 'github' && this.app) {
                try {
                    const settingsPath = path.join(this.userDataPath, 'settings.json');
                    if (fs.existsSync(settingsPath)) {
                        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                        if (settings.theme && typeof settings.theme === 'string') {
                            // 验证主题是否存在
                            if (this.themes.find(t => t.id === settings.theme)) {
                                this.currentThemeId = settings.theme;
                                // 同步到专用配置文件
                                this._saveConfig();
                            }
                        }
                    }
                } catch (error) {
                    // 忽略 settings.json 读取错误
                }
            }
        } catch (error) {
            console.error('加载主题配置失败:', error);
        }
    }

    /**
     * 保存配置到本地
     * @private
     */
    _saveConfig() {
        try {
            const customThemes = this.themes.filter(t => 
                !this.defaultThemes.find(dt => dt.id === t.id)
            );

            const config = {
                currentThemeId: this.currentThemeId,
                customThemes: customThemes
            };

            if (!fs.existsSync(this.userDataPath)) {
                fs.mkdirSync(this.userDataPath, { recursive: true });
            }

            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('保存主题配置失败:', error);
            return false;
        }
    }

    /**
     * 获取当前主题信息
     */
    getCurrentTheme() {
        return this.themes.find(t => t.id === this.currentThemeId) || this.defaultThemes[0];
    }

    /**
     * 获取所有可用主题
     */
    getAvailableThemes() {
        return this.themes;
    }

    /**
     * 切换主题
     * @param {string} themeId - 主题 ID
     */
    setTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (theme) {
            this.currentThemeId = themeId;
            this._saveConfig();
            return true;
        }
        console.warn(`主题 ${themeId} 不存在`);
        return false;
    }

    /**
     * 动态注册新主题 (对外暴露的接口)
     * @param {string} id - 唯一 ID
     * @param {string} name - 显示名称
     * @param {string} cssFileNameOrPath - CSS 文件名（如果只有文件名）或绝对路径（用于独立 CSS 文件）
     * @param {boolean} isAbsolutePath - 第三个参数是否为绝对路径
     * @param {string} className - CSS 类名（用于类名方式，如果提供则优先使用类名）
     */
    registerTheme(id, name, cssFileNameOrPath = null, isAbsolutePath = false, className = null) {
        // 检查 ID 是否冲突
        if (this.themes.find(t => t.id === id)) {
            console.warn(`主题 ID ${id} 已存在，将被覆盖`);
            this.themes = this.themes.filter(t => t.id !== id);
        }

        const newTheme = {
            id,
            name,
            css: cssFileNameOrPath,
            isAbsolutePath,
            className: className || `${id}-theme` // 如果没有提供类名，使用默认格式
        };

        this.themes.push(newTheme);
        this._saveConfig();
        return newTheme;
    }
}

module.exports = new ThemeManager();

