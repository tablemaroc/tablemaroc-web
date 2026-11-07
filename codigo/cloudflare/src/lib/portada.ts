// Datos de la Home (documento maestro de Claude Design, Bloque 4.4). Solo lo PUBLICADO y lo APROBADO.
// «Mejores restaurantes»: los marca el titular (home_best_position, migración 0004), por orden.
// Guías: las publicadas, con el número de restaurantes publicados que tienen.

import type { Idioma } from './publico.ts';
import { rutaPublica } from './contenido.ts';
import { ciudadPorSlug } from './ciudades.ts';

const titulo = (tipo: string, campo: string) =>
  `coalesce((SELECT title FROM translations WHERE entity_type = '${tipo}' AND entity_id = ${campo} AND locale = ?1 AND status = 'publicada'),
            (SELECT title FROM translations WHERE entity_type = '${tipo}' AND entity_id = ${campo} AND locale = 'es' AND status = 'publicada'))`;

export type Mejor = { nombre: string; ciudad: string; mejorPlato: string | null; media: number | null; resenas: number;
  foto: string | null; ruta: string | null };

export async function mejoresRestaurantes(db: D1Database, idioma: Idioma): Promise<Mejor[]> {
  const filas = (await db.prepare(
    `SELECT p.slug, pt.slug AS tipo, c.slug AS ciudad_slug,
            ${titulo('place', 'p.id')} AS nombre, ${titulo('city', 'c.id')} AS ciudad,
            coalesce((SELECT name FROM menu_translations WHERE target_type = 'item' AND target_id = p.home_best_dish_item_id AND locale = ?1 AND status = 'publicada'),
                     (SELECT name FROM menu_translations WHERE target_type = 'item' AND target_id = p.home_best_dish_item_id AND locale = 'es' AND status = 'publicada')) AS mejor_plato,
            (SELECT round(avg(rating), 1) FROM reviews WHERE place_id = p.id AND status = 'aprobada') AS media,
            (SELECT count(*) FROM reviews WHERE place_id = p.id AND status = 'aprobada') AS resenas,
            (SELECT r2_key FROM photos WHERE place_id = p.id AND status = 'aprobada' ORDER BY is_entrance DESC, created_at LIMIT 1) AS foto
     FROM places p JOIN place_types pt ON pt.id = p.place_type_id JOIN cities c ON c.id = p.city_id
     WHERE p.home_best_position IS NOT NULL AND p.status = 'publicado' AND p.open_status <> 'cerrado_definitivamente'
     ORDER BY p.home_best_position`,
  ).bind(idioma).all<{ slug: string; tipo: string; ciudad_slug: string; nombre: string | null; ciudad: string | null;
    mejor_plato: string | null; media: number | null; resenas: number; foto: string | null }>()).results;
  return filas.filter((f) => f.nombre).map((f) => ({
    nombre: f.nombre!, ciudad: f.ciudad ?? ciudadPorSlug(f.ciudad_slug)?.nombre ?? f.ciudad_slug,
    mejorPlato: f.mejor_plato, media: f.resenas ? f.media : null, resenas: f.resenas,
    foto: f.foto ? `/${f.foto}` : null, ruta: rutaPublica('locales', idioma, f.slug, f.tipo),
  }));
}

export type GuiaPortada = { titulo: string; restaurantes: number; foto: string | null; ruta: string | null };

export async function guiasPortada(db: D1Database, idioma: Idioma): Promise<GuiaPortada[]> {
  const filas = (await db.prepare(
    `SELECT g.slug, ${titulo('guide', 'g.id')} AS titulo,
            (SELECT count(*) FROM guide_places gp JOIN places p ON p.id = gp.place_id WHERE gp.guide_id = g.id AND p.status = 'publicado') AS restaurantes,
            (SELECT r2_key FROM photos WHERE guide_id = g.id AND status = 'aprobada' ORDER BY created_at LIMIT 1) AS foto
     FROM guides g WHERE g.status = 'publicado' ORDER BY titulo`,
  ).bind(idioma).all<{ slug: string; titulo: string | null; restaurantes: number; foto: string | null }>()).results;
  return filas.filter((f) => f.titulo).map((f) => ({
    titulo: f.titulo!, restaurantes: f.restaurantes, foto: f.foto ? `/${f.foto}` : null, ruta: rutaPublica('guias', idioma, f.slug),
  }));
}
