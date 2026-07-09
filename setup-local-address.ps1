$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$domain = "x-active.local"
$entry = "127.0.0.1 $domain"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host "Запустите этот файл через PowerShell от имени администратора."
  Write-Host "После этого адрес будет: http://x-active.local:8001/"
  exit 1
}

$hostsContent = Get-Content -LiteralPath $hostsPath -ErrorAction Stop

if ($hostsContent -notmatch "\s$domain(\s|$)") {
  Add-Content -LiteralPath $hostsPath -Value $entry
  Write-Host "Адрес добавлен: http://x-active.local:8001/"
} else {
  Write-Host "Адрес уже настроен: http://x-active.local:8001/"
}
