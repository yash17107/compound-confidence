# Renders public/icon.svg and public/logo.svg to the PNG icons with headless Edge.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root "public"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$work = Join-Path $env:TEMP "cc-icons"
New-Item -ItemType Directory -Force -Path $work | Out-Null

$icon = Get-Content -Raw -Encoding UTF8 (Join-Path $public "icon.svg")
$logo = Get-Content -Raw -Encoding UTF8 (Join-Path $public "logo.svg")
# Maskable icons get a full-bleed background and the mark shrunk into the 80% safe zone.
$maskable = $icon -replace 'rx="112"', 'rx="0"' -replace '<g fill="#ffffff">', '<g transform="translate(51 51) scale(0.8)"><g fill="#ffffff">' -replace '</svg>', '</g></svg>'
$jobs = @(
  @{ svg = $icon; size = 512; out = "icon-512.png" },
  @{ svg = $icon; size = 192; out = "icon-192.png" },
  @{ svg = $icon; size = 180; out = "apple-touch-icon.png" },
  @{ svg = $maskable; size = 512; out = "icon-maskable-512.png" },
  @{ svg = $logo; size = 0; out = "logo.png" }
)

foreach ($job in $jobs) {
  $w = if ($job.size) { $job.size } else { 980 }
  $h = if ($job.size) { $job.size } else { 360 }
  $html = "<!doctype html><html><head><meta charset=`"utf-8`"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:${w}px;height:${h}px}</style></head><body>$($job.svg)</body></html>"
  $page = Join-Path $work ($job.out + ".html")
  Set-Content -Path $page -Value $html -Encoding UTF8
  $target = Join-Path $public $job.out
  $args = @(
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
    "--window-size=$w,$h", "--screenshot=`"$target`"", "`"file:///$($page -replace '\\','/')`""
  )
  Start-Process -FilePath $edge -ArgumentList $args -Wait -WindowStyle Hidden
  Write-Output "$($job.out) $w x $h"
}
