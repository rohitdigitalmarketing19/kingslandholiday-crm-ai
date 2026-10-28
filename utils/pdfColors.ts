/** html2canvas 1.x cannot parse modern CSS colors emitted by Tailwind 4.
 * Normalize only its private cloned document, leaving the live UI untouched.
 */
export function normalizePdfColors(document: Document): void {
  const view = document.defaultView;
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!view || !context) return;
  const cache = new Map<string, string>();
  function rgb(value: string): string {
    if (cache.has(value)) return cache.get(value)!;
    context!.clearRect(0, 0, 1, 1);
    context!.fillStyle = value;
    context!.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context!.getImageData(0, 0, 1, 1).data;
    const result = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    cache.set(value, result);
    return result;
  }
  function normalize(value: string): string {
    let result = value;
    const modern = /(?:oklch|oklab|lab|lch|color-mix|color)\(/g;
    let match: RegExpExecArray | null;
    while ((match = modern.exec(result))) {
      let depth = 1;
      let end = modern.lastIndex;
      while (end < result.length && depth) {
        if (result[end] === '(') depth++;
        if (result[end] === ')') depth--;
        end++;
      }
      if (depth) break;
      result = result.slice(0, match.index) + rgb(result.slice(match.index, end)) + result.slice(end);
      modern.lastIndex = 0;
    }
    return result.replace(/in\s+(?:oklab|oklch|srgb|lab|lch)\s*,/g, '');
  }
  const properties = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color', '-webkit-text-stroke-color', 'box-shadow', 'text-shadow', 'background-image'];
  for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    const style = view.getComputedStyle(element);
    for (const property of properties) {
      const value = style.getPropertyValue(property);
      if (/(?:oklch|oklab|lab|lch|color-mix|color)\(|in oklab/.test(value)) {
        element.style.setProperty(property, normalize(value), 'important');
      }
    }
  }
}
