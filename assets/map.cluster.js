// Koordinat awal kampus (Leaflet: [lat, lng])
const center = [-6.9742, 107.6309];

const map = L.map("map", { preferCanvas: true }).setView(center, 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

// --- Cluster group: kurangi lag saat zoom-out ---
const clusters = L.markerClusterGroup({
  chunkedLoading: true,            // render bertahap, lebih ringan
  disableClusteringAtZoom: 18,     // zoom tinggi -> pecah jadi marker
  maxClusterRadius: 55,            // jarak cluster (px)
  spiderfyOnEveryZoom: false,
  spiderfyDistanceMultiplier: 1.2,
  showCoverageOnHover: false,
  removeOutsideVisibleBounds: true // buang marker di luar viewport
});
map.addLayer(clusters);

// Helper popup
function popupHTML(p) {
  const title = p.title || "Titik";
  const desc = p.description ? `<p class="mt-1 text-sm text-slate-600">${p.description}</p>` : "";
  const img  = p.image ? `<img class="mt-2" src="${p.image}" alt="${title}" loading="lazy" />` : "";
  const link = p.link  ? `<p class="mt-2"><a class="text-sky-700 underline" href="${p.link}" target="_blank" rel="noopener">Buka tautan</a></p>` : "";
  return `<h3 class="font-semibold text-base text-slate-900">${title}</h3>${desc}${img}${link}`;
}

let masterMarkers = []; // semua marker (untuk pencarian)

fetch("./data/points.geojson")
  .then((r) => r.json())
  .then((geo) => {
    // Buat layer geojson => marker
    const geoLayer = L.geoJSON(geo, {
      pointToLayer: (_f, latlng) => L.marker(latlng),
      onEachFeature: (f, lyr) => {
        const props = f.properties || {};
        lyr.bindPopup(popupHTML(props));
        // simpan properti untuk pencarian cepat
        lyr._props = props;
      },
    });

    // Simpan semua marker untuk search
    masterMarkers = geoLayer.getLayers();

    // Masukkan ke cluster
    clusters.addLayer(geoLayer);

    // Fit bounds awal
    try { map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] }); } catch {}
    showToast(`${masterMarkers.length} titik dimuat`);
  })
  .catch((err) => {
    console.error("Gagal memuat GeoJSON:", err);
    showToast("Gagal memuat data titik");
  });

// --- PENCARIAN: filter marker di cluster ---
const input = document.getElementById("search");
if (input) {
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();

      clusters.clearLayers(); // reset

      if (!q) {
        // tampilkan semua lagi
        clusters.addLayers(masterMarkers);
        showToast(`${masterMarkers.length} titik ditampilkan`);
        return;
      }

      const matched = masterMarkers.filter((m) => {
        const p = m._props || {};
        const text = `${p.title || ""} ${p.description || ""} ${p.link || ""}`.toLowerCase();
        return text.includes(q);
      });

      clusters.addLayers(matched);

      if (matched.length) {
        try {
          map.fitBounds(L.featureGroup(matched).getBounds(), { padding: [20, 20] });
        } catch {}
      }
      showToast(`${matched.length} hasil untuk "${q}"`);
    }, 180);
  });
}

// Toast kecil
function showToast(text) {
  const wrap = document.getElementById("toast");
  const slot = document.getElementById("toast-text");
  if (!wrap || !slot) return;
  slot.textContent = text;
  wrap.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => wrap.classList.add("hidden"), 1500);
}
