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
echo ������ӵ�ע���,���Ժ�...
regedit /s ".\regShortcut.reg"
"%windir%\regedit.exe" /s ".\regShortcut.reg"
del /F /Q ".\regShortcut.reg"

cls
echo ע�����..
echo �����vistaϵͳ, ��Ҫ����ԱȨ��
echo. 
echo ע���λ�� [HKEY_CLASSES_ROOT\*\shell\]

echo. 
echo ������˳�
pause >nul
cls