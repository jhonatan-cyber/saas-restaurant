# ── Desarrollo Local: SaaS Restaurant ──────────────────────────────────
# Requiere: MySQL 8 y Redis 7 instalados y corriendo localmente
#
# Uso:
#   .\scripts\dev.ps1          # Arranca API + Admin
#   .\scripts\dev.ps1 -api     # Solo API
#   .\scripts\dev.ps1 -admin   # Solo Admin
# ────────────────────────────────────────────────────────────────────────

param(
  [switch]$api,
  [switch]$admin
)

$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

# Si no se especifica, arrancar ambos
$startApi = (-not $api -and -not $admin) -or $api
$startAdmin = (-not $api -and -not $admin) -or $admin

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor DarkYellow
Write-Host "║   SaaS Restaurant — Desarrollo Local     ║" -ForegroundColor DarkYellow
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor DarkYellow
Write-Host ""

# ── Verificar MySQL y Redis local ───────────────────────────────────────
try {
  $mysqlOk = $false
  $redisOk = $false

  # Intentar conectar a MySQL via el cliente mysqladmin
  $mysqlTest = & "mysqladmin" "ping" "-h" "localhost" "-u" "root" "-prootpass" "--silent" 2>$null
  if ($LASTEXITCODE -eq 0) { $mysqlOk = $true }

  # Intentar conectar a Redis via redis-cli
  $redisTest = & "redis-cli" "-h" "localhost" "-p" "6379" "PING" 2>$null
  if ($redisTest -eq "PONG") { $redisOk = $true }

  if (-not $mysqlOk) {
    Write-Host "⚠️  MySQL no responde en localhost:3306. Verificá que esté corriendo." -ForegroundColor Yellow
    Write-Host "   Puede iniciarlo con: net start MySQL80 (Windows) o mysql.server start (Mac)" -ForegroundColor Gray
  } else {
    Write-Host "✅ MySQL está corriendo en localhost:3306" -ForegroundColor Green
  }

  if (-not $redisOk) {
    Write-Host "⚠️  Redis no responde en localhost:6379. Verificá que esté corriendo." -ForegroundColor Yellow
    Write-Host "   Puede iniciarlo con: redis-server (si está instalado localmente)" -ForegroundColor Gray
  } else {
    Write-Host "✅ Redis está corriendo en localhost:6379" -ForegroundColor Green
  }
} catch {
  Write-Host "⚠️  No se pudieron verificar los servicios. Asegurate de que MySQL y Redis estén corriendo." -ForegroundColor Yellow
}
Write-Host ""

# ── Arrancar API ───────────────────────────────────────────────────────
if ($startApi) {
  Write-Host "🚀 Arrancando API (http://localhost:3001) con hot-reload..." -ForegroundColor Cyan
  $apiJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir/api"
    $env:DATABASE_URL = "mysql://root:rootpass@localhost:3306/saas_restaurant"
    $env:REDIS_URL = "redis://localhost:6379"
    $env:NODE_ENV = "development"
    $env:JWT_SECRET = "dev-jwt-secret-key-change-in-production-but-ok-for-local"
    $env:JWT_REFRESH_SECRET = "dev-jwt-refresh-secret-key-change-in-production"
    $env:CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173"
    $env:API_PORT = "3001"
    $env:LOG_LEVEL = "debug"
    bunx tsx watch src/main.ts
  } -ArgumentList $rootDir
  Write-Host "   PID del job: $($apiJob.Id)" -ForegroundColor Gray
}

# ── Arrancar Admin ─────────────────────────────────────────────────────
if ($startAdmin) {
  Write-Host "🚀 Arrancando Admin (http://localhost:3000/app) con HMR..." -ForegroundColor Cyan
  $adminJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir/admin"
    bun run dev
  } -ArgumentList $rootDir
  Write-Host "   PID del job: $($adminJob.Id)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Servicios disponibles:                  ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║   Admin: http://localhost:3000/app/login  ║" -ForegroundColor Green
Write-Host "║   API:   http://localhost:3001/api        ║" -ForegroundColor Green
Write-Host "║   Swagger: http://localhost:3001/docs     ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║   Presiona Ctrl+C para detener            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green

# Mantener el script vivo
try {
  while ($true) {
    Start-Sleep -Seconds 10
    if ($startApi) { Receive-Job $apiJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 3 }
    if ($startAdmin) { Receive-Job $adminJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 3 }
  }
} finally {
  Write-Host "`n⏹  Deteniendo servicios..." -ForegroundColor Yellow
  if ($startApi) { Stop-Job $apiJob -ErrorAction SilentlyContinue; Remove-Job $apiJob -ErrorAction SilentlyContinue }
  if ($startAdmin) { Stop-Job $adminJob -ErrorAction SilentlyContinue; Remove-Job $adminJob -ErrorAction SilentlyContinue }
  Write-Host "✅ Servicios detenidos" -ForegroundColor Green
}
