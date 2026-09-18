/* ============================================================
 * INV  —  inv.js
 * ------------------------------------------------------------
 * NGUỒN (V4-54): lpg-station-v4_54_0-cavern-collapsible-sections.html
 *   dòng 27925–28613   (~689 dòng)
 * Global xuất ra : window.INV
 * Phase tách     : P5B
 * Phụ thuộc      : sync
 * Khởi tạo (boot): INV.init() trong boot
 * ------------------------------------------------------------
 * MÔ TẢ: Tồn kho 2 tank (INV): SLOC/TKNAME/OTHER, DATA[ds][sloc]={init,wt,history}. LBL (28439).
 *
 * API công khai (điền/đối chiếu khi tách):
 *   INV.init(), INV.render()
 * ------------------------------------------------------------
 * CÁCH TÁCH (khi tới phase này):
 *   1) Mở V4-54, copy nguyên khối module INV từ dòng 27925 đến 28613.
 *   2) Dán xuống DƯỚI dòng này. GIỮ NGUYÊN tên global (window.INV).
 *   3) node --check inv.js   → phải PASS (không lỗi cú pháp).
 *   4) Mở index.html trên trình duyệt → kiểm tra chức năng hoạt động.
 *   5) Cập nhật docs/PLAN-TACH-MODULE.md: đánh dấu [x] module này.
 * ============================================================ */

/* TODO[P5B]: dán thân module INV (V4-54 dòng 27925–28613) vào đây. */

/* ===== BÓC TỪ V4-54 dòng 27925–28613 ===== */
const INV = (function(){
  'use strict';

  const SLOC   = { 1:'2100', 2:'2101' };          // tank button # -> sloc
  const TKNAME = { '2100':'TK-3501', '2101':'TK-3502' };
  const OTHER  = { '2100':'2101', '2101':'2100' };
  const CACHE  = 'lpg_v4_inv_v1';
  const DEFAULT_WT = 30;

  let FB   = null;
  let sel  = '2100';        // tank currently shown in the XFER card
  let DATA = {};            // DATA[ds][sloc] = { init, wt, history:{} }
  let _initPick = '2100';   // tank chosen inside the Tồn-đầu modal
  let _cavPick  = '2100';
  let _xferFrom = '2100';
  let _fbBound  = false;
  /* Per-tank version stamps. A write bumps inv_daily/{date}/{sloc}/_ver (timestamp).
     The listener only re-syncs + recomputes when the incoming _ver differs from the
     last applied one — so RAM-only deductions never trigger spurious re-syncs, and a
     real Firebase change (from this or another machine) always does. */
  let _localVer = { '2100':null, '2101':null };
  /* v4.152 — đã nghe Firebase trả lời cho ngày hôm nay chưa (theo bồn). */
  let _fbSeen = { '2100':false, '2101':false };
  /* v4.154 — đồng hồ đóng băng được (chỉ test dùng) */
  let _clock = 0;
  function _nowMs(){ return _clock || Date.now(); }
  let _boundDay = '', _invRef = null;

  /* ── date / misc helpers ── */
  function ds(){ const d=new Date(_nowMs()),p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  /* Canonical DD/MM/YY (2-digit year) — MUST match normalizeDate() / the date
     stored on TL Data rows (_buildTLPayload uses String(year).slice(-2)).
     giFromTL() and _renderExport() compare r.date === todayDMY() by exact
     string; a 4-digit year here silently fails every match, so today's actual
     net-weight sales are NEVER deducted from tank stock. Keep this 2-digit. */
  function todayDMY(){ const d=new Date(_nowMs()),p=n=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(-2); }
  function nowHM(){ const d=new Date(),p=n=>String(n).padStart(2,'0'); return p(d.getHours())+':'+p(d.getMinutes()); }
  function by(){ try{ return (typeof CURRENT_USER!=='undefined' && CURRENT_USER.name) || '—'; }catch(_){ return '—'; } }
  function num(v){ const n=parseFloat(v); return isFinite(n)?n:0; }
  function fmtKg(n){ const v=Math.round(num(n)); return v.toLocaleString('en-US'); }
  function fmtT(n){ return (num(n)/1000).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  /* ══ ⭐⭐⭐ v4.170 — RANH GIỚI RAM ⟷ FIREBASE ════════════════════════
     ────────────────────────────────────────────────────────────────────
     > User: "tất cả các cái tính stock này làm trên ram, máy nào của máy
     > đó tính — bản chất là nó tính từ các dữ liệu của máy; chỉ dữ liệu do
     > user nhập mới đẩy firebase và đồng bộ đè về máy… tránh tích lũy tăng
     > dần dữ liệu firebase."

     LUẬT: dòng nào mang `auto:true` là số APP TỰ TÍNH ⇒ **RAM-ONLY**, không
     bao giờ ghi lên Firebase, và đọc về từ Firebase thì VỨT.
     Chỉ số NGƯỜI GÕ mới lên Firebase và mới được đồng bộ đè xuống máy khác.

     Vì sao phải VỨT chứ không phải "thử hợp nhất": số app tự tính thì MỌI
     MÁY tính lại được từ cùng dữ liệu gốc (SAP · Tank Log · TL Data), nên
     truyền nó đi không thêm thông tin gì — chỉ thêm rủi ro. Sự cố 18/09
     ([[v4-cavern-from-end]]) là hai bản khác nhau ghi đè số auto của nhau
     vô tận. Lọc ở đây là miễn dịch: bản cũ cứ ghi, bản mới không thèm đọc,
     và bản mới không ghi gì để bản cũ phải cãi lại.
     ⚠ ĐỪNG bỏ bộ lọc này để "cho hai máy thấy giống nhau". */
  function _userInit(x){ return (x && !x.auto) ? x : null; }
  function _autoKeep(x){ return (x && x.auto) ? x : null; }
  function _stripAuto(fbHist, keepHist){
    const out = {};
    Object.keys(fbHist || {}).forEach(k=>{
      const e = fbHist[k];
      if(e && e.auto) return;                 /* số app — của bản cũ, bỏ */
      out[k] = e;
    });
    Object.keys(keepHist || {}).forEach(k=>{  /* giữ lại số RAM của máy này */
      const e = keepHist[k];
      if(e && e.auto) out[k] = e;
    });
    return out;
  }
  function bucket(d, sloc){
    DATA[d] = DATA[d] || {};
    DATA[d][sloc] = DATA[d][sloc] || { init:null, wt:null, history:{}, mixIn:{} };
    if(!DATA[d][sloc].history) DATA[d][sloc].history = {};
    if(!DATA[d][sloc].mixIn)   DATA[d][sloc].mixIn   = {};
    return DATA[d][sloc];
  }

  /* ── localStorage cache ── */
  function loadCache(){ try{ const r=localStorage.getItem(CACHE); return r?JSON.parse(r):null; }catch(_){ return null; } }
  function saveCache(){ try{ localStorage.setItem(CACHE, JSON.stringify({ data:DATA, ver:_localVer, ts:Date.now() })); }catch(_){ } }

  /* ── Firebase ── */
  function fb(){
    if(FB) return FB;
    if(typeof firebase==='undefined') return null;
    try{ FB = firebase.database(); }catch(_){ FB=null; }
    return FB;
  }
  function attachFirebase(){
    const h = fb(); if(!h || _fbBound) return;
    _fbBound = true;
    /* v4.150 — KHÔNG còn listener /stx_draft: số WMS gõ tay là RAM-only. */
    /* Listen to today's node only (cheap). v4.154 — sang ngày mới thì
       _rebindIfRolled() gỡ listener cũ và nghe lại node của ngày mới. Ngày
       được CHỐT vào closure: listener của hôm qua không bao giờ ghi nhầm
       sang ô hôm nay. */
    const day = ds();
    _boundDay = day;
    _invRef = h.ref('inv_daily/'+day);
    _attachSapLot();
    _invRef.on('value', snap=>{
      if(day !== _boundDay) return;
      const v = snap.val() || {};
      DATA[day] = DATA[day] || {};
      let changed = false;
      ['2100','2101'].forEach(sl=>{
        const n = v[sl] || {};
        /* v4.152 — ĐÃ NGHE Firebase trả lời cho NGÀY HÔM NAY. Cờ này là điều
           kiện BẮT BUỘC của tồn đầu tự động: chưa nghe mà đã thấy init rỗng
           thì rất có thể chỉ là chưa tải xong, ghi vào là đè mất số của máy
           khác. localStorage KHÔNG thay được cờ này — cache có thể là của
           hôm qua. */
        _fbSeen[sl] = true;
        const fbVer = (n._ver!=null) ? n._ver : 0;
        /* Only adopt + recompute when the version actually moved (or first load). */
        if(_localVer[sl] === null || fbVer !== _localVer[sl]){
          /* ⭐⭐⭐ v4.170 — CHỈ NHẬN SỐ NGƯỜI GÕ TỪ FIREBASE.
             Mọi dòng mang cờ auto:true là số APP TỰ TÍNH. Từ v4.170 số đó
             KHÔNG còn được ghi lên Firebase nữa (mỗi máy tự tính lấy trong
             RAM), nên dòng auto đọc về chỉ có thể đến từ MÁY CHẠY BẢN CŨ.
             Nhận nó vào là rước lại đúng sự cố 18/09: hai bản ghi đè nhau
             vô tận (xem [[v4-cavern-from-end]]). Nên: lọc sạch, và giữ
             nguyên số RAM mà chính máy này vừa tính. */
          const keep = DATA[day][sl] || {};
          /* ⚠ v4.170 — DỰNG TỪ `n` RỒI MỚI ĐÈ, đừng liệt kê từng khoá.
             Bản cũ liệt kê tay { init, wt, history, mixIn } nên khoá
             **lotSel** (thêm ở v4.165) bị RƠI MẤT mỗi lần Firebase bump
             version: nhân viên tick một lot, một lượt ghi bất kỳ của máy
             khác là tick biến mất, tick mãi không ăn. Thêm khoá mới mà
             quên sửa chỗ này là dính lại y hệt. */
          DATA[day][sl] = Object.assign({}, n, {
            init: _userInit(n.init) || _autoKeep(keep.init),
            wt: n.wt || null,
            history: _stripAuto(n.history, keep.history),
            mixIn: n.mixIn || {} });
          _localVer[sl] = fbVer;
          changed = true;
        }
      });
      if(changed){ saveCache(); render(); }
    }, err=>{ if(typeof fbErr==='function') fbErr(err,'Load inventory'); else console.warn('[INV] fb listen', err); });
  }

  function _rebindIfRolled(){
    if(!_fbBound || !_boundDay || _boundDay === ds()) return;
    try{ if(_invRef && typeof _invRef.off === 'function') _invRef.off(); }catch(_){}
    _fbBound = false; _invRef = null;
    _fbSeen = { '2100':false, '2101':false };
    _localVer = { '2100':null, '2101':null };
    attachFirebase();
  }

  /* ── GI sold-today from TL Data (read-only, guarded) ──
     Mirrors V406 _invGiFromTL: sum today's TL rows whose loading tank
     matches this sloc's suffix. Falls back to lpgQty×%wt when no
     C3/C4 breakdown is present. Returns {c3,c4}; 0 if TL not loaded. */
  function giFromTL(sloc, d){
    if(typeof TL==='undefined' || !TL.ROWS) return { c3:0, c4:0 };
    const suffix = sloc==='2100' ? '3501' : '3502';
    const dmy = todayDMY();
    let c3=0, c4=0;
    const b = bucket(d, sloc);
    const pctC3 = _bucketWt(b) / 100;
    Object.values(TL.ROWS).forEach(r=>{
      if(!r || r.disabled || !r.date) return;
      if(r.date !== dmy) return;
      if(typeof isPureType==='function' && isPureType(r.type)) return;
      if(!String(r.ltank||'').toUpperCase().includes(suffix)) return;
      let rc3 = num(r.c3Kg || r.stC3);
      let rc4 = num(r.c4Kg || r.stC4);
      const lpg = num(r.lpgQty);
      const sum = rc3 + rc4;
      /* values look like tons (much smaller than lpgQty in kg) → scale up */
      if(lpg>0 && sum>0 && sum < lpg/100){ rc3*=1000; rc4*=1000; }
      if(rc3>0 || rc4>0){ c3+=rc3; c4+=rc4; }
      else if(lpg>0){ c3 += lpg*pctC3; c4 += lpg*(1-pctC3); }
    });
    return { c3, c4 };
  }

  /* ── core compute (RAM only) ── */
  function compute(sloc, d){
    d = d || ds();
    const b = bucket(d, sloc);
    if(!b.init){
      return { hasInit:false, c3Init:0, c4Init:0, wtC3:DEFAULT_WT,
               cav:{c3:0,c4:0}, cavApp:null, xIn:{c3:0,c4:0}, xOut:{c3:0,c4:0},
               gi:{c3:0,c4:0}, stn:{c3:0,c4:0}, c3Cur:0, c4Cur:0, lpg:0 };
    }
    const c3Init = num(b.init.c3), c4Init = num(b.init.c4);
    const wtC3 = _bucketWt(b);
    let cvC3=0,cvC4=0, xInC3=0,xInC4=0, xOutC3=0,xOutC4=0;
    Object.values(b.history||{}).forEach(e=>{
      if(!e) return;
      if(e.type==='cavern'){ cvC3+=num(e.c3); cvC4+=num(e.c4); }
      else if(e.type==='xfer'){
        if(e.toSl===sloc){ xInC3+=num(e.c3); xInC4+=num(e.c4); }
        else if(e.fromSl===sloc){ xOutC3+=num(e.c3); xOutC4+=num(e.c4); }
      }
    });
    const gi = giFromTL(sloc, d);
    /* v4.22.4 — Tentative deduction for vehicles currently assigned to a
       station that is loading from THIS tank. The station's loading qty (MT)
       is converted to kg and split into C3/C4 using the tank's %wt — that
       reflects what's actually being drawn out right now. When the truck
       finishes loading, a TL Data row is written and the gi (from TL Data)
       branch picks it up using actual net weight; the station's loading
       qty drops out on the next render. When the truck is cancelled (dbl-
       click reset), the station goes back to empty and this deduction
       evaporates automatically — the queue's separate accounting doesn't
       affect stock. Per-tank guard: only stations whose `tank` field
       matches this sloc's name are deducted. */
    const tankName = (sloc === '2100') ? 'TK-3501'
                   : (sloc === '2101') ? 'TK-3502'
                   : '';
    let stnC3 = 0, stnC4 = 0;
    if(tankName){
      try{
        const stations = (typeof SCALE !== 'undefined' && SCALE.getStations) ? SCALE.getStations() : null;
        if(stations){
          const pct3 = (wtC3 || 0) / 100;
          Object.values(stations).forEach(st => {
            if(!st || !st.status || st.status === 'empty') return;
            if(String(st.tank || '').trim() !== tankName) return;
            const qtyKg = (parseFloat(st.qty) || 0) * 1000;
            if(qtyKg <= 0) return;
            stnC3 += qtyKg * pct3;
            stnC4 += qtyKg * (1 - pct3);
          });
        }
      }catch(_){}
    }
    /* ⭐⭐⭐ v4.170 — mẻ trong ngày đã có COQ ⇒ tồn đi theo END của Tank Log.
       Xem khối chú thích của endStateFor. Con số `cavApp` chỉ là phần bù
       RAM để cột trên Tank Console vẫn cộng đúng, KHÔNG phải bản ghi. */
    let cavApp = null;
    const ov = endStateFor(sloc, d);
    if(ov){
      cavApp = { lot:ov.lot, rows:ov.rows,
                 endC3:ov.endC3, endC4:ov.endC4, soldC3:ov.soldC3, soldC4:ov.soldC4,
                 c3: ov.c3 - (c3Init + cvC3 + xInC3 - xOutC3 - gi.c3),
                 c4: ov.c4 - (c4Init + cvC4 + xInC4 - xOutC4 - gi.c4) };
      cvC3 += cavApp.c3; cvC4 += cavApp.c4;
    }
    const c3Cur = c3Init + cvC3 + xInC3 - xOutC3 - gi.c3 - stnC3;
    const c4Cur = c4Init + cvC4 + xInC4 - xOutC4 - gi.c4 - stnC4;
    return { hasInit:true, c3Init, c4Init, wtC3,
             cav:{c3:cvC3,c4:cvC4}, cavApp:cavApp,
             xIn:{c3:xInC3,c4:xInC4}, xOut:{c3:xOutC3,c4:xOutC4},
             gi, stn:{c3:stnC3,c4:stnC4}, c3Cur, c4Cur, lpg:c3Cur+c4Cur };
  }

  /* ── render the compact XFER card ──
     v4.22.14 — XFER card now shows the STATIC "Tồn đầu ngày" values
     (c3Init / c4Init / lpgInit + effective %wt C3). It does NOT auto-deduct
     based on TL Data outbound or station loading. Only changes when the
     operator manually re-confirms the initial via 📥 Tồn đầu ngày, or
     updates the %wt override via 📐 %wt C3. The Scale tank-cell chip and
     PLAN card REMAINING still auto-deduct (those are operational
     "what's left now" displays — see renderRow1 below and SCALE._updateRow1). */
  function render(){
    /* v4.152 — tồn đầu ngày tự lấy (P2). Đặt ở đầu render vì render được gọi
       lại sau MỌI thay đổi Firebase — lần nào đủ dữ liệu là nó chốt được. */
    /* v4.154 — cùng lượt: tính lại tồn đầu của app + tự ghi cavern receipt
       cho mẻ xong trong ngày. Có khoá chống gọi lồng. */
    _autoTick();
    renderRow1();   // ROW 1 (Scale tab) always refreshes, independent of the card
    const tab1=document.getElementById('invXTab1'), tab2=document.getElementById('invXTab2');
    if(tab1){ tab1.className='inv-x-tab'+(sel==='2100'?' on-3501':''); }
    if(tab2){ tab2.className='inv-x-tab'+(sel==='2101'?' on-3502':''); }
    const stock=document.getElementById('invXStock'), meta=document.getElementById('invXMeta');
    if(!stock) return;
    const c = compute(sel);
    if(!c.hasInit){
      stock.innerHTML = '<div class="inv-x-empty">No initial stock yet — press <b>📥 Initial Stock</b></div>';
      if(meta) meta.textContent='';
      return;
    }
    const lpgInit = num(c.c3Init) + num(c.c4Init);
    stock.innerHTML =
      '<div class="inv-x-cell"><span class="k">C3 init</span><span class="v c3">'+fmtKg(c.c3Init)+'</span></div>'+
      '<div class="inv-x-cell"><span class="k">C4 init</span><span class="v c4">'+fmtKg(c.c4Init)+'</span></div>'+
      '<div class="inv-x-cell"><span class="k">LPG init</span><span class="v lpg">'+fmtKg(lpgInit)+'</span></div>'+
      '<div class="inv-x-cell"><span class="k">%wt C3</span><span class="v wt">'+(+num(c.wtC3).toFixed(1))+'</span></div>';
    if(meta){
      /* Show what extras have been recorded today (cavern receipts / inter-tank
         transfers) so operator still has visibility, but these no longer change
         the displayed initial volume. */
      const bits=[];
      if(c.cav.c3||c.cav.c4) bits.push('cavern '+fmtKg(c.cav.c3+c.cav.c4));
      const xnet=(c.xIn.c3+c.xIn.c4)-(c.xOut.c3+c.xOut.c4);
      if(xnet) bits.push('xfer '+(xnet>0?'+':'')+fmtKg(xnet));
      meta.textContent = bits.length ? ('Initial stock (static) · ' + bits.join(' · ')) : 'Initial stock (static)';
    }
  }

  /* ── ROW 1 inventory chip + REMAINING (Scale tab) ──
     Follows the tank currently selected in SCALE (not the XFER card's own tabs).
     Shows the same RAM-computed stock as the XFER card. */
  function stockFor(sloc){ return compute(sloc); }
  function _scaleSelectedSloc(){
    try{
      const cfg=(typeof SCALE!=='undefined'&&SCALE.getTkCfg)?SCALE.getTkCfg():null;
      if(cfg) return (cfg.tk2&&cfg.tk2.selected)?'2101':'2100';
    }catch(_){}
    return '2100';
  }
  function renderRow1(){
    /* v4.31.9 — Row 1 Cluster 1 is now TWO per-tank cards. Each card shows
       its own tank's live LPG / C3 / C4, so render both.
       v4.31.11 — renderRow1 also owns the PLAN card cross-tank STOCK total
       (sum of TK-3501 + TK-3502). This runs on every INV change, so the
       total updates live the moment a second tank's init is declared
       (scRenderCtrl no longer computes it — it wasn't re-triggered by INV).
       v4.33.0 — also drives the BALL gauge on each card: the circle is the
       spherical tank shell and liquid rises from the BOTTOM like the real
       11 m ball tank. Volume fraction p = LPG stock ÷ TANK_CAP_KG is converted
       to a liquid LEVEL via the spherical-cap inverse (solve t²(3−2t)=p for
       t = h/2R by Newton iteration), so low stock pools at the bottom and 50%
       volume sits exactly mid-sphere. Also drives the PLAN-card STOCK donut
       (C3 vs C4 segments, center = total LPG in t).
       No initial stock → dashed empty shell, "—" center, card shows the
       No-opening-stock notice instead of C3/C4. */
    /* v4.36.0 — capacity derived from geometry per user decision: 11 m ball
       tank → V = 4/3·π·R³ (R = 5.5 m) ≈ 696.91 m³ × 0.54 t/m³ ≈ 376,331 kg
       (replaces the rounded 376,000 literal; visual % shift < 0.1%). */
    const TANK_CAP_KG = (4/3) * Math.PI * Math.pow(5.5, 3) * 0.54 * 1000;
    /* spherical-cap inverse: volume fraction p → height fraction t (h/2R) */
    function capLevel(p){
      p = Math.max(0, Math.min(1, p));
      let t = p;                                    /* good seed; converges fast */
      for(let i=0;i<6;i++){
        const f = t*t*(3-2*t) - p, d = 6*t*(1-t);
        if(Math.abs(d) < 1e-9) break;
        t -= f/d;
        if(t<0) t=0; else if(t>1) t=1;
      }
      return t;
    }
    /* SVG geometry: shell r=23, cy=30 → liquid spans y 7…53 (height 46) */
    const BALL_TOP=7, BALL_BOT=53, BALL_H=46;
    function setBall(n, c){
      const card=document.getElementById('scTk'+n+'Card');
      const wrap=document.getElementById('scTkBall'+n);
      const liq =document.getElementById('scTkLiq'+n);
      const surf=document.getElementById('scTkSurf'+n);
      const pct =document.getElementById('scTkPct'+n);
      if(!liq) return;
      if(!c.hasInit){
        liq.setAttribute('y', BALL_BOT); liq.setAttribute('height', 0);
        if(surf){ surf.setAttribute('y1', BALL_BOT); surf.setAttribute('y2', BALL_BOT); }
        if(pct)  pct.textContent = '—';
        if(wrap){ wrap.classList.add('nostock'); wrap.classList.remove('lowstock');
                  wrap.title = 'No initial stock data — enter it via 📥 Initial Stock'; }
        if(card) card.classList.add('nostock');
      } else {
        const p = Math.max(0, Math.min(1, (c.lpg||0)/TANK_CAP_KG));
        const lvl = capLevel(p);                    /* liquid level fraction */
        const top = BALL_BOT - lvl*BALL_H;
        liq.setAttribute('y', top.toFixed(1));
        liq.setAttribute('height', (lvl*BALL_H).toFixed(1));
        if(surf){ surf.setAttribute('y1', top.toFixed(1)); surf.setAttribute('y2', top.toFixed(1)); }
        if(pct)  pct.textContent = Math.round(p*100)+'%';
        if(wrap){ wrap.classList.remove('nostock');
                  wrap.classList.toggle('lowstock', p>0 && p<=0.10);
                  wrap.title = ((c.lpg||0)/1000).toFixed(1)+' t / 376 t'; }
        if(card) card.classList.remove('nostock');
      }
    }
    let totLpg=0, totC3=0, totC4=0, totOpen=0, anyInit=false;
    [['2100','scInvLpg1','scInvC3_1','scInvC4_1',1],
     ['2101','scInvLpg2','scInvC3_2','scInvC4_2',2]].forEach(([sloc,lpgId,c3Id,c4Id,n])=>{
      const c=compute(sloc);
      const lpgEl=document.getElementById(lpgId);
      const c3El =document.getElementById(c3Id);
      const c4El =document.getElementById(c4Id);
      if(!c.hasInit){
        if(lpgEl) lpgEl.innerHTML='<span class="sc-inv-empty">—</span>';
        if(c3El)  c3El.innerHTML ='<span class="sc-inv-empty">—</span>';
        if(c4El)  c4El.innerHTML ='<span class="sc-inv-empty">—</span>';
      } else {
        if(lpgEl) lpgEl.innerHTML=fmtKg(c.lpg);
        if(c3El)  c3El.innerHTML =fmtKg(c.c3Cur);
        if(c4El)  c4El.innerHTML =fmtKg(c.c4Cur);
        anyInit=true; totLpg+=c.lpg||0; totC3+=c.c3Cur||0; totC4+=c.c4Cur||0;
        totOpen+=(c.c3Init||0)+(c.c4Init||0);   /* v4.36.1 — opening baseline for the drain donut */
      }
      setBall(n, c);
    });
    /* PLAN card (Cluster 3) STOCK legend = total of BOTH tanks */
    const setTot=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = anyInit?fmtKg(v):'—'; };
    setTot('scPlanStockLpg', totLpg);
    setTot('scPlanStockC3',  totC3);
    setTot('scPlanStockC4',  totC4);
    /* v4.36.2 — OPEN baseline figure (the donut's 100% reference) */
    (function(){
      const el=document.getElementById('scPlanStockOpen');
      if(el) el.textContent = anyInit ? fmtKg(totOpen) : '—';
    })();
    /* v4.36.1 — STOCK donut semantics per user decision: the ring represents
       the day's OPENING LPG (both tanks) and the arc DRAINS in real time —
       arc fraction = current LPG ÷ opening LPG (clamped; cavern receipts can
       push it past 100%). Center = current LPG in t. No init → dashed empty
       ring + "—". RAM-only, runs on every INV change.
       v4.36.2 — arc color shifts with remaining level: ≥40% blue,
       15–40% amber, <15% red. */
    (function(){
      const wrap=document.getElementById('scStockDonutWrap');
      const arc =document.getElementById('scStockDonutC3');
      const ctr =document.getElementById('scStockDonutLpg');
      if(!arc) return;
      const CIRC=2*Math.PI*24;
      arc.classList.remove('lv-mid','lv-low');
      if(!anyInit || totOpen<=0){
        wrap&&wrap.classList.add('empty');
        arc.style.strokeDasharray='0 '+CIRC.toFixed(1);
        if(ctr) ctr.textContent='—';
      } else {
        wrap&&wrap.classList.remove('empty');
        const pLeft=Math.max(0,Math.min(1,totLpg/totOpen));
        if(pLeft<0.15)      arc.classList.add('lv-low');
        else if(pLeft<0.40) arc.classList.add('lv-mid');
        arc.style.strokeDasharray=(pLeft*CIRC).toFixed(1)+' '+CIRC.toFixed(1);
        if(ctr) ctr.textContent=(totLpg/1000).toFixed(1);
        if(wrap) wrap.title='LPG '+(totLpg/1000).toFixed(1)+' t left of '+(totOpen/1000).toFixed(1)+' t opening ('+Math.round(pLeft*100)+'%)';
      }
    })();
    /* keep legacy chip in sync (follows selected tank) in case external code reads it */
    const chip=document.getElementById('scInvChip');
    if(chip){
      const c=compute(_scaleSelectedSloc());
      if(!c.hasInit) chip.innerHTML='<span class="sc-inv-empty">no initial stock</span>';
      else chip.innerHTML='<span class="k">LPG</span><b class="lpg">'+fmtKg(c.lpg)+'</b>';
    }
    /* v4.36.1 — refresh the per-tank opening-stock mini-rows on the console */
    try{ if(typeof SCX2 !== 'undefined') SCX2.renderTankExtras(); }catch(_){}
    /* v4.119 — tồn bồn đổi ⇒ dải dự báo tồn kho vẽ lại */
    try{ if(typeof FCST !== 'undefined') FCST.schedule(); }catch(_){}
  }

  /* ── tank view switch ── */
  function view(sloc){ sel=sloc; render(); }
  function onTankSwitch(n){ const sl=SLOC[n]; if(sl){ sel=sl; render(); } }

  /* ── modal open/close ── */
  /* v4.108 — thêm tiền tố 'stx' (Stock-transfer reconciliation) vào danh sách
     modal do INV sở hữu, không thì bấm × / Close không đóng được bảng đó. */
  function closeAll(){ document.querySelectorAll('.modal-bg').forEach(m=>{
    if(m.id.indexOf('inv')===0 || m.id.indexOf('stx')===0) m.classList.remove('on'); }); }
  function open(id){ const m=document.getElementById(id); if(m) m.classList.add('on'); }

  function _setPick(containerId, sloc){
    const wrap=document.getElementById(containerId); if(!wrap) return;
    const btns=wrap.querySelectorAll('button');
    btns.forEach((b,i)=>{ b.className = (i===0&&sloc==='2100')?'on-3501':(i===1&&sloc==='2101')?'on-3502':''; });
  }

  /* Tồn đầu ngày */
  function openInit(){
    _initPick = sel;
    _setPick('invInitPick', _initPick);
    const b=bucket(ds(),_initPick);
    document.getElementById('invInitC3').value = b.init? b.init.c3 : '';
    document.getElementById('invInitC4').value = b.init? b.init.c4 : '';
    /* prefill with EFFECTIVE %wt (override → init.wtC3) so reopening shows the live value */
    const effWt = (b.wt && isFinite(b.wt.wtC3)) ? num(b.wt.wtC3)
                : (b.init && isFinite(b.init.wtC3)) ? num(b.init.wtC3) : '';
    document.getElementById('invInitWt').value = effWt;
    open('invInitModal');
  }
  function pickInit(sloc){
    _initPick=sloc; _setPick('invInitPick', sloc);
    const b=bucket(ds(),sloc);
    document.getElementById('invInitC3').value = b.init? b.init.c3 : '';
    document.getElementById('invInitC4').value = b.init? b.init.c4 : '';
    const effWt = (b.wt && isFinite(b.wt.wtC3)) ? num(b.wt.wtC3)
                : (b.init && isFinite(b.init.wtC3)) ? num(b.init.wtC3) : '';
    document.getElementById('invInitWt').value = effWt;
  }
  function saveInit(){
    const h=fb(); if(!h){ toast('Firebase not ready','er'); return; }
    const c3=num(document.getElementById('invInitC3').value);
    const c4=num(document.getElementById('invInitC4').value);
    let wt=num(document.getElementById('invInitWt').value); if(!wt) wt=DEFAULT_WT;
    if(c3<0||c4<0){ toast('Invalid value','er'); return; }
    const sloc=_initPick, d=ds();
    const ts=_vts(), user=by();
    const initRec={ c3, c4, wtC3:wt, ts, by:user };
    const updates={};
    updates['inv_daily/'+d+'/'+sloc+'/init']=initRec;
    updates['inv_daily/'+d+'/'+sloc+'/wt']=null;     // a fresh init clears any %wt override
    const key=h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key]={ type:'init', c3, c4, wtC3:wt, note:'Initial stock', ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver']=ts;   // version bump → listeners re-sync + recompute
    h.ref().update(updates)
      .then(()=>{ toast('✓ Initial stock saved · '+TKNAME[sloc],'ok'); sel=sloc; closeAll(); })
      .catch(e=>{ if(typeof fbErr==='function') fbErr(e,'Initial stock'); else { console.warn('[INV] saveInit',e); toast('Failed to save initial stock','er'); } });
  }

  /* ══ v4.146 — LƯU TỒN ĐẦU / %wt TỪ MỘT MÀN HÌNH KHÁC ═══════════════
     Tank Console cho gõ thẳng Initial stock ngay trên bảng, không phải mở
     thêm hộp thoại. Hai hàm này làm ĐÚNG việc saveInit/saveWt làm (cùng
     bản ghi, cùng dòng history, cùng _ver bump) nhưng KHÔNG gọi closeAll —
     bảng gọi nó phải còn nguyên sau khi lưu. Đừng nhân bản logic: ai sửa
     luật lưu thì sửa CẢ HAI chỗ, hoặc gộp lại. */
  function saveInitFor(sloc, c3v, c4v, wtv, cb){
    const done = (ok, why) => { if(typeof cb === 'function'){ try{ cb(ok, why); }catch(_){} } return ok; };
    const h = fb(); if(!h) return done(false, 'no-firebase');
    if(!TKNAME[sloc]) return done(false, 'bad-tank');
    const c3 = num(c3v), c4 = num(c4v);
    if(c3 < 0 || c4 < 0) return done(false, 'negative');
    let wt = num(wtv), wtApp = false;
    if(!wt || wt <= 0 || wt > 100){ wt = _wtInt(c3, c4); wtApp = true; }
    if(wt === null || !(wt > 0)) wt = DEFAULT_WT;
    const d = ds(), ts = _vts(), user = by();
    const updates = {};
    updates['inv_daily/'+d+'/'+sloc+'/init'] = wtApp ? { c3, c4, wtC3:wt, wtApp:true, ts, by:user }
                                                     : { c3, c4, wtC3:wt, ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/wt']   = null;   /* khai lại tồn đầu thì xoá số %wt gõ đè */
    const key = h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key] =
      { type:'init', c3, c4, wtC3:wt, note:'Initial stock', ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver'] = ts;
    h.ref().update(updates)
      .then(()=>{ toast('✓ Initial stock saved · '+TKNAME[sloc],'ok'); done(true,'ok'); })
      .catch(e=>{ console.warn('[INV] saveInitFor', e);
                  toast('Failed to save the initial stock','er'); done(false,'fb-error'); });
    return true;
  }
  function saveWtFor(sloc, wtv, cb){
    const done = (ok, why) => { if(typeof cb === 'function'){ try{ cb(ok, why); }catch(_){} } return ok; };
    const h = fb(); if(!h) return done(false, 'no-firebase');
    if(!TKNAME[sloc]) return done(false, 'bad-tank');
    const wt = num(wtv);
    if(!wt || wt <= 0 || wt > 100){ toast('Invalid %wt C3 (0–100)','er'); return done(false, 'bad-wt'); }
    const d = ds(), ts = _vts(), user = by();
    const updates = {};
    updates['inv_daily/'+d+'/'+sloc+'/wt'] = { wtC3:wt, ts, by:user };
    const key = h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key] =
      { type:'wt', wtC3:wt, note:'%wt C3 update', ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver'] = ts;
    h.ref().update(updates)
      .then(()=>{ toast('✓ %wt C3 updated · '+TKNAME[sloc]+' = '+wt,'ok'); done(true,'ok'); })
      .catch(e=>{ console.warn('[INV] saveWtFor', e);
                  toast('Failed to save %wt','er'); done(false,'fb-error'); });
    return true;
  }

  /* ══ v4.147 — GHI CAVERN / LIÊN BỒN TỪ MỘT BẢNG KHÁC ═══════════════
     Tank Console cho gõ thẳng trên bảng: thêm mới KHI key rỗng, SỬA LẠI khi
     truyền key của dòng cũ. Cùng bản ghi, cùng _ver bump như saveCavern/
     saveXfer, chỉ khác là KHÔNG gọi closeAll.
     ⚠ Dòng liên bồn nằm ở CẢ HAI bồn và dính nhau bằng `_pairId` — sửa thì
     phải sửa cả hai, không thì hai bồn nói khác nhau (cùng luật mà delHist
     đang dùng để xoá). */
  function histFor(sloc, d){
    const b = bucket(d || ds(), sloc);
    return Object.keys(b.history || {})
      .map(k => Object.assign({ _k:k }, b.history[k]))
      .filter(e => e && e.type)
      .sort((a, z) => (a.ts||0) - (z.ts||0));
  }
  function saveCavernFor(sloc, c3v, c4v, note, key, cb){
    const done = (ok, why) => { if(typeof cb === 'function'){ try{ cb(ok, why); }catch(_){} } return ok; };
    const h = fb(); if(!h) return done(false, 'no-firebase');
    if(!TKNAME[sloc]) return done(false, 'bad-tank');
    const c3 = num(c3v), c4 = num(c4v);
    if(!c3 && !c4) return done(false, 'empty');
    const d = ds(), ts = _vts(), user = by();
    const k = key || h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    const updates = {};
    updates['inv_daily/'+d+'/'+sloc+'/history/'+k] =
      { type:'cavern', c3, c4, note:String(note||''), ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver'] = ts;
    h.ref().update(updates)
      .then(()=>{ toast((key ? '✓ Cavern receipt updated · ' : '✓ Cavern receipt recorded · ')
                        + TKNAME[sloc], 'ok'); done(true,'ok'); })
      .catch(e=>{ console.warn('[INV] saveCavernFor', e);
                  toast('Failed to save the cavern receipt','er'); done(false,'fb-error'); });
    return true;
  }
  function saveXferFor(from, c3v, c4v, note, pairId, cb){
    const done = (ok, why) => { if(typeof cb === 'function'){ try{ cb(ok, why); }catch(_){} } return ok; };
    const h = fb(); if(!h) return done(false, 'no-firebase');
    const to = OTHER[from];
    if(!TKNAME[from] || !to) return done(false, 'bad-tank');
    const c3 = num(c3v), c4 = num(c4v);
    if(c3 < 0 || c4 < 0) return done(false, 'negative');
    if(!c3 && !c4) return done(false, 'empty');
    const d = ds(), ts = _vts(), user = by();
    const pid = pairId || (h.ref().push().key) || ('p' + ts);
    const updates = {};
    /* sửa: bỏ HAI dòng cũ mang đúng _pairId đó ở cả hai bồn rồi ghi lại */
    if(pairId){
      [from, to].forEach(sl=>{
        const bk = bucket(d, sl);
        Object.keys(bk.history || {}).forEach(k=>{
          if(bk.history[k] && bk.history[k]._pairId === pairId)
            updates['inv_daily/'+d+'/'+sl+'/history/'+k] = null;
        });
      });
    }
    const base = { type:'xfer', c3, c4, fromSl:from, toSl:to,
                   note:String(note||''), ts, by:user, _pairId:pid };
    const kF = h.ref('inv_daily/'+d+'/'+from+'/history').push().key;
    const kT = h.ref('inv_daily/'+d+'/'+to  +'/history').push().key;
    updates['inv_daily/'+d+'/'+from+'/history/'+kF] = base;
    updates['inv_daily/'+d+'/'+to  +'/history/'+kT] = base;
    updates['inv_daily/'+d+'/'+from+'/_ver'] = ts;
    updates['inv_daily/'+d+'/'+to  +'/_ver'] = ts;
    h.ref().update(updates)
      .then(()=>{ toast((pairId ? '✓ Transfer updated · ' : '✓ Transferred ')
                        + TKNAME[from] + ' → ' + TKNAME[to], 'ok'); done(true,'ok'); })
      .catch(e=>{ console.warn('[INV] saveXferFor', e);
                  toast('Failed to save the tank transfer','er'); done(false,'fb-error'); });
    return true;
  }
  /* Xoá một dòng sổ mà KHÔNG hỏi confirm và KHÔNG bám vào `sel` — bảng gọi
     nó tự hỏi trước. (delHist cũ giữ nguyên cho modal 📜.) */
  function delHistFor(sloc, key, pairId, cb){
    const done = (ok) => { if(typeof cb === 'function'){ try{ cb(ok); }catch(_){} } return ok; };
    const h = fb(); if(!h || !key) return done(false);
    const d = ds(), ts = _vts(), updates = {};
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key] = null;
    /* v4.152 — xoá dòng cavern do ✅ tự ghi thì phải gỡ luôn dấu chống trùng,
       không thì bấm ✅ lại sẽ bị coi là "đã cộng rồi" và không cộng nữa. */
    try{
      const bk = bucket(d, sloc);
      Object.keys(bk.mixIn || {}).forEach(mk=>{
        const e = bk.mixIn[mk];
        if(e && e.via === 'cavern' && e.key === key)
          updates['inv_daily/'+d+'/'+sloc+'/mixIn/'+mk] = null;
      });
    }catch(_){}
    updates['inv_daily/'+d+'/'+sloc+'/_ver'] = ts;
    if(pairId){
      const other = OTHER[sloc], ob = bucket(d, other);
      Object.keys(ob.history || {}).forEach(k=>{
        if(ob.history[k] && ob.history[k]._pairId === pairId)
          updates['inv_daily/'+d+'/'+other+'/history/'+k] = null;
      });
      updates['inv_daily/'+d+'/'+other+'/_ver'] = ts;
    }
    h.ref().update(updates)
      .then(()=>{ toast('Deleted','ok'); done(true); })
      .catch(e=>{ console.warn('[INV] delHistFor', e); toast('Delete failed','er'); done(false); });
    return true;
  }

  /* %wt C3 — standalone update (v4.22.14)
     Writes ONLY the wt override node (inv_daily/{date}/{sloc}/wt). Does NOT
     touch the init C3/C4 values. Mirrors V406's _tiSaveWt path. compute()
     already prefers wt.wtC3 over init.wtC3, so a saved override takes effect
     immediately. Also writes a history entry of type 'wt' for audit. */
  let _wtPick = '2100';
  function openWt(){
    _wtPick = sel;
    _setPick('invWtPick', _wtPick);
    /* prefill with EFFECTIVE current %wt (override → init.wtC3 → default) */
    const b=bucket(ds(),_wtPick);
    const cur = (b.wt && isFinite(b.wt.wtC3)) ? num(b.wt.wtC3)
              : (b.init && isFinite(b.init.wtC3)) ? num(b.init.wtC3) : DEFAULT_WT;
    document.getElementById('invWtVal').value = cur;
    open('invWtModal');
  }
  function pickWt(sloc){
    _wtPick = sloc; _setPick('invWtPick', sloc);
    const b=bucket(ds(),sloc);
    const cur = (b.wt && isFinite(b.wt.wtC3)) ? num(b.wt.wtC3)
              : (b.init && isFinite(b.init.wtC3)) ? num(b.init.wtC3) : DEFAULT_WT;
    document.getElementById('invWtVal').value = cur;
  }
  function saveWt(){
    const h=fb(); if(!h){ toast('Firebase not ready','er'); return; }
    const wt = num(document.getElementById('invWtVal').value);
    if(!wt || wt<=0 || wt>100){ toast('Invalid %wt C3 (0–100)','er'); return; }
    const sloc=_wtPick, d=ds(), ts=_vts(), user=by();
    const updates={};
    updates['inv_daily/'+d+'/'+sloc+'/wt']={ wtC3:wt, ts, by:user };
    const key=h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key]={ type:'wt', wtC3:wt, note:'%wt C3 update', ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver']=ts;
    h.ref().update(updates)
      .then(()=>{ toast('✓ %wt C3 updated · '+TKNAME[sloc]+' = '+wt,'ok'); sel=sloc; closeAll(); })
      .catch(e=>{ if(typeof fbErr==='function') fbErr(e,'%wt C3'); else { console.warn('[INV] saveWt',e); toast('Failed to save %wt','er'); } });
  }

  /* Cavern */
  function openCavern(){
    _cavPick=sel; _setPick('invCavPick', _cavPick);
    document.getElementById('invCavC3').value='';
    document.getElementById('invCavC4').value='';
    document.getElementById('invCavNote').value='';
    open('invCavernModal');
  }
  function pickCav(sloc){ _cavPick=sloc; _setPick('invCavPick', sloc); }
  function saveCavern(){
    const h=fb(); if(!h){ toast('Firebase not ready','er'); return; }
    const c3=num(document.getElementById('invCavC3').value);
    const c4=num(document.getElementById('invCavC4').value);
    if(!c3 && !c4){ toast('Enter at least one value','er'); return; }
    const note=document.getElementById('invCavNote').value.trim();
    const sloc=_cavPick, d=ds(), ts=_vts(), user=by();
    const key=h.ref('inv_daily/'+d+'/'+sloc+'/history').push().key;
    const updates={};
    updates['inv_daily/'+d+'/'+sloc+'/history/'+key]={ type:'cavern', c3, c4, note, ts, by:user };
    updates['inv_daily/'+d+'/'+sloc+'/_ver']=ts;
    h.ref().update(updates)
      .then(()=>{ toast('✓ Cavern receipt recorded · '+TKNAME[sloc],'ok'); sel=sloc; closeAll(); })
      .catch(e=>{ console.warn('[INV] saveCavern',e); toast('Save failed','er'); });
  }

  /* Inter-tank transfer */
  function openXfer(){
    _xferFrom = sel;
    _setPick('invXferPick', _xferFrom);
    _renderXferDir();
    document.getElementById('invXferC3').value='';
    document.getElementById('invXferC4').value='';
    document.getElementById('invXferNote').value='';
    open('invXferModal');
  }
  function pickXferFrom(sloc){ _xferFrom=sloc; _setPick('invXferPick', sloc); _renderXferDir(); }
  function _renderXferDir(){
    const to=OTHER[_xferFrom];
    const cl=s=>s==='2100'?'t3501':'t3502';
    const el=document.getElementById('invXferDir');
    if(el) el.innerHTML='<span class="tk '+cl(_xferFrom)+'">'+TKNAME[_xferFrom]+'</span><span class="arr">→</span><span class="tk '+cl(to)+'">'+TKNAME[to]+'</span>';
  }
  function saveXfer(){
    const h=fb(); if(!h){ toast('Firebase not ready','er'); return; }
    const c3=num(document.getElementById('invXferC3').value);
    const c4=num(document.getElementById('invXferC4').value);
    if(c3<0||c4<0){ toast('Invalid value','er'); return; }
    if(!c3 && !c4){ toast('Enter a transfer amount','er'); return; }
    const from=_xferFrom, to=OTHER[from], d=ds(), ts=_vts(), user=by();
    const note=document.getElementById('invXferNote').value.trim();
    const pairId = (h.ref().push().key)||('p'+ts);
    const kFrom=h.ref('inv_daily/'+d+'/'+from+'/history').push().key;
    const kTo  =h.ref('inv_daily/'+d+'/'+to  +'/history').push().key;
    const base={ type:'xfer', c3, c4, fromSl:from, toSl:to, note, ts, by:user, _pairId:pairId };
    const updates={};
    updates['inv_daily/'+d+'/'+from+'/history/'+kFrom]=base;
    updates['inv_daily/'+d+'/'+to  +'/history/'+kTo  ]=base;
    updates['inv_daily/'+d+'/'+from+'/_ver']=ts;
    updates['inv_daily/'+d+'/'+to  +'/_ver']=ts;
    h.ref().update(updates)
      .then(()=>{ toast('✓ Transferred '+TKNAME[from]+' → '+TKNAME[to],'ok'); sel=from; closeAll(); })
      .catch(e=>{ console.warn('[INV] saveXfer',e); toast('Failed to save tank transfer','er'); });
  }

  /* History */
  function openHistory(){
    document.getElementById('invHistTitle').textContent='📜 History · '+TKNAME[sel]+' · '+todayDMY();
    renderHist();
    open('invHistModal');
  }
  function renderHist(){
    const body=document.getElementById('invHistBody'); if(!body) return;
    const b=bucket(ds(),sel);
    const rows=Object.keys(b.history||{}).map(k=>({k, ...b.history[k]})).sort((a,z)=>(a.ts||0)-(z.ts||0));
    if(!rows.length){ body.innerHTML='<tr><td colspan="8" class="inv-hist-empty">No data yet</td></tr>'; return; }
    const LBL={init:'Init',cavern:'Cavern',xfer:'Xfer',wt:'%wt'};
    body.innerHTML = rows.map(r=>{
      const d=new Date(r.ts||0), p=n=>String(n).padStart(2,'0');
      const hm=p(d.getHours())+':'+p(d.getMinutes());
      let note=r.note||'';
      if(r.type==='xfer'){ note=(r.fromSl===sel?'→ '+TKNAME[r.toSl]:'← '+TKNAME[r.fromSl])+(note?' · '+note:''); }
      const sign = r.type==='xfer' && r.fromSl===sel ? -1 : 1;
      const c3=r.c3!=null?fmtKg(sign*num(r.c3)):'—', c4=r.c4!=null?fmtKg(sign*num(r.c4)):'—';
      const wt=r.wtC3!=null?(+num(r.wtC3).toFixed(1)):'—';
      return '<tr><td>'+hm+'</td><td><span class="inv-hist-type '+r.type+'">'+(LBL[r.type]||r.type)+'</span></td>'+
        '<td>'+c3+'</td><td>'+c4+'</td><td>'+wt+'</td><td>'+(note||'—')+'</td><td>'+(r.by||'—')+'</td>'+
        '<td><button class="inv-hist-del" title="Xoá" onclick="INV.delHist(\''+r.k+'\',\''+(r._pairId||'')+'\')">🗑</button></td></tr>';
    }).join('');
  }
  function delHist(key, pairId){
    if(!confirm('Delete this history entry?')) return;
    const h=fb(); if(!h) return;
    const d=ds(), ts=_vts();
    const updates={};
    updates['inv_daily/'+d+'/'+sel+'/history/'+key]=null;
    updates['inv_daily/'+d+'/'+sel+'/_ver']=ts;
    if(pairId){
      /* remove the mirrored xfer entry in the other tank too */
      const other=OTHER[sel], ob=bucket(d,other);
      Object.keys(ob.history||{}).forEach(k=>{ if(ob.history[k] && ob.history[k]._pairId===pairId) updates['inv_daily/'+d+'/'+other+'/history/'+k]=null; });
      updates['inv_daily/'+d+'/'+other+'/_ver']=ts;
    }
    h.ref().update(updates)
      .then(()=>{ toast('Deleted','ok'); renderHist(); })
      .catch(e=>{ console.warn('[INV] delHist',e); toast('Delete failed','er'); });
  }

  /* Export breakdown — every truck loaded today from the selected tank, with its
     Net Weight split into C3/C4 using the tank's ENTERED %wt C3, plus a grand total.
     Pulls trucks read-only from TL.ROWS (no Firebase write).
     v4.22.15 — added in-modal tank picker (TK-3501 / TK-3502). Switching tank
     re-runs the calculation against TL.ROWS without closing the modal. */
  let _exportPick = '2100';
  let _exportDate = '';                 // dmy 'dd/mm/yy' — date being split
  let _exportRows = [];                 // {doNo, cust, lpg, c3, c4, sel}
  let _exportMeta = { sloc:'2100', pctC3:0, dmy:'' };

  /* dmy 'dd/mm/yy' ↔ ISO 'yyyy-mm-dd' (for the <input type="date">) */
  function _dmyToISO(dmy){ const m=String(dmy||'').split('/'); return m.length===3 ? '20'+m[2]+'-'+m[1]+'-'+m[0] : ''; }
  function _isoToDMY(iso){ const m=String(iso||'').split('-'); return m.length===3 ? m[2]+'/'+m[1]+'/'+m[0].slice(-2) : ''; }

  /* EXPORT detection — the TRADE column written by scale.js is authoritative
     ('Export' / 'Export (Pure)' vs 'Domestic' / 'Domestic (Pure)').
     v4 fix: the old regex /EX|.../ matched "EX" inside names like PETIMEX and
     let Domestic trucks leak in. Now: if trade is set, ONLY trade decides.
     Name fallback (whole-word) is used only when trade is blank. */
  function _isExport(r){
    const tr = String(r.trade||'').trim().toUpperCase();
    if(tr) return tr.indexOf('EXPORT')===0;   // 'EXPORT', 'EXPORT (PURE)'
    const t = (String(r.dest||'')+' '+String(r.cust||'')+' '+String(r.custFull||'')).toUpperCase();
    return /\bEXPORT\b|수출|\bXK\b|XUẤT KHẨU|XUAT KHAU/.test(t);
  }

  /* ══ v4.147 — DANH SÁCH XE EXPORT, THUẦN TÍNH ═══════════════════════
     Tách khỏi _renderExport để bảng Tank Console dựng được danh sách này
     ngay trên giao diện ngoài mà không phải mở modal. MỘT nguồn dòng duy
     nhất cho cả hai màn hình — đừng chép lại vòng lặp này chỗ khác.
     `dmy` khuôn DD/MM/YY (đúng khuôn TL Data lưu). */
  function exportRowsFor(sloc, dmy, pct){
    const suffix = sloc === '2100' ? '3501' : '3502';
    const day = dmy || todayDMY();
    const p = (pct === null || pct === undefined) ? num(_wmsWt(sloc).wt) : num(pct);
    const rows = [];
    if(typeof TL !== 'undefined' && TL.ROWS){
      Object.keys(TL.ROWS).forEach(rid=>{
        const r = TL.ROWS[rid];
        if(!r || r.disabled || !r.date) return;
        if(r.date !== day) return;
        if(!String(r.ltank||'').toUpperCase().includes(suffix)) return;
        if(!_isExport(r)) return;
        const lpg = Math.round(num(r.lpgQty));
        if(lpg <= 0) return;
        /* ⚠ LÀM TRÒN TỪNG ĐƠN: C3 chốt tới kg cho MỖI xe, C4 là phần bù của
           chính xe đó. Tổng ở dưới CỘNG TỪ mấy con số đã chốt này chứ không
           bao giờ tính lại từ tổng LPG (luật v4.75, user nhắc lại 15/09). */
        const x = _splitByWt(lpg, p);
        rows.push({ key:String(rid), doNo:String(r.doNo||'—'), cust:String(r.cust||''),
                    truck:String(r.truck||''), driver:String(r.driver||''),
                    lot:String(r.lot||''), lpg:x.total, c3:x.c3, c4:x.c4 });
      });
    }
    rows.sort((a,b)=>String(a.doNo).localeCompare(String(b.doNo), undefined, { numeric:true }));
    /* Σ CỘNG TỪ CHI TIẾT, không tính lại từ tổng (luật v4.75). */
    const t = rows.reduce((o,r)=>({ lpg:o.lpg+r.lpg, c3:o.c3+r.c3, c4:o.c4+r.c4 }),
                          { lpg:0, c3:0, c4:0 });
    return { rows:rows, tot:t, pct:p, day:day };
  }
  function todayDmy(){ return todayDMY(); }

  function openExport(){
    _exportPick = sel;       // default to the tank shown in XFER card
    _exportDate = todayDMY();             // default: today
    const di=document.getElementById('invExportDate');
    if(di) di.value=_dmyToISO(_exportDate);
    _setPick('invExportPick', _exportPick);
    _renderExport(_exportPick);
    open('invExportModal');
  }
  function pickExport(sloc){
    _exportPick = sloc;
    _setPick('invExportPick', sloc);
    _renderExport(sloc);
  }
  function pickExportDate(iso){
    const dmy=_isoToDMY(iso);
    if(!dmy) return;
    _exportDate=dmy;
    _renderExport(_exportPick);
  }
  function _renderExport(sloc){
    /* v4.144 — nền tách là %wt WMS, không còn là wtC3 khai báo của bồn. */
    const W = _wtPaint('Export', sloc);
    const pctC3 = num(W.wt)/100;
    const suffix = sloc==='2100' ? '3501' : '3502';
    const dmy=_exportDate||todayDMY();
    const rows=[];
    if(typeof TL!=='undefined' && TL.ROWS){
      Object.values(TL.ROWS).forEach(r=>{
        if(!r || r.disabled || !r.date) return;
        if(r.date!==dmy) return;
        if(!String(r.ltank||'').toUpperCase().includes(suffix)) return;
        if(!_isExport(r)) return;                 // ⬅ EXPORT customers only (skip domestic)
        const lpg=Math.round(num(r.lpgQty));
        if(lpg<=0) return;
        /* v4.75 — mọi giá trị lưu ở dòng ĐỀU là số nguyên kg đã làm tròn, đúng
           bằng con số hiển thị. C3 = round(LPG × %wt), C4 = LPG − C3.
           Tổng ở khung summary = Σ các dòng (KHÔNG tính lại từ tổng LPG),
           nên tổng luôn khớp chi tiết, không lệch 1 kg do làm tròn 2 lần. */
        const s=_splitByWt(lpg, pctC3*100);
        rows.push({ doNo:String(r.doNo||'—'), cust:String(r.cust||''), lpg:s.total, c3:s.c3, c4:s.c4, sel:true });
      });
    }
    rows.sort((a,b)=>String(a.doNo).localeCompare(String(b.doNo),undefined,{numeric:true}));
    _exportRows = rows;
    _exportMeta = { sloc, pctC3, dmy, wtSrc:W.src };
    document.getElementById('invExportTitle').textContent='📋 Export C3/C4 split · '+TKNAME[sloc]+' · '+dmy;
    _renderExportBody();
    _recalcExport();
  }

  /* render the per-truck rows with a select checkbox (click row or box to toggle) */
  function _renderExportBody(){
    const body=document.getElementById('invExportBody');
    if(!body) return;
    if(!_exportRows.length){
      body.innerHTML='<tr><td colspan="6" class="inv-export-empty">No EXPORT trucks on '+(_exportMeta.dmy||todayDMY())+' from '+TKNAME[_exportMeta.sloc]+'</td></tr>';
      return;
    }
    body.innerHTML=_exportRows.map((r,i)=>
      '<tr class="inv-export-row'+(r.sel?'':' off')+'" onclick="INV.toggleExportRow('+i+')">'
      +'<td class="pick"><input type="checkbox" '+(r.sel?'checked':'')+' onclick="event.stopPropagation();INV.toggleExportRow('+i+')"></td>'
      +'<td>'+r.doNo+'</td><td>'+(r.cust||'—')+'</td><td>'+fmtKg(r.lpg)+'</td>'
      +'<td class="c3">'+fmtKg(r.c3)+'</td><td class="c4">'+fmtKg(r.c4)+'</td></tr>').join('');
  }

  /* recompute totals from SELECTED rows only */
  function _recalcExport(){
    const selRows=_exportRows.filter(r=>r.sel);
    /* v4.75 — CỘNG DỒN TỪ CHI TIẾT. Tuyệt đối không tính totC3 = totLpg × %wt
       (cách cũ gây lệch 1 kg: 124.630 × 48% = 59.822,4 → 59.822 trong khi Σ các
       dòng đã làm tròn = 59.823). Chi tiết là chuẩn, tổng bám theo chi tiết. */
    const totLpg=selRows.reduce((s,r)=>s+Math.round(r.lpg),0);
    const totC3 =selRows.reduce((s,r)=>s+Math.round(r.c3),0);
    const totC4 =selRows.reduce((s,r)=>s+Math.round(r.c4),0);
    const sumEl=document.getElementById('invExportSum');
    if(sumEl){
      const cntTxt = (_exportRows.length && selRows.length!==_exportRows.length)
        ? selRows.length+' / '+_exportRows.length : String(selRows.length);
      sumEl.innerHTML=
        '<div class="box"><span class="k">SỐ XE</span><span class="v">'+cntTxt+'</span></div>'+
        '<div class="box"><span class="k">TỔNG LPG (kg)</span><span class="v lpg">'+fmtKg(totLpg)+'</span></div>'+
        '<div class="box"><span class="k">TỔNG C3 (kg)</span><span class="v c3">'+fmtKg(totC3)+'</span></div>'+
        '<div class="box"><span class="k">TỔNG C4 (kg)</span><span class="v c4">'+fmtKg(totC4)+'</span></div>';
    }
    /* keep the "select all" header box in sync */
    const allBox=document.getElementById('invExportAll');
    if(allBox){
      allBox.checked = _exportRows.length>0 && selRows.length===_exportRows.length;
      allBox.indeterminate = selRows.length>0 && selRows.length<_exportRows.length;
    }
  }

  function toggleExportRow(i){
    if(!_exportRows[i]) return;
    _exportRows[i].sel=!_exportRows[i].sel;
    _renderExportBody();
    _recalcExport();
  }
  function toggleExportAll(on){
    _exportRows.forEach(r=>{ r.sel=!!on; });
    _renderExportBody();
    _recalcExport();
  }

  /* ══ v4.144 — %wt C3 THEO WMS: MỘT NGUỒN DUY NHẤT ═══════════════════════
     BÀI TOÁN
     WMS mới là hệ thống chia một số LPG nhập vào thành C3/C4, và nó chia theo
     TỈ LỆ TỒN CỦA CHÍNH NÓ, không phải theo %wt của COQ. Hai con số này lệch
     nhau là bình thường: COQ là của MẺ vừa trộn, còn WMS là của CẢ BỒN sau khi
     đã cộng mẻ đó vào tồn cũ. Bảng tách C3/C4 phải nói đúng ngôn ngữ của WMS —
     nếu không thì số app in ra không khớp số WMS ghi, và phiếu lệch.

     NỀN TÍNH — tồn WMS của bồn = tồn đầu + mọi bút toán CỘNG VÀO bồn.
     ⚠ KHÔNG trừ hàng đã bán: WMS xuất mỗi xe đúng theo tỉ lệ đang có nên việc
     bán KHÔNG làm đổi tỉ lệ. Trừ đi chỉ rước thêm sai số làm tròn của từng
     dòng TL Data vào một con số vốn dĩ không đổi.

     THỨ TỰ NGUỒN (trên thắng dưới) — mỗi nấc đều tự nói ra mình là nấc nào:
       typed   người dùng gõ ngay trong bảng tách (chỉ sống trong phiên, KHÔNG lưu)
       manual  số đã lưu bằng nút 📐 %wt C3 update
       ledger  (tồn đầu + cavern + liên bồn) của chính sổ INV hôm nay
       sap     End Stock SAP D-1, dùng khi app chưa khai tồn đầu
       opening %wt gõ kèm lúc khai tồn đầu
       default hằng số 30 — ĐÃ LÀ ĐOÁN, chip phải đỏ
     ⚠ compute() / thẻ tank VẪN dùng wtC3 như cũ. Chỉ hai bảng tách (🧮 và 📤)
       đổi sang nền này; gộp hai đường đó là một quyết định RIÊNG. */
  const _wtIn  = { '2100':null, '2101':null };   /* %wt gõ tay trong phiên — RAM */
  const _wtLot = { '2100':'',   '2101':''   };   /* lot user chọn để tính %wt — RAM */
  function wtLotSet(sloc, lot){
    if(_wtLot[sloc] === undefined) return false;
    _wtLot[sloc] = String(lot || '').trim();
    return true;
  }
  function wtLotGet(sloc){ return _wtLot[sloc] || ''; }
  /* Mọi lot của bồn này đang có số Adj ST đã post — để bảng gợi ý cho user chọn. */
  function wtLotList(sloc){
    const out = [];
    try{
      const COL = ENG.STX_COLS || { adj3:71, adj4:72 };
      const STC = (ENG.ST_COL != null) ? ENG.ST_COL : 53;
      const want = _STX_TKNUM[sloc];
      (ENG.ROWS || []).forEach(r=>{
        if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
        if(String(r[STC]||'') !== '1') return;
        if(_stxN(r[COL.adj3]) === null) return;
        const l = String(r[1]||'').trim(); if(l && out.indexOf(l) < 0) out.push(l);
      });
    }catch(_){}
    return out.sort((a,b)=>_stxLotKey(b) - _stxLotKey(a)).slice(0, 12);
  }

  /* v4.155 — %wt C3 do APP TÍNH để dùng như WMS ⇒ SỐ NGUYÊN, đúng cách WMS
     làm tròn. Số người gõ tay thì giữ nguyên (người nhập luôn thắng). */
  function _wtInt(c3, c4){ const w = _wtRatio(c3, c4); return w === null ? null : Math.round(w); }
  /* %wt dùng cho tồn bồn: người gõ (wt) → giữ; lấy từ tồn đầu của app → làm tròn. */
  function _bucketWt(b){
    if(b && b.wt && isFinite(b.wt.wtC3)) return num(b.wt.wtC3);
    if(b && b.init && isFinite(b.init.wtC3)){
      const w = num(b.init.wtC3);
      return (b.init.auto || b.init.wtApp) ? Math.round(w) : w;
    }
    return DEFAULT_WT;
  }
  function _wtRatio(c3, c4){
    const t = num(c3) + num(c4);
    if(!(t > 0)) return null;
    return (num(c3) / t) * 100;
  }
  /* Mẻ MIX ĐÊM đã được chuyển kho lên WMS, đứng TRÊN ảnh chụp End Stock ngày
     `sapDay`. Chỉ đếm lot hội đủ BA điều kiện, thiếu một là bỏ:
       ① đúng bồn                     ② cờ ST = '1' (đã post thật lên WMS)
       ③ ô [71]/[72] Adj ST có số     ④ ngày SAP nền của lot ĐÚNG BẰNG sapDay
     Điều ④ là cái chống cộng trùng: nó bảo đảm số điều chỉnh đó đứng trên
     ĐÚNG con số SAP ta đang lấy làm nền, không phải của một ảnh chụp khác. */
  function _wmsMix(sloc, sapDay, onlyLot){
    const out = { c3:0, c4:0, lots:[], n:0 };
    if(!sapDay) return out;
    /* v4.148 — user chọn lot thì CHỈ cộng mẻ của lot đó */
    const want1 = String(onlyLot || '').trim();
    let rows = [];
    try{ rows = (typeof ENG !== 'undefined' && ENG.ROWS) ? ENG.ROWS : []; }catch(_){ return out; }
    const COL = (typeof ENG !== 'undefined' && ENG.STX_COLS) ? ENG.STX_COLS : { adj3:71, adj4:72 };
    const STC = (typeof ENG !== 'undefined' && ENG.ST_COL != null) ? ENG.ST_COL : 53;
    const want = _STX_TKNUM[sloc];
    rows.forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      if(String(r[STC] || '') !== '1') return;
      const a3 = _stxN(r[COL.adj3]), a4 = _stxN(r[COL.adj4]);
      if(a3 === null || a4 === null) return;
      if(want1 && !_stxLotMatch(r[1], want1)) return;
      let day = null;
      try{ day = _stxSapDate(r[3], r[4], r[5]); }catch(_){ return; }
      if(!day || !day.ok || day.sapDate !== sapDay) return;
      out.c3 += a3; out.c4 += a4; out.n++;
      const l = String(r[1]||'').trim(); if(l) out.lots.push(l);
    });
    return out;
  }

  /* ⚠ v4.148 — %wt CỦA WMS LÀ SỐ NGUYÊN.
     User: "phần WMS %wt C3 làm tròn tới không còn thập phân." WMS giữ tỉ lệ
     này ở dạng số nguyên, nên app phải nói đúng con số WMS dùng — để lại số
     lẻ là ra C3/C4 khác phiếu. Số thô giữ ở `raw` cho tooltip đối chiếu. */
  function _wmsRound(w){
    return (w === null || w === undefined || !isFinite(w)) ? null : Math.round(w);
  }
  function _wmsWt(sloc, lotOverride){
    const d = ds(), b = bucket(d, sloc);
    const R = { wt:null, raw:null, src:'', kind:'app', srcTxt:'', c3:null, c4:null,
                day:'', mixC3:0, mixC4:0, mixLots:[], lot:'', ok:false };
    const lotAsk = String(lotOverride != null ? lotOverride : (_wtLot[sloc] || '')).trim();

    /* ── ① %wt GÕ THẲNG thì thắng tất cả ── */
    const typed = _wtIn[sloc];
    if(typed !== null && typed !== undefined && isFinite(typed) && typed > 0 && typed <= 100){
      R.wt = _wmsRound(typed); R.raw = typed; R.src = 'typed'; R.kind = 'user'; R.ok = true;
      R.srcTxt = 'typed in this window — used here only, nothing is saved';
      return R;
    }
    /* ── ② %wt đã lưu bằng nút 📐 ── */
    if(b.wt && isFinite(b.wt.wtC3) && num(b.wt.wtC3) > 0){
      R.raw = num(b.wt.wtC3); R.wt = _wmsRound(R.raw);
      R.src = 'manual'; R.kind = 'user'; R.ok = true;
      R.srcTxt = 'entered with the %wt C3 button' + (b.wt.by ? ' by ' + b.wt.by : '');
      return R;
    }

    /* ── ③④ NỀN + MẺ MIX ĐÊM ────────────────────────────────────────────
       NỀN là tồn đầu của bồn trên hệ thống: **người dùng khai** thì lấy của
       người dùng, không thì lấy End Stock SAP D-1.
       CỘNG THÊM số chuyển kho ĐÃ ĐIỀU CHỈNH của mẻ mix đêm — ảnh chụp End
       Stock là số TRƯỚC khi post bút toán đó, nên không cộng vào là tỉ lệ
       thiếu nguyên một mẻ.
       ⚠ Nền do người dùng khai chính là con số SAP ấy ⇒ nền + điều chỉnh =
       tồn cuối THỰC TẾ, nên **%wt ra đúng bằng %wt COQ của lot vừa trộn**.
       Đó là phép tự kiểm: lệch nghĩa là một trong hai số đang sai. */
    const yest = _stxShift(d, -1);
    const mix  = _wmsMix(sloc, yest, lotAsk);
    R.mixC3 = mix.c3; R.mixC4 = mix.c4; R.mixLots = mix.lots;
    R.lot   = lotAsk || (mix.lots.length === 1 ? mix.lots[0] : '');

    let bC3 = null, bC4 = null, baseUser = false, baseTxt = '';
    if(b.init && (num(b.init.c3) + num(b.init.c4)) > 0){
      bC3 = num(b.init.c3); bC4 = num(b.init.c4); baseUser = true;
      baseTxt = 'initial stock entered in the app';
    } else {
      try{
        if(typeof SP !== 'undefined' && SP.tankEnd){
          const sp = SP.tankEnd(sloc, yest);
          if(sp && sp.has && (num(sp.c3) + num(sp.c4)) > 0){
            bC3 = num(sp.c3); bC4 = num(sp.c4); R.day = yest;
            baseTxt = 'SAP End Stock of ' + _stxDmy(yest);
          }
        }
      }catch(_){ }
    }
    if(bC3 !== null){
      const w = _wtRatio(bC3 + mix.c3, bC4 + mix.c4);
      if(w !== null){
        R.raw = w; R.wt = _wmsRound(w);
        R.c3 = bC3 + mix.c3; R.c4 = bC4 + mix.c4; R.ok = true;
        R.kind = baseUser ? 'user' : 'app';
        R.src  = (baseUser ? 'open' : 'sap') + (mix.n ? '+mix' : '');
        R.srcTxt = baseTxt
          + (lotAsk ? ' (lot ' + lotAsk + ' only)' : '')
          + (mix.n
              ? ' + the adjusted stock transfer of ' + (mix.n > 1 ? mix.n + ' lots (' : 'lot ')
                + mix.lots.join(', ') + (mix.n > 1 ? ')' : '')
                + ' — so this is also the COQ %wt of that mix'
              : ' — no mix has been transferred onto this tank since');
        return R;
      }
    }
    /* ── ⑤ %wt gõ kèm lúc khai tồn đầu, khi tồn đầu không có C3/C4 ── */
    if(b.init && isFinite(b.init.wtC3) && num(b.init.wtC3) > 0){
      R.raw = num(b.init.wtC3); R.wt = _wmsRound(R.raw);
      R.src = 'opening'; R.kind = 'user'; R.ok = true;
      R.srcTxt = 'entered together with the initial stock';
      return R;
    }
    /* ── ⑥ không có gì để dựa vào ── */
    R.wt = DEFAULT_WT; R.raw = DEFAULT_WT; R.src = 'default'; R.kind = 'none'; R.ok = false;
    R.srcTxt = 'NO WMS figure available — this is the ' + DEFAULT_WT
             + ' % fallback, check it before using the result';
    return R;
  }

  /* ⚠ MỘT LUẬT LÀM TRÒN DUY NHẤT cho cả 🧮 lẫn 📤.
     WMS làm tròn LÊN ở C3 rồi lấy phần bù làm C4. Mục đích của hai bảng này là
     ĐOÁN TRƯỚC con số WMS sẽ ghi, nên phải làm y hệt — lệch 1 kg là lệch phiếu.
     C4 là phần bù nên tổng luôn khớp tuyệt đối, không bao giờ lệch do làm tròn
     hai lần (cùng nguyên tắc "Σ bám chi tiết" của v4.75). */
  function _splitByWt(totalKg, pct){
    const t  = Math.round(num(totalKg));
    const c3 = Math.ceil(t * (num(pct) / 100) - 1e-9);
    return { total:t, c3:c3, c4:t - c3 };
  }

  /* ⚠ YÊU CẦU CỦA USER: số NGƯỜI NHẬP và số MÁY TÍNH phải khác nhau HẲN,
     nhìn một cái là biết. Nên không chỉ đổi chữ trong chip mà đổi luôn dáng
     của Ô NHẬP: người nhập = nền hổ phách, viền LIỀN, chữ ĐẬM, dấu ✎;
     máy tính = nền xanh, viền ĐỨT NÉT, chữ thường, dấu ƒ; không có số =
     đỏ, dấu ⚠. Ba dáng này không thể nhầm với nhau kể cả khi in đen trắng
     (liền / đứt / gạch chéo). */
  const _WT_CHIP = { typed:'YOU TYPED IT', manual:'YOU SAVED IT',
                     opening:'FROM OPENING STOCK',
                     open:'OPENING STOCK', 'open+mix':'OPENING + MIX',
                     sap:'APP · SAP', 'sap+mix':'APP · SAP + MIX',
                     default:'NO DATA' };
  const _WT_MARK = { user:'✎', app:'ƒ', none:'⚠' };
  function _wtChipHtml(W){
    return '<span class="inv-wt-chip k-' + (W.kind || 'app') + '">'
         + (_WT_MARK[W.kind] || '') + ' ' + (_WT_CHIP[W.src] || '') + '</span>';
  }
  /* Vẽ ô %wt + chip nguồn cho MỘT bảng ('Split' | 'Export').
     ⚠ KHÔNG dựng lại ô <input>, và chỉ ghi .value khi ô đang KHÔNG focus —
     bài học v4.114: động vào ô đang gõ là mất con trỏ. */
  function _wtPaint(which, sloc){
    const W  = _wmsWt(sloc);
    const el = document.getElementById('inv' + which + 'Wt');
    if(el && document.activeElement !== el) el.value = (Math.round(num(W.wt) * 100) / 100);
    /* dáng của ô đổi theo NGUỒN — xem chú thích ở _wtChipHtml */
    if(el) el.className = 'inv-wt-inp k-' + (W.kind || 'app');
    const mk = document.getElementById('inv' + which + 'WtMark');
    if(mk){ mk.textContent = _WT_MARK[W.kind] || ''; mk.className = 'inv-wt-mark k-' + (W.kind || 'app'); }
    const sc = document.getElementById('inv' + which + 'WtSrc');
    if(sc){
      sc.innerHTML = _wtChipHtml(W) + '<i>' + _esc2(W.srcTxt) + '</i>'
        + (W.src === 'typed'
             ? ' <a href="#" onclick="INV.wtReset(\'' + which + '\');return false">↺ back to auto</a>' : '');
    }
    return W;
  }
  function _wtSlocOf(which){ return (which === 'Export') ? _exportPick : _splitPick; }
  /* ⚠ Ô này là PHẦN TRĂM, không phải khối lượng. Nhân viên gõ bàn phím Việt
     hay ra "49,88" — nếu cứ bóc dấu phẩy như số kg (_stxN) thì 49,88 hoá
     4.988, vượt 100, bị bỏ IM LẶNG và bảng lặng lẽ quay về nền cũ. Nên ở
     đây MỘT dấu phẩy mà không có dấu chấm = dấu thập phân; còn lại mới coi
     là dấu ngăn nghìn. */
  function _pctN(v){
    let t = String(v == null ? '' : v).replace(/\s/g, '');
    if(t.indexOf('.') < 0 && (t.match(/,/g) || []).length === 1) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
    const x = parseFloat(t);
    return isFinite(x) ? x : NaN;
  }
  function wtEdit(which){
    const sloc = _wtSlocOf(which);
    const el = document.getElementById('inv' + which + 'Wt');
    const v  = el ? _pctN(el.value) : NaN;
    _wtIn[sloc] = (isFinite(v) && v > 0 && v <= 100) ? v : null;
    if(which === 'Export') _renderExport(sloc);
    else { _wtPaint('Split', sloc); calcSplit(); }
  }
  function wtReset(which){
    const sloc = _wtSlocOf(which);
    _wtIn[sloc] = null;
    if(which === 'Export') _renderExport(sloc);
    else { _wtPaint('Split', sloc); calcSplit(); }
  }

  /* ── 🧮 tách một con số LPG ── nền %wt lấy từ _wmsWt, KHÔNG ghi Firebase.
     Muốn lưu %wt cho cả bồn thì vẫn dùng nút 📐 — một máy tính không được
     phép tự sửa dữ liệu gốc của bồn. */
  let _splitPick = '2100';
  let _splitTSV  = '';
  function _splitWtFor(sloc){ return num(_wmsWt(sloc).wt) || DEFAULT_WT; }
  function openSplit(){
    _splitPick = sel;
    _setPick('invSplitPick', _splitPick);
    _wtPaint('Split', _splitPick);
    document.getElementById('invSplitTotal').value = '';
    _splitTSV = '';
    calcSplit();
    open('invSplitModal');
  }
  function pickSplit(sloc){
    _splitPick = sloc;
    _setPick('invSplitPick', sloc);
    _wtPaint('Split', sloc);
    calcSplit();
  }
  function calcSplit(){
    const out = document.getElementById('invSplitResult');
    if(!out) return;
    const W = _wmsWt(_splitPick);
    const s = _splitByWt(document.getElementById('invSplitTotal').value, W.wt);
    out.innerHTML =
      '<div class="box"><span class="k">TOTAL LPG (kg)</span><span class="v lpg">'+fmtKg(s.total)+'</span></div>'+
      '<div class="box"><span class="k">C3 (kg)</span><span class="v c3">'+fmtKg(s.c3)+'</span></div>'+
      '<div class="box"><span class="k">C4 (kg)</span><span class="v c4">'+fmtKg(s.c4)+'</span></div>';
    /* Cột nguồn đi kèm khi Copy: dán sang Excel là biết số này dựng trên nền nào. */
    _splitTSV = ['Tank','wtC3_pct','wtC3_source','Total_LPG_kg','C3_kg','C4_kg'].join('\t')+'\n'+
      [TKNAME[_splitPick], +num(W.wt).toFixed(2), W.src, s.total, s.c3, s.c4].join('\t');
  }
  function copySplit(){
    if(!num(document.getElementById('invSplitTotal').value)){ toast('Enter the total LPG first','er'); return; }
    try{ navigator.clipboard.writeText(_splitTSV); toast('✓ Result copied','ok'); }
    catch(_){ toast('Copy failed','er'); }
  }
  /* ══════════════════════════════════════════════════════════════════════
     v4.108 — ⚖ STOCK-TRANSFER RECONCILIATION  (nút 📏 trên thẻ tank)
     ----------------------------------------------------------------------
     BÀI TOÁN
     Check Booth chuyển kho lên hệ thống bằng con số Filled C3/C4 theo COQ.
     Nhưng INIT VOL và FINAL VOL trên Tank Log là số ĐO ĐƯỢC bằng thiết bị,
     nên nhân với nền COQ (ρ, %wt C3) sẽ ra tồn C3/C4 THỰC SỰ trong bồn ở
     hai mốc đầu và cuối mẻ. Tồn ĐẦU thực tế thường lệch tồn ĐẦU trên hệ
     thống. Nếu cứ chuyển đúng số COQ thì cái lệch đó nằm nguyên ở tồn CUỐI.

     CÁCH CÂN
        WMS end stock  =  WMS initial + Transfer
        muốn            =  Actual end stock
        ⇒ Transfer      =  Actual end stock − WMS initial
     Đúng ví dụ của vận hành: thực tồn đầu 10, hệ thống 20, COQ nạp 100
        Actual end stock = 10 + 100 = 110  ⇒  Transfer = 110 − 20 = 90.

     NGUỒN SỐ (bảng hiện đủ, mỗi khối một nhãn nguồn)
       • Actual   ← Tank Log: INIT/FINAL VOL × ρ_COQ × %wt C3  (ENG.actualSplit)
       • Filled   ← Tank Log cột [66]/[67] — số COQ chính thức
       • Notified ← /mix_notify, chính là số Check Booth đang thấy
       • System   ← SAP End Stock (SP.ROWS) khi đủ điều kiện, không thì gõ tay

     LUẬT LẤY SAP END STOCK  (chốt của vận hành)
       Chỉ tự lấy khi giờ FINISH nằm NGOÀI 08:00–19:00 — lúc đó nhà máy
       không xuất hàng nên End Stock của ngày đó đúng bằng tồn hệ thống ngay
       trước bút toán chuyển kho.
         finish ≥ 19:00      →  End Stock NGÀY FINISH
         finish <  08:00     →  End Stock NGÀY FINISH − 1  (ca đêm của hôm trước)
         08:00 ≤ finish < 19:00 → KHÔNG tự lấy, bắt gõ tay và nói rõ lý do
       Ví dụ: TK-3501 xong 23:00 ngày 9 và TK-3502 xong 01:00 ngày 10 thì cả
       hai đều lấy End Stock NGÀY 9 — đúng như vận hành mô tả.

     TẤT CẢ TÍNH TRÊN MÁY. Không ghi Firebase, không đụng /mix_notify —
     bảng chỉ GỢI Ý con số, Check Booth vẫn tự gõ khi chuyển kho.
     Đơn vị hiển thị: KG (cùng đơn vị SAP và thông báo), kèm dòng tấn.
     ══════════════════════════════════════════════════════════════════════ */
  const _STX_SLOCS = ['2100','2101'];
  const _STX_TKNUM = { '2100':'3501', '2101':'3502' };
  let _stxTSV    = '';
  const _stxLotIn  = { '2100':'', '2101':'' };   // lot người dùng gõ đè

  /* ══ v4.150 — TỒN ĐẦU WMS GÕ TAY: **RAM-ONLY** ══════════════════════
     v4.113 từng ghi tạm lên `/stx_draft/<TK>_<LOT>` để sống sót qua F5 / đổi
     máy. User chốt lại 15/09: **không lưu Firebase**, chỉ giữ trong RAM suốt
     phiên; **bấm Save mới ghi vào Tank Log** — Tank Log là nơi lưu DUY NHẤT.
     GIỮ NGUYÊN phần khoá theo **BỒN + LOT**: bốn ô thông báo có thể là bốn
     lot khác nhau, khoá theo mỗi bồn thì mẻ mới đè mất số đang gõ dở của mẻ
     cũ (đúng lỗ hổng v4.111 đã vá).
     Bảng ⚖ và thẻ thông báo Tank Mix đọc/ghi CÙNG kho này ⇒ gõ bên nào cũng
     như nhau, không lệch. ⚠ Đổi máy / F5 là mất — đúng ý user. */
  const _stxSys   = Object.create(null);   /* 'sloc|LOT' → {sloc,lot,c3,c4,by,ts} */
  const _stxPushT = Object.create(null);   /* giữ lại cho mã cũ, không còn dùng */

  function _stxKey(sloc, lot){ return String(sloc)+'|'+String(lot||'').trim().toUpperCase(); }
  /* Khoá Firebase: "TK-3501_LPG-2026-900". Firebase cấm . # $ / [ ] */
  function _stxFbKey(sloc, lot){
    return String((TKNAME[sloc]||sloc)+'_'+String(lot||'').trim()).replace(/[.#$/\[\]]/g,'_');
  }
  function _stxN(v){
    if(v === '' || v === null || v === undefined) return null;
    /* Bỏ cả dấu phẩy LẪN khoảng trắng: nhân viên hay gõ "20 000" hoặc dán
       "20,000" từ SAP. Ô nhập là type=text nên hai dạng đó tới được đây. */
    const x = parseFloat(String(v).replace(/[,\s]/g,''));
    return isFinite(x) ? x : null;
  }
  /* Số gõ tay ĐANG CÓ HIỆU LỰC cho đúng bồn + lot này, hoặc null. */
  function _stxManualOf(sloc, lot){
    const l = String(lot||'').trim();
    if(!l) return null;
    /* CỐ Ý: xoá trắng cả hai ô VẪN là "đang gõ tay" — người dùng đang tự
       nhập, đừng lặng lẽ nhét số SAP trở lại vào ô họ vừa xoá. */
    return _stxSys[_stxKey(sloc, l)] || null;
  }
  /* ⚠ v4.150 — SỐ WMS GÕ TAY CHỈ SỐNG TRONG RAM.
     User chốt: "dữ liệu WMS do user nhập KHÔNG lưu firebase mà lưu RAM trong
     suốt phiên làm việc, khi user ấn Save thì lưu vào Tank Log." Trước đây
     v4.113 đẩy lên `/stx_draft`; nay bỏ hẳn đường đó — Tank Log là nơi lưu
     DUY NHẤT, còn trước lúc bấm Save thì số chỉ nằm ở máy đang gõ.
     Bảng ⚖ và thẻ thông báo Tank Mix vẫn dùng CHUNG kho `_stxSys` này, nên
     gõ bên nào cũng như nhau — không sợ lệch giữa hai bên. */
  function _stxStore(sloc, lot, c3, c4){
    const l = String(lot||'').trim();
    if(!l) return;                       /* chưa biết lot thì không có gì để lưu */
    _stxSys[_stxKey(sloc, l)] = { sloc:String(sloc), lot:l, c3:_stxN(c3), c4:_stxN(c4),
                                  by:by(), ts:Date.now() };
  }
  /* Bỏ bản nháp của MỘT lot — gọi khi đã lưu vào Tank Log, hoặc khi người
     dùng bấm ⟳ để quay lại số SAP. */
  function _stxDrop(sloc, lot){
    const l = String(lot||'').trim(); if(!l) return;
    const k = _stxKey(sloc, l);
    delete _stxSys[k];
    if(_stxPushT[k]){ clearTimeout(_stxPushT[k]); delete _stxPushT[k]; }
  }
  /* ⛔ v4.150 — BA HÀM ĐẨY/ĐỌC/XOÁ BẢN NHÁP TRÊN FIREBASE ĐÃ GỠ.
     Giữ vỏ rỗng để mọi lối gọi cũ vẫn chạy mà không ghi gì. ĐỪNG khôi phục:
     user yêu cầu rõ số WMS gõ tay chỉ nằm trong RAM cho tới khi bấm Save. */
  function _stxPushDraft(){ }
  function _stxRemoveDraft(){ }
  function _stxAttachDrafts(){ }

  /* Vẽ lại CẢ HAI cửa sổ — mỗi cửa sổ CHỈ vẽ khi đang mở. Vẽ một modal
     đang đóng là công toi, và với ô thông báo thì mỗi lượt vẽ là 4 thẻ,
     mỗi thẻ quét lại Tank Log. NOTIF.open() tự gọi MIXNOTIFY.render() lúc
     mở nên không sợ mở ra thấy số cũ. */
  function _stxNotifOpen(){
    try{ const m = document.getElementById('notif-modal');
         return !!(m && m.classList.contains('on')); }catch(_){ return false; }
  }
  function _stxRenderNotif(){
    if(!_stxNotifOpen()) return;
    try{ if(typeof MIXNOTIFY !== 'undefined' && MIXNOTIFY.render) MIXNOTIFY.render(); }catch(_){}
  }
  function _stxSyncViews(refillModal){
    try{
      const m = document.getElementById('stxModal');
      if(m && m.classList.contains('on')) renderStx(refillModal !== false);
    }catch(_){}
    _stxRenderNotif();
  }
  /* API cho MIXNOTIFY: gõ ở ô thông báo = gõ ở bảng đối chiếu. */
  function stxSetSys(sloc, lot, c3, c4){ _stxStore(sloc, lot, c3, c4); _stxSyncViews(true); }
  function stxSlocOf(tkName){
    const d = String(tkName || '').replace(/\D/g, '');
    if(d.indexOf('3501') >= 0) return '2100';
    if(d.indexOf('3502') >= 0) return '2101';
    return '';
  }

  /* ---------- helpers ---------- */
  function _stxLotKey(s){
    const m = String(s||'').match(/(?:LPG-)?(\d{4})-?(\d+)/i);
    if(m) return parseInt(m[1])*1e6 + parseInt(m[2]);
    const n = parseInt(s); return isNaN(n) ? 0 : n;
  }
  function _stxRows(){
    try{ return (typeof ENG !== 'undefined' && ENG.ROWS) ? ENG.ROWS : []; }catch(_){ return []; }
  }
  /* Thông báo finish-mixing đang treo của bồn này (mới nhất theo lot) */
  function _stxNotify(sloc){
    let pend = null;
    try{ pend = (typeof MIXNOTIFY !== 'undefined') ? MIXNOTIFY.PENDING : null; }catch(_){}
    if(!pend) return null;
    const want = _STX_TKNUM[sloc];
    let best = null;
    Object.keys(pend).forEach(pk=>{
      const it = pend[pk]; if(!it) return;
      if(String(it.tkName||'').replace(/\D/g,'') !== want) return;
      if(!best || _stxLotKey(it.lot) > _stxLotKey(best.lot)) best = it;
    });
    return best;
  }
  /* Lot đang xét + nó từ đâu ra */
  function _stxPickLot(sloc){
    if(_stxLotIn[sloc]) return { lot:_stxLotIn[sloc], src:'typed', srcTxt:'typed in' };
    const nt = _stxNotify(sloc);
    if(nt && nt.lot) return { lot:String(nt.lot), src:'notify', srcTxt:'pending mix notification' };
    try{
      const cfg = (typeof SCALE !== 'undefined' && SCALE.getTkCfg) ? SCALE.getTkCfg() : null;
      const l = cfg ? String((sloc === '2100' ? cfg.tk1 : cfg.tk2)?.lot || '').trim() : '';
      if(l) return { lot:l, src:'scale', srcTxt:'lot on the tank card' };
    }catch(_){}
    const want = _STX_TKNUM[sloc];
    let best = null;
    _stxRows().forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      if(!best || _stxLotKey(r[1]) > _stxLotKey(best[1])) best = r;
    });
    return best ? { lot:String(best[1]||''), src:'latest', srcTxt:'latest lot in the Tank Log' }
                : { lot:'', src:'none', srcTxt:'' };
  }
  /* So lot: người dùng quen gõ SỐ TRẦN ("901") trong khi Tank Log lưu đủ
     "LPG-2026-901" — y như ô LOT trên thẻ tank. Gõ số trần thì so phần số
     đuôi; gõ đủ chuỗi thì so khoá năm+số. Nhiều năm cùng số thì lấy lot mới
     nhất, không im lặng chọn bừa. */
  function _stxLotMatch(rowLot, want){
    const wtxt = String(want||'').trim();
    if(!wtxt) return false;
    if(/^\d+$/.test(wtxt)){
      const m = String(rowLot||'').match(/(\d+)\s*$/);
      return !!m && parseInt(m[1], 10) === parseInt(wtxt, 10);
    }
    return _stxLotKey(rowLot) === _stxLotKey(wtxt);
  }
  function _stxFindRow(sloc, lot){
    const want = _STX_TKNUM[sloc];
    if(!String(lot||'').trim()) return null;
    let best = null;
    _stxRows().forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      if(!_stxLotMatch(r[1], lot)) return;
      if(!best || _stxLotKey(r[1]) > _stxLotKey(best[1])) best = r;
    });
    return best;
  }
  /* DD/MM/YY | YYYY-MM-DD → YYYY-MM-DD (khuôn của SP.ROWS.date) */
  function _stxIso(v){
    const s = String(v||'').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3];
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(!m) return '';
    const yr = m[3].length === 4 ? m[3] : '20'+m[3];
    return yr+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  }
  function _stxShift(iso, days){
    if(!iso) return '';
    const d = new Date(iso+'T00:00:00'); if(isNaN(d.getTime())) return '';
    d.setDate(d.getDate()+days);
    const p = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function _stxDmy(iso){
    const m = String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[3]+'/'+m[2]+'/'+m[1].slice(2) : (iso||'');
  }
  /* Mốc SAP được dán / sửa lần cuối — "số của ngày 09/08" và "số này được
     dán lúc nào" là HAI chuyện khác nhau: bản dán từ tuần trước nhìn giống
     hệt bản vừa dán sáng nay, mà chỉ bản mới mới phản ánh đúng bút toán. */
  function _stxWhen(ms){
    const t = +ms || 0; if(!t) return '';
    const d = new Date(t); if(isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2,'0');
    return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(-2)
         + ' ' + p(d.getHours())+':'+p(d.getMinutes());
  }
  function _stxSapStamp(sap){
    if(!sap) return '';
    const when = _stxWhen(sap.lastAt);
    if(!when) return '<span class="stamp warn">SAP data has no paste timestamp (pasted by an older version)</span>';
    return '<span class="stamp">SAP data pasted ' + when
         + (sap.lastBy ? ' by ' + _esc2(sap.lastBy) : '') + '</span>';
  }
  function _stxHm(v){
    const m = String(v||'').match(/(\d{1,2}):(\d{2})/);
    return m ? { h:parseInt(m[1]), m:parseInt(m[2]), txt:String(m[1]).padStart(2,'0')+':'+m[2] } : null;
  }

  /* ── LUẬT NGÀY SAP — tách riêng để test được mà không cần DOM ──
     Trả { ok, sapDate, finishDate, finishTxt, why }
       ok=false ⇒ không tự lấy SAP, `why` nói rõ vì sao (hiện luôn lên bảng). */
  const STX_OPEN_H = 8, STX_CLOSE_H = 19;
  function _stxSapDate(dateRaw, startRaw, finishRaw){
    const base = _stxIso(dateRaw);
    const fi = _stxHm(finishRaw), st = _stxHm(startRaw);
    if(!base)  return { ok:false, sapDate:'', finishDate:'', finishTxt:'', why:'the Tank Log row has no date' };
    if(!fi)    return { ok:false, sapDate:'', finishDate:base, finishTxt:'',
                        why:'the Tank Log row has no FINISH time' };
    /* qua đêm: giờ kết thúc nhỏ hơn giờ bắt đầu ⇒ mẻ kết thúc sang ngày hôm sau */
    const overnight = !!(st && (fi.h*60+fi.m) < (st.h*60+st.m));
    const finishDate = overnight ? _stxShift(base, 1) : base;
    if(fi.h >= STX_OPEN_H && fi.h < STX_CLOSE_H)
      return { ok:false, sapDate:'', finishDate:finishDate, finishTxt:fi.txt, overnight:overnight,
               why:'mixing finished at '+fi.txt+', inside operating hours ('
                   +String(STX_OPEN_H).padStart(2,'0')+':00–'+STX_CLOSE_H+':00) — '
                   +'SAP End Stock of that day is not the initial balance for this transfer' };
    /* trước 08:00 = ca đêm của NGÀY HÔM TRƯỚC */
    const sapDate = (fi.h < STX_OPEN_H) ? _stxShift(finishDate, -1) : finishDate;
    return { ok:true, sapDate:sapDate, finishDate:finishDate, finishTxt:fi.txt, overnight:overnight,
             why:(fi.h < STX_OPEN_H)
                  ? 'finished at '+fi.txt+' (night shift) → SAP End Stock of the previous day'
                  : 'finished at '+fi.txt+' (after '+STX_CLOSE_H+':00) → SAP End Stock of the same day' };
  }

  /* ── Gom toàn bộ dữ liệu của MỘT BỒN ──
     lotOverride: phía gọi đã biết chắc lot (ô thông báo Tank Mix cầm sẵn
     lot của chính thông báo đó) ⇒ khỏi đoán lại. */
  function _stxCtx(sloc, lotOverride){
    const pick = (lotOverride != null && String(lotOverride).trim())
      ? { lot:String(lotOverride).trim(), src:'given', srcTxt:'the notification being handled' }
      : _stxPickLot(sloc);
    const row  = pick.lot ? _stxFindRow(sloc, pick.lot) : null;
    const ctx  = { sloc:sloc, tank:TKNAME[sloc], lot:pick.lot, lotSrc:pick.src, lotSrcTxt:pick.srcTxt,
                   row:row, split:null, notify:_stxNotify(sloc), sap:null, day:null,
                   coqC3:null, coqC4:null };
    if(!row) return ctx;
    /* v4.111 — CHUẨN HOÁ LOT VỀ ĐÚNG CHUỖI TRONG TANK LOG.
       Nhân viên quen gõ số trần ("900") trong khi Tank Log lưu đủ
       "LPG-2026-900". Chip lot trên tiêu đề, thông báo lưu và lệnh ghi vào
       Tank Log đều phải nói ĐÚNG tên lot chính thức, không phải mấy chữ số
       vừa gõ — nếu không, nhìn lại lịch sử sẽ không biết là lot nào. */
    if(row[1]) ctx.lot = String(row[1]).trim();
    try{ ctx.split = (typeof ENG !== 'undefined' && ENG.actualSplit) ? ENG.actualSplit(row) : null; }catch(_){}
    const q3 = parseFloat(row[66]), q4 = parseFloat(row[67]);
    ctx.coqC3 = isFinite(q3) ? q3 : null;
    ctx.coqC4 = isFinite(q4) ? q4 : null;
    ctx.day = _stxSapDate(row[3], row[4], row[5]);
    if(ctx.day.ok){
      try{
        ctx.sap = (typeof SP !== 'undefined' && SP.tankEnd) ? SP.tankEnd(sloc, ctx.day.sapDate) : null;
      }catch(_){ ctx.sap = null; }
    }
    return ctx;
  }

  /* ── TỒN ĐẦU HỆ THỐNG: gõ tay đè, không thì SAP theo luật giờ finish ──
     THUẦN TÍNH — không đụng DOM, để ô thông báo dùng chung được. */
  function _stxSysPick(sloc, ctx){
    const lot = ctx && ctx.lot ? ctx.lot : '';
    const man = _stxManualOf(sloc, lot);
    const day = ctx && ctx.day, sap = ctx && ctx.sap;
    if(man) return { c3:man.c3, c4:man.c4, tag:'manual', manual:true };
    if(!ctx || !ctx.row)             return { c3:null, c4:null, tag:'none', manual:false };
    if(day && day.ok && sap && sap.has)
      return { c3:Math.round(sap.c3), c4:Math.round(sap.c4), tag:'sap', manual:false };
    if(day && day.ok)                return { c3:null, c4:null, tag:'sap-missing', manual:false };
    return { c3:null, c4:null, tag:'manual-required', manual:false };
  }

  /* ══ v4.111 — MỘT HÀM TÍNH DUY NHẤT CHO CẢ HAI MÀN HÌNH ══════════════
     Bảng ⚖ đối chiếu và ô thông báo Tank Mix trước đây tính rời nhau nên
     rất dễ trôi lệch. Giờ cả hai gọi đúng hàm này. THUẦN TÍNH, không đụng
     DOM, đơn vị KG (cùng đơn vị SAP và thông báo Check Booth).
       ok=false ⇒ `why` nói rõ vì sao chưa tính được:
         'no-row'  chưa tìm ra dòng Tank Log của lot
         'no-coq'  dòng có rồi nhưng thiếu nền COQ (miss = ô còn thiếu)   */
  function _stxFigures(sloc, lotOverride){
    const ctx = _stxCtx(sloc, lotOverride);
    const F = { ctx:ctx, sloc:sloc, lot:ctx.lot, tank:ctx.tank,
                ok:false, why:'', miss:'',
                aOpC3:null, aOpC4:null, aClC3:null, aClC4:null,
                fC3:null, fC4:null, fSrc:'',
                sysC3:null, sysC4:null, sysTag:'none', sysManual:false, hasSys:false,
                gapC3:null, gapC4:null, xC3:null, xC4:null };
    const sys = _stxSysPick(sloc, ctx);
    F.sysC3 = sys.c3; F.sysC4 = sys.c4; F.sysTag = sys.tag; F.sysManual = sys.manual;
    F.hasSys = (sys.c3 !== null && sys.c4 !== null);
    if(!ctx.row){ F.why = 'no-row'; return F; }
    const s = ctx.split;
    if(!s || !s.openOk || !s.endOk){
      F.why  = 'no-coq';
      F.miss = (s && s.miss.length) ? s.miss.join(' · ') : 'COQ density / %wt C3';
      return F;
    }
    const T = v => (v === null ? null : v * 1000);      /* tấn → kg */
    F.aOpC3 = T(s.openC3); F.aOpC4 = T(s.openC4);
    F.aClC3 = T(s.endC3);  F.aClC4 = T(s.endC4);
    /* Filled: ưu tiên cột [66]/[67] đã lưu (số COQ CHÍNH THỨC) */
    F.fC3 = ctx.coqC3 !== null ? ctx.coqC3*1000 : (F.aClC3 - F.aOpC3);
    F.fC4 = ctx.coqC4 !== null ? ctx.coqC4*1000 : (F.aClC4 - F.aOpC4);
    F.fSrc = ctx.coqC3 !== null ? 'Tank Log C3/C4 ◈COQ' : 'closing − opening';
    F.ok = true;
    if(F.hasSys){
      F.gapC3 = F.aOpC3 - F.sysC3;   F.gapC4 = F.aOpC4 - F.sysC4;
      F.xC3   = F.aClC3 - F.sysC3;   F.xC4   = F.aClC4 - F.sysC4;
    }
    return F;
  }

  /* ---------- render ---------- */
  function _stxNum(v, dp){
    if(v === null || v === undefined || !isFinite(v)) return '—';
    return (+v).toLocaleString('en-US', { minimumFractionDigits:dp||0, maximumFractionDigits:dp||0 });
  }
  function _stxSigned(v){
    if(v === null || v === undefined || !isFinite(v)) return '—';
    const r = Math.round(v);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('en-US');
  }
  function _stxSignCls(v){
    if(v === null || v === undefined || !isFinite(v)) return '';
    return Math.abs(v) < 1 ? 'z' : (v > 0 ? 'p' : 'm');
  }
  /* v4.114 — `key` gắn nhãn data-c lên từng ô số, để lúc nhân viên đang GÕ
     ta cập nhật đúng mấy ô đó thay vì dựng lại cả bảng (dựng lại là phải
     chuyển hai ô <input> đi chỗ khác, và chuyển ô đang focus trong DOM là
     trình duyệt cắt focus — gõ một chữ số là ô "đơ" ra). */
  function _stxRow(cls, label, note, vol, c3, c4, lpg, key){
    const dk = k => key ? (' data-c="'+key+'-'+k+'"') : '';
    const noteHtml = (note || key)
      ? ('<i'+(key ? ' data-c="'+key+'-note"' : '')+'>'+(note||'')+'</i>') : '';
    return '<tr class="'+cls+'">'
      + '<td class="lbl">'+label+noteHtml+'</td>'
      + '<td class="n vol"'+dk('v')+'>'+vol+'</td>'
      + '<td class="n"'+dk('3')+'>'+c3+'</td><td class="n"'+dk('4')+'>'+c4+'</td>'
      + '<td class="n tot"'+dk('t')+'>'+lpg+'</td></tr>';
  }

  function openStx(n){
    const first = (n === 2 || n === '2101') ? '2101' : '2100';
    /* v4.111 — CHỈ xoá lot gõ đè. Số tồn đầu gõ tay thì GIỮ: nhân viên có
       thể vừa gõ nó ở ô thông báo Tank Mix rồi mới mở bảng này lên xem chi
       tiết — mở bảng mà mất số vừa gõ là hỏng đúng luồng làm việc đó. */
    _STX_SLOCS.forEach(sl=>{ _stxLotIn[sl] = ''; });
    const wrap = document.getElementById('stxGrid');
    if(wrap){
      const a = document.getElementById('stxPane2100'), b = document.getElementById('stxPane2101');
      if(a && b) wrap.appendChild(first === '2100' ? b : a);
    }
    _STX_SLOCS.forEach(sl=>{
      const li = document.getElementById('stxLot'+sl);
      if(li) li.value = '';
    });
    renderStx(true);
    open('stxModal');
  }
  /* Người dùng gõ lot khác → đổi ngữ cảnh, và bỏ luôn cờ "đã gõ tay"
     để WMS initial được nạp lại theo lot mới. */
  /* v4.151 — cho màn hình khác (Tank Console) đổi lot mà không cần ô DOM của
     bảng ⚖. Cùng một biến `_stxLotIn` ⇒ hai bảng luôn nói về CÙNG một lot. */
  function stxSetLot(sloc, v){
    if(_stxLotIn[sloc] === undefined) return false;
    _stxLotIn[sloc] = String(v || '').trim();
    try{ const b = _stxBd[sloc]; if(b){ b.src=''; b.c3=''; b.c4=''; b.w3=''; } }catch(_){}
    const li = document.getElementById('stxLot'+sloc);
    if(li && document.activeElement !== li) li.value = _stxLotIn[sloc];
    _stxSyncViews(true);
    return true;
  }
  function stxGetLot(sloc){ return _stxLotIn[sloc] || ''; }
  /* Mọi lot của bồn này đang có trên Tank Log — để bảng gợi ý cho user chọn. */
  function stxLotList(sloc){
    const out = [];
    try{
      const want = _STX_TKNUM[sloc];
      _stxRows().forEach(r=>{
        if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
        const l = String(r[1]||'').trim();
        if(l && out.indexOf(l) < 0) out.push(l);
      });
    }catch(_){}
    return out.sort((a,b)=>_stxLotKey(b) - _stxLotKey(a)).slice(0, 15);
  }
  function stxLotChange(sloc){
    const li = document.getElementById('stxLot'+sloc);
    _stxLotIn[sloc] = li ? li.value.trim() : '';
    /* v4.128 — số batch D là của MẺ CŨ, đổi lot mà giữ lại là đọc nhầm. */
    try{ const b = _stxBd[sloc]; if(b){ b.src=''; b.c3=''; b.c4=''; b.w3=''; } }catch(_){}
    renderStx(true);
    _stxRenderNotif();
  }
  /* Gõ ở ô WMS initial của bảng → cất vào kho dùng chung → ô thông báo
     Tank Mix đổi theo ngay. refill=false để không giật con trỏ đang gõ. */
  function stxSysEdit(sloc){
    const e3 = document.getElementById('stxSys3'+sloc);
    const e4 = document.getElementById('stxSys4'+sloc);
    const ctx = _stxCtx(sloc);
    _stxStore(sloc, ctx.lot, e3 ? e3.value : '', e4 ? e4.value : '');
    /* v4.114 — cập nhật TẠI CHỖ. renderStx() ở đây là thứ đã làm ô nhập
       mất focus sau mỗi chữ số (xem chú thích ở _stxLive). */
    _stxLive(sloc);
    _stxRenderNotif();
  }
  /* ⟳ — bỏ số gõ tay, quay lại số SAP tự lấy. v4.113: xoá luôn bản nháp
     trên Firebase, nếu không lần nạp sau nó lại đẩy con số vừa bỏ trở về. */
  function stxSysReset(sloc){
    try{ const ctx = _stxCtx(sloc); _stxDrop(sloc, ctx.lot); }catch(_){}
    renderStx(true);
    _stxRenderNotif();
  }

  /* refill = có được phép ghi đè ô WMS initial bằng số SAP hay không.
     Khi người dùng đang gõ thì KHÔNG bao giờ ghi đè (mất số đang gõ). */
  /* ── v4.114 — CHÂN VÙNG (khối đề xuất) tách riêng ─────────────────────
     Dùng chung cho lượt vẽ đầy đủ và lượt cập nhật-khi-đang-gõ, nên hai
     đường không thể hiện ra hai con số khác nhau. */
  function _stxFootHtml(sloc, F){
    const saved = _stxSavedOf(F.ctx);
    if(!F.hasSys){
      return '<div class="stx-sug stx-sug-off">Enter the <b>WMS initial stock</b> above to get the suggested '
        + 'transfer quantity.'
        + (saved.has ? '<div class="stx-saved on">'+saved.txt+'</div>' : '')
        + '</div>';
    }
    const N   = v => _stxNum(v, 0);
    const xC3 = F.xC3, xC4 = F.xC4, xL = xC3 + xC4;
    const fC3 = F.fC3, fC4 = F.fC4;
    return '<div class="stx-sug">'
      + '<div class="stx-sug-hd">➜ SUGGESTED STOCK TRANSFER'
      +   '<span>actual end stock − WMS initial</span></div>'
      + '<div class="stx-sug-vals">'
      +   '<div class="v c3"><span class="k">C3</span><b>'+N(xC3)+'</b><i>kg</i></div>'
      +   '<div class="v c4"><span class="k">C4</span><b>'+N(xC4)+'</b><i>kg</i></div>'
      +   '<div class="v lpg"><span class="k">LPG</span><b>'+N(xL)+'</b><i>kg</i></div>'
      + '</div>'
      + '<div class="stx-sug-t">= '+_stxNum(xC3/1000,3)+' t C3 · '+_stxNum(xC4/1000,3)+' t C4 · '
      +   _stxNum(xL/1000,3)+' t LPG</div>'
      + '<div class="stx-sug-vs">COQ figure is <b>'+N(fC3)+'</b> / <b>'+N(fC4)+'</b> kg → adjust by '
      +   '<b class="'+_stxSignCls(xC3-fC3)+'">'+_stxSigned(xC3-fC3)+'</b> / '
      +   '<b class="'+_stxSignCls(xC4-fC4)+'">'+_stxSigned(xC4-fC4)+'</b> kg'
      +   ((xC3 < 0 || xC4 < 0)
            ? '<br><span class="warn">⚠ A suggested figure is NEGATIVE — the system already holds more than '
              + 'the tank actually contains. Check the WMS initial figure before posting.</span>' : '')
      + '</div>'
      + '<div class="stx-save-row">'
      +   '<button class="stx-save" onclick="INV.stxSave(\'' + sloc + '\')" '
      +     'title="Write the gap at initial and the adjusted transfer quantity onto this lot in the Tank Log '
      +     '(columns Gap C3 / Gap C4 / Adj ST C3 / Adj ST C4), so the figure can be reviewed and cross-checked later">'
      +     '💾 Save to Tank Log</button>'
      +   '<span class="stx-saved '+(saved.has?'on':'')+'">'+saved.txt+'</span>'
      + '</div>'
      + '</div>';
  }

  /* ══ v4.128 — TÁCH SỐ CHUYỂN KHO THÀNH BATCH D + BATCH E ═══════════════
     BÀI TOÁN THẬT: hầm sắp hết batch D, không đủ khối lượng để chuyển trọn
     số đề nghị. Phần thiếu phải lấy từ batch E. Nhân viên biết batch D còn
     bao nhiêu của MỘT cấu tử (C3 hoặc C4), gõ số đó vào; cấu tử kia suy ra
     theo %wt C3 của lot — vì hàng rút khỏi hầm là LPG đã trộn, hai cấu tử
     đi cùng nhau theo đúng tỉ lệ của mẻ, không tách rời được.

       gõ C3 ⇒ C4 = C3 × (1 − w3) / w3          (w3 = %wt C3 / 100)
       gõ C4 ⇒ C3 = C4 × w3 / (1 − w3)
       batch E = số chuyển kho đề nghị − batch D, tính RIÊNG từng cấu tử

     %wt lấy nền COQ CUỐI MẺ của lot (đúng nền đã dựng ra số chuyển kho), có
     ô đè để gõ tay khi cần. TẤT CẢ chỉ nằm trong RAM: không ghi Firebase,
     không vào Tank Log, không vào nút Copy — đây là phép chia tại chỗ cho
     một lần lập lệnh chuyển kho, đóng bảng là xong.

     ⚠ Vì sao khối này có container RIÊNG (#stxSplit…) chứ không nằm trong
     chân khung #stxFoot…: chân khung bị ghi đè innerHTML mỗi lần gõ ô System
     opening. Ô nhập đặt trong đó sẽ bị huỷ giữa chừng — đúng lỗi "ô đơ" đã
     vá ở v4.114. Ô nhập batch D vì thế cũng sống trong kho ẩn .stx-inp-pool
     và được CHUYỂN vào khối, y như ô WMS initial. */
  const _stxBd = { '2100':{ src:'', c3:'', c4:'', w3:'' },
                   '2101':{ src:'', c3:'', c4:'', w3:'' } };

  /* Đọc số người dùng gõ: chấp nhận "12,345", "12 345", "12.345,6" kiểu ô
     WMS initial. Trả null khi ô trống hoặc không ra số. */
  function _stxBdN(v){
    const t = String(v == null ? '' : v).replace(/[,\s]/g, '').trim();
    if(!t) return null;
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  /* w3 dùng để suy cấu tử còn lại. Ưu tiên ô gõ tay (nhận cả "50.53" lẫn
     "0.5053"), không thì nền COQ cuối mẻ của lot. Trả null khi không dùng
     được — 0 hoặc 100 %wt thì một cấu tử bằng 0, chia là ra vô cực. */
  function _stxBdW3(sloc, F){
    const typed = _stxBdN(_stxBd[sloc].w3);
    if(typed !== null){
      const w = typed > 1.5 ? typed / 100 : typed;
      if(w > 0 && w < 1) return { w3:w, typed:true, ok:true };
      return { w3:null, typed:true, ok:false };
    }
    const s = F && F.ctx && F.ctx.split;
    const w = (s && s.fW3 != null) ? +s.fW3 : null;
    if(w !== null && w > 0 && w < 1) return { w3:w, typed:false, ok:true };
    return { w3:null, typed:false, ok:false };
  }
  /* THUẦN TÍNH — không đụng DOM, để test gọi thẳng được. */
  function _stxBdCalc(sloc, F){
    const st = _stxBd[sloc];
    const W  = _stxBdW3(sloc, F);
    const out = { on:false, w3:W.w3, w3Typed:W.typed, w3Ok:W.ok, src:st.src,
                  d3:null, d4:null, dL:null, e3:null, e4:null, eL:null,
                  eW3:null, warn:[] };
    if(!F || !F.ok || !F.hasSys) return out;
    const xC3 = F.xC3, xC4 = F.xC4;
    const typed = st.src === '3' ? _stxBdN(st.c3)
                : st.src === '4' ? _stxBdN(st.c4) : null;
    if(typed === null) return out;
    out.on = true;
    if(!W.ok){
      out.warn.push(W.typed ? 'The %wt C3 you typed must be between 0 and 100.'
                            : 'This lot has no %wt C3 basis — type one to derive the other component.');
      return out;
    }
    const w3 = W.w3;
    if(st.src === '3'){ out.d3 = typed; out.d4 = typed * (1 - w3) / w3; }
    else              { out.d4 = typed; out.d3 = typed * w3 / (1 - w3); }
    /* v4.129 — CHỐT VỀ SỐ NGUYÊN KG NGAY TẠI ĐÂY, rồi mới trừ ra batch E.
       Mấy con số này được chép tay vào lệnh chuyển kho SAP, nên ba dòng
       trên màn hình phải CỘNG KHỚP TUYỆT ĐỐI. Bản đầu giữ phần lẻ trong
       lúc tính rồi mới làm tròn lúc hiện: batch D 58.741 + batch E 94.697
       ra 153.438 trong khi dòng Total ghi 153.439 — lệch 1 kg, đủ để người
       dùng mất tin vào cả bảng. Đơn vị là KG, phần lẻ không có nghĩa gì. */
    const R = v => Math.round(v);
    out.d3 = R(out.d3);  out.d4 = R(out.d4);  out.dL = out.d3 + out.d4;
    out.e3 = R(xC3) - out.d3;  out.e4 = R(xC4) - out.d4;  out.eL = out.e3 + out.e4;
    if(out.eL > 0.5) out.eW3 = out.e3 / out.eL;
    if(out.d3 < 0 || out.d4 < 0)
      out.warn.push('Batch D cannot be negative.');
    else if(out.e3 < -0.5 || out.e4 < -0.5)
      out.warn.push('Batch D is larger than the transfer itself — batch E comes out negative. '
                  + 'Cap batch D at ' + _stxNum(xC3, 0) + ' kg C3 / ' + _stxNum(xC4, 0) + ' kg C4.');
    return out;
  }

  /* Khối HTML. Ô số mang data-b để lượt GÕ chỉ ghi lại đúng mấy ô đó, không
     dựng lại cả khối (dựng lại = chuyển ô đang focus = mất con trỏ). */
  function _stxBdHtml(sloc, F){
    if(!F || !F.ok || !F.hasSys) return '';
    const B = _stxBdCalc(sloc, F);
    const N = v => _stxNum(v, 0);
    const slot = id => '<span class="stx-inp-slot" data-for="' + id + sloc + '"></span>';
    const wtNote = B.w3Typed ? 'typed in'
                 : (B.w3 != null ? 'from lot COQ' : 'not available');
    return '<div class="stx-bd">'
      + '<div class="stx-bd-hd">⇄ SPLIT ACROSS BATCHES'
      +   '<span>batch D first — batch E covers what is missing</span></div>'
      + '<div class="stx-bd-wt">%wt C3 ' + slot('stxBdW')
      +   '<i data-b="wtnote">' + _esc2(wtNote) + '</i>'
      +   '<button class="stx-bd-clr" onclick="INV.stxBdReset(\'' + sloc + '\')" '
      +     'title="Clear the batch D figures and the %wt override">⟳ Clear</button>'
      + '</div>'
      + '<table class="stx-bd-tbl"><thead><tr>'
      +   '<th class="lbl"></th><th class="n">C3</th><th class="n">C4</th><th class="n tot">LPG</th>'
      + '</tr></thead><tbody>'
      + '<tr class="d"><td class="lbl">Batch D<i>type either one — the other follows %wt</i></td>'
      +   '<td class="n">' + slot('stxBd3') + '</td>'
      +   '<td class="n">' + slot('stxBd4') + '</td>'
      +   '<td class="n tot" data-b="dL">' + N(B.dL) + '</td></tr>'
      + '<tr class="e"><td class="lbl">Batch E<i data-b="enote">still needed</i></td>'
      +   '<td class="n" data-b="e3">' + N(B.e3) + '</td>'
      +   '<td class="n" data-b="e4">' + N(B.e4) + '</td>'
      +   '<td class="n tot" data-b="eL">' + N(B.eL) + '</td></tr>'
      + '<tr class="sum"><td class="lbl">Total = suggested transfer</td>'
      +   '<td class="n">' + N(F.xC3) + '</td>'
      +   '<td class="n">' + N(F.xC4) + '</td>'
      +   '<td class="n tot">' + N(F.xC3 + F.xC4) + '</td></tr>'
      + '</tbody></table>'
      + '<div class="stx-bd-warn' + (B.warn.length ? ' on' : '') + '" data-b="warn">'
      +   (B.warn.length ? '⚠ ' + _esc2(B.warn.join(' ')) : '') + '</div>'
      + '</div>';
  }
  /* Ô nhập batch D: kho ẩn → khối, cùng lý do với ô WMS initial. */
  function _stxParkBd(sloc){
    const pool = document.querySelector('.stx-inp-pool');
    if(!pool) return;
    ['stxBd3','stxBd4','stxBdW'].forEach(id=>{
      const inp = document.getElementById(id + sloc);
      if(inp && inp.parentNode !== pool) pool.appendChild(inp);
    });
  }
  function _stxMountBd(sloc, root){
    if(!root) return;
    ['stxBd3','stxBd4','stxBdW'].forEach(id=>{
      const slot = root.querySelector('.stx-inp-slot[data-for="' + id + sloc + '"]');
      const inp  = document.getElementById(id + sloc);
      if(slot && inp) slot.appendChild(inp);
    });
    _stxRestoreFocus(sloc);
  }
  /* Đổ giá trị vào ô nhập. KHÔNG bao giờ ghi đè ô đang được gõ — chỉ ô SUY RA.
     Ô suy ra mang class .derived để nhìn là biết số đó máy tự tính. */
  function _stxBdSyncInputs(sloc, B){
    const st = _stxBd[sloc];
    const e3 = document.getElementById('stxBd3' + sloc);
    const e4 = document.getElementById('stxBd4' + sloc);
    const ew = document.getElementById('stxBdW' + sloc);
    /* v4.129 — ĐIỀN SẴN %wt C3 của lot vừa mix xong (nền COQ CUỐI MẺ, đúng
       con số hiện cạnh FINISHED ở đầu thẻ). Trước đây ô để trống với chữ mờ
       "%wt": phép chia vẫn chạy đúng vì bên trong đã lấy nền COQ, nhưng nhân
       viên KHÔNG NHÌN THẤY mình đang chia theo tỉ lệ nào — số quan trọng nhất
       của cả khối lại là số duy nhất không hiện ra.
       Vẫn giữ `st.w3` RỖNG khi chưa ai gõ, nên đổi lot là ô tự cập nhật theo
       lot mới; gõ đè thì nhãn bên cạnh đổi thành "typed in". */
    if(ew && document.activeElement !== ew)
      ew.value = st.w3 !== '' ? st.w3
               : (B.w3 != null ? (+(B.w3*100).toFixed(2)) + '' : '');
    const put = (el, own, isSrc, val)=>{
      if(!el) return;
      el.classList.toggle('derived', !isSrc && B.on);
      if(document.activeElement === el) return;      /* đang gõ — không đụng */
      el.value = isSrc ? own : (B.on && val !== null ? String(Math.round(val)) : '');
    };
    put(e3, st.c3, st.src === '3', B.d3);
    put(e4, st.c4, st.src === '4', B.d4);
  }
  /* Vẽ lại CẢ khối (dùng khi số đề nghị đổi hoặc đổi lot). Ô nhập batch D
     được cất đi trước rồi gắn lại nên không bị huỷ. */
  function _stxSplitRender(sloc, F){
    const box = document.getElementById('stxSplit' + sloc);
    if(!box) return;
    _stxParkBd(sloc);
    box.innerHTML = _stxBdHtml(sloc, F);
    _stxMountBd(sloc, box);
    _stxBdSyncInputs(sloc, _stxBdCalc(sloc, F));
  }
  /* Lượt GÕ trong khối: chỉ ghi lại mấy ô số, tuyệt đối không đụng innerHTML. */
  function _stxBdLive(sloc){
    const box = document.getElementById('stxSplit' + sloc);
    const F   = _stxFigures(sloc);
    if(!box || !box.querySelector('.stx-bd')){ _stxSplitRender(sloc, F); return; }
    const B = _stxBdCalc(sloc, F);
    const N = v => _stxNum(v, 0);
    const set = (k, html)=>{ const el = box.querySelector('[data-b="' + k + '"]'); if(el) el.innerHTML = html; };
    set('dL', N(B.dL));
    set('e3', N(B.e3)); set('e4', N(B.e4)); set('eL', N(B.eL));
    set('wtnote', _esc2(B.w3Typed ? 'typed in' : (B.w3 != null ? 'from lot COQ' : 'not available')));
    set('enote', B.eW3 != null
          ? 'still needed · ' + (B.eW3 * 100).toFixed(2) + ' %wt C3'
          : 'still needed');
    const w = box.querySelector('[data-b="warn"]');
    if(w){
      w.className = 'stx-bd-warn' + (B.warn.length ? ' on' : '');
      w.innerHTML = B.warn.length ? '⚠ ' + _esc2(B.warn.join(' ')) : '';
    }
    _stxBdSyncInputs(sloc, B);
  }
  /* which = '3' | '4' | 'w'. Gõ ô nào thì ô đó thành NGUỒN, ô kia suy ra. */
  function stxBdEdit(sloc, which){
    const st = _stxBd[sloc];
    if(!st) return;
    if(which === 'w'){
      const ew = document.getElementById('stxBdW' + sloc);
      st.w3 = ew ? ew.value : '';
    } else {
      const el = document.getElementById('stxBd' + which + sloc);
      const v  = el ? el.value : '';
      st.src = which;
      if(which === '3'){ st.c3 = v; st.c4 = ''; }
      else             { st.c4 = v; st.c3 = ''; }
      if(_stxBdN(v) === null && !String(v).trim()) st.src = '';
    }
    _stxBdLive(sloc);
  }
  function stxBdReset(sloc){
    const st = _stxBd[sloc];
    if(!st) return;
    st.src = ''; st.c3 = ''; st.c4 = ''; st.w3 = '';
    const e3 = document.getElementById('stxBd3' + sloc);
    const e4 = document.getElementById('stxBd4' + sloc);
    const ew = document.getElementById('stxBdW' + sloc);
    [e3, e4, ew].forEach(el=>{ if(el){ el.value = ''; el.classList.remove('derived'); } });
    _stxBdLive(sloc);
  }

  /* ══ v4.114 — CẬP NHẬT TẠI CHỖ KHI ĐANG GÕ ═════════════════════════════
     LỖI ĐÃ SỬA: mỗi lần gõ một chữ số, `oninput` gọi renderStx → hàm này
     ghi đè `body.innerHTML`, mà trước đó phải KÉO hai ô <input> ra kho ẩn
     rồi gắn lại (`_stxPark`/`_stxMountInputs`). Element thì vẫn sống, NHƯNG
     chuyển một element ĐANG FOCUS sang cha khác là trình duyệt cắt focus —
     nên gõ được đúng một chữ số rồi ô "đơ", chữ số sau rơi ra ngoài.
     Nay đường gõ KHÔNG đụng tới innerHTML của bảng nữa: chỉ ghi lại đúng
     mấy ô số phụ thuộc (đánh dấu bằng data-c) và dựng lại phần chân. Ô nhập
     đứng yên tuyệt đối ⇒ focus và con trỏ không bao giờ mất.
     Bảng chưa dựng (lần đầu, hoặc vừa đổi lot) thì lùi về vẽ đầy đủ. */
  function _stxLive(sloc){
    const body = document.getElementById('stxBody'+sloc);
    const foot = document.getElementById('stxFoot'+sloc);
    if(!body || !foot) return;
    const tbl = body.querySelector('.stx-tbl');
    const F   = _stxFigures(sloc);
    if(!tbl || !F.ok){ renderStx(false); return; }
    const sysInfo = _stxSysFill(sloc, F.ctx, F, false);   /* refill=false: KHÔNG đụng ô nhập */
    const N  = v => _stxNum(v, 0);
    const SG = v => '<span class="'+_stxSignCls(v)+'">'+_stxSigned(v)+'</span>';
    const hasSys = F.hasSys;
    const sOpL  = hasSys ? F.sysC3 + F.sysC4 : null;
    const sClC3 = hasSys ? F.sysC3 + F.fC3 : null;
    const sClC4 = hasSys ? F.sysC4 + F.fC4 : null;
    const sClL  = hasSys ? sClC3 + sClC4 : null;
    const gClC3 = hasSys ? F.aClC3 - sClC3 : null;
    const gClC4 = hasSys ? F.aClC4 - sClC4 : null;
    const set = (k, html)=>{ const el = tbl.querySelector('[data-c="'+k+'"]'); if(el) el.innerHTML = html; };
    set('sopen-note',  _esc2(sysInfo.label || ''));
    set('sopen-t',     N(sOpL));
    set('sclose-3',    N(sClC3));  set('sclose-4', N(sClC4));  set('sclose-t', N(sClL));
    set('gopen-3',     SG(F.gapC3)); set('gopen-4', SG(F.gapC4));
    set('gopen-t',     SG(hasSys ? F.gapC3 + F.gapC4 : null));
    set('gclose-3',    SG(gClC3));   set('gclose-4', SG(gClC4));
    set('gclose-t',    SG(hasSys ? gClC3 + gClC4 : null));
    foot.innerHTML = _stxFootHtml(sloc, F);
    /* v4.128 — số chuyển kho vừa đổi ⇒ phần batch E phải tính lại. Lúc này
       con trỏ đang nằm ở ô WMS initial, không phải ô batch D, nên vẽ lại
       cả khối là an toàn. */
    _stxSplitRender(sloc, F);
    _stxTsvRebuild();
  }

  /* Dòng TSV của một bồn — tách ra để lượt gõ cũng làm mới được nút Copy. */
  function _stxLineFor(sloc){
    const F = _stxFigures(sloc);
    if(!F.ok) return null;
    const ctx = F.ctx, hasSys = F.hasSys;
    const saved = _stxSavedOf(ctx);
    return [ctx.tank, ctx.lot, (ctx.day && ctx.day.finishTxt) || '',
            (ctx.day && ctx.day.sapDate) ? _stxDmy(ctx.day.sapDate) : '',
            Math.round(F.aOpC3), Math.round(F.aOpC4), Math.round(F.aClC3), Math.round(F.aClC4),
            Math.round(F.fC3), Math.round(F.fC4),
            hasSys ? Math.round(F.sysC3) : '', hasSys ? Math.round(F.sysC4) : '', F.sysTag,
            (ctx.sap && ctx.sap.lastAt)
              ? _stxWhen(ctx.sap.lastAt) + (ctx.sap.lastBy ? ' ' + ctx.sap.lastBy : '') : '',
            hasSys ? Math.round(F.gapC3) : '', hasSys ? Math.round(F.gapC4) : '',
            hasSys ? Math.round(F.xC3) : '', hasSys ? Math.round(F.xC4) : '',
            hasSys ? Math.round(F.xC3 - F.fC3) : '', hasSys ? Math.round(F.xC4 - F.fC4) : '',
            saved.has ? 'yes' : 'no'].join('\t');
  }
  const _STX_TSV_HEAD = ['Tank','Lot','Finish','SAP_date','Actual_open_C3_kg','Actual_open_C4_kg',
                         'Actual_close_C3_kg','Actual_close_C4_kg','COQ_fill_C3_kg','COQ_fill_C4_kg',
                         'System_open_C3_kg','System_open_C4_kg','System_open_source','SAP_data_pasted',
                         'Gap_open_C3_kg','Gap_open_C4_kg',
                         'Suggest_C3_kg','Suggest_C4_kg','Adjust_C3_kg','Adjust_C4_kg',
                         'Saved_to_TankLog'].join('\t');
  function _stxTsvRebuild(){
    const lines = [_STX_TSV_HEAD];
    _STX_SLOCS.forEach(sl=>{ const l = _stxLineFor(sl); if(l) lines.push(l); });
    _stxTSV = lines.length > 1 ? lines.join('\n') : '';
  }

  function renderStx(refill){
    _stxFocusKeep = _stxSnapFocus();     /* v4.114 — chụp TRƯỚC mọi lượt _stxPark */
    _STX_SLOCS.forEach(sloc=>{
      const F   = _stxFigures(sloc);
      const ctx = F.ctx;
      _stxHead(ctx, F);
      const body = document.getElementById('stxBody'+sloc);
      const foot = document.getElementById('stxFoot'+sloc);
      if(!body || !foot) return;
      _stxPark(sloc);        /* cứu hai ô nhập trước khi ghi đè innerHTML */

      if(!F.ok && F.why === 'no-row'){
        body.innerHTML = '<div class="stx-empty">No Tank Log row found'
          + (ctx.lot ? ' for lot <b>'+_esc2(ctx.lot)+'</b>' : '')
          + '. Type a lot number above, or press <b>📥 Load All</b> in the Tank Log if it is an older lot.</div>';
        foot.innerHTML = '';
        _stxSplitRender(sloc, F);      /* v4.128 — F.ok=false ⇒ khối tự rỗng */
        _stxSysFill(sloc, ctx, F, refill);
        return;
      }
      if(!F.ok){
        body.innerHTML = '<div class="stx-empty">Lot <b>'+_esc2(ctx.lot)+'</b> has no COQ basis yet, so the actual '
          + 'C3 / C4 split cannot be computed.<br><span class="miss">Missing: '
          + _esc2(F.miss)
          + '</span><br>Open the lot in the Tank Log and press <b>◈ CALC COQ</b>, or run <b>◈ COQ audit</b>.</div>';
        foot.innerHTML = '';
        _stxSysFill(sloc, ctx, F, refill);
        return;
      }

      const s = ctx.split;
      const aOpC3 = F.aOpC3, aOpC4 = F.aOpC4, aOpL = aOpC3 + aOpC4;
      const aClC3 = F.aClC3, aClC4 = F.aClC4, aClL = aClC3 + aClC4;
      const fC3 = F.fC3, fC4 = F.fC4, fSrc = F.fSrc;

      /* ── tồn hệ thống (SAP tự lấy hoặc gõ tay) — nhãn nguồn + đổ ô nhập ── */
      const sysInfo = _stxSysFill(sloc, ctx, F, refill);
      const sOpC3 = F.sysC3, sOpC4 = F.sysC4, hasSys = F.hasSys;
      const sOpL  = hasSys ? sOpC3 + sOpC4 : null;

      /* ── nếu cứ chuyển đúng số COQ ── */
      const sClC3 = hasSys ? sOpC3 + fC3 : null;
      const sClC4 = hasSys ? sOpC4 + fC4 : null;
      const sClL  = hasSys ? sClC3 + sClC4 : null;
      /* ── lệch ── */
      const gOpC3 = F.gapC3, gOpC4 = F.gapC4;
      const gClC3 = hasSys ? aClC3 - sClC3 : null;
      const gClC4 = hasSys ? aClC4 - sClC4 : null;
      /* ── số đề xuất ── */
      const xC3 = F.xC3, xC4 = F.xC4;
      const xL  = hasSys ? xC3 + xC4 : null;

      const N  = v => _stxNum(v, 0);
      const SG = v => '<span class="'+_stxSignCls(v)+'">'+_stxSigned(v)+'</span>';
      body.innerHTML =
        '<table class="stx-tbl"><thead><tr>'
        + '<th class="lbl"></th><th class="n">Volume</th><th class="n">C3</th><th class="n">C4</th>'
        + '<th class="n tot">LPG</th></tr></thead><tbody>'
        + '<tr class="grp"><td colspan="5">ACTUAL — from measured volume × COQ basis</td></tr>'
        + _stxRow('a', 'Initial stock', 'INIT VOL × initial COQ',
                  _stxNum(s.ivol,3)+' m³', N(aOpC3), N(aOpC4), N(aOpL))
        + _stxRow('a', 'End stock', 'FINAL VOL × this lot COQ',
                  _stxNum(s.fvol,3)+' m³', N(aClC3), N(aClC4), N(aClL))
        + _stxRow('f', 'Filled this lot', fSrc, '', N(fC3), N(fC4), N(fC3+fC4))
        + '<tr class="grp"><td colspan="5">WMS — what WMS holds for this tank</td></tr>'
        + _stxRow('s', 'Initial stock', sysInfo.label, '',
                  '<span class="stx-inp-slot" data-for="stxSys3'+sloc+'"></span>',
                  '<span class="stx-inp-slot" data-for="stxSys4'+sloc+'"></span>', N(sOpL), 'sopen')
        + _stxRow('s', 'End stock if COQ posted', 'WMS initial + filled', '',
                  N(sClC3), N(sClC4), N(sClL), 'sclose')
        + '<tr class="grp"><td colspan="5">GAP — actual minus WMS</td></tr>'
        + _stxRow('g', 'At initial', 'measured vs SAP', '',
                  SG(gOpC3), SG(gOpC4), SG(hasSys?gOpC3+gOpC4:null), 'gopen')
        + _stxRow('g', 'At end stock if COQ posted', 'the gap simply carries over', '',
                  SG(gClC3), SG(gClC4), SG(hasSys?gClC3+gClC4:null), 'gclose')
        + '</tbody></table>';
      /* Hai ô nhập là element THẬT, không dựng lại theo innerHTML —
         nếu không thì mỗi lần gõ một chữ số là ô bị huỷ, mất con trỏ. */
      _stxMountInputs(sloc, body);

      foot.innerHTML = _stxFootHtml(sloc, F);
      _stxSplitRender(sloc, F);        /* v4.128 — tách batch D / batch E */
    });
    _stxFocusKeep = null;
    _stxTsvRebuild();
  }

  /* ── v4.111 — ĐÃ LƯU VÀO TANK LOG CHƯA ──────────────────────────────
     Đọc thẳng 4 ô trên dòng Tank Log, không giữ trạng thái riêng: nguồn
     sự thật duy nhất là dữ liệu đã ghi, nên máy khác lưu thì máy này cũng
     thấy ngay sau khi Firebase đồng bộ về. */
  function _stxSavedOf(ctx){
    const out = { has:false, txt:'Not saved to the Tank Log yet', gap3:null, gap4:null, adj3:null, adj4:null };
    try{
      if(!ctx || !ctx.row || typeof ENG === 'undefined' || !ENG.stxReconOf) return out;
      const r = ENG.stxReconOf(ctx.row);
      if(!r.has) return out;
      const n = v => v === null ? '—' : _stxNum(v, 0);
      out.has = true; out.gap3 = r.gap3; out.gap4 = r.gap4; out.adj3 = r.adj3; out.adj4 = r.adj4;
      out.txt = '✔ Saved on this lot — gap ' + _stxSigned(r.gap3) + ' / ' + _stxSigned(r.gap4)
              + ' · transfer ' + n(r.adj3) + ' / ' + n(r.adj4) + ' kg';
    }catch(_){}
    return out;
  }

  /* ══ v4.152 — P2 · TỒN ĐẦU NGÀY DO PHẦN MỀM TỰ LẤY ══════════════════
     Tồn đầu của bồn là con số phần mềm ĐÃ CÓ, không có lý do gì bắt nhân
     viên mở SAP ra rồi gõ lại — gõ lại là chỗ sai dễ xảy ra nhất và không
     có gì kiểm tra chéo.
       ① Bình thường → End Stock SAP của NGÀY HÔM TRƯỚC.
       ② Nhưng nếu Tank Log có mẻ mix của ĐÚNG bồn này KẾT THÚC SAU lúc
          bảng SAP được dán thì ảnh SAP ấy chụp trước khi bồn được trộn
          lại ⇒ nó thiếu nguyên một mẻ. Ca đêm không có người cập nhật
          SAP, hôm sau nhân viên mới chuyển kho và nhập lại cho khớp —
          đó chính là độ trễ này. Lúc đó tồn đầu = TRẠNG THÁI CUỐI
          (finish) của mẻ trong Tank Log: đó là TOÀN BỘ ruột bồn, đo
          thật, không phải suy diễn cộng trừ.
     Chỉ nhận mẻ kết thúc TRƯỚC giờ mở cửa của ngày đang xét. Mẻ xong giữa
     ban ngày là phát sinh TRONG ngày, phải đi đường cavern receipt (P4),
     không phải tồn đầu.
     Lot nào đã cuộn vào tồn đầu thì ghi dấu vào /mixIn để ✅ KHÔNG cộng
     thêm một lần nữa. Hai đường đều phải đáp xuống ĐÚNG tồn cuối thực tế:
       ① SAP D-1 + số chuyển kho đã điều chỉnh = tồn cuối thực tế
       ② trạng thái finish                     = tồn cuối thực tế
     Số do app lấy mang cờ auto:true ⇒ bảng vẽ nó bằng dáng ƒ xanh nét
     đứt. Nhân viên gõ đè lúc nào cũng được, gõ xong là ✎ hổ phách và app
     không bao giờ đụng lại nữa. */
  const _MIX_STALE_MS = 48 * 3600 * 1000;
  const _autoInitDone = {};
  const _autoClr = {};          /* v4.170 — mỗi ngày/bồn chỉ báo "không tính nổi" một lần */

  function _mixKey(lot){
    return String(lot||'').trim().replace(/[.#$\[\]\/]/g, '_') || '_';
  }
  /* Mốc KẾT THÚC mẻ tính bằng ms — có tính cả trường hợp trộn qua đêm
     (giờ finish nhỏ hơn giờ start ⇒ sang ngày hôm sau). */
  function _mixFinishAt(row){
    if(!row) return 0;
    const base = _stxIso(row[3]), fi = _stxHm(row[5]), st = _stxHm(row[4]);
    if(!base || !fi) return 0;
    const overnight = !!(st && (fi.h*60 + fi.m) < (st.h*60 + st.m));
    const day = overnight ? _stxShift(base, 1) : base;
    const p = n => String(n).padStart(2, '0');
    const t = new Date(day + 'T' + p(fi.h) + ':' + p(fi.m) + ':00');
    return isNaN(t.getTime()) ? 0 : t.getTime();
  }
  function _dayOpenAt(d){
    const t = new Date(d + 'T' + String(STX_OPEN_H).padStart(2,'0') + ':00:00');
    return isNaN(t.getTime()) ? 0 : t.getTime();
  }
  /* ══ v4.154 — END STOCK SAP NÀY LÀ CỦA LOT NÀO ══════════════════════
     LỖI v4.152: so giờ FINISH của mẻ với giờ DÁN bảng SAP. Nhưng End Stock
     của ngày X là số dư CUỐI NGÀY X theo NGÀY HẠCH TOÁN — dán lúc nào cũng
     thế. Ca thật 16/09: SAP 15/09 dán sáng 16/09, muộn hơn mẻ 413 xong
     20:10 tối 15/09 ⇒ luật cũ kết luận "SAP đã gồm mẻ" và lấy nhầm số SAP,
     trong khi bút toán chuyển kho của 413 CHƯA hề post (cờ ST còn ○).
     LUẬT ĐÚNG — lot L nằm trong End Stock SAP ngày X khi và chỉ khi:
        ① L xong TRƯỚC hết ngày X, VÀ
        ② cờ ST [53] của L đã tick (đã chuyển kho trên WMS), VÀ
        ③ giờ tick [54] thuộc ngày ≤ X (post ngày nào, SAP ngày đó mới có).
     Dòng cũ có tick mà không có giờ tick ⇒ lùi về luật giờ dán cũ.
     Mỗi lần dán SAP, app GHI LẠI kết luận này vào /sap_lot/<ngày>/<sloc>:
     số SAP đó đại diện cho lot nào + các lot đã trộn mà SAP chưa có. Bảng
     tồn đầu đọc lại bản ghi đó trước, không có mới tự suy. */
  function _dayAt(iso, h){
    if(!iso) return 0;
    const t = new Date(iso + 'T' + String(h).padStart(2,'0') + ':00:00');
    return isNaN(t.getTime()) ? 0 : t.getTime();
  }
  function _dayEndAt(iso){ const n = _dayAt(_stxShift(iso, 1), 0); return n ? n - 1 : 0; }
  function _isoOf(ms){
    const t = +ms || 0; if(!t) return '';
    const d = new Date(t); if(isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function _stOn(row){ return String((row && row[53]) || '') === '1'; }
  function _stTickAt(row){ const t = +(row && row[54]) || 0; return t > 0 ? t : 0; }
  /* Mọi mẻ của MỘT bồn có giờ finish, xếp theo giờ finish TĂNG dần. */
  function _tankMixes(sloc){
    const want = _STX_TKNUM[sloc], out = [];
    _stxRows().forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      const at = _mixFinishAt(r);
      if(at) out.push({ row:r, at:at, lot:String(r[1]||'').trim() });
    });
    out.sort((a, z) => a.at - z.at);
    return out;
  }
  /* ══ v4.163 — LOT NÀY ĐÃ NẰM TRONG END STOCK SAP NGÀY X CHƯA ════════
     ────────────────────────────────────────────────────────────────────
     CHỈ SO MỐC THỜI GIAN. Bỏ hẳn hai điều kiện cũ của v4.154 (cờ ST [53]
     và ngày tick [54]) ra khỏi quyết định này.
     VÌ SAO BỎ: End Stock của ngày X là số dư CUỐI NGÀY X. Lot 415 trộn
     xong 22:20 tối 16/09 thì nằm gọn trong số dư cuối ngày 17/09 — không
     có cách nào khác. Nhưng cờ ST của nó lại được tick sáng 18/09, nên
     luật cũ kết luận "SAP 17/09 chưa có lot 415" và nhánh sapfill cộng
     nguyên 281.023 kg Filled của nó lên nền SAP vốn đã chứa sẵn nó ⇒ tồn
     đầu 568.397 kg, hơn cả sức chứa bồn, trong khi số đúng là 287.374 kg.
     Cờ ST là dấu thao tác của nhân viên, tick lúc nào cũng được — không
     phải mốc hạch toán, nên không được quyền quyết định chuyện này.
     CÒN CA NGƯỢC LẠI (mẻ xong trong ngày X mà bút toán chuyển kho chưa
     post nên SAP X thật sự CHƯA có nó — ca 413 ghi trong v4.154) thì nay
     do NGƯỜI DÁN SAP xác nhận, xem _sapLotAsk: bản ghi confirmed:true
     luôn thắng luật thời gian này.
     HAI MỐC, phải qua CẢ HAI mới coi là SAP đã có:
       ① xong trước hết ngày X   — số dư cuối ngày X không thể chứa mẻ
                                   trộn sang ngày hôm sau
       ② xong trước lúc dán bảng — bảng dán lúc nào thì chỉ chụp được tới
                                   lúc đó (bảng của ngày D dán giữa trưa) */
  function _sapHasMix(r, X, sapAt){
    const fin = _mixFinishAt(r);
    if(!fin || !X) return false;
    if(fin > _dayEndAt(X)) return false;                 /* ① xong sau ngày X */
    if(sapAt && fin > sapAt) return false;               /* ② xong sau lúc dán */
    return true;
  }
  function _notInSapWhy(r, X){
    const fin = _mixFinishAt(r);
    if(fin && fin > _dayEndAt(X))
      return 'it finished after ' + _stxDmy(X) + ' had closed';
    return 'the SAP data was pasted before it finished';
  }
  const _SAPLOT_WIN_MS = 72 * 3600 * 1000;
  function _sapLotLive(sloc, X, sapAt){
    const out = { lot:'', lotAt:0, pending:[], src:'live', confirmed:false };
    const endX = _dayEndAt(X);
    const M = _tankMixes(sloc).filter(m => m.at <= endX);
    M.forEach(m=>{ if(_sapHasMix(m.row, X, sapAt)){ out.lot = m.lot; out.lotAt = m.at; } });
    M.forEach(m=>{
      if(m.at <= out.lotAt || m.at < endX - _SAPLOT_WIN_MS) return;
      if(!_sapHasMix(m.row, X, sapAt)) out.pending.push(m.lot);
    });
    return out;
  }
  /* ══ v4.165 — LỚP TICK CỦA NGƯỜI DÙNG ĐÈ LÊN MỌI SUY ĐOÁN ═══════════
     ────────────────────────────────────────────────────────────────────
     Bài toán "End Stock SAP đã gồm lot nào" đã kéo qua ba đời luật (cờ ST,
     ngày tick, bản ghi /sap_lot, rồi so mốc thời gian) và lần nào cũng có
     một ca thật làm nó sai — vì đây vốn là chuyện NGƯỜI biết chứ máy không
     suy ra được chắc chắn. Nên nay có thêm một lớp đơn giản nằm trên tất
     cả: ở tab Stock của Tank Console, nhân viên TICK / BỎ TICK từng lot.
       tick   = lot này SAP CHƯA có  ⇒ cộng thêm vào tồn đầu
       bỏ tick= lot này SAP ĐÃ có    ⇒ không cộng
     Không đụng tới thì để app tự chạy như thường. Ca 18/09: bỏ tick lot
     415 là tồn đầu về đúng 287.374 kg ngay, khỏi sửa luật gì cả.
     Lưu ở inv_daily/<ngày>/<bồn>/lotSel/<khoá lot> = true | false. */
  function _lotSel(sloc, d){
    const b = bucket(d || ds(), sloc);
    return b.lotSel || {};
  }
  /* Luật NỀN (chưa tính tick của người) — dùng chung cho cả _autoInitPickRaw
     lẫn bảng tick, để hai chỗ không bao giờ lệch nhau. */
  function _inSapBase(hasSap, SL, conf, cut, m){
    if(conf) return cut > 0 && _stxLotKey(m.lot) <= cut;
    return hasSap && !!SL.lot
        && (_stxLotMatch(m.lot, SL.lot) || (SL.lotAt > 0 && m.at <= SL.lotAt));
  }
  const _SAPLOT = {};               /* iso → sloc → bản ghi /sap_lot (Firebase) */
  let _sapLotBound = false;
  function _splitLots(s){ return String(s||'').split(',').map(x=>x.trim()).filter(Boolean); }
  /* Bản ghi lúc dán thắng; chưa có bản ghi (SAP dán bằng bản cũ) thì tự suy. */
  function sapLotOf(sloc, X, sapAt){
    const live = _sapLotLive(sloc, X, sapAt);
    const n = (_SAPLOT[X] || {})[sloc];
    if(!n) return live;
    /* ══ v4.166 — CHỈ BẢN GHI ĐƯỢC NGƯỜI XÁC NHẬN MỚI THẮNG ═══════════
       Bản ghi /sap_lot TỰ CHỐT lúc dán SAP là một ẢNH CHỤP, và ảnh đó chụp
       bằng dữ liệu CÓ Ở THỜI ĐIỂM ĐÓ — sai thì nó đóng băng cái sai lại.
       Ca thật: hôm dán SAP 17/09, lot 415 còn ô Date hỏng ("0235") nên vô
       hình với _tankMixes ⇒ bản ghi chốt "SAP 17/09 đại diện lot 412".
       Sau khi sửa ngày và đổi sang luật thời gian ở v4.163, luật live đã
       kết luận đúng là 415, NHƯNG bản ghi 412 vẫn được ưu tiên ⇒ 415 và
       414 cứ bị xếp "SAP chưa có" ⇒ tự tick lại và tồn đầu lại thành
       568.397 kg. Nay: bản tự chốt chỉ còn giá trị tham khảo, luật live
       (so mốc thời gian) chạy lại mỗi lần; chỉ câu XÁC NHẬN CỦA NGƯỜI
       (confirmed:true, xem _sapLotAsk) mới được quyền đè lên. */
    if(n.confirmed !== true) return live;
    const lot = String(n.lot || '');
    let lotAt = +n.lotAt || 0;
    if(lot){
      const hit = _tankMixes(sloc).filter(m => _stxLotMatch(m.lot, lot)).pop();
      if(hit) lotAt = hit.at;
    }
    return { lot:lot, lotAt:lotAt, pending:_splitLots(n.pending), src:'node',
             confirmed:!!n.confirmed, lotKey:_stxLotKey(lot),
             at:+n.at || 0, by:String(n.by||''), live:live };
  }
  /* ══ v4.162 — HỎI THẲNG NGƯỜI DÁN SAP: "SỐ NÀY ĐÃ GỒM TỚI LOT NÀO?" ══
     ────────────────────────────────────────────────────────────────────
     Trước đây app phải SUY ra điều này qua ba tầng: cờ ST [53], ngày tick
     [54], rồi bản ghi /sap_lot tự chốt lúc dán. Chuỗi đó gãy im lặng —
     ca thật 18/09: lúc dán SAP 17/09 thì lot 415 còn ô Date hỏng ("0235")
     nên _mixFinishAt = 0, lot 415 VÔ HÌNH với _tankMixes; app chốt "SAP
     17/09 đại diện lot 414". Sáng hôm sau sửa ngày xong, 415 hiện ra và
     bị xếp là "lot SAP chưa có" ⇒ nhánh sapfill cộng NGUYÊN 281.023 T
     Filled của nó lên nền SAP vốn đã chứa sẵn nó ⇒ tồn đầu 568.397 kg,
     nhiều hơn cả sức chứa bồn, trong khi số đúng là 287.374 kg.
     Người dán SAP thì lúc đó đang mở đúng màn hình WMS/SAP — họ BIẾT
     transfer đã post tới lot nào. Hỏi một câu là hết phải suy.
     ① Chỉ hỏi khi bảng vừa dán là của HÔM NAY (D) hoặc HÔM QUA (D-1).
        Dán lại D-2, D-3… thì im lặng, giữ nguyên luật tự suy cũ.
     ② Câu trả lời lưu theo NGÀY của bảng SAP (/sap_lot/<ngày>/<bồn>,
        confirmed:true) chứ không phải một biến "SAP mới nhất" — vì tồn
        đầu ngày mai đọc SAP của hôm nay; giữ một biến thì dán SAP ngày D
        sẽ xoá mất câu trả lời của D-1 và mai phải hỏi lại.
     ③ Đã xác nhận rồi thì app KHÔNG BAO GIỜ tự đè lên. */
  let _slqOpen = false;
  function _slqCands(sl, X){
    const endX = _dayEndAt(X);
    return _tankMixes(sl).filter(m => m.at && m.at <= endX).slice(-6).reverse();
  }
  function _slqFilledKg(row){
    const q3 = parseFloat(row && row[66]), q4 = parseFloat(row && row[67]);
    if(!isFinite(q3) || !isFinite(q4)) return null;
    return Math.round((q3 + q4) * 1000);
  }
  function _slqEsc(t){
    return String(t == null ? '' : t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _sapLotAsk(list){
    if(_slqOpen || !list || !list.length) return;
    if(typeof document === 'undefined' || !document.body) return;
    _slqOpen = true;
    const groups = list.map((g, i)=>{
      const cands = _slqCands(g.sl, g.X);
      const pre = String((g.live && g.live.lot) || '');
      const rows = cands.map(m=>{
        const f = _slqFilledKg(m.row);
        const on = pre && _stxLotMatch(m.lot, pre);
        return '<label class="slq-o" style="display:flex;gap:8px;align-items:flex-start;'
             + 'padding:7px 9px;border:1px solid #e2e8f0;border-radius:6px;margin-top:5px;cursor:pointer">'
             + '<input type="radio" name="slq' + i + '" value="' + _slqEsc(m.lot) + '"'
             + (on ? ' checked' : '') + ' style="margin-top:2px">'
             + '<span><b>' + _slqEsc(m.lot) + '</b>'
             + '<span style="color:#64748b"> \u00b7 finished ' + _stxWhen(m.at)
             + (f !== null ? ' \u00b7 filled ' + f.toLocaleString('en-US') + ' kg' : '')
             + '</span></span></label>';
      }).join('');
      return '<div style="margin-bottom:15px">'
           + '<div style="font-weight:700;color:#0f172a">' + _slqEsc(TKNAME[g.sl] || g.sl)
           + '<span style="font-weight:500;color:#64748b"> \u00b7 SAP End Stock ' + _stxDmy(g.X)
           + ' \u00b7 ' + Math.round(num(g.c3) + num(g.c4)).toLocaleString('en-US') + ' kg</span></div>'
           + rows
           + '<label class="slq-o" style="display:flex;gap:8px;align-items:center;'
           + 'padding:7px 9px;border:1px solid #e2e8f0;border-radius:6px;margin-top:5px;cursor:pointer">'
           + '<input type="radio" name="slq' + i + '" value=""' + (pre ? '' : ' checked') + '>'
           + '<span style="color:#b45309">None yet \u2014 no batch has been stock-transferred into this figure</span>'
           + '</label></div>';
    }).join('');
    const bg = document.createElement('div');
    bg.id = 'invSapLotBg';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10000;'
                     + 'display:flex;align-items:center;justify-content:center';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:10px;max-width:580px;width:92%;max-height:86vh;'
      + 'overflow:auto;box-shadow:0 14px 44px rgba(0,0,0,.3);font-size:13px;color:#0f172a">'
      + '<div style="padding:14px 18px;border-bottom:1px solid #e2e8f0">'
      + '<div style="font-weight:800;font-size:15px">\u2713 Stock transfer \u2014 how far does this SAP figure go?</div>'
      + '<div style="color:#64748b;margin-top:4px;line-height:1.5">Pick the LAST batch whose stock transfer'
      + ' is already posted in this SAP End Stock. Every batch after it is treated as NOT in SAP yet, and only'
      + ' those are added on top when the app works out tomorrow\u2019s opening stock.</div></div>'
      + '<div style="padding:14px 18px">' + groups + '</div>'
      + '<div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">'
      + '<button id="slqSkip" style="padding:7px 14px;border:1px solid #cbd5e1;background:#fff;'
      + 'border-radius:6px;cursor:pointer;font-size:13px">Skip</button>'
      + '<button id="slqOk" style="padding:7px 16px;border:0;background:#2563eb;color:#fff;'
      + 'border-radius:6px;cursor:pointer;font-weight:700;font-size:13px">Confirm</button>'
      + '</div></div>';
    document.body.appendChild(bg);
    const close = ()=>{ _slqOpen = false; try{ bg.remove(); }catch(_){ } };
    bg.querySelector('#slqSkip').onclick = ()=>{
      close();
      toast('\u2139 Stock transfer not confirmed \u2014 the app falls back to guessing it from the ST ticks', 'warn');
    };
    bg.querySelector('#slqOk').onclick = ()=>{
      const picks = list.map((g, i)=>{
        const el = bg.querySelector('input[name="slq' + i + '"]:checked');
        return { g:g, lot: el ? String(el.value || '') : '' };
      });
      close();
      _sapLotWriteConfirmed(picks);
    };
  }
  /* Ghi câu trả lời: lot chốt + danh sách lot SAU nó (SAP chưa có). */
  function _sapLotWriteConfirmed(picks){
    const h = fb(); if(!h) return;
    const updates = {}, ts = Date.now(), who = by();
    let n = 0;
    picks.forEach(p=>{
      const g = p.g, cut = _stxLotKey(p.lot);
      const cands = _slqCands(g.sl, g.X);
      const hit = p.lot ? cands.filter(m => _stxLotMatch(m.lot, p.lot))[0] : null;
      const pending = cands.filter(m => _stxLotKey(m.lot) > cut)
                           .sort((a,z)=> a.at - z.at).map(m => m.lot);
      const rec = { lot:String(p.lot||''), lotAt: hit ? hit.at : 0,
                    pending: pending.join(','),
                    c3: Math.round(num(g.c3)), c4: Math.round(num(g.c4)),
                    sapAt: +g.sapAt || 0, at: ts, by: who, confirmed: true };
      (_SAPLOT[g.X] = _SAPLOT[g.X] || {})[g.sl] = rec;
      updates['sap_lot/' + g.X + '/' + g.sl] = rec;
      n++;
    });
    if(!n) return;
    h.ref().update(updates)
      .then(()=>{
        toast('\u2705 Stock transfer confirmed \u2014 the opening stock is recalculated from it', 'ok');
        try{ render(); }catch(_){ }
      })
      .catch(e=>{ console.warn('[INV] sapLot confirm', e);
        toast('\u26a0 Could not save the stock-transfer confirmation', 'er'); });
  }

  /* Gọi sau mỗi lần dán SAP: ghi lot mà End Stock của từng bồn đại diện. */
  function sapLotStamp(dates){
    if(!_canAuto()) return 0;
    const h = fb(); if(!h) return 0;
    if(!_stxRows().length) return 0;        /* Tank Log chưa nạp ⇒ không kết luận bừa */
    const updates = {}, ts = Date.now(), who = by();
    let n = 0;
    const seen = {};
    /* v4.162 — bảng vừa dán là của HÔM NAY hay HÔM QUA thì HỎI, không tự chốt */
    const _today = ds(), _yest = _stxShift(_today, -1), ask = [];
    (dates || []).forEach(x=>{
      const X = _stxIso(x); if(!X || seen[X]) return; seen[X] = 1;
      ['2100','2101'].forEach(sl=>{
        let sap = null;
        try{ sap = (typeof SP !== 'undefined' && SP.tankEnd) ? SP.tankEnd(sl, X) : null; }catch(_){}
        if(!sap || !sap.has) return;
        const old0 = (_SAPLOT[X] || {})[sl];
        /* đã có người xác nhận cho ngày này ⇒ app không bao giờ đè lên */
        if(old0 && old0.confirmed === true) return;
        const L = _sapLotLive(sl, X, +sap.lastAt || 0);
        if(X === _today || X === _yest){
          ask.push({ X:X, sl:sl, c3:num(sap.c3), c4:num(sap.c4),
                     sapAt:+sap.lastAt || 0, live:L });
          return;
        }
        const rec = { lot:L.lot, lotAt:L.lotAt, pending:L.pending.join(','),
                      c3:Math.round(num(sap.c3)), c4:Math.round(num(sap.c4)),
                      sapAt:+sap.lastAt || 0, at:ts, by:who };
        const old = (_SAPLOT[X] || {})[sl];
        if(old && String(old.lot||'') === rec.lot && String(old.pending||'') === rec.pending
           && Math.round(num(old.c3)) === rec.c3 && Math.round(num(old.c4)) === rec.c4) return;
        (_SAPLOT[X] = _SAPLOT[X] || {})[sl] = rec;
        updates['sap_lot/' + X + '/' + sl] = rec; n++;
      });
    });
    if(n) h.ref().update(updates).catch(e=>console.warn('[INV] sapLotStamp', e));
    /* để bảng SAP vẽ xong rồi mới bật hộp hỏi */
    if(ask.length) setTimeout(()=>{ try{ _sapLotAsk(ask); }catch(e){ console.warn('[INV] sapLotAsk', e); } }, 120);
    return n;
  }
  function _attachSapLot(){
    const h = fb(); if(!h || _sapLotBound) return;
    _sapLotBound = true;
    try{
      let q = h.ref('sap_lot');
      if(q && typeof q.orderByKey === 'function') q = q.orderByKey().limitToLast(10);
      q.on('value', snap=>{
        const v = (snap && typeof snap.val === 'function' && snap.val()) || {};
        Object.keys(_SAPLOT).forEach(k=>{ delete _SAPLOT[k]; });
        Object.keys(v).forEach(k=>{ _SAPLOT[k] = v[k] || {}; });
        render();
      }, err=>console.warn('[INV] sap_lot listen', err));
    }catch(e){ console.warn('[INV] sap_lot attach', e); }
  }

  /* Quyền + độ chín dữ liệu cho mọi lệnh app TỰ ghi. Vai trò chỉ xem / sale
     không được ghi; 15 giây đầu để SAP + Tank Log kịp nạp, khỏi chốt số từ
     RAM còn trống rồi phải lật lại. */
  let _bootAt = 0;
  function _canAuto(){
    try{ if(typeof canWrite === 'function' && !canWrite('inv')) return false; }catch(_){ return false; }
    return true;
  }
  function _autoReady(){ return !!_clock || (_bootAt > 0 && Date.now() - _bootAt > 15000); }
  /* ⚠ v4.170 — MỌI lượt ghi `_ver` PHẢI đi qua đây, ĐỪNG dùng Date.now().
     Listener chỉ nạp lại khi `_ver` ĐỔI (`fbVer !== _localVer[sl]`). Hai
     lượt ghi rơi vào CÙNG một mili-giây thì Date.now() cho ra cùng một số
     ⇒ lượt sau bị listener bỏ qua, số vừa lưu KHÔNG hiện ra cho tới khi có
     lượt ghi thứ ba. Lỗi chập chờn, không báo gì. _vts() luôn tăng. */
  let _lastVer = 0;
  function _vts(){ const t = Date.now(); _lastVer = (t > _lastVer) ? t : _lastVer + 1; return _lastVer; }

  /* ══ TỒN ĐẦU NGÀY — THUẦN TÍNH, không đụng DOM, không ghi gì ══════════
     Mẻ mới nhất của bồn xong TRƯỚC giờ mở cửa hôm nay:
       • SAP D-1 đã có mẻ đó (hoặc không có mẻ nào)  ⇒ End Stock SAP D-1
       • SAP D-1 CHƯA có, mẻ xong sau 19:00 hôm qua  ⇒ trạng thái FINISH của
         mẻ trên Tank Log (đo thật, cả ruột bồn; không ai xuất hàng từ lúc đó)
       • SAP D-1 CHƯA có, mẻ xong trước 19:00 hôm qua ⇒ SAP D-1 + lượng nạp
         ◈COQ của các mẻ đó (sau mẻ còn xuất hàng nên trạng thái finish đã cũ)
       • mẻ chưa có COQ ⇒ tạm lấy SAP, có COQ là tự chuyển. */
  function _autoInitPickRaw(sloc, d, opt){
    d = d || ds();
    const out = { ok:false, c3:0, c4:0, wt:null, src:'none', lot:'', lots:[], day:'',
                  sapAt:0, sapGuess:false, sapLot:'', sapLotSrc:'', finishAt:0,
                  waitCoq:'', txt:'', why:'' };
    if(!_STX_TKNUM[sloc]){ out.why = 'bad-tank'; return out; }
    const yest = _stxShift(d, -1);
    out.day = yest;
    let sap = null;
    try{ sap = (typeof SP !== 'undefined' && SP.tankEnd) ? SP.tankEnd(sloc, yest) : null; }catch(_){}
    const hasSap = !!(sap && sap.has && (num(sap.c3) + num(sap.c4)) > 0);
    let sapAt = hasSap ? (+sap.lastAt || 0) : 0;
    if(hasSap && !sapAt){
      const g = _dayAt(yest, STX_CLOSE_H);
      if(g){ sapAt = g; out.sapGuess = true; }
    }
    out.sapAt = sapAt;
    const openAt = _dayOpenAt(d), closeY = _dayAt(yest, STX_CLOSE_H);
    const SL = hasSap ? sapLotOf(sloc, yest, sapAt) : { lot:'', lotAt:0, pending:[], src:'' };
    out.sapLot = SL.lot; out.sapLotSrc = SL.src;
    /* v4.162 — CÓ XÁC NHẬN TAY thì chỉ cần so SỐ LOT: lot ≤ lot chốt là
       SAP đã có, lot lớn hơn là SAP chưa có. Không đụng cờ ST, ngày tick
       hay giờ dán nữa — ba thứ đó chính là chỗ đã suy sai ca 415.
       Chưa ai xác nhận thì giữ nguyên luật suy cũ. */
    const _conf = hasSap && SL.confirmed === true;
    const _cut  = _conf ? _stxLotKey(SL.lot) : 0;
    out.sapConf = _conf;
    /* v4.165 — TICK CỦA NGƯỜI THẮNG TẤT CẢ. Không tick thì theo luật nền. */
    const _OV = _lotSel(sloc, d);
    const inSap = m => {
      const o = _OV[_stxLotKey(m.lot)];
      if(o !== undefined) return !o;      /* tick = SAP chưa có ⇒ cộng thêm */
      return _inSapBase(hasSap, SL, _conf, _cut, m);
    };
    const M = _tankMixes(sloc).filter(m => m.at <= openAt);
    const best = M.length ? M[M.length - 1] : null;
    const fresh = !!best && best.at >= openAt - _MIX_STALE_MS;
    const sapTxt = () => 'the SAP End Stock of ' + _stxDmy(yest)
                       + (sap && sap.lastAt ? ' (pasted ' + _stxWhen(sap.lastAt) + ')' : '');
    const useSap = why => {
      out.ok = true; out.src = 'sap';
      out.c3 = Math.round(num(sap.c3)); out.c4 = Math.round(num(sap.c4));
      out.wt = _wtInt(out.c3, out.c4);
      out.txt = sapTxt() + ' — ' + why;
      return out;
    };

    /* opt.noFill — BỎ QUA nhánh "cộng thêm mẻ SAP chưa có", rơi thẳng
       xuống nền SAP D-1 nguyên bản. Dùng khi nhánh cộng thêm đã cho ra
       con số vượt trần vật lý (xem _autoInitPick). */
    if(!(opt && opt.noFill) && best && fresh && !inSap(best)){
      /* v4.165 — CHỈ lọc bằng inSap(). Điều kiện cũ `m.at > SL.lotAt` là
         bản sao thừa của chính inSap (SL.lotAt là giờ finish của lot mà SAP
         chốt tới), mà lại đọc thẳng SL nên KHÔNG thấy tick của người: tick
         một lot vào rồi nó vẫn bị loại khỏi pend ⇒ tick mà số không đổi. */
      const pend = M.filter(m => m.at >= openAt - _MIX_STALE_MS && !inSap(m));
      const lotTxt = 'lot ' + best.lot + ' (finished ' + _stxWhen(best.at) + ')';
      const whyNot = hasSap
        ? ', not in the SAP End Stock of ' + _stxDmy(yest) + ' yet — ' + _notInSapWhy(best.row, yest)
        : ' — there is no SAP End Stock for ' + _stxDmy(yest);
      if(!hasSap || best.at >= closeY){
        let sp = null;
        try{ sp = (typeof ENG !== 'undefined' && ENG.actualSplit) ? ENG.actualSplit(best.row) : null; }catch(_){}
        if(sp && sp.endOk){
          out.ok = true; out.src = 'mix'; out.finishAt = best.at;
          out.c3 = Math.round(sp.endC3 * 1000);               /* actualSplit trả TẤN */
          out.c4 = Math.round(sp.endC4 * 1000);
          out.lot = best.lot;
          out.lots = pend.map(m => m.lot);
          if(out.lots.indexOf(best.lot) < 0) out.lots.push(best.lot);
          out.wt = _wtInt(out.c3, out.c4);
          out.txt = 'the Tank Log finish state of ' + lotTxt + whyNot;
          return out;
        }
        out.waitCoq = best.lot;
        if(hasSap) return useSap('lot ' + best.lot + ' is not in it yet, but it has no COQ basis so its '
                                 + 'finish state cannot be used; the app switches as soon as the COQ is in');
        out.why = 'no-coq';
        out.txt = lotTxt + ' has no COQ basis yet and there is no SAP End Stock for '
                + _stxDmy(yest) + ' — enter it by hand';
        return out;
      }
      /* xong trước 19:00 hôm qua mà SAP chưa có: sau mẻ còn xuất hàng */
      let f3 = 0, f4 = 0, miss = '';
      pend.forEach(m=>{
        const q3 = parseFloat(m.row[66]), q4 = parseFloat(m.row[67]);
        if(isFinite(q3) && isFinite(q4)){ f3 += q3 * 1000; f4 += q4 * 1000; }
        else if(!miss) miss = m.lot;
      });
      if(miss){
        out.waitCoq = miss;
        return useSap('lot ' + miss + ' is not in it yet, but it has no COQ filled quantity; '
                      + 'the app adds it as soon as the COQ is in');
      }
      out.ok = true; out.src = 'sapfill'; out.finishAt = best.at;
      out.c3 = Math.round(num(sap.c3) + f3); out.c4 = Math.round(num(sap.c4) + f4);
      out.lot = best.lot; out.lots = pend.map(m => m.lot);
      out.wt = _wtInt(out.c3, out.c4);
      out.txt = sapTxt() + ' plus the COQ filled quantity of ' + out.lots.join(', ')
              + ' — ' + lotTxt + whyNot + ', and trucks were loaded after it, so its finish state is out of date';
      return out;
    }
    if(hasSap){
      if(best && fresh) return useSap('it already contains lot ' + SL.lot
                                      + (SL.src === 'node' ? ' (recorded when the SAP data was pasted)' : ''));
      if(best && !inSap(best)) return useSap('lot ' + best.lot + ' finished too long ago to use its finish state');
      return useSap('no mix has finished on this tank since');
    }
    out.why = 'no-data';
    out.txt = 'no SAP End Stock for ' + _stxDmy(yest)
            + ' and no recent mix finish state in the Tank Log — enter it by hand';
    return out;
  }
  /* ══ v4.162 — TRẦN VẬT LÝ CỦA TỒN ĐẦU ════════════════════════════════
     Dòng thời gian của một bồn chỉ có hai chiều: TRỘN thì cộng vào, BÁN
     thì trừ ra. Nên dù suy theo nhánh nào (SAP, SAP+Filled, hay trạng thái
     finish), tồn đầu hôm nay KHÔNG THỂ lớn hơn:
         END đo thật của mẻ gần nhất  −  hàng đã xuất từ lúc đó tới giờ mở cửa
                                      +  cavern / liên bồn bơm vào trong khoảng đó
     Ca 18/09: END lot 415 = 310.855 kg, ngày 17/09 xuất ~23.481 kg ⇒ trần
     ≈ 287.374 kg — đúng bằng số SAP. Nhánh sapfill lại ra 568.397 kg, lớn
     hơn cả sức chứa bồn ⇒ chắc chắn sai.
     Vượt trần thì app KHÔNG ĐIỀN GÌ CẢ (và xoá số auto cũ nếu có), để nhân
     viên tự gõ — thà trống còn hơn một con số sai trông như thật. */
  function _soldKgBetween(sloc, fromIso, toIso, w3){
    const out = { c3:0, c4:0, rows:0 };
    if(typeof TL === 'undefined' || !TL.ROWS) return out;
    const suffix = _STX_TKNUM[sloc]; if(!suffix) return out;
    const p3 = (isFinite(w3) && w3 > 0 && w3 < 1) ? w3 : 0.5;
    Object.values(TL.ROWS).forEach(r=>{
      if(!r || r.disabled || !r.date) return;
      const iso = _stxIso(r.date);
      if(!iso || iso <= fromIso || iso >= toIso) return;
      if(typeof isPureType === 'function' && isPureType(r.type)) return;
      if(!String(r.ltank||'').toUpperCase().includes(suffix)) return;
      let rc3 = num(r.c3Kg || r.stC3), rc4 = num(r.c4Kg || r.stC4);
      const lpg = num(r.lpgQty), sum = rc3 + rc4;
      if(lpg > 0 && sum > 0 && sum < lpg / 100){ rc3 *= 1000; rc4 *= 1000; }
      if(rc3 > 0 || rc4 > 0){ out.c3 += rc3; out.c4 += rc4; }
      else if(lpg > 0){ out.c3 += lpg * p3; out.c4 += lpg * (1 - p3); }
      out.rows++;
    });
    return out;
  }
  /* cavern receipt + liên bồn bơm VÀO, trong khoảng (fromIso, toIso) */
  function _addedKgBetween(sloc, fromIso, toIso){
    const out = { c3:0, c4:0 };
    let day = fromIso;
    for(let i = 0; i < 12 && day && day < toIso; i++){
      const b = bucket(day, sloc);
      Object.values(b.history || {}).forEach(e=>{
        if(!e) return;
        if(e.type === 'cavern'){ out.c3 += num(e.c3); out.c4 += num(e.c4); }
        else if(e.type === 'xfer' && e.toSl === sloc){ out.c3 += num(e.c3); out.c4 += num(e.c4); }
      });
      day = _stxShift(day, 1);
    }
    return out;
  }
  const _CAP_TOL_KG = 3000;         /* dung sai: split C3/C4 của TL Data là số xấp xỉ */
  function _physCap(sloc, d){
    const out = { ok:false, c3:0, c4:0, lot:'', finAt:0, endKg:0, soldKg:0, why:'' };
    const openAt = _dayOpenAt(d);
    const M = _tankMixes(sloc).filter(m => m.at && m.at <= openAt);
    const best = M.length ? M[M.length - 1] : null;
    if(!best){ out.why = 'no-mix'; return out; }
    let sp = null;
    try{ sp = (typeof ENG !== 'undefined' && ENG.actualSplit) ? ENG.actualSplit(best.row) : null; }catch(_){}
    if(!sp || !sp.endOk){ out.why = 'no-end-state'; return out; }
    const e3 = num(sp.endC3) * 1000, e4 = num(sp.endC4) * 1000, tot = e3 + e4;
    if(!(tot > 0)){ out.why = 'no-end-state'; return out; }
    const finIso = _isoOf(best.at);
    if(!finIso){ out.why = 'no-finish-date'; return out; }
    const sold  = _soldKgBetween(sloc, finIso, d, e3 / tot);
    const added = _addedKgBetween(sloc, finIso, d);
    out.lot = best.lot; out.finAt = best.at; out.endKg = tot;
    out.soldKg = sold.c3 + sold.c4;
    out.c3 = e3 - sold.c3 + added.c3;
    out.c4 = e4 - sold.c4 + added.c4;
    out.ok = true;
    return out;
  }
  function _autoInitPick(sloc, d){
    d = d || ds();
    let out = null;
    try{ out = _autoInitPickRaw(sloc, d); }catch(e){ console.warn('[INV] autoInitPickRaw', e); return null; }
    if(!out || !out.ok) return out;
    /* v4.165 — NGƯỜI ĐÃ TICK TAY THÌ NGƯỜI THẮNG: trần vật lý là lưới an
       toàn cho phần app TỰ ĐOÁN, không phải để đè lên quyết định có chủ ý
       của nhân viên. Đã tick/bỏ tick lot nào trong ngày là thôi áp trần —
       muốn quay lại thì bấm ↺ trả lot đó về cho app. */
    /* ⚠ v4.167 — TICK CỦA MẺ TRONG NGÀY KHÔNG ĐƯỢC ĐỤNG TỚI TỒN ĐẦU.
       Từ v4.166 một danh sách tick gánh HAI việc khác hẳn nhau:
         · mẻ xong TRƯỚC giờ mở cửa → cộng lên nền SAP (TỒN ĐẦU)
         · mẻ xong TRONG NGÀY      → ghi dòng Cavern receipt (LIVE STOCK)
       Nhưng cả hai đều ghi chung vào /lotSel, còn chỗ này lại ĐẾM HẾT ⇒ chỉ
       cần thêm một mẻ trộn trong ngày là trần vật lý bị gỡ, và tồn đầu (số
       Open) có thể nhảy sang một nhánh suy khác ngay lúc đó. Đúng cái ca
       568.397 kg mà v4.162 dựng trần để chặn.
       Nay CHỈ đếm tick của những mẻ THỰC SỰ có thể đổi tồn đầu (xong trước
       giờ mở cửa, hoặc khoá lạ không tra được). Mẻ trong ngày: bỏ qua. */
    let _ovN = 0;
    try{
      const _OVk = Object.keys(_lotSel(sloc, d) || {});
      if(_OVk.length){
        const _openAt = _dayOpenAt(d), _todayK = Object.create(null);
        _tankMixes(sloc).forEach(m=>{ if(m.at && m.at > _openAt) _todayK[_stxLotKey(m.lot)] = 1; });
        _ovN = _OVk.filter(k => !_todayK[k]).length;
      }
    }catch(_){}
    if(_ovN) return out;
    let cap = null;
    try{ cap = _physCap(sloc, d); }catch(_){}
    if(!cap || !cap.ok) return out;
    const lim = num(cap.c3) + num(cap.c4);
    if(!(lim > 0)) return out;
    /* Dung sai rộng tay: trần chỉ để bắt lỗi TO (cộng trùng nguyên một mẻ
       vài trăm tấn), không phải để soi vài tấn lệch giữa TL Data và SAP. */
    const tol = Math.max(_CAP_TOL_KG, lim * 0.05);
    const got = num(out.c3) + num(out.c4);
    if(got <= lim + tol) return out;

    /* ── VƯỢT TRẦN ─────────────────────────────────────────────────────
       KHÔNG bỏ cuộc ngay. Nguyên nhân gần như luôn là nhánh "SAP + Filled
       của mẻ SAP chưa có" cộng trùng một mẻ mà SAP đã chứa sẵn. Nên thử
       lại với nền SAP D-1 NGUYÊN BẢN (noFill) — đúng dòng thời gian
       tồn đầu = End Stock SAP hôm qua, rồi trừ dần theo xe bán trong ngày.
       Chỉ khi nền SAP đó CŨNG vượt trần thì mới chịu thua và để trống. */
    let alt = null;
    try{ alt = _autoInitPickRaw(sloc, d, { noFill:true }); }catch(_){}
    const altGot = alt && alt.ok ? num(alt.c3) + num(alt.c4) : null;
    console.warn('[INV] initial stock over physical cap', { sloc:sloc, d:d, src:out.src,
                  got:Math.round(got), cap:Math.round(lim), alt:altGot === null ? null : Math.round(altGot),
                  lot:cap.lot });
    if(alt && alt.ok && altGot <= lim + tol){
      alt.cappedFrom = Math.round(got);
      alt.cappedSrc  = out.src;
      alt.txt = (alt.txt || 'the SAP End Stock')
              + ' (the app first worked out ' + Math.round(got).toLocaleString('en-US')
              + ' kg by also adding the filled quantity of ' + (out.lots || []).join(', ')
              + ', but lot ' + cap.lot + ' finished with only '
              + Math.round(cap.endKg).toLocaleString('en-US') + ' kg in the tank and '
              + Math.round(cap.soldKg).toLocaleString('en-US')
              + ' kg has been loaded out since, so that batch is already inside the SAP figure)';
      return alt;
    }
    return { ok:false, overCap:true, src:'none', c3:0, c4:0, wt:null, lot:'', lots:[],
             why:'over-cap',
             txt:'the app worked out ' + Math.round(got).toLocaleString('en-US') + ' kg from '
               + (out.txt || out.src)
               + (altGot === null ? '' : (', and ' + Math.round(altGot).toLocaleString('en-US')
                   + ' kg from the SAP End Stock alone'))
               + ', but lot ' + cap.lot + ' finished with '
               + Math.round(cap.endKg).toLocaleString('en-US') + ' kg in the tank and '
               + Math.round(cap.soldKg).toLocaleString('en-US') + ' kg has been loaded out since, '
               + 'so the tank cannot be holding more than ' + Math.round(lim).toLocaleString('en-US')
               + ' kg — neither figure is possible, so nothing was filled in. Type it by hand.' };
  }
  /* Danh sách lot để TICK ở tab Stock. q = chuỗi tìm kiếm (rỗng ⇒ 8 mẻ
     gần nhất). Mỗi dòng nói rõ app tự quyết thế nào và người đã đè chưa. */
  /* v4.166 — MỘT DANH SÁCH DUY NHẤT cho cả hai loại mẻ:
       · mẻ xong TRƯỚC giờ mở cửa hôm nay  → cộng lên nền SAP (tồn đầu)
       · mẻ xong TRONG NGÀY hôm nay        → ghi thành dòng Cavern receipt
     Người tick / bỏ tick ở cùng một chỗ, không phải nhớ hai cơ chế. */
  function lotAddList(sloc, d, q){
    d = d || ds();
    const yest = _stxShift(d, -1);
    let sap = null;
    try{ sap = (typeof SP !== 'undefined' && SP.tankEnd) ? SP.tankEnd(sloc, yest) : null; }catch(_){}
    const hasSap = !!(sap && sap.has && (num(sap.c3) + num(sap.c4)) > 0);
    let sapAt = hasSap ? (+sap.lastAt || 0) : 0;
    if(hasSap && !sapAt){ const g = _dayAt(yest, STX_CLOSE_H); if(g) sapAt = g; }
    const SL = hasSap ? sapLotOf(sloc, yest, sapAt) : { lot:'', lotAt:0, confirmed:false };
    const conf = hasSap && SL.confirmed === true;
    const cut  = conf ? _stxLotKey(SL.lot) : 0;
    const OV = _lotSel(sloc, d);
    const openAt = _dayOpenAt(d), now = _nowMs();
    const qq = String(q || '').trim().toLowerCase();
    const all = _tankMixes(sloc).filter(m => m.at && m.at <= now);
    const pick = qq ? all.filter(m => String(m.lot||'').toLowerCase().indexOf(qq) >= 0)
                    : all.filter(m => m.at >= now - 30 * 86400000);
    return pick.slice().reverse().map(m=>{
      const k = _stxLotKey(m.lot);
      const today = m.at > openAt;              /* mẻ xong TRONG NGÀY hôm nay */
      const q3 = parseFloat(m.row[66]), q4 = parseFloat(m.row[67]);
      const hasCoq = isFinite(q3) && isFinite(q4);
      /* app tự quyết: mẻ trong ngày thì cộng ngay khi đã có COQ; mẻ cũ thì
         theo luật "SAP đã gồm lot này chưa". */
      const autoOn = today ? hasCoq : !_inSapBase(hasSap, SL, conf, cut, m);
      const ov = OV[k];
      return { lot:String(m.lot||''), key:k, at:m.at, when:_stxWhen(m.at),
               today:today, hasCoq:hasCoq,
               filled: hasCoq ? Math.round((q3 + q4) * 1000) : null,
               auto:autoOn, on:(ov === undefined ? autoOn : !!ov),
               ov:(ov === undefined ? null : !!ov) };
    });
  }
  /* val = true (cộng) | false (không cộng) | null (trả về cho app tự quyết) */
  function lotAddSet(sloc, lot, val, cb){
    const d = ds(), h = fb(), k = _stxLotKey(lot);
    if(!h || !k){ if(typeof cb === 'function') cb(false); return false; }
    const b = bucket(d, sloc);
    b.lotSel = b.lotSel || {};
    if(val === null) delete b.lotSel[k]; else b.lotSel[k] = !!val;
    const up = {};
    up['inv_daily/'+d+'/'+sloc+'/lotSel/'+k] = (val === null) ? null : !!val;
    /* ⭐ v4.170 — KHÔNG xoá gì trên Firebase nữa. Dòng cavern của app nay
       là số RAM (xem endStateFor): bỏ tick là lượt tính sau tự bỏ mẻ đó ra.
       Xoá dòng auto trên Firebase chỉ tổ đá nhau với máy chạy bản cũ — nó
       ghi lại ngay, thành vòng xoá/ghi vô tận. */
    up['inv_daily/'+d+'/'+sloc+'/_ver'] = _vts();
    delete _autoClr[d + '|' + sloc];      /* buộc tính lại tồn đầu ngay */
    h.ref().update(up)
      .then(()=>{ try{ _autoTick(); render(); }catch(_){}
                  if(typeof cb === 'function') cb(true); })
      .catch(e=>{ console.warn('[INV] lotAddSet', e);
                  toast('\u26a0 Could not save the batch selection', 'er');
                  if(typeof cb === 'function') cb(false); });
    return true;
  }
  function _pickLots(a){
    const L = (a && a.lots && a.lots.length) ? a.lots.slice()
            : (a && a.src === 'mix' && a.lot ? [a.lot] : []);
    return L;
  }
  function _pickSig(a){ return [a.src, _pickLots(a).join(','), Math.round(a.c3), Math.round(a.c4)].join('|'); }
  function _initSig(i){
    if(!i) return '';
    const lots = (i.autoLots != null) ? String(i.autoLots) : (i.autoSrc === 'mix' ? String(i.autoLot||'') : '');
    return [String(i.autoSrc||''), lots, Math.round(num(i.c3)), Math.round(num(i.c4))].join('|');
  }
  /* ⭐ v4.170 — GHI VÀO RAM, KHÔNG ĐỤNG FIREBASE (xem _userInit/_stripAuto).
     Số tồn đầu app tự suy được mọi máy tính lại từ SAP + Tank Log, nên
     không cần truyền đi. Bỏ luôn dấu chống-cộng-trùng /mixIn: trong mô
     hình RAM, tồn đầu và dòng cavern do CÙNG một lượt tính ra nên không
     thể cộng trùng nữa. */
  function _autoInitWrite(sloc, d, a, force, cb){
    const done = (ok, why) => { if(typeof cb === 'function'){ try{ cb(ok, why); }catch(_){} } return ok; };
    if(!a || !a.ok) return done(false, (a && a.why) || 'no-data');
    const bk = bucket(d, sloc);
    const had = bk.init;
    if(had && !had.auto && !force) return done(false, 'has-init');
    const ts = _vts();
    const wt = (a.wt !== null && a.wt > 0) ? Math.round(a.wt) : DEFAULT_WT;
    const lots = _pickLots(a);
    bk.init = { c3:a.c3, c4:a.c4, wtC3:wt, ts:ts, by:'app',
                auto:true, autoSrc:a.src, autoLot:a.lot || '', autoLots:lots.join(','),
                autoSapLot:a.sapLot || '', autoTxt:a.txt || '' };
    const what = a.src === 'mix'     ? 'the mix finish state' + (a.lot ? ' \u00b7 lot ' + a.lot : '')
               : a.src === 'sapfill' ? 'SAP End Stock + filled COQ of ' + lots.join(', ')
               :                       'SAP End Stock';
    /* Chỉ kêu khi NGƯỜI bấm \u21ba — vòng tự động chạy liên tục, kêu mỗi lượt là ồn. */
    if(typeof cb === 'function')
      toast('\u21ba Initial stock of ' + TKNAME[sloc] + ' taken from ' + what
          + ' \u2014 type over it if it is wrong', 'ok');
    try{ render(); }catch(_){}
    return done(true, 'ok');
  }

  /* v4.162 — XOÁ số tồn đầu mà chính app đã ghi, khi nó lộ ra là vượt trần
     vật lý. Thẻ tank trở về đúng trạng thái "No initial stock yet" sẵn có
     để nhân viên tự gõ. CHỈ xoá số của app (auto), không bao giờ đụng số
     người đã gõ tay. Mỗi ngày/bồn chỉ xoá một lần. */
  function _autoInitClear(sloc, d){
    const bk = bucket(d, sloc);
    if(!bk.init || !bk.init.auto) return false;
    const k = d + '|' + sloc;
    if(_autoClr[k]) return false;
    _autoClr[k] = 1;
    bk.init = null;                       /* v4.170 — RAM, không xoá gì trên Firebase */
    toast('\u26a0 ' + (TKNAME[sloc] || sloc) + ': the app could not work out a valid opening '
        + 'stock \u2014 the field was left empty, type it in by hand', 'er');
    try{ render(); }catch(_){}
    return true;
  }
  function _autoInitTick(){
    if(!_canAuto() || !_autoReady()) return;
    const d = ds();
    ['2100','2101'].forEach(sl=>{
      const k = d + '|' + sl;
      if(!_fbSeen[sl]) return;              /* chưa nghe Firebase ⇒ chưa biết có số hay chưa */
      const cur = bucket(d, sl).init;
      if(cur && !cur.auto){ _autoInitDone[k] = 'has-init'; return; }
      let a = null;
      try{ a = _autoInitPick(sl, d); }catch(e){ console.warn('[INV] autoInitPick', e); return; }
      if(!a || !a.ok){
        /* v4.162 — số app từng ghi nay lộ ra là vượt trần vật lý ⇒ xoá đi,
           để trống cho nhân viên tự gõ (xem _physCap). */
        if(a && a.overCap && cur && cur.auto) _autoInitClear(sl, d);
        return;                             /* thiếu dữ liệu ⇒ thử lại ở lần sau */
      }
      /* v4.170 — ghi vào RAM nên rẻ và không đẻ ra sự kiện; chỉ cần tránh
         vẽ lại vô ích khi số không đổi. KHÔNG còn cần dấu _autoSig (nó vốn
         sinh ra để đỡ ghi Firebase lặp — nay chẳng ghi gì nữa). */
      if(cur && _initSig(cur) === _pickSig(a)) return;
      _autoInitDone[k] = a.src;
      _autoInitWrite(sl, d, a, true);
    });
  }
  let _ticking = false;
  function _autoTick(){
    if(_ticking) return;
    _ticking = true;
    try{
      try{ _rebindIfRolled(); }catch(_){}
      try{ _autoInitTick(); }catch(e){ console.warn('[INV] autoInitTick', e); }
    } finally { _ticking = false; }
  }
  /* Nút ↺ trên bảng: lấy lại số của app và ĐÈ lên số đang có. */
  function autoInitApply(sloc, cb){
    const d = ds();
    let a = null;
    try{ a = _autoInitPick(sloc, d); }catch(_){}
    if(!a || !a.ok){
      toast('⚠ The app has nothing to take — ' + ((a && a.txt) || 'no data'), 'warn');
      if(typeof cb === 'function') cb(false, 'no-data');
      return false;
    }
    _autoInitDone[d + '|' + sloc] = a.src;
    return _autoInitWrite(sloc, d, a, true, cb);
  }
  /* Bảng hỏi: số tồn đầu đang hiện là của AI — app hay người. */
  function initInfoFor(sloc, d){
    const i = bucket(d || ds(), sloc).init;
    if(!i) return { has:false, auto:false, src:'', lot:'', lots:[], sapLot:'', txt:'', by:'', ts:0 };
    return { has:true, auto:!!i.auto, src:String(i.autoSrc||''), lot:String(i.autoLot||''),
             lots:_splitLots(i.autoLots != null ? i.autoLots : (i.autoSrc === 'mix' ? i.autoLot : '')),
             sapLot:String(i.autoSapLot||''),
             txt:String(i.autoTxt||''), by:String(i.by||''), ts:+i.ts || 0,
             c3:num(i.c3), c4:num(i.c4), wt:num(i.wtC3) };
  }
  /* Dấu chống cộng trùng của MỘT lot trong NGÀY đó. */
  function mixInGet(sloc, lot, d){
    const m = bucket(d || ds(), sloc).mixIn || {};
    const k = _mixKey(lot);
    if(m[k]) return m[k];
    let hit = null;
    Object.keys(m).forEach(kk=>{
      if(hit) return;
      const e = m[kk]; if(!e) return;
      if(_stxLotMatch(e.lot || kk, lot)) hit = e;
    });
    return hit;
  }

  /* ══ v4.152 — P4 · ✅ CỘNG LUÔN SỐ CAVERN ĐƯA LÊN BỒN ════════════════
     ✅ nghĩa là "tôi đã chuyển kho trên WMS". Đúng lúc đó lượng C3/C4 từ
     hầm 1100 đã nằm trong ball tank thật rồi, nên tồn của bồn phải tăng
     ngay — trước đây phải vào Tank Console gõ tay lại đúng con số mà app
     vừa tính xong ở Recon.
     SỐ LẤY LÀ "Adjusted qty for WMS ST" (tồn cuối thực tế − WMS initial),
     ĐÚNG như tồn đầu tự động lấy từ SAP: nền SAP + số đã điều chỉnh =
     tồn cuối thực tế. Chưa có WMS initial thì lùi về Filled ◈COQ để tồn
     vẫn đúng vật lý, và nói rõ trong note.
     BA CHỐT CHỐNG TRÙNG:
       ① lot đã cuộn vào tồn đầu (mixIn.via='init')  ⇒ KHÔNG cộng nữa
       ② khoá dòng cố định 'mix_<lot>'               ⇒ bấm ✅ hai lần chỉ
          ghi đè chính nó, không bao giờ đẻ dòng thứ hai
       ③ dòng đã bị sửa tay (auto không còn)         ⇒ giữ số của người */
  /* ══ ⭐⭐⭐ v4.170 — MẺ XONG TRONG NGÀY: TỒN ĐI THEO **END CỦA TANK LOG** ══
     ────────────────────────────────────────────────────────────────────
     > User: "sau khi đã có kết quả COQ thì lấy cái số liệu end stock của
     > lot đó làm live stock, để thực hiện trừ lùi các xe đã bán từ lot mới
     > này và tiếp tục trừ khi có xe được bán từ nó."

         live stock = END(lot) − hàng đã bán TỪ lot đó − xe đang nạp

     END là số ĐO THẬT (INIT/FINAL VOL × nền COQ) nên nó là MỐC; sổ sách
     (tồn đầu + cavern − đã bán) chỉ là đường đi tới đó. Trước v4.170 app
     cộng `Filled ◈COQ` lên nền sổ sách, mà nền đó có thể đã lệch (ca 18/09
     lệch 12.441 kg: gót đo được 15.683 vs sổ 28.124) ⇒ tồn sai mà không ai
     biết. Nay không cộng gì lên nền nữa, đi thẳng từ END.

     "Bán TỪ lot đó" tra **cột Lot của TL Data** — user: "tra TL data là sẽ
     biết thằng nào bán từ 417". Xe đang trên bàn cân chưa có dòng TL nên
     trừ riêng ở `compute()` (biến `stn`).

     ⚠⚠ TOÀN BỘ PHÉP NÀY CHẠY TRONG **RAM**, KHÔNG GHI MỘT CHỮ NÀO LÊN
     FIREBASE. Mọi máy có cùng Tank Log + TL Data nên tự tính ra cùng con
     số — truyền đi chỉ tổ đẻ ra tranh chấp (sự cố 18/09). Dòng cavern hiện
     trên Tank Console là số RAM suy ra cho khớp cột, không phải bản ghi.

     Điều kiện áp dụng (thiếu một là quay về sổ sách như cũ):
       ① mẻ mới nhất của bồn, FINISH trong ngày hôm nay
       ② đã có **kết quả COQ** (Filled C3/C4 ◈COQ) — đúng câu user chốt
       ③ đã đo được trạng thái cuối (END)
       ④ người KHÔNG bỏ tick mẻ đó ở Tank Console */
  function _soldOfLot(sloc, d, lot){
    const out = { c3:0, c4:0, rows:0 };
    if(typeof TL==='undefined' || !TL.ROWS) return out;
    const want = _lotTail(lot);
    if(want === null) return out;
    const suffix = sloc==='2100' ? '3501' : '3502';
    const dmy = todayDMY();
    const pctC3 = _bucketWt(bucket(d, sloc)) / 100;
    Object.values(TL.ROWS).forEach(r=>{
      if(!r || r.disabled || !r.date) return;
      if(r.date !== dmy) return;
      if(typeof isPureType==='function' && isPureType(r.type)) return;
      if(!String(r.ltank||'').toUpperCase().includes(suffix)) return;
      if(_lotTail(r.lot) !== want) return;
      let rc3 = num(r.c3Kg || r.stC3), rc4 = num(r.c4Kg || r.stC4);
      const lpg = num(r.lpgQty), sum = rc3 + rc4;
      if(lpg>0 && sum>0 && sum < lpg/100){ rc3*=1000; rc4*=1000; }
      if(rc3>0 || rc4>0){ out.c3 += rc3; out.c4 += rc4; }
      else if(lpg>0){ out.c3 += lpg*pctC3; out.c4 += lpg*(1-pctC3); }
      out.rows++;
    });
    return out;
  }
  /* Số đuôi của mã lot: "LPG-2026-417" → 417 · "417" → 417 · rỗng → null.
     Cột Lot của TL Data chỉ ghi số đuôi nên mọi so khớp đi qua đây. */
  function _lotTail(v){
    const m = String(v == null ? '' : v).match(/(\d+)\s*$/);
    if(!m) return null;
    const n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  }
  /* Trả { lot, endC3, endC4, soldC3, soldC4, rows } hoặc null. THUẦN TÍNH. */
  function endStateFor(sloc, d){
    d = d || ds();
    try{
      if(!TKNAME[sloc]) return null;
      const openAt = _dayOpenAt(d), now = _nowMs();
      const M = _tankMixes(sloc).filter(m => m.at && m.at > openAt && m.at <= now);
      if(!M.length) return null;
      const m = M[M.length - 1];                         /* ① mẻ mới nhất trong ngày */
      if(_lotSel(sloc, d)[_stxLotKey(m.lot)] === false) return null;   /* ④ người bỏ tick */
      const F = _stxFigures(sloc, m.lot);
      if(!F || !F.ok) return null;                        /* ③ chưa đo được END */
      if(!F.ctx || F.ctx.coqC3 === null || F.ctx.coqC4 === null) return null;  /* ② chưa có COQ */
      if(F.aClC3 === null || F.aClC4 === null) return null;
      const sold = _soldOfLot(sloc, d, m.lot);
      return { lot:m.lot, at:m.at, endC3:F.aClC3, endC4:F.aClC4,
               soldC3:sold.c3, soldC4:sold.c4, rows:sold.rows,
               c3:F.aClC3 - sold.c3, c4:F.aClC4 - sold.c4 };
    }catch(e){ console.warn('[INV] endStateFor', e); return null; }
  }

  /* ══ v4.111 — 💾 LƯU KẾT QUẢ ĐỐI CHIẾU VÀO TANK LOG ══════════════════
     Ghi 4 ô [69]–[72] của ĐÚNG dòng lot đang xét. Chỉ ghi khi đã có đủ
     tồn đầu hệ thống — không có số thì không đoán, và nói rõ vì sao.
     Dùng chung cho nút 💾 của bảng và cho ✅ ở ô thông báo Tank Mix. */
  function _stxSaveCore(sloc, lot, opt){
    const o = opt || {};
    const done = (ok, why) => { if(typeof o.cb === 'function'){ try{ o.cb(ok, why); }catch(_){} } return ok; };
    const F = _stxFigures(sloc, lot);
    if(!F.ok){
      if(!o.quiet) toast(F.why === 'no-row'
        ? '❌ No Tank Log row for lot ' + (F.lot || '—') + ' — nothing to save'
        : '❌ Lot ' + (F.lot || '—') + ' has no COQ basis yet (' + F.miss + ') — nothing to save', 'er');
      return done(false, F.why);
    }
    if(!F.hasSys){
      /* v4.152 — KHÔNG có WMS initial thì không tính được gap/adjusted, nhưng
         lượng từ hầm ĐÃ nằm trong bồn thật rồi: vẫn cộng tồn theo Filled ◈COQ,
         chỉ không ghi đối chiếu. Để tồn sai mới là hỏng, không phải để trống. */
      if(!o.quiet) toast('⚠ Enter the WMS initial stock first — the gap and the adjusted transfer '
                       + 'cannot be computed without it (the stock was still updated)', 'warn');
      return done(false, 'no-system-opening');
    }
    if(typeof canWrite === 'function' && !canWrite('eng_tkmix')){
      if(!o.quiet) toast('❌ No permission to write to the Tank Log', 'er');
      return done(false, 'no-permission');
    }
    if(typeof ENG === 'undefined' || !ENG.setStxRecon){
      if(!o.quiet) toast('❌ Tank Log module not ready — wait a few seconds and press 💾 again', 'er');
      return done(false, 'eng-not-ready');
    }
    ENG.setStxRecon(F.lot, F.tank,
      /* v4.131 — lưu LUÔN tồn đầu hệ thống đã dùng làm nền, để sau này
         mở Tank Log ra là dựng lại được cả phép tính chứ không phải suy
         ngược từ gap. */
      { wms3:F.sysC3, wms4:F.sysC4, gap3:F.gapC3, gap4:F.gapC4, adj3:F.xC3, adj4:F.xC4 },
      (ok, why)=>{
        /* ══ v4.113 — LƯU XONG THÌ BỎ BẢN NHÁP ═══════════════════════
           Tank Log mới là nơi lưu chính thức. Giữ lại bản nháp vừa thừa
           vừa nguy hiểm: lần sau mở lên nó đè số SAP bằng con số cũ mà
           không ai nhớ vì sao. Chỉ xoá khi ghi THÀNH CÔNG — thất bại thì
           GIỮ nguyên để nhân viên bấm 💾 lại, không mất công gõ. */
        if(ok){ try{ _stxDrop(F.sloc, F.lot); }catch(_){} }
        /* v4.152 — P4: ghi xong đối chiếu thì cộng luôn số cavern vào tồn bồn. */
        if(!o.quiet){
          if(ok) toast('💾 Saved to the Tank Log · lot ' + F.lot + ' (' + F.tank + ') — gap '
                     + Math.round(F.gapC3).toLocaleString('en-US') + ' / '
                     + Math.round(F.gapC4).toLocaleString('en-US') + ' · transfer '
                     + Math.round(F.xC3).toLocaleString('en-US') + ' / '
                     + Math.round(F.xC4).toLocaleString('en-US') + ' kg', 'ok');
          else toast(why === 'notfound'
                 ? '❌ Lot ' + F.lot + ' (' + F.tank + ') was not found in the Tank Log — nothing was saved'
                 : '❌ Could not save to the Tank Log (' + why + ') — please try again', 'er');
        }
        _stxSyncViews(false);
        done(ok, why);
      });
    return true;
  }
  function stxSave(sloc){ return _stxSaveCore(sloc, null, {}); }
  /* Cho MIXNOTIFY: biết sẵn tên bồn + lot của chính thông báo đang xử lý. */
  function stxSaveFor(tkName, lot, cb, quiet){
    const sloc = stxSlocOf(tkName);
    if(!sloc){ if(typeof cb === 'function') cb(false, 'unknown-tank'); return false; }
    return _stxSaveCore(sloc, lot, { cb:cb, quiet:!!quiet });
  }

  function _esc2(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                               .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Đầu mỗi vùng: tên bồn · LOT ĐANG TÍNH · nguồn lot · giờ finish · thông báo đang treo */
  function _stxHead(ctx, F){
    const sloc = ctx.sloc;
    const meta = document.getElementById('stxMeta'+sloc);
    const badge = document.getElementById('stxLotSrc'+sloc);
    /* ── v4.111 — LOT ĐANG TÍNH ĐỨNG NGAY CẠNH TÊN BỒN ────────────────
       Ô nhập LOT để trống (placeholder "auto") suốt phần lớn thời gian vì
       lot được lấy tự động, nên nhìn vào bảng KHÔNG biết con số đang là
       của mẻ nào. Chip này in thẳng lot đang tính lên cùng hàng với
       TK-3501 / TK-3502 — nhìn một cái là biết kết quả bên dưới thuộc lot
       nào, đúng chỗ dễ nhận biết nhất. */
    const now = document.getElementById('stxLotNow'+sloc);
    if(now){
      const hasLot = !!(ctx.lot && String(ctx.lot).trim());
      now.innerHTML = hasLot
        ? '<span class="k">LOT</span><b>'+_esc2(ctx.lot)+'</b>'
        : '<span class="k">LOT</span><b class="none">— none —</b>';
      now.className = 'stx-lotnow' + (hasLot ? '' : ' empty')
                    + (F && F.ok === false && F.why ? ' warn' : '');
      now.title = hasLot
        ? ('Every figure in this pane belongs to lot ' + ctx.lot
           + (ctx.lotSrcTxt ? ' — taken from the ' + ctx.lotSrcTxt : '')
           + '. Type another lot in the box on the right to switch.')
        : 'No lot could be resolved for this tank — type one in the box on the right.';
    }
    if(badge){
      const map = { notify:'from mix notification', scale:'from tank card', latest:'latest lot',
                    typed:'typed in', given:'from the notification', none:'no lot' };
      badge.textContent = map[ctx.lotSrc] || '';
      badge.className = 'stx-lotsrc s-'+ctx.lotSrc;
      badge.title = ctx.lotSrcTxt ? ('Lot taken from the '+ctx.lotSrcTxt+' — type another lot to override.') : '';
    }
    if(!meta) return;
    if(!ctx.row){ meta.innerHTML = '<span class="w">No Tank Log row for this lot</span>'; return; }
    const d = ctx.day || {};
    const s = ctx.split || {};
    let html = '';
    html += '<span class="k">FINISHED</span><b>'+(d.finishTxt || '—')+'</b>';
    html += '<span class="k">ON</span><b>'+(d.finishDate ? _stxDmy(d.finishDate) : '—')+'</b>';
    if(d.overnight) html += '<span class="tag ov">overnight</span>';
    html += '<span class="k">ρ COQ</span><b>'+(s.fDen ? (+s.fDen).toFixed(4) : '—')+'</b>'
          + '<span class="k">%wt C3</span><b>'+(s.fW3 != null ? (s.fW3*100).toFixed(2) : '—')+'</b>';
    html += '<span class="sub"><span class="k">INITIAL BASIS</span>ρ '
          + (s.iDen ? (+s.iDen).toFixed(4) : '—') + ' · '
          + (s.iW3 != null ? (s.iW3*100).toFixed(2)+' %wt C3' : '—')
          + (ctx.row[65] ? ' — '+_esc2(String(ctx.row[65])) : '') + '</span>';
    if(ctx.notify){
      const nC3 = ctx.notify.c3|0, nC4 = ctx.notify.c4|0;
      const coq3 = ctx.coqC3 !== null ? Math.round(ctx.coqC3*1000) : null;
      const coq4 = ctx.coqC4 !== null ? Math.round(ctx.coqC4*1000) : null;
      const differs = coq3 !== null && coq4 !== null
                    && (Math.abs(nC3-coq3) > 1 || Math.abs(nC4-coq4) > 1);
      html += '<span class="sub notify'+(differs?' differs':'')+'">'
            + '<span class="k">NOTIFIED TO CHECK BOOTH</span>'
            + 'lot '+_esc2(ctx.notify.lot)+' · C3 '+nC3.toLocaleString('en-US')
            + ' · C4 '+nC4.toLocaleString('en-US')+' kg'
            + (differs ? ' <b>⚠ differs from the COQ columns of this lot</b>' : '')
            + '</span>';
    }
    meta.innerHTML = html;
  }

  /* WMS initial: đổ số vào ô nhập + viết nhãn nguồn.
     Số ĐÃ được _stxFigures chốt sẵn (F.sysC3/F.sysC4/F.sysTag) — hàm này
     chỉ lo phần hiển thị, nên bảng và ô thông báo không thể nói khác nhau. */
  function _stxSysFill(sloc, ctx, F, refill){
    const e3 = document.getElementById('stxSys3'+sloc);
    const e4 = document.getElementById('stxSys4'+sloc);
    const note = document.getElementById('stxSrc'+sloc);
    const day = ctx && ctx.day;
    const sap = ctx && ctx.sap;
    const tag = (F && F.sysTag) || 'none';

    /* đổ số vào ô — chỉ khi được phép và khi CHUỖI khác, để không giật con trỏ */
    if(refill !== false){
      const put = (el, v)=>{
        if(!el) return;
        /* v4.114 — TUYỆT ĐỐI không ghi đè ô người ta ĐANG GÕ. Một lượt vẽ
           lại do máy khác đẩy về (hoặc do bản nháp vừa ghi xong) mà nhảy
           vào sửa ô đang gõ là con trỏ nhảy về cuối và mất chữ đang nhập. */
        try{
          if(_stxFocusKeep && _stxFocusKeep.id === el.id) return;
          if(typeof document !== 'undefined' && el === document.activeElement) return;
        }catch(_){}
        const want = (v === null || v === undefined) ? '' : String(Math.round(v));
        if(el.value !== want) el.value = want;
      };
      put(e3, F ? F.sysC3 : null);
      put(e4, F ? F.sysC4 : null);
    }

    /* nhãn nguồn — luôn nói rõ số này ở đâu ra, hoặc vì sao chưa có */
    let cls = 'na', txt = '';
    if(tag === 'manual'){
      cls = 'man';
      const man = ctx ? _stxManualOf(sloc, ctx.lot) : null;
      const who = man && man.by ? String(man.by) : '';
      const whn = man && man.ts ? _stxWhen(man.ts) : '';
      txt = '<b>Manual entry</b> — typed by ' + (who ? _esc2(who) : 'the operator')
          + (whn ? ' at ' + whn : '')
          + ' <button class="stx-mini" onclick="INV.stxSysReset(\'' + sloc + '\')" '
          + 'title="Discard the typed figures and reload from SAP">⟳ reload</button>'
          + (day && day.ok && sap && sap.has
              ? '<span class="why">SAP End Stock of '+_stxDmy(day.sapDate)+' was '
                + Math.round(sap.c3).toLocaleString('en-US')+' / '+Math.round(sap.c4).toLocaleString('en-US')
                + ' kg</span>' + _stxSapStamp(sap)
              : '')
          + '<span class="why">The same figure is shown on the Tank Mix notification — editing it in '
          + 'either place changes both.</span>'
          /* v4.150 — RAM-ONLY. Phải nói THẲNG là chưa lưu ở đâu cả, nếu không
             nhân viên tưởng số đã an toàn rồi bỏ đi (v4.113 từng giữ hộ trên
             Firebase, user đã yêu cầu bỏ). */
          + '<span class="why">Kept on this machine only until you press Save — it is not stored anywhere '
          + 'yet. Press Save (or ✅ on the Tank Mix notification) to write it onto the lot in the Tank Log.</span>';
    } else if(tag === 'none'){
      cls = 'na'; txt = 'No lot selected.';
    } else if(tag === 'sap'){
      cls = 'sap';
      txt = '<b>SAP End Stock of '+_stxDmy(day.sapDate)+'</b>'
          + (sap.batches.length ? ' · batch '+sap.batches.join('+') : '')
          + ' · '+sap.rows+' row'+(sap.rows>1?'s':'')
          + '<span class="why">'+_esc2(day.why)+'</span>'
          + _stxSapStamp(sap);
    } else if(tag === 'sap-missing'){
      cls = 'miss';
      let have = [];
      try{ have = (typeof SP !== 'undefined' && SP.tankEndDates) ? SP.tankEndDates(sloc) : []; }catch(_){}
      const newest = have.length ? have[have.length-1] : '';
      txt = '<b>SAP End Stock of '+_stxDmy(day.sapDate)+' is not loaded</b> — paste that day into the '
          + 'SAP tab, or type the figures here.<span class="why">'+_esc2(day.why)+'</span>'
          + (newest ? '<span class="stamp">Latest SAP day loaded for this tank: '+_stxDmy(newest)
                      + ' — do NOT use it as the initial balance for this lot</span>' : '');
    } else {
      cls = 'need';
      txt = '<b>Enter it manually</b> — '+_esc2((day && day.why) || 'no finish time on the row')+'.';
    }
    if(note){ note.className = 'stx-src s-'+cls; note.innerHTML = txt; }
    return { c3:F ? F.sysC3 : null, c4:F ? F.sysC4 : null, tag:tag,
             label:({ sap:'SAP End Stock', manual:'manual entry', 'sap-missing':'not available',
                      'manual-required':'manual entry required', none:'—' })[tag] || '' };
  }

  /* ── Ô nhập WMS initial: GỬI VỀ KHO TRƯỚC, dựng bảng SAU ───────────
     Hai ô này được CHUYỂN vào trong bảng để hiện đúng chỗ. Nhưng mỗi lượt
     vẽ lại đều ghi đè `body.innerHTML`, mà lúc đó ô đang NẰM TRONG body ⇒
     ô bị huỷ, người dùng gõ một chữ số là mất ô và mất luôn con trỏ.
     Vì thế: _stxPark() kéo ô về lại kho ẩn TRƯỚC khi đụng innerHTML, rồi
     _stxMountInputs() mới gắn lại vào ô mới. Cùng một element sống suốt
     phiên nên giá trị đang gõ và vị trí con trỏ không bao giờ mất. */
  /* v4.114 — ô nhập nào đang được gõ, và con trỏ ở đâu. Phải chụp TRƯỚC
     khi _stxPark() chuyển ô đi (chuyển là mất focus ngay lúc đó, chụp sau
     là đã muộn). Giữ ở mức module vì một lượt renderStx đi qua cả hai bồn. */
  let _stxFocusKeep = null;
  function _stxSnapFocus(){
    try{
      const act = document.activeElement;
      /* v4.128 — nhận cả ba ô batch D (stxBd3 / stxBd4 / stxBdW) */
      if(act && act.id && /^(stxSys[34]|stxBd[34W])/.test(act.id)){
        const k = { id:act.id, ss:null, se:null };
        try{ k.ss = act.selectionStart; k.se = act.selectionEnd; }catch(_){}
        return k;
      }
    }catch(_){}
    return null;
  }
  function _stxPark(sloc){
    const pool = document.querySelector('.stx-inp-pool');
    if(!pool) return;
    ['3','4'].forEach(k=>{
      const inp = document.getElementById('stxSys'+k+sloc);
      if(inp && inp.parentNode !== pool) pool.appendChild(inp);
    });
  }
  function _stxMountInputs(sloc, body){
    ['3','4'].forEach(k=>{
      const slot = body.querySelector('.stx-inp-slot[data-for="stxSys'+k+sloc+'"]');
      const inp  = document.getElementById('stxSys'+k+sloc);
      if(slot && inp) slot.appendChild(inp);
    });
    _stxRestoreFocus(sloc);
  }
  /* v4.114 — LƯỚI AN TOÀN: đường gõ đã không đi qua renderStx nữa, nhưng
     một lượt vẽ ĐẦY ĐỦ (máy khác đẩy về, bản nháp vừa nạp…) vẫn có thể rơi
     đúng lúc nhân viên đang gõ. Trả lại focus + con trỏ cho đúng ô.
     v4.128 — tách ra dùng chung cho cả ô WMS initial lẫn ô batch D. */
  function _stxRestoreFocus(sloc){
    const keep = _stxFocusKeep;
    if(!keep || keep.id.slice(-4) !== String(sloc)) return;
    const el = document.getElementById(keep.id);
    if(!el) return;
    try{ el.focus(); }catch(_){}
    try{ if(keep.ss !== null && keep.ss !== undefined) el.setSelectionRange(keep.ss, keep.se); }catch(_){}
  }

  function copyStx(){
    if(!_stxTSV){ toast('Nothing to copy yet','er'); return; }
    try{ navigator.clipboard.writeText(_stxTSV); toast('✓ Reconciliation copied','ok'); }
    catch(_){ toast('Copy failed','er'); }
  }


  /* ══════════════════════════════════════════════════════════════════════
     v4.117 — 🔍 WMS STOCK CHECK  (nút 🔍 trên thẻ tank → INV.openWms)
     ----------------------------------------------------------------------
     KHÁC HẲN bảng 📏 (⚖ Stock-transfer reconciliation):
       • 📏 nhìn về QUÁ KHỨ: đối chiếu MỘT MẺ đã trộn (INIT/FINAL VOL của
         dòng Tank Log) để ra số chuyển kho đã điều chỉnh cho mẻ đó.
       • 🔍 nhìn vào HIỆN TẠI: nhân viên vừa đo bồn xong, cầm con số m³
         thực tế và con số C3/C4 WMS đang hiện, hỏi "WMS đang lệch bao
         nhiêu và phải chuyển kho đi đâu cho khớp?".
     Vì thế lot mặc định ở đây là LOT MỚI NHẤT của bồn (thứ đang nằm trong
     bồn), KHÔNG phải lot của thông báo trộn đang treo — nhưng vẫn cho gõ
     lot khác khi cần.

     CÔNG THỨC
       Actual LPG (kg) = volume (m³) × ρ COQ (kg/L) × 1000
       Actual C3       = Actual LPG × %wt C3        ·  C4 = LPG − C3
       Difference      = Actual − WMS   (mỗi loại tính riêng)

     CHIỀU CHUYỂN KHO — chỗ dễ làm sai nhất, nên bảng viết hẳn thành câu:
       Difference ÂM  (WMS đang CAO hơn thực tế) ⇒ phải GIẢM WMS
                      ⇒ chuyển kho TỪ BỒN VỀ HẦM:  2100/2101 ➜ 1100
       Difference DƯƠNG (WMS đang THẤP hơn thực tế) ⇒ phải TĂNG WMS
                      ⇒ chuyển kho TỪ HẦM LÊN BỒN:  1100 ➜ 2100/2101
     Số lượng LUÔN in ra dạng DƯƠNG (số gõ vào SAP không bao giờ âm), chiều
     nằm ở câu chữ và ở mũi tên SLoc, không bắt người đọc tự suy từ dấu.

     KHÔNG lưu gì cả: không Firebase, không Tank Log — đây là phép đo tại
     chỗ, chốt số xong là gõ thẳng vào WMS. Nhưng số gõ được GIỮ TRONG RAM
     suốt phiên (đóng bảng đi làm việc khác, mở lại vẫn còn), theo yêu cầu
     của người dùng.
     ══════════════════════════════════════════════════════════════════════ */
  const _WMS_SLOCS  = ['2100','2101'];
  const _WMS_CAVERN = '1100';
  const _WMS_TOL    = 1;          /* kg — dưới 1 kg coi như khớp */
  /* Giữ NGUYÊN CHUỖI người dùng gõ (không ép về số) để mở lại thấy đúng
     những gì mình đã nhập, kể cả "20,000" hay "12.3 " đang gõ dở. */
  const _wmsIn = {
    '2100':{ lot:'', vol:'', c3:'', c4:'', den:'', w3:'' },
    '2101':{ lot:'', vol:'', c3:'', c4:'', den:'', w3:'' }
  };
  const _WMS_FLD = ['lot','vol','c3','c4','den','w3'];
  const _wmsElId = (f, sloc) => 'wmsx' + f.charAt(0).toUpperCase() + f.slice(1) + sloc;

  function _wmsW3(v){
    if(v === '' || v === null || v === undefined) return null;
    try{ if(typeof ENG !== 'undefined' && ENG.parseW3) return ENG.parseW3(v); }catch(_){}
    const x = _stxN(v);
    return (x === null || x <= 0) ? null : (x > 1.5 ? x/100 : x);
  }
  /* Lot đang xét: gõ tay đè, không thì LOT MỚI NHẤT của chính bồn đó. */
  function _wmsPickLot(sloc){
    const typed = String((_wmsIn[sloc]||{}).lot || '').trim();
    if(typed){
      const row = _stxFindRow(sloc, typed);
      return { lot: row ? String(row[1]||'').trim() : typed, row:row,
               src:'typed', srcTxt:'typed in' };
    }
    const want = _STX_TKNUM[sloc];
    let best = null;
    _stxRows().forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      if(!best || _stxLotKey(r[1]) > _stxLotKey(best[1])) best = r;
    });
    return best ? { lot:String(best[1]||'').trim(), row:best, src:'latest',
                    srcTxt:'the latest lot of this tank in the Tank Log' }
                : { lot:'', row:null, src:'none', srcTxt:'' };
  }
  /* Lot đang ghi trên thẻ tank của tab Scale — chỉ dùng để CẢNH BÁO khi nó
     khác lot mới nhất, không tự ý lấy thay. */
  function _wmsCardLot(sloc){
    try{
      const cfg = (typeof SCALE !== 'undefined' && SCALE.getTkCfg) ? SCALE.getTkCfg() : null;
      const t = cfg ? (sloc === '2100' ? cfg.tk1 : cfg.tk2) : null;
      return t ? String(t.lot || '').trim() : '';
    }catch(_){ return ''; }
  }

  /* Lot GẦN NHẤT của bồn này mà ĐÃ có nền COQ — chỉ dùng để MÁCH NƯỚC khi
     lot mới nhất chưa có kết quả COQ. TUYỆT ĐỐI không tự lấy thay: sản phẩm
     trong bồn là của mẻ mới, mượn ρ của mẻ cũ là ra số sai mà không ai biết. */
  function _wmsLastBasis(sloc, exceptLot){
    const want = _STX_TKNUM[sloc];
    let best = null;
    _stxRows().forEach(r=>{
      if(!r || String(r[2]||'').replace(/\D/g,'') !== want) return;
      if(exceptLot && _stxLotMatch(r[1], exceptLot)) return;
      const den = parseFloat(r[33]);
      const w3  = _wmsW3(r[45]);
      if(!(den > 0) || w3 === null) return;
      if(!best || _stxLotKey(r[1]) > _stxLotKey(best.lot))
        best = { lot:String(r[1]||'').trim(), den:den, w3:w3 };
    });
    return best;
  }

  /* ── HÀM TÍNH DUY NHẤT — thuần tính, không đụng DOM, đơn vị KG ──
     ok=false ⇒ `miss` liệt kê đích danh thứ còn thiếu, không đoán, không in 0. */
  function _wmsFigures(sloc){
    const inp  = _wmsIn[sloc] || {};
    const pick = _wmsPickLot(sloc);
    const row  = pick.row;
    let split = null;
    try{ split = (row && typeof ENG !== 'undefined' && ENG.actualSplit) ? ENG.actualSplit(row) : null; }catch(_){}
    /* Nền COQ của LÔ HÀNG ĐANG NẰM TRONG BỒN = nền CUỐI mẻ ([33] ρ, [45] %wt C3). */
    const lotDen = (split && split.fDen > 0)   ? split.fDen : null;
    const lotW3  = (split && split.fW3 != null) ? split.fW3  : null;
    const ovDen  = _stxN(inp.den);
    const ovW3   = _wmsW3(inp.w3);
    const F = {
      sloc:sloc, tank:TKNAME[sloc] || sloc, cavern:_WMS_CAVERN,
      lot:pick.lot, lotSrc:pick.src, lotSrcTxt:pick.srcTxt, row:row, split:split,
      cardLot:_wmsCardLot(sloc),
      den:(ovDen !== null && ovDen > 0) ? ovDen : lotDen,
      w3 :(ovW3  !== null) ? ovW3 : lotW3,
      denSrc:(ovDen !== null && ovDen > 0) ? 'typed' : (lotDen !== null ? 'lot' : 'none'),
      w3Src :(ovW3  !== null) ? 'typed' : (lotW3  !== null ? 'lot' : 'none'),
      lotDen:lotDen, lotW3:lotW3,
      vol:_stxN(inp.vol),
      wmsC3:_stxN(inp.c3), wmsC4:_stxN(inp.c4),
      hasWms:false, ok:false, miss:[],
      aC3:null, aC4:null, aL:null, wL:null, dC3:null, dC4:null, dL:null
    };
    F.hasWms = (F.wmsC3 !== null && F.wmsC4 !== null);
    if(F.hasWms) F.wL = F.wmsC3 + F.wmsC4;
    if(F.vol === null)  F.miss.push('actual tank volume (m³)');
    else if(F.vol < 0)  F.miss.push('a volume that is not negative');
    if(!(F.den > 0))    F.miss.push('COQ density (kg/L)');
    if(F.w3 === null)   F.miss.push('%wt C3');
    if(F.miss.length) return F;
    F.aL  = F.vol * F.den * 1000;      /* m³ × kg/L = tấn ⇒ ×1000 ra kg */
    F.aC3 = F.aL * F.w3;
    F.aC4 = F.aL - F.aC3;
    F.ok  = true;
    if(F.hasWms){
      F.dC3 = F.aC3 - F.wmsC3;
      F.dC4 = F.aC4 - F.wmsC4;
      F.dL  = F.dC3 + F.dC4;
    }
    return F;
  }

  /* ── CÂU LỆNH CHUYỂN KHO ──────────────────────────────────────────────
     Tách riêng và thuần chuỗi để test khoá được đúng CHIỀU. Người dùng
     đọc câu này rồi gõ thẳng vào WMS, nên nó phải nói đủ: tăng hay giảm,
     đi từ SLoc nào sang SLoc nào, bao nhiêu kg, và làm vậy thì WMS đổi
     theo hướng nào. Không dùng dấu +/− thay cho câu chữ. */
  function _wmsAction(mat, sloc, diff){
    const tank = TKNAME[sloc] || sloc;
    const kg = v => Math.round(Math.abs(v)).toLocaleString('en-US');
    if(diff === null || diff === undefined || !isFinite(diff))
      return { dir:'na', qty:null, head:'', txt:'' };
    if(Math.abs(diff) < _WMS_TOL)
      return { dir:'ok', qty:0,
        head: mat + ' — WMS already matches, post nothing',
        txt : 'The WMS figure and the actual stock differ by less than 1 kg. Do not post any '
            + mat + ' stock transfer for ' + tank + '.' };
    if(diff < 0)
      return { dir:'down', qty:Math.round(-diff),
        head: mat + ' — WMS is TOO HIGH by ' + kg(diff) + ' kg → bring it DOWN',
        txt : 'Post a stock transfer of ' + kg(diff) + ' kg of ' + mat
            + ' OUT of the tank and INTO the cavern: ' + tank + ' (SLoc ' + sloc
            + ')  ➜  Cavern (SLoc ' + _WMS_CAVERN + '). '
            + 'That takes ' + kg(diff) + ' kg off ' + tank + ' in WMS and puts it back in the cavern, '
            + 'so the WMS figure for ' + tank + ' drops onto the measured stock.' };
    return { dir:'up', qty:Math.round(diff),
      head: mat + ' — WMS is TOO LOW by ' + kg(diff) + ' kg → bring it UP',
      txt : 'Post a stock transfer of ' + kg(diff) + ' kg of ' + mat
          + ' OUT of the cavern and INTO the tank: Cavern (SLoc ' + _WMS_CAVERN
          + ')  ➜  ' + tank + ' (SLoc ' + sloc + '). '
          + 'That adds ' + kg(diff) + ' kg onto ' + tank + ' in WMS, '
          + 'so the WMS figure for ' + tank + ' rises onto the measured stock.' };
  }

  /* ---------- render ---------- */
  function _wmsActHtml(F, mat, diff){
    const a = _wmsAction(mat, F.sloc, diff);
    if(a.dir === 'na') return '';
    return '<div class="wmsx-act d-'+a.dir+'">'
      + '<div class="hd">'+_esc2(a.head)+'</div>'
      + '<div class="tx">'+_esc2(a.txt)+'</div>'
      + (a.dir === 'ok' ? '' :
          '<div class="mv"><span class="from">'+_esc2(a.dir === 'down' ? F.tank+' · SLoc '+F.sloc
                                                                      : 'Cavern · SLoc '+_WMS_CAVERN)+'</span>'
        + '<span class="ar">➜</span>'
        + '<span class="to">'+_esc2(a.dir === 'down' ? 'Cavern · SLoc '+_WMS_CAVERN
                                                     : F.tank+' · SLoc '+F.sloc)+'</span>'
        + '<span class="q">'+a.qty.toLocaleString('en-US')+' kg '+mat+'</span></div>')
      + '</div>';
  }

  function _wmsRender(sloc){
    const F = _wmsFigures(sloc);
    const now  = document.getElementById('wmsxLotNow'+sloc);
    const bsrc = document.getElementById('wmsxLotSrc'+sloc);
    const bas  = document.getElementById('wmsxBasis'+sloc);
    const out  = document.getElementById('wmsxOut'+sloc);
    if(now){
      const has = !!F.lot;
      now.innerHTML = '<span class="k">LOT</span><b'+(has?'':' class="none"')+'>'
                    + (has ? _esc2(F.lot) : '— none —')+'</b>';
      now.className = 'wmsx-lotnow' + (has ? '' : ' empty');
      now.title = has
        ? ('The density and %wt C3 below are the COQ basis of lot ' + F.lot
           + ' — the product currently in ' + F.tank + '.')
        : 'No lot found for this tank — type one, or type the density and %wt C3 by hand.';
    }
    if(bsrc){
      const map = { typed:'lot typed in', latest:'latest lot of this tank', none:'no lot' };
      bsrc.textContent = map[F.lotSrc] || '';
      bsrc.className = 'wmsx-lotsrc s-'+F.lotSrc;
      bsrc.title = F.lotSrcTxt ? ('Lot taken from ' + F.lotSrcTxt + ' — type another lot to override.') : '';
    }
    if(bas){
      const dTxt = (F.den > 0) ? (+F.den).toFixed(4) : '—';
      const wTxt = (F.w3 != null) ? (F.w3*100).toFixed(2)+' %' : '—';
      let html = '<span class="k">ρ COQ</span><b class="'+(F.denSrc==='typed'?'ov':'')+'">'+dTxt+'</b>'
               + '<span class="u">kg/L</span>'
               + '<span class="k">%wt C3</span><b class="'+(F.w3Src==='typed'?'ov':'')+'">'+wTxt+'</b>';
      if(F.denSrc === 'typed' || F.w3Src === 'typed')
        html += '<span class="sub ov">Typed basis in use — the COQ result of lot '
              + (F.lot ? _esc2(F.lot) : '—') + ' is '
              + (F.lotDen ? (+F.lotDen).toFixed(4) : '—') + ' kg/L · '
              + (F.lotW3 != null ? (F.lotW3*100).toFixed(2)+' %' : '—') + ' wt C3.</span>';
      else if(F.lotDen === null || F.lotW3 === null)
        html += '<span class="sub warn">Lot ' + (F.lot ? _esc2(F.lot) : '—')
              + ' has no COQ result yet — nothing can be computed from a volume until the density and '
              + '%wt C3 are known.</span>';
      else
        html += '<span class="sub">End-stock COQ basis of lot '
              + (F.lot ? _esc2(F.lot) : '—') + ' — the product now in the tank.</span>';
      if(F.cardLot && F.lotSrc === 'latest' && !_stxLotMatch(F.lot, F.cardLot))
        html += '<span class="sub warn">⚠ The tank card on the Scale tab shows lot '
              + _esc2(F.cardLot) + '. If that is what is in the tank now, type it in the LOT box above.</span>';
      bas.innerHTML = html;
    }
    if(!out) return;
    if(!F.ok){
      let msg = '<div class="wmsx-empty">Fill in ' + _esc2(F.miss.join(' · '))
              + ' to get the actual stock.';
      if(F.lot && (F.lotDen === null || F.lotW3 === null)){
        msg += '<br><span class="miss">Lot ' + _esc2(F.lot) + ' has no COQ result yet — press '
             + '◈ CALC COQ in the Tank Log, or type the density and %wt C3 below.</span>';
        const lb = _wmsLastBasis(sloc, F.lot);
        if(lb) msg += '<br><span class="hint">The newest lot of this tank that does have a COQ result is '
             + _esc2(lb.lot) + ' (' + (+lb.den).toFixed(4) + ' kg/L · ' + (lb.w3*100).toFixed(2)
             + ' %wt C3). Type that lot above ONLY if it is what is really in the tank now — '
             + 'do NOT borrow its basis for lot ' + _esc2(F.lot) + '.</span>';
      }
      out.innerHTML = msg + '</div>';
      return;
    }
    const N  = v => _stxNum(v, 0);
    const SG = v => '<span class="'+_stxSignCls(v)+'">'+_stxSigned(v)+'</span>';
    let html = '<table class="wmsx-tbl"><thead><tr>'
      + '<th class="lbl"></th><th class="n">C3</th><th class="n">C4</th><th class="n tot">LPG</th>'
      + '</tr></thead><tbody>'
      + '<tr class="a"><td class="lbl">Actual stock in the tank'
      +   '<i>' + _stxNum(F.vol,3) + ' m³ × ' + (+F.den).toFixed(4) + ' kg/L × '
      +   (F.w3*100).toFixed(2) + ' %wt C3</i></td>'
      +   '<td class="n">'+N(F.aC3)+'</td><td class="n">'+N(F.aC4)+'</td>'
      +   '<td class="n tot">'+N(F.aL)+'</td></tr>'
      + '<tr class="w"><td class="lbl">WMS stock right now<i>typed in from WMS</i></td>'
      +   '<td class="n">'+N(F.wmsC3)+'</td><td class="n">'+N(F.wmsC4)+'</td>'
      +   '<td class="n tot">'+N(F.wL)+'</td></tr>'
      + '<tr class="g"><td class="lbl">Difference<i>actual − WMS</i></td>'
      +   '<td class="n">'+SG(F.dC3)+'</td><td class="n">'+SG(F.dC4)+'</td>'
      +   '<td class="n tot">'+SG(F.dL)+'</td></tr>'
      + '</tbody></table>'
      + '<div class="wmsx-t">= '+_stxNum(F.aC3/1000,3)+' t C3 · '+_stxNum(F.aC4/1000,3)
      +   ' t C4 · '+_stxNum(F.aL/1000,3)+' t LPG actual</div>';
    if(!F.hasWms){
      html += '<div class="wmsx-empty">Type the <b>WMS C3</b> and <b>WMS C4</b> figures above to get '
            + 'the difference and the stock transfer to post.</div>';
    } else {
      html += '<div class="wmsx-acts">'
            + '<div class="wmsx-acts-hd">➜ WHAT TO POST IN WMS</div>'
            + _wmsActHtml(F, 'C3', F.dC3)
            + _wmsActHtml(F, 'C4', F.dC4)
            + '<div class="wmsx-note">Post C3 and C4 as <b>two separate lines</b> — they can go in '
            + 'opposite directions. After posting, the WMS stock of ' + _esc2(F.tank)
            + ' equals the measured stock: ' + N(F.aC3) + ' kg C3 · ' + N(F.aC4) + ' kg C4.</div>'
            + '</div>';
    }
    out.innerHTML = html;
  }

  function renderWms(refill){
    _WMS_SLOCS.forEach(sl=>{
      if(refill) _wmsFill(sl);
      _wmsRender(sl);
    });
  }
  /* Đổ số từ RAM vào ô — KHÔNG bao giờ đụng ô đang được gõ. */
  function _wmsFill(sloc){
    _WMS_FLD.forEach(f=>{
      const el = document.getElementById(_wmsElId(f, sloc));
      if(!el) return;
      try{ if(typeof document !== 'undefined' && el === document.activeElement) return; }catch(_){}
      const want = String((_wmsIn[sloc]||{})[f] || '');
      if(el.value !== want) el.value = want;
    });
  }
  /* Gõ ở bất kỳ ô nào → cất vào RAM → vẽ lại RIÊNG phần kết quả.
     Ô nhập là element tĩnh của index.html, không lượt vẽ nào dựng lại nó,
     nên không dính họ lỗi mất focus của v4.114. */
  function wmsEdit(sloc){
    if(!_wmsIn[sloc]) return;
    _WMS_FLD.forEach(f=>{
      const el = document.getElementById(_wmsElId(f, sloc));
      if(el) _wmsIn[sloc][f] = el.value;
    });
    _wmsRender(sloc);
  }
  /* v4.147 — cho Tank Console gõ thẳng vào bộ nhớ của 🔍 WMS stock check
     mà không cần modal. Cùng một kho số ⇒ mở modal ra vẫn thấy y nguyên. */
  function wmsSet(sloc, field, value){
    if(!_wmsIn[sloc] || _WMS_FLD.indexOf(field) < 0) return false;
    _wmsIn[sloc][field] = (value == null ? '' : String(value));
    try{ _wmsRender(sloc); }catch(_){}
    return true;
  }
  function wmsGet(sloc){ return Object.assign({}, _wmsIn[sloc] || {}); }
  function wmsClear(sloc){
    if(!_wmsIn[sloc]) return;
    _WMS_FLD.forEach(f=>{ _wmsIn[sloc][f] = ''; });
    _wmsFill(sloc);
    _wmsRender(sloc);
  }
  /* n = 1 | 2 (hoặc sloc): bồn được bấm đứng TRƯỚC, nhưng luôn hiện cả hai. */
  function openWms(n){
    const first = (n === 2 || n === '2101') ? '2101' : '2100';
    const wrap = document.getElementById('wmsxGrid');
    if(wrap){
      const a = document.getElementById('wmsxPane2100'), b = document.getElementById('wmsxPane2101');
      if(a && b) wrap.appendChild(first === '2100' ? b : a);
    }
    /* CỐ Ý KHÔNG xoá số cũ: người dùng đóng bảng đi làm việc khác rồi quay
       lại phải thấy nguyên những gì đã nhập (yêu cầu của vận hành). Muốn
       trắng thì bấm ✕ clear của đúng bồn đó. */
    renderWms(true);
    open('stxWmsModal');
  }

  /* ── init ── */
  function init(){
    const c=loadCache();
    if(c && c.data){ DATA = c.data; }
    if(c && c.ver){ _localVer = Object.assign({'2100':null,'2101':null}, c.ver); }
    /* default the shown tank to whatever SCALE has selected */
    try{
      if(typeof SCALE!=='undefined' && SCALE.getTkCfg){
        const cfg=SCALE.getTkCfg();
        if(cfg && cfg.tk2 && cfg.tk2.selected) sel='2101';
        else sel='2100';
      }
    }catch(_){ }
    _bootAt = Date.now();
    render();
    attachFirebase();
    /* v4.154 — nhịp 30 giây: SAP / Tank Log / cờ ST đổi ở máy khác cũng
       được tính lại mà không cần ai bấm gì. */
    try{
      if(!_tickTimer && typeof setInterval === 'function'){
        _tickTimer = setInterval(()=>{ try{ render(); }catch(_){} }, 30000);
        if(_tickTimer && typeof _tickTimer.unref === 'function') _tickTimer.unref();
      }
    }catch(_){}
  }
  let _tickTimer = null;

  return { init, view, onTankSwitch, render, renderRow1, stockFor,
           openInit, pickInit, saveInit,
           /* v4.146 — lưu từ Tank Console, KHÔNG đóng bảng đang mở */
           saveInitFor, saveWtFor,
           /* v4.152 — P2 tồn đầu tự lấy + P4 dấu chống cộng trùng của mẻ mix */
           autoInitPick:_autoInitPick, autoInitApply, initInfoFor, mixInGet,
           physCap:_physCap, soldKgBetween:_soldKgBetween,
           lotAddList, lotAddSet,
           mixFinishAt:_mixFinishAt, endStateFor:endStateFor,
           /* v4.154 — End Stock SAP là của lot nào + nhịp tự động */
           sapLotOf, sapLotStamp, sapHasMix:_sapHasMix, autoTick:_autoTick,
           _testClock(ms){ _clock = +ms || 0; },
           /* v4.147 — sổ cavern / liên bồn gõ thẳng trên bảng Tank Console */
           histFor, saveCavernFor, saveXferFor, delHistFor,
           exportRowsFor, todayDmy,
           openWt, pickWt, saveWt,
           openCavern, pickCav, saveCavern,
           openXfer, pickXferFrom, saveXfer,
           openHistory, renderHist, delHist,
           openExport, pickExport, pickExportDate, toggleExportRow, toggleExportAll,
           openSplit, pickSplit, calcSplit, copySplit,
           /* v4.144 — %wt C3 theo WMS: nguồn DUY NHẤT cho hai bảng tách */
           wmsWt: _wmsWt, splitByWt: _splitByWt, wtEdit, wtReset,
           /* v4.148 — chọn lot để tính %wt WMS */
           wtLotSet, wtLotGet, wtLotList,
           /* v4.108 — ⚖ Stock-transfer reconciliation (nút 📏 trên thẻ tank) */
           openStx, renderStx, copyStx, stxLotChange, stxSysEdit, stxSysReset,
           stxBdEdit, stxBdReset, stxBdCalc: _stxBdCalc, _stxBd,   /* v4.128 — tách batch D/E */
           stxCtx: _stxCtx, stxSapDate: _stxSapDate,
           /* v4.151 — chọn lot để đối chiếu, dùng chung với bảng ⚖ */
           stxSetLot, stxGetLot, stxLotList,
           /* v4.111 — dùng chung với ô thông báo Tank Mix + ghi vào Tank Log */
           stxFigures: _stxFigures, stxSetSys, stxSlocOf, stxSave, stxSaveFor,
           stxSavedOf: _stxSavedOf,
           /* v4.117 — 🔍 WMS stock check (nút 🔍 trên thẻ tank): thể tích ĐO
              ĐƯỢC ngay lúc này × nền COQ của lot đang trong bồn, đặt cạnh số
              WMS đang hiện ⇒ độ vênh + câu lệnh chuyển kho nói rõ chiều
              (bồn ➜ hầm 1100 để GIẢM, hầm 1100 ➜ bồn để TĂNG). */
           openWms, renderWms, wmsEdit, wmsClear, wmsSet, wmsGet,
           wmsFigures: _wmsFigures, wmsAction: _wmsAction,
           openVolChk: openStx,          /* alias cho lối gọi cũ */
           closeAll };
})();
window.INV = INV;
