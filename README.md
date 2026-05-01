# Quick Tools Pro 2.0

A comprehensive After Effects extension with 50+ quick-access tools for motion graphics, animation, and project management.

Developed by **Xavier Chu**

---

## 📥 Download

| Platform | Download | Size |
|----------|----------|------|
| **Windows** | [⬇ QuickToolsPro-Setup.exe](https://github.com/xyproai-bot/QuickToolsPro/releases/latest/download/QuickToolsPro-Setup.exe) | ~2.2 MB |
| **macOS** | [⬇ QuickToolsPro-Mac.tar.gz](https://github.com/xyproai-bot/QuickToolsPro/releases/latest/download/QuickToolsPro-Mac.tar.gz) | ~660 KB |

> All releases: [github.com/xyproai-bot/QuickToolsPro/releases](https://github.com/xyproai-bot/QuickToolsPro/releases)

---

## 🪟 Windows Install

1. Download **QuickToolsPro-Setup.exe**
2. Double-click the installer
3. If Windows SmartScreen shows a warning, click **More info → Run anyway**
   *(the installer is unsigned; this is normal for free / open-source tools)*
4. Click **Yes** on the UAC (admin) prompt
5. Follow the wizard: **Next → Install → Finish**
6. Restart After Effects
7. Open: **Window → Extensions → Quick Tool Pro 2.0**

**Requirements:** Windows 10 / 11, After Effects 2022 or later

---

## 🍎 macOS Install

1. Download **QuickToolsPro-Mac.tar.gz**
2. Double-click to extract (Mac handles `.tar.gz` automatically)
3. Open the extracted **QuickToolsPro-Mac** folder
4. **Right-click** `Install-Mac.command` → **Open** → **Open anyway**
   *(macOS Gatekeeper blocks unsigned scripts on first run; right-click bypasses it)*
5. Choose install type:
   - **1) User only** — no admin needed (recommended)
   - **2) System-wide** — requires password
6. Restart After Effects
7. Open: **Window → Extensions → Quick Tool Pro 2.0**

**If `Install-Mac.command` won't run at all** (some Macs strip the executable bit):

Open Terminal and run:
```bash
chmod +x ~/Downloads/QuickToolsPro-Mac/Install-Mac.command
```
Then double-click `Install-Mac.command` again.

**Requirements:** macOS 10.15+, After Effects 2022 or later

---

## ✨ Features

### Layer Tools
- **Set Anchor / Null** — 9-point anchor positioning with mode selection
- **Parent / Set Null / Set Anchor** — quick rigging tools
- **Smart Precomp** — precompose keeping position, auto-named
- **Un-Precomp / DUP-Comp** — comp manipulation
- **Scale Fit** — Contain / Cover / Fill modes

### Animation Tools
- **Wiggle Controller** — slider-based wiggle setup
- **Overshoot / Bounce** — physics-based animation effects
- **Effector** — control effector for any property
- **Ani-Marker** — keyframe markers with null control
- **Randomize** — randomize property values
- **Stagger** — Forward / Backward / Center / Random

### Graph Editor
- **Ease Copy / Paste** — speed and influence transfer
- **Influence sliders** — Ease In / Out / Both
- **Speed control** (px/s)
- **Temporal modes** — Linear, Hold, Auto Bezier, Easy Ease, etc.

### Path & Shape Tools
- **Select / Control / Motion Path**
- **Merge / Split** shapes

### Time Remap
- **reMap / delete** — quick time remapping
- **Loop modes** — OFF / loop OUT / loop IN
- **Loop types** — cycle / ping-pong

### Project Utilities
- **Purge** all caches
- **Sort** project items into folders by type
- **Collect** all footage to a folder (with progress)
- **Reduce** project to selected comps
- **Relink** missing footage by filename
- **Stats** — comps, footage, missing items, file size
- **Find & Replace** in all expressions

### Label Tools
- **Save / Select / Enable-Disable** by label
- **Color Control** for label-based grouping

### Other
- 5 color themes (Red / Green / Blue / Yellow / Pink)
- UI scaling (+/-)
- Persistent settings
- Smart tooltips with detailed info

---

## 🔧 Manual Install (Developer)

If you want to install from source:

```
Windows: Copy this repo to
  C:\Program Files\Common Files\Adobe\CEP\extensions\com.xcmotion.quicktoolpro

macOS: Copy this repo to
  ~/Library/Application Support/Adobe/CEP/extensions/com.xcmotion.quicktoolpro
```

Then restart After Effects.

---

## 🐛 Troubleshooting

**Extension not showing up?**

1. Fully quit and relaunch After Effects (not just close the panel)
2. Make sure the extension folder exists at the install location

**For older AE versions (2019–2021):**

Windows (PowerShell as Admin):
```powershell
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

macOS (Terminal):
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

Then restart AE.

---

## 📝 License

MIT License — see [LICENSE](LICENSE) file.

---

## 📧 Contact

Xavier Chu — xc232192@gmail.com

© 2025 Xavier Chu
