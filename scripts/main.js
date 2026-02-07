export function renderWithTemplate(template, parentElement, callback) {
    if (!parentElement) return;
    parentElement.innerHTML = template;
    if (callback) callback();
}

async function loadTemplate(path) {
    const res = await fetch(path);
    const template = await res.text();
    return template;
}

export async function loadHeaderFooter() {
    const headerTemplate = await loadTemplate("/partials/header.html");
    const footerTemplate = await loadTemplate("/partials/footer.html");

    const headerElement = document.querySelector("#main-header");
    const footerElement = document.querySelector("#main-footer");

    renderWithTemplate(headerTemplate, headerElement);
    renderWithTemplate(footerTemplate, footerElement);
}

loadHeaderFooter();

// ---- MooV recommendations using TMDB through Netlify function ----

const PROXY_BASE = "/.netlify/functions/tmdb";
const IMG_BASE = "https://image.tmdb.org/t/p/w500"; // poster size

function normalize(s) {
    return (s ?? "").trim().toLowerCase();
}

async function proxyTMDB(path, params = {}) {
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

async function searchMovies(query) {
    return proxyTMDB("/search/movie", {
        query,
        include_adult: "false",
        language: "en-US",
        page: "1",
    });
}

async function getCredits(movieId) {
    return proxyTMDB(`/movie/${movieId}/credits`, {
        language: "en-US",
    });
}

async function getWatchProviders(movieId) {
    return proxyTMDB(`/movie/${movieId}/watch/providers`, {});
}

function getLeadFromCredits(credits) {
    const cast = credits?.cast ?? [];
    // "order" is usually top-billed; fallback to first
    const lead = cast.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
    return lead?.name || "—";
}

function providersForCA(providersPayload) {
    const ca = providersPayload?.results?.CA;
    const flatrate = ca?.flatrate?.map(p => p.provider_name) ?? [];
    const rent = ca?.rent?.map(p => p.provider_name) ?? [];
    const buy = ca?.buy?.map(p => p.provider_name) ?? [];
    const link = ca?.link ?? "";
    return { flatrate, rent, buy, link };
}

function scoreMovieResult(movie, prefs) {
    // Simple scoring heuristic (tweak anytime)
    let score = 0;

    const genre = normalize(prefs.favoriteGenre);
    const service = normalize(prefs.streamingService);

    // Genre heuristic: match on genre keyword in overview/title (cheap but works without extra calls)
    if (genre) {
        const haystack = normalize(`${movie.title} ${movie.overview ?? ""}`);
        if (haystack.includes(genre)) score += 2;
    }

    // Avoid recommending the exact same favorite movie
    if (prefs.favoriteMovie && normalize(movie.title) === normalize(prefs.favoriteMovie)) score -= 3;

    // Slightly prefer popular movies (TMDB gives popularity number)
    score += Math.min(2, (movie.popularity ?? 0) / 50);

    // Service will be checked later with providers (bonus if match)
    if (service) score += 0.2;

    return score;
}

function pickBestMovie(results, prefs) {
    if (!results?.length) return null;

    const scored = results.map(m => ({ m, score: scoreMovieResult(m, prefs) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].m;
}

function renderRecommendationCard(movie, leadName, providerInfo) {
    const container = document.getElementById("recommendation-card");
    if (!container) return;

    const posterUrl = movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : "images/MoovIcon.png";
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "—";

    const providersLine = providerInfo.flatrate.length
        ? providerInfo.flatrate.join(", ")
        : "No streaming providers found (CA)";

    container.innerHTML = `
    <div class="card shadow-sm">
      <div class="row g-0 align-items-stretch">
        <div class="col-md-4">
          <img
            src="${posterUrl}"
            class="img-fluid rounded-start h-100 w-100"
            alt="Poster for ${movie.title}"
            style="object-fit: cover;"
          >
        </div>
        <div class="col-md-8">
          <div class="card-body">
            <h3 class="card-title mb-1">${movie.title}</h3>
            <p class="card-text mb-2">
              <span class="badge bg-secondary me-1">${year}</span>
              <span class="badge bg-dark me-1">TMDB</span>
            </p>

            ${movie.overview ? `<p class="card-text mb-2">${movie.overview}</p>` : ""}

            <p class="card-text mb-2"><strong>Lead:</strong> ${leadName}</p>
            <p class="card-text mb-2"><strong>Streaming (CA):</strong> ${providersLine}</p>

            <div class="d-flex gap-2 flex-wrap mt-3">
              ${providerInfo.link
            ? `<a class="btn btn-outline-light" href="${providerInfo.link}" target="_blank" rel="noopener">View providers</a>`
            : ""
        }
              <button type="button" class="btn btn-outline-light" id="new-reco-btn">
                Recommend another
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

let lastResults = []; // cache last TMDB search results for "Recommend another"
let lastPrefs = null;

async function recommendFromTMDB(prefs) {
    const queryParts = [prefs.favoriteMovie, prefs.favoriteGenre, prefs.favoriteActor].filter(Boolean);
    const query = queryParts.join(" ").trim();

    if (!query) {
        throw new Error("Please enter at least one preference (movie, genre, or actor).");
    }

    const searchData = await searchMovies(query);
    lastResults = searchData?.results ?? [];
    lastPrefs = prefs;

    const chosen = pickBestMovie(lastResults, prefs);
    if (!chosen) return null;

    // Fetch credits + providers in parallel
    const [credits, providersPayload] = await Promise.all([
        getCredits(chosen.id),
        getWatchProviders(chosen.id),
    ]);

    const leadName = getLeadFromCredits(credits);
    const providerInfo = providersForCA(providersPayload);

    // Bonus: if user selected a streaming service, try to find a movie that matches it
    const service = normalize(prefs.streamingService);
    if (service && !providerInfo.flatrate.some(p => normalize(p) === service)) {
        // Try a few other results to find one that matches CA streaming service
        for (const alt of lastResults.slice(1, 8)) {
            const altProvidersPayload = await getWatchProviders(alt.id);
            const altProviderInfo = providersForCA(altProvidersPayload);
            if (altProviderInfo.flatrate.some(p => normalize(p) === service)) {
                const altCredits = await getCredits(alt.id);
                renderRecommendationCard(alt, getLeadFromCredits(altCredits), altProviderInfo);
                return alt;
            }
        }
    }

    renderRecommendationCard(chosen, leadName, providerInfo);
    return chosen;
}

// Wire up the form submit
const form = document.getElementById("preferences-form");
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const prefs = {
            favoriteMovie: document.getElementById("favorite-movie")?.value ?? "",
            favoriteGenre: document.getElementById("favorite-genre")?.value ?? "",
            favoriteActor: document.getElementById("favorite-actor")?.value ?? "",
            streamingService: document.getElementById("streaming-service")?.value ?? "",
        };

        const container = document.getElementById("recommendation-card");
        if (container) {
            container.innerHTML = `<div class="alert alert-info">Finding a recommendation...</div>`;
        }

        try {
            const result = await recommendFromTMDB(prefs);
            if (!result && container) {
                container.innerHTML = `<div class="alert alert-warning">No results found. Try different inputs.</div>`;
            }
            document.querySelector(".recommendation")?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error(err);
            if (container) {
                container.innerHTML = `<div class="alert alert-danger">${err.message || "Something went wrong."}</div>`;
            }
        }
    });
}

// Handle "Recommend another" using cached results (no new form submit)
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#new-reco-btn");
    if (!btn) return;

    if (!lastResults.length || !lastPrefs) return;

    // Pick a random result from last search and render it
    const random = lastResults[Math.floor(Math.random() * lastResults.length)];
    const container = document.getElementById("recommendation-card");
    if (container) container.innerHTML = `<div class="alert alert-info">Finding another...</div>`;

    try {
        const [credits, providersPayload] = await Promise.all([
            getCredits(random.id),
            getWatchProviders(random.id),
        ]);

        renderRecommendationCard(random, getLeadFromCredits(credits), providersForCA(providersPayload));
    } catch (err) {
        console.error(err);
        if (container) container.innerHTML = `<div class="alert alert-danger">Could not load another recommendation.</div>`;
    }
});