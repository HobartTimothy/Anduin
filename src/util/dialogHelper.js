/**
 * 对话框辅助工具
 * 提供统一的输入对话框和确认对话框
 */

/**
 * 显示输入对话框（替代 window.prompt）
 * @param {string} message - 提示信息
 * @param {string} defaultValue - 默认值
 * @param {HTMLElement} focusTarget - 对话框关闭后要聚焦的元素
 * @returns {Promise<string|null>} 用户输入的值，如果取消则返回 null
 */
function showInputDialog(message, defaultValue = '', focusTarget = null) {
    return new Promise((resolve) => {
        // 保存当前活动元素，以便对话框关闭后恢复焦点
        const previousActiveElement = document.activeElement;

        // 创建模态遮罩层
        const overlay = createOverlay();
        
        // 创建对话框
        const dialog = createDialog();
        
        // 创建消息标签
        const label = createLabel(message);
        
        // 创建输入框
        const input = createInput(defaultValue);
        
        // 创建按钮容器
        const buttonContainer = createButtonContainer();
        
        // 创建按钮
        const okButton = createButton('确定', '#007acc', '#005a9e');
        const cancelButton = createButton('取消', '#f0f0f0', '#e0e0e0', '#333', '1px solid #ddd');
        
        // 组装对话框
        buttonContainer.appendChild(okButton);
        buttonContainer.appendChild(cancelButton);
        dialog.appendChild(label);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 聚焦输入框并选中默认值
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);

        // 恢复焦点的辅助函数
        const restoreFocus = () => {
            setTimeout(() => {
                if (focusTarget) {
                    focusTarget.focus();
                } else if (previousActiveElement) {
                    previousActiveElement.focus();
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
 * 创建遮罩层
 * @returns {HTMLElement} 遮罩层元素
 */
function createOverlay() {
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
    return overlay;
}

/**
 * 创建对话框容器
 * @returns {HTMLElement} 对话框元素
 */
function createDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        min-width: 300px;
        max-width: 500px;
    `;
    return dialog;
}

/**
 * 创建标签
 * @param {string} text - 标签文本
 * @returns {HTMLElement} 标签元素
 */
function createLabel(text) {
    const label = document.createElement('label');
    label.textContent = text;
    label.style.cssText = `
        display: block;
        margin-bottom: 10px;
        font-size: 14px;
        color: #333;
    `;
    return label;
}

/**
 * 创建输入框
 * @param {string} defaultValue - 默认值
 * @returns {HTMLInputElement} 输入框元素
 */
function createInput(defaultValue) {
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
    return input;
}

/**
 * 创建按钮容器
 * @returns {HTMLElement} 按钮容器元素
 */
function createButtonContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    `;
    return container;
}

/**
 * 创建按钮
 * @param {string} text - 按钮文本
 * @param {string} bgColor - 背景颜色
 * @param {string} hoverColor - 悬停颜色
 * @param {string} textColor - 文本颜色
 * @param {string} border - 边框样式
 * @returns {HTMLButtonElement} 按钮元素
 */
function createButton(text, bgColor, hoverColor, textColor = 'white', border = 'none') {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        padding: 6px 16px;
        background: ${bgColor};
        color: ${textColor};
        border: ${border};
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    button.onmouseover = () => button.style.background = hoverColor;
    button.onmouseout = () => button.style.background = bgColor;
    return button;
}

module.exports = {
    showInputDialog
};

