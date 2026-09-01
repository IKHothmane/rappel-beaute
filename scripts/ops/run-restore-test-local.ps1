# Reproduit localement le job CI « Backup → Restore Test »
# Prérequis : Docker Desktop démarré
#
#   docker compose up -d postgres
#   .\scripts\ops\run-restore-test-local.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\..

Write-Host "=== Restore Test (local, miroir CI) ===" -ForegroundColor Cyan

docker compose up -d postgres
Start-Sleep -Seconds 5

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rappel_beaute?schema=public"
$env:RESTORE_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/rappel_beaute_restore?schema=public"
$env:SESSION_SECRET = "restore-test-session-secret-min-32-chars"
$env:ENCRYPTION_KEY = "restore-test-encryption-key-32chars!!"
$env:PGUSER = "postgres"
$env:PGPASSWORD = "postgres"

# pg_dump via conteneur Docker si absent sur l'hôte
function Invoke-PgDump {
  param([string]$Args)
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($pgDump) {
    & pg_dump @Args
  } else {
    docker exec rappel_beaute_db pg_dump @Args
  }
}

Write-Host "`n→ migrate + seed" -ForegroundColor Yellow
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed

Write-Host "`n→ backup" -ForegroundColor Yellow
npm run ops:backup

Write-Host "`n→ DB vierge restore" -ForegroundColor Yellow
docker exec rappel_beaute_db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS rappel_beaute_restore;"
docker exec rappel_beaute_db psql -U postgres -d postgres -c "CREATE DATABASE rappel_beaute_restore;"

$dump = Get-Content backups\LATEST
Write-Host "`n→ restore $dump" -ForegroundColor Yellow
$env:CONFIRM = "yes"
$env:DATABASE_URL = $env:RESTORE_DATABASE_URL
# pg_restore via conteneur si absent
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if ($pgRestore) {
  npx tsx scripts/ops/restore.ts "backups\$dump"
} else {
  docker cp "backups\$dump" rappel_beaute_db:/tmp/restore.dump
  docker exec rappel_beaute_db pg_restore --dbname="postgresql://postgres:postgres@localhost:5432/rappel_beaute_restore" --no-owner --no-acl --clean --if-exists /tmp/restore.dump
}

Write-Host "`n→ migrate post-restore" -ForegroundColor Yellow
$env:DATABASE_URL = $env:RESTORE_DATABASE_URL
npx prisma migrate deploy

Write-Host "`n→ verify" -ForegroundColor Yellow
npm run ops:verify-restore

Write-Host "`n→ tests" -ForegroundColor Yellow
npm run test:security
npm run test:subscriptions

Write-Host "`n=== ✅ RESTORE TEST LOCAL RÉUSSI ===" -ForegroundColor Green
