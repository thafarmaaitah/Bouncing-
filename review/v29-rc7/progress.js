// Local-only, bounded progress. No identifiers, dates, network calls or currency.
export const PROGRESS_KEY='skyRushProgressV29RC7Review';
export const BADGES=Object.freeze({explorer:'Star explorer',clean:'Clean run',time:'Time finisher'});
export const GOALS=Object.freeze({explorer:'Collect all five stars and finish.',clean:'Finish without a fall, obstacle hit or checkpoint retry.'});
export function emptyProgress(){return {version:1,lava:{explorer:false,clean:false,time:false},storm:{explorer:false,clean:false,time:false}}}
export function readProgress(){
 const value=emptyProgress();let stored=true;
 try{const raw=localStorage.getItem(PROGRESS_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed?.version===1)for(const s of ['lava','storm'])for(const b of Object.keys(BADGES))value[s][b]=parsed[s]?.[b]===true;}}
 catch{stored=false}
 return {value,stored};
}
export function recordCompletion(stage,run){
 const state=readProgress(),earned=[];
 if(!['lava','storm'].includes(stage)||!run||run.score!==5||run.complete!==true||!Number.isFinite(run.seconds)||run.seconds<=0||!Number.isInteger(run.setbacks)||run.setbacks<0||!Number.isInteger(run.retries)||run.retries<0)return {...state,earned,valid:false};
 const qualifies={explorer:true,clean:run.assisted!==true&&run.setbacks===0&&run.retries===0,time:run.assisted!==true&&run.challenge===true&&run.eligible===true};
 for(const key of Object.keys(BADGES))if(qualifies[key]&&!state.value[stage][key]){state.value[stage][key]=true;earned.push(key)}
 let stored=true;try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(state.value))}catch{stored=false}
 return {value:state.value,stored,earned,valid:true};
}
export function countBadges(value){return ['lava','storm'].reduce((n,s)=>n+Object.keys(BADGES).filter(k=>value[s][k]).length,0)}
