function flatten(s,w){
 const out={};
 if(s.profile)out["profile/settings"]=s.profile;
 if(s.reward)out["smoking/reward"]=s.reward;
 for(const [d,v] of Object.entries(s.days||{}))out["smoking/day:"+d]=v;
 for(const t of s.slips||[])out["smoking/slip:"+t]={time:t};
 if(w.goal!==2000)out["water/goal"]={value:w.goal};
 for(const e of w.entries||[])out["water/entry:"+e.id]=e;
 return out;
}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function changes(base,local){
 const out=[];
 for(const k of new Set([...Object.keys(base),...Object.keys(local)])){
  if(equal(base[k],local[k]))continue;
  const [module,...parts]=k.split("/");
  out.push({module,record_id:parts.join("/"),operation:local[k]===undefined?"delete":"upsert",payload:local[k]===undefined?{}:{value:local[k]}});
 }
 return out;
}
function applyEvents(events){
 const out={};
 for(const e of events){const k=e.module+"/"+e.record_id;if(e.operation==="delete")delete out[k];else out[k]=e.payload.value}
 return out;
}
function inflate(map){
 const s={profile:null,days:{},slips:[],reward:null},w={goal:2000,entries:[]};
 for(const [k,v] of Object.entries(map)){
  if(k==="profile/settings")s.profile=v;
  else if(k==="smoking/reward")s.reward=v;
  else if(/^smoking\/day:\d{4}-\d{2}-\d{2}$/.test(k))s.days[k.slice(12)]=v;
  else if(k.startsWith("smoking/slip:"))s.slips.push(v.time);
  else if(k==="water/goal")w.goal=v.value;
  else if(k.startsWith("water/entry:"))w.entries.push(v);
 }
 s.slips.sort((a,b)=>a-b);w.entries.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));return {s,w};
}
if(typeof module!=='undefined')module.exports={flatten,equal,changes,applyEvents,inflate};
