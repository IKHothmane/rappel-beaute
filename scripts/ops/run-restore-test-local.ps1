# Reproduit localement le job CI « Backup → Restore Test »
# Prérequis : Docker Desktop démarré
#
#   .\scripts\ops\run-restore-test-local.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\..

Write-Host "=== Restore Test (local, miroir CI) ===" -ForegroundColor Cyan

docker compose up -d postgres
$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 2
  $ready = docker exec rappel_beaute_db pg_isready -U postgres -d rappel_beaute 2>$null
} while (-not $ready -and (Get-Date) -lt $deadline)
if (-not $ready) { throw "PostgreSQL non prêt" }

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rappel_beaute?schema=public"
$env:RESTORE_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rappel_beaute_restore?schema=public"
$env:SESSION_SECRET = "restore-test-session-secret-min-32-chars"
$env:ENCRYPTION_KEY = "restore-test-encryption-key-32chars!!"
$env:PGUSER = "postgres"
$env:PGPASSWORD = "postgres"
$env:PG_DOCKER_CONTAINER = "rappel_beaute_db"
$env:CONFIRM = "yes"

Write-Host "`n→ migrate + seed" -ForegroundColor Yellow
npx prisma generate
npx prisma migrate deploy
npm run db:seed

Write-Host "`n→ backup" -ForegroundColor Yellow
npm run ops:backup

Write-Host "`n→ DB vierge restore" -ForegroundColor Yellow
docker exec rappel_beaute_db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS rappel_beaute_restore;"
docker exec rappel_beaute_db psql -U postgres -d postgres -c "CREATE DATABASE rappel_beaute_restore;"

$dump = (Get-Content backups\LATEST).Trim()
Write-Host "`n→ restore $dump" -ForegroundColor Yellow
$env:DATABASE_URL = $env:RESTORE_DATABASE_URL
npx tsx scripts/ops/restore.ts "backups\$dump"

Write-Host "`n→ migrate post-restore" -ForegroundColor Yellow
$env:DATABASE_URL = $env:RESTORE_DATABASE_URL
npx prisma migrate deploy

Write-Host "`n→ verify" -ForegroundColor Yellow
npm run ops:verify-restore

Write-Host "`n→ tests" -ForegroundColor Yellow
npm run test:security
npm run test:subscriptions

Write-Host "`n=== RESTORE TEST LOCAL REUSSI ===" -ForegroundColor Green
