param(
    [switch]$SkipPush,
    [switch]$AllowDirty,
    [string]$Project = "x-active-obuchenie",
    [string]$VpsHost = "82.202.129.7",
    [string]$VpsUser = "root",
    [string]$IdentityFile = "$env:USERPROFILE\.ssh\codex_beget_vps_ed25519"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

function Invoke-RepoGit {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

    Push-Location $RepoRoot
    try {
        & git @GitArgs
        if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') failed." }
    }
    finally {
        Pop-Location
    }
}

Push-Location $RepoRoot
try {
    & git rev-parse --is-inside-work-tree | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "This folder is not a Git repository." }

    if (!$AllowDirty) {
        $status = & git status --porcelain
        if ($status) {
            throw "Working tree has uncommitted changes. Commit them first, or rerun with -AllowDirty for checks only."
        }
    }

    if (!(Test-Path $IdentityFile)) {
        throw "Missing SSH key: $IdentityFile"
    }

    & python (Join-Path $ScriptDir "prepare_deploy.py")

    if (!$SkipPush) {
        Invoke-RepoGit fetch --quiet
        Invoke-RepoGit push
    }

    $target = "$VpsUser@$VpsHost"
    $remoteCommand = "sudo -u deploy /srv/deploy/bin/deploy-site $Project"

    & ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=15 $target $remoteCommand
    if ($LASTEXITCODE -ne 0) { throw "Remote VPS deploy failed." }

    $pruneScript = "/srv/deploy/projects/$Project/repo/deploy/prune-beget-backups.sh"
    & ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=20 $target "chmod +x $pruneScript 2>/dev/null; sudo -u deploy bash $pruneScript 2"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Backup prune failed; check hosting disk manually." }

    $localVideos = Join-Path $RepoRoot "obuchenie\site\videos"
    if (Test-Path $localVideos) {
        $uploadDir = "/srv/deploy/projects/$Project/video-upload"
        & ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=20 $target "rm -rf $uploadDir && mkdir -p $uploadDir && chown -R deploy:deploy $uploadDir"
        & scp -i $IdentityFile -o BatchMode=yes -r $localVideos "${target}:$uploadDir/"
        if ($LASTEXITCODE -ne 0) { throw "Video upload to VPS failed." }
        & ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=20 $target "chown -R deploy:deploy $uploadDir"

        $videoSync = @(
            "sudo -u deploy rsync -az $uploadDir/videos/",
            "mrpuffch@mrpuffch.beget.tech:/home/m/mrpuffch/nostradamus-1503.ru/public_html/obuchenie/videos/"
        ) -join " "
        & ssh -i $IdentityFile -o BatchMode=yes -o ConnectTimeout=120 $target $videoSync
        if ($LASTEXITCODE -ne 0) { throw "Video sync to BeGet failed." }
    }
}
finally {
    Pop-Location
}
