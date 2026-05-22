"use client"
import {useEffect,useRef} from "react"
import * as Cesium from "cesium"
import {drawParcel,focusParcel} from "@/lib/cesiumParcel"
export default function CesiumMap({geojson}:{geojson?:any}){const containerRef=useRef<HTMLDivElement>(null);useEffect(()=>{if(!containerRef.current)return;const viewer=new Cesium.Viewer(containerRef.current,{animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,baseLayerPicker:true,navigationHelpButton:false});viewer.scene.globe.enableLighting=true;viewer.scene.highDynamicRange=true;if(geojson){const entity=drawParcel(viewer,geojson);focusParcel(viewer,entity)};(window as any).sanalparselViewer=viewer;return()=>viewer.destroy()},[geojson]);return <div ref={containerRef} style={{width:"100%",height:"100vh"}}/>}
