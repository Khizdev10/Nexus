import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "win32";
  const token = searchParams.get("token") || "NEXUS-DEMO";

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const serverUrl = `${protocol}://${host}`;

  if (platform === "win32") {
    // Zero-Terminal Launcher with System Tray Icon Notification
    const cmdContent = `@echo off
title Nexus Local PC Agent
cls
set "PATH=%SystemRoot%\\System32;%SystemRoot%\\System32\\WindowsPowerShell\\v1.0;%SystemRoot%\\System32\\Wbem;%ProgramFiles%\\nodejs;%ProgramFiles(x86)%\\nodejs;%LOCALAPPDATA%\\Programs\\node;%PATH%"

set "NODE_EXEC=node"

where node >nul 2>nul
if %errorlevel% equ 0 (
    goto RUN_AGENT
)

if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

echo Initializing Nexus Desktop Agent... Please wait a moment...

if not exist "%TEMP%\\nexus-node" mkdir "%TEMP%\\nexus-node"

:: Method 1: PowerShell with explicit System32 path
if exist "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" (
    "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://nodejs.org/dist/v20.11.1/win-x64/node.exe', '$env:TEMP\\nexus-node\\node.exe');" >nul 2>nul
)

if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

:: Method 2: Curl fallback
if exist "%SystemRoot%\\System32\\curl.exe" (
    "%SystemRoot%\\System32\\curl.exe" -sSL "https://nodejs.org/dist/v20.11.1/win-x64/node.exe" -o "%TEMP%\\nexus-node\\node.exe" >nul 2>nul
)

if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

:: Method 3: Bitsadmin fallback
if exist "%SystemRoot%\\System32\\bitsadmin.exe" (
    "%SystemRoot%\\System32\\bitsadmin.exe" /transfer nexusDownload /download /priority foreground "https://nodejs.org/dist/v20.11.1/win-x64/node.exe" "%TEMP%\\nexus-node\\node.exe" >nul 2>nul
)

if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

echo ❌ Setup encountered a network delay.
pause
exit /b 1

:RUN_AGENT
echo.
echo 🟢 NEXUS AGENT CONNECTED & MINIMIZING TO SYSTEM TRAY...
echo.

:: 1. Launch Node agent in detached background mode
start /b "" "%NODE_EXEC%" -e "const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),https=require('https');const serverUrl='${serverUrl}',token='${token}';const defaultPaths=['c:\\\\coding\\\\projects',path.join(os.homedir(),'projects'),path.join(os.homedir(),'source','repos')];const allowedPaths=defaultPaths.filter(p=>fs.existsSync(p));function ping(){try{const url=new URL(serverUrl+'/api/agent/pair');const mod=url.protocol==='https:'?https:http;const payload=JSON.stringify({token,hostname:os.hostname(),platform:os.platform(),allowedPaths});const req=mod.request(url,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{let d='';res.on('data',c=>d+=c);});req.on('error',()=>{});req.write(payload);req.end();}catch(e){}}ping();setInterval(ping,3000);"

:: 2. Launch System Tray Icon & Toast Notification in Hidden Mode
start /b "" "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.BalloonTipTitle = 'Nexus Desktop Agent'; $n.BalloonTipText = '🟢 Agent Active & Synced in System Tray'; $n.Text = 'Nexus Desktop Agent'; $n.Visible = $true; $n.ShowBalloonTip(3000); Start-Sleep -Seconds 86400" >nul 2>nul

timeout /t 1 >nul
exit /b 0
`;

    return new NextResponse(cmdContent, {
      headers: {
        "Content-Type": "application/cmd",
        "Content-Disposition": `attachment; filename="nexus-agent-start.cmd"`,
      },
    });
  }

  // Mac / Linux shell script fallback
  const shContent = `#!/bin/bash
echo "Starting Nexus Local Desktop Agent in background..."
nohup node -e "
const serverUrl = '${serverUrl}';
const token = '${token}';
function ping() {
  fetch(serverUrl + '/api/agent/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, hostname: require('os').hostname(), platform: require('os').platform() })
  }).catch(() => {});
}
ping();
setInterval(ping, 3000);
" > /dev/null 2>&1 &
echo "Nexus Agent started in background. Minimizing..."
exit 0
`;

  return new NextResponse(shContent, {
    headers: {
      "Content-Type": "application/x-sh",
      "Content-Disposition": `attachment; filename="nexus-agent-start.sh"`,
    },
  });
}
