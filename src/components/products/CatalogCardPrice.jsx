import {getCatalogCardPrice} from '../../data/catalogCardPrice';
import {getCatalogArticles} from '../../data/catalogStore';
export default function CatalogCardPrice({product}){
 const price=getCatalogCardPrice(product,getCatalogArticles());if(!price)return null;
 return <span className="jsf-catalog-card-price" style={{display:'block',width:'100%',order:2,marginTop:8,fontSize:14,fontWeight:500,lineHeight:1.4}}>{price.from?'Från ':''}{new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(price.amount)} kr/{price.unit}</span>;
}
