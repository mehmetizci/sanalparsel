export function createSubtitles(timeline:any[]){return timeline.map((item,index)=>{const next=timeline[index+1];return {start:item.time,end:next?next.time:item.time+4,text:item.text}})}
