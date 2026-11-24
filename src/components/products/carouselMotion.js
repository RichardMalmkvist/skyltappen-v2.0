// One position drives the whole track. Critical damping keeps re-grabs continuous.
export function springStep(position,velocity,target,seconds){
 const omega=15,dt=Math.min(.05,Math.max(0,seconds)),delta=position-target;
 const decay=Math.exp(-omega*dt),b=velocity+omega*delta;
 return {position:target+(delta+b*dt)*decay,velocity:(velocity-omega*b*dt)*decay};
}
export function createCarouselMotion(initial=0,options={}){
 const request=options.requestFrame||requestAnimationFrame,cancel=options.cancelFrame||cancelAnimationFrame;
 let position=initial,velocity=0,target=initial,frame=null,last=null,paint=()=>{};
 const stop=()=>{if(frame!==null)cancel(frame);frame=null;last=null;};
 function tick(time){
  frame=null;
  const step=springStep(position,velocity,target,last===null?1/60:(time-last)/1000);
  last=time;position=step.position;velocity=step.velocity;
  if(Math.abs(position-target)<.0003&&Math.abs(velocity)<.003){position=target;velocity=0;last=null;paint(position);return;}
  paint(position);frame=request(tick);
 }
 return {
  get position(){return position;},
  setPainter(next){paint=next;paint(position);},
  grab(){stop();target=position;velocity=0;return position;},
  dragTo(next){position=next;target=next;if(frame===null)frame=request(()=>{frame=null;paint(position);});},
  settle(next,releaseVelocity,reduced=false){
   stop();target=next;if(Number.isFinite(releaseVelocity))velocity=releaseVelocity;
   if(reduced){position=target;velocity=0;paint(position);}else frame=request(tick);
  },
  reset(next){stop();position=target=next;velocity=0;paint(position);},
  stop
 };
}
