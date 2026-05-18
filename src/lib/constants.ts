export const DRONE_ALTITUDES = [100, 200, 300, 500] as const;
export const VIDEO_DURATIONS = [30, 45, 60] as const;

export const CAMERA_PRESETS = [
  { name: 'Kuzeydoğu Açısı', heading: 45, pitch: -30, label: 'NE' },
  { name: 'Güneybatı Açısı', heading: 225, pitch: -30, label: 'SW' },
  { name: 'Kuşbakışı Görünüm', heading: 0, pitch: -90, label: 'TOP' },
  { name: 'Alçak İrtifa Uçuşu', heading: 90, pitch: -15, label: 'LOW' },
] as const;

export const NEARBY_PLACE_TYPES = [
  { type: 'hospital', label: 'Hastane', icon: '🏥' },
  { type: 'school', label: 'Okul', icon: '🏫' },
  { type: 'supermarket', label: 'Market', icon: '🛒' },
  { type: 'highway', label: 'Otoyol', icon: '🛣️' },
  { type: 'beach', label: 'Sahil', icon: '🏖️' },
  { type: 'shopping_mall', label: 'AVM', icon: '🏬' },
  { type: 'city_center', label: 'Şehir Merkezi', icon: '🏙️' },
] as const;

export const DEFAULT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const APP_NAME = 'DroneView AI';
export const APP_DESCRIPTION = 'Gayrimenkul için AI destekli sanal drone video platformu';
