$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "obuchenie")

$wingetLinks = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links"
if (Test-Path $wingetLinks) {
    $env:Path = "$wingetLinks;$env:Path"
}

Write-Host "Installing lesson builder dependencies..."
python -m pip install -r (Join-Path $PSScriptRoot "obuchenie\lesson_builder\requirements.txt")

$ffmpegPath = python -c "import sys; sys.path.insert(0, r'$PSScriptRoot\obuchenie'); from lesson_builder.ffmpeg_util import find_binary; print(find_binary('ffmpeg') or '')"
if ($ffmpegPath) {
    $env:FFMPEG_PATH = $ffmpegPath
    Write-Host "ffmpeg: $ffmpegPath"
} else {
    Write-Host "WARNING: ffmpeg не найден. Установите: winget install Gyan.FFmpeg"
}

Write-Host ""
Write-Host "Lesson builder: http://127.0.0.1:8765"
Set-Location (Join-Path $PSScriptRoot "obuchenie")
python -m lesson_builder
