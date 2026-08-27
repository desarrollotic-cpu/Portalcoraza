/** Estilos compartidos de las pantallas del módulo documental. */
export const DOC_STYLES = `
  .toolbar { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:end; gap:1rem; margin-bottom:1rem; }
  .btn-primary { display:inline-flex; align-items:center; gap:.4rem; padding:.5rem 1rem; background:var(--primary-600,var(--primary)); color:var(--text-on-primary,#fff); border:none; border-radius:var(--radius-sm,8px); font-size:.9rem; font-weight:600; cursor:pointer; }
  .btn-ghost { padding:.35rem .7rem; background:transparent; border:1px solid var(--border); border-radius:8px; font-size:.8rem; cursor:pointer; color:var(--text-primary); }
  .btn-ghost:hover { background:var(--surface-2,#f8fafc); }
  form.card { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; padding:1.25rem; background:var(--surface-2,#f8fafc); border:1px solid var(--border); border-radius:12px; margin-bottom:1.25rem; }
  form.card .full { grid-column:1/-1; }
  form.card .actions { grid-column:1/-1; display:flex; gap:.5rem; }
  label { display:flex; flex-direction:column; gap:.25rem; font-size:.82rem; color:var(--text-secondary); }
  input, select, textarea { padding:.5rem .6rem; border:1px solid var(--border); border-radius:8px; font:inherit; background:var(--surface); color:var(--text-primary); }
  input:focus, select:focus, textarea:focus { outline:2px solid var(--border-focus); outline-offset:1px; border-color:var(--primary-600); }
  table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  th, td { padding:.55rem .7rem; border-bottom:1px solid var(--border); text-align:left; font-size:.85rem; }
  th { background:var(--primary-50,#f0f9ff); font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; color:var(--text-secondary); }
  .badge { display:inline-block; padding:.15rem .5rem; border-radius:999px; font-size:.7rem; font-weight:700; }
  .badge.ok { background:color-mix(in srgb, var(--success-500) 14%, var(--surface)); color:var(--success-600,#166534); }
  .badge.warn { background:#f8fafc; color:#57534e; border:1px solid #e2e8f0; }
  .badge.crit { background:color-mix(in srgb, var(--error-500) 12%, var(--surface)); color:var(--error-600,#991b1b); }
  .badge.info { background:var(--primary-50,#f0f9ff); color:var(--primary-700,#075985); }
  .error { color:var(--error-600,#dc2626); }
  .muted { color:var(--text-muted,#64748b); }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-bottom:1.5rem; }
  .kpi { padding:1rem 1.25rem; background:var(--surface-2,#f8fafc); border:1px solid var(--border); border-radius:12px; }
  .kpi .n { font-size:1.8rem; font-weight:800; color:var(--primary-600,var(--primary)); }
  .kpi .l { font-size:.8rem; color:var(--text-secondary); }
`;
