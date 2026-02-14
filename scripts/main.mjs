import { loadHeaderFooter } from "./utils/headerFooter.mjs";
import { recommendFromTMDB, recommendAnotherFromCache } from "./reco/engine.mjs";
import { setRecoStatus } from "./reco/renderer.mjs";

loadHeaderFooter();

// Restore last saved preferences
const savedPrefs = localStorage.getItem("moov-prefs");
if (savedPrefs) {
    const prefs = JSON.parse(savedPrefs);

    Object.keys(prefs).forEach((key) => {
        const el = document.getElementById(
            key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
        );
        if (el) el.value = prefs[key];
    });
}

// Wire up the form submit
const form = document.getElementById("preferences-form");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const prefs = {
            favoriteMovie: (document.getElementById("favorite-movie")?.value ?? "").trim(),
            favoriteGenre: (document.getElementById("favorite-genre")?.value ?? "").trim(),
            favoriteActor: (document.getElementById("favorite-actor")?.value ?? "").trim(),
            streamingService: (document.getElementById("streaming-service")?.value ?? "").trim(),
            releaseYear: (document.getElementById("release-year")?.value ?? "").trim(),
            minRating: (document.getElementById("min-rating")?.value ?? "").trim(),
            runtime: (document.getElementById("runtime")?.value ?? "").trim(),
            language: (document.getElementById("language")?.value ?? "").trim(),
            sortBy: (document.getElementById("sort-by")?.value ?? "").trim(),
        };

        setRecoStatus(`<div class="alert alert-info">Finding a recommendation...</div>`);

        form.classList.add("is-loading");

        try {
            const result = await recommendFromTMDB(prefs);

            if (!result) {
                setRecoStatus(`<div class="alert alert-warning">No results found. Try different inputs.</div>`);
                return;
            }

            localStorage.setItem("moov-prefs", JSON.stringify(prefs));
            localStorage.setItem("moov-last", JSON.stringify(result));

            document.querySelector(".recommendation")?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error(err);
            setRecoStatus(`<div class="alert alert-danger">${err?.message || "Something went wrong."}</div>`);
        } finally {
            form.classList.remove("is-loading");
        }
    });
}

// Handle "Recommend another"
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#new-reco-btn");
    if (!btn) return;

    setRecoStatus(`<div class="alert alert-info">Finding another...</div>`);

    try {
        const result = await recommendAnotherFromCache();
        if (!result) {
            setRecoStatus(`<div class="alert alert-warning">No cached results yet. Submit the form first.</div>`);
        }
    } catch (err) {
        console.error(err);
        setRecoStatus(`<div class="alert alert-danger">Could not load another recommendation.</div>`);
    }
});