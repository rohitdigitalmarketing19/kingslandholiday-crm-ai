import { runQuery, queryAll, queryOne } from '../db/connection';

export function getAllAgents() {
  return queryAll('SELECT * FROM agents ORDER BY created_at ASC').map((r: any) => ({
    id: r.id, name: r.name, specialty: JSON.parse(r.specialty || '[]'),
    activeLeads: (queryOne('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [r.id]) || { count: 0 }).count,
    avatar: r.avatar || '',
  }));
}

export function createAgent(data: { name: string; specialty: string[] }) {
  const id = `agent-${Date.now()}`; const avatar = `https://picsum.photos/seed/${Date.now()}/100/100`;
  runQuery('INSERT INTO agents (id, name, specialty, avatar) VALUES (?, ?, ?, ?)', [id, data.name, JSON.stringify(data.specialty), avatar]);
  return { id, name: data.name, specialty: data.specialty, activeLeads: 0, avatar };
}

export function deleteAgent(id: string): { success: boolean; message?: string } {
  const count = (queryOne('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [id]) || { count: 0 }).count;
  if (count > 0) return { success: false, message: 'Cannot delete agent with active lead assignments.' };
  return { success: runQuery('DELETE FROM agents WHERE id = ?', [id]).changes > 0 };
}
