import * as Cesium from "cesium"
export function drawParcel(viewer:Cesium.Viewer,geojson:any){const coords=geojson.features[0].geometry.coordinates[0].flat();return viewer.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(coords),material:Cesium.Color.RED.withAlpha(0.35),outline:true,outlineColor:Cesium.Color.WHITE}})}
export function focusParcel(viewer:Cesium.Viewer,entity:Cesium.Entity){viewer.zoomTo(entity)}
