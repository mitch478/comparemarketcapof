import { ImageResponse, loadGoogleFont } from 'workers-og';
import type { Comparison } from '@cmc/core';
import { comparisonCopy, formatCap, formatPrice } from '@cmc/core';
import { PAGE_CACHE } from './http';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const PURPLE = '#744AE3';
const INK = 'rgb(14,14,14)';
const ON_PURPLE = '#F6F6F6';
const LIME = 'rgb(217,255,29)';
const CORAL = 'rgb(255,178,160)';

/** Fonts are fetched once per isolate and reused. */
let fontsPromise: Promise<Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }>> | null = null;
function fonts() {
  fontsPromise ??= Promise.all([
    loadGoogleFont({ family: 'Inter', weight: 700 }).then((data) => ({ name: 'Inter', data, weight: 700 as const, style: 'normal' as const })),
    loadGoogleFont({ family: 'Inter', weight: 400 }).then((data) => ({ name: 'Inter', data, weight: 400 as const, style: 'normal' as const })),
    loadGoogleFont({ family: 'Bungee', weight: 400 }).then((data) => ({ name: 'Bungee', data, weight: 400 as const, style: 'normal' as const })),
  ]).catch((err) => {
    fontsPromise = null; // retry next request
    throw err;
  });
  return fontsPromise;
}

/** Fetch a logo and inline it as a data URI so Satori doesn't need network access mid-render. Null on any failure. */
async function logoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 86_400, cacheEverything: true } } as RequestInit);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/png';
    if (!/^image\/(png|jpe?g|webp)/.test(type)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 512 * 1024) return null;
    let bin = '';
    for (let i = 0; i < buf.byteLength; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function logo(src: string | null, symbol: string, size: number): string {
  const common = `width:${size}px;height:${size}px;border-radius:9999px;border:4px solid ${INK};background:#FFFAFA;display:flex;align-items:center;justify-content:center;overflow:hidden;`;
  if (src) return `<img src="${src}" width="${size}" height="${size}" style="${common}object-fit:contain;" />`;
  return `<div style="${common}font-family:Inter;font-weight:700;font-size:${Math.round(size / 3)}px;color:${INK};">${esc(symbol.slice(0, 4))}</div>`;
}

/** 1200×630 card for a comparison. Same hierarchy as the page: sentence, implied price, multiplier, stats. */
export async function comparisonOgImage(c: Comparison, headers: Record<string, string> = {}): Promise<Response> {
  const t = comparisonCopy(c);
  const [fontList, logoA, logoB] = await Promise.all([fonts(), logoDataUri(c.a.image), logoDataUri(c.b.image)]);
  const priceColor = c.direction === 'down' ? CORAL : LIME;
  const price = t.impliedPriceText;
  const priceSize = price.length > 12 ? 104 : price.length > 9 ? 128 : 150;

  const html = `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:${OG_WIDTH}px;height:${OG_HEIGHT}px;padding:52px 60px;background:${PURPLE};color:${ON_PURPLE};font-family:Inter;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;font-family:Bungee;font-size:30px;color:#FFFFFF;">COMPAREMARKETCAPOF.COM</div>
        <div style="display:flex;align-items:center;gap:18px;">
          ${logo(logoA, c.a.symbol, 92)}
          <div style="display:flex;font-size:40px;font-weight:700;color:${INK};">→</div>
          ${logo(logoB, c.b.symbol, 92)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;font-size:38px;font-weight:700;line-height:1.2;">${esc(t.h1)}</div>
        <div style="display:flex;font-size:${priceSize}px;font-weight:700;color:${priceColor};line-height:1.05;margin-top:6px;letter-spacing:-2px;">${esc(price)}</div>
        ${t.multiplierLine ? `<div style="display:flex;font-size:40px;font-weight:400;margin-top:4px;">${esc(t.multiplierLine)}</div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:400;opacity:0.95;">
        <div style="display:flex;">${esc(c.a.symbol)} ${esc(formatPrice(c.a.price))} · cap ${esc(formatCap(c.a.marketCap))}</div>
        <div style="display:flex;">${esc(c.b.symbol)} cap ${esc(formatCap(c.b.marketCap))}</div>
      </div>
    </div>`;

  return new ImageResponse(html, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: fontList,
    headers: { 'Cache-Control': PAGE_CACHE, ...headers },
  });
}

/** Site-level card for pages without a comparison (home, hubs, index, static). */
export async function defaultOgImage(): Promise<Response> {
  const fontList = await fonts();
  const html = `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:${OG_WIDTH}px;height:${OG_HEIGHT}px;padding:60px;background:${PURPLE};color:${ON_PURPLE};font-family:Inter;">
      <div style="display:flex;font-family:Bungee;font-size:34px;color:#FFFFFF;">COMPAREMARKETCAPOF.COM</div>
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;flex-direction:column;font-size:64px;font-weight:700;line-height:1.1;">
          <div style="display:flex;">What would A be worth</div>
          <div style="display:flex;color:${LIME};">with the market cap of B?</div>
        </div>
        <div style="display:flex;font-size:34px;font-weight:400;margin-top:24px;">Pick any two of the top 500 crypto assets. Updated hourly.</div>
      </div>
      <div style="display:flex;font-size:26px;color:${LIME};font-weight:700;">Implied price · multiplier · circulating and fully diluted</div>
    </div>`;
  return new ImageResponse(html, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: fontList,
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
