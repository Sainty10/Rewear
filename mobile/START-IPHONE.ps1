# Run from PowerShell with: powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\START-IPHONE.ps1
# This process-scoped setting runs this reviewed local script; it does not change Windows policy.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 LTS from https://nodejs.org, reopen PowerShell, and try again.' }
if (-not (Test-Path '.\node_modules\expo\package.json')) {
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Read the npm error above.' }
}
& npx.cmd expo whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Sign in here with your own Expo account. Do not send credentials in chat. Use the same account in Expo Go on your iPhone.'
  & npx.cmd expo login
  if ($LASTEXITCODE -ne 0) { throw 'Expo login did not complete.' }
}
& npm.cmd run start:tunnel
if ($LASTEXITCODE -ne 0) { throw 'The tunnel could not start. Try npm.cmd run start:lan on the same Wi-Fi network, or review the error above.' }
