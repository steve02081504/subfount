: '"
@echo off
goto Batch
"'
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
exec "$(command -v sh || echo /bin/sh)" "$SCRIPT_DIR/run.sh" "$@"
exit $?

:Batch
cmd /c "%~dp0path\subfount.bat" %*
if "%1"=="" if %ERRORLEVEL% NEQ 0 if %ERRORLEVEL% NEQ 130 if %ERRORLEVEL% NEQ 255 pause
exit /b %ERRORLEVEL%
@echo on
