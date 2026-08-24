// WebGIS Tata Ruang & Tutupan Lahan Citarum Hilir
// MapLibre GL JS Implementation with Dynamic Layer Controls & Attribute Classification

document.addEventListener('DOMContentLoaded', () => {

  // Land Use Category Configurations with Standard Cartography Symbology (ATR-BPN / BIG / ArcGIS Standard)
  const CATEGORIES = [
    { id: 'Permukiman & Bangunan', label: 'Permukiman & Bangunan', color: '#fdbf6f' },
    { id: 'Kawasan Industri', label: 'Kawasan Industri', color: '#bcbddc' },
    { id: 'Pertanian & Perkebunan', label: 'Pertanian & Perkebunan', color: '#a6cee3' },
    { id: 'Hutan', label: 'Hutan', color: '#238b45' },
    { id: 'Semak Belukar', label: 'Semak Belukar', color: '#b2df8a' },
    { id: 'Lahan Terbuka / Kosong', label: 'Lahan Terbuka / Kosong', color: '#fed976' },
    { id: 'Tubuh Air & Perairan', label: 'Tubuh Air & Perairan', color: '#38bdf8' },
    { id: 'Infrastruktur & Transportasi', label: 'Infrastruktur & Transportasi', color: '#64748b' }
  ];

  // Helper functions to generate authentic ArcGIS cartographic pattern textures
  function createSawahPatternCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#bfe5fb';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;

    // Brick hatching grid lines (ArcGIS Sawah Irigasi style)
    ctx.beginPath();
    ctx.moveTo(0, 8); ctx.lineTo(size, 8);
    ctx.moveTo(0, 24); ctx.lineTo(size, 24);
    ctx.moveTo(8, 0); ctx.lineTo(8, 8);
    ctx.moveTo(24, 0); ctx.lineTo(24, 8);
    ctx.moveTo(16, 8); ctx.lineTo(16, 24);
    ctx.moveTo(0, 8); ctx.lineTo(0, 24);
    ctx.moveTo(8, 24); ctx.lineTo(8, size);
    ctx.moveTo(24, 24); ctx.lineTo(24, size);
    ctx.stroke();

    return ctx.getImageData(0, 0, size, size);
  }

  function createSemakPatternCanvas() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#b2df8a';
    ctx.fillRect(0, 0, size, size);

    // Speckled shrub clusters (ArcGIS Semak/Kebun style)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
    ctx.arc(11, 8, 2.5, 0, Math.PI * 2);
    ctx.arc(9.5, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(24, 22, 2.5, 0, Math.PI * 2);
    ctx.arc(27, 22, 2.5, 0, Math.PI * 2);
    ctx.arc(25.5, 20, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.fillRect(4, 22, 2, 2);
    ctx.fillRect(20, 6, 2, 2);

    return ctx.getImageData(0, 0, size, size);
  }

  const BASEMAP_TILES = {
    voyager: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    light: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    dark: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
  };

  // State Management
  let geojsonData = null;
  let activeCategories = new Set(CATEGORIES.map(c => c.id));
  let activeBasemap = 'voyager';
  let categoryStats = {};
  let hoveredFeatureId = null;
  let popup = null;
  let currentOpacity = 0.8;
  let searchQuery = '';

  // Initialize MapLibre GL JS Map
  const bounds = [[107.001988, -6.673083], [107.266625, -6.282249]];

  const map = new maplibregl.Map({
    container: 'map',
    style: {
      'version': 8,
      'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      'sources': {
        'basemap-tiles': {
          'type': 'raster',
          'tiles': [BASEMAP_TILES.voyager],
          'tileSize': 256,
          'attribution': '&copy; CARTO &amp; OpenStreetMap'
        }
      },
      'layers': [
        {
          'id': 'basemap-layer',
          'type': 'raster',
          'source': 'basemap-tiles',
          'minzoom': 0,
          'maxzoom': 19
        }
      ]
    },
    center: [107.1343, -6.4777],
    zoom: 11.5
  });

  // Map Controls
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

  // Load GeoJSON Data and Initialize Layers
  map.on('load', async () => {
    try {
      // Register custom cartographic pattern images to MapLibre
      map.addImage('pattern-sawah', createSawahPatternCanvas());
      map.addImage('pattern-semak', createSemakPatternCanvas());

      // Fetch GeoJSON from organized folder: assets/geojson/webgis/areakerja.json
      const response = await fetch('./assets/geojson/webgis/areakerja.json');
      geojsonData = await response.json();

      // Ensure feature IDs exist for hover/state management
      geojsonData.features.forEach((feat, idx) => {
        feat.id = idx + 1;
      });

      // Calculate stats per category
      calculateStats(geojsonData.features);

      // Build Sidebar UI & Legend
      renderLayerChecklist();
      renderLegend();
      updateHeaderStats();

      // Add Source to Map
      map.addSource('areakerja-source', {
        type: 'geojson',
        data: geojsonData,
        generateId: false
      });

      // Match expression for fill colors
      const colorMatch = ['match', ['get', 'category']];
      CATEGORIES.forEach(cat => {
        colorMatch.push(cat.id, cat.color);
      });
      colorMatch.push('#cbd5e1'); // fallback gray

      // 1. Polygon Solid Fill Layer (Base)
      map.addLayer({
        id: 'areakerja-fill',
        type: 'fill',
        source: 'areakerja-source',
        paint: {
          'fill-color': colorMatch,
          'fill-opacity': currentOpacity
        }
      });

      // 1b. Pattern Fill Layer for Sawah (Pertanian Lahan Basah)
      map.addLayer({
        id: 'areakerja-pattern-sawah',
        type: 'fill',
        source: 'areakerja-source',
        filter: ['==', ['get', 'category'], 'Pertanian & Perkebunan'],
        paint: {
          'fill-pattern': 'pattern-sawah',
          'fill-opacity': currentOpacity
        }
      });

      // 1c. Pattern Fill Layer for Semak Belukar
      map.addLayer({
        id: 'areakerja-pattern-semak',
        type: 'fill',
        source: 'areakerja-source',
        filter: ['==', ['get', 'category'], 'Semak Belukar'],
        paint: {
          'fill-pattern': 'pattern-semak',
          'fill-opacity': currentOpacity
        }
      });

      // 2. Polygon Border Stroke Layer
      map.addLayer({
        id: 'areakerja-stroke',
        type: 'line',
        source: 'areakerja-source',
        paint: {
          'line-color': '#1e293b',
          'line-width': 0.6,
          'line-opacity': 0.4
        }
      });

      // 3. Highlight Stroke Layer for Clicked/Hovered Polygons
      map.addLayer({
        id: 'areakerja-highlight',
        type: 'line',
        source: 'areakerja-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-opacity': 1.0
        },
        filter: ['==', ['get', 'category'], ''] // start hidden
      });

      // Fit map to bounds of Citarum Hilir dataset
      map.fitBounds(bounds, { padding: 40, duration: 1200 });

      // Attach Map Event Listeners
      setupMapInteractions();

    } catch (err) {
      console.error('Error loading GeoJSON layer:', err);
    }
  });

  // Calculate stats (feature count & total hectares per category)
  function calculateStats(features) {
    categoryStats = {};
    CATEGORIES.forEach(c => {
      categoryStats[c.id] = { count: 0, areaHa: 0 };
    });

    features.forEach(f => {
      const cat = f.properties.category || 'Lainnya';
      const area = f.properties.luas_ha || 0;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, areaHa: 0 };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].areaHa += area;
    });
  }

  // Render Layer Checklist in Sidebar
  function renderLayerChecklist() {
    const container = document.getElementById('layer-checklist-container');
    container.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const stat = categoryStats[cat.id] || { count: 0, areaHa: 0 };
      const item = document.createElement('div');
      item.className = 'layer-item';

      item.innerHTML = `
        <div class="layer-info">
          <input type="checkbox" class="layer-toggle-checkbox" data-category="${cat.id}" ${activeCategories.has(cat.id) ? 'checked' : ''} />
          <div class="color-chip" style="background-color: ${cat.color};"></div>
          <div>
            <div class="layer-name">${cat.label}</div>
            <div class="layer-subtext">${stat.count.toLocaleString()} Poligon • ${stat.areaHa.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ha</div>
          </div>
        </div>
      `;

      // Event listener for item click & checkbox
      const checkbox = item.querySelector('.layer-toggle-checkbox');

      // Stop click on checkbox from bubbling and toggling twice
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      checkbox.addEventListener('change', () => {
        toggleCategory(cat.id, checkbox.checked);
      });

      item.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleCategory(cat.id, checkbox.checked);
        }
      });

      container.appendChild(item);
    });
  }

  // Render Legend
  function renderLegend() {
    const legendContainer = document.getElementById('legend-items');
    legendContainer.innerHTML = '';

    CATEGORIES.forEach(cat => {
      if (activeCategories.has(cat.id)) {
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `
          <div class="color-chip" style="background-color: ${cat.color}; width: 1rem; height: 1rem;"></div>
          <span>${cat.label}</span>
        `;
        legendContainer.appendChild(row);
      }
    });
  }

  // Update Header Stats (Visible Polygons & Area)
  function updateHeaderStats() {
    let totalCount = 0;
    let totalArea = 0;

    activeCategories.forEach(catId => {
      const stat = categoryStats[catId];
      if (stat) {
        totalCount += stat.count;
        totalArea += stat.areaHa;
      }
    });

    document.getElementById('stat-count').textContent = totalCount.toLocaleString();
    document.getElementById('stat-area').textContent = totalArea.toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' Ha';
  }

  // Toggle Category Filter
  function toggleCategory(catId, isVisible) {
    if (isVisible) {
      activeCategories.add(catId);
    } else {
      activeCategories.delete(catId);
    }

    applyFilter();
    renderLegend();
    updateHeaderStats();
  }

  // Apply Active Filter to MapLibre Layers
  function applyFilter() {
    if (!map.getLayer('areakerja-fill')) return;

    let filterConditions = ['all'];

    // Category filter
    const activeArray = Array.from(activeCategories);
    if (activeArray.length === 0) {
      filterConditions.push(['==', ['get', 'category'], 'NON_EXISTENT']);
    } else {
      filterConditions.push(['in', ['get', 'category'], ['literal', activeArray]]);
    }

    // Search query filter if present
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filterConditions.push([
        'any',
        ['in', query, ['downcase', ['get', 'category']]],
        ['in', query, ['downcase', ['get', 'tutupan_lahan']]],
        ['in', query, ['downcase', ['get', 'segmen']]]
      ]);
    }

    map.setFilter('areakerja-fill', filterConditions);
    if (map.getLayer('areakerja-pattern-sawah')) {
      const sawahFilter = ['all', ...filterConditions.slice(1), ['==', ['get', 'category'], 'Pertanian & Perkebunan']];
      map.setFilter('areakerja-pattern-sawah', sawahFilter);
    }
    if (map.getLayer('areakerja-pattern-semak')) {
      const semakFilter = ['all', ...filterConditions.slice(1), ['==', ['get', 'category'], 'Semak Belukar']];
      map.setFilter('areakerja-pattern-semak', semakFilter);
    }
    map.setFilter('areakerja-stroke', filterConditions);
  }

  // Setup Map Interactions (Click, Hover, Tooltip, Popup)
  function setupMapInteractions() {
    const tooltip = document.getElementById('hover-tooltip');

    // Mousemove hover listener
    map.on('mousemove', 'areakerja-fill', (e) => {
      if (e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const props = feat.properties;

        // Display Tooltip
        tooltip.style.display = 'block';
        tooltip.style.left = e.point.x + 'px';
        tooltip.style.top = e.point.y + 'px';
        tooltip.innerHTML = `<strong>${props.category}</strong> (${props.tutupan_lahan})<br/>Luas: ${props.luas_ha} Ha`;

        // Highlight layer filter
        map.setFilter('areakerja-highlight', ['==', ['get', 'category'], props.category]);
      }
    });

    map.on('mouseleave', 'areakerja-fill', () => {
      map.getCanvas().style.cursor = '';
      tooltip.style.display = 'none';
      map.setFilter('areakerja-highlight', ['==', ['get', 'category'], '']);
    });

    // Click Listener for Popup Information Card
    map.on('click', 'areakerja-fill', (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      const props = feat.properties;
      const catConfig = CATEGORIES.find(c => c.id === props.category) || { color: '#005B96' };

      const popupHtml = `
        <div class="popup-card">
          <div class="popup-top">
            <span class="popup-tag" style="color: ${catConfig.color}; background-color: ${catConfig.color}15; border-color: ${catConfig.color}30;">
              <span class="popup-dot" style="background-color: ${catConfig.color};"></span>
              ${props.category}
            </span>
            <h4 class="popup-title">${props.tutupan_lahan || props.category}</h4>
          </div>
          <div class="popup-body">
            <div class="popup-row">
              <span class="popup-label">Segmen Wilayah</span>
              <span class="popup-value">${props.segmen || 'Hilir'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Luas Area</span>
              <span class="popup-value">${props.luas_ha ? props.luas_ha.toLocaleString('id-ID') + ' Ha' : '-'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Luas (m²)</span>
              <span class="popup-value">${props.shape_area ? Math.round(props.shape_area).toLocaleString('id-ID') + ' m²' : '-'}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Keliling Polygon</span>
              <span class="popup-value">${props.shape_leng ? Math.round(props.shape_leng).toLocaleString('id-ID') + ' m' : '-'}</span>
            </div>
          </div>
        </div>
      `;

      if (popup) popup.remove();
      popup = new maplibregl.Popup({ closeButton: true, maxWidth: '290px' })
        .setLngLat(e.lngLat)
        .setHTML(popupHtml)
        .addTo(map);
    });
  }

  // UI EVENT LISTENERS

  // 1. Sidebar Toggle & Close
  const sidebar = document.getElementById('gis-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');

  btnToggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  btnCloseSidebar.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
  });

  // 2. Navigation Tabs (Layers / Basemaps)
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');
    });
  });

  // 3. Quick Action Buttons (Select All / Deselect All)
  document.getElementById('btn-select-all').addEventListener('click', () => {
    activeCategories = new Set(CATEGORIES.map(c => c.id));
    renderLayerChecklist();
    renderLegend();
    updateHeaderStats();
    applyFilter();
  });

  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    activeCategories.clear();
    renderLayerChecklist();
    renderLegend();
    updateHeaderStats();
    applyFilter();
  });

  // 4. Opacity Slider
  const opacitySlider = document.getElementById('layer-opacity');
  const opacityValDisplay = document.getElementById('opacity-val');

  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    currentOpacity = val / 100.0;
    opacityValDisplay.textContent = `${val}%`;

    if (map.getLayer('areakerja-fill')) {
      map.setPaintProperty('areakerja-fill', 'fill-opacity', currentOpacity);
    }
    if (map.getLayer('areakerja-pattern-sawah')) {
      map.setPaintProperty('areakerja-pattern-sawah', 'fill-opacity', currentOpacity);
    }
    if (map.getLayer('areakerja-pattern-semak')) {
      map.setPaintProperty('areakerja-pattern-semak', 'fill-opacity', currentOpacity);
    }
  });

  // 5. Basemap Switcher (shared logic)
  function switchBasemap(basemapKey) {
    if (!BASEMAP_TILES[basemapKey]) return;
    activeBasemap = basemapKey;
    const source = map.getSource('basemap-tiles');
    if (source) {
      source.setTiles([BASEMAP_TILES[basemapKey]]);
    }

    // Sync all basemap cards everywhere (both Tab 1 and Tab 2)
    document.querySelectorAll('.basemap-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-basemap') === basemapKey);
    });
  }

  // Bind click on all .basemap-card elements (Tab 1 and Tab 2)
  document.querySelectorAll('.basemap-card').forEach(card => {
    card.addEventListener('click', () => {
      const basemapKey = card.getAttribute('data-basemap');
      switchBasemap(basemapKey);
    });
  });

  // 6. Search Input Listener
  const searchInput = document.getElementById('layer-search');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilter();
  });

  // 7. Fit Bounds Button
  document.getElementById('btn-fit-bounds').addEventListener('click', () => {
    map.fitBounds(bounds, { padding: 40, duration: 1200 });
  });

});
