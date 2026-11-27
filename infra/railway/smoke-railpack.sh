#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: smoke-railpack.sh IMAGE}
prefix="railpack-smoke-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-$$}"
network="$prefix-network"
volume="$prefix-uploads"
postgres="$prefix-postgres"
redis="$prefix-redis"
app="$prefix-app"

cleanup() {
  local status=$?
  if (( status != 0 )) && docker container inspect "$app" >/dev/null 2>&1; then
    docker logs "$app" 2>&1 || true
  fi
  docker rm -f "$app" "$postgres" "$redis" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm --entrypoint bash "$image" -euc '
  openssl version
  node --version
  test "$(node -p process.versions.node)" = 22.13.1
  find /usr/lib /lib -name libjemalloc.so.2 -print -quit | grep libjemalloc.so.2
  node --input-type=commonjs -e "
    const assert = require(\"node:assert/strict\");
    const sharp = require(\"sharp\");
    sharp({ create: { width: 32, height: 24, channels: 3, background: \"#ffcc99\" } })
      .webp().toBuffer().then(async (image) => {
        const meta = await sharp(image).metadata();
        assert.deepEqual([meta.format, meta.width, meta.height], [\"webp\", 32, 24]);
        console.log(\"Sharp WebP OK\", sharp.versions);
      }).catch((error) => { console.error(error); process.exitCode = 1; });"
  test -r prisma/schema.prisma
  test -d prisma/migrations
  test -x node_modules/.bin/prisma
'

docker network create "$network"
docker volume create "$volume"
docker run -d --name "$postgres" --network "$network" --network-alias postgres \
  -e POSTGRES_PASSWORD=ephemeral-railpack -e POSTGRES_DB=railpack_smoke postgres:17-alpine
docker run -d --name "$redis" --network "$network" --network-alias redis redis:7-alpine

for i in {1..45}; do
  if docker exec "$postgres" pg_isready -h 127.0.0.1 -U postgres -d railpack_smoke &&
    docker exec "$redis" redis-cli ping | grep -Fx PONG; then break; fi
  sleep 1
done
docker exec "$postgres" pg_isready -h 127.0.0.1 -U postgres -d railpack_smoke
docker exec "$redis" redis-cli ping | grep -Fx PONG

db_url='postgresql://postgres:ephemeral-railpack@postgres:5432/railpack_smoke?schema=public'
origin_secret='railpack-smoke-fake-origin-value-0000'
sql() {
  docker exec "$postgres" psql -X -v ON_ERROR_STOP=1 -U postgres -d railpack_smoke -Atc "$1"
}
test "$(sql "SELECT to_regclass('public._prisma_migrations') IS NULL")" = t
docker run --rm --network "$network" -e DATABASE_URL="$db_url" \
  --entrypoint ./node_modules/.bin/prisma "$image" migrate deploy
recorded_migrations=$(sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
test "$recorded_migrations" -gt 0

docker run -d --name "$app" --network "$network" --publish 127.0.0.1::8080 \
  --mount "type=volume,source=$volume,target=/app/uploads" \
  -e DATABASE_URL="$db_url" -e REDIS_URL=redis://redis:6379 \
  -e PORT=8080 -e APP_ENV=staging -e MEMORY_DIAGNOSTICS=1 \
  -e ORIGIN_SECRET="$origin_secret" \
  -e STORAGE_LOCAL_DIR=/app/uploads -e ALERT_ON_HEALTH_DEGRADED=false \
  -e SESSION_SECRET=railpack-smoke-fake-session-value-0000 "$image"

port=$(docker port "$app" 8080/tcp | sed 's/^.*://')
health_url="http://127.0.0.1:$port/api/health/"
for i in {1..45}; do
  if curl --fail --silent --max-time 3 -H "x-rappel-origin: $origin_secret" "$health_url" >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent --show-error --max-time 5 -H "x-rappel-origin: $origin_secret" "$health_url" |
  jq -e '.status == "ok" and .database == "ok" and .redis == "ok" and (.memory.heapSizeLimitMb >= 512 and .memory.heapSizeLimitMb < 640)'

test "$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' \
  -H 'Host: healthcheck.railway.app' "$health_url")" = 403
proxy_response=$(curl --silent --show-error --max-time 5 --write-out '\n%{http_code}' \
  -H 'Host: rappelbeauty.com' -H 'X-Forwarded-Proto: https' \
  -H "x-rappel-origin: $origin_secret" "$health_url")
proxy_status=${proxy_response##*$'\n'}
printf 'Sonde via proxy HTTPS : HTTP %s\n' "$proxy_status"
test "$proxy_status" = 200
jq -e '.status == "ok"' <<< "${proxy_response%$'\n'*}"

optimizer_status=$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' \
  -H "x-rappel-origin: $origin_secret" "http://127.0.0.1:$port/_next/image?url=%2Ffavicon.ico&w=64&q=75")
printf 'Optimiseur Next.js désactivé : HTTP %s\n' "$optimizer_status"
test "$optimizer_status" = 404

docker exec "$app" bash -euc '
  tr "\000" "\n" </proc/1/cmdline | grep -Ei "next|node"
  tr "\000" "\n" </proc/1/environ | grep -Fx MALLOC_ARENA_MAX=2
  tr "\000" "\n" </proc/1/environ | grep -Fx VIPS_CONCURRENCY=1
  tr "\000" "\n" </proc/1/environ | grep -Fx UV_THREADPOOL_SIZE=2
  grep -F libjemalloc.so.2 /proc/1/maps
  test "$PWD" = /app
  printf %s persistent-upload > /app/uploads/railpack-smoke.txt
'
test "$(sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')" = "$recorded_migrations"
if docker logs "$app" 2>&1 | grep -E 'migrations found|Applying migration|No pending migrations'; then
  echo 'Prisma a été lancé pendant le démarrage HTTP' >&2
  exit 1
fi

docker kill --signal TERM "$app"
exit_code=$(timeout 15 docker wait "$app")
case "$exit_code" in
  0|143) ;;
  *) echo "Arrêt SIGTERM inattendu (code $exit_code)" >&2; exit 1 ;;
esac

docker run --rm --mount "type=volume,source=$volume,target=/app/uploads" \
  --entrypoint bash "$image" -euc 'test "$(cat /app/uploads/railpack-smoke.txt)" = persistent-upload'
