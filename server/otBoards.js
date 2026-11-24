function cleanOTBoard(input={}){
  const widthMm=Number(input.widthMm),heightMm=Number(input.heightMm);
  if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>=100&&n<=2000))throw new Error("Ange bredd och höjd mellan 100 och 2000 mm.");
  const title=String(input.title||"").trim(),targetTitle=String(input.targetTitle||"").trim();
  if(!title||title.length>80||!targetTitle||targetTitle.length>40)throw new Error("Fyll i båda kolumnrubrikerna (högst 80 respektive 40 tecken).");
  const columns=Number(input.columns??1);
  if(![1,2].includes(columns))throw new Error("Välj en eller två kolumner.");
  const targetBackground=input.targetBackground??true;
  if(typeof targetBackground!=="boolean")throw new Error("Välj målpunkt med eller utan svart ruta.");
  if(!Array.isArray(input.rows)||!input.rows.length||input.rows.length>100*columns)throw new Error(`OT-tavlan behöver ha 1–${100*columns} rader.`);
  const showFloor=input.showFloor??false;
  if(typeof showFloor!=="boolean")throw new Error("Välj om plan ska visas på tavlan.");
  const rows=input.rows.map((row,index)=>{
    const text=String(row.text||"").trim(),target=String(row.target||"").trim();
    // Empty cells preserve the left/right positions in a two-column board.
    if(columns===2&&!text&&!target)return {text:"",target:""};
    if(!text||text.length>120||!target||target.length>10||/[\r\n]/.test(text+target))throw new Error(`Fyll i avdelning (högst 120 tecken) och målpunkt (högst 10 tecken) på rad ${index+1}.`);
    const floor=String(row.floor??"").trim();
    if(floor.length>10||/[\r\n]/.test(floor))throw new Error(`Ange högst 10 tecken för plan på rad ${index+1}.`);
    return {text,target,...(showFloor||floor?{floor}:{})};
  });
  if(!rows.some(row=>row.text&&row.target))throw new Error("Fyll i minst en avdelning och målpunkt på tavlan.");
  const lineStyle=input.lineStyle||"dotted";
  if(!["dotted","dashed","solid"].includes(lineStyle))throw new Error("Välj prickad, streckad eller heldragen linje.");
  return {widthMm,heightMm,title,targetTitle,lineStyle,columns,targetBackground,showFloor,rows};
}

function cleanOTUnitPrice(value){
  if(value===null||value===undefined||String(value).trim()==="")return null;
  const price=Number(value);
  if(!["number","string"].includes(typeof value)||!Number.isFinite(price)||price<0)throw new Error("Ange ett giltigt pris, minst 0 kr, eller lämna prisfältet tomt för artikelns pris.");
  return Math.round(price*100)/100;
}

function attachOTBoards(catalog,library){
  const folders=library.folders||[];
  for(const article of catalog.articles||[]){
    const number=String(article.articleNumber||"").trim();
    const boards=(library.items||[]).filter(item=>item.type==="ot"&&number&&String(item.articleNumber||"").trim()===number).map(item=>{
      const names=[];let folder=folders.find(f=>f.id===item.folderId);const seen=new Set();
      while(folder&&!seen.has(folder.id)){seen.add(folder.id);if(!/ot[ -]?tavlor/i.test(folder.name))names.unshift(folder.name);folder=folders.find(f=>f.id===folder.parentId);}
      return {id:item.id,name:item.name,location:names.join(" / "),board:item.board,unitPrice:item.unitPrice??(Number(article.unitPrice)||0)};
    });
    if(boards.length||article.previewType==="ot_board"){
      Object.assign(article,{previewType:"ot_board",flowType:"form",directAddToCart:false,isImplemented:true,otBoards:boards,fields:{...(article.fields||{}),quantity:true}});
    }
  }
  return catalog;
}
module.exports={cleanOTBoard,cleanOTUnitPrice,attachOTBoards};
