import { loadHeaderFooter } from "./utils/headerFooter.mjs";
import { recommendFromTMDB, recommendAnotherFromCache } from "./reco/engine.mjs";
import { setRecoStatus } from "./reco/renderer.mjs";

loadHeaderFooter();

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

        setRecoStatus(`<div class="alert alert-info">Finding a recommendation...</div>`);

        try {
            const result = await recommendFromTMDB(prefs);

            if (!result) {
                setRecoStatus(
                    `<div class="alert alert-warning">No results found. Try different inputs.</div>`
                );
            }

            document.querySelector(".recommendation")?.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error(err);
            setRecoStatus(
                `<div class="alert alert-danger">${err?.message || "Something went wrong."}</div>`
            );
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