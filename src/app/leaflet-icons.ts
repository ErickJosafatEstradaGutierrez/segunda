import * as L from 'leaflet';

// Corregir paths de los íconos
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/proyecto2/assets/leaflet/images/marker-icon-2x.png',
  iconUrl: '/proyecto2/assets/leaflet/images/marker-icon.png',
  shadowUrl: '/proyecto2/assets/leaflet/images/marker-shadow.png',
});
