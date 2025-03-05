@echo off
reg Query "HKLM\Hardware\Description\System\CentralProcessor\0" | find /i "x86" > NUL && set OS=32 || set OS=64

set /p id="Enter Chrome extension ID: "
SET _p=%appdata%\dlogic\manifest-chrome-windows.json
SET _result=%_p:\=\\%
echo {"name": "ufr.dlogic.chrome","description": "UFR","path": "ufr.exe","type": "stdio","allowed_origins": ["chrome-extension://%id%/"]} >data\Windows\manifest-chrome-windows.json
echo f | xcopy "data\Windows\manifest-chrome-windows.json" "%appdata%\dlogic\manifest-chrome-windows.json" /y /f /q > nul
if %OS%==32 (echo f | xcopy "data\Windows\x86\ufr.exe" "%appdata%\dlogic\ufr.exe" /y /f /q > nul) else (echo f | xcopy "data\Windows\x86_64\ufr.exe" "%appdata%\dlogic\ufr.exe" /y /f /q > nul) 

echo Windows Registry Editor Version 5.00> data\\windows\\registry.reg
echo [HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\ufr.dlogic.chrome]>> data\\windows\\registry.reg
echo @="%_result%">> data\\windows\\registry.reg
reg import data\\windows\\registry.reg