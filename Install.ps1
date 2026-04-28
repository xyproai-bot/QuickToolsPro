Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Re-launch as admin if not already elevated
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
    exit
}

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcFolder  = Join-Path $scriptDir "com.xcmotion.quicktoolpro"
$destParent = "C:\Program Files\Common Files\Adobe\CEP\extensions"
$destFolder = Join-Path $destParent "com.xcmotion.quicktoolpro"

# ── Build Window ──────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.Text            = "Quick Tools Pro 2.0"
$form.Size            = New-Object System.Drawing.Size(420, 300)
$form.StartPosition   = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox     = $false
$form.MinimizeBox     = $false
$form.BackColor       = [System.Drawing.Color]::FromArgb(28, 28, 28)

# Title
$title = New-Object System.Windows.Forms.Label
$title.Text      = "Quick Tools Pro 2.0"
$title.Font      = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::White
$title.Location  = New-Object System.Drawing.Point(20, 24)
$title.Size      = New-Object System.Drawing.Size(380, 36)
$form.Controls.Add($title)

# Subtitle
$sub = New-Object System.Windows.Forms.Label
$sub.Text      = "After Effects CEP Extension"
$sub.Font      = New-Object System.Drawing.Font("Segoe UI", 9)
$sub.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 140)
$sub.Location  = New-Object System.Drawing.Point(22, 60)
$sub.Size      = New-Object System.Drawing.Size(380, 20)
$form.Controls.Add($sub)

# Install path note
$pathNote = New-Object System.Windows.Forms.Label
$pathNote.Text      = "Installing to: C:\Program Files\Common Files\Adobe\CEP\extensions"
$pathNote.Font      = New-Object System.Drawing.Font("Segoe UI", 8)
$pathNote.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 90)
$pathNote.Location  = New-Object System.Drawing.Point(22, 80)
$pathNote.Size      = New-Object System.Drawing.Size(380, 16)
$form.Controls.Add($pathNote)

# Separator
$sep = New-Object System.Windows.Forms.Label
$sep.BackColor = [System.Drawing.Color]::FromArgb(60, 60, 60)
$sep.Location  = New-Object System.Drawing.Point(20, 104)
$sep.Size      = New-Object System.Drawing.Size(380, 1)
$form.Controls.Add($sep)

# Status label
$status = New-Object System.Windows.Forms.Label
$status.Text      = "Ready to install."
$status.Font      = New-Object System.Drawing.Font("Segoe UI", 10)
$status.ForeColor = [System.Drawing.Color]::FromArgb(200, 200, 200)
$status.Location  = New-Object System.Drawing.Point(20, 120)
$status.Size      = New-Object System.Drawing.Size(380, 70)
$form.Controls.Add($status)

# Progress bar
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(20, 192)
$progress.Size     = New-Object System.Drawing.Size(380, 10)
$progress.Style    = "Continuous"
$progress.Value    = 0
$form.Controls.Add($progress)

# Install button
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text      = "Install"
$btnInstall.Font      = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnInstall.Location  = New-Object System.Drawing.Point(200, 222)
$btnInstall.Size      = New-Object System.Drawing.Size(100, 36)
$btnInstall.BackColor = [System.Drawing.Color]::FromArgb(255, 75, 75)
$btnInstall.ForeColor = [System.Drawing.Color]::White
$btnInstall.FlatStyle = "Flat"
$btnInstall.FlatAppearance.BorderSize = 0
$form.Controls.Add($btnInstall)

# Cancel button
$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text      = "Cancel"
$btnCancel.Font      = New-Object System.Drawing.Font("Segoe UI", 10)
$btnCancel.Location  = New-Object System.Drawing.Point(310, 222)
$btnCancel.Size      = New-Object System.Drawing.Size(90, 36)
$btnCancel.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
$btnCancel.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
$btnCancel.FlatStyle = "Flat"
$btnCancel.FlatAppearance.BorderSize = 0
$btnCancel.Add_Click({ $form.Close() })
$form.Controls.Add($btnCancel)

# ── Install logic ─────────────────────────────────────────────
$btnInstall.Add_Click({
    $btnInstall.Enabled = $false
    $btnCancel.Enabled  = $false

    # Check source
    if (-not (Test-Path $srcFolder)) {
        $status.Text      = "Error: Extension files not found.`nMake sure Install.ps1 is next to the 'com.xcmotion.quicktoolpro' folder."
        $status.ForeColor = [System.Drawing.Color]::FromArgb(220, 80, 80)
        $btnCancel.Enabled = $true
        return
    }

    $status.Text      = "Installing..."
    $status.ForeColor = [System.Drawing.Color]::FromArgb(200, 200, 200)
    $form.Refresh()

    # Step 1 — Remove old version
    $progress.Value = 20
    if (Test-Path $destFolder) {
        Remove-Item $destFolder -Recurse -Force
    }

    # Step 2 — Create destination
    $progress.Value = 40
    if (-not (Test-Path $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    }

    # Step 3 — Copy files
    $progress.Value = 60
    Copy-Item -Path $srcFolder -Destination $destParent -Recurse -Force

    # Step 4 — Done (no PlayerDebugMode needed for system CEP path on AE 2022+)
    $progress.Value = 100
    $status.Text      = "Installed successfully!`n`nRestart After Effects, then go to:`nWindow > Extensions > Quick Tool Pro 2.0"
    $status.ForeColor = [System.Drawing.Color]::FromArgb(80, 200, 120)
    $btnCancel.Text    = "Close"
    $btnCancel.Enabled = $true
})

$form.ShowDialog() | Out-Null
