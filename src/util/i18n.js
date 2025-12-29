const path = require('path');
const electron = require('electron');
const fs = require('fs');

class I18n {
    constructor() {
        this.app = electron.app || electron.remote?.app;
        this.userDataPath = this.app ? this.app.getPath('userData') : path.join(require('os').homedir(), '.anduin');
        this.configPath = path.join(this.userDataPath, 'user-language-config.json');
        this.loadedLanguage = null;
        this.locale = null;
        
        // 初始化语言
        this.init();
    }

    init() {
        // 1. 尝试从本地配置文件读取
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                this.locale = config.language;
            }
        } catch (e) {
            console.error('Error reading language config', e);
        }

        // 2. 如果没有配置，默认使用英文（或者检测系统语言）
        if (!this.locale) {
            this.locale = 'en';
        }

        this.loadLanguage(this.locale);
    }

    loadLanguage(locale) {
        this.locale = locale;
        try {
            // 动态引入对应的语言包
            // 注意：根据你的打包方式，路径可能需要调整，这里假设在 src/locales 下
            const localePath = path.join(__dirname, '..', 'locales', `${locale}.js`);
            this.loadedLanguage = require(localePath);
        } catch (e) {
            // 如果加载失败，回退到英文
            console.error(`Could not load locale: ${locale}`, e);
            try {
                const enPath = path.join(__dirname, '..', 'locales', 'en.js');
                this.loadedLanguage = require(enPath);
                this.locale = 'en';
            } catch (e2) {
                console.error('Could not load fallback locale (en)', e2);
                this.loadedLanguage = {};
            }
        }
    }

    // 获取翻译文本的核心函数
    t(key) {
        if (!this.loadedLanguage) return key;
        return this.loadedLanguage[key] || key;
    }

    // 切换语言并保存
    setLocale(locale) {
        if (this.locale !== locale) {
            this.loadLanguage(locale);
            try {
                // 确保目录存在
                if (!fs.existsSync(this.userDataPath)) {
                    fs.mkdirSync(this.userDataPath, { recursive: true });
                }
                fs.writeFileSync(this.configPath, JSON.stringify({ language: locale }, null, 2), 'utf-8');
            } catch (e) {
                console.error('Error saving language config', e);
            }
        }
    }
    
    // 获取当前语言代码
    currentLocale() {
        return this.locale;
    }
}

// 单例模式
module.exports = new I18n();

