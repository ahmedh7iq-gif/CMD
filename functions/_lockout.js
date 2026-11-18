// Pure lockout transition, with durations 1h, 2h, 4h, 8h, then permanent.
export function nextPinFailure(failedAttempts,lockLevel,now){
 const count=failedAttempts+1;
 if(lockLevel===0&&count<5)return {attempts:count,level:0,until:null,permanent:0,remaining:5-count};
 if(lockLevel===0)return {attempts:0,level:1,until:now+3600,permanent:0,remaining:0};
 if(lockLevel>=4)return {attempts:0,level:5,until:null,permanent:1,remaining:0};
 const level=lockLevel+1;
 return {attempts:0,level,until:now+3600*2**(level-1),permanent:0,remaining:0};
}
