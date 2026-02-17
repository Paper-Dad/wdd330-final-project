import { proxyTMDB } from "./proxy.mjs";
//******Search movie */
export async function searchMovies(query) {
    return proxyTMDB("/search/movie", {
        query,
        include_adult: "false",
        language: "en-US",
        page: "1",
    });
}

export async function getCredits(movieId) {
    return proxyTMDB(`/movie/${movieId}/credits`, { language: "en-US" });
}

export async function getWatchProviders(movieId) {
    return proxyTMDB(`/movie/${movieId}/watch/providers`, {});
}

export async function searchPerson(name) {
    return proxyTMDB("/search/person", {
        query: name,
        language: "en-US",
        page: "1",
        include_adult: "false",
    });
}
//*******Discover movie */
export async function discoverMovies(filters = {}) {
    return proxyTMDB("/discover/movie", {
        language: "en-US",
        include_adult: "false",
        page: "1",
        sort_by: filters.sortBy || "popularity.desc",

        // KEY FILTERS
        with_genres: filters.with_genres,
        with_cast: filters.with_cast,

        primary_release_year: filters.primary_release_year,
        "vote_average.gte": filters.vote_average_gte,
        with_original_language: filters.with_original_language,

        "with_runtime.lte": filters.with_runtime_lte,
        "with_runtime.gte": filters.with_runtime_gte,
    });
}

export async function discoverByCast(personId) {
    return discoverMovies({
        with_cast: String(personId),
        sortBy: "popularity.desc",
    });
}