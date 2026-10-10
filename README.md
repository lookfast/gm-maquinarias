# Gastón Martín · Maquinarias y Vehículos

Sitio estático con catálogo de equipos. Ruta 226, Carlos Tejedor.

- **Equipos:** `content/equipos/*.json` (uno por equipo). Se editan desde el panel Pages CMS (`.pages.yml`).
- **Contacto:** `content/config.json`.
- **Página:** `public/`.
- **Armado:** `npm run build` genera `public/js/equipos-data.js`, achica fotos y crea miniaturas.

## Publicación (Cloudflare Pages)
- Build command: `npm run build`
- Build output directory: `public`

La documentación completa está en la bóveda de Obsidian (`boveda-obsidian`).
