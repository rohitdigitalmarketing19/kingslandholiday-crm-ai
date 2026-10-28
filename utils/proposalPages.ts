import { ensureAllQuoteFontsLoaded } from './pdfExport';
import { fitProposalTermsSheets } from '../services/quoteDesignRenderer';

const WIDTH = 794, HEIGHT = 1123;
type Box = { top: number; bottom: number };

function protectContent(table: HTMLElement, capacity: number): Box[] {
  const origin = table.getBoundingClientRect().top;
  const boxes: Box[] = [];
  const selectors = '.avoid-page-break,.day-card-header,.day-img-box,.hrow,.hstays,.box,.two-col,.quotebox,.meta-strip,.trust-strip,.partners,.signblock,.footer,.terms-title,.terms-card-heading,.terms-partners,.terms-advisor,.terms-flow tr,.hotel-option-table tr';
  for (const element of Array.from(table.querySelectorAll<HTMLElement>(selectors))) {
    const r = element.getBoundingClientRect();
    const wrapper = element.classList.contains('day-card-header') ? element.closest('.day-card-wrapper') : null;
    const top = (wrapper?.getBoundingClientRect().top ?? r.top) - origin;
    let bottom = r.bottom - origin;
    const firstRow = element.classList.contains('terms-title') ? element.closest('.terms-flow')?.querySelector('table tbody tr') : null;
    const next = element.classList.contains('terms-card-heading') ? element.nextElementSibling : null;
    const firstItem = firstRow || (next?.tagName === 'TABLE' ? next.querySelector('tbody tr') : next?.firstElementChild);
    if (firstItem) bottom = Math.max(bottom, firstItem.getBoundingClientRect().bottom - origin);
    if (element.classList.contains('terms-advisor')) bottom = Math.max(bottom, (table.querySelector('tfoot')?.getBoundingClientRect().bottom ?? r.bottom) - origin);
    if (bottom > top && bottom - top < capacity * 0.8) boxes.push({ top: Math.max(0, Math.floor(top)), bottom: Math.ceil(bottom) });
  }
  for (const text of Array.from(table.querySelectorAll('.day-text,.terms-flow'))) {
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) if (rect.width > 0 && rect.height > 0) {
        boxes.push({ top: Math.max(0, Math.floor(rect.top - origin) - 1), bottom: Math.ceil(rect.bottom - origin) + 1 });
      }
    }
  }
  return boxes;
}

function page(background: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'pdf-page';
  node.dataset.proposalPage = 'true';
  node.style.cssText = `width:${WIDTH}px;min-width:${WIDTH}px;max-width:${WIDTH}px;height:${HEIGHT}px;min-height:${HEIGHT}px;max-height:${HEIGHT}px;position:relative;overflow:hidden;box-sizing:border-box;background:${background};flex:none;box-shadow:0 3px 12px #0002;`;
  return node;
}

/** Fast DOM pagination. The exact resulting pages are also used for download. */
export async function prepareProposalPages(source: HTMLElement): Promise<string> {
  const measured = source.cloneNode(true) as HTMLElement;
  measured.style.cssText = `position:fixed;left:-100000px;top:0;width:${WIDTH}px;background:#fff;pointer-events:none;`;
  document.body.appendChild(measured);
  try {
    await ensureAllQuoteFontsLoaded(measured);
    fitProposalTermsSheets(measured);
    const pages: HTMLElement[] = [];
    for (const section of Array.from(measured.children) as HTMLElement[]) {
      if (section.matches('.sheet,.pdf-page')) {
        const output = page('#ffffff');
        const copy = section.cloneNode(true) as HTMLElement;
        copy.style.margin = '0'; copy.style.boxShadow = 'none';
        copy.style.width = `${WIDTH}px`; copy.style.height = `${HEIGHT}px`;
        output.dataset.pageType = 'cover'; output.appendChild(copy); pages.push(output);
      } else if (section.matches('table.itinerary-table')) {
        const header = section.querySelector<HTMLElement>('thead.itin-thead');
        const headerHeight = header ? Math.max(80, Math.ceil(header.getBoundingClientRect().height)) : 0;
        const headerHtml = header?.querySelector('th')?.innerHTML || '';
        const background = getComputedStyle(section).backgroundColor;
        header?.remove();
        const capacity = HEIGHT - headerHeight;
        if (capacity <= 0) throw new Error('Itinerary header exceeds page height');
        const rect = section.getBoundingClientRect();
        const total = Math.ceil(Math.max(rect.height, section.scrollHeight));
        const boxes = protectContent(section, capacity);
        const blocks = Array.from(section.querySelectorAll<HTMLElement>('.day-card-wrapper,.terms-flow'));
        const blockRects = blocks.map(node => { const r=node.getBoundingClientRect(); return {top:r.top-rect.top,bottom:r.bottom-rect.top,height:r.height}; });
        const images = Array.from(section.querySelectorAll<HTMLImageElement>('img'));
        const imageRects = images.map(node => {const r=(node.closest('.day-img-box') || node).getBoundingClientRect(); const own=node.getBoundingClientRect();return {top:r.top-rect.top,bottom:r.bottom-rect.top,width:own.width,height:own.height};});
        for (let start=0; start<total;) {
          let end=Math.min(total,start+capacity);
          while (end<total) {
            const crossed=boxes.filter(box=>box.top<end && box.bottom>end && box.top>start);
            if (!crossed.length) break;
            end=Math.min(...crossed.map(box=>box.top));
          }
          if (end<=start) throw new Error('Could not paginate proposal content');
          const output=page(end===total && background!=='rgba(0, 0, 0, 0)' ? background : '#ffffff');
          output.dataset.pageType='flow';output.dataset.flowStart=String(start);output.dataset.flowEnd=String(end);output.dataset.headerHeight=String(headerHeight);
          const repeated=document.createElement('div');
          repeated.className='proposal-page-header';
          repeated.style.cssText=`width:${WIDTH}px;height:${headerHeight}px;overflow:hidden;box-sizing:border-box;`;
          repeated.innerHTML=headerHtml;output.appendChild(repeated);
          const viewport=document.createElement('div');
          viewport.className='proposal-page-body';
          viewport.style.cssText=`position:relative;width:${WIDTH}px;height:${end-start}px;overflow:hidden;`;
          const copy=section.cloneNode(true) as HTMLElement;
          // Omit content and heavy image data that cannot be seen on this page,
          // replacing outside blocks with equal-height spacers to retain layout.
          const copies=Array.from(copy.querySelectorAll<HTMLElement>('.day-card-wrapper,.terms-flow'));
          const copyImages=Array.from(copy.querySelectorAll<HTMLImageElement>('img'));
          copyImages.forEach((image,i)=>{
            const r=imageRects[i];
            if (r.bottom<=start || r.top>=end) {
              image.removeAttribute('src');image.removeAttribute('srcset');
              image.style.width=`${r.width}px`;image.style.height=`${r.height}px`;image.style.visibility='hidden';
            }
          });
          copies.forEach((block,i)=>{
            const r=blockRects[i];
            if (r.bottom<=start || r.top>=end) {block.replaceChildren();block.style.height=`${r.height}px`;block.style.minHeight=`${r.height}px`;block.style.maxHeight=`${r.height}px`;block.style.boxSizing='border-box';block.setAttribute('aria-hidden','true');}
          });
          copy.style.margin='0';copy.style.position='absolute';copy.style.top=`-${start}px`;copy.style.left='0';copy.style.width=`${WIDTH}px`;
          viewport.appendChild(copy);output.appendChild(viewport);pages.push(output);
          start=end;
        }
      }
    }
    if (!pages.length) throw new Error('No preview pages were generated');
    return pages.map(node=>node.outerHTML).join('\n');
  } finally { measured.remove(); }
}
