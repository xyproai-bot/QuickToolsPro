$src  = "$env:APPDATA\Adobe\CEP\extensions\com.xcmotion.quicktoolpro-Develop"
$dest = "C:\Program Files\Common Files\Adobe\CEP\extensions\com.xcmotion.quicktoolpro"

if (Test-Path $dest) {
    Remove-Item -LiteralPath $dest -Recurse -Force
}
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force
Write-Host "Installed to: $dest"
