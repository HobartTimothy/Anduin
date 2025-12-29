/**
 * i18n UI 更新工具模块
 * 提供统一的界面文本国际化更新功能
 */

const i18n = require('./i18n');

/**
 * 更新页面中所有带有 i18n 属性的元素
 * 支持多种属性类型：文本内容、placeholder、aria-label、title 等
 * @param {Document} document - DOM 文档对象，默认使用全局 document
 */
function updateUI(document = globalThis.document) {
    if (!document || !i18n || !i18n.t) {
        console.warn('Document or i18n not available');
        return;
    }

    // 1. 更新文本内容 (data-i18n)
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (!key) return;

        const translation = i18n.t(key);
        if (translation && translation !== key) {
            // 对于 input、textarea、button 等，更新 value 或 textContent
            if (element.tagName === 'INPUT' && element.type !== 'text') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        }
    });

    // 2. 更新 placeholder (data-i18n-placeholder)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (!key) return;

        const translation = i18n.t(key);
        if (translation && translation !== key) {
            element.placeholder = translation;
        }
    });

    // 3. 更新 aria-label (data-i18n-aria-label)
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria-label');
        if (!key) return;

        const translation = i18n.t(key);
        if (translation && translation !== key) {
            element.setAttribute('aria-label', translation);
        }
    });

    // 4. 更新 title 属性 (data-i18n-title)
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        if (!key) return;

        const translation = i18n.t(key);
        if (translation && translation !== key) {
            element.setAttribute('title', translation);
        }
    });

    // 5. 更新 select option 选项
    document.querySelectorAll('select').forEach(select => {
        Array.from(select.options).forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (!key) return;

            const translation = i18n.t(key);
            if (translation && translation !== key) {
                option.textContent = translation;
            }
        });
    });

    // 6. 更新页面标题 (title 标签)
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        const key = titleElement.getAttribute('data-i18n');
        if (key) {
            const translation = i18n.t(key);
            if (translation && translation !== key) {
                document.title = translation;
            }
        }
    }

    // 7. 更新 HTML lang 属性
    updateHtmlLang(document);
}

/**
 * 更新 HTML 元素的 lang 属性
 * @param {Document} document - DOM 文档对象
 */
function updateHtmlLang(document = globalThis.document) {
    if (!document) return;

    const locale = i18n.currentLocale();
    const htmlElement = document.documentElement;
    
    if (htmlElement && locale) {
        htmlElement.setAttribute('lang', locale);
    }
}

/**
 * 批量翻译多个键
 * @param {string[]} keys - 翻译键数组
 * @returns {Object} 键值对对象
 */
function translateBatch(keys) {
    const result = {};
    keys.forEach(key => {
        result[key] = i18n.t(key);
    });
    return result;
}

/**
 * 带参数的翻译
 * @param {string} key - 翻译键
 * @param {Object} params - 参数对象
 * @returns {string} 翻译后的文本
 */
function t(key, params) {
    return i18n.t(key, params);
}

/**
 * 获取当前语言代码
 * @returns {string} 语言代码
 */
function currentLocale() {
    return i18n.currentLocale();
}

/**
 * 切换语言
 * @param {string} locale - 新的语言代码
 * @param {Document} document - DOM 文档对象
 * @returns {boolean} 是否切换成功
 */
function setLocale(locale, document = globalThis.document) {
    const success = i18n.setLocale(locale);
    if (success && document) {
        updateUI(document);
    }
    return success;
}

module.exports = {
    updateUI,
    updateHtmlLang,
    translateBatch,
    t,
    currentLocale,
    setLocale
};

