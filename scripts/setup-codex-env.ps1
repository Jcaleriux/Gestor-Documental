[CmdletBinding()]
param(
    [switch]$ConfigureGitSafeDirectory,
    [switch]$CheckGhAuth
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Get-ToolStatus {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command -and $Name -eq "gh") {
        $knownGhPath = "C:\Program Files\GitHub CLI\gh.exe"
        if (Test-Path $knownGhPath) {
            $command = [pscustomobject]@{
                Source = $knownGhPath
            }
        }
    }

    if (-not $command) {
        return [pscustomobject]@{
            Name = $Name
            Found = $false
            Path = $null
            Version = $null
        }
    }

    $version = $null
    try {
        switch ($Name) {
            "node" { $version = ((& $command.Source --version) -join " ").Trim() }
            "npm" { $version = ((& $command.Source --version) -join " ").Trim() }
            "git" { $version = ((& $command.Source --version) -join " ").Trim() }
            "gh" { $version = ((& $command.Source --version) -join " ").Trim() }
            default { $version = "available" }
        }
    } catch {
        $version = "available"
    }

    return [pscustomobject]@{
        Name = $Name
        Found = $true
        Path = $command.Source
        Version = $version
    }
}

Write-Section "Proyecto"
Write-Host "Repo root: $repoRoot"
Write-Host "Agent guide: $repoRoot\\AGENTS.md"

Write-Section "Tooling"
$tools = @("git", "node", "npm", "gh") | ForEach-Object { Get-ToolStatus -Name $_ }
foreach ($tool in $tools) {
    if ($tool.Found) {
        Write-Host ("[ok] {0} -> {1} ({2})" -f $tool.Name, $tool.Path, $tool.Version)
    } else {
        Write-Host ("[missing] {0}" -f $tool.Name) -ForegroundColor Yellow
    }
}

$ghTools = @($tools | Where-Object { $_.Name -eq "gh" -and $_.Found })
if ($ghTools.Count -eq 0) {
    Write-Host "If GitHub CLI was installed recently, open a new terminal to refresh PATH." -ForegroundColor Yellow
}

Write-Section "Git"
$safeDirectories = @()
try {
    $safeDirectories = @(git config --global --get-all safe.directory 2>$null)
} catch {
    $safeDirectories = @()
}

if ($safeDirectories -contains $repoRoot) {
    Write-Host "[ok] safe.directory already includes repo root"
} elseif ($ConfigureGitSafeDirectory) {
    git config --global --add safe.directory $repoRoot
    Write-Host "[ok] Added repo root to git safe.directory"
} else {
    Write-Host "Repo root is not in git safe.directory."
    Write-Host "Run with -ConfigureGitSafeDirectory to add it automatically."
}

if ($CheckGhAuth) {
    Write-Section "GitHub CLI Auth"
    try {
        gh auth status
    } catch {
        Write-Host "gh auth status failed. Run 'gh auth login' in an interactive shell if needed." -ForegroundColor Yellow
    }
}

Write-Section "Project Notes"
Write-Host "- PostgreSQL is still configured in backend\\db\\index.js."
Write-Host "- Review docs\\convenciones_idioma_codigo.md before renaming mixed-language code."
Write-Host "- Review docs\\principios_transversales.md before changing amounts, currency, or payment flows."
Write-Host "- Frontend route-level lazy loading already exists in frontend\\src\\App.jsx."

Write-Section "Useful Commands"
Write-Host "Backend:"
Write-Host "  cd backend"
Write-Host "  npm install"
Write-Host "  npm run dev"
Write-Host "  npm test"
Write-Host ""
Write-Host "Frontend:"
Write-Host "  cd frontend"
Write-Host "  npm install"
Write-Host "  npm run build"
Write-Host "  npm test"
Write-Host ""
Write-Host "Targeted frontend checks when Node spawn hits EPERM:"
Write-Host "  node tests/hooks/useAppSession.test.js"
Write-Host "  node tests/hooks/useFacturas.test.js"
Write-Host "  node tests/facturas/facturasPageHelpers.test.js"

Write-Section "Done"
Write-Host "Environment check completed."
