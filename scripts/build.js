/* ==========================================================
   Arma los datos del catálogo a partir de content/
   ----------------------------------------------------------
   - Lee content/config.json y content/equipos/*.json
   - Escribe public/js/equipos-data.js (lo usa la página)
   - Si "sharp" está instalado: achica fotos grandes y crea
     miniaturas en public/img/sm/. Si no, usa la foto original.
   Uso:  npm run build   (o)   node scripts/build.js
   ========================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PUBLIC = path.join(RAIZ, "public");
const CONTENT = path.join(RAIZ, "content");
const SM_DIR = path.join(PUBLIC, "img", "sm");
const ANCHO_MAX = 1600;
const ANCHO_SM = 640;

let sharp = null;
try { sharp = require("sharp"); } catch { /* opcional */ }

const leerJSON = f => JSON.parse(fs.readFileSync(f, "utf8"));
const rel = p => String(p || "").trim().replace(/^\/+/, "");
const existe = p => p && fs.existsSync(path.join(PUBLIC, p));
const num = v => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const avisos = [];

async function prepararFoto(src) {
  const r = rel(src);
  if (!existe(r)) { avisos.push(`Falta la foto ${r}`); return null; }
  const nombre = path.basename(r).replace(/\.[^.]+$/, "") + ".jpg";
  const smRel = "img/sm/" + nombre;
  if (sharp && /\.(jpe?g|png|webp)$/i.test(r)) {
    const abs = path.join(PUBLIC, r);
    try {
      const meta = await sharp(abs).metadata();
      // achicar originales muy grandes (fotos de celular)
      if ((meta.width || 0) > ANCHO_MAX || (meta.height || 0) > ANCHO_MAX) {
        const buf = await sharp(abs).rotate().resize(ANCHO_MAX, ANCHO_MAX, { fit: "inside" }).jpeg({ quality: 82, progressive: true }).toBuffer();
        fs.writeFileSync(abs, buf);
      }
      if (!existe(smRel)) {
        fs.mkdirSync(SM_DIR, { recursive: true });
        await sharp(abs).rotate().resize(ANCHO_SM, ANCHO_SM, { fit: "inside" }).jpeg({ quality: 78, progressive: true }).toFile(path.join(PUBLIC, smRel));
      }
    } catch (err) { avisos.push(`No se pudo procesar ${r}: ${err.message}`); }
  }
  return { src: r, sm: existe(smRel) ? smRel : r };
}

async function main() {
  const cfg = leerJSON(path.join(CONTENT, "config.json"));
  const dir = path.join(CONTENT, "equipos");
  const archivos = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();

  const equipos = [];
  for (const archivo of archivos) {
    const d = leerJSON(path.join(dir, archivo));
    if (d.visible === false) continue;
    const slug = archivo.replace(/\.json$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    const fotos = [];
    for (const f of d.fotos || []) { const p = await prepararFoto(f); if (p) fotos.push(p); }
    if (!fotos.length) { avisos.push(`"${d.nombre || slug}" no tiene fotos: no se publica`); continue; }

    let video = null;
    if (rel(d.video) && existe(rel(d.video))) {
      video = { src: rel(d.video), poster: existe(rel(d.videoPortada)) ? rel(d.videoPortada) : fotos[0].sm };
    } else if (rel(d.video)) avisos.push(`Falta el video ${rel(d.video)}`);

    equipos.push({
      slug,
      nombre: String(d.nombre || slug).trim(),
      categoria: d.categoria || "acoplados",
      tipo: d.tipo || "",
      destacado: !!d.destacado,
      enPortada: !!d.enPortada,
      vendido: !!d.vendido,
      orden: num(d.orden) ?? 999,
      etiqueta: d.vendido ? "Vendido" : (d.etiqueta || null),
      precio: num(d.precio),
      precioFinanciado: num(d.precioFinanciado),
      notaPrecio: String(d.notaPrecio || "").trim(),
      moneda: d.moneda === "ARS" ? "ARS" : "USD",
      resumen: d.resumen || "",
      datos: (d.datos || []).filter(x => x && x.dato).map(x => [String(x.dato), String(x.valor ?? "")]),
      puntos: (d.puntos || []).filter(Boolean).map(String),
      fotos,
      video
    });
  }
  equipos.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));

  const contacto = {
    nombre: "Gastón Martín",
    whatsapp: String(cfg.whatsapp || "").replace(/\D/g, ""),
    whatsappVisible: cfg.whatsappVisible || "",
    ubicacion: cfg.ubicacion || "",
    provincia: cfg.provincia || "",
    mapa: cfg.mapa || ""
  };

  const salida = `/* ARCHIVO GENERADO por scripts/build.js — no editar a mano.
   Los equipos se editan en content/equipos/ (o desde el panel). */
window.CONTACTO = ${JSON.stringify(contacto, null, 2)};
window.DOLAR_REFERENCIA = ${num(cfg.dolarReferencia) || 1450};
window.EQUIPOS = ${JSON.stringify(equipos, null, 2)};
`;
  fs.writeFileSync(path.join(PUBLIC, "js", "equipos-data.js"), salida);
  console.log(`Catálogo listo: ${equipos.length} equipos publicados${sharp ? "" : " (sin sharp: miniaturas no generadas)"}.`);
  avisos.forEach(a => console.warn("Aviso: " + a));
}

main().catch(err => { console.error(err); process.exit(1); });
