/* ============================================================
 * TKC  —  tkc.js   (v4.145)
 * ------------------------------------------------------------
 * TANK CONSOLE — gom 10 nút rời trên thẻ tank về 3 nút CÓ CHỮ.
 *
 * VÌ SAO
 *   Thẻ tank từng mang 10 nút chỉ có ký hiệu, mở 8 hộp thoại khác nhau:
 *   📥 📐 ⇄ ⇆ 📜 📤 🧮 📏 🔀 🔍. Không nút nào có chữ, ba trong số đó
 *   (🧮 · 📤 · 🔀) cùng trả lời MỘT câu "tách khối lượng này ra C3/C4",
 *   hai nút khác (📏 · 🔍) cùng trả lời "WMS đang lệch bao nhiêu".
 *   Người dùng: "quá nhiều nút bấm gây rối".
 *
 * CÁCH GOM — 3 nút, mỗi nút là MỘT CÂU HỎI của người vận hành:
 *   ⚖ STOCK  "bồn này đang có bao nhiêu, từ đâu ra?"   ← 📥 📐 ⇄ ⇆ 📜
 *   📏 RECON  "WMS lệch bao nhiêu, phải chuyển kho bao nhiêu?" ← 📏 🔍
 *   🧮 SPLIT  "tách khối lượng này ra C3/C4"            ← 🧮 📤 🔀
 *   Cả ba mở CÙNG một bảng, chỉ khác tab mở sẵn.
 *
 * ⚠ NGUYÊN TẮC CỦA BẢN NÀY: KHÔNG DI CHUYỂN DOM CỦA CÁC MODAL CŨ.
 *   Bảng này tự vẽ phần TÓM TẮT (số liệu đọc từ INV) và mở nguyên các
 *   modal sẵn có khi cần thao tác. Bê thân modal vào đây là rước lại đúng
 *   họ lỗi đã dính ba lần: chuyển element đang focus sang cha khác (v4.114),
 *   và đặt UI tương tác vào vùng bị render đè (v4.110).
 *   z-index 190 < 200 của .modal-bg ⇒ modal con luôn nằm TRÊN bảng này.
 *
 * Global: window.TKC      Khởi tạo: TKC.init() trong boot (sau SCX2)
 * ============================================================ */
const TKC = (function(){
  'use strict';

  const SLOC   = { 1:'2100', 2:'2101' };
  const NUM    = { '2100':1, '2101':2 };
  const TKNAME = { '2100':'TK-3501', '2101':'TK-3502' };
  const TABS   = ['stock','recon','split'];

  let _sloc = '2100';
  let _tab  = 'stock';
  let _lotQ = '';          /* v4.165 — ô tìm lot của bảng tick "Batches on top" */
  /* giá trị nạp vào mấy ô nhập SAU khi innerHTML dựng xong — ô sinh ra rỗng,
     điền bằng .value chứ KHÔNG nhét vào chuỗi HTML (nhét vào chuỗi thì mỗi
     lượt vẽ lại là một lần ghi đè thứ người ta đang gõ). */
  let _pending  = { stock:null, sys:null, wms:null, exp:null };
  /* v4.150 — phép tách một con số đã bỏ; biến này giữ rỗng cho mã cũ */
  let _splitTSV = '';
  let _expDay   = '';        /* DD/MM/YY — ngày của bảng export, rỗng = hôm nay */

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                                     .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function num(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }
  function kg(v){
    if(v === null || v === undefined || !isFinite(v)) return '—';
    return Math.round(v).toLocaleString('en-US');
  }
  function sgn(v){
    if(v === null || v === undefined || !isFinite(v)) return '—';
    const r = Math.round(v);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('en-US');
  }

  /* ── mở một modal cũ, giữ nguyên bảng này ở dưới ── */
  function go(fn, sloc){
    try{
      if(typeof INV !== 'undefined' && INV.view) INV.view(sloc || _sloc);
      fn();
    }catch(e){ console.warn('[TKC] go', e); }
  }
  const act = {
    init  : ()=> go(()=> INV.openInit()),
    wt    : ()=> go(()=> INV.openWt()),
    cavern: ()=> go(()=> INV.openCavern()),
    xfer  : ()=> go(()=> INV.openXfer()),
    hist  : ()=> go(()=> INV.openHistory()),
    stx   : ()=> go(()=> INV.openStx(NUM[_sloc])),
    wms   : ()=> go(()=> INV.openWms(NUM[_sloc])),
    split : ()=> go(()=> INV.openSplit()),
    expo  : ()=> go(()=> INV.openExport()),
    xsplit: ()=> { try{ XSPLIT.open(_sloc); }catch(e){ console.warn('[TKC] xsplit', e); } }
  };
  function run(k){ if(act[k]) act[k](); }

  /* ⚠ v4.146 — GIẢI THÍCH ĐI VÀO TOOLTIP, KHÔNG IN RA BẢNG.
     User: "các giải thích thì không cần viết hiện ra ngoài mà khi trỏ chuột
     chỉ vào đó thì hiện ra." Bảng chỉ còn nhãn + số. */
  function _row(cls, label, tip, c3, c4, tot, tail, ids){
    const k = ids || {};
    const at = x => x ? (' id="' + x + '"') : '';
    return '<tr class="' + (cls||'') + '">'
      + '<td class="lbl"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + label + '</td>'
      + '<td class="n c3"' + at(k.c3)  + '>' + c3  + '</td>'
      + '<td class="n c4"' + at(k.c4)  + '>' + c4  + '</td>'
      + '<td class="n tot"' + at(k.tot) + '>' + tot + '</td>'
      + '<td class="src">' + (tail || '') + '</td></tr>';
  }
  function _inp(id, ph, tip, handler, cls){
    return '<input class="tkc-inp' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="text"'
         + ' inputmode="decimal" autocomplete="off" placeholder="' + esc(ph) + '"'
         + (tip ? ' title="' + esc(tip) + '"' : '')
         + (handler ? ' oninput="TKC.' + handler + '()"' : '') + '>';
  }
  function _txt(id, ph, tip){
    return '<input class="tkc-inp tkc-note-inp" id="' + id + '" type="text" autocomplete="off"'
         + ' placeholder="' + esc(ph) + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>';
  }
  function _btn(label, call, tip, cls){
    return '<button class="tkc-mini' + (cls ? ' ' + cls : '') + '" onclick="TKC.' + call + '"'
         + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + label + '</button>';
  }
  function _chip(kind, txt, tip){
    return '<span class="tkc-chip k-' + kind + '"' + (tip ? ' title="' + esc(tip) + '"' : '')
         + '>' + esc(txt) + '</span>';
  }
  const MARK = { user:'✎', app:'ƒ', none:'⚠' };
  /* rút gọn "LPG-2026-410" → "410" cho chật chỗ, tooltip giữ tên đủ */
  function _shortLot(l){ return String(l||'').replace(/^LPG-\d{4}-/i, ''); }
  function _lotTag(W){
    if(!W) return '';
    const L = W.lot || (W.mixLots && W.mixLots.length === 1 ? W.mixLots[0] : '');
    if(!L) return (W.mixLots && W.mixLots.length > 1)
      ? ' <span class="tkc-lottag" title="' + esc(W.mixLots.join(' · ')) + '">'
        + W.mixLots.length + ' lots</span>' : '';
    return ' <span class="tkc-lottag" title="' + esc('Lot ' + L) + '">lot ' + esc(_shortLot(L)) + '</span>';
  }
  /* ⭐ v4.155 — Ô CHỌN LOT = <select> + ô gõ tay.
     Bản cũ dùng <input list> + <datalist>: đã chọn một lot thì trình duyệt LỌC
     danh sách theo chữ đang có ⇒ chỉ còn đúng lot đó, không chọn lại được lot
     khác (user báo "lỡ bấm không chọn lại được"). <select> luôn hiện ĐỦ danh
     sách + dòng "auto" để quay về; ô bên cạnh để gõ lot không có trong danh
     sách (Enter hoặc rời ô là áp dụng). */
  function _lotPicker(id, list, cur, pickCall, typeCall, autoTxt, tip){
    const L = (list || []).slice();
    const c = String(cur || '');
    const inList = !c || L.some(function(x){ return x === c; });
    let o = '<option value="">' + esc(autoTxt) + '</option>';
    L.forEach(function(x){
      o += '<option value="' + esc(x) + '"' + (x === c ? ' selected' : '') + '>' + esc(x) + '</option>';
    });
    if(!inList) o += '<option value="' + esc(c) + '" selected>' + esc(c) + ' (typed)</option>';
    return '<select class="tkc-sel tkc-lotsel" id="' + id + 'Sel"'
         +   (tip ? ' title="' + esc(tip) + '"' : '')
         +   ' onchange="TKC.' + pickCall + '(this.value)">' + o + '</select>'
         + '<input class="tkc-inp tkc-lot" id="' + id + '" type="text" autocomplete="off"'
         +   ' placeholder="type lot" title="' + esc('Type a lot number (e.g. 413) and press Enter.') + '"'
         +   ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}"'
         +   ' onchange="TKC.' + typeCall + '()">';
  }
  /* Áp dụng lot rồi VẼ LẠI NGAY. Lỗi cũ: onchange chạy khi ô lot còn focus ⇒
     render() thấy _busy() và bỏ qua ⇒ chọn/gõ lot mà bảng không đổi gì.
     Rời focus khỏi ô lot trước; nếu focus đã sang một ô nhập khác thì đợi ô
     đó rời đi mới vẽ (không huỷ chữ đang gõ). */
  function _lotApplied(){
    try{
      const a = document.activeElement;
      if(a && /^tkc(ReconLot|WtLot)/.test(String(a.id || '')) && typeof a.blur === 'function') a.blur();
      const b = document.activeElement;
      if(b && b.tagName === 'INPUT' && String(b.id || '').indexOf('tkc') === 0
         && typeof b.addEventListener === 'function'){
        b.addEventListener('blur', function(){ setTimeout(render, 0); }, { once:true });
        return;
      }
    }catch(_){}
    render();
  }
  /* khoá Firebase chỉ có A-Za-z0-9_- nên ghép thẳng vào id là an toàn */
  const _idk = k => String(k || 'New').replace(/[^A-Za-z0-9_-]/g, '');
  function _hm(ts){
    const d = new Date(+ts || 0), p = n => String(n).padStart(2,'0');
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ══ TAB 1 — STOCK ══════════════════════════════════════════════════
     v4.147 — cavern receipt và inter-tank transfer nay là DÒNG NHẬP ngay
     trong sổ: mỗi bút toán đã lưu là một dòng sửa được (Save / 🗑) và luôn
     có một dòng trống ở cuối để thêm mới. Không còn mở hộp thoại nào. */
  function _entryRow(pfx, key, label, tip, isNew, delCall){
    const id = pfx + _idk(key);
    const save = (pfx === 'tkcCav')
      ? ("cavSave('" + (key||'') + "')") : ("xfSave('" + (key||'') + "')");
    return '<tr class="r-sub' + (isNew ? ' r-new' : '') + '">'
      + '<td class="lbl sub"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + label + '</td>'
      + '<td class="n">' + _inp(id + 'C3', 'C3 kg', 'C3 in kg', '') + '</td>'
      + '<td class="n">' + _inp(id + 'C4', 'C4 kg', 'C4 in kg', '') + '</td>'
      + '<td class="n">' + _txt(id + 'Note', 'note', 'Optional note kept with this entry') + '</td>'
      + '<td class="src">'
      +   _btn(isNew ? 'Add' : 'Save', save,
              isNew ? 'Record this entry' : 'Overwrite the saved figures of this entry')
      +   (isNew ? '' : ' ' + _btn('🗑', delCall, 'Delete this entry', 'dg'))
      + '</td></tr>';
  }

  function _paneStock(){
    let c = null, W = null, H = [];
    try{ c = INV.stockFor(_sloc); }catch(_){}
    try{ W = INV.wmsWt(_sloc); }catch(_){}
    try{ H = INV.histFor(_sloc) || []; }catch(_){}
    if(!c) return '<div class="tkc-empty">Inventory module is not ready yet.</div>';

    const kind = W ? (W.kind || 'app') : 'app';
    const xn3 = num(c.xIn.c3) - num(c.xOut.c3);
    const xn4 = num(c.xIn.c4) - num(c.xOut.c4);
    const cavT = num(c.cav.c3) + num(c.cav.c4);
    const giT  = num(c.gi.c3)  + num(c.gi.c4);
    const stT  = num(c.stn.c3) + num(c.stn.c4);
    const other = _sloc === '2100' ? 'TK-3502' : 'TK-3501';
    const P = { init:{ c3:c.hasInit ? Math.round(num(c.c3Init)) : '',
                       c4:c.hasInit ? Math.round(num(c.c4Init)) : '',
                       wt:(W && isFinite(W.wt)) ? W.wt : '',
                       lot:(function(){ try{ return INV.wtLotGet(_sloc); }catch(_){ return ''; } })() },
                cav:{}, xf:{} };

    let h = '<div class="tblwrap"><table class="tkc-led">'
      + '<thead><tr><th>Movement</th><th>C3 (kg)</th><th>C4 (kg)</th><th>Total / note</th><th></th></tr></thead><tbody>';

    /* ⭐ v4.152 — TỒN ĐẦU giờ do app tự lấy, nên DÁNG Ô phải nói ngay số
       đang hiện là của app hay của người: ƒ xanh nét đứt = app lấy từ SAP
       D-1 / trạng thái finish của mẻ; ✎ hổ phách = nhân viên gõ đè; ⚠ đỏ =
       chưa có gì. Nút ↺ lấy lại số của app khi gõ nhầm — không phải mở SAP
       ra tra lại. */
    let I = null, A = null;
    try{ I = INV.initInfoFor(_sloc); }catch(_){}
    try{ A = INV.autoInitPick(_sloc); }catch(_){}
    P.init.auto = !!(I && I.auto);
    const iKind = !c.hasInit ? 'none' : ((I && I.auto) ? 'app' : 'user');
    const iSrcTxt = !c.hasInit ? 'NOT SET'
                  : (I && I.auto) ? (I.src === 'mix' ? 'MIX FINISH STATE'
                                     : I.src === 'sapfill' ? 'SAP D-1 + FILLED COQ'
                                     : 'SAP END STOCK D-1')
                  : 'YOU TYPED IT';
    const iTip = !c.hasInit
      ? ((A && A.ok) ? 'The app can take this from ' + A.txt + ' — press ↺.'
                     : 'The app has nothing to take (' + ((A && A.txt) || 'no data')
                       + '). Type the C3/C4 this tank starts the day with, then press Save.')
      : (I && I.auto)
        ? 'Taken by the app from ' + (I.txt || I.src)
          + '. Type over it and press Save whenever it is wrong — yours always wins after that.'
        : 'Entered by ' + ((I && I.by) || 'a user')
          + '. Press ↺ to go back to the figure the app works out.';
    const iField = id => '<span class="tkc-wtfld k-' + iKind + '">'
                       + '<span class="mk">' + (MARK[iKind]||'') + '</span>'
                       + _inp(id, id.slice(-2) + ' kg', '', 'initEdit') + '</span>';
    h += '<tr class="r-edit"><td class="lbl" title="' + esc(iTip) + '">Initial stock</td>'
      + '<td class="n">' + iField('tkcInitC3') + '</td>'
      + '<td class="n">' + iField('tkcInitC4') + '</td>'
      + '<td class="n tot"><span id="tkcInitTot">'
      +   (c.hasInit ? kg(num(c.c3Init)+num(c.c4Init)) : '—') + '</span> '
      +   _chip(iKind, iSrcTxt, iTip)
      +   ((I && I.lot) ? ' <span class="tkc-lottag" title="' + esc('Lot ' + I.lot) + '">lot '
                          + esc(_shortLot(I.lot)) + '</span>' : '')
      + '</td>'
      + '<td class="src">'
      +   _btn('Save','initSave()','Save the initial stock for today — written with your name and shown in History.')
      +   ((A && A.ok) ? ' ' + _btn('↺','initReset()', 'Take it again from ' + A.txt) : '')
      + '</td></tr>';

    /* ⭐ v4.165 — TICK LOT: lớp người dùng đè lên suy đoán của app.
       Chuyện "End Stock SAP đã gồm lot nào" đã qua ba đời luật mà lần nào
       cũng có một ca thật làm nó sai, vì đây là chuyện NGƯỜI biết chứ máy
       không suy chắc được. Nên cho tick thẳng: tick = SAP CHƯA có lot này
       ⇒ cộng thêm vào tồn đầu; bỏ tick = SAP đã có ⇒ không cộng. Không
       đụng tới thì app tự chạy như thường (dấu ƒ). */
    const LA = (function(){ try{ return INV.lotAddList(_sloc, null, _lotQ) || []; }
                            catch(_){ return []; } })();
    const laOn  = LA.filter(function(x){ return x.on; });
    const laOff = LA.filter(function(x){ return !x.on; }).slice(0, 20);
    const laTip = 'The batches counted into this tank right now. A batch that finished BEFORE today '
                + 'opened is added on top of the SAP End Stock; one that finished TODAY is added as a '
                + 'cavern receipt. Untick to drop a batch, or pick one from the list on the right to '
                + 'add it. Saved the moment you click \u2014 no Save button. The \u0192 mark means the app '
                + 'chose it; \u21ba hands the choice back to the app.';
    const laChip = function(x){
      const own = x.ov !== null;
      return '<label class="tkc-lotchk' + (own ? ' own' : '') + (x.today ? ' now' : '') + '"'
           + ' title="' + esc('Lot ' + x.lot + (x.when ? ' \u00b7 finished ' + x.when : '')
               + (x.filled !== null ? ' \u00b7 filled ' + x.filled.toLocaleString('en-US') + ' kg'
                                    : ' \u00b7 no COQ figure yet')
               + ' \u00b7 ' + (x.today ? 'finished today \u2014 counted as a cavern receipt'
                                      : 'added on top of the SAP End Stock')
               + ' \u00b7 ' + (own ? 'you set this' : 'the app chose this (\u0192)')) + '">'
           + '<input type="checkbox" checked'
           + ' onchange="TKC.lotAdd(\'' + esc(x.lot) + '\', this.checked)">'
           + '<b>' + esc(_shortLot(x.lot)) + '</b>'
           + (x.today ? '<span class="tg">today</span>' : '')
           + '<span class="d">' + esc(x.when || '') + '</span>'
           + (x.filled !== null ? '<span class="d">' + x.filled.toLocaleString('en-US') + '</span>' : '')
           + (own ? '<span class="rst" title="Back to the app\u2019s own choice"'
                    + ' onclick="event.preventDefault();TKC.lotAdd(\'' + esc(x.lot) + '\', null)">\u21ba</span>'
                  : '<span class="mk">\u0192</span>')
           + '</label>';
    };
    const laItems = laOn.length ? laOn.map(laChip).join('')
      : '<span class="tkc-lotnone">No batch added \u2014 the SAP End Stock stands on its own</span>';
    /* Danh sách thả xuống: các mẻ CHƯA được cộng, mới nhất trước. Chọn một
       cái là cộng luôn và lưu luôn — không có nút Save cho hàng này. */
    let laOpts = '<option value="">' + esc(laOff.length ? '\uff0b add batch\u2026'
                                                       : (_lotQ ? 'no match' : 'nothing to add')) + '</option>';
    laOff.forEach(function(x){
      laOpts += '<option value="' + esc(x.lot) + '">' + esc(_shortLot(x.lot))
             + ' \u00b7 ' + esc(x.when || '')
             + (x.filled !== null ? ' \u00b7 ' + x.filled.toLocaleString('en-US') : '')
             + (x.today ? ' \u00b7 today' : '') + '</option>';
    });
    h += '<tr class="r-edit"><td class="lbl" title="' + esc(laTip) + '">Batches added</td>'
      + '<td class="n" colspan="3"><div class="tkc-lotchks">' + laItems + '</div></td>'
      + '<td class="src"><div class="tkc-lotadd">'
      +   '<select class="tkc-sel tkc-lotsel" id="tkcLotAddSel"'
      +     ' title="' + esc('Batches of this tank that are NOT counted in, newest first. '
                           + 'Pick one to add it \u2014 it is saved straight away.') + '"'
      +     ' onchange="TKC.lotPick(this.value)">' + laOpts + '</select>'
      +   '<input class="tkc-inp tkc-lot" id="tkcLotQ" type="text" autocomplete="off"'
      +     ' value="' + esc(_lotQ) + '" placeholder="search lot"'
      +     ' title="' + esc('Type a lot number (e.g. 413) and press Enter to reach batches older than '
                           + '30 days. Clear it to go back to the recent ones.') + '"'
      +     ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}"'
      +     ' onchange="TKC.lotSearch(this.value)">'
      + '</div></td></tr>';

    h += '<tr class="r-edit"><td class="lbl" title="'
      +   esc('The C3 share WMS holds for this tank — what WMS uses to split any LPG quantity. '
            + 'Left alone the app works it out from the initial stock plus the adjusted transfer '
            + 'of the overnight mix. Type here to state it yourself; yours always wins.')
      +   '">%wt C3 — WMS basis</td>'
      + '<td class="n"><span class="tkc-wtfld k-' + kind + '">'
      +   '<span class="mk">' + (MARK[kind]||'') + '</span>'
      +   _inp('tkcWt','%','','wtEdit') + '<span class="pc">%</span></span></td>'
      /* ⭐ v4.148 — ô chọn LOT: %wt này là của mẻ nào. onchange chứ không
         oninput — gõ giữa chừng mà vẽ lại là mất ô. */
      + '<td class="n"><span class="tkc-lotpick">'
      +   _lotPicker('tkcWtLot',
            (function(){ try{ return INV.wtLotList(_sloc) || []; }catch(_){ return []; } })(),
            P.init.lot, 'wtLotPick', 'wtLot', 'all lots (auto)',
            'Which lot this %wt belongs to. Auto adds every mix already transferred onto this '
            + 'tank; pick or type a lot to use that mix only.')
      + '</span></td>'
      + '<td class="n tot">' + _chip(kind, W ? (W.src||'') : '', W ? W.srcTxt : '')
      +   _lotTag(W) + '</td>'
      + '<td class="src">' + _btn('Save','wtSave()','Save this %wt C3 for the tank.') + '</td></tr>';

    h += _row('r-grp', '+ Cavern receipt',
              'C3/C4 brought up from the cavern into this tank today.',
              cavT ? kg(c.cav.c3) : '—', cavT ? kg(c.cav.c4) : '—', cavT ? kg(cavT) : '—', '');
    H.filter(function(e){ return e.type === 'cavern'; }).forEach(function(e){
      P.cav[_idk(e._k)] = { c3:Math.round(num(e.c3)), c4:Math.round(num(e.c4)), note:e.note||'' };
      /* v4.154 — dòng app tự ghi khi mẻ xong trong ngày: dấu ƒ + lot */
      const autoLbl = e.auto ? 'ƒ app' + (e.lot ? ' · lot ' + esc(_shortLot(e.lot)) : '') + ' · ' : '';
      h += _entryRow('tkcCav', e._k, autoLbl + _hm(e.ts) + (e.by && !e.auto ? ' · ' + esc(e.by) : ''),
                     (e.auto ? 'Added by the app: ' + (e.note || 'mix finished today') + '. ' : '')
                       + 'Recorded ' + _hm(e.ts) + (e.by ? ' by ' + e.by : '')
                       + '. Change the figures and press Save — once you do, the app leaves it alone.',
                     false, "cavDel('" + e._k + "')");
    });
    h += _entryRow('tkcCav', '', 'new receipt',
                   'Type the C3/C4 brought up from the cavern and press Add.', true, '');

    h += _row('r-grp', '± Inter-tank transfer',
              'Net moved between the two tanks today: minus on the tank that gave, plus on the tank that took.',
              (xn3||xn4) ? sgn(xn3) : '—', (xn3||xn4) ? sgn(xn4) : '—',
              (xn3||xn4) ? sgn(xn3+xn4) : '—', '');
    const seen = {};
    H.filter(function(e){ return e.type === 'xfer'; }).forEach(function(e){
      const pid = e._pairId || e._k;
      if(seen[pid]) return; seen[pid] = 1;
      const out = (e.fromSl === _sloc);
      P.xf[_idk(pid)] = { c3:Math.round(num(e.c3)), c4:Math.round(num(e.c4)), note:e.note||'' };
      h += _entryRow('tkcXf', pid,
                     (out ? '→ ' : '← ') + esc(out ? TKNAME[e.toSl] : TKNAME[e.fromSl]),
                     (out ? 'This tank gave it away. ' : 'This tank took it in. ')
                       + 'Recorded ' + _hm(e.ts) + (e.by ? ' by ' + e.by : '')
                       + '. To flip the direction, delete it and add it the other way.',
                     false, "xfDel('" + e._k + "','" + pid + "')");
    });
    h += '<tr class="r-sub r-new"><td class="lbl sub" title="'
      +   esc('Pick the direction, type the C3/C4 and press Add. Both tanks are written in one go.')
      +   '"><select class="tkc-sel" id="tkcXfNewDir">'
      +   '<option value="out">&#8594; ' + esc(other) + '</option>'
      +   '<option value="in">&#8592; ' + esc(other) + '</option></select></td>'
      + '<td class="n">' + _inp('tkcXfNewC3','C3 kg','C3 in kg','') + '</td>'
      + '<td class="n">' + _inp('tkcXfNewC4','C4 kg','C4 in kg','') + '</td>'
      + '<td class="n">' + _txt('tkcXfNewNote','note','Optional note kept with this entry') + '</td>'
      + '<td class="src">' + _btn('Add', "xfSave('')", 'Record this transfer on both tanks') + '</td></tr>';

    /* ⭐⭐⭐ v4.170 — mẻ trong ngày đã có COQ ⇒ tồn đi theo END của Tank Log.
       Dòng này là phần bù RAM để cột vẫn cộng đúng, KHÔNG phải bản ghi —
       không có nút Save / 🗑 vì không có gì trên Firebase để sửa hay xoá. */
    if(c.cavApp){
      const A = c.cavApp, aT = num(A.c3) + num(A.c4);
      h += _row('r-sub', '+ From cavern · lot ' + esc(_shortLot(A.lot)),
                'Worked out in memory, not stored: the app takes the END STATE of batch '
              + A.lot + ' from the Tank Log (' + kg(num(A.endC3) + num(A.endC4)) + ' kg measured) '
              + 'and deducts what has already been loaded from that batch ('
              + kg(num(A.soldC3) + num(A.soldC4)) + ' kg, ' + A.rows + ' truck(s) in TL Data). '
              + 'This line is whatever it takes for the column to land on that figure. '
              + 'Every machine works it out for itself from the same Tank Log and TL Data — '
              + 'nothing is written to the database, so two machines can never overwrite each other. '
              + 'Untick the batch above to go back to plain bookkeeping.',
                sgn(A.c3), sgn(A.c4), sgn(aT),
                _chip('app','f app','Worked out by the app in memory — not stored, not entered by anyone.'));
    }
    h += _row('', '- Sold today',
              'Net weight of every truck loaded from this tank today, taken from TL Data.',
              giT ? sgn(-c.gi.c3) : '—', giT ? sgn(-c.gi.c4) : '—', giT ? sgn(-giT) : '—',
              _chip('app','f app','Worked out by the app from TL Data — not entered by anyone.'));
    h += _row('', '- Loading now',
              'Trucks on a bay drawing from this tank right now. The figure disappears once the truck finishes and its real net weight lands in TL Data.',
              stT ? sgn(-c.stn.c3) : '—', stT ? sgn(-c.stn.c4) : '—', stT ? sgn(-stT) : '—',
              _chip('app','f app','Worked out by the app from the bays — not entered by anyone.'));

    h += '<tr class="r-sum"><td class="lbl" title="'
      +   esc('Initial stock plus everything received, minus everything sold and being loaded.')
      +   '">Live stock</td>'
      + '<td class="n c3">' + (c.hasInit ? kg(c.c3Cur) : '—') + '</td>'
      + '<td class="n c4">' + (c.hasInit ? kg(c.c4Cur) : '—') + '</td>'
      + '<td class="n tot">' + (c.hasInit ? kg(c.lpg) : '—') + '</td><td class="src"></td></tr>'
      + '</tbody></table></div>'
      + '<div class="tkc-acts">'
      +   '<span class="tkc-legend" title="' + esc('Amber with a pencil is a figure a person entered; '
          + 'it always wins over the dashed blue one the app worked out.') + '">&#9998; entered &nbsp;&middot;&nbsp; f app</span>'
      +   '<button class="btn" onclick="TKC.run(\'hist\')">&#128220; History today</button>'
      + '</div>';
    _pending.stock = P;
    return h;
  }

  /* ══ TAB 2 — RECON ══════════════════════════════════════════════════ */
  function _paneRecon(){
    let F = null, saved = null;
    try{ F = INV.stxFigures(_sloc); }catch(_){}
    try{ saved = INV.stxSavedOf(INV.stxCtx(_sloc)); }catch(_){}

    if(!F || !F.ok){
      _pending.sys = { c3:'', c4:'', lot:(F && F.lot) || '',
                       lotIn:(function(){ try{ return INV.stxGetLot(_sloc); }catch(_){ return ''; } })() };
      return _reconLotBar(F, saved) + '<div class="tkc-note warn">'
        + (F && F.why === 'no-coq'
            ? 'Lot <b>' + esc(F.lot || '—') + '</b> has no COQ basis yet ('
              + esc(F.miss || '') + ') — run &#9672; CALC COQ on it in the Tank Log.'
            : 'No Tank Log row found for this tank yet, so there is nothing to reconcile.')
        + '</div>' + _wmsBlock() + _reconCards();
    }

    const tagTip = { sap:'Taken from the SAP End Stock of the matching day.',
                     manual:'Typed by an operator — kept on this machine only until you press Save. '
                            + 'The same figure is on the Tank Mix notification; editing it in either place changes both.',
                     'sap-missing':'The SAP End Stock for that day has not been pasted yet — type it in.',
                     'manual-required':'Mixing finished inside operating hours, so the day End Stock is not the initial balance for this transfer — type it in.',
                     none:'' }[F.sysTag] || '';

    const h = _reconLotBar(F, saved)
      + '<div class="tblwrap"><table class="tkc-led">'
      + '<thead><tr><th>Reconciliation</th><th>C3 (kg)</th><th>C4 (kg)</th><th>Total</th><th></th></tr></thead><tbody>'
      + _row('', 'Actual initial stock',
             'INIT VOL measured in the tank × the COQ density and %wt C3 of the lot that was in it.',
             kg(F.aOpC3), kg(F.aOpC4), kg(F.aOpC3 + F.aOpC4), '')
      + '<tr class="r-edit"><td class="lbl" title="'
      +   esc('What WMS holds for this tank at the start of the mix. The app fills it from the SAP End '
            + 'Stock by itself, but only when mixing finished outside 08:00-19:00 — inside operating '
            + 'hours that day End Stock is not the initial balance, so type it here. You can always overwrite it.')
      +   '">WMS initial stock</td>'
      + '<td class="n">' + _inp('tkcSysC3','C3 kg','WMS initial C3 in kg','sysEdit') + '</td>'
      + '<td class="n">' + _inp('tkcSysC4','C4 kg','WMS initial C4 in kg','sysEdit') + '</td>'
      + '<td class="n tot" id="tkcSysTot">' + (F.hasSys ? kg(F.sysC3 + F.sysC4) : '—') + '</td>'
      + '<td class="src">' + _chip(F.sysManual ? 'user' : (F.hasSys ? 'app' : 'none'),
                                   (F.sysManual ? '✎ ' : F.hasSys ? 'ƒ ' : '⚠ ') + (F.sysTag||''), tagTip)
      +   (F.sysManual ? ' <a href="#" onclick="TKC.sysReset();return false" title="'
                         + esc('Drop what was typed and go back to the SAP figure.') + '">&#8634;</a>' : '')
      + '</td></tr>'
      + _row('', 'Gap at initial', 'Actual minus WMS at the start of the mix.',
             sgn(F.gapC3), sgn(F.gapC4), F.hasSys ? sgn(F.gapC3 + F.gapC4) : '—', '',
             { c3:'tkcGap3', c4:'tkcGap4', tot:'tkcGapT' })
      + _row('', 'Filled ◈COQ', 'C3/C4 of this lot from the official COQ figures on the Tank Log.',
             kg(F.fC3), kg(F.fC4), kg(F.fC3 + F.fC4), '')
      /* ⭐ v4.150 — HAI NỀN %wt ĐỨNG CẠNH NHAU.
         User: "ở recon hiển thị ĐỦ %wt theo COQ, %wt theo WMS của lot này (có
         phân biệt được %wt là app tính toán hay user nhập)". Hai số này lệch
         nhau là chuyện thường — COQ là của MẺ, WMS là của CẢ BỒN — nên phải
         nhìn thấy cả hai ở cùng một chỗ mới biết đang lệch bao nhiêu. */
      + _wtPairRows(F)
      + _row('', 'Actual end stock',
             'FINAL VOL measured after the mix × the COQ density and %wt C3 of this lot.',
             kg(F.aClC3), kg(F.aClC4), kg(F.aClC3 + F.aClC4), '')
      /* ⭐ dòng KẾT QUẢ — đây là con số nhân viên gõ vào WMS, nên nó phải
         nổi hẳn lên chứ không nằm ngang hàng với mấy dòng trung gian. */
      + '<tr class="r-hero"><td class="lbl" title="'
      +   esc('Actual end stock minus WMS initial stock. Post THIS on the WMS stock transfer instead of '
            + 'the notified COQ figure: the WMS end stock then lands exactly on the measured one and the '
            + 'gap is cleared in the same posting instead of carrying forward.')
      +   '">&#9658; Adjusted qty for WMS ST</td>'
      + '<td class="n c3" id="tkcAdj3">' + kg(F.xC3) + '</td>'
      + '<td class="n c4" id="tkcAdj4">' + kg(F.xC4) + '</td>'
      + '<td class="n tot" id="tkcAdjT">' + (F.hasSys ? kg(F.xC3 + F.xC4) : '—') + '</td>'
      + '<td class="src">' + _btn('&#128190; Save','stxSave()','Write the gap and this quantity onto the lot in the Tank Log.') + '</td></tr>'
      + '</tbody></table></div>'
      + '<div class="tkc-warn' + (F.hasSys ? ' off' : '') + '" id="tkcSysWarn">'
      +   esc(F.hasSys ? '' : 'Type the WMS initial stock above to get the quantity to post.') + '</div>';

    _pending.sys = { c3:(F.sysC3 === null ? '' : Math.round(F.sysC3)),
                     c4:(F.sysC4 === null ? '' : Math.round(F.sysC4)), lot:F.lot,
                     lotIn:(function(){ try{ return INV.stxGetLot(_sloc); }catch(_){ return ''; } })() };
    return h + _wmsBlock() + _reconCards();
  }

  /* ⭐ v4.151 — THANH CHỌN LOT CỦA TAB RECON.
     Trước đây tab này in tên lot ra như chữ chết, luôn là lot MỚI NHẤT mà app
     tự dò — user không đổi được sang mẻ khác để đối chiếu. Nay là ô gõ được,
     có gợi ý các lot của chính bồn đó, và dùng CHUNG biến `_stxLotIn` với
     bảng ⚖ đầy đủ ⇒ đổi bên nào bên kia cũng theo.
     ⚠ onchange chứ KHÔNG oninput — gõ giữa chừng mà vẽ lại là mất ô. */
  function _reconLotBar(F, saved){
    let typed = '', list = [];
    try{ typed = INV.stxGetLot(_sloc) || ''; }catch(_){}
    try{ list  = INV.stxLotList(_sloc) || []; }catch(_){}
    const srcTxt = { typed:'typed in', notify:'from the mix notification', scale:'from the tank card',
                     latest:'the latest lot in the Tank Log', given:'from the notification',
                     none:'no lot' }[(F && F.ctx) ? F.ctx.lotSrc : ''] || '';
    return '<div class="tkc-lotbar">'
      + '<span class="k" title="' + esc('Which lot this reconciliation is about. Leave it empty and the '
          + 'app takes the lot it can work out — a pending mix notification first, then the lot on the '
          + 'tank card, then the latest lot in the Tank Log. Type a lot to work on an older mix. '
          + 'The full reconciliation table uses the same choice.') + '">Lot</span>'
      + _lotPicker('tkcReconLot', list, typed, 'reconLotPick', 'reconLot', 'auto',
                   'Pick a lot, or go back to auto (the lot the app works out).')
      + '<b>' + esc((F && F.lot) ? F.lot : '—') + '</b>'
      + (typed ? _chip('user','✎ typed', 'You picked this lot yourself — clear the box to go back to auto.')
               : (srcTxt ? _chip('app','ƒ ' + srcTxt, 'The app worked this lot out: ' + srcTxt + '.') : ''))
      + (saved && saved.has ? ' ' + _chip('user','saved on this lot', saved.txt) : '')
      + '</div>';
  }

  /* Hai dòng nền %wt của tab Recon — xem chú thích ở chỗ gọi. */
  function _wtPairRows(F){
    const s3 = (F && F.ctx && F.ctx.split && F.ctx.split.fW3 != null)
             ? Math.round(F.ctx.split.fW3 * 10000) / 100 : null;
    let W = null;
    try{ W = INV.wmsWt(_sloc); }catch(_){}
    const kind = W ? (W.kind || 'app') : 'app';
    const wv   = (W && isFinite(W.wt)) ? W.wt : null;
    const gap  = (s3 !== null && wv !== null) ? (wv - s3) : null;
    const pill = (k, txt, tip) =>
      '<span class="tkc-wtpill k-' + k + '" title="' + esc(tip) + '">'
      + (MARK[k] || '') + ' ' + txt + '</span>';
    return '<tr class="r-wt"><td class="lbl" title="'
      +   esc('COQ is the %wt C3 of the MIX that was just made — it comes from the lot certificate. '
            + 'WMS is the %wt C3 of the WHOLE TANK, rounded to a whole number, which is what WMS uses '
            + 'to split any LPG quantity. The two differ on purpose; the pencil marks the one a person typed.')
      +   '">%wt C3 — COQ vs WMS</td>'
      + '<td class="n" colspan="2">'
      +   pill('coq', (s3 === null ? '—' : s3 + ' %') + ' COQ',
               'From the COQ of lot ' + (F && F.lot ? F.lot : '—') + ' — the mix that was just made.')
      +   ' ' + pill(kind, (wv === null ? '—' : wv + ' %') + ' WMS',
               W ? W.srcTxt : 'No WMS basis available.')
      + '</td>'
      + '<td class="n tot">' + (gap === null ? '—'
            : ((gap > 0 ? '+' : gap < 0 ? '\u2212' : '') + Math.abs(Math.round(gap*100)/100) + ' pt'))
      + '</td><td class="src"></td></tr>';
  }

  /* ── 🔍 WMS stock check: gọn nên đưa thẳng ra bảng ngoài (v4.147) ── */
  function _wmsBlock(){
    let F = null, g = {};
    try{ F = INV.wmsFigures(_sloc); }catch(_){}
    try{ g = INV.wmsGet(_sloc) || {}; }catch(_){}
    _pending.wms = { vol:g.vol || '', c3:g.c3 || '', c4:g.c4 || '' };
    const ok = !!(F && F.ok);
    return '<div class="tkc-sub2" title="'
      +   esc('A spot check: type the volume you have just measured and the C3/C4 the WMS shows now. '
            + 'It gives the gap and the exact stock transfer to post, with its direction.')
      +   '">WMS stock check</div>'
      + '<div class="tblwrap"><table class="tkc-led"><thead><tr>'
      +   '<th>Spot check</th><th>C3 (kg)</th><th>C4 (kg)</th><th>LPG (kg)</th><th></th>'
      + '</tr></thead><tbody>'
      + '<tr class="r-edit"><td class="lbl" title="' + esc('The tank volume you have just measured, in m3.')
      +   '">Measured volume</td>'
      + '<td class="n" colspan="2">' + _inp('tkcWv','m3','Measured volume in m3','wmsChk') + '</td>'
      + '<td class="n tot"></td><td class="src"></td></tr>'
      /* ⚠ Dòng này tách theo **%wt COQ** chứ KHÔNG phải %wt WMS: đây là hàng
         THỰC có trong bồn, mà thực tế thì theo chứng chỉ của lot. Chính vì
         vậy nó dùng được luôn như một phép tách C3/C4 — nên phép "split một
         con số" riêng ở tab Split đã BỎ (user chốt 15/09). */
      + _row('', 'Actual in tank', 'Measured volume × the COQ density and %wt C3 of the lot in the tank — this is the actual product, so it splits on COQ, not on the rounded WMS %wt.',
             ok ? kg(F.aC3) : '—', ok ? kg(F.aC4) : '—', ok ? kg(F.aL) : '—', '',
             { c3:'tkcWa3', c4:'tkcWa4', tot:'tkcWaL' })
      + '<tr class="r-edit"><td class="lbl" title="' + esc('The C3/C4 the WMS shows for this tank right now.')
      +   '">WMS shows now</td>'
      + '<td class="n">' + _inp('tkcW3','C3 kg','WMS C3 in kg','wmsChk') + '</td>'
      + '<td class="n">' + _inp('tkcW4','C4 kg','WMS C4 in kg','wmsChk') + '</td>'
      + '<td class="n tot" id="tkcWwL">—</td><td class="src">'
      +   _btn('Clear','wmsWipe()','Empty the three boxes above') + '</td></tr>'
      + '<tr class="r-hero"><td class="lbl" title="' + esc('Actual minus WMS. Positive means WMS is too low.')
      +   '">Difference</td>'
      + '<td class="n c3" id="tkcWd3">—</td><td class="n c4" id="tkcWd4">—</td>'
      + '<td class="n tot" id="tkcWdL">—</td><td class="src"></td></tr>'
      + '</tbody></table></div>'
      + '<div id="tkcWact">' + _wmsActHtml(F) + '</div>';
  }
  function _wmsActHtml(F){
    if(!F || !F.ok || !F.hasWms){
      const miss = (F && F.miss && F.miss.length) ? 'Still needed: ' + F.miss.join(' · ')
                                                  : 'Type the measured volume and the WMS figures.';
      return '<div class="tkc-warn">' + esc(miss) + '</div>';
    }
    const one = (mat, diff) => {
      let a = null;
      try{ a = INV.wmsAction(mat, _sloc, diff); }catch(_){}
      if(!a || a.dir === 'na') return '';
      return '<div class="tkc-act d-' + a.dir + '" title="' + esc(a.txt) + '">' + esc(a.head) + '</div>';
    };
    return one('C3', F.dC3) + one('C4', F.dC4);
  }
  function _reconCards(){
    return '<div class="tkc-cards">'
      + _card('&#128207;', 'Full reconciliation table',
              'Both tanks side by side, with the batch D / E split and the copy-out.', 'stx')
      + '</div>';
  }

  /* ══ TAB 3 — EXPORT SPLIT ═══════════════════════════════════════════
     v4.150 — BỎ phép "tách một con số" đứng riêng. User: "khi user nhập vol ở
     WMS stock check thì nó đã chia tách theo %wt COQ rồi, dùng nó để split
     C3/C4 luôn được, nên chức năng split kia là thừa — bỏ đi để lấy thêm chỗ
     cho export split." Cả tab giờ dành cho danh sách xe export. */
  function _paneSplit(){
    let W = null;
    try{ W = INV.wmsWt(_sloc); }catch(_){}
    const wt   = (W && isFinite(W.wt)) ? W.wt : null;
    const kind = W ? (W.kind || 'app') : 'app';

    let X = null;
    try{ X = INV.exportRowsFor(_sloc, _expDay || INV.todayDmy(), W ? W.wt : null); }catch(_){}
    _pending.exp = { day:(X ? X.day : '') };

    /* Tổng CHỈ cộng từ mấy dòng đang tích — và cộng từ SỐ ĐÃ CHỐT của từng
       dòng, không bao giờ tính lại từ tổng LPG (luật v4.75). */
    const rows = (X && X.rows) ? X.rows : [];
    const on   = r => !_expOff[r.key];
    const sel  = rows.filter(on);
    const tot  = sel.reduce((o,r)=>({ lpg:o.lpg+r.lpg, c3:o.c3+r.c3, c4:o.c4+r.c4 }),
                            { lpg:0, c3:0, c4:0 });
    /* lot đang làm nền %wt + mấy lot xuất hiện trên chính danh sách này */
    const lots = [];
    rows.forEach(r=>{ const l = String(r.lot||'').trim(); if(l && lots.indexOf(l) < 0) lots.push(l); });

    let h = '<div class="tkc-basis k-' + kind + '" title="'
      +   esc('The C3 share WMS holds for this tank, rounded to a whole number — or the figure you '
            + 'typed yourself. Every row below splits on it: C3 rounded up to the kg PER TRUCK, '
            + 'C4 = that truck\'s net − its C3. Change it on the Stock tab.') + '">'
      +   '<span class="k">%wt C3 &mdash; WMS basis</span>'
      +   '<b>' + (MARK[kind]||'') + ' ' + (wt === null ? '—' : wt) + ' %</b>'
      +   _lotTag(W)
      + '</div>';

    h += '<div class="tkc-sub2" title="'
      +  esc('Every truck with TRADE = Export in the TL Data of the chosen day, from this tank. '
           + 'Untick a truck to drop it from the totals; the totals are always the sum of the ticked '
           + 'rows, never recomputed from a grand total.')
      +  '">Export split'
      +  (lots.length ? '<span class="tkc-lottag" title="' + esc(lots.join(' · ')) + '">'
           + (lots.length === 1 ? 'lot ' + esc(_shortLot(lots[0])) : lots.length + ' lots') + '</span>' : '')
      +  '<input class="tkc-date" id="tkcExpDay" type="date" onchange="TKC.expDay()">'
      +  '</div>'
      +  '<div class="tblwrap"><table class="tkc-exp"><thead><tr>'
      +    '<th class="ck"><input type="checkbox" id="tkcExpAll" onchange="TKC.expAll(this.checked)"'
      +      ' title="' + esc('Tick or untick every truck at once') + '"></th>'
      +    '<th>DO No.</th><th>Truck</th><th>Driver</th>'
      +    '<th class="n">C3 (kg)</th><th class="n">C4 (kg)</th><th class="n">Net (kg)</th>'
      +  '</tr></thead><tbody>';
    if(!rows.length){
      h += '<tr><td colspan="7" class="empty">No export truck from this tank on that day.</td></tr>';
    } else {
      rows.forEach(r=>{
        const k = esc(r.key);
        h += '<tr class="' + (on(r) ? '' : 'off') + '">'
          +  '<td class="ck"><input type="checkbox" id="tkcX' + k + '"'
          +    (on(r) ? ' checked' : '') + ' onchange="TKC.expToggle(\'' + k + '\')"></td>'
          +  '<td>' + esc(r.doNo) + (r.lot ? '<i title="' + esc('Lot ' + r.lot) + '">'
               + esc(_shortLot(r.lot)) + '</i>' : '') + '</td>'
          +  '<td class="tk">' + esc(r.truck || '—') + '</td>'
          +  '<td class="dv" title="' + esc(r.cust || '') + '">' + esc(r.driver || '—') + '</td>'
          +  '<td class="n c3">' + kg(r.c3) + '</td>'
          +  '<td class="n c4">' + kg(r.c4) + '</td>'
          +  '<td class="n tot">' + kg(r.lpg) + '</td></tr>';
      });
      h += '</tbody><tfoot><tr>'
        +  '<td class="ck"></td><td colspan="3" id="tkcExpCnt">'
        +    sel.length + ' of ' + rows.length + ' trucks</td>'
        +  '<td class="n c3" id="tkcExpC3">' + kg(tot.c3) + '</td>'
        +  '<td class="n c4" id="tkcExpC4">' + kg(tot.c4) + '</td>'
        +  '<td class="n tot" id="tkcExpT">' + kg(tot.lpg) + '</td></tr></tfoot>';
    }
    h += '</table></div>'
      +  '<div class="tkc-acts">'
      +    _btn('Copy','expCopy()','Copy the ticked rows and their totals as a table for Excel.')
      +  '</div>'
      +  '<div class="tkc-cards">'
      +    _card('&#128256;', 'Cross-tank GI split',
                 'Trucks that loaded from both tanks: the smallest cross-transfer so every GI comes off one tank.', 'xsplit')
      +  '</div>';
    return h;
  }

  function _card(icon, title, body, action){
    /* ⚠ mô tả CHỈ nằm ở title — user không muốn chữ giải thích in ra bảng */
    return '<button class="tkc-card" onclick="TKC.run(\'' + action + '\')" title="' + esc(body) + '">'
      + '<span class="ic">' + icon + '</span>'
      + '<span class="tx"><b>' + esc(title) + '</b></span>'
      + '</button>';
  }

  /* ══ khung ══════════════════════════════════════════════════════════ */
  /* ⚠ ĐANG GÕ THÌ ĐỪNG VẼ LẠI. Một lượt ghi Firebase của máy khác cũng gọi
     INV.render ⇒ kéo theo render() ở đây ⇒ innerHTML mới ⇒ ô đang gõ bị huỷ,
     mất chữ lẫn con trỏ. Đúng họ lỗi v4.114, chỉ khác đường tới. */
  function _busy(){
    try{
      const a = document.activeElement;
      return !!(a && a.tagName === 'INPUT' && String(a.id || '').indexOf('tkc') === 0);
    }catch(_){ return false; }
  }
  function _set(id, txt){ const e = $(id); if(e) e.textContent = txt; }
  function _val(id){ const e = $(id); return e ? e.value : ''; }
  function _fill(id, v){
    const e = $(id);
    if(e && document.activeElement !== e) e.value = (v === null || v === undefined) ? '' : v;
  }
  function _n(v){
    const x = parseFloat(String(v == null ? '' : v).replace(/[,\s]/g, ''));
    return isFinite(x) ? x : null;
  }
  /* Ô PHẦN TRĂM: một dấu phẩy mà không có dấu chấm = dấu thập phân
     (cùng luật với INV._pctN — bàn phím Việt gõ 49,88). */
  function _pct(v){
    let t = String(v == null ? '' : v).replace(/\s/g, '');
    if(t.indexOf('.') < 0 && (t.match(/,/g) || []).length === 1) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
    const x = parseFloat(t);
    return isFinite(x) ? x : null;
  }
  function _say(msg, type){ try{ if(typeof toast === 'function') toast(msg, type); }catch(_){} }

  /* ── gõ ở tab Stock ── */
  function initEdit(){
    const a = _n(_val('tkcInitC3')), b = _n(_val('tkcInitC4'));
    _set('tkcInitTot', (a === null && b === null) ? '—' : kg((a||0) + (b||0)));
  }
  /* ↺ — lấy lại số app tính, ĐÈ lên số đang có. Hỏi trước vì nó xoá số
     nhân viên vừa gõ, mà gõ tay là bậc cao nhất. */
  function initReset(){
    let A = null;
    try{ A = INV.autoInitPick(_sloc); }catch(_){}
    if(!A || !A.ok){ _say('The app has nothing to take for ' + TKNAME[_sloc], 'warn'); return; }
    const cur = (function(){ try{ return INV.initInfoFor(_sloc); }catch(_){ return null; } })();
    if(cur && cur.has && !cur.auto
       && !confirm('Replace the initial stock you typed with the app figure?\n\n'
                   + A.c3.toLocaleString('en-US') + ' / ' + A.c4.toLocaleString('en-US') + ' kg\n'
                   + 'from ' + A.txt)) return;
    try{ INV.autoInitApply(_sloc); }
    catch(e){ console.warn('[TKC] initReset', e); }
  }
  function initSave(){
    const a = _n(_val('tkcInitC3')), b = _n(_val('tkcInitC4'));
    if(a === null || b === null){ _say('Enter both the C3 and the C4 initial stock','er'); return; }
    if(a < 0 || b < 0){ _say('Initial stock cannot be negative','er'); return; }
    try{ INV.saveInitFor(_sloc, a, b, _pct(_val('tkcWt'))); }
    catch(e){ console.warn('[TKC] initSave', e); }
  }
  function wtEdit(){ /* để trống có chủ ý: chỉ chốt khi bấm Save */ }
  function wtLot(){
    const v = String(_val('tkcWtLot') || '').trim();
    if(!v) return;                         /* ô gõ trống ⇒ giữ lựa chọn ở ô chọn */
    try{ INV.wtLotSet(_sloc, v); }catch(e){ console.warn('[TKC] wtLot', e); }
    _lotApplied();
  }
  function wtLotPick(v){
    try{ INV.wtLotSet(_sloc, String(v == null ? '' : v)); }catch(e){ console.warn('[TKC] wtLotPick', e); }
    const t = $('tkcWtLot'); if(t) t.value = '';
    _lotApplied();
  }
  /* v4.165 — tick / bỏ tick / trả về cho app (on = true | false | null) */
  function lotAdd(lot, on){
    try{ INV.lotAddSet(_sloc, lot, (on === null || on === undefined) ? null : !!on); }
    catch(e){ console.warn('[TKC] lotAdd', e); }
  }
  /* Chọn trong danh sách thả xuống = cộng mẻ đó vào, lưu luôn. */
  function lotPick(v){
    const lot = String(v == null ? '' : v).trim();
    const sel = $('tkcLotAddSel'); if(sel) sel.value = '';
    if(!lot) return;
    lotAdd(lot, true);
  }
  function lotSearch(v){
    _lotQ = String(v == null ? '' : v).trim();
    _lotApplied();
  }
  function wtSave(){
    const w = _pct(_val('tkcWt'));
    if(w === null || w <= 0 || w > 100){ _say('Invalid %wt C3 (0–100)','er'); return; }
    try{ INV.saveWtFor(_sloc, w); }catch(e){ console.warn('[TKC] wtSave', e); }
  }

  /* ── gõ ở tab Recon ── */
  function sysEdit(){
    const lot = _pending.sys ? _pending.sys.lot : '';
    try{ INV.stxSetSys(_sloc, lot, _val('tkcSysC3'), _val('tkcSysC4')); }
    catch(e){ console.warn('[TKC] sysEdit', e); }
    _reconNums();                      /* CHỈ mấy ô dẫn xuất, không vẽ lại tab */
  }
  function _reconNums(){
    let F = null;
    try{ F = INV.stxFigures(_sloc); }catch(_){ return; }
    if(!F || !F.ok) return;
    _set('tkcSysTot', F.hasSys ? kg(F.sysC3 + F.sysC4) : '—');
    _set('tkcGap3', sgn(F.gapC3)); _set('tkcGap4', sgn(F.gapC4));
    _set('tkcGapT', F.hasSys ? sgn(F.gapC3 + F.gapC4) : '—');
    _set('tkcAdj3', kg(F.xC3)); _set('tkcAdj4', kg(F.xC4));
    _set('tkcAdjT', F.hasSys ? kg(F.xC3 + F.xC4) : '—');
    const w = $('tkcSysWarn');
    if(w){
      w.className = 'tkc-warn' + (F.hasSys ? ' off' : '');
      w.textContent = F.hasSys ? '' : 'Type the WMS initial stock above to get the quantity to post.';
    }
  }
  function reconLot(){
    const v = String(_val('tkcReconLot') || '').trim();
    if(!v) return;
    try{ INV.stxSetLot(_sloc, v); }catch(e){ console.warn('[TKC] reconLot', e); }
    _lotApplied();
  }
  function reconLotPick(v){
    try{ INV.stxSetLot(_sloc, String(v == null ? '' : v)); }catch(e){ console.warn('[TKC] reconLotPick', e); }
    const t = $('tkcReconLot'); if(t) t.value = '';
    _lotApplied();
  }
  function sysReset(){
    try{ INV.stxSysReset(_sloc); }catch(e){ console.warn('[TKC] sysReset', e); }
    render();
  }
  function stxSave(){ try{ INV.stxSave(_sloc); }catch(e){ console.warn('[TKC] stxSave', e); } }

  /* ── sổ cavern / liên bồn gõ thẳng trên bảng (v4.147) ── */
  function _entryVals(pfx, key){
    const id = pfx + String(key || 'New').replace(/[^A-Za-z0-9_-]/g, '');
    return { c3:_n(_val(id + 'C3')), c4:_n(_val(id + 'C4')), note:_val(id + 'Note') };
  }
  function cavSave(key){
    const v = _entryVals('tkcCav', key);
    if(v.c3 === null && v.c4 === null){ _say('Enter a C3 or a C4 figure first','er'); return; }
    if((v.c3||0) < 0 || (v.c4||0) < 0){ _say('A cavern receipt cannot be negative','er'); return; }
    try{ INV.saveCavernFor(_sloc, v.c3||0, v.c4||0, v.note, key || ''); }
    catch(e){ console.warn('[TKC] cavSave', e); }
  }
  function cavDel(key){
    if(typeof confirm === 'function' && !confirm('Delete this cavern receipt?')) return;
    try{ INV.delHistFor(_sloc, key, ''); }catch(e){ console.warn('[TKC] cavDel', e); }
  }
  function xfSave(pairId){
    const v = _entryVals('tkcXf', pairId);
    if(v.c3 === null && v.c4 === null){ _say('Enter a C3 or a C4 figure first','er'); return; }
    if((v.c3||0) < 0 || (v.c4||0) < 0){ _say('A transfer cannot be negative','er'); return; }
    /* Dòng MỚI cho chọn chiều; dòng đã lưu giữ nguyên chiều cũ (muốn đổi
       chiều thì xoá rồi thêm lại — nói rõ trong tooltip). */
    let from = _sloc;
    if(!pairId){
      const d = $('tkcXfNewDir');
      if(d && d.value === 'in') from = (_sloc === '2100') ? '2101' : '2100';
    } else {
      const e = _xfOf(pairId);
      if(e) from = e.fromSl;
    }
    try{ INV.saveXferFor(from, v.c3||0, v.c4||0, v.note, pairId || ''); }
    catch(e){ console.warn('[TKC] xfSave', e); }
  }
  function _xfOf(pairId){
    try{
      return (INV.histFor(_sloc) || []).filter(e =>
        e.type === 'xfer' && (e._pairId || e._k) === pairId)[0] || null;
    }catch(_){ return null; }
  }
  function xfDel(key, pairId){
    if(typeof confirm === 'function' && !confirm('Delete this inter-tank transfer? It is removed from both tanks.')) return;
    try{ INV.delHistFor(_sloc, key, pairId || ''); }catch(e){ console.warn('[TKC] xfDel', e); }
  }

  /* ── 🔍 WMS stock check ngay trên bảng ── */
  function wmsChk(){
    try{
      INV.wmsSet(_sloc, 'vol', _val('tkcWv'));
      INV.wmsSet(_sloc, 'c3',  _val('tkcW3'));
      INV.wmsSet(_sloc, 'c4',  _val('tkcW4'));
    }catch(e){ console.warn('[TKC] wmsChk', e); }
    _wmsNums();                       /* CHỈ ô dẫn xuất, không vẽ lại tab */
  }
  function _wmsNums(){
    let F = null;
    try{ F = INV.wmsFigures(_sloc); }catch(_){ return; }
    if(!F) return;
    const ok = !!F.ok;
    _set('tkcWa3', ok ? kg(F.aC3) : '—');
    _set('tkcWa4', ok ? kg(F.aC4) : '—');
    _set('tkcWaL', ok ? kg(F.aL)  : '—');
    _set('tkcWwL', F.hasWms ? kg(F.wL) : '—');
    _set('tkcWd3', (ok && F.hasWms) ? sgn(F.dC3) : '—');
    _set('tkcWd4', (ok && F.hasWms) ? sgn(F.dC4) : '—');
    _set('tkcWdL', (ok && F.hasWms) ? sgn(F.dL)  : '—');
    const box = $('tkcWact');
    if(box) box.innerHTML = _wmsActHtml(F);
  }
  function wmsWipe(){
    try{ INV.wmsClear(_sloc); }catch(e){ console.warn('[TKC] wmsWipe', e); }
    ['tkcWv','tkcW3','tkcW4'].forEach(id=>{ const e = $(id); if(e) e.value = ''; });
    _wmsNums();
  }

  /* ── bảng export ── */
  function _isoOf(dmy){
    const m = String(dmy || '').split('/');
    return m.length === 3 ? ('20' + m[2] + '-' + m[1] + '-' + m[0]) : '';
  }
  function _dmyOf(iso){
    const m = String(iso || '').split('-');
    return m.length === 3 ? (m[2] + '/' + m[1] + '/' + m[0].slice(-2)) : '';
  }
  function expDay(){
    const d = _dmyOf(_val('tkcExpDay'));
    if(d) _expDay = d;
    render();
  }
  function expCopy(){
    const R = _expRecalc();
    if(!R.sel.length){ _say('Nothing ticked to copy','er'); return; }
    const W = R.W, day = R.X ? R.X.day : '';
    const head = ['Date','Tank','wtC3_pct','wtC3_source','Lot','DO_No','Truck','Driver',
                  'Customer','Net_kg','C3_kg','C4_kg'];
    const lines = R.sel.map(r=>[day, TKNAME[_sloc], (W && isFinite(W.wt)) ? W.wt : '',
                                (W ? W.src : ''), r.lot, r.doNo, r.truck, r.driver,
                                r.cust, r.lpg, r.c3, r.c4].join('\t'));
    lines.push([day, TKNAME[_sloc], '', '', '', 'TOTAL', R.sel.length + ' trucks', '', '',
                R.t.lpg, R.t.c3, R.t.c4].join('\t'));
    try{ navigator.clipboard.writeText(head.join('\t') + '\n' + lines.join('\n'));
         _say('✓ Export list copied','ok'); }
    catch(_){ _say('Copy failed','er'); }
  }

  /* ── tab Export split ── */
  const _expOff = Object.create(null);     /* khoá dòng bị BỎ TÍCH — RAM */
  function _expRecalc(){
    let W = null, X = null;
    try{ W = INV.wmsWt(_sloc); }catch(_){}
    try{ X = INV.exportRowsFor(_sloc, _expDay || INV.todayDmy(), W ? W.wt : null); }catch(_){}
    const rows = (X && X.rows) ? X.rows : [];
    const sel  = rows.filter(r=>!_expOff[r.key]);
    const t    = sel.reduce((o,r)=>({ lpg:o.lpg+r.lpg, c3:o.c3+r.c3, c4:o.c4+r.c4 }),
                            { lpg:0, c3:0, c4:0 });
    _set('tkcExpCnt', sel.length + ' of ' + rows.length + ' trucks');
    _set('tkcExpC3', kg(t.c3)); _set('tkcExpC4', kg(t.c4)); _set('tkcExpT', kg(t.lpg));
    const all = $('tkcExpAll');
    if(all){ all.checked = rows.length > 0 && sel.length === rows.length; }
    rows.forEach(r=>{
      const tr = $('tkcX' + r.key);
      if(tr && tr.parentNode && tr.parentNode.parentNode)
        tr.parentNode.parentNode.className = _expOff[r.key] ? 'off' : '';
    });
    return { rows, sel, t, W, X };
  }
  /* ⚠ chỉ cập nhật mấy ô tổng — KHÔNG vẽ lại tab, không thì mất ô ngày đang mở */
  function expToggle(key){
    if(_expOff[key]) delete _expOff[key]; else _expOff[key] = 1;
    _expRecalc();
  }
  function expAll(onAll){
    let X = null, W = null;
    try{ W = INV.wmsWt(_sloc); }catch(_){}
    try{ X = INV.exportRowsFor(_sloc, _expDay || INV.todayDmy(), W ? W.wt : null); }catch(_){}
    ((X && X.rows) ? X.rows : []).forEach(r=>{
      if(onAll) delete _expOff[r.key]; else _expOff[r.key] = 1;
      const b = $('tkcX' + r.key); if(b) b.checked = !!onAll;
    });
    _expRecalc();
  }

  function render(){
    const m = $('tkcModal');
    if(!m || !m.classList.contains('on')) return;      /* đóng thì vẽ làm gì */
    if(_busy()) return;                                /* đang gõ thì đừng đụng vào */

    const t = $('tkcTitle');
    if(t) t.textContent = 'Tank Console · ' + TKNAME[_sloc];

    ['2100','2101'].forEach(sl=>{
      const b = $('tkcTk' + sl);
      if(b) b.className = 'tkc-tk' + (sl === _sloc ? ' on t' + TKNAME[sl].slice(3) : '');
    });
    TABS.forEach(k=>{
      const b = $('tkcTab' + k);
      if(b) b.className = 'tkc-tab' + (k === _tab ? ' on' : '');
      const p = $('tkcPane' + k);
      if(p) p.style.display = (k === _tab) ? '' : 'none';
    });

    const pane = $('tkcPane' + _tab);
    if(!pane) return;
    let html = '';
    try{
      html = (_tab === 'stock') ? _paneStock()
           : (_tab === 'recon') ? _paneRecon()
           : _paneSplit();
    }catch(e){
      console.warn('[TKC] render ' + _tab, e);
      html = '<div class="tkc-note warn">This tab could not be drawn — use the buttons below.</div>';
    }
    pane.innerHTML = html;

    /* Ô nhập sinh ra rỗng — điền SAU, và chỉ khi ô không đang được gõ. */
    if(_tab === 'stock' && _pending.stock){
      const P = _pending.stock;
      _fill('tkcInitC3', P.init.c3); _fill('tkcInitC4', P.init.c4); _fill('tkcWt', P.init.wt);
      Object.keys(P.cav).forEach(k=>{
        _fill('tkcCav'+k+'C3', P.cav[k].c3); _fill('tkcCav'+k+'C4', P.cav[k].c4);
        _fill('tkcCav'+k+'Note', P.cav[k].note);
      });
      Object.keys(P.xf).forEach(k=>{
        _fill('tkcXf'+k+'C3', P.xf[k].c3); _fill('tkcXf'+k+'C4', P.xf[k].c4);
        _fill('tkcXf'+k+'Note', P.xf[k].note);
      });
    }
    if(_tab === 'recon'){
      if(_pending.sys){
        _fill('tkcSysC3', _pending.sys.c3); _fill('tkcSysC4', _pending.sys.c4);
      }
      if(_pending.wms){
        _fill('tkcWv', _pending.wms.vol); _fill('tkcW3', _pending.wms.c3); _fill('tkcW4', _pending.wms.c4);
      }
      _wmsNums();
    }
    if(_tab === 'split' && _pending.exp) _fill('tkcExpDay', _isoOf(_pending.exp.day));
  }

  function open(sloc, tab){
    _sloc = (sloc === '2101' || sloc === 2) ? '2101' : '2100';
    if(TABS.indexOf(tab) >= 0) _tab = tab;
    try{ if(typeof INV !== 'undefined' && INV.view) INV.view(_sloc); }catch(_){}
    const m = $('tkcModal');
    if(m) m.classList.add('on');
    render();
  }
  function close(){ const m = $('tkcModal'); if(m) m.classList.remove('on'); }
  function tank(sloc){ _sloc = sloc; try{ INV.view(sloc); }catch(_){} render(); }
  function tab(k){ if(TABS.indexOf(k) >= 0){ _tab = k; render(); } }

  function init(){
    /* Bảng này đọc số của INV nên phải vẽ lại mỗi khi INV đổi. INV.render()
       được gọi ở MỌI đường ghi, nên chỉ cần bọc nó một lần là đủ — không
       phải rải hook khắp nơi. */
    try{
      if(typeof INV !== 'undefined' && typeof INV.render === 'function' && !INV.__tkcHooked){
        const orig = INV.render;
        INV.render = function(){ const r = orig.apply(this, arguments); try{ render(); }catch(_){} return r; };
        INV.__tkcHooked = true;
      }
    }catch(e){ console.warn('[TKC] hook INV.render', e); }
    console.log('[TKC] Tank Console ready');
  }

  return { init, open, close, tank, tab, render, run,
           /* v4.146 — gõ thẳng trên bảng, không phải mở thêm hộp thoại */
           initEdit, initSave, initReset, wtEdit, wtSave, wtLot, wtLotPick,
           /* v4.165 — tick lot nào được cộng lên nền SAP */
           lotAdd, lotSearch, lotPick,
           sysEdit, sysReset, stxSave, reconLot, reconLotPick,
           expToggle, expAll,
           /* v4.147 — sổ cavern / liên bồn · WMS check · bảng export ngay trên bảng */
           cavSave, cavDel, xfSave, xfDel,
           wmsChk, wmsWipe, expDay, expCopy,
           get sloc(){ return _sloc; }, get tab$(){ return _tab; } };
})();
window.TKC = TKC;
