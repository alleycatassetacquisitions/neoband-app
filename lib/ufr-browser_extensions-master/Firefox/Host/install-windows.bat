@echo off
reg Query "HKLM\Hardware\Description\System\CentralProcessor\0" | find /i "x86" > NUL && set OS=32 || set OS=64

SET _p=%appdata%\dlogic\manifest-firefox-windows.json
SET _result=%_p:\=\\%
echo f | xcopy "data\Windows\manifest-firefox-windows.json" "%appdata%\dlogic\manifest-firefox-windows.json" /y /f /q > nul
if %OS%==32 (echo f | xcopy "data\Windows\x86\ufr.exe" "%appdata%\dlogic\ufr.exe" /y /f /q > nul) else (echo f | xcopy "data\Windows\x86_64\ufr.exe" "%appdata%\dlogic\ufr.exe" /y /f /q > nul) 

REG ADD "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\dlogic" /ve /d "%_p%" /f