$ruleName = "X-Active local site 8001"
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host "Запустите этот файл через PowerShell от имени администратора."
  Write-Host "Он откроет порт 8001 для сайта X-Active в локальной сети."
  exit 1
}

$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if (-not $existingRule) {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 8001 `
    -Profile Private | Out-Null

  Write-Host "Порт 8001 открыт для локальной сети."
} else {
  Write-Host "Правило уже есть: порт 8001 открыт."
}
