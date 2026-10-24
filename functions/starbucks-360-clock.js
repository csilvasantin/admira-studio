const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
export async function sharedClock(fetchImpl=fetch,now=Date.now){
 try{
  const before=now(),response=await fetchImpl('https://brain.digitalavatar.ai/sync/state',{headers:{'User-Agent':'Mozilla/5.0 (compatible; AdmiraStudio/1.0)'},cache:'no-store'}),after=now();
  const d=await response.json();if(!response.ok||!Number.isFinite(d.serverNow))throw Error('clock_unavailable');
  return Response.json({serverNow:Math.round(now()+d.serverNow-(before+after)/2)},{headers});
 }catch{return Response.json({error:'clock_unavailable'},{status:503,headers});}
}
export const onRequestGet=()=>sharedClock();
