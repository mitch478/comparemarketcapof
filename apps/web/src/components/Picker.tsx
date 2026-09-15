import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PickerAsset } from '@cmc/core';
import { formatCap } from '@cmc/core';
import { comparePath } from '../lib/routes';

interface Selected { slug: string; symbol: string; name: string; image: string | null }
interface Props { a?: Selected | null; b?: Selected | null }

let listPromise: Promise<PickerAsset[]> | null = null;
function loadList(): Promise<PickerAsset[]> {
  if (!listPromise) {
    listPromise = fetch('/api/picker.json')
      .then((r) => (r.ok ? (r.json() as Promise<PickerAsset[]>) : []))
      .catch(() => [] as PickerAsset[]);
  }
  return listPromise;
}

function search(list: PickerAsset[], q: string): PickerAsset[] {
  const s = q.trim().toLowerCase();
  if (!s) return list.slice(0, 50);
  const starts: PickerAsset[] = [];
  const contains: PickerAsset[] = [];
  for (const a of list) {
    const sym = a.symbol.toLowerCase();
    const name = a.name.toLowerCase();
    if (sym === s || sym.startsWith(s) || name.startsWith(s)) starts.push(a);
    else if (name.includes(s) || sym.includes(s) || a.slug.includes(s)) contains.push(a);
    if (starts.length >= 50) break;
  }
  return [...starts, ...contains].slice(0, 50);
}

/**
 * Two searchable comboboxes over the whole snapshot. Selecting navigates to the
 * server-rendered comparison page, so the URL is always the source of truth.
 */
export default function Picker({ a: initialA = null, b: initialB = null }: Props) {
  const [a, setA] = useState<Selected | null>(initialA);
  const [b, setB] = useState<Selected | null>(initialB);
  const [openSide, setOpenSide] = useState<'a' | 'b' | null>(null);

  function pick(side: 'a' | 'b', asset: PickerAsset) {
    const sel: Selected = { slug: asset.slug, symbol: asset.symbol, name: asset.name, image: asset.image };
    const na = side === 'a' ? sel : a;
    const nb = side === 'b' ? sel : b;
    if (side === 'a') setA(sel); else setB(sel);
    if (na && nb) {
      setOpenSide(null);
      window.location.href = comparePath(na.slug, nb.slug);
    } else {
      // Only one side chosen yet: open the other picker so the second choice is one tap away.
      setOpenSide(side === 'a' ? 'b' : 'a');
    }
  }

  function swap() {
    if (a && b) {
      window.location.href = comparePath(b.slug, a.slug);
      return;
    }
    setA(b);
    setB(a);
    setOpenSide(null);
  }

  return (
    <div className="flex flex-col items-stretch">
      <Combobox side="a" selected={a} open={openSide === 'a'} setOpen={(o) => setOpenSide(o ? 'a' : null)} onPick={(x) => pick('a', x)} />
      <div className="flex justify-center my-3">
        <button
          type="button"
          className="btn btn-circle w-14 h-14 border-2 border-neutral shadow-none bg-base-100 text-base-content hover:bg-base-200 disabled:opacity-60"
          onClick={swap}
          disabled={!a && !b}
          aria-label={a && b ? `Swap: ${b.name} with the market cap of ${a.name}` : 'Swap assets'}
          title="Swap"
          data-swap
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v18M8 3L4 7M8 3l4 4" />
            <path d="M16 21V3M16 21l-4-4M16 21l4-4" />
          </svg>
        </button>
      </div>
      <Combobox side="b" selected={b} open={openSide === 'b'} setOpen={(o) => setOpenSide(o ? 'b' : null)} onPick={(x) => pick('b', x)} />
    </div>
  );
}

function Combobox({ side, selected, open, setOpen, onPick }: {
  side: 'a' | 'b';
  selected: Selected | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onPick: (asset: PickerAsset) => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<PickerAsset[] | null>(null);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const results = useMemo(() => (list ? search(list, q) : []), [list, q]);

  useEffect(() => {
    if (!open) return;
    loadList().then(setList);
    inputRef.current?.focus();
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  useEffect(() => setActive(0), [q, list]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listboxId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listboxId]);

  function choose(asset: PickerAsset) {
    setQ('');
    onPick(asset);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) choose(r); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  const label = side === 'a' ? 'Asset to reprice' : 'Market cap to use';
  const buttonLabel = selected ? `${label}: ${selected.name} (${selected.symbol}). Change` : `${label}. Choose an asset`;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        className="btn btn-primary btn-lg brutal w-full justify-start gap-3 font-ui text-ui tracking-[1px]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={buttonLabel}
        onClick={() => setOpen(!open)}
        onPointerEnter={() => void loadList()}
        onFocus={() => void loadList()}
        data-picker={side}
      >
        {selected ? (
          <>
            {selected.image ? <img src={selected.image} alt="" width={28} height={28} className="rounded-full border-2 border-neutral bg-base-100" /> : null}
            <span>{selected.symbol}</span>
            <span className="opacity-80 font-normal truncate">{selected.name}</span>
          </>
        ) : (
          <span className="font-normal opacity-90">{side === 'a' ? 'Choose an asset' : 'Choose a market cap'}</span>
        )}
        <span aria-hidden="true" className="ml-auto">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-20 bg-base-100 text-base-content rounded-box border-2 border-neutral shadow-dropdown overflow-hidden">
          <div className="p-2 border-b-2 border-neutral">
            <input
              ref={inputRef}
              type="search"
              className="input input-bordered w-full font-ui"
              placeholder={list ? `Search ${list.length} assets…` : 'Loading…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-activedescendant={results[active] ? `${listboxId}-opt-${active}` : undefined}
              aria-autocomplete="list"
              aria-label={`${label}. Type to search`}
              autoComplete="off"
            />
          </div>
          <ul id={listboxId} role="listbox" className="max-h-[264px] overflow-y-auto" aria-label={label}>
            {list && results.length === 0 && (
              <li className="px-4 py-3 font-ui text-sm text-muted" role="presentation">No assets match “{q}”</li>
            )}
            {results.map((r, i) => (
              <li
                key={r.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={r.slug === selected?.slug}
                className={`flex items-center gap-3 min-h-11 px-3 py-2 border-b border-base-300 cursor-pointer font-ui ${i === active ? 'bg-base-200' : ''}`}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <span className="num text-xs text-muted w-7 shrink-0">#{r.rank}</span>
                {r.image ? <img src={r.image} alt="" width={24} height={24} decoding="async" className="rounded-full border-2 border-neutral bg-base-100 shrink-0" /> : <span className="w-6 h-6 shrink-0" />}
                <span className="font-bold w-16 shrink-0 truncate">{r.symbol}</span>
                <span className="text-muted flex-1 truncate">{r.name}</span>
                <span className="num text-sm text-primary shrink-0">{formatCap(r.marketCap)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
