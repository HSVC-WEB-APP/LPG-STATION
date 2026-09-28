/* ============================================================
 * ENGX — engx.js  (v4.176)
 * v4.208: ENGX_U.dewSign — gõ dew point DƯƠNG ⇒ cảnh báo ngay (OK đổi sang âm), ô tô đỏ; dùng chung với email P3.
 * v4.206: DEWPT.c3Rows()/c3Hist() — email P3 vẽ biểu đồ Dryer A/B từ CÙNG bộ nhớ C3 (chưa mở tab thì đọc
 *         cửa sổ 2 năm một lần rồi để lại cho tab dùng tiếp).
 * ------------------------------------------------------------
 * Hai sub-tab mới của trang ENGINEER:
 *   💧 DEW POINT (DEWPT) — nhập · lưu · biểu đồ · phân tích điểm sương
 *      propane sau coalescer A/B và dryer A/B.
 *   🔥 HEATER (HTR)      — dữ liệu PMS theo phút (TagMonitoringReport) →
 *      lượng C3 heater theo ngày; TỰ NHẬN file nào là Heater A / B; điền
 *      file báo cáo "Heater 연료 사용량" rồi tải về.
 *
 * ⭐ LUẬT RAM (v4.170) + Firebase Spark:
 *   • Dew point: số NGƯỜI GÕ ⇒ node dew_point/<YYYY-MM-DD> (cùng node email
 *     P3 đang dùng — một nguồn duy nhất). Chỉ đọc cả node MỘT lần khi mở
 *     sub-tab lần đầu (lazy), không đọc lúc boot. Mọi phân tích tính ở RAM.
 *   • Heater: file PMS chỉ nằm trong RAM. Chỉ số người CHỐT (tổng theo ngày)
 *     mới ghi vào Cavern Daily (cavern_in) khi bấm 💾.
 *   • Email P5 dùng CHUNG trạng thái HTR.S — nạp file ở đâu cũng thấy ở kia.
 * Nguyên tắc "app đoán, người chốt": file không nhận ra A/B ⇒ hỏi người dùng
 * (nút gán A / B, nút ⇄ đổi chỗ), START/STOP app đề xuất nhưng sửa được.
 *
 * ⭐ v4.196 — DEW POINT có thêm C4 (node dew_point_c4/<ngày>, cùng cấu trúc):
 *   • nút C3 / C4 trong tab; mỗi sản phẩm một bộ nhớ RAM riêng.
 *   • ĐỌC THEO CỬA SỔ: mở tab ⇒ chỉ tải 2 NĂM gần nhất (orderByKey().startAt),
 *     nút ⤓ Load all mới tải hết. Không đọc gì lúc boot.
 *   • nhiều lần đo trong MỘT ngày (dữ liệu cũ nhập từ file): lần sớm nhất là bản
 *     ghi ngày, các lần sau nằm ở <ngày>/x/<HHMM> — vẽ + thống kê đủ, chỉ xoá được.
 *     save() GIỮ nguyên x (trước đây .set() sẽ xoá mất).
 *   • 📥 Import file (LABX, js/features/labx.js) nạp file tổng hợp của lab.
 * ============================================================ */

/* ── tiện ích dùng chung cho hai module ── */
const ENGX_U = (function(){
  'use strict';
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  /* số từ ô nhập: chấp nhận "−45,2", "-45.2 °C" */
  function num(v){
    if(v == null) return null;
    if(typeof v === 'number') return isFinite(v) ? v : null;
    const t = String(v).replace(/−/g,'-').replace(/,/g,'.').replace(/[^\d.\-+eE]/g,'').trim();
    if(t === '' || t === '-' || t === '.') return null;
    const x = parseFloat(t); return isFinite(x) ? x : null;
  }
  const pad = n => String(n).padStart(2,'0');
  function isoOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function isoToday(){ return isoOf(new Date()); }
  function isoAdd(iso, n){ const p = iso.split('-'); return isoOf(new Date(+p[0], +p[1]-1, +p[2] + n)); }
  function dayNo(iso){ const p = iso.split('-'); return Math.round(Date.UTC(+p[0], +p[1]-1, +p[2]) / 864e5); }
  function isoOfDay(n){ return new Date(n * 864e5).toISOString().slice(0,10); }
  function dmy(iso){ const p = String(iso||'').split('-'); return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0].slice(2) : ''; }
  function fmt(x, dp){ return (x == null || !isFinite(x)) ? '' : Number(x).toLocaleString('en-US', { minimumFractionDigits:dp, maximumFractionDigits:dp }); }
  function toastM(m, c){ try{ toast(m, c || ''); }catch(_){ console.log(m); } }
  const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  /* dd/mm/yy(yy) · yyyy-mm-dd · d-Mon-yy · serial Excel → ISO */
  function anyIso(s){
    if(s == null || s === '') return '';
    if(typeof s === 'number') return (s > 30000 && s < 80000) ? isoOfDay(Math.floor(s) - 25569) : '';
    s = String(s).trim().replace(/[T ]\d{1,2}:\d{2}.*$/,'');
    let m = s.match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
    if(m) return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){ let y = m[3]; if(y.length === 2) y = '20' + y; if(+m[2] > 12 || +m[1] > 31) return ''; return y+'-'+pad(m[2])+'-'+pad(m[1]); }
    m = s.match(/^(\d{1,2})[\-\s]([A-Za-z]{3})[A-Za-z]*[\-\s,]+(\d{2,4})$/);
    if(m){ const mi = MON3.findIndex(x => x.toLowerCase() === m[2].toLowerCase()); if(mi < 0) return ''; let y = m[3]; if(y.length === 2) y = '20' + y; return y+'-'+pad(mi+1)+'-'+pad(m[1]); }
    if(/^\d{5}(\.\d+)?$/.test(s)) return anyIso(+s);
    return '';
  }
  /* hồi quy tuyến tính y = a + b·x */
  function linreg(xy){
    const n = xy.length; if(n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    xy.forEach(([x, y]) => { sx += x; sy += y; sxx += x*x; sxy += x*y; });
    const d = n * sxx - sx * sx; if(!d) return null;
    const b = (n * sxy - sx * sy) / d; return { a:(sy - b * sx) / n, b };
  }
  function sd(a){ if(a.length < 2) return 0; const m = a.reduce((s,x)=>s+x,0) / a.length; return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0) / (a.length - 1)); }
  function mayWrite(area){ return !(typeof canWrite === 'function' && !canWrite(area)); }
  function userName(){ try{ return (CURRENT_USER && CURRENT_USER.name) || '?'; }catch(_){ return '?'; } }
  function download(blob, name){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  /* v4.208 — dew point LUÔN âm: gõ số dương ⇒ cảnh báo NGAY, OK = đổi sang số âm, Cancel = giữ để tự sửa.
     Dùng chung cho form Engineer ▸ 💧 Dew Point và email P3. Trả về chuỗi giá trị sau khi hỏi. */
  function dewSign(label, v){
    const x = num(v);
    if(x === null || x <= 0) return v;
    const neg = '-' + String(v).trim().replace(/^\+/, '');
    try{ return confirm('⚠ Dew point is always NEGATIVE.\n\n'+label+': you typed '+String(v).trim()+'\n\nOK = change it to '+neg+'\nCancel = keep it and correct it yourself') ? neg : v; }
    catch(_){ return v; }
  }
  return { esc, num, pad, isoOf, isoToday, isoAdd, dayNo, isoOfDay, dmy, fmt, toastM, anyIso, linreg, sd, mayWrite, userName, download, MON3, dewSign };
})();


/* ═════════════════════════════════════════════════════════════
 * 💧 DEW POINT
 * ═════════════════════════════════════════════════════════════ */
const DEWPT = (function(){
  'use strict';
  const { esc, num, isoToday, isoAdd, dayNo, isoOfDay, dmy, fmt, toastM, anyIso, linreg, sd, mayWrite, userName } = ENGX_U;
  /* 4 điểm lấy mẫu + giới hạn — khớp tờ "DEWPOINT DATA SHEET - CAVERN" (email P3) */
  const PTS = [
    { k:'ca', n:'Coalescer A', full:'Outlet Coalescer A', lim:-32, col:'#2563eb', dash:'' },
    { k:'cb', n:'Coalescer B', full:'Outlet Coalescer B', lim:-32, col:'#0891b2', dash:'6 3' },
    { k:'da', n:'Dryer A',     full:'Outlet Dryer A',     lim:-45, col:'#dc2626', dash:'' },
    { k:'db', n:'Dryer B',     full:'Outlet Dryer B',     lim:-45, col:'#d97706', dash:'6 3' }
  ];
  const NEAR = 3;          /* °C — còn cách giới hạn < 3 °C ⇒ "near limit" */
  const DIV = 5;           /* °C — A và B lệch nhau > 5 °C ⇒ một nhánh có vấn đề */
  const HORIZON = 120;     /* ngày — chỉ báo dự báo chạm giới hạn trong khoảng này */
  /* v4.196 — C3 (dew_point, email P3 dùng chung) + C4 (dew_point_c4) */
  const PRODS = { c3:{ node:'dew_point', name:'Propane (C3)', short:'C3' }, c4:{ node:'dew_point_c4', name:'Butane (C4)', short:'C4' } };
  const WIN_DAYS = 730;    /* mở tab chỉ tải 2 năm gần nhất — nút ⤓ Load all tải hết */
  const blank = () => ({ rows:{}, loaded:false, loading:false, all:false, from:'' });
  const S = { prod:'c3', P:{ c3:blank(), c4:blank() }, range:'730', show:{ ca:1, cb:1, da:1, db:1 },
              f:{ date:'', time:'09:00', no:'', ca:'', cb:'', da:'', db:'', note:'' }, dirty:false, pv:null };
  /* S.rows / S.loaded / S.loading = của sản phẩm ĐANG CHỌN (giữ nguyên mọi chỗ gọi cũ) */
  ['rows','loaded','loading'].forEach(k => Object.defineProperty(S, k, { get(){ return S.P[S.prod][k]; }, set(v){ S.P[S.prod][k] = v; } }));
  const node = () => PRODS[S.prod].node;

  const $ = id => (typeof document === 'undefined' ? null : document.getElementById(id));

  /* ── dữ liệu (đọc cả node MỘT lần / phiên, khi mở sub-tab) ── */
  /* all = true ⇒ tải HẾT node; không thì chỉ WIN_DAYS ngày gần nhất (khoá = ngày ISO nên orderByKey chạy được, khỏi index) */
  function load(force, all){
    const prod = S.prod, P = S.P[prod];
    if(all) P.all = true;
    if(P.loading || (P.loaded && !force && !all)) return;
    P.loading = true; render();
    const from = ENGX_U.isoAdd(isoToday(), -WIN_DAYS);
    const done = () => { if(S.prod !== prod) return; if(!S.f.date) newForm(); else render(); };
    try{
      let q = firebase.database().ref(PRODS[prod].node);
      if(!P.all) q = q.orderByKey().startAt(from);
      q.once('value').then(s => {
        P.rows = s.val() || {}; P.loaded = true; P.loading = false; P.from = P.all ? '' : from;
        done();
      }).catch(e => { P.loading = false; P.loaded = true; toastM('⚠ Dew point load failed: '+e.message, 'er'); done(); });
    }catch(e){ P.loading = false; P.loaded = true; done(); }
  }
  function loadAll(){ load(true, true); }
  function setProd(p){
    if(!PRODS[p] || p === S.prod) return;
    S.prod = p; S.f = { date:'', time:'09:00', no:'', ca:'', cb:'', da:'', db:'', note:'' }; S.dirty = false; S.pv = null;
    if(!S.loaded) load(); else newForm();
  }
  /* một ngày = bản ghi chính + các lần đo thêm ở r.x[HHMM] (từ file import) */
  function list(){
    const out = [];
    Object.keys(S.rows).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().forEach(d => {
      const r = S.rows[d] || {};
      const o = { date:d, no:r.no == null ? '' : String(r.no), time:r.time || '', note:r.note || '', by:r.by || '', _ts:r._ts || 0, _x:'' };
      PTS.forEach(p => { o[p.k] = num(r[p.k]); }); out.push(o);
      const X = r.x && typeof r.x === 'object' ? r.x : {};
      Object.keys(X).sort().forEach(h => { const e = X[h] || {};
        const q = { date:d, no:'', time:e.time || (h.slice(0,2)+':'+h.slice(2)), note:e.note || '', by:e.by || r.by || '', _ts:0, _x:h };
        PTS.forEach(p => { q[p.k] = num(e[p.k]); }); out.push(q); });
    });
    return out.filter(r => PTS.some(p => r[p.k] != null))
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a._x ? 1 : 0) - (b._x ? 1 : 0) || (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  }
  function ranged(L){
    if(S.range === 'all' || !L.length) return L;
    const from = isoAdd(isoToday(), -(+S.range));
    return L.filter(r => r.date >= from);
  }
  function nextNo(){
    let mx = 0; Object.values(S.rows).forEach(r => { const n = parseInt(r && r.no, 10); if(n > mx) mx = n; });
    return mx ? String(mx + 1) : '';
  }

  /* ── phân tích một điểm lấy mẫu ── */
  function stats(L, p){
    const v = L.filter(r => r[p.k] != null).map(r => ({ d:r.date, v:r[p.k] }));
    const o = { p, n:v.length, off:0 };
    if(!v.length) return o;
    const xs = v.map(x => x.v);
    o.last = v[v.length-1].v; o.lastDate = v[v.length-1].d;
    o.prev = v.length > 1 ? v[v.length-2].v : null;
    o.min = Math.min(...xs); o.max = Math.max(...xs);
    o.avg = xs.reduce((a,b)=>a+b,0) / xs.length; o.sd = sd(xs);
    o.off = xs.filter(x => x >= p.lim).length;
    o.margin = p.lim - o.last;                                  /* > 0 = còn khô hơn giới hạn */
    o.status = o.last >= p.lim ? 'off' : o.margin < NEAR ? 'near' : 'ok';
    /* xu hướng: các lần đo trong 60 ngày trước lần đo cuối (tối đa 30 lần) */
    const w = v.filter(x => dayNo(x.d) >= dayNo(o.lastDate) - 60).slice(-30);
    if(w.length >= 4){
      const lr = linreg(w.map(x => [dayNo(x.d), x.v]));
      if(lr){ o.slope = lr.b;
        if(lr.b > 0.02 && o.last < p.lim){ const days = (p.lim - o.last) / lr.b;
          if(days <= HORIZON){ o.projDays = Math.ceil(days); o.projDate = isoAdd(o.lastDate, o.projDays); } } }
    }
    /* nhảy bất thường: chênh với lần trước ≥ max(4 °C, 3σ của các bước trước đó) */
    if(v.length >= 5){
      const steps = []; for(let i = 1; i < v.length - 1; i++) steps.push(v[i].v - v[i-1].v);
      const lim = Math.max(4, 3 * sd(steps)), dv = o.last - o.prev;
      if(Math.abs(dv) >= lim) o.jump = dv;
    }
    return o;
  }
  /* nhận định — xét lần đo MỚI NHẤT + xu hướng; lvl: bad / warn / info / ok */
  function alerts(L){
    const out = [], add = (lvl, t) => out.push({ lvl, t });
    if(!L.length){ add('info', 'No dew point reading saved yet.'); return out; }
    const last = L[L.length-1], d = dmy(last.date);
    PTS.forEach(p => {
      const v = last[p.k];
      if(v == null){ add('warn', d+' · '+p.n+': no reading.'); return; }
      if(v > 0) add('bad', d+' · '+p.n+': '+v+' °C is positive — missing minus sign?');
      if(v >= p.lim) add('bad', d+' · '+p.n+' '+fmt(v,1)+' °C is OFF-SPEC (limit < '+p.lim+' °C).');
      else if(p.lim - v < NEAR) add('warn', d+' · '+p.n+' '+fmt(v,1)+' °C is within '+NEAR+' °C of the limit ('+p.lim+' °C).');
    });
    /* dryer phải KHÔ hơn coalescer cùng nhánh */
    [['A','ca','da'],['B','cb','db']].forEach(([t, c, r]) => {
      if(last[c] != null && last[r] != null && last[r] > last[c])
        add('warn', d+' · Train '+t+': dryer outlet ('+fmt(last[r],1)+' °C) is wetter than coalescer outlet ('+fmt(last[c],1)+' °C) — dryer '+t+' may be saturated / due for regeneration, or the analyser needs checking.');
    });
    /* hai nhánh A/B lệch nhau */
    [['Coalescer','ca','cb'],['Dryer','da','db']].forEach(([n, a, b]) => {
      if(last[a] != null && last[b] != null && Math.abs(last[a] - last[b]) > DIV)
        add('warn', d+' · '+n+' A vs B differ by '+fmt(Math.abs(last[a]-last[b]),1)+' °C (> '+DIV+' °C) — the wetter train ('+(last[a] > last[b] ? 'A' : 'B')+') needs attention.');
    });
    PTS.forEach(p => { const s = stats(L, p);
      if(s.projDate) add('warn', p.n+' is rising '+fmt(s.slope * 30,1)+' °C / 30 days — at this rate it reaches '+p.lim+' °C around '+dmy(s.projDate)+' ('+s.projDays+' days).');
      if(s.jump != null) add('warn', p.n+' jumped '+(s.jump > 0 ? '+' : '')+fmt(s.jump,1)+' °C versus the previous reading — unusual step, re-check the measurement.');
    });
    /* nhịp đo: quá hạn so với nhịp bình thường */
    if(L.length >= 4){
      const gaps = []; for(let i = Math.max(1, L.length - 10); i < L.length; i++) gaps.push(dayNo(L[i].date) - dayNo(L[i-1].date));
      gaps.sort((a,b)=>a-b); const med = gaps[Math.floor(gaps.length/2)] || 1;
      const since = dayNo(isoToday()) - dayNo(last.date);
      if(since > Math.max(2, 2 * med)) add('info', 'Last reading was '+since+' days ago (usual interval ≈ '+med+' day'+(med > 1 ? 's' : '')+').');
    }
    if(!out.some(a => a.lvl !== 'info')) add('ok', 'Latest reading '+d+': all four points within spec, no abnormal trend.');
    return out;
  }

  /* ── form nhập ── */
  function newForm(){
    S.f = { date:isoToday(), time:'09:00', no:nextNo(), ca:'', cb:'', da:'', db:'', note:'' };
    S.dirty = false; fillFromSaved(); render();
  }
  function fillFromSaved(){
    const r = S.rows[S.f.date];
    if(r){ ['no','time','note'].concat(PTS.map(p=>p.k)).forEach(k => { S.f[k] = r[k] == null ? '' : String(r[k]); }); S.dirty = false; }
  }
  function setF(k, v){
    { const P0 = PTS.find(p => p.k === k); if(P0) v = ENGX_U.dewSign(P0.full, v); }      /* v4.208 — số dương ⇒ hỏi ngay */
    S.f[k] = v;
    if(k === 'date'){
      if(S.rows[v]) fillFromSaved();
      else { PTS.forEach(p => S.f[p.k] = ''); S.f.note = ''; S.f.no = nextNo(); S.dirty = false; }
    } else S.dirty = true;
    render();
  }
  function edit(date){ S.f.date = date; fillFromSaved(); render(); const w = $('dewWrap'); if(w) w.scrollTop = 0; }
  function save(){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    const f = S.f;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date)){ toastM('Pick a date first', 'er'); return; }
    const vals = {}; let n = 0;
    for(const p of PTS){
      const raw = f[p.k] == null ? '' : String(f[p.k]).trim(), v = num(raw);
      if(raw !== '' && v == null){ toastM(p.n+': "'+raw+'" is not a number', 'er'); return; }
      if(v != null){ n++;
        if(v < -110 || v > 30){ toastM(p.n+': '+v+' °C is outside the physical range', 'er'); return; }
        if(v > 0 && !confirm(p.n+' = '+v+' °C is POSITIVE.\n\nAn LPG dew point is always below zero — did you forget the minus sign?\n\nOK = save '+v+' as typed · Cancel = go back and fix it')) return;
      }
      vals[p.k] = v == null ? '' : v;
    }
    if(!n){ toastM('Type at least one reading', 'er'); return; }
    const rec = Object.assign({ no:String(f.no||''), time:String(f.time||''), note:String(f.note||''), _ts:Date.now(), by:userName() }, vals);
    /* v4.196 — giữ các lần đo thêm trong ngày (x) — .set() không được xoá mất chúng */
    const old = S.rows[f.date]; if(old && old.x) rec.x = old.x;
    const prod = S.prod, rows = S.rows;
    try{
      firebase.database().ref(node()+'/'+f.date).set(rec).then(() => {
        rows[f.date] = rec; S.dirty = false;
        toastM('💾 '+PRODS[prod].short+' dew point '+dmy(f.date)+' saved', 'ok');
        if(prod === 'c3'){ try{ MAIL.dewReload(f.date); }catch(_){} }
        render();
      }).catch(e => toastM('⚠ Save failed: '+e.message, 'er'));
    }catch(e){ toastM('⚠ Save failed: '+e.message, 'er'); }
  }
  function del(date){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    if(!confirm('Delete the '+PRODS[S.prod].short+' dew point reading of '+dmy(date)+'?'+((S.rows[date] && S.rows[date].x) ? '\n(The extra readings of that day are deleted too.)' : '')+'\nThis cannot be undone.')) return;
    const prod = S.prod, rows = S.rows;
    firebase.database().ref(node()+'/'+date).remove().then(() => {
      delete rows[date]; toastM('🗑 '+dmy(date)+' deleted', 'ok');
      if(prod === 'c3'){ try{ MAIL.dewReload(date); }catch(_){} }
      if(S.f.date === date) setF('date', date); else render();
    }).catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }
  /* xoá một lần đo THÊM (x/<HHMM>) — bản ghi chính của ngày giữ nguyên */
  function delX(date, h){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    if(!confirm('Delete the extra reading '+dmy(date)+' '+h.slice(0,2)+':'+h.slice(2)+'?')) return;
    const rows = S.rows;
    firebase.database().ref(node()+'/'+date+'/x/'+h).remove().then(() => {
      if(rows[date] && rows[date].x){ delete rows[date].x[h]; if(!Object.keys(rows[date].x).length) delete rows[date].x; }
      toastM('🗑 extra reading deleted', 'ok'); render();
    }).catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }

  /* ── dán lịch sử từ Excel cũ ── */
  function parsePaste(txt){
    const out = [], bad = [];
    String(txt || '').split(/\r?\n/).forEach(line => {
      if(!line.trim()) return;
      const c = line.split('\t').map(x => x.trim());
      let di = -1, iso = '';
      for(let j = 0; j < c.length && di < 0; j++){ const d = anyIso(c[j]); if(d && /^20\d\d-/.test(d)){ di = j; iso = d; } }
      if(di < 0){ if(!/date|sampling|spec|no\.?$/i.test(line)) bad.push(line.slice(0, 60)); return; }
      const rec = { date:iso, no:'', time:'' };
      if(di > 0 && /^\d+$/.test(c[di-1])) rec.no = c[di-1];
      let j = di + 1;
      if(/^\d{1,2}:\d{2}/.test(c[j] || '')){ rec.time = c[j].slice(0,5).padStart(5,'0'); j++; }
      const vs = [];
      for(; j < c.length && vs.length < 4; j++){ if(c[j] === '' || c[j] === '-'){ vs.push(null); continue; } vs.push(num(c[j])); }
      if(!vs.some(v => v != null)){ bad.push(line.slice(0, 60)); return; }
      PTS.forEach((p, k) => { rec[p.k] = vs[k] == null ? '' : vs[k]; });
      out.push(rec);
    });
    /* cùng một ngày dán hai lần ⇒ dòng sau thắng */
    const m = {}; out.forEach(r => { m[r.date] = r; });
    return { rows:Object.values(m).sort((a,b) => a.date < b.date ? -1 : 1), bad };
  }
  function pasteOpen(){ S.pv = { txt:'', res:null }; render(); setTimeout(() => { const t = $('dewPasteTxt'); if(t) t.focus(); }, 30); }
  function pasteClose(){ S.pv = null; render(); }
  function pastePreview(txt){
    S.pv = { txt, res:parsePaste(txt) }; render();
    const t = $('dewPasteTxt'); if(t){ t.focus(); t.selectionStart = t.selectionEnd = t.value.length; }
  }
  function pasteCommit(){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    const res = S.pv && S.pv.res; if(!res || !res.rows.length) return;
    const up = {}, by = userName() + ' (paste)', now = Date.now();
    res.rows.forEach(r => { const o = Object.assign({}, r, { note:(S.rows[r.date] && S.rows[r.date].note) || '', _ts:now, by }); if(S.rows[r.date] && S.rows[r.date].x) o.x = S.rows[r.date].x; delete o.date; up[r.date] = o; });
    firebase.database().ref(node()).update(up).then(() => {
      Object.keys(up).forEach(d => { S.rows[d] = up[d]; });
      toastM('📋 '+res.rows.length+' reading(s) imported', 'ok'); S.pv = null; render();
    }).catch(e => toastM('⚠ Import failed: '+e.message, 'er'));
  }

  /* ── xuất Excel (dữ liệu + thống kê tháng + nhận định) ── */
  function monthly(L){
    const g = {};
    L.forEach(r => { const ym = r.date.slice(0,7); const m = g[ym] || (g[ym] = { ym, n:0 }); m.n++;
      PTS.forEach(p => { const v = r[p.k]; if(v == null) return; const s = m[p.k] || (m[p.k] = { sum:0, n:0, min:v, max:v, off:0 });
        s.sum += v; s.n++; s.min = Math.min(s.min, v); s.max = Math.max(s.max, v); if(v >= p.lim) s.off++; }); });
    return Object.values(g).sort((a,b) => a.ym < b.ym ? 1 : -1).map(m => { PTS.forEach(p => { if(m[p.k]) m[p.k].avg = m[p.k].sum / m[p.k].n; }); return m; });
  }
  function exportXlsx(){
    if(typeof XLSX === 'undefined'){ toastM('Excel library not loaded', 'er'); return; }
    const L = ranged(list()); if(!L.length){ toastM('No reading in this range', 'er'); return; }
    const wb = XLSX.utils.book_new();
    const aoa = [['DEWPOINT DATA SHEET - CAVERN ('+PRODS[S.prod].name+')'], ['No.','Date','Time'].concat(PTS.map(p => p.full+' (°C)')).concat(['Note','Entered by']),
                 ['Spec (°C)','',''].concat(PTS.map(p => '< '+p.lim)).concat(['',''])];
    L.slice().reverse().forEach(r => aoa.push([r.no, dmy(r.date), r.time].concat(PTS.map(p => r[p.k] == null ? '' : r[p.k])).concat([r.note, r.by])));
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [6,10,7,20,20,17,17,30,16].map(w => ({ wch:w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Dew Point');
    const ma = [['Month','Readings'].concat(PTS.flatMap(p => [p.n+' avg', p.n+' min', p.n+' max', p.n+' off-spec']))];
    monthly(L).forEach(m => ma.push([m.ym, m.n].concat(PTS.flatMap(p => { const s = m[p.k]; return s ? [+s.avg.toFixed(2), s.min, s.max, s.off] : ['','','','']; }))));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ma), 'Monthly');
    const an = [['Point','Limit (°C)','Readings','Last','Last date','Margin to limit','Min','Max','Average','Std dev','Off-spec','Trend (°C/30d)','Projected to reach limit']];
    PTS.forEach(p => { const s = stats(L, p); an.push([p.full, p.lim, s.n, s.last == null ? '' : s.last, s.lastDate ? dmy(s.lastDate) : '', s.margin == null ? '' : +s.margin.toFixed(1),
      s.min == null ? '' : s.min, s.max == null ? '' : s.max, s.avg == null ? '' : +s.avg.toFixed(2), s.sd == null ? '' : +s.sd.toFixed(2), s.off,
      s.slope == null ? '' : +(s.slope*30).toFixed(2), s.projDate ? dmy(s.projDate) : '']); });
    an.push([]); an.push(['Findings']); alerts(list()).forEach(a => an.push([a.lvl.toUpperCase(), a.t]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(an), 'Analysis');
    XLSX.writeFile(wb, 'Dew Point of '+(S.prod === 'c4' ? 'Butane' : 'Propane')+'_CAVERN_'+L[0].date+'_to_'+L[L.length-1].date+'.xlsx');
  }

  /* ── biểu đồ SVG ── */
  function chart(L){
    const shown = PTS.filter(p => S.show[p.k]);
    const pts = L.filter(r => shown.some(p => r[p.k] != null));
    if(!pts.length) return '<div class="dp-empty">No reading in this range.</div>';
    const W = 1000, H = 300, Lm = 44, Rm = 150, T = 12, B = 30;
    let d0 = dayNo(pts[0].date), d1 = dayNo(pts[pts.length-1].date); if(d1 - d0 < 6){ d0 -= 3; d1 += 3; }
    const vals = pts.flatMap(r => shown.map(p => r[p.k]).filter(v => v != null));
    const lo = Math.floor(Math.min(-50, ...vals) / 5) * 5, hi = Math.ceil(Math.max(-28, ...vals) / 5) * 5;
    const X = d => Lm + (d - d0) / (d1 - d0) * (W - Lm - Rm), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dew point trend">';
    if(-32 < hi) g += '<rect x="'+Lm+'" y="'+T+'" width="'+(W-Lm-Rm)+'" height="'+Math.max(0, Y(-32)-T).toFixed(1)+'" class="dp-offband"><title>Above −32 °C: off-spec for every point</title></rect>';
    for(let v = lo; v <= hi; v += 5) g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="dp-grid"/><text x="'+(Lm-5)+'" y="'+(Y(v)+3)+'" class="dp-ax" text-anchor="end">'+v+'</text>';
    const step = Math.max(1, Math.round((d1 - d0) / 8));
    /* v4.196 — cửa sổ 2 năm: nhãn trục là tháng/năm (dd/mm dễ đọc nhầm năm) */
    const xl = (d1 - d0) > 200 ? (d => { const i = isoOfDay(d); return i.slice(5,7)+'/'+i.slice(2,4); }) : (d => dmy(isoOfDay(d)).slice(0,5));
    for(let d = d0; d <= d1; d += step) g += '<text x="'+X(d)+'" y="'+(H-10)+'" class="dp-ax" text-anchor="middle">'+xl(d)+'</text>';
    [[-32,'Coalescer limit −32 °C'],[-45,'Dryer limit −45 °C']].forEach(([v, t]) => { if(v < lo || v > hi) return;
      g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="dp-lim"/><text x="'+(W-Rm+4)+'" y="'+(Y(v)+3)+'" class="dp-limt">'+t+'</text>'; });
    shown.forEach(p => {
      const s = pts.filter(r => r[p.k] != null);
      if(s.length > 1) g += '<polyline fill="none" stroke="'+p.col+'" stroke-width="1.8"'+(p.dash ? ' stroke-dasharray="'+p.dash+'"' : '')+' points="'+s.map(r => X(dayNo(r.date)).toFixed(1)+','+Y(r[p.k]).toFixed(1)).join(' ')+'"/>';
      s.forEach(r => { const v = r[p.k], off = v >= p.lim, near = !off && p.lim - v < NEAR;
        g += '<circle cx="'+X(dayNo(r.date)).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="'+(off ? 4.5 : near ? 3.5 : (pts.length > 200 ? 1.5 : 2.6))+'" fill="'+(off ? '#fff' : p.col)+'" stroke="'+(off ? '#b91c1c' : near ? '#b45309' : p.col)+'" stroke-width="'+(off || near ? 2 : 1)+'">'+
          '<title>'+dmy(r.date)+(r.time ? ' '+esc(r.time) : '')+' · '+p.n+' '+fmt(v,1)+' °C'+(off ? ' — OFF-SPEC' : near ? ' — near limit' : '')+'</title></circle>'; });
    });
    /* nhãn giá trị cuối ở mép phải, dàn đều để khỏi đè nhau */
    const ends = shown.map(p => { const s = pts.filter(r => r[p.k] != null); const la = s[s.length-1]; return la ? { p, v:la[p.k], y:Y(la[p.k]) } : null; }).filter(Boolean).sort((a,b) => a.y - b.y);
    for(let i = 1; i < ends.length; i++) if(ends[i].y - ends[i-1].y < 12) ends[i].y = ends[i-1].y + 12;
    ends.forEach(e => { g += '<text x="'+(W-Rm+4)+'" y="'+(e.y+3+ (Math.abs(e.y - Y(-32)) < 8 || Math.abs(e.y - Y(-45)) < 8 ? 10 : 0))+'" class="dp-endlbl" fill="'+e.p.col+'">'+e.p.n+' '+fmt(e.v,1)+'</text>'; });
    return g + '</svg>';
  }

  /* ── vẽ ── */
  function cell(v, p){
    if(v == null || v === '') return '<td class="td-c dp-na">–</td>';
    const cls = v >= p.lim ? 'dp-off' : p.lim - v < NEAR ? 'dp-near' : '';
    return '<td class="td-r '+cls+'">'+fmt(v,1)+'</td>';
  }
  function render(){
    const w = $('dewWrap'); if(!w) return;
    const st = $('dewStats');
    const P = S.P[S.prod];
    const bar = '<div class="lx-bar"><span class="lx-seg">'+Object.keys(PRODS).map(k => '<button class="'+(S.prod === k ? 'on' : '')+'" onclick="DEWPT.setProd(\''+k+'\')">'+PRODS[k].name+'</button>').join('')+'</span>'+
      '<span class="lx-span">'+(P.loading ? '⏳ loading…' : P.loaded ? (P.all ? 'All history loaded' : 'Loaded from <b>'+dmy(P.from)+'</b> (last 2 years)') : '')+'</span>'+
      (P.loaded && !P.all && !P.loading ? '<button class="eng-btn" onclick="DEWPT.loadAll()" title="Download the whole history of this product (older than 2 years too)">⤓ Load all history</button>' : '')+'</div>';
    if(!S.loaded){ w.innerHTML = bar+'<div class="dp-empty">'+(S.loading ? '⏳ Loading '+PRODS[S.prod].short+' dew point history…' : '')+'</div>'; return; }
    const all = list(), L = ranged(all), f = S.f, exists = !!S.rows[f.date];
    if(st) st.innerHTML = '<b>'+PRODS[S.prod].short+'</b> · <b>'+all.length+'</b> readings'+(all.length ? ' · last <b>'+dmy(all[all.length-1].date)+'</b>' : '');
    let h = bar;
    if(S.pv) h += pasteHtml();
    /* form */
    h += '<div class="dp-card dp-form"><div class="dp-h">'+(exists ? '✎ Edit reading of '+dmy(f.date) : '➕ New reading')+
      (S.dirty ? ' <span class="dp-dirty">● not saved</span>' : exists ? ' <span class="dp-okt">✓ saved</span>' : '')+'</div><div class="dp-row">'+
      '<label>Date <input type="date" value="'+esc(f.date)+'" onchange="DEWPT.setF(\'date\',this.value)"></label>'+
      '<label>Time <input type="time" value="'+esc(f.time)+'" onchange="DEWPT.setF(\'time\',this.value)"></label>'+
      '<label>No. <input value="'+esc(f.no)+'" onchange="DEWPT.setF(\'no\',this.value)" style="width:56px"></label>'+
      PTS.map(p => { const v = num(f[p.k]), cls = v == null ? '' : v >= p.lim ? ' dp-off' : p.lim - v < NEAR ? ' dp-near' : '';
        return '<label title="'+esc(p.full)+' — limit &lt; '+p.lim+' °C">'+p.n+'<input class="dp-num'+cls+'"'+(v != null && v > 0 ? ' style="border:2px solid #dc2626;background:#fee2e2" title="Dew point must be negative"' : '')+' inputmode="decimal" placeholder="&lt; '+p.lim+' °C" value="'+esc(f[p.k])+'" '+
          'onchange="DEWPT.setF(\''+p.k+'\',this.value)" onkeydown="if(event.key===\'Enter\'){DEWPT.setF(\''+p.k+'\',this.value);DEWPT.save()}"></label>'; }).join('')+
      '<label class="dp-note">Note <input value="'+esc(f.note)+'" placeholder="e.g. dryer B regenerated" onchange="DEWPT.setF(\'note\',this.value)"></label>'+
      '<button class="eng-btn green" onclick="DEWPT.save()">💾 Save</button>'+
      '<button class="eng-btn" onclick="DEWPT.newForm()" title="Clear the form for today">↺ New</button>'+
      '</div></div>';
    /* KPI — lần đo mới nhất của từng điểm */
    h += '<div class="dp-kpis">'+PTS.map(p => { const s = stats(all, p);
      if(!s.n) return '<div class="dp-kpi"><div class="dp-kn" style="border-color:'+p.col+'">'+p.n+'</div><div class="dp-kv">–</div></div>';
      const tr = s.slope == null ? '' : (s.slope > 0.02 ? '↗ ' : s.slope < -0.02 ? '↘ ' : '→ ')+(s.slope >= 0 ? '+' : '')+fmt(s.slope*30,1)+' °C / 30 d';
      return '<div class="dp-kpi dp-'+s.status+'"><div class="dp-kn" style="border-color:'+p.col+'">'+p.n+' <small>limit &lt;'+p.lim+'</small></div>'+
        '<div class="dp-kv">'+fmt(s.last,1)+'<small> °C</small></div>'+
        '<div class="dp-ks" title="Margin = limit − last reading (positive = drier than the limit)">margin '+(s.margin < 0 ? '−' : '')+fmt(Math.abs(s.margin),1)+' °C · '+dmy(s.lastDate)+'</div>'+
        '<div class="dp-ks" title="Linear trend of the readings in the 60 days before the last one">'+tr+(s.projDate ? ' · <b>limit ~'+dmy(s.projDate)+'</b>' : '')+'</div></div>'; }).join('')+'</div>';
    /* nhận định */
    h += '<div class="dp-card"><div class="dp-h">🔎 Findings</div><ul class="dp-al">'+alerts(all).map(a => '<li class="dp-'+a.lvl+'">'+esc(a.t)+'</li>').join('')+'</ul></div>';
    /* biểu đồ */
    h += '<div class="dp-card"><div class="dp-h">📈 '+PRODS[S.prod].short+' trend <span class="dp-rg">'+[['30','30 d'],['90','90 d'],['180','6 m'],['365','1 y'],['730','2 y'],['all','All']].map(([k, t]) =>
      '<button class="'+(S.range === k ? 'on' : '')+'" onclick="DEWPT.range(\''+k+'\')">'+t+'</button>').join('')+'</span>'+
      '<span class="dp-lg">'+PTS.map(p => '<label><input type="checkbox"'+(S.show[p.k] ? ' checked' : '')+' onchange="DEWPT.toggle(\''+p.k+'\')"><i style="background:'+p.col+'"></i>'+p.n+'</label>').join('')+'</span></div>'+
      chart(L)+'</div>';
    /* thống kê theo khoảng + theo tháng */
    h += '<div class="dp-grid2"><div class="dp-card"><div class="dp-h">📊 Statistics — '+(S.range === 'all' ? 'all readings' : 'last '+S.range+' days')+' ('+L.length+')</div>'+
      '<div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Point</th><th>Limit</th><th>Min</th><th>Max</th><th>Avg</th><th title="Standard deviation">σ</th><th>Off-spec</th><th title="Trend over the 60 days before the last reading">Trend /30d</th></tr></thead><tbody>'+
      PTS.map(p => { const s = stats(L, p); return '<tr><td><i class="dp-sw" style="background:'+p.col+'"></i>'+p.n+'</td><td class="td-c">&lt;'+p.lim+'</td><td class="td-r">'+fmt(s.min,1)+'</td><td class="td-r">'+fmt(s.max,1)+'</td><td class="td-r">'+fmt(s.avg,1)+'</td><td class="td-r">'+fmt(s.sd,2)+'</td>'+
        '<td class="td-c'+(s.off ? ' dp-off' : '')+'">'+(s.n ? s.off+' / '+s.n : '')+'</td><td class="td-r">'+(s.slope == null ? '' : (s.slope >= 0 ? '+' : '')+fmt(s.slope*30,2))+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
    const M = monthly(L);
    h += '<div class="dp-card"><div class="dp-h">🗓 Monthly average (°C)</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Month</th><th>n</th>'+PTS.map(p => '<th>'+p.n+'</th>').join('')+'</tr></thead><tbody>'+
      (M.length ? M.map(m => '<tr><td class="td-c">'+m.ym+'</td><td class="td-c">'+m.n+'</td>'+PTS.map(p => { const s = m[p.k]; if(!s) return '<td class="td-c dp-na">–</td>';
        return '<td class="td-r'+(s.off ? ' dp-off' : '')+'" title="min '+s.min+' · max '+s.max+(s.off ? ' · '+s.off+' off-spec' : '')+'">'+fmt(s.avg,1)+'</td>'; }).join('')+'</tr>').join('') : '<tr><td colspan="6" class="td-c dp-na">–</td></tr>')+
      '</tbody></table></div></div></div>';
    /* lịch sử */
    h += '<div class="dp-card"><div class="dp-h">📋 History ('+L.length+') <small>click a row to edit</small></div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>No.</th><th>Date</th><th>Time</th>'+
      PTS.map(p => '<th>'+p.n+'<br><small>&lt;'+p.lim+'</small></th>').join('')+'<th>Note</th><th>By</th><th></th></tr></thead><tbody>'+
      (L.length ? L.slice().reverse().map(r => r._x
        ? '<tr class="lx-xrow" title="Extra reading of the same day (imported) — delete only"><td class="td-c">＋</td><td class="td-c">'+dmy(r.date)+'</td><td class="td-c">'+esc(r.time)+'</td>'+
          PTS.map(p => cell(r[p.k], p)).join('')+'<td>'+esc(r.note)+'</td><td class="dp-by">'+esc(r.by)+'</td>'+
          '<td class="td-c"><button class="dp-x" title="Delete this extra reading" onclick="event.stopPropagation();DEWPT.delX(\''+r.date+'\',\''+r._x+'\')">✕</button></td></tr>'
        : '<tr class="'+(r.date === f.date ? 'dp-sel' : '')+'" onclick="DEWPT.edit(\''+r.date+'\')"><td class="td-c">'+esc(r.no)+'</td><td class="td-c">'+dmy(r.date)+'</td><td class="td-c">'+esc(r.time)+'</td>'+
        PTS.map(p => cell(r[p.k], p)).join('')+'<td>'+esc(r.note)+'</td><td class="dp-by">'+esc(r.by)+'</td>'+
        '<td class="td-c"><button class="dp-x" title="Delete this reading" onclick="event.stopPropagation();DEWPT.del(\''+r.date+'\')">✕</button></td></tr>').join('')
        : '<tr><td colspan="10" class="td-c dp-na">No reading in this range.</td></tr>')+'</tbody></table></div></div>';
    const keep = w.scrollTop; w.innerHTML = h; w.scrollTop = keep;
  }
  function pasteHtml(){
    const r = S.pv.res;
    let h = '<div class="dp-card dp-paste"><div class="dp-h">📋 Paste '+PRODS[S.prod].short+' history from Excel <button class="dp-x" onclick="DEWPT.pasteClose()" title="Close">✕</button></div>'+
      '<div class="dp-hint">Copy the rows from the old dew point sheet: <b>No. · Date · Time · Coalescer A · Coalescer B · Dryer A · Dryer B</b> (No. and Time optional). A date that already exists is overwritten.</div>'+
      '<textarea id="dewPasteTxt" rows="6" placeholder="Ctrl+V here…" oninput="DEWPT.pastePreview(this.value)">'+esc(S.pv.txt)+'</textarea>';
    if(r){
      const upd = r.rows.filter(x => S.rows[x.date]).length;
      h += '<div class="dp-hint"><b>'+r.rows.length+'</b> row(s) read · '+(r.rows.length - upd)+' new · '+upd+' overwrite'+(r.bad.length ? ' · <span class="dp-offt" title="'+esc(r.bad.slice(0,5).join('\n'))+'">'+r.bad.length+' line(s) skipped</span>' : '')+'</div>';
      if(r.rows.length) h += '<div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Date</th><th>No.</th><th>Time</th>'+PTS.map(p => '<th>'+p.n+'</th>').join('')+'</tr></thead><tbody>'+
        r.rows.slice(0, 8).map(x => '<tr><td class="td-c">'+dmy(x.date)+(S.rows[x.date] ? ' <small>(overwrite)</small>' : '')+'</td><td class="td-c">'+esc(x.no)+'</td><td class="td-c">'+esc(x.time)+'</td>'+PTS.map(p => cell(x[p.k], p)).join('')+'</tr>').join('')+
        (r.rows.length > 8 ? '<tr><td colspan="7" class="td-c dp-na">… '+(r.rows.length - 8)+' more</td></tr>' : '')+'</tbody></table></div>'+
        '<button class="eng-btn green" onclick="DEWPT.pasteCommit()">✔ Import '+r.rows.length+' reading(s)</button>';
    }
    return h + '</div>';
  }
  /* email P3 vừa lưu một ngày ⇒ cập nhật bộ nhớ (khỏi đọc lại Firebase) */
  function ingest(date, rec){ const P = S.P.c3; if(!P.loaded) return; P.rows[date] = Object.assign({}, P.rows[date], rec); render(); }
  /* v4.206 — email P3 vẽ biểu đồ Dryer A/B từ CHÍNH bộ nhớ này (tab chưa mở thì đọc cửa sổ 2 năm MỘT lần và
     để lại cho tab dùng tiếp — không đọc Firebase hai lần) */
  let _c3p = null;
  function c3Rows(){ const P = S.P.c3; return P.loaded ? P.rows : null; }
  function c3Hist(){
    const P = S.P.c3;
    if(P.loaded) return Promise.resolve(P.rows);
    if(_c3p) return _c3p;
    const from = ENGX_U.isoAdd(isoToday(), -WIN_DAYS);
    _c3p = firebase.database().ref(PRODS.c3.node).orderByKey().startAt(from).once('value').then(s => {
      if(!P.loaded){ P.rows = s.val() || {}; P.loaded = true; P.from = from; }
      _c3p = null; return P.rows;
    }, e => { _c3p = null; throw e; });
    return _c3p;
  }
  function range(k){ S.range = k; if(k === 'all' && !S.P[S.prod].all){ loadAll(); return; } render(); }
  function toggle(k){ S.show[k] = S.show[k] ? 0 : 1; render(); }
  function refresh(){ if(!S.loaded) load(); else render(); }
  function reload(){ load(true); }
  /* LABX vừa ghi dữ liệu import ⇒ đọc lại (giữ chế độ 2 năm / tất cả) */
  function afterImport(prod){ const P = S.P[prod]; if(P && P.loaded){ const cur = S.prod; S.prod = prod; load(true); S.prod = cur; } }

  return { PTS, PRODS, refresh, reload, render, ingest, c3Rows, c3Hist, setF, save, del, delX, edit, newForm, range, toggle, exportXlsx,
           pasteOpen, pasteClose, pastePreview, pasteCommit, setProd, loadAll, afterImport,
           _test:{ stats, alerts, parsePaste, monthly, list, S } };
})();


/* ═════════════════════════════════════════════════════════════
 * 🔥 HEATER — lượng C3 heater từ dữ liệu PMS theo phút
 * ═════════════════════════════════════════════════════════════ */
const HTR = (function(){
  'use strict';
  const { esc, num, fmt, toastM, mayWrite, download } = ENGX_U;
  const GAP_WARN = 30 * 60e3;          /* mất dữ liệu > 30 phút trong đợt chạy ⇒ cảnh báo */
  const STEP_KG = 3;                   /* khớp PMSHEAT: phút tăng ≥ 3 kg = đang chạy */
  /* ⭐ MỘT trạng thái dùng chung với email P5 (MAIL đọc HTR.S) */
  const S = { A:null, B:null, runs:[], run:-1, start:0, stop:0, vessel:'', amount:'', pending:[], manual:false, lastOut:null };
  const $ = id => (typeof document === 'undefined' ? null : document.getElementById(id));
  const two = n => String(n).padStart(2,'0');
  function dtLocal(t){ if(!t) return ''; const d = new Date(t); return d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate())+'T'+two(d.getHours())+':'+two(d.getMinutes()); }
  function parseLocal(v){ const m = String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]).getTime() : 0; }
  const ts = t => PMSHEAT.fmtTs(t).slice(0,16);
  const HNAME = { A:'Heater A', B:'Heater B' };

  /* ── nạp file: TỰ NHẬN A/B; không nhận ra ⇒ để chờ người dùng gán ── */
  function _put(k, sr, fname){
    const cur = S[k];
    if(cur){
      cur.pts = PMSHEAT.mergePts(cur.pts, sr.pts);
      if(cur.files.indexOf(fname) < 0) cur.files.push(fname);
      cur.how = sr.how || cur.how;
    } else S[k] = { pts:sr.pts.slice(), tag:PMSHEAT.TAG_OF[k], how:sr.how || 'assigned by user', files:[fname] };
    S[k].file = S[k].files.join(' + ');
  }
  async function addFiles(fileList){
    const fl = Array.from(fileList || []); const msg = [];
    for(const f of fl){
      try{
        const r = await PMSHEAT.parseFile(f);
        (r.all || [r]).forEach(sr => {
          if(!sr.pts.length){ msg.push('⚠ '+f.name+': no data rows'); return; }
          if(sr.heater){ _put(sr.heater, sr, f.name); msg.push('📈 '+f.name+' → '+HNAME[sr.heater]+' ('+sr.pts.length.toLocaleString('en-US')+' pts)'); }
          else { S.pending.push({ file:f.name, sheet:r.sheet, pts:sr.pts, col:sr.tag }); msg.push('❓ '+f.name+': cannot tell Heater A or B — choose below'); }
        });
      }catch(e){ msg.push('⚠ '+f.name+': '+e.message); }
    }
    recompute(true);
    if(msg.length) toastM(msg.join(' · '), msg.some(m => /^⚠|^❓/.test(m)) ? 'warn' : 'ok');
    renderAll();
    return msg;
  }
  function assign(i, k){
    const p = S.pending[i]; if(!p || !HNAME[k]) return;
    _put(k, { pts:p.pts, how:'assigned by user' }, p.file);
    S.pending.splice(i, 1);
    recompute(true); renderAll();
  }
  function dropPending(i){ S.pending.splice(i, 1); renderAll(); }
  function swap(){
    const a = S.A, b = S.B; S.A = b; S.B = a;
    if(S.A){ S.A.tag = PMSHEAT.TAG_OF.A; S.A.how = 'swapped by user'; }
    if(S.B){ S.B.tag = PMSHEAT.TAG_OF.B; S.B.how = 'swapped by user'; }
    recompute(false); renderAll();
  }
  function clear(k){
    if(k === 'A' || k === 'B') S[k] = null;
    else { S.A = S.B = null; S.pending = []; S.start = S.stop = 0; S.run = -1; S.manual = false; S.lastOut = null; }
    recompute(false); renderAll();
  }
  /* tìm lại các đợt chạy; chưa sửa tay START/STOP ⇒ chọn đợt mới nhất */
  function recompute(pickLatest){
    S.runs = (S.A || S.B) ? PMSHEAT.runs(S.A && S.A.pts, S.B && S.B.pts) : [];
    if(!S.runs.length){ if(!S.A && !S.B){ S.start = S.stop = 0; } S.run = -1; return; }
    if((pickLatest && !S.manual) || !S.start){ setRun(S.runs.length - 1, true); return; }
    S.run = S.runs.findIndex(r => r.start === S.start && r.stop === S.stop);
  }
  function setRun(i, silent){
    const r = S.runs[i]; if(!r) return;
    S.run = i; S.start = r.start; S.stop = r.stop; S.manual = false;
    if(!silent) renderAll();
  }
  function set(k, v){
    if(k === 'start' || k === 'stop'){ const t = parseLocal(v); if(t){ S[k] = t; S.manual = true; S.run = S.runs.findIndex(r => r.start === S.start && r.stop === S.stop); } }
    else S[k] = v;
    renderAll();
  }
  function days(){
    if(!(S.A || S.B) || !S.start || !S.stop || S.stop <= S.start) return [];
    return PMSHEAT.daily(S.A && S.A.pts, S.B && S.B.pts, S.start, S.stop);
  }

  /* ── phân tích đợt đang chọn ── */
  function heaterStats(k){
    const H = S[k]; if(!H || !S.start || !S.stop) return null;
    const P = H.pts; const o = { k, kg:0, runMin:0, maxGap:0, gapAt:0, drops:[], cover:true, peak:0, peakAt:0 };
    const u = PMSHEAT.used(k === 'A' ? P : null, k === 'B' ? P : null, S.start, S.stop); o.kg = k === 'A' ? u.a : u.b;
    if(!P.length || P[0][0] > S.start + 60e3 || P[P.length-1][0] < S.stop - 60e3) o.cover = false;
    let hourKg = {}, prev = null;
    for(const p of P){
      if(p[0] < S.start){ prev = p; continue; }
      if(p[0] > S.stop) break;
      if(prev){
        const dt = p[0] - prev[0], dv = p[1] - prev[1];
        if(dt > o.maxGap){ o.maxGap = dt; o.gapAt = prev[0]; }
        if(dv < -1) o.drops.push({ t:p[0], from:prev[1], to:p[1] });
        if(dv >= STEP_KG) o.runMin += Math.round(dt / 60e3);
        if(dv > 0){ const hk = Math.floor(p[0] / 3600e3); hourKg[hk] = (hourKg[hk] || 0) + dv; }
      }
      prev = p;
    }
    Object.keys(hourKg).forEach(h => { if(hourKg[h] > o.peak){ o.peak = hourKg[h]; o.peakAt = +h * 3600e3; } });
    o.rate = o.runMin ? o.kg / (o.runMin / 60) : 0;
    o.hourKg = hourKg;
    return o;
  }
  function checks(){
    const out = [], add = (lvl, t) => out.push({ lvl, t });
    if(S.pending.length) add('bad', S.pending.length+' file(s) not recognised as Heater A or B — assign them above.');
    if(!S.A) add('warn', 'Heater A file (PRO2.FQT32331) not loaded.');
    if(!S.B) add('warn', 'Heater B file (PRO2.FQT32341) not loaded.');
    if(!(S.A || S.B)) return out;
    if(!S.start || !S.stop){ add('warn', 'No heater run found — set START / STOP by hand.'); return out; }
    if(S.stop <= S.start) add('bad', 'STOP is before START.');
    ['A','B'].forEach(k => { const s = heaterStats(k); if(!s) return;
      if(!s.cover) add('bad', HNAME[k]+': the PMS file does not cover the whole START → STOP window — the missing part counts as 0 kg.');
      if(s.maxGap > GAP_WARN) add('warn', HNAME[k]+': no PMS data for '+Math.round(s.maxGap / 60e3)+' min after '+ts(s.gapAt)+' — the counter jump over that gap is still counted, check it looks right.');
      s.drops.forEach(d => add('bad', HNAME[k]+': counter dropped at '+ts(d.t)+' ('+fmt(d.from,0)+' → '+fmt(d.to,0)+' kg) — meter reset? The daily split is a counter difference: correct that day by hand.'));
      if(s.kg === 0) add('info', HNAME[k]+' did not run in this window.');
    });
    const a = heaterStats('A'), b = heaterStats('B');
    if(a && b && a.kg > 0 && b.kg > 0){ const sh = a.kg / (a.kg + b.kg);
      if(sh < 0.2 || sh > 0.8) add('info', 'Load split A / B = '+Math.round(sh*100)+' / '+Math.round((1-sh)*100)+' % — one heater carried most of the duty.'); }
    const r = S.runs[S.run];
    if(S.manual && !r) add('info', 'START / STOP edited by hand (not an automatically detected run).');
    if(!S.vessel) add('warn', 'Vessel name is empty.');
    if(!out.length) add('ok', 'Data complete for the selected run.');
    return out;
  }

  /* ── ghi Cavern Daily + điền file báo cáo ── */
  function saveCavern(){
    if(!mayWrite('sap')){ toastM('⛔ Your account has no write permission', 'er'); return false; }
    const D = days(); if(!D.length){ toastM('Pick START / STOP first', 'er'); return false; }
    if(typeof CAV === 'undefined'){ toastM('Cavern Daily not loaded', 'er'); return false; }
    const old = (CAV.ROWS || []).filter(r => r && r.kind === 'heater' && r.prod === 'c3' && D.some(d => d.date === r.date));
    if(old.length && !confirm('Cavern Daily already has '+old.length+' Heater C3 entr'+(old.length>1?'ies':'y')+' on these days.\n\nOK = replace them with the PMS figures · Cancel = keep them')) return false;
    old.forEach(r => CAV.removeSilent(r._rid));
    const note = 'PMS FQT32331+FQT32341 · '+(S.vessel || '')+' · '+ts(S.start)+' → '+ts(S.stop);
    D.forEach(d => { if(d.total > 0) CAV.pushEntry(d.date, 'heater', 'c3', 'D', d.total, note); });
    try{ CAV.render(); }catch(_){}
    /* v4.196 — cùng một lần bấm ghi luôn lịch sử heater (heater_day A/B theo ngày + heater_voy) */
    try{ if(typeof HTRH !== 'undefined') HTRH.savePmsRun(D, { vessel:S.vessel, amount:num(S.amount), start:S.start, stop:S.stop }); }catch(e){ console.warn(e); }
    toastM('💾 Heater C3 saved to Cavern Daily + heater history · '+D.length+' day(s)', 'ok');
    return true;
  }
  async function master(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return null;
    const D = days(); if(!D.length){ toastM('Load the PMS files and pick START / STOP first', 'er'); return null; }
    if(S.pending.length && !confirm(S.pending.length+' PMS file(s) are still not assigned to Heater A / B.\n\nOK = build the report without them')) return null;
    try{
      const out = await PMSHEAT.buildMaster(f, { A:S.A && S.A.pts, B:S.B && S.B.pts, start:S.start, stop:S.stop, days:D, vessel:S.vessel, amount:num(S.amount) });
      S.lastOut = { blob:out.blob, name:f.name, sheet:out.sheet, sumRow:out.sumRow, at:Date.now() };
      download(out.blob, f.name);
      toastM('⬇ '+f.name+' — sheet '+out.sheet+' added'+(out.sumRow ? ' + Sumary row '+out.sumRow : ''), 'ok');
      renderAll();
      return out;
    }catch(e){ console.error(e); toastM('⚠ Heater file: '+e.message, 'er'); return null; }
  }

  /* ── biểu đồ: kg theo GIỜ (cột chồng A/B) + lượng cộng dồn ── */
  function chartHourly(){
    if(!S.start || !S.stop) return '';
    const a = heaterStats('A'), b = heaterStats('B');
    const h0 = Math.floor(S.start / 3600e3), h1 = Math.ceil(S.stop / 3600e3);
    const n = Math.max(1, h1 - h0);
    const W = 1000, H = 220, L = 52, R = 12, T = 14, B = 26, bw = (W - L - R) / n;
    let ymax = 1; for(let h = h0; h < h1; h++) ymax = Math.max(ymax, ((a && a.hourKg[h]) || 0) + ((b && b.hourKg[h]) || 0));
    /* vạch chia "đẹp": 1-2-5 × 10ⁿ */
    const raw = ymax / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), stp = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw);
    ymax = Math.ceil(ymax / stp) * stp;
    const Y = v => T + (H - T - B) * (1 - v / ymax);
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hourly heater consumption">';
    for(let v = 0; v <= ymax + 1e-9; v += stp){ g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="dp-grid"/><text x="'+(L-5)+'" y="'+(Y(v)+3)+'" class="dp-ax" text-anchor="end">'+fmt(v,0)+'</text>'; }
    for(let h = h0; h < h1; h++){
      const x = L + (h - h0) * bw, va = (a && a.hourKg[h]) || 0, vb = (b && b.hourKg[h]) || 0, d = new Date(h * 3600e3);
      const lbl = two(d.getDate())+'/'+two(d.getMonth()+1)+' '+two(d.getHours())+':00';
      if(va) g += '<rect x="'+(x+0.5).toFixed(1)+'" y="'+Y(va).toFixed(1)+'" width="'+Math.max(1, bw-1).toFixed(1)+'" height="'+(Y(0)-Y(va)).toFixed(1)+'" fill="#2563eb"><title>'+lbl+' · Heater A '+fmt(va,0)+' kg</title></rect>';
      if(vb) g += '<rect x="'+(x+0.5).toFixed(1)+'" y="'+Y(va+vb).toFixed(1)+'" width="'+Math.max(1, bw-1).toFixed(1)+'" height="'+(Y(va)-Y(va+vb)).toFixed(1)+'" fill="#dc2626"><title>'+lbl+' · Heater B '+fmt(vb,0)+' kg</title></rect>';
      if(d.getHours() === 0) g += '<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-B)+'" class="dp-mid"/><text x="'+(x+3)+'" y="'+(H-8)+'" class="dp-ax">00:00 '+two(d.getDate())+'/'+two(d.getMonth()+1)+'</text>';
    }
    return g + '</svg>';
  }

  /* ── vẽ ── */
  function fileCard(k){
    const H = S[k];
    if(!H) return '<div class="ht-fc ht-miss"><b>'+HNAME[k]+'</b> <small>PRO2.'+PMSHEAT.TAG_OF[k]+'</small><div>○ not loaded</div></div>';
    const P = H.pts;
    return '<div class="ht-fc ht-'+k+'"><b>'+HNAME[k]+'</b> <small>PRO2.'+esc(H.tag)+'</small><button class="dp-x" title="Remove '+HNAME[k]+' data" onclick="HTR.clear(\''+k+'\')">✕</button>'+
      '<div title="'+esc(H.file)+'">📄 '+esc(H.file)+'</div>'+
      '<div class="ht-sub">'+P.length.toLocaleString('en-US')+' points · '+ts(P[0][0])+' → '+ts(P[P.length-1][0])+'</div>'+
      '<div class="ht-sub">recognised by: '+esc(H.how)+'</div></div>';
  }
  function render(){
    const w = $('htrWrap'); if(!w) return;
    const st = $('htrStats'), D = days();
    const gA = D.reduce((s,d)=>s+d.a,0), gB = D.reduce((s,d)=>s+d.b,0);
    if(st) st.innerHTML = D.length ? 'run <b>'+fmt(gA+gB,0)+'</b> kg · '+D.length+' day(s)' : '';
    let h = '';
    if(!S.A && !S.B && !S.pending.length){
      h += '<div class="eng-paste-overlay ht-drop" onclick="document.getElementById(\'htrFileIn\').click()">'+
        '<div class="eng-paste-icon">🔥</div><div class="eng-paste-title">DROP THE PMS FILES HERE</div>'+
        '<div class="eng-paste-hint">TagMonitoringReport exported from PMS (per-minute data), one file per tag — select or drop <strong>both files at once</strong>, in any order.<br>'+
        'The app reads the tag in each file and assigns it: <strong>FQT32331 → Heater A</strong> · <strong>FQT32341 → Heater B</strong>.<br><em>A file it cannot recognise is kept aside and you choose A or B with one click.</em></div></div>';
      w.innerHTML = h; return;
    }
    /* file */
    h += '<div class="dp-card"><div class="dp-h">📈 PMS data <button class="eng-btn" style="margin-left:auto" onclick="HTR.swap()" title="The files were assigned the wrong way round? Swap Heater A and Heater B">⇄ Swap A / B</button></div>'+
      '<div class="ht-files">'+fileCard('A')+fileCard('B')+'</div>';
    if(S.pending.length) h += '<div class="ht-pend">'+S.pending.map((p, i) =>
      '<div class="ht-pi">❓ <b>'+esc(p.file)+'</b> <small>('+p.pts.length.toLocaleString('en-US')+' points · column "'+esc(p.col)+'")</small> — this file does not say which heater it is. It is: '+
      '<button class="eng-btn blue" onclick="HTR.assign('+i+',\'A\')">Heater A</button><button class="eng-btn red" onclick="HTR.assign('+i+',\'B\')">Heater B</button>'+
      '<button class="dp-x" title="Discard this file" onclick="HTR.dropPending('+i+')">✕</button></div>').join('')+'</div>';
    h += '</div>';
    /* đợt chạy + START/STOP */
    h += '<div class="dp-card"><div class="dp-h">⏱ Heater run</div>';
    if(S.runs.length) h += '<div class="ht-runs">'+S.runs.map((r, i) => '<label class="ht-run'+(i === S.run ? ' on' : '')+'"><input type="radio" name="htrRun"'+(i === S.run ? ' checked' : '')+' onchange="HTR.setRun('+i+')"> '+
      ts(r.start).slice(5)+' → '+ts(r.stop).slice(5)+' · <b>'+fmt(r.a + r.b,0)+'</b> kg</label>').join('')+'</div>';
    else h += '<div class="dp-hint">No run detected automatically (counter never rose ≥ 3 kg/min for 200 kg) — set START / STOP by hand.</div>';
    h += '<div class="dp-row">'+
      '<label title="Suggested from the flow meters — adjust if needed">START <input type="datetime-local" step="60" value="'+dtLocal(S.start)+'" onchange="HTR.set(\'start\',this.value)"></label>'+
      '<label>STOP <input type="datetime-local" step="60" value="'+dtLocal(S.stop)+'" onchange="HTR.set(\'stop\',this.value)"></label>'+
      '<label>Vessel <input value="'+esc(S.vessel)+'" placeholder="e.g. BW VAR" onchange="HTR.set(\'vessel\',this.value)" style="width:130px"></label>'+
      '<label title="Written to the Sumary sheet (column E)">Amount (ton) <input value="'+esc(S.amount)+'" placeholder="optional" onchange="HTR.set(\'amount\',this.value)" style="width:80px"></label>'+
      (S.manual ? '<span class="dp-dirty">✎ edited by hand</span>' : '')+'</div></div>';
    /* nhận định */
    h += '<div class="dp-card"><div class="dp-h">🔎 Checks</div><ul class="dp-al">'+checks().map(a => '<li class="dp-'+a.lvl+'">'+esc(a.t)+'</li>').join('')+'</ul></div>';
    if(D.length){
      /* bảng ngày */
      const a = heaterStats('A'), b = heaterStats('B');
      h += '<div class="dp-grid2"><div class="dp-card"><div class="dp-h">🗓 Daily consumption (split at 00:00)</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Date</th><th>From</th><th>To</th><th>Heater A (kg)</th><th>Heater B (kg)</th><th>Total (kg)</th></tr></thead><tbody>'+
        D.map(d => '<tr><td class="td-c">'+ENGX_U.dmy(d.date)+'</td><td class="td-c">'+ts(d.from).slice(11)+'</td><td class="td-c">'+ts(d.to).slice(11)+'</td>'+
          '<td class="td-r" title="counter '+fmt(d.aFrom,0)+' → '+fmt(d.aTo,0)+'">'+fmt(d.a,0)+'</td><td class="td-r" title="counter '+fmt(d.bFrom,0)+' → '+fmt(d.bTo,0)+'">'+fmt(d.b,0)+'</td><td class="td-r"><b>'+fmt(d.total,0)+'</b></td></tr>').join('')+
        '<tr class="ht-tot"><td class="td-c" colspan="3">GRAND TOTAL</td><td class="td-r">'+fmt(gA,0)+'</td><td class="td-r">'+fmt(gB,0)+'</td><td class="td-r">'+fmt(gA+gB,0)+'</td></tr></tbody></table></div></div>';
      /* thống kê từng heater */
      const row = (lbl, f, tt) => '<tr><td'+(tt ? ' title="'+esc(tt)+'"' : '')+'>'+lbl+'</td><td class="td-r">'+(a ? f(a) : '–')+'</td><td class="td-r">'+(b ? f(b) : '–')+'</td></tr>';
      h += '<div class="dp-card"><div class="dp-h">📊 Run statistics</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th></th><th>Heater A</th><th>Heater B</th></tr></thead><tbody>'+
        row('Consumption (kg)', s => fmt(s.kg,0))+
        row('Running time (h)', s => fmt(s.runMin / 60,1), 'Minutes in which the counter rose ≥ 3 kg')+
        row('Average rate (kg/h)', s => fmt(s.rate,0), 'Consumption ÷ running time')+
        row('Peak hour (kg)', s => s.peak ? fmt(s.peak,0)+' <small>'+ts(s.peakAt).slice(5)+'</small>' : '–')+
        row('Longest data gap (min)', s => fmt(s.maxGap / 60e3,0))+
        row('Share of total', s => (gA + gB) ? Math.round(s.kg / (gA + gB) * 100)+' %' : '–')+
        '</tbody></table></div></div></div>';
      h += '<div class="dp-card"><div class="dp-h">📊 Hourly consumption (kg) <span class="dp-lg"><span><i style="background:#2563eb"></i>Heater A</span><span><i style="background:#dc2626"></i>Heater B</span><span>┆ midnight split</span></span></div>'+chartHourly()+'</div>';
      try{ h += '<div class="dp-card"><div class="dp-h">📈 Cumulative since START</div>'+MAIL.heatChartHtml()+'</div>'; }catch(_){}
      if(S.lastOut) h += '<div class="dp-hint">Last report built: <b>'+esc(S.lastOut.name)+'</b> · sheet '+esc(S.lastOut.sheet)+(S.lastOut.sumRow ? ' · Sumary row '+S.lastOut.sumRow : '')+
        ' — the ✉ Report Mail (P5 Heater Consumption) can attach it with one click.</div>';
    }
    const keep = w.scrollTop; w.innerHTML = h; w.scrollTop = keep;
  }
  /* vẽ lại cả tab Engineer lẫn email P5 (dùng chung trạng thái) */
  function renderAll(){
    render();
    try{ MAIL.refreshIf('P5'); }catch(_){}
  }
  function refresh(){ render(); }
  /* kéo-thả file vào vùng tab Heater */
  function _bindDrop(){
    const w = $('htrWrap'); if(!w || w.__htrDrop) return; w.__htrDrop = true;
    w.addEventListener('dragover', e => { e.preventDefault(); w.classList.add('ht-over'); });
    w.addEventListener('dragleave', () => w.classList.remove('ht-over'));
    w.addEventListener('drop', e => { e.preventDefault(); w.classList.remove('ht-over'); if(e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  }
  async function fileIn(inp){ const fl = Array.from(inp.files || []); inp.value = ''; if(fl.length) await addFiles(fl); }
  if(typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', _bindDrop);

  return { S, addFiles, fileIn, assign, dropPending, swap, clear, setRun, set, days, checks, heaterStats, saveCavern, master, render, refresh, bindDrop:_bindDrop };
})();
