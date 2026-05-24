export interface CesiumMapPreviewRef {
  flyToParcel: () => void;
  toggleFullscreen: () => void;
  getViewer: () => unknown;
}