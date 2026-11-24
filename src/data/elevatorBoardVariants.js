// Resolve every numbered lift from the current library, including newly added lifts.
export function elevatorBoardVariants(library,articles=[],previous=[]){
 const byNumber=new Map(articles.map(article=>[String(article.articleNumber||'').trim(),article]));
 const previousOptions=previous.flatMap(variant=>Object.values(variant.options||{})).filter(Boolean);
 const option=number=>{
  if(!number)return null;
  const article=byNumber.get(number),old=previousOptions.find(value=>value.articleNumber===number);
  return {articleNumber:number,articleId:article?.id??old?.articleId,articleName:article?.name??old?.articleName,unitPrice:Number(article?.unitPrice??old?.unitPrice)||0};
 };
 return (library.items||[]).filter(item=>item.type==='elevator'&&(String(item.completeArticleNumber||'').trim()||String(item.printArticleNumber||item.articleNumber||'').trim())).map(item=>{
  const names=[],seen=new Set();let folder=(library.folders||[]).find(value=>value.id===item.folderId);
  while(folder&&!seen.has(folder.id)){seen.add(folder.id);names.unshift(folder.name);const parentId=folder.parentId;folder=(library.folders||[]).find(value=>value.id===parentId);}
  return {id:item.id,name:item.name,location:names.join(' / '),board:item.board,floorCopies:item.floorCopies??1,cabinCopies:item.cabinCopies??0,options:{complete:option(String(item.completeArticleNumber||'').trim()),print:option(String(item.printArticleNumber||item.articleNumber||'').trim())}};
 });
}
