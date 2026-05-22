import * as Cesium from "cesium"
export function cinematicFlyTo(viewer:Cesium.Viewer,lon:number,lat:number,height=300){return viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,height),orientation:{heading:Cesium.Math.toRadians(90),pitch:Cesium.Math.toRadians(-35),roll:0},duration:8,easingFunction:Cesium.EasingFunction.QUADRATIC_IN_OUT})}
