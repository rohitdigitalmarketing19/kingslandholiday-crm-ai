import { runQuery, queryAll } from '../db/connection';
export async function addNote(leadId: string, text: string, type: string) {
    const id = `note-${Date.now()}`;
    const now = new Date().toISOString();
    await runQuery('INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?,?,?,?,?)', [id, leadId, text, type || 'Note', now]);
    await runQuery('UPDATE leads SET last_follow_up = ? WHERE id = ?', [now, leadId]);
    return { id, text, type: type || 'Note', timestamp: now };
}
export async function getNotes(leadId: string) {
    return (await queryAll('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY timestamp ASC', [leadId])).map((n: any) => ({ id: n.id, text: n.text, type: n.type, timestamp: n.timestamp }));
}
