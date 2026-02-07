// netlify/functions/tmdb.js
export async function handler(event) {
    // --- CORS (allow your site) ---
    const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
    const origin = event.headers?.origin || event.headers?.Origin || "";

    const corsHeaders = {
        "Access-Control-Allow-Origin": allowedOrigin === "*" ? "*" : (origin === allowedOrigin ? origin : "null"),
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Vary": "Origin",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    if (event.httpMethod !== "GET") {
        return { statusCode: 405, headers: corsHeaders, body: "Method not allowed" };
    }

    try {
        const path = event.queryStringParameters?.path;
        if (!path || !path.startsWith("/")) {
            return { statusCode: 400, headers: corsHeaders, body: "Missing or invalid path" };
        }

        const token = process.env.TMDB_READ_TOKEN;
        if (!token) {
            return { statusCode: 500, headers: corsHeaders, body: "Server missing TMDB_READ_TOKEN" };
        }

        // Build TMDB URL: pass through all query params except "path"
        const tmdbUrl = new URL(`https://api.themoviedb.org/3${path}`);
        const params = { ...(event.queryStringParameters || {}) };
        delete params.path;

        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) tmdbUrl.searchParams.set(k, v);
        }

        const tmdbRes = await fetch(tmdbUrl.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json;charset=utf-8",
            },
        });

        const body = await tmdbRes.text();

        return {
            statusCode: tmdbRes.status,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json;charset=utf-8",
                // optional small cache
                "Cache-Control": "public, max-age=300",
            },
            body,
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: `Proxy error: ${err.message || "unknown"}`,
        };
    }
}