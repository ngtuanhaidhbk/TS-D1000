@echo off
setlocal

rem Fixes HttpListener URL ACL permission for localhost:5050.
rem Must be run as Administrator (one-time setup per machine/user).

set "PORT=5050"

echo This must be run in an Administrator terminal.
echo Adding URL ACL for http://localhost:%PORT%/ to user "%USERNAME%" ...
netsh http add urlacl url=http://localhost:%PORT%/ user=%USERNAME%
echo Adding URL ACL for http://127.0.0.1:%PORT%/ to user "%USERNAME%" ...
netsh http add urlacl url=http://127.0.0.1:%PORT%/ user=%USERNAME%
echo Adding URL ACL for http://[::1]:%PORT%/ to user "%USERNAME%" ...
netsh http add urlacl url=http://[::1]:%PORT%/ user=%USERNAME%

echo.
echo If you see "Cannot create a file when that file already exists.", it's already configured.
pause
