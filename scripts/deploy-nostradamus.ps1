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
scp -i $IdentityFile -o BatchMode=yes -r $Source "${Remote}:$RemoteDir/"

$excludeHomepage = ""
if (!$IncludeHomepageData) {
    $excludeHomepage = "--exclude admin/data/homepage.json"
    Write-Host "Skipping admin/data/homepage.json (live CMS data stays on server)."
}

$remoteCmd = @(
    "chown -R deploy:deploy $RemoteDir",
    "sudo -u deploy rsync -az --delete $excludeHomepage $RemoteDir/ mrpuffch@mrpuffch.beget.tech:$BegetPath/"
) -join "; "

ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=120 $Remote $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "BeGet deploy failed." }

Write-Host "Done: https://nostradamus-1503.ru/"
