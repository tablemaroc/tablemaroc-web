// Textos de la interfaz, tal como están en lo exportado de Claude Design y en docs/18-textos.
// Los textos aún no se traducen (documento maestro de Claude Design, Bloque 4.3 y 7): en y fr muestran el español hasta
// que el titular apruebe las traducciones. Lo que no tiene texto aprobado va como marcador [AVISO: …].

export type Idioma = 'es' | 'en' | 'fr';

const es = {
  logoInicio: 'Tablemaroc, inicio',
  principal: 'Principal',
  navegacionPrincipal: 'Navegación principal',
  todoTablemaroc: 'Todo Tablemaroc',
  restaurantes: 'Restaurantes',
  ciudades: 'Ciudades',
  guias: 'Guías',
  sobreNosotros: 'Sobre nosotros',
  legales: 'Legales',
  contacto: 'Contacto del administrador',
  creaTuPagina: 'Crea tu página',
  paraCrearTuPagina: 'Para crear tu página, contacta con el administrador.',
  administrador: 'Administrador de Tablemaroc',
  datosContacto: '[DATOS DE CONTACTO DEL ADMINISTRADOR]',   // los rellena el titular (Bloque 4.10)
  miCuenta: 'Mi cuenta',
  inicio: 'Inicio',
  cuenta: 'Cuenta',
  menu: 'Menú',
  abrirMenu: 'Abrir menú',
  cerrarMenu: 'Cerrar menú',
  cerrar: 'Cerrar',
  idioma: 'Idioma',
  volverArriba: 'Volver arriba',
  // Slugs provisionales de páginas aún sin programar (docs/18-textos, decisión 5 pendiente del titular).
  slugSobreNosotros: 'sobre-nosotros',
  slugLegales: 'legales',

  // Home
  tituloHome: 'Tablemaroc',
  elegirCiudad: 'Elegir ciudad',
  ciudad: 'Ciudad',
  opcionCiudades: 'Ciudades',
  verRestaurantes: 'Ver restaurantes',
  eligeUnaCiudad: 'Elige una ciudad',
  avisoFuera: 'No estás en Marruecos. Elige en la lista la ciudad donde vas a comer.',
  avisoSinUbicacion: 'No sabemos dónde estás. Elige en la lista la ciudad donde vas a comer.',
  mejoresRestaurantes: 'Mejores restaurantes',
  verMasRestaurantes: 'Ver más restaurantes',
  mejorPlato: 'Mejor plato:',
  guia: 'Guía',
  nRestaurantes: (n: number) => `${n} restaurantes`,

  // Restaurantes de una ciudad
  cambiarCiudad: 'Cambiar ciudad',
  filtros: 'Filtros',
  abiertoAhora: 'Abierto ahora',
  vegetariano: 'Vegetariano',
  pagoConTarjeta: 'Pago con tarjeta',
  terraza: 'Terraza',
  segunTuUbicacion: 'Según tu ubicación',
  ciudadElegida: 'Ciudad elegida',
  restaurante: 'Restaurante',
  sinFiltros: 'No hay resultados con estos filtros. Prueba a quitar alguno.',       // docs/18-textos/03
  sinRestaurantes: '[AVISO: aún no hay restaurantes en esta ciudad]',               // sin texto aprobado
  sinResenas: 'Aún sin reseñas',                                                    // docs/18-textos/03
  estrellas: (nota: string) => `${nota} de 5 estrellas`,
  precio: (n: number) => `Precio: ${n} de 4`,
  estado: {
    abierto: 'Abierto', cerrado: 'Cerrado', sin_horario: 'Sin horario', consultar_ramadan: 'Horario de Ramadán: consultar',
    cerrado_temporalmente: 'Cerrado temporalmente', cerrado_definitivamente: 'Cerrado definitivamente',
  } as Record<string, string>,
};

export type Textos = typeof es;
export const T: Record<Idioma, Textos> = { es, en: es, fr: es };

export const esIdioma = (v: unknown): v is Idioma => v === 'es' || v === 'en' || v === 'fr';
export const formatoNota = (n: number, idioma: Idioma) => n.toLocaleString(idioma === 'en' ? 'en-GB' : idioma, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
