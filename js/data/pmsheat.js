/* ============================================================
 * PMSHEAT — pmsheat.js  (v4.197 — buildMaster ghi đè sheet cùng chuyến · v4.176 — nhận A/B chắc tay hơn; v4.173 bản đầu)
 * ------------------------------------------------------------
 * HEATER C3 từ dữ liệu PMS (TagMonitoringReport — mỗi tag một file,
 * dữ liệu theo PHÚT, sheet "RawData": DateAndTime | PRO2.FQT32331 …).
 *   FQT32331 = Heater A · FQT32341 = Heater B (bộ đếm tổng, kg).
 *
 * Luật tính (giống cách nhân viên làm tay trên file giờ):
 *   • người dùng chốt START và STOP (app đề xuất từ lúc bộ đếm bắt đầu /
 *     thôi tăng; ⭐ người dùng luôn sửa được — nguyên tắc "app đoán, người chốt");
 *   • chia ngày tại 00:00: ngày d = đếm(min(STOP, 00:00 ngày sau)) −
 *     đếm(max(START, 00:00 ngày d));
 *   • "đếm(t)" = số đọc cuối cùng có thời điểm ≤ t.
 * File PMS có thể nhiều chuyến tàu (1 tháng) ⇒ tách các ĐỢT CHẠY: phút có
 * bộ đếm tăng ≥ 3 kg, hai phút tăng cách nhau > 6 giờ là hai đợt khác nhau,
 * đợt < 200 kg (nhích +1 lúc nghỉ) bị bỏ.
 *
 * Xuất: thêm sheet "`YY.NN항차_Data" (số giờ + bảng báo cáo) và một dòng ở
 * sheet "Sumary" vào file "Heater 연료 사용량 (유량계 기준).xlsx" — JSZip
 * sửa XML, không đụng sheet cũ. CHỈ ĐỌC RAM + file người dùng chọn.
 * ============================================================ */
const PMSHEAT = (function(){
  'use strict';
  const TAGS = { FQT32331:'A', FQ32331:'A', FQT32341:'B', FQ32341:'B' };
  const STEP_KG = 3, GAP_MS = 6 * 3600e3, MIN_RUN_KG = 200;

  function parseTs(v){
    if(v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds()).getTime();
    if(typeof v === 'number' && v > 30000 && v < 80000){                 /* serial Excel */
      const ms = Math.round((v - 25569) * 864e5); const d = new Date(ms);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()).getTime();
    }
    const m = String(v || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(!m) return null;
    return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)).getTime();
  }
  /* ⭐ v4.176 — NHẬN DIỆN HEATER A / B CHẮC TAY HƠN.
     Trước: chỉ đọc ô tiêu đề cạnh "DateAndTime" và cắt phần sau dấu chấm
     cuối ⇒ tiêu đề kiểu "PRO2.FQT32331.PV" / "FQT-32331 (kg)" là trượt.
     Nay: chuẩn hoá chữ (bỏ mọi ký tự không phải chữ/số) rồi tìm "32331" /
     "32341" ở — theo thứ tự — (1) ô tiêu đề từng cột, (2) chữ phía trên dòng
     tiêu đề + tên sheet + TÊN FILE. Vẫn không đoán ra ⇒ heater = null và nơi gọi
     hỏi người dùng (nguyên tắc: app đoán, người chốt — không đoán mò).
     Một file có CẢ HAI tag (hai cột) ⇒ trả đủ cả hai chuỗi trong .all. */
  const TAG_OF = { A:'FQT32331', B:'FQT32341' };
  function tagOf(t){
    const u = String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const a = u.indexOf('32331') >= 0, b = u.indexOf('32341') >= 0;
    return a && !b ? 'A' : b && !a ? 'B' : null;
  }
  const HDR_RE = /^(date\s*and\s*time|dateandtime|date\s*time|datetime|timestamp|time\s*stamp|date|time)$/i;
  /* AOA (mảng 2 chiều) của một sheet → { tag, heater, pts:[[ms, kg]], how, all:[…] }
     hint = tên file + tên sheet (chỗ dò thứ hai khi tiêu đề cột không có tag) */
  function parseAoa(aoa, hint){
    let hr = -1;
    for(let i = 0; i < Math.min(aoa.length, 30) && hr < 0; i++){
      if(HDR_RE.test(String((aoa[i] || [])[0] || '').trim())) hr = i;
    }
    if(hr < 0){   /* không có chữ DateAndTime: dòng đầu tiên có thời điểm ở cột A là dữ liệu */
      for(let i = 0; i < Math.min(aoa.length, 40); i++){ if(parseTs((aoa[i] || [])[0]) != null){ hr = i - 1; break; } }
      if(hr < -1 || (hr === -1 && parseTs((aoa[0] || [])[0]) == null)) throw new Error('No "DateAndTime" header found');
    }
    const head = hr >= 0 ? (aoa[hr] || []) : [];
    let first = null;                        /* dòng dữ liệu đầu tiên */
    for(let i = hr + 1; i < Math.min(aoa.length, hr + 50); i++){ if(parseTs((aoa[i] || [])[0]) != null){ first = aoa[i]; break; } }
    if(!first) throw new Error('No time-stamped rows found');
    const numCols = [];
    for(let j = 1; j < Math.max(head.length, first.length); j++){
      if(isFinite(parseFloat(String(first[j] == null ? '' : first[j]).replace(/,/g,'')))) numCols.push(j);
    }
    /* (1) tag nằm ở ô tiêu đề cột */
    let cols = [];
    for(let j = 1; j < head.length; j++){ const h = tagOf(head[j]); if(h && !cols.some(c => c.heater === h)) cols.push({ j, heater:h, how:'column header "'+String(head[j]).trim()+'"' }); }
    /* (2) không có ⇒ một cột số đầu tiên + dò chữ phía trên / tên sheet / tên file */
    if(!cols.length){
      if(!numCols.length) throw new Error('No FQT32331 / FQT32341 column found');
      let txt = '';
      for(let i = 0; i < Math.max(0, hr); i++) txt += ' ' + (aoa[i] || []).join(' ');
      const hHead = tagOf(txt), hHint = tagOf(hint);
      const h = hHead || hHint;
      cols = [{ j:numCols[0], heater:h, how: hHead ? 'text above the table' : hHint ? 'file / sheet name' : 'not recognised' }];
    }
    const all = cols.map(c => {
      const pts = [];
      for(let i = hr + 1; i < aoa.length; i++){
        const r = aoa[i] || []; const t = parseTs(r[0]); const v = parseFloat(String(r[c.j] == null ? '' : r[c.j]).replace(/,/g,''));
        if(t != null && isFinite(v)) pts.push([t, v]);
      }
      pts.sort((a,b) => a[0] - b[0]);
      return { tag: c.heater ? TAG_OF[c.heater] : String(head[c.j] || '').trim(), heater:c.heater, pts, how:c.how, col:c.j };
    });
    return Object.assign({}, all[0], { all });
  }
  /* File/ArrayBuffer → parseAoa (cần SheetJS global XLSX) */
  async function parseFile(file){
    const buf = file.arrayBuffer ? await file.arrayBuffer() : file;
    const wb = XLSX.read(buf, { type:'array', cellDates:false, raw:true });
    const names = wb.SheetNames.slice().sort((a,b) => (/raw/i.test(b) ? 1 : 0) - (/raw/i.test(a) ? 1 : 0));
    let err = null;
    for(const n of names){
      try{ const aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header:1, raw:true, defval:'' });
           const fname = file.name || '';
           return Object.assign(parseAoa(aoa, fname + ' ' + n), { sheet:n, file:fname }); }
      catch(e){ err = e; }
    }
    throw err || new Error('Empty workbook');
  }
  /* gộp hai chuỗi số đọc (file tách nhiều phần / nạp lại file đã sửa): trùng thời điểm ⇒ bản mới thắng */
  function mergePts(a, b){
    if(!a || !a.length) return (b || []).slice();
    const m = new Map(); a.forEach(p => m.set(p[0], p[1])); (b || []).forEach(p => m.set(p[0], p[1]));
    return [...m.entries()].sort((x,y) => x[0] - y[0]);
  }
  /* số đọc cuối cùng có thời điểm ≤ t */
  function valueAt(pts, t){
    let lo = 0, hi = pts.length - 1, ans = -1;
    while(lo <= hi){ const m = (lo + hi) >> 1; if(pts[m][0] <= t){ ans = m; lo = m + 1; } else hi = m - 1; }
    return ans < 0 ? null : pts[ans][1];
  }
  /* các đợt chạy (A và B gộp) — mỗi đợt: {start, stop, a, b} */
  function runs(A, B){
    const act = [];
    [A, B].forEach(P => { if(!P) return;
      for(let i = 1; i < P.length; i++){ if(P[i][1] - P[i-1][1] >= STEP_KG) act.push([P[i-1][0], P[i][0]]); } });
    act.sort((x,y) => x[0] - y[0]);
    const out = [];
    act.forEach(([s, e]) => {
      const last = out[out.length - 1];
      if(last && s - last.stop <= GAP_MS) last.stop = Math.max(last.stop, e);
      else out.push({ start:s, stop:e });
    });
    return out.map(r => Object.assign(r, used(A, B, r.start, r.stop))).filter(r => r.a + r.b >= MIN_RUN_KG);
  }
  function used(A, B, s, e){
    const d = P => { if(!P || !P.length) return 0; const x = valueAt(P, s), y = valueAt(P, e); return (x == null || y == null) ? 0 : Math.max(0, y - x); };
    return { a:d(A), b:d(B) };
  }
  function dayStart(t){ const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function iso(t){ const d = new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  /* chia theo ngày tại 00:00 */
  function daily(A, B, start, stop){
    const out = [];
    for(let d0 = dayStart(start); d0 < stop; ){
      const d1 = new Date(new Date(d0).getFullYear(), new Date(d0).getMonth(), new Date(d0).getDate() + 1).getTime();
      const s = Math.max(start, d0), e = Math.min(stop, d1);
      const u = used(A, B, s, e);
      out.push({ date:iso(d0), from:s, to:e, a:u.a, b:u.b, total:u.a + u.b,
                 aFrom:A ? valueAt(A, s) : null, aTo:A ? valueAt(A, e) : null, bFrom:B ? valueAt(B, s) : null, bTo:B ? valueAt(B, e) : null });
      d0 = d1;
    }
    return out;
  }

  /* ═════ thêm sheet chuyến + dòng Sumary vào file Heater master ═════ */
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function colNum(L){ let n = 0; for(const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
  function serial(t){ const d = new Date(t); return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - Date.UTC(1899, 11, 30)) / 864e5; }
  function fmtTs(t){ const d = new Date(t), p = n => String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':00'; }
  function cN(ref, s, v){ return '<c r="'+ref+'"'+(s ? ' s="'+s+'"' : '')+'><v>'+v+'</v></c>'; }
  function cS(ref, s, v){ return '<c r="'+ref+'"'+(s ? ' s="'+s+'"' : '')+' t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>'; }
  function styleOf(xml, ref){ const m = xml.match(new RegExp('<c r="'+ref+'"[^>]*?\\bs="(\\d+)"')); return m ? m[1] : null; }
  function putCell(rowXml, col, xml){
    const re = new RegExp('<c r="'+col+'\\d+"[^>]*?(?:/>|>[\\s\\S]*?</c>)');
    if(re.test(rowXml)) return rowXml.replace(re, () => xml);
    const n = colNum(col), cre = /<c r="([A-Z]+)\d+"/g; let m, at = -1;
    while((m = cre.exec(rowXml))){ if(colNum(m[1]) > n){ at = m.index; break; } }
    if(/\/>$/.test(rowXml)) rowXml = rowXml.replace(/\/>$/, '></row>');
    if(at < 0) return rowXml.replace(/<\/row>$/, () => xml + '</row>');
    return rowXml.slice(0, at) + xml + rowXml.slice(at);
  }
  async function sheetList(zip){
    const wb = await zip.file('xl/workbook.xml').async('string');
    const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const out = []; const re = /<sheet\b[^>]*\/>/g; let m;
    while((m = re.exec(wb))){
      const nm = (m[0].match(/name="([^"]*)"/) || [])[1], id = (m[0].match(/r:id="([^"]*)"/) || [])[1];
      const sid = +((m[0].match(/sheetId="(\d+)"/) || [])[1] || 0);
      const t = (rels.match(new RegExp('<Relationship[^>]*Id="'+id+'"[^>]*/>')) || [''])[0].match(/Target="([^"]+)"/);
      out.push({ name: nm.replace(/&amp;/g,'&'), rid:id, sheetId:sid, path: t ? 'xl/' + t[1].replace(/^\/?xl\//,'') : '' });
    }
    return out;
  }
  /* chuỗi của sharedStrings (file đã được Excel lưu lại thì chuỗi inline thành shared) */
  async function sharedList(zip){
    const f = zip.file('xl/sharedStrings.xml'); if(!f) return [];
    const x = await f.async('string'); const out = []; const re = /<si>([\s\S]*?)<\/si>/g; let m;
    while((m = re.exec(x))) out.push((m[1].match(/<t[^>]*>([^<]*)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g,'')).join(''));
    return out;
  }
  /* o = { A, B, start, stop, days, vessel, amount?, name? }
     v4.197 — o.name = "`26.15항차_Data": sheet ĐÃ CÓ thì GHI ĐÈ (xuất lại mỗi ngày không đẻ sheet mới),
     dòng Sumary có ghi chú "sheet <name>" thì SỬA dòng đó thay vì thêm dòng. */
  async function buildMaster(file, o){
    const buf = file.arrayBuffer ? await file.arrayBuffer() : file;
    const zip = await JSZip.loadAsync(buf);
    const sheets = await sheetList(zip);
    const voy = sheets.map(s => s.name.match(/(\d{2})\.(\d{1,2})항차/)).filter(Boolean);
    const yy = String(new Date(o.start).getFullYear()).slice(2);
    const nn = voy.filter(m => m[1] === yy).reduce((mx, m) => Math.max(mx, +m[2]), 0) + 1;
    const name = o.name || ('`' + yy + '.' + String(nn).padStart(2,'0') + '항차_Data');
    const same = sheets.find(s => s.name === name);
    const tpl = same || sheets.filter(s => /항차_Data/.test(s.name)).pop();
    const tplXml = tpl ? await zip.file(tpl.path).async('string') : '';
    const st = ref => tplXml ? styleOf(tplXml, ref) : null;
    /* ── dữ liệu theo GIỜ từ (START − 1h) tới (STOP + 1h), cột A/B/C như file gốc ── */
    const h0 = Math.floor(o.start / 3600e3) * 3600e3 - 3600e3, h1 = Math.ceil(o.stop / 3600e3) * 3600e3 + 3600e3;
    const rows = [];
    rows.push([cS('A1', st('A1'), 'DateAndTime'), cS('B1', st('B1'), 'PRO2.FQT32331'), cS('C1', st('C1'), 'PRO2.FQT32341')]);
    const marks = {};
    const addRow = t => { const r = rows.length + 1;
      rows.push([cS('A'+r, st('A3'), fmtTs(t)), cN('B'+r, st('B8'), o.A ? valueAt(o.A, t) : 0), cN('C'+r, st('C8'), o.B ? valueAt(o.B, t) : 0)]); return r; };
    const times = new Set();
    for(let t = h0; t <= h1; t += 3600e3) times.add(t);
    times.add(o.start); times.add(o.stop);
    [...times].sort((a,b) => a - b).forEach(t => { marks[t] = addRow(t); });
    /* ── khối báo cáo cột F..I (giá trị, cùng bố cục sheet chuyến trước) ── */
    const blk = [];
    const put = (r, arr) => { blk.push([r, arr]); };
    put(4, [cS('F4', st('F4'), 'DAILY HEATER C3 CONSUMPTION REPORT')]);
    put(5, [cS('F5', st('F5'), 'Vessel: '), cS('G5', st('G5'), o.vessel || '')]);
    let r = 6;
    o.days.forEach(d => {
      put(r,   [cN('F'+r, st('F6'), serial(new Date(d.date+'T00:00:00').getTime()))]);
      put(r+1, [cS('F'+(r+1), st('F7'), 'Heater A'), cN('G'+(r+1), st('G7'), d.a), cS('I'+(r+1), st('I7'), 'kg')]);
      put(r+2, [cS('F'+(r+2), st('F8'), 'Heater B'), cN('G'+(r+2), st('G8'), d.b)]);
      put(r+3, [cS('F'+(r+3), st('F9'), 'Daily Total'), cN('G'+(r+3), st('G9'), d.total)]);
      r += 4;
    });
    put(r, [cS('F'+r, st('F18'), 'TOTAL CONSUMPTION')]); r++;
    put(r, ['Date','Heater A','Heater B','Total'].map((t,i) => cS('FGHI'[i]+r, st('FGHI'[i]+'19'), t))); r++;
    let ga = 0, gb = 0;
    o.days.forEach(d => { ga += d.a; gb += d.b;
      put(r, [cN('F'+r, st('F20'), serial(new Date(d.date+'T00:00:00').getTime())), cN('G'+r, st('G20'), d.a), cN('H'+r, st('H20'), d.b), cN('I'+r, st('I20'), d.total)]); r++; });
    put(r, [cS('F'+r, st('F23'), 'GRAND TOTAL'), cN('G'+r, st('G23'), ga), cN('H'+r, st('H23'), gb), cN('I'+r, st('I23'), ga + gb)]);
    const maxR = Math.max(rows.length, r);
    let sd = '<sheetData>';
    for(let i = 1; i <= maxR; i++){
      const cells = (rows[i-1] || []).slice();
      blk.filter(b => b[0] === i).forEach(b => b[1].forEach(c => cells.push(c)));
      cells.sort((x,y) => colNum(x.match(/r="([A-Z]+)/)[1]) - colNum(y.match(/r="([A-Z]+)/)[1]));
      if(cells.length) sd += '<row r="'+i+'">' + cells.join('') + '</row>';
    }
    sd += '</sheetData>';
    let head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    const cols = (tplXml.match(/<cols>[\s\S]*?<\/cols>/) || [''])[0];
    head += '<dimension ref="A1:I'+maxR+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.5"/>' + cols;
    const sheetXml = head + sd + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
    let ct = await zip.file('[Content_Types].xml').async('string');
    if(same && same.path){ zip.file(same.path, sheetXml); }
    else {
    /* ── đăng ký sheet mới (thêm CUỐI để không lệch localSheetId của definedNames) ── */
    const nums = Object.keys(zip.files).map(f => (f.match(/^xl\/worksheets\/sheet(\d+)\.xml$/) || [])[1]).filter(Boolean).map(Number);
    const sn = Math.max(0, ...nums) + 1, path = 'xl/worksheets/sheet'+sn+'.xml';
    zip.file(path, sheetXml);
    let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const rid = 'rId' + (Math.max(0, ...(rels.match(/Id="rId(\d+)"/g) || []).map(x => +x.match(/\d+/)[0])) + 1);
    rels = rels.replace('</Relationships>', '<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+sn+'.xml"/></Relationships>');
    zip.file('xl/_rels/workbook.xml.rels', rels);
    let wb = await zip.file('xl/workbook.xml').async('string');
    const sid = Math.max(0, ...sheets.map(s => s.sheetId)) + 1;
    wb = wb.replace('</sheets>', '<sheet name="'+esc(name)+'" sheetId="'+sid+'" r:id="'+rid+'"/></sheets>');
    if(wb.indexOf('fullCalcOnLoad') < 0) wb = /<calcPr\b/.test(wb) ? wb.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"') : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
    zip.file('xl/workbook.xml', wb);
    ct = ct.replace('</Types>', '<Override PartName="/'+path+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    }
    /* ── dòng mới ở Sumary ── */
    const sum = sheets.find(s => /^sum/i.test(s.name));
    let sumRow = null;
    if(sum){
      let x = await zip.file(sum.path).async('string');
      let last = 0; const re = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g; let m;
      while((m = re.exec(x))){
        const cm = m[2].match(/<c r="C\d+"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/);
        if(cm && cm[1] && /<v>|<is>/.test(cm[1])) last = Math.max(last, +m[1]);
      }
      /* v4.197 — dòng đã ghi cho chính sheet này (ô R chứa "sheet <name>") ⇒ sửa tại chỗ */
      const shared = await sharedList(zip), mark = 'sheet '+name;
      let mine = 0; const rr = /<c r="R(\d+)"([^>]*?)>([\s\S]*?)<\/c>/g; let cm2;
      while((cm2 = rr.exec(x))){
        const txt = /t="s"/.test(cm2[2]) ? (shared[+((cm2[3].match(/<v>(\d+)<\/v>/) || [])[1])] || '') : (cm2[3].match(/<t[^>]*>([^<]*)<\/t>/) || [,''])[1];
        if(txt.indexOf(mark) >= 0) mine = +cm2[1];
      }
      const R = mine || last + 1, P = mine ? mine - 1 : last;
      const s = col => styleOf(x, col + P);
      const noM = x.match(new RegExp('<c r="B'+P+'"[^>]*>\\s*<v>(\\d+)</v>')); const no = noM ? (+noM[1] + 1) : '';
      const cells = [];
      if(no !== '' && !mine) cells.push(['B', cN('B'+R, s('B'), no)]);
      cells.push(['C', cS('C'+R, s('C'), o.vessel || '')]);
      if(o.amount) cells.push(['E', cN('E'+R, s('E'), o.amount)]);
      cells.push(['H', cN('H'+R, s('H'), serial(o.start))]);
      cells.push(['I', cN('I'+R, s('I'), serial(o.stop))]);
      cells.push(['O', cN('O'+R, s('O'), ga)]); cells.push(['P', cN('P'+R, s('P'), gb)]); cells.push(['Q', cN('Q'+R, s('Q'), ga + gb)]);
      cells.push(['R', cS('R'+R, s('R'), 'PMS · sheet '+name)]);
      const rm = x.match(new RegExp('<row r="'+R+'"[^>]*?(?:/>|>[\\s\\S]*?</row>)'));
      let rx = rm ? rm[0] : '<row r="'+R+'"></row>';
      cells.forEach(([col, cx]) => { rx = putCell(rx, col, cx); });
      if(rm) x = x.replace(rm[0], () => rx);
      else {
        const after = [...x.matchAll(/<row r="(\d+)"/g)].find(mm => +mm[1] > R);
        x = after ? x.slice(0, after.index) + rx + x.slice(after.index) : x.replace('</sheetData>', () => rx + '</sheetData>');
      }
      zip.file(sum.path, x);
      sumRow = R;
    }
    if(zip.file('xl/calcChain.xml')){
      zip.remove('xl/calcChain.xml');
      ct = ct.replace(/<Override[^>]*calcChain[^>]*\/>/, '');
      let rl = await zip.file('xl/_rels/workbook.xml.rels').async('string');
      zip.file('xl/_rels/workbook.xml.rels', rl.replace(/<Relationship[^>]*calcChain[^>]*\/>/, ''));
    }
    zip.file('[Content_Types].xml', ct);
    if(zip.file('xl/sharedStrings.xml')){}   /* chuỗi mới luôn ghi inline — không đụng sharedStrings */
    const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 },
      mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return { blob, sheet:name, sumRow, replaced:!!same };
  }

  return { parseFile, parseAoa, tagOf, mergePts, TAG_OF, runs, daily, used, valueAt, buildMaster, fmtTs, iso, serial };
})();
