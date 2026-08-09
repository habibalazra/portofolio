// Initialize MapLibre GL JS for Project 3
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
    }, // Carto Voyager style
    center: [107.6191, -6.9175], // Bandung / Citarum area approximate coords
    zoom: 10
  });

  // Add navigation controls (zoom in/out)
  map.addControl(new maplibregl.NavigationControl(), 'top-right');

}
