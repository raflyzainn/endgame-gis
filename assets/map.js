// Koordinat awal kampus (format Leaflet: [lat, lng])
const center = [-6.9742, 107.6309];

const map = L.map("map", { preferCanvas: true }).setView(center, 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

function popupHTML(p) {
  const title = p.title || "Titik";
  const desc = p.description
    ? `<p class="mt-1 text-sm text-slate-600">${p.description}</p>`
    : "";
  const img = p.image
    ? `<img class="mt-2" src="${p.image}" alt="${title}" />`
    : "";
  const link = p.link
    ? `<p class="mt-2"><a class="text-sky-700 underline" href="${p.link}" target="_blank" rel="noopener">Buka tautan</a></p>`
    : "";
  return `<h3 class="font-semibold text-base text-slate-900">${title}</h3>${desc}${img}${link}`;
}

fetch("./data/points.geojson")
  .then((r) => r.json())
  .then((geo) => {
    const layer = L.geoJSON(geo, {
      pointToLayer: (_f, latlng) => L.marker(latlng),
      onEachFeature: (f, lyr) => lyr.bindPopup(popupHTML(f.properties || {})),
    }).addTo(map);

    // Fit ke semua titik saat pertama kali load
    try {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch {
      // abaikan jika belum ada titik
    }

    // ---- Pencarian sederhana (client-side) ----
    const input = document.getElementById("search");
    const allMarkers = [];

    layer.eachLayer((m) => {
      const p = m.feature?.properties || {};
      const text = `${p.title || ""} ${p.description || ""} ${p.link || ""}`.toLowerCase();
      allMarkers.push({ m, text });
    });

    if (input) {
      let timer;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const q = input.value.trim().toLowerCase();

          // reset isi layer
          layer.clearLayers();

          if (!q) {
            allMarkers.forEach((x) => layer.addLayer(x.m));
            showToast(`${allMarkers.length} titik ditampilkan`);
            return;
          }

          const match = allMarkers.filter((x) => x.text.includes(q));
          match.forEach((x) => layer.addLayer(x.m));

          if (match.length) {
            try {
              map.fitBounds(
                L.featureGroup(match.map((x) => x.m)).getBounds(),
                { padding: [20, 20] }
              );
            } catch {}
          }

          showToast(`${match.length} hasil untuk "${q}"`);
        }, 180);
      });
    }
  })
  .catch((err) => {
    console.error("Gagal memuat GeoJSON:", err);
    showToast("Gagal memuat data titik");
  });

// ---- Toast mini di bawah layar ----
function showToast(text) {
  const wrap = document.getElementById("toast");
  const slot = document.getElementById("toast-text");
  if (!wrap || !slot) return;
  slot.textContent = text;
  wrap.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => wrap.classList.add("hidden"), 1600);
}
