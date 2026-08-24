// WebGIS Sebaran & Daya Layan SMA Negeri Kabupaten Jepara
// MapLibre GL JS Implementation — Skripsi UPI

document.addEventListener('DOMContentLoaded', () => {

  // ─── Layer Configurations ───────────────────────────────────────────────────

  // Kategori lapisan TITIK sekolah (dibedakan berdasarkan status/ketersediaan)
  const SEKOLAH_CATEGORIES = [
    { id: 'sma_negeri', label: 'SMA Negeri', color: '#005B96', symbol: 'circle' },
  ];

  // Kategori lapisan WILAYAH / ANALISIS
  const WILAYAH_CATEGORIES = [
    {
      id: 'jarak_sekolah', label: 'Jarak Antar Sekolah', color: '#f59e0b', type: 'line', dash: true,
      mapLayers: ['jarak-line']
    },  // label ditangani oleh HTML Marker
    {
      id: 'sungai', label: 'Jaringan Sungai', color: '#3b82f6', type: 'line', dash: false,
      mapLayers: ['sungai-line']
    },
    {
      id: 'buffer_5km', label: 'Buffer 5 km', color: '#a2c522ff', type: 'fill', dash: false,
      mapLayers: ['buffer-5km-fill', 'buffer-5km-outline']
    },
    {
      id: 'kemiringan_lereng', label: 'Kemiringan Lereng', color: '#78716c', type: 'fill', dash: false,
      mapLayers: ['lereng-fill']
    }
  ];

  // Map layer IDs untuk setiap kategori sekolah
  const SEKOLAH_MAP_LAYERS = {
    sma_negeri: ['sekolah-circle', 'sekolah-label', 'sekolah-halo']
  };

  // Helper — hasilkan HTML simbol yang akurat per tipe layer
  function getSymbolChip(cat, size = 'md') {
    const w = size === 'sm' ? 20 : 24;
    const h = size === 'sm' ? 20 : 24;

    // Khusus gradasi kemiringan lereng
    if (cat.id === 'kemiringan_lereng') {
      return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" style="flex-shrink:0;">
        <defs>
          <linearGradient id="grad-lereng-${size}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#eab308;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ef4444;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="url(#grad-lereng-${size})" fill-opacity="0.85" />
      </svg>`;
    }

    if (cat.type === 'circle' || cat.symbol === 'circle') {
      // Titik sekolah — lingkaran
      return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" style="flex-shrink:0;">
        <circle cx="12" cy="12" r="7" fill="${cat.color}" stroke="white" stroke-width="2"/>
      </svg>`;
    }
    if (cat.type === 'line' && cat.dash) {
      // Garis putus-putus — jarak antar sekolah
      return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" style="flex-shrink:0;">
        <line x1="2" y1="12" x2="22" y2="12" stroke="${cat.color}" stroke-width="2.5"
              stroke-dasharray="5,3" stroke-linecap="round"/>
      </svg>`;
    }
    if (cat.type === 'line') {
      // Garis solid
      return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" style="flex-shrink:0;">
        <line x1="2" y1="12" x2="22" y2="12" stroke="${cat.color}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
    }
    // Fill / Polygon — kotak berwarna
    return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" style="flex-shrink:0;">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="${cat.color}" fill-opacity="0.75"
            stroke="${cat.color}" stroke-width="1.5"/>
    </svg>`;
  }

  const BASEMAP_TILES = {
    voyager: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    light: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    dark: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
  };

  // ─── State Management ───────────────────────────────────────────────────────
  let activeSekolah = new Set(SEKOLAH_CATEGORIES.map(c => c.id));
  let activeWilayah = new Set();
  let activeBasemap = 'voyager';
  let currentOpacity = 0.75;
  let searchQuery = '';
  let sekolahData = null;
  let jarakData = null;
  let sungaiData = null;
  let bufferData = null;
  let lerengData = null;
  let jarakMarkers = [];   // HTML marker instances untuk label jarak
  let popup = null;

  // Kabupaten Jepara geographic bounds [SW, NE]
  const JEPARA_BOUNDS = [[110.4500, -6.9200], [110.9800, -6.3500]];
  const JEPARA_CENTER = [110.6600, -6.5900];

  // ─── Map Initialization ─────────────────────────────────────────────────────
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      'version': 8,
      'glyphs': 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      'sources': {
        'basemap-tiles': {
          'type': 'raster',
          'tiles': [BASEMAP_TILES.voyager],
          'tileSize': 256,
          'attribution': '&copy; CARTO &copy; OpenStreetMap'
        }
      },
      'layers': [{
        'id': 'basemap-layer',
        'type': 'raster',
        'source': 'basemap-tiles',
        'minzoom': 0,
        'maxzoom': 19
      }]
    },
    center: JEPARA_CENTER,
    zoom: 10
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

  // ─── Load & Render Layers ───────────────────────────────────────────────────
  map.on('load', async () => {
    // Load Sekolah GeoJSON dari file
    try {
      const res = await fetch('./assets/geojson/webgis_skripsi/Sekolah.geojson');
      if (!res.ok) throw new Error(`HTTP ${res.status}: gagal memuat Sekolah.geojson`);
      sekolahData = await res.json();
    } catch (err) {
      console.error('[WebGIS] Gagal memuat data sekolah:', err);
      return; // hentikan render jika data tidak tersedia
    }

    // Ensure feature IDs
    sekolahData.features.forEach((f, i) => { f.id = i + 1; });

    // Update stats
    document.getElementById('stat-sekolah').textContent = sekolahData.features.length;

    // ── Load Jarak, Sungai, Buffer, Lereng GeoJSON ────────────────────────────
    try {
      const [resJarak, resSungai, resBuffer, resLereng] = await Promise.all([
        fetch('./assets/geojson/webgis_skripsi/jarak-antar-sekolah.geojson'),
        fetch('./assets/geojson/webgis_skripsi/Sungai.geojson'),
        fetch('./assets/geojson/webgis_skripsi/buffer-5km.geojson'),
        fetch('./assets/geojson/webgis_skripsi/kemiringan-lereng.json')
      ]);
      if (resJarak.ok) jarakData = await resJarak.json();
      if (resSungai.ok) sungaiData = await resSungai.json();
      if (resBuffer.ok) bufferData = await resBuffer.json();
      if (resLereng.ok) lerengData = await resLereng.json();
    } catch (e) {
      console.error('Error loading wilayah data:', e);
    }

    // ── Add Kemiringan Lereng source & layers ───────────────────────────────
    if (lerengData) {
      map.addSource('lereng-source', {
        type: 'geojson',
        data: lerengData
      });
      map.addLayer({
        id: 'lereng-fill',
        type: 'fill',
        source: 'lereng-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'Keterangan'],
            '0-8%', '#22c55e',  // Hijau Cerah
            '8-15%', '#84cc16',  // Hijau Kekuningan
            '15-25%', '#eab308',  // Kuning
            '25-40%', '#f97316',  // Oranye
            '>40%', '#ef4444',  // Merah Cerah
            '#78716c'             // Default
          ],
          'fill-opacity': 0.85
        }
      });
    }

    // ── Add Jarak Antar Sekolah source & layers ─────────────────────────────
    if (jarakData) {
      map.addSource('jarak-source', {
        type: 'geojson',
        data: jarakData
      });

      // Line layer — garis putus-putus jarak antar sekolah
      map.addLayer({
        id: 'jarak-line',
        type: 'line',
        source: 'jarak-source',
        paint: {
          'line-color': '#f59e0b',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            8, 1.5,
            13, 2.5
          ],
          'line-opacity': 0.85,
          'line-dasharray': [4, 3]
        }
      });
      // Catatan: label jarak dirender sebagai HTML Marker (lihat showJarakLabels)
    }

    // ── Add Sungai source & layers ──────────────────────────────────────────
    if (sungaiData) {
      map.addSource('sungai-source', {
        type: 'geojson',
        data: sungaiData
      });
      map.addLayer({
        id: 'sungai-line',
        type: 'line',
        source: 'sungai-source',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 1.5,
          'line-opacity': 0.7
        }
      });
    }

    // ── Add Buffer 5km source & layers ──────────────────────────────────────
    if (bufferData) {
      map.addSource('buffer-source', {
        type: 'geojson',
        data: bufferData
      });
      map.addLayer({
        id: 'buffer-5km-fill',
        type: 'fill',
        source: 'buffer-source',
        paint: {
          'fill-color': '#a2c522ff',
          'fill-opacity': 0.3
        }
      });
      map.addLayer({
        id: 'buffer-5km-outline',
        type: 'line',
        source: 'buffer-source',
        paint: {
          'line-color': '#a2c522ff',
          'line-width': 1.5
        }
      });
    }

    // ── Add Sekolah point source ────────────────────────────────────────────
    map.addSource('sekolah-source', {
      type: 'geojson',
      data: sekolahData
    });

    // Circle fill layer
    map.addLayer({
      id: 'sekolah-circle',
      type: 'circle',
      source: 'sekolah-source',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 6,
          13, 10
        ],
        'circle-color': '#005B96',
        'circle-opacity': currentOpacity,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    // Halo glow for hover
    map.addLayer({
      id: 'sekolah-halo',
      type: 'circle',
      source: 'sekolah-source',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 14,
          13, 22
        ],
        'circle-color': '#005B96',
        'circle-opacity': 0,
        'circle-stroke-color': '#005B96',
        'circle-stroke-width': 0
      },
      filter: ['==', ['id'], -1]
    });

    // ── Label layer — Sekolah (Nama, Rombel, Daya Tampung) ──────────────────
    // Atribut GeoJSON: Name, Rombel, Dayatampun
    map.addLayer({
      id: 'sekolah-label',
      type: 'symbol',
      source: 'sekolah-source',
      layout: {
        'text-field': [
          'format',
          ['get', 'Name'],
          { 'font-scale': 1.0, 'text-font': ['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']] },
          '\n',
          {},
          ['concat', 'Rombel: ', ['to-string', ['get', 'Rombel']]],
          { 'font-scale': 0.82, 'text-font': ['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']] },
          '  |  Daya Tampung: ',
          { 'font-scale': 0.82 },
          ['to-string', ['get', 'Dayatampun']],
          { 'font-scale': 0.82 }
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          10, 10,
          14, 13
        ],
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-max-width': 12,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.5
      },
      minzoom: 10
    });

    // ── Build UI ────────────────────────────────────────────────────────────
    renderSekolahChecklist();
    renderWilayahChecklist();
    renderLegend();
    setupMapInteractions();

    // Sinkronisasi visibility awal dengan state checkbox
    applySekolahVisibility();
    applyWilayahVisibility();

    // Fit to Jepara
    map.fitBounds(JEPARA_BOUNDS, { padding: 60, duration: 1200 });
  });

  // ─── Render Sidebar Checklists ──────────────────────────────────────────────
  function renderSekolahChecklist() {
    const container = document.getElementById('layer-checklist-sekolah');
    container.innerHTML = '';
    SEKOLAH_CATEGORIES.forEach(cat => {
      const count = sekolahData ? sekolahData.features.filter(f => f.properties.status === cat.id).length : '—';
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.innerHTML = `
        <div class="layer-info">
          <input type="checkbox" class="layer-toggle-checkbox" data-layer="sekolah" data-category="${cat.id}" ${activeSekolah.has(cat.id) ? 'checked' : ''} />
          <div class="color-chip circle" style="background-color: ${cat.color}; border: 2px solid white; box-shadow: 0 0 0 1px ${cat.color};"></div>
          <div>
            <div class="layer-name">${cat.label}</div>
          </div>
        </div>
      `;
      const checkbox = item.querySelector('.layer-toggle-checkbox');
      checkbox.addEventListener('click', e => e.stopPropagation());
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) activeSekolah.add(cat.id);
        else activeSekolah.delete(cat.id);
        applySekolahVisibility();
        applySekolahFilter();
        renderLegend();
      });
      item.addEventListener('click', e => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          if (checkbox.checked) activeSekolah.add(cat.id);
          else activeSekolah.delete(cat.id);
          applySekolahVisibility();
          applySekolahFilter();
          renderLegend();
        }
      });
      container.appendChild(item);
    });
  }

  function renderWilayahChecklist() {
    const container = document.getElementById('layer-checklist-wilayah');
    container.innerHTML = '';
    WILAYAH_CATEGORIES.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.innerHTML = `
        <div class="layer-info">
          <input type="checkbox" class="layer-toggle-checkbox" data-layer="wilayah" data-category="${cat.id}" ${activeWilayah.has(cat.id) ? 'checked' : ''} />
          ${getSymbolChip(cat)}
          <div>
            <div class="layer-name">${cat.label}</div>
          </div>
        </div>
      `;
      const checkbox = item.querySelector('.layer-toggle-checkbox');
      checkbox.addEventListener('click', e => e.stopPropagation());
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) activeWilayah.add(cat.id);
        else activeWilayah.delete(cat.id);
        applyWilayahVisibility();
        renderLegend();
      });
      item.addEventListener('click', e => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          if (checkbox.checked) activeWilayah.add(cat.id);
          else activeWilayah.delete(cat.id);
          applyWilayahVisibility();
          renderLegend();
        }
      });
      container.appendChild(item);
    });
  }

  // ─── Render Legend ──────────────────────────────────────────────────────────
  function renderLegend() {
    const container = document.getElementById('legend-items');
    container.innerHTML = '';

    // Sekolah section
    if (activeSekolah.size > 0) {
      const g = document.createElement('div');
      g.className = 'legend-group-label';
      g.textContent = 'Sekolah';
      container.appendChild(g);
      SEKOLAH_CATEGORIES.filter(c => activeSekolah.has(c.id)).forEach(cat => {
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `
          ${getSymbolChip(cat, 'sm')}
          <span>${cat.label}</span>
        `;
        container.appendChild(row);
      });
    }

    // Wilayah & Jarak section
    const activeWilayahList = WILAYAH_CATEGORIES.filter(c => activeWilayah.has(c.id));
    if (activeWilayahList.length > 0) {
      const g = document.createElement('div');
      g.className = 'legend-group-label';
      g.textContent = 'Wilayah & Analisis';
      container.appendChild(g);
      activeWilayahList.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `${getSymbolChip(cat, 'sm')}<span>${cat.label}</span>`;
        container.appendChild(row);
      });
    }
  }

  // ─── Visibility Controllers ────────────────────────────────────────────────────

  // Toggle visibility untuk layer sekolah
  function applySekolahVisibility() {
    SEKOLAH_CATEGORIES.forEach(cat => {
      const visibility = activeSekolah.has(cat.id) ? 'visible' : 'none';
      const layers = SEKOLAH_MAP_LAYERS[cat.id] || [];
      layers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });
    });
  }

  // Toggle visibility untuk layer wilayah & jarak
  function applyWilayahVisibility() {
    WILAYAH_CATEGORIES.forEach(cat => {
      const isActive = activeWilayah.has(cat.id);
      const visibility = isActive ? 'visible' : 'none';

      // Toggle MapLibre layers (garis, fill, dll)
      (cat.mapLayers || []).forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });

      // Khusus jarak_sekolah: toggle HTML marker labels
      if (cat.id === 'jarak_sekolah') {
        if (isActive) showJarakLabels();
        else hideJarakLabels();
      }

      // Khusus kemiringan_lereng: toggle floating legend
      if (cat.id === 'kemiringan_lereng') {
        let legendBar = document.getElementById('lereng-legend-bar');
        if (!legendBar) {
          legendBar = document.createElement('div');
          legendBar.id = 'lereng-legend-bar';
          legendBar.style.cssText = `
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 12px 18px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10;
            font-family: 'Inter', sans-serif;
            transition: opacity 0.3s ease;
          `;
          legendBar.innerHTML = `
            <div style="font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 8px; text-align: center;">Kemiringan Lereng</div>
            <div style="display: flex; height: 12px; width: 300px; border-radius: 6px; overflow: hidden; margin-bottom: 6px; background: linear-gradient(to right, #22c55e, #84cc16, #eab308, #f97316, #ef4444);">
              <div style="flex: 1; background: transparent;" title="Datar (0-8%)"></div>
              <div style="flex: 1; background: transparent;" title="Landai (8-15%)"></div>
              <div style="flex: 1; background: transparent;" title="Bergelombang (15-25%)"></div>
              <div style="flex: 1; background: transparent;" title="Curam (25-40%)"></div>
              <div style="flex: 1; background: transparent;" title="Sangat Curam (>40%)"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; font-weight: 500;">
              <span>Datar</span>
              <span>Sangat Curam</span>
            </div>
          `;
          document.body.appendChild(legendBar);
        }
        legendBar.style.display = isActive ? 'block' : 'none';
      }
    });
  }

  // ── Label Jarak — HTML Marker ────────────────
  function showJarakLabels() {
    hideJarakLabels(); // bersihkan yang lama dulu
    if (!jarakData || !jarakData.features) return;

    jarakData.features.forEach(feature => {
      const jarak = feature.properties.Jarak;
      const sekolah = feature.properties.Sekolah;
      const coords = feature.geometry.coordinates;

      if (!coords || !coords[0]) return;
      const line = coords[0];
      if (line.length < 2) return;

      // Hitung koordinat tepat di tengah-tengah garis (rata-rata X dan rata-rata Y)
      const firstPt = line[0];
      const lastPt = line[line.length - 1];
      const midLng = (firstPt[0] + lastPt[0]) / 2;
      const midLat = (firstPt[1] + lastPt[1]) / 2;

      const el = document.createElement('div');
      el.className = 'jarak-label-marker';
      el.textContent = jarak + ' km';
      el.title = sekolah + ' — ' + jarak + ' km';

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([midLng, midLat])
        .addTo(map);

      jarakMarkers.push(marker);
    });
  }

  function hideJarakLabels() {
    if (jarakMarkers && jarakMarkers.length > 0) {
      jarakMarkers.forEach(m => m.remove());
      jarakMarkers = [];
    }
  }

  // ─── Apply Filters ──────────────────────────────────────────────────────────
  function applySekolahFilter() {
    if (!map.getLayer('sekolah-circle')) return;
    const q = searchQuery.toLowerCase().trim();
    const filter = ['all'];

    if (q) {
      filter.push(['any',
        ['in', q, ['downcase', ['get', 'Name']]],
        ['in', q, ['downcase', ['get', 'nama']]],
        ['in', q, ['downcase', ['get', 'kecamatan']]]
      ]);
    }

    const activeFilter = filter.length > 1 ? filter : null;
    map.setFilter('sekolah-circle', activeFilter);
    if (map.getLayer('sekolah-label')) map.setFilter('sekolah-label', activeFilter);
  }

  // ─── Map Interactions ───────────────────────────────────────────────────────
  function setupMapInteractions() {
    const tooltip = document.getElementById('hover-tooltip');

    // Hover on sekolah
    map.on('mousemove', 'sekolah-circle', e => {
      if (!e.features.length) return;
      map.getCanvas().style.cursor = 'pointer';
      const props = e.features[0].properties;
      const fid = e.features[0].id;

      tooltip.style.display = 'block';
      tooltip.style.left = e.point.x + 'px';
      tooltip.style.top = e.point.y + 'px';
      tooltip.innerHTML = `<strong>${props.Name || props.nama}</strong><br/>Rombel: ${props.Rombel} &nbsp;|&nbsp; Daya Tampung: ${props.Dayatampun}`;

      // Highlight halo
      map.setFilter('sekolah-halo', ['==', ['id'], fid]);
      map.setPaintProperty('sekolah-halo', 'circle-stroke-width', 3);
      map.setPaintProperty('sekolah-halo', 'circle-opacity', 0.15);
    });

    map.on('mouseleave', 'sekolah-circle', () => {
      map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
      map.setFilter('sekolah-halo', ['==', ['id'], -1]);
      map.setPaintProperty('sekolah-halo', 'circle-stroke-width', 0);
      map.setPaintProperty('sekolah-halo', 'circle-opacity', 0);
    });

    // Click popup — sekolah
    map.on('click', 'sekolah-circle', e => {
      if (!e.features.length) return;
      const props = e.features[0].properties;

      const html = `
        <div class="popup-card">
          <div class="popup-top">
            <span class="popup-tag" style="color:#005B96;background:#EEF6FF;border-color:#bfdbfe;">
              <span class="popup-dot" style="background:#005B96;"></span>
              SMA Negeri
            </span>
            <h4 class="popup-title">${props.Name || props.nama}</h4>
          </div>
          <div class="popup-body">
            <div class="popup-row">
              <span class="popup-label">Rombongan Belajar</span>
              <span class="popup-value">${props.Rombel ?? '—'} rombel</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Daya Tampung</span>
              <span class="popup-value">${props.Dayatampun !== undefined ? Number(props.Dayatampun).toLocaleString('id-ID') + ' siswa' : '—'}</span>
            </div>
          </div>
        </div>
      `;

      if (popup) popup.remove();
      popup = new maplibregl.Popup({ closeButton: true, maxWidth: '290px' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    // ─── Click popup — Kemiringan Lereng ───
    map.on('click', 'lereng-fill', e => {
      if (!e.features.length) return;
      const props = e.features[0].properties;

      const html = `
        <div class="popup-card">
          <div class="popup-top">
            <span class="popup-tag" style="color:#b45309;background:#fef3c7;border-color:#fde68a;">
              <span class="popup-dot" style="background:#b45309;"></span>
              Topografi
            </span>
            <h4 class="popup-title">Kemiringan Lereng</h4>
          </div>
          <div class="popup-body">
            <div class="popup-row">
              <span class="popup-label">Kelas Lereng</span>
              <span class="popup-value">${props.Kemiringan || '—'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Persentase</span>
              <span class="popup-value">${props.Keterangan || '—'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Luas Area</span>
              <span class="popup-value">${props.Shape_Area ? Math.round(props.Shape_Area).toLocaleString('id-ID') + ' m²' : '—'}</span>
            </div>
          </div>
        </div>
      `;

      if (popup) popup.remove();
      popup = new maplibregl.Popup({ closeButton: true, maxWidth: '290px' })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    map.on('mouseenter', 'lereng-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'lereng-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // Hover on jarak line
    if (map.getLayer('jarak-line')) {
      map.on('mousemove', 'jarak-line', e => {
        if (!e.features.length) return;
        map.getCanvas().style.cursor = 'crosshair';
        const props = e.features[0].properties;
        tooltip.style.display = 'block';
        tooltip.style.left = e.point.x + 'px';
        tooltip.style.top = e.point.y + 'px';
        tooltip.innerHTML = `<strong>${props.Sekolah}</strong><br/>Jarak: ${props.Jarak} km`;
      });
      map.on('mouseleave', 'jarak-line', () => {
        map.getCanvas().style.cursor = '';
        tooltip.style.display = 'none';
      });
    }
  }

  // ─── UI Event Listeners ─────────────────────────────────────────────────────

  // 1. Sidebar Toggle & Close
  const sidebar = document.getElementById('gis-sidebar');
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
  document.getElementById('btn-close-sidebar').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
  });

  // 2. Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.getAttribute('data-tab')}`).classList.add('active');
    });
  });

  // 3. Quick Action Buttons
  document.getElementById('btn-select-all').addEventListener('click', () => {
    activeSekolah = new Set(SEKOLAH_CATEGORIES.map(c => c.id));
    activeWilayah = new Set(WILAYAH_CATEGORIES.map(c => c.id));
    renderSekolahChecklist();
    renderWilayahChecklist();
    applySekolahVisibility();
    applyWilayahVisibility();
    applySekolahFilter();
    renderLegend();
  });

  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    activeSekolah.clear();
    activeWilayah.clear();
    renderSekolahChecklist();
    renderWilayahChecklist();
    applySekolahVisibility();
    applyWilayahVisibility();
    applySekolahFilter();
    renderLegend();
  });

  // 4. Opacity Slider
  const opacitySlider = document.getElementById('layer-opacity');
  const opacityDisplay = document.getElementById('opacity-val');
  opacitySlider.addEventListener('input', e => {
    const val = parseInt(e.target.value, 10);
    currentOpacity = val / 100.0;
    opacityDisplay.textContent = `${val}%`;

    const layers = [
      { id: 'sekolah-circle', prop: 'circle-opacity' },
      { id: 'lereng-fill', prop: 'fill-opacity' },
      { id: 'buffer-5km-fill', prop: 'fill-opacity' },
      { id: 'sungai-line', prop: 'line-opacity' },
      { id: 'jarak-line', prop: 'line-opacity' }
    ];

    layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        map.setPaintProperty(layer.id, layer.prop, currentOpacity);
      }
    });
  });

  // 5. Basemap Switcher
  function switchBasemap(key) {
    if (!BASEMAP_TILES[key]) return;
    activeBasemap = key;
    const source = map.getSource('basemap-tiles');
    if (source) source.setTiles([BASEMAP_TILES[key]]);
    document.querySelectorAll('.basemap-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-basemap') === key);
    });
  }

  document.querySelectorAll('.basemap-card').forEach(card => {
    card.addEventListener('click', () => switchBasemap(card.getAttribute('data-basemap')));
  });

  // 6. Search Input
  document.getElementById('layer-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    applySekolahFilter();
  });

  // 7. Fit Bounds Button
  document.getElementById('btn-fit-bounds').addEventListener('click', () => {
    map.fitBounds(JEPARA_BOUNDS, { padding: 60, duration: 1200 });
  });

});
