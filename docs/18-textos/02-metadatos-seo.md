# Títulos, descripciones y H1 por plantilla

Variables entre llaves: `{local}`, `{ciudad}`, `{tipo}`, `{plato}`, `{guia}`, `{n}` (número de locales publicados).
Título ≤ 60 caracteres y descripción ≤ 155 aprox. (el francés más largo: comprobar al publicar).
Marca al final del título: ` · Tablemaroc`. Si el título pasa de 60, se quita la marca, nunca la palabra clave.
`{n}` solo se muestra si es un número real de la base de datos.

---

## Portada

| | es | en | fr |
|---|---|---|---|
| title | Dónde comer en Marruecos: restaurantes y platos típicos · Tablemaroc | Where to eat in Morocco: restaurants and local food · Tablemaroc | Où manger au Maroc : restaurants et plats typiques · Tablemaroc |
| description | Guía para comer en Marruecos: restaurantes, cafés y teterías, comida callejera y mercados, con reseñas moderadas y precios en dírhams. Sin publicidad. | A guide to eating in Morocco: restaurants, cafés and tea rooms, street food and markets, with moderated reviews and prices in dirhams. No ads. | Le guide pour manger au Maroc : restaurants, cafés et salons de thé, street food et marchés, avec avis modérés et prix en dirhams. Sans publicité. |
| H1 | Dónde comer en Marruecos | Where to eat in Morocco | Où manger au Maroc |

> Títulos de portada algo largos (≈65): se acepta porque la marca va al final y Google la puede cortar sin perder la palabra clave.

## Ciudad

| | es | en | fr |
|---|---|---|---|
| title | Dónde comer en {ciudad}: restaurantes y platos típicos | Where to eat in {ciudad}: restaurants and local food | Où manger à {ciudad} : restaurants et plats typiques |
| description | Los mejores sitios para comer en {ciudad}: restaurantes, cafés y teterías, comida callejera y mercados, con reseñas de viajeros y cómo llegar. | The best places to eat in {ciudad}: restaurants, cafés and tea rooms, street food and markets, with traveller reviews and directions. | Les meilleures adresses pour manger à {ciudad} : restaurants, cafés et salons de thé, street food et marchés, avec avis de voyageurs et itinéraire. |
| H1 | Dónde comer en {ciudad} | Where to eat in {ciudad} | Où manger à {ciudad} |

Nombre de la ciudad por idioma: Tánger · Tangier · Tanger.

## Ciudad + tipo

| Tipo | es (title · H1) | en | fr |
|---|---|---|---|
| restaurantes | Restaurantes en {ciudad} · Tablemaroc | Restaurants in {ciudad} · Tablemaroc | Restaurants à {ciudad} · Tablemaroc |
| cafés y teterías | Cafés y teterías en {ciudad} · Tablemaroc | Cafés and tea rooms in {ciudad} · Tablemaroc | Cafés et salons de thé à {ciudad} · Tablemaroc |
| comida callejera | Comida callejera en {ciudad} · Tablemaroc | Street food in {ciudad} · Tablemaroc | Street food à {ciudad} · Tablemaroc |
| mercados y zocos | Mercados y zocos de {ciudad} · Tablemaroc | Markets and souks in {ciudad} · Tablemaroc | Marchés et souks de {ciudad} · Tablemaroc |

Descripciones:

- **es:** «{n} {tipo} en {ciudad} con reseñas de viajeros, horario, «abierto ahora», precios en dírhams y cómo llegar.»
- **en:** «{n} {tipo} in {ciudad} with traveller reviews, opening hours, “open now”, prices in dirhams and directions.»
- **fr:** «{n} {tipo} à {ciudad} avec avis de voyageurs, horaires, « ouvert maintenant », prix en dirhams et itinéraire.»

## Tipo de lugar (todo Marruecos)

| | es | en | fr |
|---|---|---|---|
| title | {Tipo} en Marruecos · Tablemaroc | {Tipo} in Morocco · Tablemaroc | {Tipo} au Maroc · Tablemaroc |
| description | {Tipo} de Marruecos por ciudad, con reseñas moderadas, horarios y precios en dírhams. | {Tipo} in Morocco by city, with moderated reviews, opening hours and prices in dirhams. | {Tipo} au Maroc par ville, avec avis modérés, horaires et prix en dirhams. |

Comida callejera: «Comida callejera marroquí» · «Moroccan street food» · «Street food marocaine».

## Info del local

| | es | en | fr |
|---|---|---|---|
| title | {local}, {ciudad}: menú, reseñas y cómo llegar | {local}, {ciudad}: menu, reviews and directions | {local}, {ciudad} : menu, avis et itinéraire |
| description | {Tipo en singular} en {ciudad}. {Primera frase real de la descripción}. Horario, menú con precios en dírhams, reseñas y cómo llegar. | {Tipo} in {ciudad}. {…}. Opening hours, menu with prices in dirhams, reviews and directions. | {Tipo} à {ciudad}. {…}. Horaires, menu avec prix en dirhams, avis et itinéraire. |
| H1 | {local} | | |

Si el local no tiene menú publicado, se quita «menú» del título y la descripción. Si no acepta reservas, no se habla de reservas.

## Menú del local

| | es | en | fr |
|---|---|---|---|
| title | Menú de {local} ({ciudad}) con precios | {local} menu ({ciudad}) with prices | Menu de {local} ({ciudad}) avec prix |
| description | Carta de {local} en {ciudad}: platos y precios en dírhams (MAD), verificados el {fecha}. | {local} menu in {ciudad}: dishes and prices in dirhams (MAD), checked on {fecha}. | La carte de {local} à {ciudad} : plats et prix en dirhams (MAD), vérifiés le {fecha}. |
| H1 | Menú de {local} | {local} menu | Menu de {local} |

## Plato típico

| | es | en | fr |
|---|---|---|---|
| title | {plato}: qué es y dónde comerlo en Marruecos | {plato}: what it is and where to eat it in Morocco | {plato} : ce que c’est et où en manger au Maroc |
| description | Qué es el {plato}, cómo se come y en qué locales de Marruecos probarlo, con reseñas y precios en dírhams. | What {plato} is, how it’s eaten and where to try it in Morocco, with reviews and prices in dirhams. | Ce qu’est le {plato}, comment on le mange et où le goûter au Maroc, avec avis et prix en dirhams. |
| H1 | {plato} | | |

Género en es/fr según el plato (el tajín, la pastela, la harira; le tajine, la pastilla, la harira). Se escribe a mano por plato
en `06-platos-tipicos.md`, no con la variable.

## Listados generales

| Página | es | en | fr |
|---|---|---|---|
| Platos | Platos típicos de Marruecos: qué comer y dónde | Typical Moroccan dishes: what to eat and where | Plats typiques marocains : quoi manger et où |
| Guías | Guías gastronómicas de Marruecos · Tablemaroc | Morocco food guides · Tablemaroc | Guides gastronomiques du Maroc · Tablemaroc |
| Ciudades | Ciudades de Marruecos: dónde comer en cada una | Cities in Morocco: where to eat in each one | Villes du Maroc : où manger dans chacune |
| Búsqueda | Resultados para «{consulta}» · Tablemaroc (noindex) | Results for “{consulta}” · Tablemaroc (noindex) | Résultats pour « {consulta} » · Tablemaroc (noindex) |

## Guía

title = título de la guía (contiene su palabra clave, ver `01-palabras-clave.md`); description = la entradilla recortada.

## Páginas sin indexar

Acceso, Escribir reseña, Mi cuenta, Reserva, búsqueda, errores: `noindex`. Títulos sencillos:
«Entrar · Tablemaroc», «Escribir una reseña · Tablemaroc», «Mi cuenta · Tablemaroc», «Reservar en {local} · Tablemaroc»,
«Página no encontrada · Tablemaroc» (en: Sign in, Write a review, My account, Book a table at {local}, Page not found;
fr : Se connecter, Écrire un avis, Mon compte, Réserver chez {local}, Page introuvable).

## Texto alternativo de las fotos (patrón)

- Local: «{qué se ve}, en {local} ({ciudad})» → «Tajín de pollo con limón en {local} (Tánger)». Lo escribe quien modera, viendo la foto.
- Entrada del local: «Entrada de {local} en {calle}, {ciudad}».
- Mapa estático: «Mapa de la ubicación de {local} en {ciudad}».
