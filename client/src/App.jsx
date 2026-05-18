import { useState, useCallback, useEffect } from "react";
import Login from "./Login.jsx";
import AdminPanel from "./AdminPanel.jsx";
import { getToken, getUser, clearToken, isAdmin, apiFetch } from "./auth.js";

const CURRENT_YEAR = 2026;

const VISA_TYPES = {
  H2A: {
    label:"H-2A", full:"Trabalhadores Agrícolas", color:"#22c55e", accent:"#16a34a", icon:"🌾",
    categories:[
      {id:"crops",    label:"Colheita de Culturas", query:"crop harvest farm workers H2A agricultural seasonal 2025 2026"},
      {id:"livestock",label:"Pecuária / Gado",       query:"livestock cattle dairy farm H2A agricultural workers 2025 2026"},
      {id:"tobacco",  label:"Tabaco / Tomate",       query:"tobacco tomato vegetable farm H2A seasonal workers 2025 2026"},
      {id:"orchard",  label:"Pomares / Frutas",      query:"orchard apple cherry fruit picking H2A farm workers 2025 2026"},
      {id:"nursery",  label:"Viveiros / Flores",     query:"nursery greenhouse flowers plants H2A seasonal 2025 2026"},
      {id:"aqua",     label:"Aquicultura",           query:"aquaculture fish farm H2A agricultural workers 2025 2026"},
      {id:"forestry", label:"Silvicultura",          query:"forestry reforestation tree planting H2A seasonal 2025 2026"},
      {id:"dairy",    label:"Laticínios",            query:"dairy milking farm H2A agricultural visa workers 2025 2026"},
    ],
    dolInfo:"O DOL exige ETA-9142A com alojamento e transporte gratuitos ao trabalhador.",
    certLabel:"Certificação ETA-9142A",
  },
  H2B: {
    label:"H-2B", full:"Temporários Não-Agrícolas", color:"#3b82f6", accent:"#1d4ed8", icon:"🏨",
    categories:[
      {id:"hospitality", label:"Hotelaria / Resorts",     query:"hotel resort housekeeping H2B seasonal 2025 2026"},
      {id:"landscaping", label:"Paisagismo / Jardinagem", query:"landscaping grounds maintenance H2B seasonal 2025 2026"},
      {id:"amusement",   label:"Parques & Lazer",         query:"amusement park theme park H2B seasonal 2025 2026"},
      {id:"seafood",     label:"Processamento Marinho",   query:"seafood processing crab shrimp H2B seasonal 2025 2026"},
      {id:"ski",         label:"Resorts de Ski",          query:"ski resort mountain H2B seasonal workers 2025 2026"},
      {id:"camp",        label:"Acampamentos",            query:"summer camp recreation H2B seasonal 2025 2026"},
      {id:"construction",label:"Construção Sazonal",      query:"seasonal construction roofing H2B temporary 2025 2026"},
      {id:"cleaning",    label:"Limpeza / Housekeeping",  query:"commercial cleaning janitorial H2B seasonal 2025 2026"},
    ],
    dolInfo:"Para H-2B, o empregador deve obter Certificação DOL (ETA-9142B) antes da petição ao USCIS.",
    certLabel:"Certificação ETA-9142B",
  },
};

const PROVIDERS = {
  anthropic:  {short:"Claude",     logo:"⚡", endpoint:"/api/anthropic",
    models:[{id:"claude-sonnet-4-20250514",label:"Claude Sonnet 4"},{id:"claude-haiku-4-5-20251001",label:"Claude Haiku 4.5"}]},
  openrouter: {short:"OpenRouter", logo:"🔀", endpoint:"/api/openrouter",
    models:[{id:"google/gemini-2.0-flash-001",label:"Gemini 2.0 Flash"},{id:"openai/gpt-4o-mini",label:"GPT-4o Mini"},{id:"openai/gpt-4o",label:"GPT-4o"},{id:"anthropic/claude-3.5-haiku",label:"Claude 3.5 Haiku"},{id:"meta-llama/llama-4-scout",label:"Llama 4 Scout"},{id:"deepseek/deepseek-r1",label:"DeepSeek R1"}]},
  openai:     {short:"OpenAI",     logo:"🤖", endpoint:"/api/openai",
    models:[{id:"gpt-4o-mini",label:"GPT-4o Mini"},{id:"gpt-4o",label:"GPT-4o"},{id:"gpt-4-turbo",label:"GPT-4 Turbo"}]},
};

const US_STATES=["All States","Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const DOL={
  VERIFIED: {bg:"#052e16",border:"#15803d",text:"#4ade80",dot:"#22c55e",label:"DOL Verificada"},
  PENDING:  {bg:"#1c1917",border:"#a16207",text:"#fbbf24",dot:"#f59e0b",label:"Pendente DOL"},
  NOT_FOUND:{bg:"#1c0a0a",border:"#991b1b",text:"#fca5a5",dot:"#ef4444",label:"Não Encontrada"},
};

// ─── PDF ─────────────────────────────────────────────────────────────────────
function generatePDF(job, visaType, meta) {
  const dc=DOL[job.dolStatus]||DOL.NOT_FOUND;
  const rc={LOW:"#16a34a",MEDIUM:"#a16207",HIGH:"#dc2626"}[job.risk]||"#a16207";
  const hc=job.contactName||job.contactEmail||job.contactPhone;
  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Ficha — ${job.company}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;padding:32px;max-width:800px;margin:0 auto;font-size:13px}
@media print{body{padding:16px}.pb{display:none!important}}
.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:20px}
.hdr h1{font-size:18px;font-weight:700}.hdr h1 span{color:#3b82f6}
.hdr p{font-size:10px;color:#64748b;margin-top:2px;font-family:'JetBrains Mono',monospace}
.meta{text-align:right;font-size:10px;color:#94a3b8;line-height:1.9}
.co{background:#0f172a;color:#fff;border-radius:8px;padding:18px 22px;margin-bottom:18px}
.co h2{font-size:20px;font-weight:800;margin-bottom:2px}.co .pos{font-size:12px;color:#94a3b8;margin-bottom:10px}
.badges{display:flex;gap:7px;flex-wrap:wrap}.badge{padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace}
.sec{margin-bottom:16px}.st{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:9px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.f{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:8px 11px}
.fl{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:2px}
.fv{font-size:13px;font-weight:600;color:#0f172a}
.cb{background:#eff6ff;border:1px solid #bfdbfe;border-radius:7px;padding:13px 16px}.cb .f{background:#fff}
.src{background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:8px 13px;word-break:break-all}
.src a{color:#1d4ed8;font-size:12px;text-decoration:none}
.dis{background:#fafafa;border:1px solid #e2e8f0;border-radius:5px;padding:9px 13px;margin-top:12px}
.dis p{font-size:10px;color:#64748b;line-height:1.7}
.ftr{border-top:1px solid #e2e8f0;padding-top:12px;margin-top:18px;display:flex;justify-content:space-between}
.ftr p{font-size:10px;color:#94a3b8}
.pb{position:fixed;bottom:18px;right:18px;background:#1d4ed8;color:#fff;border:none;padding:10px 16px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
</style></head><body>
<div class="hdr">
  <div><h1>🛂 H-2 Visa Scanner <span>Pro</span></h1><p>DOL CERTIFICATION VALIDATOR · ${CURRENT_YEAR}</p></div>
  <div class="meta"><div>Gerado: ${new Date().toLocaleString("pt-BR")}</div><div>Visto: <strong>${visaType}</strong></div><div>${meta.category} · ${meta.state}</div></div>
</div>
<div class="co">
  <h2>${job.company}</h2><div class="pos">${job.position}</div>
  <div class="badges">
    <span class="badge" style="background:${dc.bg};border:1px solid ${dc.border};color:${dc.text}">● ${dc.label}</span>
    <span class="badge" style="background:#1e293b;color:${rc};border:1px solid ${rc}55">RISCO ${job.risk||"N/A"}</span>
    ${job.housing&&job.housing!=="N/A"?`<span class="badge" style="background:#052e16;border:1px solid #16a34a;color:#4ade80">🏠 ${job.housing}</span>`:""}
  </div>
</div>
<div class="sec"><div class="st">📋 Dados da Vaga</div><div class="g3">
  <div class="f"><div class="fl">Localização</div><div class="fv">📍 ${job.location}</div></div>
  <div class="f"><div class="fl">Vagas</div><div class="fv">👥 ${job.openings}</div></div>
  <div class="f"><div class="fl">Salário</div><div class="fv" style="color:#16a34a">💰 ${job.wage}</div></div>
  <div class="f" style="grid-column:1/-1"><div class="fl">Período</div><div class="fv">📅 ${job.period}</div></div>
</div></div>
<div class="sec"><div class="st">🏛️ DOL</div>
  <div style="background:${dc.bg};border:1px solid ${dc.border};border-radius:7px;padding:12px 16px">
    <div style="color:${dc.text};font-weight:700;margin-bottom:8px">Status: ${dc.label}</div>
    <div class="g2">
      <div class="f"><div class="fl">${meta.certLabel}</div><div class="fv" style="font-family:'JetBrains Mono',monospace;font-size:11px">${job.dolCert||"—"}</div></div>
      <div class="f"><div class="fl">NAICS</div><div class="fv" style="font-family:'JetBrains Mono',monospace">${job.naicsCode||"—"}</div></div>
    </div>
  </div>
</div>
<div class="sec"><div class="st">📞 Contato / Sponsor</div><div class="cb"><div class="g2">
  ${job.contactName?`<div class="f"><div class="fl">👤 Responsável</div><div class="fv">${job.contactName}</div></div>`:""}
  ${job.contactPhone?`<div class="f"><div class="fl">📱 Telefone</div><div class="fv"><a href="tel:${job.contactPhone}" style="color:#1d4ed8">${job.contactPhone}</a></div></div>`:""}
  ${job.contactEmail?`<div class="f" style="grid-column:1/-1"><div class="fl">✉️ E-mail</div><div class="fv"><a href="mailto:${job.contactEmail}" style="color:#1d4ed8">${job.contactEmail}</a></div></div>`:""}
  ${job.contactAddress?`<div class="f" style="grid-column:1/-1"><div class="fl">🏢 Endereço</div><div class="fv">${job.contactAddress}</div></div>`:""}
  ${job.agentName&&job.agentName!=="N/A"?`<div class="f"><div class="fl">🤝 Agente</div><div class="fv">${job.agentName}</div></div>`:""}
  ${job.agentEmail&&job.agentEmail!=="N/A"?`<div class="f"><div class="fl">✉️ Email Agente</div><div class="fv"><a href="mailto:${job.agentEmail}" style="color:#1d4ed8">${job.agentEmail}</a></div></div>`:""}
  ${!hc?`<div class="f" style="grid-column:1/-1"><div class="fl">Contato</div><div class="fv">${job.contact||"Não disponível"}</div></div>`:""}
</div></div></div>
${job.flags?`<div class="sec"><div class="st">⚑ Compliance</div>
  <div style="background:${job.risk==="LOW"?"#f0fdf4":job.risk==="HIGH"?"#fef2f2":"#fffbeb"};border:1px solid ${job.risk==="LOW"?"#86efac":job.risk==="HIGH"?"#fca5a5":"#fcd34d"};border-radius:5px;padding:10px 13px;font-size:12px;line-height:1.6;color:#374151">${job.flags}</div></div>`:""}
${job.source?`<div class="sec"><div class="st">🔗 Fonte</div><div class="src"><a href="${job.source}" target="_blank">${job.source}</a></div></div>`:""}
<div class="dis"><p>⚠️ Relatório gerado por IA. Confirme em <strong>icert.dol.gov</strong> e <strong>seasonaljobs.dol.gov</strong>. Não constitui aconselhamento jurídico.</p></div>
<div class="ftr"><p>H-2 Visa Scanner Pro · ${CURRENT_YEAR}</p><p>icert.dol.gov · seasonaljobs.dol.gov</p></div>
<button class="pb" onclick="window.print()">🖨️ Salvar como PDF</button>
</body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,"_blank");
  if(!win){const a=document.createElement("a");a.href=url;a.download=`empregador-${job.company.replace(/\s+/g,"-").toLowerCase()}.html`;a.click();}
}

// ─── API — JWT via apiFetch, chaves no .env ──────────────────────────────────
async function callAPI(provider, model, prompt) {
  const ep=PROVIDERS[provider].endpoint;
  const body=provider==="anthropic"
    ?{model,max_tokens:2000,messages:[{role:"user",content:prompt}]}
    :{model,max_tokens:2000,messages:[{role:"user",content:prompt}],...(provider==="openai"?{response_format:{type:"json_object"}}:{})};
  const res=await apiFetch(ep,{method:"POST",body});
  if(!res.ok){
    const err=await res.json().catch(()=>({}));
    throw new Error(err.error?.message||err.error||`HTTP ${res.status} — verifique as chaves no .env`);
  }
  const data=await res.json();
  return provider==="anthropic"
    ?(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")
    :data.choices?.[0]?.message?.content||"";
}

// ─── PROMPT ──────────────────────────────────────────────────────────────────
function buildPrompt(visaType,category,state,extra){
  const vt=VISA_TYPES[visaType];
  return `You are an expert ${visaType} visa job researcher. Today is ${new Date().toISOString().slice(0,10)} (${CURRENT_YEAR}).
TASK: Find CURRENT active ${visaType} postings for 2025/2026 season in "${state}" USA.
CATEGORY: ${category.label} — query: "${category.query}"
⚠️ ALL work periods and cert dates MUST be 2025 or 2026. Skip anything from 2024 or older.
For each employer (6–9 results) research:
1. Full legal company name  2. Job title  3. City+state  4. Workers requested
5. Wage/pay  6. Work period (2025/2026 only)  7. Housing? (H-2A:yes/no/partial|H-2B:N/A)
8. DOL: VERIFIED/PENDING/NOT_FOUND — check icert.dol.gov, seasonaljobs.dol.gov
9. Cert number (${vt.certLabel})  10. NAICS code
11. Contacts: HR name, email, phone (+country code), address, agent name & email
12. Real source URL (2025/2026)  13. Compliance notes + risk: LOW/MEDIUM/HIGH
${extra?`\nEXTRA: ${extra}`:""}
Respond ONLY valid JSON, no markdown:
{"visa":"${visaType}","state":"${state}","category":"${category.label}","scannedAt":"${new Date().toISOString()}",
"jobs":[{"company":"","position":"","location":"","openings":"","wage":"","period":"Apr 2026 – Nov 2026",
"housing":"Yes|No|N/A","dolStatus":"VERIFIED|PENDING|NOT_FOUND","dolCert":"","naicsCode":"",
"contactName":"","contactEmail":"","contactPhone":"","contactAddress":"","agentName":"","agentEmail":"",
"contact":"","source":"","flags":"","risk":"LOW|MEDIUM|HIGH"}],
"logs":["🔍 Buscando ${visaType} 2025/2026 em ${state}...","✅ msg","📊 Concluído"],
"summary":{"verified":0,"pending":0,"notFound":0,
"bestPick":"Empresa — motivo em português",
"recommendation":"2-3 frases em português para trabalhador brasileiro"}}`;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Tag({status}){
  const c=DOL[status]||DOL.NOT_FOUND;
  return <span style={{display:"inline-flex",alignItems:"center",background:c.bg,border:`1px solid ${c.border}`,color:c.text,padding:"2px 9px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:.8,fontFamily:"'JetBrains Mono',monospace"}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:c.dot,marginRight:5,display:"inline-block"}}/>{c.label}
  </span>;
}
function Risk({risk}){
  const m={LOW:["#052e16","#15803d","#86efac"],MEDIUM:["#1c1917","#a16207","#fcd34d"],HIGH:["#1c0a0a","#991b1b","#fca5a5"]};
  const [bg,b,t]=m[risk]||m.MEDIUM;
  return <span style={{background:bg,border:`1px solid ${b}`,color:t,padding:"1px 7px",borderRadius:3,fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{risk}</span>;
}
function CF({icon,label,value,href,full}){
  return <div style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,padding:"7px 10px",...(full?{gridColumn:"1/-1"}:{})}}>
    <div style={{color:"#1e4080",fontSize:9,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{icon} {label}</div>
    {href?<a href={href} style={{color:"#60a5fa",fontSize:12,textDecoration:"none"}}>{value}</a>:<div style={{color:"#94a3b8",fontSize:12}}>{value}</div>}
  </div>;
}
function Sec({label,children}){
  return <div style={{marginBottom:20}}>
    <div style={{color:"#1e3a5f",fontSize:9,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,fontFamily:"'JetBrains Mono',monospace"}}>{label}</div>
    {children}
  </div>;
}

function JobCard({job,idx,vc,visaType,meta}){
  const [open,setOpen]=useState(false);
  const hc=job.contactName||job.contactEmail||job.contactPhone;
  return <div style={{background:"#0a0a0f",border:"1px solid #1a1a2e",borderLeft:`3px solid ${vc}`,borderRadius:6,marginBottom:10,animation:`slideIn 0.3s ease ${idx*0.05}s both`}}>
    <div style={{padding:"14px 18px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5}}>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#f1f5f9"}}>{job.company}</span>
            <Tag status={job.dolStatus}/><Risk risk={job.risk||"MEDIUM"}/>
          </div>
          <div style={{color:"#64748b",fontSize:12,lineHeight:1.8}}>
            <span style={{color:"#94a3b8"}}>💼 {job.position}</span>
            <span style={{color:"#334155",margin:"0 6px"}}>·</span>
            <span>📍 {job.location}</span>
            <span style={{color:"#334155",margin:"0 6px"}}>·</span>
            <span>👥 {job.openings}</span>
            <span style={{color:"#334155",margin:"0 6px"}}>·</span>
            <span style={{color:"#4ade80"}}>💰 {job.wage}</span>
          </div>
          <div style={{color:"#475569",fontSize:11,marginTop:3,display:"flex",gap:12,flexWrap:"wrap"}}>
            <span>📅 {job.period}</span>
            {job.housing&&job.housing!=="N/A"&&<span>🏠 <span style={{color:job.housing==="Yes"?"#4ade80":"#f87171"}}>{job.housing}</span></span>}
            {hc&&<span style={{color:"#3b82f6"}}>📞 Contato disponível</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();generatePDF(job,visaType,meta);}} style={{background:"#1e3a5f",border:"1px solid #3b82f6",color:"#60a5fa",padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>📄 PDF</button>
          <span style={{color:"#334155",fontSize:11,padding:"4px 8px",border:"1px solid #1e293b",borderRadius:4,textAlign:"center"}}>{open?"▲":"▼"}</span>
        </div>
      </div>
    </div>
    {open&&<div style={{padding:"0 18px 16px",borderTop:"1px solid #0f172a"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:12}}>
        {[["Certificação DOL",job.dolCert],["NAICS",job.naicsCode]].map(([k,v])=>v&&v!=="N/A"&&
          <div key={k} style={{background:"#0f172a",padding:"8px 12px",borderRadius:5}}>
            <div style={{color:"#334155",fontSize:9,textTransform:"uppercase",letterSpacing:1.2,marginBottom:3}}>{k}</div>
            <div style={{color:"#94a3b8",fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div>
          </div>
        )}
      </div>
      {(hc||job.agentName)&&<div style={{background:"#0d1f3c",border:"1px solid #1e3a5f",borderRadius:7,padding:"12px 14px",marginBottom:12}}>
        <div style={{color:"#3b82f6",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,marginBottom:10}}>📞 Contato / Sponsor</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {job.contactName&&<CF icon="👤" label="Responsável" value={job.contactName}/>}
          {job.contactPhone&&<CF icon="📱" label="Telefone" value={job.contactPhone} href={`tel:${job.contactPhone}`}/>}
          {job.contactEmail&&<CF icon="✉️" label="E-mail" value={job.contactEmail} href={`mailto:${job.contactEmail}`} full/>}
          {job.contactAddress&&<CF icon="🏢" label="Endereço" value={job.contactAddress} full/>}
          {job.agentName&&job.agentName!=="N/A"&&<CF icon="🤝" label="Agente" value={job.agentName}/>}
          {job.agentEmail&&job.agentEmail!=="N/A"&&<CF icon="✉️" label="Email Agente" value={job.agentEmail} href={`mailto:${job.agentEmail}`}/>}
        </div>
      </div>}
      {!hc&&job.contact&&job.contact!=="N/A"&&<div style={{background:"#0f172a",padding:"8px 12px",borderRadius:5,marginBottom:12}}>
        <div style={{color:"#334155",fontSize:9,textTransform:"uppercase",letterSpacing:1.2,marginBottom:3}}>Contato</div>
        <div style={{color:"#94a3b8",fontSize:12}}>{job.contact}</div>
      </div>}
      {job.flags&&<div style={{background:"#0d1117",border:"1px solid #1e293b",borderRadius:5,padding:"8px 12px",marginBottom:10}}>
        <span style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>⚑ </span>
        <span style={{color:"#94a3b8",fontSize:12}}>{job.flags}</span>
      </div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        {job.source&&<a href={job.source} target="_blank" rel="noreferrer" style={{color:"#3b82f6",fontSize:11,textDecoration:"none"}}>🔗 {job.source.length>65?job.source.slice(0,65)+"…":job.source}</a>}
        <button onClick={()=>generatePDF(job,visaType,meta)} style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700}}>📄 Baixar Ficha PDF</button>
      </div>
    </div>}
  </div>;
}

function Terminal({logs,loading}){
  const cm={"✅":"#4ade80","⚠️":"#fbbf24","❌":"#f87171","🔍":"#60a5fa","📊":"#a78bfa","🌐":"#67e8f9","🚀":"#fb923c"};
  const gc=l=>{for(const[e,c]of Object.entries(cm))if(l.includes(e))return c;return "#475569";};
  return <div style={{background:"#020408",border:"1px solid #0f172a",borderRadius:8,overflow:"hidden",fontFamily:"'JetBrains Mono',monospace"}}>
    <div style={{background:"#0a0a0f",padding:"8px 14px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid #0f172a"}}>
      {["#ef4444","#f59e0b","#22c55e"].map(c=><span key={c} style={{width:9,height:9,borderRadius:"50%",background:c,display:"inline-block"}}/>)}
      <span style={{color:"#1e293b",fontSize:10,marginLeft:6}}>terminal — varredura.log</span>
      {loading&&<span style={{marginLeft:"auto",animation:"pulse 1s infinite",color:"#22c55e",fontSize:10}}>● REC</span>}
    </div>
    <div style={{padding:"12px 16px",maxHeight:280,overflowY:"auto",minHeight:80}}>
      {logs.length===0?<div style={{color:"#1e293b",fontSize:11}}>$ aguardando varredura...</div>
        :logs.map((l,i)=><div key={i} style={{color:gc(l),fontSize:11,lineHeight:1.9}}>
          <span style={{color:"#1e3a5f"}}>{String(i+1).padStart(3,"0")} </span>{l}
        </div>)}
      {loading&&<div style={{color:"#22c55e",fontSize:11,animation:"blink 1s step-end infinite"}}>█</div>}
    </div>
  </div>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [authUser,setAuthUser]=useState(()=>getToken()?getUser():null);
  const [showAdmin,setShowAdmin]=useState(false);
  const [visaType,setVisaType]=useState("H2A");
  const [category,setCategory]=useState(VISA_TYPES.H2A.categories[0]);
  const [state,setState]=useState("Florida");
  const [provider,setProvider]=useState("anthropic");
  const [model,setModel]=useState(PROVIDERS.anthropic.models[0].id);
  const [extra,setExtra]=useState("");
  const [loading,setLoading]=useState(false);
  const [jobs,setJobs]=useState([]);
  const [logs,setLogs]=useState([]);
  const [summary,setSummary]=useState(null);
  const [error,setError]=useState(null);
  const [tab,setTab]=useState("results");
  const [history,setHistory]=useState([]);

  useEffect(()=>{ if(!getToken()) setAuthUser(null); },[]);
  if(!authUser) return <Login onLogin={u=>setAuthUser(u)}/>;

  const vt=VISA_TYPES[visaType], prov=PROVIDERS[provider];
  const changeVisa=v=>{setVisaType(v);setCategory(VISA_TYPES[v].categories[0]);setJobs([]);setLogs([]);setSummary(null);setError(null);};
  const changeProv=p=>{setProvider(p);setModel(PROVIDERS[p].models[0].id);};
  const addLog=useCallback(m=>setLogs(p=>[...p,m]),[]);

  const scan=async()=>{
    setLoading(true);setJobs([]);setLogs([]);setSummary(null);setError(null);
    addLog(`🚀 ${visaType} — ${category.label} | ${state} | ${CURRENT_YEAR}`);
    addLog(`🤖 ${prov.short} / ${model}`);
    addLog("🌐 Buscando vagas 2025/2026...");
    try{
      const raw=await callAPI(provider,model,buildPrompt(visaType,category,state,extra));
      addLog("📡 Processando resultados...");
      const s=raw.indexOf("{"),e=raw.lastIndexOf("}");
      if(s===-1) throw new Error("JSON não encontrado — verifique as chaves no .env");
      const parsed=JSON.parse(raw.slice(s,e+1));
      if(parsed.logs) parsed.logs.forEach(l=>addLog(l));
      setJobs(parsed.jobs||[]);setSummary(parsed.summary||null);
      setHistory(h=>[{id:Date.now(),visaType,category:category.label,state,provider:prov.short,model,jobs:parsed.jobs?.length||0,verified:parsed.summary?.verified||0,ts:new Date().toLocaleString("pt-BR")},...h.slice(0,9)]);
      addLog(`📊 ${parsed.jobs?.length||0} vagas — ${parsed.summary?.verified||0} verificadas`);
    }catch(err){setError(err.message);addLog("❌ "+err.message);}
    finally{setLoading(false);}
  };

  const exportCSV=()=>{
    const h=["Empresa","Cargo","Local","Vagas","Salário","Período","DOL","Cert","NAICS","Nome","Email","Tel","Endereço","Agente","Email Agente","Risco","Fonte"];
    const rows=jobs.map(j=>[j.company,j.position,j.location,j.openings,j.wage,j.period,j.dolStatus,j.dolCert,j.naicsCode,j.contactName,j.contactEmail,j.contactPhone,j.contactAddress,j.agentName,j.agentEmail,j.risk,j.source].map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(","));
    const b=new Blob([[h.join(","),...rows].join("\n")],{type:"text/csv;charset=utf-8;"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`h2-${visaType}-${Date.now()}.csv`;a.click();
  };
  const exportJSON=()=>{
    const b=new Blob([JSON.stringify({summary,jobs,logs},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`h2-${visaType}-${Date.now()}.json`;a.click();
  };
  const exportAllPDF=()=>{const m={category:category.label,state,certLabel:vt.certLabel};jobs.forEach((j,i)=>setTimeout(()=>generatePDF(j,visaType,m),i*400));};

  const verified=jobs.filter(j=>j.dolStatus==="VERIFIED").length;
  const pending=jobs.filter(j=>j.dolStatus==="PENDING").length;
  const notFound=jobs.filter(j=>j.dolStatus==="NOT_FOUND").length;
  const lowRisk=jobs.filter(j=>j.risk==="LOW").length;
  const meta={category:category.label,state,certLabel:vt.certLabel};

  const sel={width:"100%",background:"#0a0a0f",border:"1px solid #1e293b",color:"#94a3b8",padding:"8px 10px",borderRadius:6,fontSize:12,fontFamily:"inherit",appearance:"none",WebkitAppearance:"none",cursor:"pointer"};
  const btnSm={background:"#0f172a",border:"1px solid #1e293b",color:"#94a3b8",padding:"5px 10px",borderRadius:5,cursor:"pointer",fontSize:11,fontFamily:"'JetBrains Mono',monospace"};

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500;700&family=DM+Sans:wght@400;500&display=swap');
      html,body,#root{margin:0!important;padding:0!important;background:#020408;width:100%;height:100%;}
      *,*::before,*::after{box-sizing:border-box;}
      @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:#0a0a0f}
      ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
      select,input,textarea{outline:none;color-scheme:dark;}
      select:focus,input:focus,textarea:focus{border-color:#3b82f6!important}
      button:focus-visible{outline:2px solid #3b82f6;outline-offset:2px;}
    `}</style>

    <div style={{background:"#020408",color:"#e2e8f0",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>

      {/* TOPBAR */}
      <header style={{borderBottom:"1px solid #0f172a",padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#020408",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:`linear-gradient(135deg,${vt.accent},#7c3aed)`,flexShrink:0}}>🛂</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,letterSpacing:-.3,lineHeight:1}}>
              <span style={{color:vt.color}}>H-2 Visa</span><span style={{color:"#f1f5f9"}}> Scanner Pro</span>
            </div>
            <div style={{color:"#334155",fontSize:9,marginTop:2,fontFamily:"'JetBrains Mono',monospace",letterSpacing:.5}}>
              DOL VALIDATOR · MULTI-AI · TEMPORADA {CURRENT_YEAR}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {jobs.length>0&&<>
            <button onClick={exportCSV} style={btnSm}>⬇ CSV</button>
            <button onClick={exportJSON} style={btnSm}>⬇ JSON</button>
            <button onClick={exportAllPDF} style={{...btnSm,borderColor:"#3b82f6",color:"#60a5fa"}}>📄 Todos PDFs</button>
          </>}
          <div style={{width:1,height:18,background:"#1e293b",margin:"0 4px"}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#1e3a5f"}}>{new Date().toLocaleDateString("pt-BR")}</span>
          <div style={{width:1,height:18,background:"#1e293b",margin:"0 4px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#475569"}}>{authUser.username}</span>
            {isAdmin()&&<button onClick={()=>setShowAdmin(true)} style={{background:"#1e3a5f",border:"1px solid #3b82f6",color:"#60a5fa",padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>⚙️ Admin</button>}
            <button onClick={()=>{clearToken();setAuthUser(null);}} style={{background:"#1c0a0a",border:"1px solid #7f1d1d",color:"#f87171",padding:"4px 10px",borderRadius:5,cursor:"pointer",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>⏏ Sair</button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* SIDEBAR */}
        <aside style={{width:272,flexShrink:0,borderRight:"1px solid #0f172a",padding:"18px 16px",background:"#020408",overflowY:"auto"}}>

          <Sec label="TIPO DE VISTO">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.entries(VISA_TYPES).map(([k,v])=>
                <button key={k} onClick={()=>changeVisa(k)} style={{background:visaType===k?v.accent+"33":"#0a0a0f",border:`1px solid ${visaType===k?v.color:"#1e293b"}`,color:visaType===k?v.color:"#475569",padding:"10px 8px",borderRadius:7,cursor:"pointer",textAlign:"center",transition:"all .2s",fontFamily:"inherit"}}>
                  <div style={{fontSize:20,marginBottom:3}}>{v.icon}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13}}>{v.label}</div>
                  <div style={{fontSize:9,lineHeight:1.3,marginTop:2,opacity:.7}}>{v.full.split(" ").slice(0,2).join(" ")}</div>
                </button>
              )}
            </div>
          </Sec>

          <Sec label="SETOR">
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {vt.categories.map(c=>
                <button key={c.id} onClick={()=>setCategory(c)} style={{background:category.id===c.id?vt.accent+"22":"transparent",border:`1px solid ${category.id===c.id?vt.color+"66":"transparent"}`,color:category.id===c.id?vt.color:"#475569",padding:"7px 10px",borderRadius:5,cursor:"pointer",textAlign:"left",fontSize:12,transition:"all .15s",fontFamily:"inherit"}}>{c.label}</button>
              )}
            </div>
          </Sec>

          <Sec label="ESTADO (EUA)">
            <select value={state} onChange={e=>setState(e.target.value)} style={sel}>
              {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </Sec>

          <Sec label="MOTOR DE IA">
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
              {Object.entries(PROVIDERS).map(([k,p])=>
                <button key={k} onClick={()=>changeProv(k)} style={{background:provider===k?"#1e3a5f33":"transparent",border:`1px solid ${provider===k?"#3b82f6":"#1e293b"}`,color:provider===k?"#60a5fa":"#475569",padding:"8px 10px",borderRadius:5,cursor:"pointer",textAlign:"left",fontSize:12,transition:"all .15s",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
                  <span style={{fontSize:14}}>{p.logo}</span><span style={{fontWeight:600}}>{p.short}</span>
                </button>
              )}
            </div>
            <select value={model} onChange={e=>setModel(e.target.value)} style={{...sel,marginBottom:10}}>
              {prov.models.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            {/* SEM campo de chave — fica no .env */}
            <div style={{background:"#0a0a0f",border:"1px solid #0f172a",borderRadius:5,padding:"8px 10px"}}>
              <div style={{color:"#1e3a5f",fontSize:9,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>🔑 Chave de API</div>
              <div style={{color:"#334155",fontSize:10,lineHeight:1.6}}>
                Configurada no arquivo <code style={{color:"#4ade80",background:"#052e16",padding:"1px 5px",borderRadius:3,fontFamily:"'JetBrains Mono',monospace"}}>.env</code> do servidor
              </div>
            </div>
          </Sec>

          <Sec label="INSTRUÇÕES ADICIONAIS">
            <textarea value={extra} onChange={e=>setExtra(e.target.value)}
              placeholder="Ex: Prefiro empresas com brasileiros, mínimo $16/hr, moradia incluída..."
              rows={3} style={{...sel,resize:"vertical",fontSize:11,lineHeight:1.6}}/>
          </Sec>

          <button onClick={scan} disabled={loading} style={{width:"100%",padding:"11px 0",background:loading?"#0f172a":`linear-gradient(135deg,${vt.accent},#7c3aed)`,border:loading?"1px solid #1e293b":"none",color:loading?"#334155":"#fff",borderRadius:8,cursor:loading?"not-allowed":"pointer",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.5,transition:"all .2s",marginBottom:8}}>
            {loading?`⏳ Varrendo ${CURRENT_YEAR}...`:`🔍 Varrer ${visaType} ${CURRENT_YEAR}`}
          </button>

          {error&&<div style={{background:"#1c0a0a",border:"1px solid #991b1b",color:"#fca5a5",padding:"8px 12px",borderRadius:6,fontSize:11,marginBottom:8,lineHeight:1.5}}>{error}</div>}

          <div style={{background:"#0a0a0f",border:"1px solid #0f172a",borderRadius:6,padding:"9px 12px"}}>
            <div style={{color:"#1e3a5f",fontSize:9,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>ℹ DOL INFO</div>
            <div style={{color:"#334155",fontSize:10,lineHeight:1.7}}>{vt.dolInfo}</div>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{flex:1,padding:"20px 24px",overflowY:"auto",background:"#020408"}}>
          {jobs.length>0&&
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {[["Total",jobs.length,vt.color,"📋"],["Verificadas",verified,"#4ade80","✅"],["Pendentes",pending,"#fbbf24","⏳"],["Não Encontradas",notFound,"#f87171","❌"],["Risco Baixo",lowRisk,"#a78bfa","🟢"]].map(([l,v,c,i])=>
                <div key={l} style={{background:"#0a0a0f",border:"1px solid #0f172a",borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{i}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:700,color:c}}>{v}</div>
                  <div style={{color:"#334155",fontSize:9,marginTop:3,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                </div>
              )}
            </div>
          }

          {(jobs.length>0||logs.length>0)&&
            <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid #0f172a"}}>
              {[["results","📋 Resultados"],["terminal","⚡ Terminal"],["history","🕘 Histórico"]].map(([t,l])=>
                <button key={t} onClick={()=>setTab(t)} style={{background:"transparent",border:"none",borderBottom:tab===t?`2px solid ${vt.color}`:"2px solid transparent",color:tab===t?vt.color:"#334155",padding:"8px 16px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,transition:"all .15s",marginBottom:-1}}>
                  {l}{t==="results"&&jobs.length>0?` (${jobs.length})`:""}
                </button>
              )}
            </div>
          }

          {tab==="results"&&<>
            {summary&&<div style={{background:"#052e16",border:"1px solid #166534",borderRadius:8,padding:"14px 18px",marginBottom:18}}>
              <div style={{color:"#4ade80",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>💡 Recomendação Estratégica</div>
              {summary.bestPick&&<div style={{color:"#86efac",fontSize:13,fontWeight:600,marginBottom:4}}>🏆 {summary.bestPick}</div>}
              <div style={{color:"#bbf7d0",fontSize:12,lineHeight:1.7}}>{summary.recommendation}</div>
            </div>}
            {jobs.length>0?jobs.map((j,i)=><JobCard key={i} job={j} idx={i} vc={vt.color} visaType={visaType} meta={meta}/>)
              :!loading&&<Empty vt={vt}/>}
          </>}

          {tab==="terminal"&&<Terminal logs={logs} loading={loading}/>}

          {tab==="history"&&<div>
            {history.length===0
              ?<div style={{color:"#1e293b",fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:20}}>Nenhuma busca ainda.</div>
              :history.map(h=><div key={h.id} style={{background:"#0a0a0f",border:"1px solid #0f172a",borderRadius:6,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:18}}>{VISA_TYPES[h.visaType]?.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>{h.visaType} · {h.category} · {h.state}</div>
                  <div style={{color:"#334155",fontSize:11,marginTop:2}}>{h.ts} · {h.provider} · {h.jobs} vagas · {h.verified} verificadas</div>
                </div>
              </div>)
            }
          </div>}

          {!loading&&jobs.length===0&&logs.length===0&&<Empty vt={vt}/>}
        </main>
      </div>
    </div>
    {showAdmin&&<AdminPanel onClose={()=>setShowAdmin(false)}/>}
  </>;
}

function Empty({vt}){
  return <div style={{textAlign:"center",padding:"60px 20px"}}>
    <div style={{fontSize:52,marginBottom:14}}>{vt.icon}</div>
    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#1e293b",marginBottom:6}}>Configure e inicie a varredura</div>
    <div style={{color:"#1e293b",fontSize:12}}>Selecione visto, setor, estado e motor de IA no painel esquerdo.</div>
  </div>;
}
