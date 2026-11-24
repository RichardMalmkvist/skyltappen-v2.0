const paths = {
  statistics: 'M4 3v18h17M8 16v-4M13 16V7M18 16v-7',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  dashboard: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  approvalOrders: 'M8 3H5v18h14V3h-3M9 2h6v4H9zM8 13l3 3 5-6',
  orders: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
  badgeProduction: 'M3 6h18v13H3zM7 6V3h10v3M7 10h3v4H7zM13 10h4M13 14h4',
  planning: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
  articles: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9',
  symbols: 'M8 4H4v4h4zM16 4h4v4h-4zM8 16H4v4h4zM18 15l3 5h-6l3-5Z',
  articleGroups: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1',
  projects: 'M3 6h7l2 2h9v12H3V6ZM3 6V4h7l2 2',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-3.87',
  drawings: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16',
  portal: 'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
};

export default function WorkspaceIcon({name}) {
  return <svg className="jsf-workspace-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] || paths.projects}/></svg>;
}
