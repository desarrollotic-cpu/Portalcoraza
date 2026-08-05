/** Estilos compartidos de las pantallas del módulo documental. */
export const DOC_STYLES = `
  .toolbar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:end; gap:1rem; margin-bottom:1rem; }
  .btn-primary { display:inline-flex; align-items:center; gap:.4rem; padding:.5rem 1rem; background:var(--primary); color:var(--text-on-primary,#fff); border:none; border-radius:var(--coraza-radius,8px); font-size:.9rem; font-weight:600; cursor:pointer; }
  .btn-ghost { padding:.35rem .7rem; background:transparent; border:1px solid var(--coraza-border,var(--border)); border-radius:8px; font-size:.8rem; cursor:pointer; color:var(--text-primary); }
  .btn-ghost:hover { background:var(--surface-2,#f4f4f5); }
  form.card { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; padding:1.25rem; background:var(--surface-2,#f8fafc); border:1px solid var(--border); border-radius:12px; margin-bottom:1.25rem; }
  form.card .full { grid-column:1/-1; }
  form.card .actions { grid-column:1/-1; display:flex; gap:.5rem; }
  label { display:flex; flex-direction:column; gap:.25rem; font-size:.82rem; color:var(--text-secondary); }
  input, select, textarea { padding:.5rem .6rem; border:1px solid var(--coraza-border,var(--border)); border-radius:8px; font:inherit; background:var(--surface); color:var(--text-primary); }
  table { width:100%; border-collapse:collapse; background:var(--coraza-surface,var(--surface)); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  th, td { padding:.55rem .7rem; border-bottom:1px solid var(--border); text-align:left; font-size:.85rem; }
  th { background:var(--primary-50,#eef2ff); font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; }
  .badge { display:inline-block; padding:.15rem .5rem; border-radius:999px; font-size:.7rem; font-weight:700; }
  .badge.ok { background:#dcfce7; color:#166534; }
  .badge.warn { background:#fef9c3; color:#854d0e; }
  .badge.crit { background:#fee2e2; color:#991b1b; }
  .badge.info { background:#dbeafe; color:#1e40af; }
  .error { color:var(--coraza-error,#dc2626); }
  .muted { color:var(--text-muted,#71717a); }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-bottom:1.5rem; }
  .kpi { padding:1rem 1.25rem; background:var(--surface-2,#f8fafc); border:1px solid var(--border); border-radius:12px; }
  .kpi .n { font-size:1.8rem; font-weight:800; color:var(--primary); }
  .kpi .l { font-size:.8rem; color:var(--text-secondary); }
`;
