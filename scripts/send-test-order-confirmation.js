// Sends a marked preview through the same mail builder as checkout.
// Never creates a customer, an order or a production job.
const {EmailClient}=require('@azure/communication-email');
const {buildOrderConfirmationEmail}=require('../server/orderConfirmationEmail');

function createTestOrder(address,date=new Date()) {
  return {
    id:'test-order',test:true,workflow:'badge-production',status:'ny',
    submissionNumber:'PROV-NAMNBRICKA',orderNumber:'PROV-1001',createdAt:date.toISOString(),
    orderer:{purchaserName:'Richard',purchaserEmail:address,purchaserPhone:'036-000 00 00',accountNumber:'EXEMPEL-1234'},
    delivery:{recipient:'Anna Andersson',unit:'Exempelavdelningen',company:'Exempelavdelningen',organization:'Region Jönköpings län',address:'Exempelgatan 1',postalCode:'551 85',city:'Jönköping',country:'Sverige'},
    cart:[{id:'test-item',articleId:'test-badge',articleNumber:'0201',productType:'namnbricka',nameBadgePreset:'rjl_0201',badgeName:'Namnbricka utan verksamhetsnamn',name:'Anna Andersson',title:'Sjuksköterska',fastening:'Magnet',format:'75 × 30 mm',quantity:1,unitPrice:167,lineTotal:167}],
    orderTotal:167,currency:'SEK',
  };
}
async function main() {
  const args=process.argv.slice(2),address=args[0]==='--to'?args[1]:'';
  if(args.length!==2||!/^\S+@\S+\.\S+$/.test(address))throw new Error('Använd: node scripts/send-test-order-confirmation.js --to din@mejladress.se');
  if(!process.env.ACS_CONNECTION_STRING)throw new Error('ACS_CONNECTION_STRING saknas. Kör i samma servermiljö som appens mejltjänst.');
  const order=createTestOrder(address);
  const message=await buildOrderConfirmationEmail([order],{test:true});
  const client=new EmailClient(process.env.ACS_CONNECTION_STRING);
  const poller=await client.beginSend(message);
  const result=await poller.pollUntilDone({intervalInMs:5000});
  if(result.status!=='Succeeded')throw new Error('Mejltjänsten kunde inte skicka provmejlet.');
  console.log('Provmejlet har lämnats till mejltjänsten för leverans till '+address+'. Ingen order har skapats.');
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={createTestOrder};
