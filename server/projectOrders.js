const crypto=require('crypto');
const {buildProjectOrderCart}=require('./projectOrderItems');
const {validateProjectOrderAssets}=require('./projectOrderFiles');
function installProjectOrders(app,services){
 const {readProjects,writeProjects,readOrders,writeOrders,readCatalog,staffAccess,adminAccess,accountSession,readUsers,purchaserAccountId,prepareOrderParts,addOrderStatusNotification,reserveProjectOrderNumber,getNextSubmissionNumber,getProjectDocumentDetails,getProjectOrderer,clearMissingProjectOrderLinks,readAsset}=services;
 let queue=Promise.resolve();const locked=action=>{const next=queue.then(action,action);queue=next.catch(()=>{});return next;};
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const handle=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){if(!error.status)console.error('Projektorder:',error);res.status(error.status||500).json({success:false,message:error.status?error.message:'Kunde inte skapa order eller offert från projektet.'});}};
 app.get('/api/projects/:id/quote',handle(async(req,res)=>{
  if(!await staffAccess(req))return res.status(401).json({success:false,message:'Obehörig'});
  const project=(await readProjects()).find(p=>String(p.id)===String(req.params.id));if(!project)fail(404,'Projektet hittades inte.');
  const cart=buildProjectOrderCart(project,await readCatalog()),details=getProjectDocumentDetails(project);
  const quote={orderNumber:'OFF-'+(project.number||project.id),createdAt:new Date().toISOString(),source:'project-quote',projectId:project.id,cart,orderTotal:Math.round(cart.reduce((sum,item)=>sum+item.lineTotal,0)*100)/100,currency:'SEK',orderer:getProjectOrderer(project),delivery:{company:project.customer||''},orderDetails:details,...details};
  res.json({success:true,quote});
 }));
 app.post('/api/projects/:id/create-order',handle(async(req,res)=>{
  if(!await adminAccess(req))return res.status(401).json({success:false,message:'Obehörig'});
  await locked(async()=>{
   const projects=await readProjects(),project=projects.find(p=>String(p.id)===String(req.params.id));if(!project)fail(404,'Projektet hittades inte.');
   const orders=await readOrders();
   const existing=orders.find(order=>(project.orderId&&String(order.id)===String(project.orderId))||(order.source==='project'&&String(order.projectId)===String(project.id)));
   if(existing){if(project.orderId!==existing.id){project.orderId=existing.id;project.orderNumber=existing.orderNumber;await writeProjects(projects);}fail(409,'Projektet har redan en order. Öppna den under Ordrar.');}
   clearMissingProjectOrderLinks([project],orders);
   const cart=buildProjectOrderCart(project,await readCatalog());await validateProjectOrderAssets(cart,readAsset);
   const now=new Date().toISOString(),details=getProjectDocumentDetails(project),session=await accountSession(req);
   const order={id:crypto.randomUUID(),orderNumber:await reserveProjectOrderNumber(project),submissionNumber:getNextSubmissionNumber(orders),accountUserId:session?.id||null,source:'project',projectId:project.id,createdAt:now,approvedAt:now,status:'godkänd',cart,orderTotal:Math.round(cart.reduce((sum,item)=>sum+item.lineTotal,0)*100)/100,currency:'SEK',orderer:getProjectOrderer(project),delivery:{company:project.customer||''},orderDetails:details,...details};
   order.createdByAccountId=session?.id||null;order.accountUserId=purchaserAccountId(order,await readUsers());
   const parts=await prepareOrderParts(order,orders);parts.forEach(part=>addOrderStatusNotification({status:null},part));orders.unshift(...parts);await writeOrders(orders);
   project.orderId=parts[0].id;project.orderNumber=parts[0].orderNumber;project.updatedAt=now;await writeProjects(projects);
   res.status(201).json({success:true,order:parts[0],orders:parts});
  });
 }));
}
module.exports={installProjectOrders};
