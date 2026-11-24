# reset-cluster.ps1
# Resetea el clúster de replicación PostgreSQL a un estado limpio:
#   - Borra los volúmenes primary_data y replica_data (se pierden los datos del clúster)
#   - Levanta primary + replica desde cero (la réplica se re-sincroniza con pg_basebackup)
#   - Reinicia el backend para que re-sincronice tablas y re-cargue el seed
#
# Uso:  .\reset-cluster.ps1

$ErrorActionPreference = "Continue"
$replicDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir   = Split-Path -Parent $replicDir

Write-Host "`n=== 1) Bajando clúster y borrando volúmenes ===" -ForegroundColor Cyan
Push-Location $replicDir
docker compose down -v
if ($LASTEXITCODE -ne 0) { throw "docker compose down -v falló" }

Write-Host "`n=== 2) Levantando clúster limpio ===" -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up -d falló" }
Pop-Location

Write-Host "`n=== 3) Esperando a que el primary esté listo ===" -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    $r = docker exec futbolgest-db-primary pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ok) { throw "El primary no respondió a tiempo" }
Write-Host "Primary listo." -ForegroundColor Green

Write-Host "`n=== 4) Esperando a que la réplica quede en recovery (sincronizada) ===" -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    $rec = docker exec futbolgest-db-replica psql -U postgres -d postgres -tAc "SELECT pg_is_in_recovery();" 2>$null
    if ($rec -match "t") { $ok = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ok) { throw "La réplica no quedó en recovery a tiempo (revisar logs: docker logs futbolgest-db-replica)" }
Write-Host "Réplica sincronizada (standby)." -ForegroundColor Green

Write-Host "`n=== 5) Reiniciando backend para re-sincronizar tablas y seed ===" -ForegroundColor Cyan
Push-Location $rootDir
docker compose restart backend
Pop-Location
Start-Sleep -Seconds 8

Write-Host "`n=== 6) Verificación final ===" -ForegroundColor Cyan
Write-Host "-- primary pg_is_in_recovery (esperado: f) --"
docker exec futbolgest-db-primary psql -U postgres -d postgres -tAc "SELECT pg_is_in_recovery();" 2>$null
Write-Host "-- replica pg_is_in_recovery (esperado: t) --"
docker exec futbolgest-db-replica psql -U postgres -d postgres -tAc "SELECT pg_is_in_recovery();" 2>$null
Write-Host "-- replicación activa en primary (esperado: 1 fila) --"
docker exec futbolgest-db-primary psql -U postgres -d postgres -tAc "SELECT count(*) FROM pg_stat_replication;" 2>$null
Write-Host "-- contenedores --"
docker ps --format "{{.Names}}`t{{.Status}}" | Select-String -Pattern "futbolgest-db|pg-proxy|watchdog|g15-backend"

Write-Host "`n=== Listo. Clúster limpio y sincronizado. ===" -ForegroundColor Green
Write-Host "Recordá: los datos del clúster se borraron; el backend re-cargó el seed."
