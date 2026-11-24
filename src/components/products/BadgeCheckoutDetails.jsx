import {BADGE_ORGANIZATION} from "../../data/badgeProduction";
export default function BadgeCheckoutDetails({orderer,setOrderer,delivery,setDelivery,inputStyle,fieldProps,fieldError}){
 const shownDelivery={organization:BADGE_ORGANIZATION,country:'Sverige',...delivery};
 const labelStyle={display:'block',fontSize:12,color:'#444',marginBottom:7};
 const cardStyle={background:'#fff',border:'1px solid #e8e8e8',borderRadius:10,padding:24,minWidth:0};
 const fieldsStyle={display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:18};
 const input={...inputStyle,boxSizing:'border-box',width:'100%',minWidth:0};
 const update=(key,purchaserKey,value)=>setOrderer(previous=>({...previous,[key]:value,...(purchaserKey?{[purchaserKey]:value}:{})}));
 return <div className="jsf-badge-checkout-details" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:24,width:'100%'}}>
 <section style={cardStyle} aria-label="Beställare"><h2 style={{fontSize:19,fontWeight:400,margin:'0 0 22px'}}>Beställare</h2><div style={fieldsStyle}>
 {[
 ['ordererName','purchaserName','Namn','text','name'],['ordererEmail','purchaserEmail','E-post','email','email'],['ordererPhone','purchaserPhone','Telefon','tel','tel'],['accountNumber',null,'Ansvarsnummer','text','off']
 ].map(([key,purchaser,label,type,autoComplete])=><div key={key}><label htmlFor={key} style={labelStyle}>{label}</label><input {...fieldProps(key)} id={key} required type={type} autoComplete={autoComplete} value={(purchaser&&orderer[purchaser])||orderer[key]||''} onChange={e=>update(key,purchaser,e.target.value)} style={input}/>{fieldError(key)}</div>)}
 <div style={{gridColumn:'1/-1'}}><label htmlFor="messageToSupplier" style={labelStyle}>Meddelande till leverantör</label><textarea id="messageToSupplier" value={orderer.messageToSupplier||''} onChange={e=>update('messageToSupplier',null,e.target.value)} {...fieldProps("messageToSupplier")} style={{...input,minHeight:110,resize:'vertical'}}/>{fieldError("messageToSupplier")}</div>
 </div></section>
 <section style={cardStyle} aria-label="Leveransadress"><h2 style={{fontSize:19,fontWeight:400,margin:'0 0 22px'}}>Leveransadress</h2><div style={fieldsStyle}>{[
 ['company','Verksamhet','organization'],['recipient','Mottagare','shipping name'],['organization','Organisation','off'],['address','Sjukhus / adress','shipping street-address'],['house','Hus','off'],['postalCode','Postnummer','shipping postal-code'],['city','Postort','shipping address-level2'],['country','Land','shipping country-name']
 ].map(([key,label,autoComplete])=><div key={key} style={['organization','address','country'].includes(key)?{gridColumn:'1/-1'}:undefined}><label htmlFor={'badge-delivery-'+key} style={labelStyle}>{label}</label><input {...fieldProps('badge-delivery-'+key)} required={key!=='house'} id={'badge-delivery-'+key} autoComplete={autoComplete} value={shownDelivery[key]??''} onChange={e=>setDelivery?.(previous=>({...previous,[key]:e.target.value}))} style={input}/>{fieldError('badge-delivery-'+key)}</div>)}</div></section>
 <style>{`@media(max-width:900px){.jsf-badge-checkout-details{grid-template-columns:minmax(0,1fr)!important}}@media(max-width:480px){.jsf-badge-checkout-details>section>div{grid-template-columns:minmax(0,1fr)!important}}`}</style>
 </div>;
}
