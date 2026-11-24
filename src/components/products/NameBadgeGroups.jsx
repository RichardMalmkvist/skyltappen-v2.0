import { useEffect, useId, useMemo, useState } from "react";
import "../../styles/nameBadgeGroups.css";
import "../../styles/catalogGroupMotion.css";

const browsingState = new Map();
const GROUPS = [
  ["rjl", "Region Jönköpings län"],
  ["ftv", "Folktandvården"],
  ["braliv", "Bra Liv vårdcentralerna"],
  ["energy", "Energikontor Norra Småland"],
  ["tenhult", "Tenhults gymnasiet"],
  ["segerstad", "Stora Segerstads gymnasiet"],
  ["jlt", "JLT"],
  ["other", "Övriga namnbrickor"],
  ["accessories", "Tillbehör"],
];
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function productGroup(product) {
  const number = String(product.articleNumber || "").trim();
  const text = normalize([product.nameBadgeGroup, product.group, product.name, product.desc].join(" "));
  const preset = product.nameBadgePreset || "";
  if (preset.startsWith("braliv_")) return "braliv";
  if (number === "02030" || normalize(product.productType) === "tillbehor" || /magnetfaste|tillbehor/.test(text)) return "accessories";
  if (["0250", "0252"].includes(number) || /tenhult/.test(text)) return "tenhult";
  if (["0251", "0253"].includes(number) || /segerstad/.test(text)) return "segerstad";
  if (number === "0310" || preset.startsWith("jlt_") || /\bjlt\b|lanstrafik/.test(text)) return "jlt";
  if (["0208", "0209", "0210"].includes(number) || preset.startsWith("ftv_") || /folktand/.test(text)) return "ftv";
  if (/^021[1-9]$/.test(number) || /energikontor/.test(text)) return "energy";
  if (["0201", "0202", "0205", "0207"].includes(number) || preset.startsWith("rjl_") || /region jonkoping|\brjl\b/.test(text)) return "rjl";
  return "other";
}

export function groupNameBadges(products) {
  const groups = new Map(GROUPS.map(([id, title]) => [id, { id, title, products: [] }]));
  for (const product of products) groups.get(productGroup(product)).products.push(product);
  return [...groups.values()].filter(group => group.products.length);
}

function isDentalProfession(product) {
  return /folktand|yrk-ftv/.test(normalize([product.group, product.name, product.articleNumber].join(" ")));
}

export default function NameBadgeGroups({ products, renderProduct, autoExpand = false, variant = "namebadge" }) {
  const profession = variant === "profession";
  const label = profession ? "yrkestitlarna" : "namnbrickorna";
  const id = useId().replace(/:/g, "");
  const [openGroup, setOpenGroup] = useState(()=>autoExpand ? null : browsingState.get(variant)?.openId ?? null);
  const [query, setQuery] = useState(()=>browsingState.get(variant)?.query ?? "");
  useEffect(() => {
    browsingState.set(variant, {openId:openGroup, query});
  }, [openGroup, query, variant]);
  const groups = useMemo(() => profession ? [
    { id: "rjl", title: "Region Jönköpings län", products: products.filter(product => !isDentalProfession(product)) },
    { id: "ftv", title: "Folktandvården", products: products.filter(isDentalProfession) },
  ].filter(group => group.products.length) : groupNameBadges(products), [products, profession]);
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searching = words.length > 0 || autoExpand;
  const matches = groups.map(group => ({ ...group, products: group.products.filter(product => {
    const text = normalize([group.title, product.articleNumber, product.name, product.desc, product.format, product.fixedProfessionTitle, product.fixedProfessionTitleLine2, product.fixedColorName, product.fixedColor].join(" "));
    return words.every(word => text.includes(word));
  }) })).filter(group => group.products.length);

  function changeQuery(value) { setQuery(value); setOpenGroup(null); }
  const activeGroup=openGroup === "" ? "" : matches.some(group=>group.id===openGroup) ? openGroup : searching ? matches[0]?.id : null;
  return <div className={`jsf-namebadge-groups${profession ? " jsf-profession-groups" : ""}`}>
    <div className="jsf-namebadge-search">
      <label htmlFor={`${id}-search`}>Sök bland {label}</label>
      <div><input id={`${id}-search`} type="search" placeholder={profession ? "Titel, artikelnummer eller verksamhet" : "Artikelnummer eller verksamhet"} value={query} onChange={event => changeQuery(event.target.value)} />
        {query && <button type="button" onClick={() => changeQuery("")} aria-label={`Rensa sökning bland ${label}`}>×</button>}
      </div>
    </div>
    {query.trim() && <p className="jsf-namebadge-search-status" role="status">{matches.reduce((count, group) => count + group.products.length, 0)} träffar</p>}
    {matches.map(group => {
      const open = group.id === activeGroup;
      const panelId = `${id}-${group.id}`;
      return <section className="jsf-namebadge-group" key={group.id}>
        <h2><button type="button" aria-expanded={open} aria-controls={panelId} id={`${panelId}-heading`} onClick={() => {
          setOpenGroup(open ? "" : group.id);
        }}>
          <span>{group.title}</span><span className="jsf-namebadge-group-count">{group.products.length} {group.products.length === 1 ? "artikel" : "artiklar"}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
        </button></h2>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-heading`} hidden={!open}>
          {open && <div className="jsf-calm-products-grid jsf-namebadge-group-products">{group.products.map(renderProduct)}</div>}
        </div>
      </section>;
    })}
    {!matches.length && <p className="jsf-namebadge-empty">{profession ? "Inga yrkestitlar matchar din sökning." : "Inga namnbrickor matchar din sökning."}</p>}
  </div>;
}
