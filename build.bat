@echo off
title ZENTYR Injector Compiler (v3.6)
color 0b

echo ============================================================
echo   ZENTYR Injector Compiler - Modern C# Build Utility (2026) 
echo ============================================================
echo.

set CSC_PATH=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" set CSC_PATH=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" goto ERROR_NO_COMPILER

echo [INFO] Compiler Located: %CSC_PATH%
echo [INFO] Target File: ZentyrInjector.cs
echo [INFO] Script Source: GitHub raw URL (online only)
echo [INFO] Compiling executable...
echo.

:: Execute compile
"%CSC_PATH%" /nologo /warn:4 /target:exe /platform:anycpu /win32icon:"assets\zentyr.ico" /out:"ZENTYR Discord Script.exe" ZentyrInjector.cs

if errorlevel 1 goto ERROR_COMPILE_FAIL
goto SUCCESS

:ERROR_NO_COMPILER
color 0c
echo [ERROR] Could not find the C# Compiler (csc.exe) on this system.
echo Please ensure .NET Framework 4.0 or higher is installed.
echo.
pause
exit /b 1

:ERROR_COMPILE_FAIL
color 0c
echo.
echo [ERROR] Compilation failed. Please inspect the logs above.
echo.
pause
exit /b 1

:SUCCESS
color 0a
echo.
echo ============================================================
echo   [SUCCESS] Compilation Successful!
echo   [INFO] Single-file output generated: "ZENTYR Discord Script.exe"
echo ============================================================
echo.
pause
