import {braLivOptions} from '../../data/braLivNameBadges';

export default function BraLivArticleFields({article,onChange}) {
  const update=(key,value)=>onChange({...article,braLivBadgeConfig:{...article.braLivBadgeConfig,[key]:value.split('\n')}});
  return <div className="wide door-text-settings">
    <b>Bra Liv – valbara titlar och vårdcentraler</b>
    <p>Skriv ett alternativ per rad. Kunden kan även skriva egen text. Listorna sparas för den här artikeln.</p>
    <label><span>Titlar</span><textarea rows={8} value={(article.braLivBadgeConfig?.titles??braLivOptions(article,'titles')).join('\n')} onChange={event=>update('titles',event.target.value)}/></label>
    <label><span>Vårdcentraler</span><textarea rows={10} value={(article.braLivBadgeConfig?.clinics??braLivOptions(article,'clinics')).join('\n')} onChange={event=>update('clinics',event.target.value)}/></label>
  </div>;
}
