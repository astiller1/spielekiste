<#
  Erzeugt die Sprachaufnahmen fuer "Die Wort-Insel" mit ElevenLabs.

  1) Stimmen anzeigen:   .\stimmen-erzeugen.ps1 -ListVoices
  2) Aufnahmen erzeugen: .\stimmen-erzeugen.ps1 -VoiceId <ID>

  Der API-Schluessel kommt aus $env:ELEVENLABS_API_KEY, aus der Datei
  ../../../wort-insel/elevenlabs.key (ausserhalb des Repos), oder wird abgefragt. Vorhandene Dateien in .\audio werden uebersprungen,
  eigene Aufnahmen (z. B. s_SCH.m4a) bleiben also erhalten. -Force erzeugt alles neu.
#>
param(
  [string]$VoiceId,
  [switch]$ListVoices,
  [string]$Model = "eleven_turbo_v2_5",
  [double]$Stability = 0.45,
  [switch]$Force
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $here "../../docs/spiele/wort-insel/audio"

function Write-Manifest {
  # listet alle Audiodateien im Ordner, auch selbst aufgenommene
  New-Item -ItemType Directory -Force $outDir | Out-Null
  $files = Get-ChildItem $outDir -File | Where-Object { $_.Extension -in ".mp3", ".m4a", ".wav", ".ogg" }
  $entries = $files | ForEach-Object { '"{0}":"{1}"' -f $_.BaseName, $_.Name }
  $json = '{"clips":{' + ($entries -join ",") + '}}'
  [IO.File]::WriteAllText((Join-Path $outDir "manifest.json"), $json, (New-Object Text.UTF8Encoding($false)))
  Write-Host ("manifest.json: {0} Dateien" -f @($files).Count)
}

$apiKey = $env:ELEVENLABS_API_KEY
$keyFile = Join-Path $here "../../../wort-insel/elevenlabs.key"
if (-not $apiKey -and (Test-Path $keyFile)) { $apiKey = (Get-Content $keyFile -Raw).Trim() }
if (-not $apiKey) {
  $sec = Read-Host "ElevenLabs API-Schluessel (wird nicht gespeichert)" -AsSecureString
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
$headers = @{ "xi-api-key" = $apiKey }

if ($ListVoices) {
  $res = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/voices" -Headers $headers
  $res.voices | Sort-Object name | ForEach-Object {
    "{0,-32} {1}   {2} {3}" -f $_.name, $_.voice_id, $_.labels.gender, $_.labels.accent
  }
  return
}
if (-not $VoiceId) {
  Write-Host "Bitte -VoiceId angeben. Stimmen anzeigen mit: .\stimmen-erzeugen.ps1 -ListVoices"
  exit 1
}

$clips = Get-Content (Join-Path $here "clips.json") -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force $outDir | Out-Null
$i = 0; $made = 0; $failed = 0
foreach ($c in $clips) {
  $i++
  $existing = Get-ChildItem $outDir -File -Filter ($c.key + ".*") -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $c.key }
  if ($existing -and -not $Force) { continue }
  $file = Join-Path $outDir ($c.key + ".mp3")
  Write-Host ("[{0}/{1}] {2}: {3}" -f $i, $clips.Count, $c.key, $c.text)
  $body = @{
    text = $c.text
    model_id = $Model
    language_code = "de"
    voice_settings = @{ stability = $Stability; similarity_boost = 0.8 }
  } | ConvertTo-Json -Depth 4
  try {
    Invoke-WebRequest -Uri ("https://api.elevenlabs.io/v1/text-to-speech/{0}?output_format=mp3_44100_128" -f $VoiceId) `
      -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" `
      -Body ([Text.Encoding]::UTF8.GetBytes($body)) -OutFile $file -UseBasicParsing
    $made++
  } catch {
    $failed++
    Write-Warning ("Fehler bei {0}: {1}" -f $c.key, $_.Exception.Message)
    if (Test-Path $file) { Remove-Item $file -Force }
  }
}
Write-Host ("Fertig: {0} neu erzeugt, {1} Fehler." -f $made, $failed)
Write-Manifest
