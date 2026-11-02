import type { Locale } from '../../shared/locales.ts';

/**
 * Páginas informativas del pie, en /{idioma}/info/{slug}. Describen lo que la web hace de verdad: no se inventan datos.
 * `legal`: BORRADOR hasta que lo apruebe el asesor del titular (docs/15); la página lo avisa. Ninguna se indexa todavía.
 * Bloques: un texto es un párrafo; `{ h }`, un subtítulo.
 */
export const CONTACT_EMAIL = 'moradvisor@gmail.com';
export const INFO_SLUGS = ['sobre-nosotros', 'contacto', 'como-funcionan-las-resenas', 'privacidad', 'cookies', 'aviso-legal', 'condiciones'] as const;
export type InfoSlug = (typeof INFO_SLUGS)[number];
export const isInfoSlug = (v: string): v is InfoSlug => (INFO_SLUGS as readonly string[]).includes(v);
export const LEGAL_SLUGS: readonly InfoSlug[] = ['privacidad', 'cookies', 'aviso-legal', 'condiciones'];

type Block = string | { h: string };
interface Page { title: string; blocks: Block[] }

export const INFO_PAGES: Record<InfoSlug, Record<Locale, Page>> = {
  'sobre-nosotros': {
    es: { title: 'Sobre nosotros', blocks: [
      'Tablemaroc es una guía gastronómica de Marruecos: restaurantes, cafés y teterías, comida callejera, mercados y zocos, platos típicos y guías por ciudad.',
      'Está disponible en español, inglés y francés, y pensada para consultarse desde el móvil, incluso con mala cobertura.',
      { h: 'Cómo trabajamos' },
      'Los precios se muestran solo en dírhams marroquíes (MAD). Si no tenemos un dato comprobado, no lo inventamos: lo indicamos como pendiente.',
      'La publicidad, los enlaces de afiliado o los destacados de pago nunca cambian las puntuaciones, la moderación de reseñas ni el orden de los resultados. Si algo es patrocinado, se indica de forma visible.',
    ] },
    en: { title: 'About us', blocks: [
      'Tablemaroc is a food guide to Morocco: restaurants, cafés and tea rooms, street food, markets and souks, typical dishes and city guides.',
      'It is available in Spanish, English and French, and designed to be used on your phone, even with poor coverage.',
      { h: 'How we work' },
      'Prices are shown only in Moroccan dirhams (MAD). If we do not have a verified detail, we do not make it up: we mark it as pending.',
      'Advertising, affiliate links and paid placements never change ratings, review moderation or the order of results. Anything sponsored is clearly labelled.',
    ] },
    fr: { title: 'À propos', blocks: [
      'Tablemaroc est un guide gastronomique du Maroc : restaurants, cafés et salons de thé, cuisine de rue, marchés et souks, plats typiques et guides par ville.',
      'Il est disponible en espagnol, en anglais et en français, et conçu pour le téléphone, même avec une mauvaise couverture.',
      { h: 'Notre façon de travailler' },
      'Les prix sont affichés uniquement en dirhams marocains (MAD). Si une information n’est pas vérifiée, nous ne l’inventons pas : nous l’indiquons comme en attente.',
      'La publicité, les liens d’affiliation et les mises en avant payantes ne modifient jamais les notes, la modération des avis ni l’ordre des résultats. Tout contenu sponsorisé est clairement signalé.',
    ] },
  },
  contacto: {
    es: { title: 'Contacto', blocks: ['Para cualquier duda, corrección de datos de un lugar o consulta sobre privacidad, escríbenos a este email:'] },
    en: { title: 'Contact', blocks: ['For any question, a correction to a place’s details or a privacy request, write to us at this email address:'] },
    fr: { title: 'Contact', blocks: ['Pour toute question, correction des informations d’un lieu ou demande relative à la vie privée, écrivez-nous à cette adresse :'] },
  },
  'como-funcionan-las-resenas': {
    es: { title: 'Cómo funcionan las reseñas', blocks: [
      'Las reseñas las escriben visitantes con cuenta: puntuación de 1 a 5 estrellas, comentario y hasta 3 fotos.',
      { h: 'Moderación' },
      'Ninguna reseña se publica sin revisarla antes. Se rechazan las que sean spam, ofensivas, contengan datos personales, presenten un conflicto de intereses o sean falsas.',
      { h: 'Límites' },
      'Cada persona puede escribir un máximo de 5 reseñas en 24 horas. Las reseñas se muestran en el idioma original.',
      { h: 'Tus reseñas' },
      'Puedes borrar tus reseñas y tu cuenta cuando quieras desde Mi cuenta.',
    ] },
    en: { title: 'How reviews work', blocks: [
      'Reviews are written by visitors with an account: a rating from 1 to 5 stars, a comment and up to 3 photos.',
      { h: 'Moderation' },
      'No review is published without being checked first. We reject reviews that are spam, offensive, contain personal data, involve a conflict of interest or are false.',
      { h: 'Limits' },
      'Each person can write up to 5 reviews in 24 hours. Reviews are shown in their original language.',
      { h: 'Your reviews' },
      'You can delete your reviews and your account at any time from My account.',
    ] },
    fr: { title: 'Fonctionnement des avis', blocks: [
      'Les avis sont rédigés par des visiteurs ayant un compte : une note de 1 à 5 étoiles, un commentaire et jusqu’à 3 photos.',
      { h: 'Modération' },
      'Aucun avis n’est publié sans vérification préalable. Nous refusons les avis qui sont du spam, injurieux, qui contiennent des données personnelles, présentent un conflit d’intérêts ou sont faux.',
      { h: 'Limites' },
      'Chaque personne peut rédiger 5 avis au maximum en 24 heures. Les avis sont affichés dans leur langue d’origine.',
      { h: 'Vos avis' },
      'Vous pouvez supprimer vos avis et votre compte à tout moment depuis Mon compte.',
    ] },
  },
  privacidad: {
    es: { title: 'Política de privacidad', blocks: [
      { h: 'Qué datos tratamos' },
      'Si creas una cuenta, tu email y, con Google o Apple, los datos básicos de perfil que facilitan. Si escribes una reseña, tu nombre visible, tu puntuación, tu comentario y tus fotos. Guardamos también la versión y la fecha de tu consentimiento.',
      'Tu nombre visible y tus reseñas aprobadas son públicos. Tu email no se publica nunca.',
      { h: 'Lo que no hacemos' },
      'No vendemos tus datos. No usamos publicidad ni analítica. No usamos tu ubicación: el mapa muestra la del lugar.',
      { h: 'Proveedores' },
      'Usamos proveedores para hacer funcionar la web, entre ellos Supabase, que aloja la base de datos en la Unión Europea, y Google, para el acceso y para el mapa, que solo se carga si pulsas «Ver mapa».',
      { h: 'Tus derechos' },
      'Desde Mi cuenta puedes cambiar tu nombre, borrar tus reseñas, descargar tus datos y eliminar tu cuenta. Para cualquier otra solicitud, usa la página de Contacto.',
    ] },
    en: { title: 'Privacy policy', blocks: [
      { h: 'What data we process' },
      'If you create an account, your email and, with Google or Apple, the basic profile details they provide. If you write a review, your display name, rating, comment and photos. We also keep the version and date of your consent.',
      'Your display name and approved reviews are public. Your email is never published.',
      { h: 'What we do not do' },
      'We do not sell your data. We do not use advertising or analytics. We do not use your location: the map shows the place’s location.',
      { h: 'Providers' },
      'We use providers to run the website, including Supabase, which hosts the database in the European Union, and Google, for sign-in and for the map, which only loads if you press “View map”.',
      { h: 'Your rights' },
      'From My account you can change your name, delete your reviews, download your data and delete your account. For any other request, use the Contact page.',
    ] },
    fr: { title: 'Politique de confidentialité', blocks: [
      { h: 'Quelles données nous traitons' },
      'Si vous créez un compte, votre e-mail et, avec Google ou Apple, les informations de profil de base qu’ils fournissent. Si vous rédigez un avis, votre nom affiché, votre note, votre commentaire et vos photos. Nous conservons aussi la version et la date de votre consentement.',
      'Votre nom affiché et vos avis approuvés sont publics. Votre e-mail n’est jamais publié.',
      { h: 'Ce que nous ne faisons pas' },
      'Nous ne vendons pas vos données. Nous n’utilisons ni publicité ni mesure d’audience. Nous n’utilisons pas votre position : la carte montre celle du lieu.',
      { h: 'Prestataires' },
      'Nous faisons appel à des prestataires pour faire fonctionner le site, dont Supabase, qui héberge la base de données dans l’Union européenne, et Google, pour la connexion et pour la carte, qui ne se charge que si vous appuyez sur « Voir la carte ».',
      { h: 'Vos droits' },
      'Depuis Mon compte, vous pouvez modifier votre nom, supprimer vos avis, télécharger vos données et supprimer votre compte. Pour toute autre demande, utilisez la page Contact.',
    ] },
  },
  cookies: {
    es: { title: 'Política de cookies', blocks: [
      { h: 'Cookie de sesión' },
      'Solo si entras en tu cuenta. Es necesaria para mantenerte identificado.',
      { h: 'Copia sin conexión' },
      'Tu navegador guarda los archivos de la web y hasta 20 páginas visitadas para que funcione con mala cobertura. Se queda en tu dispositivo y puedes borrarla desde los ajustes del navegador.',
      { h: 'Google Maps' },
      'Solo se carga si pulsas «Ver mapa», y entonces puede usar sus propias cookies. Sin pulsar, la web no contacta con Google.',
      { h: 'Analítica y publicidad' },
      'No usamos cookies de analítica ni de publicidad.',
    ] },
    en: { title: 'Cookie policy', blocks: [
      { h: 'Session cookie' },
      'Only if you sign in to your account. It is needed to keep you signed in.',
      { h: 'Offline copy' },
      'Your browser stores the website’s files and up to 20 visited pages so it works with poor coverage. This stays on your device and you can delete it in your browser settings.',
      { h: 'Google Maps' },
      'It only loads if you press “View map”, and it may then use its own cookies. Unless you press it, the website does not contact Google.',
      { h: 'Analytics and advertising' },
      'We do not use analytics or advertising cookies.',
    ] },
    fr: { title: 'Politique de cookies', blocks: [
      { h: 'Cookie de session' },
      'Uniquement si vous vous connectez à votre compte. Il est nécessaire pour rester identifié.',
      { h: 'Copie hors ligne' },
      'Votre navigateur enregistre les fichiers du site et jusqu’à 20 pages visitées pour fonctionner avec une mauvaise couverture. Cela reste sur votre appareil et vous pouvez l’effacer dans les réglages du navigateur.',
      { h: 'Google Maps' },
      'La carte ne se charge que si vous appuyez sur « Voir la carte », et elle peut alors utiliser ses propres cookies. Sans cela, le site ne contacte pas Google.',
      { h: 'Mesure d’audience et publicité' },
      'Nous n’utilisons pas de cookies de mesure d’audience ni de publicité.',
    ] },
  },
  'aviso-legal': {
    es: { title: 'Aviso legal', blocks: [
      'Tablemaroc.com es una guía gastronómica editada por una persona física residente en Marruecos. Los datos completos del responsable se publicarán aquí antes del lanzamiento.',
      'Puedes contactar con el responsable desde la página de Contacto.',
      { h: 'Exactitud de la información' },
      'Procuramos verificar los datos, pero horarios, precios y disponibilidad pueden cambiar. Confírmalos con el establecimiento antes de ir.',
    ] },
    en: { title: 'Legal notice', blocks: [
      'Tablemaroc.com is a food guide published by an individual resident in Morocco. The full details of the person responsible will be published here before launch.',
      'You can reach the person responsible through the Contact page.',
      { h: 'Accuracy of information' },
      'We try to verify details, but opening hours, prices and availability may change. Please confirm them with the place before you go.',
    ] },
    fr: { title: 'Mentions légales', blocks: [
      'Tablemaroc.com est un guide gastronomique édité par une personne physique résidant au Maroc. Les coordonnées complètes du responsable seront publiées ici avant le lancement.',
      'Vous pouvez contacter le responsable depuis la page Contact.',
      { h: 'Exactitude des informations' },
      'Nous nous efforçons de vérifier les informations, mais les horaires, les prix et la disponibilité peuvent changer. Confirmez-les auprès de l’établissement avant de vous y rendre.',
    ] },
  },
  condiciones: {
    es: { title: 'Condiciones de uso', blocks: [
      'Al usar Tablemaroc aceptas estas condiciones.',
      { h: 'Uso de la web' },
      'La web es de consulta gratuita. No la uses para fines ilegales ni para publicar contenido engañoso.',
      { h: 'Tu contenido' },
      'Eres responsable de tus reseñas y fotos. Solo sube fotos tuyas. Al publicarlas, nos autorizas a mostrarlas junto a tu reseña. Podemos rechazar el contenido que no cumpla las reglas de reseñas.',
      { h: 'Información de los lugares' },
      'La información se ofrece como orientación. Confirma horarios y precios con cada establecimiento.',
    ] },
    en: { title: 'Terms of use', blocks: [
      'By using Tablemaroc you accept these terms.',
      { h: 'Use of the website' },
      'The website is free to consult. Do not use it for illegal purposes or to publish misleading content.',
      { h: 'Your content' },
      'You are responsible for your reviews and photos. Only upload your own photos. By publishing them, you allow us to show them with your review. We may reject content that breaks the review rules.',
      { h: 'Information about places' },
      'Information is provided as guidance. Confirm opening hours and prices with each place.',
    ] },
    fr: { title: 'Conditions d’utilisation', blocks: [
      'En utilisant Tablemaroc, vous acceptez ces conditions.',
      { h: 'Utilisation du site' },
      'La consultation du site est gratuite. Ne l’utilisez pas à des fins illégales ni pour publier du contenu trompeur.',
      { h: 'Votre contenu' },
      'Vous êtes responsable de vos avis et de vos photos. Ne publiez que vos propres photos. En les publiant, vous nous autorisez à les afficher avec votre avis. Nous pouvons refuser le contenu qui ne respecte pas les règles des avis.',
      { h: 'Informations sur les lieux' },
      'Les informations sont données à titre indicatif. Confirmez les horaires et les prix auprès de chaque établissement.',
    ] },
  },
};
