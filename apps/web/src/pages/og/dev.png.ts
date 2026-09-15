/**
 * Phase 0 spike: prove workers-og (Satori + resvg) renders under the Cloudflare adapter.
 * Phase 4 replaces this with `/og/[a]/[b].png` driven by real data.
 */
import type { APIRoute } from 'astro';
import { ImageResponse, loadGoogleFont } from 'workers-og';

export const GET: APIRoute = async () => {
  const [inter, bungee] = await Promise.all([
    loadGoogleFont({ family: 'Inter', weight: 700 }),
    loadGoogleFont({ family: 'Bungee', weight: 400 }),
  ]);

  const html = `
    <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:56px;background:#744AE3;color:#F6F6F6;font-family:Inter;">
      <div style="display:flex;font-family:Bungee;font-size:32px;color:#E7E7E7;">Comparemarketcapof.app</div>
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;font-size:36px;">Solana with the market cap of Bitcoin</div>
        <div style="display:flex;font-size:140px;color:rgb(217,255,29);margin-top:8px;">$2,457</div>
        <div style="display:flex;font-size:40px;margin-top:8px;">17× today's price</div>
      </div>
      <div style="display:flex;font-size:24px;opacity:0.8;">Based on circulating supply · dev spike</div>
    </div>`;

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: inter, weight: 700, style: 'normal' },
      { name: 'Bungee', data: bungee, weight: 400, style: 'normal' },
    ],
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  });
};
