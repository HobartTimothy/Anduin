/**
 * 菜单模板配置
 * 定义应用程序的所有菜单项和快捷键
 */

/**
 * 创建菜单模板
 * @param {Function} sendToRenderer - 向渲染进程发送消息的函数
 * @param {Object} fileUtils - 文件工具类实例
 * @param {Object} mainWindow - 主窗口实例
 * @param {Function} createPreferencesWindow - 创建偏好设置窗口的函数
 * @returns {Array} 菜单模板数组
 */
function createMenuTemplate(sendToRenderer, fileUtils, mainWindow, createPreferencesWindow) {
    return [
        {
            label: '文件(F)',
            submenu: [
                {label: '新建', accelerator: 'Ctrl+N', click: () => sendToRenderer('file-new')},
                {label: '新建窗口', accelerator: 'Ctrl+Shift+N', click: () => sendToRenderer('file-new-window')},
                {type: 'separator'},
                {label: '打开...', accelerator: 'Ctrl+O', click: () => sendToRenderer('file-open')},
                {label: '打开文件夹...', click: () => sendToRenderer('file-open-folder')},
                {type: 'separator'},
                {label: '快速打开...', accelerator: 'Ctrl+P', click: () => sendToRenderer('file-quick-open')},
                {
                    label: '打开最近文件',
                    submenu: [
                        {label: '（暂无最近文件）', enabled: false}
                    ]
                },
                {type: 'separator'},
                {label: '保存', accelerator: 'Ctrl+S', click: () => sendToRenderer('file-save')},
                {label: '另存为...', accelerator: 'Ctrl+Shift+S', click: () => sendToRenderer('file-save-as')},
                {label: '移动到...', click: () => sendToRenderer('file-move-to')},
                {label: '保存全部打开的文件...', click: () => sendToRenderer('file-save-all')},
                {type: 'separator'},
                {label: '属性...', click: () => sendToRenderer('file-properties')},
                {label: '打开文件位置...', click: () => sendToRenderer('file-open-location')},
                {label: '在侧边栏中显示', click: () => sendToRenderer('file-show-sidebar')},
                {label: '删除...', click: () => sendToRenderer('file-delete')},
                {type: 'separator'},
                {
                    label: '导入...',
                    submenu: [
                        {label: '从txt中导入...', click: () => fileUtils.importFromFile()},
                        {label: '从 Word 导入...', click: () => fileUtils.importFromWord()},
                        {label: '从 HTML 导入...', click: () => fileUtils.importFromHTML()}
                    ]
                },
                {
                    label: '导出',
                    submenu: [
                        {label: 'PDF', click: () => sendToRenderer('file-export-pdf')},
                        {label: 'HTML', click: () => sendToRenderer('file-export-html')},
                        {label: 'HTML (without styles)', click: () => sendToRenderer('file-export-html-plain')},
                        {label: '图像', click: () => sendToRenderer('file-export-image')},
                        {type: 'separator'},
                        {label: 'Word (.docx)', click: () => sendToRenderer('file-export-docx')},
                        {label: 'OpenOffice', click: () => sendToRenderer('file-export-odt')},
                        {label: 'RTF', click: () => sendToRenderer('file-export-rtf')},
                        {label: 'Epub', click: () => sendToRenderer('file-export-epub')},
                        {label: 'LaTeX', click: () => sendToRenderer('file-export-latex')},
                        {label: 'Media Wiki', click: () => sendToRenderer('file-export-mediawiki')},
                        {label: 'reStructuredText', click: () => sendToRenderer('file-export-rst')},
                        {label: 'Textile', click: () => sendToRenderer('file-export-textile')},
                        {label: 'OPML', click: () => sendToRenderer('file-export-opml')},
                        {type: 'separator'},
                        {
                            label: '使用上一次设置导出',
                            accelerator: 'Ctrl+Shift+E',
                            click: () => sendToRenderer('file-export-last')
                        },
                        {label: '导出并覆盖上一次导出的文件', click: () => sendToRenderer('file-export-overwrite')},
                        {label: '导出设置...', click: () => sendToRenderer('file-export-settings')}
                    ]
                },
                {label: '打印...', accelerator: 'Alt+Shift+P', click: () => sendToRenderer('file-print')},
                {type: 'separator'},
                {label: '偏好设置...', accelerator: 'Ctrl+,', click: () => createPreferencesWindow()},
                {type: 'separator'},
                {label: '关闭', accelerator: 'Ctrl+W', click: () => sendToRenderer('file-close')}
            ]
        },
        {
            label: '编辑(E)',
            submenu: [
                {role: 'undo', label: '撤销', accelerator: 'Ctrl+Z'},
                {role: 'redo', label: '重做', accelerator: 'Ctrl+Y'},
                {type: 'separator'},
                {role: 'cut', label: '剪切', accelerator: 'Ctrl+X'},
                {role: 'copy', label: '复制', accelerator: 'Ctrl+C'},
                {label: '拷贝图片', click: () => sendToRenderer('edit-copy-image')},
                {role: 'paste', label: '粘贴', accelerator: 'Ctrl+V'},
                {type: 'separator'},
                {label: '复制为纯文本', click: () => sendToRenderer('edit-copy-plain')},
                {label: '复制为 Markdown', accelerator: 'Ctrl+Shift+C', click: () => sendToRenderer('edit-copy-md')},
                {label: '复制为 HTML 代码', click: () => sendToRenderer('edit-copy-html')},
                {label: '复制内容并保留格式', click: () => sendToRenderer('edit-copy-rich')},
                {type: 'separator'},
                {label: '粘贴为纯文本', accelerator: 'Ctrl+Shift+V', click: () => sendToRenderer('edit-paste-plain')},
                {type: 'separator'},
                {
                    label: '选择',
                    submenu: [{role: 'selectAll', label: '全选'}]
                },
                {label: '上移表行', accelerator: 'Alt+Up', click: () => sendToRenderer('edit-move-row-up')},
                {label: '下移表行', accelerator: 'Alt+Down', click: () => sendToRenderer('edit-move-row-down')},
                {type: 'separator'},
                {label: '删除', click: () => sendToRenderer('edit-delete')},
                {
                    label: '删除范围',
                    submenu: [
                        {label: '删除本段', click: () => sendToRenderer('edit-delete-range-paragraph')},
                        {label: '删除本行', click: () => sendToRenderer('edit-delete-range-line')}
                    ]
                },
                {type: 'separator'},
                {
                    label: '数学工具',
                    submenu: [{label: '公式块', click: () => sendToRenderer('edit-math-block')}]
                },
                {type: 'separator'},
                {
                    label: '智能标点',
                    type: 'checkbox',
                    checked: false,
                    click: () => sendToRenderer('edit-smart-punctuation')
                },
                {
                    label: '换行符',
                    submenu: [
                        {label: '转换为 \\n', click: () => sendToRenderer('edit-newline-n')},
                        {label: '转换为 \\r\\n', click: () => sendToRenderer('edit-newline-rn')}
                    ]
                },
                {label: '空格与换行', click: () => sendToRenderer('edit-spaces-newlines')},
                {label: '拼写检查...', click: () => sendToRenderer('edit-spellcheck')},
                {type: 'separator'},
                {
                    label: '查找和替换',
                    submenu: [
                        {label: '查找', accelerator: 'Ctrl+F', click: () => sendToRenderer('edit-find')},
                        {label: '查找下一个', accelerator: 'F3', click: () => sendToRenderer('edit-find-next')},
                        {label: '替换', accelerator: 'Ctrl+H', click: () => sendToRenderer('edit-replace')}
                    ]
                },
                {label: '表情与符号', accelerator: 'Super+.', click: () => sendToRenderer('edit-emoji')}
            ]
        },
        {
            label: '段落(P)',
            submenu: [
                {
                    label: '一级标题',
                    accelerator: 'Ctrl+1',
                    click: () => sendToRenderer('toggle-heading-1')
                },
                {
                    label: '二级标题',
                    accelerator: 'Ctrl+2',
                    click: () => sendToRenderer('toggle-heading-2')
                },
                {
                    label: '三级标题',
                    accelerator: 'Ctrl+3',
                    click: () => sendToRenderer('toggle-heading-3')
                },
                {
                    label: '四级标题',
                    accelerator: 'Ctrl+4',
                    click: () => sendToRenderer('toggle-heading-4')
                },
                {
                    label: '五级标题',
                    accelerator: 'Ctrl+5',
                    click: () => sendToRenderer('toggle-heading-5')
                },
                {
                    label: '六级标题',
                    accelerator: 'Ctrl+6',
                    click: () => sendToRenderer('toggle-heading-6')
                },
                {type: 'separator'},
                {
                    label: '段落',
                    accelerator: 'Ctrl+0',
                    click: () => sendToRenderer('toggle-paragraph')
                },
                {
                    label: '提升标题级别',
                    accelerator: 'Ctrl+=',
                    click: () => sendToRenderer('heading-promote')
                },
                {
                    label: '降低标题级别',
                    accelerator: 'Ctrl+-',
                    click: () => sendToRenderer('heading-demote')
                },
                {type: 'separator'},
                {
                    label: '有序列表',
                    accelerator: 'Ctrl+Shift+[',
                    click: () => sendToRenderer('toggle-ol')
                },
                {
                    label: '无序列表',
                    accelerator: 'Ctrl+Shift+]',
                    click: () => sendToRenderer('toggle-ul')
                },
                {
                    label: '任务列表',
                    accelerator: 'Ctrl+Shift+X',
                    click: () => sendToRenderer('toggle-task-list')
                },
                {type: 'separator'},
                {
                    label: '表格',
                    click: () => sendToRenderer('paragraph-insert-table')
                },
                {
                    label: '公式块',
                    accelerator: 'Ctrl+Shift+M',
                    click: () => sendToRenderer('paragraph-math-block')
                },
                {
                    label: '代码块',
                    accelerator: 'Ctrl+Shift+K',
                    click: () => sendToRenderer('insert-code-block')
                },
                {
                    label: '代码工具',
                    submenu: [
                        {label: '运行代码（占位）', click: () => sendToRenderer('paragraph-code-tools-run')}
                    ]
                },
                {type: 'separator'},
                {
                    label: '引用',
                    accelerator: 'Ctrl+Shift+Q',
                    click: () => sendToRenderer('paragraph-toggle-quote')
                },
                {type: 'separator'},
                {
                    label: '任务状态',
                    submenu: [
                        {label: '切换完成状态', click: () => sendToRenderer('paragraph-task-toggle-state')}
                    ]
                },
                {
                    label: '列表缩进',
                    submenu: [
                        {label: '增加缩进', click: () => sendToRenderer('paragraph-list-indent')},
                        {label: '减少缩进', click: () => sendToRenderer('paragraph-list-outdent')}
                    ]
                },
                {type: 'separator'},
                {
                    label: '在上方插入段落',
                    click: () => sendToRenderer('paragraph-insert-above')
                },
                {
                    label: '在下方插入段落',
                    click: () => sendToRenderer('paragraph-insert-below')
                },
                {type: 'separator'},
                {
                    label: '链接引用',
                    click: () => sendToRenderer('paragraph-link-ref')
                },
                {
                    label: '脚注',
                    click: () => sendToRenderer('paragraph-footnote')
                },
                {type: 'separator'},
                {
                    label: '水平分割线',
                    click: () => sendToRenderer('paragraph-hr')
                },
                {
                    label: '内容目录',
                    click: () => sendToRenderer('paragraph-toc')
                },
                {
                    label: 'YAML Front Matter',
                    click: () => sendToRenderer('paragraph-yaml-front-matter')
                }
            ]
        },
        {
            label: '格式(O)',
            submenu: [
                {label: '加粗', accelerator: 'Ctrl+B', click: () => sendToRenderer('toggle-bold')},
                {label: '斜体', accelerator: 'Ctrl+I', click: () => sendToRenderer('toggle-italic')},
                {label: '下划线', accelerator: 'Ctrl+U', click: () => sendToRenderer('toggle-underline')},
                {
                    label: '代码',
                    accelerator: 'Ctrl+Shift+`',
                    click: () => sendToRenderer('toggle-inline-code')
                },
                {
                    label: '删除线',
                    accelerator: 'Alt+Shift+5',
                    click: () => sendToRenderer('format-strike')
                },
                {
                    label: '注释',
                    click: () => sendToRenderer('format-comment')
                },
                {type: 'separator'},
                {
                    label: '超链接',
                    accelerator: 'Ctrl+K',
                    click: () => sendToRenderer('format-link')
                },
                {
                    label: '链接操作',
                    submenu: [
                        {label: '编辑链接', click: () => sendToRenderer('format-link-edit')},
                        {label: '移除链接', click: () => sendToRenderer('format-link-remove')}
                    ]
                },
                {
                    label: '图像',
                    submenu: [
                        {label: '插入图片', click: () => sendToRenderer('format-image-insert')},
                        {label: '编辑图片', click: () => sendToRenderer('format-image-edit')}
                    ]
                },
                {type: 'separator'},
                {
                    label: '清除样式',
                    accelerator: 'Ctrl+\\',
                    click: () => sendToRenderer('format-clear-style')
                }
            ]
        },
        {
            label: '视图(V)',
            submenu: [
                {
                    label: '编辑模式',
                    submenu: [
                        {
                            label: '对比模式',
                            type: 'radio',
                            checked: true,
                            click: () => sendToRenderer('view-mode-split')
                        },
                        {
                            label: '源代码模式',
                            type: 'radio',
                            accelerator: 'Ctrl+/',
                            click: () => sendToRenderer('toggle-source-mode')
                        },
                        {
                            label: '结果模式',
                            type: 'radio',
                            click: () => sendToRenderer('toggle-result-mode')
                        }
                    ]
                },
                {type: 'separator'},
                {
                    label: '显示 / 隐藏侧边栏',
                    accelerator: 'Ctrl+Shift+L',
                    click: () => sendToRenderer('view-toggle-sidebar')
                },
                {
                    label: '大纲',
                    accelerator: 'Ctrl+Shift+1',
                    click: () => sendToRenderer('view-outline')
                },
                {
                    label: '文档列表',
                    accelerator: 'Ctrl+Shift+2',
                    click: () => sendToRenderer('view-documents')
                },
                {
                    label: '文件树',
                    accelerator: 'Ctrl+Shift+3',
                    click: () => sendToRenderer('view-file-tree')
                },
                {
                    label: '窗格',
                    accelerator: 'Ctrl+Shift+F',
                    click: () => sendToRenderer('view-pane')
                },
                {type: 'separator'},
                {
                    label: '专注模式',
                    accelerator: 'F8',
                    click: () => sendToRenderer('view-focus-mode')
                },
                {
                    label: '打字机模式',
                    accelerator: 'F9',
                    click: () => sendToRenderer('view-typewriter-mode')
                },
                {type: 'separator'},
                {
                    label: '显示状态栏',
                    type: 'checkbox',
                    checked: true,
                    click: () => sendToRenderer('view-toggle-statusbar')
                },
                {
                    label: '字数统计窗口',
                    click: () => sendToRenderer('view-word-count')
                },
                {type: 'separator'},
                {
                    label: '切换全屏',
                    role: 'togglefullscreen',
                    accelerator: 'F11'
                },
                {
                    label: '保持窗口在最前端',
                    type: 'checkbox',
                    click: (menuItem) => {
                        if (mainWindow) {
                            mainWindow.setAlwaysOnTop(menuItem.checked);
                        }
                    }
                },
                {type: 'separator'},
                {role: 'resetZoom', label: '实际大小', accelerator: 'Ctrl+Shift+9'},
                {role: 'zoomIn', label: '放大', accelerator: 'Ctrl+Shift+='},
                {role: 'zoomOut', label: '缩小', accelerator: 'Ctrl+Shift+-'},
                {type: 'separator'},
                {
                    label: '应用内窗口切换',
                    accelerator: 'Ctrl+Tab',
                    click: () => sendToRenderer('view-switch-window')
                },
                {role: 'reload', label: '重新加载'},
                {role: 'toggleDevTools', label: '开发者工具', accelerator: 'Shift+F12'}
            ]
        },
        {
            label: '主题(T)',
            submenu: [
                {label: '选择主题...', click: () => sendToRenderer('theme-show-menu')},
                {type: 'separator'},
                {label: 'Github', type: 'radio', checked: true, click: () => sendToRenderer('theme-github')},
                {label: 'Newsprint', type: 'radio', click: () => sendToRenderer('theme-newsprint')},
                {label: 'Night', type: 'radio', click: () => sendToRenderer('theme-night')},
                {label: 'Pixyll', type: 'radio', click: () => sendToRenderer('theme-pixyll')},
                {label: 'Whitey', type: 'radio', click: () => sendToRenderer('theme-whitey')}
            ]
        },
        {
            label: '帮助(H)',
            submenu: [
                {label: '更新日志', click: () => sendToRenderer('help-changelog')},
                {label: '隐私条款', click: () => sendToRenderer('help-privacy')},
                {label: '官方网站', click: () => sendToRenderer('help-website')},
                {
                    label: '反馈',
                    click: () => {
                        const {shell} = require('electron');
                        shell.openExternal('https://github.com/HobartTimothy/Anduin/issues').catch((err) => {
                            console.error('打开反馈链接失败:', err);
                        });
                    }
                },
                {type: 'separator'},
                {label: '检查更新...', click: () => sendToRenderer('help-check-updates')},
                {label: '关于', click: () => sendToRenderer('help-about')}
            ]
        }
    ];
}

module.exports = {createMenuTemplate};

