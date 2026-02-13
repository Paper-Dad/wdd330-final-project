import { proxyTMDB } from "./proxy.mjs";

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

export async function discoverByCast(personId) {
    return proxyTMDB("/discover/movie", {
        with_cast: String(personId),
        language: "en-US",
        sort_by: "popularity.desc",
        page: "1",
        include_adult: "false",
    });
}