import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';

export function getAllMasters(category?: string) {
  if (category) {
    return queryAll(
      `SELECT * FROM masters_data WHERE category = ? ORDER BY sort_order ASC, name ASC`,
      [category]
    );
  }
  return queryAll(`SELECT * FROM masters_data ORDER BY category ASC, sort_order ASC, name ASC`);
}

export function addMasterItem(data: { category: string; name: string; code?: string; description?: string }) {
  const id = `mst-${uuidv4()}`;
  const now = new Date().toISOString();
  runQuery(
    `INSERT INTO masters_data (id, category, name, code, description, is_enabled, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?)`,
    [id, data.category, data.name.trim(), data.code || '', data.description || '', now]
  );
  return queryOne(`SELECT * FROM masters_data WHERE id = ?`, [id]);
}

export function toggleMasterItem(id: string, isEnabled?: boolean) {
  const current = queryOne(`SELECT is_enabled FROM masters_data WHERE id = ?`, [id]);
  const newStatus = isEnabled !== undefined ? (isEnabled ? 1 : 0) : (current?.is_enabled === 1 ? 0 : 1);
  runQuery(`UPDATE masters_data SET is_enabled = ? WHERE id = ?`, [newStatus, id]);
  return queryOne(`SELECT * FROM masters_data WHERE id = ?`, [id]);
}

export function updateMasterItem(id: string, data: { name?: string; code?: string; description?: string; sort_order?: number }) {
  if (data.name) {
    runQuery(
      `UPDATE masters_data SET name = ?, code = ?, description = ? WHERE id = ?`,
      [data.name.trim(), data.code || '', data.description || '', id]
    );
  }
  return queryOne(`SELECT * FROM masters_data WHERE id = ?`, [id]);
}

export function deleteMasterItem(id: string) {
  runQuery(`DELETE FROM masters_data WHERE id = ?`, [id]);
  return { success: true, id };
}
