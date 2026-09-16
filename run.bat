: '"
@echo off
goto Batch
"'
SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
exec "$(command -v sh || echo /bin/sh)" "$SCRIPT_DIR/run.sh" "$@"
exit $?

:Batch
if "%1"=="" goto :BatchNoArgs
"%~dp0path\subfount.bat" %*
goto :BatchExit

:BatchNoArgs
call "%~dp0path\subfount.bat"

:BatchExit
if "%1"=="" if %ERRORLEVEL% NEQ 0 if %ERRORLEVEL% NEQ 130 if %ERRORLEVEL% NEQ 255 pause
exit /b %ERRORLEVEL%
@echo on
