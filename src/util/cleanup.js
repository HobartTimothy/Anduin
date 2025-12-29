/**
 * 清理工具模块
 * 用于管理事件监听器和定时器的清理,防止内存泄漏
 */

class CleanupManager {
    constructor() {
        this.listeners = [];
        this.timers = [];
        this.intervals = [];
    }

    /**
     * 添加事件监听器并记录以便清理
     * @param {EventTarget} target - 事件目标
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 事件选项
     */
    addEventListener(target, event, handler, options = null) {
        target.addEventListener(event, handler, options);
        this.listeners.push({target, event, handler, options});
    }

    /**
     * 添加 IPC 监听器并记录以便清理
     * @param {Object} ipcRenderer - IPC 渲染进程对象
     * @param {string} channel - 通道名称
     * @param {Function} handler - 处理函数
     */
    addIpcListener(ipcRenderer, channel, handler) {
        ipcRenderer.on(channel, handler);
        this.listeners.push({
            target: ipcRenderer,
            event: channel,
            handler,
            isIpc: true
        });
    }

    /**
     * 添加定时器并记录以便清理
     * @param {Function} handler - 定时器处理函数
     * @param {number} delay - 延迟时间
     * @returns {number} 定时器ID
     */
    setTimeout(handler, delay) {
        const timerId = setTimeout(handler, delay);
        this.timers.push(timerId);
        return timerId;
    }

    /**
     * 添加间隔定时器并记录以便清理
     * @param {Function} handler - 处理函数
     * @param {number} interval - 间隔时间
     * @returns {number} 定时器ID
     */
    setInterval(handler, interval) {
        const intervalId = setInterval(handler, interval);
        this.intervals.push(intervalId);
        return intervalId;
    }

    /**
     * 清除指定的定时器
     * @param {number} timerId - 定时器ID
     */
    clearTimeout(timerId) {
        clearTimeout(timerId);
        const index = this.timers.indexOf(timerId);
        if (index > -1) {
            this.timers.splice(index, 1);
        }
    }

    /**
     * 清除指定的间隔定时器
     * @param {number} intervalId - 间隔定时器ID
     */
    clearInterval(intervalId) {
        clearInterval(intervalId);
        const index = this.intervals.indexOf(intervalId);
        if (index > -1) {
            this.intervals.splice(index, 1);
        }
    }

    /**
     * 移除指定的事件监听器
     * @param {EventTarget} target - 事件目标
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    removeEventListener(target, event, handler) {
        target.removeEventListener(event, handler);
        const index = this.listeners.findIndex(
            l => l.target === target && l.event === event && l.handler === handler
        );
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 清理所有注册的监听器和定时器
     */
    cleanupAll() {
        // 清理事件监听器
        this.listeners.forEach(({target, event, handler, isIpc}) => {
            try {
                if (isIpc) {
                    // IPC 监听器使用 removeListener 或 off
                    if (typeof target.removeListener === 'function') {
                        target.removeListener(event, handler);
                    } else if (typeof target.off === 'function') {
                        target.off(event, handler);
                    }
                } else {
                    target.removeEventListener(event, handler);
                }
            } catch (error) {
                console.error('清理事件监听器失败:', error);
            }
        });
        this.listeners = [];

        // 清理定时器
        this.timers.forEach(timerId => {
            try {
                clearTimeout(timerId);
            } catch (error) {
                console.error('清理定时器失败:', error);
            }
        });
        this.timers = [];

        // 清理间隔定时器
        this.intervals.forEach(intervalId => {
            try {
                clearInterval(intervalId);
            } catch (error) {
                console.error('清理间隔定时器失败:', error);
            }
        });
        this.intervals = [];
    }

    /**
     * 获取当前注册的监听器数量
     * @returns {number} 监听器数量
     */
    getListenerCount() {
        return this.listeners.length;
    }

    /**
     * 获取当前活动的定时器数量
     * @returns {number} 定时器数量
     */
    getTimerCount() {
        return this.timers.length + this.intervals.length;
    }
}

// 创建全局实例
const cleanupManager = new CleanupManager();

// 在窗口卸载时自动清理(虽然Electron应用通常不会卸载渲染进程)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupManager.cleanupAll();
    });
}

module.exports = {
    CleanupManager,
    cleanupManager
};

