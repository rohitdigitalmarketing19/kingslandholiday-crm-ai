import { runQuery, queryAll } from '../db/connection';

export function getAllTemplates(search?: string) {
  let q = 'SELECT * FROM itinerary_templates'; const p: any[] = [];
  if (search) { q += ' WHERE title LIKE ? OR destination LIKE ?'; const t = `%${search}%`; p.push(t, t); }
  q += ' ORDER BY created_at DESC';
  return queryAll(q, p).map((t: any) => ({ id: t.id, title: t.title, destination: t.destination, nights: t.nights, templateData: JSON.parse(t.template_data || '{}'), createdAt: t.created_at }));
}

export function createTemplate(data: { title: string; destination: string; nights: number; templateData?: any }) {
  const id = `template-${Date.now()}`; const now = new Date().toISOString().split('T')[0];
  runQuery('INSERT INTO itinerary_templates (id, title, destination, nights, template_data, created_at) VALUES (?,?,?,?,?,?)', [id, data.title, data.destination, data.nights, JSON.stringify(data.templateData || {}), now]);
  return { id, title: data.title, destination: data.destination, nights: data.nights, templateData: data.templateData || {}, createdAt: now };
}

export function deleteTemplate(id: string) { return runQuery('DELETE FROM itinerary_templates WHERE id = ?', [id]).changes > 0; }
