import { notFound } from 'next/navigation';
import { LOCALES } from '../../../../../../shared/locales.ts';
import { formatPriceMad } from '../../../../../../shared/price.ts';
import { getMenuData, menuGate } from '../../../../../../backend/admin-moderation/menu-admin.ts';
import { requireAdmin } from '../../../../../lib/admin.ts';
import { supabaseForRequest } from '../../../../../lib/supabase-server.ts';
import { AdminForm, ValueButton } from '../../../AdminForm.tsx';
import { menuPublish, menuSaveCategory, menuSaveItem, menuToggleItem } from '../../../actions.ts';
import { Area, Text } from '../../../fields.tsx';
import styles from '../../../admin.module.css';

export const metadata = { title: 'Menú' };
type Row = Record<string, any>;

const LABELS: Record<string, string> = { name_es: 'Nombre (es)', price_mad: 'Precio', availability: 'Disponibilidad', status: 'Menú' };

function ItemFields({ item, names, categoryId }: { item?: Row; names?: Record<string, Row>; categoryId: string }) {
  return (
    <>
      <input type="hidden" name="category_id" value={categoryId} />
      <div className={styles.row3}>
        {LOCALES.map((l) => <Text key={l} name={`name_${l}`} label={`Nombre (${l})`} value={names?.[l]?.name} />)}
      </div>
      <div className={styles.row3}>
        {LOCALES.map((l) => <Area key={l} name={`description_${l}`} label={`Descripción (${l})`} value={names?.[l]?.description} rows={2} />)}
      </div>
      <div className={styles.row3}>
        <Text name="price_mad" label="Precio en MAD" value={item?.price_mad} inputMode="decimal" hint="Solo el número: 120 o 12,50. Vacío = pendiente." />
        <label className={styles.field}><span>Disponibilidad</span>
          <select name="availability" defaultValue={item?.availability ?? 'desconocida'}>
            <option value="desconocida">Desconocida</option><option value="disponible">Disponible</option><option value="agotado">Agotado</option>
          </select>
        </label>
        <Text name="position" label="Orden" value={item?.position ?? 0} inputMode="decimal" />
      </div>
      <label className={styles.check}><input type="checkbox" name="price_verified" defaultChecked={item?.price_status === 'verificado'} /> Precio verificado (si no, la web muestra «Precio pendiente»)</label>
      <Area name="allergens" label="Alérgenos" value={(item?.allergens ?? []).join('\n')} rows={2} hint="Solo si están verificados. Uno por línea." />
    </>
  );
}

/** Editor del menú de un lugar. */
export default async function MenuEditor({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  if (entity !== 'lugares' || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireAdmin(`/admin/lugares/${id}/menu`);
  const db = await supabaseForRequest();
  const { data: place } = await db.from('places').select('id,slug,status').eq('id', id).maybeSingle();
  if (!place) notFound();
  const data = await getMenuData(db, id);
  const gate = menuGate(data, place.status);
  const hidden = { entity: 'lugares', id };
  const name = (x: Row) => data.names[x.id]?.es?.name ?? '(sin nombre)';
  return (
    <>
      <p className={styles.back}><a href={`/admin/lugares/${id}`}>← {place.slug}</a></p>
      <h1 className={styles.title}>Menú</h1>
      <p className={styles.muted}>Precios solo en MAD. Usa únicamente datos comprobados: si no sabes un precio, déjalo vacío.</p>

      <section className={styles.card}>
        <h2>Publicación</h2>
        <p className={styles.meta}><span className={styles[`status_${data.menu?.status ?? 'borrador'}`]}>{data.menu?.status === 'publicado' ? 'Publicado' : 'Sin publicar'}</span></p>
        <AdminForm action={menuPublish} hidden={hidden} labels={LABELS} submit="" className={styles.inline}>
          <ValueButton name="menu_action" value="publicar">{data.menu?.status === 'publicado' ? 'Actualizar menú publicado' : 'Publicar menú'}</ValueButton>
          {data.menu?.status === 'publicado' && <ValueButton name="menu_action" value="retirar" secondary>Retirar de la web</ValueButton>}
        </AdminForm>
        <details className={styles.gate}>
          <summary>Quality Gate (orientativo): {gate.map((g) => `${g.locale} ${g.result}`).join(' · ')}</summary>
          {gate.map((g) => (
            <div key={g.locale}><h3>{g.locale}: {g.result}</h3><ul>{g.failures.map((f) => <li key={f}>✗ {f}</li>)}{g.unchecked.map((u) => <li key={u}>? {u}</li>)}</ul></div>
          ))}
        </details>
        {data.menu?.status === 'publicado' && (
          <>
            <h3>Código QR</h3>
            <p className={styles.muted}>Apunta a la dirección definitiva de tablemaroc.com: funcionará cuando la web esté publicada.</p>
            <p className={styles.inline}>
              {LOCALES.map((l) => <a key={l} className={styles.secondaryLink} href={`/admin/lugares/${id}/menu/qr?lang=${l}`} download={`menu-${place.slug}-${l}.png`}>QR {l.toUpperCase()}</a>)}
            </p>
          </>
        )}
      </section>

      {data.categories.map((c) => (
        <section key={c.id} className={styles.card}>
          <details className={styles.locale}>
            <summary>Categoría: {name(c)}</summary>
            <AdminForm action={menuSaveCategory} hidden={{ ...hidden, category_id: c.id }} labels={LABELS} submit="Guardar categoría">
              <div className={styles.row3}>{LOCALES.map((l) => <Text key={l} name={`name_${l}`} label={`Nombre (${l})`} value={data.names[c.id]?.[l]?.name} />)}</div>
              <Text name="position" label="Orden" value={c.position} inputMode="decimal" />
            </AdminForm>
          </details>
          {data.items.filter((i) => i.category_id === c.id).map((i) => (
            <details key={i.id} className={styles.locale}>
              <summary>
                {i.status === 'borrador' ? '🚫 ' : ''}{name(i)} · {i.price_status === 'verificado' ? formatPriceMad(Number(i.price_mad), 'es') : 'Precio pendiente'}
              </summary>
              <AdminForm action={menuSaveItem} hidden={{ ...hidden, item_id: i.id }} labels={LABELS} submit="Guardar artículo" multipart={false}>
                <ItemFields item={i} names={data.names[i.id]} categoryId={c.id} />
              </AdminForm>
              <AdminForm action={menuToggleItem} hidden={{ ...hidden, item_id: i.id }} submit="" className={styles.inline}>
                <ValueButton name="hide" value={i.status === 'borrador' ? 'no' : 'si'} secondary>{i.status === 'borrador' ? 'Mostrar artículo' : 'Ocultar artículo'}</ValueButton>
              </AdminForm>
            </details>
          ))}
          <details className={styles.locale}>
            <summary>+ Añadir artículo</summary>
            <AdminForm action={menuSaveItem} hidden={hidden} labels={LABELS} submit="Añadir artículo"><ItemFields categoryId={c.id} /></AdminForm>
          </details>
        </section>
      ))}

      <section className={styles.card}>
        <h2>Nueva categoría</h2>
        <AdminForm action={menuSaveCategory} hidden={hidden} labels={LABELS} submit="Añadir categoría">
          <div className={styles.row3}>{LOCALES.map((l) => <Text key={l} name={`name_${l}`} label={`Nombre (${l})`} />)}</div>
          <Text name="position" label="Orden" value={data.categories.length} inputMode="decimal" />
        </AdminForm>
      </section>
    </>
  );
}
