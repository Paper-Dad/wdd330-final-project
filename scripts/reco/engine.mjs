import {
    searchMovies,
    getCredits,
    getWatchProviders,
    searchPerson,
    discoverByCast,
} from "../tmdb/api.mjs";

import { normalize, getLeadFromCredits, providersForCA, pickBestMovie } from "./helpers.mjs";
import { renderRecommendationCard } from "./renderer.mjs";

let lastResults = [];
let lastPrefs = null;

export function getLastCache() {
    return { lastResults, lastPrefs };
}

export async function recommendFromTMDB(prefs) {
    let query = (prefs.favoriteMovie || prefs.favoriteGenre || "").trim();

    if (!query) {
        if (!prefs.favoriteGenre) {
            throw new Error("Please enter a movie/actor or choose a genre.");
        }
        query = `${prefs.favoriteGenre} movie`.trim();
    }

    let searchData;

    if (prefs.favoriteActor && prefs.favoriteActor.trim()) {
        const people = await searchPerson(prefs.favoriteActor.trim());
        const personId = people?.results?.[0]?.id;

        if (personId) {
            searchData = await discoverByCast(personId);
        } else {
            searchData = await searchMovies(query);
        }
    } else {
        searchData = await searchMovies(query);
    }

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