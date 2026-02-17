const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export function renderRecommendationCard(movie, leadName, providerInfo) {
    const container = document.getElementById("recommendation-card");
    if (!container) return;

    const posterUrl = movie.poster_path
        ? `${IMG_BASE}${movie.poster_path}`
        : "images/MooVIcon.png";

    const year = movie.release_date ? movie.release_date.slice(0, 4) : "—";

    const providersLine = providerInfo.flatrate.length
        ? providerInfo.flatrate.join(", ")
        : "No streaming providers found (CA)";
    
  
    //********JSON Rendered Dynamically */ 
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

export function setRecoStatus(html) {
    const container = document.getElementById("recommendation-card");
    if (container) container.innerHTML = html;
}