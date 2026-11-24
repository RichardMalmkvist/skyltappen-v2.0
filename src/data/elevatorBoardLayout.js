// Shared geometry for the on-screen board and its vector production PDF.
function elevatorBoardLayout(board={}){
 const width=Math.max(100,Number(board.widthMm)||420),height=Math.max(100,Number(board.heightMm)||460);
 const margin=Math.max(8,Math.min(18,width*.04)),topPadding=10;
 const groups=(board.floors||[]).map(floor=>({...floor,lines:String(floor.text||'').split(/\r?\n/)}));
 const fixedHeight=groups.reduce((sum,floor)=>sum+30+5+floor.lines.length*28+(floor.highlightLine>=0&&floor.highlightLine<floor.lines.length?2:0),0)+Math.max(0,groups.length-1)*5;
 const tall=height>width*2;
 const bottomPadding=tall?Math.max(margin,height*.065):margin;
 // Tall inserts can expand moderately to match the original printed boards.
 // Sparse boards keep a readable size; dense boards still shrink to fit.
 const scale=Math.min(tall?1.25:1,Math.max(1,height-topPadding-bottomPadding)/Math.max(1,fixedHeight));
 return {width,height,margin,contentWidth:width-2*margin,topPadding,bottomPadding,scale,contentHeight:fixedHeight*scale};
}
module.exports={elevatorBoardLayout};
