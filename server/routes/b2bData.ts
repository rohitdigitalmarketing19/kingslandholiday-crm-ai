import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb, queryAll, queryOne, saveDb } from '../db/connection';
import { validateB2B } from '../../utils/b2bData';

const router = Router();
const columns = 'id,name,phone,city,state,quality,updated_at';
const present = (row: any) => ({ id: row.id, name: row.name, phone: row.phone, city: row.city, state: row.state, quality: row.quality, updatedAt: row.updated_at });
router.use((req, res, next) => {
  const actor = res.locals.user;
  if (!actor || actor.status !== 'Active') return res.status(401).json({ error: 'Sign in to the CRM.' });
  if (actor.role !== 'Admin' || (req.method !== 'GET' && actor.access_level === 'ViewOnly')) return res.status(403).json({ error: 'Administrator edit access is required.' });
  res.locals.actor = actor.id;
  next();
});
router.get('/', (_req, res) => res.json(queryAll(`SELECT ${columns} FROM b2b_contacts WHERE deleted_at='' ORDER BY name COLLATE NOCASE`).map(present)));
router.post('/', saveB2BContact);
router.put('/:id', saveB2BContact);
router.delete('/:id', (req, res, next) => {
  const previous = queryOne(`SELECT ${columns} FROM b2b_contacts WHERE id=? AND deleted_at=''`, [req.params.id]);
  if (!previous) return res.status(404).json({ error: 'Contact not found.' });
  const db = getDb(), now = new Date().toISOString();
  try {
    db.run('BEGIN');
    db.run('UPDATE b2b_contacts SET deleted_at=?,updated_at=?,updated_by=? WHERE id=?', [now, now, res.locals.actor, req.params.id]);
    db.run('INSERT INTO b2b_contact_history VALUES (?,?,?,?,?,?)', [randomUUID(), req.params.id, res.locals.actor, now, JSON.stringify(present(previous)), JSON.stringify({ deleted: true })]);
    db.run('COMMIT'); saveDb(); res.json({ success: true });
  } catch (error) { db.run('ROLLBACK'); next(error); }
});
export function saveB2BContact(req: any, res: any, next: any) {
  let data;
  try { data = validateB2B(req.body); } catch (error) { return res.status(400).json({ error: (error as Error).message }); }
  const previous = req.params.id ? queryOne(`SELECT ${columns} FROM b2b_contacts WHERE id=? AND deleted_at=''`, [req.params.id]) : null;
  if (req.params.id && !previous) return res.status(404).json({ error: 'Contact not found.' });
  const id = previous?.id || randomUUID(), now = new Date().toISOString(), db = getDb();
  try {
    db.run('BEGIN');
    if (previous) db.run('UPDATE b2b_contacts SET name=?,phone=?,city=?,state=?,quality=?,updated_at=?,updated_by=? WHERE id=?', [data.name,data.phone,data.city,data.state,data.quality,now,res.locals.actor,id]);
    else db.run('INSERT INTO b2b_contacts (id,name,phone,city,state,quality,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?)', [id,data.name,data.phone,data.city,data.state,data.quality,now,res.locals.actor]);
    const current = present(queryOne(`SELECT ${columns} FROM b2b_contacts WHERE id=?`, [id]));
    db.run('INSERT INTO b2b_contact_history VALUES (?,?,?,?,?,?)', [randomUUID(),id,res.locals.actor,now,JSON.stringify(previous && present(previous)),JSON.stringify(current)]);
    if (res.locals.publicEntry) db.run('INSERT INTO public_entry_submissions VALUES (?,?,?,?)', [req.body.requestId,'b2b-data',id,now]);
    db.run('COMMIT'); saveDb();
    res.status(previous ? 200 : 201).json(res.locals.publicEntry ? { success: true, reference: id } : current);
  } catch (error) { db.run('ROLLBACK'); next(error); }
}
export default router;
