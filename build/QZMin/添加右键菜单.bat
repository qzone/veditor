@echo off
SET qzminpath=%CD%
SET qzminpath=%qzminpath:\=\\%
> ".\regShortcut.reg" ECHO Windows Registry Editor Version 5.00
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\*\shell\QZMin]
>>".\regShortcut.reg" ECHO @="Run QZMin(&Z)"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\*\shell\QZMin\command]
>>".\regShortcut.reg" ECHO @="java -jar %qzminpath%\\jsrun.jar %qzminpath%\\run.js -c=%%1"
>>".\regShortcut.reg" ECHO.

cls
echo 正在添加到注册表,请稍后...
regedit /s ".\regShortcut.reg"
"%windir%\regedit.exe" /s ".\regShortcut.reg"
del /F /Q ".\regShortcut.reg"

cls
echo 注册完成..
echo 如果是vista系统, 需要管理员权限
echo. 
echo 注册表位置 [HKEY_CLASSES_ROOT\*\shell\]

echo. 
echo 任意键退出
pause >nul
cls