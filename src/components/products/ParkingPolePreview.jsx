import {poleHeight} from '../../data/parkingPole';
import {useId} from 'react';
export default function ParkingPolePreview({form,maxWidth=500}){
 const id=useId().replace(/:/g,''),height=poleHeight(form)||3150;
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-80 -10 160 ${height+20}`} role="img" aria-label={`Galvaniserad stolpe, ${height} mm`} style={{display:'block',width:'100%',maxWidth,height:450,margin:'auto'}}><defs><linearGradient id={id}><stop stopColor="#888"/><stop offset=".3" stopColor="#d6d8d9"/><stop offset=".7" stopColor="#bfc2c4"/><stop offset="1" stopColor="#85898c"/></linearGradient></defs><rect x="-30" width="60" height={height} fill={`url(#${id})`}/><ellipse cy="0" rx="30" ry="5" fill="#aeb1b3" stroke="#74787a" strokeWidth="1"/><ellipse cy="0" rx="25.8" ry="3.6" fill="#555b5e"/></svg>;
}
