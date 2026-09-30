/* ============================================================
 * ENGX — engx.js  (v4.229)
 * v4.229: biểu đồ tab Dew Point MẶC ĐỊNH kiểu Excel (chartXl): Dryer A #4f81bd / B #c0504d liền + Linear chấm, trục −40…−85
 *         nhãn 1 số lẻ, ngày m/d dựng đứng ở trên (bước 10 ngày), chú giải dưới, dòng thiếu số ⇒ đứt đường; Coalescer tick thêm;
 *         vẫn khoanh điểm vượt / sát giới hạn, ▲ số dương. Nút Excel / Detail (biểu đồ cũ) + khoảng 16 m, nhớ theo máy.
 * v4.228: Dew Point GỠ 📋 Paste history (parsePaste/paste*) · ⬇ Export Excel (exportXlsx) · ↻ Reload · 📥 Import file khỏi tab —
 *         đã có ▶ Fill file Excel, email P3 và ⇅ Sync app ← file. Thanh công cụ index.html bỏ; tiêu đề + C3/C4 + số lần đo +
 *         Load all + file Excel gộp MỘT hàng. (LABX Import file vẫn còn ở tab Heater / GC.)
 * v4.227: DEWXL ⇅ Sync app ← file — trong khoảng ngày của sheet đang chọn, lịch sử app = Y HỆT file (thêm / ghi đè / xoá,
 *         tick từng nhóm, xem trước, MỘT lệnh update); giữ nguyên số bất thường / sai và No. trùng; nhiều dòng một ngày ⇒
 *         lần đo thêm x/HHMM (có No.); Note của app giữ lại. Lần đo thêm nay đọc cả No. (listOf).
 * v4.226: DEWXL.chart(prod) — đọc biểu đồ Dryer A/B của CHÍNH file Excel (chartN.xml: vùng dữ liệu, tên + màu series theo
 *         theme, trần/sàn trục Y, dispBlanksAs) để email P3 vẽ lại khớp file đính kèm (file .xlsx không có ảnh biểu đồ).
 * v4.225: Dew Point BỎ form nhập + 4 thẻ KPI. Bảng 🕘 Readings (25 lần đo gần nhất, mới nhất ở trên) nhập / sửa / xoá TẠI CHỖ:
 *         ➕ Add reading (ngày = hôm nay, No. tự điền; ngày đã có ⇒ lần đo thêm x/HHMM), nháp S.ed chỉ lưu khi 💾 / Enter,
 *         Esc bỏ nháp, "● n not saved · Save all"; gõ không vẽ lại bảng (giữ focus). History: bấm dòng ⇒ ghim lên bảng để sửa.
 * v4.224: DEWXL — điền số dew point vào file Excel của nhân viên (chọn file ⇒ xem trước ⇒ ▶ Fill ⇒ file mới cùng thư mục),
 *         dùng chung email P3. No. tự điền (DEWPT.numbered: số đã lưu + dòng cuối file Excel, đếm tiếp). DEWPT.check /
 *         confirmCheck — MỘT bộ kiểm số cho form và email (không phải số · ngoài dải · dương · lệch ≥12 °C · dryer ướt hơn).
 *         Bảng 10 lần đo gần nhất cạnh biểu đồ; biểu đồ đo khung thật để luôn nằm trong màn hình. Hỏi bằng UIDLG.
 * v4.209: ENGX_U.tabs / pref / prefSet — hàng nút mở từng mục (nhớ theo máy); Dew Point chỉ còn MỘT biểu đồ,
 *         Findings / Statistics / Monthly / History mở bằng nút, cảnh báo nặng nhất hiện một dòng.
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
  /* v4.224 — hộp của app (UIDLG) thay confirm() trình duyệt; trả Promise<chuỗi>. Enter + change cùng nổ cho
     MỘT ô ⇒ dùng chung một lời hỏi (khoá theo nhãn + giá trị), không hiện hai hộp. */
  const _signQ = {};
  function dewSign(label, v){
    const x = num(v);
    if(x === null || x <= 0) return Promise.resolve(v);
    const neg = '-' + String(v).trim().replace(/^\+/, '');
    const key = label + '|' + String(v).trim();
    if(_signQ[key]) return _signQ[key];
    const msg = '⚠ Dew point is always NEGATIVE\n\n'+label+': you typed '+String(v).trim()+'\n\nOK = Change it to '+neg+'\nCancel = Keep it — I will correct it';
    let p;
    try{ p = (typeof UIDLG !== 'undefined' && UIDLG.ask) ? UIDLG.ask(msg) : Promise.resolve(confirm(msg)); }catch(_){ p = Promise.resolve(false); }
    return (_signQ[key] = p.then(y => { delete _signQ[key]; return y ? neg : v; }, () => { delete _signQ[key]; return v; }));
  }
  /* hỏi / báo bằng hộp của app (có dự phòng khi chạy test không có DOM) */
  function ask(msg){ try{ return (typeof UIDLG !== 'undefined' && UIDLG.ask) ? UIDLG.ask(msg) : Promise.resolve(confirm(msg)); }catch(_){ return Promise.resolve(false); } }
  function tell(msg){ try{ if(typeof UIDLG !== 'undefined' && UIDLG.alert) return UIDLG.alert(msg); alert(msg); }catch(_){} return Promise.resolve(); }
  /* v4.209 — HÀNG NÚT mở từng mục (Dew Point · Heater · GC): bấm = mở, bấm lại = đóng.
     items: [key, nhãn, badge?, 'bad'|'warn'?] · fn = tên hàm gọi khi bấm (vd. 'DEWPT.panel') */
  function tabs(fn, items, cur, cls){
    return '<div class="xp-tabs'+(cls ? ' '+cls : '')+'" role="tablist">'+items.map(([k, l, b, lv]) => '<button role="tab" aria-selected="'+(cur === k)+'" class="xp-tab'+(cur === k ? ' on' : '')+'" onclick="'+fn+'(\''+k+'\')">'+l+
      (b !== undefined && b !== null && b !== '' ? ' <span class="xp-badge'+(lv ? ' '+lv : '')+'">'+b+'</span>' : '')+'<span class="xp-car">'+(cur === k ? '▴' : '▾')+'</span></button>').join('')+'</div>';
  }
  /* mục đang mở — tiện ích THEO MÁY (localStorage), hỏng thì dùng mặc định */
  function pref(k, d){ try{ const v = localStorage.getItem('lpg_v4_'+k); return v == null ? d : v; }catch(_){ return d; } }
  function prefSet(k, v){ try{ localStorage.setItem('lpg_v4_'+k, v); }catch(_){} }
  return { esc, num, pad, isoOf, isoToday, isoAdd, dayNo, isoOfDay, dmy, fmt, toastM, anyIso, linreg, sd, mayWrite, userName, download, MON3, dewSign, ask, tell, tabs, pref, prefSet };
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
  const S = { prod:'c3', P:{ c3:blank(), c4:blank() }, range:ENGX_U.pref('dew_range', '480'), show:{ ca:1, cb:1, da:1, db:1 }, showX:{ ca:0, cb:0, da:1, db:1 }, cst:ENGX_U.pref('dew_chart', 'xl'), panel:ENGX_U.pref('dew_panel', ''), pv:null };
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
    const done = () => { if(S.prod !== prod) return; render(); };
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
  async function setProd(p){
    if(!PRODS[p] || p === S.prod) return;
    if(hasDraft() && !(await ENGX_U.ask('⚠ '+nDirty()+' row(s) not saved\n\nOK = Discard them and switch to '+PRODS[p].name+'\nCancel = Stay'))) return;   /* v4.225 */
    S.prod = p; S.ed = {}; S.pin = '';
    if(!S.loaded) load(); else render();
  }
  /* một ngày = bản ghi chính + các lần đo thêm ở r.x[HHMM] (từ file import) */
  function list(){ return listOf(S.prod); }
  function listOf(prod){
    const out = [], R = (S.P[prod] || {}).rows || {};
    Object.keys(R).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().forEach(d => {
      const r = R[d] || {};
      const o = { date:d, no:r.no == null ? '' : String(r.no), time:r.time || '', note:r.note || '', by:r.by || '', _ts:r._ts || 0, _x:'' };
      PTS.forEach(p => { o[p.k] = num(r[p.k]); }); out.push(o);
      const X = r.x && typeof r.x === 'object' ? r.x : {};
      Object.keys(X).sort().forEach(h => { const e = X[h] || {};
        const q = { date:d, no:e.no == null ? '' : String(e.no), time:e.time || (h.slice(0,2)+':'+h.slice(2)), note:e.note || '', by:e.by || r.by || '', _ts:0, _x:h };
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
  /* ⭐ v4.224 — SỐ THỨ TỰ (No.) TỰ ĐIỀN. Lịch sử cũ (import từ file lab) KHÔNG có No., nên không lấy
     "max + 1" được. Mỗi lần đo (kể cả lần đo thêm trong ngày = một dòng trong file Excel) là MỘT số:
       • số ĐÃ LƯU (người gõ) là mốc, thắng mọi thứ;
       • file Excel đang chọn (DEWXL) cho thêm một mốc: No. của dòng cuối file tại ngày cuối file;
       • giữa / sau các mốc: đếm tiếp +1; trước mốc đầu tiên: đếm lùi.
     Số suy ra chỉ để HIỂN THỊ / điền sẵn (nAuto) — chỉ lưu khi người dùng bấm 💾 cùng lần đo đó. */
  function _anchor(prod){ try{ const x = (typeof DEWXL !== 'undefined') ? DEWXL.anchor(prod) : null; return x && x.no > 0 ? x : null; }catch(_){ return null; } }
  function numbered(prod){
    const L = listOf(prod).map(r => { const n = parseInt(r.no, 10); return Object.assign({}, r, { n:(n > 0 && String(n) === String(r.no).trim()) ? n : null, nAuto:false }); });
    const A = _anchor(prod);
    if(A){
      let i = -1; L.forEach((r, j) => { if(r.date === A.date) i = j; });      /* lần đo CUỐI của ngày cuối file */
      if(i >= 0){ if(L[i].n == null){ L[i].n = A.no; L[i].nAuto = true; } }
      else { let j = L.findIndex(r => r.date > A.date); if(j < 0) j = L.length; L.splice(j, 0, { date:A.date, _virt:true, n:A.no, nAuto:true, time:'' }); }
    }
    let last = null;
    L.forEach(r => { if(r.n != null) last = r; else if(last){ r.n = last.n + 1; r.nAuto = true; last = r; } });
    const f = L.findIndex(r => r.n != null);
    for(let i = f - 1; f > 0 && i >= 0; i--){ const n = L[i+1].n - 1; if(n < 1) break; L[i].n = n; L[i].nAuto = true; }
    return L.filter(r => !r._virt);
  }
  /* No. cho lần đo CHÍNH của ngày `date` (đã có ⇒ số của nó; chưa có ⇒ số của lần đo liền trước + 1) */
  function nextNo(date, prod){
    prod = prod || S.prod; date = date || isoToday();
    const N = numbered(prod);
    const own = N.find(r => r.date === date && !r._x); if(own && own.n != null) return String(own.n);
    let prev = null; N.forEach(r => { if(r.date < date) prev = r; });
    if(prev && prev.n != null) return String(prev.n + 1);
    const A = _anchor(prod); if(A && A.date < date) return String(A.no + 1);
    return '';
  }
  /* ⭐ v4.224 — MỘT bộ kiểm số dew point cho CẢ form Engineer ▸ 💧 Dew Point và email P3.
     err  = chặn lưu (không phải số · ngoài dải vật lý −110…+30 °C, ví dụ gõ −672 thay vì −67.2)
     warn = hỏi lại (số DƯƠNG — thiếu dấu âm · vượt giới hạn · lệch ≥ 12 °C so với lần đo trước — gõ nhầm
            −7.5 thay vì −75 · dryer ướt hơn coalescer cùng nhánh) */
  const JUMP = 12;
  function check(prod, date, raw){
    const err = [], warn = [], v = {};
    const prevOf = k => { let o = null; listOf(prod).forEach(r => { if(r.date < date && r[k] != null) o = r; }); return o; };
    PTS.forEach(p => {
      const t = raw[p.k] == null ? '' : String(raw[p.k]).trim(); if(t === '') return;
      const x = num(t);
      if(x == null || !/^[\s+\-−]*\d*[.,]?\d+\s*(°?\s*C)?\s*$/i.test(t)){ err.push(p.n+': "'+t+'" is not a number'); return; }
      v[p.k] = x;
      if(x > 0 && x <= 110){ warn.push(p.n+': '+x+' °C is POSITIVE — missing minus sign?'); return; }
      if(x < -110 || x > 30){ err.push(p.n+': '+x+' °C is outside the physical range (−110 … +30 °C) — typo?'); return; }
      if(x >= p.lim) warn.push(p.n+': '+fmt(x,1)+' °C is OFF-SPEC (limit < '+p.lim+' °C)');
      const pv = prevOf(p.k);
      if(pv && Math.abs(x - pv[p.k]) >= JUMP) warn.push(p.n+': '+fmt(x,1)+' °C vs '+fmt(pv[p.k],1)+' °C on '+dmy(pv.date)+' (Δ '+fmt(Math.abs(x - pv[p.k]),1)+' °C) — check the value');
    });
    [['A','ca','da'],['B','cb','db']].forEach(([t, c, r]) => {
      if(v[c] != null && v[r] != null && v[c] <= 0 && v[r] <= 0 && v[r] > v[c]) warn.push('Train '+t+': dryer outlet '+fmt(v[r],1)+' °C is wetter than coalescer outlet '+fmt(v[c],1)+' °C');
    });
    return { err, warn, v };
  }
  /* chạy bộ kiểm + hỏi bằng hộp của app ⇒ Promise<true = được lưu> */
  async function confirmCheck(prod, date, raw){
    const c = check(prod, date, raw);
    if(c.err.length){ await ENGX_U.tell('⛔ Cannot save — '+PRODS[prod].short+' dew point '+dmy(date)+'\n\n'+c.err.map(x => '• '+x).join('\n')); return false; }
    if(c.warn.length) return ENGX_U.ask('⚠ Check the dew point readings — '+PRODS[prod].short+' '+dmy(date)+'\n\n'+c.warn.map(x => '• '+x).join('\n')+'\n\nOK = Save anyway\nCancel = Go back and fix');
    return true;
  }
  /* màu ô nhập (dùng chung form + email): bad = không phải số / dương / ngoài dải · off · near */
  function inState(k, t){
    const p = PTS.find(q => q.k === k); t = t == null ? '' : String(t).trim(); if(!p || t === '') return '';
    const x = num(t);
    if(x == null || !/^[\s+\-−]*\d*[.,]?\d+\s*(°?\s*C)?\s*$/i.test(t) || x > 0 || x < -110) return 'bad';
    return x >= p.lim ? 'off' : p.lim - x < NEAR ? 'near' : '';
  }
  /* n lần đo gần nhất TRƯỚC ngày `date` (email P3: 2 đợt trước + đợt của ngày gửi) */
  function recent(prod, date, n){ return numbered(prod).filter(r => r.date < date).slice(-n); }

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

  /* ═══ ⭐ v4.225 — NHẬP / SỬA NGAY TRÊN BẢNG (bỏ form + 4 thẻ KPI) ═══════════════════════════════
     • ➕ Add reading ⇒ một dòng mới ở ĐẦU bảng, ngày = HÔM NAY (tự ghi nhận, sửa được), giờ 09:00, No. tự điền.
       Ngày đó đã có lần đo ⇒ lưu thành LẦN ĐO THÊM (x/<HHMM>) theo giờ gõ.
     • Mọi ô của dòng đã lưu sửa được tại chỗ (dòng lần-đo-thêm: sửa 4 số + Note; Date / Time là khoá nên khoá lại).
     • Số gõ chỉ nằm trong NHÁP (S.ed) — KHÔNG tự lưu: dòng đang sửa tô vàng + nút 💾 / ↺; Enter = lưu dòng,
       Esc = bỏ nháp dòng; đầu bảng có "● n not saved · 💾 Save all · ↺ Discard". Tắt trang khi còn nháp ⇒ trình duyệt hỏi.
     • Gõ không vẽ lại cả bảng (mất focus — luật HANDBOOK #8): chỉ cập nhật màu ô + trạng thái dòng tại chỗ.
     • Bảng xếp MỚI NHẤT → CŨ NHẤT; 🗑 xoá dòng (hỏi bằng UIDLG). Dòng cũ hơn: mở 📋 History, bấm dòng ⇒ ghim lên bảng để sửa. */
  const EDF = ['no','time','note'].concat(PTS.map(p => p.k));
  S.ed = {}; S.pin = ''; S.focus = '';
  const _xh = k => k.indexOf('|') > 0 ? k.split('|')[1] : '';
  const _dt = k => k === 'new' ? ((S.ed.new || {}).date || isoToday()) : k.split('|')[0];
  /* giá trị ĐÃ LƯU của một dòng (chuỗi) */
  function _saved(k){
    if(k === 'new') return { no:'', time:'09:00', note:'', ca:'', cb:'', da:'', db:'' };
    const d = _dt(k), h = _xh(k), R = S.rows[d] || {}, e = h ? ((R.x || {})[h] || {}) : R, o = {};
    EDF.forEach(f => { o[f] = e[f] == null ? '' : String(e[f]); });
    PTS.forEach(p => { if(typeof e[p.k] === 'number' && isFinite(e[p.k])) o[p.k] = e[p.k].toFixed(1); });   /* hiện −66.0 thay vì −66 */
    if(h && !o.time) o.time = h.slice(0,2)+':'+h.slice(2);
    return o;
  }
  function _val(k, f){ const d = S.ed[k]; return d && d.v[f] !== undefined ? d.v[f] : _saved(k)[f]; }
  function nDirty(){ return Object.keys(S.ed).filter(k => k === 'new' || Object.keys(S.ed[k].v).length).length; }
  function hasDraft(){ return nDirty() > 0; }
  function add(){
    if(!S.ed.new){ const t = isoToday(); S.ed.new = { date:t, v:{ time:'09:00' } }; }
    S.focus = 'new|ca'; render();
  }
  /* đặt một ô (dùng cho ô nhập và cho test). Trả Promise<giá trị cuối> */
  async function setCell(k, f, v){
    v = v == null ? '' : String(v);
    const P0 = PTS.find(p => p.k === f);
    if(P0 && num(v) > 0) v = await ENGX_U.dewSign(P0.full, v);                 /* số dương ⇒ hỏi ngay (hộp của app) */
    if(k === 'new'){ const d = S.ed.new || (S.ed.new = { date:isoToday(), v:{ time:'09:00' } });
      if(f === 'date'){ d.date = v; return v; } d.v[f] = v; return v; }
    const d = S.ed[k] || (S.ed[k] = { v:{} });
    if(v === _saved(k)[f]) delete d.v[f]; else d.v[f] = v;
    if(!Object.keys(d.v).length) delete S.ed[k];
    return v;
  }
  /* ô nhập đổi ⇒ cập nhật TẠI CHỖ (không vẽ lại bảng) */
  async function cellIn(el){
    const k = el.getAttribute('data-k'), f = el.getAttribute('data-f');
    const v = await setCell(k, f, el.value);
    if(el.value !== v) el.value = v;
    if(PTS.some(p => p.k === f)){ const st = inState(f, v); el.className = el.className.replace(/\s*dp-(bad|off|near)\b/g, '') + (st ? ' dp-'+st : ''); }
    if(f === 'no'){ const auto = !String(v).trim(); el.classList.toggle('dp-auto', auto); if(auto) el.value = nextNo(_dt(k)); }
    if(k === 'new' && f === 'date'){ const tr = el.closest('tr'), no = tr && tr.querySelector('[data-f="no"]');
      if(no && !String(_val('new','no')).trim()) no.value = nextNo(v);
      if(tr) tr.title = S.rows[v] ? dmy(v)+' already has a reading — this one is saved as an EXTRA reading of that day (at the time you type)' : 'New reading'; }
    _markRow(k);
  }
  function _markRow(k){
    if(typeof document === 'undefined') return;
    const tr = document.querySelector('tr[data-row="'+k+'"]'); if(tr) tr.classList.toggle('dp-rdirty', k === 'new' || !!S.ed[k]);
    const n = nDirty(), b = $('dpDirty'); if(b){ b.style.display = n ? '' : 'none'; const c = b.querySelector('b'); if(c) c.textContent = n; }
  }
  function key(e, el){
    if(e.key === 'Enter'){ e.preventDefault(); const k = el.getAttribute('data-k'); cellIn(el).then(() => saveRow(k)); }
    else if(e.key === 'Escape'){ e.preventDefault(); discard(el.getAttribute('data-k')); }
  }
  function discard(k){ if(k) delete S.ed[k]; else S.ed = {}; render(); }
  async function discardAll(){ if(!hasDraft() || await ENGX_U.ask('⚠ Discard '+nDirty()+' unsaved row(s)?\n\nOK = Discard\nCancel = Keep editing')) discard(); }
  /* 💾 lưu MỘT dòng ⇒ Promise<true> */
  async function saveRow(k){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return false; }
    const prod = S.prod, rows = S.rows, dr = S.ed[k];
    if(!dr) return true;
    const date = _dt(k), h = _xh(k), raw = {}; EDF.forEach(f => { raw[f] = String(_val(k, f) == null ? '' : _val(k, f)).trim(); });
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ ENGX_U.tell('⛔ Pick the date of the new reading'); return false; }
    if(!PTS.some(p => raw[p.k] !== '')){ ENGX_U.tell('⛔ Nothing to save — '+dmy(date)+'\n\nType at least one of Coalescer A / B, Dryer A / B.'); return false; }
    if(raw.time && !/^\d{1,2}:\d{2}$/.test(raw.time)){ ENGX_U.tell('⛔ Time "'+raw.time+'" — use hh:mm (e.g. 09:00)'); return false; }
    if(raw.time) raw.time = raw.time.padStart(5, '0');
    if(!(await confirmCheck(prod, date, raw))) return false;                 /* một bộ kiểm với email P3 */
    const pv = {}; PTS.forEach(p => { const v = num(raw[p.k]); pv[p.k] = v == null ? '' : v; });
    const by = userName(), now = Date.now(), base = PRODS[prod].node+'/'+date;
    let path, rec, apply;
    if(k === 'new' && rows[date]){                                            /* ngày đã có ⇒ lần đo THÊM */
      const hh = (raw.time || '').replace(':', '');
      if(!hh){ ENGX_U.tell('⛔ '+dmy(date)+' already has a reading\n\nType the time of this extra reading (hh:mm).'); return false; }
      if((rows[date].time || '09:00') === raw.time || (rows[date].x && rows[date].x[hh])){ ENGX_U.tell('⛔ '+dmy(date)+' already has a reading at '+raw.time+'\n\nEdit that row in the table, or type another time.'); return false; }
      if(!(await ENGX_U.ask('ℹ Add an extra reading?\n\n'+dmy(date)+' already has a reading ('+(rows[date].time || '09:00')+').\n\nOK = Save as an extra reading at '+raw.time+'\nCancel = Go back'))) return false;
      path = base+'/x/'+hh; rec = Object.assign({ time:raw.time, note:raw.note, by, _ts:now }, pv);
      apply = () => { rows[date].x = rows[date].x || {}; rows[date].x[hh] = rec; };
    } else if(h){                                                              /* sửa lần đo thêm */
      const old = ((rows[date] || {}).x || {})[h] || {};
      path = base+'/x/'+h; rec = Object.assign({}, old, { note:raw.note, by, _ts:now }, pv);
      apply = () => { rows[date].x[h] = rec; };
    } else {                                                                   /* bản ghi chính (mới / sửa) */
      const old = rows[date] || {};
      rec = Object.assign({}, old, { no:raw.no || nextNo(date, prod), time:raw.time, note:raw.note, _ts:now, by }, pv);
      path = base; apply = () => { rows[date] = rec; };
    }
    try{
      await firebase.database().ref(path).set(rec);
      apply(); delete S.ed[k];
      toastM('💾 '+PRODS[prod].short+' dew point '+dmy(date)+(path.indexOf('/x/') > 0 ? ' (extra '+rec.time+')' : '')+' saved', 'ok');
      if(prod === 'c3'){ try{ MAIL.dewReload(date); }catch(_){} }
      if(S.prod === prod) render();
      return true;
    }catch(e){ toastM('⚠ Save failed: '+e.message, 'er'); return false; }
  }
  async function saveAll(){ for(const k of Object.keys(S.ed)){ if(!(await saveRow(k))) return false; } return true; }
  function pin(k){ S.pin = k; S.focus = k+'|ca'; render(); const t = $('dpRecent'); if(t && t.scrollIntoView) t.scrollIntoView({ block:'nearest' }); }
  try{ window.addEventListener('beforeunload', e => { if(hasDraft()){ e.preventDefault(); e.returnValue = ''; } }); }catch(_){}
  async function del(date){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    if(!(await ENGX_U.ask('⚠ Delete the '+PRODS[S.prod].short+' dew point reading of '+dmy(date)+'?'+((S.rows[date] && S.rows[date].x) ? '\n\nThe extra readings of that day are deleted too.' : '')+'\n\nThis cannot be undone.\n\nOK = Delete\nCancel = Keep'))) return;
    const prod = S.prod, rows = S.rows;
    firebase.database().ref(node()+'/'+date).remove().then(() => {
      delete rows[date]; Object.keys(S.ed).forEach(k => { if(k !== 'new' && _dt(k) === date) delete S.ed[k]; });
      toastM('🗑 '+dmy(date)+' deleted', 'ok');
      if(prod === 'c3'){ try{ MAIL.dewReload(date); }catch(_){} }
      render();
    }).catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }
  /* xoá một lần đo THÊM (x/<HHMM>) — bản ghi chính của ngày giữ nguyên */
  async function delX(date, h){
    if(!mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    if(!(await ENGX_U.ask('⚠ Delete the extra reading '+dmy(date)+' '+h.slice(0,2)+':'+h.slice(2)+'?\n\nOK = Delete\nCancel = Keep'))) return;
    const rows = S.rows;
    firebase.database().ref(node()+'/'+date+'/x/'+h).remove().then(() => {
      if(rows[date] && rows[date].x){ delete rows[date].x[h]; if(!Object.keys(rows[date].x).length) delete rows[date].x; }
      delete S.ed[date+'|'+h]; toastM('🗑 extra reading deleted', 'ok'); render();
    }).catch(e => toastM('⚠ Delete failed: '+e.message, 'er'));
  }

  /* ── thống kê theo tháng (📊 / 🗓) — v4.228 bỏ ⬇ Export Excel (đã có ▶ Fill file Excel + email P3) và 📋 Paste history (đã có ⇅ Sync app ← file) ── */
  function monthly(L){
    const g = {};
    L.forEach(r => { const ym = r.date.slice(0,7); const m = g[ym] || (g[ym] = { ym, n:0 }); m.n++;
      PTS.forEach(p => { const v = r[p.k]; if(v == null) return; const s = m[p.k] || (m[p.k] = { sum:0, n:0, min:v, max:v, off:0 });
        s.sum += v; s.n++; s.min = Math.min(s.min, v); s.max = Math.max(s.max, v); if(v >= p.lim) s.off++; }); });
    return Object.values(g).sort((a,b) => a.ym < b.ym ? 1 : -1).map(m => { PTS.forEach(p => { if(m[p.k]) m[p.k].avg = m[p.k].sum / m[p.k].n; }); return m; });
  }
  /* ── biểu đồ SVG ── */
  /* ⭐ v4.229 — BIỂU ĐỒ KIỂU EXCEL (mặc định): giống biểu đồ "Dew Point of C3 Dryer Outlet" trong file của nhân viên để
     so sánh bằng mắt — Dryer A xanh #4f81bd · Dryer B đỏ #c0504d (màu theme Excel), đường liền không marker, xu hướng
     tuyến tính chấm, trục Y trần −40 · sàn −85 (nới khi số vượt), nhãn 1 số lẻ, nhãn ngày m/d dựng đứng ở TRÊN,
     chú giải dưới; ô trống ⇒ ĐỨT đường như Excel (dispBlanksAs=gap). Coalescer A/B tick thêm được (màu theme kế tiếp).
     Giữ phần giúp phát hiện bất thường: điểm vượt giới hạn / sát giới hạn khoanh tròn, số dương / ngoài dải ▲ ở mép,
     rê chuột vào đường xem từng lần đo. Nút "Detail" = biểu đồ cũ (vạch giới hạn, vùng đỏ). */
  const XCOL = { ca:'#9bbb59', cb:'#8064a2', da:'#4f81bd', db:'#c0504d' };
  function chartXl(L, W, H){
    const shown = PTS.filter(p => S.showX[p.k]);
    const pts = L.filter(r => shown.some(p => r[p.k] != null));
    if(!pts.length) return '<div class="dp-empty">No reading in this range.</div>';
    W = Math.max(360, Math.round(W || 1000)); H = Math.max(200, Math.round(H || 320));
    const Lm = 58, Rm = 14, T = 76, B = 42;
    let d0 = dayNo(pts[0].date), d1 = dayNo(pts[pts.length-1].date); if(d1 - d0 < 6){ d0 -= 3; d1 += 3; }
    const vals = pts.flatMap(r => shown.map(p => r[p.k]).filter(v => v != null && v <= 0 && v >= -110));
    const hi = Math.max(-40, Math.ceil(Math.max(...vals) / 5) * 5), lo = Math.min(-85, Math.floor(Math.min(...vals) / 5) * 5);
    const X = d => Lm + (d - d0) / (d1 - d0) * (W - Lm - Rm), Y = v => T + (hi - Math.min(hi, Math.max(lo, v))) / (hi - lo) * (H - T - B);
    const gs = (H - T - B) / ((hi - lo) / 5) < 14 ? 10 : 5;
    let g = '<svg class="dp-svg dp-xls" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Dew point chart">'+
      '<text x="'+(W/2)+'" y="16" class="dx-t" text-anchor="middle">Dew Point of '+PRODS[S.prod].short+(shown.every(p => p.k === 'da' || p.k === 'db') ? ' Dryer Outlet' : '')+'</text>';
    for(let v = Math.floor(hi / gs) * gs; v >= lo; v -= gs) g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" class="dx-gr"/><text x="'+(Lm-6)+'" y="'+(Y(v)+3.5).toFixed(1)+'" class="dx-ax" text-anchor="end">'+v.toFixed(1)+'</text>';
    g += '<text transform="translate(14,'+((T + H - B) / 2)+') rotate(-90)" class="dx-yt" text-anchor="middle">Dew Point (°C)</text>';
    /* nhãn ngày m/d dựng đứng phía trên — bước 10 ngày như Excel, giãn ra khi hẹp */
    let step = 10; while((d1 - d0) / step * 13 > (W - Lm - Rm)) step += 10;
    for(let d = d0; d <= d1; d += step){ const i = isoOfDay(d); g += '<text transform="translate('+(X(d)+3).toFixed(1)+','+(T-5)+') rotate(-90)" class="dx-ax">'+(+i.slice(5,7))+'/'+(+i.slice(8,10))+'</text>'; }
    g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+T+'" y2="'+T+'" class="dx-top"/>';
    shown.forEach(p => {
      const col = XCOL[p.k];
      /* đường: đi theo MỌI dòng của khoảng; dòng thiếu điểm này ⇒ đứt (giống ô trống trong Excel) */
      let d = '', pen = false;
      pts.forEach(r => { const v = r[p.k]; if(v == null || v > hi || v < lo){ pen = false; return; } d += (pen ? 'L' : 'M')+X(dayNo(r.date)).toFixed(1)+','+Y(v).toFixed(1); pen = true; });
      if(d) g += '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-linejoin="round"/>';
      const s = pts.filter(r => r[p.k] != null && r[p.k] <= 0 && r[p.k] >= -110);
      const lr = s.length > 1 ? linreg(s.map(r => [dayNo(r.date), r[p.k]])) : null;
      if(lr){ const xa = dayNo(s[0].date), xb = dayNo(s[s.length-1].date);
        g += '<line x1="'+X(xa).toFixed(1)+'" y1="'+Y(lr.a + lr.b * xa).toFixed(1)+'" x2="'+X(xb).toFixed(1)+'" y2="'+Y(lr.a + lr.b * xb).toFixed(1)+'" stroke="'+col+'" stroke-width="1.5" stroke-dasharray="2 3"><title>Linear trend '+p.full+': '+(lr.b * 30 >= 0 ? '+' : '')+fmt(lr.b * 30, 2)+' °C / 30 days</title></line>'; }
      /* điểm để rê chuột + khoanh điểm bất thường */
      pts.forEach(r => { const v = r[p.k]; if(v == null) return; const x = X(dayNo(r.date)).toFixed(1);
        const tip = '<title>'+dmy(r.date)+(r.time ? ' '+esc(r.time) : '')+(r.n != null ? ' · No.'+r.n : '')+' · '+p.full+' '+fmt(v,1)+' °C</title>';
        if(v > hi || v < lo){ g += '<path d="M'+(+x-5)+','+(Y(v)+(v > hi ? 8 : -8)).toFixed(1)+' l5,'+(v > hi ? -8 : 8)+' l5,'+(v > hi ? 8 : -8)+'z" fill="#dc2626">'+tip.replace('</title>', ' — outside the chart (positive / invalid value?)</title>')+'</path>'; return; }
        const off = v >= p.lim, near = !off && p.lim - v < NEAR;
        g += off || near ? '<circle cx="'+x+'" cy="'+Y(v).toFixed(1)+'" r="4" fill="#fff" stroke="'+(off ? '#b91c1c' : '#b45309')+'" stroke-width="2">'+tip.replace('</title>', off ? ' — OFF-SPEC</title>' : ' — near limit</title>')+'</circle>'
                          : '<circle cx="'+x+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="transparent" class="dx-hit">'+tip+'</circle>'; });
    });
    /* chú giải dưới */
    const items = []; shown.forEach(p => { items.push([p, 0]); items.push([p, 1]); });
    let lx = Lm + 10; const ly = H - 14;
    const lab = (p, tr, sh) => (tr ? 'Linear (' : '')+(sh ? p.n : p.full)+(tr ? ')' : ''), wOf = t => 26 + t.length * 6.2 + 18;
    const short = items.reduce((a, [p, tr]) => a + wOf(lab(p, tr, false)), Lm + 10) > W - Rm;      /* không đủ chỗ ⇒ tên ngắn */
    items.forEach(([p, tr]) => { const t = lab(p, tr, short), w = wOf(t);
      if(lx + w > W - Rm) return;
      g += '<line x1="'+lx+'" x2="'+(lx+22)+'" y1="'+ly+'" y2="'+ly+'" stroke="'+XCOL[p.k]+'" stroke-width="'+(tr ? 1.5 : 2.4)+'"'+(tr ? ' stroke-dasharray="2 3"' : '')+'/><text x="'+(lx+27)+'" y="'+(ly+3.5)+'" class="dx-ax">'+t+'</text>'; lx += w; });
    return g + '</svg>';
  }
  /* v4.224 — W/H = kích thước THẬT của khung (đo sau khi vẽ) ⇒ chữ đúng cỡ, biểu đồ luôn nằm trong màn hình */
  function chart(L, W, H){
    const shown = PTS.filter(p => S.show[p.k]);
    const pts = L.filter(r => shown.some(p => r[p.k] != null));
    if(!pts.length) return '<div class="dp-empty">No reading in this range.</div>';
    W = Math.max(360, Math.round(W || 1000)); H = Math.max(180, Math.round(H || 300));
    const Lm = 44, Rm = W < 640 ? 118 : 150, T = 12, B = 30;
    let d0 = dayNo(pts[0].date), d1 = dayNo(pts[pts.length-1].date); if(d1 - d0 < 6){ d0 -= 3; d1 += 3; }
    const vals = pts.flatMap(r => shown.map(p => r[p.k]).filter(v => v != null));
    /* v4.224 — số DƯƠNG / ngoài dải (gõ thiếu dấu âm) không được kéo giãn trục: trục chỉ −110…0, điểm lạ ghim ở mép trên */
    const okv = vals.filter(v => v <= 0 && v >= -110);
    const lo = Math.floor(Math.min(-50, ...okv) / 5) * 5, hi = Math.ceil(Math.max(-28, ...okv) / 5) * 5;
    const X = d => Lm + (d - d0) / (d1 - d0) * (W - Lm - Rm), Y = v => T + (hi - Math.min(hi, Math.max(lo, v))) / (hi - lo) * (H - T - B);
    const gs = (H - T - B) / ((hi - lo) / 5) < 16 ? 10 : 5;             /* nhãn trục Y thưa ra khi biểu đồ thấp */
    let g = '<svg class="dp-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dew point trend">';
    if(-32 < hi) g += '<rect x="'+Lm+'" y="'+T+'" width="'+(W-Lm-Rm)+'" height="'+Math.max(0, Y(-32)-T).toFixed(1)+'" class="dp-offband"><title>Above −32 °C: off-spec for every point</title></rect>';
    for(let v = Math.ceil(lo / gs) * gs; v <= hi; v += gs) g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="dp-grid"/><text x="'+(Lm-5)+'" y="'+(Y(v)+3)+'" class="dp-ax" text-anchor="end">'+v+'</text>';
    const step = Math.max(1, Math.round((d1 - d0) / Math.max(4, Math.floor((W - Lm - Rm) / 110))));
    /* v4.196 — cửa sổ 2 năm: nhãn trục là tháng/năm (dd/mm dễ đọc nhầm năm) */
    const xl = (d1 - d0) > 200 ? (d => { const i = isoOfDay(d); return i.slice(5,7)+'/'+i.slice(2,4); }) : (d => dmy(isoOfDay(d)).slice(0,5));
    for(let d = d0; d <= d1; d += step) g += '<text x="'+X(d)+'" y="'+(H-10)+'" class="dp-ax" text-anchor="middle">'+xl(d)+'</text>';
    [[-32,'Coalescer limit −32 °C'],[-45,'Dryer limit −45 °C']].forEach(([v, t]) => { if(v < lo || v > hi) return;
      g += '<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="dp-lim"/><text x="'+(W-Rm+4)+'" y="'+(Y(v)+3)+'" class="dp-limt">'+t+'</text>'; });
    shown.forEach(p => {
      const s = pts.filter(r => r[p.k] != null);
      if(s.length > 1) g += '<polyline fill="none" stroke="'+p.col+'" stroke-width="1.8"'+(p.dash ? ' stroke-dasharray="'+p.dash+'"' : '')+' points="'+s.filter(r => r[p.k] <= hi && r[p.k] >= lo).map(r => X(dayNo(r.date)).toFixed(1)+','+Y(r[p.k]).toFixed(1)).join(' ')+'"/>';
      s.forEach(r => { const v = r[p.k], off = v >= p.lim, near = !off && p.lim - v < NEAR;
        if(v > hi || v < lo){ g += '<path d="M'+(X(dayNo(r.date))-5).toFixed(1)+','+(Y(v)+(v > hi ? 8 : -8)).toFixed(1)+' l5,'+(v > hi ? -8 : 8)+' l5,'+(v > hi ? 8 : -8)+'z" fill="#dc2626"><title>'+dmy(r.date)+' · '+p.n+' '+fmt(v,1)+' °C — outside the chart (positive / invalid value?) — check the reading</title></path>'; return; }
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
    const P = S.P[S.prod];
    const all = S.loaded ? numbered(S.prod) : [];
    /* ⭐ v4.228 — MỘT hàng đầu trang: tiêu đề · C3/C4 · số lần đo (tooltip: đã tải từ ngày nào) · Load all · file Excel / Sync / Fill
       (bỏ thanh công cụ cũ Import file · Paste history · Export Excel · Reload trong index.html) */
    const bar = '<div class="lx-bar dp-top"><span class="dp-ttl">💧 Dew Point</span><span class="lx-seg">'+Object.keys(PRODS).map(k => '<button class="'+(S.prod === k ? 'on' : '')+'" onclick="DEWPT.setProd(\''+k+'\')">'+PRODS[k].name+'</button>').join('')+'</span>'+
      '<span class="dp-cnt" title="'+(P.loaded ? (P.all ? 'Whole history loaded' : 'Loaded from '+dmy(P.from)+' (last 2 years)') : '')+'">'+(P.loading ? '⏳ loading…' : P.loaded ? '<b>'+all.length+'</b> readings'+(all.length ? ' · last <b>'+dmy(all[all.length-1].date)+'</b>' : '') : '')+'</span>'+
      (P.loaded && !P.all && !P.loading ? '<button class="eng-btn" onclick="DEWPT.loadAll()" title="'+(P.from ? 'Loaded from '+dmy(P.from)+' (last 2 years). ' : '')+'Download the whole history of this product (older than 2 years too)">⤓ Load all history</button>' : '')+
      (typeof DEWXL !== 'undefined' ? '<span class="dp-xlbar">'+DEWXL.pickHtml(S.prod, 'eng-btn')+(DEWXL.has(S.prod) && S.loaded ? DEWXL.planHtml(S.prod, _xlUpto()) : '')+
        (DEWXL.has(S.prod) ? '<button class="eng-btn green" onclick="DEWPT.xlFill()"'+(DEWXL.busy(S.prod) ? ' disabled' : '')+' title="Write every saved reading newer than the last row of the file (and the rows you tick below) into the file, then save it as a NEW file in the same folder">'+(DEWXL.busy(S.prod) ? '⏳ Filling…' : '▶ Fill file & save')+'</button>' : '')+
        (DEWXL.has(S.prod) ? '<button class="eng-btn" onclick="DEWXL.syncOpen(\''+S.prod+'\')" title="Make the app history identical to the selected sheet (add / overwrite / delete inside its date range) — preview first">⇅ Sync app ← file</button>' : '')+'</span>' : '')+'</div>';
    if(!S.loaded){ w.innerHTML = bar+'<div class="dp-empty">'+(S.loading ? '⏳ Loading '+PRODS[S.prod].short+' dew point history…' : '')+'</div>'; return; }
    const L = ranged(all);
    let h = bar;
    if(typeof DEWXL !== 'undefined') h += DEWXL.syncHtml(S.prod);                /* v4.227 — ⇅ đồng bộ lịch sử app = sheet Excel */
    /* v4.225 — BỎ form nhập + 4 thẻ KPI: nhập / sửa ngay trên bảng bên cạnh biểu đồ (xu hướng / margin xem ở 📊 Statistics) */
    /* v4.209 — MỘT biểu đồ; nhận định / thống kê / tháng / lịch sử mở bằng nút. Cảnh báo nặng nhất vẫn hiện một dòng. */
    const AL = alerts(all), AW = AL.filter(a => a.lvl === 'bad' || a.lvl === 'warn'), worst = AW.find(a => a.lvl === 'bad') || AW[0];
    if(worst) h += '<div class="dp-status '+worst.lvl+'">'+(worst.lvl === 'bad' ? '⛔' : '⚠')+' '+esc(worst.t)+(AW.length > 1 ? ' <small>· '+(AW.length - 1)+' more</small>' : '')+
      (S.panel !== 'find' ? '<button class="eng-btn" onclick="DEWPT.panel(\'find\')">🔎 All findings</button>' : '')+'</div>';
    /* biểu đồ */
    _lastL = L;
    const xl = S.cst === 'xl', SH = xl ? S.showX : S.show;
    h += '<div class="dp-main"><div class="dp-card dp-chartc"><div class="dp-h">📈 '+PRODS[S.prod].short+' trend <span class="dp-rg">'+[['30','30 d'],['90','90 d'],['180','6 m'],['365','1 y'],['480','16 m'],['730','2 y'],['all','All']].map(([k, t]) =>
      '<button class="'+(S.range === k ? 'on' : '')+'" onclick="DEWPT.range(\''+k+'\')"'+(k === '480' ? ' title="16 months — about the period of the Excel sheet"' : '')+'>'+t+'</button>').join('')+'</span>'+
      '<span class="dp-rg" title="Excel = same look as the chart in the dew point Excel file · Detail = limit lines + off-spec band">'+[['xl','Excel'],['dt','Detail']].map(([k, t]) => '<button class="'+(S.cst === k ? 'on' : '')+'" onclick="DEWPT.cstyle(\''+k+'\')">'+t+'</button>').join('')+'</span>'+
      '<span class="dp-lg">'+PTS.map(p => '<label><input type="checkbox"'+(SH[p.k] ? ' checked' : '')+' onchange="DEWPT.toggle(\''+p.k+'\')"><i style="background:'+(xl ? XCOL[p.k] : p.col)+'"></i>'+p.n+'</label>').join('')+'</span></div>'+
      '<div id="dpChartBox" class="dp-chartbox">'+(xl ? chartXl : chart)(L, _cw, _ch)+'</div></div>'+tableHtml(all, L.length)+'</div>';
    h += ENGX_U.tabs('DEWPT.panel', [['find','🔎 Findings', AL.filter(a => a.lvl !== 'ok').length || '', worst ? worst.lvl : ''], ['stats','📊 Statistics'], ['month','🗓 Monthly'], ['hist','📋 History', L.length]], S.panel);
    if(S.panel === 'find') h += '<div class="dp-card xp-panel"><div class="dp-h">🔎 Findings — '+PRODS[S.prod].short+'</div><ul class="dp-al">'+AL.map(a => '<li class="dp-'+a.lvl+'">'+esc(a.t)+'</li>').join('')+'</ul></div>';
    /* thống kê theo khoảng + theo tháng */
    if(S.panel === 'stats') h += '<div class="dp-card xp-panel"><div class="dp-h">📊 Statistics — '+(S.range === 'all' ? 'all readings' : 'last '+S.range+' days')+' ('+L.length+')</div>'+
      '<div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Point</th><th>Limit</th><th>Min</th><th>Max</th><th>Avg</th><th title="Standard deviation">σ</th><th>Off-spec</th><th title="Trend over the 60 days before the last reading">Trend /30d</th></tr></thead><tbody>'+
      PTS.map(p => { const s = stats(L, p); return '<tr><td><i class="dp-sw" style="background:'+p.col+'"></i>'+p.n+'</td><td class="td-c">&lt;'+p.lim+'</td><td class="td-r">'+fmt(s.min,1)+'</td><td class="td-r">'+fmt(s.max,1)+'</td><td class="td-r">'+fmt(s.avg,1)+'</td><td class="td-r">'+fmt(s.sd,2)+'</td>'+
        '<td class="td-c'+(s.off ? ' dp-off' : '')+'">'+(s.n ? s.off+' / '+s.n : '')+'</td><td class="td-r">'+(s.slope == null ? '' : (s.slope >= 0 ? '+' : '')+fmt(s.slope*30,2))+'</td></tr>'; }).join('')+'</tbody></table></div></div>';
    const M = S.panel === 'month' ? monthly(L) : [];
    if(S.panel === 'month') h += '<div class="dp-card xp-panel"><div class="dp-h">🗓 Monthly average (°C) — '+(S.range === 'all' ? 'all readings' : 'last '+S.range+' days')+'</div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>Month</th><th>n</th>'+PTS.map(p => '<th>'+p.n+'</th>').join('')+'</tr></thead><tbody>'+
      (M.length ? M.map(m => '<tr><td class="td-c">'+m.ym+'</td><td class="td-c">'+m.n+'</td>'+PTS.map(p => { const s = m[p.k]; if(!s) return '<td class="td-c dp-na">–</td>';
        return '<td class="td-r'+(s.off ? ' dp-off' : '')+'" title="min '+s.min+' · max '+s.max+(s.off ? ' · '+s.off+' off-spec' : '')+'">'+fmt(s.avg,1)+'</td>'; }).join('')+'</tr>').join('') : '<tr><td colspan="6" class="td-c dp-na">–</td></tr>')+
      '</tbody></table></div></div>';
    /* lịch sử */
    if(S.panel === 'hist') h += '<div class="dp-card xp-panel"><div class="dp-h">📋 History ('+L.length+') <small>click a row to edit it in the Readings table</small></div><div class="dp-scroll"><table class="eng-tbl dp-tbl"><thead><tr><th>No.</th><th>Date</th><th>Time</th>'+
      PTS.map(p => '<th>'+p.n+'<br><small>&lt;'+p.lim+'</small></th>').join('')+'<th>Note</th><th>By</th><th></th></tr></thead><tbody>'+
      (L.length ? L.slice().reverse().map(r => r._x
        ? '<tr class="lx-xrow" title="Extra reading of the same day — click to edit" onclick="DEWPT.pin(\''+r.date+'|'+r._x+'\')"><td class="td-c dp-auto">'+(r.n == null ? '＋' : r.n)+'</td><td class="td-c">'+dmy(r.date)+'</td><td class="td-c">'+esc(r.time)+'</td>'+
          PTS.map(p => cell(r[p.k], p)).join('')+'<td>'+esc(r.note)+'</td><td class="dp-by">'+esc(r.by)+'</td>'+
          '<td class="td-c"><button class="dp-x" title="Delete this extra reading" onclick="event.stopPropagation();DEWPT.delX(\''+r.date+'\',\''+r._x+'\')">✕</button></td></tr>'
        : '<tr class="'+(S.pin === r.date ? 'dp-sel' : '')+'" onclick="DEWPT.pin(\''+r.date+'\')"><td class="td-c'+(r.nAuto ? ' dp-auto' : '')+'"'+(r.nAuto ? ' title="Not saved — counted from the neighbouring numbers"' : '')+'>'+(r.n == null ? '' : r.n)+'</td><td class="td-c">'+dmy(r.date)+'</td><td class="td-c">'+esc(r.time)+'</td>'+
        PTS.map(p => cell(r[p.k], p)).join('')+'<td>'+esc(r.note)+'</td><td class="dp-by">'+esc(r.by)+'</td>'+
        '<td class="td-c"><button class="dp-x" title="Delete this reading" onclick="event.stopPropagation();DEWPT.del(\''+r.date+'\')">✕</button></td></tr>').join('')
        : '<tr><td colspan="10" class="td-c dp-na">No reading in this range.</td></tr>')+'</tbody></table></div></div>';
    const keep = w.scrollTop; w.innerHTML = h; w.scrollTop = keep;
    _fit(); _focus();
  }
  function DEWXL_has(){ try{ return typeof DEWXL !== 'undefined' && DEWXL.has(S.prod); }catch(_){ return false; } }
  /* ⭐ v4.225 — BẢNG NHẬP / SỬA: 25 lần đo gần nhất (mới nhất ở trên) + dòng mới + dòng đang sửa / được ghim */
  const NROW = 25;                 /* màn rộng: bảng cao bằng biểu đồ, cuộn bên trong; màn hẹp: khung cuộn tối đa 60vh */
  function rowHtml(r, k){
    const isNew = k === 'new', ex = !!_xh(k), date = _dt(k), dirty = isNew || !!S.ed[k];
    const val = f => { const x = _val(k, f); return x == null ? '' : String(x); };
    const inp = (f, cls, ph, tip) => '<input class="dp-ci '+cls+'" data-k="'+k+'" data-f="'+f+'" value="'+esc(val(f))+'" placeholder="'+esc(ph || '')+'"'+(tip ? ' title="'+esc(tip)+'"' : '')+
      ' onchange="DEWPT.cell(this)" onkeydown="DEWPT.key(event,this)">';
    const noT = val('no').trim(), noAuto = !noT, noV = noAuto ? (isNew ? nextNo(date) : (r && r.n != null ? String(r.n) : '')) : noT;
    let h = '<tr data-row="'+k+'" class="'+(isNew ? 'dp-newrow ' : '')+(dirty ? 'dp-rdirty ' : '')+(ex ? 'lx-xrow ' : '')+(S.pin === k ? 'dp-sel' : '')+'"'+
      (isNew && S.rows[date] ? ' title="'+esc(dmy(date)+' already has a reading — this one is saved as an EXTRA reading of that day (at the time you type)')+'"' : (r && r.by ? ' title="by '+esc(r.by)+'"' : ''))+'>';
    h += '<td>'+(ex ? '<span class="dp-ro dp-auto">'+esc(noV)+'</span>' : '<input class="dp-ci dp-cno'+(noAuto ? ' dp-auto' : '')+'" data-k="'+k+'" data-f="no" value="'+esc(noV)+'" title="'+(noAuto ? 'Filled automatically — type to change' : 'Number typed / saved')+'" onchange="DEWPT.cell(this)" onkeydown="DEWPT.key(event,this)">')+'</td>';
    h += '<td>'+(isNew ? '<input type="date" class="dp-ci dp-cd" data-k="new" data-f="date" value="'+esc(date)+'" title="Date of the reading — today by default" onchange="DEWPT.cell(this)">' : '<span class="dp-ro">'+dmy(date)+'</span>')+'</td>';
    h += '<td>'+(ex ? '<span class="dp-ro">'+esc(val('time'))+'</span>' : inp('time', 'dp-ct', 'hh:mm'))+'</td>';
    PTS.forEach(p => { const st = inState(p.k, val(p.k)); h += '<td>'+inp(p.k, 'dp-cn'+(st ? ' dp-'+st : ''), isNew ? '<'+p.lim : '–', p.full+' — limit < '+p.lim+' °C')+'</td>'; });
    h += '<td>'+inp('note', 'dp-cnote', isNew ? 'note' : '', val('note'))+'</td>';
    h += '<td class="dp-act"><button class="dp-sv" onclick="DEWPT.saveRow(\''+k+'\')" title="Save this row (Enter)">💾</button><button class="dp-dc" onclick="DEWPT.discard(\''+k+'\')" title="'+(isNew ? 'Remove the new row' : 'Undo the changes of this row')+' (Esc)">↺</button>'+
      (isNew ? '' : '<button class="dp-x" title="Delete this reading" onclick="DEWPT.'+(ex ? 'delX(\''+date+'\',\''+_xh(k)+'\')' : 'del(\''+date+'\')')+'">🗑</button>')+'</td></tr>';
    return h;
  }
  function tableHtml(N, nRange){
    const kOf = r => r._x ? r.date+'|'+r._x : r.date, byK = {}; N.forEach(r => { byK[kOf(r)] = r; });
    const last = N.slice(-NROW).reverse(), shown = {}; last.forEach(r => { shown[kOf(r)] = 1; });
    const extra = Object.keys(S.ed).filter(k => k !== 'new' && !shown[k] && byK[k]);
    if(S.pin && !shown[S.pin] && byK[S.pin] && extra.indexOf(S.pin) < 0) extra.push(S.pin);
    extra.sort().reverse();
    const nd = nDirty();
    let h = '<div class="dp-card dp-recent" id="dpRecent"><div class="dp-h">🕘 Readings <small>newest first · type in a cell to edit</small>'+
      '<span id="dpDirty" class="dp-dirtyb"'+(nd ? '' : ' style="display:none"')+'>● <b>'+nd+'</b> not saved <button onclick="DEWPT.saveAll()" title="Save every changed row">💾 Save all</button><button onclick="DEWPT.discardAll()" title="Undo every change">↺</button></span>'+
      '<button class="dp-add" onclick="DEWPT.add()" title="New reading — today\'s date is filled in (change it if needed)">➕ Add reading</button>'+
      '<button class="dp-more" onclick="DEWPT.panel(\'hist\')" title="Full history of the chart range — click a row there to edit it here">History ('+nRange+') ›</button></div>'+
      '<div class="dp-scroll"><table class="eng-tbl dp-tbl dp-rtbl dp-etbl"><thead><tr><th>No.</th><th>Date</th><th>Time</th>'+
      PTS.map(p => '<th title="'+esc(p.full)+' — limit &lt; '+p.lim+' °C">'+p.n.replace('Coalescer','Coal.')+'<br><small>&lt;'+p.lim+'</small></th>').join('')+'<th>Note</th><th></th></tr></thead><tbody>';
    if(S.ed.new) h += rowHtml(null, 'new');
    extra.forEach(k => { h += rowHtml(byK[k], k); });
    h += last.length ? last.map(r => rowHtml(r, kOf(r))).join('') : (S.ed.new ? '' : '<tr><td colspan="9" class="td-c dp-na">No reading yet — press ➕ Add reading.</td></tr>');
    return h + '</tbody></table></div></div>';
  }
  function _focus(){
    if(!S.focus || typeof document === 'undefined') return;
    const [k, f] = S.focus.split('|').length > 2 ? [S.focus.split('|').slice(0,2).join('|'), S.focus.split('|')[2]] : S.focus.split('|');
    S.focus = '';
    const el = document.querySelector('#dpRecent [data-k="'+k+'"][data-f="'+f+'"]'); if(el){ try{ el.focus(); el.select && el.select(); }catch(_){} }
  }
  /* ⭐ v4.224 — biểu đồ LUÔN nằm trong khung nhìn: đo bề rộng thật + chỗ còn lại tới đáy màn hình rồi vẽ lại đúng cỡ
     (trước đây SVG co theo bề rộng ⇒ màn rộng thì cao 500–600 px, tràn khỏi màn hình) */
  let _lastL = [], _cw = 0, _ch = 0, _rzT = 0;
  function _fit(){
    const box = $('dpChartBox'), w = $('dewWrap'); if(!box || !w || !box.getBoundingClientRect) return;
    const bw = box.clientWidth; if(!bw) return;
    const wr = w.getBoundingClientRect(), br = box.getBoundingClientRect();
    const vis = Math.min(w.clientHeight || 1e4, (typeof window !== 'undefined' ? window.innerHeight : 800) - wr.top);
    const top = br.top - wr.top + w.scrollTop;                       /* vị trí khung biểu đồ trong nội dung cuộn */
    const hh = Math.round(Math.max(200, Math.min(620, vis - top - 22)));     /* đáy thẻ biểu đồ chạm đáy khung nhìn; hàng nút mở mục nằm ngay dưới (cuộn) */
    if(Math.abs(bw - _cw) < 2 && Math.abs(hh - _ch) < 2 && box.firstChild) return;
    _cw = bw; _ch = hh; box.innerHTML = (S.cst === 'xl' ? chartXl : chart)(_lastL, bw, hh);
  }
  try{ window.addEventListener('resize', () => { clearTimeout(_rzT); _rzT = setTimeout(() => { const w = $('dewWrap'); if(w && w.offsetParent) _fit(); }, 150); }); }catch(_){}
  /* ngày chốt khi điền file ở tab: mọi lần đo đã lưu tới hôm nay (hoặc ngày đang sửa nếu là ngày tương lai) */
  function _xlUpto(){ const t = isoToday(), n = S.ed.new && S.ed.new.date; return n && n > t ? n : t; }
  /* ▶ Fill file & save — số đang gõ chưa lưu ⇒ hỏi lưu trước (file chỉ ghi số ĐÃ LƯU) */
  async function xlFill(){
    if(typeof DEWXL === 'undefined') return;
    if(hasDraft()){                                                     /* v4.225 — file chỉ ghi số ĐÃ LƯU */
      const y = await ENGX_U.ask('⚠ '+nDirty()+' row(s) not saved\n\nThe Excel file only gets SAVED readings.\n\nOK = Save them, then fill the file\nCancel = Stop');
      if(!y || !(await saveAll())) return;
    }
    await DEWXL.run(S.prod, _xlUpto());
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
  function range(k){ S.range = k; ENGX_U.prefSet('dew_range', k); if(k === 'all' && !S.P[S.prod].all){ loadAll(); return; } render(); }
  function toggle(k){ const o = S.cst === 'xl' ? S.showX : S.show; o[k] = o[k] ? 0 : 1; render(); }
  function cstyle(k){ S.cst = k === 'dt' ? 'dt' : 'xl'; ENGX_U.prefSet('dew_chart', S.cst); _cw = 0; render(); }   /* v4.229 — kiểu Excel / Detail, nhớ theo máy */
  /* v4.209 — mở / đóng một mục (nhớ theo máy) */
  function panel(k){ S.panel = S.panel === k ? '' : k; ENGX_U.prefSet('dew_panel', S.panel); render(); }
  function refresh(){ if(!S.loaded) load(); else render(); }   /* v4.224 — lịch sử do email P3 nạp trước ⇒ form chưa có ngày */
  /* LABX vừa ghi dữ liệu import ⇒ đọc lại (giữ chế độ 2 năm / tất cả) */
  function afterImport(prod){ const P = S.P[prod]; if(P && P.loaded){ const cur = S.prod; S.prod = prod; load(true); S.prod = cur; } }

  return { PTS, PRODS, refresh, render, ingest, c3Rows, c3Hist, panel, add, cell:cellIn, key, setCell, saveRow, saveAll, discard, discardAll, pin, hasDraft, del, delX, range, toggle, cstyle,
           setProd, loadAll, afterImport,
           listOf, numbered, nextNo, check, confirmCheck, inState, recent, xlFill, isLoaded:prod => !!(S.P[prod] && S.P[prod].loaded),
           rowsOf:prod => (S.P[prod] || {}).rows, loadedFrom:prod => { const P = S.P[prod]; return P && !P.all ? P.from : ''; },
           _test:{ stats, alerts, monthly, list, S } };
})();


/* ═════════════════════════════════════════════════════════════
 * 📗 DEWXL — điền số dew point vào FILE EXCEL của nhân viên (v4.224)
 * ─────────────────────────────────────────────────────────────
 * File "Dew Point of Propane_CAVERN_MM.DD.YYYY.xlsx": mỗi năm một sheet dạng
 * "DEWPOINT DATA SHEET - CAVERN" (No. · Date · Time · Outlet Coalescer A/B · Outlet Dryer A/B),
 * có Table + biểu đồ Dryer A/B trỏ vào cột dữ liệu.
 * Dùng CHUNG cho Engineer ▸ 💧 Dew Point và email P3 (một trạng thái S[prod] — chọn file ở
 * đâu cũng thấy ở kia), làm HAI BƯỚC do người dùng bấm (giống email P2):
 *   ① 📂 chọn file (showOpenFilePicker giữ handle) ⇒ CHỈ đọc để xem trước: sheet nào, dòng
 *      cuối là ngày nào / No. mấy, sẽ thêm dòng nào, dòng nào trong file lệch với app;
 *   ② ▶ Fill ⇒ đọc lại file trên đĩa, ghi thêm dòng sau dòng cuối (+ dòng lệch được tick),
 *      lưu ra FILE MỚI cùng thư mục (hộp Save mở sẵn thư mục file nguồn), file gốc không đổi.
 * Chỉ ghi số ĐÃ LƯU trong app. Sửa thẳng XML trong zip (JSZip) ⇒ style / Table / biểu đồ /
 * comment giữ nguyên; Table và vùng dữ liệu biểu đồ được nới tới dòng mới.
 * Sheet được chọn = sheet có ngày cuối MỚI NHẤT (đổi được ở ô Sheet). File chỉ nằm trong RAM.
 * ═════════════════════════════════════════════════════════════ */
const DEWXL = (function(){
  'use strict';
  const { esc, num, dmy, dayNo, isoOfDay, toastM, download, anyIso } = ENGX_U;
  const XT = [{ description:'Excel workbook', accept:{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'] } }];
  const PK = ['ca','cb','da','db'];
  const PRE = { ca:/coalescer\s*a\b/, cb:/coalescer\s*b\b/, da:/dryer\s*a\b/, db:/dryer\s*b\b/ };
  const S = { c3:null, c4:null };
  const LS = [];
  function onChange(fn){ LS.push(fn); }
  function _emit(){ try{ DEWPT.render(); }catch(_){} LS.forEach(f => { try{ f(); }catch(e){ console.warn('[DEWXL]', e); } }); }
  const has = prod => !!(S[prod] && S[prod].info);
  const busy = prod => !!(S[prod] && S[prod].busy);
  const hhmm = f => { if(f == null || !isFinite(f)) return ''; const m = Math.round((f - Math.floor(f)) * 1440) % 1440; return String(Math.floor(m / 60)).padStart(2,'0')+':'+String(m % 60).padStart(2,'0'); };

  /* ── ĐỌC: tìm các sheet dữ liệu dew point + dòng cuối ── */
  function inspect(buf){
    if(typeof XLSX === 'undefined') throw new Error('Excel library not loaded');
    const wb = XLSX.read(buf, { type:'array', cellFormula:false, cellHTML:false, cellStyles:false });
    const out = [], WS = (wb.Workbook && wb.Workbook.Sheets) || [];
    wb.SheetNames.forEach((nm, si) => {
      const ws = wb.Sheets[nm]; if(!ws || !ws['!ref']) return;
      if(WS[si] && WS[si].Hidden) return;                                  /* sheet ẩn (Trend Graph, Sheet1…) không phải nơi ghi */
      const rg = XLSX.utils.decode_range(ws['!ref']);
      const cv = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
      const tx = (r, c) => { const x = cv(r, c); return x == null ? '' : String(x.w != null ? x.w : x.v).toLowerCase().replace(/\s+/g,' ').trim(); };
      let hr = -1, col = {};
      for(let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 15) && hr < 0; r++){
        const m = {};
        for(let c = rg.s.c; c <= Math.min(rg.e.c, 40); c++){ const t = tx(r, c); PK.forEach(k => { if(m[k] == null && PRE[k].test(t)) m[k] = c; }); }
        if(PK.every(k => m[k] != null)){ hr = r; col = m; }
      }
      if(hr < 0) return;
      for(let r = Math.max(rg.s.r, hr - 2); r <= hr; r++) for(let c = rg.s.c; c < col.ca; c++){ const t = tx(r, c);
        if(col.no == null && /^no\.?$/.test(t)) col.no = c; if(col.date == null && /^date$/.test(t)) col.date = c; if(col.time == null && /^time$/.test(t)) col.time = c; }
      if(col.date == null) return;
      const dOf = r => { const x = cv(r, col.date); if(!x || x.v == null || x.v === '') return '';
        if(typeof x.v === 'number') return (x.v > 30000 && x.v < 80000) ? isoOfDay(Math.floor(x.v) - 25569) : '';
        if(x.v instanceof Date) return ENGX_U.isoOf(x.v); return anyIso(String(x.v)); };
      const vOf = (r, k) => { const x = cv(r, col[k]); return x && typeof x.v === 'number' ? x.v : null; };
      const rows = []; let first = -1, last = -1;
      for(let r = hr + 1; r <= rg.e.r; r++){
        const d = dOf(r); if(!d) continue;
        const v = {}; PK.forEach(k => { v[k] = vOf(r, k); });
        if(!PK.some(k => v[k] != null)) continue;
        if(first < 0) first = r; last = r;
        const nx = col.no != null ? cv(r, col.no) : null, tx0 = col.time != null ? cv(r, col.time) : null;
        rows.push({ r, date:d, no:nx && typeof nx.v === 'number' ? nx.v : null, time:tx0 && typeof tx0.v === 'number' ? hhmm(tx0.v) : (tx0 ? String(tx0.v || '') : ''), v });
      }
      if(last < 0) return;
      const L = rows[rows.length - 1], byDate = {};
      rows.slice(-600).forEach(x => { (byDate[x.date] = byDate[x.date] || []).push(x); });
      let lastDate = ''; rows.forEach(x => { if(x.date > lastDate) lastDate = x.date; });
      out.push({ name:nm, hr, col, first, last, lastDate, lastRowDate:L.date, lastNo:L.no, n:rows.length, byDate, firstDate:rows[Math.max(0, rows.length - 600)].date, startDate:rows[0].date, rows });
    });
    return out;
  }
  function _defSheet(list){ let b = null; list.forEach(x => { if(!b || x.lastRowDate >= b.lastRowDate) b = x; }); return b ? b.name : ''; }
  function sheetOf(prod){ const st = S[prod]; if(!st || !st.info) return null; return st.info.find(x => x.name === st.sheet) || null; }
  /* mốc No. cho DEWPT.numbered: dòng cuối của sheet đang chọn */
  function anchor(prod){ const sh = sheetOf(prod); return sh && sh.lastNo > 0 ? { date:sh.lastRowDate, no:sh.lastNo } : null; }

  /* ── ① chọn file ── */
  async function _set(prod, file, handle){
    if(!/\.xlsx$/i.test(file.name)){ ENGX_U.tell('⛔ Pick the dew point Excel file (.xlsx)'); return; }
    try{
      const buf = await file.arrayBuffer(), info = inspect(buf);
      if(!info.length){ ENGX_U.tell('⛔ No dew point data sheet found\n\nFile: '+file.name+'\n\nThe sheet needs a header row with Outlet Coalescer A · Outlet Coalescer B · Outlet Dryer A · Outlet Dryer B and a Date column.'); return; }
      S[prod] = { file, handle:handle || null, name:file.name, buf, info, sheet:_defSheet(info), ovr:{}, busy:false, mod:file.lastModified || 0, chart:null };
      _chartLater(S[prod]);                                                /* v4.226 — biểu đồ của file cho email P3 */
      toastM('📗 '+file.name+' selected — check the preview, then press ▶ Fill', 'ok');
    }catch(e){ ENGX_U.tell('⛔ Cannot read the file\n\n'+file.name+'\n'+e.message); }
    _emit();
  }
  async function pick(prod, btn){
    if(typeof window === 'undefined' || !window.showOpenFilePicker){ const i = btn && btn.parentElement && btn.parentElement.querySelector('input[type=file]'); if(i) i.click(); return; }
    try{ const [h] = await window.showOpenFilePicker({ types:XT }); await _set(prod, await h.getFile(), h); }
    catch(e){ if(e.name !== 'AbortError') toastM('⚠ '+e.message, 'er'); }
  }
  function fileIn(prod, inp){ const f = inp.files && inp.files[0]; inp.value = ''; if(f) _set(prod, f, null); }
  function clear(prod){ S[prod] = null; _emit(); }
  function sheet(prod, nm){ const st = S[prod]; if(st && st.info.some(x => x.name === nm)){ st.sheet = nm; st.ovr = {}; _emit(); _chartLater(st); } }
  function ovr(prod, date, on){ const st = S[prod]; if(st){ st.ovr[date] = !!on; _emit(); } }

  /* ── xem trước: dòng sẽ thêm · dòng file lệch app · lần đo có trong app mà file không có ── */
  function plan(prod, upto){
    const st = S[prod], sh = sheetOf(prod); if(!st || !sh) return null;
    if(!DEWPT.isLoaded(prod)) return { sh, loading:true, add:[], diff:[], miss:[], upto };
    const N = DEWPT.numbered(prod);
    const add = N.filter(r => r.date > sh.lastDate && r.date <= upto);
    const diff = [], miss = [];
    N.filter(r => !r._x && r.date >= sh.firstDate && r.date <= sh.lastDate && r.date <= upto).forEach(r => {
      const fr = (sh.byDate[r.date] || [])[0];
      if(!fr){ miss.push(r); return; }
      const d = PK.filter(k => r[k] != null && (fr.v[k] == null || Math.abs(fr.v[k] - r[k]) >= 0.05));
      if(d.length) diff.push({ date:r.date, row:fr.r, app:r, file:fr, keys:d, on: st.ovr[r.date] != null ? st.ovr[r.date] : r.date === upto });
    });
    const P0 = DEWPT.PRODS[prod];
    const wrong = prod === 'c3' ? /butane|\bc4\b/i.test(st.name) : /propane|\bc3\b/i.test(st.name);
    return { sh, add, diff, miss, upto, noUpto:!N.some(r => r.date === upto), wrong, prodName:P0 ? P0.name : prod };
  }
  const nm4 = k => ({ ca:'Coal. A', cb:'Coal. B', da:'Dryer A', db:'Dryer B' })[k];
  const f1 = v => v == null ? '–' : Number(v).toFixed(1);
  function planHtml(prod, upto){
    const P = plan(prod, upto); if(!P) return '';
    const st = S[prod], sh = P.sh;
    if(P.loading) return '<div class="dx-plan"><span class="dx-it">⏳ Loading the '+esc(DEWPT.PRODS[prod].short)+' dew point history…</span></div>';
    let h = '<div class="dx-plan">';
    h += '<span class="dx-it">Sheet '+(st.info.length > 1 ? '<select onchange="DEWXL.sheet(\''+prod+'\',this.value)" title="Sheet the rows are written to">'+st.info.map(x => '<option'+(x.name === sh.name ? ' selected' : '')+'>'+esc(x.name)+'</option>').join('')+'</select>' : '<b>'+esc(sh.name)+'</b>')+'</span>'+
      '<span class="dx-it" title="Last reading in the file (row '+(sh.last + 1)+')">Last row <b>'+dmy(sh.lastRowDate)+'</b>'+(sh.lastNo != null ? ' · No. <b>'+sh.lastNo+'</b>' : '')+'</span>';
    h += P.add.length
      ? '<span class="dx-it dx-add" title="Saved readings newer than the last row of the file — added below it">➕ '+P.add.length+' new row'+(P.add.length > 1 ? 's' : '')+': '+
          P.add.slice(0, 6).map(r => '<b>'+dmy(r.date)+'</b>'+(r.n != null ? ' <small>No.'+r.n+'</small>' : '')).join(' · ')+(P.add.length > 6 ? ' · …' : '')+'</span>'
      : '<span class="dx-it dx-none">No new reading to add</span>';
    if(P.noUpto) h += '<span class="dx-it dx-warn" title="Nothing is saved for this date — press 💾 Save first">⚠ No saved reading for '+dmy(upto)+'</span>';
    if(P.wrong) h += '<span class="dx-it dx-warn">⚠ File name does not look like the '+esc(P.prodName)+' file</span>';
    if(P.miss.length) h += '<span class="dx-it dx-info" title="'+esc(P.miss.slice(-12).map(r => dmy(r.date)).join(', '))+' — saved in the app but not in the file. Rows are only added after the last row, so these are not written.">ℹ '+P.miss.length+' app reading'+(P.miss.length > 1 ? 's' : '')+' not in the file</span>';
    h += '</div>';
    if(P.diff.length) h += '<div class="dx-diff"><span class="dx-warn">⚠ '+P.diff.length+' row'+(P.diff.length > 1 ? 's' : '')+' in the file differ from the app — tick to overwrite with the app value:</span>'+
      P.diff.slice(-8).map(d => '<label class="dx-d'+(d.on ? ' on' : '')+'" title="Row '+(d.row + 1)+'"><input type="checkbox"'+(d.on ? ' checked' : '')+' onchange="DEWXL.ovr(\''+prod+'\',\''+d.date+'\',this.checked)"> <b>'+dmy(d.date)+'</b> '+
        d.keys.map(k => nm4(k)+' '+f1(d.file.v[k])+' → <b>'+f1(d.app[k])+'</b>').join(' · ')+'</label>').join('')+'</div>';
    return h;
  }


  /* ⭐ v4.226 — BIỂU ĐỒ CỦA CHÍNH FILE EXCEL (cho email P3 khớp 100% với file đính kèm).
     File .xlsx KHÔNG chứa ảnh của biểu đồ — chỉ chứa "công thức" biểu đồ (chartN.xml: vùng dữ liệu, tên series,
     màu, trục). Ta đọc đúng các vùng đó ('2026'!$C$7:$C$447 · $G · $H), tên series, màu đường, trần/sàn trục Y
     và tiêu đề ⇒ email vẽ lại bằng CÙNG dữ liệu + cùng khoảng ngày như Excel. Chọn biểu đồ có series Dryer A + B
     trỏ vào sheet đang chọn (không có thì biểu đồ Dryer A/B đầu tiên). Chỉ tính trong RAM. */
  async function _chartOf(st){
    st.chart = null;
    if(typeof JSZip === 'undefined' || typeof XLSX === 'undefined') return null;
    const zip = await JSZip.loadAsync(st.buf), wb = XLSX.read(st.buf, { type:'array' });
    const refOf = f => { const m = String(f || '').match(/^(?:'((?:[^']|'')+)'|([^!]+))!\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?$/); if(!m) return null;
      return { sheet:(m[1] != null ? m[1].replace(/''/g, "'") : m[2]), c:m[3], r1:+m[4], r2:+(m[6] || m[4]) }; };
    const cellV = (ref, r) => { const ws = wb.Sheets[ref.sheet]; const x = ws && ws[ref.c + r]; return x ? x.v : null; };
    const files = Object.keys(zip.files).filter(k => /^xl\/charts\/chart\d+\.xml$/.test(k)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
    /* màu theo theme (accent1…6) — biểu đồ Excel thường tô bằng schemeClr */
    const TH = {}; try{ const tf = Object.keys(zip.files).find(k => /^xl\/theme\/theme\d+\.xml$/.test(k)); if(tf){ const tx = await zip.file(tf).async('string');
      ['accent1','accent2','accent3','accent4','accent5','accent6','dk1','dk2'].forEach(a => { const m = tx.match(new RegExp('<a:'+a+'>\\s*<a:(?:srgbClr val|sysClr[^>]*lastClr)="([0-9A-Fa-f]{6})"')); if(m) TH[a] = '#'+m[1].toLowerCase(); }); } }catch(_){}
    const cands = [];
    for(const f of files){
      const x = await zip.file(f).async('string');
      const sers = (x.match(/<c:ser>[\s\S]*?<\/c:ser>/g) || []).map(sx => {
        const part = t => { const m = sx.match(new RegExp('<c:'+t+'>([\\s\\S]*?)</c:'+t+'>')); return m ? m[1] : ''; };
        const fOf = t => { const m = part(t).match(/<c:f>([^<]*)<\/c:f>/); return m ? unx(m[1]) : ''; };
        const tx = part('tx'), txr = refOf(fOf('tx'));
        let name = unx((tx.match(/<c:v>([^<]*)<\/c:v>/) || [])[1] || '');
        if(txr){ const v = cellV(txr, txr.r1); if(v != null && String(v).trim()) name = String(v).trim(); }
        const cm = part('spPr').match(/<a:ln\b[\s\S]*?<a:(srgbClr|schemeClr) val="([^"]+)"/);
        const col = !cm ? '' : cm[1] === 'srgbClr' ? '#'+cm[2].toLowerCase() : (TH[cm[2]] || '');
        return { name, cat:refOf(fOf('cat')), val:refOf(fOf('val')), col };
      });
      const A = sers.find(q => /dryer\s*a\b/i.test(q.name) && q.val), B = sers.find(q => /dryer\s*b\b/i.test(q.name) && q.val);
      if(!A && !B) continue;
      const t0 = x.match(/<c:chart>\s*<c:title>([\s\S]*?)<\/c:title>/);
      const title = t0 ? (t0[1].match(/<a:t>([^<]*)<\/a:t>/g) || []).map(q => unx(q.replace(/<\/?a:t>/g, ''))).join('') : '';
      const va = (x.match(/<c:valAx>[\s\S]*?<\/c:valAx>/) || [''])[0];
      const mx = va.match(/<c:max val="(-?[\d.]+)"/), mn = va.match(/<c:min val="(-?[\d.]+)"/);
      const gap = !/<c:dispBlanksAs val="(span|zero)"/.test(x);                  /* mặc định Excel: ô trống = đứt đường */
      cands.push({ f, A, B, title, gap, ymax: mx ? +mx[1] : null, ymin: mn ? +mn[1] : null, sheet:(A || B).val.sheet });
    }
    const C = cands.find(c => c.sheet === st.sheet) || cands[0]; if(!C) return null;
    const S0 = C.A || C.B, cat = S0.cat || S0.val, rows = [];
    for(let i = 0; i <= S0.val.r2 - S0.val.r1; i++){
      const d = cellV(cat, cat.r1 + i), iso = typeof d === 'number' ? ((d > 30000 && d < 80000) ? isoOfDay(Math.floor(d) - 25569) : '') : anyIso(d);
      const g = q => { if(!q) return null; const v = cellV(q.val, q.val.r1 + i); return typeof v === 'number' ? v : null; };
      const o = { date:iso, da:g(C.A), db:g(C.B) };
      if(iso) rows.push(o);                                            /* giữ cả dòng trống ⇒ vẽ đứt đường như Excel */
    }
    st.chart = { title:C.title, gap:C.gap, ymax:C.ymax, ymin:C.ymin, sheet:C.sheet, part:C.f, names:{ da:C.A ? C.A.name : 'Outlet Dryer A', db:C.B ? C.B.name : 'Outlet Dryer B' },
                 cols:{ da:C.A && C.A.col, db:C.B && C.B.col }, rows, sig:C.f+'|'+rows.length+'|'+(() => { let h = 5381; rows.forEach(r => { const t = r.date+(r.da == null ? '' : r.da)+'/'+(r.db == null ? '' : r.db)+';'; for(let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; }); return h; })()+'|'+(rows.length ? rows[rows.length-1].date+rows[rows.length-1].da+'/'+rows[rows.length-1].db : '') };
    return st.chart;
  }
  function _chartLater(st){ _chartOf(st).then(() => _emit(), e => { console.warn('[DEWXL] chart', e); st.chart = null; }); }
  function chart(prod){ const st = S[prod]; return st && st.chart ? st.chart : null; }

  /* ── ② GHI: sửa XML của sheet trong zip ── */
  const cL = n => { let s = ''; n++; while(n){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const cN = s => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const attr = (tag, a) => { const m = tag.match(new RegExp('\\s'+a.replace(':','\\:')+'="([^"]*)"')); return m ? m[1] : null; };
  const unx = s => String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function _resolve(base, target){          /* base = thư mục của file chứa rels, vd. 'xl/worksheets' */
    if(target.startsWith('/')) return target.slice(1);
    const p = base.split('/'); target.split('/').forEach(x => { if(x === '..') p.pop(); else if(x !== '.') p.push(x); }); return p.join('/');
  }
  async function _rels(zip, path){
    const d = path.slice(0, path.lastIndexOf('/')), f = path.slice(path.lastIndexOf('/') + 1);
    const rp = d + '/_rels/' + f + '.rels', z = zip.file(rp); if(!z) return [];
    const x = await z.async('string');
    return (x.match(/<Relationship\b[^>]*>/g) || []).map(t => ({ id:attr(t,'Id'), type:attr(t,'Type') || '', target:_resolve(d, unx(attr(t,'Target') || '')) }));
  }
  function _cells(rowXml){ return (rowXml.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).map(x => ({ xml:x, col:cN((attr(x.match(/^<c\b[^>]*>/)[0], 'r') || 'A').replace(/\d+/g,'')), s:attr(x.match(/^<c\b[^>]*>/)[0], 's') })); }
  const _hasVal = x => /<v>|<f[\s>]|<is>/.test(x);
  function _cellXml(ref, s, v){ const sa = s != null ? ' s="'+s+'"' : ''; return v == null || v === '' ? '<c r="'+ref+'"'+sa+'/>' : '<c r="'+ref+'"'+sa+'><v>'+v+'</v></c>'; }
  /* ghi vals {col: value|null} vào một dòng (giữ style ô cũ; ô chưa có thì lấy style dòng mẫu) */
  function _setRow(rowXml, rn, vals, tplS, flag){
    const open = rowXml.match(/^<row\b[^>]*?\/?>/)[0];
    const cells = rowXml.endsWith('/>') && !/<c\b/.test(rowXml) ? [] : _cells(rowXml);
    Object.keys(vals).forEach(k => { const c = +k, i = cells.findIndex(x => x.col === c), ref = cL(c) + rn;
      const old = i >= 0 ? cells[i] : null; if(old && /<f[\s>]/.test(old.xml)) flag.f = true;
      const nx = { col:c, s:old ? old.s : tplS[c], xml:'' }; nx.xml = _cellXml(ref, nx.s, vals[k]);
      if(i >= 0) cells[i] = nx; else cells.push(nx); });
    cells.sort((a, b) => a.col - b.col);
    return open.replace(/\/>$/, '>') + cells.map(x => x.xml).join('') + '</row>';
  }
  function _xmlOf(o, col){        /* một lần đo → {cột: giá trị ghi file} */
    const v = {};
    if(!o.upd){                                   /* dòng SỬA: chỉ ghi 4 số đo — No. / Date / Time của file giữ nguyên */
    if(col.no != null && o.no != null) v[col.no] = o.no;
    v[col.date] = dayNo(o.date) + 25569;
    if(col.time != null){ const m = String(o.time || '').match(/^(\d{1,2}):(\d{2})/); v[col.time] = m ? +((+m[1] * 60 + +m[2]) / 1440).toFixed(10) : null; }
    }
    PK.forEach(k => { v[col[k]] = o.v[k] == null ? null : o.v[k]; });
    return v;
  }
  async function write(buf, sh, adds, upds){
    if(typeof JSZip === 'undefined') throw new Error('JSZip not loaded');
    const zip = await JSZip.loadAsync(buf);
    const wbx = await zip.file('xl/workbook.xml').async('string');
    const tag = (wbx.match(/<sheet\b[^>]*>/g) || []).find(t => unx(attr(t, 'name') || '') === sh.name);
    if(!tag) throw new Error('Sheet "'+sh.name+'" not found in workbook.xml');
    const rid = attr(tag, 'r:id'), rel = (await _rels(zip, 'xl/workbook.xml')).find(r => r.id === rid);
    if(!rel || !zip.file(rel.target)) throw new Error('Sheet file of "'+sh.name+'" not found');
    const path = rel.target;
    let xml = await zip.file(path).async('string');
    const sdM = xml.match(/<sheetData\s*\/>|<sheetData>([\s\S]*?)<\/sheetData>/); if(!sdM) throw new Error('sheetData missing');
    const rowsX = (sdM[1] || '').match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || [];
    const R = new Map(); rowsX.forEach(x => R.set(+attr(x.match(/^<row\b[^>]*>/)[0], 'r'), x));
    const lastN = sh.last + 1, tpl = R.get(lastN); if(!tpl) throw new Error('Row '+lastN+' not found');
    const tplS = {}; _cells(tpl).forEach(c => { tplS[c.col] = c.s; });
    const flag = { f:false };
    upds.forEach(u => { const n = u.row + 1, x = R.get(n); if(!x) return; R.set(n, _setRow(x, n, _xmlOf(u, sh.col), tplS, flag)); });
    let n = lastN;
    const tplOpen = tpl.match(/^<row\b[^>]*?\/?>/)[0].replace(/\s(hidden|collapsed|outlineLevel)="[^"]*"/g, '').replace(/\/>$/, '>');
    adds.forEach(a => {
      n++;
      const old = R.get(n);
      if(old && _cells(old).some(c => _hasVal(c.xml))) throw new Error('Row '+n+' (below the last reading) is not empty — clear it in Excel, save, and pick the file again');
      const base = tplOpen.replace(/\sr="\d+"/, ' r="'+n+'"');
      /* dòng mới = mọi ô của dòng mẫu (style) + giá trị của lần đo */
      const vals = {}; Object.keys(tplS).forEach(c => { vals[c] = null; }); Object.assign(vals, _xmlOf(a, sh.col));
      R.set(n, _setRow(base + '</row>', n, vals, tplS, flag));
    });
    const maxN = Math.max(...R.keys());
    const sd = '<sheetData>' + [...R.keys()].sort((a, b) => a - b).map(k => R.get(k)).join('') + '</sheetData>';
    xml = xml.replace(sdM[0], () => sd);
    xml = xml.replace(/(<dimension\s+ref="[A-Z]+\d+:[A-Z]+)(\d+)"/, (m, a, b) => a + Math.max(+b, maxN) + '"');
    zip.file(path, xml);
    /* Table của sheet: nới tới dòng cuối mới */
    const newLast = n;
    for(const r of await _rels(zip, path)){
      if(!/\/table$/.test(r.type) || !zip.file(r.target)) continue;
      let t = await zip.file(r.target).async('string');
      const m = t.match(/<table\b[^>]*\sref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/); if(!m) continue;
      const c1 = cN(m[1]), c2 = cN(m[3]), r1 = +m[2], r2 = +m[4];
      if(c1 <= sh.col.date && c2 >= sh.col.date && r1 <= sh.first + 1 && r2 >= sh.first + 1 && r2 < newLast){
        const nr = m[1]+r1+':'+m[3]+newLast;
        t = t.replace(new RegExp('ref="'+m[1]+r1+':'+m[3]+r2+'"', 'g'), 'ref="'+nr+'"');
        zip.file(r.target, t);
      }
    }
    /* biểu đồ (mọi sheet) trỏ vào cột dữ liệu của sheet này: nới đuôi vùng tới dòng cuối mới */
    const qn = "'"+sh.name.replace(/'/g, "''")+"'", nmRe = '(?:' + reEsc(qn) + (/^[A-Za-z_][\w.]*$/.test(sh.name) ? '|' + reEsc(sh.name) : '') + ')';
    const re = new RegExp('(' + nmRe + '!\\$[A-Z]{1,3}\\$)(\\d+)(:\\$[A-Z]{1,3}\\$)(\\d+)', 'g');
    for(const f of Object.keys(zip.files).filter(k => /^xl\/charts\/chart\d+\.xml$/.test(k))){
      const c = await zip.file(f).async('string');
      const c2 = c.replace(re, (m, p1, a, p3, b) => (+a <= lastN && +b >= lastN - 3 && +b < newLast) ? p1 + a + p3 + newLast : m);
      if(c2 !== c) zip.file(f, c2);
    }
    /* ghi đè ô công thức ⇒ calcChain cũ sai ⇒ bỏ + tính lại khi mở */
    if(flag.f){
      zip.remove('xl/calcChain.xml');
      const rp = 'xl/_rels/workbook.xml.rels'; let rx = await zip.file(rp).async('string'); rx = rx.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ''); zip.file(rp, rx);
      const ct = '[Content_Types].xml'; let cx = await zip.file(ct).async('string'); cx = cx.replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ''); zip.file(ct, cx);
      let w2 = wbx; w2 = /<calcPr\b[^>]*fullCalcOnLoad/.test(w2) ? w2 : w2.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"'); zip.file('xl/workbook.xml', w2);
    }
    return zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression:'DEFLATE', compressionOptions:{ level:6 } });
  }
  /* tên file mới: thay ngày MM.DD.YYYY cuối trong tên file nguồn */
  function outName(src, iso){
    const p = iso.split('-'), d = p[1]+'.'+p[2]+'.'+p[0];
    const b = String(src || 'Dew Point_CAVERN.xlsx');
    return /\d{2}\.\d{2}\.\d{4}(?!.*\d{2}\.\d{2}\.\d{4})/.test(b) ? b.replace(/\d{2}\.\d{2}\.\d{4}(?!.*\d{2}\.\d{2}\.\d{4})/, d) : b.replace(/\.xlsx$/i, '') + '_' + d + '.xlsx';
  }
  /* ▶ Fill — nameDate: ngày ghi vào tên file (email = ngày báo cáo). Trả Promise<{blob,name}|null> */
  async function run(prod, upto, nameDate){
    const st = S[prod]; if(!st || st.busy) return null;
    st.busy = true; _emit();
    try{
      /* đọc lại bản MỚI NHẤT trên đĩa (có handle) — user có thể vừa sửa file trong Excel */
      if(st.handle){ try{ const f = await st.handle.getFile(); if(f.lastModified !== st.mod || f.size !== st.buf.byteLength){ st.buf = await f.arrayBuffer(); st.info = inspect(st.buf); st.mod = f.lastModified; if(!st.info.some(x => x.name === st.sheet)) st.sheet = _defSheet(st.info); } }catch(_){} }
      const P = plan(prod, upto); if(!P){ await ENGX_U.tell('⛔ No dew point data sheet in the file'); return null; }
      if(P.loading){ await ENGX_U.tell('⏳ Dew point history is still loading\n\nWait a moment and press ▶ Fill again.'); return null; }
      const ups = P.diff.filter(d => d.on);
      if(!P.add.length && !ups.length){ await ENGX_U.tell('ℹ Nothing to write\n\nThe file already has every saved reading up to '+dmy(upto)+'.'+(P.noUpto ? '\n\nNo reading is saved for '+dmy(upto)+' yet — press 💾 Save first.' : '')); return null; }
      const toW = r => ({ date:r.date, time:r.time, no:r.n != null ? r.n : null, v:{ ca:r.ca, cb:r.cb, da:r.da, db:r.db } });
      const blob = await write(st.buf, P.sh, P.add.map(toW), ups.map(d => Object.assign(toW(d.app), { row:d.row, upd:true })));
      const last = P.add.length ? P.add[P.add.length - 1].date : upto;
      const name = outName(st.name, nameDate || last);
      let saved = null;
      if(typeof window !== 'undefined' && window.showSaveFilePicker){
        try{
          const o = { suggestedName:name, types:XT }; if(st.handle) o.startIn = st.handle;
          const h = await window.showSaveFilePicker(o), w = await h.createWritable(); await w.write(blob); await w.close();
          saved = { name:h.name, handle:h };
        }catch(e){ if(e.name === 'AbortError'){ toastM('⚠ File save cancelled', 'er'); return null; } console.warn('[DEWXL] save picker', e); }
      }
      if(!saved){ download(blob, name); saved = { name, handle:null }; }
      /* file vừa lưu thành file nguồn cho lần sau (có thêm dòng mới) */
      const nb = await blob.arrayBuffer();
      st.buf = nb; st.info = inspect(nb); st.name = saved.name; st.ovr = {}; st.mod = -1; if(saved.handle) st.handle = saved.handle;
      if(!st.info.some(x => x.name === st.sheet)) st.sheet = _defSheet(st.info);
      try{ await _chartOf(st); }catch(e){ console.warn('[DEWXL] chart', e); }   /* v4.226 — biểu đồ của FILE VỪA ĐIỀN */
      toastM('📗 '+saved.name+' saved — '+P.add.length+' row(s) added'+(ups.length ? ', '+ups.length+' updated' : ''), 'ok');
      return { blob, name:saved.name, added:P.add.length, updated:ups.length };
    }catch(e){ console.error(e); await ENGX_U.tell('⛔ Excel file not written\n\n'+e.message); return null; }
    finally{ st.busy = false; _emit(); }
  }

  /* ═══ ⭐ v4.227 — ĐỒNG BỘ LỊCH SỬ APP = SHEET EXCEL (⇅ Sync app ← file) ════════════════════════════
     Mục đích: hết vênh giữa app và file Excel nhân viên đang dùng. Trong khoảng ngày của sheet (dòng đầu → dòng cuối):
       • ngày chỉ có trong file  ⇒ THÊM · ngày lệch ⇒ GHI ĐÈ bằng số của file · ngày chỉ có trong app ⇒ XOÁ;
       • GIỮ NGUYÊN mọi số của file, kể cả số bất thường / sai (vd. +67.9) và No. trùng — để khớp tuyệt đối;
       • nhiều dòng cùng ngày: dòng ĐẦU là bản ghi ngày, các dòng sau là lần đo thêm x/<HHMM> (trùng giờ ⇒ HHMMa, b…);
       • Note gõ trong app được giữ; ngoài khoảng ngày của sheet không đụng tới.
     Người dùng xem trước, tick từng nhóm (thêm / ghi đè / xoá) rồi mới ✔ Apply — MỘT lệnh update() lên node. */
  const same = (a, b) => { const x = num(a), y = num(b); if(x == null || y == null) return x == null && y == null; return Math.abs(x - y) < 1e-9; };
  const sameS = (a, b) => String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
  function _target(list){
    const pv = e => { const o = {}; PK.forEach(k => { o[k] = e.v[k] == null ? '' : e.v[k]; }); return o; };
    const m = list[0], main = Object.assign({ no:m.no == null ? '' : String(m.no), time:m.time || '' }, pv(m)), x = {};
    const used = { [String(main.time).replace(':', '')]:1 };
    list.slice(1).forEach(e => { const h = String(e.time || '').replace(':', '') || '0000'; let k = h, i = 0; while(used[k] || x[k]) k = h + String.fromCharCode(97 + i++);
      used[k] = 1; x[k] = Object.assign({ no:e.no == null ? '' : String(e.no), time:e.time || '' }, pv(e)); });
    return { main, x };
  }
  function _diffRec(T, R){
    const out = [], F = ['no','time'].concat(PK), nm = { no:'No.', time:'Time', ca:'Coal. A', cb:'Coal. B', da:'Dryer A', db:'Dryer B' };
    F.forEach(f => { const eq = (f === 'no' || f === 'time') ? sameS(T.main[f], R[f]) : same(T.main[f], R[f]); if(!eq) out.push(nm[f]+' '+(R[f] === '' || R[f] == null ? '–' : R[f])+' → '+(T.main[f] === '' ? '–' : T.main[f])); });
    const RX = (R.x && typeof R.x === 'object') ? R.x : {}, tk = Object.keys(T.x), rk = Object.keys(RX);
    const xeq = tk.length === rk.length && tk.every(k => RX[k] && F.every(f => (f === 'no' || f === 'time') ? sameS(T.x[k][f], RX[k][f] == null && f === 'time' ? k.slice(0,2)+':'+k.slice(2,4) : RX[k][f]) : same(T.x[k][f], RX[k][f])));
    if(!xeq) out.push('extra readings '+rk.length+' → '+tk.length);
    return out;
  }
  function syncPlan(prod){
    const st = S[prod], sh = sheetOf(prod); if(!st || !sh || !sh.rows) return null;
    if(!DEWPT.isLoaded(prod)) return { loading:true };
    const from = DEWPT.loadedFrom(prod);
    const G = {}; sh.rows.forEach(r => { (G[r.date] = G[r.date] || []).push(r); });
    const R = DEWPT.rowsOf(prod) || {}, d0 = sh.startDate, d1 = sh.lastDate;
    const add = [], chg = [], del = [], ok = [];
    Object.keys(G).sort().forEach(d => { const T = _target(G[d]), r = R[d];
      if(!r) add.push({ date:d, T }); else { const df = _diffRec(T, r); (df.length ? chg : ok).push({ date:d, T, df }); } });
    Object.keys(R).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= d0 && d <= d1 && !G[d]).sort().forEach(d => del.push({ date:d }));
    return { sh, d0, d1, add, chg, del, ok, needAll: !!from && from > d0, nFile:sh.rows.length };
  }
  function syncOpen(prod){ const st = S[prod]; if(!st) return; st.sync = { on:{ add:true, chg:true, del:true } }; _emit(); }
  function syncClose(prod){ const st = S[prod]; if(st){ st.sync = null; _emit(); } }
  function syncTick(prod, k, v){ const st = S[prod]; if(st && st.sync){ st.sync.on[k] = !!v; _emit(); } }
  function syncHtml(prod){
    const st = S[prod]; if(!st || !st.sync) return '';
    const P = syncPlan(prod);
    let h = '<div class="dp-card dx-sync"><div class="dp-h">⇅ Make the app history match the Excel file <button class="dp-x" onclick="DEWXL.syncClose(\''+prod+'\')" title="Close">✕</button></div>';
    if(!P) return h + '<div class="dp-hint">No data sheet selected.</div></div>';
    if(P.loading) return h + '<div class="dp-hint">⏳ Loading the dew point history…</div></div>';
    h += '<div class="dp-hint">Sheet <b>'+esc(P.sh.name)+'</b> · <b>'+P.nFile+'</b> rows · <b>'+dmy(P.d0)+' → '+dmy(P.d1)+'</b>. Inside this period the app will hold exactly the file\'s rows — odd / wrong values and duplicate No. are kept as they are. Notes typed in the app are kept. Dates outside the period are not touched.</div>';
    if(P.needAll) return h + '<div class="dx-warn">⚠ The app has only loaded readings from '+dmy(DEWPT.loadedFrom(prod))+' — load the whole history first so readings before that date are compared too. <button class="eng-btn" onclick="DEWPT.loadAll()">⤓ Load all history</button></div></div>';
    const lst = (L, f) => L.slice(0, 14).map(f).join(' · ')+(L.length > 14 ? ' · …' : '');
    const row = (k, ic, lbl, L, detail) => '<label class="dx-srow'+(L.length ? '' : ' none')+'"><input type="checkbox"'+(st.sync.on[k] && L.length ? ' checked' : '')+(L.length ? '' : ' disabled')+' onchange="DEWXL.syncTick(\''+prod+'\',\''+k+'\',this.checked)"> '+ic+' <b>'+L.length+'</b> '+lbl+
      (L.length ? '<span class="dx-sl" title="'+esc(L.map(x => dmy(x.date)+(x.df ? ': '+x.df.join(', ') : '')).join('\n'))+'">'+detail+'</span>' : '')+'</label>';
    h += row('add', '➕', 'date(s) only in the file — add', P.add, lst(P.add, x => dmy(x.date)));
    { const isVal = x => x.df.some(t => !/^(No\.|Time) /.test(t)), V = P.chg.filter(isVal), Nn = P.chg.length - V.length;   /* chỉ lệch No./giờ ⇒ gom một con số */
      h += row('chg', '✎', 'date(s) differ — overwrite with the file', P.chg,
        (V.length ? '<b>'+V.length+'</b> with different values: '+lst(V, x => dmy(x.date)+' <small>('+esc(x.df.filter(t => !/^(No\.|Time) /.test(t)).join(', '))+')</small>') : '')+
        (Nn ? (V.length ? ' — ' : '')+'<b>'+Nn+'</b> only No. / time' : '')); }
    h += row('del', '🗑', 'date(s) only in the app — delete', P.del, lst(P.del, x => dmy(x.date)));
    h += '<div class="dx-srow none">✓ <b>'+P.ok.length+'</b> date(s) already identical</div>';
    const n = (st.sync.on.add ? P.add.length : 0) + (st.sync.on.chg ? P.chg.length : 0) + (st.sync.on.del ? P.del.length : 0);
    h += '<div class="dp-row" style="margin-top:6px"><button class="eng-btn green" onclick="DEWXL.syncApply(\''+prod+'\')"'+(n && !st.busy ? '' : ' disabled')+'>'+(st.busy ? '⏳ Writing…' : '✔ Apply '+n+' change(s) to the app')+'</button></div>';
    return h + '</div>';
  }
  async function syncApply(prod){
    const st = S[prod]; if(!st || !st.sync || st.busy) return;
    if(!ENGX_U.mayWrite('eng_dew')){ toastM('⛔ Your account has no write permission', 'er'); return; }
    const P = syncPlan(prod); if(!P || P.loading || P.needAll) return;
    const on = st.sync.on, A = on.add ? P.add : [], C = on.chg ? P.chg : [], D = on.del ? P.del : [];
    if(!A.length && !C.length && !D.length) return;
    if(!(await ENGX_U.ask('⚠ Overwrite the '+DEWPT.PRODS[prod].short+' dew point history with the Excel file?\n\nSheet: '+P.sh.name+' ('+dmy(P.d0)+' → '+dmy(P.d1)+')\nAdd: '+A.length+' date(s)\nOverwrite: '+C.length+' date(s)\nDelete: '+D.length+' date(s)\n\nThe values are taken exactly as they are in the file.\n\nOK = Apply\nCancel = Go back'))) return;
    const R = DEWPT.rowsOf(prod) || {}, by = ENGX_U.userName()+' (Excel sync)', now = Date.now(), up = {};
    A.concat(C).forEach(e => { const old = R[e.date] || {}, OX = (old.x && typeof old.x === 'object') ? old.x : {};
      const rec = Object.assign({}, e.T.main, { note:old.note || '', by, _ts:now });
      const xk = Object.keys(e.T.x); if(xk.length){ rec.x = {}; xk.forEach(k => { rec.x[k] = Object.assign({}, e.T.x[k], { note:(OX[k] && OX[k].note) || '', by }); }); }
      up[e.date] = rec; });
    D.forEach(e => { up[e.date] = null; });
    st.busy = true; _emit();
    try{
      await firebase.database().ref(DEWPT.PRODS[prod].node).update(up);
      toastM('⇅ App history now matches '+P.sh.name+' — '+A.length+' added · '+C.length+' overwritten · '+D.length+' deleted', 'ok');
      st.sync = null;
      try{ DEWPT.afterImport(prod); }catch(_){}
      if(prod === 'c3'){ Object.keys(up).forEach(d => { try{ MAIL.dewReload(d); }catch(_){} }); }
    }catch(e){ ENGX_U.tell('⛔ Sync failed\n\n'+e.message); }
    finally{ st.busy = false; _emit(); }
  }
  function pickHtml(prod, cls){
    const st = S[prod];
    return '<span class="dx-pick"><button class="'+cls+'" onclick="DEWXL.pick(\''+prod+'\',this)" title="Pick the dew point Excel file you keep the readings in. Nothing is written until you press ▶ Fill — the result is saved as a NEW file in the SAME folder.">'+(st ? '🔁 Change file' : '📂 Pick Excel file')+'</button>'+
      '<input type="file" accept=".xlsx" style="display:none" onchange="DEWXL.fileIn(\''+prod+'\',this)">'+
      (st ? '<span class="dx-chip" title="'+esc(st.name)+' — source file, not changed">📗 '+esc(st.name)+' <a onclick="DEWXL.clear(\''+prod+'\')" title="Remove">✕</a></span>' : '')+'</span>';
  }
  return { S, has, busy, pick, fileIn, clear, sheet, ovr, plan, planHtml, pickHtml, run, anchor, onChange, inspect, write, outName, chart, _chartOf,
           syncPlan, syncOpen, syncClose, syncTick, syncHtml, syncApply };
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
