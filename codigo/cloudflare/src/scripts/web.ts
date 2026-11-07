// Comportamiento de la web (lo exportado de Claude Design y el documento maestro de Claude Design, Bloque 4.6):
// - un solo panel flotante abierto a la vez: abrir uno cierra los demás;
// - tocar fuera cierra: la lista de idiomas al tocar en cualquier otro sitio, el menú ☰ al tocar una zona vacía del menú,
//   las ventanas al tocar el fondo oscuro (y Escape cierra cualquiera);
// - «Volver arriba» aparece al bajar; «Mejores restaurantes» pasa uno a uno con la flecha (nunca solo);
// - «Ver restaurantes»: ciudad elegida → sus restaurantes; sin elegir y en Marruecos → la ciudad más cercana;
//   fuera de Marruecos o sin permiso de ubicación → aviso «Elige una ciudad».

const $ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => raiz.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(s)];

const idiomaBoton = $('[data-idioma-boton]');
const idiomaLista = $('[data-idioma-lista]');
const idiomaFondo = $('[data-idioma-fondo]');
const menu = $('[data-menu]');
const menuAbrir = $('[data-menu-abrir]');
const menuLista = $('[data-menu-lista]');
const menuPanel = $('[data-menu-panel]');
const ventana = $('[data-ventana]');
let ultimoFoco: HTMLElement | null = null;

function cerrarIdioma() {
  if (!idiomaLista || idiomaLista.hidden) return;
  idiomaLista.hidden = true; idiomaFondo!.hidden = true;
  idiomaBoton?.setAttribute('aria-expanded', 'false');
}
function cerrarMenu(devolverFoco = true) {
  if (!menu || menu.hidden) return;
  menu.hidden = true; menuAbrir?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  if (devolverFoco) menuAbrir?.focus();
}
function cerrarVentana() {
  if (!ventana || ventana.hidden) return;
  ventana.hidden = true; document.body.style.overflow = '';
  ultimoFoco?.focus();
}
function cerrarTodo() { cerrarIdioma(); cerrarMenu(false); cerrarVentana(); }

/** Pone el título y el texto de «Crea tu página» o «Contacto del administrador» en el panel dado. */
function prepararContacto(raiz: HTMLElement, cual: string) {
  const b = document.body.dataset;
  $$('[data-titulo-contacto]', raiz).forEach((h) => { h.textContent = cual === 'crea' ? b.tituloCrea! : b.tituloContacto!; });
  $$('[data-solo-crea]', raiz).forEach((p) => { p.hidden = cual !== 'crea'; });
}

// Idioma
idiomaBoton?.addEventListener('click', () => {
  const abrir = idiomaLista!.hidden;
  cerrarTodo();                                                  // abrir la lista cierra el menú ☰ y cualquier ventana
  if (abrir) {
    idiomaLista!.hidden = false; idiomaFondo!.hidden = false;
    idiomaBoton.setAttribute('aria-expanded', 'true');
    $<HTMLElement>('[aria-current="true"]', idiomaLista!)?.focus();
  }
});
idiomaFondo?.addEventListener('click', cerrarIdioma);
$$<HTMLAnchorElement>('[data-idioma]').forEach((a) => a.addEventListener('click', () => {
  // Cookie imprescindible de idioma (sin aviso de cookies, §15): recuerda el idioma elegido para la próxima visita.
  document.cookie = `tm_idioma=${a.dataset.idioma}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  cerrarIdioma();
}));

// Menú ☰ (móvil)
menuAbrir?.addEventListener('click', () => {
  cerrarTodo();                                                  // abrir el menú cierra la lista de idiomas
  menuLista!.hidden = false; menuPanel!.hidden = true;
  menu!.hidden = false; menuAbrir.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  $<HTMLElement>('[data-menu-cerrar]', menu!)?.focus();
});
$('[data-menu-cerrar]')?.addEventListener('click', () => cerrarMenu());
// Zona vacía (sin botón ni enlace) del propio menú → se cierra.
$$('[data-menu-vacio]').forEach((z) => z.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('a, button')) cerrarMenu();
}));
$$('[data-menu-contacto]').forEach((b) => b.addEventListener('click', () => {
  cerrarIdioma();
  prepararContacto(menuPanel!, b.dataset.menuContacto!);
  menuLista!.hidden = true; menuPanel!.hidden = false;
  $<HTMLElement>('[data-menu-volver]', menuPanel!)?.focus();
}));
$('[data-menu-volver]')?.addEventListener('click', () => { menuPanel!.hidden = true; menuLista!.hidden = false; });

// Ventana de contacto (ordenador)
$$('[data-abrir-contacto]').forEach((b) => b.addEventListener('click', () => {
  cerrarTodo();                                                  // abrir la ventana cierra la lista de idiomas
  ultimoFoco = b;
  prepararContacto(ventana!, b.dataset.abrirContacto!);
  ventana!.hidden = false; document.body.style.overflow = 'hidden';
  $<HTMLElement>('[data-ventana-cerrar]', ventana!)?.focus();
}));
$('[data-ventana-cerrar]')?.addEventListener('click', cerrarVentana);
ventana?.addEventListener('click', (e) => { if (e.target === ventana) cerrarVentana(); });

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (idiomaLista && !idiomaLista.hidden) { cerrarIdioma(); idiomaBoton?.focus(); } else { cerrarMenu(); cerrarVentana(); }
});

// Volver arriba
const arriba = $('[data-volver-arriba]');
if (arriba) {
  const ver = () => { arriba.hidden = window.scrollY <= 200; };
  window.addEventListener('scroll', ver, { passive: true }); ver();
  arriba.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Mejores restaurantes: uno cada vez, con la flecha a la derecha (vuelve al primero al llegar al final).
const fila = $('[data-fila-mejores]');
$('[data-siguiente-mejor]')?.addEventListener('click', () => {
  if (!fila) return;
  const alFinal = fila.scrollLeft + fila.clientWidth >= fila.scrollWidth - 4;
  if (alFinal) fila.scrollTo({ left: 0, behavior: 'smooth' });
  else fila.scrollBy({ left: fila.clientWidth, behavior: 'smooth' });
});

// Ver restaurantes
const form = $<HTMLFormElement>('[data-elegir-ciudad]');
if (form) {
  const select = $<HTMLSelectElement>('[data-ciudad]', form)!;
  const aviso = $('[data-aviso]', form)!;
  const avisoTexto = $('[data-aviso-texto]', form)!;
  const d = form.dataset;
  const ir = (slug: string, origen: 'elegida' | 'ubicacion') => { location.href = `${d.ruta!.replace('{ciudad}', slug)}?origen=${origen}`; };
  const avisar = (texto: string) => {
    avisoTexto.textContent = texto; aviso.hidden = false;
    select.setAttribute('aria-invalid', 'true');
  };
  select.addEventListener('change', () => { aviso.hidden = true; select.removeAttribute('aria-invalid'); });

  const coords = JSON.parse(d.coordenadas || '[]') as [string, number, number][];
  const masCercana = (lat: number, lng: number) => {
    let mejor: string | null = null; let min = Infinity;
    for (const [slug, la, lo] of coords) {
      const dist = (la - lat) ** 2 + ((lo - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
      if (dist < min) { min = dist; mejor = slug; }
    }
    return mejor;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (select.value) return ir(select.value, 'elegida');
    // País según Cloudflare: si se sabe y no es Marruecos, no se pide la ubicación.
    if (d.pais && d.pais !== 'MA' && d.pais !== 'XX') return avisar(d.avisoFuera!);
    if (!('geolocation' in navigator) || coords.length === 0) return avisar(d.avisoSinUbicacion!);
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = masCercana(p.coords.latitude, p.coords.longitude); if (c) ir(c, 'ubicacion'); else avisar(d.avisoSinUbicacion!); },
      () => avisar(d.avisoSinUbicacion!),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}
