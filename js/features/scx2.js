/* ============================================================
 * SCX2  —  scx2.js
 * ------------------------------------------------------------
 * NGUỒN (V4-54): lpg-station-v4_54_0-cavern-collapsible-sections.html
 *   dòng 28614–28824   (~211 dòng)
 * Global xuất ra : window.SCX2
 * Phase tách     : P5A
 * Phụ thuộc      : sync, scale
 * Khởi tạo (boot): SCX2.init() trong boot
 * ------------------------------------------------------------
 * MÔ TẢ: Mở rộng cân (SCX2).
 *
 * API công khai (điền/đối chiếu khi tách):
 *   SCX2.init()
 * ------------------------------------------------------------
 * CÁCH TÁCH (khi tới phase này):
 *   1) Mở V4-54, copy nguyên khối module SCX2 từ dòng 28614 đến 28824.
 *   2) Dán xuống DƯỚI dòng này. GIỮ NGUYÊN tên global (window.SCX2).
 *   3) node --check scx2.js   → phải PASS (không lỗi cú pháp).
 *   4) Mở index.html trên trình duyệt → kiểm tra chức năng hoạt động.
 *   5) Cập nhật docs/PLAN-TACH-MODULE.md: đánh dấu [x] module này.
 * ============================================================ */

/* TODO[P5A]: dán thân module SCX2 (V4-54 dòng 28614–28824) vào đây. */

/* ===== BÓC TỪ V4-54 dòng 28614–28750 ===== */
const SCX2 = (function(){
  let _on = false;

  function _q(sel){ return document.querySelector(sel); }
  function _cell(innerId){
    const el = document.getElementById(innerId);
    return el ? el.closest('.sc-r4-cell') : null;
  }

  /* per-tank extras: opening-stock mini-row + INV action buttons */
  function _buildTankExtras(){
    [[1,'2100','3501'],[2,'2101','3502']].forEach(([n, sloc, tk])=>{
      const main = _q('#scTk'+n+'Card .sc-tkc-main');
      if(!main || document.getElementById('scx2Tkx'+n)) return;
      /* v4.143 — KHỐI DENSITY / %wt C3 DƯỚI HÌNH TRÒN.
         Khoảng trống dưới quả cầu đo mức trước nay bỏ không. Nay bọc quả
         cầu + khối số vào MỘT cột dọc để hai thứ dính nhau, không đụng gì
         tới cột thông tin bên phải. Con số do SFDENS giải — cùng nguồn
         với Safe Fill Allow, ĐỪNG tính lại ở đây. */
      try{
        const body = _q('#scTk'+n+'Card .sc-tkc-body');
        const ball = body && body.querySelector('.sc-tkc-ball');
        if(body && ball && !document.getElementById('scx2Dens'+n)){
          const side = document.createElement('div');
          side.className = 'scx2-tkside';
          body.insertBefore(side, ball);
          side.appendChild(ball);
          const dn = document.createElement('div');
          dn.className = 'scx2-tkd';
          dn.id = 'scx2Dens'+n;
          side.appendChild(dn);
        }
      }catch(_){}
      const box = document.createElement('div');
      box.className = 'scx2-tkx';
      box.id = 'scx2Tkx'+n;
      const stop = 'event.stopPropagation();';
      /* ══ v4.145 — BA NÚT CÓ CHỮ THAY CHO MƯỜI NÚT KÝ HIỆU ═══════════
         Mười nút cũ (📥 📐 ⇄ ⇆ 📜 📤 🧮 📏 🔀 🔍) không nút nào có chữ, và
         ba trong số đó cùng trả lời một câu hỏi. Nay gom thành ba nút, mỗi
         nút là MỘT CÂU HỎI của người vận hành, cả ba mở CÙNG bảng Tank
         Console — chỉ khác tab mở sẵn. Mọi hộp thoại cũ GIỮ NGUYÊN, bảng
         mới chỉ tóm tắt số và mở chúng ra ([[tkc.js]] nói rõ vì sao không
         bê thân modal đi chỗ khác). */
      box.innerHTML =
        '<div class="scx2-tkx-open" id="scx2Open'+n+'"></div>'
      + '<div class="scx2-tkx-acts tkc3">'
      +   '<button onclick="'+stop+'TKC.open(\''+sloc+'\',\'stock\')"'
      +     ' title="Initial stock, %wt C3, cavern receipts, inter-tank transfers and today history — one ledger">⚖ Stock</button>'
      +   '<button onclick="'+stop+'TKC.open(\''+sloc+'\',\'recon\')"'
      +     ' title="Stock-transfer reconciliation and the WMS spot check — how far the system is off and what to post">📏 Recon</button>'
      +   '<button onclick="'+stop+'TKC.open(\''+sloc+'\',\'split\')"'
      +     ' title="Split a quantity into C3/C4 on the WMS basis — one number, the export list, or a truck loaded from both tanks">🧮 Split</button>'
      + '</div>';
      /* v4.212 — gắn vào CẢ THẺ (dưới quả cầu + cột số) thay vì cột số bên phải:
         cột số chỉ rộng ~150px nên ba nút ⚖ Stock · 📏 Recon · 🧮 Split bị cắt chữ
         thành "St… R… S…" trên laptop. Nay hàng nút dài bằng cả thẻ. */
      const card = document.getElementById('scTk'+n+'Card');
      (card || main).appendChild(box);
    });
  }

  /* ⛔ v4.145 — CỤM 10 NÚT CŨ, GIỮ LẠI ĐỂ TRA CỨU, KHÔNG CÒN ĐƯỢC GỌI.
     Đừng khôi phục: mỗi lối vào ở đây nay nằm trong một tab của TKC. */
  function _buildTankExtrasLegacy(){
    [[1,'2100','3501'],[2,'2101','3502']].forEach(([n, sloc, tk])=>{
      const box = document.createElement('div');
      const stop = 'event.stopPropagation();';
      box.innerHTML =
        '<div class="scx2-tkx-open" id="scx2Open'+n+'"></div>'
      + '<div class="scx2-tkx-acts">'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openInit()"    title="Initial stock">📥</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openWt()"      title="%wt C3 update">📐</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openCavern()"  title="Cavern receive / return">⇄</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openXfer()"    title="Inter-tank transfer">⇆</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openHistory()" title="Stock history">📜</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openExport()"  title="Export C3/C4 split">📤</button>'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openSplit()"   title="Tách LPG → C3/C4 theo %wt C3">🧮</button>'
      /* v4.108 — ⚖ đối chiếu chuyển kho: tồn C3/C4 THỰC TẾ (INIT/FINAL VOL đo
         được × nền COQ) đặt cạnh tồn hệ thống, ra số chuyển kho đã điều chỉnh.
         Bảng luôn hiện cả hai bồn. */
      +   '<button class="scx2-tkx-vc" onclick="'+stop+'INV.view(\''+sloc+'\');INV.openStx('+n+')"'
      +     ' title="Stock-transfer reconciliation — actual C3/C4 from the measured volumes vs the system stock, giving the adjusted transfer quantity">📏</button>'
      /* v4.117 — 🔍 WMS stock check: phép đo TẠI CHỖ. Gõ thể tích vừa đo
         được + số C3/C4 WMS đang hiện ⇒ độ vênh và CÂU LỆNH chuyển kho nói
         rõ chiều (bồn ➜ hầm 1100 để GIẢM WMS, hầm 1100 ➜ bồn để TĂNG). */
      /* v4.136 — 🔀 CROSS-TANK GI SPLIT: xe lấy hàng từ CẢ HAI bồn nhưng
         phiếu cân + GI trên WMS chỉ làm được từ MỘT bồn. Bấm ở thẻ nào
         cũng mở CÙNG một bảng — thẻ vừa bấm chỉ là bồn GI mặc định.
         Nút 🔍 WMS stock check bên cạnh được thu hẹp lại để lấy chỗ
         (xem .scx2-tkx-wms trong css/xsplit.css). */
      +   '<button class="scx2-tkx-xs" onclick="'+stop+'XSPLIT.open(\''+sloc+'\')"'
      +     ' title="Cross-tank GI split — trucks that loaded from BOTH tanks: split the sold weight into C3/C4 by the lot COQ and get the smallest cross-transfer to post so every GI can be issued from one tank">&#128256;</button>'
      +   '<button class="scx2-tkx-wms" onclick="'+stop+'INV.view(\''+sloc+'\');INV.openWms('+n+')"'
      +     ' title="WMS stock check — type the volume you have just measured and the C3/C4 the WMS shows now; the window gives the gap and says exactly which stock transfer to post">🔍</button>'
      + '</div>';
      return box;   /* legacy — không gắn vào DOM nữa */
    });
  }

  /* fill the opening-stock mini-rows from INV (RAM only) */
  function renderTankExtras(){
    if(!_on) return;
    renderDens();
    try{ renderPace(); }catch(_){}            /* v4.218 — ⏱ LOADING PACE thay khối BY TANK */
    if(typeof INV === 'undefined' || !INV.stockFor) return;
    [['2100',1],['2101',2]].forEach(([sloc, n])=>{
      const el = document.getElementById('scx2Open'+n);
      if(!el) return;
      let c = null;
      try{ c = INV.stockFor(sloc); }catch(_){}
      if(!c || !c.hasInit){
        el.innerHTML = '<span class="e">no initial stock</span>';
        return;
      }
      const f = v => Math.round(v||0).toLocaleString('en-US');
      /* v4.154/4.155 — %C3 của app là SỐ NGUYÊN như WMS (INV đã làm tròn);
         số người gõ giữ tới 2 số lẻ.
         thêm nhãn nguồn: ƒ = app tự lấy (SAP D-1 / finish của lot nào),
         ✎ = người gõ. Rê chuột xem đủ câu giải thích. */
      const w = parseFloat(c.wtC3);
      let I = null;
      try{ I = INV.initInfoFor ? INV.initInfoFor(sloc) : null; }catch(_){}
      let tag = '', tip = '';
      if(I && I.has){
        const sl = l => String(l||'').replace(/^LPG-\d{4}-/i, '');
        if(I.auto){
          tag = I.src === 'mix'     ? 'ƒ lot ' + sl(I.lot)
              : I.src === 'sapfill' ? 'ƒ SAP+' + sl(I.lot)
              :                       'ƒ SAP' + (I.sapLot ? ' · ' + sl(I.sapLot) : '');
          tip = 'Initial stock taken by the app from ' + (I.txt || I.src);
        } else {
          tag = '✎ typed';
          tip = 'Initial stock entered by ' + (I.by || 'a user');
        }
      }
      const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
      el.title = tip;
      el.innerHTML =
        '<span class="k">OPEN</span><b>'+f((c.c3Init||0)+(c.c4Init||0))+'</b>'
      + '<span class="k">C3</span><b>'+f(c.c3Init)+'</b>'
      + '<span class="k">C4</span><b>'+f(c.c4Init)+'</b>'
      + '<span class="k">%C3</span><b>'+(isFinite(w) ? (Number.isInteger(w) ? String(w) : String(+w.toFixed(2))) : '—')+'</b>'
      + (tag ? '<span class="osrc '+(I.auto ? 'app' : 'user')+'">'+esc(tag)+'</span>' : '');
    });
  }

  /* ⚠ hai con số %C3 trên thẻ KHÁC NHAU, đừng gộp:
       hàng OPEN · %C3  = %wt C3 của TỒN ĐẦU KỲ (INV, sửa bằng nút 📐)
       khối dưới hình tròn = %wt C3 theo COQ của CHÍNH LOT đang trong bồn */

  /* vẽ khối density / %wt C3 của MỘT thẻ tank */
  function _renderDens(n){
    const el = document.getElementById('scx2Dens'+n);
    if(!el) return;
    if(typeof SFDENS==='undefined' || !SFDENS.tankInfo){ el.innerHTML=''; return; }

    let lot = '', type = '';
    try{
      const cfg = (typeof SCALE!=='undefined' && SCALE.getTkCfg) ? SCALE.getTkCfg() : null;
      const c = cfg && cfg['tk'+n];
      lot = c ? String(c.lot||'').trim() : '';
    }catch(_){}
    const tank = n===1 ? 'TK-3501' : 'TK-3502';

    if(!lot){
      el.className = 'scx2-tkd empty';
      el.innerHTML = '<span class="scx2-tkd-e">no lot</span>';
      el.title = 'Type the lot in the LOT box to see its density.';
      return;
    }

    let i = null;
    try{ i = SFDENS.tankInfo(lot, tank, type); }catch(_){ }
    if(!i){ el.innerHTML=''; return; }

    const d4 = (i.dens!=null && isFinite(i.dens)) ? (Math.round(i.dens*10000)/10000).toFixed(4) : '—';
    const wt = (i.wt!=null && isFinite(i.wt)) ? (Math.round(i.wt*10)/10) : null;

    /* Nhãn nguồn — phải đọc được trong 1 giây: số này đáng tin tới đâu? */
    let tag = '', cls = '', tip = '';
    if(i.densSrc==='coq'){
      tag = 'COQ'; cls = 'ok';
      tip = 'Density from the COQ of lot ' + i.lot + '.';
    } else if(i.densSrc==='pure'){
      tag = 'PURE ' + i.pure; cls = 'ok';
      tip = 'Pure ' + i.pure + ' — saturated-liquid density at ' + SFDENS.pureTemp() + '°C.';
    } else if(i.densSrc==='near'){
      tag = '≈ ' + String(i.refLot||'').replace(/^LPG-\d{4}-/, '');
      cls = i.far ? 'far' : 'est';
      tip = 'Lot ' + i.lot + ' has no COQ density yet, so the closest lot by %C3 is used: '
          + i.refLot + (i.gap==null ? '' : ' (' + (Math.round(i.gap*10)/10) + ' points apart)')
          + (i.far ? ' — WARNING: far from this lot\'s target mix, check before trusting it.' : '.');
    } else if(i.scanning){
      tag = '…'; cls = 'est';
      tip = 'Reading the Tank Log to find a lot to take the density from…';
    } else {
      tag = 'MANUAL'; cls = 'man';
      tip = 'No lot data found — falling back to the density typed on the Safe Fill bar.';
    }
    if(wt!=null){
      tip += '  %wt C3 ' + wt + (i.wtSrc==='coq' ? ' from the COQ of lot ' + i.lot
            : i.wtSrc==='near' ? ' borrowed from lot ' + i.refLot : '') + '.';
    }
    el.className = 'scx2-tkd ' + cls;
    el.title = tip;
    el.innerHTML =
        '<div class="scx2-tkd-r"><span class="k">ρ</span><b>' + d4 + '</b></div>'
      + '<div class="scx2-tkd-tag">' + tag + '</div>'
      + '<div class="scx2-tkd-r"><span class="k">%wt C3</span><b>'
      +   (wt==null ? '—' : wt) + '</b></div>';
  }
  function renderDens(){ _renderDens(1); _renderDens(2); }

  function init(){
    try{
      const root   = document.getElementById('scx2Root');
      const pane   = document.getElementById('sub-scale');
      const tanks  = document.getElementById('scx2Tanks');
      const gridH  = document.getElementById('scx2GridHold');
      const infoH  = document.getElementById('scx2InfoRow');
      const dockH  = document.getElementById('scx2DockHold');
      const staffH = document.getElementById('scx2StaffHold');
      const iconH  = document.getElementById('scx2IconHold');
      const rptPop = document.getElementById('scx2RptPop');
      if(!root || !pane || !tanks || !gridH || !infoH || !dockH || !staffH || !iconH || !rptPop) return;

      /* anchors (all must exist before we touch anything) */
      const tkSplit  = _q('#scRow1 .sc-tk-split');
      const planCell = _q('#scRow1 .sc-r1-plan-merged');
      const rptCell  = _q('#scRow1 .sc-r1-rpt-cell');
      const staffRow = _q('#scRow1 .sc-staff-rowa');
      const engBtn   = document.getElementById('scNotifEngBtn');
      const saleBtn  = document.getElementById('scNotifSaleBtn');
      const ctrlGrid = document.getElementById('scCtrlGrid');
      const dock     = document.getElementById('scShortcutBar');
      const queueCell= _cell('scQueue');
      const certCell = _cell('scCertList');
      const certInp  = document.getElementById('scCertSearchInp');
      const certRes  = document.getElementById('scCertResults');
      const row1 = document.getElementById('scRow1');
      const row4 = document.getElementById('scRow4');
      if(!tkSplit || !planCell || !rptCell || !staffRow || !engBtn || !saleBtn ||
         !ctrlGrid || !dock || !queueCell || !certCell || !certInp || !certRes ||
         !row1 || !row4){
        console.warn('[SCX2] anchor missing — console layout skipped');
        return;
      }

      /* ── top strip ── */
      staffH.appendChild(staffRow);
      iconH.insertBefore(engBtn, iconH.firstChild);
      iconH.insertBefore(saleBtn, iconH.firstChild);
      iconH.appendChild(document.getElementById('scx2RptBtn'));
      rptPop.appendChild(rptCell);

      /* ── left: tank cards (+ per-tank INV extras) ── */
      tanks.appendChild(tkSplit);
      _buildTankExtras();

      /* ── yard: bays · info row · dock ── */
      gridH.appendChild(ctrlGrid);
      /* CERT CHECK merge: search input into the EXPIRED CERTS header,
         results as an absolute overlay inside the same card. */
      const certHdr = certCell.querySelector('.sc-r4-hdr');
      if(certHdr){
        const tog = certHdr.querySelector('.fc-mode-toggle');
        certInp.classList.add('scx2-certinp');
        certHdr.insertBefore(certInp, tog || null);
      }
      certRes.classList.add('scx2-certres');
      certCell.classList.add('scx2-certcell');
      certCell.appendChild(certRes);
      infoH.appendChild(planCell);
      /* v4.213 — hai khối chi tiết nằm DƯỚI vòng tròn: BY PRODUCT TYPE · (v4.218) ⏱ LOADING PACE.
         Chỉ hiện khi thẻ đủ rộng + đủ cao (container query, xem core.css v4.213);
         màn nhỏ tự ẩn, số chi tiết vẫn đọc được bằng tooltip trên vòng tròn. */
      try{
        const halves = planCell.querySelectorAll('.sc-r1-plan-half');
        [['scx2PlanBrk', 0], ['scx2StockBrk', 1]].forEach(([id, i]) => {
          const hf = halves[i]; if(!hf || document.getElementById(id)) return;
          const d = document.createElement('div'); d.id = id; d.className = 'scx2-brk empty';
          const row = hf.querySelector('.sc-pp-row');
          if(row && row.nextSibling) hf.insertBefore(d, row.nextSibling); else hf.appendChild(d);
        });
        if(_lastPlan) renderPlanBreak(_lastPlan, _lastTrade);
        _paceTick();
      }catch(_){}
      infoH.appendChild(queueCell);
      infoH.appendChild(certCell);
      dockH.appendChild(dock);

      row1.style.display = 'none';   /* emptied shells (XFER + CERT CHECK     */
      row4.style.display = 'none';   /* leftovers stay hidden inside row 4)   */
      pane.classList.add('scx2-on');
      _on = true;
      renderTankExtras();
      /* v4.143 — SFDENS có thể phải đọc cả Tank Log mới biết mượn density
         của lot nào; đọc xong thì vẽ lại, không để thẻ kẹt ở chữ MANUAL. */
      try{ if(typeof SFDENS!=='undefined' && SFDENS.onReady) SFDENS.onReady(renderDens); }catch(_){}
      console.log('[SCX2] Operations Console v2.1 layout active');
    }catch(e){
      console.warn('[SCX2] init failed — legacy layout kept', e);
    }
  }

  /* ══ v4.213 — PLAN theo LOẠI HÀNG + STOCK theo BỒN ════════════════════
     Số đều là RAM (không đọc/ghi Firebase): nhóm loại hàng do SCALE._updateRow1
     tính bằng TP.lnkTotals, tồn bồn lấy INV.stockFor — cùng nguồn với vòng tròn. */
  const _esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const _f3  = v => (+v||0).toLocaleString('en-US',{ minimumFractionDigits:3, maximumFractionDigits:3 });
  const _kg  = v => Math.round(+v||0).toLocaleString('en-US');
  let _lastPlan = null, _lastTrade = null;
  function renderPlanBreak(groups, trades){
    _lastPlan = groups || null;
    _lastTrade = trades || null;
    const el = document.getElementById('scx2PlanBrk');
    if(!el) return;
    if(!groups || !groups.length){ el.innerHTML = ''; el.classList.add('empty'); try{ renderPace(); }catch(_){} return; }
    el.classList.remove('empty');
    const ord = t => t === '50:50' ? 0 : (t === '50:50 ?' ? 1 : 2);
    const G = groups.slice().sort((a, b) => ord(a.type) - ord(b.type) || b.planMT - a.planMT);
    const max = Math.max.apply(null, G.map(g => g.planMT)) || 1;
    let h = '<div class="scx2-brk-hd"><span>BY PRODUCT TYPE</span></div>'
          + '<div class="scx2-bt hd"><span>TYPE</span><span>PLAN</span><span>LOADED</span><span>REMAIN</span><span>TRIPS</span></div>';
    const tip = [];
    G.forEach(g => {
      const pL = g.planMT > 0 ? Math.min(1, g.loadedMT / g.planMT) : 0;
      const t = g.type + ': plan ' + _f3(g.planMT) + ' · loaded ' + _f3(g.loadedMT) + ' · remain ' + _f3(g.remainMT) + ' MT · ' + g.doneCnt + '/' + g.planCnt + ' trips';
      tip.push(t);
      h += '<div class="scx2-br'+(g.special ? ' sp' : '')+(g.type === '50:50 ?' ? ' unk' : '')+'" title="'+_esc(t + (g.type === '50:50 ?' ? ' — Sale Plan has no type; printed as 50:50' : ''))+'">'
         +   '<div class="scx2-bt"><span class="ty">'+(g.special ? '⚠ ' : '')+_esc(g.type)+'</span>'
         +     '<span class="n">'+_f3(g.planMT)+'</span><span class="n ld">'+_f3(g.loadedMT)+'</span>'
         +     '<span class="n rm">'+_f3(g.remainMT)+'</span><span class="n tr">'+g.doneCnt+'/'+g.planCnt+'</span></div>'
         +   '<div class="scx2-bar"><i style="width:'+(g.planMT / max * 100).toFixed(1)+'%"><b style="width:'+(pL * 100).toFixed(1)+'%"></b></i></div>'
         + '</div>';
    });
    /* ⭐ v4.230 — BY TRADE TYPE (Domestic · Export), cùng khuôn với BY PRODUCT TYPE */
    if(trades && trades.length){
      const tmax = Math.max.apply(null, trades.map(g => g.planMT)) || 1;
      h += '<div class="scx2-brk-hd tt"><span>BY TRADE TYPE</span></div>'
         + '<div class="scx2-bt hd"><span>TRADE</span><span>PLAN</span><span>LOADED</span><span>REMAIN</span><span>TRIPS</span></div>';
      trades.forEach(g => {
        const pL = g.planMT > 0 ? Math.min(1, g.loadedMT / g.planMT) : 0;
        const t = g.type + ': plan ' + _f3(g.planMT) + ' · loaded ' + _f3(g.loadedMT) + ' · remain ' + _f3(g.remainMT) + ' MT · ' + g.doneCnt + '/' + g.planCnt + ' trips';
        tip.push(t);
        h += '<div class="scx2-br tr-' + (g.dir === 'E' ? 'e' : 'd') + '" title="' + _esc(t) + '">'
           +   '<div class="scx2-bt"><span class="ty">' + _esc(g.type) + '</span>'
           +     '<span class="n">' + _f3(g.planMT) + '</span><span class="n ld">' + _f3(g.loadedMT) + '</span>'
           +     '<span class="n rm">' + _f3(g.remainMT) + '</span><span class="n tr">' + g.doneCnt + '/' + g.planCnt + '</span></div>'
           +   '<div class="scx2-bar"><i style="width:' + (g.planMT / tmax * 100).toFixed(1) + '%"><b style="width:' + (pL * 100).toFixed(1) + '%"></b></i></div>'
           + '</div>';
      });
    }
    el.innerHTML = h;
    try{ renderPace(); }catch(_){}            /* v4.218 — vẽ lại cùng lượt với PLAN (TL Data vừa đổi) */
    /* màn nhỏ khối này ẩn ⇒ rê chuột lên vòng tròn PLAN vẫn đọc được từng loại */
    const w = document.getElementById('scPlanDonutWrap');
    if(w){ const base = String(w.title || '').split('\n')[0]; w.title = base + '\n' + tip.join('\n'); }
  }
  /* ══ ⭐ v4.218 — ⏱ LOADING PACE & ETA (thay khối BY TANK của v4.213) ═════════
     BY TANK chỉ lặp lại số của hai thẻ bồn ⇒ gỡ. Chỗ đó nay trả lời câu hỏi mà
     chưa màn nào trả lời: "HÔM NAY NẠP NHANH HAY CHẬM, BAO GIỜ XONG KẾ HOẠCH?"
       • cột t/giờ theo giờ cân lần 2 (timeOut) của TL Data hôm nay
       • tốc độ 2 giờ gần nhất · trung bình ngày · xe/giờ · thời gian xe ở trạm
         (cân lần 1 → cân lần 2)
       • REMAIN của kế hoạch (cùng số với vòng PLAN) ÷ tốc độ ⇒ giờ xong dự kiến
     Toàn bộ tính trên RAM (TL.ROWS) — không đọc/ghi Firebase.
     ⛔ v4.220 — ĐÃ BỎ REMAIN → ETA (user: xe chưa vào nhà máy thì không nạp được, ETA theo tốc độ nạp là vô nghĩa). */
  const _p2 = x => String(x).padStart(2, '0');
  function _dKey(s){
    s = String(s || '');
    let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return _p2(+m[3]) + '/' + _p2(+m[2]) + '/' + m[1].slice(-2);
    m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); return m ? _p2(+m[1]) + '/' + _p2(+m[2]) + '/' + m[3].slice(-2) : '';
  }
  function _mins(t){ const m = String(t || '').match(/(\d{1,2})\s*[:h.]\s*(\d{2})/); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; }
  function _hm(min){ min = Math.round(min); const d = Math.floor(min / 1440); min -= d * 1440; return _p2(Math.floor(min / 60)) + ':' + _p2(min % 60) + (d ? ' (+' + d + 'd)' : ''); }
  function _tlToday(){
    const d = new Date(), key = _p2(d.getDate()) + '/' + _p2(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(-2);
    let R = [];
    try{ const X = (typeof TL !== 'undefined' && TL.ROWS) ? TL.ROWS : []; R = Array.isArray(X) ? X : Object.values(X); }catch(_){}
    return R.filter(r => r && !r.disabled && _dKey(r.date || r.giDate) === key);
  }
  function paceStats(rows, nowMin, remainMT){
    const B = {}, seen = new Set(), dur = [];
    let tons = 0, trips = 0, first = null, winT = 0, winN = 0;
    rows.forEach(r => {
      const kg = parseFloat(String(r.lpgQty || '').replace(/,/g, '')) || 0;
      const tIn = _mins(r.timeIn), tOut = _mins(r.timeOut), at = tOut != null ? tOut : (kg > 0 ? tIn : null);   /* chưa cân lần 2 ⇒ xe còn ở trạm, chưa tính */
      const g = String(r.mdoG || '').trim(), key = g ? 'M|' + g : [r.doNo, r.truck, r.scaleNo, r.turn].join('|');
      const newTrip = !seen.has(key); seen.add(key);
      tons += kg / 1000; if(newTrip) trips++;
      const st = tIn != null ? tIn : at; if(st != null && (first == null || st < first)) first = st;
      if(tIn != null && tOut != null){ let d = tOut - tIn; if(d < 0) d += 1440; if(d > 0 && d < 600 && newTrip) dur.push(d); }
      if(at == null || at > nowMin) return;
      const h = Math.floor(at / 60); B[h] = B[h] || { t:0, n:0 }; B[h].t += kg / 1000; if(newTrip) B[h].n++;
      if(at >= nowMin - 120){ winT += kg / 1000; if(newTrip) winN++; }
    });
    const span = first == null ? 0 : Math.min(120, nowMin - first);
    const rate2 = span >= 20 ? winT / (span / 60) : 0;
    const dayH = first == null ? 0 : (nowMin - first) / 60;
    const rateD = dayH >= 0.33 ? tons / dayH : 0;
    const rate = rate2 > 0 ? rate2 : rateD;
    const eta = remainMT > 0 && rate > 0 ? nowMin + remainMT / rate * 60 : null;
    return { B, tons, trips, first, rate2, rateD, truckH: span >= 20 ? winN / (span / 60) : 0,
             stay: dur.length ? dur.reduce((a, b) => a + b, 0) / dur.length : null, stayN: dur.length, rate, eta };
  }
  function renderPace(){
    const el = document.getElementById('scx2StockBrk');
    if(!el) return;
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    /* v4.220 — BỎ dòng REMAIN → ETA: xe chưa vào nhà máy thì không có gì để nạp, nên
       không suy giờ xong kế hoạch từ tốc độ nạp được. Chỗ trống dành cho biểu đồ giờ cao điểm. */
    const S = paceStats(_tlToday(), nowMin, 0);
    const hNow = now.getHours(), h0 = S.first == null ? hNow : Math.min(hNow, Math.floor(S.first / 60));
    const hs = []; for(let h = Math.max(0, Math.min(h0, hNow - 5)); h <= hNow; h++) hs.push(h);
    const vals = hs.map(h => (S.B[h] || {}).t || 0), max = Math.max.apply(null, vals.concat([1]));
    const peakH = vals.some(v => v > 0) ? hs[vals.indexOf(Math.max.apply(null, vals))] : -1;
    const f1 = v => (+v || 0).toFixed(1), f0 = v => Math.round(+v || 0);
    let h = '<div class="scx2-brk-hd"><span>⏱ RUSH HOUR — LOADED PER HOUR</span><span class="u">t · trucks (2nd weighing)</span></div>';
    h += '<div class="scx2-pc-ch">' + hs.map(x => {
      const b = S.B[x] || { t:0, n:0 }, cur = x === hNow, pk = x === peakH;
      return '<div class="scx2-pc-c' + (cur ? ' now' : '') + (pk ? ' peak' : '') + '" title="' + _p2(x) + ':00–' + _p2(x) + ':59 · ' + f1(b.t) + ' t · ' + b.n + ' truck(s)' + (pk ? ' · busiest hour' : '') + (cur ? ' · hour in progress' : '') + '">'
           + '<span class="v">' + (b.t ? f0(b.t) : '') + '</span><span class="b"><i style="height:' + (b.t / max * 100).toFixed(1) + '%"></i></span>'
           + '<span class="h">' + _p2(x) + '</span><span class="n">' + (b.n ? b.n + '🚚' : '') + '</span></div>';
    }).join('') + '</div>';
    const k = (lab, val, tip, cls) => '<span class="scx2-pc-k' + (cls ? ' ' + cls : '') + '" title="' + _esc(tip) + '"><i>' + lab + '</i><b>' + val + '</b></span>';
    h += '<div class="scx2-pc-ks">'
       + k('LAST 2 H', S.rate2 ? f0(S.rate2) + ' t/h' : '—', 'Tonnes weighed out in the last 2 hours ÷ elapsed time')
       + k('DAY AVG', S.rateD ? f0(S.rateD) + ' t/h' : '—', 'All tonnes today ÷ time since the first truck weighed in (' + (S.first != null ? _hm(S.first) : '—') + ')')
       + k('PEAK', peakH >= 0 ? _p2(peakH) + 'h · ' + f0(vals[hs.indexOf(peakH)]) + ' t' : '—', 'Busiest hour today')
       + k('IN STATION', S.stay != null ? f0(S.stay) + ' min' : '—', 'Average 1st → 2nd weighing time (' + S.stayN + ' trucks with both times) · ' + S.trips + ' trips · ' + f1(S.tons) + ' t today', S.stay != null && S.stay > 60 ? 'warn' : '')
       + '</div>';
    el.innerHTML = h;
    el.classList.remove('empty');
  }
  const renderStockBreak = renderPace;      /* tên cũ — INV / các chỗ gọi cũ vẫn chạy */
  let _paceTmr = null;
  function _paceTick(){ if(_paceTmr) return; _paceTmr = setInterval(() => { try{ if(document.getElementById('scx2StockBrk')) renderPace(); }catch(_){} }, 60000); }

  function toggleRpt(){
    const p = document.getElementById('scx2RptPop');
    if(p) p.classList.toggle('on');
  }

  return { init, renderTankExtras, renderDens, toggleRpt, renderPlanBreak, renderStockBreak, renderPace, paceStats };
})();
