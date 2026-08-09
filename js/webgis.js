// Initialize Standalone Fullscreen MapLibre GL JS Map
document.addEventListener('DOMContentLoaded', () => {
  const map = new maplibregl.Map({
    container: 'map', // id of the HTML element
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
    }, // Carto Voyager style
    center: [107.6191, -6.9175], // Bandung / Citarum
    zoom: 11
  });

  // Add standard controls
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
});
