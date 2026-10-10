/**
 * Vector SVG brand logos for Hotel and Travel Partners
 * Used in PDF Quotes, Proposal Previews, and Terms Pages.
 */

export interface PartnerBrand {
  id: string;
  name: string;
  category: 'hotel' | 'travel';
  tagline: string;
  brandColor?: string;
  brand_color?: string;
  svgIcon?: string;
  logoUrl?: string;
  logo_url?: string;
}

export const HOTEL_PARTNERS: PartnerBrand[] = [
  {
    id: 'taj',
    name: 'Taj Hotels',
    category: 'hotel',
    tagline: 'IHCL Group',
    brandColor: '#B8860B',
    // Authentic Taj heritage palace arch insignia
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C13.5 4 11 6 8 7C10 9 10.5 12 10.5 14C8 14 6 15.5 6 18C6 21 8.5 23 14 25C19.5 23 22 21 22 18C22 15.5 20 14 17.5 14C17.5 12 18 9 20 7C17 6 14.5 4 14 2Z" fill="#B8860B" fill-opacity="0.18"/>
      <path d="M14 3L15 5.5C17.5 6.5 19.5 8.5 20 11C18 11.5 16.5 13 16.5 15C18.5 15.5 20 17 20 19C20 22 17.5 24 14 25C10.5 24 8 22 8 19C8 17 9.5 15.5 11.5 15C11.5 13 10 11.5 8 11C8.5 8.5 10.5 6.5 13 5.5L14 3Z" stroke="#B8860B" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M11 20H17M14 9V17M12 13H16" stroke="#B8860B" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'oberoi',
    name: 'Oberoi',
    category: 'hotel',
    tagline: 'Luxury Collection',
    brandColor: '#C49A45',
    // Radiant Oberoi sunburst / lotus crest
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="5" fill="#C49A45" fill-opacity="0.2"/>
      <circle cx="14" cy="14" r="3.5" stroke="#C49A45" stroke-width="1.5"/>
      <path d="M14 2V5M14 23V26M2 14H5M23 14H26M5.5 5.5L7.6 7.6M20.4 20.4L22.5 22.5M5.5 22.5L7.6 20.4M20.4 7.6L22.5 5.5" stroke="#C49A45" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="14" cy="14" r="8" stroke="#C49A45" stroke-width="1" stroke-dasharray="2 2"/>
    </svg>`
  },
  {
    id: 'itc',
    name: 'ITC Hotels',
    category: 'hotel',
    tagline: 'Responsible Luxury',
    brandColor: '#8C1D40',
    // ITC signature crest
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="20" height="20" rx="4" fill="#8C1D40" fill-opacity="0.12"/>
      <path d="M14 4L22 10V18L14 24L6 18V10L14 4Z" stroke="#8C1D40" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M10 14L14 10L18 14L14 18L10 14Z" fill="#8C1D40" fill-opacity="0.4" stroke="#8C1D40" stroke-width="1.2"/>
      <circle cx="14" cy="14" r="1.5" fill="#8C1D40"/>
    </svg>`
  },
  {
    id: 'radisson',
    name: 'Radisson',
    category: 'hotel',
    tagline: 'Hotel Group',
    brandColor: '#0058A3',
    // Radisson signature emblem
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="11" fill="#0058A3" fill-opacity="0.12" stroke="#0058A3" stroke-width="1.4"/>
      <path d="M10 8H15.5C17.4 8 19 9.3 19 11.2C19 12.8 17.8 14 16.2 14.3L19.5 20H16.8L13.8 14.8H12.2V20H10V8ZM12.2 12.8H15.2C16.1 12.8 16.8 12.1 16.8 11.2C16.8 10.3 16.1 9.8 15.2 9.8H12.2V12.8Z" fill="#0058A3"/>
    </svg>`
  },
  {
    id: 'leela',
    name: 'The Leela',
    category: 'hotel',
    tagline: 'Palaces & Resorts',
    brandColor: '#936639',
    // The Leela royal lotus & swan crown emblem
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4C14 4 18 8 18 13C18 16 16.5 19 14 21C11.5 19 10 16 10 13C10 8 14 4 14 4Z" fill="#936639" fill-opacity="0.2" stroke="#936639" stroke-width="1.4"/>
      <path d="M7 11C7 11 10.5 13 11 17C9 18 7 17 6 15C5 13 7 11 7 11Z" stroke="#936639" stroke-width="1.3" fill="#936639" fill-opacity="0.15"/>
      <path d="M21 11C21 11 17.5 13 17 17C19 18 21 17 22 15C23 13 21 11 21 11Z" stroke="#936639" stroke-width="1.3" fill="#936639" fill-opacity="0.15"/>
      <circle cx="14" cy="23" r="1.5" fill="#936639"/>
      <path d="M10 23H18" stroke="#936639" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'marriott',
    name: 'Marriott',
    category: 'hotel',
    tagline: 'Bonvoy Network',
    brandColor: '#B00020',
    // Marriott signature 'M' insignia
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="22" height="22" rx="4" fill="#B00020" fill-opacity="0.1"/>
      <path d="M7 20L9.5 8H11.8L14 14.5L16.2 8H18.5L21 20H18.8L17.2 12.2L15 18H13L10.8 12.2L9.2 20H7Z" fill="#B00020"/>
    </svg>`
  }
];

export const TRAVEL_PARTNERS: PartnerBrand[] = [
  {
    id: 'makemytrip',
    name: 'MakeMyTrip',
    category: 'travel',
    tagline: 'Verified Seller',
    brandColor: '#E42529',
    // Iconic MakeMyTrip red & blue badge
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#E42529"/>
      <path d="M8 17V11C8 10.4 8.4 10 9 10C9.6 10 10 10.4 10 11V17H8Z" fill="#FFFFFF"/>
      <path d="M12 17V11C12 9.9 12.9 9 14 9C15.1 9 16 9.9 16 11V17H14V11.5C14 11.2 13.8 11 13.5 11C13.2 11 13 11.2 13 11.5V17H12Z" fill="#FFFFFF"/>
      <circle cx="19" cy="14" r="2.5" fill="#FFFFFF"/>
      <path d="M7 21C10 23 18 23 21 21" stroke="#00A2D6" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'traveltriangle',
    name: 'TravelTriangle',
    category: 'travel',
    tagline: 'Certified Partner',
    brandColor: '#00BFA5',
    // TravelTriangle signature delta pyramid emblem
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 4L24 22H4L14 4Z" fill="#00BFA5" fill-opacity="0.18" stroke="#00BFA5" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M14 9L19.5 19H8.5L14 9Z" fill="#00BFA5"/>
      <circle cx="14" cy="15" r="1.8" fill="#FFFFFF"/>
    </svg>`
  },
  {
    id: 'tripadvisor',
    name: 'TripAdvisor',
    category: 'travel',
    tagline: 'Traveller Reviewed',
    brandColor: '#00AF87',
    // TripAdvisor owl face emblem
    svgIcon: `<svg viewBox="0 0 28 28" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12" fill="#00AF87" fill-opacity="0.12"/>
      <circle cx="9.5" cy="14.5" r="4.5" stroke="#00AF87" stroke-width="1.6"/>
      <circle cx="18.5" cy="14.5" r="4.5" stroke="#00AF87" stroke-width="1.6"/>
      <circle cx="9.5" cy="14.5" r="2" fill="#00AF87"/>
      <circle cx="18.5" cy="14.5" r="2" fill="#00AF87"/>
      <path d="M9.5 10C11.5 10 13.5 11.5 14 12C14.5 11.5 16.5 10 18.5 10" stroke="#00AF87" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M14 13.5L13 16.5H15L14 13.5Z" fill="#E42529"/>
    </svg>`
  }
];

export const ALL_PARTNERS: PartnerBrand[] = [...HOTEL_PARTNERS, ...TRAVEL_PARTNERS];

export function getPartnerById(id: string): PartnerBrand | undefined {
  const norm = id.toLowerCase().replace(/[^a-z]/g, '');
  return ALL_PARTNERS.find(p => p.id === norm || norm.includes(p.id) || p.name.toLowerCase().replace(/[^a-z]/g, '').includes(norm));
}

/**
 * Returns an HTML string rendering partner brand chips with their authentic SVG or image logos.
 * In PDF mode (default): Only the brand logo and brand name are displayed (no tag).
 */
export function renderPartnerBadgeHtml(
  brand: PartnerBrand,
  theme: { line?: string; bg?: string; card?: string; ink?: string; showTag?: boolean } = {}
): string {
  const line = theme.line || '#e2e8f0';
  const card = theme.card || '#ffffff';
  const ink = theme.ink || '#1b2033';
  const color = brand.brandColor || brand.brand_color || '#b8860b';
  const showTag = theme.showTag ?? false;

  const logoSrc = brand.logoUrl || brand.logo_url;
  let logoHtml = '';
  if (logoSrc) {
    logoHtml = `<img src="${logoSrc}" alt="${brand.name}" style="width:18px;height:18px;object-fit:contain;border-radius:4px;display:block;flex:none" />`;
  } else if (brand.svgIcon) {
    logoHtml = `<div style="flex:none;display:flex;align-items:center;justify-content:center;width:18px;height:18px">${brand.svgIcon}</div>`;
  } else {
    logoHtml = `
      <div style="width:18px;height:18px;border-radius:5px;background:${color}18;border:1px solid ${color}35;color:${color};font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none">
        ${(brand.name || 'P').slice(0, 2).toUpperCase()}
      </div>
    `;
  }

  if (showTag) {
    return `
      <div style="display:inline-flex;align-items:center;gap:7px;border:1px solid ${line};border-radius:9px;padding:3px 9px;background:${card};box-shadow:0 1px 3px rgba(0,0,0,0.03);margin-right:4px;margin-bottom:4px">
        ${logoHtml}
        <div style="display:flex;flex-direction:column;line-height:1.15">
          <span style="font-size:11px;font-weight:700;color:${ink};letter-spacing:0.1px">${brand.name}</span>
          <span style="font-size:8px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px">${brand.tagline || 'Partner'}</span>
        </div>
      </div>
    `;
  }

  // PDF Output: ONLY brand logo and brand name (tag not shown)
  return `
    <div style="display:inline-flex;align-items:center;gap:5px;border:1px solid ${line};border-radius:7px;padding:2.5px 7px;background:${card};box-shadow:0 1px 2px rgba(0,0,0,0.03);margin-right:3px;margin-bottom:3px">
      ${logoHtml}
      <span style="font-size:10px;font-weight:700;color:${ink};letter-spacing:0.1px;white-space:nowrap">${brand.name}</span>
    </div>
  `;
}

