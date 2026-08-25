import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';

const DESIGN_COLUMNS = `id, title, page_count, field_mappings, theme_preset, primary_color, secondary_color, header_banner_url, agency_stamp_url, signature_url, watermark_text, font_family, cover_style, is_active, created_at`;

export function getAllPdfDesigns() {
  return queryAll(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs ORDER BY is_active DESC, created_at DESC`);
}

export function getActivePdfDesign() {
  return queryOne(`SELECT * FROM pdf_designs WHERE is_active = 1 LIMIT 1`) || null;
}

export function getPdfDesignById(id: string) {
  return queryOne(`SELECT * FROM pdf_designs WHERE id = ?`, [id]);
}

export function savePdfDesign(data: {
  id?: string;
  title: string;
  pdf_file_data?: string;
  page_count?: number;
  field_mappings?: string;
  theme_preset?: string;
  primary_color?: string;
  secondary_color?: string;
  header_banner_url?: string;
  agency_stamp_url?: string;
  signature_url?: string;
  watermark_text?: string;
  font_family?: string;
  cover_style?: string;
  is_active?: boolean;
}) {
  const id = data.id || `design-${uuidv4()}`;
  const now = new Date().toISOString();
  const isActive = data.is_active ? 1 : 0;

  if (isActive) {
    runQuery(`UPDATE pdf_designs SET is_active = 0`);
  }

  const existing = queryOne(`SELECT id FROM pdf_designs WHERE id = ?`, [id]);
  if (existing) {
    runQuery(
      `UPDATE pdf_designs
       SET title = ?, pdf_file_data = ?, page_count = ?, field_mappings = ?,
           theme_preset = ?, primary_color = ?, secondary_color = ?,
           header_banner_url = ?, agency_stamp_url = ?, signature_url = ?,
           watermark_text = ?, font_family = ?, cover_style = ?, is_active = ?
       WHERE id = ?`,
      [
        data.title,
        data.pdf_file_data || '',
        data.page_count || 0,
        data.field_mappings || '[]',
        data.theme_preset || 'royal_gold',
        data.primary_color || '#d4af37',
        data.secondary_color || '#1e1b18',
        data.header_banner_url || '',
        data.agency_stamp_url || '',
        data.signature_url || '',
        data.watermark_text || 'KINGSLAND HOLIDAYS',
        data.font_family || 'Playfair Display',
        data.cover_style || 'Modern Grid',
        isActive,
        id
      ]
    );
  } else {
    runQuery(
      `INSERT INTO pdf_designs (id, title, pdf_file_data, page_count, field_mappings, theme_preset, primary_color, secondary_color, header_banner_url, agency_stamp_url, signature_url, watermark_text, font_family, cover_style, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.pdf_file_data || '',
        data.page_count || 0,
        data.field_mappings || '[]',
        data.theme_preset || 'royal_gold',
        data.primary_color || '#d4af37',
        data.secondary_color || '#1e1b18',
        data.header_banner_url || '',
        data.agency_stamp_url || '',
        data.signature_url || '',
        data.watermark_text || 'KINGSLAND HOLIDAYS',
        data.font_family || 'Playfair Display',
        data.cover_style || 'Modern Grid',
        isActive,
        now
      ]
    );
  }

  return queryOne(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs WHERE id = ?`, [id]);
}

export function updateFieldMappings(id: string, fieldMappings: string) {
  runQuery(`UPDATE pdf_designs SET field_mappings = ? WHERE id = ?`, [fieldMappings, id]);
  return queryOne(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs WHERE id = ?`, [id]);
}

export function setActivePdfDesign(id: string) {
  runQuery(`UPDATE pdf_designs SET is_active = 0`);
  runQuery(`UPDATE pdf_designs SET is_active = 1 WHERE id = ?`, [id]);
  return queryOne(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs WHERE id = ?`, [id]);
}

export function deactivatePdfDesign(id: string) {
  runQuery(`UPDATE pdf_designs SET is_active = 0 WHERE id = ?`, [id]);
  return queryOne(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs WHERE id = ?`, [id]);
}

export function deletePdfDesign(id: string) {
  runQuery(`DELETE FROM pdf_designs WHERE id = ?`, [id]);
  return { success: true, id };
}

