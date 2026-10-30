import React, { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { button } from './dataEntryStyles';
export default function EntryLink({ kind }: { kind: 'hotel-rates' | 'b2b-data' }) {
  const url = `${window.location.origin}/forms/${kind}`;
  const [notice, setNotice] = useState('');
  return <div className="rounded-xl border border-line bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold">Fixed entry link</h2><p className="mt-1 text-xs text-secondary">Anyone with this link can add {kind === 'hotel-rates' ? 'hotels' : 'B2B contacts'}. Existing records stay private.</p></div><div className="flex flex-wrap gap-2"><button className={button} onClick={async () => { try { await navigator.clipboard.writeText(url); setNotice('Link copied.'); } catch { setNotice('Select the link below and copy it.'); } }}><Copy size={16} />Copy link</button><a className={button} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Open form</a></div></div><label className="mt-3 block"><span className="sr-only">Entry page URL</span><input className="w-full min-w-0 rounded-lg border border-line bg-canvas p-3 text-xs text-secondary" value={url} readOnly onFocus={e => e.currentTarget.select()} /></label>{notice && <p role="status" className="mt-2 text-xs text-brand-ink">{notice}</p>}</div>;
}
