import {fetchPOIs} from "@/lib/overpass"
import {getDistanceMeters} from "@/lib/distance"
import {generateAreaAnalysis} from "@/lib/aiAnalysis"
export async function POST(req:Request){const {center}=await req.json();const pois=await fetchPOIs(center.lat,center.lon,1500);const enriched=pois.map((p:any)=>{const lat=p.lat||p.center?.lat;const lon=p.lon||p.center?.lon;return {name:p.tags?.name||"Bilinmeyen nokta",type:p.tags?.amenity||p.tags?.shop||"poi",distance:Math.round(getDistanceMeters(center.lat,center.lon,lat,lon)),lat,lon}}).filter((p:any)=>p.lat&&p.lon).sort((a:any,b:any)=>a.distance-b.distance);const aiResult=await generateAreaAnalysis({center,pois:enriched.slice(0,15)});return Response.json({pois:enriched,aiResult})}
