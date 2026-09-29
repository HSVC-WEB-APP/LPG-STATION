/* ============================================================
 * MC  —  mixctrl.js
 * ------------------------------------------------------------
 * NGUỒN (V4-54): lpg-station-v4_54_0-cavern-collapsible-sections.html
 *   dòng 22525–23672   (~1148 dòng)
 * Global xuất ra : window.MC
 * Phase tách     : P5B
 * Phụ thuộc      : sync, vmix
 * Khởi tạo (boot): MC.init() trong boot
 * ------------------------------------------------------------
 * MÔ TẢ: Mixing Controller (pha trộn 2 tank): DEF, ST/ORD/LP/PC/CR_MODE/MIXING_LOT/GCR theo tank.
 *
 * API công khai (điền/đối chiếu khi tách):
 *   MC.init(), MC.start(t), MC.stop(t)
 * ------------------------------------------------------------
 * CÁCH TÁCH (khi tới phase này):
 *   1) Mở V4-54, copy nguyên khối module MC từ dòng 22525 đến 23672.
 *   2) Dán xuống DƯỚI dòng này. GIỮ NGUYÊN tên global (window.MC).
 *   3) node --check mixctrl.js   → phải PASS (không lỗi cú pháp).
 *   4) Mở index.html trên trình duyệt → kiểm tra chức năng hoạt động.
 *   5) Cập nhật docs/PLAN-TACH-MODULE.md: đánh dấu [x] module này.
 * ============================================================ */

/* TODO[P5B]: dán thân module MC (V4-54 dòng 22525–23672) vào đây. */

/* ===== BÓC TỪ V4-54 dòng 22525–23672 ===== */
const MC = (function(){
  'use strict';

  /* ---------- defaults & cached settings (localStorage) ---------- */
  const CFG_KEY = 'lpg_v4_mc_config_v1';
  const DEF = {
    c3l: 0.483, c4l: 0.560,         // liquid densities kg/L
    c3v: 0.01721, c4v: 0.00825,     // vapor densities kg/L
    tv: 696.91,                     // max tank vol m³ (one sphere)
    r:  5.5,                        // tank radius m
    odoPpm: 30, odoRef: 570, odoBd: 0.00003
  };
  let MC_D, MC_TV, MC_TANK_R, MC_ODO;
  /* v4.101 — thể tích đường ống tuần hoàn về trạm (mặc định của các ô pipe) */
  const MC_VPIPE_DEF = 74;
  /* v4.73 — ngưỡng an toàn vận hành theo quy trình (không phải max vật lý).
     v4.78 — MỨC TỐI ĐA CHO PHÉP FILL vào TK-3501 / TK-3502 = 585 m³.
       • Thể tích cuối > 585 m³ → CHẶN CỨNG: hiện confirm() ngay khi bấm
         CALCULATE yêu cầu nhân viên xác nhận điều chỉnh con số (OK = phần
         mềm tự hạ TARGET VOL về 585 và tính lại; Cancel = tự sửa tay).
       • Trong mọi trường hợp KHÔNG cho ▶START MIX khi còn vượt 585 m³.
       • Trần tuyệt đối theo dung tích bồn: 90% × MC_TV (696.91) = 627.2 m³
         — luôn nhỏ hơn nữa thì lấy MC_LIMIT. */
  /* ══ v4.81 — HAI NGƯỠNG, KHÔNG KẸP VỀ 585 ═════════════════════════
     Quy định cho phép nạp tới 90% dung tích bồn. Trên 585 m³ là vùng
     RỦI RO CAO, nhưng đôi khi vẫn cần bơm thêm quá 585 để chỉnh tỉ lệ
     nên phần mềm KHÔNG chặn và KHÔNG kẹp ô nhập về 585 — chỉ cảnh báo
     và bắt xác nhận:

       ≤ 585 m³                → bình thường
       585 < V ≤ 90% (627.2)   → VÙNG RỦI RO CAO: TARGET VOL nháy đỏ +
                                  banner đỏ + confirm() khi CALCULATE +
                                  confirm() lần nữa khi ▶START MIX, ghi
                                  nhật ký tên người xác nhận
       > 90% dung tích         → VƯỢT QUY ĐỊNH: chặn ▶START MIX,
                                  ô nhập bị kẹp về đúng 90%              */
  const MC_TARGET  = 570;      // m³ — MỨC MIX THƯỜNG NGÀY (mục tiêu của trạm)
  const MC_WARN    = 585;      // m³ — ngưỡng CẢNH BÁO rủi ro cao
  const MC_MAX_PCT = 0.90;     // trần QUY ĐỊNH = 90% dung tích bồn
  function _mcHardCap(){ return MC_TV * MC_MAX_PCT; }   // 696.91 → 627.2 m³
  function _mcWarnLvl(){ return Math.min(MC_WARN, _mcHardCap()); }
  const MC_LIMIT = MC_WARN;    // giữ tên cũ cho các chỗ tham chiếu hiển thị
  const MC_SAFE  = MC_WARN;
  /* v4.81 — cờ theo tank */
  const OVER_WARN = { '1':false, '2':false };   // > 585 m³ (rủi ro cao)
  const OVER_HARD = { '1':false, '2':false };   // > 90% dung tích (chặn START)
  /* v4.79 (R4) — ẢNH CHỤP dữ liệu đầu vào của LẦN TÍNH GẦN NHẤT.
     Khi bấm ▶START, so lại với dữ liệu đang hiển thị: nếu có ô đã bị sửa
     mà kết quả CHƯA được tính lại thì liệt kê rõ từng ô và bắt xác nhận. */
  const CALC_SIG = { '1':null, '2':null };
  /* v4.78 — chống hiện confirm() lặp cho cùng một con số */
  const _overAsked = { '1':null, '2':null };
  function _applyCfg(c){
    MC_D = { c3l:c.c3l, c4l:c.c4l, c3v:c.c3v, c4v:c.c4v };
    MC_TV = c.tv;
    MC_TANK_R = c.r;
    MC_ODO = { ppm:c.odoPpm, ref:c.odoRef, bd:c.odoBd };
  }
  function _loadCfg(){
    try{
      const raw = localStorage.getItem(CFG_KEY);
      if(!raw){ _applyCfg(DEF); return; }
      const c = Object.assign({}, DEF, JSON.parse(raw));
      _applyCfg(c);
    }catch(_){ _applyCfg(DEF); }
  }
  function _saveCfg(c){
    try{ localStorage.setItem(CFG_KEY, JSON.stringify(c)); }catch(_){}
  }
  _loadCfg();
  /* ── v4.79 (R7) — ĐỒNG BỘ ⚙ SETTINGS QUA FIREBASE ────────────────
     Trước đây hằng số (dung tích bồn, bán kính, tỉ trọng, odorant) chỉ
     nằm trong localStorage TỪNG MÁY ⇒ hai người có thể đọc hai mức
     STOP khác nhau cho cùng một mẻ. Nay dùng chung node 'eng_mix_cfg'
     (đúng mẫu 'eng_coq_spec'): 1 object ~150 byte, ghi rất hiếm. */
  let _cfgFbRef = null, _cfgSelfPush = 0;
  function _initCfgFb(){
    try{
      if(typeof firebase === 'undefined') return;
      _cfgFbRef = firebase.database().ref('eng_mix_cfg');
      _cfgFbRef.on('value', snap=>{
        const v = snap.val();
        if(!v || typeof v !== 'object') return;
        const c = Object.assign({}, DEF, v);
        _applyCfg(c);
        _saveCfg(c);
        const src = _cfgSelfPush > 0 ? '' : ' (đồng bộ từ máy khác)';
        if(_cfgSelfPush > 0) _cfgSelfPush--;
        else toast('⚙️ Hằng số Mix Calculator đã cập nhật'+src,'warn');
        /* tính lại mọi panel đang mở để không ai đọc số cũ */
        ['1','2'].forEach(n=>{
          if(ST[n] !== 'idle'){
            _calcSilent = true; _calcOne(n); _calcSilent = false;
            const gcRes = _gid('mc-gcres'+n);
            if(gcRes && gcRes.classList.contains('on')){ _gcSilent = true; gcCalcInline(n); _gcSilent = false; }
          }
        });
      });
    }catch(e){ console.warn('[MC] cfg FB init', e); }
  }

  /* ---------- spherical-tank volume math (R=5.5m default) ---------- */
  function _volAtH(h){ return Math.PI * h * h * (MC_TANK_R - h / 3); }
  function _v2L(vol){
    if(vol <= 0) return 0;
    const maxV = _volAtH(2 * MC_TANK_R);
    if(vol >= maxV) return Math.round(2 * MC_TANK_R * 1000);
    let h = MC_TANK_R;
    for(let i = 0; i < 50; i++){
      const f  = Math.PI * h * h * (MC_TANK_R - h / 3) - vol;
      const fp = Math.PI * (2 * h * (MC_TANK_R - h / 3) + h * h * (-1 / 3));
      if(Math.abs(fp) < 1e-12) break;
      h -= f / fp;
      if(h < 0) h = 0.001;
      if(h > 2 * MC_TANK_R) h = 2 * MC_TANK_R;
      if(Math.abs(f) < 1e-6) break;
    }
    return Math.round(h * 1000);    // → mm
  }

  /* ---------- state machine ----------
     Per-tank state: 'idle' | 'calc' | 'mixing'. UI status pill is computed
     from this base + GC progress (pending-gc / completed). */
  const ST = { '1':'idle', '2':'idle' };
  const ORD = { '1':'C4', '2':'C4' };
  const LP  = { '1':false, '2':false };
  /* v4.67 — SPECIAL RATIO mix (mix tỉ lệ đặc biệt). Inverse of LOW PRESSURE:
     the operator's TARGET C3 % input IS the desired FINAL C3 after the pipe
     volume (74 m³ of previous-lot product) recirculates back into the tank.
     The calculator back-solves the in-tank blend target:
        trEff = (desired·(TV+Vpipe) − crC3·Vpipe) / TV
     and every volume/stop-level below uses trEff. Used when the new ratio
     differs a lot from the current lot's ratio. Mutually exclusive with LP. */
  const SP  = { '1':false, '2':false };
  /* v4.78 — RÀNG BUỘC TARGET VOL ↔ TARGET C3 %.
     Khi 📋 PLAN ghi TARGET VOL vào ô mc-tv, lưu lại kèm %C3 mục tiêu lúc đó.
     Nếu sau này nhân viên sửa %C3 mà QUÊN chạy lại PLAN → TARGET VOL cũ đã
     sai (tính theo %C3 cũ). Phần mềm sẽ báo và XÓA TARGET VOL để bắt lấy
     target mới. { v0:number, tr:number(%), lp:boolean, fill:string|null } */
  const PLAN_LINK = { '1':null, '2':null };
  const PC  = { '1':false, '2':false };
  /* v4.72 — CHỈ BƠM 1 SẢN PHẨM: 'C3' | 'C4' | null. Khi bật, TARGET VOL
     do phần mềm tự tính (one-way flow Cavern→TK-3501/TK-3502, chỉ bơm thêm). */
  const FILL = { '1':null, '2':null };
  /* v4.74 — CHỈ BƠM kèm tuần hoàn về trạm: MẶC ĐỊNH CÓ (pipeline chứa
     tỉ lệ cũ như SPECIAL RATIO). Bỏ tick = tính không tuần hoàn. */
  const FILL_CIRC = { '1':true, '2':true };
  const CR_MODE = { '1':'auto', '2':'auto' };
  const MIXING_LOT = { '1':0, '2':0 };

  /* timers — debounce */
  const _calcTimer = { '1':null, '2':null };
  const _gcTimer   = { '1':null, '2':null };
  const _startTimer= { '1':null, '2':null };
  let   _calcSilent = false;
  let   _gcSilent   = false;

  /* Mixing-state Firebase sync */
  let _fbRef = null;            // ref to eng_mix_state
  let _suppressEcho = 0;
  const _remoteState = { tk1:null, tk2:null };

  /* GC context — last calc result per tank (used by SAVE/DRAFT) */
  const GCR = { '1':null, '2':null };

  /* v4.55 — Tank Log row width (34 legacy + 10 COQ cols).
     v4.55.1: +9 → 53: [44] Pro/Bu %Vol  [45] Pro/Bu %Wt  [46] t-2-Butene
     [47] 1-Butene  [48] i-Butene  [49] neo-Pentane  [50] i-Pentane
     [51] n-Pentane  [52] n-Hexane
     v4.68:   +3 → 56: [53] Stock Transfer  [54] ST time  [55] ST by
     v4.85:  +13 → 69: [56] Mid Vol  [57] C3 temp  [58] C3 pres  [59] C4 temp
     [60] C4 pres  [61] Filled C3 (bảng)  [62] Filled C4 (bảng)  [63] ρ COQ đầu
     [64] %wt C3 đầu  [65] nguồn COQ đầu  [66] Filled C3 (COQ)  [67] Filled C4 (COQ)
     [68] phương pháp gửi Scale ('gc'|'coq')  — 'dens' đã gỡ ở v4.86
     ⚠ PHẢI khớp ROW_W trong eng.js. */
  /* v4.111 — ROW_W nới 69 → 73 (4 cột đối chiếu chuyển kho ở eng.js:
     [69] gap C3 · [70] gap C4 · [71] adj ST C3 · [72] adj ST C4, đơn vị kg).
     PHẢI khớp ENG.ROW_W, nếu không mảng do MC dựng sẽ ngắn hơn và mọi ô
     đối chiếu đã lưu bị cắt mất khi MC ghi lại dòng. */
  const ROW_W = 73;

  /* v4.55 — COQ metadata captured on import (sampling time / analysis date) */
  const CQM = { '1':null, '2':null };

  /* v4.55 — LPG quality spec table. Defaults mirror the lab COQ sheet.
     Synced via Firebase node 'eng_coq_spec' so every device shares one table. */
  const SPEC_DEF = {
    bd13: 0.5,     // 1,3-Butadiene       max %vol
    olef: 10,      // Total Olefin        max %vol
    c5:   2.0,     // C5 & C5+            max %vol
    vp:   1430,    // Vapor pres @37.8°C  max kPa
    sul:  140,     // Total sulfur        max mg/kg
    cu:   1,       // Cu strip corrosion  max class No.
    res:  0.05,    // Residue             max ml ('pass' text also OK)
    c3tol: 3       // %vol C3 deviation vs target — WARNING only (± points)
  };
  let SPEC = Object.assign({}, SPEC_DEF);
  let _specFbRef = null;
  const SPEC_LS_KEY = 'lpg_v4_coq_spec_v1';
  const _qcTimer = { '1':null, '2':null };

  /* ---------- generic helpers ---------- */
  function _gid(id){ return document.getElementById(id); }
  function _gv(id){ const e = _gid(id); return e ? e.value : ''; }
  /* ── v4.79 (R3) — ĐỌC SỐ THEO CHUẨN EXCEL US ──────────────────────
     • Dấu CHẤM  "."  = dấu thập phân
     • Dấu PHẨY  ","  = phân cách hàng nghìn, BẮT BUỘC đúng nhóm 3 chữ số
     Trước đây dùng parseFloat() trần nên "54,89" bị đọc thành 54 một cách
     ÂM THẦM (mất phần thập phân, không báo gì). Nay:
       "1,234.5" → 1234.5      "570" → 570        ".5" → 0.5
       "54,89"   → KHÔNG HỢP LỆ (NaN)  → ô tô đỏ + toast cảnh báo
     Trả về NaN khi chuỗi không phải số hợp lệ. */
  function _pnum(s){
    if(s === null || s === undefined) return NaN;
    let t = String(s).trim().replace(/\s+/g, '');
    if(t === '') return NaN;
    if(t.indexOf(',') >= 0){
      if(!/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return NaN;  /* phẩy sai nhóm 3 → từ chối */
      t = t.replace(/,/g, '');
    }
    if(!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return NaN;
    const v = parseFloat(t);
    return isNaN(v) ? NaN : v;
  }
  /* true nếu ô có nội dung nhưng KHÔNG đọc được thành số hợp lệ */
  function _badNum(id){
    const raw = String(_gv(id) || '').trim();
    return raw !== '' && isNaN(_pnum(raw));
  }
  function _gnum(id){ const v = _pnum(_gv(id)); return isNaN(v) ? 0 : v; }

  /* ── v4.79 (R2) — KIỂM TRA & KẸP GIÁ TRỊ NGAY TẠI Ô NHẬP ─────────
     Gọi từ onblur trong index.html: MC.chkInp(this,'vol'|'pct'|'pipe')
       vol  : 0 … mức tối đa cho phép fill (585) — vượt thì KẸP
       pct  : 0 … 100 — vượt thì KẸP; ngoài 20–70 % chỉ CẢNH BÁO (viền cam)
       pipe : 0 … 200 m³ — vượt thì KẸP
     Số không hợp lệ (vd "54,89") → viền đỏ + toast, KHÔNG tự sửa. */
  function _paintInp(el, cls){
    if(!el) return;
    el.classList.remove('mc-inp-bad','mc-inp-warn');
    if(cls) el.classList.add(cls);
  }
  function chkInp(el, kind){
    if(!el) return true;
    const raw = String(el.value || '').trim();
    if(raw === ''){ _paintInp(el, null); return true; }
    const v = _pnum(raw);
    const lbl = el.getAttribute('data-lbl') || el.id || 'ô này';
    if(isNaN(v)){
      _paintInp(el, 'mc-inp-bad');
      toast('❌ '+lbl+': "'+raw+'" không phải số hợp lệ. Dùng dấu CHẤM cho thập phân (54.89), dấu PHẨY chỉ để ngăn hàng nghìn (1,234.5).','er');
      return false;
    }
    let lo = 0, hi = null, warnLo = null, warnHi = null, unit = '';
    /* v4.81 — thể tích: KẸP ở trần quy định 90% dung tích (không kẹp về 585);
       trên 585 chỉ cảnh báo mềm (viền cam) vì vẫn được phép nạp. */
    if(kind === 'vol'){ hi = _mcHardCap(); warnLo = 0; warnHi = _mcWarnLvl(); unit = ' m³'; }
    else if(kind === 'pct'){ hi = 100; warnLo = 20; warnHi = 70; unit = ' %'; }
    else if(kind === 'pipe'){ hi = 200; unit = ' m³'; }
    let out = v, clamped = false;
    if(v < lo){ out = lo; clamped = true; }
    if(hi !== null && v > hi){ out = hi; clamped = true; }
    if(clamped){
      el.value = String(out);
      _paintInp(el, 'mc-inp-bad');
      toast('⛔ '+lbl+': '+_fmt(v,2)+unit+' vượt '+(kind==='vol'?'TRẦN QUY ĐỊNH 90% dung tích':'giới hạn cho phép')
            +' ('+_fmt(lo,0)+'–'+_fmt(hi,hi%1?1:0)+unit+') — đã kẹp về '+_fmt(out,hi%1?1:0)+unit,'er');
      setTimeout(()=>_paintInp(el, null), 2500);
      return false;
    }
    if(warnLo !== null && (out < warnLo || out > warnHi)){
      _paintInp(el, 'mc-inp-warn');
      toast(kind === 'vol'
        ? '🚨 '+lbl+': '+_fmt(out,1)+' m³ TRÊN ngưỡng cảnh báo '+_fmt(warnHi,0)+' m³ — RỦI RO CAO (trần quy định '+_fmt(hi,1)+' m³)'
        : '⚠ '+lbl+': '+_fmt(out,2)+'% nằm ngoài dải vận hành thường '+warnLo+'–'+warnHi+'% — kiểm tra lại','warn');
      return true;
    }
    _paintInp(el, null);
    return true;
  }
  function _fmt(v, d){
    if(v == null || isNaN(v)) return '—';
    return Number(v).toLocaleString('en-US', { maximumFractionDigits: (d != null ? d : 3) });
  }
  function _p2(v){ return String(v).padStart(2, '0'); }
  function _todayDDMMYY(){
    const d = new Date();
    return _p2(d.getDate())+'/'+_p2(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2);
  }
  function _nowHHMM(){
    const d = new Date();
    return _p2(d.getHours())+':'+_p2(d.getMinutes());
  }
  function _lotName(num){
    return 'LPG-'+new Date().getFullYear()+'-'+num;
  }
  function _parseLotNum(v){
    const s = String(v||'').trim();
    let m = s.match(/LPG-(\d{4})-(\d+)/i);
    if(m) return { year:parseInt(m[1]), num:parseInt(m[2]) };
    const n = parseInt(s);
    if(!isNaN(n) && n > 0) return { year:new Date().getFullYear(), num:n };
    return null;
  }
  /* Audit-log shim (SC.logAudit is a no-op in v4.5+, but the call is kept
     so flipping the audit feature on later doesn't need code edits here). */
  function _audit(area, rid, field, before, after, reason){
    try{ if(typeof SC !== 'undefined' && SC.logAudit) SC.logAudit(area, rid, field, before, after, reason); }catch(_){}
  }

  /* ---------- input normalisation (date / time) ---------- */
  function fmtTime(el){
    const v = (el.value||'').replace(/[^\d]/g,'');
    if(v.length >= 3){
      let hh = v.slice(0,2), mm = v.slice(2,4);
      if(parseInt(hh) > 23) hh = '23';
      if(mm.length >= 2 && parseInt(mm) > 59) mm = '59';
      el.value = hh + ':' + mm;
    }
  }
  function fmtDate(el){
    const raw = (el.value||'').replace(/[^\d\/]/g,'').slice(0,8);
    if(raw !== el.value) el.value = raw;
  }
  /* v4.161 -- VA HAI LOI CU CUA O NGAY TREN PANEL MIX:
       (a) nhanh 4 chu so tra ve "dd/mm" KHONG CO NAM va khong chan mm>12,
           tuc la tu tay hop thuc hoa mot ngay hong;
       (b) khong he co canh bao nao khi chuoi con lai khong phai ngay that.
     Nay: chi tu chen dau "/" khi ket qua la MOT NGAY CO THAT; con lai giu
     nguyen chuoi nguoi ta go va TO DO o nhap. Van cho luu -- chi canh bao. */
  /* v4.161 -- hai canh bao moi ben duoi deu nam trong duong chay LIEN TUC
     (moi lan doi lot, moi lan vao tab), nen phai chan lap: mot tinh huong
     chi keu toast dung MOT lan cho toi khi tinh huong doi. */
  const _warnOnce = Object.create(null);
  function _warnedOnce(key){
    if(_warnOnce[key]) return true;
    _warnOnce[key] = 1;
    return false;
  }
  function _mcDateOk(v){
    const s = String(v == null ? '' : v).trim();
    if(!s) return false;
    const mt = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(!mt) return false;
    const d = +mt[1], m = +mt[2];
    let y = +mt[3]; if(y < 100) y += 2000;
    if(!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  function fmtDateBlur(el){
    const raw = (el.value||'').trim();
    const v = raw.replace(/[^\d]/g,'');
    if(!raw.length){ el.style.borderColor = ''; el.style.background = ''; el.title = ''; return; }
    if(/^\d+$/.test(raw) && (v.length === 6 || v.length === 8)){
      const cand = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
      if(_mcDateOk(cand)) el.value = cand;
    }
    const bad = !_mcDateOk(el.value);
    el.style.borderColor = bad ? '#dc2626' : '';
    el.style.background  = bad ? '#fef2f2' : '';
    el.title = bad
      ? 'Not a real date (DD/MM/YY) \u2014 the lot saved with this date is dropped from every monthly total.'
      : '';
    if(bad) toast('\u26a0 "' + el.value + '" is not a real date \u2014 expected DD/MM/YY','warn');
  }

  /* ---------- lot-name label (LPG-YYYY-NNN) ---------- */
  function updateLotNames(){
    ['1','2'].forEach(n=>{
      const inp = _gid('mc-l'+n), name = _gid('mc-ln'+n);
      if(!inp || !name) return;
      const num = parseInt(inp.value) || 0;
      name.textContent = num > 0 ? _lotName(num) : '';
    });
  }

  /* ---------- duplicate-lot check (RAM-only — reads ENG.ROWS) ---------- */
  /* ═══ v4.215 — DẢI CẢNH BÁO trên hàng LOT (chỗ trống giữa trạng thái và ngày giờ)
     Mọi cảnh báo của bồn gom về MỘT chỗ ngay tầm mắt, chữ to, có màu — trước đây
     nằm rải rác bằng chữ nhỏ phía dưới (vd. thiếu CURRENT C3 ⇒ odorant không tính,
     user không thấy). Bấm một ô ⇒ nhảy tới đúng chỗ cần sửa. Chỉ ĐỌC dữ liệu đang
     có trên form (RAM), không tính gì mới, không đụng Firebase. */
  const DUP = { '1':null, '2':null };
  function _warnList(n){
    const W = [];
    if(ST[n] === 'idle') return W;
    const add = (lv, t, tip, go) => W.push({ lv, t, tip: tip || t, go });
    if(DUP[n]) add('bad', 'Lot '+DUP[n].lot+' already in Tank Log', DUP[n].name+' · '+DUP[n].tank+' · '+DUP[n].date+' · '+DUP[n].q+' — enter a different lot number', 'mc-l'+n);
    if(OVER_HARD[n]) add('bad', 'TARGET VOL over 90% cap', 'Final volume is above the 90% tank limit — ▶START is blocked', 'mc-tv'+n);
    else if(OVER_WARN[n]) add('warn', 'TARGET VOL high-risk zone', 'Final volume is above the warning level — ▶START needs a second confirmation', 'mc-tv'+n);
    const iv = _gnum('mc-iv'+n), tv = _gnum('mc-tv'+n), tr = _gnum('mc-tr'+n), cr = _gnum('mc-cr'+n);
    if(!cr){
      const h = (_gid('mc-h'+n) || {}).textContent || '';
      add('warn', 'CURRENT C3 % empty', (h ? h + ' — ' : '') + 'switch the badge to MANUAL and type it', 'mc-cr'+n);
    }
    const miss = [];
    if(!iv) miss.push(['INIT VOL','mc-iv'+n]); if(!tv) miss.push(['TARGET VOL','mc-tv'+n]);
    if(!tr) miss.push(['TARGET C3 %','mc-tr'+n]); if(!cr) miss.push(['CURRENT C3 %','mc-cr'+n]);
    /* v4.219 — lúc đang nhập (calc) các ô này là ô bắt buộc của CALCULATE, báo "odorant" là sai chỗ;
       chỉ báo khi ĐÃ ▶START mà vẫn thiếu (odorant BD SET sẽ không vào Tank Log) */
    if(miss.length && ST[n] !== 'calc') add('bad', 'Odorant not calculated', 'Odorant (BD SET) is only written to the Tank Log when INIT VOL, TARGET VOL, TARGET C3 % and CURRENT C3 % are all filled. Missing: '+miss.map(x=>x[0]).join(', '), miss[0][1]);
    const q = ALTR[n] && ALTR[n].coq;
    if((GCR[n] || _gnum('gc'+n+'-fvol')) && q && q.error) add('bad', 'COQ not computed', q.error, 'mc-alt'+n);
    if(GCR[n] && q && !q.error && GCR[n].fLPG){
      const p = (q.fLPG - GCR[n].fLPG) / GCR[n].fLPG * 100;
      if(Math.abs(p) >= 3) add('warn', 'COQ vs GC Δ '+(p >= 0 ? '+' : '')+p.toFixed(1)+'%', 'Filled LPG by COQ differs from GC by more than 3% — check the COQ figures', 'mc-gcres'+n);
    }
    if(GCR[n]){ try{ const ev = evalQuality(n); if(ev.fails.length) add('bad', 'Quality FAIL ('+ev.fails.length+')', ev.fails.join(' · '), 'mc-qc'+n); }catch(_){} }
    return W;
  }
  function _renderWarnbar(n){
    const el = _gid('mc-wb'+n);
    if(!el) return;
    const W = _warnList(n);
    if(!W.length){ el.innerHTML = ''; el.classList.remove('on'); return; }
    W.sort((a, b) => (a.lv === 'bad' ? 0 : 1) - (b.lv === 'bad' ? 0 : 1));
    /* hiện nhiều nhất số ô VỪA CHỖ (đo thật), phần còn lại gom vào "+N" — bấm để xem hết */
    el.classList.add('on');
    _WB[n] = W;
    const draw = k => {
      const shown = W.slice(0, k), more = W.length - k;
      el.innerHTML = shown.map(w => '<button type="button" class="mc-wchip '+w.lv+(k === 1 ? ' solo' : '')+'" title="'+_escHtml(w.tip).replace(/"/g,'&quot;')+'" onclick="MC.warnGo(\''+w.go+'\')">'+(w.lv === 'bad' ? '⛔ ' : '⚠ ')+_escHtml(w.t)+'</button>').join('')
        + (more > 0 ? '<button type="button" class="mc-wchip more" onclick="MC.warnAll(\''+n+'\')" title="Show all warnings of this tank">+'+more+' more</button>' : '');
    };
    let k = Math.min(W.length, 4);
    draw(k);
    while(k > 1 && el.scrollWidth > el.clientWidth + 1){ k--; draw(k); }
  }
  const _WB = { '1':[], '2':[] };
  function warnAll(n){
    const W = _WB[n] || [];
    if(!W.length) return;
    UIDLG.alert('⚠ TK-'+(n === '1' ? '3501' : '3502')+' — '+W.length+' WARNING'+(W.length > 1 ? 'S' : '')+'\n\n'
      + W.map(w => (w.lv === 'bad' ? '⛔ ' : '⚠ ') + w.t + ': ' + w.tip).join('\n'));
  }
  function warnGo(id){
    const e = _gid(id); if(!e) return;
    try{ e.scrollIntoView({ behavior:'smooth', block:'center' }); }catch(_){}
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !e.readOnly){ try{ e.focus({ preventScroll:true }); }catch(_){} }
    e.classList.add('mc-flash'); setTimeout(() => e.classList.remove('mc-flash'), 1600);
  }

  function checkDupLot(n){
    const lotEl = _gid('mc-l'+n);
    if(!lotEl) return;
    /* v4.85.1 — đổi lot thì trạng thái ĐẦU của cách 2 phải lấy lại theo lot mới */
    try{ _autoFillIcq(n); }catch(_){}
    const val = parseInt(lotEl.value);
    if(val > 0 && DUP[n] && DUP[n].lot !== val) DUP[n] = null;      /* v4.215 — gõ lot khác thì gỡ cảnh báo trùng */
    if(!val || val <= 0){ _renderWarnbar(n); return; }
    const tk = n==='1' ? '3501' : '3502';
    const otherN = n==='1' ? '2' : '1';
    const otherLot = parseInt(_gid('mc-l'+otherN)?.value) || 0;
    if(otherLot === val){
      toast('⚠ Lot '+val+' is already used by TK-'+(otherN==='1'?'3501':'3502')+' — pick a different lot','er');
      lotEl.value = ''; lotEl.focus();
      return;
    }
    /* v4.161 -- noi ro PHAM VI: khi Tank Log chua Load All thi vong lap
       duoi day chi quet duoc N lot dang co trong RAM, nen mot lot trung
       nam ngoai cua so se KHONG bi bat. Canh bao, khong chan. */
    if(typeof ENG !== 'undefined' && !ENG.allLoaded && !_warnedOnce('dupscope')){
      const _tot = (ENG.ROWS || []).length;
      toast('\u2139 Duplicate check covers the ' + _tot + ' loaded lots only \u2014 press \ud83d\udce5 Load All in the Tank Log to check every lot','warn');
    }
    const rows = (typeof ENG !== 'undefined') ? ENG.ROWS : [];
    for(const r of rows){
      const rLot = String(r[1]||'').trim();
      const rTank = String(r[2]||'').trim().toUpperCase();
      const p = _parseLotNum(rLot);
      const rNum = p ? p.num : parseInt(rLot);
      if(rNum === val && rTank.includes(tk)){
        const q = String(r[27]||'').trim().toLowerCase();
        const statusTxt = q==='pass' ? '✅ Pass' : (q==='pending' ? '⏳ Pending' : '📋 '+(r[27]||''));
        alert('⚠ DUPLICATE LOT\n\nLot '+val+' ('+_lotName(val)+') already exists in the Tank Log:\n'+
              '• Tank: '+(r[2]||'')+'\n'+
              '• Date: '+(r[3]||'')+'\n'+
              '• Quality: '+statusTxt+'\n\n'+
              'Please use a different lot number.');
        toast('❌ Lot '+val+' already exists in Tank Log','er');
        DUP[n] = { lot:val, name:_lotName(val), tank:String(r[2]||''), date:String(r[3]||''), q:statusTxt };
        _renderWarnbar(n);
        lotEl.value = ''; lotEl.focus();
        return;
      }
    }
  }

  /* ---------- Current C3 auto-fill (latest lot for that tank in ENG.ROWS) ----------
     v4.60 — MUST exclude the lot currently being mixed (mc-l). Before this
     fix, once the current lot was SAVE-PASSed it became the "latest lot"
     and AUTO fed the lot's OWN %C3 result back in as its initial %C3,
     corrupting col[11] on the next save → CALC+SAVE in the edit modal
     then reproduced wrong Filled C3/C4. Initial composition of lot N is
     always the result of a lot < N. */
  function _autoFillCr(n){
    if(CR_MODE[n] !== 'auto') return;
    const tk = n==='1' ? '3501' : '3502';
    const crEl = _gid('mc-cr'+n), hEl = _gid('mc-h'+n);
    if(!crEl) return;
    const yr = new Date().getFullYear();
    const curLot = parseInt(_gv('mc-l'+n)) || 0;   // lot being mixed on this panel
    let best = null;
    const rows = (typeof ENG !== 'undefined') ? ENG.ROWS : [];
    rows.forEach(r=>{
      const p = _parseLotNum(r[1]);
      if(!p || p.year !== yr) return;
      if(curLot && p.num >= curLot) return;        // never self / future lots
      const rTk = String(r[2]||'').toUpperCase();
      if(!rTk.includes(tk)) return;
      const c3pct = parseFloat(String(r[8]||'').replace(/,/g,''));
      if(isNaN(c3pct) || c3pct <= 0) return;
      if(!best || p.num > best.num) best = { num:p.num, c3:c3pct };
    });
    if(best){
      const pct = (Math.abs(best.c3) > 1) ? best.c3 : (best.c3 * 100);
      crEl.value = pct.toFixed(4);
      if(hEl) hEl.textContent = '← TK-'+tk+' Lot '+_lotName(best.num);
    } else {
      crEl.value = '';
      if(hEl) hEl.textContent = 'No prior lot data';
    }
  }
  function toggleCrMode(n){
    const btn = _gid('mc-crm'+n), crEl = _gid('mc-cr'+n), hEl = _gid('mc-h'+n);
    if(CR_MODE[n] === 'auto'){
      CR_MODE[n] = 'manual';
      if(btn){ btn.textContent = 'MANUAL'; btn.classList.add('manual'); }
      if(crEl){ crEl.readOnly = false; crEl.placeholder = 'manual'; }
      if(hEl) hEl.textContent = '✏ Manual';
    } else {
      CR_MODE[n] = 'auto';
      if(btn){ btn.textContent = 'AUTO'; btn.classList.remove('manual'); }
      if(crEl){ crEl.readOnly = true; crEl.placeholder = 'auto'; }
      _autoFillCr(n);
    }
    autoCalc(n);
  }

  /* ---------- panel state rendering ---------- */
  function _renderStatus(n){
    try{ setTimeout(()=>_renderWarnbar(n), 0); }catch(_){}
    const badge = _gid('mc-status'+n);
    const hdr = _gid('mc-hdr'+n);
    if(!badge || !hdr) return;
    const cls = ['mc-hdr', 'mc-tk-'+n];
    if(ST[n] === 'calc')        cls.push('mc-state-calc');
    else if(ST[n] === 'mixing') cls.push('mc-state-mixing');
    hdr.className = cls.join(' ');
    let stateCls = 's-calc', label = '● CALCULATION';
    if(ST[n] === 'mixing'){
      stateCls = 's-mixing'; label = '◉ MIXING';
    } else if(ST[n] === 'calc'){
      const fvol = _gnum('gc'+n+'-fvol');
      const c3h8 = _gnum('gc'+n+'-c3h8');
      const gcRes = _gid('mc-gcres'+n);
      const gcDone = gcRes && gcRes.classList.contains('on') && (gcRes.innerHTML||'').indexOf('FILLED') >= 0;
      if(gcDone){ stateCls = 's-completed'; label = '● COMPLETED'; }
      else if(fvol > 0 || c3h8 > 0){ stateCls = 's-pending-gc'; label = '● PENDING GC'; }
    }
    badge.className = 'mc-status ' + stateCls;
    badge.textContent = label;
    const body = _gid('mc-body'+n);
    if(body) body.classList.toggle('on', ST[n] !== 'idle');
    const gc = _gid('mc-gc-inline'+n);
    if(gc) gc.classList.toggle('on', ST[n] !== 'idle');
    /* Lock IV/TV/TR when mixing */
    const locked = (ST[n] === 'mixing');
    ['mc-iv'+n,'mc-tv'+n,'mc-tr'+n].forEach(id=>{
      const el = _gid(id);
      if(el){ el.readOnly = locked; el.style.opacity = locked ? '.6' : '1'; }
    });
  }

  function activate(n){
    if(ST[n] === 'idle'){ ST[n] = 'calc'; }
    else if(ST[n] === 'calc'){ ST[n] = 'idle'; }
    /* never collapse from 'mixing' via header click — must finish/revert */
    _renderStatus(n);
    if(ST[n] !== 'idle'){ _autoFillCr(n); _autoFillIcq(n); }
  }

  /* ---------- v4.67 — double-click guard for mode buttons ----------
     Pump order / LOW PRESSURE / SPECIAL RATIO / RECEIVE C3 flip the whole
     calculation model, and a stray single click was too easy to miss.
     Single click now only shows a hint; DOUBLE-click performs the toggle
     (same timer pattern as startClick/startDblClick). */
  const _modeTimer = {};
  const _MODE_LBL = { ord:'pump order ➊➋', lp:'LOW PRESSURE', sp:'SPECIAL RATIO', pc:'RECEIVE C3', fc3:'FILL C3 ONLY', fc4:'FILL C4 ONLY' };
  function modeClick(n, kind){
    const key = kind + n;
    clearTimeout(_modeTimer[key]);
    _modeTimer[key] = setTimeout(()=>{
      toast('👆👆 DOUBLE-CLICK to toggle '+(_MODE_LBL[kind]||kind)+' (prevents accidental clicks)','warn');
    }, 260);
  }
  function modeDbl(n, kind){
    clearTimeout(_modeTimer[kind + n]);
    if(kind==='ord')      toggleOrder(n);
    else if(kind==='lp')  toggleLP(n);
    else if(kind==='sp')  toggleSP(n);
    else if(kind==='pc')  togglePC(n);
    else if(kind==='fc3') toggleFill(n,'C3');
    else if(kind==='fc4') toggleFill(n,'C4');
  }

  /* ---------- toggles ---------- */
  function toggleOrder(n){
    const btn = _gid('mc-ord'+n);
    if(ORD[n] === 'C4'){
      ORD[n] = 'C3';
      if(btn){ btn.textContent = '➊C3 ➋C4'; btn.classList.remove('mc-btn-c4'); btn.classList.add('mc-btn-c3'); }
      toast('TK-'+(n==='1'?'3501':'3502')+': C3 first → C4 second','warn');
    } else {
      ORD[n] = 'C4';
      if(btn){ btn.textContent = '➊C4 ➋C3'; btn.classList.remove('mc-btn-c3'); btn.classList.add('mc-btn-c4'); }
      toast('TK-'+(n==='1'?'3501':'3502')+': C4 first → C3 second (default)','ok');
    }
    autoCalc(n);
  }
  function toggleLP(n){
    LP[n] = !LP[n];
    if(LP[n] && PC[n]){ PC[n] = false; _gid('mc-pc'+n)?.classList.remove('on'); _gid('mc-pc-box'+n)?.classList.remove('on'); }
    if(LP[n] && SP[n]){ SP[n] = false; _gid('mc-sp'+n)?.classList.remove('on'); _gid('mc-sp-box'+n)?.classList.remove('on'); }
    if(LP[n] && FILL[n]){ _setFill(n, null); }   /* v4.77: mode exclusivity */
    _gid('mc-lp'+n)?.classList.toggle('on', LP[n]);
    _gid('mc-lp-box'+n)?.classList.toggle('on', LP[n]);
    autoCalc(n);
  }
  /* v4.67 — TARGET C3 % label follows the SP mode so the operator always
     knows WHICH number the input represents:
       SP off → "TARGET C3 %"                            (blend target, classic)
       SP on  → "FINAL TARGET C3 % (AFTER CIRCULATE)"    (final result wanted) */
  function _updateTrLabel(n){
    const lbl = _gid('mc-trlbl'+n);
    if(!lbl) return;
    /* v4.77 — FILL mode with circulation: input is also the FINAL after circulate */
    if(FILL[n] && FILL_CIRC[n]){
      lbl.innerHTML = 'FINAL TARGET C3 % <span style="color:#1d4ed8;font-weight:800">(AFTER CIRCULATE)</span>';
      lbl.title = 'Desired FINAL C3 % — AFTER pipe circulation (FILL '+FILL[n]+' ONLY). The software solves TARGET VOL and the in-tank blend automatically.';
      return;
    }
    if(SP[n]){
      lbl.innerHTML = 'FINAL TARGET C3 % <span style="color:#047857;font-weight:800">(AFTER CIRCULATE)</span>';
      lbl.title = 'Desired FINAL C3 % — AFTER pipe circulation. The software back-solves the Blend target C3 (before circulate) shown below.';
    } else {
      lbl.textContent = 'TARGET C3 %';
      lbl.title = '';
    }
  }
  /* ── v4.68 — SPECIAL-RATIO MIX PLANNER ──────────────────────────────
     Question it answers: "mix BAO NHIÊU m³ hàng đặc biệt (tỷ lệ s) để sau
     khi bán xong, chỉ cần bơm C3 (hoặc C4) vào là tank quay về tỷ lệ
     thường t (mặc định 55%) với volume càng sát tank-max (570) càng tốt — và
     vẫn an toàn nếu khách hủy bớt xe?"

     Toán (thể tích, bỏ qua pha hơi — đủ chính xác để lên kế hoạch):
       • Phần còn lại Vr @ s, bơm A m³ C3 nguyên chất về tỷ lệ t:
           A  = Vr·(t−s)/(1−t)     (s < t; nếu s > t thì bơm C4: A = Vr·(s−t)/t)
           Vf = Vr·k,  k = (1−s)/(1−t)   (C4: k = s/t)
       • Vf ≤ tankMax  ⇒  Vr_max = tankMax/k
       • Bán chắc chắn Vs_min = (KH bán − dự phòng hủy) đổi ra m³
       • MIX AN TOÀN TỐI ĐA:  V0 = min(tankMax, Vs_min + Vr_max)
     Dự phòng hủy = phần plan có thể KHÔNG lấy — kể cả hủy hết phần đó,
     leftover V0−Vs_min vẫn đưa về t được trong giới hạn tank. */
  /* v4.69 — planner lives in its OWN modal (#spp-modal, shared by both
     tanks) so the engineer can review it carefully. All text in English.
     New in v4.69:
       • MIX-FAIL RESERVE (ton): headroom kept free in the tank so a failed
         mix (ratio came out off-spec) can still be corrected by pumping
         extra C3 or C4. Suggested 12 t (typical 10–15), user-adjustable.
         Constraint: V0 ≤ tankMax − Vfail  (Vfail sized with C3 density —
         worst-case volume per ton).
       • Option B — DUAL top-up: when reserves are big the C3-only recovery
         lands far below tankMax. Pump BOTH components to reach EXACTLY
         tankMax @ normal ratio t:  x(C3) = t·M − s·Vr ;  y(C4) = (1−t)·M − (1−s)·Vr.
       • Direction-aware: special 70:30 (s > t) recovers by pumping C4. */
  let _sppTank = null;
  /* ── v4.80 — PLANNER LUÔN MỞ VỚI Ô TRỐNG ─────────────────────────
     KHÔNG nhớ số liệu của lần PLAN trước (đã bỏ node 'eng_mix_plan').
     Lý do vận hành: hai mẻ liên tiếp gần như luôn khác nhau về sản lượng
     bán và dự phòng; điền sẵn số cũ dễ khiến nhân viên bấm qua mà quên
     sửa → PLAN ra TARGET VOL sai. Bắt nhập lại từ đầu mỗi lần là an toàn
     hơn. Lịch sử vẫn được ghi trong nhật ký 'eng_mix_audit'. */
  function spPlanOpen(n){
    _sppTank = n;
    const m = _gid('spp-modal'); if(!m) return;
    const ttl = _gid('spp-title');
    if(ttl) ttl.textContent = '★ SPECIAL RATIO MIX PLANNER — TK-'+(n==='1'?'3501':'3502');
    /* XÓA TRẮNG số liệu của lần mở trước — ép nhập lại cho đúng mẻ này */
    const _set0 = (id,v)=>{ const e=_gid(id); if(e){ e.value=v; e.classList.remove('mc-inp-bad','mc-inp-warn'); } };
    _set0('spp-sell', '');              // sản lượng bán — LUÔN phải nhập lại
    _set0('spp-resv', '0');             // dự phòng hủy
    _set0('spp-norm', '55');            // v4.101 — tỉ lệ thường mặc định 55 %
    _set0('spp-fail', '12');            // dự phòng mix hỏng (gợi ý)
    _set0('spp-max',  String(MC_TARGET));// mức mix thường ngày (KHÔNG phải trần)
    /* v4.107 — TUẦN HOÀN ĐƯỜNG ỐNG: MẶC ĐỊNH KHÔNG.
       Trước (v4.101) planner tự tick sẵn và trừ luôn 74 m³ đường ống, làm
       MAX SAFE MIX nhỏ đi mà người dùng không chủ động chọn. Nay mở planner
       là bỏ tick — ai chạy tuần hoàn thật thì tự tick. Ô này CHỈ dùng cho
       planner — không đụng tới cấu hình mix ở panel. */
    const _ck = _gid('spp-circ');
    if(_ck) _ck.checked = false;
    const _vpEl = _gid('spp-vpipe');
    if(_vpEl){
      const vpPanel = FILL[n] ? _gnum('mc-fcpipe'+n)
                    : (SP[n] ? _gnum('mc-spvpipe'+n) : 0);
      _vpEl.value = String(vpPanel > 0 ? vpPanel : MC_VPIPE_DEF);
      _vpEl.classList.remove('mc-inp-bad','mc-inp-warn');
    }
    const se = _gid('spp-special');
    const tr = _gnum('mc-tr'+n);
    if(se) se.value = tr > 0 ? tr.toFixed(2) : '';
    const res = _gid('spp-res');
    if(res){ res.innerHTML = ''; delete res.dataset.v0; }
    m.classList.add('on');
    _gid('spp-sell')?.focus?.();
    spPlanCalc();
  }
  function spPlanClose(){
    const m = _gid('spp-modal'); if(m) m.classList.remove('on');
    _sppTank = null;
  }
  function spPlanCalc(){
    const res = _gid('spp-res'); if(!res) return;
    const pf = id => { const v = parseFloat(String(_gv(id)||'').replace(/,/g,'')); return isNaN(v)?0:v; };
    const s = pf('spp-special')/100;         // special ratio C3 (from FINAL TARGET C3 %)
    const t = pf('spp-norm')/100;            // normal ratio to return to
    const sellT = pf('spp-sell');            // sale plan (ton)
    const resvT = pf('spp-resv');            // cancel reserve (ton)
    const failT = pf('spp-fail');            // mix-fail reserve (ton)
    let   M = pf('spp-max') || MC_TARGET;    // mức thể tích mix nhắm tới (mặc định 570)
    /* v4.78 — không cho planner vượt mức tối đa cho phép fill */
    if(M > _mcHardCap() + 1e-9) M = _mcHardCap();
    if(!(s>0 && s<1) || !(t>0 && t<1) || !(sellT>0)){
      res.innerHTML = '<div class="spp-dim">Enter the SALE PLAN (ton). Special ratio is pre-filled from FINAL TARGET C3 %.</div>';
      delete res.dataset.v0;
      return;
    }
    const rho  = s*MC_D.c3l + (1-s)*MC_D.c4l;          // ton/m³ of special product
    const Vs   = sellT/rho;                             // full plan volume
    const Vrsv = Math.min((resvT>0?resvT:0)/rho, Vs);
    const VsMin= Vs - Vrsv;                             // guaranteed sales
    const same = Math.abs(s-t) < 1e-6;
    const addC3 = s < t;
    const comp  = addC3 ? 'C3' : 'C4';
    const compRho = addC3 ? MC_D.c3l : MC_D.c4l;
    /* ── v4.101 — TUẦN HOÀN ĐƯỜNG ỐNG (tỉ lệ cũ) ─────────────────────
       Mặc định CÓ. Khi mẻ đặc biệt chạy tuần hoàn, sau khi mix xong thì
       Vp m³ hàng trong đường ống CŨNG mang tỉ lệ đặc biệt s. Lúc đưa bồn
       về tỉ lệ thường t, cả hệ (bồn + ống) phải về t, nên phải chỉnh
       (Vr + Vp) chứ không chỉ Vr:
           bơm thêm  A  = (Vr + Vp)·a,     a = (t−s)/(1−t)  nếu bơm C3
                                              (s−t)/t       nếu bơm C4
           thể tích bồn sau khi chỉnh  Vf = Vr·k + Vp·a,   k = 1 + a
       ⇒ leftover tối đa còn cứu được:  VrMax = (M − Vp·a)/k
       Bỏ tick tuần hoàn → Vp = 0, mọi công thức thu về đúng bản cũ. */
    const circOn = !!(_gid('spp-circ') && _gid('spp-circ').checked);
    const vpIn   = pf('spp-vpipe');
    const Vp     = circOn ? (vpIn > 0 ? vpIn : MC_VPIPE_DEF) : 0;
    const cBox   = _gid('spp-circ')?.closest?.('.spp-circ');
    if(cBox) cBox.classList.toggle('off', !circOn);
    const a = same ? 0 : (addC3 ? (t-s)/(1-t) : (s-t)/t);   // top-up per m³ off-ratio
    const k = 1 + a;                                    // recovery volume factor
    const pipeCost = Vp * a;                            // chỗ trong bồn mà ống "ăn" mất
    const VrMax = Math.max(0, (M - pipeCost)/k);        // max recoverable leftover
    const Vfail = failT > 0 ? failT/MC_D.c3l : 0;       // worst-case correction volume (C3 density)
    const capHead = M - Vfail;                          // mix headroom limit
    const capRec  = VsMin + VrMax;                      // recovery limit
    const V0 = Math.max(0, Math.min(capHead, capRec));
    const binding = capHead < capRec ? 'MIX-FAIL headroom (tank max − '+_fmt(Vfail,1)+' m³)'
                  : (Vp > 0 ? 'recovery-to-normal limit (pipe '+_fmt(Vp,0)+' m³ included)'
                            : 'recovery-to-normal limit');
    const cNote = _gid('spp-circ-note');
    if(cNote){
      cNote.innerHTML = !circOn
        ? 'Tính KHÔNG tuần hoàn (mặc định) — chỉ chỉnh phần hàng trong bồn. Tick ô trên nếu mẻ này chạy tuần hoàn qua ống.'
        : (same ? 'Tỉ lệ đặc biệt = tỉ lệ thường → tuần hoàn không đổi kết quả'
                : 'Trộn xong, ống giữ '+_fmt(Vp,0)+' m³ @ '+(s*100).toFixed(0)+'% — cũng phải kéo về '+(t*100).toFixed(1)+'% → '
                  + 'tốn thêm <b>'+_fmt(pipeCost,1)+'</b> m³ chỗ trong bồn'
                  + ' <span style="color:#6b8299;font-weight:500">(khác với tuần hoàn lúc TRỘN ở panel — không tính trùng)</span>');
    }
    const _td = v => '<td>'+v+'</td>';
    const _scen = (label, sold, soldT)=>{
      const Vr = V0 - sold;
      if(Vr < -0.05){
        return '<tr class="spp-tr-er"><td>'+label+'</td>'+_td(_fmt(sold,1)+' m³ / '+_fmt(soldT,1)+' t')
             + '<td colspan="3">✗ Mix '+_fmt(V0,1)+' m³ &lt; volume to sell — NOT enough product</td></tr>';
      }
      /* Option A — single component (v4.101: chỉnh cả hàng trong ống) */
      const addA = (Vr + Vp) * a;
      const VfA  = Vr + addA;
      const okA  = VfA <= M + 0.05;
      const gapA = M - VfA;
      const optA = same ? '—'
        : '<b>'+_fmt(addA,1)+'</b> m³ '+comp+' ('+_fmt(addA*compRho,1)+' t)<br>→ '+_fmt(VfA,1)+' m³ @ '+(t*100).toFixed(1)+'% '
          +(okA ? (gapA > 5 ? '<span class="spp-gap">('+_fmt(gapA,1)+' m³ below max)</span>' : '✓')
                : '<span class="spp-er">✗ exceeds '+_fmt(M,0)+' m³</span>');
      /* Option B — dual top-up to EXACTLY M @ t (v4.101: cả hệ bồn + ống về t)
         x + y = M − Vr  ·  C3 tổng: s(Vr+Vp) + x = t(M+Vp) */
      const x = t*(M+Vp) - s*(Vr+Vp);          // C3 volume
      const y = (1-t)*(M+Vp) - (1-s)*(Vr+Vp);  // C4 volume
      const okB = x >= -0.05 && y >= -0.05;
      const optB = okB
        ? '<b>'+_fmt(Math.max(0,x),1)+'</b> m³ C3 ('+_fmt(Math.max(0,x)*MC_D.c3l,1)+' t)<br>+ <b>'+_fmt(Math.max(0,y),1)+'</b> m³ C4 ('+_fmt(Math.max(0,y)*MC_D.c4l,1)+' t)<br>→ '+_fmt(M,0)+' m³ @ '+(t*100).toFixed(1)+'% ✓'
        : '<span class="spp-er">✗ not reachable (leftover too large)</span>';
      return '<tr><td>'+label+'</td>'+_td(_fmt(sold,1)+' m³ / '+_fmt(soldT,1)+' t')
           + _td('<b>'+_fmt(Vr,1)+'</b> m³ @ '+(s*100).toFixed(0)+'%')
           + _td(optA) + _td(optB) + '</tr>';
    };
    let h = '';
    /* v4.81 — nhắc rõ 570 là mức thường ngày, 585 mới là ngưỡng cảnh báo */
    if(M > MC_WARN + 1e-9){
      h += '<div class="spp-warn-band">🚨 MỨC MIX NHẮM TỚI '+_fmt(M,1)+' m³ ĐANG TRÊN NGƯỠNG CẢNH BÁO '+_fmt(MC_WARN,0)+' m³ — rủi ro cao. '
         + 'Mức mix thường ngày là '+_fmt(MC_TARGET,0)+' m³ (trần quy định 90% = '+_fmt(_mcHardCap(),1)+' m³).</div>';
    }
    h += '<div class="spp-sum">'
       + '<div class="spp-sum-main">🎯 MAX SAFE MIX <b>'+_fmt(V0,1)+'</b> m³ <span class="spp-sum-sub">≈ '+_fmt(V0*rho,1)+' t @ C3 '+(s*100).toFixed(0)+'%</span></div>'
       + '<div class="spp-sum-note">Limited by: '+binding+' · '
       + (circOn ? '🔁 tính CÓ tuần hoàn đường ống ('+_fmt(Vp,0)+' m³)' : '🚫 tính KHÔNG tuần hoàn')+'</div>'
       + (V0 >= Vs-0.05
           ? '<div class="spp-sum-ok">✓ Covers the full sale plan ('+_fmt(sellT,1)+' t = '+_fmt(Vs,1)+' m³)</div>'
           : '<div class="spp-sum-er">⚠ Covers only '+_fmt(V0,1)+' m³ ≈ '+_fmt(V0*rho,1)+' t — reserves are limiting the plan</div>')
       + '</div>';
    h += '<div class="spp-facts">'
       + '<span>Special product density: <b>'+rho.toFixed(3)+'</b> t/m³</span>'
       + '<span>Recovery factor: <b>'+k.toFixed(3)+'×</b> (pump '+comp+' → '+(t*100).toFixed(1)+'%)</span>'
       + '<span>Max recoverable leftover: <b>'+_fmt(VrMax,1)+'</b> m³</span>'
       + (circOn
           ? '<span>🔁 Pipe circulation <b>ON</b> · '+_fmt(Vp,0)+' m³ @ '+(s*100).toFixed(0)+'% also corrected'
             + (pipeCost > 0.05 ? ' → costs <b>'+_fmt(pipeCost,1)+'</b> m³ of tank headroom' : '')+'</span>'
           : '<span style="color:#b45309">🚫 Pipe circulation <b>OFF</b> — in-tank product only</span>')
       + (Vfail>0 ? '<span>Mix-fail headroom: <b>'+_fmt(Vfail,1)+'</b> m³ ('+_fmt(failT,0)+' t as C3, worst case)</span>' : '')
       + '</div>';
    h += '<table class="spp-tbl"><thead><tr>'
       + '<th>SCENARIO</th><th>SOLD</th><th>LEFTOVER</th>'
       + '<th>OPTION A · pump '+comp+' only</th>'
       + '<th>OPTION B · top-up to '+_fmt(M,0)+' m³ (C3 + C4)</th>'
       + '</tr></thead><tbody>';
    h += _scen('Full plan sold', Vs, sellT);
    if(Vrsv > 0.05) h += _scen('Worst case — cancel reserve NOT sold', VsMin, VsMin*rho);
    h += '</tbody></table>';
    h += '<div class="spp-foot-note">Volume-phase model (vapor ignored) — planning accuracy. Option B lands EXACTLY on tank max at the normal ratio; use it when reserves leave the C3-only recovery far below '+_fmt(M,0)+' m³.'
       + (circOn
           ? ' Có tuần hoàn: '+_fmt(Vp,0)+' m³ hàng trong đường ống cũng mang tỉ lệ '+(s*100).toFixed(0)+'% nên được tính vào phần phải đưa về '+(t*100).toFixed(1)+'% — vì vậy MAX SAFE MIX nhỏ hơn so với khi bỏ tick.'
           : ' Bỏ tick tuần hoàn: chỉ chỉnh phần hàng nằm TRONG BỒN — nếu thực tế vẫn chạy tuần hoàn thì số này LẠC QUAN hơn thực tế.')
       + '</div>';
    res.innerHTML = h;
    /* v4.101 — LÀM TRÒN XUỐNG 0,1 m³. Làm tròn lên (toFixed) khiến TARGET VOL
       nhỉnh hơn số tính đúng, và sai số đó được KHUẾCH ĐẠI lên k lần ở bước
       hồi phục → phương án bơm thêm vượt mức nhắm tới vài chục lít. Thà thiếu
       một hào còn hơn thừa. */
    res.dataset.v0 = (Math.floor(V0*10)/10).toFixed(1);
  }
  function spPlanApply(){
    const n = _sppTank;
    const res = _gid('spp-res');
    let   v0  = res ? parseFloat(res.dataset.v0) : NaN;
    if(!n || isNaN(v0) || v0<=0){ toast('⚠ Enter the sale plan first','er'); return; }
    /* v4.81 — chỉ kẹp ở TRẦN QUY ĐỊNH 90% dung tích; trên 585 chỉ cảnh báo */
    const cap = _mcHardCap(), warn = _mcWarnLvl();
    if(v0 > cap + 1e-9){
      toast('⛔ PLAN ra '+v0.toFixed(1)+' m³ > trần quy định 90% ('+_fmt(cap,1)+' m³) — đã kẹp về '+_fmt(cap,1)+' m³','er');
      v0 = cap;
    } else if(v0 > warn + 1e-9){
      toast('🚨 PLAN ra '+v0.toFixed(1)+' m³ — TRÊN ngưỡng cảnh báo '+_fmt(warn,0)+' m³, rủi ro cao (trần 90% = '+_fmt(cap,1)+' m³)','warn');
    }
    const tvEl = _gid('mc-tv'+n);
    if(tvEl){ tvEl.value = v0.toFixed(1); }
    /* v4.78 — gắn TARGET VOL vừa lấy với %C3 mục tiêu hiện hành */
    _planLinkSet(n, v0);
    /* v4.79 — ghi nhật ký PLAN (không lưu lại số liệu để điền sẵn lần sau) */
    /* v4.101 — ghi rõ mẻ này được lên plan CÓ hay KHÔNG tuần hoàn đường ống */
    const circOn = !!(_gid('spp-circ') && _gid('spp-circ').checked);
    const vpPlan = circOn ? (_gnum('spp-vpipe') || MC_VPIPE_DEF) : 0;
    _mlog('PLAN', n, 'V0='+v0.toFixed(1)+' m³ · C3='+_gnum('mc-tr'+n).toFixed(2)+'% · bán='+_gv('spp-sell')
                    +'t · dp hủy='+_gv('spp-resv')+'t · dp hỏng='+_gv('spp-fail')+'t · mức nhắm='+_gv('spp-max')
                    +' · tuần hoàn='+(circOn ? 'CÓ (pipe '+_fmt(vpPlan,0)+' m³)' : 'KHÔNG'));
    toast('🎯 TARGET VOL = '+v0.toFixed(1)+' m³ (max safe mix, '
          +(circOn ? '🔁 có tuần hoàn '+_fmt(vpPlan,0)+' m³' : '🚫 không tuần hoàn')
          +') — đã gắn với TARGET C3 '+_gnum('mc-tr'+n).toFixed(2)+'%','ok');
    /* Cảnh báo khi lựa chọn trong PLAN không khớp cách panel đang tính. Planner
       KHÔNG tự sửa panel — chỉ nhắc để kỹ sư tự chỉnh cho khớp. */
    const panelVp = FILL[n] ? (FILL_CIRC[n] ? _gnum('mc-fcpipe'+n) : 0)
                  : (SP[n] ? _gnum('mc-spvpipe'+n) : 0);
    const panelCirc = panelVp > 0;
    if(panelCirc !== circOn){
      setTimeout(()=>toast('⚠ PLAN tính '+(circOn?'CÓ':'KHÔNG')+' tuần hoàn, nhưng panel đang '
        +(panelCirc?'CÓ tuần hoàn (pipe '+_fmt(panelVp,0)+' m³)':'KHÔNG bật tuần hoàn')
        +' — kiểm tra lại cho khớp','warn'), 700);
    } else if(circOn && Math.abs(panelVp - vpPlan) > 0.05){
      setTimeout(()=>toast('⚠ PLAN dùng pipe '+_fmt(vpPlan,0)+' m³ nhưng panel đang để '
        +_fmt(panelVp,0)+' m³ — kiểm tra lại cho khớp','warn'), 700);
    }
    spPlanClose();
    autoCalc(n);
  }

  /* ── v4.78 — RÀNG BUỘC TARGET VOL (từ PLAN) ↔ TARGET C3 % ───────────
     _planLinkSet   : ghi nhận liên kết + tô ô TARGET VOL màu xanh.
     _planLinkClear : bỏ liên kết + trả ô về bình thường.
     _planLinkCheck : gọi trong autoCalc — nếu %C3 (hoặc mode mix) đổi so
                      với lúc lấy PLAN thì BÁO + XÓA TARGET VOL cũ. */
  function _planLinkSet(n, v0){
    PLAN_LINK[n] = {
      v0: +(+v0).toFixed(1),
      tr: _gnum('mc-tr'+n),
      sp: !!SP[n],
      vp: _gnum('mc-spvpipe'+n),
      fill: FILL[n]
    };
    _planLinkPaint(n);
  }
  function _planLinkClear(n){
    PLAN_LINK[n] = null;
    _planLinkPaint(n);
  }
  function _planLinkPaint(n){
    const el = _gid('mc-tv'+n); if(!el) return;
    const L = PLAN_LINK[n];
    if(L){
      el.classList.add('mc-tv-planned');
      el.title = '📋 TARGET VOL lấy từ PLAN theo TARGET C3 = '+L.tr.toFixed(2)+'% '
               + '(pipe '+_fmt(L.vp,1)+' m³). Đổi TARGET C3 % → số này sẽ bị xóa, phải chạy lại PLAN.';
    } else {
      el.classList.remove('mc-tv-planned');
      if(!el.readOnly) el.title = '';
    }
  }
  /* Trả về true nếu vừa xóa TARGET VOL (caller nên dừng vòng tính) */
  function _planLinkCheck(n){
    const L = PLAN_LINK[n]; if(!L) return false;
    const tk  = n==='1' ? '3501' : '3502';
    const el  = _gid('mc-tv'+n); if(!el) return false;
    const cur = parseFloat(String(el.value||'').replace(/,/g,''));
    /* Nhân viên tự sửa TARGET VOL bằng tay → không còn là số của PLAN nữa */
    if(isNaN(cur) || Math.abs(cur - L.v0) > 0.05){ _planLinkClear(n); return false; }
    const trNow = _gnum('mc-tr'+n);
    const vpNow = _gnum('mc-spvpipe'+n);
    const changed =
      (Math.abs(trNow - L.tr) > 0.005) ||
      (SP[n] !== L.sp) ||
      (FILL[n] !== L.fill) ||
      (SP[n] && Math.abs(vpNow - L.vp) > 0.05);
    if(!changed) return false;
    const why = (Math.abs(trNow - L.tr) > 0.005)
      ? 'TARGET C3 % đã đổi '+L.tr.toFixed(2)+'% → '+trNow.toFixed(2)+'%'
      : (SP[n] && Math.abs(vpNow - L.vp) > 0.05)
        ? 'thể tích pipe đã đổi '+_fmt(L.vp,1)+' → '+_fmt(vpNow,1)+' m³'
        : 'chế độ mix đã đổi';
    _planLinkClear(n);
    el.value = '';
    const resEl = _gid('mc-r'+n); if(resEl) resEl.classList.remove('on');
    const gcRes = _gid('mc-gcres'+n); if(gcRes) gcRes.classList.remove('on');
    OVER_WARN[n] = false; OVER_HARD[n] = false; _overAsked[n] = null;
    toast('🧹 TK-'+tk+': '+why+' — TARGET VOL cũ ('+L.v0.toFixed(1)+' m³) đã bị XÓA. Bấm 📋 PLAN để lấy TARGET VOL mới.','er');
    try{
      alert('TK-'+tk+' — TARGET VOL KHÔNG CÒN HỢP LỆ\n\n'
        + why + '.\n\n'
        + 'TARGET VOL '+L.v0.toFixed(1)+' m³ trước đó được PLAN tính theo TARGET C3 = '+L.tr.toFixed(2)+'%,\n'
        + 'nên nó KHÔNG còn đúng với tỉ lệ mới.\n\n'
        + '→ Phần mềm đã xóa TARGET VOL cũ.\n'
        + '→ Bấm 📋 PLAN để lấy TARGET VOL mới, hoặc tự nhập TARGET VOL bằng tay.');
    }catch(_){}
    return true;
  }

  /* v4.67 — SPECIAL RATIO toggle (exclusive with LOW PRESSURE)
     v4.77 — also exclusive with FILL C3/C4 ONLY */
  async function toggleSP(n){
    /* ── v4.79 (R9) — Ô "TARGET C3 %" ĐỔI NGHĨA khi bật/tắt SPECIAL RATIO
       • TẮT SP: số nhập = tỉ lệ C3 PHA TRONG BỒN
       • BẬT SP: số nhập = tỉ lệ C3 CUỐI CÙNG **sau khi tuần hoàn ống**
       Cùng một con số nhưng hai ý nghĩa khác nhau → phải nhập lại, không
       được để nguyên số cũ. */
    const tk = n==='1' ? '3501' : '3502';
    const trEl = _gid('mc-tr'+n);
    const hadVal = trEl && String(trEl.value||'').trim() !== '';
    if(hadVal){
      const toOn = !SP[n];
      let ok = true;
      try{
        ok = await UIDLG.ask('TK-'+tk+' — '+(toOn ? 'BẬT' : 'TẮT')+' ★ MIX TỈ LỆ ĐẶC BIỆT\n\n'
          + 'Ô TARGET C3 % sẽ ĐỔI Ý NGHĨA:\n'
          + (toOn
              ? '  • Trước: tỉ lệ C3 pha TRONG BỒN\n  • Sau  : tỉ lệ C3 CUỐI CÙNG (sau khi tuần hoàn ống)\n'
              : '  • Trước: tỉ lệ C3 CUỐI CÙNG (sau khi tuần hoàn ống)\n  • Sau  : tỉ lệ C3 pha TRONG BỒN\n')
          + '\nSố đang có ('+trEl.value+'%) KHÔNG còn đúng nghĩa nữa nên sẽ bị xóa\n'
          + 'để anh/chị nhập lại cho đúng.\n\nOK = đổi chế độ và xóa  ·  Cancel = giữ nguyên');
      }catch(_){ ok = true; }
      if(!ok){ toast('Giữ nguyên chế độ mix','warn'); return; }
      trEl.value = '';
      _planLinkClear(n);
      const tvEl0 = _gid('mc-tv'+n); if(tvEl0 && !tvEl0.readOnly) { /* giữ TARGET VOL nhập tay */ }
      _gid('mc-r'+n)?.classList.remove('on');
      _gid('mc-gcres'+n)?.classList.remove('on');
      CALC_SIG[n] = null;
    }
    SP[n] = !SP[n];
    if(SP[n] && LP[n]){ LP[n] = false; _gid('mc-lp'+n)?.classList.remove('on'); _gid('mc-lp-box'+n)?.classList.remove('on'); }
    if(SP[n] && FILL[n]){ _setFill(n, null); }   /* v4.77: mode exclusivity */
    _gid('mc-sp'+n)?.classList.toggle('on', SP[n]);
    _gid('mc-sp-box'+n)?.classList.toggle('on', SP[n]);
    _updateTrLabel(n);
    if(SP[n]) toast('★ TK-'+tk+': MIX TỈ LỆ ĐẶC BIỆT — nhập TARGET C3 % là tỉ lệ CUỐI CÙNG sau tuần hoàn ống','warn');
    else if(hadVal) toast('TK-'+tk+': đã tắt MIX TỈ LỆ ĐẶC BIỆT — nhập lại TARGET C3 % (tỉ lệ pha trong bồn)','warn');
    if(hadVal && trEl) trEl.focus?.();
    autoCalc(n);
  }
  function togglePC(n){
    PC[n] = !PC[n];
    if(PC[n] && LP[n]){ LP[n] = false; _gid('mc-lp'+n)?.classList.remove('on'); _gid('mc-lp-box'+n)?.classList.remove('on'); }
    if(PC[n] && FILL[n]){ _setFill(n, null); }   /* v4.72: RECEIVE C3 loại trừ CHỈ BƠM */
    _gid('mc-pc'+n)?.classList.toggle('on', PC[n]);
    _gid('mc-pc-box'+n)?.classList.toggle('on', PC[n]);
    autoCalc(n);
  }

  /* ── v4.72/v4.77 — FILL C3 ONLY / FILL C4 ONLY ────────────────────
     Mode NGANG HÀNG và LOẠI TRỪ với LOW PRESSURE / SPECIAL RATIO /
     RECEIVE C3 (chỉ chọn được 1 kiểu mix — hết trùng lặp tuần hoàn).
     Nhập INIT VOL + %C3 hiện tại + TARGET C3 % — TARGET VOL TỰ TÍNH.
     Tự có tuần hoàn riêng (mặc định BẬT, pipe tỉ lệ cũ):
       C4-only: tvEff = (iC3 + crC3·Vp)/s − Vp   (không circ: iC3/tr)
       C3-only: tvEff = (iC4 + Vp·(s−crC3))/(1−s) (không circ: iC4/(1−tr)) */
  function _setFill(n, kind){
    FILL[n] = kind;
    _gid('mc-fc3'+n)?.classList.toggle('on', kind === 'C3');
    _gid('mc-fc4'+n)?.classList.toggle('on', kind === 'C4');
    /* v4.74 — sub-box tuần hoàn về trạm (chỉ hiện khi bật CHỈ BƠM) */
    _gid('mc-fc-box'+n)?.classList.toggle('on', !!kind);
    const ck = _gid('mc-fccirc'+n); if(ck) ck.checked = FILL_CIRC[n];
    const tvEl = _gid('mc-tv'+n);
    if(tvEl){
      tvEl.readOnly = !!kind;
      tvEl.style.background = kind ? '#f0fdf4' : '';
      tvEl.title = kind ? 'TARGET VOL auto-calculated (FILL '+kind+' ONLY mode)' : '';
      if(kind) tvEl.placeholder = 'AUTO';
    }
    _updateTrLabel(n);   /* v4.77: label theo mode FILL */
  }
  /* v4.74 — checkbox tuần hoàn về trạm thay đổi */
  function fillCircChange(n){
    const ck = _gid('mc-fccirc'+n);
    FILL_CIRC[n] = ck ? !!ck.checked : true;
    _updateTrLabel(n);   /* v4.77 */
    toast(FILL_CIRC[n]
      ? '🔁 TK-'+(n==='1'?'3501':'3502')+': fill WITH pipe circulation (old ratio in pipeline)'
      : 'TK-'+(n==='1'?'3501':'3502')+': fill WITHOUT circulation — target reached in-tank','warn');
    autoCalc(n);
  }
  function toggleFill(n, kind){
    const next = FILL[n] === kind ? null : kind;
    /* v4.77 — FILL is a peer mix mode: turning it on turns OFF every other mode */
    if(next){
      if(PC[n]){ PC[n] = false; _gid('mc-pc'+n)?.classList.remove('on'); _gid('mc-pc-box'+n)?.classList.remove('on'); }
      if(LP[n]){ LP[n] = false; _gid('mc-lp'+n)?.classList.remove('on'); _gid('mc-lp-box'+n)?.classList.remove('on'); }
      if(SP[n]){ SP[n] = false; _gid('mc-sp'+n)?.classList.remove('on'); _gid('mc-sp-box'+n)?.classList.remove('on'); _updateTrLabel(n); }
    }
    _setFill(n, next);
    if(next) toast('⬆ TK-'+(n==='1'?'3501':'3502')+': FILL '+next+' ONLY — enter INIT VOL + TARGET C3 %, TARGET VOL will be auto-calculated','warn');
    else toast('TK-'+(n==='1'?'3501':'3502')+': single-product fill mode OFF','ok');
    autoCalc(n);
  }

  /* ---------- main mass-balance calc (RAM) ---------- */
  /* v4.219 — các ô BẮT BUỘC để tính STOP C3 / STOP C4 (cùng điều kiện với _calcOne) */
  function _calcMissing(n){
    const M = [];
    if(!(_gnum('mc-iv'+n) > 0)) M.push(['INIT VOL (m³)', 'mc-iv'+n, 'LPG volume already in the tank (heel) before mixing']);
    if(!FILL[n] && !(_gnum('mc-tv'+n) > 0)) M.push(['TARGET VOL (m³)', 'mc-tv'+n, 'final volume after mixing']);
    if(!(_gnum('mc-tr'+n) > 0)) M.push(['TARGET C3 %', 'mc-tr'+n, 'C3 %vol wanted at the end']);
    if(!(_gnum('mc-cr'+n) > 0)) M.push(['CURRENT C3 %', 'mc-cr'+n, 'C3 %vol of the heel (AUTO from the previous lot, or MANUAL)']);
    return M;
  }
  function _calcOne(n){
    const tk = n==='1' ? '3501' : '3502';
    const iv = _gnum('mc-iv'+n);
    const tv = _gnum('mc-tv'+n);
    let   trC3 = _gnum('mc-tr'+n) / 100;
    const crC3 = _gnum('mc-cr'+n) / 100;
    const resEl = _gid('mc-r'+n);
    if(!resEl) return;
    OVER_WARN[n] = false; OVER_HARD[n] = false;   /* v4.81 — reset cờ mỗi lần tính */
    CALC_SIG[n] = null;    /* v4.79 — chỉ ghi lại khi tính THÀNH CÔNG */
    _gid('mc-tv'+n)?.classList.remove('mc-tv-over');
    resEl.classList.remove('mc-res-over');
    const fm = FILL[n];   /* v4.72: 'C3' | 'C4' | null — TARGET VOL tự tính khi bật */
    if(!(iv > 0) || (!fm && !(tv > 0)) || !(trC3 > 0) || !(crC3 > 0)){
      if(!_calcSilent) toast('⚠ TK-'+tk+': fill '+_calcMissing(n).map(x => x[0]).join(', ')+(fm ? ' (TARGET VOL is auto)' : ''),'er');
      resEl.classList.remove('on');
      return;
    }
    /* v4.67 — SPECIAL RATIO: user input = desired FINAL C3 after the pipe
       volume mixes back in. Back-solve the in-tank blend target and use it
       for every volume below. spDesired stays for display. */
    let spDesired = 0, spVPipe = 0;
    if(SP[n]){
      spVPipe = _gnum('mc-spvpipe'+n);
      if(spVPipe > 0){
        spDesired = trC3;
        /* v4.72: ở chế độ CHỈ BƠM, tv chưa biết — bỏ back-solve theo tv,
           nhánh FILL bên dưới tự giải tvEff rồi cập nhật blend target. */
        if(!fm){
          const trEff = (spDesired*(tv + spVPipe) - crC3*spVPipe) / tv;
          const trEl = _gid('mc-sptr'+n);
          /* v4.71 — trEff ra ngoài 0–100% KHÔNG còn là lỗi chết: nghĩa là với
             TARGET VOL cố định thì bất khả thi, nhưng dòng 1 chiều bên dưới sẽ
             giải lại thể tích (chỉ bơm 1 sản phẩm). Cứ gán trC3 = trEff và để
             khối one-way xử lý số âm. */
          if(trEl) trEl.value = (trEff*100).toFixed(2);
          trC3 = trEff;
        }
      }
      /* v4.69 — keep the planner modal in sync with the FINAL TARGET input */
      try{
        if(_sppTank===n && _gid('spp-modal')?.classList.contains('on')){
          const se=_gid('spp-special'); if(se) se.value=(spDesired*100).toFixed(2);
          spPlanCalc();
        }
      }catch(_){}
    }
    const iC3 = crC3*iv, iC4 = (1-crC3)*iv;
    let aC3 = trC3*tv - iC3;
    let aC4 = (1-trC3)*tv - iC4;

    /* ══ v4.71 — ONE-WAY FLOW Cavern → TK-3501/TK-3502 ══════════
       Không thể rút C3/C4 ngược về hầm. Nếu mass-balance ra số ÂM
       (vd: đang 53.9% C3 muốn về FINAL 24% → phải "rút" C3), thì:
         • kẹp thành phần âm = 0 (chỉ bơm sản phẩm còn lại),
         • TARGET VOL không giữ được — GIẢI LẠI thể tích cuối tvEff
           sao cho FINAL C3 (sau tuần hoàn ống nếu SPECIAL RATIO)
           đúng bằng số đã nhập.
       C4-only : tvEff = (iC3 + crC3·Vp)/s − Vp   (không SP: iC3/tr)
       C3-only : tvEff = (iC4 + Vp·(s − crC3))/(1−s) (không SP: iC4/(1−tr)) */
    let tvEff = tv, owHTML = '';
    /* v4.75 — sản phẩm KHÔNG bơm (fill = 0) sẽ bị làm mờ trong kết quả */
    let owDim = null;   /* 'C3' | 'C4' | null */
    /* v4.77 — fill-mode FINAL/blend cho header (khi có tuần hoàn riêng) */
    let fmFin = null, fmVp = 0;
    /* ══ v4.72/v4.77 — FILL C3 ONLY / FILL C4 ONLY (TARGET VOL auto) ═══
       Mode NGANG HÀNG, loại trừ LOW PRESSURE / SPECIAL RATIO / RECEIVE C3
       → chỉ còn MỘT tuyến pipe tuần hoàn duy nhất (mc-fcpipe, checkbox
       Circulate back mặc định BẬT, pipe chứa hàng tỉ lệ cũ crC3).
       Target C3 % nhập = FINAL sau tuần hoàn (nếu circ bật). */
    if(fm){
      const sFin  = trC3;                    /* SP không thể bật cùng — input là final */
      const onlyC4 = (fm === 'C4');
      const vpF = FILL_CIRC[n] ? (_gnum('mc-fcpipe'+n) || 0) : 0;
      fmFin = sFin; fmVp = vpF;
      if(onlyC4){
        tvEff = vpF > 0
          ? (iC3 + crC3*vpF) / sFin - vpF
          : iC3 / sFin;
        aC3 = 0; aC4 = tvEff - iv;
      } else {
        tvEff = vpF > 0
          ? (iC4 + vpF*(sFin - crC3)) / (1 - sFin)
          : iC4 / (1 - sFin);
        aC4 = 0; aC3 = tvEff - iv;
      }
      if(!(tvEff > 0) || tvEff < iv - 1e-9 || aC3 < -1e-9 || aC4 < -1e-9){
        if(!_calcSilent) toast('⚠ TK-'+tk+': FILL '+fm+' ONLY cannot reach C3 '+(sFin*100).toFixed(1)+'% from current '+(crC3*100).toFixed(1)+'% — to '+(onlyC4?'RAISE':'LOWER')+' %C3 use FILL '+(onlyC4?'C3':'C4')+' ONLY','er');
        resEl.classList.remove('on');
        return;
      }
      if(tvEff > MC_TV){
        if(!_calcSilent) toast('⚠ TK-'+tk+': needs '+_fmt(tvEff,1)+' m³ to reach C3 '+(sFin*100).toFixed(1)+'% — EXCEEDS tank capacity '+_fmt(MC_TV,0)+' m³. Split into batches or export first.','er');
        resEl.classList.remove('on');
        return;
      }
      if(aC3 < 1e-9 && aC4 < 1e-9){
        if(!_calcSilent) toast('ℹ TK-'+tk+': already at '+(sFin*100).toFixed(1)+'% C3 — nothing to pump','warn');
      }
      aC3 = Math.max(0, aC3); aC4 = Math.max(0, aC4);
      owDim = onlyC4 ? 'C3' : 'C4';   /* v4.75: mờ sản phẩm không bơm */
      /* tự điền TARGET VOL; trC3 = blend thực trong tank (trước tuần hoàn) */
      const tvEl = _gid('mc-tv'+n); if(tvEl) tvEl.value = tvEff.toFixed(1);
      trC3 = (iC3 + aC3) / tvEff;
      const fCol = onlyC4 ? '#c2410c' : '#1d4ed8';
      const fBg  = onlyC4 ? '#fff7ed' : '#eff6ff';
      const fBd  = onlyC4 ? '#fdba74' : '#93c5fd';
      const fBg2 = onlyC4 ? '#ffedd5' : '#dbeafe';
      owHTML = '<div style="margin-top:4px;padding:4px 10px;background:'+fBg+';border:1.5px solid '+fBd+';border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<span style="font-family:Oswald;font-size:10px;letter-spacing:1px;color:'+fCol+';font-weight:700">⬆ FILL '+fm+' ONLY (one-way flow Cavern → TK-3501/TK-3502)</span>'+
        (vpF > 0
          ? '<span style="font-size:10px;color:'+fCol+'">🔁 Circulate back · Pipe '+_fmt(vpF,1)+' m³ · prev C3 '+_fmt(crC3*100,1)+'%</span>'
          : '<span style="font-size:10px;color:'+fCol+'">No circulation — target reached in-tank</span>')+
        '<span style="padding:2px 8px;border-radius:4px;background:'+fBg2+';color:'+fCol+';font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">PUMP '+fm+' <span style="font-family:monospace;font-size:14px">'+_fmt(onlyC4?aC4:aC3,1)+' m³</span></span>'+
        '<span style="padding:2px 8px;border-radius:4px;background:'+fBg2+';color:'+fCol+';font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">TARGET VOL (AUTO) <span style="font-family:monospace;font-size:14px">'+_fmt(tvEff,1)+' m³</span></span>'+
        (vpF > 0
          ? '<span style="padding:2px 8px;border-radius:4px;background:#fef3c7;color:#92400e;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">🎯 BLEND IN TANK <span style="font-family:monospace;font-size:14px">'+(( (iC3+aC3)/tvEff )*100).toFixed(2)+'%</span> → AFTER CIRCULATE <span style="font-family:monospace;font-size:14px">'+(sFin*100).toFixed(2)+'%</span></span>'
          : '')+
      '</div>';
    }
    else if(aC3 < -1e-9 || aC4 < -1e-9){
      const sFin  = (SP[n] && spVPipe > 0) ? spDesired : trC3;  /* mục tiêu C3 cuối */
      const onlyC4 = aC3 < 0;
      if(onlyC4){
        tvEff = (SP[n] && spVPipe > 0)
          ? (iC3 + crC3*spVPipe) / sFin - spVPipe
          : iC3 / sFin;
        aC3 = 0; aC4 = tvEff - iv;
      } else {
        tvEff = (SP[n] && spVPipe > 0)
          ? (iC4 + spVPipe*(sFin - crC3)) / (1 - sFin)
          : iC4 / (1 - sFin);
        aC4 = 0; aC3 = tvEff - iv;
      }
      if(!(tvEff > 0) || aC3 < -1e-9 || aC4 < -1e-9 || tvEff < iv - 1e-9){
        if(!_calcSilent) toast('⚠ TK-'+tk+': FINAL C3 '+(sFin*100).toFixed(1)+'% cannot be reached by filling only (one-way flow — no return to Cavern)','er');
        resEl.classList.remove('on');
        return;
      }
      if(tvEff > MC_TV){
        if(!_calcSilent) toast('⚠ TK-'+tk+': needs '+_fmt(tvEff,1)+' m³ to reach C3 '+(sFin*100).toFixed(1)+'% ('+(onlyC4?'C4':'C3')+' only) — EXCEEDS tank capacity '+_fmt(MC_TV,0)+' m³. Split into batches or export first.','er');
        resEl.classList.remove('on');
        return;
      }
      aC3 = Math.max(0, aC3); aC4 = Math.max(0, aC4);
      owDim = onlyC4 ? 'C3' : 'C4';   /* v4.75: mờ sản phẩm không bơm */
      /* blend target thực trong tank (trước tuần hoàn) sau khi kẹp */
      trC3 = (iC3 + aC3) / tvEff;
      const trEl2 = _gid('mc-sptr'+n);
      if(trEl2 && SP[n] && spVPipe > 0) trEl2.value = (trC3*100).toFixed(2);
      owHTML = '<div style="margin-top:4px;padding:4px 10px;background:#fff7ed;border:1.5px solid #fdba74;border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<span style="font-family:Oswald;font-size:10px;letter-spacing:1px;color:#c2410c;font-weight:700">⇧ ONE-WAY FLOW Cavern → TK-3501/TK-3502</span>'+
        '<span style="font-size:10px;color:#9a3412">Cannot return '+(onlyC4?'C3':'C4')+' to Cavern — pump '+(onlyC4?'C4':'C3')+' only</span>'+
        '<span style="padding:2px 8px;border-radius:4px;background:#ffedd5;color:#c2410c;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">FINAL VOLUME <span style="font-family:monospace;font-size:14px">'+_fmt(tvEff,1)+' m³</span> (TARGET VOL '+_fmt(tv,0)+' m³ not feasible at C3 '+(sFin*100).toFixed(1)+'%)</span>'+
      '</div>';
    }
    /* ══ v4.81 — HAI NGƯỠNG: 585 m³ CẢNH BÁO · 90% DUNG TÍCH LÀ TRẦN ══
       KHÔNG chặn ở 585 (đôi khi cần bơm thêm để chỉnh tỉ lệ), chỉ cảnh
       báo + bắt xác nhận. Chỉ chặn ▶START khi vượt trần quy định 90%. */
    const WARN = _mcWarnLvl();          // 585 m³
    const CAP  = _mcHardCap();          // 90% dung tích → 627.2 m³
    OVER_WARN[n] = tvEff > WARN + 1e-9;
    OVER_HARD[n] = tvEff > CAP  + 1e-9;
    /* ô TARGET VOL đổi màu đỏ + NHẤP NHÁY để nhận biết ngay */
    _gid('mc-tv'+n)?.classList.toggle('mc-tv-over', OVER_WARN[n]);
    resEl.classList.toggle('mc-res-over', OVER_WARN[n]);
    if(OVER_WARN[n]){
      const overBy = tvEff - WARN;
      const room   = CAP - tvEff;       // còn cách trần quy định bao nhiêu
      const hard   = OVER_HARD[n];
      owHTML += '<div style="margin-top:4px;padding:5px 10px;background:#fef2f2;border:2px solid #dc2626;border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<span style="font-family:Oswald;font-size:11px;letter-spacing:1px;color:#dc2626;font-weight:800">'
          + (hard ? '⛔ VƯỢT TRẦN QUY ĐỊNH 90% DUNG TÍCH' : '🚨 VÙNG RỦI RO CAO — TRÊN '+_fmt(WARN,0)+' m³')+'</span>'+
        '<span style="padding:2px 8px;border-radius:4px;background:#fee2e2;color:#b91c1c;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">FINAL VOLUME <span style="font-family:monospace;font-size:14px">'+_fmt(tvEff,1)+' m³</span> &gt; <span style="font-family:monospace;font-size:14px">'+_fmt(WARN,0)+' m³</span> (+'+_fmt(overBy,1)+')</span>'+
        (hard
          ? '<span style="padding:2px 8px;border-radius:4px;background:#7f1d1d;color:#fff;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">TRẦN 90% = <span style="font-family:monospace;font-size:14px">'+_fmt(CAP,1)+' m³</span></span>'+
            '<span style="font-size:10px;color:#7f1d1d;font-weight:700">KHÔNG được ▶START MIX — bắt buộc hạ xuống dưới '+_fmt(CAP,1)+' m³</span>'
          : '<span style="padding:2px 8px;border-radius:4px;background:#fef3c7;color:#92400e;font-family:Oswald;letter-spacing:1px;font-weight:700;font-size:11px">CÒN CÁCH TRẦN 90% <span style="font-family:monospace;font-size:14px">'+_fmt(room,1)+' m³</span> (trần '+_fmt(CAP,1)+')</span>'+
            '<span style="font-size:10px;color:#b91c1c;font-weight:600">Vẫn nạp được, nhưng ▶START MIX sẽ phải XÁC NHẬN THÊM LẦN NỮA và ghi nhật ký</span>')+
      '</div>';
      if(!_calcSilent){
        toast(hard
          ? '⛔ TK-'+tk+': '+_fmt(tvEff,1)+' m³ VƯỢT TRẦN QUY ĐỊNH 90% ('+_fmt(CAP,1)+' m³) — không thể START'
          : '🚨 TK-'+tk+': '+_fmt(tvEff,1)+' m³ TRÊN ngưỡng cảnh báo '+_fmt(WARN,0)+' m³ — rủi ro cao','er');
        /* confirm() chỉ hỏi 1 lần cho mỗi con số, tránh phiền khi tính lại */
        const key = _fmt(tvEff,1)+'|'+_fmt(WARN,0);
        if(_overAsked[n] !== key){
          _overAsked[n] = key;
          const autoTv = !fm;   /* chế độ CHỈ BƠM: TARGET VOL tự tính, không sửa được */
          try{
            /* v4.215 — hộp của app (không chặn luồng): trả lời xong mới xử lý */
            UIDLG.ask(
              (hard ? '⛔ TK-'+tk+' — VƯỢT TRẦN QUY ĐỊNH 90% DUNG TÍCH'
                    : '🚨 TK-'+tk+' — VÙNG RỦI RO CAO (trên '+_fmt(WARN,0)+' m³)')+'\n\n'
              + 'Thể tích cuối tính ra    : '+_fmt(tvEff,1)+' m³\n'
              + 'Ngưỡng cảnh báo          : '+_fmt(WARN,0)+' m³   (trên mức này = rủi ro cao)\n'
              + 'Trần quy định (90% bồn)  : '+_fmt(CAP,1)+' m³\n'
              + (hard ? 'VƯỢT TRẦN               : '+_fmt(tvEff-CAP,1)+' m³\n'
                      : 'Còn cách trần            : '+_fmt(room,1)+' m³\n')
              + '\n'
              + (hard
                  ? '⛔ KHÔNG được phép nạp quá 90% dung tích bồn.\n'
                    + (autoTv ? 'Bấm OK để phần mềm hạ TARGET VOL về '+_fmt(CAP,1)+' m³ và tính lại.\nBấm Cancel để tự điều chỉnh bằng tay.'
                              : 'Ở chế độ CHỈ BƠM 1 SẢN PHẨM, TARGET VOL do phần mềm tự tính từ\nTARGET C3 %. Phải đổi TARGET C3 % hoặc xuất bớt hàng trước.')
                    + '\n\n▶START MIX sẽ BỊ CHẶN cho tới khi xuống dưới '+_fmt(CAP,1)+' m³.'
                  : 'Mức này VẪN NẠP ĐƯỢC (quy định cho phép tới 90% dung tích),\nnhưng trên '+_fmt(WARN,0)+' m³ là RỦI RO CAO.\n\n'
                    + 'Phần mềm KHÔNG tự sửa số của anh/chị.\n'
                    + '[OK] / [Cancel] đều giữ nguyên '+_fmt(tvEff,1)+' m³ — muốn hạ thì tự sửa\nTARGET VOL rồi tính lại.\n\n'
                    + '⚠ Khi bấm ▶START MIX sẽ phải xác nhận thêm một lần nữa\n   và tên người xác nhận sẽ được GHI LẠI.')).then(ok => {
            _mlog('OVERLIM', n, _fmt(tvEff,1)+' m³ (cảnh báo '+_fmt(WARN,0)+' · trần '+_fmt(CAP,1)+') — '
                   + (hard ? (ok && autoTv ? 'hạ về trần '+_fmt(CAP,1) : 'giữ nguyên, VƯỢT TRẦN')
                           : (ok ? 'giữ nguyên, chấp nhận rủi ro' : 'hạ về '+_fmt(WARN,0))));
            /* Cancel KHÔNG BAO GIỜ tự sửa số của người dùng.
               Vùng cảnh báo 585: chỉ xác nhận, phần mềm không đổi gì.
               Vượt trần 90%    : OK = hạ về trần · Cancel = tự sửa tay. */
            const doLower = hard && ok;
            const target  = CAP;
            if(doLower && autoTv){
              const tvEl2 = _gid('mc-tv'+n);
              if(tvEl2){
                tvEl2.value = target.toFixed(1);
                _planLinkClear(n);
                OVER_WARN[n] = false; OVER_HARD[n] = false; _overAsked[n] = null;
                toast('✔ TK-'+tk+': đã hạ TARGET VOL về '+_fmt(target,1)+' m³ — đang tính lại','ok');
                setTimeout(()=>{ try{ _calcOne(n); autoGcRecalc(n); }catch(_){} }, 0);
                return;
              }
            }
            });
          }catch(_){}
        }
      }
    } else {
      _overAsked[n] = null;
    }
    /* Pre-C3 adjustment (RECEIVE C3 before mixing) */
    let preC3 = 0, startVol = iv, addC3 = aC3, addC4 = aC4;
    if(PC[n]){
      preC3 = _gnum('mc-prec3'+n);
      if(preC3 > 0){
        if(preC3 > aC3){
          if(!_calcSilent) toast('⚠ TK-'+tk+': pre-C3 ('+preC3.toFixed(2)+' m³) exceeds C3 needed ('+aC3.toFixed(2)+' m³)','er');
          resEl.classList.remove('on'); return;
        }
        startVol = iv + preC3;
        const newCr = (crC3*iv + preC3) / startVol;
        const newCrEl = _gid('mc-newcr'+n);
        if(newCrEl) newCrEl.value = (newCr * 100).toFixed(2);
        addC3 = aC3 - preC3; addC4 = aC4;
      }
    }
    const ord = ORD[n];
    const first  = ord === 'C4' ? 'C4' : 'C3';
    const second = ord === 'C4' ? 'C3' : 'C4';
    const addFirst  = ord === 'C4' ? addC4 : addC3;
    const addSecond = ord === 'C4' ? addC3 : addC4;
    /* Levels */
    const vAfter1 = startVol + addFirst;
    const vAfter2 = vAfter1 + addSecond;
    const lvl1 = _v2L(vAfter1), lvl2 = _v2L(vAfter2);
    /* Mass in tons */
    const wC3 = aC3 * MC_D.c3l, wC4 = aC4 * MC_D.c4l;
    /* Low-pressure expected C3 */
    let lpHTML = '';
    if(LP[n]){
      const vPipe = _gnum('mc-vpipe'+n);
      if(vPipe > 0){
        const expC3 = (trC3*tvEff + crC3*vPipe) / (tvEff + vPipe);
        const expEl = _gid('mc-expc3'+n);
        if(expEl) expEl.value = (expC3 * 100).toFixed(2);
        const ok = expC3 >= 0.30 && expC3 <= 0.35;
        const rc = ok ? '#15803d' : '#c53727', rb = ok ? 'var(--green-soft)' : 'var(--red-soft)';
        const solved = (0.33*(tvEff + vPipe) - crC3*vPipe) / tvEff;
        lpHTML = '<div style="margin-top:4px;padding:4px 10px;background:#f3e8ff;border:1.5px solid #d4b5f0;border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
          '<span style="font-family:Oswald;font-size:10px;letter-spacing:1px;color:#7b2d8e;font-weight:700">📐 LOW PRESSURE</span>'+
          '<span style="font-size:10px;color:#7b2d8e">Pipe '+_fmt(vPipe,1)+' m³ · Prev C3 '+_fmt(crC3*100,1)+'%</span>'+
          '<span style="padding:2px 8px;border-radius:4px;background:'+rb+';color:'+rc+';font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">★ EXPECTED C3 <span style="font-family:monospace;font-size:14px">'+(expC3*100).toFixed(2)+'%</span></span>'+
          (ok ? '' : '<span style="font-size:9px;color:var(--red);font-weight:600">⚠ Hint target: '+(solved*100).toFixed(1)+'%</span>')+
        '</div>';
      }
    }
    /* v4.67 — SPECIAL RATIO banner: user's input = FINAL result; the banner
       shows the back-solved in-tank blend target the STOP volumes achieve. */
    if(SP[n] && spVPipe > 0){
      lpHTML += '<div style="margin-top:4px;padding:4px 10px;background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
        '<span style="font-family:Oswald;font-size:10px;letter-spacing:1px;color:#047857;font-weight:700">★ MIX TỈ LỆ ĐẶC BIỆT</span>'+
        '<span style="font-size:10px;color:#047857">Pipe '+_fmt(spVPipe,1)+' m³ · Prev C3 '+_fmt(crC3*100,1)+'%</span>'+
        '<span style="padding:2px 8px;border-radius:4px;background:var(--green-soft);color:#15803d;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">✔ FINAL C3 (AFTER CIRCULATE) = <span style="font-family:monospace;font-size:14px">'+(spDesired*100).toFixed(2)+'%</span> (đúng số đã nhập)</span>'+
        '<span style="padding:2px 8px;border-radius:4px;background:#fef3c7;color:#92400e;font-family:Oswald;letter-spacing:1px;font-weight:800;font-size:11px">🎯 BLEND TARGET (BEFORE CIRCULATE) <span style="font-family:monospace;font-size:14px">'+(trC3*100).toFixed(2)+'%</span></span>'+
      '</div>';
    }
    /* Odorant (BDSET) — based on pre-PC amounts for stable formula */
    const odoSET = Math.round((aC3 + aC4) / MC_ODO.ref * 100) * 1000;
    const odoBD  = MC_ODO.bd * odoSET;
    const col1 = first === 'C4' ? 'var(--orange)' : 'var(--blue)';
    const col2 = second === 'C4' ? 'var(--orange)' : 'var(--blue)';
    /* v4.75 — mờ sản phẩm không bơm (fill = 0) để tránh nhầm lẫn */
    const _dim = ';opacity:.3;filter:grayscale(.7)';
    const dimC3 = owDim === 'C3' ? _dim : '';
    const dimC4 = owDim === 'C4' ? _dim : '';
    const dim1  = owDim === first  ? _dim : '';
    const dim2  = owDim === second ? _dim : '';
    const tag1  = owDim === first  ? ' <span style="font-size:9px;font-weight:800;color:var(--red)">NO PUMP</span>' : '';
    const tag2  = owDim === second ? ' <span style="font-size:9px;font-weight:800;color:var(--red)">NO PUMP</span>' : '';
    resEl.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;margin-bottom:4px;border-bottom:1.5px solid rgba(0,0,0,.08);flex-wrap:wrap;gap:4px">'+
        '<span style="font-family:Oswald;font-size:14px;letter-spacing:1px;color:var(--ink-2)">'+
          ((SP[n] && spVPipe > 0)
            ? 'FINAL <span style="font-weight:700;color:var(--blue)">C3 '+(spDesired*100).toFixed(0)+'%</span> · <span style="font-weight:700;color:var(--orange)">C4 '+((1-spDesired)*100).toFixed(0)+'%</span> <span style="font-size:11px;color:#047857;font-weight:700">★ mix in tank to C3 '+(trC3*100).toFixed(2)+'%</span>'
            : (fm && fmVp > 0 && fmFin != null
              ? 'FINAL <span style="font-weight:700;color:var(--blue)">C3 '+(fmFin*100).toFixed(0)+'%</span> · <span style="font-weight:700;color:var(--orange)">C4 '+((1-fmFin)*100).toFixed(0)+'%</span> <span style="font-size:11px;color:#1d4ed8;font-weight:700">⬆ blend in tank C3 '+(trC3*100).toFixed(2)+'% · after circulate '+(fmFin*100).toFixed(2)+'%</span>'
              : 'TARGET <span style="font-weight:700;color:var(--blue)">C3 '+(trC3*100).toFixed(0)+'%</span> · <span style="font-weight:700;color:var(--orange)">C4 '+((1-trC3)*100).toFixed(0)+'%</span>'))+
        '</span>'+
        '<span style="display:flex;align-items:center;gap:8px">'+
          '<span style="font-family:monospace;font-size:15px;font-weight:700">'+_fmt(tvEff,0)+' m³'+(fm?' <span style="font-size:10px;color:#047857">(AUTO)</span>':(Math.abs(tvEff-tv)>0.05?' <span style="font-size:10px;color:#c2410c">(input '+_fmt(tv,0)+')</span>':''))+'</span>'+
          '<span style="font-family:Oswald;font-size:10px;color:#7b2d8e;font-weight:600;letter-spacing:1px">💨 ODO SET <span style="font-family:monospace;font-size:15px;font-weight:800">'+_fmt(odoSET,0)+'</span> BD <span style="font-family:monospace;font-size:15px;font-weight:800">'+_fmt(odoBD,2)+'</span></span>'+
        '</span></div>'+
      (PC[n] && preC3 > 0 ?
        '<div style="font-size:10px;padding:3px 8px;background:#fef3c7;border-radius:4px;margin-bottom:4px;color:#92400e;font-weight:600;display:flex;gap:8px;align-items:center"><span>📥 Receive C3: '+_fmt(preC3)+' m³</span><span>C3% after: '+(((crC3*iv + preC3) / startVol) * 100).toFixed(2)+'%</span></div>' : '')+
      '<div style="display:flex;align-items:center;gap:4px;margin:4px 0;flex-wrap:wrap">'+
        '<div style="display:flex;align-items:center;gap:4px;background:var(--orange-soft);padding:3px 8px;border-radius:4px'+dimC4+'"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--orange)"></span><span style="font-family:Oswald;font-size:12px;color:var(--orange);font-weight:700">C4</span><span style="font-family:monospace;font-size:14px;font-weight:800;color:var(--orange);margin-left:4px">'+_fmt(addC4)+'</span><span style="font-size:9px;color:var(--ink-2)">m³</span></div>'+
        '<div style="display:flex;align-items:center;gap:4px;background:var(--blue-soft);padding:3px 8px;border-radius:4px'+dimC3+'"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--blue)"></span><span style="font-family:Oswald;font-size:12px;color:var(--blue);font-weight:700">C3</span><span style="font-family:monospace;font-size:14px;font-weight:800;color:var(--blue);margin-left:4px">'+_fmt(addC3)+'</span><span style="font-size:9px;color:var(--ink-2)">m³</span></div>'+
        '<div style="display:flex;align-items:center;gap:4px;padding:3px 8px"><span style="font-family:Oswald;font-size:12px;color:var(--red);font-weight:700">LPG</span><span style="font-family:monospace;font-size:14px;font-weight:800;color:var(--red);margin-left:4px">'+_fmt(wC3 + wC4)+'</span><span style="font-size:9px;color:var(--ink-2)">ton</span></div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">'+
        '<div style="background:var(--panel);border-radius:6px;padding:8px 12px;border:2.5px dashed '+col1+';display:flex;align-items:center;justify-content:space-between'+dim1+'">'+
          '<div style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+col1+'"></span><span style="font-family:Oswald;font-size:13px;letter-spacing:1.5px;color:var(--ink-2);font-weight:600">STOP '+first+tag1+'</span></div>'+
          '<div style="display:flex;align-items:baseline;gap:6px"><span style="font-family:monospace;font-size:28px;font-weight:800;color:'+col1+'">'+_fmt(vAfter1,1)+'</span><span style="font-size:15px;color:var(--ink-2);font-weight:600">m³</span><span style="font-family:monospace;font-size:18px;font-weight:700;color:'+col1+';opacity:.6">'+_fmt(lvl1,0)+'</span><span style="font-size:12px;color:var(--ink-2)">mm</span></div>'+
        '</div>'+
        '<div style="background:var(--panel);border-radius:6px;padding:8px 12px;border:2.5px dashed '+col2+';display:flex;align-items:center;justify-content:space-between'+dim2+'">'+
          '<div style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+col2+'"></span><span style="font-family:Oswald;font-size:13px;letter-spacing:1.5px;color:var(--ink-2);font-weight:600">STOP '+second+tag2+'</span></div>'+
          '<div style="display:flex;align-items:baseline;gap:6px"><span style="font-family:monospace;font-size:28px;font-weight:800;color:'+col2+'">'+_fmt(vAfter2,1)+'</span><span style="font-size:15px;color:var(--ink-2);font-weight:600">m³</span><span style="font-family:monospace;font-size:18px;font-weight:700;color:'+col2+';opacity:.6">'+_fmt(lvl2,0)+'</span><span style="font-size:12px;color:var(--ink-2)">mm</span></div>'+
        '</div>'+
      '</div>'+ owHTML + lpHTML;
    resEl.classList.add('on');
    CALC_SIG[n] = _calcSig(n);   /* v4.79 — chốt ảnh chụp đầu vào của kết quả này */
    /* Tank height hint (only update when in MANUAL mode — AUTO already shows "← TK-... Lot ...") */
    if(CR_MODE[n] !== 'auto'){
      const hEl = _gid('mc-h'+n);
      if(hEl && iv > 0) hEl.textContent = 'H='+( _v2L(iv) / 1000 ).toFixed(3)+' m';
    }
    if(!_calcSilent) toast('✅ TK-'+tk+': calculation done','ok');
  }

  /* ── v4.79 (R4) — ẢNH CHỤP ĐẦU VÀO & ĐỐI CHIẾU TRƯỚC KHI START ────
     Mọi dữ liệu ảnh hưởng tới kết quả đều nằm trong chữ ký này. Nếu một
     ô bị sửa mà auto-calc chưa kịp/không chạy (mất focus, lỗi, người dùng
     bấm START ngay), _sigDiff() sẽ chỉ đúng ô đó ra cho nhân viên. */
  const _SIG_FLD = [
    ['mc-iv',    'INIT VOL (m³)'],
    ['mc-tv',    'TARGET VOL (m³)'],
    ['mc-tr',    'TARGET C3 %'],
    ['mc-cr',    'CURRENT C3 %'],
    ['mc-prec3', 'RECEIVE C3 (m³)'],
    ['mc-vpipe', 'LOW PRESSURE — Pipe (m³)'],
    ['mc-spvpipe','SPECIAL RATIO — Pipe (m³)'],
    ['mc-fcpipe','SINGLE-PRODUCT FILL — Pipe (m³)']
  ];
  function _calcSig(n){
    const f = {};
    _SIG_FLD.forEach(([id,lbl])=>{ f[id] = String(_gv(id+n) || '').trim(); });
    return {
      f: f,
      mode: [ LP[n]?'LP':'', SP[n]?'SP':'', PC[n]?'PC':'',
              FILL[n]?('FILL'+FILL[n]):'', (FILL[n]&&FILL_CIRC[n])?'CIRC':'',
              'ORD'+ORD[n] ].filter(Boolean).join('+') || 'NORMAL',
      cfg: [MC_D.c3l,MC_D.c4l,MC_D.c3v,MC_D.c4v,MC_TV,MC_TANK_R,
            MC_ODO.ppm,MC_ODO.ref,MC_ODO.bd].join('/')
    };
  }
  function _sigDiff(a, b){
    const out = [];
    if(!a || !b) return out;
    _SIG_FLD.forEach(([id,lbl])=>{
      const x = a.f[id] || '(trống)', y = b.f[id] || '(trống)';
      if(x !== y) out.push('• '+lbl+':  lúc tính = '+x+'   →   hiện tại = '+y);
    });
    if(a.mode !== b.mode) out.push('• Chế độ mix:  lúc tính = '+a.mode+'   →   hiện tại = '+b.mode);
    if(a.cfg  !== b.cfg)  out.push('• Hằng số trong ⚙ Settings đã thay đổi sau khi tính');
    return out;
  }

  function calcOne(n){
    if(ST[n] === 'mixing'){ toast('⚠ TK-'+(n==='1'?'3501':'3502')+' is mixing — cannot recalculate','er'); return; }
    if(ST[n] === 'idle'){ ST[n] = 'calc'; _renderStatus(n); }
    if(_planLinkCheck(n)) return;   /* v4.78 */
    _overAsked[n] = null;           /* v4.78 — bấm CALCULATE thì luôn hỏi lại */
    _calcOne(n);
    autoGcRecalc(n);
  }

  function autoCalc(n){
    clearTimeout(_calcTimer[n]);
    _calcTimer[n] = setTimeout(()=>{
      /* v4.78 — TARGET VOL lấy từ PLAN phải khớp TARGET C3 % hiện hành.
         Nếu %C3 đã đổi → xóa TARGET VOL cũ và dừng (bắt chạy lại PLAN). */
      if(_planLinkCheck(n)) return;
      const iv = _gnum('mc-iv'+n);
      const tv = _gnum('mc-tv'+n);
      const tr = _gnum('mc-tr'+n);
      const cr = _gnum('mc-cr'+n);
      const resEl = _gid('mc-r'+n);
      if(iv > 0 && (tv > 0 || FILL[n]) && tr > 0 && cr > 0){
        if(ST[n] === 'idle'){ ST[n] = 'calc'; _renderStatus(n); }
        if(ST[n] === 'mixing') return;
        _calcSilent = true;
        _calcOne(n);
        autoGcRecalc(n);
        _calcSilent = false;
      } else if(resEl){
        resEl.classList.remove('on');
        const gcRes = _gid('mc-gcres'+n);
        if(gcRes) gcRes.classList.remove('on');
      }
    }, 350);
  }

  function resetCalc(n){
    const tk = n==='1' ? 'TK-3501' : 'TK-3502';
    if(ST[n] === 'mixing'){ toast('⚠ '+tk+' is mixing — cannot reset','er'); return; }
    if(ST[n] !== 'calc') return;
    ['mc-iv'+n,'mc-sd'+n,'mc-s'+n,'mc-fd'+n,'mc-f'+n,'mc-l'+n,'mc-prec3'+n].forEach(id=>{ const e = _gid(id); if(e) e.value = ''; });
    OVER_WARN[n] = false; OVER_HARD[n] = false; _overAsked[n] = null; _planLinkClear(n);   /* v4.81 */
    const tvEl = _gid('mc-tv'+n); if(tvEl) tvEl.value = '570';
    const trEl = _gid('mc-tr'+n); if(trEl) trEl.value = '55';
    const vpEl = _gid('mc-vpipe'+n); if(vpEl) vpEl.value = '74';
    CR_MODE[n] = 'auto';
    const crEl = _gid('mc-cr'+n);
    if(crEl){ crEl.readOnly = true; crEl.placeholder = 'auto'; }
    const crmBtn = _gid('mc-crm'+n);
    if(crmBtn){ crmBtn.textContent = 'AUTO'; crmBtn.classList.remove('manual'); }
    _autoFillCr(n);
    /* v4.85.1 — dọn luôn khối 2 cách tính bổ sung */
    ICQ_MODE[n] = 'auto'; NMTH[n] = 'gc'; NM_USER[n] = false; ALTR[n] = null;
    ['mid','t3','p3','t4','p4','idn','iw3'].forEach(k=>{ const e = _gid('dt'+n+'-'+k); if(e) e.value = ''; });
    _gid('mc-cmp'+n) && (_gid('mc-cmp'+n).style.display = 'none');
    _gid('dt'+n+'-chk') && (_gid('dt'+n+'-chk').style.display = 'none');
    _altSyncLock(n);
    _autoFillIcq(n);
    _gid('mc-r'+n)?.classList.remove('on');
    _gid('mc-gcres'+n)?.classList.remove('on');
    /* Clear GC inputs too (v4.55: + COQ fields) */
    ['ch4','c2h6','c3h8','ic4','nc4','bd13','c5','olef','temp','pres','fvol','den',
     'coqno','c3h6','vp','sul','h2o','cu','res','mw',
     'frv','frw','t2b','b1','ib','neoc5','ic5','nc5','nc6'].forEach(k=>{
      const e = _gid('gc'+n+'-'+k); if(e) e.value = '';
    });
    CQM[n] = null;
    const qcEl = _gid('mc-qc'+n);
    if(qcEl){ qcEl.className = 'mc-qc'; qcEl.innerHTML = ''; }
    const sumEl = _gid('mc-gcsum'+n);
    if(sumEl){ sumEl.textContent = 'Sum: —'; sumEl.className = 'mc-gc-sum'; }
    LP[n] = false; _gid('mc-lp'+n)?.classList.remove('on'); _gid('mc-lp-box'+n)?.classList.remove('on');
    SP[n] = false; _gid('mc-sp'+n)?.classList.remove('on'); _gid('mc-sp-box'+n)?.classList.remove('on');
    const spvEl = _gid('mc-spvpipe'+n); if(spvEl) spvEl.value = '74';
    const sptEl = _gid('mc-sptr'+n);   if(sptEl) sptEl.value = '';
    _updateTrLabel(n);
    PC[n] = false; _gid('mc-pc'+n)?.classList.remove('on'); _gid('mc-pc-box'+n)?.classList.remove('on');
    _setFill(n, null);   /* v4.72: tắt chế độ chỉ bơm 1 sản phẩm */
    MIXING_LOT[n] = 0;
    GCR[n] = null;
    updateLotNames();
    _renderStatus(n);
    toast('🗑 Reset '+tk,'ok');
  }

  /* ---------- START / FINISH / REVERT (mixing-state Firebase sync) ---------- */
  function _collectMixingState(n){
    return {
      lot: MIXING_LOT[n] || 0,
      iv: _gv('mc-iv'+n), tv: _gv('mc-tv'+n),
      tr: _gv('mc-tr'+n), cr: _gv('mc-cr'+n),
      sd: _gv('mc-sd'+n), st: _gv('mc-s'+n),
      lp: LP[n], sp: SP[n], pc: PC[n], ord: ORD[n], fill: FILL[n] || '',
      fcirc: FILL_CIRC[n], fcpipe: _gv('mc-fcpipe'+n),   /* v4.74 */
      vpipe: _gv('mc-vpipe'+n), spvpipe: _gv('mc-spvpipe'+n), prec3: _gv('mc-prec3'+n),
      crMode: CR_MODE[n],
      by: (typeof CURRENT_USER !== 'undefined' ? CURRENT_USER.name : ''),
      _ts: Date.now()
    };
  }
  function _pushMixingFb(n){
    if(!_fbRef) return;
    const key = 'tk' + n;
    const payload = _collectMixingState(n);
    _suppressEcho++;
    _fbRef.child(key).set(payload)
      .catch(e => console.warn('[MC] mix-state push', e))
      .finally(()=> setTimeout(()=>{ _suppressEcho = Math.max(0, _suppressEcho - 1); }, 400));
    _audit('tankmix:state', key, 'state', null, 'mixing', 'mc start');
  }
  function _clearMixingFb(n){
    if(!_fbRef) return;
    const key = 'tk' + n;
    _suppressEcho++;
    _fbRef.child(key).set(null)
      .catch(e => console.warn('[MC] mix-state clear', e))
      .finally(()=> setTimeout(()=>{ _suppressEcho = Math.max(0, _suppressEcho - 1); }, 400));
    _audit('tankmix:state', key, 'state', 'mixing', null, 'mc finish/revert');
  }
  function _onRemoteMixingState(snap){
    if(_suppressEcho > 0) return;
    const key = snap.key;     // 'tk1' | 'tk2'
    if(key !== 'tk1' && key !== 'tk2') return;
    const v = snap.val();
    _remoteState[key] = v;
    const n = key === 'tk1' ? '1' : '2';
    if(v && typeof v === 'object' && v.lot){
      /* Another device says this tank is mixing — reflect locally
         only if WE aren't already mixing (don't clobber local input). */
      if(ST[n] !== 'mixing'){
        ST[n] = 'mixing';
        MIXING_LOT[n] = v.lot || 0;
        const set = (id, val)=>{ const el = _gid(id); if(el && val != null && val !== '') el.value = val; };
        set('mc-l'+n,  v.lot);
        set('mc-iv'+n, v.iv); set('mc-tv'+n, v.tv); set('mc-tr'+n, v.tr);
        if(v.cr){ const cr = _gid('mc-cr'+n); if(cr){ cr.value = v.cr; cr.readOnly = false; } CR_MODE[n] = v.crMode || 'manual'; }
        set('mc-sd'+n, v.sd); set('mc-s'+n, v.st);
        if(v.lp){ LP[n] = true; _gid('mc-lp'+n)?.classList.add('on'); _gid('mc-lp-box'+n)?.classList.add('on'); }
        if(v.sp){ SP[n] = true; _gid('mc-sp'+n)?.classList.add('on'); _gid('mc-sp-box'+n)?.classList.add('on'); _updateTrLabel(n); }
        if(v.pc){ PC[n] = true; _gid('mc-pc'+n)?.classList.add('on'); _gid('mc-pc-box'+n)?.classList.add('on'); }
        if(v.fill === 'C3' || v.fill === 'C4'){
          FILL_CIRC[n] = (v.fcirc !== false);                          /* v4.74 */
          if(v.fcpipe){ const e = _gid('mc-fcpipe'+n); if(e) e.value = v.fcpipe; }
          _setFill(n, v.fill);                                          /* v4.72 */
        }
        if(v.vpipe){ const e = _gid('mc-vpipe'+n); if(e) e.value = v.vpipe; }
        if(v.spvpipe){ const e = _gid('mc-spvpipe'+n); if(e) e.value = v.spvpipe; }
        if(v.prec3){ const e = _gid('mc-prec3'+n); if(e) e.value = v.prec3; }
        if(v.ord){
          ORD[n] = v.ord;
          const btn = _gid('mc-ord'+n);
          if(btn){
            if(v.ord === 'C3'){ btn.textContent = '➊C3 ➋C4'; btn.classList.remove('mc-btn-c4'); btn.classList.add('mc-btn-c3'); }
            else { btn.textContent = '➊C4 ➋C3'; btn.classList.remove('mc-btn-c3'); btn.classList.add('mc-btn-c4'); }
          }
        }
        updateLotNames();
        _renderStatus(n);
        _calcSilent = true; _calcOne(n); _calcSilent = false;
      }
    } else if(v === null){
      /* Remote cleared — if local thinks it's mixing, drop back to calc */
      if(ST[n] === 'mixing'){
        ST[n] = 'calc';
        MIXING_LOT[n] = 0;
        _renderStatus(n);
      }
    }
  }

  async function _startMix(n){
    if(ST[n] !== 'calc'){ toast('⚠ Click TK header to activate calculation first','er'); return; }
    const tk = n==='1' ? '3501' : '3502';
    /* v4.78 — TARGET VOL từ PLAN đã lệch %C3 → chặn luôn ở bước START */
    if(_planLinkCheck(n)) return;

    /* ══ v4.79 (R4) — KẾT QUẢ ĐANG HIỂN THỊ CÓ ĐÚNG VỚI DỮ LIỆU KHÔNG? ══
       Phần mềm tự tính lại khi gõ, nhưng có đường không kích hoạt được
       auto-calc (đổi hằng số ⚙, sửa xong bấm START ngay, tính lỗi...).
       Nếu lệch → LIỆT KÊ rõ từng ô rồi hỏi: TÍNH LẠI hay BỎ QUA. */
    let _sigSkipped = false;
    /* v4.219 — nói ĐÍCH DANH ô còn thiếu (trước đây chỉ báo chung "chưa tính toán") */
    const _miss = _calcMissing(n);
    if(_miss.length){
      toast('⛔ TK-'+tk+': fill '+_miss.map(x => x[0]).join(', ')+' before ▶START','er');
      await UIDLG.alert('⛔ TK-'+tk+' — CANNOT START: '+_miss.length+' INPUT'+(_miss.length > 1 ? 'S' : '')+' MISSING\n\n'
        + _miss.map(x => '• '+x[0]+' — '+x[2]).join('\n')+'\n\n'
        + 'Fill '+(_miss.length > 1 ? 'them' : 'it')+', press 🖩 CALCULATE, check STOP C3 / STOP C4, then ▶START.');
      warnGo(_miss[0][1]);
      return;
    }
    const resOn = _gid('mc-r'+n)?.classList.contains('on');
    if(!resOn || !CALC_SIG[n]){
      const go = await UIDLG.ask('⚠ TK-'+tk+' — STOP LEVELS NOT CALCULATED YET\n\n'
        + 'All inputs are filled, but STOP C3 / STOP C4 have not been calculated for them.\n\n'
        + 'OK = Calculate now · Cancel = go back');
      if(go){
        _calcOne(n);
        if(_gid('mc-r'+n)?.classList.contains('on')) toast('🖩 TK-'+tk+': calculated — check STOP C3 / STOP C4, then press ▶START again','warn');
      }
      return;
    }
    const diff = _sigDiff(CALC_SIG[n], _calcSig(n));
    if(diff.length){
      const msg = '⚠ TK-'+tk+' — INPUTS CHANGED AFTER THE CALCULATION\n\n'
        + 'The STOP C3 / STOP C4 shown were calculated from the OLD figures.\n'
        + 'These inputs were changed and not recalculated:\n\n'
        + diff.join('\n') + '\n\n'
        + 'OK = Recalculate with the current inputs (recommended) · Cancel = Keep the old result';
      let doRecalc = true;
      try{ doRecalc = await UIDLG.ask(msg); }catch(_){}
      if(doRecalc){
        _calcOne(n);
        autoGcRecalc(n);
        if(!_gid('mc-r'+n)?.classList.contains('on')){
          toast('⛔ TK-'+tk+': recalculation failed — check the inputs','er');
          return;
        }
        toast('🔄 TK-'+tk+': recalculated — check STOP C3 / STOP C4 before confirming','warn');
      } else {
        let ok2 = false;
        try{
          ok2 = await UIDLG.ask('⛔ TK-'+tk+' — START WITH THE OLD RESULT?\n\n'
            + 'The STOP levels do NOT match the inputs now on the form:\n\n'
            + diff.join('\n') + '\n\n'
            + 'Your name is recorded with this confirmation.\n\n'
            + 'OK = Start with the old result · Cancel = Go back');
        }catch(_){ ok2 = false; }
        if(!ok2){ toast('Cancelled — press 🖩 CALCULATE to recalculate','warn'); return; }
        _sigSkipped = true;
      }
    }

    /* ══ v4.81 — HAI NGƯỠNG TẠI BƯỚC ▶START ═══════════════════════════
       • > 90% dung tích bồn  → CHẶN, không cho bắt đầu (vượt quy định)
       • 585 < V ≤ 90%        → VẪN CHO START nhưng phải xác nhận thêm
                                 một lần nữa, ghi lại tên người xác nhận */
    const WARN = _mcWarnLvl(), CAP = _mcHardCap();
    if(OVER_HARD[n]){
      toast('⛔ TK-'+tk+': VƯỢT TRẦN QUY ĐỊNH 90% dung tích ('+_fmt(CAP,1)+' m³) — không thể START','er');
      try{
        alert('⛔ TK-'+tk+' — KHÔNG THỂ BẮT ĐẦU PHA\n\n'
          + 'Thể tích cuối của mẻ này vượt TRẦN QUY ĐỊNH 90% dung tích bồn.\n\n'
          + '   Trần quy định (90%) : '+_fmt(CAP,1)+' m³\n'
          + '   Thể tích cuối       : '+_fmt(_gnum('mc-tv'+n),1)+' m³\n\n'
          + 'Hãy hạ TARGET VOL, đổi TARGET C3 %, hoặc xuất bớt hàng trong bồn\n'
          + 'rồi tính lại trước khi bắt đầu pha.');
      }catch(_){}
      return;
    }
    let _overConfirmed = false;
    if(OVER_WARN[n]){
      const tvNow = _gnum('mc-tv'+n);
      let okOver = false;
      try{
        okOver = await UIDLG.ask('⚠⚠ TK-'+tk+' — XÁC NHẬN PHA TRONG VÙNG RỦI RO CAO ⚠⚠\n\n'
          + 'Thể tích cuối của mẻ này TRÊN ngưỡng cảnh báo '+_fmt(WARN,0)+' m³.\n\n'
          + '   Ngưỡng cảnh báo     : '+_fmt(WARN,0)+' m³\n'
          + '   TARGET VOL hiện tại : '+_fmt(tvNow,1)+' m³   (+'+_fmt(Math.max(0,tvNow-WARN),1)+')\n'
          + '   Trần quy định (90%) : '+_fmt(CAP,1)+' m³   (còn '+_fmt(Math.max(0,CAP-tvNow),1)+' m³)\n\n'
          + 'Mức này vẫn nằm trong quy định (≤ 90% dung tích) nhưng RỦI RO CAO.\n'
          + 'Anh/chị đã kiểm tra và chấp nhận?\n\n'
          + '[OK]     = bắt đầu pha — tên người xác nhận sẽ được GHI LẠI\n'
          + '[Cancel] = quay lại chỉnh số');
      }catch(_){ okOver = false; }
      if(!okOver){
        toast('Đã hủy — hạ TARGET VOL / đổi TARGET C3 % rồi tính lại','warn');
        return;
      }
      _overConfirmed = true;
      toast('⚠ TK-'+tk+': BẮT ĐẦU PHA TRÊN '+_fmt(WARN,0)+' m³ (rủi ro cao) — đã ghi nhật ký người xác nhận','er');
    }
    const sdEl = _gid('mc-sd'+n), sEl = _gid('mc-s'+n);
    if(!sdEl.value) sdEl.value = _todayDDMMYY();
    if(!sEl.value || !sEl.value.trim()) sEl.value = _nowHHMM();
    /* Auto-suggest next lot from RAM (ENG.ROWS) */
    const yr = new Date().getFullYear();
    let maxLot = 0;
    const rows = (typeof ENG !== 'undefined') ? ENG.ROWS : [];
    rows.forEach(r=>{
      const p = _parseLotNum(r[1]);
      if(p && p.year === yr && p.num > maxLot) maxLot = p.num;
    });
    const otherN = n==='1' ? '2' : '1';
    const otherLot = MIXING_LOT[otherN] || 0;
    if(otherLot > maxLot) maxLot = otherLot;
    const lotEl = _gid('mc-l'+n);
    if(lotEl && !lotEl.value){ lotEl.value = String(maxLot + 1); }
    MIXING_LOT[n] = parseInt(lotEl?.value) || 0;
    if(!MIXING_LOT[n]){ toast('⚠ TK-'+tk+': enter a lot number first','er'); return; }
    if(!await UIDLG.ask('TK-'+tk+': start mixing Lot '+MIXING_LOT[n]+'?\n\n• Locks INIT VOL / TARGET VOL / TARGET C3 inputs\n• Pushes mixing state to Firebase (~120 bytes)\n• Other operators will see TK-'+tk+' is MIXING in real time\n\nOK to proceed?')){
      toast('Mix start cancelled','warn');
      return;
    }
    ST[n] = 'mixing';
    updateLotNames();
    _renderStatus(n);
    _pushMixingFb(n);
    /* v4.79 (R8) — ghi nhật ký: ai bắt đầu, với bộ số nào */
    _mlog('START', n, 'IV='+_gv('mc-iv'+n)+' TV='+_gv('mc-tv'+n)+' TR='+_gv('mc-tr'+n)
                     +' CR='+_gv('mc-cr'+n)+' mode='+_calcSig(n).mode
                     + (_sigSkipped ? ' ⚠BỎ-QUA-TÍNH-LẠI' : '')
                     + (_overConfirmed ? ' ⚠RỦI-RO-CAO->'+_fmt(_mcWarnLvl(),0) : ''));
    if(_sigSkipped) _mlog('SKIP', n, 'Bắt đầu với kết quả CŨ: '+diff.join(' | ').slice(0,160));
    if(_overConfirmed) _mlog('OVERSTART', n, 'CHẤP NHẬN pha trên ngưỡng cảnh báo '+_fmt(_mcWarnLvl(),0)
                     +' m³ — TARGET VOL='+_gv('mc-tv'+n)+' m³ (trần 90% = '+_fmt(_mcHardCap(),1)+' m³)');
    toast('🔄 TK-'+tk+' → MIXING ('+_lotName(MIXING_LOT[n])+')','ok');
  }

  function startClick(n){
    clearTimeout(_startTimer[n]);
    _startTimer[n] = setTimeout(()=>{ _startMix(n); }, 230);
  }
  function startDblClick(n){
    clearTimeout(_startTimer[n]);
    _revertMix(n);
  }
  async function _revertMix(n){
    if(ST[n] !== 'mixing') return;
    const tk = n==='1' ? '3501' : '3502';
    if(!await UIDLG.ask('Revert TK-'+tk+' to CALCULATION?\n\n• Clears Start time + Lot number\n• Deletes mixing state from Firebase')) return;
    const sdEl = _gid('mc-sd'+n), sEl = _gid('mc-s'+n), lotEl = _gid('mc-l'+n);
    if(sdEl) sdEl.value = ''; if(sEl) sEl.value = ''; if(lotEl) lotEl.value = '';
    MIXING_LOT[n] = 0;
    updateLotNames();
    ST[n] = 'calc';
    _renderStatus(n);
    _clearMixingFb(n);
    toast('↩ TK-'+tk+' → CALCULATION','ok');
  }

  /* ---------- GC sum visual & tab-next ---------- */
  function gcSumInline(n){
    let sum = 0;
    document.querySelectorAll('.gc-inp-'+n).forEach(el=>{ const v = parseFloat(el.value); if(!isNaN(v)) sum += v; });
    const el = _gid('mc-gcsum'+n);
    if(!el) return;
    if(sum === 0){
      el.textContent = 'Sum: —'; el.className = 'mc-gc-sum';
    } else if(Math.abs(sum - 100) < 0.5){
      el.textContent = 'Sum: '+sum.toFixed(2)+'% ✓'; el.className = 'mc-gc-sum s-ok';
    } else if(Math.abs(sum - 100) < 2){
      el.textContent = 'Sum: '+sum.toFixed(2)+'% ⚠'; el.className = 'mc-gc-sum s-warn';
    } else {
      el.textContent = 'Sum: '+sum.toFixed(2)+'% ≠100'; el.className = 'mc-gc-sum s-err';
    }
    autoGcRecalc(n);
    qcRecalc(n);         // v4.55 — live Pass/Fail re-evaluation on every edit
  }
  function gcTabNext(e, el){
    if(e.key !== 'Enter') return;
    e.preventDefault();
    const container = el.closest('.mc-gc-inline');
    if(!container) return;
    const inputs = Array.from(container.querySelectorAll('input[type="text"]'));
    const idx = inputs.indexOf(el);
    if(idx >= 0 && idx < inputs.length - 1){
      inputs[idx + 1].focus();
      inputs[idx + 1].select?.();
    }
  }

  function autoGcRecalc(n){
    clearTimeout(_gcTimer[n]);
    _gcTimer[n] = setTimeout(()=>{
      const resEl = _gid('mc-gcres'+n);
      if(!resEl || !resEl.classList.contains('on')) return;
      const c3h8 = _gnum('gc'+n+'-c3h8'), ic4 = _gnum('gc'+n+'-ic4'), nc4 = _gnum('gc'+n+'-nc4');
      const fvol = _gnum('gc'+n+'-fvol');
      if((!c3h8 && !ic4 && !nc4) || !fvol) return;
      _gcSilent = true;
      gcCalcInline(n);
      _gcSilent = false;
    }, 300);
  }

  function gcCalcInline(n){
    const tk = n==='1' ? '3501' : '3502';
    let ch4 = _gnum('gc'+n+'-ch4'), c2h6 = _gnum('gc'+n+'-c2h6'), c3h8 = _gnum('gc'+n+'-c3h8');
    let ic4 = _gnum('gc'+n+'-ic4'), nc4 = _gnum('gc'+n+'-nc4'), bd13 = _gnum('gc'+n+'-bd13');
    let c5 = _gnum('gc'+n+'-c5'), olef = _gnum('gc'+n+'-olef');
    const fvol = _gnum('gc'+n+'-fvol'), lpgDen = _gnum('gc'+n+'-den');
    if(!c3h8 && !ic4 && !nc4){ if(!_gcSilent) toast('⚠ Enter Propane, i/n-Butane','er'); return; }
    if(!fvol){ if(!_gcSilent) toast('⚠ Enter Final Volume','er'); return; }
    const sum = ch4 + c2h6 + c3h8 + ic4 + nc4 + bd13 + c5 + olef;
    /* If user entered as 0-1 ratios, keep; if as percentages, normalize to fractions */
    if(sum > 1.5){ ch4/=100; c2h6/=100; c3h8/=100; ic4/=100; nc4/=100; bd13/=100; c5/=100; olef/=100; }
    const sL = c3h8 + ic4 + nc4;
    const sI = ch4 + c2h6 + bd13 + c5 + olef;
    /* Redistribute impurities proportionally to C3/C4 (matches V406 mass-balance model) */
    const rC3 = c3h8 + (sL > 0 ? (c3h8/sL)*sI : 0);
    const rC4 = (ic4 + nc4) + (sL > 0 ? ((ic4+nc4)/sL)*sI : 0);
    const wC3 = rC3*fvol*MC_D.c3l, wC4 = rC4*fvol*MC_D.c4l;
    const vwC3 = (MC_TV - fvol)*rC3*MC_D.c3v;
    const vwC4 = (MC_TV - fvol)*rC4*MC_D.c4v;
    const tC3 = wC3 + vwC3, tC4 = wC4 + vwC4;
    const iv = _gnum('mc-iv'+n), crd = _gnum('mc-cr'+n)/100;
    const bC3 = crd*iv*MC_D.c3l + (MC_TV - iv)*crd*MC_D.c3v;
    const bC4 = (1-crd)*iv*MC_D.c4l + (MC_TV - iv)*(1-crd)*MC_D.c4v;
    const fC3 = parseFloat((tC3 - bC3).toFixed(3));
    const fC4 = parseFloat((tC4 - bC4).toFixed(3));
    const fLPG = parseFloat((fC3 + fC4).toFixed(3));
    const lot = parseInt(_gv('mc-l'+n)) || 0;
    GCR[n] = {
      tk, lot,
      ch4, c2h6, c3h8, ic4, nc4, bd13, c5, olef,
      fvol, lpgDen, rC3, rC4, tC3, tC4, fC3, fC4, fLPG,
      qty: lpgDen > 0 ? fvol*lpgDen : fvol*(rC3*MC_D.c3l + rC4*MC_D.c4l),
      dens: lpgDen
    };
    /* ⭐ v4.214 — KẾT QUẢ CUỐI = SỐ THEO COQ (chính thức). GC chỉ còn là một dòng
       ĐỐI CHIẾU chéo bên dưới. Thẻ kết quả chỉ hiện sau khi bấm 🧮 CALC như cũ
       (logic lưu PASS vẫn cần GCR), COQ tính lại ngay trong lượt này. */
    const resEl = _gid('mc-gcres'+n);
    if(!resEl) return;
    resEl.classList.add('on');
    let _ar = null;
    try{ _ar = altCalc(n, true); }catch(e){ console.warn('[MC] altCalc', e); _renderResult(n); }
    if(!_gcSilent){
      const q = _ar && _ar.coq;
      if(q && !q.error) toast('✅ COQ TK-'+tk+' → Filled LPG: '+_fmt(q.fLPG)+' ton  (GC '+_fmt(fLPG)+')','ok');
      else toast('⚠ TK-'+tk+' — COQ not computed'+(q && q.error ? ': '+q.error.replace(/^Missing:\s*/,'missing ') : '')+' · GC '+_fmt(fLPG)+' ton','warn');
      _renderStatus(n);
    }
  }

  /* ---------- v4.214 — khối KẾT QUẢ CUỐI (mc-gcres): COQ chính + GC đối chiếu ---------- */
  function _renderResult(n){
    const resEl = _gid('mc-gcres'+n);
    if(!resEl || !GCR[n]) return;
    const gc = GCR[n], res = ALTR[n], q = res && res.coq ? res.coq : null;
    const ok = !!(q && !q.error);
    const ord = ORD[n] || 'C4';
    const pc = (a, b) => (b ? (a / b * 100).toFixed(2) + '%' : '');
    const card = (cls, lbl, v, sub) =>
      '<div class="mc-rc '+cls+'"><div class="k">'+lbl+' <i>ton</i></div>'+
      '<div class="v">'+(v == null ? '—' : _fmt(v))+'</div><div class="s">'+(sub||'&nbsp;')+'</div></div>';
    const c3 = card('c3', 'FILLED C3', ok ? q.fC3 : null, ok ? pc(q.fC3, q.fLPG) + ' of filled' : '');
    const c4 = card('c4', 'FILLED C4', ok ? q.fC4 : null, ok ? pc(q.fC4, q.fLPG) + ' of filled' : '');
    const lp = card('lpg', 'FILLED LPG', ok ? q.fLPG : null, ok ? 'ρ ' + q.fDen : '');
    let dv = '';
    if(ok && gc.fLPG){
      const p = (q.fLPG - gc.fLPG) / gc.fLPG * 100;
      dv = '<span class="d'+(Math.abs(p) >= 3 ? ' hi' : '')+'" title="(COQ − GC) ÷ GC — same Δ as the Tank Log">Δ '+(p >= 0 ? '+' : '')+p.toFixed(2)+'%</span>';
    }
    const cross = '<div class="mc-rx" title="Calculated from the GC composition — for cross-checking only, not sent anywhere">'+
      '<span class="t">GC check</span>'+
      '<span>C3 <b class="c3">'+_fmt(gc.fC3)+'</b></span><span>C4 <b class="c4">'+_fmt(gc.fC4)+'</b></span>'+
      '<span>LPG <b>'+_fmt(gc.fLPG)+'</b></span>'+dv+'</div>';
    const foot = ok
      ? '<div class="mc-rf">Mass balance: '+_fmt(q.iv)+' m³ × '+q.iDen+' = '+_fmt(q.mIni)+' t ('+(q.w3Ini*100).toFixed(2)+' %wt C3) → '+
        _fmt(q.fv)+' m³ × '+q.fDen+' = '+_fmt(q.mFin)+' t ('+(q.w3Fin*100).toFixed(2)+' %wt C3)</div>'
      : '<div class="mc-rerr">⚠ COQ not computed — '+_escHtml(q && q.error ? q.error : 'press 🧮 CALC COQ')+'</div>';
    try{ _renderWarnbar(n); }catch(_){}
    resEl.innerHTML =
      '<div class="mc-rh"><span class="t">RESULT</span><span class="src">COQ</span></div>'+
      '<div class="mc-rcs">'+(ord === 'C4' ? c4 + c3 + lp : c3 + c4 + lp)+'</div>'+
      foot + cross +
      '<div class="mc-rsave"><button type="button" onclick="MC.gcSave(\''+n+'\')" class="mc-savebtn">💾 SAVE PASS → TANK LOG</button></div>';
  }

  /* ---------- SAVE to Tank Log (Pass / Pending) — pushes ONE row via ENG.upsertRow ---------- */
  async function _saveToTankLog(n, quality, silent){
    const tk = n==='1' ? '3501' : '3502';
    const tkName = 'TK-'+tk;
    const lotNum = parseInt(_gv('mc-l'+n)) || 0;
    if(!lotNum){ toast('❌ Lot = 0 — press ▶START first to assign a Lot','er'); return false; }
    const lotStr = _lotName(lotNum);
    const stVal = (_gv('mc-s'+n)||'').trim();
    if(!stVal){ toast('❌ START not pressed — no Start time','er'); return false; }
    /* v4.87 — COQ là số liệu CHÍNH THỨC: lưu Pass mà chưa ra được C3/C4 theo
       COQ thì phải cho nhân viên biết đích danh còn thiếu gì và bắt xác nhận. */
    if(quality === 'Pass'){
      let g = null;
      try{ g = _coqGate(n); }catch(_){}
      if(g && !g.ok){
        if(!await UIDLG.ask('⚠ LOT NÀY CHƯA TÍNH ĐƯỢC C3/C4 THEO COQ\n\n'
          + 'Thiếu / sai dữ liệu:\n' + g.problems.join('\n') + '\n\n'
          + 'COQ sắp là số liệu CHÍNH THỨC đưa lên hệ thống công ty, nên mọi lot đều phải có kết quả.\n\n'
          + 'OK = vẫn lưu (nhớ bổ sung sau bằng ◈ COQ audit ở Tank Log)\n'
          + 'Cancel = quay lại nhập cho đủ')) return false;
      } else if(g && g.warns.length){
        if(!await UIDLG.ask('⚠ SỐ LIỆU COQ CÓ ĐIỂM BẤT THƯỜNG\n\n' + g.warns.join('\n')
          + '\n\nOK = vẫn lưu\nCancel = quay lại kiểm tra chứng thư')) return false;
      }
    }
    /* Form data */
    const formIV   = _gnum('mc-iv'+n);
    const formTV   = _gnum('mc-tv'+n);
    const formTrC3 = _gnum('mc-tr'+n);
    const formCrC3 = _gnum('mc-cr'+n);
    const formSD   = _gv('mc-sd'+n);
    const formST   = _gv('mc-s'+n);
    let   formFT   = _gv('mc-f'+n);
    let   formFD   = _gv('mc-fd'+n);
    if(!formFT){ formFT = _nowHHMM(); const fEl = _gid('mc-f'+n); if(fEl) fEl.value = formFT; }
    if(!formFD){ formFD = _todayDDMMYY(); const fdEl = _gid('mc-fd'+n); if(fdEl) fdEl.value = formFD; }
    const dateStr = formSD || _todayDDMMYY();
    /* GC numeric (may all be 0 if quality=Pending). GCR holds 0–1 fractions;
       store back as 0–100 % consistently. Scale is decided by the TOTAL GC
       sum, NOT by ethane alone — a 0-ethane sample must still store as %. */
    const gc = GCR[n] || {};
    const _gcSum = (gc.ch4||0)+(gc.c2h6||0)+(gc.c3h8||0)+(gc.ic4||0)
                 + (gc.nc4||0)+(gc.bd13||0)+(gc.c5||0)+(gc.olef||0);
    const gcMult = (_gcSum > 0 && _gcSum < 1.5) ? 100 : 1;
    /* Pull Temp/Pres/Density even if no GCR (user might have filled them) */
    const gcTemp = _gnum('gc'+n+'-temp');
    const gcPres = _gnum('gc'+n+'-pres');
    const gcDen  = _gnum('gc'+n+'-den');
    /* Try to reuse the rid if a row for this Lot|Tank already exists */
    const existing = (typeof ENG !== 'undefined') ? ENG.findRowByLotTank(lotStr, tkName) : null;
    let row;
    if(existing){
      /* mutate copy of existing row, keep its rid */
      row = existing.slice(0, ROW_W);
      while(row.length < ROW_W) row.push('');
    } else {
      row = new Array(ROW_W).fill('');
      row[1] = lotStr;
      row[2] = tkName;
    }
    row[3] = dateStr;
    row[4] = formST || row[4] || '';
    row[5] = formFT || row[5] || '';
    if(formIV)   row[10] = formIV;
    if(formCrC3){ row[11] = formCrC3; row[12] = parseFloat((100 - formCrC3).toFixed(4)); }
    if(formTrC3) row[29] = formTrC3;
    if(formTV)   row[30] = formTV;
    if(quality === 'Pass' && gc.fLPG != null){
      row[6]  = gc.fvol;
      row[7]  = gc.qty;
      row[8]  = gc.rC3;
      row[9]  = gc.rC4;
      row[13] = gc.fC3;
      row[14] = gc.fC4;
      row[15] = gc.fLPG;
      row[16] = (gc.ch4  || 0) * gcMult;
      row[17] = (gc.c2h6 || 0) * gcMult;
      row[18] = (gc.c3h8 || 0) * gcMult;
      row[19] = (gc.ic4  || 0) * gcMult;
      row[20] = (gc.nc4  || 0) * gcMult;
      row[21] = (gc.bd13 || 0) * gcMult;
      row[22] = (gc.c5   || 0) * gcMult;
      row[23] = (gc.olef || 0) * gcMult;
      row[24] = gc.rC3;
      row[25] = gc.rC4;
      /* Odorant (BDSET) — uses pre-PC amounts */
      if(formIV && formTV && formTrC3 && formCrC3){
        const aC3 = formTrC3/100*formTV - formCrC3/100*formIV;
        const aC4 = (1 - formTrC3/100)*formTV - (1 - formCrC3/100)*formIV;
        const odoSET = Math.round((aC3 + aC4) / MC_ODO.ref * 100) * 1000;
        row[26] = parseFloat((MC_ODO.bd * odoSET).toFixed(2));
      }
    } else {
      /* Pending — keep any pre-existing fields & write any user-entered GC partials */
      if(gc.fvol)   row[6]  = gc.fvol;
      if(gc.c3h8)   row[18] = gc.c3h8 * gcMult;
      if(gc.ic4)    row[19] = gc.ic4 * gcMult;
      if(gc.nc4)    row[20] = gc.nc4 * gcMult;
    }
    if(gcTemp) row[31] = gcTemp;
    if(gcPres) row[32] = gcPres;
    if(gcDen)  row[33] = gcDen;
    row[27] = quality;
    if(!row[28]) row[28] = '';
    /* v4.55 — COQ columns [34..43] */
    const _cv = id => (_gv(id)||'').trim();
    const _cn = id => { const v = parseFloat(String(_gv(id)||'').replace(/,/g,'')); return isNaN(v) ? '' : v; };
    const coqNo = _cv('gc'+n+'-coqno');
    if(coqNo) row[34] = coqNo;
    if(CQM[n]){
      if(CQM[n].sampTime) row[35] = CQM[n].sampTime;
      if(CQM[n].anaDate)  row[36] = CQM[n].anaDate;
    }
    const _c3h6 = _cn('gc'+n+'-c3h6'); if(_c3h6 !== '') row[37] = _c3h6;
    const _vp   = _cn('gc'+n+'-vp');   if(_vp   !== '') row[38] = _vp;
    const _sul  = _cn('gc'+n+'-sul');  if(_sul  !== '') row[39] = _sul;
    const _h2o  = _cv('gc'+n+'-h2o');  if(_h2o) row[40] = _h2o;
    const _cu   = _cv('gc'+n+'-cu');   if(_cu)  row[41] = _cu;
    const _res  = _cv('gc'+n+'-res');  if(_res) row[42] = _res;
    const _mw   = _cn('gc'+n+'-mw');   if(_mw  !== '') row[43] = _mw;
    /* v4.55.1 — Pro/Bu fraction + minor components [44..52] */
    const _frv  = _cv('gc'+n+'-frv');  if(_frv) row[44] = _frv;
    const _frw  = _cv('gc'+n+'-frw');  if(_frw) row[45] = _frw;
    [['t2b',46],['b1',47],['ib',48],['neoc5',49],['ic5',50],['nc5',51],['nc6',52]].forEach(p=>{
      const v = _cn('gc'+n+'-'+p[0]); if(v !== '') row[p[1]] = v;
    });
    /* v4.86 — kết quả theo COQ ghi vào cột [63..68].
       KHÔNG đụng tới [13]/[14] nên số liệu GC đang chạy không đổi. */
    let _altRes = null;
    try{ _altRes = _altWriteRow(n, row); }
    catch(e){ console.warn('[MC] altWriteRow', e); }
    /* Push via ENG (one child write) — ENG handles rid generation/lookup */
    const rid = ENG.upsertRow(row, existing ? { rid: existing._rid } : null);
    _audit('tankmix:'+(quality==='Pass'?'save':'draft'), rid, 'quality', '', quality.toLowerCase(),
           'mc '+ (quality==='Pass'?'save pass':'save draft'));
    if(!silent) toast((quality==='Pass'?'💾 SAVED PASS':'💾 Draft saved')+' — '+lotStr+' '+tkName,'ok');
    /* Sync filled C3/C4 + lot into Scale's tank config (auto-mode only) */
    if(quality === 'Pass' && typeof SCALE !== 'undefined' && SCALE.mcSyncTkCfg){
      try{
        SCALE.mcSyncTkCfg(n==='1'?'tk1':'tk2', {
          lot: String(lotNum),
          initWt: gc.qty || 0,
          filledC3: gc.fC3 || 0,
          filledC4: gc.fC4 || 0
        });
      }catch(e){ console.warn('[MC] SCALE.mcSyncTkCfg', e); }
    }
    /* Push the Scale Station 4-slot mix-notify bar — same as the edit-modal
       CALC+SAVE+NOTIFY — so the live MIX calc Pass-save also notifies Scale.
       One idempotent child write to mix_notify/{Tank_Lot} (overwrites on re-save). */
    if(quality === 'Pass' && gc.fLPG != null
       && typeof MIXNOTIFY !== 'undefined' && MIXNOTIFY.pushNotify){
      /* v4.85.1 — gửi con số theo ĐÚNG phương pháp đã chọn trên bảng so sánh */
      const _sel = String(row[A_MTH] || 'gc');
      const _pair = _sel === 'coq' ? [row[A_QC3], row[A_QC4]]
                  : [gc.fC3, gc.fC4];
      const fC3Kg = Math.round(Math.abs(parseFloat(_pair[0]) || 0) * 1000);
      const fC4Kg = Math.round(Math.abs(parseFloat(_pair[1]) || 0) * 1000);
      if(fC3Kg > 0 || fC4Kg > 0){
        try{ MIXNOTIFY.pushNotify(tkName, lotStr, fC3Kg, fC4Kg, n==='1'?'tk1':'tk2'); }
        catch(e){ console.warn('[MC] MIXNOTIFY.pushNotify', e); }
      }
    }
    return true;
  }

  /* Called by the SAVE button inside the GC result block (Quality = Pass) */
  async function gcSave(n){
    if(!GCR[n]){ toast('⚠ Press 🧮 CALC in the GC section first','er'); return; }
    /* v4.55 — verdict vs spec table decides Pass/Fail (C3 deviation = warning only) */
    const ev = evalQuality(n);
    const quality = ev.fails.length ? 'Fail' : 'Pass';
    const failTxt = ev.fails.length ? '\n\n⚠ FAIL:\n'+ev.fails.map(f=>'  • '+f).join('\n') : '';
    const warnTxt = ev.warns.length ? '\n\n⚠ '+ev.warns.join('\n⚠ ') : '';
    if(!await UIDLG.ask('Save '+quality.toUpperCase()+' result to Tank Log?\n\n• Lot: '+_lotName(GCR[n].lot)+'\n• Tank: TK-'+GCR[n].tk+'\n• Filled LPG (COQ): '+((ALTR[n] && ALTR[n].coq && !ALTR[n].coq.error) ? _fmt(ALTR[n].coq.fLPG)+' ton' : 'NOT COMPUTED')+'  ·  GC '+_fmt(GCR[n].fLPG)+' ton'+failTxt+warnTxt+'\n\nOne child write to Firebase (incremental sync).')) return;
    if(!(await _saveToTankLog(n, quality, /*silent*/ false))) return;
    /* Exit mixing if applicable; mixing-state node will be cleared */
    if(ST[n] === 'mixing'){
      ST[n] = 'calc';
      _clearMixingFb(n);
    }
    _renderStatus(n);
  }

  /* Called by the inline 💾 DRAFT button (Quality = Pending) */
  async function gcSaveDraftInline(n){
    if(!(await _saveToTankLog(n, 'Pending', /*silent*/ false))) return;
    if(ST[n] === 'mixing'){
      ST[n] = 'calc';
      _clearMixingFb(n);
    }
    _renderStatus(n);
  }

  async function finishMix(n){
    const tk = n==='1' ? '3501' : '3502';
    const lotNum = parseInt(_gv('mc-l'+n)) || 0;
    const stVal = (_gv('mc-s'+n)||'').trim();
    if(!lotNum || !stVal){
      toast('❌ START not pressed — no Lot/Start time. Press ▶START first.','er');
      return;
    }
    /* Auto-fill finish time/date if blank */
    if(!_gv('mc-fd'+n)){ const fdEl = _gid('mc-fd'+n); if(fdEl) fdEl.value = _todayDDMMYY(); }
    if(!_gv('mc-f'+n)){  const fEl  = _gid('mc-f'+n);  if(fEl)  fEl.value  = _nowHHMM(); }
    /* Warnings about missing GC */
    const c3h8 = _gnum('gc'+n+'-c3h8');
    const fvol = _gnum('gc'+n+'-fvol');
    const gcRes = _gid('mc-gcres'+n);
    const hasGc = gcRes && gcRes.classList.contains('on') && (gcRes.innerHTML||'').indexOf('FILLED') >= 0;
    const warns = [];
    if(!c3h8) warns.push('• GC Propane = 0');
    if(!fvol) warns.push('• Final Volume not entered');
    if(!hasGc) warns.push('• 🧮 CALC not pressed on the GC section');
    if(warns.length){
      if(!await UIDLG.ask('TK-'+tk+' — Finish without complete GC?\n\n'+warns.join('\n')+'\n\nRow will be saved as Quality = Pending.\n\nOK = save Pending  ·  Cancel = go back')) return;
    }
    /* v4.55 — verdict vs spec table decides Pass/Fail when GC is complete */
    let quality = 'Pending';
    if(hasGc){
      const ev = evalQuality(n);
      quality = ev.fails.length ? 'Fail' : 'Pass';
      if(ev.fails.length && !await UIDLG.ask('⚠ QUALITY FAIL so với tiêu chuẩn:\n\n'+ev.fails.map(f=>'• '+f).join('\n')+'\n\nLưu với Quality = Fail?')) return;
      if(ev.warns.length) toast('⚠ '+ev.warns[0],'warn');
    }
    if(!(await _saveToTankLog(n, quality, /*silent*/ false))) return;
    /* v4.79 (R8) — nhật ký kết thúc mẻ */
    _mlog('FINISH', n, 'lot='+lotNum+' quality='+quality+' FVOL='+_gv('gc'+n+'-fvol')
                      +' C3='+_gv('gc'+n+'-c3h8')+(warns.length?' ⚠'+warns.length+' cảnh báo':''));
    if(ST[n] === 'mixing'){
      ST[n] = 'calc';
      _clearMixingFb(n);
    }
    _renderStatus(n);
  }

  /* ============================================================
     v4.79 (R8) — NHẬT KÝ THAO TÁC (audit trail)  ·  eng_mix_audit
     ------------------------------------------------------------
     CHỈ GHI, KHÔNG ĐỌC (không gắn listener) ⇒ không tốn băng thông
     đọc của Firebase. Mỗi bản ghi ~110 byte:
       { t, u, tk, lot, a, d }
     Ước tính: 3–5 mẻ/ngày × ~3 sự kiện ≈ 15 bản/ngày ≈ 5.500 bản/năm
     ≈ 0,6 MB/năm — không đáng kể với hạn mức Spark (1 GB lưu trữ).
     Xem lại nhật ký bằng Firebase Console, hoặc thêm màn hình đọc sau.
     ============================================================ */
  function _auditUser(){
    try{
      const u = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : (window.CURRENT_USER || {});
      return String(u.name || u.email || '?').slice(0, 40);
    }catch(_){ return '?'; }
  }
  function _mlog(act, n, detail){
    try{
      if(typeof firebase === 'undefined') return;
      firebase.database().ref('eng_mix_audit').push({
        t  : Date.now(),
        u  : _auditUser(),
        tk : (n === '1' ? '3501' : '3502'),
        lot: MIXING_LOT[n] || 0,
        a  : String(act || '').slice(0, 16),
        d  : String(detail || '').slice(0, 180)
      }).catch(()=>{});
    }catch(e){ console.warn('[MC] audit', e); }
  }

  /* ============================================================
     v4.55 — COQ SPEC TABLE (Firebase-synced) + QUALITY EVALUATION
     ============================================================ */
  function _loadSpecLocal(){
    try{
      const raw = localStorage.getItem(SPEC_LS_KEY);
      if(raw) SPEC = Object.assign({}, SPEC_DEF, JSON.parse(raw));
    }catch(_){}
  }
  function _saveSpecLocal(){
    try{ localStorage.setItem(SPEC_LS_KEY, JSON.stringify(SPEC)); }catch(_){}
  }
  function _initSpecFb(){
    try{
      if(typeof firebase === 'undefined') return;
      _specFbRef = firebase.database().ref('eng_coq_spec');
      _specFbRef.on('value', snap=>{
        const v = snap.val();
        if(v && typeof v === 'object'){
          SPEC = Object.assign({}, SPEC_DEF, v);
          _saveSpecLocal();
          /* refresh visible verdicts */
          ['1','2'].forEach(n=>{ if(ST[n] !== 'idle') _renderQc(n); });
        }
      });
    }catch(e){ console.warn('[MC] spec FB init', e); }
  }

  const _SPEC_FIELDS = [
    { k:'bd13', label:'1,3-Butadiene',            unit:'max %vol'  },
    { k:'olef', label:'Total Olefin',             unit:'max %vol'  },
    { k:'c5',   label:'C5 & C5+',                 unit:'max %vol'  },
    { k:'vp',   label:'Vapor Pressure @37.8°C',   unit:'max kPa'   },
    { k:'sul',  label:'Total Sulfur',             unit:'max mg/kg' },
    { k:'cu',   label:'Cu Strip Corrosion',       unit:'max No.'   },
    { k:'res',  label:'Residue',                  unit:'max ml'    },
    { k:'c3tol',label:'%vol C3 lệch target (cảnh báo)', unit:'± điểm %' }
  ];
  function openSpec(){
    _SPEC_FIELDS.forEach(f=>{
      const e = _gid('mc-spec-'+f.k);
      if(e) e.value = SPEC[f.k];
    });
    _gid('mc-spec-backdrop')?.classList.add('on');
  }
  function closeSpec(){ _gid('mc-spec-backdrop')?.classList.remove('on'); }
  function saveSpec(){
    const next = {};
    _SPEC_FIELDS.forEach(f=>{
      const v = parseFloat(_gv('mc-spec-'+f.k));
      next[f.k] = isNaN(v) ? SPEC_DEF[f.k] : v;
    });
    SPEC = Object.assign({}, SPEC_DEF, next);
    _saveSpecLocal();
    if(_specFbRef){
      _specFbRef.set(next).catch(e=>console.warn('[MC] spec push', e));
    }
    closeSpec();
    toast('📋 Spec table saved (synced to all devices)','ok');
    ['1','2'].forEach(n=>{ if(ST[n] !== 'idle') _renderQc(n); });
  }
  async function resetSpec(){
    if(!await UIDLG.ask('Reset spec table to lab defaults?\n\nBD<0.5 · Olefin≤10 · C5+<2 · VP≤1430 · S≤140 · Cu No.1 · Residue<0.05 · C3 ±3')) return;
    SPEC = Object.assign({}, SPEC_DEF);
    _saveSpecLocal();
    if(_specFbRef) _specFbRef.set(SPEC_DEF).catch(()=>{});
    openSpec();
    toast('↺ Spec reset to defaults','ok');
  }

  /* ---------- quality evaluation core ----------
     vals = { bd13, olef, c5, vp, sul, h2o, cu, res, c3vol, c3target }
     Numeric fields: empty/absent → skipped (không có dữ liệu → không xét).
     Text fields (h2o/res): 'pass'/'nil'/'ok'/'no' pass; numbers compared.
     %C3 deviation → WARNING only, never a Fail. */
  function _evalQualityCore(vals){
    const fails = [], warns = [];
    const numChk = (v, lim, name, unit)=>{
      if(v === '' || v == null || isNaN(v)) return;
      if(v > lim) fails.push(name+' = '+v+' > '+lim+' '+(unit||''));
    };
    numChk(vals.bd13, SPEC.bd13, '1,3-BD', '%vol');
    numChk(vals.olef, SPEC.olef, 'Olefin', '%vol');
    numChk(vals.c5,   SPEC.c5,   'C5+',    '%vol');
    numChk(vals.vp,   SPEC.vp,   'Vapor Pres.', 'kPa');
    numChk(vals.sul,  SPEC.sul,  'Sulfur', 'mg/kg');
    /* Free water — text: pass/nil OK */
    const h2o = String(vals.h2o == null ? '' : vals.h2o).trim().toLowerCase();
    if(h2o && !/^(pass|nil|ok|no|đạt|dat|-)/.test(h2o)) fails.push('Free Water = "'+vals.h2o+'"');
    /* Cu corrosion — parse leading class number: "1", "1a", "No.1" */
    const cuRaw = String(vals.cu == null ? '' : vals.cu).trim();
    if(cuRaw){
      const m = cuRaw.match(/(\d+(?:\.\d+)?)/);
      if(m){ if(parseFloat(m[1]) > SPEC.cu) fails.push('Cu Corrosion = '+cuRaw+' > No.'+SPEC.cu); }
      else if(!/^(pass|ok|đạt|dat|-)/i.test(cuRaw)) fails.push('Cu Corrosion = "'+cuRaw+'"');
    }
    /* Residue — 'pass' or numeric < limit */
    const resRaw = String(vals.res == null ? '' : vals.res).trim().toLowerCase();
    if(resRaw && !/^(pass|nil|ok|đạt|dat|-)/.test(resRaw)){
      const rv = parseFloat(resRaw.replace('<',''));
      if(isNaN(rv)) fails.push('Residue = "'+vals.res+'"');
      else if(rv > SPEC.res && resRaw.indexOf('<') !== 0) fails.push('Residue = '+rv+' > '+SPEC.res+' ml');
    }
    /* %vol C3 vs target — warning only */
    const c3 = parseFloat(vals.c3vol), tg = parseFloat(vals.c3target);
    if(!isNaN(c3) && !isNaN(tg) && c3 > 0 && tg > 0){
      const dev = c3 - tg;
      if(Math.abs(dev) > SPEC.c3tol)
        warns.push('%vol C3 = '+c3.toFixed(2)+'% lệch '+(dev>0?'+':'')+dev.toFixed(2)+' điểm % so với target '+tg.toFixed(1)+'% (giới hạn ±'+SPEC.c3tol+')');
    }
    return { verdict: fails.length ? 'Fail' : 'Pass', fails, warns };
  }

  /* Evaluate from the live GC panel inputs of tank n */
  function evalQuality(n){
    const numOrEmpty = id => {
      const s = String(_gv(id)||'').trim();
      if(!s) return '';
      const v = parseFloat(s.replace(/,/g,'').replace('<',''));
      return isNaN(v) ? '' : v;
    };
    return _evalQualityCore({
      bd13: numOrEmpty('gc'+n+'-bd13'),
      olef: numOrEmpty('gc'+n+'-olef'),
      c5:   numOrEmpty('gc'+n+'-c5'),
      vp:   numOrEmpty('gc'+n+'-vp'),
      sul:  numOrEmpty('gc'+n+'-sul'),
      h2o:  _gv('gc'+n+'-h2o'),
      cu:   _gv('gc'+n+'-cu'),
      res:  _gv('gc'+n+'-res'),
      c3vol: numOrEmpty('gc'+n+'-c3h8'),
      c3target: numOrEmpty('mc-tr'+n)
    });
  }

  /* Evaluate from a Tank Log row (used by ENG.saveEdit re-check) */
  function evalRowQuality(r){
    const num = v => {
      const s = String(v == null ? '' : v).trim();
      if(!s) return '';
      const x = parseFloat(s.replace(/,/g,'').replace('<',''));
      return isNaN(x) ? '' : x;
    };
    /* GC %vol may be stored 0–1 fraction or 0–100 % — normalize like calcFromRow */
    let c3 = num(r[18]), bd13 = num(r[21]), c5 = num(r[22]), olef = num(r[23]);
    const gcSum = (num(r[16])||0)+(num(r[17])||0)+(c3||0)+(num(r[19])||0)
                + (num(r[20])||0)+(bd13||0)+(c5||0)+(olef||0);
    if(gcSum > 0 && gcSum < 1.5){
      if(c3   !== '') c3   *= 100;
      if(bd13 !== '') bd13 *= 100;
      if(c5   !== '') c5   *= 100;
      if(olef !== '') olef *= 100;
    }
    return _evalQualityCore({
      bd13, olef, c5,
      vp:  num(r[38]),
      sul: num(r[39]),
      h2o: r[40],
      cu:  r[41],
      res: r[42],
      c3vol: c3,
      c3target: num(r[29])
    });
  }

  /* Render verdict panel under the GC block */
  function _renderQc(n){
    const el = _gid('mc-qc'+n);
    if(!el) return;
    const c3h8 = _gnum('gc'+n+'-c3h8');
    if(!c3h8){ el.className = 'mc-qc'; el.innerHTML = ''; return; }
    const ev = evalQuality(n);
    let html = '';
    if(ev.fails.length){
      html += '<div class="mc-qc-badge mc-qc-fail">✖ QUALITY FAIL</div>'
            + '<div class="mc-qc-list">'+ev.fails.map(f=>'<div>• '+f+'</div>').join('')+'</div>';
    } else {
      html += '<div class="mc-qc-badge mc-qc-pass">✔ QUALITY PASS — đạt tiêu chuẩn</div>';
    }
    if(ev.warns.length){
      html += '<div class="mc-qc-list mc-qc-warn">'+ev.warns.map(w=>'<div>⚠ '+w+'</div>').join('')+'</div>';
    }
    el.className = 'mc-qc on ' + (ev.fails.length ? 'qc-fail' : (ev.warns.length ? 'qc-warn' : 'qc-pass'));
    el.innerHTML = html;
    return ev;
  }
  function qcRecalc(n){
    clearTimeout(_qcTimer[n]);
    _qcTimer[n] = setTimeout(()=>{ _renderQc(n); }, 300);
  }

  /* ============================================================
     v4.55 — COQ FILE IMPORT (.xlsx via SheetJS)
     Reads the lab COQ, validates Lot + Shore Tank against the live
     mix, then fills GC composition, COQ extras, Final Vol (=Quantity),
     Density and Finish time (= Sampling time / Analysis date).
     ============================================================ */
  function importCoqPick(n){
    const inp = _gid('mc-coqfile'+n);
    if(!inp){ toast('❌ File input missing','er'); return; }
    inp.value = '';
    inp.click();
  }

  function _coqNum(v){
    if(v == null) return null;
    const s = String(v).trim();
    if(!s) return null;
    if(/^</.test(s)) return 0;                       // '<0.01' → 0
    const m = s.replace(/,/g,'').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  /* ============================================================
     v4.171 — COQ FORMAT & COMPLETENESS AUDIT
     ------------------------------------------------------------
     Bẫy đã xảy ra (lot 421, 22/09/2026): ô RESULTS của Total Sulfur
     bị lab bỏ trống, parser cũ "quét mò" sang phải và vớ phải cột
     METHOD "ASTM D6667-21" → S = 6667 mg/kg → Quality Fail → nhánh
     lưu Fail chỉ ghi 3 cột GC → mất C2H6 / C5+ / Olefin của cả lô.
     Vì COQ là nguồn số liệu xuất hàng, từ nay:
       • Giá trị BẮT BUỘC nằm ĐÚNG cột RESULTS — không quét sang phải.
       • Thiếu / sai / lạc format 1 ô  ⇒  KHÔNG import gì hết.
       • Hiện bảng liệt kê: tên chỉ tiêu (cột D) · địa chỉ ô · lý do,
         để nhân viên cầm đi làm việc với phòng lab.
     ============================================================ */

  /* (0,6) → 'G1' */
  function _a1(r, c){
    let s = '', n = c + 1;
    while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
    return s + (r + 1);
  }
  function _clean(s){ return String(s == null ? '' : s).replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
  /* chuỗi trông giống tên PHƯƠNG PHÁP thử, không bao giờ là kết quả */
  const _METH_RE = /ASTM|\bISO\b|\bEN\s*\d|\bIP\s*\d|\bD\s?\d{3,}|Calculation|T[ií]nh\s*to[áa]n/i;

  function _parseCoqWorkbook(wb){
    /* ---- chọn sheet chứa 'CERTIFICATE OF QUALITY' ---- */
    let ws = null, wsName = '';
    for(const name of wb.SheetNames){
      const s = wb.Sheets[name];
      const txt = JSON.stringify(XLSX.utils.sheet_to_json(s, {header:1, defval:'', raw:false}) || []);
      if(/CERTIFICATE OF QUALITY/i.test(txt)){ ws = s; wsName = name; break; }
    }
    const A = { sheet:'', hdrRow:-1, resCol:-1, methCol:-1,
                fields:[], missing:[], bad:[], checks:[], fatal:[] };
    if(!ws){
      ws = wb.Sheets[wb.SheetNames[0]]; wsName = wb.SheetNames[0];
      A.fatal.push('Không tìm thấy sheet nào có dòng "CERTIFICATE OF QUALITY" — file có thể không phải phiếu COQ chuẩn (đang đọc tạm sheet "' + wsName + '").');
    }
    A.sheet = wsName;
    const aoa = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});

    /* ---- hàng tiêu đề bảng chỉ tiêu: RESULTS + METHOD ---- */
    for(let i = 0; i < aoa.length; i++){
      const row = aoa[i] || [];
      let rc = -1, mc = -1;
      for(let j = 0; j < row.length; j++){
        const t = String(row[j] || '');
        if(rc < 0 && /RESULTS/i.test(t)) rc = j;
        if(mc < 0 && /METHOD/i.test(t))  mc = j;
      }
      if(rc >= 0){ A.hdrRow = i; A.resCol = rc; A.methCol = mc; break; }
    }
    if(A.resCol < 0){
      A.resCol = 6;
      A.fatal.push('Không tìm thấy cột "RESULTS (Kết quả)" trong bảng chỉ tiêu — file không đúng mẫu COQ của nhà máy. Đang đọc tạm cột G.');
    }
    const resCol = A.resCol;
    const coq = { comp:{}, _audit:A };

    /* ---- dò dòng theo nhãn (chỉ tìm ở phần BÊN TRÁI cột RESULTS) ---- */
    const _findRow = (re)=>{
      for(let i = 0; i < aoa.length; i++){
        const row = aoa[i] || [];
        for(let j = 0; j < Math.min(row.length, resCol); j++){
          if(re.test(String(row[j] || '')))
            return { i, j, row, label:_clean(row[j]) };
        }
      }
      return null;
    };

    /* ---- đọc 1 chỉ tiêu: giá trị BẮT BUỘC ở đúng cột RESULTS ---- */
    const read = (key, ui, re, opt)=>{
      opt = opt || {};
      const ent = { key, ui, label:'', addr:'', raw:'', val:null, state:'ok', why:'' };
      A.fields.push(ent);
      const hit = _findRow(re);
      if(!hit){
        ent.state = 'norow'; ent.label = '—';
        ent.why = 'Không có dòng chỉ tiêu này trong file';
        A.missing.push(ent); return null;
      }
      ent.label = hit.label;
      ent.i     = hit.i;                           /* v4.217 — dòng Excel, để đọc thêm cột %Mol */
      ent.addr  = _a1(hit.i, resCol);
      const raw = hit.row.length > resCol ? hit.row[resCol] : '';
      ent.raw   = (raw === '' || raw == null) ? '' : String(raw);
      if(ent.raw === ''){
        ent.state = 'empty'; ent.why = 'Ô KẾT QUẢ để trống — lab chưa điền';
        A.missing.push(ent); return null;
      }
      if(_METH_RE.test(ent.raw) && !opt.text){
        ent.state = 'meth';
        ent.why   = 'Ô kết quả đang chứa TÊN PHƯƠNG PHÁP — cột bị lệch so với mẫu chuẩn';
        A.bad.push(ent); return null;
      }
      if(opt.text){ ent.val = ent.raw.trim(); return ent.val; }
      if(opt.frac){
        const m = ent.raw.match(/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/);
        if(!m){ ent.state = 'bad'; ent.why = 'Không đúng dạng "a/b" (ví dụ 52.85/47.15)'; A.bad.push(ent); return null; }
        ent.val = m[0].replace(/\s+/g, ''); return ent.val;
      }
      const v = _coqNum(ent.raw);
      if(v == null){ ent.state = 'bad'; ent.why = 'Không đọc được thành con số'; A.bad.push(ent); return null; }
      ent.val = v; return v;
    };

    /* ---- phần đầu phiếu: nhãn ở trái, giá trị ở ô bên phải (có regex chặn) ---- */
    const head = (key, ui, labRe, valRe, fmtHint)=>{
      const ent = { key, ui, label:'', addr:'', raw:'', val:null, state:'ok', why:'' };
      A.fields.push(ent);
      for(let i = 0; i < aoa.length; i++){
        const row = aoa[i] || [];
        for(let j = 0; j < row.length; j++){
          if(!labRe.test(String(row[j] || ''))) continue;
          ent.label = _clean(row[j]);
          /* quét hết phần bên phải nhãn: nhãn phụ tiếng Việt "(Số lô)" và
             dấu ":" nằm xen giữa, nên chỉ kết luận SAU KHI hết hàng */
          const seen = [];
          for(let k = j + 1; k < row.length; k++){
            const v = _clean(row[k]);
            if(!v || v === ':') continue;
            const m = v.match(valRe);
            if(m){ ent.addr = _a1(i, k); ent.raw = v; ent.val = m[0]; return ent.val; }
            if(!/^\(.*\)$/.test(v)) seen.push({ v, k });   // bỏ qua nhãn phụ trong ngoặc
          }
          if(seen.length){
            const last = seen[seen.length - 1];
            ent.addr = _a1(i, last.k); ent.raw = last.v; ent.state = 'bad';
            ent.why = 'Giá trị "' + last.v + '" không đúng dạng ' + fmtHint;
            A.bad.push(ent); return null;
          }
          ent.state = 'empty'; ent.addr = _a1(i, j + 1);
          ent.why = 'Bỏ trống — cần ' + fmtHint;
          A.missing.push(ent); return null;
        }
      }
      ent.state = 'norow'; ent.label = '—';
      ent.why = 'Không có dòng này trong file';
      A.missing.push(ent); return null;
    };

    /* ═══ 1. Phần đầu phiếu ═══ */
    coq.no       = head('no',   'COQ No.',        /No\.?\s*\/\s*S[oố]/i, /[A-Z]{2,5}-\d{4}-\d+/,    'PPT-YYYY-nnn');
    coq.lot      = head('lot',  'Lot No.',        /Lot\s*No/i,          /LPG-\d{4}-\d+/i,          'LPG-YYYY-nnn');
    const qtyS   = head('qty',  'Quantity (m³)',  /Quantity/i,          /[\d.,]+\s*m3/i,           'số + "m3"');
    coq.qty      = qtyS ? _coqNum(qtyS) : null;
    coq.tank     = head('tank', 'Shore Tank No.', /Shore\s*Tank/i,      /TK\s*-?\s*\d{4}/i,        'TK3501 / TK3502');
    coq.sampTime = head('samp', 'Sampling Time',  /Sampling\s*Time/i,   /\d{1,2}:\d{2}/,           'HH:MM') || '';
    coq.anaDate  = head('ana',  'Analysis Date',  /Analysis\s*Date/i,   /\d{1,2}\/\d{1,2}\/\d{2,4}/, 'DD/MM/YYYY') || '';

    /* ═══ 2. Thành phần (%Vol, đúng cột RESULTS) ═══ */
    const c = coq.comp;
    c.c2h6  = read('c2h6',  'Ethane C₂H₆',          /\(C2H6\)/i);
    c.c3h8  = read('c3h8',  'Propane C₃H₈',         /\(C3H8\)/i);
    c.c3h6  = read('c3h6',  'Propylene C₃H₆',       /\(C3H6\)|Propylene/i);
    c.ic4   = read('ic4',   'Iso-Butane i-C₄',      /i-C4H10|Iso\s*-?\s*Butane/i);
    c.nc4   = read('nc4',   'n-Butane n-C₄',        /n-C4H10|n-butane/i);
    const tbu = read('tbu', 'Total Butane C₄H₁₀',   /Total\s*Butane/i);
    c.t2b   = read('t2b',   't-2-Butene',           /\(t-C4H8\)|t-2\s*butene/i);
    c.b1    = read('b1',    '1-Butene',             /\(1-C4H8\)|1-Butene/i);
    c.ib    = read('ib',    'i-Butene',             /\(i-C4H8\)|i-Butene/i);
    c.neoc5 = read('neoc5', 'neo-Pentane',          /\(neo-C5H12\)|Neo\s*-\s*Pentane/i);
    c.ic5   = read('ic5',   'i-Pentane',            /\(i-C5H12\)|Iso\s*-\s*Pentane/i);
    c.nc5   = read('nc5',   'n-Pentane',            /\(n-C5H12\)/i);
    c.bd13  = read('bd13',  '1,3-Butadiene',        /Butadiene/i);
    c.nc6   = read('nc6',   'n-Hexane',             /\(n-C6H14\)|n-Hexane/i);
    c.olef  = read('olef',  'Total Olefin',         /Total\s*-?\s*Olefin/i);
    c.c5    = read('c5',    'C5 & C5+',             /C5\s*&\s*C5\+/i);
    coq.tbu = tbu;
    /* v4.217 — cột %Mol (ngay phải cột %Vol, tiêu đề "% Mol") — CHỈ để đối chiếu, không import */
    coq.mol = null; A.molCol = -1;
    for(let i = 0; i < aoa.length && A.molCol < 0; i++){
      const row = aoa[i] || [];
      if(/%\s*Vol/i.test(String(row[resCol] || '')) && /%\s*Mol/i.test(String(row[resCol + 1] || ''))) A.molCol = resCol + 1;
    }
    if(A.molCol >= 0){
      coq.mol = {};
      A.fields.forEach(e => { if(e.i != null && c.hasOwnProperty(e.key)) coq.mol[e.key] = _coqNum((aoa[e.i] || [])[A.molCol]); });
      if(tbu != null){ const e = A.fields.find(x => x.key === 'tbu'); if(e && e.i != null) coq.mol.tbu = _coqNum((aoa[e.i] || [])[A.molCol]); }
    }
    /* v4.217 — ngày ký cuối phiếu ("HCM City, 28/09/2026") — đối chiếu với Analysis Date */
    coq.signDate = '';
    for(let i = aoa.length - 1; i >= 0 && !coq.signDate; i--){
      (aoa[i] || []).some(v => { const m = String(v || '').match(/City\s*,?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i); if(m){ coq.signDate = m[1]; return true; } return false; });
    }

    /* ═══ 3. Pro/Bu fraction — %Vol trên dòng nhãn, %Wt dòng ngay dưới ═══ */
    coq.frv = ''; coq.frw = '';
    const frHit = _findRow(/Propane\s*\/\s*Butane|Pro\s*\/\s*Bu/i);
    const frRe  = /\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/;
    const frEnt = (key, ui, i)=>{
      const ent = { key, ui, label:(frHit ? frHit.label : '—'), addr:'', raw:'', val:null, state:'ok', why:'' };
      A.fields.push(ent);
      if(!frHit){ ent.state='norow'; ent.why='Không có dòng Propane/Butane Fraction trong file'; A.missing.push(ent); return ''; }
      ent.addr = _a1(i, resCol);
      const raw = (aoa[i] || [])[resCol];
      ent.raw = (raw == null) ? '' : String(raw);
      if(ent.raw === ''){ ent.state='empty'; ent.why='Ô KẾT QUẢ để trống — lab chưa điền'; A.missing.push(ent); return ''; }
      const m = ent.raw.match(frRe);
      if(!m){ ent.state='bad'; ent.why='Không đúng dạng "a/b" (ví dụ 52.85/47.15)'; A.bad.push(ent); return ''; }
      ent.val = m[0].replace(/\s+/g, ''); return ent.val;
    };
    if(frHit){
      coq.frv = frEnt('frv', 'Pro/Bu %Vol', frHit.i);
      coq.frw = frEnt('frw', 'Pro/Bu %Wt',  frHit.i + 1);
    } else {
      coq.frv = frEnt('frv', 'Pro/Bu %Vol', 0);
      coq.frw = frEnt('frw', 'Pro/Bu %Wt',  0);
    }

    /* ═══ 4. Các chỉ tiêu còn lại ═══ */
    coq.vp  = read('vp',  'Vapor Pressure @37.8°C', /Vapor\s*Pressure/i);
    coq.sul = read('sul', 'Total Sulfur',           /Total\s*Sulfur/i);
    coq.h2o = read('h2o', 'Free Water',             /Free\s*Water/i,  {text:true}) || '';
    coq.cu  = read('cu',  'Cu Strip Corrosion',     /Copper\s*Strip/i,{text:true}) || '';
    coq.den = read('den', 'Density @15°C',          /Density\s*at\s*15/i);
    coq.res = read('res', 'Residue',                /Residue/i,       {text:true}) || '';
    coq.mw  = read('mw',  'Molecular Weight',       /Molecular\s*weight|Kh[oố]i\s*l[uư][oợ]ng\s*ph[aâ]n\s*t[uử]/i);

    /* ═══ 5. Đối chiếu nội bộ phiếu ═══ */
    const chk = (name, got, want, tol, note)=>{
      if(got == null || want == null){ return; }
      const d = got - want;
      A.checks.push({ name, got, want, diff:d, ok:Math.abs(d) <= tol, tol, note:note || '' });
    };
    const S = (...xs)=> xs.every(x=> x != null) ? xs.reduce((a,b)=>a+b, 0) : null;
    chk('Σ các cấu tử %Vol = 100',
        S(c.c2h6,c.c3h8,c.c3h6,c.ic4,c.nc4,c.t2b,c.b1,c.ib,c.neoc5,c.ic5,c.nc5,c.bd13,c.nc6), 100, 0.10);
    chk('Total Butane = i-C₄ + n-C₄', tbu, S(c.ic4, c.nc4), 0.02);
    chk('Total Olefin = C₃H₆ + t-2-Butene + 1-Butene + i-Butene', c.olef, S(c.c3h6,c.t2b,c.b1,c.ib), 0.02);
    chk('C5 & C5+ = neo + iso + n-Pentane + n-Hexane', c.c5, S(c.neoc5,c.ic5,c.nc5,c.nc6), 0.02);
    const _sumFr = s =>{
      const m = String(s || '').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) + parseFloat(m[2]) : null;
    };
    chk('Pro/Bu %Vol cộng lại = 100', _sumFr(coq.frv), 100, 0.05);
    chk('Pro/Bu %Wt cộng lại = 100',  _sumFr(coq.frw), 100, 0.05,
        'Cột %Wt là số dùng tính Filled C3/C4 chính thức — sai tổng là KHÔNG tính được');
    if(coq.den != null && (coq.den < 0.45 || coq.den > 0.65))
      A.checks.push({ name:'Density @15°C nằm trong 0.45–0.65 kg/l', got:coq.den, want:null, ok:false, note:'Giá trị bất thường' });
    if(coq.qty != null && !(coq.qty > 0))
      A.checks.push({ name:'Quantity > 0', got:coq.qty, want:null, ok:false, note:'' });

    return coq;
  }

  /* ---- có vấn đề gì không? ---- */
  function _coqBlocked(coq){
    const A = coq && coq._audit;
    if(!A) return false;
    return !!(A.fatal.length || A.missing.length || A.bad.length || A.checks.some(x=> !x.ok));
  }

  /* ---- bảng thông báo chi tiết (chặn import) ---- */
  const _CQR_ST = {
    empty: ['ĐỂ TRỐNG',      'cqr-bad'],
    norow: ['THIẾU DÒNG',    'cqr-bad'],
    meth:  ['LỆCH CỘT',      'cqr-bad'],
    bad:   ['SAI ĐỊNH DẠNG', 'cqr-bad']
  };
  function _coqReport(coq, fname, ctxLot){
    const A = coq._audit || { fields:[], missing:[], bad:[], checks:[], fatal:[] };
    const bad = A.missing.concat(A.bad);
    const badChk = A.checks.filter(x=> !x.ok);
    let bd = _gid('cqr-backdrop');
    if(!bd){
      bd = document.createElement('div');
      bd.id = 'cqr-backdrop'; bd.className = 'cqr-backdrop';
      bd.onclick = e =>{ if(e.target === bd) bd.classList.remove('on'); };
      document.body.appendChild(bd);
    }
    const line = e =>
      '<tr><td class="cqr-nm">' + _escHtml(e.ui) + '</td>' +
      '<td class="cqr-lab">' + _escHtml(e.label || '—') + '</td>' +
      '<td class="cqr-ad">' + _escHtml(e.addr || '—') + '</td>' +
      '<td class="cqr-rw">' + (e.raw === '' ? '<i>(trống)</i>' : _escHtml(e.raw)) + '</td>' +
      '<td class="' + (_CQR_ST[e.state] ? _CQR_ST[e.state][1] : 'cqr-bad') + '">' +
        (_CQR_ST[e.state] ? _CQR_ST[e.state][0] : e.state) + '</td>' +
      '<td class="cqr-wh">' + _escHtml(e.why) + '</td></tr>';
    const nf = v => (v == null ? '—' : (Math.round(v * 1000) / 1000));

    let txt = 'FILE COQ CHƯA DÙNG ĐƯỢC — ' + (fname || '') + '\n' +
              'Lot: ' + (coq.lot || '—') + (ctxLot ? ('  (đang xử lý ' + ctxLot + ')') : '') +
              '   Sheet: ' + (A.sheet || '—') + '\n\n';
    if(A.fatal.length) txt += 'FORMAT: ' + A.fatal.join(' | ') + '\n\n';
    bad.forEach(e=>{ txt += '• ' + e.ui + ' — "' + (e.label || '') + '" — ô ' + (e.addr || '?') + ' : ' + e.why + '\n'; });
    badChk.forEach(x=>{ txt += '• ĐỐI CHIẾU: ' + x.name + ' — đang là ' + nf(x.got) +
      (x.want != null ? (' / lệch ' + nf(x.diff)) : '') + (x.note ? (' — ' + x.note) : '') + '\n'; });

    bd.innerHTML =
      '<div class="cqr-box">' +
        '<div class="cqr-hd">' +
          '<div class="cqr-t1">⛔ FILE COQ CHƯA DÙNG ĐƯỢC — KHÔNG CÓ SỐ NÀO ĐƯỢC NHẬP VÀO APP</div>' +
          '<div class="cqr-t2">' + _escHtml(fname || '') +
            '&nbsp;·&nbsp;Sheet <b>' + _escHtml(A.sheet || '—') + '</b>' +
            '&nbsp;·&nbsp;Lot <b>' + _escHtml(coq.lot || '—') + '</b>' +
            (ctxLot ? ('&nbsp;·&nbsp;đang xử lý <b>' + _escHtml(ctxLot) + '</b>') : '') + '</div>' +
        '</div>' +
        (A.fatal.length
          ? '<div class="cqr-fatal">' + A.fatal.map(t=>'<div>⚠ ' + _escHtml(t) + '</div>').join('') + '</div>'
          : '') +
        (bad.length
          ? '<div class="cqr-sec">① Ô KẾT QUẢ THIẾU HOẶC SAI (' + bad.length + ')</div>' +
            '<table class="cqr-tb"><thead><tr>' +
              '<th>Chỉ tiêu (V4)</th><th>Tên trên phiếu COQ</th><th>Ô</th>' +
              '<th>Đang chứa</th><th>Tình trạng</th><th>Vì sao</th>' +
            '</tr></thead><tbody>' + bad.map(line).join('') + '</tbody></table>'
          : '') +
        (badChk.length
          ? '<div class="cqr-sec">② ĐỐI CHIẾU SỐ TRONG PHIẾU KHÔNG KHỚP (' + badChk.length + ')</div>' +
            '<table class="cqr-tb"><thead><tr><th>Phép đối chiếu</th><th>Đang là</th><th>Phải là</th><th>Lệch</th><th>Ghi chú</th></tr></thead><tbody>' +
            badChk.map(x=>
              '<tr><td class="cqr-nm">' + _escHtml(x.name) + '</td>' +
              '<td class="cqr-bad">' + nf(x.got) + '</td>' +
              '<td>' + (x.want == null ? '—' : nf(x.want)) + '</td>' +
              '<td class="cqr-bad">' + (x.want == null ? '—' : ((x.diff > 0 ? '+' : '') + nf(x.diff))) + '</td>' +
              '<td class="cqr-wh">' + _escHtml(x.note || '') + '</td></tr>').join('') +
            '</tbody></table>'
          : '') +
        '<div class="cqr-note">Phần mềm <b>không tự suy, không tự điền, không tự sửa</b> số của chứng thư. ' +
          'Gửi danh sách dưới đây cho phòng lab, nhận file COQ đã sửa rồi import lại.</div>' +
        '<div class="cqr-sec">③ NỘI DUNG GỬI LAB (bôi đen để copy)</div>' +
        '<textarea class="cqr-txt" readonly onclick="this.select()">' + _escHtml(txt) + '</textarea>' +
        '<div class="cqr-ft"><button type="button" class="btn btn-blue" onclick="MC.closeCoqReport()">ĐÃ HIỂU — ĐÓNG</button></div>' +
      '</div>';
    bd.classList.add('on');
    try{ toast('⛔ COQ thiếu/sai ' + (bad.length + badChk.length) + ' mục — không import','er'); }catch(_){}
  }
  function _closeCoqReport(){ _gid('cqr-backdrop')?.classList.remove('on'); }
  function _fmtCoqDate(s){
    const m = String(s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if(!m) return '';
    const yy = m[3].length === 4 ? m[3].slice(2) : m[3];
    return _p2(parseInt(m[1]))+'/'+_p2(parseInt(m[2]))+'/'+yy;
  }

  /* ══════════════════════════════════════════════════════════════════════
     ⭐⭐⭐ v4.217 — COQ CROSS-CHECK TRƯỚC KHI IMPORT (plausibility)
     ----------------------------------------------------------------------
     v4.171 chỉ chặn file THIẾU / LỆCH CỘT / tổng sai. File "đủ ô, đúng dạng"
     nhưng SỐ SAI (lab gõ nhầm, sửa tay phiếu cũ, dùng lại phiếu lot khác…)
     vẫn lọt. Nay app TỰ TÍNH LẠI theo đúng công thức sheet "dữ liệu thô" của
     lab (ASTM D2598 + bảng %Wt) từ các cấu tử %Vol, rồi đối chiếu:
       ⛔ CRITICAL — làm sai Filled C3/C4: %Wt, Density, Quantity, phiếu trùng
       🟠 MAJOR    — làm đổi Quality / dữ liệu mâu thuẫn: VP, MW, %Mol, %Vol, spec
       🟡 MINOR    — hơi lệch TARGET / ngày tháng / số phiếu
     Có mục nào ⇒ HIỆN BẢNG TRƯỚC KHI IMPORT. CRITICAL/MAJOR phải tick xác nhận
     TỪNG DÒNG mới bấm được "Import anyway". App KHÔNG sửa số của chứng thư.
     Hệ số lấy từ file lab (PPT-2026-433): density = ROUND(Σ v·ρrel,3) + 0.0025;
     VP = MROUND(Σ v·F,5); %Wt C3 = v3·0.5074 / (v3·0.5074 + iC4·0.5629 + nC4·0.5841).
     ══════════════════════════════════════════════════════════════════════ */
  const _CQ_REL = { c2h6:0.35628, c3h8:0.50719, c3h6:0.5226, ic4:0.56283, nc4:0.5842, t2b:0.6103, b1:0.60044,
                    ib:0.60064, neoc5:0.5953, ic5:0.6251, nc5:0.6307, bd13:0.6272, nc6:0.6641 };
  const _CQ_VPF = { c2h6:4213, c3h8:1200, c3h6:1466, ic4:400, nc4:255, t2b:242, b1:328, ib:340,
                    neoc5:152, ic5:40, nc5:6.4, bd13:0, nc6:-67 };
  const _CQ_MW  = { c2h6:30.069, c3h8:44.0956, c3h6:42.0797, ic4:58.12, nc4:58.12, t2b:56.11, b1:56.11, ib:56.11,
                    neoc5:72.15, ic5:72.15, nc5:72.15, bd13:54.09, nc6:86.178 };
  const _CQ_DADD = 0.0025;            /* "giá trị CỘNG" của lab trên density tính */
  const _CQ_TOL = { w3:0.05, v3:0.05, den:0.0015, denCrit:0.003, vp:10, mw:0.1, molSum:0.1, mol:0.3 };
  function _cqCalc(c, over){
    c = Object.assign({}, c || {}, over || {});
    if(c.c3h8 == null || c.ic4 == null || c.nc4 == null) return null;
    let d = 0, vp = 0, nm = {}, nsum = 0;
    Object.keys(_CQ_REL).forEach(k => { const v = +c[k] || 0; d += v * _CQ_REL[k]; vp += v * _CQ_VPF[k];
      nm[k] = v * _CQ_REL[k] / _CQ_MW[k]; nsum += nm[k]; });
    const molFromVol = {}; Object.keys(nm).forEach(k => { molFromVol[k] = nsum ? nm[k] / nsum * 100 : 0; });
    let mwV = 0; Object.keys(molFromVol).forEach(k => { mwV += molFromVol[k] * _CQ_MW[k] / 100; });
    const a = c.c3h8 * 0.5074, b = c.ic4 * 0.5629 + c.nc4 * 0.5841;
    return { den:Math.round(d / 100 * 1000) / 1000 + _CQ_DADD, vp:Math.round(vp / 100 / 5) * 5,
             v3:c.c3h8 / (c.c3h8 + c.ic4 + c.nc4) * 100, w3:a / (a + b) * 100, molFromVol, mwFromVol:mwV };
  }
  function _cqDate(s){
    const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if(!m) return null;
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(y, +m[2] - 1, +m[1]);
  }
  function _cqMin(t){ const m = String(t || '').match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
  function _cqFirst(s){ const m = String(s || '').match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; }
  const _cqF = (v, d) => v == null || isNaN(v) ? '—' : (+v).toFixed(d);
  const _cqSg = (v, d) => (v > 0 ? '+' : '') + (+v).toFixed(d);

  /* ctx = { lotNum, tank:'3501'|'3502', tgtVol, tgtC3, start:'dd/mm/yy', finD, finT, hardCap, rows } */
  function _coqPlaus(coq, ctx){
    ctx = ctx || {};
    const out = [], c = coq.comp || {}, K = _cqCalc(c);
    const add = (lv, name, got, exp, dev, eff) => out.push({ lv, name, got:String(got), exp:String(exp), dev:String(dev || ''), eff:String(eff || '') });
    const qty = coq.qty, den = coq.den, mass = (qty > 0 && den > 0) ? qty * den : null;
    const w3 = _cqFirst(coq.frw), v3 = _cqFirst(coq.frv);
    const tonnes = t => t == null ? '' : '≈ ' + Math.abs(t).toFixed(1) + ' t';

    /* ── ⛔ CRITICAL: số đi thẳng vào Filled C3/C4 ── */
    if(K && w3 != null){
      const d = w3 - K.w3;
      if(Math.abs(d) > _CQ_TOL.w3)
        add('crit', 'Pro/Bu %Wt (C3) vs composition', _cqF(w3, 2) + ' %wt', _cqF(K.w3, 2) + ' %wt (lab formula from C₃H₈ / i-C₄ / n-C₄ %Vol)', _cqSg(d, 2) + ' pt',
            'Filled C3 ⇄ C4 shifted ' + (mass ? tonnes(mass * d / 100) : '') + ' — %Wt is the official split');
    }
    if(K && den != null){
      const d = den - K.den;
      if(Math.abs(d) > _CQ_TOL.denCrit)
        add('crit', 'Density @15°C vs composition', _cqF(den, 4) + ' kg/l', _cqF(K.den, 4) + ' kg/l (Σ %Vol × rel. density + 0.0025, ASTM D2598)', _cqSg(d, 4),
            'Lot mass (Filled C3 + C4) off ' + (qty ? tonnes(qty * d) : ''));
      else if(Math.abs(d) > _CQ_TOL.den)
        add('minor', 'Density @15°C slightly off composition', _cqF(den, 4) + ' kg/l', _cqF(K.den, 4) + ' kg/l', _cqSg(d, 4), 'Lot mass ' + (qty ? tonnes(qty * d) : ''));
    }
    if(qty != null){
      if(ctx.hardCap && qty > ctx.hardCap)
        add('crit', 'Quantity above the 90% tank limit', _cqF(qty, 3) + ' m³', '≤ ' + _cqF(ctx.hardCap, 1) + ' m³', _cqSg(qty - ctx.hardCap, 1) + ' m³', 'Final volume = COQ Quantity → lot mass');
      if(ctx.tgtVol > 0){
        const d = qty - ctx.tgtVol, p = d / ctx.tgtVol * 100;
        if(Math.abs(p) > 5) add('crit', 'Quantity vs TARGET VOL', _cqF(qty, 3) + ' m³', _cqF(ctx.tgtVol, 1) + ' m³ ± 1.5 %', _cqSg(d, 1) + ' m³ (' + _cqSg(p, 1) + ' %)', 'Lot mass ' + (den ? tonnes(d * den) : '') + ' — check the gauged final volume');
        else if(Math.abs(p) > 1.5) add('minor', 'Quantity slightly off TARGET VOL', _cqF(qty, 3) + ' m³', _cqF(ctx.tgtVol, 1) + ' m³ ± 1.5 %', _cqSg(d, 1) + ' m³ (' + _cqSg(p, 1) + ' %)', 'Lot mass ' + (den ? tonnes(d * den) : ''));
      }
    }
    /* phiếu dùng lại: trùng số COQ / trùng nguyên thành phần với lot khác */
    const rows = (ctx.rows || []).filter(r => r && String(r[1] || '').trim());
    const yr = ctx.lotYear || new Date().getFullYear();
    const others = rows.filter(r => { const p = _parseLotNum(r[1]); return !(p && p.num === ctx.lotNum && p.year === yr); });
    const normNo = s => String(s || '').toUpperCase().replace(/\s+/g, '');
    if(coq.no){
      const dup = others.find(r => normNo(r[34]) && normNo(r[34]) === normNo(coq.no));
      if(dup) add('crit', 'COQ No. already used by another lot', coq.no, 'a new number for ' + _lotName(ctx.lotNum), 'on ' + dup[1] + ' (TK-' + String(dup[2] || '').replace(/\D/g, '') + ')', 'Wrong certificate — every figure of another lot would be imported');
    }
    if(c.c3h8 != null && c.ic4 != null && c.nc4 != null){
      const eq = (a, b) => a != null && String(a).trim() !== '' && Math.abs(parseFloat(a) - b) < 0.0005;
      const twin = others.slice().reverse().find(r => eq(r[18], c.c3h8) && eq(r[19], c.ic4) && eq(r[20], c.nc4) && (c.c2h6 == null || eq(r[17], c.c2h6)));
      if(twin) add('crit', 'Composition identical to another lot', 'C₃H₈ ' + _cqF(c.c3h8, 2) + ' · i-C₄ ' + _cqF(c.ic4, 2) + ' · n-C₄ ' + _cqF(c.nc4, 2), 'different analysis for ' + _lotName(ctx.lotNum),
                   'same as ' + twin[1] + ' (TK-' + String(twin[2] || '').replace(/\D/g, '') + ')', 'Certificate of an earlier lot may have been re-used / edited');
    }

    /* ── 🟠 MAJOR: mâu thuẫn trong phiếu / làm đổi Quality ── */
    if(K && v3 != null){
      const d = v3 - K.v3;
      if(Math.abs(d) > _CQ_TOL.v3) add('major', 'Pro/Bu %Vol (C3) vs composition', _cqF(v3, 2) + ' %vol', _cqF(K.v3, 2) + ' %vol (C₃H₈ / (C₃H₈ + Total Butane))', _cqSg(d, 2) + ' pt', 'Certificate is not self-consistent');
    }
    if(K && coq.vp != null){
      const d = coq.vp - K.vp;
      if(Math.abs(d) > _CQ_TOL.vp) add('major', 'Vapor Pressure vs composition', _cqF(coq.vp, 0) + ' kPa', _cqF(K.vp, 0) + ' kPa (ASTM D2598 from %Vol)', _cqSg(d, 0) + ' kPa',
        coq.vp > SPEC.vp && K.vp <= SPEC.vp ? 'Lot would be saved as Quality FAIL (spec ≤ ' + SPEC.vp + ') although the composition passes' : 'Quality verdict');
    }
    if(coq.mw != null && K){
      const mol = coq.mol, hasMol = mol && ['c3h8','ic4','nc4'].every(k => mol[k] != null);
      let mwE = K.mwFromVol, src = 'from %Vol';
      if(hasMol){ mwE = 0; Object.keys(_CQ_MW).forEach(k => { mwE += (+mol[k] || 0) * _CQ_MW[k] / 100; }); src = 'Σ %Mol × molar mass'; }
      const d = coq.mw - mwE;
      if(Math.abs(d) > (hasMol ? _CQ_TOL.mw : 0.5)) add('major', 'Molecular weight vs composition', _cqF(coq.mw, 2), _cqF(mwE, 2) + ' (' + src + ')', _cqSg(d, 2), 'Stored figure wrong (propane 44.1 – butane 58.1)');
    }
    if(coq.mol && K){
      const ks = Object.keys(_CQ_MW).filter(k => coq.mol[k] != null);
      const sum = ks.reduce((a, k) => a + coq.mol[k], 0);
      if(ks.length >= 3 && Math.abs(sum - 100) > _CQ_TOL.molSum) add('major', 'Σ components %Mol = 100', _cqF(sum, 2) + ' %', '100 %', _cqSg(sum - 100, 2), 'Mol column of the certificate is wrong');
      const bad = ['c3h8','ic4','nc4'].filter(k => coq.mol[k] != null && Math.abs(coq.mol[k] - K.molFromVol[k]) > _CQ_TOL.mol);
      if(bad.length) add('major', '%Mol vs %Vol (' + bad.map(k => ({ c3h8:'C₃H₈', ic4:'i-C₄', nc4:'n-C₄' })[k]).join(', ') + ')',
        bad.map(k => _cqF(coq.mol[k], 2)).join(' / ') + ' %mol', bad.map(k => _cqF(K.molFromVol[k], 2)).join(' / ') + ' %mol (converted from %Vol)',
        bad.map(k => _cqSg(coq.mol[k] - K.molFromVol[k], 2)).join(' / '), 'Mol and Vol columns disagree — one of them is wrong');
    }
    const ev = _evalQualityCore({ bd13:c.bd13, olef:c.olef, c5:c.c5, vp:coq.vp, sul:coq.sul, h2o:coq.h2o, cu:coq.cu, res:coq.res });
    ev.fails.forEach(f => add('major', 'Out of spec: ' + f.split(' = ')[0], f.split(' = ')[1] || f, 'within spec (📋 SPEC)', '', 'Lot will be saved as Quality FAIL — confirm with the lab the result is real'));

    /* ── 🟡 MINOR: lệch target / hồ sơ ── */
    if(ctx.tgtC3 > 0 && c.c3h8 != null){
      const d = c.c3h8 - ctx.tgtC3, tol = SPEC.c3tol;
      const rng = t => { const r = _cqCalc(c, { c3h8:t, ic4:(100 - t) * (c.ic4 / ((c.ic4 + c.nc4) || 1)), nc4:(100 - t) * (c.nc4 / ((c.ic4 + c.nc4) || 1)), c2h6:0, c3h6:0, t2b:0, b1:0, ib:0, neoc5:0, ic5:0, nc5:0, bd13:0, nc6:0 }); return r; };
      const lo = rng(ctx.tgtC3 - 1), hi = rng(ctx.tgtC3 + 1);
      const eRange = lo && hi ? ' → %Wt ' + _cqF(lo.w3, 1) + '–' + _cqF(hi.w3, 1) + ', density ' + _cqF(hi.den, 4) + '–' + _cqF(lo.den, 4) : '';
      if(Math.abs(d) > tol) add('major', 'C₃H₈ %Vol far from TARGET C3', _cqF(c.c3h8, 2) + ' %vol', _cqF(ctx.tgtC3, 1) + ' ± 1 %vol' + eRange, _cqSg(d, 2) + ' pt (limit ± ' + tol + ')', 'Mix off plan — check the target / the sample / the tank');
      else if(Math.abs(d) > 1) add('minor', 'C₃H₈ %Vol slightly off TARGET C3', _cqF(c.c3h8, 2) + ' %vol', _cqF(ctx.tgtC3, 1) + ' ± 1 %vol' + eRange, _cqSg(d, 2) + ' pt', 'Mix result differs from plan');
    }
    const lotOfNo = String(coq.no || '').match(/-(\d+)\s*$/), lotOfLot = _parseLotNum(coq.lot);
    if(lotOfNo && lotOfLot && +lotOfNo[1] !== lotOfLot.num)
      add('minor', 'COQ No. and Lot No. numbers differ', coq.no + ' / ' + coq.lot, 'same running number', '', 'Check the certificate belongs to this lot');
    const dA = _cqDate(coq.anaDate), dS = _cqDate(coq.signDate), dSt = _cqDate(ctx.start), dF = _cqDate(ctx.finD) || dSt;
    if(dA && dS && dA.getTime() !== dS.getTime())
      add('minor', 'Analysis Date ≠ date signed on the certificate', coq.anaDate, coq.signDate + ' (signature line)', '', 'Certificate edited? Check with the lab');
    if(dA && dSt && dA < dSt)
      add('major', 'Analysis Date before the lot started', coq.anaDate, '≥ start ' + ctx.start, '', 'Analysis cannot be older than the mix — wrong certificate?');
    else if(dA && dF && (dA - dF) / 864e5 > 3)
      add('minor', 'Analysis Date long after the mix', coq.anaDate, '≤ 3 days after ' + (ctx.finD || ctx.start), '', 'Check the certificate date');
    const mS = _cqMin(coq.sampTime), mF = _cqMin(ctx.finT);
    if(mS != null && mF != null){ let d = Math.abs(mS - mF); d = Math.min(d, 1440 - d);
      if(d > 60) add('minor', 'Sampling Time vs FINISH time', coq.sampTime, ctx.finT + ' ± 60 min', d + ' min', 'FINISH time will be replaced by the sampling time'); }
    const ord = { crit:0, major:1, minor:2 };
    return out.sort((a, b) => ord[a.lv] - ord[b.lv]);
  }

  /* ---- bảng rà soát TRƯỚC KHI IMPORT ---- */
  let _CQV = null;
  function _coqReview(items, coq, fname, ctxLabel, onGo){
    let bd = _gid('cqv-backdrop');
    if(!bd){ bd = document.createElement('div'); bd.id = 'cqv-backdrop'; bd.className = 'cqr-backdrop cqv'; document.body.appendChild(bd); }
    const need = items.filter(x => x.lv !== 'minor').length;
    _CQV = { onGo, need, ok:{} };
    const top = items[0] ? items[0].lv : 'minor';
    const LV = { crit:['⛔ CRITICAL','cqv-crit','Changes Filled C3 / C4'], major:['🟠 MAJOR','cqv-major','Changes Quality / data'], minor:['🟡 MINOR','cqv-minor','Off target / records'] };
    const cnt = k => items.filter(x => x.lv === k).length;
    const e = _escHtml;
    let txt = 'COQ CROSS-CHECK — ' + (coq.no || '') + ' · ' + (coq.lot || '') + ' · ' + (fname || '') + '\n';
    items.filter(x => x.lv !== 'minor').forEach(x => { txt += '• ' + x.name + ': ' + x.got + ' — expected ' + x.exp + (x.dev ? ' (' + x.dev + ')' : '') + '\n'; });
    bd.innerHTML =
      '<div class="cqr-box">' +
        '<div class="cqr-hd cqv-hd-' + top + '"><div class="cqr-t1">' +
          (top === 'crit' ? '⛔ COQ CROSS-CHECK FAILED — REVIEW BEFORE IMPORT' : top === 'major' ? '🟠 COQ HAS ABNORMAL VALUES — REVIEW BEFORE IMPORT' : '🟡 COQ SLIGHTLY OFF TARGET — REVIEW BEFORE IMPORT') + '</div>' +
          '<div class="cqr-t2">' + e(fname || '') + ' · COQ <b>' + e(coq.no || '—') + '</b> · into <b>' + e(ctxLabel || '') + '</b> · ' +
            ['crit','major','minor'].filter(k => cnt(k)).map(k => LV[k][0] + ' ' + cnt(k)).join(' · ') + '</div></div>' +
        '<div class="cqv-note"><b>Nothing has been imported yet.</b> The app re-calculated the certificate from its own %Vol composition (lab formulas) and compared it with the mixing target. ' +
          (need ? 'Tick <b>each</b> ⛔ / 🟠 line after checking it with the lab to enable <b>Import anyway</b>. ' : '') + 'The app never changes a figure of the certificate.</div>' +
        '<table class="cqr-tb cqv-tb"><thead><tr><th>✓</th><th>Level</th><th>Check</th><th>In COQ</th><th>Expected / range</th><th>Deviation</th><th>Effect</th></tr></thead><tbody>' +
        items.map((x, i) => '<tr class="' + LV[x.lv][1] + '">' +
          '<td class="cqv-ck">' + (x.lv === 'minor' ? '—' : '<input type="checkbox" onchange="MC._cqvTick(' + i + ',this.checked)">') + '</td>' +
          '<td class="cqv-lv" title="' + LV[x.lv][2] + '">' + LV[x.lv][0] + '</td><td class="cqr-nm">' + e(x.name) + '</td>' +
          '<td class="cqv-got">' + e(x.got) + '</td><td>' + e(x.exp) + '</td><td class="cqv-dev">' + e(x.dev) + '</td><td class="cqr-wh">' + e(x.eff) + '</td></tr>').join('') +
        '</tbody></table>' +
        (need ? '<div class="cqr-sec">TEXT FOR THE LAB (click to select, then copy)</div><textarea class="cqr-txt cqv-txt" readonly onclick="this.select()">' + e(txt) + '</textarea>' : '') +
        '<div class="cqr-ft"><button type="button" class="btn btn-blue" onclick="MC._cqvClose()">✕ Cancel — do not import</button>' +
          '<button type="button" id="cqv-go" class="btn ' + (need ? 'btn-red' : 'btn-green') + '" onclick="MC._cqvGo()"' + (need ? ' disabled' : '') + '>' +
          (need ? 'Import anyway (0/' + need + ' confirmed)' : '✓ Import') + '</button></div>' +
      '</div>';
    bd.classList.add('on');
    try{ toast((top === 'crit' ? '⛔ ' : '⚠ ') + items.length + ' COQ check(s) to review — not imported yet', top === 'minor' ? 'warn' : 'er'); }catch(_){}
  }
  function _cqvTick(i, on){
    if(!_CQV) return; if(on) _CQV.ok[i] = 1; else delete _CQV.ok[i];
    const n = Object.keys(_CQV.ok).length, b = _gid('cqv-go'); if(!b) return;
    b.disabled = n < _CQV.need; b.textContent = 'Import anyway (' + n + '/' + _CQV.need + ' confirmed)';
  }
  function _cqvClose(){ _gid('cqv-backdrop')?.classList.remove('on'); if(_CQV) toast('COQ not imported', 'warn'); _CQV = null; }
  function _cqvGo(){
    const V = _CQV; if(!V || Object.keys(V.ok).length < V.need) return;
    _CQV = null; _gid('cqv-backdrop')?.classList.remove('on');
    try{ V.onGo(); }catch(e){ console.warn('[MC] cqv go', e); }
  }
  function _cqCtxPanel(n, lotNum, tk){
    return { lotNum, tank:tk, tgtVol:_gnum('mc-tv'+n), tgtC3:_gnum('mc-tr'+n), start:_gv('mc-sd'+n), finD:_gv('mc-fd'+n), finT:_gv('mc-f'+n),
             hardCap:_mcHardCap(), rows:(typeof ENG !== 'undefined' && ENG.ROWS) ? ENG.ROWS : [] };
  }

  function coqFileChosen(n, inputEl){
    const f = inputEl && inputEl.files && inputEl.files[0];
    if(!f) return;
    if(typeof XLSX === 'undefined'){ toast('❌ XLSX library not loaded','er'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      let coq;
      try{
        const wb = XLSX.read(e.target.result, {type:'array'});
        coq = _parseCoqWorkbook(wb);
      }catch(err){
        console.warn('[MC] COQ parse', err);
        toast('❌ Cannot read COQ file: '+err.message,'er');
        return;
      }
      _applyCoq(n, coq, f.name);
    };
    reader.onerror = ()=> toast('❌ Cannot read file','er');
    reader.readAsArrayBuffer(f);
  }

  function _applyCoq(n, coq, fname){
    const tk = n==='1' ? '3501' : '3502';
    /* ── 1. Lot check — mismatch → warn & ABORT (no data written) ── */
    if(!coq.lot){
      alert('⚠ KHÔNG TÌM THẤY SỐ LOT trong file COQ\n\nFile: '+fname+'\nKiểm tra lại file trước khi import.');
      return;
    }
    const coqLot = _parseLotNum(coq.lot);
    const curNum = parseInt(_gv('mc-l'+n)) || 0;
    if(!curNum){
      /* v4.217 — ▶START tự cấp số lot (lot lớn nhất + 1) — không bắt người dùng gõ lot */
      const yr0 = new Date().getFullYear();
      let mx = 0; ((typeof ENG !== 'undefined' && ENG.ROWS) || []).forEach(r => { const p = _parseLotNum(r[1]); if(p && p.year === yr0 && p.num > mx) mx = p.num; });
      const oth = MIXING_LOT[n === '1' ? '2' : '1'] || 0; if(oth > mx) mx = oth;
      const nxt = mx + 1, cl = _parseLotNum(coq.lot);
      alert('⚠ TK-'+tk+' IS NOT MIXING YET\n\n'+
            'COQ lot: '+coq.lot+'\n'+
            'Next lot ▶START will assign: '+_lotName(nxt)+(cl && cl.num === nxt ? '  ✓ matches' : '  ✗ does not match the COQ')+'\n\n'+
            'COQ can only be imported into a running lot. Press ▶START on TK-'+tk+' — the app assigns the lot number automatically — then import the COQ again.'+
            (cl && cl.num !== nxt ? '\n\nThe COQ is for another lot: open that lot in 📒 Tank Log ▸ ✏ edit ▸ IMPORT COQ instead.' : ''));
      return;
    }
    const curYear = new Date().getFullYear();
    if(!coqLot || coqLot.num !== curNum || coqLot.year !== curYear){
      alert('❌ SỐ LOT KHÔNG KHỚP — DỮ LIỆU KHÔNG ĐƯỢC IMPORT\n\n'+
            '• COQ file:   '+coq.lot+'\n'+
            '• Đang mix:  '+_lotName(curNum)+' (TK-'+tk+')\n\n'+
            'Nhân viên có thể đã chọn sai file. Kiểm tra lại.');
      toast('❌ COQ Lot '+coq.lot+' ≠ Lot đang mix — không import','er');
      return;
    }
    /* ── 2. Shore-tank check ── */
    if(coq.tank){
      const coqTk = String(coq.tank).replace(/[^\d]/g,'');
      if(coqTk && coqTk !== tk){
        alert('❌ SAI BỒN — DỮ LIỆU KHÔNG ĐƯỢC IMPORT\n\n'+
              '• COQ file:  TK'+coqTk+'\n'+
              '• Panel này: TK-'+tk+'\n\n'+
              'Import file này vào đúng panel TK'+coqTk+'.');
        return;
      }
    }
    /* ── 2b. v4.171 — RÀ SOÁT FORMAT & ĐỘ ĐẦY ĐỦ CỦA FILE COQ ──
       Thiếu/sai bất kỳ ô nào ⇒ KHÔNG ghi một số nào vào panel. */
    if(_coqBlocked(coq)){ _coqReport(coq, fname, _lotName(curNum) + ' · TK-' + tk); return; }
    /* ── 2c. v4.217 — ĐỐI CHIẾU SỐ (tự tính lại từ thành phần + target) ──
       Có bất thường ⇒ bảng rà soát; ⛔/🟠 phải tick từng dòng mới import được. */
    if(!coq._plausOk){
      const items = _coqPlaus(coq, _cqCtxPanel(n, curNum, tk));
      if(items.length){
        _coqReview(items, coq, fname, _lotName(curNum) + ' · TK-' + tk, () => {
          coq._plausOk = true;
          const hard = items.filter(x => x.lv !== 'minor');
          if(hard.length) _mlog('COQ-OVR', n, (coq.no || '') + ' ' + hard.map(x => x.name + ' ' + x.got).join(' | '));
          _applyCoq(n, coq, fname);
        });
        return;
      }
    }
    /* ── 3. Fill GC composition (calc cells) ── */
    const setV = (id, v, dec)=>{
      const el = _gid(id);
      if(!el) return;
      if(v == null || v === ''){ return; }
      el.value = (typeof v === 'number') ? String(parseFloat(v.toFixed(dec == null ? 4 : dec))) : String(v);
    };
    const c = coq.comp;
    const el = _gid('gc'+n+'-ch4'); if(el) el.value = '';   // COQ has no CH4 line
    setV('gc'+n+'-c2h6', c.c2h6);
    setV('gc'+n+'-c3h8', c.c3h8);
    setV('gc'+n+'-ic4',  c.ic4);
    setV('gc'+n+'-nc4',  c.nc4);
    setV('gc'+n+'-bd13', c.bd13);
    setV('gc'+n+'-c5',   c.c5);
    setV('gc'+n+'-olef', c.olef);
    /* ── 4. COQ extras ── */
    setV('gc'+n+'-coqno', coq.no || '');
    setV('gc'+n+'-c3h6', c.c3h6);
    setV('gc'+n+'-vp',   coq.vp, 0);
    setV('gc'+n+'-sul',  coq.sul, 2);
    setV('gc'+n+'-h2o',  coq.h2o);
    setV('gc'+n+'-cu',   coq.cu);
    setV('gc'+n+'-res',  coq.res);
    setV('gc'+n+'-mw',   coq.mw, 2);
    /* v4.55.1 — Pro/Bu fraction + minor components */
    setV('gc'+n+'-frv',  coq.frv);
    setV('gc'+n+'-frw',  coq.frw);
    setV('gc'+n+'-t2b',  c.t2b);
    setV('gc'+n+'-b1',   c.b1);
    setV('gc'+n+'-ib',   c.ib);
    setV('gc'+n+'-neoc5',c.neoc5);
    setV('gc'+n+'-ic5',  c.ic5);
    setV('gc'+n+'-nc5',  c.nc5);
    setV('gc'+n+'-nc6',  c.nc6);
    /* ── 5. Quantity = Final Vol · Density@15 ── */
    if(coq.qty) setV('gc'+n+'-fvol', coq.qty, 3);
    if(coq.den) setV('gc'+n+'-den',  coq.den, 4);
    /* ── 6. Sampling time + Analysis date = FINISH time ── */
    const anaFmt = _fmtCoqDate(coq.anaDate);
    if(coq.sampTime){ const e = _gid('mc-f'+n);  if(e) e.value = coq.sampTime; }
    if(anaFmt){       const e = _gid('mc-fd'+n); if(e) e.value = anaFmt; }
    CQM[n] = { no: coq.no || '', sampTime: coq.sampTime || '', anaDate: anaFmt };
    /* ── 7. Recalc + verdict ── */
    try{ gcSumInline(n); }catch(_){}
    _gcSilent = true;
    try{ gcCalcInline(n); }catch(_){}
    _gcSilent = false;
    const ev = _renderQc(n);
    _renderStatus(n);
    const vTxt = ev ? (ev.fails.length ? '✖ FAIL ('+ev.fails.length+' chỉ tiêu)' : '✔ PASS') : '';
    toast('📄 Import COQ '+(coq.no||'')+' → TK-'+tk+' · '+coq.lot+' '+vTxt,
          ev && ev.fails.length ? 'er' : 'ok');
    if(ev && ev.warns.length) setTimeout(()=>toast('⚠ '+ev.warns[0],'warn'), 600);
    /* v4.87 — KIỂM TRA NGAY: đủ dữ liệu để ra C3/C4 theo COQ chưa, và tổng
       %Wt có bằng 100 không. Báo bằng hộp thoại để nhân viên không bỏ sót. */
    try{ altCalc(n, true); }catch(_){}
    setTimeout(()=>{ try{ _coqAlert(n, 'IMPORT COQ ' + (coq.no || '')); }catch(_){} }, 120);
  }

  /* ---------- Settings modal ---------- */
  function openSettings(){
    const c = { c3l:MC_D.c3l, c4l:MC_D.c4l, c3v:MC_D.c3v, c4v:MC_D.c4v,
                tv:MC_TV, r:MC_TANK_R,
                odoPpm:MC_ODO.ppm, odoRef:MC_ODO.ref, odoBd:MC_ODO.bd };
    const fields = ['c3l','c4l','c3v','c4v','tv','r','odoPpm','odoRef','odoBd'];
    const idMap = { c3l:'mc-cfg-c3l', c4l:'mc-cfg-c4l', c3v:'mc-cfg-c3v', c4v:'mc-cfg-c4v',
                    tv:'mc-cfg-tv', r:'mc-cfg-r', odoPpm:'mc-cfg-odo-ppm',
                    odoRef:'mc-cfg-odo-ref', odoBd:'mc-cfg-odo-bd' };
    fields.forEach(k=>{ const e = _gid(idMap[k]); if(e) e.value = c[k]; });
    _gid('mc-cfg-backdrop')?.classList.add('on');
  }
  function closeSettings(){ _gid('mc-cfg-backdrop')?.classList.remove('on'); }
  function saveSettings(){
    const idMap = { c3l:'mc-cfg-c3l', c4l:'mc-cfg-c4l', c3v:'mc-cfg-c3v', c4v:'mc-cfg-c4v',
                    tv:'mc-cfg-tv', r:'mc-cfg-r', odoPpm:'mc-cfg-odo-ppm',
                    odoRef:'mc-cfg-odo-ref', odoBd:'mc-cfg-odo-bd' };
    const c = {};
    Object.keys(idMap).forEach(k=>{
      const v = parseFloat(_gv(idMap[k]));
      c[k] = isNaN(v) ? DEF[k] : v;
    });
    _applyCfg(c);
    _saveCfg(c);
    /* v4.79 (R7) — đẩy lên Firebase cho mọi máy dùng chung */
    if(_cfgFbRef){
      _cfgSelfPush++;
      _cfgFbRef.set(c).catch(e=>{ _cfgSelfPush = Math.max(0,_cfgSelfPush-1); console.warn('[MC] cfg push', e); });
      _mlog('CFG', '1', 'tv='+c.tv+' r='+c.r+' c3l='+c.c3l+' c4l='+c.c4l+' odoRef='+c.odoRef+' odoBd='+c.odoBd);
    }
    closeSettings();
    toast('⚙️ Đã lưu hằng số Mix Calculator — đồng bộ cho tất cả máy','ok');
    /* Re-run any visible calculations to reflect new constants */
    ['1','2'].forEach(n=>{
      if(ST[n] !== 'idle'){
        _calcSilent = true; _calcOne(n); _calcSilent = false;
        const gcRes = _gid('mc-gcres'+n);
        if(gcRes && gcRes.classList.contains('on')){ _gcSilent = true; gcCalcInline(n); _gcSilent = false; }
      }
    });
  }
  async function resetSettings(){
    if(!await UIDLG.ask('Reset all Mix Calculator constants to defaults?\n\n(C3/C4 densities, tank radius, max volume, odorant constants)\n\n⚠ Thay đổi này áp dụng cho TẤT CẢ máy.')) return;
    _applyCfg(DEF);
    _saveCfg(DEF);
    if(_cfgFbRef){ _cfgSelfPush++; _cfgFbRef.set(DEF).catch(()=>{ _cfgSelfPush = Math.max(0,_cfgSelfPush-1); }); }
    _mlog('CFG', '1', 'reset về mặc định');
    openSettings();    // re-populate the form with defaults
    toast('↺ Constants reset to defaults','ok');
  }

  /* ---------- refresh() — called when user navigates to the Mix Cal sub-tab ---------- */
  function refresh(){
    ['1','2'].forEach(n=>{
      _autoFillCr(n);
      _altSyncLock(n);
      _autoFillIcq(n);          /* v4.85.1 — trạng thái ĐẦU của cách 2 cũng AUTO */
      _renderStatus(n);
    });
    updateLotNames();
  }

  /* ---------- init: connect Firebase listener for mixing-state ---------- */
  let _wbT = null;
  function _wbHook(){
    const pg = document.getElementById('eng-pg-mixcal');
    if(!pg || pg._wbHooked) return; pg._wbHooked = true;
    pg.addEventListener('input', () => { clearTimeout(_wbT); _wbT = setTimeout(() => { _renderWarnbar('1'); _renderWarnbar('2'); }, 300); });
  }
  function init(){
    try{ _wbHook(); }catch(_){}
    /* No localStorage state cache for in-progress calc — spec says calc on RAM,
       only mixing-state goes to Firebase. */
    try{
      if(typeof firebase !== 'undefined'){
        _fbRef = firebase.database().ref('eng_mix_state');
        _fbRef.on('child_added',   _onRemoteMixingState);
        _fbRef.on('child_changed', _onRemoteMixingState);
        _fbRef.on('child_removed', snap=>{
          if(_suppressEcho > 0) return;
          const key = snap.key;
          if(key !== 'tk1' && key !== 'tk2') return;
          _remoteState[key] = null;
          const n = key === 'tk1' ? '1' : '2';
          if(ST[n] === 'mixing'){
            ST[n] = 'calc';
            MIXING_LOT[n] = 0;
            _renderStatus(n);
          }
        });
      }
    }catch(e){ console.warn('[MC] FB init', e); }
    /* v4.55 — COQ spec table: localStorage fallback + Firebase sync */
    _loadSpecLocal();
    _initSpecFb();
    /* v4.79 (R7) — hằng số Mix Calculator dùng chung mọi máy */
    _initCfgFb();
    /* Initial UI sync */
    refresh();
    console.log('[MC] ✅ Init OK · Mix Calculator ready');
  }

  /* ---------- Public: resume a Pending Tank Log row into the inline GC -----
     Caller passes a 34-col row snapshot (NOT a live reference) from
     ENG.ROWS[i]. We pick the tank from r[2], switch to the Mix Cal
     sub-tab, set ST='calc' (so everything stays editable), prefill
     all Lot / IV / TV / TR / CR / Start / Finish / GC / Final Vol /
     Density fields, then scroll the inline GC into view and focus
     the first GC input. When the operator finishes GC and presses
     💾 SAVE PASS, _saveToTankLog → ENG.upsertRow finds the existing
     row by Lot|Tank (lot number match, year-tolerant via
     findRowByLotTank) and updates it in place — same rid, one child
     write. */
  function _fmtRowDate(raw){
    const s = String(raw||'').trim(); if(!s) return '';
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return m[3]+'/'+m[2]+'/'+m[1].slice(2);
    if(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return s.replace(/-/g,'/');
    return s;
  }
  function _fmtRowTime(raw){
    let s = String(raw||'').trim(); if(!s) return '';
    if(/^\d{1,2}$/.test(s)) s = s.padStart(2,'0')+':00';
    return s;
  }
  function _numStr(v){
    const x = parseFloat(String(v||'').replace(/,/g,''));
    return isNaN(x) ? '' : String(x);
  }

  async function openGc(rowSnap){
    if(!rowSnap || !rowSnap[2]){ toast('⚠ Invalid row — missing tank','er'); return; }
    const tkStr = String(rowSnap[2]||'');
    const n = tkStr.includes('3501') ? '1' : (tkStr.includes('3502') ? '2' : null);
    if(!n){ toast('⚠ Unknown tank: '+tkStr,'er'); return; }

    const rowLotNum = (function(){
      const p = _parseLotNum(rowSnap[1]);
      return p ? p.num : 0;
    })();

    /* If the SAME tank is mixing a different lot, ask before clobbering */
    if(ST[n] === 'mixing' && MIXING_LOT[n] && rowLotNum && MIXING_LOT[n] !== rowLotNum){
      if(!await UIDLG.ask('⚠ TK-'+(n==='1'?'3501':'3502')+' is currently MIXING Lot '+MIXING_LOT[n]+
                  '\n\nLoading Lot '+rowLotNum+' for GC will overwrite the live mix state.\n\nProceed?')){
        return;
      }
      /* user said yes — clear the mixing FB state for this tank */
      _clearMixingFb(n);
    }

    /* Switch sub-tab to Mix Cal */
    if(typeof engSwitchTab === 'function'){
      try{ engSwitchTab('mixcal'); }catch(_){}
    }

    /* Reset to 'calc' state so all inputs remain editable */
    ST[n] = 'calc';
    MIXING_LOT[n] = rowLotNum || 0;

    /* Prefill identity / mix inputs from the row */
    const _set = (id, val) => {
      const el = _gid(id);
      if(el && val !== null && val !== undefined && val !== '') el.value = val;
    };
    OVER_WARN[n] = false; OVER_HARD[n] = false; _overAsked[n] = null; _planLinkClear(n);   /* v4.81 */
    _set('mc-l'+n,  rowLotNum || '');
    _set('mc-iv'+n, _numStr(rowSnap[10]));
    _set('mc-tv'+n, _numStr(rowSnap[30]) || '570');
    _set('mc-tr'+n, _numStr(rowSnap[29]) || '55');
    _set('mc-cr'+n, _numStr(rowSnap[11]));
    _set('mc-sd'+n, _fmtRowDate(rowSnap[3]));
    _set('mc-s'+n,  _fmtRowTime(rowSnap[4]));
    _set('mc-fd'+n, _fmtRowDate(rowSnap[3]));
    _set('mc-f'+n,  _fmtRowTime(rowSnap[5]));

    /* Force CR mode to MANUAL — we explicitly supplied a value from the row */
    CR_MODE[n] = 'manual';
    const crEl = _gid('mc-cr'+n);
    if(crEl){ crEl.readOnly = false; crEl.placeholder = ''; }
    const crmBtn = _gid('mc-crm'+n);
    if(crmBtn){ crmBtn.textContent = 'MANUAL'; crmBtn.classList.add('manual'); }

    /* Prefill GC inputs */
    _set('gc'+n+'-c2h6', _numStr(rowSnap[17]));
    _set('gc'+n+'-c3h8', _numStr(rowSnap[18]));
    _set('gc'+n+'-ic4',  _numStr(rowSnap[19]));
    _set('gc'+n+'-nc4',  _numStr(rowSnap[20]));
    _set('gc'+n+'-c5',   _numStr(rowSnap[22]));
    _set('gc'+n+'-olef', _numStr(rowSnap[23]));
    _set('gc'+n+'-temp', _numStr(rowSnap[31]));
    _set('gc'+n+'-pres', _numStr(rowSnap[32]));
    _set('gc'+n+'-fvol', _numStr(rowSnap[6]));
    _set('gc'+n+'-den',  _numStr(rowSnap[33]));

    /* v4.55 — COQ columns */
    _set('gc'+n+'-coqno', rowSnap[34]);
    _set('gc'+n+'-c3h6', _numStr(rowSnap[37]));
    _set('gc'+n+'-vp',   _numStr(rowSnap[38]));
    _set('gc'+n+'-sul',  _numStr(rowSnap[39]));
    _set('gc'+n+'-h2o',  rowSnap[40]);
    _set('gc'+n+'-cu',   rowSnap[41]);
    _set('gc'+n+'-res',  rowSnap[42]);
    _set('gc'+n+'-mw',   _numStr(rowSnap[43]));
    _set('gc'+n+'-frv',  rowSnap[44]);
    _set('gc'+n+'-frw',  rowSnap[45]);
    _set('gc'+n+'-t2b',  _numStr(rowSnap[46]));
    _set('gc'+n+'-b1',   _numStr(rowSnap[47]));
    _set('gc'+n+'-ib',   _numStr(rowSnap[48]));
    _set('gc'+n+'-neoc5',_numStr(rowSnap[49]));
    _set('gc'+n+'-ic5',  _numStr(rowSnap[50]));
    _set('gc'+n+'-nc5',  _numStr(rowSnap[51]));
    _set('gc'+n+'-nc6',  _numStr(rowSnap[52]));
    CQM[n] = { no:String(rowSnap[34]||''), sampTime:String(rowSnap[35]||''), anaDate:String(rowSnap[36]||'') };
    try{ qcRecalc(n); }catch(_){}
    /* v4.85 — nạp lại ô nhập của 2 cách tính bổ sung; nếu lot chưa có trạng
       thái ĐẦU thì tự dò COQ của lot Pass gần nhất cùng bồn. */
    try{ _altRestore(n, rowSnap); }
    catch(e){ console.warn('[MC] altRestore', e); }

    /* Refresh derived UI */
    try{ updateLotNames(); }catch(_){}
    _renderStatus(n);
    try{ gcSumInline(n); }catch(_){}
    try{ autoCalc(n); }catch(_){}      // recompute STOP-C3/STOP-C4 etc.

    /* Scroll to + focus the GC section */
    setTimeout(()=>{
      const gc = _gid('mc-gc-inline'+n);
      if(gc){
        gc.scrollIntoView({ behavior:'smooth', block:'center' });
        const firstGc = gc.querySelector('input[type="text"]');
        if(firstGc){ firstGc.focus(); firstGc.select?.(); }
      }
    }, 300);

    const lotDisp = String(rowSnap[1]||'') || ('Lot '+rowLotNum);
    toast('🧪 Resumed '+(n==='1'?'TK-3501':'TK-3502')+' · '+lotDisp+' — enter GC + 🧮 CALC + 💾 SAVE PASS','ok');
  }

  /* ---------- Public: re-calc Filled C3/C4/LPG from a Tank Log row -----
     Reads cols [17]C2H6 [18]C3H8 [19]iC4 [20]nC4 [22]C5 [23]Olefin for GC,
     [6] final vol, [33] density, [10] init vol, [11] current C3,
     [29] target C3%, [30] target vol (used for Odorant BD only).
     Pure function: does NOT write to the row. Returns
       { fC3, fC4, fLPG, rC3, rC4, qty, tC3, tC4, odoBD, error? }.
     Caller decides which columns to update — keeps the recompute side-
     effect-free so it can be reused by an audit / preview later. */
  function calcFromRow(r){
    if(!r) return { error:'Row missing' };
    const _num = v => { const x = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(x) ? 0 : x; };
    let c2h6 = _num(r[17]), c3h8 = _num(r[18]);
    let ic4  = _num(r[19]), nc4  = _num(r[20]);
    let c5   = _num(r[22]), olef = _num(r[23]);
    let ch4  = _num(r[16]), bd13 = _num(r[21]);   // CH₄ / 1,3-BD now stored in TL row
    const fvol   = _num(r[6]);
    const lpgDen = _num(r[33]);
    if(!c3h8 && !ic4 && !nc4) return { error:'Missing GC data (C₃H₈ / i-C₄ / n-C₄)' };
    if(!fvol)                 return { error:'Missing Final Volume (col 6)' };
    /* Normalize 0–100 % entries down to 0–1 fractions */
    const sum = ch4 + c2h6 + c3h8 + ic4 + nc4 + bd13 + c5 + olef;
    if(sum > 1.5){ ch4/=100; c2h6/=100; c3h8/=100; ic4/=100; nc4/=100; bd13/=100; c5/=100; olef/=100; }
    const sL = c3h8 + ic4 + nc4;
    const sI = ch4 + c2h6 + bd13 + c5 + olef;
    /* Redistribute impurities proportionally onto C3 / C4 (V406 model) */
    const rC3 = c3h8 + (sL > 0 ? (c3h8/sL)*sI : 0);
    const rC4 = (ic4 + nc4) + (sL > 0 ? ((ic4+nc4)/sL)*sI : 0);
    const wC3 = rC3*fvol*MC_D.c3l, wC4 = rC4*fvol*MC_D.c4l;
    const vwC3 = (MC_TV - fvol)*rC3*MC_D.c3v;
    const vwC4 = (MC_TV - fvol)*rC4*MC_D.c4v;
    const tC3 = wC3 + vwC3, tC4 = wC4 + vwC4;
    const iv  = _num(r[10]);
    const crRaw = _num(r[11]);
    const crd = crRaw > 1 ? crRaw / 100 : crRaw;
    const bC3 = crd*iv*MC_D.c3l + (MC_TV - iv)*crd*MC_D.c3v;
    const bC4 = (1-crd)*iv*MC_D.c4l + (MC_TV - iv)*(1-crd)*MC_D.c4v;
    const fC3 = parseFloat((tC3 - bC3).toFixed(3));
    const fC4 = parseFloat((tC4 - bC4).toFixed(3));
    const fLPG= parseFloat((fC3 + fC4).toFixed(3));
    const qty = lpgDen > 0 ? fvol*lpgDen : fvol*(rC3*MC_D.c3l + rC4*MC_D.c4l);
    /* Odorant BD — only when form has init vol / target vol / target C3 / current C3 */
    let odoBD = 0;
    const trRaw = _num(r[29]);
    const tv    = _num(r[30]);
    if(iv && tv && trRaw && crRaw){
      const _tr = trRaw > 1 ? trRaw/100 : trRaw;
      const aC3o = _tr*tv - crd*iv;
      const aC4o = (1-_tr)*tv - (1-crd)*iv;
      const odoSET = Math.round((aC3o + aC4o) / MC_ODO.ref * 100) * 1000;
      odoBD = parseFloat((MC_ODO.bd * odoSET).toFixed(2));
    }
    return { fC3, fC4, fLPG, rC3, rC4, qty, tC3, tC4, odoBD };
  }

  /* ═══════════════════════════════════════════════════════════════
     PHƯƠNG PHÁP ② — TÍNH FILLED C3/C4 THEO COQ
     ───────────────────────────────────────────────────────────────
     v4.86 — GỠ BỎ phương pháp tra bảng density (cũ là cách ②).
     Từ bản này chỉ còn HAI phương pháp:
       ① GC   — thành phần GC × hằng số density trong Settings, có kể
                 cả phần hơi trong không gian trống của bồn. Cột [13]/[14].
       ② COQ  — cân bằng khối lượng theo chứng thư COQ. Cột [66]/[67].

     CÁCH TÍNH THEO COQ
       Coi bồn là hỗn hợp đồng nhất ở 2 thời điểm:
         M_đầu  = INIT VOL  × ρ_COQ(đầu)    → tách theo %wt C3/C4 đầu
         M_cuối = FINAL VOL × ρ_COQ(cuối)   → tách theo %wt C3/C4 cuối
       Filled C3 = M_cuối×w3_cuối − M_đầu×w3_đầu
       Filled C4 = M_cuối×w4_cuối − M_đầu×w4_đầu   (w4 = 1 − w3)
       Trạng thái ĐẦU lấy từ COQ của lot Pass gần nhất CÙNG BỒN (sửa
       tay được), trạng thái CUỐI lấy từ COQ của chính lot đang mix.

     KHÔNG ghi đè cột Filled C3/C4 gốc [13]/[14]; kết quả COQ lưu riêng
     ở [66]/[67] để đối chiếu, và người dùng chọn con số nào được gửi
     sang Scale bằng cột phương pháp [68] ('gc' | 'coq').

     ⚠ Cột [56]–[62] (Mid Vol, C3/C4 temp-pres, Filled theo bảng density)
     GIỮ NGUYÊN trong schema để dữ liệu lịch sử không bị lệch cột, nhưng
     phần mềm KHÔNG còn đọc/ghi/hiển thị chúng nữa.
     ═══════════════════════════════════════════════════════════════ */

  /* Cột Tank Log mở rộng — PHẢI khớp eng.js.
     56–62 = RETIRED (bảng density), giữ chỗ để không lệch cột. */
  const A_MID = 56, A_T3 = 57, A_P3 = 58, A_T4 = 59, A_P4 = 60,
        A_DC3 = 61, A_DC4 = 62,          /* RETIRED v4.86 */
        A_IDEN = 63, A_IW3 = 64, A_ISRC = 65,
        A_QC3 = 66, A_QC4 = 67, A_MTH = 68;

  const ALTR = { '1':null, '2':null };     // kết quả cách COQ theo tank
  const _altTimer = { '1':null, '2':null };
  /* v4.85.1 — trạng thái ĐẦU của cách 2 chạy AUTO giống ô CURRENT C3 %:
     mặc định tự lấy COQ của lot Pass gần nhất cùng bồn, người dùng bấm badge
     để chuyển MANUAL rồi mới sửa tay được. */
  const ICQ_MODE = { '1':'auto', '2':'auto' };
  /* Phương pháp sẽ gửi sang Scale, chọn ngay trên bảng so sánh của Tank Mix */
  const NMTH = { '1':'gc', '2':'gc' };
  /* người dùng đã TỰ chọn hay chưa — chưa chọn thì luôn ưu tiên GC khi GC có số,
     tránh việc bấm CALC lúc chưa có GC làm phần mềm "chốt" nhầm sang cách khác */
  const NM_USER = { '1':false, '2':false };
  const NM_LBL = { gc:'① GC (current)', coq:'② COQ (official)' };

  /* "50.31/49.69" → [0.5031, 0.4969]. Chấp nhận cả dạng phân số 0–1. */
  function _pfrac(s){
    const m = String(s == null ? '' : s).match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    if(!m) return null;
    let a = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[2].replace(',', '.'));
    if(isNaN(a) || isNaN(b)) return null;
    const t = a + b;
    if(t <= 0) return null;
    return [a / t, b / t];               // luôn chuẩn hoá về tổng = 1
  }
  /* %wt C3 đơn lẻ (nhập tay) → phân số */
  function _pw3(v){
    const x = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
    if(isNaN(x) || x <= 0) return null;
    return x > 1.5 ? x / 100 : x;
  }
  function _r3(x){ return Math.round(x * 1000) / 1000; }

  /* v4.86.1 — Pro/Bu %Wt trên COQ có HAI kiểu trình bày, cả hai đều hợp lệ:
       "50.31/49.69"  → cặp propane/butane
       "50.5"         → CHỈ propane, phần còn lại là butane
     Bản cũ chỉ nhận kiểu có dấu "/", nên lot ghi kiểu 1 số bị coi như THIẾU
     Pro/Bu %Wt và cột COQ bỏ trống dù dữ liệu đã có đủ (lot 355/356 dính lỗi
     này). Dùng _pw3any ở MỌI chỗ đọc ô [45] / gc{n}-frw. */
  /* ═══ ĐỌC Pro/Bu %Wt — v4.87 ═══════════════════════════════════════
     Nguyên tắc do vận hành đặt ra: **PHẦN MỀM KHÔNG ĐƯỢC TỰ SỬA SỐ CỦA
     CHỨNG THƯ**. Trước đây cặp "a/b" mà a+b ≠ 100 bị chia lại cho (a+b) —
     tức app tự nắn số. Nay:
       "50.5"        → w3 = 0.505, C4 = phần còn lại        (hợp lệ)
       "50.5/49.5"   → tổng 100.0 → w3 = 0.505              (hợp lệ)
       "50.5/48.5"   → tổng  99.0 → KHÔNG hợp lệ, KHÔNG tính, báo cho
                       nhân viên kiểm tra lại chứng thư
     Dung sai ±0.05 điểm % để nuốt sai số làm tròn của phòng lab. */
  const W3_TOL = 0.05;
  function _w3Diag(v){
    const t = String(v == null ? '' : v).trim();
    if(!t) return { state:'empty', w3:null };
    const m = t.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)/);
    if(m){
      const a = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[2].replace(',', '.'));
      if(isNaN(a) || isNaN(b) || a < 0 || b < 0) return { state:'bad', w3:null, raw:t };
      const sum = a + b;
      if(sum <= 1.5) return { state:'bad', w3:null, raw:t };          // không phải %
      if(Math.abs(sum - 100) > W3_TOL)
        return { state:'badsum', w3:null, raw:t, sum:sum, c3:a, c4:b };
      return { state:'ok', w3:a / 100, raw:t, sum:sum, c3:a, c4:b };
    }
    const x = parseFloat(t.replace(/,/g, ''));
    if(isNaN(x) || x <= 0) return { state:'bad', w3:null, raw:t };
    if(x <= 1.5) return { state:'ok', w3:x, raw:t };                  // đã là phân số
    if(x > 100)  return { state:'bad', w3:null, raw:t };
    return { state:'ok', w3:x / 100, raw:t, c3:x, c4:100 - x };
  }
  function _pw3any(v){ return _w3Diag(v).w3; }
  /* Câu giải thích cho từng trạng thái — dùng chung ở mọi nơi báo lỗi */
  function _w3Why(d, what){
    const w = what || 'Pro/Bu %Wt';
    if(!d || d.state === 'ok') return '';
    if(d.state === 'empty')  return w + ' is empty';
    if(d.state === 'badsum') return w + ' = "' + d.raw + '" adds up to ' + d.sum.toFixed(2)
      + ' %, not 100 % — check the certificate. The software will NOT adjust it.';
    return w + ' = "' + d.raw + '" cannot be read as a percentage';
  }

  /* ---------- LÕI TÍNH THEO COQ — thuần tuý, không đụng DOM ----------
     inp = { iv, fvol, iDen, iW3, fDen, fW3 }
       iv    INIT VOL  (m³)  — thể tích còn lại trong bồn TRƯỚC khi mix
       fvol  FINAL VOL (m³)  — thể tích sau khi mix (lấy từ Quantity của COQ)
       iDen  ρ của COQ trạng thái ĐẦU  (ton/m³)
       iW3   %wt C3 trạng thái ĐẦU     (phân số 0–1)
       fDen  ρ của COQ lot này         (ton/m³)
       fW3   %wt C3 của COQ lot này    (phân số 0–1)
     Trả về { coq:{...} }; nhánh coq có .error + .need[] nếu thiếu dữ liệu. */
  function altCore(inp){
    const out = { coq:{} };
    const iv = inp.iv || 0, fv = inp.fvol || 0;

    (function(){
      const q = out.coq;
      /* Liệt kê ĐÍCH DANH ô nào còn thiếu — dùng chung cho toast, cho ô
         "no result yet" trên bảng so sánh và cho modal sửa dòng. */
      const need = [];
      if(!fv)        need.push('FINAL VOL (m³)');
      if(!inp.fDen)  need.push('COQ Density of this lot');
      if(inp.fW3 == null)
        need.push(_w3Why(_w3Diag(inp.fW3raw), 'COQ Pro/Bu %Wt of this lot') || 'COQ Pro/Bu %Wt of this lot');
      if(iv > 0){
        if(!inp.iDen)  need.push('INITIAL COQ density (previous lot)');
        if(inp.iW3 == null)
          need.push(_w3Why(_w3Diag(inp.iW3raw), 'INITIAL C3 %wt (previous lot)') || 'INITIAL C3 %wt (previous lot)');
      }
      q.need = need;
      if(need.length){
        q.error = 'Missing: ' + need.join(' · ');
        return;
      }
      /* ── Trạng thái ĐẦU (phần đáy bồn còn lại trước khi mix) ── */
      const mIni = iv * (inp.iDen || 0);
      const w3i  = (inp.iW3 == null) ? 0 : inp.iW3;
      const c3Ini = mIni * w3i,       c4Ini = mIni * (1 - w3i);
      /* ── Trạng thái CUỐI (toàn bộ bồn sau khi mix, theo COQ lot này) ── */
      const mFin = fv * inp.fDen;
      const c3Fin = mFin * inp.fW3,   c4Fin = mFin * (1 - inp.fW3);
      /* ── Filled = cuối − đầu, tính riêng từng cấu tử ──
         v4.86.2: phép trừ chạy trên số ĐẦY ĐỦ, chỉ làm tròn KẾT QUẢ CUỐI.
         Bản trước làm tròn cả số trung gian rồi mới trừ (lệch tới ~1 kg). */
      q.iv = iv; q.fv = fv;
      q.iDen = inp.iDen || 0; q.fDen = inp.fDen;
      q.mIni = _r3(mIni);  q.c3Ini = _r3(c3Ini);  q.c4Ini = _r3(c4Ini);
      q.mFin = _r3(mFin);  q.c3Fin = _r3(c3Fin);  q.c4Fin = _r3(c4Fin);
      q.fC3  = _r3(c3Fin - c3Ini);
      q.fC4  = _r3(c4Fin - c4Ini);
      q.fLPG = _r3((c3Fin - c3Ini) + (c4Fin - c4Ini));
      q.w3Ini = w3i; q.w3Fin = inp.fW3;
      q.msgs = [];
      /* ── Kiểm tra tính hợp lý (không tự sửa số, chỉ cảnh báo) ── */
      if(fv < iv)
        q.msgs.push('⚠ FINAL VOL (' + fv + ' m³) is BELOW INIT VOL (' + iv + ' m³) — check which volume belongs to which stage.');
      if(q.fC3 < 0 || q.fC4 < 0)
        q.msgs.push('⚠ A component came out NEGATIVE — re-check the %wt or density of the initial / final state.');
      /* ρ của LPG thương phẩm luôn nằm trong khoảng ~0.50–0.60 ton/m³ */
      const rngBad = d => d > 0 && (d < 0.45 || d > 0.65);
      if(rngBad(inp.fDen))
        q.msgs.push('⚠ COQ density of this lot (' + inp.fDen + ') is outside the normal 0.45–0.65 ton/m³ range.');
      if(rngBad(inp.iDen))
        q.msgs.push('⚠ INITIAL COQ density (' + inp.iDen + ') is outside the normal 0.45–0.65 ton/m³ range.');
      q.level = q.msgs.length ? 'warn' : 'ok';
    })();

    return out;
  }

  /* ---------- Đọc dữ liệu từ MỘT DÒNG TANK LOG (dùng chung với ENG) ----------
     v4.86 — nếu dòng CHƯA có trạng thái ĐẦU ([63]/[64]) thì tự dò COQ của lot
     Pass gần nhất CÙNG BỒN, y như ô AUTO trên form. Trước đây hàm này chỉ đọc
     đúng 2 ô của dòng, nên một dòng lưu thiếu trạng thái đầu thì bấm 🧮 CALC
     trong modal sửa dòng bao nhiêu lần cũng KHÔNG bao giờ ra kết quả COQ. */
  function altFromRow(r, opt){
    if(!r) return { coq:{ error:'Row missing', need:['row'] } };
    const N = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(x) ? 0 : x; };
    const frw = _pw3any(r[45]);
    let iDen = N(r[A_IDEN]);
    let iW3  = _pw3any(r[A_IW3]);
    let iSrc = String(r[A_ISRC] || '');
    /* Fallback: lấy trạng thái ĐẦU từ lot trước cùng bồn */
    if((!iDen || iW3 == null) && !(opt && opt.noPrev)){
      const prev = _prevCoq(r[2], _lotKeyOf(r[1]));
      if(prev){
        if(!iDen)      iDen = prev.den;
        if(iW3 == null) iW3 = prev.w3;
        iSrc = 'COQ of lot ' + prev.lot + ' (' + String(r[2] || '') + ') · ρ ' + prev.den
             + ' · C3 ' + (prev.w3 * 100).toFixed(2) + ' %wt';
      }
    }
    const res = altCore({
      iv:   N(r[10]),
      fvol: N(r[6]),
      iDen: iDen,
      iW3:  iW3,
      fDen: N(r[33]),
      fW3:  frw,
      fW3raw: r[45], iW3raw: r[A_IW3]
    });
    /* trả kèm trạng thái đầu đã giải được, để caller ghi ngược vào dòng */
    res.resolved = { iDen: iDen, iW3: iW3, iSrc: iSrc };
    return res;
  }

  /* khoá sắp xếp lot: "LPG-2026-355" → 2026000355 */
  function _lotKeyOf(s){
    const m = String(s || '').match(/(?:LPG-)?(\d{4})-?(\d+)/i);
    if(m) return parseInt(m[1]) * 1e6 + parseInt(m[2]);
    const n = parseInt(s); return isNaN(n) ? 0 : n;
  }

  /* ---------- Lấy trạng thái ĐẦU từ lot Pass gần nhất cùng bồn ---------- */
  function _prevCoq(tkName, curLotKey){
    if(typeof ENG === 'undefined' || !ENG.ROWS) return null;
    const tk = String(tkName || '').replace(/\D/g, '');
    const lk = s => {
      const m = String(s || '').match(/(?:LPG-)?(\d{4})-?(\d+)/i);
      if(m) return parseInt(m[1]) * 1e6 + parseInt(m[2]);
      const n = parseInt(s); return isNaN(n) ? 0 : n;
    };
    let best = null, bestK = -1;
    ENG.ROWS.forEach(r=>{
      if(String(r[2] || '').replace(/\D/g, '') !== tk) return;
      const k = lk(r[1]);
      if(curLotKey && k >= curLotKey) return;         // chỉ lấy lot CŨ hơn
      const den = parseFloat(r[33]), w3 = _pw3any(r[45]);
      if(!(den > 0) || w3 == null) return;
      if(String(r[27] || '').trim().toLowerCase() === 'fail') return;
      if(k > bestK){ bestK = k; best = { lot:String(r[1] || ''), den:den, w3:w3 }; }
    });
    return best;
  }

  /* ---------- AUTO-FILL trạng thái ĐẦU của cách 2 ----------
     Chạy y như _autoFillCr của ô CURRENT C3 %: mỗi lần vào tab, đổi lot, hay
     Tank Log về thêm dữ liệu thì tự nạp lại COQ của lot Pass gần nhất CÙNG BỒN.
     Ở chế độ MANUAL thì không đụng vào ô nhập nữa. */
  function _autoFillIcq(n, loud){
    if(ICQ_MODE[n] !== 'auto' && !loud) return;
    const tk = n === '1' ? 'TK-3501' : 'TK-3502';
    const lotNum = parseInt(_gv('mc-l' + n)) || 0;
    const y = new Date().getFullYear();
    const prev = _prevCoq(tk, lotNum ? (y * 1e6 + lotNum) : 0);
    const dEl = _gid('dt' + n + '-idn'), wEl = _gid('dt' + n + '-iw3'), src = _gid('dt' + n + '-isrc');
    if(!prev){
      if(ICQ_MODE[n] === 'auto'){
        if(dEl) dEl.value = '';
        if(wEl) wEl.value = '';
      }
      if(src){
        src.style.display = '';
        src.className = 'mc-alt-src mc-alt-src-warn';
        src.textContent = (typeof ENG !== 'undefined' && !ENG.allLoaded)
          ? '⚠ No previous lot found for ' + tk + ' — press 📥 Load All in the Tank Log, or switch to MANUAL'
          : '⚠ No previous ' + tk + ' lot has both Density and Pro/Bu %Wt — switch to MANUAL to type them in';
      }
      if(loud) toast('⚠ No previous ' + tk + ' lot with complete COQ data','warn');
      _altSyncLock(n);
      return;
    }
    if(dEl) dEl.value = prev.den;
    if(wEl) wEl.value = (prev.w3 * 100).toFixed(2);
    if(src){
      src.style.display = '';
      src.className = 'mc-alt-src';
      src.textContent = '← COQ of lot ' + prev.lot + ' (' + tk + ') · ρ ' + prev.den
                      + ' · C3 ' + (prev.w3 * 100).toFixed(2) + ' %wt';
    }
    /* v4.161 -- CHOT QUAN TRONG NHAT: trang thai DAU cua lot dang tron
       duoc lay tu "lot cu gan nhat cung bon TRONG RAM". Neu con lot nam
       GIUA lot do va lot dang tron ma chua nap (cua so chi giu N lot), thi
       con so vua lay ve gan nhu chac chan la cua sai bon -- va truoc day
       phan mem KHONG he bao gi, chi im lang tinh tiep.
       Vi du that: thieu lot 414 => lot 415/TK-3502 lay nen cua lot 412. */
    try{
      const _cur = parseInt(_gv('mc-l' + n)) || 0;
      const _pm  = String(prev.lot||'').match(/(?:LPG-)?\d{4}-?(\d+)/i);
      const _pn  = _pm ? parseInt(_pm[1]) : 0;
      const _g   = (typeof ENG !== 'undefined' && ENG.lotGaps) ? ENG.lotGaps() : null;
      const _hole = (_g && _cur && _pn)
        ? _g.miss.filter(k=> k > _pn && k < _cur) : [];
      if(_hole.length){
        if(src){
          src.className = 'mc-alt-src mc-alt-src-warn';
          src.textContent = '\u26a0 Lot ' + _hole.join(', ') + ' not loaded \u2014 the initial state above may come'
                          + ' from the WRONG lot. Press \ud83d\udce5 Load All in the Tank Log, then re-check.';
        }
        if(!_warnedOnce('hole|' + n + '|' + _hole.join(',')))
          toast('\u26a0 Lot ' + _hole.join(', ') + ' not loaded \u2014 initial COQ state may be taken from the wrong lot','er');
      }
    }catch(_){}
    if(loud) toast('⟲ Pulled COQ of lot ' + prev.lot + ' — ρ ' + prev.den + ' · C3 ' + (prev.w3 * 100).toFixed(2) + ' %wt', 'ok');
    _altSyncLock(n);
    altCalc(n, true);
  }
  /* Khoá / mở 2 ô nhập theo chế độ hiện tại + cập nhật badge */
  function _altSyncLock(n){
    const auto = ICQ_MODE[n] === 'auto';
    const btn = _gid('dt' + n + '-icqm');
    if(btn){
      btn.textContent = auto ? 'AUTO' : 'MANUAL';
      btn.classList.toggle('manual', !auto);
    }
    ['idn','iw3'].forEach(k=>{
      const e = _gid('dt' + n + '-' + k);
      if(e){ e.readOnly = auto; e.placeholder = auto ? 'auto' : 'nhập tay'; }
    });
  }
  function toggleIcqMode(n){
    if(ICQ_MODE[n] === 'auto'){
      ICQ_MODE[n] = 'manual';
      _altSyncLock(n);
      const src = _gid('dt' + n + '-isrc');
      if(src){ src.style.display = ''; src.className = 'mc-alt-src mc-alt-src-man'; src.textContent = '✏ Manual entry'; }
      toast('✏ Initial state switched to MANUAL — it will no longer follow the previous lot','warn');
    } else {
      ICQ_MODE[n] = 'auto';
      _altSyncLock(n);
      _autoFillIcq(n, true);
    }
    altCalc(n, true);
  }
  /* Nút ⟲ — ép lấy lại từ lot trước kể cả đang ở MANUAL */
  function densPullPrev(n){
    ICQ_MODE[n] = 'auto';
    _autoFillIcq(n, true);
  }

  /* ---------- chọn phương pháp sẽ gửi sang Scale (ngay tại Tank Mix) ---------- */
  function pickNotifyMethod(n, k){
    if(!NM_LBL[k]) return;
    const res = ALTR[n];
    const has = k === 'gc' ? !!GCR[n]
              : !!(res && res.coq && !res.coq.error);
    if(!has){
      const miss = (res && res.coq && res.coq.need && res.coq.need.length)
                 ? ' — missing: ' + res.coq.need.join(' · ') : '';
      toast('⚠ ' + NM_LBL[k] + ' has no result yet' + miss, 'warn'); return;
    }
    NMTH[n] = k; NM_USER[n] = true;
    _renderAlt(n, res || { coq:{} });
    toast('⇒ The Check Booth will receive ' + NM_LBL[k], 'ok');
  }

  /* ---------- Đọc ô nhập trên form + tính ---------- */
  function _altInputs(n){
    return {
      iv:   _gnum('mc-iv' + n),
      fvol: _gnum('gc' + n + '-fvol'),
      iDen: _gnum('dt' + n + '-idn'),
      iW3:  _pw3any(_gv('dt' + n + '-iw3')),
      fDen: _gnum('gc' + n + '-den'),
      fW3:  _pw3any(_gv('gc' + n + '-frw')),
      fW3raw: _gv('gc' + n + '-frw'), iW3raw: _gv('dt' + n + '-iw3')
    };
  }

  /* ═══ CỔNG KIỂM TRA DỮ LIỆU COQ — v4.87 ════════════════════════════
     Dùng chung cho 2 thời điểm: NGAY SAU KHI IMPORT COQ và LÚC SAVE PASS.
     Trả về danh sách vấn đề bằng lời, gọi đích danh từng ô, để nhân viên
     biết phải nhập gì. KHÔNG tự sửa bất kỳ con số nào. */
  function _coqGate(n){
    const inp = _altInputs(n);
    const res = altCore(inp);
    const p = [];
    const dF = _w3Diag(inp.fW3raw), dI = _w3Diag(inp.iW3raw);
    if(!inp.fvol) p.push('• FINAL VOL (m³) is empty — it comes from Quantity on the COQ');
    if(!inp.fDen) p.push('• COQ DENSITY (kg/L) is empty');
    if(dF.state === 'empty')       p.push('• COQ Pro/Bu %Wt is empty — import the COQ file, or type it in');
    else if(dF.state !== 'ok')     p.push('• ' + _w3Why(dF, 'COQ Pro/Bu %Wt'));
    if(inp.iv > 0){
      if(!inp.iDen)                p.push('• INITIAL DENSITY (heel from the previous lot) is empty');
      if(dI.state === 'empty')     p.push('• INITIAL C3 %WT is empty — press ⟲ RE-PULL FROM PREVIOUS LOT, or type it in');
      else if(dI.state !== 'ok')   p.push('• ' + _w3Why(dI, 'INITIAL C3 %wt'));
    }
    /* cảnh báo chất lượng số liệu — không chặn nhưng phải nói */
    const warn = [];
    if(!res.coq.error && res.coq.msgs) res.coq.msgs.forEach(m=> warn.push('• ' + m.replace(/^⚠\s*/, '')));
    return { ok: !res.coq.error, problems:p, warns:warn, res:res, inp:inp, dF:dF, dI:dI };
  }

  /* Báo NGAY, bằng hộp thoại, để nhân viên không bỏ sót */
  function _coqAlert(n, title){
    const tk = n === '1' ? 'TK-3501' : 'TK-3502';
    const g = _coqGate(n);
    const box = _gid('dt' + n + '-chk');
    if(!g.ok){
      const msg = '⚠ ' + title + ' — KHÔNG TÍNH ĐƯỢC C3/C4 THEO COQ\n'
        + '   ' + tk + ' · Lot ' + (_gv('mc-l' + n) || '—') + '\n\n'
        + 'Thiếu / sai dữ liệu:\n' + g.problems.join('\n') + '\n\n'
        + 'COQ sắp là số liệu CHÍNH THỨC, nên lot nào cũng phải có kết quả.\n'
        + 'Vui lòng bổ sung rồi bấm 🧮 CALC COQ lại. Phần mềm KHÔNG tự sửa số của chứng thư.';
      try{ alert(msg); }catch(_){}
      if(box){
        box.style.display = '';
        box.className = 'mc-alt-chk lv-bad';
        box.innerHTML = '<b>⚠ COQ chưa tính được — thiếu / sai dữ liệu:</b><br>'
          + g.problems.map(x=>_escHtml(x)).join('<br>');
      }
      toast('⚠ COQ chưa tính được — ' + g.problems.length + ' mục cần bổ sung','er');
      return g;
    }
    if(g.warns.length){
      const msg = '⚠ ' + title + ' — SỐ LIỆU CÓ ĐIỂM BẤT THƯỜNG\n'
        + '   ' + tk + ' · Lot ' + (_gv('mc-l' + n) || '—') + '\n\n'
        + g.warns.join('\n') + '\n\nKiểm tra lại chứng thư trước khi lưu.';
      try{ alert(msg); }catch(_){}
      if(box){
        box.style.display = '';
        box.className = 'mc-alt-chk lv-warn';
        box.innerHTML = g.warns.map(x=>_escHtml(x)).join('<br>');
      }
      toast('⚠ ' + g.warns[0].replace(/^•\s*/, ''),'warn');
    }
    return g;
  }

  function altCalc(n, silent){
    const res = altCore(_altInputs(n));
    ALTR[n] = res;
    _renderAlt(n, res);
    if(!silent){
      if(!res.coq.error)
        toast('🧮 COQ: C3 ' + _fmt(res.coq.fC3) + ' / C4 ' + _fmt(res.coq.fC4)
            + ' · LPG ' + _fmt(res.coq.fLPG) + ' ton', 'ok');
      else
        toast('⚠ COQ not computed — ' + res.coq.error, 'warn');
    }
    return res;
  }
  function altAuto(n){
    clearTimeout(_altTimer[n]);
    _altTimer[n] = setTimeout(()=> altCalc(n, true), 350);
  }
  /* Tính lại cả 2 tank nếu đang hiện kết quả (giữ tên cũ cho tương thích) */
  function densRefresh(){
    ['1','2'].forEach(n=>{ if(ALTR[n]) altCalc(n, true); });
  }

  /* ---------- Vẽ bảng so sánh GC vs COQ ---------- */
  function _renderAlt(n, res){
    const chk = _gid('dt' + n + '-chk');
    if(chk){
      const q = res.coq;
      if(!q.error && q.msgs && q.msgs.length){
        chk.style.display = '';
        chk.className = 'mc-alt-chk lv-' + (q.level || 'ok');
        chk.innerHTML = q.msgs.map(m=>_escHtml(m)).join('<br>');
      } else { chk.style.display = 'none'; }
    }
    /* v4.214 — COQ là số chính thức: bỏ bảng so sánh ① GC / ② COQ và nút chọn
       phương pháp. Mặc định gửi COQ khi COQ có số (lùi về GC chỉ khi COQ không
       tính được — giữ nguyên logic cũ). Kết quả đầy đủ nằm ở khối RESULT. */
    const okOf = { gc: !!GCR[n], coq: !res.coq.error };
    if(!NM_USER[n]) NMTH[n] = okOf.coq ? 'coq' : 'gc';
    else if(!okOf[NMTH[n]]) NMTH[n] = okOf.coq ? 'coq' : 'gc';
    const host = _gid('mc-cmp' + n);
    if(host){
      if(GCR[n]){ host.style.display = 'none'; host.innerHTML = ''; }
      else {
        const q = res.coq;
        host.style.display = '';
        host.innerHTML = !q.error
          ? '<div class="mc-cmp-one">COQ · C3 <b class="c3">'+_fmt(q.fC3)+'</b> · C4 <b class="c4">'+_fmt(q.fC4)+'</b> · LPG <b>'+_fmt(q.fLPG)+'</b> ton'+
            '<span class="h">press 🧮 CALC to see the result and save</span></div>'
          : (q.need && q.need.length ? '<div class="mc-cmp-one miss">Still needs: <b>'+q.need.map(_escHtml).join('</b> · <b>')+'</b></div>' : '');
        if(!host.innerHTML) host.style.display = 'none';
      }
    }
    _renderResult(n);
    try{ _renderWarnbar(n); }catch(_){}
  }

  function _escHtml(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ---------- Ghi kết quả COQ + dữ liệu đầu vào vào dòng Tank Log ----------
     v4.86 — khác bản cũ ở 3 điểm:
       1. KHÔNG còn ghi cột [56]–[62] của bảng density.
       2. Trạng thái ĐẦU ([63]/[64]/[65]) LUÔN được ghi khi có số, kể cả khi
          COQ chưa tính được — để lần sau mở lại dòng là tính ra ngay.
       3. Nếu COQ tính KHÔNG ra thì XOÁ [66]/[67] thay vì để số cũ nằm lại
          (trước đây số cũ vẫn còn → dễ đọc nhầm là kết quả của lot này). */
  function _altWriteRow(n, row){
    const inp = _altInputs(n);
    const res = ALTR[n] || altCore(inp);
    if(inp.iDen) row[A_IDEN] = inp.iDen;
    if(inp.iW3 != null) row[A_IW3] = parseFloat((inp.iW3 * 100).toFixed(4));
    const src = _gid('dt' + n + '-isrc');
    if(src && src.textContent && src.style.display !== 'none')
      row[A_ISRC] = src.textContent.replace(/^[←✏⚠]\s*/, '');
    if(!res.coq.error){ row[A_QC3] = res.coq.fC3; row[A_QC4] = res.coq.fC4; }
    else               { row[A_QC3] = '';         row[A_QC4] = '';          }
    /* Phương pháp gửi Scale — chỉ nhận phương pháp thực sự có số. */
    const okOf = { gc: !!GCR[n], coq: !res.coq.error };
    row[A_MTH] = okOf[NMTH[n]] ? NMTH[n] : (okOf.coq ? 'coq' : 'gc');
    return res;
  }

  /* Khôi phục các ô nhập bổ sung khi mở lại một lot (openGc) */
  function _altRestore(n, r){
    const set = (id, v) => { const e = _gid(id); if(e) e.value = (v === 0 || v) ? v : ''; };
    set('dt' + n + '-idn', r[A_IDEN]);
    set('dt' + n + '-iw3', r[A_IW3]);
    const src = _gid('dt' + n + '-isrc');
    if(src){
      if(r[A_ISRC]){ src.style.display = ''; src.className = 'mc-alt-src'; src.textContent = '← ' + r[A_ISRC]; }
      else src.style.display = 'none';
    }
    /* phương pháp đã chọn của lot đó */
    const k = String(r[A_MTH]||'').trim().toLowerCase();
    NMTH[n] = NM_LBL[k] ? k : 'gc';
    NM_USER[n] = !!NM_LBL[k];        // lot đã lưu lựa chọn thì tôn trọng
    /* AUTO thì lấy lại trạng thái ĐẦU theo lot trước (giống ô CURRENT C3 %) */
    _altSyncLock(n);
    if(ICQ_MODE[n] === 'auto') _autoFillIcq(n);
    else altCalc(n, true);
  }

  /* ---------- public API ---------- */
  return {
    init, refresh,
    /* v4.86 — phương pháp ② COQ (bảng density đã gỡ) */
    altCalc, altAuto, altCore, altFromRow, densPullPrev, densRefresh,
    lotKeyOf: _lotKeyOf, prevCoq: _prevCoq,
    toggleIcqMode, pickNotifyMethod, autoFillIcq: _autoFillIcq,
    parseFrac: _pfrac, parseW3: _pw3, parseW3Any: _pw3any,
    w3Diag: _w3Diag, w3Why: _w3Why, coqGate: _coqGate,
    ALT_COLS: { A_MID, A_T3, A_P3, A_T4, A_P4, A_DC3, A_DC4,
                A_IDEN, A_IW3, A_ISRC, A_QC3, A_QC4, A_MTH },
    activate, calcOne, autoCalc, resetCalc,
    warnGo, warnAll, renderWarnbar: _renderWarnbar,   /* v4.215 */
    chkInp,           /* v4.79 (R2/R3) — kiểm tra & kẹp giá trị tại ô nhập */
    parseNum: _pnum,  /* v4.79 (R3) — parser chuẩn Excel US, dùng lại nơi khác */
    toggleOrder, toggleLP, toggleSP, togglePC, toggleCrMode,
    fillCircChange,   /* v4.74 — checkbox tuần hoàn về trạm (CHỈ BƠM) */
    modeClick, modeDbl,   /* v4.67 — double-click guard for mode buttons */
    spPlanOpen, spPlanClose, spPlanCalc, spPlanApply,   /* v4.69 — special-ratio mix planner modal */
    startClick, startDblClick, finishMix,
    fmtTime, fmtDate, fmtDateBlur,
    updateLotNames, checkDupLot,
    gcSumInline, gcTabNext, autoGcRecalc, gcCalcInline, gcSave, gcSaveDraftInline,
    openSettings, closeSettings, saveSettings, resetSettings,
    calcFromRow, openGc,
    /* v4.55 — COQ import + spec table + quality evaluation */
    importCoqPick, coqFileChosen,
    parseCoqWorkbook: _parseCoqWorkbook,   /* v4.61 — reused by ENG edit-modal COQ import */
    coqBlocked: _coqBlocked,               /* v4.171 — COQ audit gate */
    coqReport: _coqReport, closeCoqReport: _closeCoqReport,
    coqPlaus: _coqPlaus, coqReview: _coqReview, _cqvTick, _cqvClose, _cqvGo, cqCalc: _cqCalc,   /* v4.217 — rà soát COQ trước import */
    fmtCoqDate: _fmtCoqDate,
    openSpec, closeSpec, saveSpec, resetSpec,
    evalQuality, evalRowQuality, qcRecalc
  };
})();


/* ============================================================
   MIXNOTIFY — Tank Mix → Scale Station notification bar (v4.24.0)
   ────────────────────────────────────────────────────────────
   Tank Log "🧮 CALC + 💾 SAVE + 📢 NOTIFY" pushes a small entry
   to Firebase path /mix_notify/{pk} so the Scale Station floor
   staff sees a pending stock-transfer for that tank/lot in
   real time. The Scale tab has 4 fixed slots in Row 5
   (#scRow5 .sc-r5-cell × 4); we render the 4 OLDEST PENDING
   entries (sorted by _ts ascending) into those slots, leaving
   blanks for the rest. Click ✅ on a slot → write
   {confirmed:true} to the FB entry → it drops out of PEND →
   the next oldest takes its place.

   Firebase footprint (Spark-frugal):
     • One small object per mix (~80 bytes)
     • Written on CALC+SAVE+NOTIFY, updated on ✅ confirm.
     • All devices share a single .on('value') listener.
   ============================================================ */
