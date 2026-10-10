/* Gastón Martín — catálogo y fichas de equipos */
(() => {
  "use strict";

  const C = window.CONTACTO;
  const CATS = window.CATEGORIAS;
  const EQ = window.EQUIPOS;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const puedeVT = typeof document.startViewTransition === "function" && !reduceMotion;

  const estado = { cat: "todos", q: "", orden: "destacados" };
  let vista = "inicio";
  let scrollInicio = 0;
  let hashInicio = "";

  /* ---------- utilidades ---------- */
  const fmtPrecio = e => ((e.moneda || "USD") === "ARS" ? "$ " : "USD ") + e.precio.toLocaleString("es-AR");
  const enPesos = e => e.precio == null ? null : ((e.moneda || "USD") === "ARS" ? e.precio : e.precio * (window.DOLAR_REFERENCIA || 1));
  const tipoDe = e => e.tipo || CATS[e.categoria].singular;
  const precioHTML = (e, cls = "") =>
    e.precio != null
      ? `<span class="precio ${cls}">${fmtPrecio(e)}</span>`
      : `<span class="precio precio--consultar ${cls}">Consultar precio</span>`;
  const waURL = msg => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}`;
  const msgEquipo = e => `Hola Gastón, me interesa ${articulo(e)} ${e.nombre} que vi en la web. ¿Sigue disponible?`;
  const articulo = e => e.articulo || (["cosechadoras", "cisternas", "tolvas"].includes(e.categoria) ? "la" : "el");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const normal = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const icono = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  function aviso(texto) {
    const a = $("#aviso");
    a.textContent = texto;
    a.classList.add("ver");
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => a.classList.remove("ver"), 2200);
  }

  async function copiar(texto, ok) {
    try {
      await navigator.clipboard.writeText(texto);
      aviso(ok);
    } catch {
      const t = document.createElement("textarea");
      t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); aviso(ok); } catch { aviso(texto); }
      t.remove();
    }
  }

  function transicion(actualizar) {
    if (!puedeVT) { actualizar(); return Promise.resolve(); }
    const vt = document.startViewTransition(actualizar);
    return vt.finished.catch(() => {});
  }

  /* ---------- enlaces de WhatsApp genéricos ---------- */
  function cablearWA(raiz = document) {
    $$("[data-wa]", raiz).forEach(a => {
      a.href = waURL(a.dataset.waMsg || "Hola Gastón, quiero hacer una consulta sobre sus equipos.");
    });
  }

  /* ---------- rubros y chips ---------- */
  function contar(cat) { return EQ.filter(e => e.categoria === cat).length; }

  function renderRubros() {
    $("#rubros").innerHTML = Object.entries(CATS).map(([k, c]) => {
      const n = contar(k);
      const primero = EQ.find(e => e.categoria === k);
      const img = primero ? `<img class="rubro__img" src="${primero.fotos[0].sm}" alt="" loading="lazy">` : `<span class="rubro__img"></span>`;
      return `<a class="rubro" href="#catalogo" data-cat="${k}">
        ${img}
        <span class="rubro__nombre">${c.nombre}</span>
        <span class="rubro__cant">${n ? `${n} ${n === 1 ? "equipo" : "equipos"}` : "Próximamente"}</span>
      </a>`;
    }).join("");
    $$(".rubro").forEach(r => r.addEventListener("click", () => elegirCat(r.dataset.cat, false)));
  }

  function renderChips() {
    const items = [["todos", "Todos", EQ.length], ...Object.entries(CATS).map(([k, c]) => [k, c.nombre, contar(k)])];
    $("#chips").innerHTML = items.map(([k, n, cant]) =>
      `<button class="chip" role="tab" data-cat="${k}" aria-selected="${estado.cat === k}">${n}<span>${cant}</span></button>`
    ).join("");
    $$(".chip").forEach(b => b.addEventListener("click", () => elegirCat(b.dataset.cat, true)));
  }

  function elegirCat(cat, animar) {
    estado.cat = cat;
    $$(".chip").forEach(b => b.setAttribute("aria-selected", b.dataset.cat === cat));
    renderGrilla(animar);
  }

  /* ---------- grilla del catálogo ---------- */
  function filtrados() {
    const q = normal(estado.q.trim());
    let lista = EQ.filter(e => estado.cat === "todos" || e.categoria === estado.cat);
    if (q) {
      lista = lista.filter(e => normal([e.nombre, e.resumen, CATS[e.categoria].nombre, tipoDe(e), ...e.puntos, ...e.datos.flat()].join(" ")).includes(q));
    }
    const o = estado.orden;
    lista = [...lista].sort((a, b) => {
      if (o === "precio-asc") return (enPesos(a) ?? Infinity) - (enPesos(b) ?? Infinity);
      if (o === "precio-desc") return (enPesos(b) ?? -1) - (enPesos(a) ?? -1);
      if (o === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return (a.vendido ? 1 : 0) - (b.vendido ? 1 : 0) || (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
    });
    return lista;
  }

  function tarjetaHTML(e) {
    const total = e.fotos.length + (e.video ? 1 : 0);
    const alt = e.fotos[1] ? `<img class="alt" src="${e.fotos[1].sm}" alt="" loading="lazy" decoding="async">` : "";
    return `<a class="tarjeta${e.vendido ? " tarjeta--vendida" : ""}" href="#equipo-${e.slug}" data-slug="${e.slug}">
      <div class="tarjeta__foto">
        <span class="tarjeta__badges">
          ${e.etiqueta ? `<span class="badge${e.vendido ? " badge--vendido" : ""}">${esc(e.etiqueta)}</span>` : ""}
          <span class="badge badge--fotos">${icono(e.video ? "i-play" : "i-fotos")}${total}</span>
        </span>
        <img class="principal" src="${e.fotos[0].sm}" ${e.fotos[0].sm !== e.fotos[0].src ? `srcset="${e.fotos[0].sm} 640w, ${e.fotos[0].src} 1600w" sizes="(max-width: 640px) 100vw, 420px"` : ""} alt="${esc(e.nombre)}" loading="lazy" decoding="async">
        ${alt}
      </div>
      <div class="tarjeta__cuerpo">
        <span class="tarjeta__cat">${tipoDe(e)}</span>
        <h3 class="tarjeta__nombre">${esc(e.nombre)}</h3>
        <ul class="puntos">${e.puntos.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="tarjeta__pie">
          ${precioHTML(e)}
          <span class="tarjeta__ver" aria-hidden="true">${icono("i-der")}</span>
        </div>
      </div>
    </a>`;
  }

  function renderGrilla(animar = false) {
    const lista = filtrados();
    const pintar = () => {
      $("#grilla").innerHTML = lista.map(tarjetaHTML).join("");
      $$("#grilla .tarjeta").forEach(t => { if (animar) t.style.viewTransitionName = "t-" + t.dataset.slug; });
      const n = lista.length;
      $("#cuenta").textContent = n ? `${n} ${n === 1 ? "equipo disponible" : "equipos disponibles"}${estado.cat !== "todos" ? " en " + CATS[estado.cat].nombre.toLowerCase() : ""}` : "";
      const v = $("#vacio");
      v.hidden = n > 0;
      if (!n) {
        const esVeh = estado.cat === "vehiculos" && !estado.q;
        v.innerHTML = `<h3>${esVeh ? "Pronto vas a ver vehículos acá" : "No encontramos equipos con esa búsqueda"}</h3>
          <p>${esVeh ? "Si buscás una camioneta, un camión o un utilitario, escribinos y te avisamos cuando entre uno." : "Probá con otra palabra o mirá todos los equipos. Si buscás algo puntual, consultanos y lo conseguimos."}</p>
          <div class="hero__acciones">
            <button class="btn btn--linea" type="button" id="verTodos">Ver todos los equipos</button>
            <a class="btn btn--wa" data-wa data-wa-msg="Hola Gastón, estoy buscando ${esVeh ? "un vehículo" : "un equipo"}: " href="#" target="_blank" rel="noopener">${icono("i-wa")}Avisame por WhatsApp</a>
          </div>`;
        cablearWA(v);
        $("#verTodos").addEventListener("click", () => { estado.q = ""; $("#buscar").value = ""; elegirCat("todos", true); });
      }
    };
    if (animar && puedeVT) {
      $$("#grilla .tarjeta").forEach(t => (t.style.viewTransitionName = "t-" + t.dataset.slug));
      transicion(pintar).then(() => $$("#grilla .tarjeta").forEach(t => (t.style.viewTransitionName = "")));
    } else {
      pintar();
    }
  }

  /* ---------- ficha de equipo ---------- */
  let gal = { i: 0, total: 0, fotos: [], equipo: null };

  function renderDetalle(e) {
    const slides = e.fotos.map((f, i) =>
      `<div class="galeria__slide"><img src="${f.src}" alt="${esc(e.nombre)}, foto ${i + 1}" ${i ? 'loading="lazy"' : ""} decoding="async" data-zoom="${i}"></div>`
    );
    if (e.video) slides.push(`<div class="galeria__slide"><video src="${e.video.src}" poster="${e.video.poster}" controls playsinline preload="none"></video></div>`);
    const minis = e.fotos.map((f, i) =>
      `<button class="mini" type="button" data-i="${i}" aria-label="Ver foto ${i + 1}"><img src="${f.sm}" alt="" loading="lazy"></button>`
    );
    if (e.video) minis.push(`<button class="mini mini--video" type="button" data-i="${e.fotos.length}" aria-label="Ver video"><img src="${e.video.poster}" alt="" loading="lazy"></button>`);

    const rel = [...EQ.filter(x => x.slug !== e.slug && x.categoria === e.categoria), ...EQ.filter(x => x.slug !== e.slug && x.categoria !== e.categoria)].slice(0, 3);
    const cat = CATS[e.categoria];

    $("#vistaEquipo").innerHTML = `
      <article class="det">
        <nav class="migas" aria-label="Ruta de navegación">
          <a class="volver" href="#catalogo" id="volver">${icono("i-izq")}Volver</a>
          <a href="#catalogo">Catálogo</a><span aria-hidden="true">/</span>
          <a href="#catalogo" data-cat="${e.categoria}">${cat.nombre}</a><span aria-hidden="true">/</span>
          <span aria-current="page">${esc(e.nombre)}</span>
        </nav>
        <div class="det__grid">
          <div class="galeria">
            <div class="galeria__principal" id="galPrincipal" tabindex="0" aria-roledescription="carrusel" aria-label="Fotos de ${esc(e.nombre)}">
              <div class="galeria__pista" id="galPista">${slides.join("")}</div>
              <button class="galeria__nav galeria__nav--ant" id="galAnt" type="button" aria-label="Foto anterior">${icono("i-izq")}</button>
              <button class="galeria__nav galeria__nav--sig" id="galSig" type="button" aria-label="Foto siguiente">${icono("i-der")}</button>
              <span class="galeria__cont" id="galCont"></span>
              <button class="galeria__ampliar" id="galAmpliar" type="button">${icono("i-expand")}Ampliar</button>
            </div>
            <div class="miniaturas" id="miniaturas">${minis.join("")}</div>
          </div>

          <aside class="ficha">
            <div class="ficha__cat">${tipoDe(e)}${e.etiqueta ? `<span class="badge">${esc(e.etiqueta)}</span>` : ""}</div>
            <h1 class="ficha__titulo" id="fichaTitulo">${esc(e.nombre)}</h1>
            <div class="ficha__precio">
              <small>${e.precio != null ? (e.precioFinanciado ? "Precio de contado" : "Precio") : "Precio a convenir"}</small>
              ${precioHTML(e)}
              ${e.precioFinanciado ? `<span class="ficha__financiado">Financiado: <strong>${fmtPrecio({ precio: e.precioFinanciado, moneda: e.moneda })}</strong></span>` : ""}
            </div>
            <p class="ficha__resumen">${esc(e.resumen)}</p>
            <dl class="datos">${e.datos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
            <div class="ficha__acciones">
              <a class="btn btn--wa btn--grande" href="${waURL(msgEquipo(e))}" target="_blank" rel="noopener">${icono("i-wa")}Consultar por este equipo</a>
              <div class="ficha__sec">
                <button class="btn btn--linea btn--chico" type="button" id="compartir">${icono("i-link")}Compartir</button>
                <a class="btn btn--linea btn--chico" href="${C.mapa}" target="_blank" rel="noopener">${icono("i-pin")}Cómo llegar</a>
              </div>
            </div>
            <p class="ficha__nota">${icono("i-pin")}<span>Se puede ver en ${C.ubicacion}. Coordiná la visita por WhatsApp.</span></p>
          </aside>
        </div>

        ${rel.length ? `<section class="relacionados" aria-labelledby="relTit">
          <h2 class="titulo-sec" id="relTit">Otros equipos</h2>
          <div class="grilla">${rel.map(tarjetaHTML).join("")}</div>
        </section>` : ""}
      </article>
      <div class="barra-movil">
        ${precioHTML(e)}
        <a class="btn btn--wa" href="${waURL(msgEquipo(e))}" target="_blank" rel="noopener">${icono("i-wa")}Consultar</a>
      </div>`;

    gal = { i: 0, total: slides.length, fotos: e.fotos, equipo: e };
    irA(0, false);

    $("#galAnt").onclick = () => irA(gal.i - 1);
    $("#galSig").onclick = () => irA(gal.i + 1);
    $$("#miniaturas .mini").forEach(m => (m.onclick = () => irA(+m.dataset.i)));
    $("#galAmpliar").onclick = () => abrirVisor(Math.min(gal.i, gal.fotos.length - 1));
    $$("#galPista img[data-zoom]").forEach(img => img.addEventListener("click", () => { if (!arrastre.movio) abrirVisor(+img.dataset.zoom); }));
    $("#galPrincipal").addEventListener("keydown", ev => {
      if (ev.key === "ArrowLeft") irA(gal.i - 1);
      if (ev.key === "ArrowRight") irA(gal.i + 1);
    });
    activarArrastre($("#galPrincipal"));

    $("#compartir").onclick = async () => {
      const url = location.href;
      if (navigator.share) {
        try { await navigator.share({ title: e.nombre, text: msgEquipo(e).replace("Hola Gastón, me interesa", "Mirá"), url }); return; } catch {}
      }
      copiar(url, "Enlace copiado");
    };
    $("#volver").addEventListener("click", ev => {
      if (history.state && history.state.desdeInicio) { ev.preventDefault(); history.back(); }
    });
    $$('.migas a[data-cat]').forEach(a => a.addEventListener("click", () => { estado.cat = a.dataset.cat; }));
  }

  function irA(i, animar = true) {
    gal.i = Math.max(0, Math.min(gal.total - 1, i));
    const pista = $("#galPista");
    if (!pista) return;
    pista.style.transition = animar ? "" : "none";
    pista.style.transform = `translateX(${-gal.i * 100}%)`;
    $("#galCont").textContent = `${gal.i + 1} / ${gal.total}`;
    $("#galAnt").disabled = gal.i === 0;
    $("#galSig").disabled = gal.i === gal.total - 1;
    const enVideo = gal.i >= gal.fotos.length;
    $("#galAmpliar").hidden = enVideo;
    $$("#galPista video").forEach(v => { if (!enVideo) v.pause(); });
    $$("#miniaturas .mini").forEach((m, k) => {
      m.setAttribute("aria-current", k === gal.i);
      if (k === gal.i && animar) m.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* deslizar con el dedo o el mouse */
  const arrastre = { x0: 0, dx: 0, activo: false, movio: false };
  function activarArrastre(el) {
    const pista = $("#galPista");
    el.addEventListener("pointerdown", ev => {
      if (ev.target.closest("button, video")) return;
      arrastre.activo = true; arrastre.movio = false; arrastre.x0 = ev.clientX; arrastre.dx = 0;
      pista.style.transition = "none";
    });
    el.addEventListener("pointermove", ev => {
      if (!arrastre.activo) return;
      arrastre.dx = ev.clientX - arrastre.x0;
      if (Math.abs(arrastre.dx) > 6) arrastre.movio = true;
      pista.style.transform = `translateX(calc(${-gal.i * 100}% + ${arrastre.dx}px))`;
    });
    const fin = () => {
      if (!arrastre.activo) return;
      arrastre.activo = false;
      const umbral = el.clientWidth * 0.15;
      if (arrastre.dx < -umbral) irA(gal.i + 1);
      else if (arrastre.dx > umbral) irA(gal.i - 1);
      else irA(gal.i);
      setTimeout(() => (arrastre.movio = false), 0);
    };
    el.addEventListener("pointerup", fin);
    el.addEventListener("pointercancel", fin);
    el.addEventListener("pointerleave", fin);
  }

  /* ---------- visor a pantalla completa ---------- */
  let visorI = 0, focoPrevio = null;
  function abrirVisor(i) {
    focoPrevio = document.activeElement;
    visorI = i;
    $("#visor").hidden = false;
    document.body.style.overflow = "hidden";
    pintarVisor();
    $("#visorCerrar").focus();
  }
  function pintarVisor() {
    const n = gal.fotos.length;
    visorI = (visorI + n) % n;
    $("#visorImg").src = gal.fotos[visorI].src;
    $("#visorImg").alt = `${gal.equipo.nombre}, foto ${visorI + 1}`;
    $("#visorCont").textContent = `${visorI + 1} / ${n}`;
  }
  function cerrarVisor() {
    $("#visor").hidden = true;
    document.body.style.overflow = "";
    irA(visorI, false);
    focoPrevio && focoPrevio.focus();
  }
  $("#visorCerrar").onclick = cerrarVisor;
  $("#visorAnt").onclick = () => { visorI--; pintarVisor(); };
  $("#visorSig").onclick = () => { visorI++; pintarVisor(); };
  $("#visor").addEventListener("click", ev => { if (ev.target.id === "visor") cerrarVisor(); });
  document.addEventListener("keydown", ev => {
    if ($("#visor").hidden) return;
    if (ev.key === "Escape") cerrarVisor();
    if (ev.key === "ArrowLeft") { visorI--; pintarVisor(); }
    if (ev.key === "ArrowRight") { visorI++; pintarVisor(); }
  });

  /* ---------- navegación entre vistas ---------- */
  let origenFoto = null; // imagen de la tarjeta clickeada, para la transición compartida

  document.addEventListener("click", ev => {
    const a = ev.target.closest('a[href^="#equipo-"]');
    if (!a) return;
    const img = a.querySelector(".tarjeta__foto img.principal, .hero__foto img");
    origenFoto = img || null;
  });

  function equipoDesdeHash() {
    const h = location.hash.slice(1);
    if (!h.startsWith("equipo-")) return null;
    return EQ.find(e => e.slug === h.slice(7)) || null;
  }

  function mostrarInicio(restaurar) {
    $("#vistaEquipo").hidden = true;
    $("#vistaEquipo").innerHTML = "";
    $("#vistaInicio").hidden = false;
    document.body.classList.remove("en-detalle");
    document.title = "Gastón Martín Maquinarias";
    vista = "inicio";
    renderChips();
    renderGrilla();
    const h = location.hash.slice(1);
    if (restaurar) {
      window.scrollTo({ top: scrollInicio, behavior: "instant" });
    } else if (h && document.getElementById(h)) {
      document.getElementById(h).scrollIntoView({ behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function mostrarEquipo(e) {
    if (vista === "inicio") { scrollInicio = window.scrollY; }
    $("#vistaInicio").hidden = true;
    $("#vistaEquipo").hidden = false;
    document.body.classList.add("en-detalle");
    document.title = `${e.nombre} · Gastón Martín`;
    vista = "equipo";
    renderDetalle(e);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function enrutar() {
    const e = equipoDesdeHash();
    const h = location.hash.slice(1);
    const deDetalleAInicio = !e && vista === "equipo";
    const deInicioADetalle = e && vista === "inicio";
    const entreDetalles = e && vista === "equipo";

    if (!deDetalleAInicio && !deInicioADetalle && !entreDetalles) {
      // movimiento dentro del inicio: dejamos que el ancla haga scroll nativo
      return;
    }

    const restaurar = deDetalleAInicio && h === hashInicio;
    if (deInicioADetalle) hashInicio = (history.state && history.state.hashPrevio) || "";

    // nombres para la transición compartida de la foto
    let destinoSlug = e ? e.slug : gal.equipo && gal.equipo.slug;
    if (deInicioADetalle || entreDetalles) {
      if (origenFoto) origenFoto.style.viewTransitionName = "foto-equipo";
    } else if (deDetalleAInicio) {
      const f = $("#galPista img");
      if (f && gal.i === 0) f.style.viewTransitionName = "foto-equipo";
    }

    transicion(() => {
      if (origenFoto) origenFoto.style.viewTransitionName = "";
      if (e) {
        mostrarEquipo(e);
        const f = $("#galPista img");
        if (f && origenFoto) f.style.viewTransitionName = "foto-equipo";
      } else {
        mostrarInicio(restaurar);
        const t = $(`#grilla .tarjeta[data-slug="${destinoSlug}"] img.principal`);
        if (t && restaurar) t.style.viewTransitionName = "foto-equipo";
      }
    }).then(() => {
      $$("[style*='view-transition-name']").forEach(el => (el.style.viewTransitionName = ""));
      origenFoto = null;
      if (!puedeVT && !reduceMotion) {
        const v = e ? $("#vistaEquipo") : $("#vistaInicio");
        v.classList.remove("vista-entrando"); void v.offsetWidth; v.classList.add("vista-entrando");
      }
    });
  }

  // recordamos de dónde venimos para que "Volver" use el historial
  let hashActual = location.hash.slice(1);
  window.addEventListener("hashchange", () => {
    const previo = hashActual;
    hashActual = location.hash.slice(1);
    if (hashActual.startsWith("equipo-") && !previo.startsWith("equipo-")) {
      try { history.replaceState({ desdeInicio: true, hashPrevio: previo }, ""); } catch {}
    }
    enrutar();
    cerrarMenu();
  });

  /* ---------- cabecera, menú y sección activa ---------- */
  const menuBtn = $("#menuBtn"), nav = $("#nav");
  function cerrarMenu() { nav.classList.remove("abierto"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    menuBtn.setAttribute("aria-expanded", abierto);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", cerrarMenu));

  const cab = $("#cabecera");
  const alScroll = () => cab.classList.toggle("con-borde", window.scrollY > 8);
  window.addEventListener("scroll", alScroll, { passive: true });
  alScroll();

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (en.isIntersecting) {
          $$("#nav a").forEach(a => a.classList.toggle("activo", a.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["catalogo", "consignaciones", "ubicacion", "contacto"].forEach(id => io.observe(document.getElementById(id)));
  }

  /* ---------- buscador y orden ---------- */
  let tBuscar;
  $("#buscar").addEventListener("input", ev => {
    clearTimeout(tBuscar);
    tBuscar = setTimeout(() => { estado.q = ev.target.value; renderGrilla(true); }, 160);
  });
  $("#orden").addEventListener("change", ev => { estado.orden = ev.target.value; renderGrilla(true); });

  /* ---------- copiar número ---------- */
  $$("[data-copiar]").forEach(b => b.addEventListener("click", () => copiar(b.dataset.copiar, "Número copiado")));

  /* ---------- equipo de portada (marcado "En portada" en el panel) ---------- */
  function renderPortada() {
    const e = EQ.find(x => x.enPortada) || EQ.find(x => x.destacado) || EQ[0];
    const h = $("#heroDestacado");
    if (!e || !h) return;
    h.href = "#equipo-" + e.slug;
    const img = h.querySelector("img");
    img.src = e.fotos[0].src; img.alt = e.nombre;
    const sub = e.puntos.slice(0, 2).join(" · ");
    h.querySelector(".hero__ficha strong").textContent = e.nombre;
    const spans = h.querySelectorAll(".hero__ficha > span");
    if (spans[1]) spans[1].textContent = sub;
    if (spans[2]) spans[2].textContent = e.precio != null ? fmtPrecio(e) : "Consultar precio";
  }

  /* ---------- arranque ---------- */
  $("#btnMapa").href = C.mapa;
  cablearWA();
  renderPortada();
  renderRubros();
  renderChips();
  const inicial = equipoDesdeHash();
  if (inicial) { vista = "inicio"; mostrarEquipo(inicial); }
  else renderGrilla();
})();
