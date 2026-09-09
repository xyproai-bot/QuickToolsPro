#!/bin/bash
# Quick Tools Pro 2.0 — macOS Installer

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/com.xcmotion.quicktoolpro"
DEST_SYSTEM="/Library/Application Support/Adobe/CEP/extensions/com.xcmotion.quicktoolpro"
DEST_USER="$HOME/Library/Application Support/Adobe/CEP/extensions/com.xcmotion.quicktoolpro"

echo ""
echo "========================================"
echo "  Quick Tools Pro 2.0 — macOS Installer"
echo "========================================"
echo ""

# Check source exists
if [ ! -d "$SRC" ]; then
    echo "ERROR: Extension files not found."
    echo "Make sure this script is next to the 'com.xcmotion.quicktoolpro' folder."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Choose install location:"
echo "  1) User only      (~Library — no admin needed)"
echo "  2) System-wide    (/Library — requires admin password)"
echo ""
read -p "Enter 1 or 2 [default: 1]: " CHOICE

if [ "$CHOICE" = "2" ]; then
    DEST="$DEST_SYSTEM"
    echo ""
    echo "Installing to: $DEST"
    echo "(You may be asked for your password)"
    echo ""

    # Remove old version
    if [ -d "$DEST" ]; then
        sudo rm -rf "$DEST"
    fi

    # Create parent dir if needed
    sudo mkdir -p "$(dirname "$DEST")"

    # Copy
    sudo cp -R "$SRC" "$DEST"

    # Remove quarantine attribute (files from downloaded zips are otherwise blocked)
    sudo xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
else
    DEST="$DEST_USER"
    echo ""
    echo "Installing to: $DEST"
    echo ""

    # Remove old version
    if [ -d "$DEST" ]; then
        rm -rf "$DEST"
    fi

    # Create parent dir if needed
    mkdir -p "$(dirname "$DEST")"

    # Copy
    cp -R "$SRC" "$DEST"

    # Remove quarantine attribute (files from downloaded zips are otherwise blocked)
    xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
fi

# Enable unsigned extensions for all AE versions (CSXS 6 = CS6 ... CSXS 12 = AE 2024/2025/2026)
for v in 6 7 8 9 10 11 12; do
    defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null
done

echo ""
echo "Installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Restart After Effects"
echo "  2. Go to: Window > Extensions > Quick Tool Pro 2.0"
echo ""
read -p "Press Enter to exit..."
