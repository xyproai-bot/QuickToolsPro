Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Re-launch as admin if not already elevated
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" -Verb RunAs
    exit
}

[System.Windows.Forms.Application]::EnableVisualStyles()

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcFolder  = Join-Path $scriptDir "com.xcmotion.quicktoolpro"
$destParent = "C:\Program Files\Common Files\Adobe\CEP\extensions"
$destFolder = Join-Path $destParent "com.xcmotion.quicktoolpro"

# ── Colors ────────────────────────────────────────────────────
$colorAccent     = [System.Drawing.Color]::FromArgb(255, 75, 75)    # QTP red
$colorAccentHov  = [System.Drawing.Color]::FromArgb(230, 60, 60)
$colorBgDark     = [System.Drawing.Color]::FromArgb(20, 20, 20)
$colorBgPanel    = [System.Drawing.Color]::FromArgb(29, 29, 29)
$colorBgHeader   = [System.Drawing.Color]::FromArgb(14, 14, 14)
$colorBorder     = [System.Drawing.Color]::FromArgb(42, 42, 42)
$colorTextWhite  = [System.Drawing.Color]::White
$colorTextDim    = [System.Drawing.Color]::FromArgb(140, 140, 140)
$colorTextMuted  = [System.Drawing.Color]::FromArgb(90, 90, 90)
$colorSuccess    = [System.Drawing.Color]::FromArgb(80, 200, 120)
$colorError      = [System.Drawing.Color]::FromArgb(220, 80, 80)

# ── Fonts ─────────────────────────────────────────────────────
$fontTitle    = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$fontSubtitle = New-Object System.Drawing.Font("Segoe UI", 9)
$fontHeading  = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$fontBody     = New-Object System.Drawing.Font("Segoe UI", 9)
$fontTiny     = New-Object System.Drawing.Font("Segoe UI", 8)
$fontButton   = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fontLogo     = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)

# ── Window ────────────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.Text            = "Quick Tools Pro 2.0"
$form.Size            = New-Object System.Drawing.Size(520, 420)
$form.StartPosition   = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox     = $false
$form.MinimizeBox     = $false
$form.BackColor       = $colorBgDark

# ── Header Panel (with logo + title) ──────────────────────────
$header = New-Object System.Windows.Forms.Panel
$header.Location  = New-Object System.Drawing.Point(0, 0)
$header.Size      = New-Object System.Drawing.Size(520, 110)
$header.BackColor = $colorBgHeader
$form.Controls.Add($header)

# Logo box (red square with X)
$logoBox = New-Object System.Windows.Forms.Label
$logoBox.Location  = New-Object System.Drawing.Point(24, 22)
$logoBox.Size      = New-Object System.Drawing.Size(64, 64)
$logoBox.BackColor = $colorAccent
$logoBox.ForeColor = $colorTextWhite
$logoBox.Font      = $fontLogo
$logoBox.Text      = "X"
$logoBox.TextAlign = "MiddleCenter"
$header.Controls.Add($logoBox)

# Title
$titleLbl = New-Object System.Windows.Forms.Label
$titleLbl.Text      = "Quick Tools Pro 2.0"
$titleLbl.Font      = $fontTitle
$titleLbl.ForeColor = $colorTextWhite
$titleLbl.Location  = New-Object System.Drawing.Point(108, 28)
$titleLbl.Size      = New-Object System.Drawing.Size(380, 32)
$titleLbl.BackColor = $colorBgHeader
$header.Controls.Add($titleLbl)

# Subtitle
$subLbl = New-Object System.Windows.Forms.Label
$subLbl.Text      = "After Effects extension by Xavier Chu"
$subLbl.Font      = $fontSubtitle
$subLbl.ForeColor = $colorTextDim
$subLbl.Location  = New-Object System.Drawing.Point(110, 64)
$subLbl.Size      = New-Object System.Drawing.Size(380, 20)
$subLbl.BackColor = $colorBgHeader
$header.Controls.Add($subLbl)

# Bottom border of header
$headerLine = New-Object System.Windows.Forms.Label
$headerLine.BackColor = $colorAccent
$headerLine.Location  = New-Object System.Drawing.Point(0, 108)
$headerLine.Size      = New-Object System.Drawing.Size(520, 2)
$header.Controls.Add($headerLine)

# ── Body Panel ────────────────────────────────────────────────
$body = New-Object System.Windows.Forms.Panel
$body.Location  = New-Object System.Drawing.Point(0, 110)
$body.Size      = New-Object System.Drawing.Size(520, 240)
$body.BackColor = $colorBgDark
$form.Controls.Add($body)

# Section heading
$sectHead = New-Object System.Windows.Forms.Label
$sectHead.Text      = "INSTALL LOCATION"
$sectHead.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$sectHead.ForeColor = $colorTextDim
$sectHead.Location  = New-Object System.Drawing.Point(28, 24)
$sectHead.Size      = New-Object System.Drawing.Size(460, 16)
$sectHead.BackColor = $colorBgDark
$body.Controls.Add($sectHead)

# Install path display (with red left border feel)
$pathPanel = New-Object System.Windows.Forms.Panel
$pathPanel.Location  = New-Object System.Drawing.Point(28, 44)
$pathPanel.Size      = New-Object System.Drawing.Size(464, 38)
$pathPanel.BackColor = $colorBgPanel
$body.Controls.Add($pathPanel)

$pathAccent = New-Object System.Windows.Forms.Label
$pathAccent.BackColor = $colorAccent
$pathAccent.Location  = New-Object System.Drawing.Point(0, 0)
$pathAccent.Size      = New-Object System.Drawing.Size(3, 38)
$pathPanel.Controls.Add($pathAccent)

$pathLbl = New-Object System.Windows.Forms.Label
$pathLbl.Text      = "C:\Program Files\Common Files\Adobe\CEP\extensions\com.xcmotion.quicktoolpro"
$pathLbl.Font      = $fontTiny
$pathLbl.ForeColor = $colorTextDim
$pathLbl.Location  = New-Object System.Drawing.Point(14, 11)
$pathLbl.Size      = New-Object System.Drawing.Size(440, 16)
$pathLbl.BackColor = $colorBgPanel
$pathPanel.Controls.Add($pathLbl)

# Status section heading
$statusHead = New-Object System.Windows.Forms.Label
$statusHead.Text      = "STATUS"
$statusHead.Font      = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$statusHead.ForeColor = $colorTextDim
$statusHead.Location  = New-Object System.Drawing.Point(28, 100)
$statusHead.Size      = New-Object System.Drawing.Size(460, 16)
$statusHead.BackColor = $colorBgDark
$body.Controls.Add($statusHead)

# Status text
$status = New-Object System.Windows.Forms.Label
$status.Text      = "Ready to install. Click Install to begin."
$status.Font      = $fontBody
$status.ForeColor = $colorTextWhite
$status.Location  = New-Object System.Drawing.Point(28, 120)
$status.Size      = New-Object System.Drawing.Size(464, 60)
$status.BackColor = $colorBgDark
$body.Controls.Add($status)

# Progress bar
$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(28, 188)
$progress.Size     = New-Object System.Drawing.Size(464, 8)
$progress.Style    = "Continuous"
$progress.Value    = 0
$progress.ForeColor = $colorAccent
$body.Controls.Add($progress)

# ── Footer with buttons ───────────────────────────────────────
$footer = New-Object System.Windows.Forms.Panel
$footer.Location  = New-Object System.Drawing.Point(0, 350)
$footer.Size      = New-Object System.Drawing.Size(520, 60)
$footer.BackColor = $colorBgHeader
$form.Controls.Add($footer)

# Install button (red, prominent)
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text      = "Install"
$btnInstall.Font      = $fontButton
$btnInstall.Location  = New-Object System.Drawing.Point(296, 12)
$btnInstall.Size      = New-Object System.Drawing.Size(110, 36)
$btnInstall.BackColor = $colorAccent
$btnInstall.ForeColor = $colorTextWhite
$btnInstall.FlatStyle = "Flat"
$btnInstall.FlatAppearance.BorderSize = 0
$btnInstall.Cursor    = "Hand"
$btnInstall.Add_MouseEnter({ $btnInstall.BackColor = $colorAccentHov })
$btnInstall.Add_MouseLeave({ $btnInstall.BackColor = $colorAccent })
$footer.Controls.Add($btnInstall)

# Cancel button
$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text      = "Cancel"
$btnCancel.Font      = New-Object System.Drawing.Font("Segoe UI", 10)
$btnCancel.Location  = New-Object System.Drawing.Point(412, 12)
$btnCancel.Size      = New-Object System.Drawing.Size(80, 36)
$btnCancel.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
$btnCancel.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
$btnCancel.FlatStyle = "Flat"
$btnCancel.FlatAppearance.BorderSize = 0
$btnCancel.Cursor    = "Hand"
$btnCancel.Add_Click({ $form.Close() })
$footer.Controls.Add($btnCancel)

# ── Install logic ─────────────────────────────────────────────
$btnInstall.Add_Click({
    $btnInstall.Enabled = $false
    $btnCancel.Enabled  = $false

    # Check source
    if (-not (Test-Path $srcFolder)) {
        $status.Text      = "Error: Extension files not found." + [Environment]::NewLine + "Make sure Install.ps1 is next to the 'com.xcmotion.quicktoolpro' folder."
        $status.ForeColor = $colorError
        $btnCancel.Enabled = $true
        return
    }

    $status.Text      = "Installing..."
    $status.ForeColor = $colorTextWhite
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

    # Step 4 — Done
    $progress.Value = 100
    $status.Text      = "Installed successfully!" + [Environment]::NewLine + [Environment]::NewLine + "Restart After Effects, then go to:" + [Environment]::NewLine + "Window > Extensions > Quick Tool Pro 2.0"
    $status.ForeColor = $colorSuccess
    $btnInstall.Text   = "Done"
    $btnInstall.BackColor = $colorSuccess
    $btnCancel.Text    = "Close"
    $btnCancel.Enabled = $true
})

$form.ShowDialog() | Out-Null
