export const DRONE_ALTITUDES = [100, 200, 300, 500] as const;
export const VIDEO_DURATIONS = [30, 45, 60] as const;
export const VIDEO_RESOLUTIONS = [
  { width: 1080, height: 1920, label: 'Dikey (9:16)', aspectRatio: '9:16' },
  { width: 720, height: 1280, label: 'Performans Modu', aspectRatio: '9:16' },
] as const;

export const CAMERA_PRESETS = [
  { name: 'Kuzeydoğu Açısı', heading: 45, pitch: -30, label: 'NE' },
  { name: 'Güneybatı Açısı', heading: 225, pitch: -30, label: 'SW' },
  { name: 'Kuşbakışı Görünüm', heading: 0, pitch: -90, label: 'TOP' },
  { name: 'Alçak İrtifa Uçuşu', heading: 90, pitch: -15, label: 'LOW' },
] as const;

export const NEARBY_PLACE_TYPES = [
  { type: 'hospital', label: 'Hastane', icon: '🏥' },
  { type: 'school', label: 'Okul', icon: '🏫' },
  { type: 'market', label: 'Market', icon: '🛒' },
  { type: 'highway', label: 'Otoyol', icon: '🛣️' },
  { type: 'beach', label: 'Plaj', icon: '🏖️' },
  { type: 'shopping mall', label: 'AVM', icon: '🏬' },
  { type: 'city center', label: 'Şehir Merkezi', icon: '🏙️' },
] as const;

export const DEFAULT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const APP_NAME = 'SanalParsel';
export const APP_DESCRIPTION = 'Türkiye\'nin ilk AI destekli gayrimenkul sinematik video platformu';
