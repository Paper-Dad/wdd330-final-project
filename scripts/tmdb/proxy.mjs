const PROXY_BASE = "/.netlify/functions/tmdb";

export async function proxyTMDB(path, params = {}) {
    const url = new URL(PROXY_BASE, window.location.origin);
    url.searchParams.set("path", path);

    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && String(v).length) {
            url.searchParams.set(k, v);
        }
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Proxy/TMDB error: ${res.status}`);
    return res.json();
}