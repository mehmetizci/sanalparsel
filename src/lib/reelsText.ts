export function buildNarrationText(timeline:any[]){return timeline.map((item)=>item.text).filter(Boolean).join(". ")}
