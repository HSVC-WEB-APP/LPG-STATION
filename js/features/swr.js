/* ============================================================
 * SWR — swr.js  (v4.180)
 * ------------------------------------------------------------
 * LPG SALES ▸ 📊 SAP ▸ 📑 SAP WMS Report — thay tab REPORTS ▸ Cavern Daily.
 *   Import file Batch Stock ⇒ app biết sẽ điền NHỮNG NGÀY NÀO ⇒ bảng kiểm
 *   liệt kê từng mục dữ liệu của từng ngày ⇒ thiếu thì nhân viên GÕ SỐ, bấm
 *   "0" (xác nhận không phát sinh), "giá không đổi", hoặc BỎ QUA (ô trống,
 *   tô vàng trong Excel) ⇒ ⬇ Export ra file đã điền.
 *
 * ⭐ MỘT LOGIC: mọi phán đoán "đủ / thiếu / ghi số gì" nằm ở BSXL (bsxl.js).
 *   Module này chỉ VẼ bảng kiểm và gọi lệnh ghi. Email P6 (mail.js) vẽ CÙNG
 *   bảng kiểm bằng SWR.html() ⇒ hai nơi không thể lệch nhau.
 * ⭐ RAM ⟷ Firebase: số người gõ ghi vào đúng node gốc (cavern_in qua CAV,
 *   knq_bonded/use qua FEED OL1, cavern_price); quyết định 0 / giá không đổi /
 *   bỏ qua ghi sapwms_ok (BSXL.setFlag). Không có gì tự tính được mà lên Firebase.
 * ============================================================ */
const SWR = (function(){
  'use strict';
  const S = { file:null, fname:'', plan:null, all:false, draft:{}, busy:false };
  const _subs = [];
  let _pokeT = null;

  const $ = id => document.getElementById(id);
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function toastM(m, c){ try{ toast(m, c || ''); }catch(_){ console.log(m); } }
  function t3(kg){ return (Math.round(+kg || 0) / 1000).toLocaleString('en-US', { minimumFractionDigits:3, maximumFractionDigits:3 }); }
  function dm(iso){ const p = String(iso).split('-'); return p[2]+'/'+p[1]; }
  function yesterday(){ const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function canEdit(){ try{ return typeof canWrite !== 'function' || canWrite('sap'); }catch(_){ return false; } }
  function num(v){ const s = String(v == null ? '' : v).replace(/,/g,'').trim(); if(s === '') return null; const n = +s; return isFinite(n) ? n : NaN; }

  /* ── thông báo cho nơi đang vẽ bảng kiểm (tab SAP + email P6) ── */
  function onChange(fn){ if(typeof fn === 'function') _subs.push(fn); }
  function _changed(){ render(); _subs.forEach(f => { try{ f(); }catch(e){ console.warn('[SWR] sub', e); } }); }
  /* dữ liệu nguồn đổi (CAV nhận child từ máy khác, giá đổi…) ⇒ vẽ lại, gộp nhịp */
  function poke(){ if(_pokeT) return; _pokeT = setTimeout(() => { _pokeT = null; _changed(); }, 250); }
  let _hooked = false;
  function _hook(){ if(_hooked || typeof BSXL === 'undefined') return; _hooked = true; BSXL.onChange(poke); BSXL.attach(); }

  function date(){ const el = $('cavDate'); return (el && el.value) || yesterday(); }
  function dates(){ return (S.plan && S.plan.dates && S.plan.dates.length) ? S.plan.dates : [date()]; }

  /* ══════════ BẢNG KIỂM — dùng chung cho tab SAP và email P6 ══════════ */
  function html(ds, opt){
    opt = opt || {};
    if(typeof BSXL === 'undefined') return '<div class="swr-cap">Batch Stock engine not loaded.</div>';
    _hook();
    let chk;
    try{ chk = BSXL.check(ds); }catch(e){ return '<div class="swr-cap">'+esc(e.message)+'</div>'; }
    const ed = canEdit(), dis = ed ? '' : ' disabled';
    const rows = chk.rows;
    const open = rows.filter(r => !r.done);
    const nPrice = open.filter(r => r.it.g === 'price' && r.prevVal != null).length;
    const EV = { vlgcin:1, vlgcout:1, grP:1, grX:1, grD:1, grE:1, heater:1, vessel:1 };
    const nEv = open.filter(r => EV[r.it.k] && r.status === 'miss').length;
    const nSug = open.filter(r => r.sug).length;
    const nDone = rows.length - open.length, dcsv = "'"+ds.join(',')+"'";
    let h = '<div class="swr-sum">'+
      '<span class="swr-dates">'+(ds.length > 1 ? ds.length+' days: '+ds.map(dm).join(' · ') : 'Day '+dm(ds[0]))+'</span>'+
      (open.length ? '<span class="swr-pill bad">⚠ '+open.length+' to resolve</span>' : '<span class="swr-pill ok">✓ Ready to export</span>')+
      '<span class="swr-pill">'+nDone+' / '+rows.length+' items OK</span>'+
      '<span style="flex:1"></span>'+
      (nSug ? '<button class="swr-b ok"'+dis+' onclick="SWR.useAllSug('+dcsv+')" title="Take every figure suggested from SAP / PMS">✓ Use suggestions ('+nSug+')</button>' : '')+
      (nPrice ? '<button class="swr-b"'+dis+' onclick="SWR.bulk(\'prev\','+dcsv+')" title="Every missing price keeps the previous row (Excel formula = the cell above), as in the hand-made file">💲 Prices unchanged ('+nPrice+')</button>' : '')+
      (nEv ? '<button class="swr-b"'+dis+' onclick="SWR.bulk(\'zero\','+dcsv+')" title="VLGC, bonded get-out, heater, vessel: nothing happened on these days ⇒ write 0">= 0 for empty events ('+nEv+')</button>' : '')+
      (open.length ? '<button class="swr-b ghost"'+dis+' onclick="SWR.bulk(\'skip\','+dcsv+')" title="Leave every remaining cell blank and highlight it yellow in the Excel file">⏭ Skip all remaining ('+open.length+')</button>' : '')+
      '<button class="swr-b" onclick="SWR.toggleAll()" title="Show the items that already have data too">'+(S.all ? 'Hide OK items' : 'Show all items')+'</button>'+
      '<button class="swr-b" onclick="SWR.refresh()" title="Re-read TL Data / WMS ST / Vessel / SAP from memory">↻ Refresh</button>'+
      '</div>';
    if(!ed) h += '<div class="swr-cap">View only — you have no permission to change SAP data.</div>';
    const shown = S.all ? rows : rows.filter(r => r.status !== 'data');
    if(!shown.length){ h += '<div class="swr-cap">Every item has data — nothing to decide.</div>'; }
    else {
      /* v4.193 — gom theo NGÀY (một dòng tiêu đề mỗi ngày) thay vì lặp ngày ở từng dòng */
      h += '<table class="swr-tbl"><colgroup><col style="width:34%"><col style="width:22%"><col></colgroup>'+
        '<tr><th>Item</th><th>Figure</th><th>Enter the figure or decide</th></tr>';
      let lastD = '';
      shown.forEach(r => {
        if(r.date !== lastD){ lastD = r.date;
          const n = shown.filter(x => x.date === r.date && !x.done).length;
          h += '<tr class="swr-day"><td colspan="3">📅 '+_dayLbl(r.date)+(n ? ' <span class="swr-pill bad">'+n+' open</span>' : ' <span class="swr-pill ok">done</span>')+'</td></tr>'; }
        h += _row(r, ed, dis);
      });
      h += '</table>';
    }
    if(chk.info.length) h += '<div class="swr-cap">ℹ '+chk.info.map(esc).join('<br>ℹ ')+'</div>';
    return h;
  }
  function _dayLbl(iso){ const d = new Date(iso+'T00:00:00'); return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]+' '+dm(iso)+'/'+String(iso).slice(0,4); }
  function _cells(it){ return (it.c3.length ? 'C3 '+it.c3.join(' ') : '')+(it.c3.length && it.c4.length ? ' · ' : '')+(it.c4.length ? 'C4 '+it.c4.join(' ') : ''); }
  function _val(r){
    const it = r.it;
    if(it.g === 'price'){ const v = r.vals[it.c3.length ? 'c3' : 'c4'][it.c3[0] || it.c4[0]]; return v == null ? '' : '$ '+(+v).toLocaleString('en-US',{ maximumFractionDigits:2 }); }
    const sum = p => it[p].reduce((s, c) => s + (+r.vals[p][c] || 0), 0);
    const parts = [];
    if(it.c3.length) parts.push('C3 '+t3(sum('c3')));
    if(it.c4.length) parts.push('C4 '+t3(sum('c4')));
    return parts.join(' · ')+' t';
  }
  function _who(r){ const f = r.flag; return f ? ' <small class="swr-cap" title="'+esc(new Date(f.at || 0).toLocaleString())+'">by '+esc(f.by || '?')+'</small>' : ''; }
  /* ô nhập có nhãn C3/C4 phía trước và đơn vị phía sau — đọc được mà không cần placeholder */
  function _inp(id, lbl, unit, pre){
    const v = S.draft[id] != null ? S.draft[id] : (pre == null ? '' : pre);
    return '<span class="swr-ig"><span class="swr-ig-l">'+lbl+'</span><input class="swr-in" id="'+id+'" inputmode="decimal" value="'+esc(v)+'" oninput="SWR.draft(this)"><span class="swr-ig-u">'+unit+'</span></span>';
  }
  function _sugT(v){ return v == null ? null : (Math.round(v) / 1000).toFixed(3); }
  function _row(r, ed, dis){
    const it = r.it, D = r.date, K = it.k, a = "'"+D+"','"+K+"'";
    const undo = ed ? ' <button class="swr-lnk" onclick="SWR.decide('+a+',\'\')" title="Undo this decision">undo</button>' : '';
    let fig = '', act = '';
    if(r.status === 'data'){ fig = '<span class="swr-num">'+esc(_val(r))+'</span>'; act = '<span class="swr-ok">✓ from app data</span>'; }
    else if(r.status === 'ok'){ fig = '<span class="swr-num">'+esc(_val(r))+'</span>'; act = '<span class="swr-ok">✓ classified rows only</span>'+_who(r)+undo; }
    else if(r.status === 'zero'){ fig = '<span class="swr-num">0</span>'; act = '<span class="swr-ok">✓ confirmed 0</span>'+_who(r)+undo; }
    else if(r.status === 'prev'){ fig = '<span class="swr-num">= row above</span>'; act = '<span class="swr-ok">✓ price unchanged</span>'+_who(r)+undo; }
    else if(r.status === 'skip'){ fig = '<span class="swr-skip">blank</span>'; act = '<span class="swr-cap">skipped · yellow in Excel</span>'+_who(r)+undo; }
    else {
      const id = p => 'swr_'+D+'_'+K.replace(/\W/g,'')+'_'+p;
      const sg = r.sug || null;
      const save = '<button class="swr-b pri"'+dis+' onclick="SWR.save('+a+')" title="Save the figure where it belongs (it then shows everywhere in the app)">Save</button>';
      const zero = BSXL.ZERO_OK[K] ? '<button class="swr-b"'+dis+' onclick="SWR.decide('+a+',\'zero\')" title="Nothing on this day ⇒ write 0">= 0</button>' : '';
      const skip = '<button class="swr-b ghost"'+dis+' onclick="SWR.decide('+a+',\'skip\')" title="Leave blank and highlight yellow in Excel">Skip</button>';
      if(sg){
        const tot = (sg.c3 || 0) + (sg.c4 || 0);
        fig = '<div class="swr-sug"><span class="swr-sug-src">'+esc(sg.src)+'</span>'+
          (sg.c3 != null ? ' C3 <b>'+_sugT(sg.c3)+'</b>' : '')+(sg.c4 != null ? ' C4 <b>'+_sugT(sg.c4)+'</b>' : '')+' t'+
          ' <button class="swr-b ok"'+dis+' onclick="SWR.useSug('+a+')" title="Take this figure'+(tot ? '' : ' (0 = nothing happened)')+'">✓ Use</button></div>';
      }
      if(r.status === 'check'){ fig = '<span class="swr-cap">rows not classified</span>'; act = '<button class="swr-b"'+dis+' onclick="SWR.decide('+a+',\'ok\')" title="Fill the GI columns from the classified rows only">Use classified rows</button>'+skip+
        ' <span class="swr-cap">or fix the rows in TL Data, then ↻</span>'; }
      else if(it.kind){
        act = (it.c3.length ? _inp(id('c3'), 'C3', 't') : '')+(it.c4.length ? _inp(id('c4'), 'C4', 't') : '')+save+zero+skip;
      } else if(K === 'ol1x'){
        act = _inp(id('c3'), 'X', 't')+save+'<button class="swr-b"'+dis+' onclick="cavOpenModal(\'ol1\')" title="Paste the weekly C3-usage plan (column H) for the whole period">Import plan</button>'+zero+skip;
      } else if(K === 'ol1t'){
        act = _inp(id('c3'), 'P+X', 't')+save+zero+skip;
      } else if(it.g === 'price'){
        act = _inp(id('p'), '$', '/t')+save+
          (r.prevVal != null ? '<button class="swr-b"'+dis+' onclick="SWR.decide('+a+',\'prev\')" title="Price did not change — the cell becomes = the row above (last price '+esc(r.prevVal)+' on '+esc(r.prevDate)+')">Same as before ('+esc(r.prevVal)+')</button>' : '')+skip;
      } else {
        act = zero+skip+' <span class="swr-cap">'+(K === 'tl' ? 'or paste TL Data' : K === 'ws' ? 'or paste WMS ST' : 'or add it in the Vessel tab')+', then ↻</span>';
      }
      if(!fig) fig = '<span class="swr-miss">missing</span>';
    }
    const cls = r.done ? (r.status === 'skip' ? 'st-skip' : 'st-ok') : 'st-miss';
    return '<tr class="'+cls+'">'+
      '<td><div class="swr-it">'+esc(it.lbl)+'</div><div class="swr-meta"><span class="swr-cells" title="Excel column(s)">'+esc(_cells(it))+'</span>'+(r.info ? ' · '+esc(r.info) : '')+'</div></td>'+
      '<td class="swr-v">'+fig+'</td>'+
      '<td class="swr-act">'+act+'</td></tr>';
  }
  /* v4.193 — nhận số gợi ý (SAP / PMS): mọi phần = 0 ⇒ xác nhận 0, không thì ghi như gõ tay */
  function useSug(d, k){
    let chk; try{ chk = BSXL.check([d]); }catch(e){ toastM('⚠ '+e.message, 'er'); return; }
    const r = chk.rows.find(x => x.it.k === k); if(!r || !r.sug) return;
    const id = p => 'swr_'+d+'_'+k.replace(/\W/g,'')+'_'+p;
    ['c3','c4'].forEach(p => { if(r.sug[p] != null) S.draft[id(p)] = _sugT(r.sug[p]); });
    save(d, k);
  }
  function useAllSug(dcsv){
    const ds = String(dcsv || '').split(',').filter(Boolean);
    let chk; try{ chk = BSXL.check(ds); }catch(e){ toastM('⚠ '+e.message, 'er'); return; }
    const list = chk.rows.filter(r => !r.done && r.sug);
    if(!list.length) return;
    if(!confirm('Take the suggested figure for these '+list.length+' item(s)?\n\n'+list.slice(0, 14).map(r => dm(r.date)+' '+r.it.lbl+' — '+r.sug.src).join('\n')+(list.length > 14 ? '\n…' : ''))) return;
    list.forEach(r => useSug(r.date, r.it.k));
  }
  /* ══════════ LỆNH ══════════ */
  function draft(el){ S.draft[el.id] = el.value; }
  function decide(d, k, v){
    BSXL.setFlag(d, k, v || null).then(() => _changed()).catch(e => { toastM('⚠ '+e.message, 'er'); _changed(); });
  }
  function save(d, k){
    const it = BSXL.BYKEY[k]; if(!it) return;
    const id = p => 'swr_'+d+'_'+k.replace(/\W/g,'')+'_'+p;
    const rd = p => { const v = num(S.draft[id(p)] != null ? S.draft[id(p)] : ($(id(p)) || {}).value); return v; };
    const clear = () => ['c3','c4','p'].forEach(p => { delete S.draft[id(p)]; });
    try{
      if(it.g === 'price'){
        const v = rd('p'); if(v == null || isNaN(v) || v <= 0){ toastM('Type the price in $/ton', 'er'); return; }
        CAV.setPrice(d, it.pkey, v).then(() => { clear(); toastM('💾 '+it.lbl+' '+d+' = '+v, 'ok'); _changed(); }).catch(e => toastM('⚠ '+e.message, 'er'));
        return;
      }
      if(k === 'ol1t'){
        const v = rd('c3'); if(v == null || isNaN(v) || v < 0){ toastM('Type the OL1 total in ton', 'er'); return; }
        CAV.setOl1Total(d, v * 1000).then(() => { clear(); toastM('💾 FEED OL1 total '+d+' = '+v+' t', 'ok'); _changed(); }).catch(e => toastM('⚠ '+e.message, 'er'));
        return;
      }
      if(typeof canWrite === 'function' && !canWrite('sap')){ toastM('⛔ No permission to change SAP data', 'er'); return; }
      const kind = k === 'ol1x' ? 'ol1' : it.kind, batch = k === 'ol1x' ? 'X' : (it.batch || null);
      const vals = {}; let bad = false, any = false;
      ['c3','c4'].forEach(p => { if(!it[p].length) return; const v = rd(p); if(v == null) return; if(isNaN(v) || v < 0){ bad = true; return; } vals[p] = v; any = true; });
      if(bad || !any){ toastM('Type the quantity in ton (C3 / C4)', 'er'); return; }
      if(Object.values(vals).every(v => v === 0)){ clear(); decide(d, k, 'zero'); return; }        /* gõ 0 = xác nhận không phát sinh */
      Object.keys(vals).forEach(p => { if(vals[p] > 0) CAV.pushEntry(d, kind, p, batch, Math.round(vals[p] * 1000), 'SAP WMS report check'); });
      clear();
      try{ CAV.render(); }catch(_){}
      toastM('💾 '+it.lbl+' · '+d+' saved', 'ok');
      _changed();
    }catch(e){ toastM('⚠ '+e.message, 'er'); }
  }
  function bulk(mode, dcsv){
    const ds = dcsv ? String(dcsv).split(',').filter(Boolean) : dates();
    let chk; try{ chk = BSXL.check(ds); }catch(e){ toastM('⚠ '+e.message, 'er'); return; }
    return bulkOn(chk, mode);
  }
  function bulkOn(chk, mode){
    const EV = { vlgcin:1, vlgcout:1, grP:1, grX:1, grD:1, grE:1, heater:1, vessel:1 };
    const open = chk.rows.filter(r => !r.done);
    let list = [];
    if(mode === 'prev') list = open.filter(r => r.it.g === 'price' && r.prevVal != null);
    else if(mode === 'zero') list = open.filter(r => EV[r.it.k] && r.status === 'miss');
    else if(mode === 'skip') list = open;
    if(!list.length) return;
    const names = list.slice(0, 12).map(r => dm(r.date)+' '+r.it.lbl).join('\n')+(list.length > 12 ? '\n…' : '');
    const q = mode === 'prev' ? 'Keep the previous price for these '+list.length+' item(s)?'
            : mode === 'zero' ? 'Nothing happened ⇒ write 0 for these '+list.length+' item(s)?'
            : 'Leave these '+list.length+' item(s) BLANK and highlight them yellow in Excel?';
    if(!confirm(q+'\n\n'+names)) return;
    Promise.all(list.map(r => BSXL.setFlag(r.date, r.it.k, mode)))
      .then(() => { toastM('✓ '+list.length+' item(s) decided', 'ok'); _changed(); })
      .catch(e => { toastM('⚠ '+e.message, 'er'); _changed(); });
  }
  function toggleAll(){ S.all = !S.all; _changed(); }
  function refresh(){ _changed(); }

  /* ══════════ TAB SAP ▸ SAP WMS REPORT ══════════ */
  function render(){
    const box = $('swrList'); if(!box) return;
    const fn = $('swrFileName');
    if(fn) fn.innerHTML = S.file ? '<b>'+esc(S.fname)+'</b> · fills '+(S.plan ? S.plan.dates.map(dm).join(', ')+(S.plan.alreadyDone ? ' (row already done — will be rewritten)' : '') : '…')
                                 : 'No file imported — the check below covers '+dm(date())+' only';
    box.innerHTML = html(dates());
  }
  function onEnter(){
    _hook();
    const d = $('cavDate'); if(d && !d.value) d.value = yesterday();
    try{ CAV.render(); }catch(_){}
    render();
  }
  function onDate(){
    try{ CAV.render(); }catch(_){}
    if(S.file) return _inspect();
    _changed();
  }
  async function _inspect(){
    try{ S.plan = await BSXL.inspect(S.file, date()); }
    catch(e){ S.plan = null; toastM('⚠ '+e.message, 'er'); }
    _changed();
  }
  function pick(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return;
    if(!/\.xlsx$/i.test(f.name)){ toastM('Pick the Batch Stock .xlsx file', 'er'); return; }
    S.file = f; S.fname = f.name; S.plan = null;
    _inspect();
  }
  function _download(blob, name){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  async function exportFile(){
    if(!S.file){ toastM('Import the Batch Stock file first (📂)', 'er'); return; }
    if(S.busy) return; S.busy = true;
    try{
      const out = await BSXL.build(S.file, date(), { name:S.fname });
      _download(out.blob, out.name);
      toastM('⬇ '+out.name+' — '+out.dates.map(dm).join(', ')+' filled'+(out.yellow ? ' · '+out.yellow+' cell(s) yellow (skipped)' : ''), 'ok');
      const w = $('swrWarn'); if(w) w.innerHTML = out.warn.length ? out.warn.map(x => '<div>• '+esc(x)+'</div>').join('') : '';
    }catch(e){
      if(e.code === 'UNRESOLVED'){ S.all = false; _changed(); toastM('⚠ '+e.message, 'er'); const b = $('swrList'); if(b && b.scrollIntoView) b.scrollIntoView({ behavior:'smooth', block:'start' }); }
      else { console.error(e); toastM('⚠ '+e.message, 'er'); }
    }finally{ S.busy = false; }
  }

  return { html, render, useSug, useAllSug, onEnter, onDate, pick, exportFile, draft, decide, save, bulk, bulkOn, toggleAll, refresh, poke, onChange, _state:S };
})();
window.SWR = SWR;
