param(
    [int]$Port = 8081,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Get-ListeningPidsByPort([int]$p) {
    # netstat output is stable on Windows PowerShell 5.1
    $lines = netstat -ano | Select-String (":$p")
    $pids = @()

    foreach ($line in $lines) {
        $text = ($line.ToString() -replace "\s+", " ").Trim()
        # We only care about LISTENING sockets.
        if ($text -notmatch " LISTENING ") { continue }
        $parts = $text.Split(' ')
        if ($parts.Length -lt 5) { continue }
        $pid = $parts[-1]
        if ($pid -match "^\d+$") { $pids += [int]$pid }
    }

    $pids | Sort-Object -Unique
}

$pids = Get-ListeningPidsByPort -p $Port

if (-not $pids -or $pids.Count -eq 0) {
    Write-Host "No process is LISTENING on port $Port."
    exit 0
}

Write-Host "Found PID(s) listening on port ${Port}: $($pids -join ', ')"

foreach ($pid in $pids) {
    try {
        $proc = Get-Process -Id $pid -ErrorAction Stop
        Write-Host "- PID $pid -> $($proc.ProcessName)"
    } catch {
        Write-Host "- PID $pid -> (process info not available)"
    }
}

if (-not $Force) {
    $answer = Read-Host "Kill these PID(s)? Type YES to confirm"
    if ($answer -ne 'YES') {
        Write-Host "Aborted."
        exit 1
    }
}

foreach ($pid in $pids) {
    try {
        Stop-Process -Id $pid -Force
        Write-Host "Killed PID $pid."
    } catch {
        Write-Host "Failed to kill PID ${pid}: $($_.Exception.Message)"
    }
}

Start-Sleep -Milliseconds 300
$pidsAfter = Get-ListeningPidsByPort -p $Port
if ($pidsAfter.Count -eq 0) {
    Write-Host "Port $Port is now free."
    exit 0
}

Write-Host "Warning: port $Port still has listener PID(s): $($pidsAfter -join ', ')"
exit 2
