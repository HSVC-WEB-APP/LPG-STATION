/* ============================================================
 * LABX — labx.js  (v4.196 · v4.197 — 🔥 Heater gộp một màn hình · v4.198 — bảng tàu itinerary, tàu C3/C4, unloading theo tàu · v4.199 — 📋 dán dòng itinerary · v4.200 — 📂 PMS nhiều ngày, START/FINISH, Unloaded tự lưu, xoá tàu · v4.201 — bảng dữ liệu file để bấm chọn START/FINISH)
 * ------------------------------------------------------------
 * Ba mảnh cho trang ENGINEER, dùng chung tiện ích ENGX_U (engx.js — nạp TRƯỚC):
 *   📥 LABX  — nạp FILE TỔNG HỢP "V4_Import_Lab_Heater_<ngày>.xlsx" (Claude dựng từ
 *             file dew point + file lab QMS + file Heater 연료 사용량) lên Firebase:
 *             DEW_C3 → dew_point · DEW_C4 → dew_point_c4 · GC → gc · HEATER_DAY →
 *             heater_day · HEATER_VOY → heater_voy. Xem trước new / changed / same /
 *             flagged, bỏ tick để bỏ qua (app đoán, người chốt), CHỈ ghi new + changed.
 *   🧪 GCX   — tab kết quả GC C3 / C4: trend theo thành phần + giới hạn Aramco,
 *             thẻ mẫu mới nhất, nhận định, bảng thành phần theo vị trí, tháng, lịch sử.
 *   🔥 HTRH  — lịch sử heater (heater_day A/B theo ngày + heater_voy theo chuyến):
 *             biểu đồ ngày, kg/tấn hàng theo chuyến, bảng tháng, nhận định.
 *
 * ⭐ LUẬT FIREBASE SPARK:
 *   • KHÔNG đọc gì lúc boot. Mở sub-tab lần đầu mới tải, và chỉ tải CỬA SỔ:
 *     dew point 2 năm (engx.js) · GC 2 năm · heater 3 tháng — khoá node đều bắt
 *     đầu bằng ngày ISO nên dùng orderByKey().startAt() (không cần index).
 *     Nút ⤓ Load all mới tải hết.
 *   • Chỉ số "gốc" lên Firebase. Tổng butane / olefins / C5+ / kg/tấn / thống kê
 *     đều TÍNH Ở RAM (chỉ lưu khi lab đã ghi sẵn trong mẫu %vol).
 * ============================================================ */

/* ── dùng chung: tải theo cửa sổ + biểu đồ SVG ── */
const LX_U = (function(){
  'use strict';
  const { esc, fmt, isoToday, isoAdd, dayNo, isoOfDay, dmy } = ENGX_U;
  function winLoad(node, days, all){
    let q = firebase.database().ref(node);
    if(!all) q = q.orderByKey().startAt(isoAdd(isoToday(), -days));
    return q.once('value').then(s => s.val() || {});
  }
  /* bước chia "đẹp" 1-2-2.5-5 × 10ⁿ */
  function niceStep(span, n){ const raw = Math.max(span, 1e-9) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw); }
  function dec(step){ return step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step))); }
  /* series: [{ name, col, dash, pts:[{d:ISO, v, tip}] }] · lims: [{ v, t }] */
  function lineChart(series, o){
    o = o || {};
    const S = series.filter(s => s.pts.length);
    if(!S.length) return '<div class="dp-empty">No data in this range.</div>';
    const W = 1000, H = o.h || 300, Lm = 54, Rm = 160, T = 12, B = 30;
    const all = S.flatMap(s => s.pts);
    let d0 = Math.min(...all.map(p => dayNo(p.d))), d1 = Math.max(...all.map(p => dayNo(p.d)));
    if(d1 - d0 < 6){ d0 -= 3; d1 += 3; }
    /* thang đo "bền": điểm quá xa trung vị (> 8×MAD) không kéo giãn trục — vẽ ▲▼ ở mép, tooltip vẫn đúng số */
    const raw = all.map(p => p.v), med = LX_U_median(raw), mad = LX_U_median(raw.map(v => Math.abs(v - med)));
    const band = Math.max(8 * mad, 0.05 * Math.abs(med), 0.05);
    const inb = v => !o.robust || Math.abs(v - med) <= band;
    const vs = raw.filter(inb).concat((o.lims || []).filter(l => l.show).map(l => l.v));
    let lo = Math.min(...vs), hi = Math.max(...vs); if(hi - lo < 1e-9){ lo -= 1; hi += 1; }
    const st = niceStep(hi - lo, 5); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
    const X = d => Lm + (d - d0) / (d1 - d0) * (W - Lm - Rm), Y0 = v => T + (hi - v) / (hi - lo) * (H - T - B), Y = v => Y0(Math.max(lo, Math.min(hi, v)));
    const out = v => v < lo || v > hi;
    const lbl = (d1 - d0) > 200 ? (iso => iso.slice(5, 7)+'/'+iso.slice(2, 4)) : dmy;
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(o.aria || 'trend')+'">';
    for(let v = lo; v <= hi + st / 2; v += st) g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="dp-grid"/><text x="'+(Lm-5)+'" y="'+(Y(v)+3).toFixed(1)+'" class="dp-ax" text-anchor="end">'+fmt(v, dec(st))+'</text>';
    const xs = Math.max(1, Math.round((d1 - d0) / 8));
    for(let d = d0; d <= d1; d += xs) g += '<text x="'+X(d).toFixed(1)+'" y="'+(H-10)+'" class="dp-ax" text-anchor="middle">'+lbl(isoOfDay(d))+'</text>';
    (o.lims || []).forEach(l => { if(l.v < lo || l.v > hi) return;
      g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(l.v).toFixed(1)+'" y2="'+Y(l.v).toFixed(1)+'" class="dp-lim"/><text x="'+(Lm+6)+'" y="'+(Y(l.v)-4).toFixed(1)+'" class="dp-limt">'+esc(l.t)+'</text>'; });
    S.forEach(s => {
      const P = s.pts.slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
      if(P.length > 1) g += '<polyline fill="none" stroke="'+s.col+'" stroke-width="1.7"'+(s.dash ? ' stroke-dasharray="'+s.dash+'"' : '')+' points="'+P.map(p => X(dayNo(p.d)).toFixed(1)+','+Y(p.v).toFixed(1)).join(' ')+'"/>';
      const r0 = all.length > 400 ? 1.6 : 2.5;
      P.forEach(p => { const x = X(dayNo(p.d)), y = Y(p.v), tt = '<title>'+esc(p.tip || (dmy(p.d)+' · '+s.name+' '+p.v))+(out(p.v) ? ' — off the chart scale' : '')+'</title>';
        if(out(p.v)){ const up = p.v > hi; g += '<path d="M'+(x-5).toFixed(1)+','+(up ? y+7 : y-7).toFixed(1)+' L'+(x+5).toFixed(1)+','+(up ? y+7 : y-7).toFixed(1)+' L'+x.toFixed(1)+','+y.toFixed(1)+' Z" fill="#b91c1c">'+tt+'</path>'; return; }
        g += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(p.bad ? 4.2 : r0)+'" fill="'+(p.bad ? '#fff' : s.col)+'" stroke="'+(p.bad ? '#b91c1c' : s.col)+'" stroke-width="'+(p.bad ? 2 : 1)+'">'+tt+'</circle>'; });
    });
    const ends = S.map(s => { const P = s.pts.slice().sort((a, b) => a.d < b.d ? -1 : 1); const la = P[P.length-1]; return { s, v:la.v, y:Y(la.v) }; }).sort((a, b) => a.y - b.y);
    for(let i = 1; i < ends.length; i++) if(ends[i].y - ends[i-1].y < 12) ends[i].y = ends[i-1].y + 12;
    ends.forEach(e => { g += '<text x="'+(W-Rm+4)+'" y="'+(e.y+3).toFixed(1)+'" class="dp-endlbl" fill="'+e.s.col+'">'+esc(e.s.name.slice(0, 20))+' '+fmt(e.v, o.dp == null ? 2 : o.dp)+'</text>'; });
    return g + '</svg>';
  }
  /* cột chồng theo NGÀY LỊCH: rows [{d, parts:[v…], tip}] · keys [{name, col}] */
  function barChart(rows, keys, o){
    o = o || {};
    if(!rows.length) return '<div class="dp-empty">No data in this range.</div>';
    const W = 1000, H = o.h || 240, Lm = 58, Rm = 14, T = 14, B = 28;
    let d0 = Math.min(...rows.map(r => dayNo(r.d))), d1 = Math.max(...rows.map(r => dayNo(r.d)));
    if(o.from) d0 = Math.min(d0, dayNo(o.from)); if(o.to) d1 = Math.max(d1, dayNo(o.to));
    const n = d1 - d0 + 1, bw = (W - Lm - Rm) / n;
    let ymax = Math.max(1, ...rows.map(r => r.parts.reduce((a, b) => a + (b || 0), 0)));
    const st = niceStep(ymax, 4); ymax = Math.ceil(ymax / st) * st;
    const Y = v => T + (H - T - B) * (1 - v / ymax);
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(o.aria || 'bars')+'">';
    for(let v = 0; v <= ymax + 1e-9; v += st) g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="dp-grid"/><text x="'+(Lm-5)+'" y="'+(Y(v)+3).toFixed(1)+'" class="dp-ax" text-anchor="end">'+fmt(v, 0)+'</text>';
    const xs = Math.max(1, Math.round(n / 8));
    const lbl = n > 200 ? (iso => iso.slice(5, 7)+'/'+iso.slice(2, 4)) : dmy;
    for(let d = d0; d <= d1; d += xs) g += '<text x="'+(Lm + (d - d0 + 0.5) * bw).toFixed(1)+'" y="'+(H-9)+'" class="dp-ax" text-anchor="middle">'+lbl(isoOfDay(d))+'</text>';
    const w = Math.max(1.2, bw * 0.8);
    rows.forEach(r => { let acc = 0; const x = Lm + (dayNo(r.d) - d0 + 0.5) * bw - w / 2;
      r.parts.forEach((v, i) => { if(!v) return;
        g += '<rect x="'+x.toFixed(1)+'" y="'+Y(acc + v).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(Y(acc) - Y(acc + v)).toFixed(1)+'" fill="'+keys[i].col+'"><title>'+esc(r.tip || '')+'</title></rect>'; acc += v; }); });
    return g + '</svg>';
  }
  function LX_U_median(a){ if(!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
  const PAL = ['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#475569','#b45309'];
  function median(a){ if(!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
  return { winLoad, lineChart, barChart, PAL, median, niceStep };
})();


/* ═════════════════════════════════════════════════════════════
 * 📥 LABX — nạp file tổng hợp lên Firebase
 * ═════════════════════════════════════════════════════════════ */
const LABX = (function(){
  'use strict';
  const { esc, num, fmt, dmy, toastM, mayWrite, userName, anyIso, pad } = ENGX_U;
  const PK = ['ca','cb','da','db'];
  /* bộ dữ liệu ⇄ sheet ⇄ node */
  const DS = [
    { k:'dew_c3', sheet:'DEW_C3',     node:'dew_point',    label:'Dew point C3',  area:'eng_dew' },
    { k:'dew_c4', sheet:'DEW_C4',     node:'dew_point_c4', label:'Dew point C4',  area:'eng_dew' },
    { k:'gc',     sheet:'GC',         node:'gc',           label:'GC results',    area:'eng_lab' },
    { k:'hday',   sheet:'HEATER_DAY', node:'heater_day',   label:'Heater — daily',   area:'eng_heat' },
    { k:'hvoy',   sheet:'HEATER_VOY', node:'heater_voy',   label:'Heater — voyages', area:'eng_heat' }
  ];
  const BATCH = 400;                           /* số đường dẫn mỗi lần update() */
  let IM = null;                               /* { file, sets:{k:{…}}, busy, msg } */

  /* ── đọc ô ── */
  function cellIso(v){ if(v instanceof Date) return ENGX_U.isoOf(v); return anyIso(v); }
  function cellTime(v){
    if(v == null || v === '') return '';
    if(typeof v === 'number'){ const f = v % 1, m = Math.round(f * 1440); return pad(Math.floor(m / 60) % 24)+':'+pad(m % 60); }
    const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/); return m ? pad(m[1])+':'+m[2] : '';
  }
  const cnum = v => (v === '' || v == null) ? null : num(v);
  const cstr = v => v == null ? '' : String(v).trim();
  function dtStr(v){          /* "2025-01-17 21:00" · serial Excel · Date */
    if(v == null || v === '') return '';
    if(v instanceof Date) return ENGX_U.isoOf(v)+' '+pad(v.getHours())+':'+pad(v.getMinutes());
    if(typeof v === 'number'){ const iso = anyIso(v); return iso ? iso+' '+cellTime(v) : ''; }
    const m = String(v).trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
    return m ? m[1]+(m[2] ? ' '+pad(m[2])+':'+m[3] : '') : '';
  }
  /* bảng: tìm dòng tiêu đề (ô đầu = Date / Voyage), trả [{ col:giá trị }] */
  function table(aoa, first){
    let h = -1;
    for(let i = 0; i < Math.min(aoa.length, 12); i++) if(cstr((aoa[i] || [])[0]).toLowerCase() === first){ h = i; break; }
    if(h < 0) throw new Error('header row "'+first+'" not found');
    const H = aoa[h].map(cstr);
    return { H, rows:aoa.slice(h + 1).filter(r => r && r.some(c => c !== '' && c != null)).map(r => { const o = {}; H.forEach((k, j) => { if(k) o[k] = r[j]; }); return o; }) };
  }
  const col = (o, re) => { const k = Object.keys(o).find(x => re.test(x)); return k == null ? undefined : o[k]; };

  /* ── dựng bản ghi theo từng bộ dữ liệu: { key: { data, flag, lbl } } ── */
  function buildDew(aoa){
    const t = table(aoa, 'date'), by = {}, bad = [];
    t.rows.forEach((r, i) => {
      const d = cellIso(r.Date); if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ bad.push('row '+(i+1)+': date "'+cstr(r.Date)+'"'); return; }
      const v = { ca:cnum(col(r, /^coalescer a/i)), cb:cnum(col(r, /^coalescer b/i)), da:cnum(col(r, /^dryer a/i)), db:cnum(col(r, /^dryer b/i)) };
      if(!PK.some(k => v[k] != null)) return;
      (by[d] = by[d] || []).push({ time:cellTime(r.Time), v, flag:cstr(r.Flag), src:cstr(r.Source) });
    });
    const out = {};
    Object.keys(by).sort().forEach(d => {
      const L = by[d].sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);
      const m = L[0], data = { time:m.time };
      PK.forEach(k => { data[k] = m.v[k] == null ? '' : m.v[k]; });
      if(L.length > 1){ data.x = {};
        L.slice(1).forEach(e => { let h = (e.time || '00:00').replace(':',''); while(data.x[h]) h += 'b';
          const o = { time:e.time }; PK.forEach(k => { o[k] = e.v[k] == null ? '' : e.v[k]; }); data.x[h] = o; }); }
      const flag = L.map(e => e.flag).filter(Boolean).join(' · ');
      out[d] = { data, flag, lbl:dmy(d)+' '+m.time+' · '+PK.map(k => data[k] === '' ? '–' : data[k]).join(' / ')+(L.length > 1 ? ' (+'+(L.length-1)+' extra)' : '') };
    });
    return { recs:out, bad, fields:['time','ca','cb','da','db','x'] };
  }
  function buildGc(aoa){
    const t = table(aoa, 'date'), out = {}, bad = [];
    const comp = t.H.map(h => { const m = h.match(/\[([A-Za-z0-9]+)\]\s*$/); return m ? { h, code:m[1] } : null; }).filter(Boolean);
    t.rows.forEach((r, i) => {
      const d = cellIso(r.Date); if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ bad.push('row '+(i+1)+': date "'+cstr(r.Date)+'"'); return; }
      const c = {}; comp.forEach(x => { const v = cnum(r[x.h]); if(v != null) c[x.code] = v; });
      if(!Object.keys(c).length) return;
      const tm = cellTime(r.Time), p = cstr(r.Product).toUpperCase(), loc = cstr(r.Location).toUpperCase() || 'OT', tr = cstr(r.Train).toUpperCase();
      const u = /vol/i.test(cstr(r.Unit)) ? 'vol' : 'mol';
      let key = d+'_'+(tm ? tm.replace(':','') : '0000')+'_'+(p || 'X')+'-'+loc+tr+(u === 'vol' ? 'v' : '');
      let k2 = key, n = 2; while(out[k2]) k2 = key+'_'+(n++);
      out[k2] = { data:{ d, t:tm, p, loc, tr, u, lr:cstr(r['Sample name (lab)']), c }, flag:cstr(r.Flag),
                  lbl:dmy(d)+' '+tm+' · '+(p || '?')+' '+GCX.locName(loc)+(tr ? ' '+tr : '')+' %'+u+' · C3 '+(c.C3 == null ? '–' : c.C3)+' · nC4 '+(c.nC4 == null ? '–' : c.nC4) };
    });
    return { recs:out, bad, fields:['d','t','p','loc','tr','u','lr','c'] };
  }
  function buildHday(aoa){
    const t = table(aoa, 'date'), out = {}, bad = [];
    t.rows.forEach((r, i) => {
      const d = cellIso(r.Date); if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ bad.push('row '+(i+1)); return; }
      const a = cnum(col(r, /^heater a/i)) || 0, b = cnum(col(r, /^heater b/i)) || 0;
      if(a + b <= 0) return;
      out[d] = { data:{ a:Math.round(a), b:Math.round(b), voy:cstr(r.Voyage), ves:cstr(r.Vessel) }, flag:'', lbl:dmy(d)+' · A '+fmt(a,0)+' · B '+fmt(b,0)+' kg · '+cstr(r.Voyage)+' '+cstr(r.Vessel) };
    });
    return { recs:out, bad, fields:['a','b','voy','ves'] };
  }
  function buildHvoy(aoa){
    const t = table(aoa, 'voyage'), out = {}, bad = [];
    t.rows.forEach((r, i) => {
      const no = cstr(r.Voyage), st = dtStr(r.Start);
      if(!st){ bad.push('voyage '+(no || 'row '+(i+1))+': no start date'); return; }
      const key = st.slice(0, 10)+'_'+(no || 'x').replace(/[.#$\[\]\/\s]+/g, '-');
      const data = { no, ves:cstr(r.Vessel), org:cstr(r.Origin), amt:cnum(col(r, /^cargo/i)), term:cstr(col(r, /^term/i)), sel:cstr(r.Seller),
                     st, fi:dtStr(r.Finish), a:cnum(col(r, /^heater a/i)), b:cnum(col(r, /^heater b/i)), note:cstr(r.Note) };
      Object.keys(data).forEach(k => { if(data[k] == null) data[k] = ''; });
      out[key] = { data, flag:cstr(r.Flag), lbl:no+' '+data.ves+' · '+st+' · A '+fmt(+data.a||0,0)+' B '+fmt(+data.b||0,0)+' kg' };
    });
    return { recs:out, bad, fields:['no','ves','org','amt','term','sel','st','fi','a','b','note'] };
  }
  const BUILD = { dew_c3:buildDew, dew_c4:buildDew, gc:buildGc, hday:buildHday, hvoy:buildHvoy };

  /* ── so sánh với server ── */
  function norm(v){
    if(v == null || v === '') return '';
    if(typeof v === 'number') return +v.toFixed(6);
    if(typeof v === 'object'){ const o = {}; Object.keys(v).sort().forEach(k => { const x = norm(v[k]); if(x !== '') o[k] = x; }); return Object.keys(o).length ? o : ''; }
    const n = num(v); return (n != null && /^[\s\-+.\d]+$/.test(String(v))) ? +n.toFixed(6) : String(v);
  }
  const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  function diff(set, server){
    set.st = { new:[], chg:[], same:0 }; set.sel = {};
    Object.keys(set.recs).forEach(k => {
      const r = set.recs[k], old = server[k];
      if(!old){ set.st.new.push(k); set.sel[k] = true; return; }
      const f = set.fields.filter(x => !same(r.data[x], old[x]));
      if(!f.length){ set.st.same++; return; }
      r.old = old; r.chgF = f; set.st.chg.push(k); set.sel[k] = true;
    });
  }

  /* ── luồng: chọn file → đọc → tải server → xem trước → ghi ── */
  function open(){
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xlsm';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if(f) readFile(f); };
    inp.click();
  }
  async function readFile(f){
    if(typeof XLSX === 'undefined'){ toastM('Excel library not loaded', 'er'); return; }
    IM = { file:f.name, sets:{}, busy:true, msg:'Reading '+f.name+'…' }; draw();
    try{
      const wb = XLSX.read(await f.arrayBuffer(), { type:'array', raw:true });
      DS.forEach(d => {
        const ws = wb.Sheets[d.sheet]; if(!ws) return;
        const aoa = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
        try{ const b = BUILD[d.k](aoa); IM.sets[d.k] = Object.assign({ ds:d, on:true }, b); }
        catch(e){ IM.sets[d.k] = { ds:d, err:e.message, recs:{}, bad:[], on:false }; }
      });
      if(!Object.keys(IM.sets).length) throw new Error('none of the sheets DEW_C3 / DEW_C4 / GC / HEATER_DAY / HEATER_VOY found — is this the V4 import file?');
      /* so với server: đọc TOÀN node MỘT lần (import là việc hiếm) */
      for(const k of Object.keys(IM.sets)){
        const s = IM.sets[k]; if(s.err) continue;
        IM.msg = 'Comparing '+s.ds.label+' with the server…'; draw();
        const snap = await firebase.database().ref(s.ds.node).once('value');
        diff(s, snap.val() || {});
      }
      IM.busy = false; IM.msg = ''; draw();
    }catch(e){ console.error(e); IM.busy = false; IM.msg = '⚠ '+e.message; draw(); }
  }
  function tick(k, key, v){ const s = IM && IM.sets[k]; if(!s) return; s.sel[key] = !!v; draw(); }
  function tickAll(k, which, v){ const s = IM && IM.sets[k]; if(!s) return;
    const keys = which === 'chg' ? s.st.chg : s.st.new.concat(s.st.chg).filter(x => s.recs[x].flag);
    keys.forEach(x => { s.sel[x] = !!v; }); draw(); }
  function toggleSet(k, v){ const s = IM && IM.sets[k]; if(s){ s.on = !!v; draw(); } }
  function close(){ IM = null; draw(); }

  async function commit(){
    if(!IM || IM.busy) return;
    const now = Date.now(), by = userName()+' (import)';
    const jobs = [];
    for(const k of Object.keys(IM.sets)){
      const s = IM.sets[k]; if(s.err || !s.on || !s.st) continue;
      if(!mayWrite(s.ds.area)){ toastM('⛔ No write permission for '+s.ds.label, 'er'); continue; }
      const up = {}; let n = 0;
      s.st.new.forEach(key => { if(!s.sel[key]) return; up[s.ds.node+'/'+key] = Object.assign({}, s.recs[key].data, { by, _ts:now }); n++; });
      s.st.chg.forEach(key => { if(!s.sel[key]) return; const r = s.recs[key];
        r.chgF.forEach(f => { const v = r.data[f]; up[s.ds.node+'/'+key+'/'+f] = (v === undefined || v === '' && f === 'x') ? null : v; });
        up[s.ds.node+'/'+key+'/_ts'] = now; up[s.ds.node+'/'+key+'/by'] = by; n++; });
      if(n) jobs.push({ k, s, up, n });
    }
    if(!jobs.length){ toastM('Nothing selected to write', 'warn'); return; }
    const tot = jobs.reduce((a, j) => a + j.n, 0);
    if(!confirm('Write '+tot+' record(s) to Firebase?\n\n'+jobs.map(j => '• '+j.s.ds.label+': '+j.n).join('\n'))) return;
    IM.busy = true;
    try{
      for(const j of jobs){
        const ks = Object.keys(j.up);
        for(let i = 0; i < ks.length; i += BATCH){
          IM.msg = '💾 '+j.s.ds.label+' — '+Math.min(i + BATCH, ks.length)+' / '+ks.length+' paths…'; draw();
          const part = {}; ks.slice(i, i + BATCH).forEach(p => { part[p] = j.up[p]; });
          await firebase.database().ref().update(part);
        }
      }
      toastM('📥 Imported '+tot+' record(s)', 'ok');
      const ks = jobs.map(j => j.k);
      if(ks.includes('dew_c3')) try{ DEWPT.afterImport('c3'); }catch(_){}
      if(ks.includes('dew_c4')) try{ DEWPT.afterImport('c4'); }catch(_){}
      if(ks.includes('gc')) try{ GCX.afterImport(); }catch(_){}
      if(ks.includes('hday') || ks.includes('hvoy')) try{ HTRH.afterImport(); }catch(_){}
      IM = null; draw();
    }catch(e){ console.error(e); IM.busy = false; IM.msg = '⚠ Write failed: '+e.message+' — part of the data may be written; run the import again (it only writes what is still different).'; draw(); }
  }

  /* ── vẽ hộp thoại ── */
  function setHtml(s){
    const k = s.ds.k;
    if(s.err) return '<div class="dp-card"><div class="dp-h">'+esc(s.ds.label)+' <small>sheet '+s.ds.sheet+'</small></div><div class="dp-al"><li class="dp-bad">'+esc(s.err)+'</li></div></div>';
    if(!s.st) return '<div class="dp-card"><div class="dp-h">'+esc(s.ds.label)+'</div><div class="dp-hint">⏳ comparing…</div></div>';
    const nNew = s.st.new.filter(x => s.sel[x]).length, nChg = s.st.chg.filter(x => s.sel[x]).length;
    const flagged = s.st.new.concat(s.st.chg).filter(x => s.recs[x].flag);
    let h = '<div class="dp-card lx-set'+(s.on ? '' : ' lx-off')+'"><div class="dp-h"><label class="lx-chk"><input type="checkbox"'+(s.on ? ' checked' : '')+' onchange="LABX.toggleSet(\''+k+'\',this.checked)"> '+esc(s.ds.label)+'</label>'+
      '<small>sheet '+s.ds.sheet+' → '+s.ds.node+'/</small>'+
      '<span class="lx-cnt"><b class="lx-n">'+s.st.new.length+'</b> new · <b class="lx-c">'+s.st.chg.length+'</b> changed · '+s.st.same+' same · <b class="lx-f">'+flagged.length+'</b> flagged</span></div>';
    if(s.bad.length) h += '<div class="dp-hint dp-offt" title="'+esc(s.bad.slice(0, 12).join('\n'))+'">'+s.bad.length+' row(s) skipped (unreadable)</div>';
    const row = key => { const r = s.recs[key], isChg = !!r.old;
      return '<label class="lx-item'+(r.flag ? ' lx-flag' : '')+'"><input type="checkbox"'+(s.sel[key] ? ' checked' : '')+' onchange="LABX.tick(\''+k+'\',\''+esc(key)+'\',this.checked)"> '+
        '<span class="lx-tag '+(isChg ? 'c' : 'n')+'">'+(isChg ? 'changed' : 'new')+'</span> '+esc(r.lbl)+
        (isChg ? ' <small class="lx-was">server: '+esc(r.chgF.map(f => f+'='+short(r.old[f])).join(' · '))+'</small>' : '')+
        (r.flag ? '<div class="lx-why">⚑ '+esc(r.flag)+'</div>' : '')+'</label>'; };
    const lst = (keys, title, which) => keys.length ? '<details class="lx-det"'+(keys.length <= 40 ? ' open' : '')+'><summary>'+title+' ('+keys.length+') '+
      '<button class="lx-mini" onclick="event.preventDefault();LABX.tickAll(\''+k+'\',\''+which+'\',true)">tick all</button><button class="lx-mini" onclick="event.preventDefault();LABX.tickAll(\''+k+'\',\''+which+'\',false)">untick all</button></summary>'+
      '<div class="lx-list">'+keys.slice(0, 400).map(row).join('')+(keys.length > 400 ? '<div class="dp-hint">… '+(keys.length - 400)+' more (all follow the tick-all buttons)</div>' : '')+'</div></details>' : '';
    h += lst(flagged, '⚑ Flagged — check, untick to skip', 'flag');
    h += lst(s.st.chg.filter(x => !s.recs[x].flag), '✎ Changed vs server — ticked = overwrite with the file value', 'chg');
    h += '<div class="dp-hint">Will write: <b>'+nNew+'</b> new + <b>'+nChg+'</b> changed.</div></div>';
    return h;
  }
  function short(v){ if(v == null || v === '') return '–'; if(typeof v === 'object') return '{…}'; const s = String(v); return s.length > 18 ? s.slice(0, 18)+'…' : s; }
  function draw(){
    if(typeof document === 'undefined') return;
    let bg = document.getElementById('lxModal');
    if(!IM){ if(bg) bg.remove(); return; }
    if(!bg){ bg = document.createElement('div'); bg.id = 'lxModal'; bg.className = 'lx-modal-bg'; document.body.appendChild(bg); }
    const sets = Object.values(IM.sets);
    const ready = !IM.busy && sets.some(s => s.st && s.on);
    bg.innerHTML = '<div class="lx-modal"><div class="lx-mh">📥 Import lab / heater file <small>'+esc(IM.file)+'</small><button class="dp-x" onclick="LABX.close()" title="Close without writing">✕</button></div>'+
      '<div class="lx-mb">'+(IM.msg ? '<div class="dp-hint"><b>'+esc(IM.msg)+'</b></div>' : '')+
      '<div class="dp-hint">Only <b>new</b> and <b>changed</b> records are written. Values typed in the app (notes, entered by) are kept — only the fields the file carries are updated.</div>'+
      sets.map(setHtml).join('')+'</div>'+
      '<div class="lx-mf"><button class="eng-btn" onclick="LABX.close()">Cancel</button><button class="eng-btn green"'+(ready ? '' : ' disabled')+' onclick="LABX.commit()">✔ Import selected</button></div></div>';
  }
  return { open, readFile, tick, tickAll, toggleSet, close, commit, DS, _test:{ buildDew, buildGc, buildHday, buildHvoy, diff, norm, get IM(){ return IM; } } };
})();


/* ═════════════════════════════════════════════════════════════
 * 🧪 GCX — kết quả GC C3 / C4
 * ═════════════════════════════════════════════════════════════ */
const GCX = (function(){
  'use strict';
  const { esc, fmt, dmy, isoToday, isoAdd, dayNo, linreg, sd, toastM, mayWrite } = ENGX_U;
  const WIN_DAYS = 730;
  const COMP = [['H2','Hydrogen'],['N2','Nitrogen'],['O2','Oxygen'],['C1','Methane'],['C2','Ethane'],['C2e','Ethylene'],['C2H2','Acetylene'],
    ['C3','Propane'],['C3e','Propylene'],['PD','Propadiene'],['MA','Methyl acetylene'],['iC4','i-Butane'],['nC4','n-Butane'],['tC4','Total butane'],
    ['1C4e','1-Butene'],['iC4e','i-Butene'],['t2C4e','trans-2-Butene'],['c2C4e','cis-2-Butene'],['13BD','1,3-Butadiene'],['12BD','1,2-Butadiene'],
    ['VA','Vinyl acetylene'],['EA','Ethyl acetylene'],['neoC5','neo-Pentane'],['iC5','i-Pentane'],['nC5','n-Pentane'],['1C5','1-Pentane (as reported)'],
    ['1C5e','1-Pentene'],['t2C5e','trans-2-Pentene'],['c2C5e','cis-2-Pentene'],['2M2C4e','2-Methyl-2-butene'],['nC6','n-Hexane'],['C6p','C6+'],
    ['tOl','Total olefins'],['C5p','C5+'],['HCDP','Dew point (°C)']];
  const CN = {}; COMP.forEach(([k, n]) => { CN[k] = n; });
  const OLEF = ['C2e','C3e','1C4e','iC4e','t2C4e','c2C4e','1C5e','t2C5e','c2C5e','2M2C4e'];
  const C5P = ['neoC5','iC5','nC5','1C5','1C5e','t2C5e','c2C5e','2M2C4e','nC6','C6p'];
  const TOTALS = ['tC4','tOl','C5p','HCDP'];
  const LOC = { VL:'Vent line', VLG:'Vent line (gas)', DR:'Dryer outlet', CO:'Coalescer outlet', CI:'Coalescer inlet', TL:'Tank lorry', OT:'Other' };
  const LOC_ORDER = ['DR','CO','VL','VLG','CI','TL','OT'];
  /* giới hạn Aramco — áp cho mẫu LỎNG %vol (ASTM D2163). Mẫu %mol chỉ để THAM KHẢO */
  const SPEC = {
    C3:{ C3:{ min:95 }, C2:{ max:2 }, tC4:{ max:4 }, tOl:{ max:0.1 }, C5p:{ nil:true } },
    C4:{ tC4:{ min:97 }, C3:{ max:2 }, tOl:{ max:0.1 }, C5p:{ max:1 } }
  };
  const MAIN = { C3:['C3','C2','tC4','tOl','C5p'], C4:['tC4','C3','nC4','tOl','C5p'] };
  const S = { rows:{}, loaded:false, loading:false, all:false, from:'', prod:'C3', loc:'', comp:'', range:'730', hide:{} };
  const $ = id => (typeof document === 'undefined' ? null : document.getElementById(id));
  const locName = l => LOC[l] || l;

  function load(force, all){
    if(all) S.all = true;
    if(S.loading || (S.loaded && !force && !all)) return;
    S.loading = true; render();
    try{
      LX_U.winLoad('gc', WIN_DAYS, S.all).then(v => { S.rows = v; S.loaded = true; S.loading = false; S.from = S.all ? '' : isoAdd(isoToday(), -WIN_DAYS); render(); })
        .catch(e => { S.loading = false; S.loaded = true; toastM('⚠ GC load failed: '+e.message, 'er'); render(); });
    }catch(e){ S.loading = false; S.loaded = true; render(); }
  }
  /* tổng tính được thì tính ở RAM (d = các khoá "calc") */
  function derive(c){
    const o = Object.assign({}, c), d = {};
    const sum = ks => ks.reduce((a, k) => a + (o[k] || 0), 0), has = ks => ks.some(k => o[k] != null);
    if(o.tC4 == null && has(['iC4','nC4'])){ o.tC4 = sum(['iC4','nC4']); d.tC4 = 1; }
    if(o.tOl == null && has(OLEF)){ o.tOl = sum(OLEF); d.tOl = 1; }
    if(o.C5p == null && has(C5P)){ o.C5p = sum(C5P); d.C5p = 1; }
    return { c:o, calc:d };
  }
  function list(){
    return Object.keys(S.rows).map(k => { const r = S.rows[k] || {}; if(!r.d || !r.c) return null;
      const x = derive(r.c); return { key:k, d:r.d, t:r.t || '', p:r.p || '', loc:r.loc || 'OT', tr:r.tr || '', u:r.u || 'mol', lr:r.lr || '', c:x.c, calc:x.calc, by:r.by || '' }; })
      .filter(Boolean).sort((a, b) => (a.d + a.t) < (b.d + b.t) ? -1 : 1);
  }
  const ranged = L => S.range === 'all' ? L : L.filter(r => r.d >= isoAdd(isoToday(), -(+S.range)));
  const series = r => r.loc+'|'+r.u;                       /* một đường = vị trí + đơn vị */
  const sName = k => { const [l, u] = k.split('|'); return locName(l)+' %'+u; };
  function specOf(p, k){ return (SPEC[p] || {})[k]; }
  function status(p, k, v, u){
    const s = specOf(p, k); if(!s || v == null) return '';
    let st = '';
    if(s.min != null) st = v < s.min ? 'off' : v - s.min < 0.5 ? 'near' : 'ok';
    else if(s.max != null) st = v > s.max ? 'off' : v > 0.8 * s.max ? 'near' : 'ok';
    else if(s.nil) st = v > 0 ? 'near' : 'ok';
    return st;
  }
  const specTxt = s => !s ? '' : s.min != null ? 'min '+s.min : s.max != null ? 'max '+s.max : 'Nil';

  function locsOf(L){
    const m = {}; L.forEach(r => { const k = series(r); (m[k] = m[k] || { k, loc:r.loc, u:r.u, n:0, last:null }).n++; m[k].last = r; });
    return Object.values(m).sort((a, b) => LOC_ORDER.indexOf(a.loc) - LOC_ORDER.indexOf(b.loc) || (a.u < b.u ? 1 : -1));
  }
  function findings(Lp, locs){
    const out = [], add = (lvl, t) => out.push({ lvl, t });
    if(!Lp.length){ add('info', 'No '+S.prod+' GC sample loaded.'); return out; }
    locs.forEach(g => {
      const R = Lp.filter(r => series(r) === g.k), last = R[R.length-1], nm = sName(g.k)+' '+dmy(last.d);
      const ref = last.u !== 'vol';
      MAIN[S.prod].forEach(k => { const v = last.c[k], st = status(S.prod, k, v, last.u); if(!st || st === 'ok') return;
        const s = specOf(S.prod, k);
        if(st === 'off') add(ref ? 'warn' : 'bad', nm+' · '+CN[k]+' '+fmt(v, 3)+' % is outside the Aramco limit ('+specTxt(s)+')'+(ref ? ' — %mol gas sample, reference only' : ' — OFF-SPEC')+'.');
        else if(!ref) add('warn', nm+' · '+CN[k]+' '+fmt(v, 3)+' % is '+(s.nil ? 'detected (spec Nil)' : 'close to the limit ('+specTxt(s)+')')+'.');
      });
      const tot = Object.keys(last.c).filter(k => !TOTALS.includes(k)).reduce((a, k) => a + last.c[k], 0);
      if(tot > 0 && (tot < 98 || tot > 102)) add('warn', nm+' · components add up to '+fmt(tot, 2)+' % — check the sample / typing.');
      /* xu hướng thành phần chính trong 90 ngày trước mẫu cuối */
      const k0 = MAIN[S.prod][0], s0 = specOf(S.prod, k0);
      const W = R.filter(r => r.c[k0] != null && dayNo(r.d) >= dayNo(last.d) - 90);
      if(W.length >= 4){ const lr = linreg(W.map(r => [dayNo(r.d), r.c[k0]]));
        if(lr && s0 && s0.min != null && lr.b < -0.005 && last.c[k0] > s0.min){ const days = (last.c[k0] - s0.min) / -lr.b;
          if(days <= 120) add(ref ? 'info' : 'warn', sName(g.k)+' · '+CN[k0]+' falling '+fmt(lr.b * 30, 2)+' % / 30 days — at this rate it reaches '+s0.min+' % in ~'+Math.ceil(days)+' days.'); } }
      /* nhảy bất thường ở thành phần chính */
      const V = R.map(r => r.c[k0]).filter(v => v != null);
      if(V.length >= 6){ const st = []; for(let i = 1; i < V.length - 1; i++) st.push(V[i] - V[i-1]);
        const lim = Math.max(0.5, 3 * sd(st)), dv = V[V.length-1] - V[V.length-2];
        if(Math.abs(dv) >= lim) add('info', sName(g.k)+' · '+CN[k0]+' moved '+(dv > 0 ? '+' : '')+fmt(dv, 2)+' % versus the previous sample — unusual step.'); }
      /* nhịp lấy mẫu */
      if(R.length >= 4){ const gaps = []; for(let i = Math.max(1, R.length - 10); i < R.length; i++) gaps.push(dayNo(R[i].d) - dayNo(R[i-1].d));
        const med = LX_U.median(gaps) || 1, since = dayNo(isoToday()) - dayNo(last.d);
        if(since > Math.max(14, 2.5 * med) && dayNo(isoToday()) - dayNo(last.d) < 400) add('info', sName(g.k)+' · last sample '+since+' days ago (usual interval ≈ '+med+' d).'); }
    });
    if(locs.some(g => g.u === 'mol') && locs.some(g => g.u === 'vol')) add('info', '%mol (GC, mostly gas / vent samples) and %vol (liquid, ASTM D2163) are different bases — the Aramco limits apply to %vol.');
    if(!out.some(a => a.lvl === 'bad' || a.lvl === 'warn')) out.unshift({ lvl:'ok', t:'Latest '+S.prod+' samples: no off-spec on the %vol liquid results, no abnormal trend.' });
    return out;
  }
  function monthly(R, keys){
    const g = {};
    R.forEach(r => { const ym = r.d.slice(0, 7), m = g[ym] || (g[ym] = { ym, n:0, s:{} }); m.n++;
      keys.forEach(k => { const v = r.c[k]; if(v == null) return; const x = m.s[k] || (m.s[k] = { sum:0, n:0, min:v, max:v }); x.sum += v; x.n++; x.min = Math.min(x.min, v); x.max = Math.max(x.max, v); }); });
    return Object.values(g).sort((a, b) => a.ym < b.ym ? 1 : -1);
  }

  /* ── vẽ ── */
  function kpi(r, k){
    const v = r ? r.c[k] : null, s = specOf(S.prod, k), st = r ? status(S.prod, k, v, r.u) : '';
    const cls = st === 'off' ? (r.u === 'vol' ? 'dp-off' : 'dp-near') : st === 'near' ? 'dp-near' : '';
    return '<div class="dp-kpi '+cls+'"><div class="dp-kn" style="border-color:#0b2d5c">'+esc(CN[k])+(s ? ' <small>'+specTxt(s)+'</small>' : '')+'</div>'+
      '<div class="dp-kv">'+(v == null ? '–' : fmt(v, v >= 10 ? 2 : 3))+'<small> %'+(r ? r.u : '')+'</small></div>'+
      '<div class="dp-ks">'+(r ? dmy(r.d)+' '+esc(r.t)+(r.calc[k] ? ' · calc' : '') : '')+'</div></div>';
  }
  function render(){
    const w = $('gcWrap'); if(!w) return;
    const st = $('gcStats');
    const bar = '<div class="lx-bar"><span class="lx-seg">'+['C3','C4'].map(p => '<button class="'+(S.prod === p ? 'on' : '')+'" onclick="GCX.setProd(\''+p+'\')">'+(p === 'C3' ? 'Propane (C3)' : 'Butane (C4)')+'</button>').join('')+'</span>'+
      '<span class="lx-span">'+(S.loading ? '⏳ loading…' : S.loaded ? (S.all ? 'All history loaded' : 'Loaded from <b>'+dmy(S.from)+'</b> (last 2 years)') : '')+'</span>'+
      (S.loaded && !S.all && !S.loading ? '<button class="eng-btn" onclick="GCX.loadAll()" title="Download every GC sample (older than 2 years too)">⤓ Load all history</button>' : '')+'</div>';
    if(!S.loaded){ w.innerHTML = bar+'<div class="dp-empty">'+(S.loading ? '⏳ Loading GC results…' : '')+'</div>'; return; }
    const all = list(), Lp = all.filter(r => r.p === S.prod), L = ranged(Lp), locs = locsOf(L);
    if(st) st.innerHTML = '<b>'+all.length+'</b> samples'+(all.length ? ' · last <b>'+dmy(all[all.length-1].d)+'</b>' : '');
    if(!Lp.length){ w.innerHTML = bar+'<div class="dp-empty">No '+S.prod+' GC result loaded.<br><small>Use 📥 Import file with the V4 import workbook (sheet GC).</small></div>'; return; }
    if(!S.loc || !locs.some(g => g.k === S.loc)) S.loc = (locs.find(g => g.u === 'vol') || locs.find(g => g.loc === 'DR') || locs[0] || {}).k || '';
    const presentK = COMP.map(c => c[0]).filter(k => L.some(r => r.c[k] != null));
    if(!S.comp || !presentK.includes(S.comp)) S.comp = MAIN[S.prod][0];
    let h = bar;
    /* chọn vị trí */
    h += '<div class="dp-card"><div class="dp-h">📍 Sampling point <span class="lx-seg lx-wrap">'+locs.map(g => '<button class="'+(g.k === S.loc ? 'on' : '')+'" onclick="GCX.setLoc(\''+g.k+'\')">'+esc(sName(g.k))+' <small>'+g.n+'</small></button>').join('')+'</span></div>';
    const LS = L.filter(r => series(r) === S.loc), last = LS[LS.length-1];
    h += '<div class="dp-kpis lx-kpis">'+MAIN[S.prod].map(k => kpi(last, k)).join('')+'</div>'+
      (last && last.u !== 'vol' ? '<div class="dp-hint">%mol sample — Aramco limits (for %vol liquid) shown for reference only.</div>' : '')+'</div>';
    h += '<div class="dp-card"><div class="dp-h">🔎 Findings — '+S.prod+'</div><ul class="dp-al">'+findings(L, locs).map(a => '<li class="dp-'+a.lvl+'">'+esc(a.t)+'</li>').join('')+'</ul></div>';
    /* trend */
    const sp = specOf(S.prod, S.comp);
    const ser = locs.filter(g => !S.hide[g.k]).map((g, i) => ({ name:sName(g.k), col:LX_U.PAL[locs.indexOf(g) % LX_U.PAL.length], dash:g.u === 'mol' ? '5 3' : '',
      pts:L.filter(r => series(r) === g.k && r.c[S.comp] != null).map(r => { const v = r.c[S.comp], s2 = status(S.prod, S.comp, v, r.u);
        return { d:r.d, v, bad:s2 === 'off' && r.u === 'vol', tip:dmy(r.d)+' '+r.t+' · '+sName(g.k)+(r.tr ? ' '+r.tr : '')+' · '+CN[S.comp]+' '+v+(r.calc[S.comp] ? ' (calc)' : '') }; }) }));
    const lims = sp ? [{ v:sp.min != null ? sp.min : sp.max != null ? sp.max : 0, t:'Aramco '+specTxt(sp)+' (%vol)', show:true }] : [];
    h += '<div class="dp-card"><div class="dp-h">📈 Trend <select class="lx-sel" onchange="GCX.setComp(this.value)">'+presentK.map(k => '<option value="'+k+'"'+(k === S.comp ? ' selected' : '')+'>'+esc(CN[k])+(specOf(S.prod, k) ? ' ★' : '')+'</option>').join('')+'</select>'+
      '<span class="dp-rg">'+[['90','90 d'],['180','6 m'],['365','1 y'],['730','2 y'],['all','All']].map(([k, t]) => '<button class="'+(S.range === k ? 'on' : '')+'" onclick="GCX.range(\''+k+'\')">'+t+'</button>').join('')+'</span>'+
      '<span class="dp-lg">'+locs.map(g => '<label><input type="checkbox"'+(S.hide[g.k] ? '' : ' checked')+' onchange="GCX.toggle(\''+g.k+'\')"><i style="background:'+LX_U.PAL[locs.indexOf(g) % LX_U.PAL.length]+'"></i>'+esc(sName(g.k))+'</label>').join('')+'</span></div>'+
      LX_U.lineChart(ser, { lims:sp && (sp.min != null || sp.max != null) ? lims : [], dp:3, robust:true, aria:'GC trend' })+
      '<div class="dp-hint">Dashed line = %mol GC sample · solid = %vol liquid. ★ = component with an Aramco limit. Hollow red dot = %vol result outside the limit. ▲▼ = value far outside the usual range, drawn at the chart edge (hover for the number).</div></div>';
    /* bảng thành phần mới nhất theo vị trí + tháng */
    const lastBy = locs.map(g => ({ g, r:L.filter(r => series(r) === g.k).pop() }));
    const rowsK = presentK.filter(k => lastBy.some(x => x.r && x.r.c[k] != null));
    h += '<div class="dp-grid2"><div class="dp-card"><div class="dp-h">🧾 Latest composition by sampling point</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Component</th><th>Limit</th>'+
      lastBy.map(x => '<th>'+esc(sName(x.g.k))+'<br><small>'+dmy(x.r.d)+'</small></th>').join('')+'</tr></thead><tbody>'+
      rowsK.map(k => '<tr><td>'+esc(CN[k])+'</td><td class="td-c">'+specTxt(specOf(S.prod, k))+'</td>'+lastBy.map(x => { const v = x.r.c[k], s2 = status(S.prod, k, v, x.r.u);
        return '<td class="td-r'+(s2 === 'off' ? (x.r.u === 'vol' ? ' dp-off' : ' dp-near') : s2 === 'near' ? ' dp-near' : '')+'">'+(v == null ? '<span class="dp-na">–</span>' : fmt(v, v >= 10 ? 3 : 4)+(x.r.calc[k] ? '<sup title="computed">c</sup>' : ''))+'</td>'; }).join('')+'</tr>').join('')+
      '</tbody></table></div></div>';
    const M = monthly(LS, MAIN[S.prod]);
    h += '<div class="dp-card"><div class="dp-h">🗓 Monthly average — '+esc(sName(S.loc))+'</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Month</th><th>n</th>'+MAIN[S.prod].map(k => '<th>'+esc(CN[k])+'</th>').join('')+'</tr></thead><tbody>'+
      M.map(m => '<tr><td class="td-c">'+m.ym+'</td><td class="td-c">'+m.n+'</td>'+MAIN[S.prod].map(k => { const x = m.s[k]; if(!x) return '<td class="td-c dp-na">–</td>';
        const a = x.sum / x.n, s2 = status(S.prod, k, a, S.loc.split('|')[1]);
        return '<td class="td-r'+(s2 === 'off' && S.loc.endsWith('vol') ? ' dp-off' : s2 === 'near' || s2 === 'off' ? ' dp-near' : '')+'" title="min '+fmt(x.min,4)+' · max '+fmt(x.max,4)+'">'+fmt(a, a >= 10 ? 3 : 4)+'</td>'; }).join('')+'</tr>').join('')+
      '</tbody></table></div></div></div>';
    /* lịch sử */
    const hk = presentK.filter(k => LS.some(r => r.c[k] != null));
    h += '<div class="dp-card"><div class="dp-h">📋 History — '+esc(sName(S.loc))+' ('+LS.length+')</div><div class="dp-scroll lx-hist"><table class="eng-tbl dp-tbl"><thead><tr><th>Date</th><th>Time</th><th>Train</th><th>Sample</th>'+
      hk.map(k => '<th>'+esc(CN[k])+'</th>').join('')+'<th>By</th><th></th></tr></thead><tbody>'+
      LS.slice().reverse().map(r => '<tr><td class="td-c">'+dmy(r.d)+'</td><td class="td-c">'+esc(r.t)+'</td><td class="td-c">'+esc(r.tr)+'</td><td>'+esc(r.lr)+'</td>'+
        hk.map(k => { const v = r.c[k], s2 = status(S.prod, k, v, r.u); return '<td class="td-r'+(s2 === 'off' ? (r.u === 'vol' ? ' dp-off' : ' dp-near') : '')+'">'+(v == null ? '' : fmt(v, v >= 10 ? 3 : 4)+(r.calc[k] ? '<sup>c</sup>' : ''))+'</td>'; }).join('')+
        '<td class="dp-by">'+esc(r.by)+'</td><td class="td-c"><button class="dp-x" title="Delete this sample" onclick="GCX.del(\''+esc(r.key)+'\')">✕</button></td></tr>').join('')+
      '</tbody></table></div></div>';
    const keep = w.scrollTop; w.innerHTML = h; w.scrollTop = keep;
  }
  function del(key){
    if(!mayWrite('eng_lab')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    const r = S.rows[key]; if(!r) return;
    if(!confirm('Delete the GC sample '+dmy(r.d)+' '+(r.t || '')+' · '+(r.lr || locName(r.loc))+'?\nThis cannot be undone.')) return;
    firebase.database().ref('gc/'+key).remove().then(() => { delete S.rows[key]; toastM('🗑 GC sample deleted', 'ok'); render(); })
      .catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }
  function exportXlsx(){
    if(typeof XLSX === 'undefined'){ toastM('Excel library not loaded', 'er'); return; }
    const L = ranged(list().filter(r => r.p === S.prod)); if(!L.length){ toastM('No sample in this range', 'er'); return; }
    const K = COMP.map(c => c[0]).filter(k => L.some(r => r.c[k] != null));
    const aoa = [['GC results — '+S.prod+' (c = computed by the app)'], ['Date','Time','Location','Train','Unit','Sample'].concat(K.map(k => CN[k]+' ['+k+']'))];
    L.forEach(r => aoa.push([r.d, r.t, locName(r.loc), r.tr, '%'+r.u, r.lr].concat(K.map(k => r.c[k] == null ? '' : +r.c[k].toFixed(5)))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'GC '+S.prod);
    XLSX.writeFile(wb, 'GC_'+S.prod+'_'+L[0].d+'_to_'+L[L.length-1].d+'.xlsx');
  }
  function setProd(p){ S.prod = p; S.loc = ''; S.comp = ''; S.hide = {}; render(); }
  function setLoc(k){ S.loc = k; render(); }
  function setComp(k){ S.comp = k; render(); }
  function range(k){ S.range = k; if(k === 'all' && !S.all){ loadAll(); return; } render(); }
  function toggle(k){ S.hide[k] = !S.hide[k]; render(); }
  function loadAll(){ load(true, true); }
  function refresh(){ if(!S.loaded) load(); else render(); }
  function reload(){ load(true); }
  function afterImport(){ if(S.loaded) load(true); }
  return { refresh, reload, render, loadAll, setProd, setLoc, setComp, range, toggle, del, exportXlsx, afterImport, locName, COMP, SPEC,
           _test:{ derive, status, list, findings, locsOf, S } };
})();


/* ═════════════════════════════════════════════════════════════
 * 🔥 HTRH — HEATER: tàu đang unloading + từng ngày PMS + lịch sử
 * ─────────────────────────────────────────────────────────────
 * v4.197 — GỘP History và PMS run làm MỘT màn hình:
 *   1. 🚢 Unloading vessel — khai tàu (heater_voy/<ngày bắt đầu>_<số chuyến>): No · Vessel ·
 *      Origin · Cargo (t) · Term · Seller · Start · Finish. Chọn tàu đang mở bằng chip.
 *   2. 📅 Days — ➕ thêm ngày; mỗi ngày kỹ sư nạp file PMS (TagMonitoringReport, A + B, theo
 *      phút) ⇒ app tính kg A/B của NGÀY ĐÓ (00:00 → 24:00, cắt theo phần file có dữ liệu),
 *      kèm ô "Unloaded (t)" = lượng hàng đã bơm trong ngày (sau này đưa sang SAP WMS…).
 *      💾 Save ⇒ heater_day/<ngày> = { a, b, vk, voy, ves, unl, h } — h = số đọc bộ đếm
 *      MỖI GIỜ (+ 2 mốc đầu/cuối nếu file không tròn giờ): đủ để tính lại kg và dựng lại sheet
 *      giờ của file báo cáo; dữ liệu PHÚT chỉ nằm trong RAM rồi bỏ. Đồng thời ghi Cavern Daily
 *      (Heater C3, dùng cho SAP WMS report) — một lần bấm, một logic.
 *   3. ⬇ Report file — chọn file "Heater 연료 사용량": app dựng sheet `YY.NN항차_Data + dòng
 *      Sumary cho CẢ CHUYẾN từ dữ liệu giờ đã lưu; xuất lại hằng ngày thì GHI ĐÈ đúng sheet đó.
 *   4. 📊 History — như v4.196 (3 tháng khi mở, ⤓ Load all).
 *   Email P5 dùng chung HTR.S ⇒ chọn tàu / lưu ngày là P5 thấy ngay dữ liệu chuyến.
 * v4.198 — 🚢 BẢNG TÀU theo cột của email vessel itinerary (Ref · Supplier · Vessel · Commodity · Lay-time ·
 *   DEM · Delivery range · Contract Q'ty · Loadport · BL Q'ty C3/C4 · Customs · ETA load port · ETA Cai Mep) —
 *   thiếu thông tin thì để trống; bấm một dòng để chọn tàu ⇒ bảng ngày bên dưới (MỘT dòng / ngày).
 *   Tàu có thể chở C3, C4 hoặc cả hai: C4 chỉ khai lượng unloading từng ngày (không heater).
 *   Lượng unloading theo ngày lưu Ở TÀU: heater_voy/<vk>/d/<ngày> = { c3, c4 } (một ngày có thể hai tàu cùng bơm);
 *   heater_day/<ngày> chỉ còn số heater. HTRH.dayInfo(ngày) cộng sẵn cho SAP WMS sau này.
 * ═════════════════════════════════════════════════════════════ */
const HTRH = (function(){
  'use strict';
  const { esc, fmt, dmy, isoToday, isoAdd, isoOf, dayNo, sd, toastM, mayWrite, userName, num, download } = ENGX_U;
  const WIN_DAYS = 92;                        /* lịch sử: 3 tháng gần nhất */
  const S = { days:{}, voys:{}, loaded:false, loading:false, all:false, from:'', range:'win', view:'hist',
              cur:'', vf:null, vdirty:false, edit:false, work:{}, addDate:'', busy:'' };
  const $ = id => (typeof document === 'undefined' ? null : document.getElementById(id));
  const CA = '#2563eb', CB = '#dc2626';
  const pad2 = n => String(n).padStart(2, '0');
  const d0Of = iso => { const p = iso.split('-'); return new Date(+p[0], +p[1]-1, +p[2]).getTime(); };
  const hhmm = t => { const d = new Date(t); return pad2(d.getHours())+pad2(d.getMinutes()); };
  const keyOf = (st, no) => String(st || isoToday()).slice(0, 10)+'_'+(String(no || 'x').replace(/[.#$\[\]\/\s]+/g, '-'));

  /* ── tải ── */
  function load(force, all){
    if(all) S.all = true;
    if(S.loading || (S.loaded && !force && !all)) return;
    S.loading = true; render();
    Promise.all([LX_U.winLoad('heater_day', WIN_DAYS, S.all), LX_U.winLoad('heater_voy', WIN_DAYS + 7, S.all)])
      .then(([d, v]) => { S.days = d; S.voys = v; S.loaded = true; S.loading = false; S.from = S.all ? '' : isoAdd(isoToday(), -WIN_DAYS);
        if(!S.cur || !S.voys[S.cur]){ const o = openVoys(); S.cur = o.length ? o[o.length-1].key : ''; S.vf = null; }
        return loadVoyDays(); })
      .then(() => { render(); syncMail(); })
      .catch(e => { S.loading = false; S.loaded = true; toastM('⚠ Heater load failed: '+e.message, 'er'); render(); });
  }
  /* các ngày của chuyến đang chọn có thể nằm ngoài cửa sổ 3 tháng ⇒ đọc riêng theo khoảng ngày */
  function loadVoyDays(){
    const v = S.voys[S.cur]; if(!v) return Promise.resolve();
    const a = String(v.st || S.cur).slice(0, 10), b = v.fi ? isoAdd(String(v.fi).slice(0, 10), 1) : '9999';
    if(!S.all && a >= S.from) return Promise.resolve();
    return firebase.database().ref('heater_day').orderByKey().startAt(a).endAt(b).once('value')
      .then(s => { Object.assign(S.days, s.val() || {}); });
  }
  const voyArr = () => Object.keys(S.voys).sort().map(k => Object.assign({ key:k }, S.voys[k]));
  const openVoys = () => voyArr().filter(v => !v.fi);
  function nextNo(){
    const yy = isoToday().slice(2, 4); let mx = 0;
    voyArr().forEach(v => { const m = String(v.no || '').match(/^(\d{2})\.(\d+)$/); if(m && m[1] === yy) mx = Math.max(mx, +m[2]); });
    return yy+'.'+pad2(mx + 1);
  }
  /* ngày thuộc chuyến: gắn vk, hoặc cùng số chuyến (dữ liệu import) */
  function voyDates(k){
    const v = S.voys[k] || {}, out = new Set();
    Object.keys(S.days).forEach(d => { const r = S.days[d] || {}; if(r.vk === k || (!r.vk && v.no && r.voy === v.no)) out.add(d); });
    Object.keys(v.d || {}).forEach(d => out.add(d));                     /* v4.198 — ngày chỉ có lượng unloading (butane) */
    Object.keys(S.work).forEach(d => { if(S.work[d].vk === k) out.add(d); });
    return [...out].sort();
  }

  /* ── tính một ngày từ dữ liệu PMS theo phút (RAM) ── */
  function inWin(P, t){ return P && P.length && t >= P[0][0] - 60e3 && t <= P[P.length-1][0] + 60e3; }
  function compute(date, w){
    const d0 = d0Of(date), d1 = d0 + 864e5;
    const A = w.A && w.A.pts, B = w.B && w.B.pts, Ps = [A, B].filter(P => P && P.length);
    const chk = [], add = (lvl, t) => chk.push({ lvl, t });
    if(w.pending.length) add('bad', w.pending.length+' file(s) not recognised as Heater A or B — assign them.');
    if(!A) add('warn', 'Heater A file (FQT32331) not loaded.');
    if(!B) add('warn', 'Heater B file (FQT32341) not loaded.');
    if(!Ps.length) return { a:null, b:null, h:null, chk };
    const s = Math.max(d0, Math.min(...Ps.map(P => P[0][0]))), e = Math.min(d1, Math.max(...Ps.map(P => P[P.length-1][0])));
    if(e <= s){ add('bad', 'The PMS file has no data on '+dmy(date)+'.'); return { a:null, b:null, h:null, chk }; }
    const T = [s]; for(let t = Math.ceil(s / 3600e3) * 3600e3; t < e; t += 3600e3) if(t > s) T.push(t); T.push(e);
    const h = {};
    T.forEach(t => { const k = t >= d1 ? '2400' : hhmm(t);
      const va = inWin(A, t) ? PMSHEAT.valueAt(A, t) : null, vb = inWin(B, t) ? PMSHEAT.valueAt(B, t) : null;
      if(va != null || vb != null) h[k] = [va, vb]; });
    const r = hCalc(h);
    [['A', A], ['B', B]].forEach(([n, P]) => { if(!P) return;
      if(P[0][0] > d0 + 5 * 60e3 && P[0][0] < d1) add('warn', 'Heater '+n+' data starts '+PMSHEAT.fmtTs(P[0][0]).slice(11,16)+' — consumption before that is not counted.');
      if(P[P.length-1][0] < d1 - 5 * 60e3) add('info', 'Heater '+n+' data ends '+PMSHEAT.fmtTs(P[P.length-1][0]).slice(11,16)+' — the day is incomplete; upload again later to complete it.');
      let prev = null, gap = 0, gapAt = 0;
      P.forEach(p => { if(p[0] < d0 || p[0] > d1) { prev = p; return; }
        if(prev){ if(p[1] - prev[1] < -1) add('bad', 'Heater '+n+' counter dropped at '+PMSHEAT.fmtTs(p[0]).slice(11,16)+' ('+fmt(prev[1],0)+' → '+fmt(p[1],0)+') — meter reset? Check the day total.');
          if(p[0] - prev[0] > gap){ gap = p[0] - prev[0]; gapAt = prev[0]; } }
        prev = p; });
      if(gap > 30 * 60e3) add('warn', 'Heater '+n+': no PMS data for '+Math.round(gap / 60e3)+' min after '+PMSHEAT.fmtTs(gapAt).slice(11,16)+'.');
    });
    return { a:r.a, b:r.b, h, chk };
  }
  /* kg của ngày từ số đọc giờ đã lưu: cuối − đầu (mỗi heater) */
  function hCalc(h){
    const ks = Object.keys(h || {}).sort(), o = { a:0, b:0 };
    [0, 1].forEach(i => { const v = ks.map(k => h[k] && h[k][i]).filter(x => x != null && x !== '');
      if(v.length > 1) o[i ? 'b' : 'a'] = Math.max(0, Math.round(v[v.length-1] - v[0])); });
    return o;
  }
  /* số đọc giờ của cả chuyến → chuỗi điểm cho báo cáo / email P5 */
  function voyPts(k){
    const A = [], B = [], days = [];
    voyDates(k).forEach(d => { const r = view(d); if(!r) return;
      days.push({ date:d, a:r.a || 0, b:r.b || 0, total:(r.a || 0) + (r.b || 0) });
      const d0 = d0Of(d); Object.keys(r.h || {}).sort().forEach(hk => { const t = d0 + (+hk.slice(0,2)) * 3600e3 + (+hk.slice(2)) * 60e3, x = r.h[hk];
        if(x && x[0] != null && x[0] !== '') A.push([t, +x[0]]); if(x && x[1] != null && x[1] !== '') B.push([t, +x[1]]); }); });
    const m = P => PMSHEAT.mergePts([], P);
    const a = m(A), b = m(B);
    let st = 0, fi = 0;
    [a, b].forEach(P => { for(let i = 1; i < P.length; i++) if(P[i][1] - P[i-1][1] >= 3){ if(!st || P[i-1][0] < st) st = P[i-1][0]; if(P[i][0] > fi) fi = P[i][0]; } });
    return { A:a, B:b, days, start:st, stop:fi };
  }
  /* số hiển thị của một ngày: bản đang làm (chưa lưu) thắng bản đã lưu */
  /* v4.198 — lượng unloading theo NGÀY nằm ở TÀU (heater_voy/<vk>/d/<ngày> = {c3, c4}) vì một ngày có thể
     hai tàu cùng bơm; heater_day/<ngày> chỉ còn số heater (propane). r.unl cũ (v4.197) đọc như C3. */
  function view(d, k){
    k = k || S.cur;
    const w = S.work[d], r0 = S.days[d], r = r0 && (r0.vk === k || !r0.vk) ? r0 : null, vd = ((S.voys[k] || {}).d || {})[d] || {};
    const pick = (wk, sv) => w && w[wk] !== undefined ? w[wk] : sv;
    const u3 = pick('u3', vd.c3 != null ? vd.c3 : r && r.unl), u4 = pick('u4', vd.c4);
    if(w && w.res && w.res.h) return { a:w.res.a, b:w.res.b, h:w.res.h, u3, u4, saved:false };
    if(r) return { a:+r.a || 0, b:+r.b || 0, h:r.h || null, u3, u4, saved:true };
    if(w || S.voys[k] && (S.voys[k].d || {})[d]) return { a:null, b:null, h:null, u3, u4, saved:!w };
    return null;
  }
  const hasC3 = v => !v || !v.com || /C3/.test(v.com);                 /* dữ liệu cũ = propane */
  const hasC4 = v => !!(v && /C4/.test(v.com || ''));
  const COMS = [['C3','Propane'],['C4','Butane'],['C3+C4','Propane + Butane']];
  /* v4.199 — số tấn kiểu email "23,072.116" / "46,000": dấu phẩy là phân cách NGHÌN (ENGX_U.num coi phẩy là thập phân) */
  function numT(v){
    if(v == null || v === '') return null;
    if(typeof v === 'number') return isFinite(v) ? v : null;
    const t = String(v).replace(/\u00a0/g, '').trim();
    if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) || /^-?\d+(,\d{3})*\.\d+$/.test(t)) return parseFloat(t.replace(/,/g, ''));
    return num(t);
  }

  /* ── tàu (cột theo bảng vessel itinerary; thiếu thông tin thì để trống) ── */
  const VF = ['no','ref','sel','ves','com','lay','dem','drng','cq','org','blc3','blc4','cus','etalp','etacm','st','fi','note'];
  function vform(){
    if(S.vf) return S.vf;
    const v = S.voys[S.cur], f = {};
    if(v) VF.forEach(k => { f[k] = v[k] == null ? '' : String(v[k]); });
    else VF.forEach(k => { f[k] = ''; });
    if(v){ f.st = f.st.slice(0, 10); f.fi = f.fi.slice(0, 10); if(!f.com) f.com = 'C3'; if(!f.blc3 && v.amt != null && v.amt !== '') f.blc3 = String(v.amt); }
    else { f.no = nextNo(); f.com = 'C3'; f.st = isoToday(); }
    S.vdirty = false; S.vf = f; return f;
  }
  /* v4.200 — xoá tàu ở bảng tổng hợp (kèm số heater theo ngày của tàu đó; Cavern Daily giữ nguyên) */
  function delVoy(k){
    const V = S.voys[k]; if(!V) return;
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    const hd = Object.keys(S.days).filter(d => S.days[d] && S.days[d].vk === k), nd = Object.keys(V.d || {}).length;
    if(!confirm('Delete vessel '+(V.ves || k)+(V.no ? ' (voyage '+V.no+')' : '')+'?\n\n• vessel details'+(nd ? '\n• unloaded quantity of '+nd+' day(s)' : '')+(hd.length ? '\n• heater data of '+hd.length+' day(s)' : '')+'\n\nCavern Daily entries are NOT touched. This cannot be undone.')) return;
    const up = { ['heater_voy/'+k]:null }; hd.forEach(d => { up['heater_day/'+d] = null; });
    firebase.database().ref().update(up).then(() => {
      delete S.voys[k]; hd.forEach(d => { delete S.days[d]; });
      if(S.cur === k){ S.cur = ''; S.vf = null; S.imp = null; S.edit = false; }
      toastM('🗑 '+(V.ves || k)+' deleted', 'ok'); render();
    }).catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }
  function pick(k){ if(k !== S.cur) S.imp = null; S.cur = k; S.vf = null; S.addDate = ''; S.edit = false; loadVoyDays().then(() => { render(); syncMail(); }); }
  function newVoy(){ S.cur = ''; S.vf = null; S.guess = null; S.pvNote = null; vform(); S.edit = true; render(); }
  function editVoy(){ S.edit = !S.edit; if(!S.edit){ S.vf = null; S.guess = null; S.pvNote = null; S.vdirty = false; } render(); }
  function vset(k, v){ vform()[k] = v; S.vdirty = true; if(S.guess) delete S.guess[k]; render(); }

  /* ── v4.199 — 📋 DÁN DÒNG TỪ EMAIL VESSEL ITINERARY ──────────────────────────
     Cột (theo email): Ref · Supplier · Vessel name · Commodity · Lay-time · DEM ($/day) ·
     Delivery range · Contract Q'ty · Loadport · BL Q'ty (MT) · Customs · ETA load port · ETA Cai Mep.
     App ĐỌC theo vị trí cột, kiểm từng ô, ô nào đoán / thiếu / lạ ⇒ tô vàng + ghi chú để người
     dùng sửa tay (app đoán, người chốt). Ref trùng tàu đã có ⇒ điền vào tàu đó (cập nhật). */
  const ITIN = ['ref','sel','ves','com','lay','dem','drng','cq','org','bl','cus','etalp','etacm'];
  const MON = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  /* "22h00 26-Sep" · "AM 20-Oct" · "25 Oct ~ 20 Nov" · "16-30 Nov" · "26/09" → ngày ISO đầu tiên nhắc tới */
  function firstDate(t){
    t = String(t || '');
    let d, mo, m;
    if((m = t.match(/\b(\d{1,2})\s*[-–~]\s*\d{1,2}\s*[-\s]?\s*([A-Za-z]{3})/)) && MON[m[2].toLowerCase()]){ d = +m[1]; mo = MON[m[2].toLowerCase()]; }       /* 26-30 Sep */
    else if((m = t.match(/\b(\d{1,2})[\s\-]+([A-Za-z]{3})/)) && MON[m[2].toLowerCase()]){ d = +m[1]; mo = MON[m[2].toLowerCase()]; }                          /* 22h00 26-Sep · 25 Oct ~ … */
    else if((m = t.match(/\b([A-Za-z]{3})[a-z]*[\s\-]+(\d{1,2})\b/)) && MON[m[1].toLowerCase()]){ mo = MON[m[1].toLowerCase()]; d = +m[2]; }                  /* Oct 25 */
    else if((m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/))){ d = +m[1]; mo = +m[2]; }                                                                             /* 26/09 */
    if(!d || !mo || d > 31 || mo > 12) return '';
    const now = new Date(); let y = now.getFullYear();
    if(mo < now.getMonth() + 1 - 6) y++;                 /* tháng đã qua xa ⇒ năm sau */
    return y+'-'+pad2(mo)+'-'+pad2(d);
  }
  function parseItin(txt){
    const rows = [];
    String(txt || '').split(/\r?\n/).forEach(line => {
      if(!line.trim()) return;
      let c = line.split('\t');
      if(c.length < 6) c = line.trim().split(/\s{2,}/);               /* dán mất tab ⇒ tách theo 2+ dấu cách */
      c = c.map(x => String(x).replace(/\u00a0/g, ' ').trim());
      while(c.length && c[0] === '') c.shift();
      if(/^ref$/i.test(c[0]) || /vessel name/i.test(line) || /^import$/i.test(c[0])) return;   /* dòng tiêu đề */
      if(c.filter(Boolean).length < 3) return;
      const f = {}, flag = {}, g = {};
      ITIN.forEach((k, i) => { f[k] = c[i] == null ? '' : c[i]; });
      const dash = v => /^[-–—]?$/.test(v);
      ITIN.forEach(k => { if(dash(f[k])) f[k] = ''; });
      if(c.length > ITIN.length) flag._extra = (c.length - ITIN.length)+' extra column(s) ignored: '+c.slice(ITIN.length).filter(Boolean).join(' · ');
      if(c.length < ITIN.length) flag._short = 'Only '+c.length+' of '+ITIN.length+' columns — check the fields below';
      if(f.ref && !/^[0-9]{2}[A-Z]?-[A-Z0-9-]+$/i.test(f.ref)) flag.ref = 'Ref "'+f.ref+'" does not look like 26B-PRP-XXX-0000-X';
      if(!f.ves) flag.ves = 'Vessel name empty'; else if(/^TBA\b/i.test(f.ves)) flag.ves = 'Vessel still TBA — update when nominated';
      const cm = f.com.toLowerCase(), p3 = /propane|\bc3\b/.test(cm), p4 = /butane|\bc4\b/.test(cm);
      f.com = p3 && p4 ? 'C3+C4' : p4 ? 'C4' : 'C3';
      if(!p3 && !p4) flag.com = 'Commodity "'+c[3]+'" not recognised — set to Propane';
      const lay = numT(f.lay); if(f.lay && lay == null) flag.lay = 'Lay-time "'+f.lay+'" is not a number'; f.lay = lay == null ? '' : String(lay);
      const bl = numT(f.bl);
      if(f.bl && bl == null) flag.bl = 'BL Q\'ty "'+f.bl+'" is not a number';
      f.blc3 = f.com !== 'C4' && bl != null ? String(bl) : ''; f.blc4 = f.com === 'C4' && bl != null ? String(bl) : '';
      if(f.com === 'C3+C4' && bl != null){ flag.blc3 = 'Propane + Butane: the whole BL was put in C3 — split it between C3 and C4'; flag.blc4 = flag.blc3; }
      if(bl == null && !f.bl) g.blc3 = g.blc4 = 1;
      delete f.bl;
      /* Start = ngày đầu của ETA Cai Mep (đoán) */
      f.st = firstDate(f.etacm) || firstDate(f.drng) || '';
      if(f.st) flag.st = 'Start guessed from '+(firstDate(f.etacm) ? 'ETA Cai Mep "'+f.etacm+'"' : 'delivery range "'+f.drng+'"')+' — set the real first unloading day';
      else flag.st = 'Start date not found — pick the first unloading day';
      ['sel','drng','cq','org','cus','etalp','etacm','dem'].forEach(k => { if(!f[k]) g[k] = 1; });
      if(f.cq && !/\d/.test(f.cq)) flag.cq = 'Contract Q\'ty "'+f.cq+'" has no number';
      if(f.cus && !/wait|clear|done|pend|ok|finish|complet|release/i.test(f.cus)) flag.cus = 'Customs "'+f.cus+'" — unusual status';
      rows.push({ f, flag, empty:g, line });
    });
    rows.forEach(r => { const m = r.f.ref && voyArr().find(v => v.ref && v.ref.toUpperCase() === r.f.ref.toUpperCase()); r.match = m ? m.key : ''; });
    return rows;
  }
  function pasteOpen(){ S.pv = { txt:'', rows:[] }; render(); setTimeout(() => { const t = $('htrPasteTxt'); if(t) t.focus(); }, 30); }
  function pasteClose(){ S.pv = null; render(); }
  function pasteIn(txt){
    const rows = parseItin(txt);
    S.pv = { txt, rows };
    if(rows.length === 1) pasteUse(0); else render();
  }
  /* điền một dòng vào form: Ref trùng ⇒ cập nhật tàu đó, không thì tàu mới */
  function pasteUse(i){
    const r = S.pv && S.pv.rows[i]; if(!r) return;
    if(r.match){ S.cur = r.match; S.vf = null; }
    else { S.cur = ''; S.vf = null; }
    const f = vform();
    Object.keys(r.f).forEach(k => { if(k === 'st' && r.match && f.st) return; if(r.f[k] !== '' || !r.match) f[k] = r.f[k]; });
    S.guess = {}; Object.keys(r.flag).forEach(k => { if(k[0] !== '_') S.guess[k] = r.flag[k]; });
    Object.keys(r.empty).forEach(k => { if(!S.guess[k] && !f[k]) S.guess[k] = 'empty in the itinerary'; });
    S.pvNote = [r.match ? 'Ref '+r.f.ref+' already exists — the form now UPDATES that vessel (empty cells keep the saved value).' : 'New vessel filled from the itinerary row.']
      .concat(Object.keys(r.flag).filter(k => k[0] === '_').map(k => r.flag[k]));
    S.edit = true; S.vdirty = true; S.pv = r && S.pv.rows.length > 1 ? S.pv : null;
    render();
  }
  /* dán thẳng cả dòng (có tab) vào BẤT KỲ ô nào của form tàu */
  function onPaste(e){
    const t = (e.clipboardData || window.clipboardData || { getData:() => '' }).getData('text');
    if(t && /\t/.test(t)){ e.preventDefault(); pasteIn(t); }
  }
  function saveVoy(close){
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return Promise.resolve(false); }
    const f = vform();
    if(!f.ves.trim()){ toastM('Type the vessel name (TBA is fine)', 'er'); return Promise.resolve(false); }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.st)){ toastM('Pick the start date (first unloading day)', 'er'); return Promise.resolve(false); }
    if(close && !f.fi){ const ds = voyDates(S.cur); f.fi = ds.length ? ds[ds.length-1] : isoToday(); }
    const k = S.cur || keyOf(f.st, f.no);
    if(!S.cur && S.voys[k] && !confirm('Voyage '+k+' already exists — overwrite its details?')) return Promise.resolve(false);
    const rec = { src:'PMS', by:userName(), _ts:Date.now() };
    VF.forEach(x => { const t = String(f[x] == null ? '' : f[x]).trim(); rec[x] = ['lay','blc3','blc4'].includes(x) ? (numT(t) == null ? '' : numT(t)) : t; });
    /* kg C3 / tấn hàng dùng amt = BL propane (heater chỉ phục vụ propane) */
    rec.amt = /C3/.test(rec.com) && rec.blc3 !== '' ? rec.blc3 : '';
    return firebase.database().ref('heater_voy/'+k).update(rec).then(() => {
      S.voys[k] = Object.assign({}, S.voys[k], rec); S.cur = k; S.vf = null; S.edit = false; S.guess = null; S.pvNote = null;
      toastM('🚢 '+rec.ves+(close ? ' — voyage finished' : ' saved')+' — enter the days below', 'ok'); render(); syncMail(); return true;
    }).catch(e => { toastM('⚠ Save failed: '+e.message, 'er'); return false; });
  }

  /* ── ngày ── */
  function suggestDay(){
    const ds = voyDates(S.cur), v = S.voys[S.cur] || {};
    let d = ds.length ? isoAdd(ds[ds.length-1], 1) : String(v.st || isoToday()).slice(0, 10);
    while(S.work[d] || (S.days[d] && ds.includes(d))) d = isoAdd(d, 1);
    return d;
  }
  function addDay(){
    if(!S.voys[S.cur]){ toastM('Save the vessel first', 'er'); return; }
    const d = /^\d{4}-\d{2}-\d{2}$/.test(S.addDate) ? S.addDate : suggestDay();
    const r = S.days[d];
    if(hasC3(S.voys[S.cur]) && r && r.vk && r.vk !== S.cur && (r.h || +r.a || +r.b) && !confirm(dmy(d)+' already has heater data for '+(r.ves || r.voy || r.vk)+'.\nHeater use is recorded once per day — load PMS files here only if they belong to this vessel. Continue?')) return;
    S.work[d] = S.work[d] || { vk:S.cur, A:null, B:null, pending:[], res:null, files:[] };
    S.work[d].vk = S.cur; S.addDate = ''; render();
  }
  function setAddDate(v){ S.addDate = v; }
  function W(d){ return S.work[d] || (S.work[d] = { vk:S.cur, A:null, B:null, pending:[], res:null, files:[] }); }
  async function files(d, inp){
    const fl = Array.from(inp.files || []); inp.value = ''; if(!fl.length) return;
    const w = W(d), d0 = d0Of(d), lo = d0 - 6 * 3600e3, hi = d0 + 30 * 3600e3, msg = [];
    S.busy = d; render();
    for(const f of fl){
      try{ const r = await PMSHEAT.parseFile(f);
        (r.all || [r]).forEach(sr => { const pts = sr.pts.filter(p => p[0] >= lo && p[0] <= hi);
          if(!pts.length){ msg.push('⚠ '+f.name+': no data on '+dmy(d)); return; }
          if(sr.heater){ w[sr.heater] = { pts:PMSHEAT.mergePts(w[sr.heater] && w[sr.heater].pts, pts) }; msg.push(f.name+' → Heater '+sr.heater); }
          else { w.pending.push({ file:f.name, pts }); msg.push('❓ '+f.name+': Heater A or B?'); } });
        if(w.files.indexOf(f.name) < 0) w.files.push(f.name);
      }catch(e){ msg.push('⚠ '+f.name+': '+e.message); }
    }
    S.busy = ''; w.res = compute(d, w); render();
    if(msg.length) toastM(msg.join(' · '), msg.some(m => /^⚠|^❓/.test(m)) ? 'warn' : 'ok');
  }
  function assign(d, i, k){ const w = W(d), p = w.pending[i]; if(!p) return;
    w[k] = { pts:PMSHEAT.mergePts(w[k] && w[k].pts, p.pts) }; w.pending.splice(i, 1); w.res = compute(d, w); render(); }
  function swap(d){ const w = W(d); const a = w.A; w.A = w.B; w.B = a; w.res = compute(d, w); render(); }
  /* v4.200 — Unloaded (t): Enter / rời ô là LƯU NGAY (heater_voy/<vk>/d/<ngày>/c3|c4) — không cần nút Save */
  function setUnl(d, prod, v){
    const k = S.cur, V = S.voys[k]; if(!V) return Promise.resolve(false);
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return Promise.resolve(false); }
    const f = prod === 'c4' ? 'c4' : 'c3', t = String(v == null ? '' : v).trim(), x = numT(t);
    if(t && x == null){ toastM('"'+t+'" is not a number', 'er'); render(); return Promise.resolve(false); }
    if(x != null && x < 0){ toastM('Unloaded quantity cannot be negative', 'er'); render(); return Promise.resolve(false); }
    const old = ((V.d || {})[d] || {})[f];
    if((old == null || old === '' ? null : +old) === x) return Promise.resolve(true);
    const up = {}, b = 'heater_voy/'+k+'/d/'+d+'/';
    up[b+f] = x == null ? null : x; up[b+'by'] = userName(); up[b+'_ts'] = Date.now();
    return firebase.database().ref().update(up).then(() => {
      V.d = V.d || {}; V.d[d] = Object.assign({}, V.d[d]); if(x == null) delete V.d[d][f]; else V.d[d][f] = x;
      V.d[d].by = userName();
      if(S.work[d]){ delete S.work[d].u3; delete S.work[d].u4; }
      toastM('💾 '+dmy(d)+' · unloaded '+f.toUpperCase()+' '+(x == null ? 'cleared' : fmt(x, 3)+' t'), 'ok'); render(); return true;
    }).catch(e => { toastM('⚠ Save failed: '+e.message, 'er'); return false; });
  }

  /* ── v4.200 — 📂 NẠP FILE PMS CHO CẢ TÀU (một file thường chứa nhiều ngày) ──────────────
     Lần nạp ĐẦU: người dùng CHỐT điểm START (app đề xuất đợt bộ đếm bắt đầu tăng) — lưu
     heater_voy/<vk>/rs. Lần sau: dữ liệu nối tiếp; tick "Heater finished" + giờ ⇒ lưu rf, sau rf
     không tính. Không tick: ngày có dữ liệu 00:00 → 24:00 là ngày ĐỦ; ngày cuối đang dở được lần
     nạp sau bù tiếp (số đọc giờ đã lưu + mới GỘP theo mốc giờ, mới thắng). ✔ Apply ⇒ tự tạo dòng
     ngày + ghi heater_day + Cavern Daily; sau đó người dùng chỉ gõ Unloaded (t) (tự lưu). */
  const tsStr = t => PMSHEAT.fmtTs(t).slice(0, 16);
  function parseDT(v){ const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]).getTime() : 0; }
  const dtLocal = t => t ? tsStr(t).replace(' ', 'T') : '';
  function impOpen(){ S.imp = { A:null, B:null, pending:[], files:[], start:0, stop:0, fin:false, busy:false }; render(); }
  function impClose(){ S.imp = null; render(); }
  async function impFiles(inp){
    const fl = Array.from(inp.files || []); inp.value = ''; if(!fl.length) return;
    const I = S.imp || (S.imp = { A:null, B:null, pending:[], files:[], start:0, stop:0, fin:false });
    I.busy = true; render(); const msg = [];
    for(const f of fl){
      try{ const r = await PMSHEAT.parseFile(f);
        (r.all || [r]).forEach(sr => { if(!sr.pts.length){ msg.push('⚠ '+f.name+': no data'); return; }
          if(sr.heater){ I[sr.heater] = { pts:PMSHEAT.mergePts(I[sr.heater] && I[sr.heater].pts, sr.pts) }; msg.push(f.name+' → Heater '+sr.heater); }
          else { I.pending.push({ file:f.name, pts:sr.pts }); msg.push('❓ '+f.name+': Heater A or B?'); } });
        I.files.push(f.name);
      }catch(e){ msg.push('⚠ '+f.name+': '+e.message); }
    }
    I.busy = false; impSuggest(); I.jump = 'S'; render();
    if(msg.length) toastM(msg.join(' · '), msg.some(m => /^⚠|^❓/.test(m)) ? 'warn' : 'ok');
  }
  function impAssign(i, k){ const I = S.imp, p = I && I.pending[i]; if(!p) return; I[k] = { pts:PMSHEAT.mergePts(I[k] && I[k].pts, p.pts) }; I.pending.splice(i, 1); impSuggest(); render(); }
  function impSwap(){ const I = S.imp; if(!I) return; const a = I.A; I.A = I.B; I.B = a; impSuggest(); render(); }
  function impRuns(){ const I = S.imp; return I && (I.A || I.B) ? PMSHEAT.runs(I.A && I.A.pts, I.B && I.B.pts) : []; }
  function impSuggest(){
    const I = S.imp, V = S.voys[S.cur] || {}; if(!I || !(I.A || I.B)) return;
    const R_ = impRuns(), st0 = d0Of(String(V.st || isoToday()).slice(0, 10)) - 864e5;
    if(V.rs && !I.startSet){ I.start = parseDT(V.rs); I.fixed = true; }
    else if(!I.startSet){ const r = R_.find(x => x.stop >= st0) || R_[0]; I.start = r ? r.start : 0; }
    if(!I.stopSet){ const r = R_.filter(x => x.stop >= (I.start || 0)).pop(); I.stop = r ? r.stop : 0; }
  }
  function impSet(k, v){ const I = S.imp; if(!I) return;
    if(k === 'start'){ I.start = parseDT(v); I.startSet = true; I.fixed = false; }
    else if(k === 'stop'){ I.stop = parseDT(v); I.stopSet = true; }
    else if(k === 'fin') I.fin = !!v;
    else if(k === 'run'){ const r = impRuns()[+v]; if(r){ I.start = r.start; I.startSet = true; I.fixed = false; if(!I.stopSet) I.stop = r.stop; } }
    else if(k === 'unfix'){ I.fixed = false; I.startSet = true; }
    /* v4.201 — chọn từ bảng dữ liệu vừa nạp: bấm dòng = START, nút ⏹ = FINISH */
    else if(k === 'pickStart'){ I.start = +v; I.startSet = true; I.fixed = false; if(I.stop && I.stop <= I.start){ I.stop = 0; I.stopSet = false; I.fin = false; } I.jump = 'S'; }
    else if(k === 'pickStop'){ if(I.start && +v <= I.start){ toastM('FINISH must be after START', 'er'); return; } I.stop = +v; I.stopSet = true; I.fin = true; I.jump = 'F'; }
    else if(k === 'mode') I.mode = v;
    render(); }
  /* số đọc theo giờ của một ngày trong cửa sổ [lo, hi] — gộp với số giờ đã lưu (mới thắng) */
  function dayWin(d, A, B, lo, hi, oldH){
    const d0 = d0Of(d), d1 = d0 + 864e5, Ps = [A, B].filter(P => P && P.length);
    if(!Ps.length) return null;
    const s = Math.max(d0, lo, Math.min(...Ps.map(P => P[0][0]))), e = Math.min(d1, hi, Math.max(...Ps.map(P => P[P.length-1][0])));
    if(!(e > s)) return null;
    const T = [s]; for(let t = Math.ceil(s / 3600e3) * 3600e3; t < e; t += 3600e3) if(t > s) T.push(t); T.push(e);
    const h = Object.assign({}, oldH || {});
    T.forEach(t => { const k = t >= d1 ? '2400' : hhmm(t);
      const va = inWin(A, t) ? PMSHEAT.valueAt(A, t) : null, vb = inWin(B, t) ? PMSHEAT.valueAt(B, t) : null;
      if(va != null || vb != null){ const o = h[k] || [null, null]; h[k] = [va != null ? va : o[0], vb != null ? vb : o[1]]; } });
    /* bỏ mốc đã lưu nằm trước START / sau FINISH */
    if(lo > d0){ const loK = hhmm(lo); Object.keys(h).forEach(k => { if(k < loK) delete h[k]; }); }
    if(hi < d1){ const hiK = hhmm(hi); Object.keys(h).forEach(k => { if(k > hiK) delete h[k]; }); }
    const r = hCalc(h), ks = Object.keys(h).sort(), last = ks[ks.length-1];
    const chk = [];
    [['A', A], ['B', B]].forEach(([n, P]) => { if(!P){ chk.push({ lvl:'warn', t:'Heater '+n+' file not loaded' }); return; }
      let prev = null; P.forEach(p => { if(p[0] < s || p[0] > e){ prev = p; return; } if(prev && p[1] - prev[1] < -1) chk.push({ lvl:'bad', t:'Heater '+n+' counter dropped at '+PMSHEAT.fmtTs(p[0]).slice(11,16) }); prev = p; }); });
    const complete = last === '2400' || (hi < d1 && e >= hi - 60e3);
    if(!complete) chk.push({ lvl:'info', t:'Data until '+last.slice(0,2)+':'+last.slice(2)+' — the next PMS import completes this day' });
    return { a:r.a, b:r.b, h, chk, complete, from:ks[0], to:last };
  }
  function impPreview(){
    const I = S.imp; if(!I || !(I.A || I.B) || !I.start) return [];
    const A = I.A && I.A.pts, B = I.B && I.B.pts, hi = I.fin && I.stop ? I.stop : Infinity;
    const all = [A, B].filter(Boolean), t1 = Math.min(hi, Math.max(...all.map(P => P[P.length-1][0])));
    const out = [];
    for(let d = isoOf(new Date(I.start)); d0Of(d) < t1; d = isoAdd(d, 1)){
      const old = S.days[d] && S.days[d].vk === S.cur ? S.days[d].h : null;
      const r = dayWin(d, A, B, I.start, hi, old);
      if(r) out.push(Object.assign({ date:d, had:!!old, other:S.days[d] && S.days[d].vk && S.days[d].vk !== S.cur ? (S.days[d].ves || S.days[d].vk) : '' }, r));
    }
    return out;
  }
  async function impApply(){
    const I = S.imp, V = S.voys[S.cur]; if(!I || !V) return false;
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return false; }
    if(I.pending.length){ toastM('Assign the unrecognised PMS file(s) to Heater A or B first', 'er'); return false; }
    if(!I.start){ toastM('Pick the START point of the heater run first', 'er'); return false; }
    if(I.fin && !(I.stop > I.start)){ toastM('FINISH must be after START', 'er'); return false; }
    const D = impPreview(); if(!D.length){ toastM('No data after START in these files', 'er'); return false; }
    const oth = D.filter(x => x.other);
    if(oth.length && !confirm(oth.map(x => dmy(x.date)+' has heater data of '+x.other).join('\n')+'\n\nReplace it with this vessel\'s figures?')) return false;
    const now = Date.now(), by = userName(), up = {};
    D.forEach(x => { up['heater_day/'+x.date] = { a:x.a, b:x.b, vk:S.cur, voy:V.no || '', ves:V.ves || '', h:x.h, src:'PMS', by, _ts:now }; });
    up['heater_voy/'+S.cur+'/rs'] = tsStr(I.start);
    up['heater_voy/'+S.cur+'/rf'] = I.fin ? tsStr(I.stop) : null;
    try{
      await firebase.database().ref().update(up);
      D.forEach(x => { S.days[x.date] = up['heater_day/'+x.date]; delete S.work[x.date]; });
      V.rs = tsStr(I.start); if(I.fin) V.rf = tsStr(I.stop); else delete V.rf;
      /* Cavern Daily (Heater C3) — nguồn SAP WMS: thay dòng PMS cũ, dòng gõ tay thì hỏi */
      if(typeof CAV !== 'undefined' && CAV.pushEntry){
        D.forEach(x => { const cur = (CAV.ROWS || []).filter(r => r && r.kind === 'heater' && r.prod === 'c3' && r.date === x.date);
          const foreign = cur.filter(r => !/^PMS/.test(String(r.note || '')));
          if(foreign.length && !confirm('Cavern Daily already has Heater C3 typed by hand on '+dmy(x.date)+'.\nOK = replace with the PMS figure · Cancel = keep it')) return;
          cur.forEach(r => { try{ CAV.removeSilent(r._rid); }catch(_){} });
          if(x.a + x.b > 0) CAV.pushEntry(x.date, 'heater', 'c3', 'D', x.a + x.b, 'PMS FQT32331+FQT32341 · '+(V.ves || '')+' · '+x.date); });
        try{ CAV.render(); }catch(_){}
      }
      toastM('📂 '+D.length+' day(s) saved · '+fmt(D.reduce((s, x) => s + x.a + x.b, 0), 0)+' kg — now type the Unloaded (t) of each day', 'ok');
      S.imp = null; render(); syncMail(); return true;
    }catch(e){ toastM('⚠ Save failed: '+e.message, 'er'); return false; }
  }
  /* v4.201 — BẢNG DỮ LIỆU vừa nạp từ file PMS (A + B ghép theo thời điểm) để người dùng BẤM CHỌN
     START / FINISH thay vì nhớ và gõ giờ. Mặc định chỉ hiện dòng có bộ đếm TĂNG (+ dòng ngay trước
     lúc bắt đầu tăng, + mốc mỗi giờ); nút "All rows" hiện mọi dòng. Tối đa 6 000 dòng / lần vẽ. */
  function impRows(){
    const I = S.imp, A = I.A && I.A.pts, B = I.B && I.B.pts;
    const ts = new Set(); (A || []).forEach(p => ts.add(p[0])); (B || []).forEach(p => ts.add(p[0]));
    const T = [...ts].sort((a, b) => a - b), out = [];
    let pa = null, pb = null;
    T.forEach(t => { const va = A ? PMSHEAT.valueAt(A, t) : null, vb = B ? PMSHEAT.valueAt(B, t) : null;
      out.push({ t, va, vb, da:va != null && pa != null ? va - pa : null, db:vb != null && pb != null ? vb - pb : null }); pa = va; pb = vb; });
    return out;
  }
  function impTable(){
    const I = S.imp, all = impRows(), mode = I.mode || 'active', MAX = 6000;
    const mv = r => (r.da || 0) >= 1 || (r.db || 0) >= 1;
    let rows = mode === 'all' ? all : all.filter((r, i) => mv(r) || (all[i+1] && mv(all[i+1])) || new Date(r.t).getMinutes() === 0 || r.t === I.start || r.t === I.stop);
    const cut = rows.length > MAX; if(cut) rows = rows.slice(0, MAX);
    const nMove = all.filter(mv).length;
    let h = '<div class="ht-tbar"><b>📄 Data loaded from the file</b> <small>'+all.length.toLocaleString('en-US')+' readings · '+(all.length ? tsStr(all[0].t)+' → '+tsStr(all[all.length-1].t) : '')+' · counters rising in '+nMove.toLocaleString('en-US')+' of them</small>'+
      '<span class="lx-seg" style="margin-left:auto"><button class="'+(mode === 'active' ? 'on' : '')+'" onclick="HTRH.impSet(\'mode\',\'active\')" title="Rows where a counter rises, the row just before it starts rising, and every full hour">Rising + hourly</button><button class="'+(mode === 'all' ? 'on' : '')+'" onclick="HTRH.impSet(\'mode\',\'all\')">All rows</button></span></div>'+
      '<div class="dp-hint">👉 <b>Click a row</b> = START of the heater run · <b>⏹</b> on a row = FINISH (ticks "Heater finished"). Green = START, red = FINISH.</div>'+
      '<div class="ht-tscroll" id="htImpScroll"><table class="eng-tbl dp-tbl ht-itbl"><thead><tr><th>Time</th><th>Counter A (kg)</th><th>+ A</th><th>Counter B (kg)</th><th>+ B</th><th></th></tr></thead><tbody>';
    h += rows.map(r => { const cls = r.t === I.start ? 'ht-rs' : I.fin && r.t === I.stop ? 'ht-rf' : (I.start && r.t > I.start && (!I.fin || !I.stop || r.t < I.stop)) ? 'ht-rin' : '';
      const d0 = new Date(r.t).getHours() === 0 && new Date(r.t).getMinutes() === 0;
      return '<tr class="'+cls+(d0 ? ' ht-rday' : '')+'" id="'+(r.t === I.start ? 'htImpS' : I.fin && r.t === I.stop ? 'htImpF' : '')+'" onclick="HTRH.impSet(\'pickStart\','+r.t+')" title="Click = START here">'+
        '<td class="td-c">'+tsStr(r.t)+'</td><td class="td-r">'+(r.va == null ? '' : fmt(r.va, 0))+'</td><td class="td-r'+((r.da || 0) >= 1 ? ' ht-up' : '')+'">'+(r.da ? (r.da > 0 ? '+' : '')+fmt(r.da, 0) : '')+'</td>'+
        '<td class="td-r">'+(r.vb == null ? '' : fmt(r.vb, 0))+'</td><td class="td-r'+((r.db || 0) >= 1 ? ' ht-up' : '')+'">'+(r.db ? (r.db > 0 ? '+' : '')+fmt(r.db, 0) : '')+'</td>'+
        '<td class="td-c">'+(r.t === I.start ? '<b class="ht-tagS">START</b>' : I.fin && r.t === I.stop ? '<b class="ht-tagF">FINISH</b>' : '<button class="dp-x" title="FINISH here" onclick="event.stopPropagation();HTRH.impSet(\'pickStop\','+r.t+')">⏹</button>')+'</td></tr>'; }).join('');
    h += '</tbody></table>'+(cut ? '<div class="dp-hint">… first '+MAX.toLocaleString('en-US')+' rows shown — use "Rising + hourly".</div>' : '')+'</div>';
    return h;
  }
  /* cuộn bảng tới dòng START / FINISH vừa chọn */
  function impJump(){
    const I = S.imp; if(!I || !I.jump || typeof document === 'undefined') return;
    const el = document.getElementById(I.jump === 'F' ? 'htImpF' : 'htImpS'), box = document.getElementById('htImpScroll');
    if(el && box) box.scrollTop = el.offsetTop - box.clientHeight / 2;
    I.jump = '';
  }
  function impHtml(){
    const I = S.imp, V = S.voys[S.cur] || {};
    let h = '<div class="ht-imp"><div class="dp-h">📂 PMS import — '+esc(V.ves || '')+' <small>TagMonitoringReport per-minute files, Heater A (FQT32331) + B (FQT32341) — one file may cover several days</small><button class="dp-x" onclick="HTRH.impClose()" title="Close without saving">✕</button></div>';
    h += '<div class="dp-row"><label class="eng-btn green ht-filebtn">📂 '+(I.A || I.B ? 'Add more files' : 'Choose PMS files (A + B together)')+'<input type="file" multiple accept=".xlsx,.xlsm,.xls" onchange="HTRH.impFiles(this)"></label>'+
      (I.busy ? ' ⏳ reading…' : '')+(I.A || I.B ? ' <span class="ht-chip A'+(I.A ? '' : ' miss')+'">A</span><span class="ht-chip B'+(I.B ? '' : ' miss')+'">B</span><button class="dp-x" onclick="HTRH.impSwap()" title="Files assigned the wrong way round? Swap A / B">⇄</button> <small class="dp-by">'+esc(I.files.join(' · '))+'</small>' : '')+'</div>';
    I.pending.forEach((p, i) => { h += '<div class="ht-pi">❓ '+esc(p.file)+' — this file does not say which heater it is: <button class="eng-btn blue" onclick="HTRH.impAssign('+i+',\'A\')">Heater A</button><button class="eng-btn red" onclick="HTRH.impAssign('+i+',\'B\')">Heater B</button></div>'; });
    if(!(I.A || I.B)) return h + '</div>';
    const R_ = impRuns();
    h += '<div class="dp-row ht-ss">';
    if(I.fixed) h += '<div class="ht-fix">START <b>'+esc(V.rs)+'</b> <small>(set at the first import of this vessel)</small> <button class="dp-x" onclick="HTRH.impSet(\'unfix\')" title="Change the START point">✎</button></div>';
    else h += '<label class="ht-need">START of the heater run'+(V.rs ? '' : ' <small>— first import: confirm where this vessel starts</small>')+'<input type="datetime-local" step="60" value="'+dtLocal(I.start)+'" onchange="HTRH.impSet(\'start\',this.value)"></label>'+
      (R_.length ? '<span class="ht-runs"><small>runs found:</small> '+R_.map((r, i) => '<button class="lx-mini" onclick="HTRH.impSet(\'run\','+i+')" title="Counters rising '+tsStr(r.start)+' → '+tsStr(r.stop)+'">'+tsStr(r.start).slice(5)+' · '+fmt(r.a + r.b, 0)+' kg</button>').join('')+'</span>' : '');
    h += '<label class="ht-fin"><input type="checkbox"'+(I.fin ? ' checked' : '')+' onchange="HTRH.impSet(\'fin\',this.checked)"> Heater finished at</label><input class="ht-dt" type="datetime-local" step="60" value="'+dtLocal(I.stop)+'" '+(I.fin ? '' : 'disabled ')+'onchange="HTRH.impSet(\'stop\',this.value)">'+
      '<small class="dp-by">'+(I.fin ? 'nothing after FINISH is counted' : 'not ticked: days with data 00:00 → 24:00 are complete, the last day is completed by the next import')+'</small></div>';
    h += impTable();
    if(!I.start) return h + '<div class="dp-hint dp-offt">Pick the START point — click a row in the table above.</div></div>';
    const D = impPreview();
    h += '<div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Date</th><th>Hours</th><th>Heater A (kg)</th><th>Heater B (kg)</th><th>Total (kg)</th><th>Day</th><th>Checks</th></tr></thead><tbody>'+
      (D.length ? D.map(x => '<tr><td class="td-c"><b>'+dmy(x.date)+'</b> '+(x.had ? '<small class="dp-by">update</small>' : '<small class="dp-okt">new</small>')+(x.other ? '<br><small class="dp-offt">was '+esc(x.other)+'</small>' : '')+'</td><td class="td-c">'+x.from.slice(0,2)+':'+x.from.slice(2)+' → '+x.to.slice(0,2)+':'+x.to.slice(2)+'</td>'+
        '<td class="td-r">'+fmt(x.a,0)+'</td><td class="td-r">'+fmt(x.b,0)+'</td><td class="td-r"><b>'+fmt(x.a + x.b,0)+'</b></td><td class="td-c">'+(x.complete ? '<span class="dp-okt">✓ complete</span>' : '<span class="dp-offt">partial</span>')+'</td>'+
        '<td>'+x.chk.map(c => '<div class="ht-c'+c.lvl+'">'+(c.lvl === 'bad' ? '⛔ ' : c.lvl === 'warn' ? '⚠ ' : 'ℹ ')+esc(c.t)+'</div>').join('')+'</td></tr>').join('')
        : '<tr><td colspan="7" class="td-c dp-na">No data after START.</td></tr>')+
      '</tbody></table></div><div class="dp-row"><button class="eng-btn green"'+(D.length ? '' : ' disabled')+' onclick="HTRH.impApply()">✔ Apply — create / update '+D.length+' day row(s) and save</button><button class="eng-btn" onclick="HTRH.impClose()">Cancel</button></div>';
    return h + '</div>';
  }

  function dropWork(d){ delete S.work[d]; render(); }
  async function saveDay(d){
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return false; }
    const v = S.voys[S.cur]; if(!v){ toastM('Save the vessel first', 'er'); return false; }
    const w = S.work[d] || {}, old = S.days[d] || null, x = view(d) || {}, C3 = hasC3(v), C4 = hasC4(v);
    if(w.pending && w.pending.length){ toastM('Assign the unrecognised PMS file(s) to Heater A or B first', 'er'); return false; }
    if(w.res && w.res.chk && w.res.chk.some(c => c.lvl === 'bad') && !confirm('The checks show a problem for '+dmy(d)+':\n\n'+w.res.chk.filter(c => c.lvl === 'bad').map(c => '• '+c.t).join('\n')+'\n\nSave anyway?')) return false;
    const u3 = C3 ? numT(x.u3) : null, u4 = C4 ? numT(x.u4) : null;
    const up = {}, now = Date.now(), by = userName();
    /* lượng unloading của ngày → theo TÀU */
    const dd = {}; if(u3 != null) dd.c3 = u3; if(u4 != null) dd.c4 = u4;
    up['heater_voy/'+S.cur+'/d/'+d] = Object.keys(dd).length ? Object.assign(dd, { by, _ts:now }) : null;
    /* heater (chỉ propane): có dữ liệu PMS mới ghi */
    let rec = null;
    if(C3 && (x.h || (old && old.vk === S.cur))){
      rec = { a:Math.round(x.a || 0), b:Math.round(x.b || 0), vk:S.cur, voy:v.no || '', ves:v.ves || '', h:x.h || null, src:x.h ? 'PMS' : 'manual', by, _ts:now };
      up['heater_day/'+d] = rec;
    }
    if(!rec && !Object.keys(dd).length){ toastM('Nothing to save for '+dmy(d)+' — load PMS files or type the unloaded quantity', 'er'); return false; }
    try{
      await firebase.database().ref().update(up);
      const vv = S.voys[S.cur]; vv.d = vv.d || {}; if(Object.keys(dd).length) vv.d[d] = dd; else delete vv.d[d];
      if(rec) S.days[d] = rec;
      delete S.work[d];
      /* Cavern Daily (Heater C3) — nguồn của SAP WMS report; một lần bấm, cùng số */
      let cavMsg = '';
      if(rec && typeof CAV !== 'undefined' && CAV.pushEntry){
        const cur = (CAV.ROWS || []).filter(r => r && r.kind === 'heater' && r.prod === 'c3' && r.date === d);
        const foreign = cur.filter(r => !/^PMS/.test(String(r.note || '')));
        if(!foreign.length || confirm('Cavern Daily already has '+foreign.length+' Heater C3 entr'+(foreign.length > 1 ? 'ies' : 'y')+' on '+dmy(d)+' typed by hand.\n\nOK = replace with the PMS figure · Cancel = keep them')){
          cur.forEach(r => { try{ CAV.removeSilent(r._rid); }catch(_){} });
          if(rec.a + rec.b > 0) CAV.pushEntry(d, 'heater', 'c3', 'D', rec.a + rec.b, 'PMS FQT32331+FQT32341 · '+rec.ves+' · '+d);
          try{ CAV.render(); }catch(_){}
          cavMsg = ' + Cavern Daily';
        }
      }
      toastM('💾 '+dmy(d)+' saved'+(rec ? ' · heater '+fmt(rec.a + rec.b, 0)+' kg' : '')+(u3 != null ? ' · C3 '+fmt(u3, 3)+' t' : '')+(u4 != null ? ' · C4 '+fmt(u4, 3)+' t' : '')+cavMsg, 'ok');
      render(); syncMail(); return true;
    }catch(e){ toastM('⚠ Save failed: '+e.message, 'er'); return false; }
  }
  async function saveAll(){ for(const d of voyDates(S.cur)) if(S.work[d]) { if(!(await saveDay(d))) break; } }

  /* ── file báo cáo "Heater 연료 사용량" cho CẢ CHUYẾN từ dữ liệu giờ ── */
  async function report(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return null;
    const v = S.voys[S.cur]; if(!v){ toastM('Pick a vessel first', 'er'); return null; }
    if(Object.keys(S.work).some(d => S.work[d].vk === S.cur && S.work[d].res) && !confirm('Some days are not saved yet — the report uses the figures on screen.\n\nContinue?')) return null;
    const P = voyPts(S.cur);
    if(!P.days.length || !(P.A.length || P.B.length)){ toastM('No PMS hourly data for this vessel yet', 'er'); return null; }
    const start = P.start || P.A.concat(P.B).reduce((m, p) => Math.min(m, p[0]), Infinity), stop = P.stop || P.A.concat(P.B).reduce((m, p) => Math.max(m, p[0]), 0);
    try{
      const out = await PMSHEAT.buildMaster(f, { A:P.A.length ? P.A : null, B:P.B.length ? P.B : null, start, stop, days:P.days, vessel:v.ves, amount:num(v.amt),
                                                 name:v.no ? '`'+v.no+'항차_Data' : undefined });
      download(out.blob, f.name);
      if(!v.no){ const m = out.sheet.match(/(\d{2}\.\d+)항차/); if(m) firebase.database().ref('heater_voy/'+S.cur+'/no').set(m[1]).then(() => { S.voys[S.cur].no = m[1]; S.vf = null; render(); }); }
      try{ HTR.S.lastOut = { blob:out.blob, name:f.name, sheet:out.sheet, sumRow:out.sumRow, at:Date.now() }; MAIL.refreshIf('P5'); }catch(_){}
      toastM('⬇ '+f.name+' — sheet '+out.sheet+(out.replaced ? ' updated' : ' added')+(out.sumRow ? ' · Sumary row '+out.sumRow : ''), 'ok');
      return out;
    }catch(e){ console.error(e); toastM('⚠ Report file: '+e.message, 'er'); return null; }
  }
  /* email P5 dùng chung HTR.S ⇒ đổ dữ liệu giờ của chuyến đang chọn vào đó */
  function syncMail(){
    if(typeof HTR === 'undefined' || !HTR.S) return;
    const v = S.voys[S.cur]; if(!v) return;
    const P = voyPts(S.cur); if(!P.start) return;
    const H = HTR.S, mk = (k, pts) => pts.length ? { pts, tag:PMSHEAT.TAG_OF[k], how:'voyage '+(v.no || S.cur)+' (saved hourly data)', files:['Firebase'], file:'Firebase · '+v.ves } : null;
    H.A = mk('A', P.A); H.B = mk('B', P.B); H.pending = [];
    H.start = P.start; H.stop = P.stop; H.vessel = v.ves || ''; H.amount = v.amt == null ? '' : String(v.amt);
    const u = PMSHEAT.used(P.A, P.B, P.start, P.stop);
    H.runs = [{ start:P.start, stop:P.stop, a:u.a, b:u.b }]; H.run = 0; H.manual = false;
    try{ MAIL.refreshIf('P5'); }catch(_){}
  }

  /* ── lịch sử (như v4.196) ── */
  function days(){
    return Object.keys(S.days).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
      .map(d => { const r = S.days[d] || {}; const a = +r.a || 0, b = +r.b || 0; return { d, a, b, t:a + b, voy:r.voy || '', ves:r.ves || '', by:r.by || '', src:r.src || '', unl:num(r.unl), vk:r.vk || '' }; });
  }
  function voys(D){
    return Object.keys(S.voys).sort().map(k => { const r = S.voys[k] || {};
      const amt = num(r.amt), sd0 = String(r.st || k).slice(0, 10), fd = String(r.fi || '').slice(0, 10) || isoToday();
      const mine = D.filter(x => x.vk ? x.vk === k : r.no ? x.voy === r.no : (x.d >= sd0 && x.d <= isoAdd(fd, 1)));
      const sa = mine.reduce((s, x) => s + x.a, 0), sb = mine.reduce((s, x) => s + x.b, 0);
      /* chuyến PMS mới không lưu a/b (tính được từ ngày) — chuyến import thì có số Sumary */
      let a = num(r.a), b = num(r.b); if(a == null && b == null && mine.length){ a = sa; b = sb; }
      const dv = r.d || {}, un = Object.keys(dv).reduce((s, x) => s + (num(dv[x].c3) || 0), 0) || mine.reduce((s, x) => s + (x.unl || 0), 0);
      const un4 = Object.keys(dv).reduce((s, x) => s + (num(dv[x].c4) || 0), 0), t = (a || 0) + (b || 0);
      return { key:k, no:r.no || '', ves:r.ves || '', org:r.org || '', amt, term:r.term || '', sel:r.sel || '', st:String(r.st || sd0), fi:String(r.fi || ''), a, b, t, note:r.note || '', src:r.src || '',
               kgt:amt && (r.fi || num(r.a) != null) ? t / amt : null,   /* chuyến đang unloading: chưa tính kg/t */ share:t ? (a || 0) / t : null, sa, sb, nd:mine.length, unl:un, unl4:un4, com:r.com || '', ref:r.ref || '', derived:num(r.a) == null && num(r.b) == null };
    });
  }
  function inRange(D){ if(S.range === 'win' || S.range === 'all') return D; const from = isoAdd(isoToday(), -(+S.range)); return D.filter(x => (x.d || x.st) >= from); }
  function findings(D, V){
    const out = [], add = (lvl, t) => out.push({ lvl, t });
    if(!D.length && !V.length){ add('info', 'No heater data in this range.'); return out; }
    const K = V.filter(v => v.kgt != null && v.t > 0);
    if(K.length >= 5){ const xs = K.map(v => v.kgt), m = xs.reduce((a, b) => a + b, 0) / xs.length, s = sd(xs);
      K.forEach(v => { if(s && Math.abs(v.kgt - m) > 2 * s) add('warn', (v.no ? v.no+' ' : '')+v.ves+' ('+dmy(v.st.slice(0,10))+'): '+fmt(v.kgt,2)+' kg per ton of cargo vs average '+fmt(m,2)+' — '+(v.kgt > m ? 'unusually high' : 'unusually low')+'.'); }); }
    V.forEach(v => { if(v.share != null && v.t > 5000 && (v.share < 0.3 || v.share > 0.7)) add('info', (v.no ? v.no+' ' : '')+v.ves+': load split A / B = '+Math.round(v.share*100)+' / '+Math.round((1-v.share)*100)+' % — one heater carried most of the duty.');
      if(!v.derived && v.nd && v.t > 0 && (S.all || v.st.slice(0, 10) >= S.from)){ const dd = v.sa + v.sb - v.t; if(Math.abs(dd) > Math.max(500, 0.02 * v.t)) add('warn', (v.no ? v.no+' ' : '')+v.ves+': voyage total '+fmt(v.t,0)+' kg ≠ sum of daily '+fmt(v.sa+v.sb,0)+' kg (Δ '+(dd > 0 ? '+' : '')+fmt(dd,0)+').'); }
      if(v.t > 0 && v.amt == null) add('info', (v.no ? v.no+' ' : '')+(v.ves || '?')+' ('+dmy(v.st.slice(0,10))+'): cargo tonnage missing — kg/t cannot be computed.'); });
    const run = D.filter(x => x.t > 0);
    if(run.length >= 5){ const xs = run.map(x => x.t), m = xs.reduce((a, b) => a + b, 0) / xs.length, s = sd(xs);
      run.forEach(x => { if(s && x.t > m + 3 * s) add('info', dmy(x.d)+': '+fmt(x.t,0)+' kg in one day (average running day '+fmt(m,0)+') — check the counter.'); }); }
    if(!out.some(a => a.lvl !== 'info')) out.unshift({ lvl:'ok', t:'No abnormal heater consumption in this range.' });
    return out;
  }
  function histHtml(){
    const st = $('htrStats');
    const bar = '<div class="lx-bar"><span class="lx-span">'+(S.loading ? '⏳ loading…' : S.loaded ? (S.all ? 'All heater history loaded' : 'Loaded from <b>'+dmy(S.from)+'</b> (last 3 months)') : '')+'</span>'+
      (S.loaded && !S.all && !S.loading ? '<button class="eng-btn" onclick="HTRH.loadAll()" title="Download the whole heater history (daily + voyages)">⤓ Load all history</button>' : '')+
      (S.all ? '<span class="dp-rg">'+[['92','3 m'],['182','6 m'],['365','1 y'],['730','2 y'],['all','All']].map(([k, t]) => '<button class="'+(S.range === k ? 'on' : '')+'" onclick="HTRH.range(\''+k+'\')">'+t+'</button>').join('')+'</span>' : '')+'</div>';
    const Dall = days(), D = inRange(Dall), Vall = voys(Dall), V = Vall.filter(v => S.range === 'win' || S.range === 'all' || v.st.slice(0,10) >= isoAdd(isoToday(), -(+S.range)));
    const ta = D.reduce((s, x) => s + x.a, 0), tb = D.reduce((s, x) => s + x.b, 0), run = D.filter(x => x.t > 0);
    if(st) st.innerHTML = '<b>'+fmt((ta + tb) / 1000, 1)+'</b> t C3 · '+run.length+' running day(s)';
    let h = '<div class="lx-sec">📊 History</div>'+bar;
    if(!Dall.length && !Vall.length) return h+'<div class="dp-empty">No heater history loaded.<br><small>Use 📥 Import file (sheets HEATER_DAY / HEATER_VOY) or save days of an unloading vessel above.</small></div>';
    const KV = V.filter(v => v.kgt != null && v.t > 0), avgKgt = KV.length ? KV.reduce((s, v) => s + v.t, 0) / KV.reduce((s, v) => s + v.amt, 0) : null;
    const box = (n, v, s) => '<div class="dp-kpi"><div class="dp-kn" style="border-color:#e76f00">'+n+'</div><div class="dp-kv">'+v+'</div><div class="dp-ks">'+s+'</div></div>';
    h += '<div class="dp-kpis">'+box('Heater A', fmt(ta / 1000, 1)+'<small> t</small>', (ta + tb ? Math.round(ta / (ta + tb) * 100) : 0)+' % of total')+
      box('Heater B', fmt(tb / 1000, 1)+'<small> t</small>', (ta + tb ? Math.round(tb / (ta + tb) * 100) : 0)+' % of total')+
      box('Total C3 fuel', fmt((ta + tb) / 1000, 1)+'<small> t</small>', run.length+' running day(s) · '+(run.length ? fmt((ta + tb) / run.length, 0) : '–')+' kg / running day')+
      box('Per ton of cargo', avgKgt == null ? '–' : fmt(avgKgt, 2)+'<small> kg/t</small>', KV.length+' voyage(s) with cargo tonnage')+'</div>';
    h += '<div class="dp-card"><div class="dp-h">🔎 Findings</div><ul class="dp-al">'+findings(D, V).map(a => '<li class="dp-'+a.lvl+'">'+esc(a.t)+'</li>').join('')+'</ul></div>';
    const from = S.range === 'win' ? S.from : S.range === 'all' ? '' : isoAdd(isoToday(), -(+S.range));
    h += '<div class="dp-card"><div class="dp-h">📊 Daily consumption (kg) <span class="dp-lg"><span><i style="background:'+CA+'"></i>Heater A</span><span><i style="background:'+CB+'"></i>Heater B</span></span></div>'+
      LX_U.barChart(run.map(x => ({ d:x.d, parts:[x.a, x.b], tip:dmy(x.d)+' · A '+fmt(x.a,0)+' · B '+fmt(x.b,0)+' · total '+fmt(x.t,0)+' kg'+(x.ves ? ' · '+x.ves : '') })), [{ col:CA }, { col:CB }], { from:from || null, to:isoToday(), aria:'Daily heater consumption' })+'</div>';
    /* kg/t theo chuyến */
    if(KV.length) h += '<div class="dp-card"><div class="dp-h">🚢 Specific consumption per voyage (kg C3 per ton of cargo)</div>'+
      LX_U.lineChart([{ name:'kg/t', col:'#e76f00', pts:KV.map(v => ({ d:v.st.slice(0,10), v:+v.kgt.toFixed(3), tip:(v.no ? v.no+' ' : '')+v.ves+' · '+fmt(v.amt,0)+' t · '+fmt(v.t,0)+' kg · '+fmt(v.kgt,2)+' kg/t' })) }],
        { lims:avgKgt ? [{ v:+avgKgt.toFixed(3), t:'avg '+fmt(avgKgt,2), show:true }] : [], dp:2, h:220, aria:'kg per ton per voyage' })+'</div>';
    /* bảng chuyến */
    h += '<div class="dp-card"><div class="dp-h">🚢 Voyages ('+V.length+')</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>No.</th><th>Vessel</th><th>Start</th><th>Finish</th><th>Cargo (t)</th><th>Heater A</th><th>Heater B</th><th>Total (kg)</th><th>kg/t</th><th>A share</th><th title="Sum of the daily records for this voyage">Σ daily</th><th>Note</th></tr></thead><tbody>'+
      (V.length ? V.slice().reverse().map(v => { const dd = v.nd && (S.all || v.st.slice(0, 10) >= S.from) ? v.sa + v.sb - v.t : null;
        return '<tr><td class="td-c">'+esc(v.no)+'</td><td>'+esc(v.ves)+(v.org ? ' <small class="dp-by">'+esc(v.org)+'</small>' : '')+'</td><td class="td-c">'+esc(v.st)+'</td><td class="td-c">'+esc(v.fi)+'</td>'+
          '<td class="td-r">'+(v.amt == null ? '' : fmt(v.amt,0))+'</td><td class="td-r">'+(v.a == null ? '' : fmt(v.a,0))+'</td><td class="td-r">'+(v.b == null ? '' : fmt(v.b,0))+'</td><td class="td-r"><b>'+fmt(v.t,0)+'</b></td>'+
          '<td class="td-r">'+(v.kgt == null ? '' : fmt(v.kgt,2))+'</td><td class="td-c'+(v.share != null && v.t > 5000 && (v.share < 0.3 || v.share > 0.7) ? ' dp-near' : '')+'">'+(v.share == null ? '' : Math.round(v.share*100)+' %')+'</td>'+
          '<td class="td-r'+(dd != null && Math.abs(dd) > Math.max(500, 0.02 * v.t) ? ' dp-near' : '')+'" title="'+(dd == null ? 'no daily record' : 'Δ '+fmt(dd,0)+' kg')+'">'+(v.nd ? fmt(v.sa + v.sb,0) : '')+'</td><td class="dp-by">'+esc(v.note || v.src)+'</td></tr>'; }).join('')
        : '<tr><td colspan="12" class="td-c dp-na">No voyage in this range.</td></tr>')+'</tbody></table></div></div>';
    /* tháng + ngày */
    const M = {}; D.forEach(x => { const m = M[x.d.slice(0,7)] || (M[x.d.slice(0,7)] = { a:0, b:0, n:0 }); m.a += x.a; m.b += x.b; if(x.t > 0) m.n++; });
    h += '<div class="dp-grid2"><div class="dp-card"><div class="dp-h">🗓 Monthly</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Month</th><th>Days</th><th>Heater A</th><th>Heater B</th><th>Total (kg)</th></tr></thead><tbody>'+
      Object.keys(M).sort().reverse().map(k => '<tr><td class="td-c">'+k+'</td><td class="td-c">'+M[k].n+'</td><td class="td-r">'+fmt(M[k].a,0)+'</td><td class="td-r">'+fmt(M[k].b,0)+'</td><td class="td-r"><b>'+fmt(M[k].a + M[k].b,0)+'</b></td></tr>').join('')+
      '</tbody></table></div></div>';
    h += '<div class="dp-card"><div class="dp-h">📋 Daily records ('+run.length+')</div><div class="dp-scroll lx-hist"><table class="eng-tbl dp-tbl"><thead><tr><th>Date</th><th>Heater A</th><th>Heater B</th><th>Total</th><th>Voyage</th><th>By</th><th></th></tr></thead><tbody>'+
      run.slice().reverse().map(x => '<tr><td class="td-c">'+dmy(x.d)+'</td><td class="td-r">'+fmt(x.a,0)+'</td><td class="td-r">'+fmt(x.b,0)+'</td><td class="td-r"><b>'+fmt(x.t,0)+'</b></td><td>'+esc([x.voy, x.ves].filter(Boolean).join(' '))+'</td><td class="dp-by">'+esc(x.by || x.src)+'</td>'+
        '<td class="td-c"><button class="dp-x" title="Delete this daily record" onclick="HTRH.delDay(\''+x.d+'\')">✕</button></td></tr>').join('')+'</tbody></table></div></div></div>';
    return h;
  }

  /* ── vẽ: bảng tàu (như vessel itinerary) + chi tiết tàu ── */
  function voySums(k){
    const v = S.voys[k] || {}, ds = voyDates(k), P = ds.map(d => view(d, k)).filter(Boolean);
    return { ds, ta:P.reduce((s, x) => s + (x.a || 0), 0), tb:P.reduce((s, x) => s + (x.b || 0), 0),
             u3:P.reduce((s, x) => s + (num(x.u3) || 0), 0), u4:P.reduce((s, x) => s + (num(x.u4) || 0), 0), bl3:num(v.blc3 != null && v.blc3 !== '' ? v.blc3 : v.amt), bl4:num(v.blc4) };
  }
  const comName = c => (COMS.find(x => x[0] === c) || [0, c || 'Propane'])[1];
  function pctTxt(u, bl){ return bl ? fmt(u, 0)+' / '+fmt(bl, 0)+' t <small>('+fmt(u / bl * 100, 0)+' %)</small>' : (u ? fmt(u, 0)+' t' : ''); }
  function voyHtml(){
    const recent = voyArr().filter(x => !x.fi || String(x.fi).slice(0, 10) >= isoAdd(isoToday(), -45)).reverse();
    let h = '<div class="dp-card ht-voy"><div class="dp-h">🚢 Vessels — import itinerary <small>click a row to work on that vessel</small>'+
      '<button class="eng-btn blue" style="margin-left:auto" onclick="HTRH.pasteOpen()" title="Copy one or more rows of the vessel itinerary table from the e-mail and paste them — the app fills the form, you correct what is wrong">📋 Paste itinerary row</button>'+
      '<button class="eng-btn green" onclick="HTRH.newVoy()" title="Declare a vessel from the itinerary — missing information can stay empty">➕ New vessel</button></div>';
    h += '<div class="dp-scroll"><table class="eng-tbl dp-tbl ht-itin"><thead><tr><th>No.</th><th>Ref</th><th>Supplier</th><th>Vessel</th><th>Commodity</th><th>Lay-time</th><th>DEM ($/day)</th><th>Delivery range</th><th>Contract Q\'ty</th><th>Loadport</th><th>BL Q\'ty (MT)</th><th>Customs</th><th>ETA load port</th><th>ETA Cai Mep</th><th>Unloaded</th><th>Status</th><th></th></tr></thead><tbody>'+
      (recent.length ? recent.map(v => { const u = voySums(v.key), c3 = hasC3(v), c4 = hasC4(v);
        const bl = [c3 && u.bl3 != null ? 'C3 '+fmt(u.bl3, 3) : '', c4 && u.bl4 != null ? 'C4 '+fmt(u.bl4, 3) : ''].filter(Boolean).join('<br>');
        const un = [c3 ? (c4 ? 'C3 ' : '')+pctTxt(u.u3, u.bl3) : '', c4 ? 'C4 '+pctTxt(u.u4, u.bl4) : ''].filter(x => x && !/^C[34] $/.test(x)).join('<br>');
        return '<tr class="ht-vrow'+(v.key === S.cur ? ' on' : '')+'" onclick="HTRH.pick(\''+esc(v.key)+'\')"><td class="td-c">'+esc(v.no || '')+'</td><td>'+esc(v.ref || '')+'</td><td>'+esc(v.sel || '')+'</td><td><b>'+esc(v.ves || '')+'</b></td>'+
          '<td>'+comName(v.com)+'</td><td class="td-r">'+esc(v.lay == null ? '' : v.lay)+'</td><td>'+esc(v.dem || '')+'</td><td>'+esc(v.drng || '')+'</td><td>'+esc(v.cq || '')+'</td><td>'+esc(v.org || '')+'</td>'+
          '<td class="td-r">'+bl+'</td><td>'+esc(v.cus || '')+'</td><td>'+esc(v.etalp || '')+'</td><td>'+esc(v.etacm || '')+'</td><td class="td-r">'+un+'</td>'+
          '<td class="td-c">'+(v.fi ? '<span class="dp-okt">✔ '+dmy(String(v.fi).slice(0, 10))+'</span>' : '<span class="lx-live">● open</span>')+'</td>'+
          '<td class="td-c"><button class="dp-x" title="Delete this vessel" onclick="event.stopPropagation();HTRH.delVoy(\''+esc(v.key)+'\')">✕</button></td></tr>'; }).join('')
        : '<tr><td colspan="17" class="td-c dp-na">No vessel yet — ➕ New vessel.</td></tr>')+'</tbody></table></div>';
    if(S.pv) h += pasteHtml();
    h += vesselForm();
    return h + '</div>';
  }
  function pasteHtml(){
    const P = S.pv;
    let h = '<div class="ht-form"><div class="dp-h">📋 Paste from the vessel itinerary e-mail <small>Ref · Supplier · Vessel name · Commodity · Lay-time · DEM · Delivery range · Contract Q\'ty · Loadport · BL Q\'ty · Customs · ETA load port · ETA Cai Mep</small><button class="dp-x" onclick="HTRH.pasteClose()" title="Close">✕</button></div>'+
      '<textarea id="htrPasteTxt" class="ht-paste" rows="3" placeholder="Copy the row(s) in the e-mail table and Ctrl+V here — or paste the row straight into any box of the vessel form" oninput="HTRH.pasteIn(this.value)">'+esc(P.txt)+'</textarea>';
    if(P.rows.length > 1) h += '<div class="dp-hint"><b>'+P.rows.length+'</b> rows read — pick the one to fill the form (one vessel at a time):</div><div class="ht-pvl">'+P.rows.map((r, i) =>
      '<div class="ht-pvr"><button class="eng-btn '+(r.match ? '' : 'green')+'" onclick="HTRH.pasteUse('+i+')">'+(r.match ? '✎ Update' : '➕ Fill')+'</button> <b>'+esc(r.f.ves || '?')+'</b> · '+esc(r.f.ref)+' · '+esc(r.f.sel)+' · '+comName(r.f.com)+
      (r.match ? ' <small class="dp-okt">already in the table</small>' : '')+(Object.keys(r.flag).length ? ' <small class="dp-offt" title="'+esc(Object.values(r.flag).join('\n'))+'">⚑ '+Object.keys(r.flag).length+' to check</small>' : '')+'</div>').join('')+'</div>';
    else if(P.txt.trim() && !P.rows.length) h += '<div class="dp-hint dp-offt">No itinerary row recognised — copy whole row(s) of the table (cells separated by tabs).</div>';
    return h + '</div>';
  }
  function vesselForm(){
    const v = S.voys[S.cur];
    if(v && !S.edit){
      const u = voySums(S.cur), c3 = hasC3(v), c4 = hasC4(v);
      const bar = (lbl, un, bl) => '<div>'+lbl+' <b>'+fmt(un, 3)+'</b> t'+(bl ? ' of '+fmt(bl, 3)+' t · <b>'+fmt(un / bl * 100, 1)+' %</b><div class="ht-bar"><i style="width:'+Math.min(100, un / bl * 100).toFixed(1)+'%"></i></div>' : ' <small>(BL Q\'ty not known yet)</small>')+'</div>';
      return '<div class="ht-sel"><div class="ht-selh">▶ <b>'+esc(v.ves)+'</b>'+(v.no ? ' · voyage '+esc(v.no) : '')+(v.ref ? ' · '+esc(v.ref) : '')+' · '+comName(v.com)+
        ' <button class="eng-btn" onclick="HTRH.editVoy()">✎ Edit vessel</button>'+(v.fi ? '' : '<button class="eng-btn" onclick="HTRH.saveVoy(true)" title="Unloading finished — Finish = last day">✔ Finish voyage</button>')+'</div>'+
        '<div class="ht-prog">'+(c3 ? bar('Propane unloaded', u.u3, u.bl3) : '')+(c4 ? bar('Butane unloaded', u.u4, u.bl4) : '')+
        (c3 ? '<div>Heater A <b>'+fmt(u.ta, 0)+'</b> · B <b>'+fmt(u.tb, 0)+'</b> · total <b>'+fmt(u.ta + u.tb, 0)+'</b> kg C3'+(u.u3 ? ' · <b>'+fmt((u.ta + u.tb) / u.u3, 2)+'</b> kg per t propane unloaded' : '')+'</div>' : '<div><small>Butane only — no heater.</small></div>')+'</div></div>';
    }
    const f = vform();
    const G = S.guess || {};
    const inp = (k, lbl, ph, wd, type, tt) => '<label'+(G[k] ? ' class="ht-guess" title="'+esc(G[k])+'"' : tt ? ' title="'+esc(tt)+'"' : '')+'>'+lbl+(G[k] ? ' ⚑' : '')+'<input'+(type ? ' type="'+type+'"' : '')+' value="'+esc(f[k])+'" placeholder="'+esc(ph || '')+'" style="width:'+wd+'px" onpaste="HTRH.onPaste(event)" onchange="HTRH.vset(\''+k+'\',this.value)"></label>';
    const c3 = /C3/.test(f.com), c4 = /C4/.test(f.com);
    const flags = Object.keys(G).filter(k => G[k] !== 'empty in the itinerary').map(k => G[k]).concat(S.pvNote || []);
    return '<div class="ht-form"><div class="dp-h">'+(v ? '✎ Edit '+esc(v.ves) : '➕ New vessel')+' <small>only the vessel name and the start date are required — fill the rest when known · tip: paste a whole itinerary row into any box</small>'+(S.vdirty ? ' <span class="dp-dirty">● not saved</span>' : '')+'</div>'+
      (flags.length ? '<ul class="dp-al ht-flags">'+flags.map(t => '<li class="dp-warn">⚑ '+esc(t)+'</li>').join('')+'</ul>' : '')+
      '<div class="dp-row">'+inp('no','Voyage No.','26.15',66,'','Numbering of the Heater report file (sheet `YY.NN항차_Data)')+inp('ref','Ref','26B-PRP-…',150)+inp('sel','Supplier','PTT / Adnoc…',100)+inp('ves','Vessel name','TBA / Gaz Ronin',150)+
      '<label'+(G.com ? ' class="ht-guess" title="'+esc(G.com)+'"' : '')+'>Commodity'+(G.com ? ' ⚑' : '')+'<select class="lx-sel" onchange="HTRH.vset(\'com\',this.value)">'+COMS.map(([k, n]) => '<option value="'+k+'"'+(f.com === k ? ' selected' : '')+'>'+n+'</option>').join('')+'</select></label>'+
      inp('lay','Lay-time (h)','36',70)+inp('dem','DEM ($/day)','C/Party rate',100)+inp('drng','Delivery range','16-31 Oct',100)+inp('cq','Contract Q\'ty','46,000 ±10%',100)+inp('org','Loadport','Vadinar, India',130)+'</div>'+
      '<div class="dp-row">'+(c3 ? inp('blc3','BL Q\'ty C3 (MT)','23,072.116',100,'','Propane bill of lading — used for kg C3 per ton') : '')+(c4 ? inp('blc4','BL Q\'ty C4 (MT)','',100) : '')+
      inp('cus','Customs','Wait / Cleared',90)+inp('etalp','ETA load port','Loaded / 25-27 Sep',120)+inp('etacm','ETA Cai Mep','22h00 26-Sep',120)+
      inp('st','Start (1st unloading day)','',140,'date')+inp('fi','Finish','',140,'date','Empty while the vessel is still unloading')+inp('note','Note','',150)+
      '<button class="eng-btn green" onclick="HTRH.saveVoy()">💾 Save vessel</button>'+(v ? '<button class="eng-btn" onclick="HTRH.editVoy()">Cancel</button>' : '')+'</div></div>';
  }
  function hourChart(k){
    const P = voyPts(k); const inc = {};
    [['a', P.A], ['b', P.B]].forEach(([n, L]) => { for(let i = 1; i < L.length; i++){ const dv = L[i][1] - L[i-1][1]; if(dv <= 0) continue; const hr = Math.floor((L[i][0] - 1) / 3600e3); (inc[hr] = inc[hr] || { a:0, b:0 })[n] += dv; } });
    const hs = Object.keys(inc).map(Number).sort((a, b) => a - b); if(!hs.length) return '';
    const h0 = hs[0], h1 = hs[hs.length-1] + 1, n = h1 - h0, W = 1000, H = 190, L = 52, R = 10, T = 12, B = 26, bw = (W - L - R) / n;
    let ymax = Math.max(1, ...hs.map(x => inc[x].a + inc[x].b)); const st = LX_U.niceStep(ymax, 4); ymax = Math.ceil(ymax / st) * st;
    const Y = v => T + (H - T - B) * (1 - v / ymax);
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Hourly heater consumption">';
    for(let v = 0; v <= ymax + 1e-9; v += st) g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="dp-grid"/><text x="'+(L-5)+'" y="'+(Y(v)+3).toFixed(1)+'" class="dp-ax" text-anchor="end">'+fmt(v,0)+'</text>';
    for(let x = h0; x < h1; x++){ const d = new Date(x * 3600e3), X = L + (x - h0) * bw, e = inc[x];
      if(d.getHours() === 0) g += '<line x1="'+X.toFixed(1)+'" x2="'+X.toFixed(1)+'" y1="'+T+'" y2="'+(H-B)+'" class="dp-mid"/><text x="'+(X+3).toFixed(1)+'" y="'+(H-8)+'" class="dp-ax">'+pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'</text>';
      if(!e) continue; const lbl = pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' '+pad2(d.getHours())+':00';
      if(e.a) g += '<rect x="'+(X+0.5).toFixed(1)+'" y="'+Y(e.a).toFixed(1)+'" width="'+Math.max(1, bw-1).toFixed(1)+'" height="'+(Y(0)-Y(e.a)).toFixed(1)+'" fill="'+CA+'"><title>'+lbl+' · A '+fmt(e.a,0)+' kg</title></rect>';
      if(e.b) g += '<rect x="'+(X+0.5).toFixed(1)+'" y="'+Y(e.a+e.b).toFixed(1)+'" width="'+Math.max(1, bw-1).toFixed(1)+'" height="'+(Y(e.a)-Y(e.a+e.b)).toFixed(1)+'" fill="'+CB+'"><title>'+lbl+' · B '+fmt(e.b,0)+' kg</title></rect>'; }
    return g + '</svg>';
  }
  function daysHtml(){
    const v = S.voys[S.cur]; if(!v) return '<div class="dp-card"><div class="dp-hint">Pick a vessel in the table above (or ➕ New vessel and 💾 Save it) — its unloading days are entered here, one row per day.</div></div>';
    const C3 = hasC3(v), C4 = hasC4(v);
    const ds = voyDates(S.cur), unsaved = ds.filter(d => { const w = S.work[d]; return w && (w.res || w.u3 !== undefined || w.u4 !== undefined); }).length;
    let h = '<div class="dp-card"><div class="dp-h">📅 Unloading days — '+esc(v.ves)+(v.no ? ' <small>voyage '+esc(v.no)+'</small>' : '')+' <small>'+comName(v.com)+'</small>'+
      (C3 ? '<button class="eng-btn green ht-bigbtn" style="margin-left:auto" onclick="HTRH.impOpen()" title="Load the Excel files downloaded from PMS — the app splits them into days and creates the rows">📂 Load PMS file</button>' : '')+
      '<span class="ht-add"'+(C3 ? ' style="margin-left:0"' : '')+'><input type="date" value="'+esc(S.addDate || suggestDay())+'" onchange="HTRH.setAddDate(this.value)"><button class="eng-btn" onclick="HTRH.addDay()" title="Add a day by hand (e.g. butane unloading, or a day without heater)">➕ Add day</button></span>'+
      (unsaved ? '<button class="eng-btn amber" onclick="HTRH.saveAll()">💾 Save all ('+unsaved+')</button>' : '')+
      (C3 ? '<label class="eng-btn blue ht-filebtn" title="Pick the Heater 연료 사용량 master file — the app writes this voyage\'s hourly sheet + Sumary row (re-exporting updates the same sheet) and downloads it">⬇ Heater report file<input type="file" accept=".xlsx" onchange="HTRH.report(this)"></label>' : '')+'</div>';
    if(S.imp) h += impHtml();
    else if(C3 && !ds.some(d => S.days[d] && S.days[d].vk === S.cur && S.days[d].h))
      h += '<div class="ht-first">📂 No PMS data yet for this vessel — press <b>Load PMS file</b>. On the first import you pick the <b>START</b> of the heater run; from then on every import just continues, the day rows are created automatically and you only type the <b>Unloaded (t)</b>.</div>';
    if(C3 && v.rs) h += '<div class="dp-hint">Heater run: START <b>'+esc(v.rs)+'</b>'+(v.rf ? ' · FINISH <b>'+esc(v.rf)+'</b>' : ' · not finished yet')+'</div>';
    h += '<div class="dp-scroll"><table class="eng-tbl dp-tbl ht-days"><thead><tr><th>Date</th>'+
      (C3 ? '<th>PMS data</th><th>Hours</th><th>Heater A (kg)</th><th>Heater B (kg)</th><th>Heater total (kg)</th>' : '')+
      (C3 ? '<th title="Propane unloaded on this day">Unloaded C3 (t)</th>' : '')+(C4 ? '<th title="Butane unloaded on this day">Unloaded C4 (t)</th>' : '')+
      (C3 ? '<th>Checks</th>' : '')+'<th></th></tr></thead><tbody>';
    if(!ds.length) h += '<tr><td colspan="11" class="td-c dp-na">No day yet'+(C3 ? ' — 📂 Load PMS file creates them' : ' — ➕ Add day')+'.</td></tr>';
    let s3 = 0, s4 = 0, sa = 0, sb = 0;
    ds.slice().reverse().forEach(d => {
      const w = S.work[d], r = S.days[d], mine = r && (r.vk === S.cur || !r.vk) ? r : null, x = view(d) || {}, ks = Object.keys(x.h || {}).sort();
      s3 += num(x.u3) || 0; s4 += num(x.u4) || 0; sa += x.a || 0; sb += x.b || 0;
      const cov = ks.length ? ks[0].slice(0,2)+':'+ks[0].slice(2)+' → '+ks[ks.length-1].slice(0,2)+':'+ks[ks.length-1].slice(2) : '';
      const chk = w && w.res ? w.res.chk : [];
      const worst = chk.some(c => c.lvl === 'bad') ? 'bad' : chk.some(c => c.lvl === 'warn') ? 'warn' : chk.length ? 'info' : '';
      const dirty = w && w.res;
      const lastK = ks[ks.length-1] || '', full = lastK === '2400' || (v.rf && d === String(v.rf).slice(0, 10));
      const fcell = mine && mine.h ? (full ? '<span class="dp-okt">✓ complete</span>' : '<span class="dp-offt" title="The next PMS import completes this day">partial — until '+lastK.slice(0,2)+':'+lastK.slice(2)+'</span>')+' <small class="dp-by">'+esc(mine.by || '')+'</small>'
        : mine ? '<small class="dp-by">'+esc(mine.src || 'manual')+'</small>' : '<small class="dp-na">no heater data</small>';
      const other = C3 && r && r.vk && r.vk !== S.cur && (r.h || +r.a || +r.b);
      const uIn = (prod, val) => '<td class="td-c"><input class="ht-unl'+(val == null || val === '' ? ' ht-todo' : '')+'" inputmode="decimal" value="'+esc(val == null ? '' : val)+'" placeholder="type t" title="Enter or click elsewhere = saved" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="HTRH.setUnl(\''+d+'\',\''+prod+'\',this.value)"></td>';
      h += '<tr class="'+(dirty ? 'ht-dirty' : '')+'"><td class="td-c"><b>'+dmy(d)+'</b>'+(other ? '<br><small class="dp-offt" title="Heater data of this day belongs to that vessel">heater: '+esc(r.ves || r.vk)+'</small>' : '')+'</td>'+
        (C3 ? '<td>'+fcell+'</td><td class="td-c">'+cov+'</td><td class="td-r">'+(x.a == null ? '' : fmt(x.a,0))+'</td><td class="td-r">'+(x.b == null ? '' : fmt(x.b,0))+'</td><td class="td-r"><b>'+(x.a == null && x.b == null ? '' : fmt((x.a||0)+(x.b||0),0))+'</b></td>' : '')+
        (C3 ? uIn('c3', x.u3) : '')+(C4 ? uIn('c4', x.u4) : '')+
        (C3 ? '<td>'+(chk.length ? '<details class="ht-chk '+worst+'"><summary>'+(worst === 'bad' ? '⛔' : worst === 'warn' ? '⚠' : 'ℹ')+' '+chk.length+'</summary><ul class="dp-al">'+chk.map(c => '<li class="dp-'+c.lvl+'">'+esc(c.t)+'</li>').join('')+'</ul></details>' : (w && w.res ? '<span class="dp-okt">✓</span>' : ''))+'</td>' : '')+
        '<td class="td-c ht-act">'+(dirty ? '<button class="eng-btn green" onclick="HTRH.saveDay(\''+d+'\')">💾 Save</button><button class="dp-x" title="Discard what is not saved" onclick="HTRH.dropWork(\''+d+'\')">↺</button>' : x.saved || mine ? '<span class="dp-okt">✓ saved</span>' : '')+
        (mine && mine.vk === S.cur && !dirty ? '<button class="dp-x" title="Delete the heater data of this day" onclick="HTRH.delDay(\''+d+'\')">✕</button>' : '')+'</td></tr>';
    });
    if(ds.length > 1) h += '<tr class="ht-tot"><td class="td-c">TOTAL</td>'+(C3 ? '<td></td><td></td><td class="td-r">'+fmt(sa,0)+'</td><td class="td-r">'+fmt(sb,0)+'</td><td class="td-r">'+fmt(sa+sb,0)+'</td><td class="td-r">'+fmt(s3,3)+'</td>' : '')+(C4 ? '<td class="td-r">'+fmt(s4,3)+'</td>' : '')+(C3 ? '<td></td>' : '')+'<td></td></tr>';
    h += '</tbody></table></div>';
    const hc = C3 ? hourChart(S.cur) : '';
    if(hc) h += '<div class="dp-h" style="margin-top:10px">📊 Hourly heater consumption of this voyage (kg) <span class="dp-lg"><span><i style="background:'+CA+'"></i>Heater A</span><span><i style="background:'+CB+'"></i>Heater B</span><span>┆ midnight</span></span></div>'+hc;
    return h + '</div>';
  }
  function render(){
    const w = $('htrHistWrap'); if(!w) return;
    if(!S.loaded){ w.innerHTML = '<div class="dp-empty">'+(S.loading ? '⏳ Loading heater data…' : '')+'</div>'; return; }
    const keep = w.scrollTop;
    const sc = document.getElementById('htImpScroll'), keepT = sc ? sc.scrollTop : 0;
    w.innerHTML = voyHtml() + daysHtml() + histHtml();
    w.scrollTop = keep;
    const sc2 = document.getElementById('htImpScroll'); if(sc2) sc2.scrollTop = keepT;
    impJump();
  }
  function delDay(d){
    if(!mayWrite('eng_heat')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    if(!confirm('Delete the heater record of '+dmy(d)+'?\n(The Cavern Daily entry of that day is not touched.)')) return;
    firebase.database().ref('heater_day/'+d).remove().then(() => { delete S.days[d]; toastM('🗑 '+dmy(d)+' deleted', 'ok'); render(); syncMail(); })
      .catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }
  /* email P5 ▸ 💾 (HTR.saveCavern) — vẫn ghi lịch sử theo ngày như v4.196 */
  async function savePmsRun(D, o){
    if(!mayWrite('eng_heat') || !D || !D.length) return;
    const now = Date.now(), by = userName()+' (PMS)', up = {};
    D.forEach(d => { if(d.total > 0) up['heater_day/'+d.date+'/a'] = Math.round(d.a), up['heater_day/'+d.date+'/b'] = Math.round(d.b),
      up['heater_day/'+d.date+'/ves'] = o.vessel || '', up['heater_day/'+d.date+'/src'] = 'PMS', up['heater_day/'+d.date+'/by'] = by, up['heater_day/'+d.date+'/_ts'] = now; });
    if(Object.keys(up).length) await firebase.database().ref().update(up);
    if(S.loaded) load(true);
  }
  function range(k){ S.range = k; render(); }
  function loadAll(){ S.range = 'all'; load(true, true); }
  function refresh(){ if(!S.loaded) load(); else render(); }
  function view_(){ refresh(); }             /* tương thích v4.196 (nút History / PMS run đã bỏ) */
  function afterImport(){ if(S.loaded) load(true); }
  /* dùng cho SAP WMS / báo cáo sau này: số của một ngày */
  /* SAP WMS / báo cáo sau này: số của một ngày — heater + unloading C3/C4 cộng mọi tàu (chỉ dữ liệu đã tải) */
  function dayInfo(d){
    const r = S.days[d] || {}, o = { a:+r.a || 0, b:+r.b || 0, c3:0, c4:0, vessels:[] };
    Object.keys(S.voys).forEach(k => { const x = ((S.voys[k] || {}).d || {})[d]; if(!x) return;
      o.c3 += num(x.c3) || 0; o.c4 += num(x.c4) || 0; o.vessels.push({ vk:k, ves:S.voys[k].ves || '', c3:num(x.c3), c4:num(x.c4) }); });
    if(!o.vessels.length && num(r.unl) != null) o.c3 = num(r.unl);
    return (S.days[d] || o.vessels.length) ? o : null;
  }
  return { refresh, render, loadAll, range, view:view_, delDay, savePmsRun, afterImport, dayInfo,
           pick, newVoy, editVoy, vset, saveVoy, pasteOpen, pasteClose, pasteIn, pasteUse, onPaste, delVoy, impOpen, impClose, impFiles, impAssign, impSwap, impSet, impApply, addDay, setAddDate, files, assign, swap, setUnl, dropWork, saveDay, saveAll, report, syncMail,
           get S(){ return S; }, _test:{ parseItin, firstDate, impPreview, dayWin, impRows, impTable, days, voys, findings, compute, hCalc, voyPts, voyDates, view } };
})();
