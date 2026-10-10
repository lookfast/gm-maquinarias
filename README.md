# Gastón Martín · Maquinarias y Vehículos

Sitio estático con catálogo de equipos. Ruta 226, Carlos Tejedor.

- **Equipos:** `content/equipos/*.json` (uno por equipo). Se editan desde el panel Pages CMS (`.pages.yml`).
- **Contacto:** `content/config.json`.
- **Página:** `public/`.
- **Armado:** `npm run build` genera `public/js/equipos-data.js`, achica fotos y crea miniaturas.

## Publicación (Cloudflare)
Proyecto Worker `gm-maquinarias` conectado a este repositorio (`wrangler.jsonc`).
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
Cada cambio en `main` (por ejemplo, desde el panel) se publica solo.

La documentación completa está en la bóveda de Obsidian (`boveda-obsidian`).
