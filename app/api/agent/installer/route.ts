import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "win32";
  const token = searchParams.get("token") || "NEXUS-DEMO";

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const serverUrl = `${protocol}://${host}`;

  if (platform === "win32") {
    // Unbreakable Windows Agent Installer with Clean Daemon JS File & Startup Registration
    const cmdContent = `@echo off
title Nexus Local PC Agent
cls
set "PATH=%SystemRoot%\\System32;%SystemRoot%\\System32\\WindowsPowerShell\\v1.0;%SystemRoot%\\System32\\Wbem;%ProgramFiles%\\nodejs;%ProgramFiles(x86)%\\nodejs;%LOCALAPPDATA%\\Programs\\node;%PATH%"

set "NODE_EXEC=node"
set "CONFIG_DIR=%APPDATA%\\nexus-agent"
set "CONFIG_FILE=%CONFIG_DIR%\\config.json"
set "DAEMON_FILE=%CONFIG_DIR%\\daemon.js"
set "STARTUP_FILE=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\NexusAgent.cmd"

:: =============================================
:: STEP 1: Save persistent config to AppData
:: =============================================
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

:: Write config.json
echo {"serverUrl":"${serverUrl}","token":"${token}","installedAt":"%DATE% %TIME%"} > "%CONFIG_FILE%"

:: =============================================
:: STEP 2: Write clean daemon.js script
:: =============================================
(
echo const fs = require('fs');
echo const path = require('path');
echo const os = require('os');
echo const http = require('http');
echo const https = require('https');
echo const configPath = path.join(process.env.APPDATA ^|^| path.join(os.homedir(), 'AppData', 'Roaming'), 'nexus-agent', 'config.json');
echo function getSyncConfig() {
echo   try {
echo     if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
echo   } catch(e) {}
echo   return { serverUrl: '${serverUrl}', token: '${token}' };
echo }
echo function scanLocalProjects(rootPath) {
echo   try {
echo     if (!fs.existsSync(rootPath)) return [];
echo     const entries = fs.readdirSync(rootPath, { withFileTypes: true });
echo     const projects = [];
echo     let cp = null; try { cp = require('child_process'); } catch(e) {}
echo     for (const entry of entries) {
echo       if (!entry.isDirectory() ^|^| entry.name.startsWith('.')) continue;
echo       const projectPath = path.join(rootPath, entry.name);
echo       const gitDir = path.join(projectPath, '.git');
echo       let isGitRepo = fs.existsSync(gitDir);
echo       let branch = 'main';
echo       let uncommittedCount = 0;
echo       const changes = [];
echo       if (isGitRepo ^&^& cp) {
echo         try {
echo           branch = cp.execSync('git branch --show-current', { cwd: projectPath, encoding: 'utf-8', timeout: 500 }).trim() ^|^| 'main';
echo           const rawStatus = cp.execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8', timeout: 500 }).trim();
echo           if (rawStatus) {
echo             const lines = rawStatus.split('\\n');
echo             uncommittedCount = lines.length;
echo             lines.slice(0, 15).forEach(line =^> {
echo               changes.push({ status: line.substring(0, 2).trim(), filePath: line.substring(3).trim() });
echo             });
echo           }
echo         } catch(e) {}
echo       }
echo       projects.push({
echo         name: entry.name,
echo         fullPath: projectPath,
echo         isGitRepo,
echo         branch,
echo         uncommittedCount,
echo         changes,
echo         lastModifiedDate: new Date().toISOString()
echo       });
echo     }
echo     return projects;
echo   } catch (e) { return []; }
echo }
echo function ping() {
echo   try {
echo     const config = getSyncConfig();
echo     const serverUrl = config.serverUrl ^|^| '${serverUrl}';
echo     const token = config.token ^|^| '${token}';
echo     const defaultPaths = ['c:\\\\coding\\\\projects', path.join(os.homedir(), 'projects'), path.join(os.homedir(), 'source', 'repos')];
echo     const allowedPaths = defaultPaths.filter(p =^> fs.existsSync(p));
echo     const targetPath = allowedPaths[0] ^|^| 'c:\\\\coding\\\\projects';
echo     const projects = scanLocalProjects(targetPath);
echo     const url = new URL(serverUrl + '/api/agent/pair');
echo     const mod = url.protocol === 'https:' ? https : http;
echo     const payload = JSON.stringify({ token, hostname: os.hostname(), platform: os.platform(), allowedPaths, projects });
echo     const req = mod.request(url, {
echo       method: 'POST',
echo       headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
echo     }, res =^> {
echo       let d = '';
echo       res.on('data', c =^> d += c);
echo     });
echo     req.on('error', () =^> {});
echo     req.write(payload);
echo     req.end();
echo   } catch (e) {}
echo }
echo ping();
echo setInterval(ping, 3000);
) > "%DAEMON_FILE%"

:: =============================================
:: STEP 3: Register auto-start on Windows boot
:: =============================================
(
echo @echo off
echo title Nexus Agent Background
echo set "PATH=%%SystemRoot%%\\System32;%%SystemRoot%%\\System32\\WindowsPowerShell\\v1.0;%%ProgramFiles%%\\nodejs;%%LOCALAPPDATA%%\\Programs\\node;%%PATH%%"
echo set "NODE_EXEC=node"
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 if exist "%%TEMP%%\\nexus-node\\node.exe" set "NODE_EXEC=%%TEMP%%\\nexus-node\\node.exe"
echo start /min "" "%%NODE_EXEC%%" "%DAEMON_FILE%"
) > "%STARTUP_FILE%"

:: =============================================
:: STEP 4: Resolve Node.js Runtime
:: =============================================
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

:: Method 1: PowerShell
if exist "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" (
    "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://nodejs.org/dist/v20.11.1/win-x64/node.exe', '$env:TEMP\\nexus-node\\node.exe');" >nul 2>nul
)
if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

:: Method 2: Curl
if exist "%SystemRoot%\\System32\\curl.exe" (
    "%SystemRoot%\\System32\\curl.exe" -sSL "https://nodejs.org/dist/v20.11.1/win-x64/node.exe" -o "%TEMP%\\nexus-node\\node.exe" >nul 2>nul
)
if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

:: Method 3: Bitsadmin
if exist "%SystemRoot%\\System32\\bitsadmin.exe" (
    "%SystemRoot%\\System32\\bitsadmin.exe" /transfer nexusDownload /download /priority foreground "https://nodejs.org/dist/v20.11.1/win-x64/node.exe" "%TEMP%\\nexus-node\\node.exe" >nul 2>nul
)
if exist "%TEMP%\\nexus-node\\node.exe" (
    set "NODE_EXEC=%TEMP%\\nexus-node\\node.exe"
    goto RUN_AGENT
)

echo Setup encountered a network delay.
pause
exit /b 1

:RUN_AGENT
:: =============================================
:: STEP 5: Launch Agent Daemon & System Tray
:: =============================================

:: Launch daemon script in minimized background mode
start /min "" "%NODE_EXEC%" "%DAEMON_FILE%"

:: System Tray notification
start /b "" "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.BalloonTipTitle = 'Nexus Desktop Agent'; $n.BalloonTipText = 'Agent Active - Auto-starts on boot'; $n.Text = 'Nexus Desktop Agent (Active)'; $n.Visible = $true; $n.ShowBalloonTip(3000); Start-Sleep -Seconds 86400" >nul 2>nul

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
CONFIG_DIR="$HOME/.nexus-agent"
CONFIG_FILE="$CONFIG_DIR/config.json"
DAEMON_FILE="$CONFIG_DIR/daemon.js"
mkdir -p "$CONFIG_DIR"

echo '{"serverUrl":"${serverUrl}","token":"${token}"}' > "$CONFIG_FILE"

cat << 'EOF' > "$DAEMON_FILE"
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const configPath = path.join(os.homedir(), '.nexus-agent', 'config.json');
function getSyncConfig() {
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch(e) {}
  return { serverUrl: '${serverUrl}', token: '${token}' };
}
function ping() {
  try {
    const config = getSyncConfig();
    const serverUrl = config.serverUrl || '${serverUrl}';
    const token = config.token || '${token}';
    const url = new URL(serverUrl + '/api/agent/pair');
    const mod = url.protocol === 'https:' ? https : http;
    const payload = JSON.stringify({ token, hostname: os.hostname(), platform: os.platform() });
    const req = mod.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (e) {}
}
ping();
setInterval(ping, 3000);
EOF

echo "Starting Nexus Local Desktop Agent in background..."
nohup node "$DAEMON_FILE" > /dev/null 2>&1 &
echo "Nexus Agent started. Closing terminal..."
exit 0
`;

  return new NextResponse(shContent, {
    headers: {
      "Content-Type": "application/x-sh",
      "Content-Disposition": `attachment; filename="nexus-agent-start.sh"`,
    },
  });
}
