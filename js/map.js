// Initialize MapLibre GL JS for Project 3 Preview (Citarum Hilir Spatial Layer)
if (document.getElementById('map-citarum')) {
  const map = new maplibregl.Map({
    container: 'map-citarum',
    style: {
      'version': 8,
      'sources': {
        'carto-tiles': {
          'type': 'raster',
          'tiles': [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
          ],
          'tileSize': 256,
          'attribution': '&copy; CARTO'
        }
      },
      'layers': [
        {
          'id': 'carto-layer',
          'type': 'raster',
          'source': 'carto-tiles',
          'minzoom': 0,
          'maxzoom': 19
        }
      ]
    },
    center: [107.1343, -6.4777], // Citarum Hilir Center
    zoom: 10.8
  });

  // Add navigation controls (zoom in/out)
  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  // Load Spatial GeoJSON Data for Preview
  map.on('load', async () => {
    try {
      let response = await fetch('./assets/images/areakerja.json');
      if (!response.ok) {
        response = await fetch('./assets/geojson/areakerja.json');
      }
      const data = await response.json();

      map.addSource('citarum-preview-source', {
        type: 'geojson',
        data: data
      });

      // Match expression for land use category colors
      const colorMatch = [
        'match', ['get', 'category'],
        'Permukiman & Bangunan', '#f97316',
        'Kawasan Industri', '#a855f7',
        'Pertanian & Perkebunan', '#84cc16',
        'Hutan', '#15803d',
        'Semak Belukar', '#22c55e',
        'Lahan Terbuka / Kosong', '#eab308',
        'Tubuh Air & Perairan', '#06b6d4',
        'Infrastruktur & Transportasi', '#64748b',
        '#cbd5e1'
      ];

      // Fill Layer
      map.addLayer({
        id: 'citarum-preview-fill',
        type: 'fill',
        source: 'citarum-preview-source',
        paint: {
          'fill-color': colorMatch,
          'fill-opacity': 0.7
        }
      });

      // Line Stroke Layer
      map.addLayer({
        id: 'citarum-preview-line',
        type: 'line',
        source: 'citarum-preview-source',
        paint: {
          'line-color': '#1e293b',
          'line-width': 0.5,
          'line-opacity': 0.3
        }
      });

      // Pointer Cursor & Interactive Popup on Click
      map.on('mouseenter', 'citarum-preview-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'citarum-preview-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'citarum-preview-fill', (e) => {
        if (!e.features.length) return;
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 4px;">
              <strong style="color: #2b593f;">${props.category || 'Poligon'}</strong><br/>
              <span style="font-size: 12px; color: #475569;">${props.tutupan_lahan || ''}</span><br/>
              <span style="font-size: 11px; color: #64748b;">Luas: ${props.luas_ha ? props.luas_ha + ' Ha' : '-'}</span>
            </div>
          `)
          .addTo(map);
      });

    } catch (err) {
      console.error('Failed to load citarum preview layer:', err);
    }
  });
}
