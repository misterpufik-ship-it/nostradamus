param(
    [string]$VpsHost = "82.202.129.7",
    [string]$VpsUser = "root",
    [string]$IdentityFile = "$env:USERPROFILE\.ssh\codex_beget_vps_ed25519",
    [switch]$IncludeHomepageData
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$Source = Join-Path $RepoRoot "deploy\nostradamus-1503.ru\public_html"
$Remote = "$VpsUser@$VpsHost"
$RemoteDir = "/tmp/nostradamus-site-deploy"
$BegetPath = "/home/m/mrpuffch/nostradamus-1503.ru/public_html"

if (!(Test-Path $IdentityFile)) {
    throw "Missing SSH key: $IdentityFile"
}

if (!(Test-Path $Source)) {
    throw "Missing source folder: $Source"
}

Write-Host "Uploading nostradamus site to VPS..."
ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=20 $Remote "rm -rf $RemoteDir && mkdir -p $RemoteDir && chown -R deploy:deploy $RemoteDir"
# Copy CONTENTS of public_html into RemoteDir (not a nested public_html folder)
scp -i $IdentityFile -o BatchMode=yes -r "${Source}\*" "${Remote}:$RemoteDir/"

$excludeArgs = @(
    "--exclude", "obuchenie",
    "--exclude", "list",
    "--exclude", "admin/uploads",
    "--exclude", "admin/config/auth.php"
)
if (!$IncludeHomepageData) {
    $excludeArgs += @("--exclude", "admin/data/homepage.json")
    Write-Host "Skipping admin/data/homepage.json (live CMS data stays on server)."
}
Write-Host "Never deleting sibling dirs (obuchenie/, list/) — deploy without --delete."

# Build remote rsync command WITHOUT --delete to avoid wiping /obuchenie and /list
$excludeRemote = ($excludeArgs | ForEach-Object { $_ }) -join " "
$remoteCmd = @(
    "chown -R deploy:deploy $RemoteDir",
    "sudo -u deploy rsync -az $excludeRemote $RemoteDir/ mrpuffch@mrpuffch.beget.tech:$BegetPath/"
) -join "; "

ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=120 $Remote $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "BeGet deploy failed." }

Write-Host "Done: https://nostradamus-1503.ru/"
