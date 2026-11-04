// Direction hint only, not a collision, jump or safety guarantee.
export function guideIndex(anchor,missing,finish=11,branch=12,branchOrigin=5){
 if(!Number.isInteger(anchor)||anchor<0||anchor>branch)return -1;
 if(anchor===branch)return branchOrigin;
 const earlier=missing.filter(i=>Number.isInteger(i)&&i>=0&&i<=finish&&i<=anchor).sort((a,b)=>a-b);
 if(earlier.length)return earlier[0]===anchor?anchor:Math.max(0,anchor-1);
 return Math.min(finish,anchor+1);
}
