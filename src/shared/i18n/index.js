const path = require('path');
const electron = require('electron');
const fs = require('fs');

class I18n {
    constructor() {
        this.app = electron.app || electron.remote?.app;
        this.userDataPath = this.app 
            ? this.app.getPath('userData') 
            : path.join(require('os').homedir(), '.anduin');
        this.configPath = path.join(this.userDataPath, 'user-language-config.json');
        this.loadedLanguage = null;
        this.locale = null;
        this.defaultLocale = 'en';
        
        // 初始化语言
        this.init();
    }

    init() {
        // 1. 尝试从本地配置文件读取
        this.locale = this._readLocaleFromConfig();
        
        // 2. 如果没有配置，使用默认语言
        if (!this.locale) {
            this.locale = this.defaultLocale;
        }

        // 3. 加载语言包
        this.loadLanguage(this.locale);
    }
    
    /**
     * 从配置文件读取语言设置
     * @returns {string|null} 语言代码，失败返回 null
     * @private
     */
    _readLocaleFromConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                if (config.language && typeof config.language === 'string') {
                    return config.language;
                }
            }
        } catch (error) {
            console.error('读取语言配置失败:', error.message);
        }
        return null;
    }

    loadLanguage(locale) {
        this.locale = locale;
        
        // 尝试加载指定语言（更新路径：从 shared/i18n 到 locales）
        const localePath = path.join(__dirname, '..', '..', 'locales', `${locale}.js`);
        if (this._tryLoadLanguageFile(localePath)) {
            return;
        }
        
        // 加载失败，尝试加载默认语言
        console.warn(`无法加载语言包: ${locale}, 回退到默认语言: ${this.defaultLocale}`);
        const fallbackPath = path.join(__dirname, '..', '..', 'locales', `${this.defaultLocale}.js`);
        if (this._tryLoadLanguageFile(fallbackPath)) {
            this.locale = this.defaultLocale;
            return;
        }
        
        // 如果连默认语言都加载失败，使用空对象
        console.error('无法加载任何语言包，使用空对象');
        this.loadedLanguage = {};
    }
    
    /**
     * 尝试加载语言文件
     * @param {string} filePath - 语言文件路径
     * @returns {boolean} 是否加载成功
     * @private
     */
    _tryLoadLanguageFile(filePath) {
        try {
            this.loadedLanguage = require(filePath);
            return true;
        } catch (error) {
            console.error(`加载语言文件失败 (${filePath}):`, error.message);
            return false;
        }
    }

    /**
     * 获取翻译文本的核心函数
     * 支持嵌套键名（用点号分隔）和参数替换
     * @param {string} key - 翻译键名（如 'menu.file' 或 'menu.file.open'）
     * @param {Object} params - 可选的参数对象，用于替换占位符
     * @returns {string} 翻译后的文本
     */
    t(key, params = null) {
        if (!this.loadedLanguage || !key) {
            return key || '';
        }
        
        // 直接查找键
        let text = this.loadedLanguage[key];
        
        // 如果未找到且包含点号，尝试嵌套查找（未来扩展）
        if (text === undefined) {
            text = key; // 返回键名作为回退
        }
        
        // 如果提供了参数，替换占位符
        if (params && typeof text === 'string') {
            Object.keys(params).forEach(paramKey => {
                const placeholder = `{${paramKey}}`;
                text = text.replace(new RegExp(placeholder, 'g'), params[paramKey]);
            });
        }
        
        return text;
    }

    /**
     * 批量获取翻译
     * @param {string[]} keys - 翻译键名数组
     * @returns {Object} 键值对对象
     */
    tBatch(keys) {
        const result = {};
        if (!Array.isArray(keys)) {
            return result;
        }
        
        keys.forEach(key => {
            result[key] = this.t(key);
        });
        return result;
    }

    /**
     * 切换语言并保存配置
     * @param {string} locale - 语言代码
     * @returns {boolean} 是否切换成功
     */
    setLocale(locale) {
        if (this.locale === locale) {
            return true;
        }
        
        // 加载新语言
        this.loadLanguage(locale);
        
        // 保存到配置文件
        return this._saveLocaleToConfig(locale);
    }
    
    /**
     * 保存语言设置到配置文件
     * @param {string} locale - 语言代码
     * @returns {boolean} 是否保存成功
     * @private
     */
    _saveLocaleToConfig(locale) {
        try {
            // 确保目录存在
            if (!fs.existsSync(this.userDataPath)) {
                fs.mkdirSync(this.userDataPath, {recursive: true});
            }
            
            fs.writeFileSync(
                this.configPath, 
                JSON.stringify({language: locale}, null, 2), 
                'utf-8'
            );
            return true;
        } catch (error) {
            console.error('保存语言配置失败:', error.message);
            return false;
        }
    }
    
    /**
     * 获取当前语言代码
     * @returns {string} 当前语言代码
     */
    currentLocale() {
        return this.locale || this.defaultLocale;
    }
    
    /**
     * 检查语言包是否已加载
     * @returns {boolean} 是否已加载
     */
    isLoaded() {
        return this.loadedLanguage !== null && typeof this.loadedLanguage === 'object';
    }
}

// 单例模式
module.exports = new I18n();

