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
    center: [107.1343, -6.4777],
    zoom: 9.2
  });

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

  // Add navigation controls (zoom in/out)
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Load Spatial GeoJSON Data for Preview
  map.on('load', async () => {
    try {
      // Register custom cartographic pattern images to MapLibre
      map.addImage('pattern-sawah', createSawahPatternCanvas());
      map.addImage('pattern-semak', createSemakPatternCanvas());

      let response = await fetch('./assets/images/areakerja.json');
      if (!response.ok) {
        response = await fetch('./assets/geojson/areakerja.json');
      }
      const data = await response.json();

      map.addSource('citarum-preview-source', {
        type: 'geojson',
        data: data
      });

      // Match expression for land use category colors (Standard Cartography Symbology)
      const colorMatch = [
        'match', ['get', 'category'],
        'Permukiman & Bangunan', '#fdbf6f',
        'Kawasan Industri', '#bcbddc',
        'Pertanian & Perkebunan', '#a6cee3',
        'Hutan', '#238b45',
        'Semak Belukar', '#b2df8a',
        'Lahan Terbuka / Kosong', '#fed976',
        'Tubuh Air & Perairan', '#38bdf8',
        'Infrastruktur & Transportasi', '#64748b',
        '#cbd5e1'
      ];

      // 1. Fill Layer (Solid base)
      map.addLayer({
        id: 'citarum-preview-fill',
        type: 'fill',
        source: 'citarum-preview-source',
        paint: {
          'fill-color': colorMatch,
          'fill-opacity': 0.8
        }
      });

      // 1b. Pattern Fill Layer for Sawah (Pertanian Lahan Basah)
      map.addLayer({
        id: 'citarum-preview-pattern-sawah',
        type: 'fill',
        source: 'citarum-preview-source',
        filter: ['==', ['get', 'category'], 'Pertanian & Perkebunan'],
        paint: {
          'fill-pattern': 'pattern-sawah',
          'fill-opacity': 0.8
        }
      });

      // 1c. Pattern Fill Layer for Semak Belukar
      map.addLayer({
        id: 'citarum-preview-pattern-semak',
        type: 'fill',
        source: 'citarum-preview-source',
        filter: ['==', ['get', 'category'], 'Semak Belukar'],
        paint: {
          'fill-pattern': 'pattern-semak',
          'fill-opacity': 0.8
        }
      });

      // 2. Line Stroke Layer
      map.addLayer({
        id: 'citarum-preview-line',
        type: 'line',
        source: 'citarum-preview-source',
        paint: {
          'line-color': '#111928',
          'line-width': 0.6,
          'line-opacity': 0.4
        }
      });

      // Fit map view to the exact area of the dataset
      const bounds = new maplibregl.LngLatBounds();
      const extendCoords = (coords) => {
        if (typeof coords[0] === 'number') {
          bounds.extend(coords);
        } else {
          coords.forEach(extendCoords);
        }
      };

      if (data.features && data.features.length) {
        data.features.forEach(feature => {
          if (feature.geometry && feature.geometry.coordinates) {
            extendCoords(feature.geometry.coordinates);
          }
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 20,
          duration: 600
        });
      } else {
        map.fitBounds([[107.001988, -6.673083], [107.266625, -6.282249]], {
          padding: 20,
          duration: 600
        });
      }

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
        new maplibregl.Popup({ closeButton: true, maxWidth: '270px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: 'Inter', system-ui, sans-serif; padding: 2px;">
              <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #EEF6FF; color: #005B96; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px;">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: #005B96;"></span>
                  ${props.category || 'Poligon'}
                </span>
                <h4 style="font-size: 13px; font-weight: 700; color: #111928; margin: 0; line-height: 1.3;">${props.tutupan_lahan || props.category}</h4>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; color: #5B617A;">
                  <span>Segmen</span>
                  <strong style="color: #111928; font-weight: 600;">${props.segmen || 'Hilir'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #5B617A;">
                  <span>Luas Area</span>
                  <strong style="color: #111928; font-weight: 600;">${props.luas_ha ? props.luas_ha + ' Ha' : '-'}</strong>
                </div>
              </div>
            </div>
          `)
          .addTo(map);
      });

    } catch (err) {
      console.error('Failed to load citarum preview layer:', err);
    }
  });
}

