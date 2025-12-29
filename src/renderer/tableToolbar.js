/**
 * 表格工具栏模块
 * 提供表格编辑工具栏功能，包括网格选择器、对齐按钮等
 */

/**
 * 创建表格工具栏
 * @returns {HTMLElement} 工具栏元素
 */
function createTableToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';
    
    // 网格选择器
    const gridSelector = createGridSelector();
    toolbar.appendChild(gridSelector);
    
    // 分隔符
    toolbar.appendChild(createSeparator());
    
    // 对齐按钮组
    const alignGroup = createAlignButtons();
    toolbar.appendChild(alignGroup);
    
    // 分隔符
    toolbar.appendChild(createSeparator());
    
    // 更多选项按钮
    const moreBtn = createMoreButton();
    toolbar.appendChild(moreBtn);
    
    // 删除按钮
    const deleteBtn = createDeleteButton();
    toolbar.appendChild(deleteBtn);
    
    return toolbar;
}

/**
 * 创建网格选择器
 * @returns {HTMLElement} 网格选择器元素
 */
function createGridSelector() {
    const container = document.createElement('div');
    container.className = 'grid-selector';
    
    const btn = document.createElement('button');
    btn.className = 'grid-selector-btn';
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1h6v6H1V1zm8 0h6v6H9V1zM1 9h6v6H1V9zm8 0h6v6H9V9z"/>
        </svg>
    `;
    
    const panel = document.createElement('div');
    panel.className = 'grid-selector-panel';
    
    // 创建网格
    const grid = document.createElement('div');
    grid.className = 'grid-selector-grid';
    
    // 创建 6x10 的网格
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 6; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-selector-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            grid.appendChild(cell);
        }
    }
    
    // 尺寸显示
    const dimensions = document.createElement('div');
    dimensions.className = 'grid-selector-dimensions';
    dimensions.textContent = '6 x 10';
    
    panel.appendChild(grid);
    panel.appendChild(dimensions);
    
    let selectedCells = [];
    let isSelecting = false;
    
    // 网格单元格交互
    grid.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('grid-selector-cell')) {
            isSelecting = true;
            selectedCells = [];
            updateGridSelection(e.target);
        }
    });
    
    grid.addEventListener('mouseover', (e) => {
        if (isSelecting && e.target.classList.contains('grid-selector-cell')) {
            updateGridSelection(e.target);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isSelecting = false;
    });
    
    function updateGridSelection(targetCell) {
        const row = parseInt(targetCell.dataset.row);
        const col = parseInt(targetCell.dataset.col);
        
        // 清除之前的选中
        grid.querySelectorAll('.grid-selector-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // 选中从 (0,0) 到 (row, col) 的区域
        for (let r = 0; r <= row; r++) {
            for (let c = 0; c <= col; c++) {
                const cell = grid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (cell) {
                    cell.classList.add('selected');
                    selectedCells.push({row: r, col: c});
                }
            }
        }
        
        // 更新尺寸显示
        dimensions.textContent = `${col + 1} x ${row + 1}`;
    }
    
    // 点击网格选择器按钮显示/隐藏面板
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('visible');
    });
    
    // 点击网格单元格时应用选择
    grid.addEventListener('click', (e) => {
        if (e.target.classList.contains('grid-selector-cell')) {
            const cols = parseInt(e.target.dataset.col) + 1;
            const rows = parseInt(e.target.dataset.row) + 1;
            // 触发插入表格事件
            const event = new CustomEvent('insert-table', {
                detail: {cols, rows}
            });
            document.dispatchEvent(event);
            panel.classList.remove('visible');
        }
    });
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            panel.classList.remove('visible');
        }
    });
    
    container.appendChild(btn);
    container.appendChild(panel);
    
    return container;
}

/**
 * 创建对齐按钮组
 * @returns {HTMLElement} 对齐按钮组元素
 */
function createAlignButtons() {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 2px;';
    
    const alignments = [
        {name: 'left', icon: 'M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h10v2h-10v-2z'},
        {name: 'center', icon: 'M1 3h14v2H1V3zm0 4h14v2H1V7zm0 4h14v2H1v-2z'},
        {name: 'right', icon: 'M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h10v2H3v-2z'}
    ];
    
    alignments.forEach(align => {
        const btn = document.createElement('button');
        btn.className = 'table-toolbar-btn';
        btn.dataset.align = align.name;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="${align.icon}"/>
            </svg>
        `;
        btn.title = align.name === 'left' ? '左对齐' : align.name === 'center' ? '居中' : '右对齐';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 移除其他按钮的 active 状态
            container.querySelectorAll('.table-toolbar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // 触发对齐事件
            const event = new CustomEvent('table-align', {
                detail: {align: align.name}
            });
            document.dispatchEvent(event);
        });
        container.appendChild(btn);
    });
    
    return container;
}

/**
 * 创建更多选项按钮
 * @returns {HTMLElement} 更多选项按钮元素
 */
function createMoreButton() {
    const btn = document.createElement('button');
    btn.className = 'table-toolbar-btn';
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="8" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="12" cy="8" r="1.5"/>
        </svg>
    `;
    btn.title = '更多选项';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 触发更多选项事件
        const event = new CustomEvent('table-more');
        document.dispatchEvent(event);
    });
    return btn;
}

/**
 * 创建删除按钮
 * @returns {HTMLElement} 删除按钮元素
 */
function createDeleteButton() {
    const btn = document.createElement('button');
    btn.className = 'table-toolbar-btn';
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
    `;
    btn.title = '删除表格';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 触发删除表格事件
        const event = new CustomEvent('table-delete');
        document.dispatchEvent(event);
    });
    return btn;
}

/**
 * 创建分隔符
 * @returns {HTMLElement} 分隔符元素
 */
function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'table-toolbar-separator';
    return separator;
}

/**
 * 显示表格工具栏
 * @param {HTMLElement} table - 表格元素
 * @param {HTMLElement} toolbar - 工具栏元素
 */
function showTableToolbar(table, toolbar) {
    const rect = table.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 计算工具栏位置（表格上方）
    toolbar.style.position = 'fixed';
    toolbar.style.top = `${rect.top + scrollTop - 45}px`;
    toolbar.style.left = `${rect.left + scrollLeft}px`;
    toolbar.classList.add('visible');
}

/**
 * 隐藏表格工具栏
 * @param {HTMLElement} toolbar - 工具栏元素
 */
function hideTableToolbar(toolbar) {
    toolbar.classList.remove('visible');
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createTableToolbar,
        showTableToolbar,
        hideTableToolbar
    };
}

