import type { APIRoute } from 'astro';
import { loadPickerList } from '../../lib/data';
import { PAGE_CACHE } from '../../lib/http';

/** Trimmed asset list for the picker island. Same cache window as the pages. */
export const GET: APIRoute = async () => {
  const list = await loadPickerList();
  return new Response(JSON.stringify(list), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': PAGE_CACHE },
  });
};
