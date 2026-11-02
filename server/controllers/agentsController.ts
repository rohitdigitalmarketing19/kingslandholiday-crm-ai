import {asyncMap} from '../utils/asyncCollections';
import { runQuery, queryAll, queryOne } from '../db/connection';
export async function getAllAgents() {
    return await asyncMap((await queryAll('SELECT * FROM agents ORDER BY created_at ASC')), async (r: any) => ({
        id: r.id,
        name: r.name,
        specialty: JSON.parse(r.specialty || '[]'),
        activeLeads: (await queryOne('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [r.id]) || { count: 0 }).count,
        avatar: r.avatar || '',
        phone: r.phone || '',
        email: r.email || '',
    }));
}
export async function createAgent(data: {
    name: string;
    specialty: string[];
    avatar?: string;
    phone?: string;
    email?: string;
}) {
    const id = `agent-${Date.now()}`;
    const avatar = data.avatar && data.avatar.trim()
        ? data.avatar.trim()
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`;
    const phone = data.phone || '';
    const email = data.email || '';
    await runQuery('INSERT INTO agents (id, name, specialty, avatar, phone, email) VALUES (?, ?, ?, ?, ?, ?)', [id, data.name, JSON.stringify(data.specialty || []), avatar, phone, email]);
    return { id, name: data.name, specialty: data.specialty || [], activeLeads: 0, avatar, phone, email };
}
export async function updateAgent(id: string, data: {
    name?: string;
    specialty?: string[];
    avatar?: string;
    phone?: string;
    email?: string;
}) {
    const existing = await queryOne('SELECT * FROM agents WHERE id = ?', [id]);
    if (!existing) {
        throw new Error('Agent not found');
    }
    const name = data.name !== undefined ? data.name : existing.name;
    const specialty = data.specialty !== undefined ? JSON.stringify(data.specialty) : (existing.specialty || '[]');
    const avatar = data.avatar !== undefined ? data.avatar : (existing.avatar || '');
    const phone = data.phone !== undefined ? data.phone : (existing.phone || '');
    const email = data.email !== undefined ? data.email : (existing.email || '');
    await runQuery('UPDATE agents SET name = ?, specialty = ?, avatar = ?, phone = ?, email = ? WHERE id = ?', [name, specialty, avatar, phone, email, id]);
    return {
        id,
        name,
        specialty: typeof specialty === 'string' ? JSON.parse(specialty) : specialty,
        activeLeads: (await queryOne('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [id]) || { count: 0 }).count,
        avatar,
        phone,
        email,
    };
}
export async function deleteAgent(id: string): Promise<{
    success: boolean;
    message?: string;
}> {
    const count = (await queryOne('SELECT COUNT(*) as count FROM leads WHERE assigned_to = ?', [id]) || { count: 0 }).count;
    if (count > 0)
        return { success: false, message: 'Cannot delete agent with active lead assignments. Reassign leads first.' };
    return { success: (await runQuery('DELETE FROM agents WHERE id = ?', [id])).changes > 0 };
}
