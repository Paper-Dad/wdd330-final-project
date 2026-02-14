export function normalize(s) {
    return (s ?? "").trim().toLowerCase();
}

export function getLeadFromCredits(credits) {
    const cast = credits?.cast ?? [];
    const lead = cast
        .slice()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
    return lead?.name || "—";
}

export function providersForCA(providersPayload) {
    const ca = providersPayload?.results?.CA;
    const flatrate = ca?.flatrate?.map((p) => p.provider_name) ?? [];
    const rent = ca?.rent?.map((p) => p.provider_name) ?? [];
    const buy = ca?.buy?.map((p) => p.provider_name) ?? [];
    const link = ca?.link ?? "";
    return { flatrate, rent, buy, link };
}

export function scoreMovieResult(movie, prefs) {
    let score = 0;

    if (prefs.genreId && Array.isArray(movie.genre_ids) && movie.genre_ids.includes(prefs.genreId)) {
        score += 2;
    }

    if (prefs.favoriteMovie && normalize(movie.title) === normalize(prefs.favoriteMovie)) {
        score -= 3;
    }

    score += Math.min(2, (movie.popularity ?? 0) / 50);

    return score;
}

export function pickBestMovie(results, prefs) {
    if (!results?.length) return null;

    const scored = results.map((m) => ({ m, score: scoreMovieResult(m, prefs) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].m;
}