import { fetchJson } from './ui.js';

export async function fetchLiveGauges(codes) {
  try {
    const data = await fetchJson('https://danepubliczne.imgw.pl/api/data/hydro/', 6000);
    return Object.fromEntries(data.filter((s) => codes.includes(s.id_stacji)
      && s.przeplyw !== null && String(s.przeplyw).trim() !== '' && Number.isFinite(Number(s.przeplyw)) && Number(s.przeplyw) >= 0)
      .map((s) => [s.id_stacji, { q: Number(s.przeplyw), date: s.przeplyw_data }]));
  } catch { return {}; }
}
export async function fetchLiveWarnings() {
  try {
    const data = await fetchJson('https://danepubliczne.imgw.pl/api/data/warningshydro', 6000);
    return data.map((w) => ({ ...w, regions: (w.obszary || []).filter((o) => o.wojewodztwo === 'małopolskie') }))
      .filter((w) => w.regions.length)
      .map((w) => ({ event: w.zdarzenie, from: w.data_od, to: w.data_do, areas: w.regions.map((o) => o.opis) }));
  } catch { return null; }
}
