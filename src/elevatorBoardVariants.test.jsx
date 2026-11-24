import {createCartItem,validateCurrentItem} from './data/cartHelpers';
import {elevatorBoardVariants} from './data/elevatorBoardVariants';
const articles=[{id:'large',articleNumber:'0807',name:'Komplett stor',unitPrice:900},{id:'paper',articleNumber:'0808',name:'Pappersutskrift',unitPrice:200},{id:'small',articleNumber:'0804',unitPrice:500},{id:'smallPaper',articleNumber:'0805',unitPrice:100}];
const numbered=(id,completeArticleNumber,printArticleNumber)=>({id,type:'elevator',name:id,completeArticleNumber,printArticleNumber,folderId:'lifts',board:{floors:[]},floorCopies:4,cabinCopies:1});
test('Every numbered lift is included, independent of old catalog entries, with correct complete and paper article mappings',()=>{
 const library={folders:[{id:'hospital',name:'Ryhov'},{id:'lifts',name:'Hisstavlor',parentId:'hospital'}],items:[numbered('G','0807','0808'),numbered('D','0804','0805'),numbered('new','0807','0808'),numbered('unfinished','',''),{id:'other',type:'ot',articleNumber:'0810'}]};
 const result=elevatorBoardVariants(library,articles,[]);
 expect(result.map(value=>value.id)).toEqual(['G','D','new']);
 expect(result[0]).toMatchObject({location:'Ryhov / Hisstavlor',floorCopies:4,cabinCopies:1,options:{complete:{articleNumber:'0807',articleId:'large',unitPrice:900},print:{articleNumber:'0808',articleId:'paper',unitPrice:200}}});
 expect(result[1].options).toMatchObject({complete:{articleId:'small'},print:{articleId:'smallPaper'}});
});
test('Partial and legacy article mappings remain visible without inventing the missing option',()=>{
 const result=elevatorBoardVariants({items:[numbered('complete','0807',''),numbered('print','','0808'),{id:'legacy',type:'elevator',articleNumber:'0805'}]},articles);
 expect(result).toHaveLength(3);expect(result[0].options.print).toBeNull();expect(result[1].options.complete).toBeNull();expect(result[2].options.print.articleId).toBe('smallPaper');
});
test('Removed article numbers cannot be revived from a stale catalog snapshot',()=>{
 expect(elevatorBoardVariants({items:[numbered('G','','')]},articles,[{id:'G',options:{print:{articleNumber:'0808',articleId:'paper'}}}])).toEqual([]);
});

test.each([['complete','large','0807',900],['print','paper','0808',200]])('A newly selected lift uses its %s article, price and copy count in the cart', (mode,badgeId,articleNumber,unitPrice)=>{
 const board={widthMm:420,heightMm:485,floors:[{heading:'Plan 4',text:'Entré'}]};
 const variant=elevatorBoardVariants({items:[{...numbered('new','0807','0808'),board}]},articles)[0];
 const product={id:'stale-product',name:'Hisstavlor',previewType:'elevator_board',elevatorBoards:[{id:'old'}]};
 const form={elevatorBoardId:'new',elevatorBoardVariant:variant,elevatorBoard:board,elevatorOrderMode:mode,quantity:5};
 expect(validateCurrentItem(product,null,form)).toBeNull();
 expect(createCartItem(product,null,form)).toMatchObject({badgeId,articleNumber,unitPrice,quantity:5,elevatorBoardId:'new',floorCopies:4,cabinCopies:1,elevatorBoard:board});
});
