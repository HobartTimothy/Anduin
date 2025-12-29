/**
 * 防抖工具函数
 * 用于限制函数的执行频率
 */

/**
 * 创建一个防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay) {
    let timer = null;
    
    return function debounced(...args) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, delay);
    };
}

/**
 * 创建一个可控制的防抖器
 * 返回包含执行和取消方法的对象
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Object} 包含 execute 和 cancel 方法的对象
 */
function createDebouncer(fn, delay) {
    let timer = null;
    
    return {
        execute(...args) {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        },
        cancel() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        },
        executeImmediate(...args) {
            this.cancel();
            fn.apply(this, args);
        }
    };
}

module.exports = {
    debounce,
    createDebouncer
};

