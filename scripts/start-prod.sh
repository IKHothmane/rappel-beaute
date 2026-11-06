#!/usr/bin/env bash
# Démarrage prod Railway — limite fragmentation glibc + Sharp/libvips.
set -euo pipefail

export MALLOC_ARENA_MAX="${MALLOC_ARENA_MAX:-2}"
export VIPS_CONCURRENCY="${VIPS_CONCURRENCY:-1}"
# Limite le threadpool libuv (Sharp async) — défaut Node = 4.
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"

# jemalloc rend la RAM native à l'OS après les pics Sharp (sinon RSS reste au pic).
if [ -z "${LD_PRELOAD:-}" ]; then
  for candidate in \
    /usr/lib/x86_64-linux-gnu/libjemalloc.so.2 \
    /usr/lib/libjemalloc.so.2 \
    /lib/x86_64-linux-gnu/libjemalloc.so.2; do
    if [ -f "$candidate" ]; then
      export LD_PRELOAD="$candidate"
      break
    fi
  done
fi

# Plafond heap V8 : ~2× RSS cible (250–400 Mo) — évite GC paresseux sans OOM.
exec node --max-old-space-size="${NODE_MAX_OLD_SPACE_SIZE:-512}" \
  ./node_modules/next/dist/bin/next start
