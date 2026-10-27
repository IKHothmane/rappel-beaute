# Rappel Beauty — visite 3D du salon

Affiché dans l’app via `/salon-3d/` (iframe Plan 3D).

## Technique

- Three.js **r160** en local : `/vendor/three/` (pas de CDN — CSP production).
- Import map : `three` → `/vendor/three/three.module.js`.

## Interactions

- Souris glissée : rotation ; molette : zoom.
- Boutons **Vue du dessus** et **Vue 3D**.
- Zones à droite pour déplacer la caméra.
- Visite guidée automatique.

## Limites

Maquette interactive avec données statiques. Les états CRM ne sont pas encore branchés sur l’API.
