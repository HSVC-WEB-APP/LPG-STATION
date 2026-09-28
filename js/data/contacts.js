/* ============================================================
 * CONTACTS — contacts.js  (v4.174 · v4.182: người THÊM TAY)
 * v4.182: ngoài file công ty còn có người admin THÊM TAY (nhân viên mới chưa có trong
 *         file) — lưu trong mail_cfg.CTX (MAILCFG.CTX), KHÔNG đụng contact_list/rows.
 *         search / byEmail / rows() gộp cả hai; file công ty có cùng email thì file thắng.
 *         Import file mới vẫn chỉ so với file cũ ⇒ người thêm tay không bị báo "đã nghỉ".
 * ------------------------------------------------------------
 * DANH BẠ CÔNG TY (HSVC Internal Contact List) nạp vào app để tìm kiếm,
 * thêm người nhận email nhanh, và dò người đã nghỉ việc.
 *
 * ⭐ TIẾT KIỆM FIREBASE (gói Spark) — thiết kế đọc/ghi tối thiểu:
 *   • Node `contact_list/meta` (~150 byte: ver, ngày cập nhật, số người)
 *     và `contact_list/rows` (MỘT chuỗi JSON gọn ~30 KB).
 *   • GHI: chỉ khi người dùng bấm Save sau khi import file MỚI và app thấy
 *     có thay đổi thật (so từng người) — mỗi tháng ~1 lần, 2 lệnh set.
 *   • ĐỌC: KHÔNG có listener. Chỉ khi mở 👥 Recipients: đọc `meta` MỘT
 *     lần/phiên; `ver` trùng bản trong localStorage ⇒ dùng bản cache, không
 *     tải `rows`. Chỉ tải `rows` khi có bản mới.
 *     (Cache localStorage ở đây AN TOÀN vì luôn được đối chiếu `ver` trước
 *     khi dùng — khác vụ cache Today Plan v4.138 không có mốc đối chiếu.)
 *   • Mọi thứ còn lại (tìm kiếm, so người nghỉ, gợi ý) tính trong RAM.
 * Mỗi người: [tên có dấu, email, bộ phận, team, chức vụ, chức danh (Hàn),
 *             máy lẻ, di động, giới tính, sheet]
 * ============================================================ */
const CONTACTS = (function(){
  'use strict';
  const LS_KEY = 'lpg_v4_contacts_v1';
  const FB = 'contact_list';
  const F = { vn:0, e:1, dept:2, team:3, pos:4, title:5, ext:6, hp:7, sex:8, sheet:9 };
  let ROWS = null, META = null, _metaChecked = false, _loading = null;
  /* v4.182 — người thêm tay: MAILCFG.CTX (đã lưu) hoặc bản đang sửa trong 👥 Recipients (PREVIEW) */
  let PREVIEW = null;
  function _extra(){ return PREVIEW || ((typeof MAILCFG !== 'undefined' && MAILCFG.CTX) || []); }
  function _all(){
    const ex = _extra(); if(!ex.length) return ROWS;
    const base = ROWS || [], have = {};
    base.forEach(r => { have[String(r[F.e]).toLowerCase()] = 1; });
    return base.concat(ex.filter(r => r && r[F.e] && !have[String(r[F.e]).toLowerCase()]));
  }

  function ascii(s){
    return String(s || '').replace(/Đ/g,'D').replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  }
  function _cacheGet(){ try{ const v = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return v && v.meta && Array.isArray(v.rows) ? v : null; }catch(_){ return null; } }
  function _cacheSet(meta, rows){ try{ localStorage.setItem(LS_KEY, JSON.stringify({ meta, rows })); }catch(_){} }
  function _db(){ return (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null; }

  /* nạp danh bạ: RAM → (1 lần/phiên đọc meta) → cache hoặc tải rows */
  function load(force){
    if(_metaChecked && !force) return Promise.resolve(ROWS || []);
    if(_loading) return _loading;
    const c = _cacheGet();
    if(c && !ROWS){ ROWS = c.rows; META = c.meta; }
    const db = _db();
    if(!db){ return Promise.resolve(ROWS || []); }
    _loading = db.ref(FB + '/meta').once('value').then(s => {
      _metaChecked = true;
      const m = s.val();
      if(!m){ return ROWS || []; }
      if(c && c.meta && c.meta.ver === m.ver){ META = m; return ROWS; }       /* cache còn đúng bản ⇒ không tải */
      return db.ref(FB + '/rows').once('value').then(r => {
        let rows = []; try{ rows = JSON.parse(r.val() || '[]'); }catch(_){}
        ROWS = rows; META = m; _cacheSet(m, rows);
        return ROWS;
      });
    }).catch(e => { console.warn('[CONTACTS] load', e); return ROWS || []; })
      .finally(() => { _loading = null; try{ document.dispatchEvent(new CustomEvent('contacts:changed')); }catch(_){} });
    return _loading;
  }

  /* ── đọc file Contact List (.xls/.xlsx) — mọi sheet có cột Full Name + Email ── */
  function _norm(h){ return String(h || '').toLowerCase().replace(/\s+/g,' ').trim(); }
  function parseWorkbook(wb){
    const out = [], seen = {};
    let upd = '';
    wb.SheetNames.forEach(sn => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header:1, raw:true, defval:'' });
      let hr = -1, col = {};
      for(let i = 0; i < Math.min(aoa.length, 15); i++){
        const r = aoa[i].map(_norm);
        const iu = r.indexOf('updated until:'); if(iu >= 0 && !upd){ const v = aoa[i][iu + 1]; upd = typeof v === 'number' ? new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0,10) : String(v || ''); }
        if(r.includes('email') && r.includes('full name')){ hr = i;
          r.forEach((h, j) => { if(!(h in col)) col[h] = j; });
          break; }
      }
      if(hr < 0) return;
      const get = (row, k) => col[k] == null ? '' : row[col[k]];
      for(let i = hr + 1; i < aoa.length; i++){
        const row = aoa[i];
        const e = String(get(row, 'email') || '').trim(); const nm = String(get(row, 'full name') || '').trim();
        if(!nm || !/@/.test(e)) continue;
        const k = e.toLowerCase(); if(seen[k]) continue; seen[k] = 1;
        out.push([nm, e, String(get(row,'department')||get(row,'plant')||'').trim(), String(get(row,'team/section')||'').trim(),
          String(get(row,'position')||'').trim(), String(get(row,'job title')||'').trim(), String(get(row,'extension number')||'').trim(),
          String(get(row,'telephone')||'').trim(), String(get(row,'sex')||'').trim(), sn]);
      }
    });
    return { rows:out, upd };
  }
  async function readFile(file){
    const wb = XLSX.read(await file.arrayBuffer(), { type:'array' });
    const r = parseWorkbook(wb);
    if(!r.rows.length) throw new Error('No "Full Name" + "Email" table found');
    return r;
  }
  /* so bản mới với bản đang dùng — theo email */
  function diff(next){
    const cur = {}; (ROWS || []).forEach(r => { cur[r[F.e].toLowerCase()] = r; });
    const nx = {}; next.forEach(r => { nx[r[F.e].toLowerCase()] = r; });
    const added = next.filter(r => !cur[r[F.e].toLowerCase()]);
    const removed = (ROWS || []).filter(r => !nx[r[F.e].toLowerCase()]);
    const changed = next.filter(r => { const o = cur[r[F.e].toLowerCase()]; return o && JSON.stringify(o.slice(0, 9)) !== JSON.stringify(r.slice(0, 9)); });
    return { added, removed, changed, same: !added.length && !removed.length && !changed.length };
  }
  /* ghi Firebase: 2 lệnh set, CHỈ khi có thay đổi */
  function save(parsed, fileName){
    if(String(((typeof window !== 'undefined' && window.CURRENT_USER) || {}).role || '') !== 'admin') return Promise.reject(new Error('Only an administrator can change the contact list'));
    const d = diff(parsed.rows);
    if(d.same && META) return Promise.resolve({ skipped:true });
    const db = _db(); if(!db) return Promise.reject(new Error('Firebase not ready'));
    const meta = { ver:Date.now(), at:Date.now(), by:(typeof CURRENT_USER !== 'undefined' && (CURRENT_USER.name || CURRENT_USER.email)) || '?',
                   file:String(fileName || ''), upd:parsed.upd || '', n:parsed.rows.length };
    return db.ref(FB + '/rows').set(JSON.stringify(parsed.rows))
      .then(() => db.ref(FB + '/meta').set(meta))
      .then(() => { ROWS = parsed.rows; META = meta; _metaChecked = true; _cacheSet(meta, ROWS);
        try{ logAudit('contacts:import', 'contact_list', 'rows', meta.n+' people · '+meta.file, '', 'update'); }catch(_){}
        try{ document.dispatchEvent(new CustomEvent('contacts:changed')); }catch(_){}
        return { skipped:false, meta, diff:d }; });
  }
  /* tìm trong RAM — mọi từ khoá đều phải khớp (không dấu, không phân biệt hoa thường) */
  function search(q, max){
    const all = _all(); if(!all) return [];
    const ws = ascii(q).toLowerCase().split(' ').filter(Boolean);
    if(!ws.length) return [];
    const out = [];
    for(const r of all){
      const hay = ascii([r[F.vn], r[F.e], r[F.dept], r[F.team], r[F.pos], r[F.title], r[F.ext]].join(' ')).toLowerCase();
      if(ws.every(w => hay.indexOf(w) >= 0)){ out.push(r); if(out.length >= (max || 40)) break; }
    }
    return out;
  }
  function byEmail(e){ const all = _all(); if(!all || !e) return null; const k = String(e).toLowerCase(); return all.find(r => String(r[F.e]).toLowerCase() === k) || null; }
  /* v4.182 — email có trong FILE công ty không (khác người thêm tay) */
  function inCompany(e){ if(!ROWS || !e) return false; const k = String(e).toLowerCase(); return ROWS.some(r => String(r[F.e]).toLowerCase() === k); }
  function isManual(r){ return !!r && r[F.sheet] === 'Manual'; }
  /* một dòng danh bạ → một mục DIR của MAILCFG */
  function toPerson(r){
    const kor = /korean/i.test(r[F.sheet]);
    const hp = String(r[F.hp] || '').replace(/\D/g,'');
    return { id:r[F.e].split('@')[0], n:ascii(r[F.vn]), vn:r[F.vn], e:r[F.e],
             title:(kor && r[F.title] && r[F.title] !== 'x') ? r[F.title] : r[F.pos], sex:r[F.sex],
             hp: hp.length === 10 ? hp.slice(0,4)+'.'+hp.slice(4,7)+'.'+hp.slice(7) : hp };
  }
  return { load, readFile, parseWorkbook, diff, save, search, byEmail, toPerson, ascii, F, inCompany, isManual,
           setPreview:a => { PREVIEW = a || null; }, companyRows:() => ROWS,
           rows:() => _all(), meta:() => META, _set:(rows, meta) => { ROWS = rows; META = meta; _metaChecked = true; } };
})();
