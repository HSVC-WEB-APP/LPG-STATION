/* ============================================================
 * BSXL — bsxl.js  (v4.180 · gốc v4.173)
 * ------------------------------------------------------------
 * GHI SỐ NGÀY VÀO FILE "LPG Cavern_SAP WMS Batch Stock_2026_r2.xlsx"
 * (sheet Propane + Butane). MỘT LOGIC DUY NHẤT cho hai chỗ dùng:
 *   • LPG SALES ▸ SAP ▸ 📑 SAP WMS Report (swr.js) — import file ⇒ xuất file
 *   • ✉ REPORT MAIL ▸ P6 (mail.js) — điền rồi đính kèm thư
 *
 * ⭐ v4.180 — KHÔNG ĐIỀN SỐ ĐOÁN. Mỗi ô nhập thuộc một MỤC (item) của ngày:
 *     data  — app CÓ số (người gõ / TL / WMS ST / Vessel / FEED OL1 / giá)
 *     zero  — không có số, nhân viên XÁC NHẬN "hôm đó = 0"      ⇒ ghi 0
 *     prev  — (chỉ đơn giá) nhân viên xác nhận "giá không đổi"  ⇒ ô = công thức
 *             trỏ dòng trên (y như file làm tay)
 *     ok    — (chỉ TL) có dòng chưa phân loại D/E, nhân viên xác nhận dùng phần
 *             đã phân loại
 *     skip  — nhân viên xác nhận BỎ QUA ⇒ ô để TRỐNG + TÔ VÀNG trong Excel
 *     miss / check — CHƯA quyết ⇒ build() TỪ CHỐI xuất, liệt kê cho người dùng
 *   Không còn: lấy giá ngày trước một cách âm thầm, mức OL1 tạm tính, hay số 0
 *   tự điền khi nguồn trống.
 *   Quyết định zero/prev/ok/skip là dữ liệu NGƯỜI CHỌN ⇒ lưu Firebase
 *   `sapwms_ok/<ngày>/<mục>` = {v, by, at} (nhỏ, chỉ ghi khi bấm). Có số thật
 *   thì số thật luôn thắng cờ.
 *
 * Cách file gốc được làm tay (đã soi file thật 23/09/2026):
 *   • Mỗi ngày MỘT dòng, cột A = ngày (serial Excel). Dòng tương lai có sẵn
 *     ngày + style nhưng CHƯA có công thức.
 *   • Công thức cuộn dạng shared-formula ⇒ chép xuống chỉ cần DỊCH số dòng.
 *   • Ô nhập tay: VLGC, Get-out theo batch, chuyển kho vào bồn (AC/AD C3,
 *     R/S C4 = ST thuần), OL1 X + TỔNG, ship/pure/heater, GI theo bồn, đơn giá.
 *   • Đơn giá: chỉ 6 cột là ô nhập (C3 BH BJ BL BS · C4 AM AT). BN/BP (C3) và
 *     AO/AQ (C4) LUÔN là công thức = cột bên trái ⇒ chép công thức như mọi cột
 *     tính khác. Ngày giá không đổi, file tay để công thức "= ô dòng trên".
 * Sửa XML trực tiếp bằng JSZip nên style · merge · định dạng giữ nguyên;
 * ô bỏ qua được gán một style CLONE có nền vàng (thêm vào styles.xml).
 * ============================================================ */
const BSXL = (function(){
  'use strict';

  /* ── cột nhập tay mà app QUẢN (ghi đè mỗi lần xuất) ── */
  const IN_C3 = ['J','K','N','O','P','Q','AC','AD','AL','AO','AQ','AR','AS','AW','AX','BB','BC','BD'];
  const IN_C4 = ['H','I','L','M','R','S','X','Y','AB','AC','AG','AH','AI'];
  /* ô nhập tay app KHÔNG quản — không chép công thức, không ghi */
  const KEEP_C3 = ['U','X','AA','AG','AJ','AM','AT','BT','BU'];
  const KEEP_C4 = ['AU','AV'];
  /* đơn giá NHẬP: cột → khoá giá của CAV (cavern_price) */
  const PRICE_C3 = { BH:'pP', BJ:'pXP', BL:'pD1', BS:'pE1' };
  const PRICE_C4 = { AM:'pD1c4', AT:'pE1c4' };
  const PRICE_LBL = { pP:'C3 PETCHEM 1100', pXP:'C3 EX-PETCHEM 1100', pD1:'C3 Domestic (1100 · 2100 · 2101)', pE1:'C3 Export 1100',
                      pD1c4:'C4 Domestic (1100 · 2100 · 2101)', pE1c4:'C4 Export 1100' };

  /* ── MỤC kiểm của một ngày. c3/c4 = cột Excel; g: man (người gõ) · app (TL/WMS/Vessel) · price ── */
  const ITEMS = [
    { k:'vlgcin',  g:'man', lbl:'VLGC get-in (보세창고 입고)', c3:['J'], c4:['H'], kind:'vlgc',    prods:['c3','c4'] },
    { k:'vlgcout', g:'man', lbl:'VLGC get-out (출고)',          c3:['K'], c4:['I'], kind:'vlgcout', prods:['c3','c4'] },
    { k:'grP', g:'man', lbl:'Bonded get-out P → 1100 (통관)',  c3:['N'], c4:[],    kind:'gr', batch:'P', prods:['c3'] },
    { k:'grX', g:'man', lbl:'Bonded get-out X → 1100 (통관)',  c3:['O'], c4:[],    kind:'gr', batch:'X', prods:['c3'] },
    { k:'grD', g:'man', lbl:'Bonded get-out D → 1100 (통관)',  c3:['P'], c4:['L'], kind:'gr', batch:'D', prods:['c3','c4'] },
    { k:'grE', g:'man', lbl:'Bonded get-out E → 1100 (통관)',  c3:['Q'], c4:['M'], kind:'gr', batch:'E', prods:['c3','c4'] },
    { k:'heater', g:'man', lbl:'Heater C3 (B100)',              c3:['AS'], c4:[],   kind:'heater', batch:'D', prods:['c3'] },
    { k:'ol1x', g:'man', lbl:'OL1 X — weekly plan',             c3:['AL'], c4:[],   prods:['c3'] },
    { k:'ol1t', g:'man', lbl:'OL1 feed total (P + X)',          c3:['AO'], c4:[],   prods:['c3'] },
    { k:'ws', g:'app', lbl:'WMS ST — ball-tank transfer',        c3:['AC','AD'], c4:['R','S'] },
    { k:'tl', g:'app', lbl:'TL Data — truck GI (Domestic · Export · Pure)', c3:['AR','AW','AX','BC','BD'], c4:['Y','AB','AC','AH','AI'] },
    { k:'vessel', g:'app', lbl:'Vessel GI (Vessel tab)',         c3:['AQ','BB'], c4:['X','AG'] }
  ];
  Object.keys(PRICE_C3).forEach(c => ITEMS.push({ k:'price:'+PRICE_C3[c], g:'price', pkey:PRICE_C3[c], lbl:'Price '+PRICE_LBL[PRICE_C3[c]], c3:[c], c4:[] }));
  Object.keys(PRICE_C4).forEach(c => ITEMS.push({ k:'price:'+PRICE_C4[c], g:'price', pkey:PRICE_C4[c], lbl:'Price '+PRICE_LBL[PRICE_C4[c]], c3:[], c4:[c] }));
  const BYKEY = {}; ITEMS.forEach(it => { BYKEY[it.k] = it; });
  /* mục nào được bấm "= 0" */
  const ZERO_OK = { vlgcin:1, vlgcout:1, grP:1, grX:1, grD:1, grE:1, heater:1, ol1x:1, ol1t:1, ws:1, tl:1, vessel:1 };

  const T = kg => Math.round((+kg || 0)) / 1000;           /* kg → tấn, 3 số lẻ */
  function colNum(L){ let n = 0; for(const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
  function serialOf(iso){ const p = iso.split('-'); return Math.round((Date.UTC(+p[0], +p[1]-1, +p[2]) - Date.UTC(1899, 11, 30)) / 864e5); }
  function isoOfSerial(n){ const d = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return d.toISOString().slice(0,10); }
  function isoAdd(iso, k){ return isoOfSerial(serialOf(iso) + k); }

  /* ── dịch tham chiếu TƯƠNG ĐỐI trong công thức: d dòng, dc cột (bỏ qua chuỗi "…") ── */
  function colName(n){ let s = ''; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function shiftRefs(f, d, dc){
    d = d || 0; dc = dc || 0;
    if(!d && !dc) return f;
    return String(f).split('"').map((seg, i) => (i % 2) ? seg :
      seg.replace(/(^|[^A-Za-z0-9_$.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(A-Za-z_])/g,
        (m, pre, d1, col, d2, row) => pre + d1 + (d1 ? col : colName(colNum(col) + dc)) + d2 + (d2 ? row : String(+row + d))))
      .join('"');
  }


  /* ═════ CỜ QUYẾT ĐỊNH (Firebase sapwms_ok) — người chọn ⇒ được lên Firebase ═════ */
  const FB_OK = 'sapwms_ok';
  let FLAGS = {}, _okRef = null, _okFrom = '';
  const _fetched = {}, _subs = [];
  function _db(){ return (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null; }
  function _who(){ try{ return (typeof CURRENT_USER !== 'undefined' && (CURRENT_USER.name || CURRENT_USER.email)) || '?'; }catch(_){ return '?'; } }
  function _todayIso(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function onChange(fn){ if(typeof fn === 'function') _subs.push(fn); }
  function _emit(){ _subs.forEach(f => { try{ f(); }catch(e){ console.warn('[BSXL] listener', e); } }); }
  /* listener nhỏ: chỉ ~90 ngày gần nhất (mỗi ngày vài khoá) */
  function attach(){
    if(_okRef) return;
    const db = _db(); if(!db) return;
    _okFrom = isoAdd(_todayIso(), -90);
    _okRef = db.ref(FB_OK).orderByKey().startAt(_okFrom);
    const put = s => { FLAGS[s.key] = s.val() || {}; _emit(); };
    _okRef.on('child_added', put, e => console.warn('[BSXL] flags', e));
    _okRef.on('child_changed', put);
    _okRef.on('child_removed', s => { delete FLAGS[s.key]; _emit(); });
  }
  /* ngày cũ hơn cửa sổ listener ⇒ đọc MỘT lần */
  function ensure(dates){
    attach();
    const db = _db(); if(!db) return Promise.resolve();
    const need = (dates || []).filter(d => d < _okFrom && !_fetched[d]);
    return Promise.all(need.map(d => db.ref(FB_OK + '/' + d).once('value').then(s => { _fetched[d] = 1; FLAGS[d] = s.val() || {}; })))
      .then(() => { if(need.length) _emit(); });
  }
  function flagOf(date, key){ const f = FLAGS[date] && FLAGS[date][key]; return f ? (f.v || '') : ''; }
  function flagInfo(date, key){ return (FLAGS[date] && FLAGS[date][key]) || null; }
  function setFlag(date, key, v){
    if(!BYKEY[key]) return Promise.reject(new Error('Unknown item '+key));
    if(typeof canWrite === 'function' && !canWrite('sap')) return Promise.reject(new Error('No write permission (SAP)'));
    if(v && !({ zero:1, skip:1, prev:1, ok:1 })[v]) return Promise.reject(new Error('Bad decision '+v));
    const rec = v ? { v, by:_who(), at:Date.now() } : null;
    FLAGS[date] = Object.assign({}, FLAGS[date]);
    if(rec) FLAGS[date][key] = rec; else delete FLAGS[date][key];
    _emit();
    try{ logAudit('sapwms:flag', date, key, v || 'clear', '', 'update'); }catch(_){}
    const db = _db(); if(!db) return Promise.resolve();
    attach();
    return db.ref(FB_OK + '/' + date + '/' + key).set(rec);
  }

  /* ═════ ĐÁNH GIÁ MỘT MỤC TRONG MỘT NGÀY ═════
     trả { it, date, has, check, vals:{c3:{col:kg|$},c4:{…}}, status, info } */
  function _S(){ const S = (typeof CAV !== 'undefined' && CAV.src) ? CAV.src : null; if(!S) throw new Error('CAV module not loaded'); return S; }
  function _cavRows(){ try{ return (typeof CAV !== 'undefined' && CAV.ROWS) ? CAV.ROWS : []; }catch(_){ return []; } }
  function evalItem(it, date, ctx){
    const S = _S();
    ctx = ctx || {};
    const A = ctx.A || (ctx.A = S.agg(date));
    const o = { it, date, has:false, check:false, vals:{ c3:{}, c4:{} }, info:'' };
    const set = (p, col, v) => { o.vals[p][col] = v; };
    if(it.kind){
      const rows = _cavRows().filter(r => r && r.date === date && r.kind === it.kind && (!it.batch || r.batch === it.batch) && it.prods.indexOf(r.prod) >= 0);
      o.has = rows.length > 0;
      const src = it.kind === 'gr' ? A.gr[it.batch] : A[it.kind];
      it.c3.forEach(c => set('c3', c, src.c3)); it.c4.forEach(c => set('c4', c, src.c4));
      if(o.has) o.info = rows.length+' entr'+(rows.length > 1 ? 'ies' : 'y');
    } else if(it.k === 'ol1x' || it.k === 'ol1t'){
      const ol = ctx.ol || (ctx.ol = S.ol1(date));
      const v = it.k === 'ol1x' ? ol.x : ol.t;
      o.has = v != null; set('c3', it.c3[0], v);
      if(it.k === 'ol1x'){
        if(!ol.xAt) o.info = 'No weekly X plan imported yet';
        else if(Date.now() - ol.xAt > 8 * 864e5) o.info = 'Weekly X plan is '+Math.floor((Date.now() - ol.xAt) / 864e5)+' days old';
      } else o.info = 'Saved in SAP ▸ Bonded ▸ FEED OL1 — the assumed 2,000 T is never used';
    } else if(it.k === 'ws'){
      const w = ctx.ws || (ctx.ws = S.ws(date));
      o.has = w.n > 0;
      set('c3','AC', w.net['2100'].c3); set('c3','AD', w.net['2101'].c3);
      set('c4','R',  w.net['2100'].c4); set('c4','S',  w.net['2101'].c4);
      o.info = o.has ? w.n+' transfer row(s)' : 'No WMS ST row for this day';
    } else if(it.k === 'tl'){
      const t = ctx.tl || (ctx.tl = S.tl(date));
      o.has = t.n > 0; o.check = o.has && t.unc && t.unc.length > 0;
      set('c3','AR', t.pure.c3); set('c3','AW', t.dom['2100'].c3); set('c3','AX', t.dom['2101'].c3);
      set('c3','BC', t.exp['2100'].c3); set('c3','BD', t.exp['2101'].c3);
      set('c4','Y', t.pure.c4); set('c4','AB', t.dom['2100'].c4); set('c4','AC', t.dom['2101'].c4);
      set('c4','AH', t.exp['2100'].c4); set('c4','AI', t.exp['2101'].c4);
      o.info = !o.has ? 'No TL Data GI row for this day'
             : o.check ? t.unc.length+' row(s) not classified Domestic/Export: '+t.unc.slice(0,4).map(u => u.k+' ('+(u.tank||'?')+')').join(', ')+(t.unc.length > 4 ? '…' : '')
             : t.n+' GI row(s)';
    } else if(it.k === 'vessel'){
      const v = ctx.vs || (ctx.vs = S.vs(date));
      o.has = v.n > 0;
      set('c3','AQ', v.dom.c3); set('c3','BB', v.exp.c3); set('c4','X', v.dom.c4); set('c4','AG', v.exp.c4);
      o.info = o.has ? v.n+' vessel row(s)' : 'No vessel GI in the Vessel tab';
    } else if(it.g === 'price'){
      const f = S.price(date, it.pkey) || {};
      o.has = f.val != null && !f.prev;
      const col = (it.c3[0] || it.c4[0]), p = it.c3.length ? 'c3' : 'c4';
      set(p, col, o.has ? f.val : null);
      const pv = _prevPrice(date, it.pkey);
      o.prevVal = pv ? pv.val : null; o.prevDate = pv ? pv.src : '';
      o.info = o.has ? '' : (pv ? 'Last price '+pv.val+' on '+pv.src : 'No earlier price in the app');
    }
    /* v4.193 — GỢI Ý từ nguồn khác (KHÔNG tự ghi): get-out 통관 = SAP 1100 GR theo loại batch; heater = SAP B100 GI,
       SAP chưa dán thì lấy số PMS đang nạp ở Engineer ▸ Heater. Người dùng bấm "Use" mới thành số thật. */
    if(!o.has && (it.kind === 'gr' || it.kind === 'heater')){
      try{
        const sp = ctx.sp || (ctx.sp = S.sap(date));
        if(sp && sp.n && (sp.slocs['1100'] || sp.slocs['B100'])){
          if(it.kind === 'gr') o.sug = { c3:it.c3.length ? Math.max(0, sp.GR('1100', it.batch, 'C3')) : null, c4:it.c4.length ? Math.max(0, sp.GR('1100', it.batch, 'C4')) : null, src:'SAP 1100 · GR of batch '+it.batch };
          else if(sp.slocs['B100']) o.sug = { c3:sp.b100.c3, c4:null, src:'SAP B100 · GI' };
        }
        if(!o.sug && it.kind === 'heater' && typeof HTR !== 'undefined' && HTR.days){
          const d = (HTR.days() || []).find(x => x.date === date);
          if(d) o.sug = { c3:d.total || 0, c4:null, src:'PMS heater data (Engineer ▸ Heater)' };
        }
      }catch(_){}
    }
    /* OL1 X: FEED OL1 (SAP ▸ Bonded) có cột X gõ/import theo ngày ⇒ gợi ý */
    if(!o.has && it.k === 'ol1x'){
      try{ const U = (typeof BOND !== 'undefined' && BOND._state) ? BOND._state.USE : null, u = U && U[date];
        const x = u && String(u.x == null ? '' : u.x).trim() !== '' ? +String(u.x).replace(/,/g,'') : NaN;
        if(isFinite(x) && x >= 0) o.sug = { c3:x, c4:null, src:'FEED OL1 · X of this day' }; }catch(_){}
    }
    const fl = flagOf(date, it.k);
    if(o.has && !o.check) o.status = 'data';
    else if(o.has && o.check) o.status = (fl === 'ok' || fl === 'skip') ? fl : 'check';
    else if(fl === 'skip') o.status = 'skip';
    else if(fl === 'zero' && ZERO_OK[it.k]) o.status = 'zero';
    else if(fl === 'prev' && it.g === 'price') o.status = 'prev';
    else o.status = 'miss';
    o.flag = flagInfo(date, it.k);
    o.done = o.status !== 'miss' && o.status !== 'check';
    return o;
  }
  /* giá gần nhất TRƯỚC ngày (chỉ để GỢI Ý nút "giá không đổi", không tự dùng) */
  function _prevPrice(date, key){
    try{ const d = isoAdd(date, -1); const f = _S().price(d, key); return (f && f.val != null) ? { val:f.val, src:f.src || d } : null; }catch(_){ return null; }
  }
  /* giá để HIỂN THỊ (thân email P6): số của ngày; cờ prev ⇒ số dòng trên; không thì null */
  function priceShown(date, key){
    const S = _S(); const f = S.price(date, key) || {};
    if(f.val != null && !f.prev) return f.val;
    if(flagOf(date, 'price:' + key) === 'prev'){ const p = _prevPrice(date, key); return p ? p.val : null; }
    return null;
  }

  /* ═════ KIỂM CẢ DÃY NGÀY — một nguồn cho SAP tab và email P6 ═════ */
  function check(dates){
    const out = { dates:(dates || []).slice(), rows:[], open:0, info:[] };
    out.dates.forEach(d => {
      const ctx = {};
      ITEMS.forEach(it => { const r = evalItem(it, d, ctx); out.rows.push(r); if(!r.done) out.open++; });
      try{ const sp = _S().sap(d); if(!sp.n) out.info.push(d+': SAP not pasted for this day — the closing stock cannot be cross-checked.'); }catch(_){}
    });
    return out;
  }

  /* ═════ SỐ GHI VÀO FILE CỦA MỘT NGÀY ═════
     { c3:{ v:{col:số|null}, raw:{col:1 (giá, không đổi đơn vị)}, yel:{col:1}, prev:{col:1} }, c4:…, rows } */
  function dayData(date){
    const ctx = {}, D = { c3:{ v:{}, raw:{}, yel:{}, prev:{} }, c4:{ v:{}, raw:{}, yel:{}, prev:{} }, rows:[] };
    ITEMS.forEach(it => {
      const r = evalItem(it, date, ctx); D.rows.push(r);
      ['c3','c4'].forEach(p => it[p].forEach(col => {
        const TT = D[p];
        if(it.g === 'price') TT.raw[col] = 1;
        if(r.status === 'data' || r.status === 'ok') TT.v[col] = r.vals[p][col] == null ? null : r.vals[p][col];
        else if(r.status === 'zero') TT.v[col] = 0;
        else if(r.status === 'prev') TT.prev[col] = 1;
        else { TT.v[col] = null; TT.yel[col] = 1; }                  /* skip (và miss khi ép xuất) ⇒ trống + vàng */
      }));
    });
    return D;
  }

  /* ═════ styles.xml — clone style có nền VÀNG cho ô bỏ qua ═════ */
  const YEL_FILL = '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>';
  function stylesKit(xml){
    const fm = xml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/);
    const fills = fm ? (fm[1].match(/<fill\b[^>]*\/>|<fill\b[\s\S]*?<\/fill>/g) || []) : [];
    const xm = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    const xfs = xm ? (xm[1].match(/<xf\b[^>]*?\/>|<xf\b[^>]*?>[\s\S]*?<\/xf>/g) || []) : [];
    const n0f = fills.length, n0x = xfs.length;
    const isYelFill = f => !!f && /patternType="solid"/.test(f) && /<fgColor[^>]*rgb="FFFFFF00"/i.test(f);
    let yel = fills.findIndex(isYelFill);
    const memo = {};
    const fillOf = i => { const m = String(xfs[i] || '').match(/\bfillId="(\d+)"/); return m ? +m[1] : 0; };
    const norm = x => String(x || '').replace(/\s*\bfillId="\d+"/, '').replace(/\s*\bapplyFill="\d"/, '');
    function isYellow(s){ const i = s == null ? 0 : +s; return isYelFill(fills[fillOf(i)]); }
    function yellow(s){
      const i = s == null ? 0 : +s;
      if(isYellow(i)) return String(i);
      if(memo[i] != null) return memo[i];
      if(yel < 0){ yel = fills.length; fills.push(YEL_FILL); }
      let x = xfs[i] || '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>';
      x = /\bfillId="/.test(x) ? x.replace(/\bfillId="\d+"/, 'fillId="'+yel+'"') : x.replace(/^<xf\b/, '<xf fillId="'+yel+'"');
      x = /\bapplyFill="/.test(x) ? x.replace(/\bapplyFill="\d"/, 'applyFill="1"') : x.replace(/^<xf\b/, '<xf applyFill="1"');
      xfs.push(x); memo[i] = String(xfs.length - 1);
      return memo[i];
    }
    /* ô từng bị tô vàng ở lần xuất trước mà nay có số ⇒ trả về style gốc (cùng mọi thứ trừ nền) */
    function plain(s){
      const i = s == null ? 0 : +s;
      if(!isYellow(i)) return s;
      const key = norm(xfs[i]);
      for(let j = 0; j < xfs.length; j++){ if(j !== i && !isYellow(j) && norm(xfs[j]) === key) return String(j); }
      return s;
    }
    function toXml(){
      if(fills.length === n0f && xfs.length === n0x) return xml;
      let out = xml;
      if(fills.length > n0f) out = out.replace(/<fills\b[^>]*>[\s\S]*?<\/fills>/, () => '<fills count="'+fills.length+'">'+fills.join('')+'</fills>');
      if(xfs.length > n0x) out = out.replace(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/, () => '<cellXfs count="'+xfs.length+'">'+xfs.join('')+'</cellXfs>');
      return out;
    }
    return { yellow, plain, isYellow, toXml };
  }

  /* ═════ XML helpers ═════ */
  function rowRe(r){ return new RegExp('<row r="'+r+'"[^>]*?(?:/>|>[\\s\\S]*?</row>)'); }
  function cellsOf(rowXml){
    const out = {}; const re = /<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let m;
    while((m = re.exec(rowXml))){
      const attrs = m[3], inner = m[4] || '';
      const sm = attrs.match(/\bs="(\d+)"/), tm = attrs.match(/\bt="(\w+)"/);
      const fm = inner.match(/<f\b[^>]*>([\s\S]*?)<\/f>/), vm = inner.match(/<v>([\s\S]*?)<\/v>/);
      const sim = inner.match(/<f\b[^>]*\bsi="(\d+)"[^>]*\/>/);
      out[m[1]] = { s: sm ? sm[1] : null, t: tm ? tm[1] : null, f: fm ? fm[1] : null,
                    fEmpty: /<f\b[^>]*\/>/.test(inner), si: sim ? sim[1] : null, v: vm ? vm[1] : null };
    }
    return out;
  }
  function xmlEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function xmlUnesc(s){ return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'); }
  function cellXml(ref, s, kind, val){
    const sa = s != null ? ' s="'+s+'"' : '';
    if(kind === 'f') return '<c r="'+ref+'"'+sa+'><f>'+xmlEsc(val)+'</f></c>';
    if(kind === 'n') return '<c r="'+ref+'"'+sa+'><v>'+val+'</v></c>';
    return '<c r="'+ref+'"'+sa+'/>';
  }
  /* thay/chèn MỘT ô trong chuỗi XML của dòng, giữ đúng thứ tự cột */
  function putCell(rowXml, col, r, xml){
    const ref = col + r;
    const re = new RegExp('<c r="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?</c>)');
    if(re.test(rowXml)) return rowXml.replace(re, () => xml);
    const n = colNum(col);
    const cre = /<c r="([A-Z]+)\d+"/g; let m, at = -1;
    while((m = cre.exec(rowXml))){ if(colNum(m[1]) > n){ at = m.index; break; } }
    if(rowXml.endsWith('/>')) rowXml = rowXml.slice(0, -2) + '></row>';
    if(at < 0) return rowXml.replace(/<\/row>$/, () => xml + '</row>');
    return rowXml.slice(0, at) + xml + rowXml.slice(at);
  }
  function hasFormulas(cells){ return Object.values(cells).some(c => c.f || c.fEmpty); }
  /* dòng theo ngày: quét cột A */
  function findDateRows(xml){
    const map = {}; const re = /<row r="(\d+)"[^>]*>(?:[\s\S]*?)<\/row>/g; let m;
    while((m = re.exec(xml))){
      const am = m[0].match(/<c r="A\d+"[^>]*>\s*<v>(\d+(?:\.\d+)?)<\/v>/);
      if(am){ const n = Math.floor(+am[1]); if(n > 40000 && n < 60000) map[isoOfSerial(n)] = +m[1]; }
    }
    return map;
  }

  /* công thức của ô "con" shared (<f t="shared" si="N"/>) = công thức master dịch theo vị trí */
  function sharedText(xml, si, col, row){
    const re = new RegExp('<c r="([A-Z]+)(\\d+)"[^>]*>\\s*<f t="shared" ref="[^"]*" si="'+si+'">([\\s\\S]*?)</f>');
    const m = xml.match(re); if(!m) return null;
    return shiftRefs(xmlUnesc(m[3]), row - (+m[2]), colNum(col) - colNum(m[1]));
  }
  function resolveShared(xml, cells, row){
    Object.keys(cells).forEach(col => {
      const c = cells[col];
      if(c.f || !c.fEmpty || !c.si) return;
      const t = sharedText(xml, c.si, col, row);
      if(t != null){ c.f = xmlEsc(t); c.fEmpty = false; }
    });
    return cells;
  }

  /* ═════ ghi MỘT sheet cho dãy ngày ═════ */
  function writeSheet(xml, prod, dates, dataOf, K, log){
    const IN = prod === 'c3' ? IN_C3 : IN_C4, KEEP = prod === 'c3' ? KEEP_C3 : KEEP_C4;
    const PR = prod === 'c3' ? PRICE_C3 : PRICE_C4;
    const ALL = IN.concat(Object.keys(PR));
    const rows = findDateRows(xml);
    const first = rows[dates[0]];
    if(!first) throw new Error(prod.toUpperCase()+' sheet: no row for '+dates[0]);
    /* dòng mẫu = dòng gần nhất PHÍA TRÊN có công thức */
    let src = first - 1, srcCells = null;
    for(; src > 5; src--){
      const m = xml.match(rowRe(src)); if(!m) continue;
      const c = cellsOf(m[0]); if(hasFormulas(c)){ srcCells = resolveShared(xml, c, src); break; }
    }
    if(!srcCells) throw new Error(prod.toUpperCase()+' sheet: no filled row above '+dates[0]);
    if(Object.values(srcCells).some(c => c.fEmpty)) log && log('⚠ '+prod.toUpperCase()+': row '+src+' has a shared formula whose master was not found — that cell is not copied');
    let nYel = 0;
    dates.forEach(date => {
      const r = rows[date];
      if(!r) throw new Error(prod.toUpperCase()+' sheet: no row for '+date+' — extend the date column first');
      const m = xml.match(rowRe(r));
      let rx = m[0];
      const cur = cellsOf(rx);
      const d = r - src;
      /* 1) công thức của mọi cột tính (kể cả BN/BP · AO/AQ = đơn giá suy từ cột trái) */
      Object.keys(srcCells).forEach(col => {
        if(col === 'A' || ALL.includes(col) || KEEP.includes(col)) return;
        const sc = srcCells[col];
        if(!sc.f) return;
        const f = shiftRefs(xmlUnesc(sc.f), d);
        rx = putCell(rx, col, r, cellXml(col + r, cur[col] ? cur[col].s : sc.s, 'f', f));
      });
      /* 2) ô nhập (số lượng + đơn giá) theo quyết định của từng mục */
      const D = dataOf(date)[prod];
      ALL.forEach(col => {
        let s = cur[col] ? cur[col].s : (srcCells[col] ? srcCells[col].s : null);
        if(D.yel[col]){ s = K.yellow(s); nYel++; }
        else if(s != null && K.isYellow(s)){
          const s2 = srcCells[col] ? srcCells[col].s : null;
          s = (s2 != null && !K.isYellow(s2)) ? s2 : K.plain(s);
        }
        if(D.prev[col]){ rx = putCell(rx, col, r, cellXml(col + r, s, 'f', col + (r - 1))); return; }   /* giá không đổi = ô dòng trên */
        const v = D.v[col];
        if(v == null){ rx = putCell(rx, col, r, cellXml(col + r, s, 'e')); return; }
        rx = putCell(rx, col, r, cellXml(col + r, s, 'n', D.raw[col] ? v : T(v)));
      });
      xml = xml.replace(m[0], () => rx);
      log && log(prod.toUpperCase()+' row '+r+' ('+date+') written');
      /* dòng vừa làm thành dòng mẫu cho ngày kế tiếp */
      src = r; srcCells = cellsOf(rx);
    });
    return { xml, nYel };
  }

  async function sheetPath(zip, name){
    const wb = await zip.file('xl/workbook.xml').async('string');
    const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const m = wb.match(new RegExp('<sheet[^>]*name="'+name+'"[^>]*r:id="(rId\\d+)"'));
    if(!m) return null;
    const t = rels.match(new RegExp('Id="'+m[1]+'"[^>]*Target="([^"]+)"')) || rels.match(new RegExp('Target="([^"]+)"[^>]*Id="'+m[1]+'"'));
    return t ? 'xl/' + t[1].replace(/^\/?xl\//,'') : null;
  }

  /* Ngày trống đứng TRƯỚC ngày cần làm (từ dòng đã làm gần nhất) */
  async function plan(zip, date){
    const p = await sheetPath(zip, 'Propane');
    if(!p) throw new Error('Sheet "Propane" not found');
    const xml = await zip.file(p).async('string');
    const rows = findDateRows(xml);
    const r = rows[date];
    if(!r) throw new Error('No row for '+date+' in sheet Propane');
    let lastDone = null;
    for(let k = r - 1; k > 5; k--){ const m = xml.match(rowRe(k)); if(m && hasFormulas(cellsOf(m[0]))){ lastDone = k; break; } }
    const byRow = {}; Object.keys(rows).forEach(d => { byRow[rows[d]] = d; });
    const dates = [];
    for(let k = (lastDone || r - 1) + 1; k <= r; k++) if(byRow[k]) dates.push(byRow[k]);
    const alreadyDone = hasFormulas(cellsOf(xml.match(rowRe(r))[0]));
    return { dates: alreadyDone ? [date] : dates, alreadyDone };
  }
  async function _zip(file){ const buf = file.arrayBuffer ? await file.arrayBuffer() : file; return JSZip.loadAsync(buf); }
  /* chỉ đọc file để biết sẽ điền NHỮNG NGÀY NÀO (chưa ghi gì) */
  async function inspect(file, date){
    const zip = await _zip(file);
    const pl = await plan(zip, date);
    await ensure(pl.dates);
    return pl;
  }

  /* file (ArrayBuffer | Blob | File) + ngày ⇒ { blob, name, dates, warn, yellow }
     Còn mục CHƯA QUYẾT ⇒ ném lỗi code 'UNRESOLVED' kèm e.check (trừ khi opts.force). */
  async function build(file, date, opts){
    opts = opts || {};
    const zip = await _zip(file);
    const pl = await plan(zip, date);
    await ensure(pl.dates);
    const chk = check(pl.dates);
    if(chk.open && !opts.force){
      const e = new Error(chk.open+' item(s) still need data or a decision (enter the figure, confirm 0, or skip)');
      e.code = 'UNRESOLVED'; e.check = chk; e.dates = pl.dates; throw e;
    }
    const cache = {};
    const dataOf = d => cache[d] || (cache[d] = dayData(d));
    const log = opts.log || (() => {});
    const stP = 'xl/styles.xml';
    const K = stylesKit(zip.file(stP) ? await zip.file(stP).async('string') : '');
    let nYel = 0;
    for(const [name, prod] of [['Propane','c3'],['Butane','c4']]){
      const p = await sheetPath(zip, name);
      if(!p) throw new Error('Sheet "'+name+'" not found');
      const w = writeSheet(await zip.file(p).async('string'), prod, pl.dates, dataOf, K, log);
      zip.file(p, w.xml); nYel += w.nYel;
    }
    if(zip.file(stP)) zip.file(stP, K.toXml());
    let wb = await zip.file('xl/workbook.xml').async('string');
    if(wb.indexOf('fullCalcOnLoad') < 0){
      wb = /<calcPr\b/.test(wb) ? wb.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"') : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
      zip.file('xl/workbook.xml', wb);
    }
    if(zip.file('xl/calcChain.xml')){
      zip.remove('xl/calcChain.xml');
      const ct = await zip.file('[Content_Types].xml').async('string');
      zip.file('[Content_Types].xml', ct.replace(/<Override[^>]*calcChain[^>]*\/>/, ''));
      const rl = await zip.file('xl/_rels/workbook.xml.rels').async('string');
      zip.file('xl/_rels/workbook.xml.rels', rl.replace(/<Relationship[^>]*calcChain[^>]*\/>/, ''));
    }
    const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 },
      mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const warn = chk.info.slice();
    const skipped = chk.rows.filter(r => r.status === 'skip').map(r => r.date+' · '+r.it.lbl);
    if(skipped.length) warn.push(skipped.length+' item(s) skipped — left blank and highlighted yellow in the file: '+skipped.slice(0,6).join('; ')+(skipped.length > 6 ? '…' : ''));
    if(pl.dates.length > 1) warn.unshift('Rows for '+pl.dates.slice(0, -1).join(', ')+' were still empty — filled as well.');
    const base = String(opts.name || 'LPG Cavern_SAP WMS Batch Stock_2026_r2.xlsx').replace(/\.xlsx$/i, '');
    return { blob, name: base + '.xlsx', dates: pl.dates, warn, yellow:nYel, check:chk };
  }

  return { build, inspect, check, dayData, evalItem, priceShown, setFlag, flagOf, onChange, attach, ensure,
           ITEMS, BYKEY, ZERO_OK, PRICE_LBL, PRICE_C3, PRICE_C4,
           _shiftRefs:shiftRefs, _cellsOf:cellsOf, _findDateRows:findDateRows, _serialOf:serialOf, _stylesKit:stylesKit,
           _setFlags:o => { FLAGS = o || {}; _okFrom = '0000'; _emit(); }, IN_C3, IN_C4, isoAdd };
})();
