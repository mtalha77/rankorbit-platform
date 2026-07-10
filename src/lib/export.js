// ─── EXPORT UTILITIES (CSV / XLSX / PDF) ─────────────────────────────────────
// Used by every list in the app via <ListToolbar>. Columns: [{key,label,get?}].
export function rowsToMatrix(rows,cols){
  const header=cols.map(c=>c.label);
  const body=rows.map(r=>cols.map(c=>{
    const v=c.get?c.get(r):r[c.key];
    return v==null?"":String(v);
  }));
  return[header,...body];
}
export function downloadBlob(content,filename,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportCSV(rows,cols,name){
  const m=rowsToMatrix(rows,cols);
  const csv=m.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadBlob("\uFEFF"+csv,`${name}.csv`,"text/csv;charset=utf-8;");
}
// XLSX via SheetJS, lazy-loaded from CDN only when first used (keeps bundle lean).
let _xlsx=null;
export async function loadXLSX(){
  if(_xlsx)return _xlsx;
  if(window.XLSX){_xlsx=window.XLSX;return _xlsx;}
  await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  _xlsx=window.XLSX;return _xlsx;
}
export async function exportXLSX(rows,cols,name){
  try{
    const XLSX=await loadXLSX();
    const m=rowsToMatrix(rows,cols);
    const ws=XLSX.utils.aoa_to_sheet(m);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");
    XLSX.writeFile(wb,`${name}.xlsx`);
  }catch(e){exportCSV(rows,cols,name);} // graceful fallback
}
// PDF via a print window, reliable, no heavy dep, user picks "Save as PDF".
export function exportPDF(rows,cols,name,title){
  const m=rowsToMatrix(rows,cols);
  const head=m[0].map(h=>`<th>${h}</th>`).join("");
  const body=m.slice(1).map(r=>`<tr>${r.map(c=>`<td>${String(c).replace(/</g,"&lt;")}</td>`).join("")}</tr>`).join("");
  const html=`<html><head><title>${title||name}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#171732}
    h1{font-size:18px;margin:0 0 4px} .meta{color:#666;font-size:12px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#5B5BD6;color:#fff;text-align:left;padding:7px 9px}
    td{border-bottom:1px solid #eee;padding:6px 9px}
    tr:nth-child(even) td{background:#F6F7FB}
  </style></head><body>
    <h1>NAP Orbit, ${title||name}</h1>
    <div class="meta">${rows.length} rows · exported ${new Date().toLocaleString()}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;
  const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}
}
