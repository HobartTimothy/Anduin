/**
 * 菜单模板配置
 * 定义应用程序的所有菜单项和快捷键
 */

const { app, Menu, BrowserWindow } = require('electron');
const i18n = require('../util/i18n');

/**
 * 切换语言的辅助函数
 * @param {string} lang - 语言代码 ('en' 或 'zh')
 * @param {Function} sendToRenderer - 向渲染进程发送消息的函数
 * @param {Object} fileUtils - 文件工具类实例
 * @param {Object} mainWindow - 主窗口实例
 * @param {Function} createPreferencesWindow - 创建偏好设置窗口的函数
 */
function changeLanguage(lang, sendToRenderer, fileUtils, mainWindow, createPreferencesWindow) {
    i18n.setLocale(lang);
    
    // 1. 重建菜单
    const menu = Menu.buildFromTemplate(createMenuTemplate(sendToRenderer, fileUtils, mainWindow, createPreferencesWindow));
    Menu.setApplicationMenu(menu);

    // 2. 通知所有窗口更新 UI (如果渲染进程也需要更新)
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('language-changed', lang);
    });
}

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
            label: i18n.t('menu.file'),
            submenu: [
                {label: i18n.t('menu.file.new'), accelerator: 'Ctrl+N', click: () => sendToRenderer('file-new')},
                {label: i18n.t('menu.file.newWindow'), accelerator: 'Ctrl+Shift+N', click: () => sendToRenderer('file-new-window')},
                {type: 'separator'},
                {label: i18n.t('menu.file.open'), accelerator: 'Ctrl+O', click: () => sendToRenderer('file-open')},
                {label: i18n.t('menu.file.openFolder'), click: () => sendToRenderer('file-open-folder')},
                {type: 'separator'},
                {label: i18n.t('menu.file.quickOpen'), accelerator: 'Ctrl+P', click: () => sendToRenderer('file-quick-open')},
                {
                    label: i18n.t('menu.file.recentFiles'),
                    submenu: [
                        {label: i18n.t('menu.file.noRecentFiles'), enabled: false}
                    ]
                },
                {type: 'separator'},
                {label: i18n.t('menu.file.save'), accelerator: 'Ctrl+S', click: () => sendToRenderer('file-save')},
                {label: i18n.t('menu.file.saveAs'), accelerator: 'Ctrl+Shift+S', click: () => sendToRenderer('file-save-as')},
                {label: i18n.t('menu.file.moveTo'), click: () => sendToRenderer('file-move-to')},
                {label: i18n.t('menu.file.saveAll'), click: () => sendToRenderer('file-save-all')},
                {type: 'separator'},
                {label: i18n.t('menu.file.properties'), click: () => sendToRenderer('file-properties')},
                {label: i18n.t('menu.file.openLocation'), click: () => sendToRenderer('file-open-location')},
                {label: i18n.t('menu.file.showSidebar'), click: () => sendToRenderer('file-show-sidebar')},
                {label: i18n.t('menu.file.delete'), click: () => sendToRenderer('file-delete')},
                {type: 'separator'},
                {
                    label: i18n.t('menu.file.import'),
                    submenu: [
                        {label: i18n.t('menu.file.importFromTxt'), click: () => fileUtils.importFromFile()},
                        {label: i18n.t('menu.file.importFromWord'), click: () => fileUtils.importFromWord()},
                        {label: i18n.t('menu.file.importFromHTML'), click: () => fileUtils.importFromHTML()}
                    ]
                },
                {
                    label: i18n.t('menu.file.export'),
                    submenu: [
                        {label: i18n.t('menu.file.exportPDF'), click: () => sendToRenderer('file-export-pdf')},
                        {label: i18n.t('menu.file.exportHTML'), click: () => sendToRenderer('file-export-html')},
                        {label: i18n.t('menu.file.exportHTMLPlain'), click: () => sendToRenderer('file-export-html-plain')},
                        {label: i18n.t('menu.file.exportImage'), click: () => sendToRenderer('file-export-image')},
                        {type: 'separator'},
                        {label: i18n.t('menu.file.exportDocx'), click: () => sendToRenderer('file-export-docx')},
                        {label: i18n.t('menu.file.exportODT'), click: () => sendToRenderer('file-export-odt')},
                        {label: i18n.t('menu.file.exportRTF'), click: () => sendToRenderer('file-export-rtf')},
                        {label: i18n.t('menu.file.exportEpub'), click: () => sendToRenderer('file-export-epub')},
                        {label: i18n.t('menu.file.exportLaTeX'), click: () => sendToRenderer('file-export-latex')},
                        {label: i18n.t('menu.file.exportMediaWiki'), click: () => sendToRenderer('file-export-mediawiki')},
                        {label: i18n.t('menu.file.exportRST'), click: () => sendToRenderer('file-export-rst')},
                        {label: i18n.t('menu.file.exportTextile'), click: () => sendToRenderer('file-export-textile')},
                        {label: i18n.t('menu.file.exportOPML'), click: () => sendToRenderer('file-export-opml')},
                        {type: 'separator'},
                        {
                            label: i18n.t('menu.file.exportLast'),
                            accelerator: 'Ctrl+Shift+E',
                            click: () => sendToRenderer('file-export-last')
                        },
                        {label: i18n.t('menu.file.exportOverwrite'), click: () => sendToRenderer('file-export-overwrite')},
                        {label: i18n.t('menu.file.exportSettings'), click: () => sendToRenderer('file-export-settings')}
                    ]
                },
                {label: i18n.t('menu.file.print'), accelerator: 'Alt+Shift+P', click: () => sendToRenderer('file-print')},
                {type: 'separator'},
                {label: i18n.t('menu.file.preferences'), accelerator: 'Ctrl+,', click: () => createPreferencesWindow()},
                {type: 'separator'},
                {label: i18n.t('menu.file.close'), accelerator: 'Ctrl+W', click: () => sendToRenderer('file-close')}
            ]
        },
        {
            label: i18n.t('menu.edit'),
            submenu: [
                {role: 'undo', label: i18n.t('menu.edit.undo'), accelerator: 'Ctrl+Z'},
                {role: 'redo', label: i18n.t('menu.edit.redo'), accelerator: 'Ctrl+Y'},
                {type: 'separator'},
                {role: 'cut', label: i18n.t('menu.edit.cut'), accelerator: 'Ctrl+X'},
                {role: 'copy', label: i18n.t('menu.edit.copy'), accelerator: 'Ctrl+C'},
                {label: i18n.t('menu.edit.copyImage'), click: () => sendToRenderer('edit-copy-image')},
                {role: 'paste', label: i18n.t('menu.edit.paste'), accelerator: 'Ctrl+V'},
                {type: 'separator'},
                {label: i18n.t('menu.edit.copyPlain'), click: () => sendToRenderer('edit-copy-plain')},
                {label: i18n.t('menu.edit.copyMarkdown'), accelerator: 'Ctrl+Shift+C', click: () => sendToRenderer('edit-copy-md')},
                {label: i18n.t('menu.edit.copyHTML'), click: () => sendToRenderer('edit-copy-html')},
                {label: i18n.t('menu.edit.copyRich'), click: () => sendToRenderer('edit-copy-rich')},
                {type: 'separator'},
                {label: i18n.t('menu.edit.pastePlain'), accelerator: 'Ctrl+Shift+V', click: () => sendToRenderer('edit-paste-plain')},
                {type: 'separator'},
                {
                    label: i18n.t('menu.edit.select'),
                    submenu: [{role: 'selectAll', label: i18n.t('menu.edit.selectAll')}]
                },
                {label: i18n.t('menu.edit.moveRowUp'), accelerator: 'Alt+Up', click: () => sendToRenderer('edit-move-row-up')},
                {label: i18n.t('menu.edit.moveRowDown'), accelerator: 'Alt+Down', click: () => sendToRenderer('edit-move-row-down')},
                {type: 'separator'},
                {label: i18n.t('menu.edit.delete'), click: () => sendToRenderer('edit-delete')},
                {
                    label: i18n.t('menu.edit.deleteRange'),
                    submenu: [
                        {label: i18n.t('menu.edit.deleteParagraph'), click: () => sendToRenderer('edit-delete-range-paragraph')},
                        {label: i18n.t('menu.edit.deleteLine'), click: () => sendToRenderer('edit-delete-range-line')}
                    ]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.edit.mathTools'),
                    submenu: [{label: i18n.t('menu.edit.mathBlock'), click: () => sendToRenderer('edit-math-block')}]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.edit.smartPunctuation'),
                    type: 'checkbox',
                    checked: false,
                    click: () => sendToRenderer('edit-smart-punctuation')
                },
                {
                    label: i18n.t('menu.edit.newline'),
                    submenu: [
                        {label: i18n.t('menu.edit.newlineN'), click: () => sendToRenderer('edit-newline-n')},
                        {label: i18n.t('menu.edit.newlineRN'), click: () => sendToRenderer('edit-newline-rn')}
                    ]
                },
                {label: i18n.t('menu.edit.spacesNewlines'), click: () => sendToRenderer('edit-spaces-newlines')},
                {label: i18n.t('menu.edit.spellcheck'), click: () => sendToRenderer('edit-spellcheck')},
                {type: 'separator'},
                {
                    label: i18n.t('menu.edit.findReplace'),
                    submenu: [
                        {label: i18n.t('menu.edit.find'), accelerator: 'Ctrl+F', click: () => sendToRenderer('edit-find')},
                        {label: i18n.t('menu.edit.findNext'), accelerator: 'F3', click: () => sendToRenderer('edit-find-next')},
                        {label: i18n.t('menu.edit.replace'), accelerator: 'Ctrl+H', click: () => sendToRenderer('edit-replace')}
                    ]
                },
                {label: i18n.t('menu.edit.emoji'), accelerator: 'Super+.', click: () => sendToRenderer('edit-emoji')}
            ]
        },
        {
            label: i18n.t('menu.paragraph'),
            submenu: [
                {
                    label: i18n.t('menu.paragraph.heading1'),
                    accelerator: 'Ctrl+1',
                    click: () => sendToRenderer('toggle-heading-1')
                },
                {
                    label: i18n.t('menu.paragraph.heading2'),
                    accelerator: 'Ctrl+2',
                    click: () => sendToRenderer('toggle-heading-2')
                },
                {
                    label: i18n.t('menu.paragraph.heading3'),
                    accelerator: 'Ctrl+3',
                    click: () => sendToRenderer('toggle-heading-3')
                },
                {
                    label: i18n.t('menu.paragraph.heading4'),
                    accelerator: 'Ctrl+4',
                    click: () => sendToRenderer('toggle-heading-4')
                },
                {
                    label: i18n.t('menu.paragraph.heading5'),
                    accelerator: 'Ctrl+5',
                    click: () => sendToRenderer('toggle-heading-5')
                },
                {
                    label: i18n.t('menu.paragraph.heading6'),
                    accelerator: 'Ctrl+6',
                    click: () => sendToRenderer('toggle-heading-6')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.paragraph'),
                    accelerator: 'Ctrl+0',
                    click: () => sendToRenderer('toggle-paragraph')
                },
                {
                    label: i18n.t('menu.paragraph.promoteHeading'),
                    accelerator: 'Ctrl+=',
                    click: () => sendToRenderer('heading-promote')
                },
                {
                    label: i18n.t('menu.paragraph.demoteHeading'),
                    accelerator: 'Ctrl+-',
                    click: () => sendToRenderer('heading-demote')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.orderedList'),
                    accelerator: 'Ctrl+Shift+[',
                    click: () => sendToRenderer('toggle-ol')
                },
                {
                    label: i18n.t('menu.paragraph.unorderedList'),
                    accelerator: 'Ctrl+Shift+]',
                    click: () => sendToRenderer('toggle-ul')
                },
                {
                    label: i18n.t('menu.paragraph.taskList'),
                    accelerator: 'Ctrl+Shift+X',
                    click: () => sendToRenderer('toggle-task-list')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.table'),
                    click: () => sendToRenderer('paragraph-insert-table')
                },
                {
                    label: i18n.t('menu.paragraph.mathBlock'),
                    accelerator: 'Ctrl+Shift+M',
                    click: () => sendToRenderer('paragraph-math-block')
                },
                {
                    label: i18n.t('menu.paragraph.codeBlock'),
                    accelerator: 'Ctrl+Shift+K',
                    click: () => sendToRenderer('insert-code-block')
                },
                {
                    label: i18n.t('menu.paragraph.codeTools'),
                    submenu: [
                        {label: i18n.t('menu.paragraph.codeToolsRun'), click: () => sendToRenderer('paragraph-code-tools-run')}
                    ]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.quote'),
                    accelerator: 'Ctrl+Shift+Q',
                    click: () => sendToRenderer('paragraph-toggle-quote')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.taskState'),
                    submenu: [
                        {label: i18n.t('menu.paragraph.taskToggleState'), click: () => sendToRenderer('paragraph-task-toggle-state')}
                    ]
                },
                {
                    label: i18n.t('menu.paragraph.listIndent'),
                    submenu: [
                        {label: i18n.t('menu.paragraph.listIndentIncrease'), click: () => sendToRenderer('paragraph-list-indent')},
                        {label: i18n.t('menu.paragraph.listIndentDecrease'), click: () => sendToRenderer('paragraph-list-outdent')}
                    ]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.insertAbove'),
                    click: () => sendToRenderer('paragraph-insert-above')
                },
                {
                    label: i18n.t('menu.paragraph.insertBelow'),
                    click: () => sendToRenderer('paragraph-insert-below')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.linkRef'),
                    click: () => sendToRenderer('paragraph-link-ref')
                },
                {
                    label: i18n.t('menu.paragraph.footnote'),
                    click: () => sendToRenderer('paragraph-footnote')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.paragraph.hr'),
                    click: () => sendToRenderer('paragraph-hr')
                },
                {
                    label: i18n.t('menu.paragraph.toc'),
                    click: () => sendToRenderer('paragraph-toc')
                },
                {
                    label: i18n.t('menu.paragraph.yamlFrontMatter'),
                    click: () => sendToRenderer('paragraph-yaml-front-matter')
                }
            ]
        },
        {
            label: i18n.t('menu.format'),
            submenu: [
                {label: i18n.t('menu.format.bold'), accelerator: 'Ctrl+B', click: () => sendToRenderer('toggle-bold')},
                {label: i18n.t('menu.format.italic'), accelerator: 'Ctrl+I', click: () => sendToRenderer('toggle-italic')},
                {label: i18n.t('menu.format.underline'), accelerator: 'Ctrl+U', click: () => sendToRenderer('toggle-underline')},
                {
                    label: i18n.t('menu.format.code'),
                    accelerator: 'Ctrl+Shift+`',
                    click: () => sendToRenderer('toggle-inline-code')
                },
                {
                    label: i18n.t('menu.format.strike'),
                    accelerator: 'Alt+Shift+5',
                    click: () => sendToRenderer('format-strike')
                },
                {
                    label: i18n.t('menu.format.comment'),
                    click: () => sendToRenderer('format-comment')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.format.link'),
                    accelerator: 'Ctrl+K',
                    click: () => sendToRenderer('format-link')
                },
                {
                    label: i18n.t('menu.format.linkActions'),
                    submenu: [
                        {label: i18n.t('menu.format.linkEdit'), click: () => sendToRenderer('format-link-edit')},
                        {label: i18n.t('menu.format.linkRemove'), click: () => sendToRenderer('format-link-remove')}
                    ]
                },
                {
                    label: i18n.t('menu.format.image'),
                    submenu: [
                        {label: i18n.t('menu.format.imageInsert'), click: () => sendToRenderer('format-image-insert')},
                        {label: i18n.t('menu.format.imageEdit'), click: () => sendToRenderer('format-image-edit')}
                    ]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.format.clearStyle'),
                    accelerator: 'Ctrl+\\',
                    click: () => sendToRenderer('format-clear-style')
                }
            ]
        },
        {
            label: i18n.t('menu.view'),
            submenu: [
                {
                    label: i18n.t('menu.view.editMode'),
                    submenu: [
                        {
                            label: i18n.t('menu.view.modeSplit'),
                            type: 'radio',
                            checked: true,
                            click: () => sendToRenderer('view-mode-split')
                        },
                        {
                            label: i18n.t('menu.view.modeSource'),
                            type: 'radio',
                            accelerator: 'Ctrl+/',
                            click: () => sendToRenderer('toggle-source-mode')
                        },
                        {
                            label: i18n.t('menu.view.modeResult'),
                            type: 'radio',
                            click: () => sendToRenderer('toggle-result-mode')
                        }
                    ]
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.view.toggleSidebar'),
                    accelerator: 'Ctrl+Shift+L',
                    click: () => sendToRenderer('view-toggle-sidebar')
                },
                {
                    label: i18n.t('menu.view.outline'),
                    accelerator: 'Ctrl+Shift+1',
                    click: () => sendToRenderer('view-outline')
                },
                {
                    label: i18n.t('menu.view.documents'),
                    accelerator: 'Ctrl+Shift+2',
                    click: () => sendToRenderer('view-documents')
                },
                {
                    label: i18n.t('menu.view.fileTree'),
                    accelerator: 'Ctrl+Shift+3',
                    click: () => sendToRenderer('view-file-tree')
                },
                {
                    label: i18n.t('menu.view.pane'),
                    accelerator: 'Ctrl+Shift+F',
                    click: () => sendToRenderer('view-pane')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.view.focusMode'),
                    accelerator: 'F8',
                    click: () => sendToRenderer('view-focus-mode')
                },
                {
                    label: i18n.t('menu.view.typewriterMode'),
                    accelerator: 'F9',
                    click: () => sendToRenderer('view-typewriter-mode')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.view.showStatusbar'),
                    type: 'checkbox',
                    checked: true,
                    click: () => sendToRenderer('view-toggle-statusbar')
                },
                {
                    label: i18n.t('menu.view.wordCount'),
                    click: () => sendToRenderer('view-word-count')
                },
                {type: 'separator'},
                {
                    label: i18n.t('menu.view.toggleFullscreen'),
                    role: 'togglefullscreen',
                    accelerator: 'F11'
                },
                {
                    label: i18n.t('menu.view.alwaysOnTop'),
                    type: 'checkbox',
                    click: (menuItem) => {
                        if (mainWindow) {
                            mainWindow.setAlwaysOnTop(menuItem.checked);
                        }
                    }
                },
                {type: 'separator'},
                {role: 'resetZoom', label: i18n.t('menu.view.actualSize'), accelerator: 'Ctrl+Shift+9'},
                {role: 'zoomIn', label: i18n.t('menu.view.zoomIn'), accelerator: 'Ctrl+Shift+='},
                {role: 'zoomOut', label: i18n.t('menu.view.zoomOut'), accelerator: 'Ctrl+Shift+-'},
                {type: 'separator'},
                {
                    label: i18n.t('menu.view.switchWindow'),
                    accelerator: 'Ctrl+Tab',
                    click: () => sendToRenderer('view-switch-window')
                },
                {role: 'reload', label: i18n.t('menu.view.reload')},
                {role: 'toggleDevTools', label: i18n.t('menu.view.toggleDevTools'), accelerator: 'Shift+F12'}
            ]
        },
        {
            label: i18n.t('menu.theme'),
            submenu: [
                {label: i18n.t('menu.theme.select'), click: () => sendToRenderer('theme-show-menu')},
                {type: 'separator'},
                {label: i18n.t('menu.theme.github'), type: 'radio', checked: true, click: () => sendToRenderer('theme-github')},
                {label: i18n.t('menu.theme.newsprint'), type: 'radio', click: () => sendToRenderer('theme-newsprint')},
                {label: i18n.t('menu.theme.night'), type: 'radio', click: () => sendToRenderer('theme-night')},
                {label: i18n.t('menu.theme.pixyll'), type: 'radio', click: () => sendToRenderer('theme-pixyll')},
                {label: i18n.t('menu.theme.whitey'), type: 'radio', click: () => sendToRenderer('theme-whitey')}
            ]
        },
        {
            label: i18n.t('menu.help'),
            submenu: [
                {label: i18n.t('menu.help.changelog'), click: () => sendToRenderer('help-changelog')},
                {label: i18n.t('menu.help.privacy'), click: () => sendToRenderer('help-privacy')},
                {label: i18n.t('menu.help.website'), click: () => sendToRenderer('help-website')},
                {
                    label: i18n.t('menu.help.feedback'),
                    click: () => {
                        const {shell} = require('electron');
                        shell.openExternal('https://github.com/HobartTimothy/Anduin/issues').catch((err) => {
                            console.error('打开反馈链接失败:', err);
                        });
                    }
                },
                {type: 'separator'},
                {label: i18n.t('menu.help.checkUpdates'), click: () => sendToRenderer('help-check-updates')},
                {label: i18n.t('menu.help.about'), click: () => sendToRenderer('help-about')}
            ]
        }
    ];
}

module.exports = {createMenuTemplate, changeLanguage};

