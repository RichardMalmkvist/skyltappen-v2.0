const {isBadgeOrder}=require('../src/data/badgeProduction');
const {createAcknowledgementAttachments}=require('./orderAcknowledgementPdf');

const SENDER_ADDRESS='DoNotReply@a80901a0-70aa-4a01-ab49-02633e2442ea.azurecomm.net';
async function buildOrderConfirmationEmail(parts,{submissionNumber,productLines='',test=false}={}) {
  if(!Array.isArray(parts)||!parts.length)throw new Error('Beställningen saknas.');
  const order=parts[0],o=order.orderer||{};
  const address=String(o.purchaserEmail||o.ordererEmail||'').trim();
  if(!address)return null;
  const ref=submissionNumber||order.submissionNumber||order.orderNumber||order.id;
  const firstName=String(o.purchaserName||o.ordererName||'').trim().split(/\s+/)[0];
  const attachments=await createAcknowledgementAttachments(parts);
  const allBadges=parts.every(isBadgeOrder);
  const receipt=allBadges?'Din beställning är mottagen för produktion.':parts.some(isBadgeOrder)?'Din beställning är mottagen. Namnbrickor och yrkestitlar hanteras direkt; övriga skyltar väntar på godkännande.':'Din beställning är mottagen och väntar nu på godkännande.';
  const body=[
    test?'PROVMEJL - ingen riktig beställning har lagts.':'',
    `Hej${firstName?' '+firstName:''}!`,
    'Tack för din beställning!',receipt,
    attachments.length?'Ditt ordererkännande för namnbrickor och yrkestitelsskyltar finns bifogat som PDF.':'',
    `Beställningsreferens: ${ref}`,
    !allBadges && productLines?`DIN BESTÄLLNING\n${productLines}`:'',
    'Kontrollera gärna uppgifterna i ordererkännandet. Om något inte stämmer, kontakta oss på richard.malmkvist@jonkopingsskyltfabrik.se.',
    'Med vänliga hälsningar,\nJönköpings Skyltfabrik',
  ].filter(Boolean).join('\n\n');
  return {senderAddress:SENDER_ADDRESS,recipients:{to:[{address}]},content:{subject:`${test?'[PROV] ':''}${attachments.length?'Ordererkännande':'Beställning mottagen'} - ${ref}`,plainText:body},...(attachments.length?{attachments}:{})};
}
module.exports={buildOrderConfirmationEmail};
