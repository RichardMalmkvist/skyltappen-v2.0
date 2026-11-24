import SlidingRoomSignPreview from './SlidingRoomSignPreview';
import WhiteboardDrawing from './WhiteboardDrawing';
import {doorPanelProduct,doorPanelForm} from '../../data/threePanelDoor';
export default function ThreePanelDoorPreview({product,form,maxWidth=600,mini,interactive,renderPanel}){
 const number=String(product.articleNumber)==='0610',width=Math.min(maxWidth||600,600),panel=which=>renderPanel(doorPanelProduct(product,which),doorPanelForm(form,which,product));
 return <div data-three-panel-preview style={{width,maxWidth:'100%',position:'relative',marginBottom:number?0:width*.1}}><svg viewBox="0 0 192 281.25" style={{display:'block',width:'100%'}} aria-label="Tredelad dörrskylt"><rect width="192" height="281.25" fill="#202020"/><rect x="6" y="3.525" width="180" height="274.2" fill="#d5d5d5"/><path d="M6 93.75H186M6 187.5H186" stroke="#222" strokeWidth="3"/>{!number&&<text x="96" y="236" textAnchor="middle" fontSize="8" fontStyle="italic" fontFamily="Arial" fill="#222">WHITEBOARD</text>}</svg>
 <div data-door-panel="top" style={{position:'absolute',top:0,left:0,width:'100%',height:'33.333%',overflow:'hidden'}}>{panel('top')}</div>
 <div data-door-panel="middle" style={{position:'absolute',top:'33.333%',left:0,width:'100%',height:'33.333%',overflow:'hidden'}}>{number?<svg viewBox="0 0 192 93.75" style={{width:'100%',display:'block'}}><text x="96" y="70" textAnchor="middle" fontSize={50/.715} fontFamily="Arial" fill="#111">{form.doorNumber||''}</text></svg>:panel('middle')}</div>
 {number?<div style={{position:'absolute',left:'3.125%',top:'67.92%',width:'93.75%',height:'30.8%'}}><SlidingRoomSignPreview articleNumber="0614" windowOnly interactive={interactive}/></div>:interactive&&!mini?<WhiteboardDrawing area={{x:6/192,y:190.5/281.25,width:180/192,height:87.2/281.25}}/>:null}
 {!number&&<svg aria-hidden="true" viewBox="0 0 150 20" style={{position:"absolute",top:"99%",left:"11%",width:"78%"}}><path d="M0 0H150V17H0Z" fill="#252525"/><path d="M0 17H150V20H0Z" fill="#111"/></svg>}
 </div>;
}
