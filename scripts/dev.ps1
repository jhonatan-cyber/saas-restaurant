# ── Desarrollo Local: SaaS Restaurant ──────────────────────────────────
# Requiere: MySQL y Redis corriendo en Docker
#   docker compose up -d mysql redis phpmyadmin
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

# ── Verificar MySQL y Redis en Docker ──────────────────────────────────
$mysqlRunning = docker compose -f "$rootDir/docker-compose.yml" ps --format json mysql 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty State
$redisRunning = docker compose -f "$rootDir/docker-compose.yml" ps --format json redis 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty State

if ($mysqlRunning -ne "running") {
  Write-Host "❌ MySQL no está corriendo. Ejecuta: docker compose up -d mysql" -ForegroundColor Red
  exit 1
}
if ($redisRunning -ne "running") {
  Write-Host "❌ Redis no está corriendo. Ejecuta: docker compose up -d redis" -ForegroundColor Red
  exit 1
}

Write-Host "✅ MySQL y Redis están corriendo" -ForegroundColor Green
Write-Host ""

# ── Detener contenedores Docker de api/admin ──────────────────────────
Write-Host "⏹  Deteniendo contenedores Docker de api/admin..." -ForegroundColor Cyan
docker compose -f "$rootDir/docker-compose.yml" stop api admin 2>$null

# ── Arrancar API ───────────────────────────────────────────────────────
if ($startApi) {
  Write-Host "🚀 Arrancando API (http://localhost:3001) con hot-reload..." -ForegroundColor Cyan
  $apiJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir/apps/api"
    $env:DATABASE_URL = "mysql://root:rootpass@localhost:3307/saas_restaurant"
    $env:REDIS_URL = "redis://localhost:6379"
    $env:NODE_ENV = "development"
    $env:JWT_SECRET = "dev-jwt-secret-key-change-in-production-but-ok-for-local"
    $env:JWT_REFRESH_SECRET = "dev-jwt-refresh-secret-key-change-in-production"
    $env:CORS_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173"
    $env:API_PORT = "3001"
    $env:LOG_LEVEL = "debug"
    $env:DISABLE_WS = "true"
    bunx tsx watch src/main.ts
  } -ArgumentList $rootDir
  Write-Host "   PID del job: $($apiJob.Id)" -ForegroundColor Gray
}

# ── Arrancar Admin ─────────────────────────────────────────────────────
if ($startAdmin) {
  Write-Host "🚀 Arrancando Admin (http://localhost:3000/app) con HMR..." -ForegroundColor Cyan
  $adminJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location "$dir/apps/admin"
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
Write-Host "║   phpMyAdmin: http://localhost:8081       ║" -ForegroundColor Green
Write-Host "║                                          ║" -ForegroundColor Green
Write-Host "║   Presiona Ctrl+C para detener            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green

# Mantener el script vivo
try {
  while ($true) {
    Start-Sleep -Seconds 10
    # Mostrar estado
    if ($startApi) { Receive-Job $apiJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 3 }
    if ($startAdmin) { Receive-Job $adminJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 3 }
  }
} finally {
  Write-Host "`n⏹  Deteniendo servicios..." -ForegroundColor Yellow
  if ($startApi) { Stop-Job $apiJob -ErrorAction SilentlyContinue; Remove-Job $apiJob -ErrorAction SilentlyContinue }
  if ($startAdmin) { Stop-Job $adminJob -ErrorAction SilentlyContinue; Remove-Job $adminJob -ErrorAction SilentlyContinue }
  Write-Host "✅ Servicios detenidos" -ForegroundColor Green
}
