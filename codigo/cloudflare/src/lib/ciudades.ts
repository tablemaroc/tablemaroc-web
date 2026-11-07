// Ciudades de la lista de la Home (documento maestro de Claude Design, Bloque 4.4): «Ciudades» y 27 ciudades de la A a la Z.
// El slug sale del nombre en español, sin acentos ni espacios (como «tanger», que ya existe en D1).
// Coordenadas aproximadas del centro de cada ciudad (WGS84), puestas por Claude a petición del titular (07-11-2026).
// Solo sirven para que «Ver restaurantes» sin ciudad elegida lleve a la ciudad más cercana a la ubicación del visitante.

export type Ciudad = { nombre: string; slug: string; lat: number | null; lng: number | null };

const NOMBRES = [
  'Agadir', 'Alhucemas', 'Arcila', 'Beni Melal', 'Casablanca', 'Chefchaouen', 'El Jadida', 'Errachidia', 'Esauira', 'Fez',
  'Ifrán', 'Kenitra', 'Larache', 'Marrakech', 'Mequinez', 'Mohammedia', 'Nador', 'Rabat', 'Safi', 'Salé', 'Tánger',
  'Tarudant', 'Taza', 'Tetuán', 'Tiznit', 'Uarzazate', 'Uxda',
] as const;

export const slugCiudad = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CENTROS: Record<(typeof NOMBRES)[number], [number, number]> = {
  Agadir: [30.4202, -9.5982], Alhucemas: [35.2517, -3.9372], Arcila: [35.4651, -6.0349], 'Beni Melal': [32.3373, -6.3498],
  Casablanca: [33.5731, -7.5898], Chefchaouen: [35.1688, -5.2636], 'El Jadida': [33.2316, -8.5007], Errachidia: [31.9314, -4.4247],
  Esauira: [31.5085, -9.7595], Fez: [34.0181, -5.0078], 'Ifrán': [33.5228, -5.1106], Kenitra: [34.2610, -6.5802],
  Larache: [35.1932, -6.1557], Marrakech: [31.6295, -7.9811], Mequinez: [33.8935, -5.5547], Mohammedia: [33.6866, -7.3830],
  Nador: [35.1681, -2.9335], Rabat: [34.0209, -6.8416], Safi: [32.2994, -9.2372], 'Salé': [34.0331, -6.7985],
  'Tánger': [35.7595, -5.8340], Tarudant: [30.4703, -8.8770], Taza: [34.2100, -4.0100], 'Tetuán': [35.5889, -5.3626],
  Tiznit: [29.6974, -9.7316], Uarzazate: [30.9189, -6.8934], Uxda: [34.6814, -1.9086],
};

export const CIUDADES: Ciudad[] = NOMBRES.map((nombre) => ({ nombre, slug: slugCiudad(nombre), lat: CENTROS[nombre][0], lng: CENTROS[nombre][1] }));

export const ciudadPorSlug = (slug: string) => CIUDADES.find((c) => c.slug === slug) ?? null;
