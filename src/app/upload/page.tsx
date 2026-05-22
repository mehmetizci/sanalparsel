"use client"
import {useState} from "react"
import CesiumMap from "@/components/CesiumMap"
import {getGeoJsonCenter} from "@/lib/geoAnalyzer"
export default function UploadPage(){const[geojson,setGeojson]=useState<any>(null);const[center,setCenter]=useState<any>(null);const handleUpload=async(e:any)=>{const file=e.target.files?.[0];if(!file)return;const parsed=JSON.parse(await file.text());setGeojson(parsed);setCenter(getGeoJsonCenter(parsed))};return <div style={{display:"flex",minHeight:"100vh"}}><aside style={{width:340,padding:24,borderRight:"1px solid #ddd"}}><h2>GeoJSON Yükle</h2><input type="file" accept=".json,.geojson" onChange={handleUpload}/>{center&&<div style={{marginTop:20}}><b>Merkez:</b><p>{center.lat.toFixed(6)}, {center.lon.toFixed(6)}</p></div>}</aside><section style={{flex:1}}><CesiumMap geojson={geojson}/></section></div>}
