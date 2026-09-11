/* ============================================================
 * ODORXL  —  odorxl.js        (v4.142)
 * ------------------------------------------------------------
 * Global xuất ra : window.ODORXL
 * Phụ thuộc      : ODOR (ODOR.snapshot()), JSZip
 * Khởi tạo (boot): không cần — modal tự dựng khi mở lần đầu.
 * ------------------------------------------------------------
 * MÔ TẢ
 *   Xuất tab 🧴 Odorant vào CHÍNH FILE EXCEL "Cavern Odorant Stock":
 *   người dùng chọn file .xlsx đang dùng, chọn tháng báo cáo, phần mềm
 *   CHÈN THÊM DÒNG cho tháng đó vào cả hai sheet
 *       • ODR_Consumption_Cavern  (bảng chi tiết)
 *       • Cavern                  (bảng tổng hợp theo tháng)
 *   rồi lưu ra file mới. File gốc KHÔNG bị sửa.
 *
 *   ⚠ TẠI SAO KHÔNG DÙNG SheetJS (XLSX.writeFile)
 *   ---------------------------------------------
 *   SheetJS đọc-ghi lại workbook là MẤT style, mất comment, mất
 *   conditional formatting, mất drawing/VML, mất print setting. Ở đây
 *   ta sửa TRỰC TIẾP XML trong file zip bằng JSZip: chỉ hai file
 *   xl/worksheets/sheet*.xml (+ workbook.xml) bị chạm. Mọi thứ còn lại
 *   giữ nguyên 100 % byte.
 *
 *   ⚠ "CHÈN DÒNG" LÀM ĐÚNG NGỮ NGHĨA CỦA EXCEL
 *   -------------------------------------------
 *   Chèn một dòng ở vị trí `at` KHÔNG chỉ là thêm một khối <row>.
 *   Phải làm đủ 6 việc, thiếu một việc là Excel báo file hỏng hoặc ra
 *   số sai IM LẶNG:
 *     1. Gỡ shared-formula (t="shared") thành công thức thường. File
 *        này dùng shared formula dày đặc, có cả ô "con" (si=20 ở O29)
 *        nằm cách ô "chủ" (O22) 7 dòng — đánh số lại dòng mà bỏ qua
 *        bước này là Excel bắt repair.
 *     2. Dịch MỌI tham chiếu tới sheet đích: hàng ≥ at thì +count.
 *        Áp cho công thức ở MỌI sheet (sheet Cavern tra cứu sang sheet
 *        ODR bằng LOOKUP), cho cả <formula> của conditional formatting
 *        và definedNames trong workbook.xml.
 *        Vùng có điểm cuối ≥ at thì NỚI RA — đó là lý do SUM(C9:C28)
 *        tự thành SUM(C9:C29), y như Excel làm.
 *     3. Đánh số lại thuộc tính r= của <row> và của từng ô <c>.
 *     4. Dịch mergeCells · dimension · autoFilter · sqref của
 *        conditionalFormatting / dataValidation / ignoredErrors ·
 *        hyperlink · ref của comment.
 *     5. Xoá xl/calcChain.xml (kèm rel + Content_Types) và bật
 *        fullCalcOnLoad để Excel tính lại toàn bộ khi mở.
 *     6. Style dòng mới: lấy nguyên style của dòng CUỐI BẢNG (dòng
 *        cuối thường có viền đáy đậm), rồi HẠ dòng cuối cũ về style
 *        dòng giữa — nhờ vậy viền đáy của bảng luôn nằm đúng dòng cuối.
 *
 *   CÔNG THỨC DÒNG MỚI KHÔNG HARD-CODE
 *   -----------------------------------
 *   Mỗi cột của dòng mới lấy công thức bằng cách DỊCH công thức của ô
 *   cùng cột ở dòng gần nhất phía trên có công thức (sau khi đã gỡ
 *   shared formula). Sửa công thức bên Excel thì dòng mới tự theo —
 *   không cần sửa lại mã. Cột nào là dữ liệu nhập tay (Date, Mixing
 *   Q'ty, FQ, Gravity, Charging, LG 21201, Inventory m3, Remark) thì
 *   ghi số từ tab Odorant; cột nào không thuộc hai loại trên (H.H/H/L
 *   Inventory = ngưỡng báo động) thì COPY Y NGUYÊN ô của dòng mẫu.
 *
 *   MAP CỘT THEO TÊN HEADER, KHÔNG THEO VỊ TRÍ
 *   -------------------------------------------
 *   Thêm/bớt/đảo cột bên Excel vẫn chạy đúng. Không tìm thấy header
 *   nào thì báo lỗi rõ ràng chứ không ghi bừa.
 *
 *   CHẠY LẠI NHIỀU LẦN VẪN AN TOÀN (idempotent)
 *   --------------------------------------------
 *   Tháng đã có dòng trong file → CẬP NHẬT tại chỗ, không chèn trùng.
 *   Tháng chưa có → chèn mới. Chọn tháng cách xa dòng cuối thì mọi
 *   tháng còn thiếu ở giữa được chèn đủ, không để lỗ.
 * ============================================================ */

const ODORXL = (function(){
  'use strict';

  const state = { zip:null, fileName:'', fileHandle:null, built:false, plan:null };

  /* Tên sheet cần tới */
  const SH_ODR = /^\s*ODR[_ ]?Consumption[_ ]?Cavern\s*$/i;
  const SH_CAV = /^\s*Cavern\s*$/i;

  /* header (đã normalize) → field dữ liệu ghi từ tab Odorant.
     Cột KHÔNG có trong map: có công thức thì dịch công thức, không có
     công thức thì copy y nguyên ô của dòng mẫu. */
  const MAP_ODR = {
    no:'seq', date:'date',
    lpgmixingqty:'c', fq21171:'d', gravity:'e', charging:'f',
    lg21201:'g', inventory:'h', remark:'rm'
  };
  const MAP_CAV = { monthly:'date', odofillingkg:'f' };

  /* ═══════════════════════════════════════════════════════════
     1. HELPERS — chuỗi, số, ngày
     ═══════════════════════════════════════════════════════════ */
  function _norm(s){ return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]/g,''); }
  function _xesc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _n(v){
    if(v==null || v==='') return null;
    const x = parseFloat(String(v).replace(/,/g,''));
    return isFinite(x) ? x : null;
  }
  function _colNum(L){ let n=0; for(let i=0;i<L.length;i++) n = n*26 + (L.charCodeAt(i)-64); return n; }
  function _colName(n){ let s=''; while(n>0){ const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=(n-1-r)/26; } return s; }
  /* serial Excel của NGÀY MÙNG 1 tháng ym ('YYYY-MM') */
  function _ymSerial(ym){
    const y = +ym.slice(0,4), m = +ym.slice(5,7);
    return Math.round(Date.UTC(y, m-1, 1)/86400000) + 25569;
  }
  function _serialYm(v){
    const n = _n(v); if(n==null || n < 20000 || n > 80000) return null;
    const d = new Date(Math.round((n - 25569) * 86400000));
    return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');
  }
  /* ngày CUỐI tháng, định dạng YYMMDD (dùng cho ô A2 "Date: 260831") */
  function _ymEndYYMMDD(ym){
    const y = +ym.slice(0,4), m = +ym.slice(5,7);
    const d = new Date(Date.UTC(y, m, 0));
    const p = x => String(x).padStart(2,'0');
    return String(d.getUTCFullYear()).slice(2)+p(d.getUTCMonth()+1)+p(d.getUTCDate());
  }
  const _MON = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function _ymLabel(ym){ return _MON[+ym.slice(5,7)]+'-'+ym.slice(0,4); }
  function _ymNext(ym){
    let y = +ym.slice(0,4), m = +ym.slice(5,7) + 1;
    if(m > 12){ m = 1; y++; }
    return y+'-'+String(m).padStart(2,'0');
  }
  function _nowYm(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function _prevYm(ym){
    let y = +ym.slice(0,4), m = +ym.slice(5,7) - 1;
    if(m < 1){ m = 12; y--; }
    return y+'-'+String(m).padStart(2,'0');
  }

  /* ═══════════════════════════════════════════════════════════
     2. HELPERS — XML của SpreadsheetML
     ═══════════════════════════════════════════════════════════ */
  function _parseSST(xml){
    const out = [];
    const re = /<si>([\s\S]*?)<\/si>/g; let m;
    while((m = re.exec(xml)) !== null){
      let t = ''; const tr = /<t[^>]*>([\s\S]*?)<\/t>/g; let tm;
      while((tm = tr.exec(m[1])) !== null) t += tm[1];
      out.push(t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
    }
    return out;
  }
  function _rowsOf(xml){
    const a = xml.indexOf('<sheetData');
    if(a < 0) return { pre:xml, rows:[], post:'' };
    const selfClose = /<sheetData\s*\/>/.test(xml.slice(a, a+20));
    if(selfClose){
      const e = xml.indexOf('>', a) + 1;
      return { pre:xml.slice(0,a)+'<sheetData>', rows:[], post:'</sheetData>'+xml.slice(e) };
    }
    const o = xml.indexOf('>', a) + 1;
    const b = xml.indexOf('</sheetData>', o);
    const body = xml.slice(o, b);
    const rows = [];
    const re = /<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g; let m;
    while((m = re.exec(body)) !== null){
      const rm = m[0].match(/\br="(\d+)"/);
      if(rm) rows.push({ num:parseInt(rm[1],10), xml:m[0] });
    }
    return { pre:xml.slice(0, o), rows, post:xml.slice(b) };
  }
  function _joinRows(parts){
    return parts.pre + parts.rows.slice().sort((a,b)=>a.num-b.num).map(r=>r.xml).join('') + parts.post;
  }
  function _cellsOf(rowXml){
    const map = {};
    const re = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g; let m;
    while((m = re.exec(rowXml)) !== null){
      const rm = m[0].match(/\br="([A-Z]+)(\d+)"/);
      if(rm) map[rm[1]] = m[0];
    }
    return map;
  }
  function _openTag(rowXml){ const m = rowXml.match(/^<row\b[^>]*?\/?>/); return m ? m[0] : '<row>'; }
  function _styleOf(cx){ const m = cx && cx.match(/\bs="(\d+)"/); return m ? m[1] : null; }
  function _fOf(cx){
    if(!cx) return null;
    const m = cx.match(_reF(''));
    if(m) return { attr:m[1], body:m[2] };
    const m2 = cx.match(/<f\b([^>]*)\/>/);
    if(m2) return { attr:m2[1], body:'' };
    return null;
  }
  /* giá trị hiển thị của ô (để dò header / dò dòng dữ liệu) */
  function _valOf(cx, sst){
    if(!cx) return '';
    const tm = cx.match(/\bt="([^"]+)"/);
    const tp = tm ? tm[1] : 'n';
    if(tp === 'inlineStr' || tp === 'str'){
      let t = ''; const tr = /<t[^>]*>([\s\S]*?)<\/t>/g; let m;
      while((m = tr.exec(cx)) !== null) t += m[1];
      return t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    }
    const vm = cx.match(/<v>([\s\S]*?)<\/v>/);
    if(!vm) return '';
    if(tp === 's') return sst[parseInt(vm[1],10)] || '';
    return vm[1];
  }
  function _isNumCell(cx){
    if(!cx) return false;
    const tm = cx.match(/\bt="([^"]+)"/);
    if(tm && tm[1] !== 'n') return false;
    return /<v>[\s\S]*?<\/v>/.test(cx);
  }
  /* dựng một ô: val số → <v>, chuỗi → inlineStr, '' → ô rỗng giữ style */
  function _cell(col, rn, sty, val){
    const sA = sty ? ' s="'+sty+'"' : '';
    if(val === '' || val == null) return '<c r="'+col+rn+'"'+sA+'/>';
    if(typeof val === 'number' && isFinite(val)) return '<c r="'+col+rn+'"'+sA+'><v>'+val+'</v></c>';
    return '<c r="'+col+rn+'"'+sA+' t="inlineStr"><is><t xml:space="preserve">'+_xesc(String(val))+'</t></is></c>';
  }
  function _cellF(col, rn, sty, attr, body){
    const sA = sty ? ' s="'+sty+'"' : '';
    const at = String(attr||'').replace(/\s*\bt="shared"/,'').replace(/\s*\bref="[^"]*"/,'').replace(/\s*\bsi="\d+"/,'');
    return '<c r="'+col+rn+'"'+sA+'><f'+at+'>'+_xesc(body)+'</f></c>';
  }

  /* ═══════════════════════════════════════════════════════════
     3. HELPERS — tham chiếu trong công thức
     ─────────────────────────────────────────────────────────────
     _walkRefs tách công thức thành token và gọi cb cho MỖI tham chiếu
     ô / vùng, kèm tên sheet (null = sheet chứa công thức). Bỏ qua
     chuỗi trong "..." và tên hàm / defined name.
     ═══════════════════════════════════════════════════════════ */
  /* Mỗi nhánh có nhóm bắt riêng để BIẾT CHẮC token là loại gì:
       g1 = chuỗi "..."      g2 = 'tên sheet'!    g3 = tênsheet!
       g4 = ô / vùng          g5 = tên hàm hoặc defined name
     ⚠ BẪY ĐÃ SỬA: nếu chỉ thử khớp mẫu A1 lên mọi token thì "LOG10("
     bị hiểu là ô LOG10 và bị dịch thành LOG11 — sai im lặng. Phải phân
     biệt bằng nhóm bắt, không phải bằng thử-lại. */
  function _mkTok(){
    return new RegExp(
        '("(?:[^"]|"")*")'                                          /* g1 */
      + "|'((?:[^']|'')+)'!"                                        /* g2 */
      + '|([A-Za-z_][A-Za-z0-9_.]*)!'                               /* g3 */
      + '|(\\$?[A-Z]{1,3}\\$?[0-9]{1,7}(?::\\$?[A-Z]{1,3}\\$?[0-9]{1,7})?)(?![A-Za-z0-9_.(])'
      + '|([A-Za-z_][A-Za-z0-9_.]*)'                                /* g5 */
      , 'g');
  }
  /* ⚠ BẪY ĐÃ SỬA: nhóm ($?) khớp rỗng nên a1[5] là '' (falsy) — không
     dùng nó để nhận biết "có phải vùng". Phải xem CHỮ CỘT a1[6]. */
  const _RX_A1 = /^(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?::(\$?)([A-Z]{1,3})(\$?)(\d{1,7}))?$/;
  function _isRange(a1){ return !!a1[6]; }

  function _walkRefs(f, cb){
    if(!f) return f;
    const RX = _mkTok();
    let out = '', last = 0, pendRaw = '', pendSheet = null, m;
    while((m = RX.exec(f)) !== null){
      out += f.slice(last, m.index);
      last = m.index + m[0].length;
      if(m[1] != null){ out += pendRaw + m[0]; pendRaw = ''; pendSheet = null; continue; }
      if(m[2] != null){ pendRaw = m[0]; pendSheet = m[2].replace(/''/g, "'"); continue; }
      if(m[3] != null){ pendRaw = m[0]; pendSheet = m[3]; continue; }
      if(m[4] != null){
        const a1 = _RX_A1.exec(m[4]);
        if(a1){
          const rep = cb(pendSheet, m[4], a1);
          out += pendRaw + (rep == null ? m[4] : rep);
        } else out += pendRaw + m[0];
        pendRaw = ''; pendSheet = null; continue;
      }
      out += pendRaw + m[0]; pendRaw = ''; pendSheet = null;   /* tên hàm / defined name */
    }
    out += pendRaw + f.slice(last);
    return out;
  }

  /* Dịch tham chiếu khi CHÈN `count` dòng tại `at` của sheet `tgt`.
     `cur` = sheet chứa công thức (để hiểu ref không có prefix). */
  function _shiftFormula(f, cur, tgt, at, count){
    return _walkRefs(f, (sheet, tok, a1)=>{
      const owner = sheet == null ? cur : sheet;
      if(_norm(owner) !== _norm(tgt)) return null;
      const r1 = +a1[4];
      if(!_isRange(a1)){                            /* ô đơn */
        if(r1 < at) return null;
        return a1[1]+a1[2]+a1[3]+(r1+count);
      }
      const r2 = +a1[8];                            /* vùng  */
      const n1 = r1 >= at ? r1+count : r1;
      const n2 = r2 >= at ? r2+count : r2;
      if(n1 === r1 && n2 === r2) return null;
      return a1[1]+a1[2]+a1[3]+n1+':'+a1[5]+a1[6]+a1[7]+n2;
    });
  }

  /* Dịch công thức đi (dRow, dCol) — chỉ phần tham chiếu TƯƠNG ĐỐI.
     Dùng để (a) bung shared formula, (b) sinh công thức cho dòng mới. */
  function _translate(f, dRow, dCol){
    if(!dRow && !dCol) return f;
    const mv = (ca, C, ra, R)=>{
      let c = C, r = R;
      if(!ca && dCol) c = _colName(Math.max(1, _colNum(C) + dCol));
      if(!ra && dRow) r = Math.max(1, R + dRow);
      return ca + c + ra + r;
    };
    return _walkRefs(f, (sheet, tok, a1)=>{
      let s = mv(a1[1], a1[2], a1[3], +a1[4]);
      if(_isRange(a1)) s += ':' + mv(a1[5], a1[6], a1[7], +a1[8]);
      return s;
    });
  }

  /* sqref = danh sách vùng cách nhau bởi khoảng trắng */
  function _shiftSqref(sq, at, count){
    return String(sq).split(/\s+/).filter(Boolean).map(part=>{
      const a1 = _RX_A1.exec(part);
      if(!a1) return part;
      const r1 = +a1[4];
      if(!_isRange(a1)) return a1[1]+a1[2]+a1[3]+(r1 >= at ? r1+count : r1);
      const r2 = +a1[8];
      return a1[1]+a1[2]+a1[3]+(r1 >= at ? r1+count : r1)+':'+
             a1[5]+a1[6]+a1[7]+(r2 >= at ? r2+count : r2);
    }).join(' ');
  }

  /* ═══════════════════════════════════════════════════════════
     4. GỠ SHARED FORMULA
     Ô "chủ": <f t="shared" ref="A1:A9" si="0">CT</f>
     Ô "con": <f t="shared" si="0"/>  → CT dịch theo khoảng lệch ô.
     ═══════════════════════════════════════════════════════════ */
  /* ⚠ BẪY ĐÃ SỬA: mẫu <f\b([^>]*)> khớp luôn thẻ TỰ ĐÓNG <f .../> (vì
     [^>]* ăn cả dấu /), rồi [\s\S]*?</f> chạy vượt sang ô khác ⇒ XML gãy.
     _FOPEN chỉ khớp thẻ mở <f ...> THẬT (ký tự cuối của phần thuộc tính
     không được là '/'). */
  const _FOPEN = '<f\\b((?:[^>]*[^/>])?)>';
  function _reF(flags){ return new RegExp(_FOPEN+'([\\s\\S]*?)<\\/f>', flags); }
  function _reC(flags){ return /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g; }
  /* Bỏ GIÁ TRỊ ĐÃ LƯU SẴN của một ô công thức.
     ⚠ BẮT BUỘC khi công thức bị đổi: Excel/LibreOffice hiển thị số cũ nếu
     ô còn <v>, kể cả đã bật fullCalcOnLoad — Total sẽ nói dối rất thuyết
     phục (đúng định dạng, sai số) cho tới khi ai đó bấm Ctrl+Alt+F9. */
  function _stripV(cx){
    return cx.replace(/<v>[\s\S]*?<\/v>/g, '')
             .replace(/<is>[\s\S]*?<\/is>/g, '')
             .replace(/\s*\bt="(?:str|s|inlineStr|e|b)"/g, '');
  }

  function _flattenShared(xml){
    const master = {};
    let re = new RegExp('<c\\b[^>]*\\br="([A-Z]+)(\\d+)"[^>]*>\\s*'+_FOPEN+'([\\s\\S]*?)<\\/f>', 'g'), m;
    while((m = re.exec(xml)) !== null){
      if(!/\bt="shared"/.test(m[3])) continue;
      const si = (m[3].match(/\bsi="(\d+)"/) || [])[1];
      if(si == null) continue;
      master[si] = { col:m[1], row:+m[2], body:m[4], attr:m[3] };
    }
    let nSlave = 0, nMaster = 0;
    /* ô con (thẻ <f .../> rỗng) */
    xml = xml.replace(/<c\b([^>]*)\br="([A-Z]+)(\d+)"([^>]*)>\s*<f\b([^>]*?)\/>/g,
      (all, p1, col, row, p2, fattr)=>{
        if(!/\bt="shared"/.test(fattr)) return all;
        const si = (fattr.match(/\bsi="(\d+)"/) || [])[1];
        const M = master[si];
        if(M == null) return all;
        nSlave++;
        const body = _translate(M.body, (+row) - M.row, _colNum(col) - _colNum(M.col));
        const at = fattr.replace(/\s*\bt="shared"/,'').replace(/\s*\bsi="\d+"/,'').replace(/\s*\bref="[^"]*"/,'');
        return '<c'+p1+'r="'+col+row+'"'+p2+'><f'+at+'>'+_xesc(body)+'</f>';
      });
    /* ô chủ → công thức thường */
    xml = xml.replace(_reF('g'), (all, at, body)=>{
      if(!/\bt="shared"/.test(at)) return all;
      nMaster++;
      const a2 = at.replace(/\s*\bt="shared"/,'').replace(/\s*\bsi="\d+"/,'').replace(/\s*\bref="[^"]*"/,'');
      return '<f'+a2+'>'+body+'</f>';
    });
    return { xml, nSlave, nMaster };
  }

  /* ═══════════════════════════════════════════════════════════
     5. CHÈN DÒNG — áp lên TOÀN BỘ workbook
     wb = { sheets:[{name,path,xml}], workbookXml }
     ═══════════════════════════════════════════════════════════ */
  function _shiftAllFormulas(wb, tgt, at, count){
    wb.sheets.forEach(sh=>{
      sh.xml = sh.xml.replace(_reC('g'), cx=>{
        const f = _fOf(cx);
        if(!f || !f.body) return cx;
        const old = _unesc(f.body);
        const nb  = _shiftFormula(old, sh.name, tgt, at, count);
        if(nb === old) return cx;                       /* không đổi → giữ cả cache */
        return _stripV(cx).replace(_reF(''), (a, at2)=> '<f'+at2+'>'+_xesc(nb)+'</f>');
      });
      /* <formula> của conditionalFormatting / dataValidation */
      sh.xml = sh.xml.replace(/<formula(\d?)>([\s\S]*?)<\/formula\1>/g,
        (all, k, body)=> '<formula'+k+'>'+_xesc(_shiftFormula(_unesc(body), sh.name, tgt, at, count))+'</formula'+k+'>');
    });
    wb.workbookXml = wb.workbookXml.replace(/(<definedName\b[^>]*>)([\s\S]*?)(<\/definedName>)/g,
      (all, o, body, c)=> o + _xesc(_shiftFormula(_unesc(body), tgt, tgt, at, count)) + c);
  }
  function _unesc(s){
    return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
                    .replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  }

  function _renumberRows(sh, at, count){
    const parts = _rowsOf(sh.xml);
    parts.rows.forEach(r=>{
      if(r.num < at) return;
      const nn = r.num + count;
      r.xml = r.xml.replace(/^(<row\b[^>]*?)\br="\d+"/, '$1r="'+nn+'"')
                   .replace(/(<c\b[^>]*\br=")([A-Z]+)\d+(")/g, '$1$2'+nn+'$3');
      r.num = nn;
    });
    sh.xml = _joinRows(parts);
  }

  function _fixSheetRefs(sh, at, count){
    /* dimension */
    sh.xml = sh.xml.replace(/(<dimension\s+ref=")([^"]+)(")/, (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
    /* mergeCells */
    sh.xml = sh.xml.replace(/(<mergeCell\s+ref=")([^"]+)(")/g, (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
    /* autoFilter · conditionalFormatting · dataValidation · ignoredError · hyperlink · tablePart */
    sh.xml = sh.xml.replace(/(<autoFilter\s+ref=")([^"]+)(")/g, (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
    sh.xml = sh.xml.replace(/(<(?:conditionalFormatting|dataValidation|ignoredError)\b[^>]*?\bsqref=")([^"]+)(")/g,
      (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
    sh.xml = sh.xml.replace(/(<hyperlink\b[^>]*?\bref=")([^"]+)(")/g, (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
    sh.xml = sh.xml.replace(/(<selection\b[^>]*?\bsqref=")([^"]+)(")/g, (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
  }

  function _fixComments(commentsXml, at, count){
    return commentsXml.replace(/(<comment\b[^>]*?\bref=")([^"]+)(")/g,
      (a,p,v,q)=> p+_shiftSqref(v, at, count)+q);
  }

  /* Chèn `count` dòng TRỐNG tại `at` của sheet tên `tgtName`.
     Trả về số dòng đã dịch, để log. */
  function insertRows(wb, tgtName, at, count){
    if(count <= 0) return 0;
    const sh = wb.sheets.find(s => _norm(s.name) === _norm(tgtName));
    if(!sh) throw new Error('Không tìm thấy sheet "'+tgtName+'"');
    _shiftAllFormulas(wb, sh.name, at, count);
    _renumberRows(sh, at, count);
    _fixSheetRefs(sh, at, count);
    if(sh.comments && wb.files[sh.comments])
      wb.files[sh.comments] = _fixComments(wb.files[sh.comments], at, count);
    return count;
  }

  /* ═══════════════════════════════════════════════════════════
     6. ĐỌC BỐ CỤC MỘT BẢNG
     Trả { headerRow, dataRows[], lastData, endRow, colOf, tplRow }
     colOf: 'B' → field ('date'/'c'/…) chỉ cho cột CÓ trong map
     ═══════════════════════════════════════════════════════════ */
  function _layout(sh, sst, map, opt){
    const parts = _rowsOf(sh.xml);
    const byNum = {}; parts.rows.forEach(r=>{ byNum[r.num] = _cellsOf(r.xml); });
    const nums = parts.rows.map(r=>r.num).sort((a,b)=>a-b);

    /* header = dòng đầu tiên có đủ các từ khoá bắt buộc */
    let headerRow = null, colOf = null;
    for(const n of nums){
      const cells = byNum[n];
      const hits = {}; let ok = 0;
      Object.keys(cells).forEach(L=>{
        const key = _norm(_valOf(cells[L], sst));
        if(key && map[key] && !hits[key]){ hits[key] = L; ok++; }
      });
      if(opt.must.every(k => hits[k])){
        headerRow = n;
        colOf = {};
        Object.keys(hits).forEach(k=>{ colOf[hits[k]] = map[k]; });
        break;
      }
    }
    if(headerRow == null) throw new Error('Sheet "'+sh.name+'": không tìm thấy hàng tiêu đề ('+opt.must.join(' · ')+')');

    const dateCol = Object.keys(colOf).find(L => colOf[L] === 'date');
    if(!dateCol) throw new Error('Sheet "'+sh.name+'": không thấy cột ngày');

    /* dòng dữ liệu = dưới header, ô ngày là SỐ (serial) */
    const dataRows = [];
    nums.forEach(n=>{
      if(n <= headerRow) return;
      const cells = byNum[n];
      if(!_isNumCell(cells[dateCol])) return;
      if(opt.seqCol){
        /* bảng ODR: dòng (*) đầu kỳ có No. là chữ '(*)' → không tính */
        const sc = Object.keys(colOf).find(L => colOf[L] === 'seq');
        if(sc && !_isNumCell(cells[sc])) return;
      }
      const ym = _serialYm(_valOf(cells[dateCol], sst));
      if(!ym) return;
      dataRows.push({ num:n, ym, cells });
    });
    if(!dataRows.length) throw new Error('Sheet "'+sh.name+'": không có dòng dữ liệu tháng nào');
    dataRows.sort((a,b)=>a.num-b.num);

    const lastData = dataRows[dataRows.length-1].num;
    const endRow   = nums.length ? nums[nums.length-1] : lastData;
    return { parts, byNum, nums, headerRow, colOf, dateCol, dataRows, lastData, endRow };
  }

  /* công thức của cột L ở dòng gần nhất ≤ from có <f> */
  function _nearestF(L, from, lay){
    for(let i = lay.dataRows.length-1; i >= 0; i--){
      const d = lay.dataRows[i];
      if(d.num > from) continue;
      const f = _fOf(d.cells[L]);
      if(f) return { row:d.num, f };
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
     7. DỰNG MỘT DÒNG MỚI / CẬP NHẬT MỘT DÒNG CÓ SẴN
     ═══════════════════════════════════════════════════════════ */
  function _valueFor(field, r, ctx){
    switch(field){
      case 'seq' : return ctx.seq;
      case 'date': return _ymSerial(r.ym);
      case 'c'   : return r.c == null ? '' : r.c;
      case 'd'   : return r.d == null ? '' : r.d;
      case 'e'   : return r.e == null ? '' : r.e;
      case 'f'   : return r.f == null ? 0  : r.f;
      case 'g'   : return r.g == null ? '' : r.g;
      case 'h'   : return r.h == null ? '' : r.h;
      case 'rm'  : return r.rm || '';
      default    : return '';
    }
  }

  /* dòng mới: style lấy từ styleSrc (map cột→style), nội dung từ tplRow */
  function _buildRow(rn, tplRow, styleSrc, lay, r, ctx){
    const tplCells = lay.byNum[tplRow] || {};
    const openTpl  = _openTag((lay.parts.rows.find(x=>x.num===tplRow)||{}).xml || '<row>');
    const cols = Object.keys(tplCells).sort((a,b)=>_colNum(a)-_colNum(b));
    const out = cols.map(L=>{
      const sty = (styleSrc && styleSrc[L] != null) ? styleSrc[L] : _styleOf(tplCells[L]);
      const field = lay.colOf[L];
      if(field) return _cell(L, rn, sty, _valueFor(field, r, ctx));
      const nf = _nearestF(L, tplRow, lay);
      if(nf) return _cellF(L, rn, sty, nf.f.attr, _translate(_unesc(nf.f.body), rn - nf.row, 0));
      /* không phải cột dữ liệu, không có công thức → copy y nguyên ô mẫu */
      let vx = tplCells[L].replace(/(\br=")([A-Z]+)\d+(")/, '$1$2'+rn+'$3');
      if(sty != null) vx = /\bs="\d+"/.test(vx) ? vx.replace(/\bs="\d+"/, 's="'+sty+'"')
                                                : vx.replace(/^<c /, '<c s="'+sty+'" ');
      return vx;
    }).join('');
    const open = openTpl.replace(/\br="\d+"/, 'r="'+rn+'"').replace(/\/>$/, '>');
    return open + out + '</row>';
  }

  /* cập nhật tại chỗ: chỉ ghi lại các ô DỮ LIỆU, giữ nguyên style + công thức */
  function _patchRow(rowXml, rn, lay, r, ctx){
    const cells = _cellsOf(rowXml);
    let changed = 0;
    Object.keys(lay.colOf).forEach(L=>{
      const field = lay.colOf[L];
      if(field === 'seq') return;                       /* No. giữ nguyên */
      const v = _valueFor(field, r, ctx);
      const sty = _styleOf(cells[L]);
      const nc = _cell(L, rn, sty, v);
      if(cells[L] === nc) return;
      changed++;
      if(cells[L]) rowXml = rowXml.replace(cells[L], nc);
      else         rowXml = rowXml.replace(/<\/row>$/, nc+'</row>');
    });
    return { xml:rowXml, changed };
  }

  /* ═══════════════════════════════════════════════════════════
     8. NỚI VÙNG Average / Total
     Mọi công thức tổng hợp NẰM NGOÀI vùng dữ liệu mà tham chiếu
     một vùng bắt đầu ở dòng dữ liệu đầu tiên → kéo điểm cuối tới
     dòng dữ liệu cuối cùng.
     ═══════════════════════════════════════════════════════════ */
  function _widenAggregates(sh, first, last, log){
    const parts = _rowsOf(sh.xml);
    let nFix = 0;
    parts.rows.forEach(row=>{
      const inData = row.num >= first && row.num <= last;
      if(inData) return;
      const cells = _cellsOf(row.xml);
      Object.keys(cells).forEach(L=>{
        const f = _fOf(cells[L]);
        if(!f || !f.body) return;
        const body = _unesc(f.body);
        const nb = _walkRefs(body, (sheet, tok, a1)=>{
          if(sheet != null && _norm(sheet) !== _norm(sh.name)) return null;
          if(!_isRange(a1)) return null;                   /* chỉ vùng */
          const r1 = +a1[4], r2 = +a1[8];
          /* chỉ nới vùng RÕ RÀNG là vùng dữ liệu của bảng: mốc đầu bám dòng
             dữ liệu đầu tiên (cho lệch tối đa 3 dòng — file gốc có chỗ ghi
             SUM(D3:D15) trong khi dữ liệu bắt đầu ở dòng 4) và mốc cuối còn
             ngắn hơn dòng dữ liệu cuối. */
          if(r1 < first-3 || r1 > first) return null;
          if(r2 < first || r2 >= last) return null;
          return a1[1]+a1[2]+a1[3]+r1+':'+a1[5]+a1[6]+a1[7]+last;
        });
        if(nb !== body){
          nFix++;
          const nc = cells[L].replace(_reF(''), (a,at)=>'<f'+at+'>'+_xesc(nb)+'</f>')
                             .replace(/<v>[\s\S]*?<\/v>/, '');
          row.xml = row.xml.replace(cells[L], nc);
        }
      });
    });
    sh.xml = _joinRows(parts);
    if(nFix && log) log('ℹ '+sh.name+': nới '+nFix+' công thức tổng hợp (Average/Total) tới dòng '+last, 'info');
    return nFix;
  }

  /* ═══════════════════════════════════════════════════════════
     9. NẠP / GHI WORKBOOK
     ═══════════════════════════════════════════════════════════ */
  async function _readWb(zip){
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    const rels  = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const relMap = {}; let m;
    const rr = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
    while((m = rr.exec(rels)) !== null) relMap[m[1]] = m[2];
    const sheets = [];
    const sr = /<sheet[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g;
    while((m = sr.exec(wbXml)) !== null){
      const path = 'xl/'+String(relMap[m[2]]||'').replace(/^\//,'');
      const f = zip.file(path);
      if(!f) continue;
      sheets.push({ name:m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'),
                    path, xml: await f.async('string') });
    }
    /* comment file gắn với từng sheet (ref của comment cũng phải dịch) */
    for(const sh of sheets){
      const rp = sh.path.replace(/worksheets\/([^/]+)$/, 'worksheets/_rels/$1.rels');
      const rf = zip.file(rp);
      if(!rf) continue;
      const rx = await rf.async('string');
      const cm = rx.match(/Target="([^"]*comments\d*\.xml)"/);
      if(cm) sh.comments = 'xl/'+cm[1].replace(/^\.\.\//,'').replace(/^\//,'');
    }
    const files = {};
    for(const sh of sheets) if(sh.comments && zip.file(sh.comments))
      files[sh.comments] = await zip.file(sh.comments).async('string');
    const sst = zip.file('xl/sharedStrings.xml')
      ? _parseSST(await zip.file('xl/sharedStrings.xml').async('string')) : [];
    return { sheets, workbookXml: wbXml, files, sst };
  }

  async function _writeWb(zip, wb){
    wb.sheets.forEach(sh => zip.file(sh.path, sh.xml));
    Object.keys(wb.files).forEach(p => zip.file(p, wb.files[p]));
    /* bắt Excel tính lại toàn bộ + bỏ calcChain (nếu để lại sẽ lệch dòng) */
    let w = wb.workbookXml;
    if(/<calcPr\b[^>]*\/>/.test(w)){
      w = w.replace(/<calcPr\b([^>]*?)\/>/, (a,at)=>
        '<calcPr'+at.replace(/\s*\bfullCalcOnLoad="[^"]*"/,'')+' fullCalcOnLoad="1"/>');
    } else if(/<calcPr\b/.test(w)){
      w = w.replace(/<calcPr\b([^>]*)>/, (a,at)=>
        '<calcPr'+at.replace(/\s*\bfullCalcOnLoad="[^"]*"/,'')+' fullCalcOnLoad="1">');
    } else {
      w = w.replace('</workbook>', '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    }
    zip.file('xl/workbook.xml', w);
    if(zip.file('xl/calcChain.xml')){
      zip.remove('xl/calcChain.xml');
      const rp = 'xl/_rels/workbook.xml.rels';
      if(zip.file(rp)){
        const rx = await zip.file(rp).async('string');
        zip.file(rp, rx.replace(/<Relationship[^>]*calcChain[^>]*\/>/g, ''));
      }
      if(zip.file('[Content_Types].xml')){
        const cx = await zip.file('[Content_Types].xml').async('string');
        zip.file('[Content_Types].xml', cx.replace(/<Override[^>]*calcChain[^>]*\/>/g, ''));
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     10. LÕI: ÁP DỮ LIỆU TAB ODORANT VÀO WORKBOOK
     rowsByYm: { 'YYYY-MM': {ym,c,d,e,f,g,h,rm} }
     months  : danh sách tháng cần có mặt (tăng dần)
     ═══════════════════════════════════════════════════════════ */
  function applyToWorkbook(wb, rowsByYm, months, opt, log){
    opt = opt || {};
    log = log || function(){};
    const rep = { odrIns:0, odrUpd:0, cavIns:0, cavUpd:0, warn:[] };

    const shOdr = wb.sheets.find(s => SH_ODR.test(s.name));
    const shCav = wb.sheets.find(s => SH_CAV.test(s.name));
    if(!shOdr) throw new Error('File này không có sheet "ODR_Consumption_Cavern"');
    if(!shCav) throw new Error('File này không có sheet "Cavern"');

    /* --- gỡ shared formula ở HAI sheet sẽ bị đánh số lại --- */
    [shOdr, shCav].forEach(sh=>{
      const r = _flattenShared(sh.xml);
      sh.xml = r.xml;
      if(r.nMaster || r.nSlave)
        log('ℹ '+sh.name+': gỡ '+r.nMaster+' công thức chủ + '+r.nSlave+' ô con (shared formula)', 'info');
    });

    /* ══ SHEET ODR ══ */
    let lay = _layout(shOdr, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
    const haveOdr = {}; lay.dataRows.forEach(d=>{ haveOdr[d.ym] = d.num; });
    log('ℹ '+shOdr.name+': tiêu đề hàng '+lay.headerRow+' · '+lay.dataRows.length+
        ' dòng tháng ('+_ymLabel(lay.dataRows[0].ym)+' → '+_ymLabel(lay.dataRows[lay.dataRows.length-1].ym)+
        ') · dòng cuối '+lay.lastData, 'info');

    const newOdr = months.filter(ym => !haveOdr[ym]);
    const updOdr = months.filter(ym =>  haveOdr[ym]);

    if(newOdr.length){
      const at   = lay.lastData + 1;
      const tpl  = lay.lastData;
      const prev = lay.dataRows.length > 1 ? lay.dataRows[lay.dataRows.length-2].num : null;
      const stTpl  = _sig(lay.byNum[tpl]);
      const stPrev = prev ? _sig(lay.byNum[prev]) : null;
      const closing = (stPrev && !_sameSig(stTpl, stPrev)) ? stTpl : null;
      const middle  = closing ? stPrev : stTpl;

      insertRows(wb, shOdr.name, at, newOdr.length);
      log('▶ '+shOdr.name+': chèn '+newOdr.length+' dòng tại hàng '+at+
          ' ('+newOdr.map(_ymLabel).join(', ')+')', 'ok');

      /* dòng mẫu vẫn ở chỗ cũ (tpl < at) — đọc lại bố cục sau khi chèn */
      lay = _layout(shOdr, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
      const parts = _rowsOf(shOdr.xml);
      /* hạ dòng cuối cũ về style dòng giữa để viền đáy chuyển xuống dòng mới */
      if(closing){
        const rw = parts.rows.find(x=>x.num===tpl);
        if(rw){ rw.xml = _restyle(rw.xml, middle); log('ℹ '+shOdr.name+': chuyển viền đáy bảng xuống dòng mới', 'info'); }
      }
      let seq = _n(_valOf((lay.byNum[tpl]||{})[_seqCol(lay)], wb.sst));
      newOdr.forEach((ym, ix)=>{
        const rn = at + ix;
        const r  = rowsByYm[ym] || { ym };
        const st = closing ? (ix === newOdr.length-1 ? closing : middle) : middle;
        seq = (seq == null) ? (lay.dataRows.length + ix + 1) : seq + 1;
        const xml = _buildRow(rn, tpl, st, lay, r, { seq });
        const ex = parts.rows.find(x=>x.num===rn);
        if(ex) ex.xml = xml; else parts.rows.push({ num:rn, xml });
        rep.odrIns++;
        if(r.g == null) rep.warn.push(shOdr.name+' '+_ymLabel(ym)+': thiếu LG 21201 (mm) → cột Inventory sẽ trống');
      });
      shOdr.xml = _joinRows(parts);
      lay = _layout(shOdr, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
    }
    if(updOdr.length){
      const parts = _rowsOf(shOdr.xml);
      updOdr.forEach(ym=>{
        const d = lay.dataRows.find(x=>x.ym===ym); if(!d) return;
        const rw = parts.rows.find(x=>x.num===d.num); if(!rw) return;
        const res = _patchRow(rw.xml, d.num, lay, rowsByYm[ym] || { ym }, {});
        rw.xml = res.xml;
        if(res.changed){ rep.odrUpd++; log('ℹ '+shOdr.name+': cập nhật dòng '+d.num+' ('+_ymLabel(ym)+') — '+res.changed+' ô', 'info'); }
      });
      shOdr.xml = _joinRows(parts);
      lay = _layout(shOdr, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
    }
    if(opt.widen) _widenAggregates(shOdr, lay.dataRows[0].num, lay.lastData, log);
    if(opt.stampDate) _stampDate(shOdr, months[months.length-1], wb.sst, log);

    /* ══ SHEET CAVERN ══ */
    let lc = _layout(shCav, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
    const haveCav = {}; lc.dataRows.forEach(d=>{ haveCav[d.ym] = d.num; });
    log('ℹ '+shCav.name+': tiêu đề hàng '+lc.headerRow+' · '+lc.dataRows.length+
        ' dòng tháng · dòng cuối '+lc.lastData, 'info');

    const newCav = months.filter(ym => !haveCav[ym]);
    const updCav = months.filter(ym =>  haveCav[ym]);

    if(newCav.length){
      const at   = lc.lastData + 1;
      const tpl  = lc.lastData;
      const prev = lc.dataRows.length > 1 ? lc.dataRows[lc.dataRows.length-2].num : null;
      const stTpl  = _sig(lc.byNum[tpl]);
      const stPrev = prev ? _sig(lc.byNum[prev]) : null;
      const closing = (stPrev && !_sameSig(stTpl, stPrev)) ? stTpl : null;
      const middle  = closing ? stPrev : stTpl;

      insertRows(wb, shCav.name, at, newCav.length);
      log('▶ '+shCav.name+': chèn '+newCav.length+' dòng tại hàng '+at, 'ok');

      lc = _layout(shCav, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
      const parts = _rowsOf(shCav.xml);
      if(closing){
        const rw = parts.rows.find(x=>x.num===tpl);
        if(rw){ rw.xml = _restyle(rw.xml, middle); log('ℹ '+shCav.name+': chuyển viền đáy bảng xuống dòng mới', 'info'); }
      }
      newCav.forEach((ym, ix)=>{
        const rn = at + ix;
        const r  = rowsByYm[ym] || { ym };
        const st = closing ? (ix === newCav.length-1 ? closing : middle) : middle;
        const xml = _buildRow(rn, tpl, st, lc, r, {});
        const ex = parts.rows.find(x=>x.num===rn);
        if(ex) ex.xml = xml; else parts.rows.push({ num:rn, xml });
        rep.cavIns++;
      });
      shCav.xml = _joinRows(parts);
      lc = _layout(shCav, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
    }
    if(updCav.length){
      const parts = _rowsOf(shCav.xml);
      updCav.forEach(ym=>{
        const d = lc.dataRows.find(x=>x.ym===ym); if(!d) return;
        const rw = parts.rows.find(x=>x.num===d.num); if(!rw) return;
        const res = _patchRow(rw.xml, d.num, lc, rowsByYm[ym] || { ym }, {});
        rw.xml = res.xml;
        if(res.changed){ rep.cavUpd++; log('ℹ '+shCav.name+': cập nhật dòng '+d.num+' ('+_ymLabel(ym)+') — '+res.changed+' ô', 'info'); }
      });
      shCav.xml = _joinRows(parts);
      lc = _layout(shCav, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
    }
    if(opt.widen) _widenAggregates(shCav, lc.dataRows[0].num, lc.lastData, log);

    rep.warn.forEach(w => log('⚠ '+w, 'warn'));
    return rep;
  }

  function _seqCol(lay){ return Object.keys(lay.colOf).find(L => lay.colOf[L] === 'seq'); }
  function _sig(cells){
    const o = {}; Object.keys(cells||{}).forEach(L=>{ o[L] = _styleOf(cells[L]); }); return o;
  }
  function _sameSig(a, b){
    if(!a || !b) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if(ka.length !== kb.length) return false;
    return ka.every(k => a[k] === b[k]);
  }
  function _restyle(rowXml, sig){
    return rowXml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, cx=>{
      const L = (cx.match(/\br="([A-Z]+)\d+"/)||[])[1];
      if(!L || sig[L] == null) return cx;
      return /\bs="\d+"/.test(cx) ? cx.replace(/\bs="\d+"/, 's="'+sig[L]+'"')
                                  : cx.replace(/^<c /, '<c s="'+sig[L]+'" ');
    });
  }
  /* ô tiêu đề dạng "Date: 260630" → ngày cuối tháng báo cáo */
  function _stampDate(sh, ym, sst, log){
    const parts = _rowsOf(sh.xml);
    let done = false;
    for(const row of parts.rows){
      if(done || row.num > 6) break;
      const cells = _cellsOf(row.xml);
      for(const L of Object.keys(cells)){
        const v = _valOf(cells[L], sst);
        if(!/^\s*Date\s*:/i.test(v)) continue;
        const nv = 'Date: '+_ymEndYYMMDD(ym);
        if(v.trim() === nv) { done = true; break; }
        const nc = _cell(L, row.num, _styleOf(cells[L]), nv);
        row.xml = row.xml.replace(cells[L], nc);
        log('ℹ '+sh.name+': ô '+L+row.num+' "'+v+'" → "'+nv+'"', 'info');
        done = true; break;
      }
    }
    if(done) sh.xml = _joinRows(parts);
  }

  /* ═══════════════════════════════════════════════════════════
     11. NGUỒN DỮ LIỆU — tab Odorant
     ═══════════════════════════════════════════════════════════ */
  function _snap(){
    if(typeof ODOR === 'undefined' || !ODOR.snapshot)
      throw new Error('Tab Odorant chưa sẵn sàng (ODOR.snapshot)');
    const s = ODOR.snapshot();
    const by = {};
    (s.rows || []).forEach(r=>{ by[r.ym] = r; });
    return { by, rows: s.rows || [] };
  }

  /* ═══════════════════════════════════════════════════════════
     12. UI
     ═══════════════════════════════════════════════════════════ */
  const _CSS =
    '#odxModal .odx-file{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1.5px dashed var(--line,#ccd);'+
      'border-radius:10px;cursor:pointer;background:var(--panel-2,#f4f6f8)}'+
    '#odxModal .odx-file:hover{border-color:var(--blue,#2f80ed)}'+
    '#odxModal .odx-file.has-file{border-style:solid;border-color:var(--green,#1a7f37);background:#eef7ee}'+
    '#odxModal .odx-file-ic{font-size:17px}'+
    '#odxModal .odx-file-nm{font-size:12px;font-weight:600;color:var(--ink-2,#334);overflow:hidden;'+
      'text-overflow:ellipsis;white-space:nowrap}'+
    '#odxModal .odx-row{display:flex;align-items:center;gap:9px;margin-top:11px;flex-wrap:wrap}'+
    '#odxModal .odx-row label{font-size:11px;font-weight:700;color:var(--ink-3,#888);letter-spacing:.03em;text-transform:uppercase}'+
    '#odxModal .odx-row input[type=month]{border:1.5px solid var(--line,#ccd);border-radius:8px;padding:6px 9px;font-size:12px}'+
    '#odxModal .odx-chk{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-2,#334);font-weight:600}'+
    '#odxModal .odx-prev{margin-top:11px;padding:9px 11px;border-radius:8px;background:var(--panel-2,#f4f6f8);'+
      'font-size:11.5px;line-height:1.65;max-height:210px;overflow:auto}'+
    '#odxModal .odx-prev table{border-collapse:collapse;font-size:11px;margin-top:5px;white-space:nowrap}'+
    '#odxModal .odx-prev th,#odxModal .odx-prev td{border:1px solid var(--line,#d7dbe0);padding:2px 6px}'+
    '#odxModal .odx-prev th{background:#e9eef4;font-weight:700}'+
    '#odxModal .odx-prev td.r{text-align:right;font-variant-numeric:tabular-nums}'+
    '#odxModal .odx-prev .w{color:#b45309;font-weight:700}'+
    '#odxModal .odx-log{margin-top:9px;max-height:190px;overflow:auto;border:1px solid var(--line,#ccd);border-radius:8px;'+
      'background:#10233d;color:#c8d6e5;padding:8px 10px;font:11px/1.6 ui-monospace,Menlo,Consolas,monospace;display:none}'+
    '#odxModal .odx-log:not(:empty){display:block}'+
    '#odxModal .odx-l{white-space:pre-wrap}'+
    '#odxModal .odx-l.ok{color:#5fd68a}#odxModal .odx-l.er{color:#ff7a7a}'+
    '#odxModal .odx-l.warn{color:#ffc861}#odxModal .odx-l.info{color:#7fb8ee}'+
    '#odxModal .odx-hint{margin-top:9px;font-size:10.5px;color:var(--ink-3,#888);line-height:1.55}';

  function log(msg, cls){
    const box = document.getElementById('odx-log');
    if(!box){ console.log('[ODORXL]', msg); return; }
    const d = document.createElement('div');
    d.className = 'odx-l '+(cls||'');
    d.textContent = msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function clearLog(){ const b = document.getElementById('odx-log'); if(b) b.innerHTML = ''; }

  const XLSX_TYPE = { description:'Cavern Odorant Stock (.xlsx)',
    accept:{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
             'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'] } };

  async function pickFile(){
    try{
      if(window.showOpenFilePicker){
        const hs = await window.showOpenFilePicker({ types:[XLSX_TYPE] });
        state.fileHandle = hs[0];
        state.fileName   = state.fileHandle.name;
        state.zip = await JSZip.loadAsync(await (await state.fileHandle.getFile()).arrayBuffer());
        log('📄 Đã nạp: '+state.fileName, 'ok');
        await _afterLoad();
      } else {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.xlsx,.xlsm';
        inp.onchange = async ()=>{
          if(!inp.files.length) return;
          try{
            state.fileName   = inp.files[0].name;
            state.zip        = await JSZip.loadAsync(await inp.files[0].arrayBuffer());
            state.fileHandle = null;
            log('📄 Đã nạp: '+state.fileName, 'ok');
            await _afterLoad();
          }catch(e){ log('❌ '+(e.message||e), 'er'); }
        };
        inp.click();
      }
    }catch(e){
      if(e && e.name === 'AbortError') return;
      log('❌ '+(e && e.message ? e.message : e), 'er');
    }
  }
  async function _afterLoad(){
    try{
      const wb = await _readWb(state.zip);
      const names = wb.sheets.map(s=>s.name);
      if(!wb.sheets.some(s=>SH_ODR.test(s.name))){
        log('❌ File không có sheet "ODR_Consumption_Cavern" (có: '+names.join(', ')+')', 'er');
        state.zip = null;
      } else if(!wb.sheets.some(s=>SH_CAV.test(s.name))){
        log('❌ File không có sheet "Cavern" (có: '+names.join(', ')+')', 'er');
        state.zip = null;
      } else {
        log('✓ Tìm thấy sheet: Cavern · ODR_Consumption_Cavern', 'ok');
      }
    }catch(e){ log('❌ Không đọc được workbook: '+(e.message||e), 'er'); state.zip = null; }
    _updateUI();
    await preview();
  }
  function _updateUI(){
    const box  = document.getElementById('odx-file-box');
    const name = document.getElementById('odx-file-name');
    const btn  = document.getElementById('odx-btn-run');
    if(box)  box.classList.toggle('has-file', !!state.zip);
    if(name) name.textContent = state.zip ? state.fileName : 'Chọn file Cavern Odorant Stock (.xlsx)…';
    if(btn)  btn.disabled = !state.zip;
  }
  function _opt(){
    return { widen: !!(document.getElementById('odx-widen')||{}).checked,
             stampDate: !!(document.getElementById('odx-stamp')||{}).checked };
  }
  function _fmt(v, d){
    if(v == null || v === '' || isNaN(v)) return '';
    return Number(v).toLocaleString('en-US',{minimumFractionDigits:d, maximumFractionDigits:d});
  }

  /* ── xem trước: tháng nào sẽ chèn / cập nhật, số nào sẽ ghi ── */
  async function preview(){
    const el = document.getElementById('odx-preview');
    if(!el) return;
    const ym = (document.getElementById('odx-month')||{}).value || '';
    if(!/^\d{4}-\d{2}$/.test(ym)){ el.innerHTML = 'Chọn tháng báo cáo.'; return; }
    let snap;
    try{ snap = _snap(); }catch(e){ el.innerHTML = '<span class="w">'+e.message+'</span>'; return; }
    if(!state.zip){
      el.innerHTML = 'Tháng báo cáo <b>'+_ymLabel(ym)+'</b>. Chọn file Excel để xem trước.';
      return;
    }
    let wb, lay, lc;
    try{
      wb = await _readWb(state.zip);
      const shOdr = wb.sheets.find(s=>SH_ODR.test(s.name));
      const shCav = wb.sheets.find(s=>SH_CAV.test(s.name));
      const f1 = _flattenShared(shOdr.xml); shOdr.xml = f1.xml;
      const f2 = _flattenShared(shCav.xml); shCav.xml = f2.xml;
      lay = _layout(shOdr, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
      lc  = _layout(shCav, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
    }catch(e){ el.innerHTML = '<span class="w">❌ '+e.message+'</span>'; return; }

    const months = _monthsToDo(lay, lc, ym);
    if(!months.length){ el.innerHTML = '<span class="w">Tháng '+_ymLabel(ym)+' nhỏ hơn dòng đầu bảng — không có gì để ghi.</span>'; return; }
    const haveOdr = {}; lay.dataRows.forEach(d=>{ haveOdr[d.ym] = d.num; });

    let h = 'File đang có <b>'+lay.dataRows.length+'</b> dòng, tháng cuối <b>'+
            _ymLabel(lay.dataRows[lay.dataRows.length-1].ym)+'</b> (hàng '+lay.lastData+').<br>'+
            'Sẽ xử lý <b>'+months.length+'</b> tháng: '+months.map(m=>{
              return _ymLabel(m)+(haveOdr[m] ? ' <span style="color:#2f80ed">(cập nhật hàng '+haveOdr[m]+')</span>'
                                             : ' <span style="color:#1a7f37">(chèn mới)</span>');
            }).join(' · ');
    h += '<table><tr><th>Tháng</th><th>Mixing MT</th><th>FQ kg</th><th>Gravity</th>'+
         '<th>Charging kg</th><th>LG mm</th><th>Inv m³</th><th>Inv kg</th><th>Cal.Cons kg</th><th>ppm</th></tr>';
    let miss = 0;
    months.forEach(m=>{
      const r = snap.by[m];
      if(!r){ miss++;
        h += '<tr><td>'+_ymLabel(m)+'</td><td colspan="9" class="w">tab Odorant chưa có tháng này</td></tr>'; return; }
      if(r.g == null) miss++;
      h += '<tr><td>'+_ymLabel(m)+'</td>'+
        '<td class="r">'+_fmt(r.c,3)+'</td><td class="r">'+_fmt(r.d,2)+'</td><td class="r">'+_fmt(r.e,5)+'</td>'+
        '<td class="r">'+_fmt(r.f==null?0:r.f,2)+'</td>'+
        '<td class="r'+(r.g==null?' w':'')+'">'+(r.g==null?'thiếu mm':_fmt(r.g,0))+'</td>'+
        '<td class="r">'+_fmt(r.h,4)+'</td><td class="r">'+_fmt(r.i,2)+'</td>'+
        '<td class="r">'+_fmt(r.j,2)+'</td><td class="r">'+_fmt(r.ppm,2)+'</td></tr>';
    });
    h += '</table>';
    if(miss) h += '<div class="w" style="margin-top:5px">⚠ '+miss+' tháng thiếu dữ liệu — ô tương ứng sẽ để trống. '+
                  'Nên bấm ↻ Scan Tank Log và nhập LG 21201 (mm) trước khi xuất.</div>';
    el.innerHTML = h;
  }

  /* tháng cần xử lý = từ (tháng cuối trong file + 1) → tháng báo cáo;
     nếu tháng báo cáo đã có trong file thì chỉ xử lý đúng tháng đó. */
  function _monthsToDo(lay, lc, ym){
    const last = lay.dataRows[lay.dataRows.length-1].ym;
    const have = {}; lay.dataRows.forEach(d=>{ have[d.ym] = 1; });
    if(have[ym]) return [ym];
    if(ym <= last){
      /* tháng ở giữa nhưng chưa có dòng — chỉ chèn đúng tháng đó là không
         giữ được thứ tự thời gian, nên báo để người dùng tự xử lý */
      return [];
    }
    const out = [];
    let cur = _ymNext(last), guard = 0;
    while(cur <= ym && guard < 120){ out.push(cur); cur = _ymNext(cur); guard++; }
    return out;
  }

  /* ── chạy thật ── */
  async function run(){
    if(!state.zip){ log('❌ Chưa chọn file Excel', 'er'); return; }
    const ym = (document.getElementById('odx-month')||{}).value || '';
    if(!/^\d{4}-\d{2}$/.test(ym)){ log('❌ Chưa chọn tháng báo cáo', 'er'); return; }

    clearLog();
    log('═══ EXPORT '+_ymLabel(ym)+' ═══', 'info');

    let snap, wb, lay, lc, months;
    try{
      snap = _snap();
      wb   = await _readWb(state.zip);
      const shOdr = wb.sheets.find(s=>SH_ODR.test(s.name));
      const shCav = wb.sheets.find(s=>SH_CAV.test(s.name));
      const p1 = _flattenShared(shOdr.xml), p2 = _flattenShared(shCav.xml);
      lay = _layout({ name:shOdr.name, xml:p1.xml }, wb.sst, MAP_ODR, { must:['no','date','lpgmixingqty'], seqCol:true });
      lc  = _layout({ name:shCav.name, xml:p2.xml }, wb.sst, MAP_CAV, { must:['monthly'], seqCol:false });
      months = _monthsToDo(lay, lc, ym);
    }catch(e){ log('❌ '+(e.message||e), 'er'); return; }

    if(!months.length){
      log('❌ Tháng '+_ymLabel(ym)+' nằm TRƯỚC tháng cuối của file mà chưa có dòng riêng. '+
          'Hãy chèn dòng đó bằng tay trong Excel rồi chạy lại (phần mềm sẽ cập nhật số).', 'er');
      return;
    }
    const nNew = months.filter(m => !lay.dataRows.some(d=>d.ym===m)).length;
    const nUpd = months.length - nNew;
    const noData = months.filter(m => !snap.by[m]);

    if(!confirm('XUẤT ODORANT → FILE EXCEL\n\n'
      + 'File   : '+state.fileName+'\n'
      + 'Tháng  : '+months.map(_ymLabel).join(', ')+'\n'
      + 'Chèn mới      : '+nNew+' dòng (mỗi sheet)\n'
      + 'Cập nhật tại chỗ: '+nUpd+' dòng\n'
      + (noData.length ? '\n⚠ '+noData.length+' tháng chưa có dữ liệu trong tab Odorant → ô sẽ trống.\n' : '')
      + '\nStyle · comment · conditional formatting · print setting giữ nguyên.\n'
      + 'FILE GỐC KHÔNG BỊ SỬA — kết quả lưu ra file mới.\n\n'
      + 'OK = thực hiện.  Cancel = huỷ.')) { log('⚠ Đã huỷ.', 'warn'); return; }

    let rep;
    try{ rep = applyToWorkbook(wb, snap.by, months, _opt(), log); }
    catch(e){ log('❌ '+(e.message||e), 'er'); console.error(e); return; }

    log('✅ ODR: chèn '+rep.odrIns+' · cập nhật '+rep.odrUpd+
        '  |  Cavern: chèn '+rep.cavIns+' · cập nhật '+rep.cavUpd, 'ok');

    /* ghi ra file mới — KHÔNG đụng file gốc */
    try{ await _writeWb(state.zip, wb); }
    catch(e){ log('❌ Lỗi ghi workbook: '+(e.message||e), 'er'); return; }

    log('⏳ Đang tạo file…', 'info');
    const isXlsm = /\.xlsm$/i.test(state.fileName);
    const mime = isXlsm ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
                        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = await state.zip.generateAsync({ type:'blob', mimeType:mime,
                        compression:'DEFLATE', compressionOptions:{ level:6 } });
    const dl = _outName(state.fileName, months[months.length-1], isXlsm);

    let saved = false;
    if(window.showSaveFilePicker){
      try{
        const opts = { suggestedName: dl,
          types:[{ description: isXlsm ? 'Excel macro workbook' : 'Excel workbook',
                   accept: isXlsm ? { 'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'] }
                                  : { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'] } }] };
        if(state.fileHandle) opts.startIn = state.fileHandle;
        const h = await window.showSaveFilePicker(opts);
        const w = await h.createWritable();
        await w.write(blob); await w.close();
        log('💾 Đã lưu: '+h.name+' ('+Math.round(blob.size/1024)+' KB) — file gốc giữ nguyên', 'ok');
        saved = true;
      }catch(e){
        if(e && e.name === 'AbortError'){ log('⚠ Đã huỷ hộp thoại lưu — KHÔNG có file nào được ghi.', 'warn'); return; }
        log('⚠ Hộp thoại lưu lỗi: '+e.message+' → chuyển sang tải xuống', 'warn');
      }
    }
    if(!saved){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = dl;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log('💾 Đã tải xuống: '+dl+' ('+Math.round(blob.size/1024)+' KB) — file gốc giữ nguyên', 'ok');
    }
    log('ℹ Mở file bằng Excel: bảng sẽ tự tính lại toàn bộ công thức.', 'info');
    if(typeof logAudit === 'function'){
      try{ logAudit('export:odorant_xlsx', { months, ins:rep.odrIns, upd:rep.odrUpd }); }catch(_){}
    }
    if(typeof toast === 'function') toast('📗 Odorant → Excel: '+months.map(_ymLabel).join(', '),'ok');

    /* file trong RAM đã bị sửa — nạp lại để bấm lần nữa không cộng dồn */
    state.zip = null; _updateUI();
    log('ℹ Bảng trong bộ nhớ đã dùng xong — chọn lại file nếu muốn xuất tiếp.', 'info');
  }

  function _outName(srcName, ym, isXlsm){
    const base = String(srcName||'')
      .replace(/\.xls[mx]$/i, '')
      .replace(/[\s_-]*\d{6,8}\s*$/, '')
      .trim() || 'Cavern Odorant Stock';
    return base+'_'+_ymEndYYMMDD(ym)+(isXlsm ? '.xlsm' : '.xlsx');
  }

  /* ── modal ── */
  function _build(){
    if(state.built) return;
    const bg = document.createElement('div');
    bg.className = 'tl-paste-modal';
    bg.id = 'odxModal';
    bg.setAttribute('onclick', "if(event.target===this)ODORXL.close()");
    bg.innerHTML = ''
      + '<style>'+_CSS+'</style>'
      + '<div class="tl-paste-box" style="width:820px">'
      +   '<div class="tl-paste-hdr">'
      +     '<h3>📗 EXPORT ODORANT → file "Cavern Odorant Stock"</h3>'
      +     '<button class="tl-paste-x" onclick="ODORXL.close()">✕</button>'
      +   '</div>'
      +   '<div class="tl-paste-body">'
      +     '<div class="odx-file" id="odx-file-box" onclick="ODORXL.pickFile()" title="Chọn file Cavern Odorant Stock (.xlsx)">'
      +       '<span class="odx-file-ic">📄</span>'
      +       '<span class="odx-file-nm" id="odx-file-name">Chọn file Cavern Odorant Stock (.xlsx)…</span>'
      +     '</div>'
      +     '<div class="odx-row">'
      +       '<label>Tháng báo cáo</label>'
      +       '<input type="month" id="odx-month" onchange="ODORXL.preview()">'
      +       '<button class="btn" onclick="ODORXL.setPrevMonth()">Tháng trước</button>'
      +       '<label class="odx-chk"><input type="checkbox" id="odx-widen" checked onchange="ODORXL.preview()"> Nới vùng Average/Total</label>'
      +       '<label class="odx-chk"><input type="checkbox" id="odx-stamp" checked> Cập nhật ô "Date:" ở đầu sheet</label>'
      +     '</div>'
      +     '<div class="odx-prev" id="odx-preview">Chọn file và tháng để xem trước.</div>'
      +     '<div class="odx-log" id="odx-log"></div>'
      +     '<div class="odx-hint">Phần mềm <b>chèn thêm dòng</b> cho tháng báo cáo vào cả hai sheet '
      +       '<b>ODR_Consumption_Cavern</b> và <b>Cavern</b>, rồi lưu ra <b>file mới</b> — file gốc không bị sửa. '
      +       'Cột dữ liệu (Date · Mixing Q\'ty · FQ · Gravity · Charging · LG 21201 · Inventory m³ · Remark) ghi số từ tab Odorant; '
      +       'các cột còn lại giữ <b>công thức của Excel</b> (dịch từ dòng cuối bảng), nên sửa công thức bên Excel vẫn chạy đúng. '
      +       'Style · viền · comment · conditional formatting · print setting giữ nguyên 100%. '
      +       'Tháng đã có dòng trong file thì được <b>cập nhật tại chỗ</b>, chạy lại nhiều lần không sinh dòng trùng.</div>'
      +   '</div>'
      +   '<div class="tl-paste-foot">'
      +     '<button class="btn" onclick="ODORXL.close()">Đóng</button>'
      +     '<button class="btn btn-green" id="odx-btn-run" onclick="ODORXL.run()" disabled>📗 Chèn dòng &amp; lưu file</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(bg);
    state.built = true;
  }
  function open(){
    _build();
    const m = document.getElementById('odx-month');
    if(m && !m.value){
      /* mặc định: tháng mới nhất có dữ liệu trong tab Odorant, không có thì tháng trước */
      let ym = _prevYm(_nowYm());
      try{
        const s = _snap();
        for(let i = s.rows.length-1; i >= 0; i--){
          const r = s.rows[i];
          if(r.c != null && r.c !== '' && r.g != null){ ym = r.ym; break; }
        }
      }catch(_){}
      m.value = ym;
    }
    _updateUI();
    document.getElementById('odxModal').classList.add('on');
    preview();
  }
  function close(){ const m = document.getElementById('odxModal'); if(m) m.classList.remove('on'); }
  function setPrevMonth(){
    const m = document.getElementById('odx-month');
    if(m){ m.value = _prevYm(_nowYm()); preview(); }
  }

  return { open, close, pickFile, preview, run, setPrevMonth,
           /* dùng cho test / gọi từ mã khác */
           applyToWorkbook, insertRows, _readWb, _writeWb,
           _t: { _flattenShared, _shiftFormula, _translate, _shiftSqref, _walkRefs,
                 _layout, _rowsOf, _cellsOf, _valOf, _parseSST, _ymSerial, _serialYm,
                 _ymEndYYMMDD, _monthsToDo, _widenAggregates, _outName, MAP_ODR, MAP_CAV,
                 SH_ODR, SH_CAV } };
})();

/* ⚠ PHẢI gán ra window: auth.js khoá hàm in/xuất bằng window[<OBJ>][<method>].
   `const ODORXL` chỉ nằm trong phạm vi script nên window.ODORXL sẽ là undefined
   ⇒ LOCK_FNS lặng lẽ không khoá được gì (đúng lỗi đang tồn tại với
   ODOR / ENG / TLXK / SCALE / PTT_EARLY / KTPTVC — xem ghi chú cuối file). */
if(typeof window !== 'undefined') window.ODORXL = ODORXL;

if(typeof module !== 'undefined' && module.exports) module.exports = ODORXL;
