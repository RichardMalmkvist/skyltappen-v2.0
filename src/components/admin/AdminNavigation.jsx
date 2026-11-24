import React, { useEffect, useId, useRef, useState } from "react";
import "../../styles/adminMinimal.css";
import "../../styles/adminWorkspaceMinimal.css";
import "../../styles/adminCalm.css";
import "../../styles/adminMobileNavigation.css";
import "../../styles/workspacePolish.css";
import "../../styles/searchFocus.css";
import '../../styles/navigationMaterial.css';
import WorkspaceIcon from './WorkspaceIcon';


const { ROLE_PAGES: ROLE_ITEMS } = require("../../data/permissions");
const ROLE_LABELS = { bestallare: "Beställare", personal: "Personal", admin: "Admin" };
const NAV_ITEMS = [
  { key: "dashboard", label: "Översikt", icon: "⌂", prop: "onOpenDashboard" },
  { key: "approvalOrders", label: "Ordrar att godkänna", icon: "✓", prop: "onOpenApprovalOrders" },
  { key: "orders", label: "Ordrar", icon: "▤", prop: "onOpenOrders" },
  { key: "statistics", label: "Statistik", prop: "onOpenStatistics" },
  { key: "badgeProduction", label: "Namnbrickor & yrkestitlar", icon: "▭", prop: "onOpenBadgeOrders" },
  { key: "planning", label: "Planering", icon: "▣", prop: "onOpenPlanning" },
  { key: "articles", label: "Artiklar", icon: "◇", prop: "onOpenArticles" },
  { key: "symbols", label: "Symboler", icon: "◉", prop: "onOpenSymbols" },
  { key: "articleGroups", label: "Artikelgrupper", icon: "≡", prop: "onOpenArticleGroups" },
  { key: "projects", label: "Projekt & Korrektur", icon: "▱", prop: "onOpenProjects" },
  { key: "users", label: "Användare", icon: "◎", prop: "onOpenUsers" },
  { key: "drawings", label: "Ritningar", icon: "▧", prop: "onOpenDrawings" },
];

const NAV_SECTIONS = [
 {label:'Arbetsyta',keys:['dashboard','approvalOrders','orders','statistics','badgeProduction','planning','projects','drawings']},
 {label:'Katalog',keys:['articles','symbols','articleGroups']},
 {label:'Administration',keys:['users']},
];
function NavigationIcon({name}){
 return name==='dashboard'?<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 18h11"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></svg>:<WorkspaceIcon name={name}/>;
}

export function AdminSidebar({active,role='admin',user,onLogout,onOpenProfile,...handlers}){
 const [menuOpen,setMenuOpen]=useState(false),menuId=useId(),sidebar=useRef(null),toggle=useRef(null);
 const allowed=ROLE_ITEMS[role]||[],items=NAV_ITEMS.filter(item=>allowed.includes(item.key));
 useEffect(()=>setMenuOpen(false),[active,role]);
 useEffect(()=>{const media=window.matchMedia?.('(max-width:720px)'),close=()=>setMenuOpen(false);media?.addEventListener?.('change',close);return()=>media?.removeEventListener?.('change',close);},[]);
 useEffect(()=>{if(!menuOpen)return;const outside=event=>{if(!sidebar.current?.contains(event.target))setMenuOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[menuOpen]);
 const name=user?`${user.firstName||''} ${user.lastName||''}`.trim():'JSF Flow';
 const initials=user?`${(user.firstName||'').slice(0,1)}${(user.lastName||'').slice(0,1)}`.toUpperCase():'JS';
 const navButton=item=><button key={item.key} type="button" data-nav-key={item.key} className={active===item.key?'active':''} aria-current={active===item.key?'page':undefined} onClick={handlers[item.prop]} disabled={!handlers[item.prop]}><span className="jsf-admin-nav-icon" aria-hidden="true"><NavigationIcon name={item.key}/></span><span className="jsf-nav-label">{item.label}</span>{active===item.key&&<span className="jsf-nav-current-marker" aria-hidden="true"><i/></span>}</button>;
 return <aside ref={sidebar} className="jsf-admin-sidebar jsf-navigation-pair" onKeyDown={event=>{if(event.key==='Escape'&&menuOpen){event.preventDefault();setMenuOpen(false);toggle.current?.focus();}}}>
  <div className="jsf-navigation-panel">
   <div className="jsf-admin-mobile-header"><div className="jsf-admin-brand"><img src="/jsf-logo.jpg" alt="Jönköpings Skyltfabrik"/></div><button ref={toggle} type="button" className="jsf-admin-menu-toggle" aria-expanded={menuOpen} aria-controls={menuId} aria-label={menuOpen?'Stäng meny':'Öppna meny'} onClick={()=>setMenuOpen(open=>!open)}><WorkspaceIcon name="articleGroups"/><span>Meny</span></button></div>
   <div id={menuId} className={`jsf-admin-mobile-navigation${menuOpen?' is-open':''}`} onClick={event=>{const button=event.target.closest('button');if(button&&!button.disabled)setMenuOpen(false);}}>
    <div className="jsf-admin-user"><button type="button" className="jsf-admin-profile-link" onClick={onOpenProfile} disabled={!onOpenProfile} title="Öppna Min sida"><span className="avatar">{initials}</span><span className="jsf-nav-account"><b>{name}<span aria-hidden="true">⌄</span></b><small>{user?.email||ROLE_LABELS[role]||role}</small></span></button></div>
    <nav className="jsf-admin-nav" aria-label="Administration">{NAV_SECTIONS.map(section=>{const visible=section.keys.map(key=>items.find(item=>item.key===key)).filter(Boolean);return visible.length?<section className="jsf-nav-section" key={section.label}><h2>{section.label}</h2>{visible.map(navButton)}</section>:null;})}</nav>
    <div className="jsf-admin-bottom-actions"><button type="button" className="jsf-admin-portal" onClick={handlers.onOpenPortal} disabled={!handlers.onOpenPortal}><span className="jsf-admin-nav-icon"><WorkspaceIcon name="portal"/></span><span>Till beställningsportalen</span></button>{role==='admin'&&<button type="button" className={`jsf-admin-settings${active==='settings'?' active':''}`} aria-current={active==='settings'?'page':undefined} onClick={handlers.onOpenSettings} disabled={!handlers.onOpenSettings}><span className="jsf-admin-nav-icon"><WorkspaceIcon name="settings"/></span><span>Inställningar</span></button>}{onLogout&&<button type="button" className="jsf-nav-logout" onClick={onLogout}><span aria-hidden="true">↪</span>Logga ut</button>}</div>
   </div>
  </div>
 </aside>;
}

export function AdminLayout({active,children,dark=false,...handlers}){
 return <div className={`jsf-admin-layout ${dark?'dark':'light'} jsf-minimal jsf-calm-workspace jsf-molded-navigation ${['planning','orders'].includes(active)?'':'jsf-workspace'}`}><AdminSidebar active={active} {...handlers}/><div className="jsf-admin-content">{children}</div></div>;
}
