# ─────────────────────────────────────────────
#  DM Cockpit — Launch
# ─────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  *** DM Cockpit ***"
Write-Host "  Starting..."
Write-Host ""

# ── Resolve Node 20 ───────────────────────────
$nvmHome = "$env:LOCALAPPDATA\nvm"
$nodeDir  = Get-ChildItem $nvmHome -Directory -Filter "v20.*" | Sort-Object Name | Select-Object -Last 1

if (-not $nodeDir) {
  Write-Host "  ERROR: Could not find Node v20 in $nvmHome"
  Read-Host "Press Enter to exit"
  exit 1
}

$env:PATH = "$($nodeDir.FullName);$($nodeDir.FullName)\node_modules\.bin;$env:PATH"
$nodever  = & node --version
Write-Host "  OK - Node $nodever ready"

# ── Start React (no browser) ──────────────────
Write-Host "  Launching React server..."
$env:BROWSER = "none"
$reactProc = Start-Process "cmd" -ArgumentList "/k", "set BROWSER=none && npm start" `
  -WorkingDirectory $PSScriptRoot `
  -WindowStyle Normal `
  -PassThru

# ── Poll until localhost:3000 responds ────────
Write-Host "  Waiting for server (polling every 2s)..."
$ready   = $false
$attempt = 0
while (-not $ready) {
  Start-Sleep -Seconds 2
  $attempt++
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    Write-Host "  Attempt $attempt - status: $($r.StatusCode)"
    if ($r.StatusCode -lt 400) { $ready = $true }
  } catch {
    Write-Host "  Attempt $attempt - not ready yet ($_)"
  }
}

Write-Host "  OK - Server ready"
Write-Host "  Launching Electron..."
Write-Host ""

# ── Launch Electron ───────────────────────────
$env:NODE_ENV = "development"
$electronExe  = Join-Path $PSScriptRoot "node_modules\.bin\electron.cmd"
Write-Host "  Electron path: $electronExe"
Write-Host "  Exists: $(Test-Path $electronExe)"
& $electronExe .

# ── Cleanup when Electron closes ──────────────
Write-Host ""
Write-Host "  Shutting down React server..."
Stop-Process -Id $reactProc.Id -Force -ErrorAction SilentlyContinue

$port3000 = netstat -ano | Select-String ":3000 " | Select-String "LISTENING"
foreach ($line in $port3000) {
  $pid = ($line -split "\s+")[-1]
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}

Write-Host "  Done. Goodbye."
Start-Sleep -Seconds 2
