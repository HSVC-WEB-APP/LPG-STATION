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
      box.innerHTML =
        '<div class="scx2-tkx-open" id="scx2Open'+n+'"></div>'
      + '<div class="scx2-tkx-acts">'
      +   '<button onclick="'+stop+'INV.view(\''+sloc+'\');INV.openInit()"    title="Opening stock">📥</button>'
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
      main.appendChild(box);
    });
  }

  /* fill the opening-stock mini-rows from INV (RAM only) */
  function renderTankExtras(){
    if(!_on) return;
    renderDens();
    if(typeof INV === 'undefined' || !INV.stockFor) return;
    [['2100',1],['2101',2]].forEach(([sloc, n])=>{
      const el = document.getElementById('scx2Open'+n);
      if(!el) return;
      let c = null;
      try{ c = INV.stockFor(sloc); }catch(_){}
      if(!c || !c.hasInit){
        el.innerHTML = '<span class="e">no opening stock</span>';
        return;
      }
      const f = v => Math.round(v||0).toLocaleString('en-US');
      el.innerHTML =
        '<span class="k">OPEN</span><b>'+f((c.c3Init||0)+(c.c4Init||0))+'</b>'
      + '<span class="k">C3</span><b>'+f(c.c3Init)+'</b>'
      + '<span class="k">C4</span><b>'+f(c.c4Init)+'</b>'
      + '<span class="k">%C3</span><b>'+(isFinite(c.wtC3) ? c.wtC3 : '—')+'</b>';
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

  function toggleRpt(){
    const p = document.getElementById('scx2RptPop');
    if(p) p.classList.toggle('on');
  }

  return { init, renderTankExtras, renderDens, toggleRpt };
})();
