@echo off
SET qzminpath=%CD%

cls
echo 创建QZMin执行程序...
>  ".\run.bat" ECHO @echo off
>> ".\run.bat" ECHO java -jar %qzminpath%\jsrun.jar %qzminpath%\run.js -c=%%1


SET qzminpath=%qzminpath:\=\\%
> ".\regShortcut.reg" ECHO Windows Registry Editor Version 5.00
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\.qzmin]
>>".\regShortcut.reg" ECHO @="QZMin.MakeFile"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\QZMin.MakeFile]
>>".\regShortcut.reg" ECHO "EditFlags"=dword:00000000
>>".\regShortcut.reg" ECHO "BrowserFlags"=dword:00000008
>>".\regShortcut.reg" ECHO @="QZMin MakeFile 文件"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\QZMin.MakeFile\DefaultIcon]
>>".\regShortcut.reg" ECHO @="%qzminpath%\\make.ico,0"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\QZMin.MakeFile\shell]
>>".\regShortcut.reg" ECHO @="open"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\QZMin.MakeFile\shell\open]
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\QZMin.MakeFile\shell\open\command]
>>".\regShortcut.reg" ECHO @="%qzminpath%\\run.bat %%1"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\Applications\run.bat]
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\Applications\run.bat\shell]
>>".\regShortcut.reg" ECHO @="open"
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\Applications\run.bat\shell\open]
>>".\regShortcut.reg" ECHO .
>>".\regShortcut.reg" ECHO [HKEY_CLASSES_ROOT\Applications\run.bat\shell\open\command]
>>".\regShortcut.reg" ECHO @="%qzminpath%\\run.bat %%1"



echo 正在添加到注册表,请稍后...
regedit /s ".\regShortcut.reg"
"%windir%\regedit.exe" /s ".\regShortcut.reg"
del /F /Q ".\regShortcut.reg"

cls
echo 注册完成..
echo 如果是vista系统, 需要管理员权限
echo. 
echo 注册表位置 [HKEY_CLASSES_ROOT\.qzmin]
echo 注册表位置 [HKEY_CLASSES_ROOT\QZMin.MakeFile\shell]
echo 注册表位置 [HKEY_CLASSES_ROOT\Applications\run.bat]
echo. 
echo 任意键退出
pause >nul
cls