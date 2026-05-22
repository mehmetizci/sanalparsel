"use client"
import dynamic from "next/dynamic"
import {useState} from "react"
import {getGeoJsonCenter} from "@/lib/geoAnalyzer"

const CesiumMap = dynamic(() => import("@/components/CesiumMap"), {
  ssr: false,
  loading: () => <div style={{width: "100%", height: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"}}>Harita yükleniyor...</div>
})

export default function UploadPage(){const[geojson,setGeojson]=useState<any>(null);const[center,setCenter]=useState<any>(null);const handleUpload=async(e:any)=>{const file=e.target.files?.[0];if(!file)return;const parsed=JSON.parse(await file.text());setGeojson(parsed);setCenter(getGeoJsonCenter(parsed))};return <div style={{display:"flex",minHeight:"100vh"}}><aside style={{width:340,padding:24,borderRight:"1px solid #ddd"}}><h2>GeoJSON Yükle</h2><input type="file" accept=".json,.geojson" onChange={handleUpload}/>{center&&<div style={{marginTop:20}}><b>Merkez:</b><p>{center.lat.toFixed(6)}, {center.lon.toFixed(6)}</p></div>}</aside><section style={{flex:1}}><CesiumMap geojson={geojson}/></section></div>}
