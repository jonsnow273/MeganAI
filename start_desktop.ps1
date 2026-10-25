Write-Host "======================================================" -ForegroundColor Magenta
Write-Host " Starting Megan AI - Intelligent Desktop Assistant" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Magenta

Set-Location $PSScriptRoot

python main.py --desktop
if ($LASTEXITCODE -ne 0) {
    Set-Location (Join-Path $PSScriptRoot "frontend")
    npm run electron:start
}
