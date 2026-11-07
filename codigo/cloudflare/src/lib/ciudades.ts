// Ciudades de la lista de la Home (documento maestro de Claude Design, Bloque 4.4): «Ciudades» y 27 ciudades de la A a la Z.
// El slug sale del nombre en español, sin acentos ni espacios (como «tanger», que ya existe en D1).
// Coordenadas del centro: PENDIENTES del titular. Sin ellas, «Ver restaurantes» sin ciudad elegida no puede saber la
// ciudad más cercana y muestra el aviso «Elige una ciudad».

export type Ciudad = { nombre: string; slug: string; lat: number | null; lng: number | null };

const NOMBRES = [
  'Agadir', 'Alhucemas', 'Arcila', 'Beni Melal', 'Casablanca', 'Chefchaouen', 'El Jadida', 'Errachidia', 'Esauira', 'Fez',
  'Ifrán', 'Kenitra', 'Larache', 'Marrakech', 'Mequinez', 'Mohammedia', 'Nador', 'Rabat', 'Safi', 'Salé', 'Tánger',
  'Tarudant', 'Taza', 'Tetuán', 'Tiznit', 'Uarzazate', 'Uxda',
] as const;

export const slugCiudad = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const CIUDADES: Ciudad[] = NOMBRES.map((nombre) => ({ nombre, slug: slugCiudad(nombre), lat: null, lng: null }));

export const ciudadPorSlug = (slug: string) => CIUDADES.find((c) => c.slug === slug) ?? null;
