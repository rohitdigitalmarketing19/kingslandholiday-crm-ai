import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';

const DESIGN_COLUMNS = `id, title, page_count, field_mappings, theme_preset, primary_color, secondary_color, header_banner_url, agency_stamp_url, signature_url, watermark_text, font_family, cover_style, is_active, created_at`;

const STANDARD_DESIGNS = [
  { id: 'royal', title: 'Royal Gold', theme_preset: 'royal', primary_color: '#d4af37', secondary_color: '#12213f', font_family: 'Playfair Display', cover_style: 'Royal Heritage' },
  { id: 'alpine', title: 'Alpine Teal', theme_preset: 'alpine', primary_color: '#0f4c4a', secondary_color: '#f2a93b', font_family: 'DM Serif Display', cover_style: 'Alpine Split' },
  { id: 'sunset', title: 'Sunset Coral', theme_preset: 'sunset', primary_color: '#ff5e4d', secondary_color: '#231f2b', font_family: 'Outfit', cover_style: 'Sunset Waves' },
  { id: 'editorial', title: 'Editorial', theme_preset: 'editorial', primary_color: '#111111', secondary_color: '#e5431f', font_family: 'Bricolage Grotesque', cover_style: 'High Contrast' },
  { id: 'playful', title: 'Playful Violet', theme_preset: 'playful', primary_color: '#4a2fe0', secondary_color: '#ffb996', font_family: 'Baloo 2', cover_style: 'Playful Modern' },
];

function ensureStandardDesigns() {
  try {
    // Remove non-standard designs
    runQuery(`DELETE FROM pdf_designs WHERE id NOT IN ('royal', 'alpine', 'sunset', 'editorial', 'playful')`);

    // Ensure all 5 standard designs exist
    for (const d of STANDARD_DESIGNS) {
      const exists = queryOne(`SELECT id FROM pdf_designs WHERE id = ?`, [d.id]);
      if (!exists) {
        const isActive = d.id === 'royal' ? 1 : 0;
        runQuery(
          `INSERT INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
           VALUES (?, ?, ?, ?, ?, 'KINGSLAND HOLIDAYS', ?, ?, ?)`,
          [d.id, d.title, d.theme_preset, d.primary_color, d.secondary_color, d.cover_style, d.font_family, isActive]
        );
      }
    }

    const hasActive = queryOne(`SELECT id FROM pdf_designs WHERE is_active = 1 LIMIT 1`);
    if (!hasActive) {
      runQuery(`UPDATE pdf_designs SET is_active = 1 WHERE id = 'royal'`);
    }
  } catch (_e) {}
}

export function getAllPdfDesigns() {
  ensureStandardDesigns();
  return queryAll(`SELECT ${DESIGN_COLUMNS} FROM pdf_designs ORDER BY CASE id WHEN 'royal' THEN 1 WHEN 'alpine' THEN 2 WHEN 'sunset' THEN 3 WHEN 'editorial' THEN 4 WHEN 'playful' THEN 5 ELSE 6 END`);
}

export function getActivePdfDesign() {
  ensureStandardDesigns();
  return queryOne(`SELECT * FROM pdf_designs WHERE is_active = 1 LIMIT 1`) || queryOne(`SELECT * FROM pdf_designs WHERE id = 'royal' LIMIT 1`);
}

export function getPdfDesignById(id: string) {
  ensureStandardDesigns();
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

