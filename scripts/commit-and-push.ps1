param(
  [Parameter(Mandatory = $false)]
  [string]$Message,

  [Parameter(Mandatory = $false)]
  [switch]$AllowSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info($text) {
  Write-Host "[commit-and-push] $text"
}

function Fail($text) {
  Write-Error "[commit-and-push] $text"
  exit 1
}

function Get-AutoCommitMessage {
  $changes = git diff --cached --name-status
  if (-not $changes) {
    return @{
      Subject = "chore: update " + (Get-Date -Format "yyyy-MM-dd HH:mm")
      Body = ""
    }
  }

  $added = 0
  $modified = 0
  $deleted = 0
  $renamed = 0
  $total = 0
  $lines = @()

  foreach ($line in $changes) {
    if (-not $line) { continue }
    $parts = $line.Split("`t")
    $status = $parts[0]
    switch -Regex ($status) {
      "^A" {
        $added++; $total++
        if ($parts.Count -ge 2) { $lines += ("A  " + $parts[1]) }
        break
      }
      "^M" {
        $modified++; $total++
        if ($parts.Count -ge 2) { $lines += ("M  " + $parts[1]) }
        break
      }
      "^D" {
        $deleted++; $total++
        if ($parts.Count -ge 2) { $lines += ("D  " + $parts[1]) }
        break
      }
      "^R" {
        $renamed++; $total++
        if ($parts.Count -ge 3) {
          $lines += ("R  " + $parts[1] + " -> " + $parts[2])
        } else {
          $lines += ("R  " + (($parts | Select-Object -Skip 1) -join " -> "))
        }
        break
      }
      default {
        $total++
        if ($parts.Count -ge 2) { $lines += ($status + "  " + $parts[1]) }
        break
      }
    }
  }

  $parts = @()
  if ($added -gt 0) { $parts += "A:$added" }
  if ($modified -gt 0) { $parts += "M:$modified" }
  if ($deleted -gt 0) { $parts += "D:$deleted" }
  if ($renamed -gt 0) { $parts += "R:$renamed" }

  $details = if ($parts.Count -gt 0) { " (" + ($parts -join " ") + ")" } else { "" }
  $subject = "chore: update $total file(s)$details"

  $bodyLines = @()
  $bodyLines += "Summary: $total file(s) changed$details"
  $bodyLines += "Generated: " + (Get-Date -Format "yyyy-MM-dd HH:mm")
  $bodyLines += ""
  $bodyLines += "Files:"
  if ($lines.Count -gt 0) {
    $bodyLines += $lines
  } else {
    $bodyLines += "(no detailed file list available)"
  }

  return @{
    Subject = $subject
    Body = ($bodyLines -join "`n")
  }
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "Not inside a git repository."
}

if (-not $AllowSecrets) {
  $blocked = @(".env", ".env.local", ".env.*", "credentials.json", "secrets.json")
  $blockedMatch = git status --porcelain | ForEach-Object {
    $path = $_.Substring(3)
    foreach ($pattern in $blocked) {
      if ($path -like $pattern) { return $path }
    }
    return $null
  } | Where-Object { $_ }

  if ($blockedMatch) {
    Fail ("Refusing to commit potential secrets: " + ($blockedMatch -join ", ") +
      ". Re-run with -AllowSecrets if you really want this.")
  }
}

Write-Info "Staging all changes..."
git add -A
if ($LASTEXITCODE -ne 0) { Fail "git add failed." }

$status = git status --porcelain
if (-not $status) {
  Write-Info "No changes to commit."
  exit 0
}

if (-not $Message) {
  $auto = Get-AutoCommitMessage
  $Message = $auto.Subject
  $MessageBody = $auto.Body
}

Write-Info "Using commit message: $Message"

Write-Info "Creating commit..."
if ($MessageBody) {
  git commit -m $Message -m $MessageBody
} else {
  git commit -m $Message
}
if ($LASTEXITCODE -ne 0) { Fail "git commit failed." }

Write-Info "Pushing to current branch..."
git push
if ($LASTEXITCODE -ne 0) { Fail "git push failed." }

Write-Info "Done."
