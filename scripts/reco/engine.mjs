import {
    searchMovies,
    getCredits,
    getWatchProviders,
    searchPerson,
    discoverMovies
} from "../tmdb/api.mjs";

import { normalize, getLeadFromCredits, providersForCA, pickBestMovie } from "./helpers.mjs";
import { renderRecommendationCard } from "./renderer.mjs";
import { getGenreId } from "../tmdb/genres.mjs";

let lastResults = [];
let lastPrefs = null;

export function getLastCache() {
    return { lastResults, lastPrefs };
}

export async function recommendFromTMDB(prefs) {
    const genreId = getGenreId((prefs.favoriteGenre || "").trim());
    const hasGenre = !!genreId;
    prefs.genreId = genreId;

    // Your original query for fallback text search
    let query = (prefs.favoriteMovie || "").trim();

    if (!query && !hasGenre && !(prefs.favoriteActor || "").trim()) {
        throw new Error("Please enter a movie, choose a genre, or enter an actor.");
    }

    // Actor → find personId
    let personId = null;
    if ((prefs.favoriteActor || "").trim()) {
        const people = await searchPerson(prefs.favoriteActor.trim());
        personId = people?.results?.[0]?.id ?? null;
    }

    // Runtime mapping (optional—safe even if you aren’t using runtime yet)
    const runtime = (prefs.runtime || "").trim().toLowerCase();
    const runtimeFilters =
        runtime === "short"
            ? { with_runtime_lte: "90" }
            : runtime === "medium"
                ? { with_runtime_gte: "90", with_runtime_lte: "120" }
                : runtime === "long"
                    ? { with_runtime_gte: "120" }
                    : {};

    // If genre OR actor OR other filters exist → DISCOVER is best
    const shouldUseDiscover =
        hasGenre ||
        !!personId ||
        !!String(prefs.releaseYear || "").trim() ||
        !!String(prefs.minRating || "").trim() ||
        !!String(prefs.language || "").trim() ||
        !!String(prefs.sortBy || "").trim() ||
        !!String(prefs.runtime || "").trim();

    let searchData;
        //*****************API USAGE*/
    if (shouldUseDiscover) {
        searchData = await discoverMovies({
            with_genres: hasGenre ? String(genreId) : undefined,
            with_cast: personId ? String(personId) : undefined,
            primary_release_year: String(prefs.releaseYear || "").trim() || undefined,
            vote_average_gte: String(prefs.minRating || "").trim() || undefined,
            with_original_language: String(prefs.language || "").trim() || undefined,
            sortBy: String(prefs.sortBy || "popularity.desc").trim(),
            ...runtimeFilters,
        });

        // If discover finds nothing and user typed a movie, fallback to text search
        if (!searchData?.results?.length && query) {
            searchData = await searchMovies(query);
        }
    } else {
        // simple fallback: user typed a movie title
        searchData = await searchMovies(query);
    }
    //******STORE JSON ARRAY */
    lastResults = searchData?.results ?? [];
    lastPrefs = prefs;

    const chosen = pickBestMovie(lastResults, prefs);
    if (!chosen) return null;

    const [credits, providersPayload] = await Promise.all([
        getCredits(chosen.id),
        getWatchProviders(chosen.id),
    ]);

    const leadName = getLeadFromCredits(credits);
    const providerInfo = providersForCA(providersPayload);

    // Your streaming-service match logic stays the same
    const service = normalize(prefs.streamingService);
    if (service && !providerInfo.flatrate.some((p) => normalize(p) === service)) {
        for (const alt of lastResults.slice(1, 8)) {
            const altProvidersPayload = await getWatchProviders(alt.id);
            const altProviderInfo = providersForCA(altProvidersPayload);

            if (altProviderInfo.flatrate.some((p) => normalize(p) === service)) {
                const altCredits = await getCredits(alt.id);
                renderRecommendationCard(alt, getLeadFromCredits(altCredits), altProviderInfo);
                return alt;
            }
        }
    }

    renderRecommendationCard(chosen, leadName, providerInfo);
    return chosen;
}

export async function recommendAnotherFromCache() {
    if (!lastResults.length || !lastPrefs) return null;

    const random = lastResults[Math.floor(Math.random() * lastResults.length)];

    const [credits, providersPayload] = await Promise.all([
        getCredits(random.id),
        getWatchProviders(random.id),
    ]);

    renderRecommendationCard(
        random,
        getLeadFromCredits(credits),
        providersForCA(providersPayload)
    );

    return random;
}