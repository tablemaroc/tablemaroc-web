# Copia manual de Tablemaroc: base de datos y fotos, en una carpeta con fecha y hora.
# Se lanza con doble clic en "Copia Tablemaroc.cmd". No borra nada ni cambia la web: solo lee y guarda en este ordenador.
# Las claves se leen de codigo/frontend/.env.local y nunca se escriben en la copia. La copia NO va cifrada (config/backups/README.md).
param(
  [string]$Destino = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Tablemaroc-Copias'),
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\..\codigo\frontend\.env.local'),
  [switch]$SinPausa  # Para probarlo sin ventana: ni abre la carpeta ni espera a Intro.
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$PgDump = 'C:\Users\pc\tools\pgsql-17\pgsql\bin\pg_dump.exe'
$Bucket = 'fotos'
# public: contenido. auth: cuentas. storage: registro de las fotos. tablemaroc_meta: migraciones aplicadas.
$Esquemas = 'public', 'auth', 'storage', 'tablemaroc_meta'

function Leer-Env($Ruta) {
  $valores = @{}
  foreach ($linea in Get-Content -LiteralPath $Ruta -Encoding UTF8) {
    if ($linea -match '^([A-Z_]+)=(.*)$') { $valores[$Matches[1]] = $Matches[2].Trim() }
  }
  return $valores
}

# Lista recursiva: en Storage las carpetas se reconocen porque no tienen id.
function Listar-Fotos($Base, $Cabeceras, $Carpeta) {
  $offset = 0
  do {
    $cuerpo = @{ prefix = $Carpeta; limit = 1000; offset = $offset } | ConvertTo-Json
    # El ForEach-Object deshace el array: PowerShell 5.1 entrega la respuesta como un único elemento, aunque venga vacía.
    $respuesta = Invoke-RestMethod -Method Post -Uri "$Base/storage/v1/object/list/$Bucket" -Headers $Cabeceras -ContentType 'application/json' -Body $cuerpo
    $items = @($respuesta | ForEach-Object { $_ })
    foreach ($item in $items) {
      $ruta = if ($Carpeta) { "$Carpeta/$($item.name)" } else { $item.name }
      if ($item.id) { $ruta } else { Listar-Fotos $Base $Cabeceras $ruta }
    }
    $offset += $items.Count
  } while ($items.Count -eq 1000)
}

try {
  Write-Host ''
  Write-Host '=== Copia de Tablemaroc ===' -ForegroundColor Green
  if (-not (Test-Path -LiteralPath $PgDump)) { throw "No encuentro pg_dump 17 en $PgDump" }
  if (-not (Test-Path -LiteralPath $EnvFile)) { throw "No encuentro el archivo de claves .env.local" }
  $cfg = Leer-Env $EnvFile
  foreach ($k in 'DATABASE_URL', 'DATABASE_PASSWORD', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY') {
    if (-not $cfg[$k]) { throw "Falta $k en .env.local" }
  }

  $sello = Get-Date -Format 'yyyy-MM-dd_HH-mm'
  $carpeta = Join-Path $Destino $sello
  if (Test-Path -LiteralPath $carpeta) { throw "Ya existe una copia de este minuto: espera un minuto y repite." }
  $null = New-Item -ItemType Directory -Path (Join-Path $carpeta 'fotos') -Force

  Write-Host '1/2  Copiando la base de datos...'
  $archivo = Join-Path $carpeta "tablemaroc-base-$sello.dump"
  $argumentos = @('--format=custom', '--no-owner', '--no-privileges', "--file=$archivo", "--dbname=$($cfg['DATABASE_URL'])")
  foreach ($e in $Esquemas) { $argumentos += "--schema=$e" }
  $env:PGPASSWORD = $cfg['DATABASE_PASSWORD']
  # pg_dump escribe avisos normales en la salida de errores: solo cuenta su código de salida.
  $ErrorActionPreference = 'Continue'
  & $PgDump @argumentos 2>&1 | Where-Object { "$_".Trim() } | ForEach-Object { Write-Host "     $_" }
  $codigo = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  Remove-Item Env:PGPASSWORD
  if ($codigo -ne 0) { throw "pg_dump terminó con el código $codigo" }
  $tamano = (Get-Item -LiteralPath $archivo).Length
  if ($tamano -lt 1024) { throw 'La copia de la base ha salido vacía.' }

  Write-Host '2/2  Copiando las fotos...'
  $base = $cfg['NEXT_PUBLIC_SUPABASE_URL'].TrimEnd('/')
  $cabeceras = @{ apikey = $cfg['SUPABASE_SERVICE_ROLE_KEY']; Authorization = "Bearer $($cfg['SUPABASE_SERVICE_ROLE_KEY'])" }
  $fotos = @(Listar-Fotos $base $cabeceras '')
  $n = 0
  foreach ($ruta in $fotos) {
    $n++
    Write-Host "     $n de $($fotos.Count)"
    $local = Join-Path (Join-Path $carpeta 'fotos') ($ruta -replace '/', '\')
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $local) -Force
    $url = "$base/storage/v1/object/$Bucket/" + (($ruta -split '/' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/')
    Invoke-WebRequest -Uri $url -Headers $cabeceras -OutFile $local -UseBasicParsing
  }

  @(
    "Copia de Tablemaroc"
    "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    "Base de datos: tablemaroc-base-$sello.dump ($([math]::Round($tamano / 1KB)) KB)"
    "Fotos: $($fotos.Count)"
    "Sin cifrar: contiene emails y reseñas. No la compartas."
    "Para restaurar: config/backups/README.md (siempre primero en una base de pruebas)."
  ) | Set-Content -LiteralPath (Join-Path $carpeta 'LEEME.txt') -Encoding UTF8

  Write-Host ''
  Write-Host "Copia terminada: $carpeta" -ForegroundColor Green
  Write-Host "Base: $([math]::Round($tamano / 1KB)) KB   Fotos: $($fotos.Count)"
  if (-not $SinPausa) { Start-Process explorer.exe $carpeta }
} catch {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host "LA COPIA HA FALLADO: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'No des por buena la carpeta de esta copia.' -ForegroundColor Red
}
Write-Host ''
if (-not $SinPausa) { Read-Host 'Pulsa Intro para cerrar' }
