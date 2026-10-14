// Flush elapsed wall time before an action, under the speed already in effect.
// The historical clock may advance between source records; prices never do.
export function createWallClock(now=0){
  if(!Number.isFinite(now))throw Error('Invalid wall-clock anchor');
  return {anchor:now,budget:0};
}
export function syncWallClock(wall,now,session,force=false){
  if(!Number.isFinite(now)||now<wall.anchor)throw Error('Wall clock moved backwards');
  const elapsed=(now-wall.anchor)/1000;
  wall.anchor=now;
  if(!session||session.paused||session.account.done){wall.budget=0;return;}
  wall.budget+=elapsed;
  if(force||wall.budget>=0.05){
    const seconds=wall.budget;
    wall.budget=0;
    session.advance(seconds,session.account.practice.speed,false);
  }
}
