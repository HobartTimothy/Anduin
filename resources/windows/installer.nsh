!macro customInstall
  ; 注册文件关联
  WriteRegStr HKCR ".md" "" "anduin.md"
  WriteRegStr HKCR "anduin.md" "" "Markdown 文件"
  WriteRegStr HKCR "anduin.md\DefaultIcon" "" "$INSTDIR\${PRODUCT_FILENAME}.exe,0"
  WriteRegStr HKCR "anduin.md\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
  
  ; 添加右键菜单 - 使用 Anduin 打开
  WriteRegStr HKCR "*\shell\anduin-open" "" "使用 Anduin 打开"
  WriteRegStr HKCR "*\shell\anduin-open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
  
  ; 添加 .md 文件右键菜单 - 使用 Anduin 打开
  WriteRegStr HKCR ".md\shell\anduin-open" "" "使用 Anduin 打开"
  WriteRegStr HKCR ".md\shell\anduin-open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
  
  ; 添加右键菜单 - 新建 Markdown 文件（在文件夹背景）
  WriteRegStr HKCR "Directory\Background\shell\anduin-new" "" "新建 Markdown 文件"
  WriteRegStr HKCR "Directory\Background\shell\anduin-new\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" --new-md "%V"'
  
  ; 添加文件夹右键菜单 - 新建 Markdown 文件
  WriteRegStr HKCR "Directory\shell\anduin-new" "" "新建 Markdown 文件"
  WriteRegStr HKCR "Directory\shell\anduin-new\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" --new-md "%1"'
  
  ; 刷新 Shell
  System::Call 'shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUninstall
  ; 删除文件关联
  DeleteRegKey HKCR ".md"
  DeleteRegKey HKCR "anduin.md"
  
  ; 删除右键菜单
  DeleteRegKey HKCR "*\shell\anduin-open"
  DeleteRegKey HKCR ".md\shell\anduin-open"
  DeleteRegKey HKCR "Directory\Background\shell\anduin-new"
  DeleteRegKey HKCR "Directory\shell\anduin-new"
  
  ; 刷新 Shell
  System::Call 'shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

