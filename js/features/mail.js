/* ============================================================
 * MAIL — mail.js  (v4.226)
 * v4.226: P3 biểu đồ — có file Excel dew point ⇒ MẶC ĐỊNH vẽ từ dữ liệu biểu đồ của file (cùng dòng, cùng khoảng ngày từ
 *         dòng đầu, nhãn 10 ngày, không vạch −45, ô trống đứt đường); file chưa có ngày báo cáo ⇒ nhắc ▶ Fill. Ô 📈 Chart
 *         vẫn chọn được "App history · 6M/1Y/16M/2Y" (lịch sử Firebase, cửa sổ kết thúc ở ngày báo cáo).
 * v4.224: P3 bảng 3 ĐỢT GẦN NHẤT (2 lần trước + ngày gửi đậm nền xanh lá) · No. tự điền (DEWPT.nextNo) · CÙNG bộ kiểm
 *         số với Engineer ▸ 💧 Dew Point (DEWPT.confirmCheck, inState tô màu ô) · 📂 file Excel dew point + ▶ Fill file &
 *         attach (DEWXL, chọn file ở tab hay ở email đều dùng chung).
 * v4.221: danh sách xe huỷ P2 — xe ĐÃ XÁC NHẬN huỷ luôn được tick sẵn: 🚫 Cancelled trong Today Plan (bấm tay
 *         hoặc nhận từ ghi chú sale lúc dán) · 🚫 đã huỷ rồi bị bản dán mới GỠ khỏi plan (plan_cx wc=1, trước đây
 *         mất hẳn) · 🚫 đã huỷ trong kế hoạch đầu ngày rồi bị gỡ (x=1, trước đây mất hẳn) · 🕳/📌 có ghi chú sale
 *         nói cancel. Chỉ xe BIẾN MẤT không có dấu huỷ nào mới để user tick. Thêm 📝 dòng còn trong plan có ghi
 *         chú cancel nhưng chưa ở trạng thái Cancelled (không tick sẵn — người dán đã bỏ gợi ý).
 * v4.216: xe huỷ P2 KHÔNG điền sẵn — nút 🚫 Cancel list mở bảng ứng viên (🚫 Cancelled · 🕳 biến mất lúc dán ·
 *         📌 có trong kế hoạch đầu ngày), gộp trùng biển số, gợi ý "đã nạp hôm nay" / "còn trong Today Plan";
 *         người dùng tick + ✓ Confirm. Chỉ 🚫 Cancelled được tick sẵn. Dùng chung cho thư P2 và sheet Cancel List.
 * v4.210: đóng REPORT MAIL ⇒ MAILCFG.detach() (không giữ listener mail_cfg); P5 tự tải dữ liệu heater (HTRH, 3 tháng,
 *         một lần) nếu máy chưa mở tab Heater.
 * v4.208: P3 gõ dew point DƯƠNG ⇒ cảnh báo NGAY (ENGX_U.dewSign: OK đổi sang âm · Cancel giữ để tự sửa), ô tô đỏ.
 * v4.207: P3 BỎ tự lưu — số dew point CHỈ lưu khi bấm 💾 Save reading. Rời email P3 (đổi báo cáo / ngày / 👥 /
 *         đóng / tắt trang) mà còn số vừa gõ chưa lưu ⇒ hộp hỏi: 💾 Save & continue · Discard & continue · Stay.
 *         Số dương / ngoài dải ⇒ hỏi lại trước khi lưu.
 * v4.206: P3 Propane Dew Point — thân thư có BIỂU ĐỒ "Dew Point of C3 Dryer Outlet" (Dryer A/B + xu hướng, PNG vẽ
 *         bằng canvas từ lịch sử dew_point, chọn khoảng 6M/1Y/16M/2Y, .eml nhúng cid, 📋 Copy chart). Số gõ trong
 *         email lưu bằng 💾 (v4.207 bỏ tự lưu).
 * v4.205: P2 📂 chọn file bằng showOpenFilePicker (giữ handle, như tab REPORT) ⇒ ▶ Build lưu file báo cáo
 *         vào CÙNG thư mục file nguồn (hộp Save mở sẵn thư mục đó). Trình duyệt không hỗ trợ ⇒ ô chọn file cũ.
 * v4.204: P2 file Daily Stock HAI BƯỚC — 📂 chỉ CHỌN file (chọn lại = thay), ▶ Build report mới điền ngày
 *         đang chọn + lưu + đính kèm + đổ luỹ kế vào thư. Đổi ngày ⇒ bỏ bản dựng của ngày cũ.
 * v4.203: P2 bảng "Summary data" RÚT GỌN — chỉ khách có KL THÁNG NÀY ≠ 0; khách tháng này = 0
 *         gom MỘT dòng "Other N customers" (giữ luỹ kế năm ⇒ tổng khớp file); khách MỚI chưa có
 *         dòng trong file (RPT.accumulation().extra) hiện ĐỎ ngay trong bảng + cảnh báo.
 * v4.187: xe huỷ — nhóm 🔗 ALT huỷ = MỘT chuyến (một dòng đại diện, ghi "1 of N"); nhóm có xe
 *         đang nạp / đã xong thì xe còn lại KHÔNG tính huỷ. Thêm xe BIẾN MẤT khỏi Today Plan đã xác
 *         nhận lúc dán (PLANCX, plan_cx/<ngày>, chỉ đọc khi làm P2 / xuất file). Gửi P2 ⇒ đánh dấu
 *         'mail' (đủ 'mail' + 'rpt' thì dữ liệu ngày đó bị xoá).
 * v4.184: phần XE HUỶ của P2 tách thành MAIL.p2Cancel(iso) — MỘT logic dùng chung cho thân
 *         thư P2 và sheet "Cancel List" của file Daily Stock (RPT điền khi xuất file).
 * v4.183: P1 KHÔNG tự đưa lot ĐÃ GỬI (✉ sent, số chưa đổi) vào thư — hiện riêng dòng
 *         "Already sent", tick để gửi lại. P2: Daily plan = KẾ HOẠCH ĐẦU NGÀY (PLANDAY,
 *         plan_day/<ngày>/first), xe huỷ = xe 🚫 Cancelled + xe có trong kế hoạch đầu ngày
 *         mà kế hoạch cuối không còn (tick bỏ được); tổng tấn dùng chung TP.lnkTotals.
 *         👥 Directory mặc định SẮP THEO DEPARTMENT.
 * v4.182: 👥 Recipients — admin THÊM NHÓM G (đổi tên / xoá), THÊM EMAIL P tự soạn (chỉ chữ:
 *         tiêu đề + thân thư + ghi chú đính kèm, có {date} {long} {dmy} {week} {month} {year};
 *         email cần dữ liệu vẫn viết trong mã), ẨN/HIỆN cột Department · Position · Email · Title
 *         (nhớ theo máy), và THÊM TAY người chưa có trong danh bạ công ty (➕ New person / 📇+ —
 *         cùng các cột của file Contact List, lưu mail_cfg.CTX khi bấm Save for everyone).
 * v4.181: BỎ CHỮ KÝ (Outlook của mọi người đã có chữ ký sẵn). P2: bảng "Daily summary"
 *         dùng CHÍNH RPT.summaryGroups (cùng logic sheet Summary Data, có giá · Vessel · Pure)
 *         + bảng "Summary data" luỹ kế năm / tháng / khách đọc từ file Daily Stock vừa điền
 *         (RPT.accumulation) — cần 📂 Daily Stock file hoặc 📎 đính kèm file đó.
 * v4.180: P6 dùng CHUNG bảng kiểm với LPG SALES ▸ SAP ▸ 📑 SAP WMS Report (SWR.html /
 *         BSXL.check): chọn file ⇒ thấy ngày sẽ điền + mục thiếu ⇒ gõ số / 0 / giá không
 *         đổi / bỏ qua (ô trống TÔ VÀNG) ⇒ ⬇ Fill & attach. Giá trong thân thư KHÔNG còn
 *         lấy ngày trước âm thầm (BSXL.priceShown); Domestic 2100/2101 = giá 1100 như file.
 * v4.179: BỎ ô chọn "From" — người gửi = TÀI KHOẢN ĐANG ĐĂNG NHẬP (CURRENT_USER.email).
 *         Dò theo email trong danh bạ người nhận (DIR) → cùng mã nhân viên (phần trước @,
 *         vd. đăng nhập gmail) → danh bạ công ty. Người gửi luôn bị loại khỏi To/CC.
 * v4.178: 👥 Recipients ▸ Directory thêm cột Department + Position (ĐỌC từ danh bạ công ty
 *         trong RAM theo email — KHÔNG lưu vào mail_cfg), lọc theo cả phòng ban/chức vụ,
 *         bấm tiêu đề cột để sắp xếp; chip người nhận ở màn soạn thư cũng hiện phòng ban.
 * v4.177: P7 Vessel Mixing Report — đọc Vessel Log, mỗi tank một cột (tàu N tank),
 *   tank thuần C3/C4; mở thẳng từ nút ✉ ở tab Vessel (VMIX.mail → MAIL.openVessel).
 * v4.176: P1 bỏ khối STOCK TRANSFER (số đúng là ADJ, lúc gửi chưa có) · Odorant
 *   chỉ còn BD SET · P5 dùng chung trạng thái HTR (Engineer ▸ 🔥 Heater) ·
 *   P3 lưu bằng update() để giữ Note của Engineer ▸ 💧 Dew Point.
 * ------------------------------------------------------------
 * ✉ REPORT MAIL — soạn sẵn 7 email báo cáo định kỳ của LPG Terminal:
 *   P1 Ball Tank Mixing Report   (GỘP 2 mail cũ: DCS Report + LPG Mixing Lot)
 *   P2 Daily LPG Loading Report  P3 Propane Dew Point
 *   P4 Terminal Weekly Report    P5 Heater Consumption
 *   P6 Cavern SAP/WMS Batch Stock  P7 Vessel Mixing Report (v4.177)
 *
 * Người nhận: nhóm CỐ ĐỊNH (MAILCFG) — sửa trên app ở mục 👥 Recipients
 * (admin/editor), lưu node Firebase `mail_cfg`.
 *
 * v4.174: 👥 Recipients có 📇 danh bạ công ty (CONTACTS) — tìm không dấu,
 *   thêm người vào nhóm một cú bấm, import Contact List báo ai mới / ai nghỉ.
 * v4.173 (23/09/2026):
 *   • CẢNH BÁO THIẾU DỮ LIỆU ⇒ bắt XÁC NHẬN trước khi mở/tải thư (mọi email).
 *   • Ô NHẬP SỐ CÒN THIẾU ngay trong email, ghi về ĐÚNG chỗ của nó:
 *       P1 nhiệt độ/áp suất/density → Tank Log (ENG.upsertRow)
 *       P3 dew point → node dew_point/<ngày>
 *       P6 TỔNG FEED OL1 → knq_bonded/use/<ngày>/t · đơn giá → cavern_price
 *   • P2 / P6 / P5 nhận FILE: app điền số vào file báo cáo, tải về, và TỰ
 *     ĐÍNH KÈM vào thư nháp (.eml).
 *   • P1 trình bày lại: bảng lot quen thuộc + MỘT bảng chi tiết (lot là cột),
 *     bỏ các dòng trung gian khó đọc của file DCS cũ.
 *
 * ⭐ LUẬT RAM (v4.170): số APP TỰ TÍNH không bao giờ lên Firebase. Chỉ số
 * NGƯỜI GÕ (các ô nhập ở trên) mới được ghi, và ghi đúng node gốc của nó.
 * ============================================================ */
const MAIL = (function(){
  'use strict';

  /* ── localStorage (tiện ích theo máy, KHÔNG phải dữ liệu nghiệp vụ) ── */
  const LS = { me:'lpg_v4_mail_me', sig:'lpg_v4_mail_sig' };
  function _lsGet(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(_){ return d; } }
  function _lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }

  /* ── hằng số Mix Calculator (khớp mixctrl.js DEF; ⚙ Settings ghi đè) ── */
  const ODO_RPT_PPM = 10;   /* v4.223 — ppm ghi trên báo cáo (chỉ hiển thị, không vào công thức) */
  const MC_DEF = { c3l:0.483, c4l:0.560, c3v:0.01721, c4v:0.00825, tv:696.91, r:5.5, odoPpm:30, odoRef:570, odoBd:0.00003 };
  function _mcCfg(){
    let c = Object.assign({}, MC_DEF);
    try{ const raw = localStorage.getItem('lpg_v4_mc_config_v1'); if(raw) c = Object.assign(c, JSON.parse(raw)); }catch(_){}
    return c;
  }

  /* ═════════════════ HELPERS ═════════════════ */
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function num(v){
    if(v == null) return null;
    const t = String(v).replace(/,/g,'').replace(/%/g,'').trim();
    if(t === '') return null;
    const x = parseFloat(t);
    return isFinite(x) ? x : null;
  }
  /* phân số từ ô % (72.73 | "72.73%" | 0.7273) */
  function frac(v){ const x = num(v); if(x === null) return null; return x > 1.5 ? x / 100 : x; }
  function fmt(x, dp){
    if(x === null || x === undefined || !isFinite(x)) return '';
    return Number(x).toLocaleString('en-US', { minimumFractionDigits:dp, maximumFractionDigits:dp });
  }
  /* kg có dấu phẩy nghìn; 0 → '-' (giống file Excel gốc) */
  function kg(x){ if(!x || Math.abs(x) < 0.5) return '-'; return fmt(Math.round(x), 0); }
  function pct(f, dp){ return (f === null || !isFinite(f)) ? '' : (f * 100).toFixed(dp == null ? 2 : dp) + '%'; }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function isoOf(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
  function isoToday(){ return isoOf(new Date()); }
  function isoAdd(iso, n){ const p = iso.split('-'); return isoOf(new Date(+p[0], +p[1]-1, +p[2] + n)); }
  /* 'DD/MM/YY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'YYYYMMDD' → ISO */
  function anyIso(s){
    if(!s) return '';
    s = String(s).trim().replace(/[T ]\d{1,2}:\d{2}.*$/,'');
    if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(m){ let y = m[3]; if(y.length === 2) y = '20' + y; return y+'-'+pad2(m[2])+'-'+pad2(m[1]); }
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    return m ? m[1]+'-'+m[2]+'-'+m[3] : '';
  }
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function ord(d){ const n = +d; if(n % 100 >= 11 && n % 100 <= 13) return n+'th'; return n + (['th','st','nd','rd'][n % 10] || 'th'); }
  function longDate(iso){ const p = iso.split('-'); return MON[+p[1]-1]+' '+ord(p[2])+', '+p[0]; }          /* September 22nd, 2026 */
  function dMonY(iso){ const p = iso.split('-'); return +p[2]+'-'+MON3[+p[1]-1]+'-'+p[0].slice(2); }        /* 22-Sep-26 */
  function mdSlash(iso){ const p = iso.split('-'); return +p[1]+'/'+(+p[2]); }                              /* 9/21 */
  function lotTail(lot){ const m = String(lot||'').match(/(\d+)\s*$/); return m ? m[1] : String(lot||''); }
  function tankName(t){ const s = String(t||'').toUpperCase(); return s.includes('3501') ? 'TK-3501' : s.includes('3502') ? 'TK-3502' : s; }
  function slocOf(t){ const s = String(t||''); return s.includes('3501') ? '2100' : s.includes('3502') ? '2101' : ''; }

  /* ── bảng HTML an toàn cho Outlook (Word renderer): thuộc tính + inline ── */
  const FONT = "font-family:'Times New Roman',Times,serif;";
  const T_OPEN = '<table border="1" cellspacing="0" cellpadding="3" style="border-collapse:collapse;border:1px solid #000;'+FONT+'font-size:10.5pt">';
  /* v4.193 — thêm cả thuộc tính align/valign: dán vào Outlook (Word) có lúc bỏ text-align trong style */
  function td(v, st, attrs){ const al = /text-align:\s*(right|center)/.exec(st||''); return '<td'+(al ? ' align="'+al[1]+'"' : '')+' valign="middle"'+(attrs ? ' '+attrs : '')+' style="border:1px solid #000;padding:3px 8px;'+(st||'')+'">'+(v === '' || v == null ? '&nbsp;' : v)+'</td>'; }
  function th(v, st, attrs){ return td(v, 'font-weight:bold;text-align:center;'+(st||''), attrs); }
  const C_HEAD = 'background:#d9d9d9;', C_LBL = 'background:#fff2cc;', C_YEL = 'background:#ffff00;', C_GRN = 'background:#e2efda;';
  const K_RED = 'color:#c00000;', K_NAVY = 'color:#1f3864;', K_GREEN = 'color:#548235;';
  const R = 'text-align:right;', CE = 'text-align:center;';

  /* ═════════════════ NGUỒN DỮ LIỆU (chỉ đọc RAM) ═════════════════ */
  function _engRows(){ try{ return (typeof ENG !== 'undefined' && ENG.ROWS) ? ENG.ROWS : []; }catch(_){ return []; } }
  function _objRows(o){ return o ? Object.values(o).filter(Boolean) : []; }
  function _tlRows(){ try{ return (typeof TL !== 'undefined' && TL.ROWS) ? _objRows(TL.ROWS) : []; }catch(_){ return []; } }
  function _wsRows(){ try{ return (typeof WS !== 'undefined' && WS.ROWS) ? _objRows(WS.ROWS) : []; }catch(_){ return []; } }
  function _spRows(){ try{ return (typeof SP !== 'undefined' && SP.ROWS) ? _objRows(SP.ROWS) : []; }catch(_){ return []; } }
  function _vsRows(){ try{ return (typeof VS_ROWS !== 'undefined' && VS_ROWS) ? _objRows(VS_ROWS) : []; }catch(_){ return []; } }
  function _planRows(){ try{ return (typeof TP !== 'undefined' && TP.PLAN) ? _objRows(TP.PLAN) : []; }catch(_){ return []; } }
  function _planStatus(r){ try{ return String(TP.getEffectiveStatus(r) || '').toLowerCase(); }catch(_){ return String(r._status||'').toLowerCase(); } }

  /* Tank Log: các lot có NGÀY (cột [3]) = iso, sắp theo số lot */
  function lotsOfDay(iso){
    return _engRows().filter(r => r && anyIso(r[3]) === iso && String(r[1]||'').trim())
      .sort((a,b) => (+lotTail(a[1]) || 0) - (+lotTail(b[1]) || 0));
  }
  function lastMixDay(){
    let best = '';
    _engRows().forEach(r => { const d = anyIso(r && r[3]); if(d && d > best) best = d; });
    return best;
  }

  /* ─── Tính toán bảng DCS cho MỘT lot — y hệt MC.calcFromRow (mixctrl.js) ───
     Kiểm chứng với mail 22/09/2026 lot 423: Adding 285.851/127.824 · Filling
     550.000/264.149 · Liquid 404.235/151.0 · Filled 142.115/62.791 ·
     Odorant SET 73000 · BDSET 2.19.                                         */
  function _v2L(vol, R0){
    if(!(vol > 0)) return 0;
    const f = h => Math.PI * h * h * (R0 - h / 3);
    if(vol >= f(2 * R0)) return Math.round(2 * R0 * 1000);
    let lo = 0, hi = 2 * R0;
    for(let i = 0; i < 60; i++){ const m = (lo + hi) / 2; if(f(m) < vol) lo = m; else hi = m; }
    /* CẮT (floor) chứ không làm tròn — khớp file "LPG Mixing Master File" (550 m³ → 7745 mm, 264.149 → 4604) */
    return Math.floor((lo + hi) / 2 * 1000);
  }
  function mixCalc(r, order){
    const K = _mcCfg();
    const n = i => { const x = num(r[i]); return x === null ? 0 : x; };
    const V0 = n(10), TV = n(30), Vf = n(6);
    const i3 = frac(r[11]); const t3 = frac(r[29]);
    /* GC → phân bố tạp chất lên C3/C4 (mô hình V406) */
    let g = [16,17,18,19,20,21,22,23].map(n);
    const gs = g.reduce((a,b)=>a+b, 0);
    const gcPct = gs > 1.5;                 /* lưu dạng % (1.58) hay phân số */
    const gf = gcPct ? g.map(x => x / 100) : g.slice();
    const [ch4,c2,c3h8,ic4,nc4,bd,c5,ol] = gf;
    const sL = c3h8 + ic4 + nc4, sI = ch4 + c2 + bd + c5 + ol;
    let rC3 = sL > 0 ? c3h8 + (c3h8 / sL) * sI : null;
    let rC4 = sL > 0 ? (ic4 + nc4) + ((ic4 + nc4) / sL) * sI : null;
    if(rC3 === null){ rC3 = frac(r[8]); rC4 = frac(r[9]); if(rC3 !== null && rC4 === null) rC4 = 1 - rC3; }
    const o = { ok: V0 > 0 && Vf > 0 && i3 !== null, gc: gf, gcSum: gf.reduce((a,b)=>a+b,0) };
    o.lot = String(r[1]||'').trim(); o.tank = tankName(r[2]); o.date = anyIso(r[3]);
    o.start = String(r[4]||'').trim(); o.finish = String(r[5]||'').trim();
    o.V0 = V0; o.TV = TV; o.Vf = Vf; o.t3 = t3; o.i3 = i3;
    o.ini3 = V0 * (i3||0); o.ini4 = V0 * (1 - (i3||0));
    o.add3 = (t3 !== null && TV) ? TV * t3 - o.ini3 : null;
    o.add4 = (t3 !== null && TV) ? TV * (1 - t3) - o.ini4 : null;
    /* thứ tự bơm: sản phẩm bơm TRƯỚC dừng ở V0 + phần bơm thêm của nó,
       sản phẩm bơm SAU dừng ở TARGET VOL. Mặc định C4 trước (MC ORD). */
    const first = order === 'C3' ? 'C3' : 'C4';
    o.first = first;
    if(o.add3 !== null){
      o.fill3 = first === 'C3' ? V0 + o.add3 : TV;
      o.fill4 = first === 'C4' ? V0 + o.add4 : TV;
      o.lvl3 = _v2L(o.fill3, K.r); o.lvl4 = _v2L(o.fill4, K.r);
    }
    o.temp = num(r[31]); o.pres = num(r[32]); o.dens = num(r[33]);
    o.r3 = rC3; o.r4 = rC4;
    if(rC3 !== null && Vf){
      o.liq3 = Vf * rC3; o.liq4 = Vf * rC4;
      o.liqW3 = o.liq3 * K.c3l; o.liqW4 = o.liq4 * K.c4l;
      o.vap3 = (K.tv - Vf) * rC3; o.vap4 = (K.tv - Vf) * rC4;
      o.vapW3 = o.vap3 * K.c3v; o.vapW4 = o.vap4 * K.c4v;
      o.fv3 = o.liq3 - o.ini3; o.fv4 = o.liq4 - o.ini4;
      const b3 = (i3||0) * V0 * K.c3l + (K.tv - V0) * (i3||0) * K.c3v;
      const b4 = (1-(i3||0)) * V0 * K.c4l + (K.tv - V0) * (1-(i3||0)) * K.c4v;
      o.fw3 = o.liqW3 + o.vapW3 - b3; o.fw4 = o.liqW4 + o.vapW4 - b4;
    }
    /* Filled weight: ưu tiên số ĐÃ LƯU ở Tank Log (cột GC [13]/[14]) */
    const s13 = num(r[13]), s14 = num(r[14]);
    if(s13 !== null) o.fw3 = s13;
    if(s14 !== null) o.fw4 = s14;
    o.fLpg = (o.fw3 != null && o.fw4 != null) ? o.fw3 + o.fw4 : null;
    o.qty = num(r[7]);
    /* v4.195 — lượng bơm từ cavern theo COQ (tấn) = Filled C3/C4 cách ② COQ ở Tank Log (cột 66/67):
       khối lượng cuối × %wt COQ − khối lượng đầu × %wt — tức m³ đã quy đổi bằng density COQ */
    o.q3 = num(r[66]); o.q4 = num(r[67]);
    if(o.add3 !== null){
      o.odoSet = Math.round((o.add3 + o.add4) / K.odoRef * 100) * 1000;
      o.odoBd = K.odoBd * o.odoSet;
    }
    return o;
  }


  /* ═════════════════ BÁO CÁO ═════════════════ */
  const ST = {                       /* trạng thái composer (RAM) */
    rep:'P1', date:'', lots:{}, order:{}, shift:'auto', me:'', sig:_lsGet(LS.sig, true),
    files:[], ovr:{}, dew:{ no:'', time:'09:00', ca:'', cb:'', da:'', db:'', loaded:'' },
    /* v4.176 — dùng CHUNG trạng thái với Engineer ▸ 🔥 Heater (HTR.S): nạp file ở đâu cũng thấy ở kia */
    heat:(typeof HTR !== 'undefined' && HTR.S) ? HTR.S : { A:null, B:null, runs:[], run:-1, start:0, stop:0, vessel:'', amount:'', pending:[] },
    view:'rep', rc:null, edited:false,
    pick:{}, lotQ:'', adj:{}, adhoc:{},         /* v4.174: lot chọn tay · tìm lot · người nhận thêm/bớt riêng từng thư */
    vlot:'',                                    /* v4.177: lot tàu đang chọn cho P7 ('' = lot của ngày ST.date) */
    rcHide:_lsGet('lpg_v4_mail_rc_hide', {}),   /* v4.182: cột Directory đang ẩn (theo máy) */
    ctNew:null, cx:null,                        /* v4.182: form thêm tay danh bạ · bản nháp chữ email tự soạn */
    dsSrc:null, dsBusy:false,                   /* v4.204: P2 — file Daily Stock NGUỒN đã chọn (chưa xử lý) · đang dựng */
    dewRange:'16m', dewHistErr:'', dewHistReq:false, dewPng:null   /* v4.206: P3 biểu đồ Dryer A/B · khoảng · ảnh PNG đã vẽ (cache) */
  };

  /* v4.192 — trình bày thư cho dễ đọc: chữ thở hơn, tiêu đề mục đậm + ô vuông màu, bảng thụt vào so với chữ
     (xem _polish). Chỉ dùng margin của <p> và bảng khung — hai thứ Outlook (Word renderer) tôn trọng. */
  function greet(txt){ return '<p style="'+FONT+'font-size:12pt;margin:0 0 10px 0">'+txt+'</p>'; }
  function para(txt, st){ return '<p style="'+FONT+'font-size:12pt;line-height:1.4;margin:8px 0 8px 0;'+(st||'')+'">'+txt+'</p>'; }
  function bullet(txt){ return '<p style="'+FONT+'font-size:12pt;font-weight:bold;margin:18px 0 6px 14px;color:#1f3864">'+
    '<span style="color:#2e75b6;font-size:10pt">&#9632;</span>&nbsp;&nbsp;'+txt+'</p>'; }
  /* bọc MỌI bảng cấp ngoài cùng trong một bảng khung không viền: cột trống 32px bên trái = thụt lề
     (Outlook bỏ qua margin-left của <table>), kèm một dòng đệm phía dưới để bảng không dính vào chữ kế tiếp. */
  const IND = 32;
  function _polish(html){
    const src = String(html || ''), re = /<(\/?)table\b[^>]*>/gi;
    let out = '', depth = 0, start = -1, last = 0, m;
    while((m = re.exec(src))){
      if(!m[1]){ if(depth === 0){ out += src.slice(last, m.index) + '<p style="margin:0;font-size:4pt;line-height:6pt">&nbsp;</p>'; start = m.index; } depth++; }
      else if(depth > 0){ depth--; if(depth === 0){
        const end = m.index + m[0].length;
        out += '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:0"><tr>'+
          '<td width="'+IND+'" style="width:'+IND+'px;border:0;padding:0">&nbsp;</td><td valign="top" style="border:0;padding:0">'+src.slice(start, end)+'</td></tr></table>'+
          '<p style="margin:0;font-size:6pt;line-height:8pt">&nbsp;</p>';
        last = end; } }
    }
    return out + src.slice(last).replace(/^<br>/, '');
  }

  /* ── P1 · BALL TANK MIXING REPORT ─────────────────────────────── */
  function shiftOf(lots){
    if(ST.shift === 'day') return 'Day';
    if(ST.shift === 'night') return 'Night';
    if(ST.shift === 'none') return '';
    /* Auto: mọi lot bắt đầu 18h–6h ⇒ Night; mọi lot ban ngày ⇒ Day; lẫn cả hai ⇒ không ghi ca */
    let night = 0, day = 0;
    lots.forEach(r => { const h = parseInt(String(r[4]||'').split(':')[0], 10); if(h >= 18 || h < 6) night++; else day++; });
    return night && !day ? 'Night' : day && !night ? 'Day' : '';
  }
  function lotKey(r){ return r._rid || r[1]; }
  /* lot của ngày đang chọn (bỏ những lot người dùng bỏ tick) + lot tick thêm từ ô tìm */
  /* v4.183 — lot ĐÃ GỬI mà số liệu chưa đổi thì KHÔNG tự vào thư nữa (tick lại để gửi lại) */
  function _sentOk(r){ const m = mailInfo(r); return !!(m && !m.changed); }
  function p1Skipped(){ return lotsOfDay(ST.date).filter(r => ST.pick[lotKey(r)] !== true && ST.pick[lotKey(r)] !== false && _sentOk(r)); }
  function p1Lots(){
    const day = lotsOfDay(ST.date).filter(r => ST.pick[lotKey(r)] === true || (ST.pick[lotKey(r)] !== false && !_sentOk(r)));
    const extra = _engRows().filter(r => ST.pick[lotKey(r)] === true && day.indexOf(r) < 0);
    return day.concat(extra).sort((a,b) => (+lotTail(a[1]) || 0) - (+lotTail(b[1]) || 0));
  }
  function mailInfo(r){ try{ return ENG.mailInfo(r); }catch(_){ return null; } }
  function sentBadge(r){
    const m = mailInfo(r);
    if(!m) return '<span class="ml-sent no" title="Not sent yet">○ not sent</span>';
    const d = new Date(m.ts), p2 = n => String(n).padStart(2,'0');
    const w = p2(d.getDate())+'/'+p2(d.getMonth()+1)+' '+p2(d.getHours())+':'+p2(d.getMinutes());
    return m.changed ? '<span class="ml-sent chg" title="Sent '+esc(w)+(m.by?' by '+esc(m.by):'')+' — Tank Log data changed since: send again">⚠ changed since '+w+'</span>'
                     : '<span class="ml-sent ok" title="Sent'+(m.by?' by '+esc(m.by):'')+'">✉ sent '+w+'</span>';
  }
  /* dòng Tank Log + số người vừa gõ trong email (chưa lưu) */
  const OVR_COLS = { temp:31, pres:32, dens:33 };
  /* v4.174 — dữ liệu cần có cho mỗi lot của email P1. block:true ⇒ bắt buộc (chặn gửi). */
  const REQ_P1 = [
    { k:'iv',  lbl:'Initial volume',   where:'Tank Log', ok:(r,c) => c.V0 > 0 },
    { k:'i3',  lbl:'Initial %C3',      where:'Tank Log', ok:(r,c) => c.i3 != null },
    { k:'tv',  lbl:'Target volume',    where:'Tank Log', ok:(r,c) => !!c.TV },
    { k:'t3',  lbl:'Target C3%',       where:'Tank Log', ok:(r,c) => c.t3 != null },
    { k:'fv',  lbl:'Final volume',     where:'Tank Log', ok:(r,c) => c.Vf > 0 },
    { k:'gc',  lbl:'GC result',        where:'Tank Log', ok:(r,c) => !!c.gcSum },
    { k:'temp',lbl:'Temperature',      where:'here / Tank Log', ok:(r,c) => c.temp != null },
    { k:'pres',lbl:'Pressure',         where:'here / Tank Log', ok:(r,c) => c.pres != null },
    { k:'dens',lbl:'LPG density',      where:'here / Tank Log', ok:(r,c) => c.dens != null }
    /* v4.176 — bỏ 'Filled C3/C4': thư không còn in khối stock transfer */
  ];
  function withOvr(r){
    const o = ST.ovr[lotKey(r)]; if(!o) return r;
    const c = r.slice(); c._rid = r._rid;
    Object.keys(OVR_COLS).forEach(k => { if(o[k] != null && o[k] !== '') c[OVR_COLS[k]] = o[k]; });
    return c;
  }
  function lotTable(lots){
    let h = T_OPEN + '<tr>'+th('NO',C_HEAD,'rowspan="2"')+th('LOT',C_HEAD,'rowspan="2"')+th('TANK',C_HEAD,'rowspan="2"')+
      th('TIME',C_HEAD,'colspan="3"')+th('Mixed Result',C_HEAD,'colspan="2"')+'</tr>'+
      '<tr>'+th('Date',C_HEAD)+th('Starting Time',C_HEAD)+th('Finish Time',C_HEAD)+th('Volume (m&sup3;)',C_HEAD)+th('Quantity (ton)',C_HEAD)+'</tr>';
    lots.forEach(r => {
      h += '<tr>'+td(esc(lotTail(r[1])),CE)+td(esc(r[1]),CE)+td(esc(tankName(r[2])),CE)+td(dMonY(anyIso(r[3])),CE)+
        td(esc(r[4]),CE)+td(esc(r[5]),CE)+td(fmt(num(r[6]),3),R)+td(fmt(num(r[7]),3),R)+'</tr>';
    });
    return h + '</table>';
  }
  /* ⭐ v4.173 — BẢNG CHI TIẾT GỌN: lot là CỘT, mỗi dòng một chỉ số, chia 6 khối.
     Bỏ hẳn các dòng trung gian của file DCS (liquid/vapor volume & weight,
     filling level) — người đọc (sếp, PP Technical, Sales) chỉ cần kế hoạch →
     kết quả → lượng chuyển từ cavern. Số vẫn tính đúng y hệt Mix Calculator. */
  function detailTable(lots){
    const cs = lots.map(r => mixCalc(withOvr(r), ST.order[lotKey(r)] || 'C4'));
    const W = cs.length, N = W + 2;
    const HB = 'background:#1f3864;color:#fff;font-weight:bold;'+CE;
    const SEC = 'background:#d9e1f2;color:#1f3864;font-weight:bold;letter-spacing:.5px;font-size:9.5pt;';
    const LB = 'font-size:10pt;', UN = 'font-size:9pt;color:#595959;'+CE, V = R+'font-size:10.5pt;';
    const miss = '<span style="color:#c00000">n/a</span>';
    let h = '<table border="1" cellspacing="0" cellpadding="3" style="border-collapse:collapse;border:1px solid #8ea9db;font-family:Arial,sans-serif;font-size:10pt">';
    h += '<tr>'+td('Item',HB)+td('Unit',HB)+cs.map(c=>td(esc(c.lot)+'<br><span style="font-weight:normal">'+esc(c.tank)+'</span>',HB)).join('')+'</tr>';
    const sec = t => { h += '<tr>'+td(t, SEC, 'colspan="'+N+'"')+'</tr>'; };
    const row = (lbl, unit, f, st) => { h += '<tr>'+td(lbl, LB)+td(unit, UN)+cs.map(c => { const v = f(c); return td(v === '' || v == null ? miss : v, V+(st||'')); }).join('')+'</tr>'; };
    const pair = (a, b, dp) => (a == null || !isFinite(a)) ? '' : (a*100).toFixed(dp)+' / '+(b*100).toFixed(dp);
    sec('TIME');
    row('Mixing date', '', c => dMonY(c.date));
    row('Start → Finish', 'hh:mm', c => esc(c.start)+' → '+esc(c.finish));
    sec('MIXING PLAN');
    row('Initial volume', 'm&sup3;', c => fmt(c.V0,3));
    row('Initial ratio C3 / C4', '%vol', c => pair(c.i3, c.i3 == null ? null : 1 - c.i3, 2));
    row('Target volume', 'm&sup3;', c => fmt(c.TV,0));
    row('Target ratio C3 / C4', '%vol', c => pair(c.t3, c.t3 == null ? null : 1 - c.t3, 0));
    sec('RESULT — 1 HOUR AFTER MIXING');
    row('Final volume', 'm&sup3;', c => fmt(c.Vf,3));
    row('Temperature', '&deg;C', c => fmt(c.temp,2));
    row('Pressure', 'kg/cm&sup2;', c => fmt(c.pres,2));
    row('Ratio C3 / C4 (GC)', '%vol', c => pair(c.r3, c.r4, 2), 'font-weight:bold;');
    row('LPG density', 'kg/L', c => fmt(c.dens,3));
    row('Quantity', 'ton', c => fmt(c.qty,3));
    row('Pumped from cavern C3 / C4', 'ton', c => (c.q3 == null && c.q4 == null) ? '' : fmt(c.q3 || 0,3)+' / '+fmt(c.q4 || 0,3), 'font-weight:bold;');
    sec('GC COMPOSITION');
    const names = ['Methane','Ethane','Propane','i-Butane','n-Butane','1,3-Butadiene','C5+','Olefins'];
    names.forEach((nm, i) => { if(cs.some(c => c.gc[i])) row(nm, 'vol%', c => c.gc[i] ? (c.gc[i]*100).toFixed(2) : '-'); });
    /* v4.176 — BỎ khối "STOCK TRANSFER FROM CAVERN (GC basis)": số Filled theo GC
       lúc gửi thư KHÔNG phải số chuyển kho đúng — số đúng là mục ADJ (điều chỉnh
       theo COQ/WMS) mà lúc gửi thư thì chưa có ⇒ in ra chỉ gây hiểu nhầm.
       Odorant: chỉ giữ BD SET (bỏ SET). */
    /* v4.223 — nhãn báo cáo ghi 10 ppm = tỉ lệ THỰC TẾ đang dùng. Hệ số 30 trong
       công thức BD SET (odoPpm, ⚙ Settings) là đặc thù hệ thống — GIỮ NGUYÊN, KHÔNG
       lấy nó làm nhãn. Đổi tỉ lệ thực tế thì sửa ODO_RPT_PPM. */
    sec('ODORANT ('+ODO_RPT_PPM+' ppm)');
    row('BD SET', '', c => c.odoBd == null ? '' : fmt(c.odoBd,2), 'font-weight:bold;');
    return h + '</table>';
  }
  function buildP1(){
    const lots = p1Lots();
    const sh = shiftOf(lots);
    const nums = lots.map(r => lotTail(r[1]));
    const lotLbl = lots.length ? 'LPG-' + (String(lots[0][1]).match(/\d{4}/) || [ST.date.slice(0,4)])[0] + '-' + nums.join(', ') : '(no lot)';
    const subject = '[LPGT] Ball Tank Mixing Report – ' + lotLbl + ' – ' + ST.date + (sh ? ' (' + sh + ' shift)' : '');
    const warn = [];
    /* ⭐ bảng DỮ LIỆU BẮT BUỘC theo từng lot — hiện ở cổng xác nhận (lot × ô).
       REQ_P1[i].block = true ⇒ thiếu là KHÔNG cho mở/tải thư (để sẵn, hiện chưa bật). */
    const miss = [];
    if(!lots.length) warn.push('No lot selected — tick lots of '+ST.date+' or search and tick older lots.');
    lots.forEach(r0 => {
      const r = withOvr(r0), c = mixCalc(r, 'C4');
      const has = {};
      REQ_P1.forEach(q => { has[q.k] = q.ok(r, c); });
      if(REQ_P1.some(q => !has[q.k])) miss.push({ lot:c.lot, tank:c.tank, has });
      if(c.q3 == null && c.q4 == null) warn.push(esc(c.lot)+': no COQ figure for "Pumped from cavern" (ton) — enter the COQ in Tank Log and press ◈ CALC COQ.');
      const m = mailInfo(r0);
      if(m && !m.changed) warn.push(esc(c.lot)+': already sent '+new Date(m.ts).toLocaleString()+' with the same data — sending it again?');
    });
    const unsaved = lots.filter(r => ST.ovr[lotKey(r)]).map(r => r[1]);
    if(unsaved.length) warn.push('Typed values not saved to Tank Log yet: '+unsaved.map(esc).join(', ')+' — press 💾 Save typed values to Tank Log.');
    miss.forEach(m => REQ_P1.forEach(q => { if(!m.has[q.k]) warn.push(esc(m.lot)+': '+q.lbl+' missing.'); }));
    const block = [];
    miss.forEach(m => REQ_P1.forEach(q => { if(q.block && !m.has[q.k]) block.push(esc(m.lot)+': '+q.lbl+' is required.'); }));
    let b = greet('Dear Sir,');
    b += para('I would like to send the Ball Tank Mixing result on '+(sh ? sh+' shift ' : '')+'<span style="color:#1f4e79">'+longDate(ST.date)+'</span> as below.');
    b += bullet('LPG mixing lot information:');
    b += lotTable(lots);
    if(lots.length){ b += bullet('Mixing details:'); b += detailTable(lots); }
    /* v4.195 — bỏ câu "Please find … attachment" và gợi ý file đính kèm: thư mixing gửi không kèm file;
       cần đính kèm thì người gửi tự gõ thêm câu đó */
    return { subject, body:b, warn, block, miss:{ cols:REQ_P1, rows:miss }, attach:'' };
  }

  function _tlDay(iso){ return _tlRows().filter(r => !r.disabled && anyIso(r.giDate) === iso); }
  function _c34(r){
    const nw = num(r.lpgQty) || 0;
    let c3 = num(r.c3Kg) || 0, c4 = num(r.c4Kg) || 0;
    if(!c3 && !c4 && nw > 0){ c3 = nw / 2; c4 = nw / 2; }
    return { c3, c4, nw };
  }
  function _tripKey(r){
    const g = String(r.mdoG||'').trim();
    return g ? 'MDO|'+g : [r.doNo, r.truck, r.scaleNo, r.turn].map(x => String(x||'')).join('|');
  }
  /* WMS stock transfer theo bồn — cùng luật RPT.collectWmsST */
  function _wmsST(iso){
    const z = () => ({ C3:0, C4:0 });
    const w = { '2100':{ fromCav:z(), toCav:z(), tkX:z() }, '2101':{ fromCav:z(), toCav:z(), tkX:z() } };
    _wsRows().forEach(r => {
      if((anyIso(r.transDate) || anyIso(r.erpDate)) !== iso) return;
      const mat = r.matLabel; if(mat !== 'C3' && mat !== 'C4') return;
      const b = String(r.reason||'').toUpperCase(); if(b !== 'D' && b !== 'E') return;
      const stt = String(r.status||'').toUpperCase(); if(stt && stt !== 'Y') return;
      const q = num(r.kg) || 0; if(!q) return;
      const f = String(r.fromLoc||'').trim(), t = String(r.toLoc||'').trim();
      if(f === '1100' && w[t]) w[t].fromCav[mat] += q;
      else if(w[f] && t === '1100') w[f].toCav[mat] += q;
      else if(w[f] && w[t]){ w[t].tkX[mat] += q; w[f].tkX[mat] -= q; }
    });
    return w;
  }
  function _sapEnd(sloc, iso){
    try{ if(typeof SP !== 'undefined' && SP.tankEnd) return SP.tankEnd(sloc, iso); }catch(_){}
    const o = { has:false, c3:0, c4:0 };
    _spRows().forEach(r => {
      if(String(r.sloc) !== sloc || r.date !== iso) return;
      const m = String(r.mat||'').toUpperCase(); if(m !== 'C3' && m !== 'C4') return;
      o.has = true; o[m === 'C3' ? 'c3' : 'c4'] += (+r.end || 0);
    });
    return o;
  }
  function _pureOf(r){ return /pure|thuần/i.test(String(r.trade||'') + ' ' + String(r.type||'')); }
  function _dirOf(r){
    try{ if(typeof TRADE !== 'undefined') return TRADE.dirOfRow(r).dir; }catch(_){}
    return /^export/i.test(String(r.trade||'')) ? 'E' : 'D';
  }
  /* ⭐ v4.184 — XE HUỶ + DAILY PLAN/ACTUAL của một ngày: nguồn DUY NHẤT cho email P2 và
     sheet "Cancel List" (RPT). Chỉ đọc RAM (Today Plan · PLANDAY đã nạp · TL Data · Vessel).
     ⭐⭐ v4.216 — KHÔNG CÒN TỰ ĐIỀN xe huỷ theo luật "sáng có – chiều không". App chỉ gom
     DANH SÁCH ỨNG VIÊN (cands) từ 3 nguồn, gộp trùng theo biển số, kèm gợi ý kiểm tra
     (đã nạp hôm nay? còn nằm trong Today Plan?). NGƯỜI DÙNG tick chọn xe nào là huỷ:
       • 🚫 Cancelled trong Today Plan  → tick sẵn (chính người dùng đã bấm Cancel)
       • 🕳 biến mất lúc dán (plan_cx)   → KHÔNG tick sẵn
       • 📌 có trong kế hoạch đầu ngày, cuối ngày không còn → KHÔNG tick sẵn
     Lý do: có xe ĐÃ NẠP rồi, hoặc chỉ có tên trong danh sách để thông báo / phối hợp
     (vd. KNHC "ngủ lại nhà máy, sáng làm hải quan") ⇒ biến mất ≠ huỷ.
     Lựa chọn giữ trong RAM (ST.cnSel / ST.cnOk), dùng chung cho thân thư P2 và file Daily.
     rows  : xe ĐƯỢC TICK { customer, plate, rmooc, driver, qty, note, src }
     cands : mọi ứng viên { key, src, sel, loadedMT, inPlan, by, …row }                   */
  function _cnPl(t){ return String(t||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
  function _cnPlates(p){ return String(p||'').split(' / ').map(_cnPl).filter(Boolean); }
  function _cnSel(iso){ ST.cnSel = ST.cnSel || {}; return ST.cnSel[iso] || (ST.cnSel[iso] = {}); }
  function p2Cancel(iso){
    const warn = [];
    const tl = _tlDay(iso), vs = _vsRows().filter(r => r.giDate && anyIso(r.giDate) === iso);
    const plan = _planRows().filter(r => (r._forDate || '') === iso || !r._forDate);
    const cands = [];
    const add = c => {                                   /* gộp trùng theo biển số (ưu tiên nguồn thêm trước) */
      const ps = _cnPlates(c.plate);
      if(ps.length && cands.some(x => _cnPlates(x.plate).some(p => ps.indexOf(p) >= 0))) return;
      c.key = ps.length ? 'P|' + ps.slice().sort().join('+') : 'N|' + c.src + '|' + _cnPl(c.customer) + '|' + (c.oid || c.no || '') + '|' + (num(c.qty) || 0);
      if(cands.some(x => x.key === c.key)) return;
      cands.push(c);
    };
    /* ① 🚫 Cancelled trong Today Plan — nhóm 🔗 ALT huỷ = MỘT chuyến; có xe đã nạp ⇒ không tính (v4.187) */
    const altG = r => String(r._lnkK||'') === 'alt' ? String(r._lnkG||'') : '';
    const liveAlt = new Set(plan.filter(r => altG(r) && /^(loading|done)$/.test(_planStatus(r))).map(altG));
    const seenAlt = new Set(), uniq = a => a.filter((x, i) => x && a.indexOf(x) === i);
    plan.filter(r => _planStatus(r) === 'cancel' && !r._altSkip).forEach(r => {
      const g = altG(r);
      if(g){
        if(liveAlt.has(g) || seenAlt.has(g)) return;
        seenAlt.add(g);
        const mem = plan.filter(x => altG(x) === g);
        add({ customer:r.customer||'', plate:uniq(mem.map(x => x.plate||'')).join(' / '), rmooc:uniq(mem.map(x => x.rmooc||'')).join(' / '),
              driver:uniq(mem.map(x => x.driver||'')).join(' / '), qty:num(r.qty), note:(String(r.note||'').trim() || 'Cancel') + (mem.length > 1 ? ' (1 of '+mem.length+' trucks/drivers)' : ''), src:'cancel', oid:r._oid||'' });
        return;
      }
      add({ customer:r.customer||'', plate:r.plate||'', rmooc:r.rmooc||'', driver:r.driver||'', qty:num(r.qty), note:String(r.note||'').trim() || 'Cancel', src:'cancel', oid:r._oid||'' });
    });
    /* ② 🕳 biến mất khỏi Today Plan, xác nhận lúc dán (plan_cx)
       v4.221 — wc=1: xe ĐÃ 🚫 Cancelled rồi bị bản dán mới gỡ ⇒ nguồn 'cxgone', tick sẵn.
                ghi chú sale nói cancel ⇒ tick sẵn (noteCx). Còn lại (biến mất không dấu huỷ) ⇒ user tick. */
    const cxT = s => { try{ return !!(typeof TP !== 'undefined' && TP._cxText && TP._cxText(String(s||''))); }catch(_){ return false; } };
    const planOids = new Set(plan.map(r => String(r._oid||'')).filter(Boolean));
    const PX = (typeof PLANCX !== 'undefined') ? PLANCX : null;
    const vx = PX ? PX.get(iso) : [];
    (vx || []).filter(v => +v.cx === 1).forEach(v => {
      const wc = +v.wc === 1, nt = String(v.nt||'').trim();
      if(wc && String(v.oids||'').split(',').some(o => o && planOids.has(o))) return;     /* còn trong plan ⇒ ① đã tính */
      const grpTxt = +v.n > 1 ? ' (1 of '+v.n+' trucks/drivers)' : '';
      add({ customer:v.c||'', plate:v.p||'', rmooc:v.m||'', driver:v.d||'', qty:num(v.q), by:v.by||'', oid:v.oids||'', no:v.no||'',
        note:wc ? (nt || 'Cancel') + grpTxt : (nt && !/^arrived/i.test(nt) ? nt + ' · ' : '') + 'Removed from plan' + grpTxt,
        src:wc ? 'cxgone' : 'vanish', noteCx:!wc && cxT(nt), pre:wc || cxT(nt) });
    });
    /* ③ 📌 có trong kế hoạch đầu ngày mà Today Plan không còn */
    let planMT = 0;
    try{ planMT = TP.lnkTotals(plan).planMT; }catch(_){ plan.forEach(r => { if(_planStatus(r) !== 'cancel') planMT += num(r.qty) || 0; }); }
    const PD = (typeof PLANDAY !== 'undefined') ? PLANDAY : null;
    const first = PD ? PD.get(iso) : null;
    /* v4.221 — lấy cả dòng ĐÃ HUỶ trong kế hoạch đầu ngày (x=1) rồi bị gỡ ⇒ 'cxfirst', tick sẵn */
    const dropAll = first ? PD.dropped(iso, plan, true) : [];
    const drop = dropAll.filter(x => !x.x);
    dropAll.forEach(x => {
      const grpTxt = x.grpN > 1 ? ' (1 of '+x.grpN+' trucks/drivers)' : '', nt = String(x.nt||'').trim();
      add({ customer:x.c, plate:x.p, rmooc:x.m, driver:x.d, qty:num(x.q), oid:x.o||'', no:x.n||'',
        note:x.x ? (nt || 'Cancel') + grpTxt : (nt && !/^arrived/i.test(nt) ? nt + ' · ' : '')+'Removed from plan'+grpTxt,
        src:x.x ? 'cxfirst' : 'removed', noteCx:!x.x && cxT(nt), pre:!!x.x || cxT(nt) });
    });
    /* ④ 📝 còn trong Today Plan, ghi chú sale nói cancel mà trạng thái KHÔNG phải Cancelled (người dán đã bỏ
       gợi ý, hoặc ghi chú từ ô gộp không đủ điều kiện) ⇒ chỉ liệt kê, KHÔNG tick sẵn. Đang nạp / xong ⇒ bỏ. */
    plan.forEach(r => {
      const s = _planStatus(r);
      if(s === 'cancel' || s === 'loading' || s === 'done' || r._altSkip || !cxT(r.note)) return;
      add({ customer:r.customer||'', plate:r.plate||'', rmooc:r.rmooc||'', driver:r.driver||'', qty:num(r.qty), note:String(r.note||'').trim(), src:'note', oid:r._oid||'' });
    });
    /* gợi ý kiểm tra: xe đã có GI hôm nay? còn nằm trong Today Plan (không phải Cancelled)? */
    const S = _cnSel(iso);
    cands.forEach(c => {
      const ps = _cnPlates(c.plate);
      c.loadedMT = 0;
      if(ps.length) tl.forEach(r => { if(ps.indexOf(_cnPl(r.truck)) >= 0) c.loadedMT += _c34(r).nw / 1000; });
      c.inPlan = !ps.length || c.src === 'cancel' || c.src === 'note' ? '' : uniq(plan.filter(r => ps.indexOf(_cnPl(r.plate)) >= 0).map(r => _planStatus(r) || 'waiting')).join(', ');
      c.sel = S[c.key] !== undefined ? !!S[c.key] : (c.src === 'cancel' || !!c.pre);     /* v4.221 — mọi xe đã xác nhận huỷ */
    });
    const rows = cands.filter(c => c.sel).map(c => ({ customer:c.customer, plate:c.plate, rmooc:c.rmooc, driver:c.driver, qty:c.qty, note:c.note, src:c.src }));
    const reviewed = !!(ST.cnOk && ST.cnOk[iso]);
    if(cands.length && !reviewed) warn.push('Cancel list not confirmed: '+cands.length+' candidate truck(s) — '+rows.length+' ticked. Open 🚫 Cancel list, tick the trucks that are really cancelled and press ✓ Confirm list.');
    const dailyPlan = first ? num(first.mt) : planMT;
    if(first === null) warn.push('The first plan of '+iso+' was not recorded (it is saved at the first paste / promote of the day) — "Daily plan" shows the current plan. Use 📌 Record to keep the current plan as the first plan.');
    if(!plan.length) warn.push('Today Plan has no rows for '+iso+' (cancelled-vehicle table is empty).');
    let giKg = 0; tl.forEach(r => { giKg += _c34(r).nw; }); vs.forEach(r => { giKg += num(r.lpg) || 0; });
    return { iso, plan, rows, cands, reviewed, sig:rows.map(r => _cnPlates(r.plate).join('+') || r.customer).join('|'),
             planMT, first, drop, dailyPlan, giKg, dailyActual:giKg / 1000, warn, hasPlan:plan.length > 0,
             vanish:(vx || []).filter(v => +v.cx === 1), vanishLoaded:vx !== undefined };
  }
  /* v4.216 — bảng chọn xe huỷ (nằm trong ô 🚫 Cancel list, thu gọn) */
  function _cnPanel(CX){
    const iso = CX.iso, SRC = { cancel:['🚫','Cancelled in Today Plan'], cxgone:['🚫','Cancelled, then removed from Today Plan'], cxfirst:['🚫','Cancelled in the first plan, then removed'],
                                vanish:['🕳','Removed from Today Plan at paste'], removed:['📌','In the first plan, not in Today Plan now'], note:['📝','Sale note says cancel — status is not Cancelled'] };
    const th = t => '<th style="padding:3px 6px;border:1px solid #cbd5e1;background:#e2e8f0;text-align:left;white-space:nowrap">'+t+'</th>';
    const tdc = (t, st) => '<td style="padding:3px 6px;border:1px solid #e2e8f0;'+(st||'')+'">'+t+'</td>';
    let h = '<div style="padding:4px 2px">'+
      '<div class="ml-cap" style="margin-bottom:4px">Cancelled trucks of '+esc(iso)+': 🚫 Cancelled (button or sale note) and trucks whose sale note says cancel are <b>ticked for you</b>. '+
      'Tick a truck that just <b>disappeared</b> from the plan only if it is really cancelled — it may already be loaded, or be listed only for coordination.</div>'+
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap">'+
      '<button class="ml-mini" onclick="MAIL.cnAll(1)">☑ Tick all</button><button class="ml-mini" onclick="MAIL.cnAll(0)">☐ Untick all</button>'+
      '<button class="ml-save" onclick="MAIL.cnOk()" title="Confirm this list for the mail and the Daily Stock file (Cancel List sheet)">✓ Confirm list ('+CX.rows.length+' cancelled)</button>'+
      (CX.reviewed ? '<span class="ml-ok">✓ confirmed</span>' : '<span class="ml-cap" style="color:#b45309;font-weight:600">● not confirmed yet</span>')+'</div>'+
      '<table style="border-collapse:collapse;font-size:11.5px;width:100%"><tr>'+th('✓')+th('Source')+th('Customer')+th('T/L')+th('Romooc')+th('Driver')+th('MT')+th('Note')+th('Check')+'</tr>';
    CX.cands.forEach(c => {
      const s = SRC[c.src] || ['',''], k = esc(c.key).replace(/'/g, '&#39;');
      const chk = [];
      if(c.loadedMT > 0) chk.push('<span style="color:#15803d;font-weight:600">✓ loaded today '+fmt(c.loadedMT,3)+' MT</span>');
      if(c.inPlan) chk.push('<span style="color:#1d4ed8">still in Today Plan ('+esc(c.inPlan)+')</span>');
      h += '<tr style="'+(c.sel ? 'background:#fef2f2' : 'opacity:.75')+'">'+
        tdc('<input type="checkbox"'+(c.sel ? ' checked' : '')+' onchange="MAIL.cnPick(\''+k+'\',this.checked)">','text-align:center')+
        tdc(s[0]+' <span class="ml-cap">'+s[1]+(c.noteCx ? ' · <b>note says cancel</b>' : '')+(c.by ? ' · by '+esc(c.by) : '')+'</span>')+
        tdc(esc(c.customer))+tdc('<b>'+esc(c.plate || '(no truck)')+'</b>','white-space:nowrap')+tdc(esc(c.rmooc),'white-space:nowrap')+tdc(esc(c.driver))+
        tdc(fmt(num(c.qty),3),'text-align:right')+tdc(esc(c.note))+tdc(chk.join('<br>'))+'</tr>';
    });
    return h + '</table></div>';
  }
  function cnPick(k, on){ _cnSel(ST.date)[k] = !!on; ST.cnOk = ST.cnOk || {}; delete ST.cnOk[ST.date]; _renderAll(); }
  function cnAll(on){ const S = _cnSel(ST.date); p2Cancel(ST.date).cands.forEach(c => { S[c.key] = !!on; }); ST.cnOk = ST.cnOk || {}; delete ST.cnOk[ST.date]; _renderAll(); }
  function cnOk(){ ST.cnOk = ST.cnOk || {}; ST.cnOk[ST.date] = true; const F = _fold(); F.cx = false; _lsSet('lpg_v4_mail_fold', F); _renderAll(); }
  function buildP2(){
    const iso = ST.date, prev = isoAdd(iso, -1);
    const tl = _tlDay(iso), vs = _vsRows().filter(r => r.giDate && anyIso(r.giDate) === iso);
    const warn = [];
    if(!tl.length) warn.push('No TL Data rows with GI date '+iso+'.');
    /* ① xe huỷ (Today Plan) — v4.184: MAIL.p2Cancel (dùng chung với Cancel List của RPT) */
    const PD = (typeof PLANDAY !== 'undefined') ? PLANDAY : null;
    /* v4.211 — mỗi ngày chỉ THỬ đọc MỘT lần/phiên: load() lỗi hoặc chưa có db thì không ghi cache ⇒ trước đây
       vẽ lại → đọc lại → vẽ lại… vòng lặp vô tận (treo trình duyệt / đọc Firebase liên tục) */
    const _ld = ST.p2ld || (ST.p2ld = {}), _rr = () => { if(_isOpen() && ST.view === 'rep' && ST.rep === 'P2' && ST.date === iso) _renderAll(); };
    if(PD && PD.get(iso) === undefined && !_ld['pd|'+iso]){ _ld['pd|'+iso] = 1; PD.load(iso).then(_rr); }
    /* v4.187 — xe biến mất đã xác nhận: đọc Firebase MỘT lần khi mở P2 cho ngày đó */
    if(typeof PLANCX !== 'undefined' && PLANCX.get(iso) === undefined && !_ld['cx|'+iso]){ _ld['cx|'+iso] = 1; PLANCX.load(iso).then(_rr); }
    const CX = p2Cancel(iso);
    const plan = CX.plan, cancel = CX.rows, planMT = CX.planMT, first = CX.first, drop = CX.drop, dailyPlan = CX.dailyPlan, giKg = CX.giKg;
    CX.warn.forEach(w => warn.push(w));
    ST.p2first = { iso, first, drop, final:planMT };
    /* ② tồn + chuyển kho + GI theo bồn (kg) */
    const st = _wmsST(iso);
    const gi = { '2100':{ C3:0, C4:0 }, '2101':{ C3:0, C4:0 } };
    tl.forEach(r => { const s = slocOf(r.ltank); if(!s) return; if(_pureOf(r)) return; const q = _c34(r); gi[s].C3 += q.c3; gi[s].C4 += q.c4; });
    const blk = {};
    ['2100','2101'].forEach(s => {
      const e = _sapEnd(s, prev);
      if(!e.has) warn.push('SAP End Stock of '+(s === '2100' ? 'TK-3501' : 'TK-3502')+' on '+prev+' not pasted — Initial stock shows 0.');
      const b = { init:{ C3:e.c3||0, C4:e.c4||0 } };
      ['fromCav','toCav','tkX'].forEach(k => { b[k] = { C3:st[s][k].C3, C4:st[s][k].C4 }; });
      /* v4.193 — "To Cavern" (bồn → 1100) chỉ là ĐỔI BATCH, không phải trả hàng về cavern: gộp vào From Cavern
         (From = nhận − trả, tổng Stock transfer không đổi) và dòng To Cavern luôn 0 — khớp cách báo cáo cũ. */
      b.fromCav = { C3:b.fromCav.C3 - b.toCav.C3, C4:b.fromCav.C4 - b.toCav.C4 }; b.toCav = { C3:0, C4:0 };
      b.stTot = { C3:b.fromCav.C3 - b.toCav.C3 + b.tkX.C3, C4:b.fromCav.C4 - b.toCav.C4 + b.tkX.C4 };
      b.gi = gi[s];
      b.end = { C3:b.init.C3 + b.stTot.C3 - b.gi.C3, C4:b.init.C4 + b.stTot.C4 - b.gi.C4 };
      blk[s] = b;
    });
    const sum = k => ({ C3:blk['2100'][k].C3 + blk['2101'][k].C3, C4:blk['2100'][k].C4 + blk['2101'][k].C4 });
    blk.tot = {}; ['init','fromCav','toCav','tkX','stTot','gi','end'].forEach(k => { blk.tot[k] = sum(k); });

    /* ③ Trade type summary */
    const TT = {}; const mk = () => ({ c3:0, c4:0, trips:new Set() });
    ['dom','exp','domP','expP','domS','expS'].forEach(k => TT[k] = mk());
    tl.forEach(r => { const q = _c34(r); const k = (_dirOf(r) === 'E' ? 'exp' : 'dom') + (_pureOf(r) ? 'P' : ''); TT[k].c3 += q.c3; TT[k].c4 += q.c4; TT[k].trips.add(_tripKey(r)); });
    vs.forEach(r => { let c3 = num(r.c3)||0, c4 = num(r.c4)||0; const nw = num(r.lpg)||0; if(!c3 && !c4){ c3 = nw/2; c4 = nw/2; }
      let d = ''; try{ d = TRADE.dirOfText(r.item) || TRADE.dirOfRow({ trade:r.item, customer:r.customer }).dir; }catch(_){ d = /export/i.test(r.item||'') ? 'E' : 'D'; }
      const k = d === 'E' ? 'expS' : 'domS'; TT[k].c3 += c3; TT[k].c4 += c4; TT[k].trips.add('VS|'+(r.doNo||'')+'|'+(r.vessel||'')); });

    /* ④ v4.181 — tổng hợp theo khách: CHÍNH hàm của Report Engine (sheet Summary Data) */
    let gl = [];
    try{ gl = (typeof RPT !== 'undefined' && RPT.summaryGroups) ? RPT.summaryGroups(iso).gList : []; }
    catch(e){ warn.push('Daily summary could not be built: '+e.message); }

    /* ── HTML ── */
    const HB = 'background:#1f3864;color:#fff;', H1 = 'background:#2e75b6;color:#fff;', H2 = 'background:#548235;color:#fff;';
    const small = 'font-size:9pt;';
    let b = greet('Dear Sirs,');
    b += para('I would like send to you Daily LPG Loading Report on '+longDate(iso).replace(/, \d{4}$/,'')+' as below:');
    b += bullet('The list of cancelled vehicles: '+cancel.length+' eas.');
    let c = T_OPEN + '<tr>'+['Date','Daily plan (MT)','Daily actual (MT)','Cancel Trip','Customer','T/L plate number','Romooc Number','Driver name','Quantity (MT)','Note']
      .map(x => th(x, C_HEAD+small)).join('')+'</tr>';
    const rs = Math.max(1, cancel.length);
    const lead = td(dMonY(iso), CE, 'rowspan="'+rs+'"')+td(fmt(dailyPlan,0), CE, 'rowspan="'+rs+'"')+td(fmt(giKg/1000,0), CE, 'rowspan="'+rs+'"')+td(String(cancel.length), CE, 'rowspan="'+rs+'"');
    if(!cancel.length) c += '<tr>'+lead+td('—',CE,'colspan="6"')+'</tr>';
    cancel.forEach((r, i) => {
      c += '<tr>'+(i === 0 ? lead : '')+td(esc(r.customer),CE)+td(esc(r.plate),CE)+td(esc(r.rmooc),CE)+td(esc(r.driver),CE)+
        td(fmt(num(r.qty),3),R)+td(esc(r.note || 'Cancel'),'')+'</tr>';
    });
    b += c + '</table>';

    b += bullet('Ball Tank Inventory and Goods Issue:');
    const rowsST = [['Initial Stock','init',true],['From Cavern','fromCav'],['To Cavern','toCav'],['Tank Cross Transfer','tkX'],
                    ['Total Stock transfer','stTot',true],['Good Issue','gi',true],['End Stock','end',true]];
    let s = T_OPEN.replace('font-size:10.5pt','font-size:9.5pt') +
      '<tr>'+td('<b>'+dMonY(iso)+'</b>','font-size:12pt')+td('<b>Stock Transfer and GI Summary</b>','font-size:12pt','colspan="8"')+td('Unit: Kg',R+small)+'</tr>'+
      '<tr>'+th('Item',C_HEAD,'rowspan="2"')+th('TK-3501',H1,'colspan="3"')+th('TK-3502',H1,'colspan="3"')+th('TK-3501 + TK-3502',H2,'colspan="3"')+'</tr>'+
      '<tr>'+[H1,H1,H1,H1,H1,H1,H2,H2,H2].map((st2,i)=>th(['C3','C4','LPG'][i%3],st2)).join('')+'</tr>';
    rowsST.forEach(([lbl, k, bold]) => {
      const col = (lbl === 'Initial Stock' || lbl === 'End Stock') ? 'color:#c55a11;' : '';
      const fw = bold ? 'font-weight:bold;' : small;
      s += '<tr>'+td(lbl, fw+col)+['2100','2101','tot'].map(x => { const v = blk[x][k];
        return td(kg(v.C3),R+fw+col)+td(kg(v.C4),R+fw+col)+td(kg(v.C3+v.C4),R+fw+col); }).join('')+'</tr>';
    });
    s += '</table>';
    const ttRow = (lbl, k, st2) => { const t = TT[k]; return '<tr>'+td(lbl, small+(st2||''))+td(kg(t.c3),R+small+(st2||''))+td(kg(t.c4),R+small+(st2||''))+
      td(kg(t.c3+t.c4),R+small+(st2||''))+td(t.trips.size ? String(t.trips.size) : '-',R+small+C_YEL)+'</tr>'; };
    const add = ks => { const o = { c3:0, c4:0, trips:new Set() }; ks.forEach(k => { o.c3 += TT[k].c3; o.c4 += TT[k].c4; TT[k].trips.forEach(x => o.trips.add(x)); }); return o; };
    TT.sub = add(['dom','exp','domP','expP']); TT.all = add(['dom','exp','domP','expP','domS','expS']);
    const bold2 = 'font-weight:bold;';
    let t = T_OPEN.replace('font-size:10.5pt','font-size:9.5pt') +
      '<tr>'+td('<b>Trade Type Summary</b>','font-size:12pt','colspan="4"')+td('Unit: Kg',R+small)+'</tr>'+
      '<tr>'+th('LPG Sale',HB+small)+th('C3',H2+small)+th('C4',H2+small)+th('LPG',H2+small)+th('Trip',H2+small)+'</tr>'+
      ttRow('Domestic','dom','background:#ddebf7;')+ttRow('Export','exp','background:#ddebf7;')+ttRow('Domestic (Pure)','domP','background:#ddebf7;')+
      (TT.expP.trips.size ? ttRow('Export (Pure)','expP','background:#ddebf7;') : '')+
      ttRow('Subtotal','sub',bold2+'color:#c00000;')+ttRow('Domestic (Ship)','domS','background:#fce4d6;')+ttRow('Export (Ship)','expS','background:#fce4d6;')+
      ttRow('Total','all',bold2+'color:#c00000;')+'</table>';
    b += '<table cellspacing="0" cellpadding="0"><tr><td valign="top">'+s+'</td><td style="width:24px"></td><td valign="top">'+t+'</td></tr></table>';

    b += bullet('Loading LPG:');
    /* v4.181 — bố cục y sheet Summary Data: Customer · Item · Product type · T/L Qty · Loading Qty ·
       Price · Good Issue TK-3501 / TK-3502 / Vessel / Pure (C3 · C4 · Total) */
    const HG = 'background:#d9d9d9;', HT = 'background:#fff2cc;font-weight:bold;';
    let d = T_OPEN.replace('font-size:10.5pt','font-size:9pt') +
      '<tr>'+td('<b>['+iso.slice(5).replace('-','/')+' Daily summary]</b>','','colspan="19"')+'</tr>'+
      '<tr>'+['Customer','Item','Product type','T/L Qty','Loading Qty','Price<br>(usd/mt),<br>excl VAT'].map(x => th(x, HG, 'rowspan="3"')).join('')+th('Good Issue', HG, 'colspan="12"')+'</tr>'+
      '<tr>'+['TK-3501','TK-3502','Vessel','Pure'].map(x => th(x, HG, 'colspan="3"')).join('')+'</tr>'+
      '<tr>'+[0,1,2,3].map(() => th('C3',HG)+th('C4',HG)+th('Total',HG)).join('')+'</tr>';
    const T = { trips:0, qty:0, pq:0, pv:0, g:{ tk3501:{c3:0,c4:0}, tk3502:{c3:0,c4:0}, ship:{c3:0,c4:0}, pure:{c3:0,c4:0} } };
    const gi3 = (x) => td(kg(x.c3),R)+td(kg(x.c4),R)+td(kg(x.c3+x.c4),R);
    gl.forEach(g => {
      const isE = /export/i.test(g.trade||'');
      d += '<tr>'+td(esc(g.cust), CE+(isE ? 'color:#2e75b6;' : ''))+td(esc(g.trade), CE+(isE ? 'color:#2e75b6;' : ''))+td(esc(g.type), CE)+td(String(g.trips), CE)+
        td(kg(g.loadQty), R)+td(g.price ? fmt(g.price, 2).replace(/\.00$/,'') : '', R+'background:#ddebf7;')+
        gi3(g.gi.tk3501)+gi3(g.gi.tk3502)+gi3(g.gi.ship)+gi3(g.gi.pure)+'</tr>';
      T.trips += g.trips; T.qty += g.loadQty; if(g.price){ T.pq += g.loadQty; T.pv += g.loadQty * g.price; }
      ['tk3501','tk3502','ship','pure'].forEach(k => { T.g[k].c3 += g.gi[k].c3; T.g[k].c4 += g.gi[k].c4; });
    });
    if(!gl.length) d += '<tr>'+td('—',CE,'colspan="18"')+'</tr>';
    const gt = x => td('<b>'+kg(x.c3)+'</b>',R+HT)+td('<b>'+kg(x.c4)+'</b>',R+HT)+td('<b>'+kg(x.c3+x.c4)+'</b>',R+HT);
    d += '<tr>'+td('<b>Total</b>',CE+HT,'colspan="3"')+td('<b>'+T.trips+'</b>',CE+HT)+td('<b>'+kg(T.qty)+'</b>',R+HT)+
      td('<b>'+(T.pq ? fmt(T.pv / T.pq, 2) : '')+'</b>',R+HT)+gt(T.g.tk3501)+gt(T.g.tk3502)+gt(T.g.ship)+gt(T.g.pure)+'</tr></table>';
    b += d;
    /* v4.181 — Summary data (luỹ kế) từ file Daily Stock */
    const A = ST.acc && ST.acc.date === iso ? ST.acc : null;
    if(A){
      const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const k0 = v => (!v || Math.abs(v) < 0.5) ? '-' : fmt(Math.round(v), 0);
      const tot = v => v.reduce((x, y) => x + y, 0);
      let a = T_OPEN.replace('font-size:10.5pt','font-size:9pt') +
        '<tr>'+td('<b>Summary data</b>','','colspan="8"')+'</tr>'+
        '<tr>'+['Customer'].concat(A.cats, ['Total (KG)']).map(x => th(x, HG)).join('')+th('', 'background:#fce4d6;')+'</tr>';
      a += '<tr>'+td('Yearly Acummulation','color:#c00000;font-weight:bold;background:#fff2cc;')+A.year.map(v => td(k0(v), R+'color:#c00000;font-weight:bold;background:#fff2cc;')).join('')+
        td(k0(tot(A.year)), R+'color:#c00000;font-weight:bold;background:#fff2cc;')+
        td('Yearly Accumulation<br>Loading Qty by<br>Customer', CE+'color:#c00000;font-weight:bold;background:#fce4d6;', 'rowspan="'+(A.months.length + 1)+'"')+'</tr>';
      A.months.forEach(m => { const st = m.cur ? 'background:#92d050;font-weight:bold;' : 'background:#d9d9d9;font-weight:bold;';
        a += '<tr>'+td(MN[+m.ym.slice(5) - 1] || m.ym, st)+m.v.map(v => td(k0(v), R+st)).join('')+td(k0(tot(m.v)), R+st)+'</tr>'; });
      /* v4.203 — BẢNG RÚT GỌN: chỉ khách có KL tháng này ≠ 0 (+ khách mới chưa có dòng trong file, tô đỏ);
         khách tháng này = 0 gom thành MỘT dòng "Other N customers" giữ luỹ kế năm ⇒ tổng vẫn khớp file. */
      const nz = v => Math.abs(v || 0) >= 0.5;
      const act = A.cust.filter(c => nz(c.tot)).concat(A.extra || []);
      const idle = A.cust.filter(c => !nz(c.tot) && nz(c.yr));
      act.forEach(c => { const nw = c.isNew ? 'color:#c00000;font-weight:bold;background:#ffe5e5;' : '';
        a += '<tr>'+td(esc(c.name)+(c.isNew ? ' <span style="font-size:8pt">(NEW – not in file list)</span>' : ''), nw)+c.v.map(v => td(k0(v), R+nw)).join('')+
          td(k0(c.tot), R+nw)+td(k0(c.yr), R+'color:#c00000;'+(c.isNew ? 'background:#ffe5e5;' : ''))+'</tr>'; });
      if(!act.length) a += '<tr>'+td('No loading this month', 'font-style:italic;color:#7f7f7f;', 'colspan="'+(A.cats.length + 3)+'"')+'</tr>';
      if(idle.length){ const gs = 'font-style:italic;color:#7f7f7f;';
        a += '<tr>'+td('Other '+idle.length+' customer'+(idle.length > 1 ? 's' : '')+' (no loading in '+(MN[+A.ym.slice(5) - 1] || A.ym)+')', gs)+
          A.cats.map(() => td('-', R+gs)).join('')+td('-', R+gs)+td(k0(tot(idle.map(c => c.yr))), R+gs+'color:#c00000;')+'</tr>'; }
      b += a + '</table>';
      if(A.unlisted.length) warn.push('NEW customer(s) sold this month but not in the Summary Data "by customer" list of the file: '+A.unlisted.join(', ')+' — shown in red in the email; add them to the file (▶ Build report offers to add them automatically) so the accumulation is complete.');
    } else warn.push('Accumulation table (Summary data) comes from the Daily Stock file — 📂 pick the file then press ▶ Build report (or 📎 attach the filled file).');
    b += para('Please find the detail in the attachment.');
    const subject = '[LPGT] Daily LPG Loading Report – ' + iso;
    if(!ST.files.some(f => f.rep === 'P2')) warn.push('Daily Stock report file not attached — 📂 pick the file then press ▶ Build report.');
    return { subject, body:b, warn, attach:'Daily LPG Loading & Ball Tank Stock_'+iso+'.xlsx' };
  }

  /* ── P3 · DEW POINT ───────────────────────────────────────────── */

  /* ── P3 · DEW POINT — số đo lưu node dew_point/<ngày> (người gõ ⇒ Firebase) ── */
  const _dn = v => (typeof ENGX_U !== 'undefined' && ENGX_U.num) ? ENGX_U.num(v) : num(v);   /* v4.224 — đọc số dew point như tab Engineer (−45 unicode, dấu phẩy) */
  const DEW_PTS = [['ca','Outlet Coalescer A',-32],['cb','Outlet Coalescer B',-32],['da','Outlet Dryer A',-45],['db','Outlet Dryer B',-45]];
  function _dewLoad(date){
    if(ST.dew.loaded === date) return;
    ST.dew.loaded = date;
    try{
      firebase.database().ref('dew_point/'+date).once('value').then(s => {
        const v = s.val();
        if(v && ST.dew.loaded === date){ ['no','time','ca','cb','da','db'].forEach(k => { if(v[k] != null) ST.dew[k] = String(v[k]); });
          if(String(v.no == null ? '' : v.no).trim()) ST.dew.noUser = true; ST.dew.saved = true; _renderAll(); }
      }).catch(e => console.warn('[MAIL] dew load', e));
      /* v4.224 — No. KHÔNG còn lấy "bản ghi cuối + 1" (lịch sử import không có No. ⇒ luôn trống): _dewAutoNo()
         đếm theo lịch sử DEWPT + dòng cuối file Excel đang chọn — cùng một cách với Engineer ▸ 💧 Dew Point */
    }catch(_){}
  }
  function _dewAutoNo(){
    const d = ST.dew; if(d.noUser) return;
    if(typeof DEWPT === 'undefined' || !DEWPT.nextNo || !DEWPT.isLoaded('c3')) return;
    const n = DEWPT.nextNo(ST.date, 'c3'); if(n !== d.no) d.no = n;
  }
  /* v4.207 — CHỈ lưu khi người dùng bấm 💾 (hoặc chọn 💾 ở hộp nhắc lúc rời email). Trả Promise<true|false>. */
  async function dewSave(){
    if(typeof canWrite === 'function' && !canWrite('mail')){ _toast('⛔ Your account has no write permission', 'er'); return false; }
    if(!ST.date || !DEW_PTS.some(p => String(ST.dew[p[0]] == null ? '' : ST.dew[p[0]]).trim() !== '')){ _toast('⚠ No dew point reading to save', 'er'); return false; }
    const d = ST.dew;
    /* ⭐ v4.224 — CÙNG bộ kiểm với Engineer ▸ 💧 Dew Point (DEWPT.confirmCheck): không phải số / ngoài dải ⇒ chặn;
       số dương (thiếu dấu âm) · vượt giới hạn · lệch ≥ 12 °C so với lần đo trước · dryer ướt hơn coalescer ⇒ hỏi lại */
    if(typeof DEWPT !== 'undefined' && DEWPT.confirmCheck){ if(!(await DEWPT.confirmCheck('c3', ST.date, d))) return false; }
    else { const bad = DEW_PTS.filter(p => { const t = String(d[p[0]] == null ? '' : d[p[0]]).trim(); return t !== '' && _dn(t) === null; });
      if(bad.length){ _toast('⚠ '+bad.map(p => p[1]).join(', ')+': not a number', 'er'); return false; }
      const odd = DEW_PTS.map(p => [p, _dn(d[p[0]])]).filter(([, v]) => v != null && (v > 0 || v < -110)).map(([p, v]) => p[1]+' = '+v);
      if(odd.length){ const msg = '⚠ Check these readings before saving ('+ST.date+')\n\n• '+odd.join('\n• ')+'\n\nDew point is normally NEGATIVE.\n\nOK = Save anyway\nCancel = Go back and fix';
        if(!((typeof UIDLG !== 'undefined' && UIDLG.ask) ? await UIDLG.ask(msg) : confirm(msg))) return false; } }
    const rec = { no:String(d.no == null ? '' : d.no).trim(), time:d.time, _ts:Date.now(), by:(typeof CURRENT_USER!=='undefined' && CURRENT_USER.name) || '?' };
    DEW_PTS.forEach(p => { const v = _dn(d[p[0]]); rec[p[0]] = v == null ? '' : v; });
    try{
      /* v4.176 — update (không set) để giữ ô Note gõ ở Engineer ▸ 💧 Dew Point */
      return firebase.database().ref('dew_point/'+ST.date).update(rec)
        .then(() => { ST.dew.saved = true; ST.dew.touched = false; if(rec.no) ST.dew.noUser = true; try{ DEWPT.ingest(ST.date, rec); }catch(_){} _toast('💾 Dew point '+ST.date+' saved', 'ok'); _renderAll(); return true; })
        .catch(e => { _toast('⚠ Save failed: '+e.message, 'er'); return false; });
    }catch(e){ _toast('⚠ Save failed: '+e.message, 'er'); return false; }
  }
  /* v4.207 — có số VỪA GÕ mà chưa lưu ⇒ rời email P3 (đổi báo cáo / đổi ngày / 👥 / đóng) thì HỎI:
     💾 Save & continue · Discard & continue · Stay. Không bao giờ tự lưu. */
  function _dewDirty(){ return ST.view === 'rep' && ST.rep === 'P3' && !!ST.dew.touched && !ST.dew.saved && DEW_PTS.some(p => _dn(ST.dew[p[0]]) !== null); }
  function _dewGuard(go){
    if(!_dewDirty()){ go(); return; }
    const d = ST.dew;
    const vals = DEW_PTS.filter(p => _dn(d[p[0]]) !== null).map(p => esc(p[1].replace('Outlet ',''))+' <b>'+esc(String(_dn(d[p[0]])))+'</b>').join(' · ');
    let box = document.getElementById('mlDewAsk'); if(box) box.remove();
    box = document.createElement('div'); box.id = 'mlDewAsk';
    box.setAttribute('style', 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center');
    box.innerHTML = '<div style="background:#fff;border-radius:10px;padding:18px 20px;max-width:460px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:13px;line-height:1.5">'+
      '<div style="font-weight:700;font-size:14px;color:#b45309;margin-bottom:6px">⚠ Dew point readings not saved</div>'+
      '<div>Date <b>'+esc(ST.date)+'</b>'+(d.no ? ' · No. '+esc(d.no) : '')+(d.time ? ' · '+esc(d.time) : '')+'</div>'+
      '<div style="margin:6px 0 12px">'+vals+'</div>'+
      '<div style="color:#475569;margin-bottom:12px">Save them to the dew point history (Engineer ▸ 💧 Dew Point)?</div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'+
        '<button data-a="stay" class="ml-mini">Stay</button>'+
        '<button data-a="drop" class="ml-mini">Discard &amp; continue</button>'+
        '<button data-a="save" class="ml-save">💾 Save &amp; continue</button></div></div>';
    box.addEventListener('click', ev => {
      const a = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-a'); if(!a) return;
      if(a === 'stay'){ box.remove(); _renderAll(); return; }
      if(a === 'drop'){ box.remove(); ST.dew.touched = false; go(); return; }
      if(a === 'save') dewSave().then(ok => { if(ok){ box.remove(); go(); } });
    });
    document.body.appendChild(box);
  }
  try{ window.addEventListener('beforeunload', e => { if(_isOpen() && _dewDirty()){ e.preventDefault(); e.returnValue = ''; } }); }catch(_){}
  /* ═══ v4.206 — BIỂU ĐỒ "Dew Point of C3 Dryer Outlet" cho email P3 ═══════════════════════
     Nguồn: lịch sử dew_point (DEWPT — cùng bộ nhớ với Engineer ▸ 💧 Dew Point) + số đang gõ của ngày báo cáo.
     Vẽ bằng <canvas> ra PNG (Outlook không hiển thị SVG): Dryer A xanh · Dryer B đỏ · xu hướng tuyến tính chấm,
     trục Y trần −40 °C như biểu đồ Excel cũ, vạch giới hạn −45 °C. .eml nhúng ảnh dạng cid (multipart/related). */
  const DEW_RANGE = { '6m':[183,'6 months'], '1y':[365,'1 year'], '16m':[480,'16 months'], '2y':[730,'2 years'] };
  const DEW_CW = 620, DEW_CH = 420;
  function dewRange(k){ if(DEW_RANGE[k] || k === 'xl'){ ST.dewRange = k; ST.dewPick = true; ST.dewPng = null; _renderAll(); } }
  /* ⭐ v4.226 — có file Excel dew point ⇒ biểu đồ trong thư vẽ từ CHÍNH vùng dữ liệu biểu đồ của file (DEWXL.chart):
     cùng dòng, cùng khoảng ngày, cùng tên / màu series, trần trục Y, ô trống = đứt đường như Excel ⇒ khớp file đính kèm.
     (File .xlsx không chứa ảnh biểu đồ, chỉ chứa định nghĩa ⇒ không "chép ảnh" được, phải vẽ lại từ đúng dữ liệu đó.)
     Người dùng vẫn chọn lại được 6M / 1Y / 16M / 2Y từ lịch sử app. */
  function _dewUseXl(){ return typeof DEWXL !== 'undefined' && DEWXL.has && DEWXL.has('c3') && (ST.dewRange === 'xl' || !ST.dewPick); }
  function _dewSeries(d){
    const H = (typeof DEWPT !== 'undefined' && DEWPT.c3Rows) ? DEWPT.c3Rows() : null;
    if(!H) return null;
    const to = ST.date, from = isoAdd(to, -DEW_RANGE[ST.dewRange][0]);
    const m = {};
    Object.keys(H).forEach(k => { if(k >= from && k <= to && H[k]) m[k] = { da:_dn(H[k].da), db:_dn(H[k].db) }; });
    const cur = { da:_dn(d.da), db:_dn(d.db) };                  /* số đang gõ (có thể chưa lưu) thắng số cũ */
    if(cur.da !== null || cur.db !== null) m[to] = { da:cur.da !== null ? cur.da : (m[to] || {}).da, db:cur.db !== null ? cur.db : (m[to] || {}).db };
    return Object.keys(m).sort().map(k => ({ date:k, da:m[k].da, db:m[k].db })).filter(r => r.da !== null || r.db !== null);
  }
  function _dewChart(d){
    if(_dewUseXl()){
      const C = DEWXL.chart('c3');
      if(!C) return { warn:'Reading the chart of the Excel file…' };
      const Cv = C.rows.filter(r => r.da != null || r.db != null);
      if(!Cv.length) return { warn:'The Excel file chart has no Dryer A/B data — chart not included.' };
      const w = Cv[Cv.length-1].date < ST.date ? 'The chart is drawn from the Excel file, which has no reading for '+ST.date+' yet — press ▶ Fill file & attach.' : '';
      const key = 'xl|'+C.sig;
      if(ST.dewPng && ST.dewPng.key === key) return { url:ST.dewPng.url, warn:w };
      const url = _dewDraw(C.rows, { title:C.title, hi:C.ymax, lo:C.ymin, names:C.names, cols:C.cols, gap:C.gap });
      if(!url) return { warn:(w ? w+' ' : '')+'This browser cannot draw the chart — chart not included.' };
      ST.dewPng = { key, url }; return { url, warn:w };
    }
    const H = (typeof DEWPT !== 'undefined' && DEWPT.c3Rows) ? DEWPT.c3Rows() : null;
    if(!H){
      if(typeof DEWPT === 'undefined' || !DEWPT.c3Hist) return { warn:'Dew point history module not loaded — chart not included.' };
      if(!ST.dewHistReq){ ST.dewHistReq = true;
        DEWPT.c3Hist().then(() => { ST.dewHistErr = ''; if(_isOpen() && ST.rep === 'P3') _renderAll(); },
                            e => { ST.dewHistErr = e.message || String(e); if(_isOpen() && ST.rep === 'P3') _renderAll(); }); }   /* v4.211 — lỗi thì KHÔNG thử lại ngay (tránh vòng lặp vẽ lại ↔ đọc lại); mở lại email mới thử lại */
      return { warn: ST.dewHistErr ? 'Dew point history not loaded ('+ST.dewHistErr+') — chart not included.' : 'Loading dew point history for the chart…' };
    }
    const S = _dewSeries(d);
    if(!S.length) return { warn:'No Dryer A/B reading in the chart period — chart not included.' };
    const key = ST.dewRange+'|'+S.length+'|'+S.map(r => r.date.slice(5)+(r.da == null ? '' : r.da)+'/'+(r.db == null ? '' : r.db)).join(',');
    if(ST.dewPng && ST.dewPng.key === key) return { url:ST.dewPng.url };
    const url = _dewDraw(S);
    if(!url) return { warn:'This browser cannot draw the chart — chart not included.' };
    ST.dewPng = { key, url };
    return { url };
  }
  function _dewDraw(S, o){
    o = o || {};
    let cv; try{ cv = document.createElement('canvas'); }catch(_){ return ''; }
    const k = 2, W = DEW_CW, Hh = DEW_CH; cv.width = W * k; cv.height = Hh * k;
    const g = cv.getContext && cv.getContext('2d'); if(!g) return '';
    g.scale(k, k);
    const day = iso => { const p = iso.split('-'); return Date.UTC(+p[0], +p[1]-1, +p[2]) / 864e5; };
    const L = 62, R = 16, T = 78, B = 44;                       /* nhãn ngày nằm TRÊN như biểu đồ Excel cũ */
    const Sv = S.filter(r => r.da != null || r.db != null); if(!Sv.length) return '';
    const x0 = day(Sv[0].date), x1 = Math.max(day(Sv[Sv.length-1].date), x0 + 1);
    const vals = S.flatMap(r => [r.da, r.db]).filter(v => v != null);
    const hi = o.hi != null ? o.hi : Math.max(-40, Math.ceil(Math.max(...vals) / 5) * 5), lo = o.lo != null ? o.lo : Math.min(-85, Math.floor(Math.min(...vals) / 5) * 5);
    const X = dd => L + (dd - x0) / (x1 - x0) * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (Hh - T - B);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#404040'; g.font = '13px Arial'; g.textAlign = 'center'; g.fillText(o.title || 'Dew Point of C3 Dryer Outlet', W / 2, 18);
    /* lưới + trục Y */
    g.font = '10px Arial'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for(let v = hi; v >= lo; v -= 5){ g.strokeStyle = '#d9d9d9'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(v) + .5); g.lineTo(W - R, Y(v) + .5); g.stroke(); g.fillStyle = '#595959'; g.fillText(v.toFixed(1), L - 6, Y(v)); }
    g.save(); g.translate(14, T + (Hh - T - B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = 'bold 10px Arial'; g.fillStyle = '#404040'; g.fillText('Dew Point (\u2103)', 0, 0); g.restore();
    /* nhãn ngày (m/d, dọc) ~ 45 nhãn */
    const step = o.title && (x1 - x0) / 10 <= 55 ? 10 : Math.max(1, Math.round((x1 - x0) / 45));      /* file Excel: nhãn mỗi 10 ngày như biểu đồ gốc */
    g.font = '9px Arial'; g.fillStyle = '#404040'; g.textBaseline = 'middle';
    for(let dd = x0; dd <= x1; dd += step){ const dt = new Date(dd * 864e5); g.save(); g.translate(X(dd), T - 4); g.rotate(-Math.PI / 2); g.textAlign = 'left'; g.fillText((dt.getUTCMonth()+1)+'/'+dt.getUTCDate(), 0, 0); g.restore(); }
    g.strokeStyle = '#bfbfbf'; g.beginPath(); g.moveTo(L, T); g.lineTo(W - R, T); g.stroke();
    /* giới hạn dryer −45 °C */
    if(!o.title && -45 <= hi && -45 >= lo){                    /* biểu đồ theo file Excel: file không có vạch này ⇒ không vẽ */ g.save(); g.setLineDash([6, 4]); g.strokeStyle = '#7f7f7f'; g.beginPath(); g.moveTo(L, Y(-45)); g.lineTo(W - R, Y(-45)); g.stroke(); g.restore();
      g.fillStyle = '#7f7f7f'; g.font = '9px Arial'; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText('Limit -45', W - R - 2, Y(-45) - 2); }
    const nm = o.names || {}, cl = o.cols || {};
    const SER = [['da', nm.da || 'Outlet Dryer A', cl.da || '#4472c4'], ['db', nm.db || 'Outlet Dryer B', cl.db || '#c0504d']];
    SER.forEach(([kk, , col]) => {
      const P = S.filter(r => r[kk] != null); if(!P.length) return;
      g.strokeStyle = col; g.lineWidth = 1.6; g.lineJoin = 'round'; g.beginPath();
      /* o.gap (file Excel, dispBlanksAs=gap): dòng có ngày mà ô trống ⇒ đứt đường; lịch sử app: nối liền */
      let pen = false; S.forEach(r => { if(r[kk] == null){ if(o.gap) pen = false; return; } const px = X(day(r.date)), py = Y(r[kk]); if(pen) g.lineTo(px, py); else g.moveTo(px, py); pen = true; }); g.stroke();
      if(P.length === 1){ g.fillStyle = col; g.beginPath(); g.arc(X(day(P[0].date)), Y(P[0][kk]), 2.5, 0, 7); g.fill(); }
      /* xu hướng tuyến tính (chấm) */
      const n = P.length; if(n < 2) return;
      let sx = 0, sy = 0, sxx = 0, sxy = 0; P.forEach(r => { const xx = day(r.date) - x0, yy = r[kk]; sx += xx; sy += yy; sxx += xx*xx; sxy += xx*yy; });
      const dn = n * sxx - sx * sx; if(!dn) return; const bb = (n * sxy - sx * sy) / dn, aa = (sy - bb * sx) / n;
      g.save(); g.setLineDash([2, 3]); g.lineWidth = 1.4; g.beginPath(); g.moveTo(X(x0), Y(aa)); g.lineTo(X(x1), Y(aa + bb * (x1 - x0))); g.stroke(); g.restore();
    });
    /* chú thích */
    g.font = '10px Arial'; g.textBaseline = 'middle'; g.textAlign = 'left';
    let lx = L + 20; const ly = Hh - 16;
    SER.forEach(([kk, nm, col]) => {
      g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([]); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 22, ly); g.stroke(); g.fillStyle = '#404040'; g.fillText(nm, lx + 27, ly); lx += 27 + g.measureText(nm).width + 18;
      g.save(); g.setLineDash([2, 3]); g.lineWidth = 1.4; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 22, ly); g.stroke(); g.restore();
      const t = 'Linear ('+(o.names ? nm : nm.replace('Outlet ',''))+')'; g.fillText(t, lx + 27, ly); lx += 27 + g.measureText(t).width + 22;
    });
    const last = Sv[Sv.length-1];
    g.textAlign = 'right'; g.fillStyle = '#7f7f7f'; g.font = '9px Arial';
    g.fillText(Sv[0].date.split('-').reverse().join('/')+' – '+last.date.split('-').reverse().join('/')+' · '+Sv.length+' readings', W - R, 36);
    try{ return cv.toDataURL('image/png'); }catch(_){ return ''; }
  }
  async function dewCopyChart(){
    const u = ST.dewPng && ST.dewPng.url; if(!u) return;
    try{
      const blob = await (await fetch(u)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png':blob })]);
      _toast('📋 Chart copied — paste it into the mail with Ctrl+V', 'ok');
    }catch(e){ _toast('⚠ Cannot copy the chart: '+e.message, 'er'); }
  }
  function buildP3(){
    _dewLoad(ST.date); _dewAutoNo();
    const d = ST.dew, warn = [];
    let tb = T_OPEN.replace("'Times New Roman',Times,serif","Arial,sans-serif") +
      '<tr>'+td('DEWPOINT DATA SHEET - CAVERN','font-size:16pt;font-weight:bold;'+CE+'background:#9dc3e6','colspan="7"')+'</tr>'+
      '<tr>'+th('No.','background:#ffff99','rowspan="2"')+th('Date','background:#ffff99','rowspan="2"')+th('Time','background:#ffff99','rowspan="2"')+
      th('Sampling point','background:#ffff99','colspan="4"')+'</tr>'+
      '<tr>'+DEW_PTS.map(p=>th(p[1],'background:#ffff99')).join('')+'</tr>'+
      '<tr>'+th('Spec (&deg;C)','background:#ffff99','colspan="3"')+DEW_PTS.map(p=>th('&lt;'+p[2],'background:#ffff99')).join('')+'</tr>';
    /* ⭐ v4.224 — 3 ĐỢT GẦN NHẤT: 2 lần đo trước (chữ thường, xám) + đợt của NGÀY GỬI (đậm, nền xanh lá) */
    const rowOf = (no, iso, time, V, cur) => {
      const b = cur ? 'font-weight:bold;background:#e2efda;color:#000;' : 'color:#404040;';
      return '<tr>'+td(esc(no), CE+b)+td(iso.split('-').reverse().join('/'), CE+b)+td(esc(time), CE+b)+DEW_PTS.map(p => {
        const v = V[p[0]], off = v != null && v >= p[2];
        return td(v == null ? '' : fmt(v,1), CE+b+(off ? 'background:#ffc7ce;color:#9c0006;font-weight:bold;' : '')); }).join('')+'</tr>';
    };
    const prev = (typeof DEWPT !== 'undefined' && DEWPT.recent && DEWPT.isLoaded('c3')) ? DEWPT.recent('c3', ST.date, 2) : [];
    prev.forEach(r => { tb += rowOf(r.n == null ? '' : r.n, r.date, r.time, { ca:r.ca, cb:r.cb, da:r.da, db:r.db }, false); });
    const cur = {};
    DEW_PTS.forEach(p => {
      const t = String(d[p[0]] == null ? '' : d[p[0]]).trim(), v = _dn(t); cur[p[0]] = v;
      if(t !== '' && v === null) warn.push(p[1]+': "'+t+'" is not a number.');
      if(v !== null && v > 0) warn.push(p[1]+': positive value '+v+' — missing minus sign?');
      if(v !== null && (v < -110 || v > 30)) warn.push(p[1]+': '+v+' °C is outside the physical range.');
      if(v !== null && v <= 0 && v >= p[2]) warn.push(p[1]+' '+v+' °C is OFF-SPEC (limit <'+p[2]+').');
    });
    tb += rowOf(d.no, ST.date, d.time, cur, true)+'</table>';
    const empty = DEW_PTS.filter(p => _dn(d[p[0]]) === null);
    if(empty.length === DEW_PTS.length) warn.push('No dew point reading entered.');
    else if(empty.length) warn.push('No reading for: '+empty.map(p => p[1]).join(', ')+'.');
    if(!d.saved) warn.push('Readings not saved yet — press 💾 Save reading so they go into the dew point history.');
    if(!ST.files.some(f => f.rep === 'P3')) warn.push('Dew point Excel file not attached — 📂 pick the file then press ▶ Fill file & attach.');
    else { const a = ST.files.find(f => f.auto && f.rep === 'P3'); if(a && a.date && a.date !== ST.date) warn.push('The attached Excel file was filled for '+a.date+', not '+ST.date+' — press ▶ Fill again.'); }
    let b = greet('Dear sir,');
    b += para('I would like to send the <b>Propane Dew Point</b> result on <span style="color:#1f4e79">'+longDate(ST.date)+'</span>.');
    b += tb;
    /* v4.206 — biểu đồ Dew Point of C3 Dryer Outlet (Dryer A / B + đường xu hướng) từ lịch sử dew_point */
    const ch = _dewChart(d);
    if(ch.url) b += '<p style="margin:10px 0 4px 0"><img src="'+ch.url+'" width="'+DEW_CW+'" height="'+DEW_CH+'" alt="Dew Point of C3 Dryer Outlet" style="display:block;width:'+DEW_CW+'px;height:'+DEW_CH+'px;border:1px solid #bfbfbf"></p>';
    if(ch.warn) warn.push(ch.warn);
    b += para('Please find the attached file.');
    const p = ST.date.split('-'), af = ST.files.find(f => f.rep === 'P3');
    return { subject:'[LPGT] Propane Dew Point – '+ST.date, body:b, warn,
             attach: af ? af.name : 'Dew Point of Propane_CAVERN_'+p[1]+'.'+p[2]+'.'+p[0]+'.xlsx' };
  }
  /* ⭐ v4.224 — P3 ▶ Fill file & attach: DEWXL (dùng chung với Engineer ▸ 💧 Dew Point) điền mọi lần đo ĐÃ LƯU
     tới ngày báo cáo vào file Excel đã chọn ⇒ lưu file mới cùng thư mục ⇒ đính kèm (thay bản điền trước) */
  async function dewFill(){
    if(typeof DEWXL === 'undefined' || !DEWXL.has('c3')){ _toast('📂 Pick the dew point Excel file first', 'er'); return; }
    const d = ST.dew;
    if(!d.saved && DEW_PTS.some(p => String(d[p[0]] == null ? '' : d[p[0]]).trim() !== '')){
      const y = await ENGX_U.ask('⚠ Readings of '+ST.date+' are not saved\n\nThe Excel file only gets SAVED readings.\n\nOK = Save them, then fill the file\nCancel = Stop');
      if(!y || !(await dewSave())) return;
    }
    const iso = ST.date, out = await DEWXL.run('c3', iso, iso);
    if(!out) return;
    ST.files = ST.files.filter(f => !(f.auto && f.rep === 'P3'));
    await attachBlob(out.blob, out.name, false);
    const a = ST.files.find(f => f.name === out.name); if(a){ a.rep = 'P3'; a.date = iso; }
    _toast('📎 '+out.name+' attached', 'ok'); _renderAll();
  }

  function weekOf(iso){
    const p = iso.split('-'); const d = new Date(+p[0], +p[1]-1, +p[2]);
    const dow = (d.getDay() + 6) % 7;            /* 0 = thứ Hai */
    const mon = isoAdd(iso, -dow);
    const t = new Date(+p[0], +p[1]-1, +p[2]); t.setDate(t.getDate() + 3 - dow);  /* ISO week */
    const y0 = new Date(t.getFullYear(), 0, 4);
    const wk = 1 + Math.round(((t - y0) / 864e5 - 3 + ((y0.getDay() + 6) % 7)) / 7);
    return { mon, sun:isoAdd(mon, 6), wk };
  }
  function buildP4(){
    const w = weekOf(ST.date);
    let tb = T_OPEN + '<tr>'+['Date','Trips','GI Domestic (kg)','GI Export (kg)','GI Total LPG (kg)','Lots mixed','Mixed Q\'ty (ton)'].map(x=>th(x,C_HEAD)).join('')+'</tr>';
    const tot = { trips:0, d:0, e:0, lots:0, q:0 };
    for(let i = 0; i < 7; i++){
      const iso = isoAdd(w.mon, i), tl = _tlDay(iso);
      const trips = new Set(); let dd = 0, ee = 0;
      tl.forEach(r => { trips.add(_tripKey(r)); const q = _c34(r).nw; if(_dirOf(r) === 'E') ee += q; else dd += q; });
      const lots = lotsOfDay(iso); let q = 0; lots.forEach(r => { q += num(r[7]) || 0; });
      tot.trips += trips.size; tot.d += dd; tot.e += ee; tot.lots += lots.length; tot.q += q;
      tb += '<tr>'+td(dMonY(iso),CE)+td(trips.size || '-',CE)+td(kg(dd),R)+td(kg(ee),R)+td(kg(dd+ee),R)+
        td(lots.length ? lots.map(r=>lotTail(r[1])).join(', ') : '-',CE)+td(q ? fmt(q,3) : '-',R)+'</tr>';
    }
    tb += '<tr>'+td('<b>Total</b>',C_LBL)+td('<b>'+tot.trips+'</b>',CE+C_LBL)+td('<b>'+kg(tot.d)+'</b>',R+C_LBL)+td('<b>'+kg(tot.e)+'</b>',R+C_LBL)+
      td('<b>'+kg(tot.d+tot.e)+'</b>',R+C_LBL)+td('<b>'+tot.lots+' lots</b>',CE+C_LBL)+td('<b>'+fmt(tot.q,3)+'</b>',R+C_LBL)+'</tr></table>';
    let b = greet('Dear Sir,');
    b += para('I would like to send the <b>LPG Terminal Weekly Report</b> of week '+w.wk+' ('+dMonY(w.mon)+' ~ '+dMonY(w.sun)+') as attached file.');
    b += bullet('Weekly summary:');
    b += tb;
    return { subject:'[LPGT] Terminal Weekly Report – W'+w.wk+' ('+w.mon+' ~ '+w.sun.slice(5)+')', body:b, warn:[],
             attach:'Daily_LPG TMNLC (week file).xlsm' };
  }

  /* ── P5 · HEATER CONSUMPTION ──────────────────────────────────── */

  /* ── P5 · HEATER CONSUMPTION — từ file PMS (mỗi tag một file) ───────── */
  const _two = n => String(n).padStart(2,'0');
  function dtLocal(t){ const d = new Date(t); return d.getFullYear()+'-'+_two(d.getMonth()+1)+'-'+_two(d.getDate())+'T'+_two(d.getHours())+':'+_two(d.getMinutes()); }
  function parseLocal(v){ const m = String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]).getTime() : 0; }
  function heatDays(){
    const H = ST.heat;
    if(!(H.A || H.B) || !H.start || !H.stop || H.stop <= H.start) return [];
    return PMSHEAT.daily(H.A && H.A.pts, H.B && H.B.pts, H.start, H.stop);
  }
  /* biểu đồ SVG: lượng dùng cộng dồn từ START của Heater A / B, vạch 00:00, vạch START/STOP */
  function heatChart(){
    const H = ST.heat; if(!(H.A || H.B) || !H.start || !H.stop) return '';
    const pad = 2 * 3600e3, t0 = H.start - pad, t1 = H.stop + pad;
    const W = 860, Hh = 170, L = 52, B = 22, TOP = 8;
    const series = [['A', H.A, '#1f77b4'], ['B', H.B, '#d62728']].filter(s => s[1]);
    let ymax = 1;
    const lines = series.map(([k, S, col]) => {
      const base = PMSHEAT.valueAt(S.pts, H.start) || 0;
      const pts = S.pts.filter(p => p[0] >= t0 && p[0] <= t1);
      const step = Math.max(1, Math.floor(pts.length / 500));
      const xy = [];
      for(let i = 0; i < pts.length; i += step){ const y = Math.max(0, Math.min(pts[i][1], PMSHEAT.valueAt(S.pts, H.stop)) - base); xy.push([pts[i][0], pts[i][0] < H.start ? 0 : y]); ymax = Math.max(ymax, y); }
      return [k, xy, col];
    });
    const X = t => L + (t - t0) / (t1 - t0) * (W - L - 8), Y = v => TOP + (Hh - TOP - B) * (1 - v / ymax);
    let g = '<svg viewBox="0 0 '+W+' '+Hh+'" width="100%" style="max-width:'+W+'px;background:#fff;border:1px solid #e2e8f0;border-radius:6px">';
    for(let i = 0; i <= 4; i++){ const v = ymax * i / 4; g += '<line x1="'+L+'" x2="'+(W-8)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#eef2f7"/><text x="'+(L-4)+'" y="'+(Y(v)+3)+'" font-size="9" text-anchor="end" fill="#64748b">'+Math.round(v).toLocaleString('en-US')+'</text>'; }
    for(let d = new Date(new Date(t0).setHours(24,0,0,0)).getTime(); d < t1; d += 864e5){
      g += '<line x1="'+X(d)+'" x2="'+X(d)+'" y1="'+TOP+'" y2="'+(Hh-B)+'" stroke="#94a3b8" stroke-dasharray="3 3"/><text x="'+(X(d)+3)+'" y="'+(Hh-8)+'" font-size="9" fill="#475569">00:00 '+PMSHEAT.iso(d).slice(5)+'</text>';
    }
    [['START', H.start, '#16a34a'], ['STOP', H.stop, '#c2410c']].forEach(([t, v, c]) => {
      g += '<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+TOP+'" y2="'+(Hh-B)+'" stroke="'+c+'" stroke-width="2"/><text x="'+(X(v)+3)+'" y="'+(t === 'STOP' ? TOP+24 : TOP+10)+'" font-size="10" font-weight="bold" fill="'+c+'">'+t+'</text>';
    });
    lines.forEach(([k, xy, col]) => { g += '<polyline fill="none" stroke="'+col+'" stroke-width="1.6" points="'+xy.map(p => X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'; });
    g += '<text x="'+(L+6)+'" y="'+(Hh-B-6)+'" font-size="10"><tspan fill="#1f77b4">■ Heater A</tspan>  <tspan fill="#d62728">■ Heater B</tspan>  <tspan fill="#64748b">(kg since START)</tspan></text>';
    return g + '</svg>';
  }
  async function heatFiles(inp){
    /* v4.176 — nhận A/B + gộp file do HTR (engx.js) lo; file không nhận ra chờ gán tay */
    if(typeof HTR !== 'undefined'){ await HTR.fileIn(inp); if(ST.heat.start) ST.date = PMSHEAT.iso(ST.heat.start); _renderAll(); return; }
    const fl = Array.from(inp.files || []); inp.value = '';
    for(const f of fl){
      try{
        const r = await PMSHEAT.parseFile(f);
        ST.heat[r.heater] = r;
        _toast('📈 '+f.name+' → Heater '+r.heater+' ('+r.pts.length.toLocaleString('en-US')+' points)', 'ok');
      }catch(e){ _toast('⚠ '+f.name+': '+e.message, 'er'); }
    }
    const H = ST.heat;
    H.runs = PMSHEAT.runs(H.A && H.A.pts, H.B && H.B.pts);
    if(H.runs.length){ heatRun(H.runs.length - 1); return; }
    _renderAll();
  }
  function heatRun(i){
    const H = ST.heat, r = H.runs[i]; if(!r) return;
    H.run = i; H.start = r.start; H.stop = r.stop; H.manual = false;
    ST.date = PMSHEAT.iso(r.start);
    _renderAll();
  }
  function heatSet(k, v){
    const H = ST.heat;
    if(k === 'start' || k === 'stop'){ H[k] = parseLocal(v); H.manual = true; }
    else H[k] = v;
    try{ HTR.render(); }catch(_){}
    _renderAll();
  }
  /* ghi lượng dùng từng ngày vào Cavern Daily (Heater C3) — dữ liệu người CHỐT ⇒ Firebase cavern_in */
  function heatSave(){
    if(typeof HTR !== 'undefined'){ HTR.saveCavern(); return; }
    if(typeof canWrite === 'function' && !canWrite('sap')){ _toast('⛔ Your account has no write permission', 'er'); return; }
    const days = heatDays(); if(!days.length){ _toast('Pick START / STOP first', 'er'); return; }
    const old = (CAV.ROWS || []).filter(r => r && r.kind === 'heater' && r.prod === 'c3' && days.some(d => d.date === r.date));
    if(old.length && !confirm('Cavern Daily already has '+old.length+' Heater C3 entr'+(old.length>1?'ies':'y')+' on these days.\n\nOK = replace them with the PMS figures · Cancel = keep them')) return;
    old.forEach(r => CAV.removeSilent(r._rid));
    const note = 'PMS FQT32331+FQT32341 · '+(ST.heat.vessel || '')+' · '+PMSHEAT.fmtTs(ST.heat.start).slice(0,16)+' → '+PMSHEAT.fmtTs(ST.heat.stop).slice(0,16);
    days.forEach(d => { if(d.total > 0) CAV.pushEntry(d.date, 'heater', 'c3', 'D', d.total, note); });
    try{ CAV.render(); }catch(_){}
    _toast('💾 Heater C3 saved to Cavern Daily · '+days.length+' day(s)', 'ok');
  }
  async function heatMaster(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return;
    const days = heatDays(); if(!days.length){ _toast('Load the PMS files and pick START / STOP first', 'er'); return; }
    try{
      const H = ST.heat;
      const out = await PMSHEAT.buildMaster(f, { A:H.A && H.A.pts, B:H.B && H.B.pts, start:H.start, stop:H.stop, days, vessel:H.vessel, amount:num(H.amount) });
      if(typeof HTR !== 'undefined') HTR.S.lastOut = { blob:out.blob, name:f.name, sheet:out.sheet, sumRow:out.sumRow, at:Date.now() };
      await attachBlob(out.blob, f.name, true);
      _toast('📎 '+f.name+' — sheet '+out.sheet+' added'+(out.sumRow ? ' + Sumary row '+out.sumRow : '')+' · downloaded & attached', 'ok');
    }catch(e){ console.error(e); _toast('⚠ Heater file: '+e.message, 'er'); }
  }
  function buildP5(){
    /* v4.210 — máy mở P5 mà chưa mở tab 🔥 Heater ⇒ tải dữ liệu heater (cửa sổ 3 tháng, MỘT lần) để email có số của chuyến;
       máy khác không bao giờ tải */
    try{ if(typeof HTRH !== 'undefined' && HTRH.S && !HTRH.S.loaded && !HTRH.S.loading) HTRH.refresh(); }catch(_){}
    const H = ST.heat, warn = [], days = heatDays();
    if(H.pending && H.pending.length) warn.push(H.pending.length+' PMS file(s) not recognised as Heater A or B — assign them (buttons above or Engineer ▸ 🔥 Heater).');
    if(!H.A) warn.push('Heater A PMS file (PRO2.FQT32331) not loaded.');
    if(!H.B) warn.push('Heater B PMS file (PRO2.FQT32341) not loaded.');
    if(!days.length) warn.push('START / STOP not set.');
    if(!H.vessel) warn.push('Vessel name is empty.');
    if(!ST.files.some(f => f.rep === 'P5')) warn.push('Heater report file not attached — use 📂 Heater master file.');
    const lbl = iso => { const p = iso.split('-'); return +p[2]+'-'+MON3[+p[1]-1]+'t-'+p[0].slice(2); };   /* 15-Sept-26 */
    const HD = 'background:#9dc3e6;font-weight:bold;'+CE, DAY = 'background:#ddebf7;'+CE, TOT = 'background:#fff2cc;font-weight:bold;';
    let tb = T_OPEN + '<tr>'+td('DAILY HEATER C3 CONSUMPTION REPORT',HD,'colspan="3"')+'</tr>'+
      '<tr>'+td('Vessel:',CE)+td('<b>'+esc(H.vessel||'')+'</b>',CE,'colspan="2"')+'</tr>';
    let gA = 0, gB = 0;
    days.forEach(d => {
      gA += d.a; gB += d.b;
      tb += '<tr>'+td(lbl(d.date),DAY,'colspan="3"')+'</tr>'+
        '<tr>'+td('Heater A',CE)+td(fmt(d.a,0),CE)+td('kg',CE+'vertical-align:middle','rowspan="3"')+'</tr>'+
        '<tr>'+td('Heater B',CE)+td(fmt(d.b,0),CE)+'</tr>'+
        '<tr>'+td('<b>Daily Total</b>',TOT+CE)+td('<b>'+fmt(d.total,0)+'</b>',TOT+CE)+'</tr>';
    });
    tb += '<tr>'+td('TOTAL CONSUMPTION',HD,'colspan="3"')+'</tr></table>';
    let t2 = T_OPEN + '<tr>'+['Date','Heater A','Heater B','Total'].map(x=>th(x,C_HEAD)).join('')+'</tr>';
    days.forEach(d => { t2 += '<tr>'+td(lbl(d.date),CE)+td(fmt(d.a,0),CE)+td(fmt(d.b,0),CE)+td(fmt(d.total,0),CE)+'</tr>'; });
    t2 += '<tr>'+td('<b>GRAND TOTAL</b>',TOT+CE)+td('<b>'+fmt(gA,0)+'</b>',TOT+CE)+td('<b>'+fmt(gB,0)+'</b>',TOT+CE)+td('<b>'+fmt(gA+gB,0)+'</b>',TOT+CE)+'</tr></table>';
    const dd = days.map(d => ord(d.date.slice(8))).join(' , ');
    const my = days.length ? MON[+days[0].date.slice(5,7)-1]+' '+days[0].date.slice(0,4) : '';
    let b = greet('Dear sir,');
    b += para('I would like to send the C3 heater consumption on <span style="color:#1f4e79">'+dd+' '+my+'</span>'+
      (H.start ? ' (heater run '+PMSHEAT.fmtTs(H.start).slice(0,16)+' → '+PMSHEAT.fmtTs(H.stop).slice(0,16)+', PMS flow meters).' : ''));
    b += para('Please find your reference in the attachment.');
    b += tb + t2;
    const span = days.length ? days[0].date + (days.length > 1 ? '~' + days[days.length-1].date.slice(5) : '') : ST.date;
    return { subject:'[LPGT] Heater Consumption – '+(H.vessel ? H.vessel+' – ' : '')+span, body:b, warn,
             attach:'Heater 연료 사용량 (유량계 기준).xlsx' };
  }

  /* ── P6 · CAVERN SAP/WMS BATCH STOCK ──────────────────────────── */
  function _sapDates(upTo){
    const s = {}; _spRows().forEach(r => { if(r.date && r.date <= upTo) s[r.date] = 1; });
    return Object.keys(s).sort().slice(-3);
  }
  function _sapCell(date, mat, batch, sloc){
    let v = 0, has = false;
    _spRows().forEach(r => {
      if(r.date !== date || String(r.mat).toUpperCase() !== mat || String(r.sloc) !== sloc) return;
      if(String(r.batch||'').toUpperCase() !== batch) return;
      v += (+r.end || 0); has = true;
    });
    return has ? v / 1000 : 0;                 /* tấn */
  }
  /* đơn giá theo batch + SLoc — đọc cavern_price (cùng chỗ tab Cavern Daily) */
  /* v4.180 — Domestic 2100/2101 trong file là CÔNG THỨC = giá 1100 ⇒ đọc cùng khoá */
  const PRICE_KEY = { C3:{ P:{'1100':'pP'}, X:{'1100':'pXP'}, D:{'1100':'pD1','2100':'pD1','2101':'pD1'}, E:{'1100':'pE1'} },
                      C4:{ D:{'1100':'pD1c4','2100':'pD1c4','2101':'pD1c4'}, E:{'1100':'pE1c4'} } };
  const PRICE_LBL = { pP:'C3 PETCHEM', pXP:'C3 EX-PETCHEM', pD1:'C3 Dom 1100', pD21:'C3 Dom 2100', pD22:'C3 Dom 2101', pE1:'C3 Exp 1100',
                      pD1c4:'C4 Dom 1100', pD21c4:'C4 Dom 2100', pD22c4:'C4 Dom 2101', pE1c4:'C4 Exp 1100' };
  /* v4.180 — giá của NGÀY (hoặc cờ "giá không đổi"), không bao giờ tự lấy ngày trước */
  function _price(date, key){ try{ return { val:BSXL.priceShown(date, key) }; }catch(_){ return { val:null }; } }
  function _bsDates(){ return (ST.bsPlan && ST.bsPlan.dates && ST.bsPlan.dates.length) ? ST.bsPlan.dates : [ST.date]; }
  function _ol1(date){ try{ return CAV.src.ol1(date); }catch(_){ return { x:null, t:null, xAt:0 }; } }
  function buildP6(){
    const dates = _sapDates(ST.date), warn = [];
    const last = dates[dates.length-1] || ST.date;
    if(!dates.length) warn.push('No SAP stock pasted on or before '+ST.date+'.');
    else if(last !== ST.date) warn.push('SAP of '+ST.date+' not pasted — the latest SAP day is '+last+'.');
    /* v4.180 — MỘT bảng kiểm với tab SAP ▸ SAP WMS Report */
    try{ const ck = BSXL.check(_bsDates()); if(ck.open) warn.push(ck.open+' item(s) of the Batch Stock check still need data or a decision — resolve them in the check above (type, 0, price unchanged or skip).'); }
    catch(e){ warn.push('Batch Stock check failed: '+e.message); }
    if(!ST.files.some(f => f.rep === 'P6')) warn.push('Batch Stock report file not attached — use 📂 Batch Stock file.');
    const t3 = v => v ? fmt(v,3) : '-';
    const HB = 'background:#002060;color:#fff;font-weight:bold;'+CE, PH = 'background:#fff2cc;color:#1f4e79;'+CE;
    const NAVY = 'background:#ddebf7;'+CE, SUBT = 'background:#d9d9d9;';
    const S = ['1100','2100','2101'], SL = { '1100':'1100(Cavern)', '2100':'2100(TK-3501)', '2101':'2101(TK-3502)' };
    function table(mat){
      const isC3 = mat === 'C3';
      const title = isC3 ? '프로판(Propane)' : '부탄(Butane)';
      const priceHdr = isC3 ? 'Price($/톤)' : '단가($/톤)';
      const groups = [];
      if(isC3){ groups.push({ lbl:'PETCHEM', b:'P', sl:['1100'] }); groups.push({ lbl:'EX-PETCHEM', b:'X', sl:['1100'] }); }
      groups.push({ lbl:'Domestic', b:'D', sl:S, tot:true }); groups.push({ lbl:'Export', b:'E', sl:S, tot:true, noPrice:['2100','2101'] });
      let ncol = 1; groups.forEach(g => { g.sl.forEach(s => { ncol += (g.noPrice && g.noPrice.includes(s)) ? 1 : 2; }); if(g.tot) ncol++; }); ncol++;
      let h = '<table border="1" cellspacing="0" cellpadding="2" style="border-collapse:collapse;border:1px solid #000;font-family:Arial,sans-serif;font-size:9pt">';
      h += '<tr>'+td(title,HB+'font-size:11pt','rowspan="4"')+td(isC3 ? 'SAP End Batch Stock' : 'SAP Batch Stock','background:#e2efda;font-weight:bold;font-size:11pt;'+CE,'colspan="'+(ncol-1)+'"')+'</tr>';
      let r1 = '', r2 = '', r3 = '';
      groups.forEach(g => {
        let w = 0;
        g.sl.forEach(s => { const np = g.noPrice && g.noPrice.includes(s); w += np ? 1 : 2;
          r2 += td(SL[s], NAVY, np ? '' : 'colspan="2"');
          r3 += td('(ton)', NAVY) + (np ? '' : td(priceHdr, PH)); });
        if(g.tot){ w++; r2 += td('total', SUBT+CE); r3 += td('(ton)', SUBT+CE); }
        r1 += td(g.lbl, NAVY+'font-weight:bold', 'colspan="'+w+'"');
      });
      h += '<tr>'+r1+td('Total','background:#ddebf7;font-weight:bold;'+CE,'rowspan="3"')+'</tr><tr>'+r2+'</tr><tr>'+r3+'</tr>';
      dates.forEach(dt => {
        let row = td(mdSlash(dt), 'background:#000;color:#fff;font-weight:bold;'+CE), all = 0;
        groups.forEach(g => {
          let sub = 0;
          g.sl.forEach(s => { const v = _sapCell(dt, mat, g.b, s); sub += v;
            const k = (PRICE_KEY[mat][g.b] || {})[s]; const p = k ? _price(dt, k).val : null;
            row += td(t3(v), R) + ((g.noPrice && g.noPrice.includes(s)) ? '' : td(p == null ? '' : fmt(p,2), PH)); });
          if(g.tot) row += td(t3(sub), R+SUBT);
          all += sub;
        });
        h += '<tr>'+row+td(t3(all), R)+'</tr>';
      });
      return h + '</table>';
    }
    let b = greet('Dear Sirs,');
    b += para('I\'d like send to you LPG Cavern_SAP_WMS Batch Stock on '+longDate(last).replace(/, \d{4}$/,''));
    b += para('<b>LPG Cavern_SAP_WMS</b>', 'margin-left:14px;color:#1f3864');
    b += bullet('Propane') + table('C3') + bullet('Butane') + table('C4');
    return { subject:'[LPGT] Cavern SAP/WMS Batch Stock – '+last, body:b, warn,
             attach:'LPG Cavern_SAP WMS Batch Stock_2026_r2.xlsx' };
  }
  /* v4.180 — chọn file CHƯA điền ngay: đọc xem sẽ điền những ngày nào ⇒ bảng kiểm ⇒ ⬇ Fill & attach */
  async function _bsInspect(){
    if(!ST.bsF) return;
    try{ ST.bsPlan = await BSXL.inspect(ST.bsF, ST.date); }
    catch(e){ ST.bsPlan = null; _toast('⚠ Batch Stock file: '+e.message, 'er'); }
    _renderAll();
  }
  function bsFile(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return;
    ST.bsF = f; ST.bsPlan = null; ST.bsWarn = null;
    return _bsInspect();
  }
  async function bsBuild(){
    if(!ST.bsF){ _toast('Pick the Batch Stock file first', 'er'); return; }
    try{
      _toast('⏳ Filling '+ST.bsF.name+'…', '');
      const out = await BSXL.build(ST.bsF, ST.date, { name:ST.bsF.name });
      ST.bsWarn = out.warn;
      await attachBlob(out.blob, out.name, true);
      _toast('📎 '+out.name+' — '+out.dates.length+' day(s) filled ('+out.dates.join(', ')+')'+(out.yellow ? ' · '+out.yellow+' yellow cell(s)' : '')+' · downloaded & attached', 'ok');
    }catch(e){
      if(e.code === 'UNRESOLVED'){ _toast('⚠ '+e.message, 'er'); _renderAll(); }
      else { console.error(e); _toast('⚠ Batch Stock file: '+e.message, 'er'); }
    }
  }
  function ol1Save(inp){
    const t = num(inp.value); if(t == null){ _toast('Type the OL1 total in ton', 'er'); return; }
    CAV.setOl1Total(ST.date, t * 1000).then(() => { _toast('💾 FEED OL1 total '+ST.date+' = '+fmt(t,3)+' T', 'ok'); _renderAll(); })
      .catch(e => _toast('⚠ '+e.message, 'er'));
  }
  function priceSave(k, inp){
    const v = num(inp.value); if(v == null){ _toast('Invalid price', 'er'); return; }
    CAV.setPrice(ST.date, k, v).then(() => { _toast('💾 '+PRICE_LBL[k]+' '+ST.date+' = '+v, 'ok'); _renderAll(); })
      .catch(e => _toast('⚠ '+e.message, 'er'));
  }
  /* P2 — điền file Daily Stock bằng Report Engine rồi đính kèm */
  /* v4.181 — luỹ kế (Summary data) đọc từ file Daily Stock: file vừa điền hoặc file đính kèm tay */
  async function _accFrom(blob){
    if(typeof RPT === 'undefined' || !RPT.accumulation) return;
    try{ ST.acc = await RPT.accumulation(blob, ST.date); }
    catch(e){ ST.acc = null; _toast('⚠ Accumulation not read: '+e.message, 'er'); }
  }
  /* ⭐ v4.204 — HAI BƯỚC, người dùng chủ động:
       ① dsFile  : CHỈ chọn file nguồn (giữ trong RAM, KHÔNG xử lý, KHÔNG tải gì) — chọn lại là thay file;
       ② dsBuild : bấm mới điền ngày ST.date vào file nguồn ⇒ lưu file báo cáo (hộp Save) ⇒ đính kèm
                   + đọc luỹ kế cho thân thư. Dựng lại (ngày khác / file khác) thì THAY file đính kèm cũ.
     Trước đây chọn file là xuất ngay theo ngày đang để ⇒ đổi ngày sau đó là sai ngày, file tải liên tục. */
  function _dsDateOf(name){ const m = String(name||'').match(/(\d{4}-\d{2}-\d{2})(?!.*\d{4}-\d{2}-\d{2})/); return m ? m[1] : ''; }
  function _dsSet(f, handle){
    if(!/\.xlsx$/i.test(f.name)){ _toast('⚠ Pick the Daily Stock report (.xlsx)', 'er'); return; }
    ST.dsSrc = { file:f, handle:handle || null, name:f.name, size:f.size, fdate:_dsDateOf(f.name) };
    _toast('📄 '+f.name+' selected — press ▶ Build report', 'ok');
    _renderAll();
  }
  function dsFile(inp){                               /* dự phòng: trình duyệt không có showOpenFilePicker */
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return;
    _dsSet(f, null);
  }
  /* v4.205 — chọn bằng showOpenFilePicker (giống tab REPORT) ⇒ giữ handle ⇒ hộp Save mở ĐÚNG thư mục file nguồn */
  async function dsPick(btn){
    if(!window.showOpenFilePicker){ const i = btn && btn.parentElement && btn.parentElement.querySelector('input[type=file]'); if(i) i.click(); return; }
    try{
      const [h] = await window.showOpenFilePicker({ types:[{ description:'Excel', accept:{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'] } }] });
      _dsSet(await h.getFile(), h);
    }catch(e){ if(e.name !== 'AbortError') _toast('⚠ '+e.message, 'er'); }
  }
  function dsClear(){ ST.dsSrc = null; _renderAll(); }
  async function dsBuild(){
    const S = ST.dsSrc; if(!S || ST.dsBusy) return;
    if(typeof RPT === 'undefined' || !RPT.useFile){ _toast('Report Engine not loaded', 'er'); return; }
    const iso = ST.date;
    if(S.fdate && S.fdate >= iso && !confirm('The selected file is dated '+S.fdate+' — not before the report date '+iso+'.\n\nNormally you pick the file of the PREVIOUS day to build '+iso+'.\n\nOK = build anyway · Cancel = stop')) return;
    ST.dsBusy = true; _renderAll();
    try{
      /* đọc lại file GỐC mỗi lần ⇒ dựng lại không bị cộng dồn; có handle ⇒ đọc bản mới nhất trên đĩa + Save cùng thư mục */
      let src = S.file;
      if(S.handle){ try{ src = await S.handle.getFile(); }catch(_){} }
      await RPT.useFile(src, S.handle);
      const out = await RPT.executeExport({ date:iso });
      if(out && out.blob){
        ST.files = ST.files.filter(f => !(f.auto && f.rep === 'P2'));      /* bỏ bản dựng trước */
        await _accFrom(out.blob);
        await attachBlob(out.blob, out.name, false);
        const a = ST.files.find(f => f.name === out.name); if(a){ a.date = iso; a.cnSig = p2Cancel(iso).sig; }   /* v4.216 — nhớ danh sách huỷ lúc dựng */
        _toast('📎 '+out.name+' attached', 'ok');
      } else _toast('Report file not generated — see REPORT ▸ Daily Stock log', 'er');
    }catch(e){ console.error(e); _toast('⚠ Daily Stock file: '+e.message, 'er'); }
    finally{ ST.dsBusy = false; _renderAll(); }
  }


  /* ── P7 · VESSEL MIXING REPORT (v4.177) ───────────────────────────
     Nguồn: Vessel Log (VLOG.ROWS — bản ghi đã 💾 SAVE ở tab Vessel), CHỈ ĐỌC.
     Một lot tàu có thể là:
       • MỘT dòng gộp "0N TANK" (1-RATIO) — số từng tank nằm trong e.t[i]
       • N dòng riêng "1","2",… (2-RATIO / thuần / một tank) — mỗi dòng một tank
     Tàu N tank (mặc định 2) ⇒ bảng chi tiết có N cột tank + cột TOTAL.
     Tank thuần C3/C4: toàn bộ lượng nạp là một sản phẩm, không chấm Pass/Fail. */
  function _vlRows(){ try{ return (typeof VLOG !== 'undefined' && VLOG.ROWS) ? VLOG.ROWS.filter(Boolean) : []; }catch(_){ return []; } }
  function vesselLots(){
    const m = {};
    _vlRows().forEach(e => {
      const k = String(e.lot||'').trim(); if(!k) return;
      const ts = +e._ts || 0;
      if(!m[k]) m[k] = { lot:k, ts:0, date:'', ship:'', cust:'', rows:[], dates:{} };
      m[k].rows.push(e);
      const d = anyIso(e.date); if(d) m[k].dates[d] = 1;
      /* v4.194 — thông tin lot lấy từ dòng SỬA GẦN NHẤT có ngày (trước đây: dòng nào đọc trước thì lấy,
         nên dòng tank 2 còn ngày cũ 06/12 làm lot 026 hiện 6-Dec dù tank 1 đã sửa thành 12/06) */
      if(ts >= m[k].ts && (d || !m[k].date)){ m[k].ts = ts; if(d) m[k].date = d; m[k].ship = e.ship || m[k].ship; m[k].cust = e.customer || m[k].cust; }
    });
    return Object.values(m).sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.ts - a.ts);
  }
  const _isMerged = e => /^\d+\s*TANK$/i.test(String(e.tank||'').trim());
  /* tách một lot thành danh sách tank (số liệu theo từng tank) + tổng */
  function vesselTanks(rows){
    const warn = [];
    const merged = rows.filter(_isMerged).sort((a,b) => (+b._ts||0) - (+a._ts||0));
    const single = rows.filter(e => !_isMerged(e));
    const tanks = [];
    let head = merged[0] || single[0] || {};
    const gcOf = t => { const o = {}; ['meth','eth','prop','ibut','nbut','buta','c5','ole'].forEach(k => { const x = num(t && t[k]); if(x !== null) o[k] = x; }); return o; };
    if(merged.length){
      const e = merged[0];
      if(merged.length > 1) warn.push('Lot '+esc(e.lot)+' was saved '+merged.length+' times as a combined row — the latest one is used.');
      if(single.length) warn.push('Lot '+esc(e.lot)+' has BOTH a combined row and per-tank rows in Vessel Log — the combined row is used; delete the wrong rows in Vessel Log.');
      (e.t || []).forEach((t, i) => {
        if(!t || (t.qty == null && t.tload == null)) return;
        tanks.push({ no:i+1, mode:t.mode || e.mixType || 'MIX', qty:num(t.qty), tr3:num(t.tr3), unit:t.unit || 'vol', min:num(t.min), max:num(t.max),
          odor:num(t.odor), tload:num(t.tload), c3:num(t.stC3), c4:num(t.stC4), wr3:num(t.wr3), dens:num(t.labdens), gc:gcOf(t), qual:'' });
      });
      head = e;
      const tot = { tload:num(e.lpgWt) != null ? num(e.lpgWt) : num(e.cTotal), c3:num(e.stC3), c4:num(e.stC4), qual:e.quality || '' };
      return { head, tanks, tot, merged:true, warn };
    }
    /* dòng riêng từng tank — cùng một tank lưu nhiều lần thì lấy bản MỚI NHẤT */
    const byNo = {};
    single.forEach(e => {
      const no = parseInt(e.tank, 10) || 1;
      if(byNo[no]){ warn.push('Lot '+esc(e.lot)+' tank '+no+' was saved more than once — the latest row is used.'); if((+e._ts||0) < (+byNo[no]._ts||0)) return; }
      byNo[no] = e;
    });
    Object.keys(byNo).map(Number).sort((a,b) => a - b).forEach(no => {
      const e = byNo[no], t = (e.t && e.t[no-1]) || {};
      head = e;
      tanks.push({ no, mode:e.mixType || t.mode || 'MIX', qty:num(t.qty != null ? t.qty : e.qty), tr3:num(e.targetC3), unit:e.targetUnit || t.unit || 'vol',
        min:num(e.minC3), max:num(e.maxC3), odor:num(t.odor), tload:num(e.lpgWt) != null ? num(e.lpgWt) : num(e.cTotal),
        c3:num(e.stC3), c4:num(e.stC4), wr3:num(e.wr3), dens:num(t.labdens != null ? t.labdens : e.labdens),
        gc:Object.assign(gcOf(e.gc), gcOf(t)), qual:e.quality || '' });
    });
    const sum = k => { let s = 0, any = false; tanks.forEach(t => { if(t[k] != null){ s += t[k]; any = true; } }); return any ? s : null; };
    return { head:byNo[Object.keys(byNo)[0]] || head, tanks, tot:{ tload:sum('tload'), c3:sum('c3'), c4:sum('c4'), qual:'' }, merged:false, warn };
  }
  function _vlot(){
    const all = vesselLots();
    if(ST.vlot){ const f = all.find(x => x.lot === ST.vlot); if(f) return f; }
    return all.find(x => x.date === ST.date) || null;
  }
  const MODE_LBL = { MIX:'LPG mix', C3:'Pure C3 (Propane)', C4:'Pure C4 (Butane)' };
  function buildP7(){
    const warn = [];
    const all = vesselLots();
    const L = _vlot();
    if(!all.length) warn.push('Vessel Log is empty — save the vessel mix with 💾 SAVE on the Vessel tab first.');
    else if(!L) warn.push('No vessel lot on '+ST.date+' — pick a lot from the list.');
    if(!L) return { subject:'[LPGT] Vessel Mixing Report – (no lot) – '+ST.date, body:greet('Dear Sir,')+para('<i>No vessel lot selected.</i>'), warn };
    const V = vesselTanks(L.rows);
    V.warn.forEach(x => warn.push(x));
    const nD = Object.keys(L.dates || {});
    if(nD.length > 1) warn.push('Lot '+esc(L.lot)+' rows carry different dates ('+nD.map(dMonY).join(' / ')+') — the latest edit ('+dMonY(L.date)+') is used. Open ✏ in Vessel Log and SAVE to align every row.');
    const e = V.head, T = V.tanks;
    const iso = L.date || anyIso(e.date) || ST.date;
    const trade = String(e.type||'S').toUpperCase() === 'EX' ? 'Export' : 'Domestic';
    if(!T.length) warn.push('Lot '+esc(L.lot)+' has no tank with a quantity.');
    if(!e.customer) warn.push('Customer is empty in Vessel Log.');
    T.forEach(t => {
      if(t.tload == null || !t.tload) warn.push('Tank '+t.no+': Total loaded missing.');
      if(!Object.keys(t.gc).length) warn.push('Tank '+t.no+': GC result missing.');
      if(t.dens == null) warn.push('Tank '+t.no+': lab density missing.');
    });
    const quals = V.merged ? [V.tot.qual] : T.map(t => t.qual);
    T.forEach(t => { if(t.qual === 'Fail') warn.push('Tank '+t.no+': quality FAIL (outside min/max C3%).'); });
    if(V.merged && V.tot.qual === 'Fail') warn.push('Quality FAIL (outside min/max C3%).');
    const mixed = T.some(t => t.mode !== 'MIX'), pureAll = T.length && T.every(t => t.mode !== 'MIX');
    const kind = pureAll ? (T.every(t => t.mode === 'C3') ? 'Pure C3' : T.every(t => t.mode === 'C4') ? 'Pure C4' : 'Pure C3 + C4') : (mixed ? 'LPG mix + pure' : 'LPG mix');
    const ratioLbl = V.merged ? '1 ratio (combined)' : (T.length > 1 ? (+e.ratio === 1 ? '1 ratio' : '2 ratio') : '—');

    /* ① thông tin chung */
    let info = T_OPEN + '<tr>'+['Lot','Vessel','Customer','Trade','Date','Start','Finish','Tanks','Type','Ratio'].map(x => th(x, C_HEAD)).join('')+'</tr>'+
      '<tr>'+td('<b>'+esc(L.lot)+'</b>',CE)+td(esc(e.ship),CE)+td(esc(e.customer))+td(trade,CE)+td(dMonY(iso),CE)+td(esc(e.tStart),CE)+td(esc(e.tEnd),CE)+
      td(String(T.length),CE)+td(kind,CE)+td(ratioLbl,CE)+'</tr></table>';

    /* ② bảng chi tiết: tank là CỘT (+ TOTAL khi > 1 tank) */
    const HB = 'background:#1f3864;color:#fff;font-weight:bold;'+CE;
    const SEC = 'background:#d9e1f2;color:#1f3864;font-weight:bold;letter-spacing:.5px;font-size:9.5pt;';
    const LB = 'font-size:10pt;', UN = 'font-size:9pt;color:#595959;'+CE, V2 = R+'font-size:10.5pt;', TOT = 'background:#fff2cc;font-weight:bold;';
    const miss = '<span style="color:#c00000">n/a</span>';
    const withTot = T.length > 1, N = T.length + 2 + (withTot ? 1 : 0);
    let h = '<table border="1" cellspacing="0" cellpadding="3" style="border-collapse:collapse;border:1px solid #8ea9db;font-family:Arial,sans-serif;font-size:10pt">';
    h += '<tr>'+td('Item',HB)+td('Unit',HB)+T.map(t => td('TANK '+t.no, HB)).join('')+(withTot ? td('TOTAL', HB) : '')+'</tr>';
    const sec = x => { h += '<tr>'+td(x, SEC, 'colspan="'+N+'"')+'</tr>'; };
    const row = (lbl, unit, f, tot, st) => {
      h += '<tr>'+td(lbl, LB)+td(unit, UN)+T.map(t => { const v = f(t); return td(v === '' || v == null ? miss : v, V2+(st||'')); }).join('')+
        (withTot ? td(tot == null ? '' : tot, V2+TOT) : '')+'</tr>';
    };
    const sumOf = k => { let s = 0, any = false; T.forEach(t => { if(t[k] != null){ s += t[k]; any = true; } }); return any ? s : null; };
    sec('PLAN');
    row('Mix type', '', t => MODE_LBL[t.mode] || t.mode, '');
    row('Planned quantity', 'ton', t => fmt(t.qty,3), fmt(sumOf('qty'),3));
    row('Target C3', '', t => t.mode !== 'MIX' ? '—' : (t.tr3 == null ? '' : fmt(t.tr3,2)+' %'+(t.unit === 'wt' ? 'wt' : 'vol')), '');
    if(T.some(t => t.mode === 'MIX' && (t.min != null || t.max != null)))
      row('Spec C3 min – max', '%', t => t.mode !== 'MIX' ? '—' : (t.min == null && t.max == null ? '' : fmt(t.min,1)+' – '+fmt(t.max,1)), '');
    sec('RESULT');
    const tl = V.tot.tload != null ? V.tot.tload : sumOf('tload');
    row('Total loaded', 'ton', t => fmt(t.tload,3), fmt(tl,3), 'font-weight:bold;');
    const c3T = V.tot.c3 != null ? V.tot.c3 : sumOf('c3'), c4T = V.tot.c4 != null ? V.tot.c4 : sumOf('c4');
    row('C3 (Propane)', 'ton', t => fmt(t.c3,3), fmt(c3T,3));
    row('C4 (Butane)', 'ton', t => fmt(t.c4,3), fmt(c4T,3));
    row('Ratio C3 / C4', '%wt', t => (t.tload && t.c3 != null) ? (t.c3 / t.tload * 100).toFixed(2)+' / '+(t.c4 / t.tload * 100).toFixed(2) : '',
      (tl && c3T != null) ? (c3T / tl * 100).toFixed(2)+' / '+(c4T / tl * 100).toFixed(2) : '');
    row('Lab density @15&deg;C', 'kg/L', t => t.dens == null ? '' : fmt(t.dens,4), '');
    row('Quality', '', t => t.mode !== 'MIX' ? '—' : (V.merged ? (V.tot.qual || '—') : (t.qual || '—')), withTot && V.merged ? (V.tot.qual || '—') : '',
      '');
    sec('GC COMPOSITION');
    const names = [['meth','Methane'],['eth','Ethane'],['prop','Propane'],['ibut','i-Butane'],['nbut','n-Butane'],['buta','1,3-Butadiene'],['c5','C5+'],['ole','Olefins']];
    names.forEach(([k, nm]) => { if(T.some(t => t.gc[k])) row(nm, 'vol%', t => t.gc[k] != null ? fmt(t.gc[k],2) : '-', ''); });
    if(T.some(t => t.qty != null && t.odor != null)){
      sec('ODORANT');
      row('Odorant', 'kg', t => (t.qty != null && t.odor != null) ? fmt(t.qty * t.odor / 1000, 2) : '', (() => { let s = 0, a = false; T.forEach(t => { if(t.qty != null && t.odor != null){ s += t.qty * t.odor / 1000; a = true; } }); return a ? fmt(s,2) : ''; })());
    }
    h += '</table>';
    if(quals.some(q => q === 'Fail')) warn.push('The mail will show FAIL — check before sending.');

    let b = greet('Dear Sir,');
    b += para('I would like to send the <b>Vessel Mixing</b> result of lot <b>'+esc(L.lot)+'</b>'+(e.ship ? ' (<span style="color:#1f4e79">'+esc(e.ship)+'</span>)' : '')+
      ' on <span style="color:#1f4e79">'+longDate(iso)+'</span> as below.');
    b += bullet('Vessel loading information:');
    b += info;
    b += bullet('Result per tank:');
    b += h;
    /* v4.195 — không còn câu đính kèm COQ (xem P1) */
    const subject = '[LPGT] Vessel Mixing Report – '+L.lot+(e.ship ? ' – '+e.ship : '')+' – '+iso;
    return { subject, body:b, warn, attach:'' };
  }

  const REPORTS = {
    P1:{ ttl:'Ball Tank Mixing Report', sub:'E1 DCS + E2 Mixing Lot merged · Tank Log', build:buildP1 },
    P2:{ ttl:'Daily LPG Loading Report', sub:'TL Data · WMS ST · SAP · Today Plan + Daily Stock file', build:buildP2 },
    P3:{ ttl:'Propane Dew Point', sub:'Readings saved to dew point history', build:buildP3 },
    P4:{ ttl:'Terminal Weekly Report', sub:'TL Data + Tank Log of the week', build:buildP4 },
    P5:{ ttl:'Heater Consumption', sub:'PMS minute data → daily split at 00:00', build:buildP5 },
    P6:{ ttl:'Cavern SAP/WMS Batch Stock', sub:'SAP End Stock + Batch Stock file', build:buildP6 },
    P7:{ ttl:'Vessel Mixing Report', sub:'Vessel Log · one column per tank · pure C3/C4', build:buildP7 }
  };

  /* ── v4.182 — EMAIL TỰ SOẠN (chỉ chữ) lưu ở MAILCFG.MAILS ─────────────
     Mọi chỗ trước đây đọc REPORTS[k] nay qua RP(k): báo cáo viết trong mã
     HOẶC email admin soạn trên app. cfg = bản đang sửa ở 👥 Recipients.   */
  function _pNum(k){ return +String(k).slice(1) || 0; }
  function repKeys(cfg){
    const M = (cfg || MAILCFG).MAILS || {};
    return Object.keys(REPORTS).concat(Object.keys(M).filter(k => !REPORTS[k]).sort((a, b) => _pNum(a) - _pNum(b)));
  }
  function RP(k, cfg){
    if(REPORTS[k]) return REPORTS[k];
    const m = ((cfg || MAILCFG).MAILS || {})[k];
    if(!m) return null;
    return { ttl:m.ttl || k, sub:'Text mail · drafted in the app', custom:true, build:() => buildCustom(k) };
  }
  const TPL_HELP = '{date} = 2026-09-25 · {long} = September 25th, 2026 · {dmy} = 25/09/2026 · {week} = W39 (21-Sep-26 – 27-Sep-26) · {month} = September 2026 · {year} = 2026';
  function tplFill(s, iso){
    const d = iso || ST.date || isoToday(), p = d.split('-'), w = weekOf(d);
    return String(s || '').replace(/\{(date|long|dmy|week|month|year)\}/gi, (m0, t) => {
      t = t.toLowerCase();
      return t === 'date' ? d : t === 'long' ? longDate(d) : t === 'dmy' ? p[2]+'/'+p[1]+'/'+p[0]
           : t === 'week' ? 'W'+w.wk+' ('+dMonY(w.mon)+' – '+dMonY(w.sun)+')' : t === 'month' ? MON[+p[1]-1]+' '+p[0] : p[0];
    });
  }
  /* chữ thường → HTML thư: dòng trống = đoạn mới · dòng bắt đầu "- " hoặc "• " = gạch đầu dòng */
  function txt2html(t){
    let out = '', buf = [];
    const flush = () => { if(buf.length){ out += para(buf.map(esc).join('<br>')); buf = []; } };
    String(t || '').replace(/\r/g, '').split('\n').forEach(l => {
      if(!l.trim()){ flush(); return; }
      const m = l.match(/^\s*[-•]\s+(.*)$/);
      if(m){ flush(); out += bullet(esc(m[1])); return; }
      buf.push(l);
    });
    flush();
    return out;
  }
  function buildCustom(k){
    const m = MAILCFG.MAILS[k] || {}, warn = [];
    const body = txt2html(tplFill(m.body));
    if(!String(m.body || '').trim()) warn.push('This mail has no text yet — '+(_canEditRc() ? 'press ✎ Edit text above.' : 'ask an administrator to write it, or type in the preview.'));
    if(!String(m.subj || '').trim()) warn.push('Subject is empty.');
    return { subject:tplFill(m.subj), body:body || '<p>&nbsp;</p>', warn, attach:m.attach ? tplFill(m.attach) : '' };
  }

  /* ═════════════════ NGƯỜI NHẬN + CHỮ KÝ ═════════════════ */
  /* người: danh sách chung (MAILCFG) hoặc người thêm RIÊNG cho thư này (ST.adhoc, id 'x:email') */
  function P(id){ return MAILCFG.person(id) || ST.adhoc[id] || null; }
  /* v4.179 — người gửi = tài khoản đang đăng nhập. Trả về id trong DIR, hoặc id 'x:<email>'
     (ST.adhoc) khi chỉ tìm thấy trong danh bạ công ty; '' khi không nhận ra. */
  let _ctAsked = false;       /* dò lại mỗi lần gọi (36 dòng, rẻ) ⇒ admin sửa danh bạ là ăn ngay */
  function meEmail(){ try{ return String(((window.CURRENT_USER || {}).email) || '').trim().toLowerCase(); }catch(_){ return ''; } }
  function meId(){
    const em = meEmail();
    ST.me = '';
    if(!em) return '';
    const loc = em.split('@')[0];
    let p = MAILCFG.DIR.find(x => (x.e||'').toLowerCase() === em)
         || MAILCFG.DIR.find(x => (x.e||'').toLowerCase().split('@')[0] === loc);   /* đăng nhập bằng gmail cùng mã NV */
    if(p){ ST.me = p.id; return ST.me; }
    const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null;
    if(CT && !CT.rows() && !_ctAsked){ _ctAsked = true; CT.load().then(() => { if(_isOpen()) _renderAll(); }); }
    const r = CT && (CT.byEmail(em) || CT.byEmail(loc + '@hyosung.com'));
    if(r){ const id = 'x:' + r[CT.F.e].toLowerCase(); ST.adhoc[id] = Object.assign(CT.toPerson(r), { id }); ST.me = id; }
    return ST.me;
  }
  function recipients(rep){
    const C = MAILCFG, rt = C.ROUTE[rep] || { to:[], cc:[] };
    const me = meId(), A = ST.adj[rep] || { to:[], cc:[], rm:[] };
    const myE = me && P(me) ? String(P(me).e||'').toLowerCase() : meEmail();
    /* mặc định của nhóm → bớt những người bỏ riêng cho thư này → thêm người riêng */
    let to = C.expand(rt.to).concat(A.to).filter(id => id !== me && A.rm.indexOf(id) < 0);
    to = to.filter((id, i) => to.indexOf(id) === i);
    let cc = C.expand(rt.cc).concat(A.cc).filter(id => id !== me && A.rm.indexOf(id) < 0 && to.indexOf(id) < 0);
    cc = cc.filter((id, i) => cc.indexOf(id) === i);
    const ok = id => { const p = P(id); return p && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.e || ''); };
    const noMail = to.concat(cc).filter(id => !ok(id));
    /* chống trùng theo ĐỊA CHỈ (hai mục danh bạ cùng email) */
    const seen = {};
    const uniq = id => { const e = P(id).e.toLowerCase(); if(seen[e]) return false; seen[e] = 1; return true; };
    const notMe = id => !myE || String(P(id).e||'').toLowerCase() !== myE;      /* v4.179 — người gửi không nằm trong To/CC */
    const toF = to.filter(ok).filter(notMe).filter(uniq), ccF = cc.filter(ok).filter(notMe).filter(uniq);
    return { to:toF, cc:ccF, noMail };
  }
  function addr(id){ const p = P(id); return p.n + ' <' + p.e + '>'; }
  /* v4.181 — BỎ CHỮ KÝ: Outlook của mọi người đã cài chữ ký sẵn ⇒ thân thư không kèm chữ ký. */

  /* ═════════════════ XUẤT: .eml · clipboard · mailto ═════════════════ */
  function _b64(str){ return btoa(unescape(encodeURIComponent(str))); }
  function _wrap(b){ return b.replace(/.{1,76}/g, '$&\r\n'); }
  function _hdr(s){ return /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + _b64(s) + '?='; }
  function _addrHdr(ids){
    return ids.map(id => { const p = P(id);
      const nm = /^[\x20-\x7e]*$/.test(p.n) ? '"' + p.n.replace(/"/g,'') + '"' : _hdr(p.n);
      return nm + ' <' + p.e + '>'; }).join(',\r\n ');
  }
  /* v4.193 — bản để dán: bọc cả thân thư trong một div mang font (Outlook bỏ style của <body> khi dán) */
  function _pasteHtml(inner){ return '<div style="'+FONT+'font-size:12pt">'+inner+'</div>'; }
  function _docHtml(inner){
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="'+FONT+'font-size:12pt">'+inner+'</body></html>';
  }
  function buildEml(o){
    const bnd = '----=_LPGT_' + Date.now().toString(36);
    const H = ['X-Unsent: 1', 'To: ' + _addrHdr(o.to), 'Cc: ' + _addrHdr(o.cc), 'Subject: ' + _hdr(o.subject), 'MIME-Version: 1.0'];
    /* v4.206 — ảnh data: trong thân thư (biểu đồ P3) ⇒ phần ảnh nhúng cid: (multipart/related) — Outlook hiển thị được */
    const imgs = [];
    const html = String(o.html || '').replace(/src="data:(image\/(?:png|jpeg));base64,([^"]+)"/g, (m0, t, b) => {
      const id = 'img' + imgs.length + '.' + Date.now().toString(36) + '@lpgt'; imgs.push({ t, b, id }); return 'src="cid:' + id + '"'; });
    let htmlPart = 'Content-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + _wrap(_b64(_docHtml(html)));
    if(imgs.length){
      const rb = bnd + '_rel';
      htmlPart = 'Content-Type: multipart/related; type="text/html"; boundary="' + rb + '"\r\n\r\n--' + rb + '\r\n' + htmlPart +
        imgs.map((im, i) => '\r\n--' + rb + '\r\nContent-Type: ' + im.t + '; name="chart' + (i+1) + '.png"\r\nContent-Transfer-Encoding: base64\r\n' +
          'Content-ID: <' + im.id + '>\r\nContent-Disposition: inline; filename="chart' + (i+1) + '.png"\r\n\r\n' + _wrap(im.b)).join('') + '\r\n--' + rb + '--\r\n';
    }
    if(!o.files || !o.files.length) return H.join('\r\n') + '\r\n' + htmlPart;
    let out = H.join('\r\n') + '\r\nContent-Type: multipart/mixed; boundary="' + bnd + '"\r\n\r\n--' + bnd + '\r\n' + htmlPart;
    o.files.forEach(f => {
      const nm = _hdr(f.name);
      out += '\r\n--' + bnd + '\r\nContent-Type: ' + (f.type || 'application/octet-stream') + '; name="' + nm + '"\r\n' +
        'Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="' + nm + '"\r\n\r\n' + _wrap(f.b64);
    });
    return out + '\r\n--' + bnd + '--\r\n';
  }


  /* ═════════════════ GIAO DIỆN ═════════════════ */
  let _el = null, _cur = null;
  const $ = id => document.getElementById(id);
  function _toast(m, c){ try{ toast(m, c||''); }catch(_){ console.log(m); } }

  function open(rep){
    if(!_el) _mount();
    try{ MAILCFG.attach(); }catch(_){}
    if(rep && RP(rep)){ ST.rep = rep; ST.view = 'rep'; }
    if(!ST.date) ST.date = _defaultDate(ST.rep);
    if(ST.dewHistErr){ ST.dewHistReq = false; ST.dewHistErr = ''; }   /* v4.211 — mở lại thì cho đọc lại lịch sử dew point */
    _el.classList.add('on');
    _renderAll();
  }
  function close(){ if(_dewDirty()){ _dewGuard(close); return; }      /* v4.207 */
    if(_el) _el.classList.remove('on'); try{ if(typeof CONTACTS !== 'undefined') CONTACTS.setPreview(null); }catch(_){}
    try{ if(typeof MAILCFG !== 'undefined' && MAILCFG.detach && !(ST.view === 'rc' && ST.rcDirty)) MAILCFG.detach(); }catch(_){} }   /* v4.210 — không giữ listener khi không làm email */
  function _defaultDate(rep){
    if(rep === 'P1'){ const t = isoToday(); return lotsOfDay(t).length ? t : (lastMixDay() || t); }
    if(rep === 'P6'){ const d = _sapDates(isoToday()); return d.length ? d[d.length-1] : isoToday(); }
    if(rep === 'P2'){ return isoToday(); }
    if(rep === 'P7'){ const L = vesselLots()[0]; return (L && L.date) || isoToday(); }
    return isoToday();
  }
  function _mount(){
    _el = document.createElement('div');
    _el.id = 'mailModal'; _el.className = 'ml-ov';
    _el.innerHTML =
      '<div class="ml-box">'+
        '<div class="ml-hd"><span class="ml-ttl">✉ REPORT MAIL</span>'+
          '<span class="ml-hint">Recipients come from fixed groups · tables are filled from app data · missing figures are typed here and saved where they belong</span>'+
          '<button class="ml-x" onclick="MAIL.close()" title="Close">✕</button></div>'+
        '<div class="ml-body">'+
          '<div class="ml-nav" id="mlNav"></div>'+
          '<div class="ml-main" id="mlMain">'+
            '<div class="ml-opts" id="mlOpts"></div>'+
            /* v4.211 — gọn phần đầu: người nhận / cảnh báo / xe huỷ thu thành nút-badge bấm mở; Subject + zoom trên CÙNG một hàng */
            '<div class="ml-strip"><span class="ml-chips" id="mlChips"></span>'+
              '<label class="ml-subj"><span>Subject</span><input id="mlSubj" type="text" spellcheck="false"></label>'+
              '<span id="mlEdited" class="ml-edited"></span>'+
              '<span class="ml-zoom" title="Preview size only — the mail itself is not changed">'+
                '<button class="ml-mini" onclick="MAIL.zoom(-1)" title="Smaller">A−</button><button class="ml-mini ml-zv" id="mlZoomV" onclick="MAIL.zoom(0)" title="Back to 100%">100%</button><button class="ml-mini" onclick="MAIL.zoom(1)" title="Larger">A+</button></span>'+
              '<button class="ml-mini ml-foc" id="mlFocBtn" onclick="MAIL.focus()" title="Focus: hide the report list and the options above to read the mail body on a small screen">⛶ Focus</button>'+
            '</div>'+
            '<div class="ml-pnl ml-rcp" id="mlRcp"></div>'+
            '<div class="ml-pnl ml-warn" id="mlWarn"></div>'+
            '<div class="ml-pnl ml-cxp" id="mlFold"></div>'+
            '<div class="ml-prev" id="mlPrev" contenteditable="true" spellcheck="false" title="Click to edit text before sending"></div>'+
          '</div>'+
          '<div class="ml-main" id="mlRcMain" style="display:none"></div>'+
        '</div>'+
        '<div class="ml-ft" id="mlFt">'+
          '<label class="ml-file" title="Any file attached here goes INTO the Outlook draft (.eml)">📎 Attach<input type="file" multiple onchange="MAIL.pickFiles(this)"></label>'+
          '<span id="mlFiles" class="ml-files"></span>'+
          '<span style="flex:1"></span>'+
          '<button class="ml-btn" onclick="MAIL.copyBody()" title="Copy the formatted body — paste into any mail with Ctrl+V">📋 Copy body</button>'+
          '<button class="ml-btn" id="mlBtnOpen" onclick="MAIL.mailto()" title="Open a new Outlook mail with To / CC / Subject filled; the body is copied — press Ctrl+V in the mail body. Attachments cannot travel this way.">✉ Open in Outlook</button>'+
          '<button class="ml-btn" id="mlBtnEml" onclick="MAIL.eml()" title="Download an Outlook DRAFT (.eml): recipients, subject, tables AND attachments ready — open it and press Send">⬇ Outlook draft (.eml)</button>'+
        '</div>'+
      '</div>'+
      '<div class="ml-gate" id="mlGate" style="display:none"></div>';
    document.body.appendChild(_el);
    _applyView();
    _el.addEventListener('mousedown', e => { if(e.target === _el) close(); });
    $('mlPrev').addEventListener('input', () => { ST.edited = true; $('mlEdited').textContent = '✎ edited'; });
    document.addEventListener('mailcfg:changed', () => { if(_el && _el.classList.contains('on') && ST.view === 'rep') _renderAll(); });
  }
  function _renderNav(){
    /* v4.211 — danh sách thu gọn được (« / ») — thu thì chỉ còn mã P1…P7, rê chuột xem tên */
    $('mlNav').innerHTML = '<button class="ml-navtg" onclick="MAIL.navMin()" title="'+(_navMin() ? 'Show report names' : 'Collapse the list — more room for the mail')+'">'+(_navMin() ? '»' : '« collapse')+'</button>'+
      repKeys().map(k => { const R0 = RP(k);
      return '<button class="ml-it'+(ST.view === 'rep' && k === ST.rep ? ' on' : '')+'" onclick="MAIL.pick(\''+k+'\')" title="'+esc(k+' '+R0.ttl+' — '+R0.sub)+'"><b>'+k+'</b><span class="ml-it-t"> '+esc(R0.ttl)+'<small>'+esc(R0.sub)+'</small></span></button>'; }).join('') +
      '<div style="flex:1"></div>'+
      '<button class="ml-it ml-it-rc'+(ST.view === 'rc' ? ' on' : '')+'" onclick="MAIL.recips()" title="Recipients — directory · groups · who gets which mail"><b>👥</b><span class="ml-it-t"><b> Recipients</b><small>Directory · groups · who gets which mail</small></span></button>';
  }
  /* ── v4.211 — bố cục gọn cho laptop: thu danh sách · Focus · zoom preview · mở/đóng từng khối (nhớ theo máy) ── */
  const FOLD_EL = { rcp:'mlRcp', warn:'mlWarn', cx:'mlFold' };
  function _navMin(){ const v = _lsGet('lpg_v4_mail_navmin', null); return v === null ? window.innerWidth < 1600 : !!v; }
  function _zoomV(){ const z = +_lsGet('lpg_v4_mail_zoom', 1.1); return z >= 0.6 && z <= 1.6 ? z : 1.1; }
  function _applyView(){
    if(!_el) return;
    const box = _el.querySelector('.ml-box');
    box.classList.toggle('nav-min', _navMin());
    box.classList.toggle('ml-focus', !!ST.focus);
    const b = $('mlFocBtn'); if(b){ b.textContent = ST.focus ? '⤡ Exit focus' : '⛶ Focus'; b.classList.toggle('on', !!ST.focus); }
    const z = _zoomV(), pv = $('mlPrev'); if(pv) pv.style.zoom = z;
    const zv = $('mlZoomV'); if(zv) zv.textContent = Math.round(z * 100) + '%';
  }
  function navMin(){ _lsSet('lpg_v4_mail_navmin', !_navMin()); _applyView(); _renderNav(); }
  function focusT(){ ST.focus = !ST.focus; _applyView(); _placePop(); }
  function zoom(d){ const z = d ? Math.round((_zoomV() + d * 0.1) * 10) / 10 : 1; _lsSet('lpg_v4_mail_zoom', Math.max(0.6, Math.min(1.6, z))); _applyView(); }
  function _fold(){ return ST.fold || (ST.fold = _lsGet('lpg_v4_mail_fold', {})); }
  function fold(k){ const F = _fold(); F[k] = !F[k]; _lsSet('lpg_v4_mail_fold', F); _renderChips(); _placePop(); }
  function _renderChips(){
    const el = $('mlChips'); if(!el) return;
    const F = _fold(), r = recipients(ST.rep), A = ST.adj[ST.rep], w = ST.wN || 0;
    const tg = (k, cls, html, tip) => '<button class="ml-tg '+cls+(F[k] ? ' open' : '')+'" onclick="MAIL.fold(\''+k+'\')" title="'+esc(tip)+'">'+html+'<span class="ml-car">'+(F[k] ? '▴' : '▾')+'</span></button>';
    let h = '';
    if(ST.big){ const kb = 'big_' + ST.big.k; if(F[kb] === undefined) F[kb] = !!ST.big.dflt; h += tg(kb, ST.big.cls, ST.big.html, ST.big.tip + ' — click to show / hide'); }
    h += tg('rcp', r.noMail.length ? 'bad' : '', '👥 To <b>'+r.to.length+'</b> · CC <b>'+r.cc.length+'</b>'+(A && (A.to.length + A.cc.length + A.rm.length) ? ' <i>· changed</i>' : '')+(r.noMail.length ? ' · ⚠'+r.noMail.length : ''),
      'Recipients — click to show / hide the list, add or remove people for this mail');
    h += tg('warn', w ? 'warn' : 'ok', w ? '⚠ <b>'+w+'</b> to check' : '✓ Data OK', w ? 'Missing data / items to check — click to see the list. You will also be asked to confirm before sending.' : 'All data present — click to see details');
    if(ST.cxHtml){ const C0 = ST.cnCur || { cands:[], reviewed:false };      /* v4.216 — bấm để hiện danh sách ứng viên, tick chọn xe huỷ */
      h += tg('cx', C0.reviewed ? 'info' : 'warn', '🚫 Cancel list <b>'+ST.cxN+'</b>/'+C0.cands.length+(C0.reviewed ? ' ✓' : ' · pick'),
        'Candidate trucks (🚫 Cancelled / removed from Today Plan) — click to show the list and tick the ones that are really cancelled'); }
    el.innerHTML = h;
    Object.keys(FOLD_EL).forEach(k => { const p = $(FOLD_EL[k]); if(p) p.classList.toggle('open', !!F[k] && !(k === 'cx' && !ST.cxHtml)); });
    const bigOpen = !!(ST.big && F['big_' + ST.big.k]);
    document.querySelectorAll('#mlOpts .ml-big').forEach(e => e.classList.toggle('open', bigOpen));
  }
  /* ô nhập nhỏ + nút lưu (dùng chung) */
  function inBox(label, val, ph, onSave, w, title){
    return '<label class="ml-in" title="'+esc(title||'')+'">'+label+' <input style="width:'+(w||80)+'px" value="'+esc(val==null?'':val)+'" placeholder="'+esc(ph||'')+'" '+
      'onkeydown="if(event.key===\'Enter\'){'+onSave+'}" onchange="'+onSave+'"></label>';
  }
  function _renderOpts(){
    const C = MAILCFG;
    ST.cxHtml = ''; ST.cxN = 0; ST.cnCur = null;          /* v4.211 — khối xe huỷ (P2) nằm trong ô 🚫 thu gọn */
    ST.big = null;                       /* v4.211 — khối nhập liệu lớn (P1 lot · P5 heater · P6 bảng kiểm) thu vào một nút-badge */
    let h = '<label>Date <input type="date" value="'+ST.date+'" onchange="MAIL.set(\'date\',this.value)"></label>';
    { const me = meId(), p = me ? P(me) : null;       /* v4.179 — From = tài khoản đang đăng nhập, không chọn tay */
      h += '<span class="ml-in" title="The sender is the account you are logged in with ('+esc(meEmail() || 'not logged in')+'). No signature is added — Outlook adds your own.">From <b>'+(p ? esc(p.n) : '<span style="color:#b91c1c">'+esc(meEmail() || '—')+'</span>')+'</b></span>'; }
    if(ST.rep === 'P1'){
      h += '<label>Shift <select onchange="MAIL.set(\'shift\',this.value)">'+[['auto','Auto'],['day','Day'],['night','Night'],['none','(none)']]
        .map(o=>'<option value="'+o[0]+'"'+(ST.shift === o[0] ? ' selected' : '')+'>'+o[1]+'</option>').join('')+'</select></label>';
      h += '<label class="ml-in" title="Search any lot in Tank Log (number, tank, date) and tick it to put it in this mail — e.g. to send a corrected lot again">🔍 Lot <input id="mlLotQ" style="width:150px" placeholder="e.g. 421, 3502, 22/09" value="'+esc(ST.lotQ)+'" oninput="MAIL.lotSearch(this.value)"></label>';
      if(Object.keys(ST.ovr).length) h += '<button class="ml-save" onclick="MAIL.ovrSaveAll()" title="Write every value typed below into its lot in Tank Log">💾 Save typed values to Tank Log</button>';
      h += '<div id="mlLotRes" class="ml-lots">'+_lotResults()+'</div>';
      const all = p1Lots();
      { const nNeed = all.filter(r0 => { const r = withOvr(r0); return ['temp','pres','dens'].some(f => num(r[OVR_COLS[f]]) == null); }).length;
        ST.big = { k:'P1', dflt:true, cls: nNeed ? 'warn' : (all.length ? 'ok' : ''), tip:'Lots in this mail — tick / untick, pumping order, missing T / P / ρ',
                   html:'🧪 Lots <b>'+all.length+'</b>'+(nNeed ? ' · ⚠'+nNeed+' missing' : '') }; }
      h += '<div class="ml-big">';
      h += '<div class="ml-lots">'+(all.length ? all.map(r0 => {
        const k = lotKey(r0), o = ST.order[k] || 'C4', r = withOvr(r0), ov = ST.ovr[k] || {};
        const cell = (f, lbl, w) => { const has = num(r[OVR_COLS[f]]) != null, typed = ov[f] != null && ov[f] !== '';
          return '<label class="ml-in'+(has && !typed ? '' : ' need')+'" title="'+(has && !typed ? 'From Tank Log' : 'Type the value — 💾 writes it to the Tank Log')+'">'+lbl+
            ' <input style="width:'+w+'px" value="'+esc(r[OVR_COLS[f]]||'')+'" onchange="MAIL.ovr(\''+esc(k)+'\',\''+f+'\',this.value)"></label>'; };
        return '<span class="ml-lot on"><label><input type="checkbox" checked onchange="MAIL.lot(\''+esc(k)+'\',this.checked)"> <b>'+
          esc(r0[1])+'</b> · '+esc(tankName(r0[2]))+' · '+dMonY(anyIso(r0[3]))+' '+esc(r0[4]||'')+'–'+esc(r0[5]||'')+'</label> '+sentBadge(r0)+
          '<button title="Pumping order — which product was filled first (sets the pumped volumes)" onclick="MAIL.ord(\''+esc(k)+'\')">'+(o === 'C4' ? 'C4→C3' : 'C3→C4')+'</button>'+
          cell('temp','T °C',46)+cell('pres','P kg/cm²',46)+cell('dens','ρ kg/L',50)+
          (ST.ovr[k] ? '<button class="ml-save" onclick="MAIL.ovrSave(\''+esc(k)+'\')" title="Write the typed values into this lot in Tank Log">💾</button>' : '')+
          '</span>';
      }).join('') : '<i>No lot selected. Lots of '+ST.date+' appear here automatically; use 🔍 to add others.</i>')+'</div>';
      const sk = p1Skipped();
      if(sk.length) h += '<div class="ml-lots"><span class="ml-cap">Already sent — not in this mail (tick to send again):</span>'+sk.map(r =>
        '<label class="ml-lot"><input type="checkbox" onchange="MAIL.lot(\''+esc(lotKey(r))+'\',this.checked)"> '+esc(r[1])+' · '+esc(tankName(r[2]))+' '+sentBadge(r)+'</label>').join('')+'</div>';
      h += '</div>';
    }
    if(ST.rep === 'P2'){
      /* v4.183 — kế hoạch đầu ngày ⟷ kế hoạch cuối + xe bị gỡ khỏi plan (tick bỏ được) */
      const F = ST.p2first && ST.p2first.iso === ST.date ? ST.p2first : null, f = F && F.first;
      const t2 = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
      if(f) h += '<span class="ml-cap" title="Saved once at the first paste / promote of the day (plan_day). The final plan is Today Plan now.">📌 First plan '+t2(f.at)+' ('+esc(f.src||'')+', '+esc(f.by||'')+'): <b>'+fmt(num(f.mt),3)+' MT</b> · '+(f.n||0)+' orders → final plan now <b>'+fmt(F.final,3)+' MT</b></span>'+
        (_canEditRc() ? ' <button class="ml-mini" onclick="MAIL.p2Record(true)" title="Admin: replace the first plan with Today Plan as it is now">↻ Re-record</button>' : '');
      else if(f === null) h += '<button class="ml-save" onclick="MAIL.p2Record(false)" title="No first plan was saved for this day. Keep Today Plan as it is now as the first plan.">📌 Record current plan as first plan</button>';
      /* v4.216 — xe huỷ: KHÔNG điền sẵn; bảng ứng viên nằm trong ô 🚫 Cancel list, người dùng tick chọn */
      const CXd = p2Cancel(ST.date); ST.cxN = CXd.rows.length; ST.cnCur = CXd;
      if(CXd.cands.length) ST.cxHtml = _cnPanel(CXd);
      /* v4.204 — ① chọn file (không xử lý) · ② bấm Build mới điền + lưu + đính kèm */
      const DS = ST.dsSrc, built = ST.files.find(f => f.auto && f.rep === 'P2');
      h += '<span><button class="ml-file ml-file-in" onclick="MAIL.dsPick(this)" title="Pick the Daily Stock report of the PREVIOUS day (.xlsx). Nothing is processed until you press ▶ Build report. The new report is saved in the SAME folder.">'+
        (DS ? '🔁 Change file' : '📂 Pick Daily Stock file')+'</button><input type="file" accept=".xlsx" style="display:none" onchange="MAIL.dsFile(this)"></span>';
      if(DS) h += '<span class="ml-chip" title="Source file (not changed — the report is saved as a new file)">📄 '+esc(DS.name)+' <a onclick="MAIL.dsClear()" title="Remove">✕</a></span>'+
        (DS.fdate && DS.fdate >= ST.date ? '<span class="ml-cap" style="color:#b45309">⚠ file dated '+esc(DS.fdate)+' is not before '+esc(ST.date)+'</span>' : '');
      h += '<button class="ml-save" onclick="MAIL.dsBuild()"'+(!DS || ST.dsBusy ? ' disabled style="opacity:.5;cursor:not-allowed"' : '')+
        ' title="Fill '+ST.date+' into the selected file, save the new report, attach it and fill the mail body">'+(ST.dsBusy ? '⏳ Building…' : '▶ Build report '+ST.date+' & attach')+'</button>';
      if(built && built.date && built.date !== ST.date) h += '<span class="ml-cap" style="color:#b45309">⚠ attached report is for '+esc(built.date)+'</span>';
      else if(built && built.cnSig !== undefined && built.cnSig !== CXd.sig) h += '<span class="ml-cap" style="color:#b91c1c;font-weight:600">⚠ Cancel list changed after the report was built — press ▶ Build again</span>';
    }
    if(ST.rep === 'P3'){
      const d = ST.dew; _dewAutoNo();
      /* v4.224 — màu ô giống Engineer ▸ 💧 Dew Point (DEWPT.inState): đỏ = không phải số / dương / ngoài dải · hồng = vượt giới hạn · vàng = sát giới hạn */
      const STY = { bad:'border:2px solid #dc2626;background:#fee2e2', off:'background:#ffc7ce;border-color:#f0b8b3;color:#9c0006', near:'background:#fff2cc;border-color:#f5d08a;color:#8a5300' };
      const noB = inBox('No.', d.no, '', "MAIL.dew('no',this.value)", 56, d.noUser ? 'Number typed / saved for this reading' : 'Filled automatically: the number after the previous reading (or the last row of the Excel file). Type to change.');
      h += (d.noUser || !d.no ? noB : noB.replace('style="width:56px"', 'style="width:56px;color:#1d4ed8;font-style:italic"'))+inBox('Time', d.time, 'hh:mm', "MAIL.dew('time',this.value)", 56)+
        DEW_PTS.map(p => { const x = inBox(p[1].replace('Outlet ',''), d[p[0]], '<'+p[2], "MAIL.dew('"+p[0]+"',this.value)", 62);
          const stt = (typeof DEWPT !== 'undefined' && DEWPT.inState) ? DEWPT.inState(p[0], d[p[0]]) : (_dn(d[p[0]]) > 0 ? 'bad' : '');
          return stt ? x.replace('style="width:62px"', 'style="width:62px;'+STY[stt]+'"'+(stt === 'bad' ? ' title="Not a valid dew point — it must be a NEGATIVE number (e.g. -67.5)"' : '')) : x; }).join('')+
        '<button class="ml-save" onclick="MAIL.dewSave()" title="Save the readings to the dew point history (Firebase dew_point/'+ST.date+' + Engineer ▸ 💧 Dew Point). Nothing is saved until you press this.">💾 Save reading</button>'+
        (d.saved ? '<span class="ml-ok">✓ saved</span>' : (d.touched && DEW_PTS.some(p => _dn(d[p[0]]) !== null) ? '<span class="ml-cap" style="color:#b45309">● not saved</span>' : ''))+
        '<label class="ml-in" title="Chart source: the chart data of the Excel file (same rows as the attachment) or the app history for a period ending on the report date">📈 Chart <select onchange="MAIL.dewRange(this.value)">'+
          (typeof DEWXL !== 'undefined' && DEWXL.has('c3') ? '<option value="xl"'+(_dewUseXl() ? ' selected' : '')+'>Excel file (as attached)</option>' : '')+
          Object.keys(DEW_RANGE).map(k => '<option value="'+k+'"'+(!_dewUseXl() && ST.dewRange === k ? ' selected' : '')+'>App history · '+DEW_RANGE[k][1]+'</option>').join('')+'</select></label>'+
        (ST.dewPng && ST.dewPng.url ? '<button class="ml-mini" onclick="MAIL.dewCopyChart()" title="Copy the chart as a picture — paste it into Outlook if the chart is missing after Copy body">📋 Copy chart</button>' : '');
      /* v4.224 — 📗 file Excel dew point: ① chọn (chỉ xem trước) · ② ▶ Fill mới ghi + lưu cùng thư mục + đính kèm */
      if(typeof DEWXL !== 'undefined'){
        const has = DEWXL.has('c3'), att = ST.files.find(f => f.auto && f.rep === 'P3');
        h += DEWXL.pickHtml('c3', 'ml-file ml-file-in')+
          '<button class="ml-save" onclick="MAIL.dewFill()"'+(!has || DEWXL.busy('c3') ? ' disabled style="opacity:.5;cursor:not-allowed"' : '')+' title="Write the saved readings up to '+ST.date+' into the selected file, save it as a new file in the same folder and attach it">'+(DEWXL.busy('c3') ? '⏳ Filling…' : '▶ Fill file '+ST.date+' & attach')+'</button>';
        if(att && att.date && att.date !== ST.date) h += '<span class="ml-cap" style="color:#b45309">⚠ attached file is for '+esc(att.date)+'</span>';
        if(has){ const P = DEWXL.plan('c3', ST.date), n = P && !P.loading ? P.add.length : 0, nd = P && P.diff ? P.diff.length : 0;
          ST.big = { k:'P3', dflt:true, cls: P && !P.loading && (P.noUpto || nd) ? 'warn' : (n ? 'ok' : ''), tip:'Excel file preview — sheet, last row, rows to add, rows that differ from the app',
                     html:'📗 Excel'+(P && P.loading ? ' ⏳' : ' <b>+'+n+'</b>'+(nd ? ' · ⚠'+nd : '')) };
          h += '<div class="ml-big">'+DEWXL.planHtml('c3', ST.date)+'</div>'; }
      }
    }
    if(ST.rep === 'P5'){
      const H = ST.heat;
      h += '<label class="ml-file ml-file-in" title="TagMonitoringReport from PMS — one file per tag (PRO2.FQT32331 = Heater A, PRO2.FQT32341 = Heater B). Select both at once.">📈 PMS files (A + B)<input type="file" multiple accept=".xlsx,.xlsm,.xls" onchange="MAIL.heatFiles(this)"></label>'+
        '<span class="ml-cap">'+(H.A ? '✓ A '+esc(H.A.file||'') : '○ A missing')+' · '+(H.B ? '✓ B '+esc(H.B.file||'') : '○ B missing')+'</span>'+
        ((H.A || H.B) && typeof HTR !== 'undefined' ? '<button class="ml-save" onclick="HTR.swap()" title="Files assigned the wrong way round? Swap Heater A and B">⇄ A/B</button>' : '')+
        ((H.pending || []).length ? '<div class="ml-lots">'+H.pending.map((p, i) => '<span class="ml-lot">❓ '+esc(p.file)+' — which heater? '+
          '<button onclick="HTR.assign('+i+',\'A\')">A</button><button onclick="HTR.assign('+i+',\'B\')">B</button></span>').join('')+'</div>' : '')+
        inBox('Vessel', H.vessel, 'e.g. BW VAR', "MAIL.heatSet('vessel',this.value)", 110)+
        inBox('Amount (ton)', H.amount, 'optional', "MAIL.heatSet('amount',this.value)", 80, 'Written to the Sumary sheet');
      if(H.runs.length || H.start){
        ST.big = { k:'P5', dflt:false, cls: H.start ? 'ok' : 'warn', tip:'Heater runs, START / STOP, save to Cavern Daily, master file and chart',
                   html:'🔥 Heater run '+(H.start ? '<b>'+PMSHEAT.fmtTs(H.start).slice(5,16)+'</b>' : '<b>not set</b>') };
        h += '<div class="ml-big">';
      }
      if(H.runs.length){
        h += '<div class="ml-lots"><span class="ml-cap">Heater runs found:</span>'+H.runs.map((r,i) =>
          '<label class="ml-lot'+(i === H.run ? ' on' : '')+'"><input type="radio" name="mlRun"'+(i === H.run ? ' checked' : '')+' onchange="MAIL.heatRun('+i+')"> '+
          PMSHEAT.fmtTs(r.start).slice(5,16)+' → '+PMSHEAT.fmtTs(r.stop).slice(5,16)+' · '+fmt(r.a + r.b,0)+' kg</label>').join('')+'</div>';
      }
      if(H.start){
        h += '<div class="ml-lots"><label class="ml-in" title="Suggested from the flow meters — adjust if needed">START <input type="datetime-local" step="60" value="'+dtLocal(H.start)+'" onchange="MAIL.heatSet(\'start\',this.value)"></label>'+
          '<label class="ml-in">STOP <input type="datetime-local" step="60" value="'+dtLocal(H.stop)+'" onchange="MAIL.heatSet(\'stop\',this.value)"></label>'+
          '<button class="ml-save" onclick="MAIL.heatSave()" title="Write each day\'s total into Cavern Daily (Heater C3) — used by the SAP WMS report">💾 Save to Cavern Daily</button>'+
          '<label class="ml-file ml-file-in" title="Pick the Heater 연료 사용량 master file — the app adds a new voyage sheet + a Sumary row, downloads it and attaches it">📂 Heater master file → add voyage & attach<input type="file" accept=".xlsx" onchange="MAIL.heatMaster(this)"></label>'+
          (H.lastOut && !ST.files.some(f => f.rep === 'P5' && f.name === H.lastOut.name) ? '<button class="ml-save" onclick="MAIL.heatAttachLast()" title="Attach the report already built in Engineer ▸ 🔥 Heater">📎 Attach '+esc(H.lastOut.name)+'</button>' : '')+'</div>'+
          '<div class="ml-lots" style="display:block">'+heatChart()+'</div>';
      }
      if(H.runs.length || H.start) h += '</div>';
    }
    if(ST.rep === 'P7'){
      /* v4.177 — chọn lot tàu (mới nhất trước); đổi Date ⇒ tự lấy lot của ngày đó */
      const all = vesselLots(), cur = _vlot();
      h += '<label class="ml-in" title="Lots saved in Vessel Log (newest first). Changing the Date picks the lot of that day.">Vessel lot <select onchange="MAIL.vlot(this.value)">'+
        (cur ? '' : '<option value="">— choose —</option>')+
        all.slice(0, 60).map(x => '<option value="'+esc(x.lot)+'"'+(cur && cur.lot === x.lot ? ' selected' : '')+'>'+esc(x.lot)+' · '+esc(x.ship)+' · '+(x.date ? dMonY(x.date) : '?')+'</option>').join('')+'</select></label>';
      if(cur) h += '<span class="ml-cap">'+cur.rows.length+' row'+(cur.rows.length > 1 ? 's' : '')+' in Vessel Log · edit figures there (✏) — the mail reads the saved rows</span>';
    }
    if(RP(ST.rep) && RP(ST.rep).custom){
      /* v4.182 — email tự soạn: admin sửa chữ ngay tại đây, lưu cho mọi người (mail_cfg.MAILS) */
      const can = _canEditRc(), x = ST.cx && ST.cx.k === ST.rep ? ST.cx : null;
      if(!x) h += can ? '<button class="ml-save" onclick="MAIL.cxEdit()" title="Write the subject and text of this mail — saved for everyone">✎ Edit text</button>'
                      : '<span class="ml-cap">Text written by an administrator — you can still edit the preview for this mail only.</span>';
      else h += '<div class="ml-cx">'+
        '<label class="ml-in">Name <input style="width:220px" value="'+esc(x.ttl)+'" oninput="MAIL.cxSet(\'ttl\',this.value)"></label>'+
        '<label class="ml-in">Expected attachment <input style="width:220px" placeholder="optional, e.g. Report {dmy}.xlsx" value="'+esc(x.attach)+'" oninput="MAIL.cxSet(\'attach\',this.value)"></label>'+
        '<label class="ml-in ml-cx-w">Subject <input value="'+esc(x.subj)+'" oninput="MAIL.cxSet(\'subj\',this.value)"></label>'+
        '<label class="ml-in ml-cx-w">Text <textarea rows="9" spellcheck="false" oninput="MAIL.cxSet(\'body\',this.value)">'+esc(x.body)+'</textarea></label>'+
        '<div class="ml-cap">Blank line = new paragraph · a line starting with "- " = bullet · '+esc(TPL_HELP)+'. Mails that need figures or tables from the app are built in code — ask for them to be added.</div>'+
        '<div><button class="ml-btn" onclick="MAIL.cxPreview()">↻ Preview</button> <button class="ml-btn" onclick="MAIL.cxCancel()">Cancel</button> '+
        '<button class="ml-btn ml-pri" onclick="MAIL.cxSave()">💾 Save text for everyone</button></div></div>';
    }
    if(ST.rep === 'P6'){
      /* v4.180 — cùng bảng kiểm với LPG SALES ▸ SAP ▸ 📑 SAP WMS Report */
      h += '<label class="ml-file ml-file-in" title="Pick the LPG Cavern_SAP WMS Batch Stock file. The app shows which rows it will fill (this day and any empty days before it) and what is still missing; nothing is written until you press Fill & attach.">📂 Batch Stock file<input type="file" accept=".xlsx" onchange="MAIL.bsFile(this)"></label>';
      if(ST.bsF) h += '<span class="ml-cap"><b>'+esc(ST.bsF.name)+'</b> · fills '+(ST.bsPlan ? ST.bsPlan.dates.map(d => d.slice(8)+'/'+d.slice(5,7)).join(', ') : '…')+'</span>'+
        '<button class="ml-save" onclick="MAIL.bsBuild()" title="Fill the rows, download the file and attach it. Blocked while an item below still needs data or a decision.">⬇ Fill &amp; attach</button>';
      { let nOpen = 0; try{ nOpen = BSXL.check(_bsDates()).open || 0; }catch(_){}
        ST.big = { k:'P6', dflt:false, cls: nOpen ? 'warn' : 'ok', tip:'Batch Stock check — the same check as LPG SALES ▸ SAP ▸ SAP WMS Report. Type the figure, confirm 0, price unchanged or skip.',
                   html:'📋 Batch Stock check '+(nOpen ? '· ⚠ <b>'+nOpen+'</b> open' : '· ✓ ready') }; }
      h += '<div class="ml-big ml-swr">'+(typeof SWR !== 'undefined' ? SWR.html(_bsDates()) : '')+'</div>';
    }
    $('mlOpts').innerHTML = h;
  }
  function _renderRcp(){
    const r = recipients(ST.rep), C = MAILCFG, A = ST.adj[ST.rep];
    const chip = (id, f) => { const p = P(id), extra = A && A[f].indexOf(id) >= 0;
      return '<span class="ml-chip'+(extra ? ' add' : '')+'" title="'+esc(p.e)+' · '+esc(p.title||'')+(function(){ const ci = _ctInfo(p); return ci && ci.dept ? ' · '+esc(ci.dept) : ''; })()+(extra ? ' · added for this mail only' : '')+'">'+esc(p.n)+
        ' <a title="Remove from THIS mail only" onclick="MAIL.rcpRm(\''+esc(id)+'\')">✕</a></span>'; };
    let h = '<div><b>To</b> <button class="ml-mini" onclick="MAIL.copyList(\'to\')" title="Copy addresses">⧉</button> '+r.to.map(id => chip(id,'to')).join('')+'</div>'+
      '<div><b>CC</b> <button class="ml-mini" onclick="MAIL.copyList(\'cc\')" title="Copy addresses">⧉</button> '+r.cc.map(id => chip(id,'cc')).join('')+
      ' <span class="ml-cnt">'+(r.to.length + r.cc.length)+' recipients · default list '+(C.meta().src === 'firebase' ? 'by '+esc(C.meta().by) : '(built-in)')+'</span></div>';
    h += '<div class="ml-rcp-add"><label class="ml-in">+ add to this mail <input id="mlRcpQ" style="width:220px" placeholder="name or email" value="'+esc(ST.rcpQ||'')+'" '+
      'autocomplete="off" onfocus="MAIL.rcpFocus()" oninput="MAIL.rcpSearch(this.value)" onkeydown="if(event.key===\'Escape\'){MAIL.rcpSearch(\'\');this.value=\'\';}"></label>'+
      (A && (A.to.length || A.cc.length || A.rm.length) ? ' <button class="ml-mini" onclick="MAIL.rcpReset()" title="Back to the default list for this mail">↺ default list</button> <span class="ml-cap">changed for this mail only: +'+(A.to.length + A.cc.length)+' / −'+A.rm.length+'</span>' : '')+
      '<div id="mlRcpRes" class="ml-rcp-pop" onmousedown="event.preventDefault()">'+_rcpResults()+'</div></div>';
    if(r.noMail.length) h += '<div class="ml-nomail">⚠ No valid email address (not included): '+r.noMail.map(id=>esc(P(id).n)).join(', ')+' — an admin can fix it in 👥 Recipients</div>';
    $('mlRcp').innerHTML = h;
    _placePop();
  }
  /* v4.195 — kết quả tìm người nhận NỔI trên màn hình (position:fixed) ngay dưới ô gõ; trước đây nằm
     trong khung người nhận cao 110px có thanh cuộn ⇒ bị giấu xuống dưới, phải cuộn mới thấy */
  let _popHooked = false;
  function _placePop(){
    const el = $('mlRcpRes'), inp = $('mlRcpQ'); if(!el || !inp) return;
    if(!_popHooked){ _popHooked = true; document.addEventListener('scroll', () => _placePop(), true); window.addEventListener('resize', () => _placePop()); }
    if(!String(el.innerHTML).trim() || !_isOpen()){ el.style.display = 'none'; return; }
    const r = inp.getBoundingClientRect();
    if(!r.width){ el.style.display = 'none'; return; }
    el.style.display = 'block';
    const w = Math.min(620, window.innerWidth - 24), left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    el.style.left = left + 'px'; el.style.width = w + 'px';
    const below = window.innerHeight - r.bottom - 12, h = Math.min(el.scrollHeight, 340);
    if(below >= Math.min(h, 200) || below >= r.top){ el.style.top = (r.bottom + 4) + 'px'; el.style.bottom = ''; el.style.maxHeight = Math.max(120, below) + 'px'; }
    else { el.style.top = ''; el.style.bottom = (window.innerHeight - r.top + 4) + 'px'; el.style.maxHeight = Math.max(120, r.top - 12) + 'px'; }
  }
  /* người này đang ở đâu trong thư: 'to' | 'cc' | '' (so theo EMAIL, giống cách chống trùng lúc gửi) */
  function _rcpWhere(e){
    const r = recipients(ST.rep), k = String(e||'').toLowerCase();
    if(r.to.some(id => String(P(id).e||'').toLowerCase() === k)) return 'to';
    if(r.cc.some(id => String(P(id).e||'').toLowerCase() === k)) return 'cc';
    return '';
  }
  /* ── thêm / bớt người nhận RIÊNG cho thư đang soạn (RAM, không đổi danh sách chung) ── */
  function _adj(){ return ST.adj[ST.rep] || (ST.adj[ST.rep] = { to:[], cc:[], rm:[] }); }
  function _rcpResults(){
    const q = String(ST.rcpQ || '').trim(); if(q.length < 2) return '';
    const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null, a = s2 => CT ? CT.ascii(s2).toLowerCase() : String(s2).toLowerCase();
    const ws = a(q).split(' ').filter(Boolean);
    const hit = s2 => ws.every(w => a(s2).indexOf(w) >= 0);
    const out = [], seen = {};
    MAILCFG.DIR.forEach(p => { if(p.e && hit(p.n+' '+p.e+' '+(p.title||''))){ seen[p.e.toLowerCase()] = 1; out.push({ id:p.id, n:p.n, e:p.e, sub:p.title||'' }); } });
    if(CT && CT.rows()) CT.search(q, 20).forEach(r => { if(!seen[r[1].toLowerCase()]){ const pp = CT.toPerson(r); out.push({ id:'x:'+r[1].toLowerCase(), n:pp.n, e:r[1], sub:[r[3]||r[2], r[4]].filter(Boolean).join(' · '), ct:r }); } });
    if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q) && !out.some(o => o.e.toLowerCase() === q.toLowerCase())) out.push({ id:'x:'+q.toLowerCase(), n:q, e:q, sub:'typed address' });
    if(!out.length) return '<span class="ml-cap">No match'+(CT && CT.rows() ? '' : ' (company contact list not loaded)')+'</span>';
    /* v4.195 — mỗi kết quả nói rõ người đó ĐÃ nằm ở To/CC chưa; bấm vào đúng chỗ họ đang ở thì không thêm lần nữa */
    return out.slice(0, 12).map(o => {
      const at = _rcpWhere(o.e), go = f => 'MAIL.rcpAdd(\''+esc(o.id)+'\',\''+f+'\',\''+esc(o.e)+'\',\''+esc(o.n)+'\')';
      const btn = f => at === f ? '<button class="on" disabled>✓ in '+(f === 'to' ? 'To' : 'CC')+'</button>'
                               : '<button onclick="'+go(f)+'">'+(at ? '→ ' : '+ ')+(f === 'to' ? 'To' : 'CC')+'</button>';
      return '<div class="ml-pop-r'+(at ? ' in' : '')+'"><div class="ml-pop-n"><b>'+esc(o.n)+'</b>'+(at ? ' <span class="ml-pop-at">already in '+(at === 'to' ? 'To' : 'CC')+'</span>' : '')+
        '<div class="ml-cap">'+esc(o.e)+(o.sub ? ' · '+esc(o.sub) : '')+'</div></div>'+btn('to')+btn('cc')+'</div>';
    }).join('') + '<div class="ml-pop-ft">A person is never sent the mail twice — one address appears once, To wins over CC. Esc to close.</div>';
  }
  function rcpFocus(){ if(typeof CONTACTS !== 'undefined') CONTACTS.load().then(() => { const el = $('mlRcpRes'); if(el) el.innerHTML = _rcpResults(); _placePop(); }); }
  function rcpSearch(q){ ST.rcpQ = q; const el = $('mlRcpRes'); if(el) el.innerHTML = _rcpResults(); _placePop(); }
  function rcpAdd(id, f, e, n){
    if(_rcpWhere(e) === f){ _toast('✓ '+n+' is already in '+(f === 'to' ? 'To' : 'CC')+' — not added twice', 'ok'); return; }
    const A = _adj();
    if(/^x:/.test(id) && !ST.adhoc[id]){
      const r = (typeof CONTACTS !== 'undefined') ? CONTACTS.byEmail(e) : null;
      ST.adhoc[id] = r ? Object.assign(CONTACTS.toPerson(r), { id }) : { id, n, vn:n, e, title:'' };
    }
    ['to','cc'].forEach(x => { const i = A[x].indexOf(id); if(i >= 0) A[x].splice(i, 1); });
    const k = A.rm.indexOf(id); if(k >= 0) A.rm.splice(k, 1);
    A[f].push(id); ST.rcpQ = '';
    _renderAll();
  }
  function rcpRm(id){
    const A = _adj();
    let hit = false;
    ['to','cc'].forEach(x => { const i = A[x].indexOf(id); if(i >= 0){ A[x].splice(i, 1); hit = true; } });
    if(!hit && A.rm.indexOf(id) < 0) A.rm.push(id);
    _renderAll();
  }
  function rcpReset(){ delete ST.adj[ST.rep]; _renderAll(); }
  /* cảnh báo chung của mọi thư (ngoài cảnh báo riêng từng báo cáo) */
  function _allWarn(o){
    const w = (o.warn || []).slice();
    const r = recipients(ST.rep);
    if(!meId()) w.push('Your login ('+esc(meEmail() || 'not logged in')+') is not in the recipient directory or the company contact list — you may stay in To/CC of your own mail. An admin can add you in 👥 Recipients.');
    if(r.noMail.length) w.push(r.noMail.length+' recipient(s) have no valid email address and are left out.');
    if(ST.rep === 'P6' && ST.bsWarn) ST.bsWarn.forEach(x => w.push('File: '+x));
    return w;
  }
  function _renderAll(){
    _renderNav();
    const rc = ST.view === 'rc';
    $('mlMain').style.display = rc ? 'none' : '';
    $('mlRcMain').style.display = rc ? '' : 'none';
    $('mlFt').style.display = rc ? 'none' : '';
    if(rc){ _renderRc(); return; }
    let o;
    if(!RP(ST.rep)){ ST.rep = 'P1'; ST.date = _defaultDate('P1'); }      /* v4.182 — email tự soạn vừa bị xoá */
    try{ o = RP(ST.rep).build(); }
    catch(e){ console.error('[MAIL]', e); o = { subject:'', body:'<p style="color:red">Error building report: '+esc(e.message)+'</p>', warn:['Report could not be built: '+e.message] }; }
    _cur = o;
    _renderOpts(); _renderRcp();
    $('mlSubj').value = o.subject;
    const w = _allWarn(o); ST.wN = w.length;
    $('mlFold').innerHTML = ST.cxHtml || ''; $('mlFold').style.maxHeight = ST.rep === 'P2' ? '46vh' : '';   /* v4.216 — bảng chọn xe huỷ cần chỗ hơn 130px */
    $('mlWarn').innerHTML = (w.length ? '<div class="ml-wh">⚠ '+w.length+' item(s) to check — you will be asked to confirm before sending</div>' : '<div class="ml-okh">✓ All data present</div>') +
      w.map(x=>'<div>• '+x+'</div>').join('') + (o.attach ? '<div class="ml-att">📎 Expected attachment: <b>'+esc(o.attach)+'</b></div>' : '');
    _renderChips(); _applyView();
    $('mlPrev').innerHTML = _polish(o.body);   /* v4.192 bảng thụt lề + dòng đệm · v4.181 — không kèm chữ ký (Outlook tự thêm) */
    ST.edited = false; $('mlEdited').textContent = '';
    _renderFiles();
  }
  function _renderFiles(){
    $('mlFiles').innerHTML = ST.files.map((f,i)=>'<span class="ml-chip">'+esc(f.name)+' <a onclick="MAIL.dropFile('+i+')">✕</a></span>').join('');
    const has = ST.files.length > 0;
    $('mlBtnEml').classList.toggle('ml-pri', has);
    $('mlBtnOpen').classList.toggle('ml-pri', !has);
  }

  /* ═════════ 👥 RECIPIENTS — sửa danh bạ / nhóm / tuyến gửi trên app ═════════ */
  function recips(){
    if(_dewDirty()){ _dewGuard(recips); return; }      /* v4.207 */
    ST.view = 'rc'; ST.rc = MAILCFG.snapshot(); ST.rcDirty = false; ST.ctImp = null; if(!ST.rcTab) ST.rcTab = _lsGet('lpg_v4_mail_rc_tab', 'group'); ST.ctQ = ST.ctQ || ''; ST.dirQ = ''; ST.ctNew = null;
    if(ST.dirSort === undefined) ST.dirSort = 'dept';          /* v4.183 — mặc định gom theo phòng ban: người mới thêm nằm đúng nhóm */
    if(typeof CONTACTS !== 'undefined') CONTACTS.setPreview(ST.rc.CTX);
    _renderAll();
    /* danh bạ công ty: 1 lần đọc meta/phiên, cache theo ver (xem contacts.js) */
    if(typeof CONTACTS !== 'undefined') CONTACTS.load().then(() => { if(ST.view === 'rc') _renderRc(); });
  }
  /* v4.174 — danh sách MẶC ĐỊNH (nhóm, tuyến gửi, danh bạ công ty) chỉ ADMIN được sửa;
     người khác thêm/bớt người nhận riêng cho từng thư ở màn hình soạn thư. */
  /* v4.178 — phòng ban / chức vụ của một người trong DIR: tra danh bạ công ty theo email (RAM).
     Không lưu vào mail_cfg — danh bạ đổi thì cột tự đổi theo. */
  function _ctInfo(p){
    const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null;
    const r = CT && p && p.e ? CT.byEmail(p.e) : null;
    if(!r) return null;
    const F = CT.F, dept = String(r[F.dept]||''), team = String(r[F.team]||'');
    const jt = String(r[F.title]||''), pos = String(r[F.pos]||'');
    return { dept: team && team !== dept ? dept+' · '+team : dept,
             pos: jt && jt !== 'x' && jt !== pos ? jt+' / '+pos : pos };
  }
  function _canEditRc(){ try{ return String((window.CURRENT_USER || {}).role || '') === 'admin'; }catch(_){ return false; } }
  function _rcValidate(c){
    const errs = [], seen = {};
    c.DIR.forEach(p => {
      if(!String(p.n||'').trim()) errs.push('A person has no name.');
      const e = String(p.e||'').trim().toLowerCase();
      if(e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errs.push(p.n+': invalid email "'+p.e+'".');
      if(e){ if(seen[e]) errs.push('Duplicate email '+e+' ('+seen[e]+' / '+p.n+').'); seen[e] = p.n; }
    });
    return errs;
  }
  function _renderRc(){
    const c = ST.rc, G = Object.keys(c.GROUPS), can = _canEditRc(), dis = can ? '' : ' disabled';
    const meta = MAILCFG.meta();
    const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null, cm = CT && CT.meta(), crow = CT && CT.rows();
    let h = '<div class="ml-rc-hd"><b>👥 Recipients</b> <span class="ml-cap">'+(meta.src === 'firebase' ? 'Saved by '+esc(meta.by)+' · '+new Date(meta.at).toLocaleString() : 'Default list (js/data/mailcfg.js) — not yet saved in the app')+'</span>'+
      '<span style="flex:1"></span>'+
      '<button class="ml-btn" onclick="MAIL.rcAdd()"'+dis+'>+ Add blank row</button>'+
      '<button class="ml-btn" onclick="MAIL.rcReset()"'+dis+' title="Discard the edits on this screen">↺ Undo edits</button>'+
      '<button class="ml-btn ml-pri" onclick="MAIL.rcSave()"'+dis+'>💾 Save for everyone</button></div>';
    /* ── danh bạ công ty ── */
    h += '<div class="ml-ct"><div class="ml-rc-hd"><b>📇 Company contact list</b> <span class="ml-cap">'+
      (crow ? crow.length+' people · list dated '+esc(cm && cm.upd || '?')+' · imported '+(cm ? new Date(cm.at).toLocaleDateString()+' by '+esc(cm.by) : '')+' · kept on this PC, re-downloaded only when a newer list is saved'
            : 'not loaded yet — import the HSVC Internal Contact List once; everyone then shares it')+'</span><span style="flex:1"></span>'+
      (crow ? '<button class="ml-btn" onclick="MAIL.rcCtToggle()" title="Search the whole company contact list">🔍 Search '+(ST.ctOpen ? '▴' : '▾')+'</button>' : '')+
      (can ? '<button class="ml-btn" onclick="MAIL.ctNewOpen()" title="Add someone who is not in the company file yet (e.g. new staff) — same columns as the Contact List">➕ New person</button>' : '')+
      '<label class="ml-file ml-file-in" title="Pick HSVC Internal Contact List (.xls/.xlsx). The app shows what changed; nothing is saved until you press Save.">📥 Import contact list<input type="file" accept=".xls,.xlsx" onchange="MAIL.ctImport(this)"'+dis+'></label></div>';
    h += _ctNewHtml() + _ctxListHtml();
    if(ST.ctImp){
      const d = ST.ctImp.diff, inDir = e => c.DIR.some(p => (p.e||'').toLowerCase() === e.toLowerCase());
      const gone = d.removed.filter(r => inDir(r[1]));
      h += '<div class="ml-ct-imp"><b>'+esc(ST.ctImp.file)+'</b> · '+ST.ctImp.rows.length+' people · dated '+esc(ST.ctImp.upd||'?')+' — '+
        (d.same ? 'identical to the saved list, nothing to save.' : '<b style="color:#15803d">+'+d.added.length+' new</b> · <b style="color:#b91c1c">−'+d.removed.length+' left</b> · <b>'+d.changed.length+' changed</b>')+
        (gone.length ? '<div class="ml-nomail">⚠ In our recipient list but NOT in the new contact list (left?): '+gone.map(r => esc(r[0])+' &lt;'+esc(r[1])+'&gt;').join(', ')+'</div>' : '')+
        (d.added.length ? '<div class="ml-cap">New: '+d.added.slice(0,15).map(r => esc(r[0])+' ('+esc(r[3]||r[2])+')').join(', ')+(d.added.length > 15 ? ' …' : '')+'</div>' : '')+
        '<div style="margin-top:4px"><button class="ml-btn" onclick="MAIL.ctCancel()">Cancel</button> '+
        (d.same ? '' : '<button class="ml-btn ml-pri" onclick="MAIL.ctSave()"'+dis+'>💾 Save contact list for everyone</button>')+'</div></div>';
    }
    if(crow && ST.ctOpen){
      const G = Object.keys(c.GROUPS);
      h += '<div class="ml-rc-hd"><label class="ml-in">🔍 <input id="mlCtQ" style="width:260px" placeholder="name, email, team, ext… (no accents needed)" value="'+esc(ST.ctQ)+'" oninput="MAIL.ctSearch(this.value)"></label>'+
        '<label class="ml-in">add to <select id="mlCtG">'+G.map(g => '<option value="'+g+'"'+(g === ST.ctG ? ' selected' : '')+'>'+g+' · '+esc(c.GROUPS[g].name)+'</option>').join('')+'<option value="">(directory only)</option></select></label></div>';
      h += '<div id="mlCtRes">'+_ctResults()+'</div>';
    }
    h += '</div>';
    if(!can) h += '<div class="ml-nomail">View only — only an administrator can change the default groups. To add or remove someone for one mail, do it in the mail itself (＋ add to this mail / ✕).</div>';
    const errs = _rcValidate(c);
    if(errs.length) h += '<div class="ml-nomail">'+errs.map(esc).join('<br>')+'</div>';
    /* v4.191 — xem theo nhóm / thư / người; hai ma trận cũ chỉ hiện khi chọn tab ▦ */
    const TABS = [['group','👥 By group','Pick a group: its members and the mails it gets'],['mail','✉ By mail','Pick a mail: who gets it as TO / CC — add a person directly'],
                  ['person','🔍 By person','Which groups a person is in and which mails they get — remove when they leave'],['matrix','▦ Matrices','The two big tables (mail × group, person × group) — everything at once']];
    const tab = TABS.some(t => t[0] === ST.rcTab) ? ST.rcTab : 'group';
    h += '<div class="ml-tabs">'+TABS.map(([k, l, t]) => '<button class="ml-tab'+(k === tab ? ' on' : '')+'" title="'+esc(t)+'" onclick="MAIL.rcTab(\''+k+'\')">'+l+'</button>').join('')+
      (ST.rcDirty ? '<span class="ml-rv-dirty">● unsaved changes — press 💾 Save for everyone</span>' : '')+'</div>';
    if(tab !== 'matrix'){
      h += tab === 'group' ? _rcByGroupHtml(can) : tab === 'mail' ? _rcByMailHtml(can) : _rcByPersonHtml();
      $('mlRcMain').innerHTML = h;
      return;
    }
    /* tuyến gửi */
    h += '<div class="ml-rc-sec ml-rc-hd">Who receives which mail — click a group to switch it between <b class="ml-tag to">TO</b>, <b class="ml-tag cc">CC</b> and off'+
      (can ? ' <button class="ml-mini" onclick="MAIL.rcGrpAdd()" title="Add a new recipient group (G…) — then tick its members in the Directory">+ Group</button>'+
             ' <button class="ml-mini" onclick="MAIL.rcMailAdd()" title="Add a new text-only mail (P…) — you write its subject and text; mails that need app data are built in code">+ Mail</button>' : '')+'</div>';
    /* v4.182 — nhóm G: đổi tên / xoá ngay trên tiêu đề cột */
    h += '<table class="ml-rc-tbl"><tr><th>Mail</th>'+G.map(g => '<th title="'+esc(c.GROUPS[g].name)+'">'+g+
      (can ? ' <a class="ml-rc-ic" title="Rename '+g+'" onclick="MAIL.rcGrpRen(\''+g+'\')">✎</a><a class="ml-rc-ic" title="Delete '+g+'" onclick="MAIL.rcGrpDel(\''+g+'\')">✕</a>' : '')+
      '<br><small>'+esc(c.GROUPS[g].name)+'</small> <small class="ml-rc-n">('+c.GROUPS[g].ids.length+')</small></th>').join('')+'</tr>';
    repKeys(c).forEach(k => {
      const rt = c.ROUTE[k] || { to:[], cc:[] }, R0 = RP(k, c);
      h += '<tr><td><b>'+k+'</b> '+esc(R0.ttl)+(R0.custom ? ' <span class="ml-tag cc" title="Text mail drafted in the app">text</span>'+
        (can ? ' <a class="ml-rc-ic" title="Rename" onclick="MAIL.rcMailRen(\''+k+'\')">✎</a><a class="ml-rc-ic" title="Delete this mail" onclick="MAIL.rcMailDel(\''+k+'\')">✕</a>' : '') : '')+'</td>'+G.map(g => {
        const st = rt.to.includes(g) ? 'to' : rt.cc.includes(g) ? 'cc' : '';
        return '<td class="ml-rc-cell '+st+'" onclick="'+(can ? 'MAIL.rcRoute(\''+k+'\',\''+g+'\')' : '')+'">'+(st ? st.toUpperCase() : '·')+'</td>';
      }).join('')+'</tr>';
      const extra = rt.to.concat(rt.cc).filter(x => !c.GROUPS[x]);
      if(extra.length) h += '<tr><td colspan="'+(G.length+1)+'" class="ml-cap">'+k+' also: '+extra.map(id => { const p = c.DIR.find(x => x.id === id); return (rt.to.includes(id) ? 'TO ' : 'CC ')+esc(p ? p.n : id); }).join(', ')+'</td></tr>';
    });
    h += '</table>';
    /* danh bạ */
    const HD = ST.rcHide || {}, COLS = [['dept','Department'],['pos','Position'],['e','Email'],['title','Title']];
    h += '<div class="ml-rc-sec ml-rc-hd">Directory — tick the groups each person belongs to <label class="ml-in" style="margin-left:10px" title="Name, email, department, team or position — no accents needed">filter <input style="width:200px" placeholder="e.g. cavern, sales, manager" value="'+esc(ST.dirQ||'')+'" oninput="MAIL.dirFilter(this.value)"></label>'+
      '<span class="ml-cap" style="margin-left:10px">columns</span>'+COLS.map(([k, l]) => '<button class="ml-colt'+(HD[k] ? '' : ' on')+'" title="'+(HD[k] ? 'Show' : 'Hide')+' '+l+'" onclick="MAIL.rcCol(\''+k+'\')">'+(HD[k] ? '☐ ' : '☑ ')+l+'</button>').join('')+'</div>';
    /* v4.178 — cột Department / Position đọc từ danh bạ công ty (RAM); bấm tiêu đề để sắp xếp */
    const srt = ST.dirSort || '', sth = (k, lbl, tip) => '<th class="ml-rc-sort'+(srt === k ? ' on' : '')+'" title="'+esc(tip)+'" onclick="MAIL.dirSort(\''+k+'\')">'+lbl+(srt === k ? ' ▾' : '')+'</th>';
    h += '<table class="ml-rc-tbl"><tr>'+sth('n','Name (as in Outlook)','Sort by name — click again for the original order')+
      (HD.dept ? '' : sth('dept','Department','From the company contact list (Department · Team). Sort to see who is in which department'))+
      (HD.pos ? '' : sth('pos','Position','From the company contact list (Korean staff: Job title / Position)'))+
      (HD.e ? '' : '<th>Email</th>')+(HD.title ? '' : '<th>Title</th>')+G.map(g => '<th title="'+esc(c.GROUPS[g].name)+'">'+g+'</th>').join('')+'<th></th></tr>';
    const dq = CT ? CT.ascii(ST.dirQ||'').toLowerCase() : '';
    let list = c.DIR.map((p, i) => ({ p, i, ci:_ctInfo(p) }));
    if(dq) list = list.filter(x => CT.ascii([x.p.n, x.p.e, x.p.title, x.ci && x.ci.dept, x.ci && x.ci.pos].filter(Boolean).join(' ')).toLowerCase().indexOf(dq) >= 0);
    if(srt){
      const key = x => srt === 'n' ? (x.p.n||'') : ((x.ci && x.ci[srt]) || '\uffff');   /* không có trong danh bạ ⇒ xuống cuối */
      list.sort((a, b) => key(a).localeCompare(key(b)) || (a.p.n||'').localeCompare(b.p.n||''));
    }
    list.forEach(({ p, i, ci }) => {
      /* dò người nghỉ việc: tính trong RAM từ danh bạ công ty (không đọc thêm Firebase) */
      const flag = crow && p.e && !/^vc9d20@/i.test(p.e) && !ci ? ' ml-rc-miss' : '';
      const na = '<span class="ml-cap" title="'+(crow ? 'Not in the company contact list' : 'Company contact list not loaded')+'">—</span>';
      /* v4.182 — chưa có trong danh bạ công ty ⇒ nút 📇+ mở form thêm tay, điền sẵn tên/email/chức danh */
      const addCt = can && crow && !ci && !/^vc9d20@/i.test(p.e||'') ? ' <a class="ml-rc-ic" title="Not in the company contact list — add this person to it by hand" onclick="MAIL.ctNewFrom('+i+')">📇+</a>' : '';
      h += '<tr class="'+flag+'"><td style="white-space:nowrap"><input value="'+esc(p.n)+'"'+dis+' onchange="MAIL.rcSet('+i+',\'n\',this.value)">'+addCt+'</td>'+
        (HD.dept ? '' : '<td class="ml-rc-ro" title="'+esc(ci && ci.dept || '')+'">'+(ci && ci.dept ? esc(ci.dept) : na)+'</td>')+
        (HD.pos ? '' : '<td class="ml-rc-ro" title="'+esc(ci && ci.pos || '')+'">'+(ci && ci.pos ? esc(ci.pos) : na)+'</td>')+
        (HD.e ? '' : '<td><input style="width:220px" value="'+esc(p.e)+'"'+dis+' onchange="MAIL.rcSet('+i+',\'e\',this.value)"'+(flag ? ' title="Not found in the contact list"' : '')+'></td>')+
        (HD.title ? '' : '<td><input style="width:130px" value="'+esc(p.title||'')+'"'+dis+' onchange="MAIL.rcSet('+i+',\'title\',this.value)"></td>')+
        G.map(g => '<td class="ml-rc-g"><input type="checkbox"'+(c.GROUPS[g].ids.includes(p.id) ? ' checked' : '')+dis+' onchange="MAIL.rcGroup('+i+',\''+g+'\',this.checked)"></td>').join('')+
        '<td><button class="ml-mini" title="Remove from the directory and every group"'+dis+' onclick="MAIL.rcDel('+i+')">✕</button></td></tr>';
    });
    if(!list.length) h += '<tr><td colspan="'+(G.length + 6 - COLS.filter(([k]) => HD[k]).length)+'" class="ml-cap">No match.</td></tr>';
    h += '</table>';
    if(crow) h += '<div class="ml-cap">Rows in red: address not in the company contact list (left the company? group mailbox? new staff not listed yet? — 📇+ adds a new colleague to the contact list by hand).</div>';
    $('mlRcMain').innerHTML = h;
  }
  /* ═════════ v4.191 — 👥 Recipients xem theo NHÓM / THƯ / NGƯỜI ═════════
     Hai ma trận cũ (tuyến gửi + Directory) nhìn đồng thời rất rối ⇒ thu vào tab ▦ Matrices.
     Mặc định mở tab 👥 By group: chọn MỘT nhóm → thấy thành viên + nhóm đó nhận TO/CC thư nào.
     ✉ By mail: thêm THẲNG một người vào TO/CC của một thư (ROUTE nhận cả id người, không cần nhóm).
     🔍 By person: gõ tên → người đó ở nhóm nào, nhận thư gì, qua đâu; gỡ khỏi mọi thứ khi nghỉ việc.
     Tất cả chỉ sửa ST.rc (RAM) — vẫn phải 💾 Save for everyone mới ghi mail_cfg. */
  function _rcPerson(id){ return (ST.rc.DIR || []).find(p => p.id === id) || null; }
  function _rcIdx(id){ return (ST.rc.DIR || []).findIndex(p => p.id === id); }
  function _rcGroupsOf(id){ const c = ST.rc; return Object.keys(c.GROUPS).filter(g => c.GROUPS[g].ids.includes(id)); }
  function _rcRt(k){ return ST.rc.ROUTE[k] || { to:[], cc:[] }; }
  /* thư một người nhận: TO/CC cuối cùng (TO thắng) + nhận qua nhóm nào / trực tiếp */
  function _rcMailsOf(id){
    const c = ST.rc, gs = _rcGroupsOf(id), out = [];
    repKeys(c).forEach(k => {
      const rt = _rcRt(k), via = f => rt[f].filter(r => r === id || gs.includes(r)), t = via('to'), cc = via('cc');
      if(t.length || cc.length) out.push({ k, f:t.length ? 'to' : 'cc', to:t, cc, direct:rt.to.includes(id) ? 'to' : rt.cc.includes(id) ? 'cc' : '' });
    });
    return out;
  }
  /* người nhận cuối cùng của một thư — không trùng, TO thắng CC */
  function _rcFinal(k){
    const c = ST.rc, rt = _rcRt(k), seen = {};
    const ex = f => { const o = []; rt[f].forEach(r => (c.GROUPS[r] ? c.GROUPS[r].ids : [r]).forEach(id => { if(!seen[id] && _rcPerson(id)){ seen[id] = 1; o.push(id); } })); return o; };
    const to = ex('to'); return { to, cc:ex('cc') };
  }
  function _rcMiss(p){ const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null; return !!(CT && CT.rows() && p && p.e && !/^vc9d20@/i.test(p.e) && !_ctInfo(p)); }
  function _rcPName(p, withMail){
    return '<a class="ml-rv-pn'+(_rcMiss(p) ? ' miss' : '')+'" title="See every group and mail of '+esc(p.n)+'" onclick="MAIL.rcFind(\''+esc(p.id)+'\')">'+esc(p.n || '(no name)')+'</a>'+
      (withMail ? ' <span class="ml-cap">'+(p.e ? esc(p.e) : '<span style="color:#b45309">no email</span>')+'</span>' : '');
  }
  function _seg(k, ref, st, can){
    return '<span class="ml-segs">'+['to','cc',''].map(f => '<button class="ml-seg'+(st === f ? ' on '+(f || 'off') : '')+'"'+(can ? '' : ' disabled')+
      ' title="'+(f ? 'Send '+k+' as '+f.toUpperCase() : 'Does not receive '+k)+'" onclick="MAIL.rcRouteSet(\''+k+'\',\''+esc(ref)+'\',\''+f+'\')">'+(f ? f.toUpperCase() : '—')+'</button>').join('')+'</span>';
  }
  function rcRouteSet(k, ref, f){
    if(!_rcNeed()) return;
    const rt = ST.rc.ROUTE[k] || (ST.rc.ROUTE[k] = { to:[], cc:[] });
    ['to','cc'].forEach(x => { const i = rt[x].indexOf(ref); if(i >= 0) rt[x].splice(i, 1); });
    if(f === 'to' || f === 'cc') rt[f].push(ref);
    ST.rcDirty = true; _renderRc();
  }
  function rcGrpMember(g, id, on){
    if(!g || !_rcNeed()) return;
    const ids = ST.rc.GROUPS[g] && ST.rc.GROUPS[g].ids; if(!ids) return;
    const i = ids.indexOf(id); if(on && i < 0) ids.push(id); if(!on && i >= 0) ids.splice(i, 1);
    ST.rcDirty = true; _renderRc();
  }
  function rcMailGrp(k, f){ const s = $('mlRvG'); if(s && s.value) rcRouteSet(k, s.value, f); }
  function rcTab(t){ ST.rcTab = t; _lsSet('lpg_v4_mail_rc_tab', t); _renderRc(); }
  function rcSel(kind, v){ if(kind === 'G') ST.rcSelG = v; else ST.rcSelM = v; _renderRc(); }
  function rcFind(id){ const p = _rcPerson(id); ST.rcTab = 'person'; ST.rcPQ = p ? p.n : ''; ST.rcPMiss = false; _renderRc(); }
  function rcDelId(id){ if(!_rcNeed()) return; const i = _rcIdx(id); if(i >= 0) rcDel(i); }
  function rcCtToggle(){ ST.ctOpen = !ST.ctOpen; _renderRc(); }
  /* ── ô chọn người: người đã có trong Directory trước, rồi tới danh bạ công ty ── */
  function _pickHtml(ctx, label){
    const q = (ST.pickQ || {})[ctx] || '';
    return '<div class="ml-pick"><label class="ml-in">🔍 '+label+' <input id="mlPick" style="width:260px" placeholder="name or email — no accents needed" value="'+esc(q)+'" oninput="MAIL.rcPickQ(\''+ctx+'\',this.value)"></label>'+
      '<div id="mlPickRes">'+_pickRes(ctx, q)+'</div></div>';
  }
  function _pickRes(ctx, q){
    const CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null, A = s => CT ? CT.ascii(String(s || '')).toLowerCase() : String(s || '').toLowerCase();
    const qq = A(q).trim();
    if(qq.length < 2) return '<span class="ml-cap">Type at least 2 letters — recipients already in the directory first, then the company contact list.</span>';
    const c = ST.rc, out = [];
    c.DIR.forEach(p => { if(A([p.n, p.vn, p.e].join(' ')).indexOf(qq) >= 0) out.push({ key:p.id, src:'dir', p }); });
    if(CT && CT.rows()) CT.search(q, 20).forEach(r => { if(!c.DIR.some(p => (p.e || '').toLowerCase() === String(r[1]).toLowerCase())) out.push({ key:r[1], src:'ct', r }); });
    if(!out.length) return '<span class="ml-cap">No match. New staff not in the company file yet? Use ➕ New person above.</span>';
    const kind = ctx.split(':')[0], ref = ctx.split(':')[1];
    return out.slice(0, 20).map(x => {
      const nm = x.p ? x.p.n : x.r[0], em = x.p ? x.p.e : x.r[1];
      const info = x.p ? (_rcGroupsOf(x.p.id).join(', ') || 'in directory, no group') : 'company list · '+[x.r[3] || x.r[2], x.r[4]].filter(Boolean).join(' · ');
      const go = f => 'MAIL.rcPickAdd(\''+ctx+'\',\''+esc(x.key)+'\',\''+x.src+'\',\''+f+'\')';
      let act;
      if(kind === 'g'){
        act = x.p && c.GROUPS[ref] && c.GROUPS[ref].ids.includes(x.p.id) ? '<span class="ml-ok">✓ already in '+ref+'</span>' : '<button class="ml-mini ml-mini-b" onclick="'+go('')+'">+ add to '+ref+'</button>';
      } else {
        const rt = _rcRt(ref), d = x.p ? (rt.to.includes(x.p.id) ? 'to' : rt.cc.includes(x.p.id) ? 'cc' : '') : '';
        act = '<button class="ml-mini ml-mini-b'+(d === 'to' ? ' on' : '')+'" onclick="'+go('to')+'">+ TO</button> <button class="ml-mini ml-mini-b'+(d === 'cc' ? ' on' : '')+'" onclick="'+go('cc')+'">+ CC</button>';
      }
      return '<div class="ml-pick-r"><b>'+esc(nm)+'</b> <span class="ml-cap">'+esc(em || 'no email')+' · '+esc(info)+'</span><span style="flex:1"></span>'+act+'</div>';
    }).join('');
  }
  function rcPickQ(ctx, v){ ST.pickQ = ST.pickQ || {}; ST.pickQ[ctx] = v; const el = $('mlPickRes'); if(el) el.innerHTML = _pickRes(ctx, v); }
  function rcPickAdd(ctx, key, src, f){
    if(!_rcNeed()) return;
    const c = ST.rc; let p;
    if(src === 'dir') p = _rcPerson(key);
    else {
      const r = CONTACTS.byEmail(key); if(!r) return;
      p = c.DIR.find(x => (x.e || '').toLowerCase() === key.toLowerCase());
      if(!p){ p = CONTACTS.toPerson(r); if(c.DIR.some(x => x.id === p.id)) p.id = p.id + '_' + Date.now().toString(36); c.DIR.push(p); }
    }
    if(!p) return;
    const kind = ctx.split(':')[0], ref = ctx.split(':')[1];
    if(kind === 'g'){ if(c.GROUPS[ref] && !c.GROUPS[ref].ids.includes(p.id)) c.GROUPS[ref].ids.push(p.id); _toast('+ '+p.n+' → '+ref+' — press 💾 Save for everyone to keep it', 'ok'); }
    else {
      const rt = c.ROUTE[ref] || (c.ROUTE[ref] = { to:[], cc:[] });
      ['to','cc'].forEach(x => { const i = rt[x].indexOf(p.id); if(i >= 0) rt[x].splice(i, 1); });
      rt[f].push(p.id); _toast('+ '+p.n+' → '+ref+' '+f.toUpperCase()+' (directly) — press 💾 Save for everyone to keep it', 'ok');
    }
    ST.rcDirty = true; _renderRc();
    const q = $('mlPick'); if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  /* ── 👥 By group ── */
  function _rcByGroupHtml(can){
    const c = ST.rc, G = Object.keys(c.GROUPS);
    if(!ST.rcSelG || !c.GROUPS[ST.rcSelG]) ST.rcSelG = G[0] || '';
    let h = '<div class="ml-rv"><div class="ml-rv-side">'+G.map(g => {
      const n = repKeys(c).filter(k => _rcRt(k).to.includes(g) || _rcRt(k).cc.includes(g)).length;
      return '<button class="ml-rv-it'+(g === ST.rcSelG ? ' on' : '')+'" onclick="MAIL.rcSel(\'G\',\''+g+'\')"><b>'+g+'</b> '+esc(c.GROUPS[g].name)+
        '<small>'+c.GROUPS[g].ids.length+' people · '+n+' mail'+(n === 1 ? '' : 's')+'</small></button>'; }).join('')+
      (can ? '<button class="ml-btn" onclick="MAIL.rcGrpAdd()">+ New group</button>' : '')+'</div>';
    const g = ST.rcSelG;
    if(!g) return h + '<div class="ml-rv-main ml-cap">No group yet.</div></div>';
    const grp = c.GROUPS[g];
    h += '<div class="ml-rv-main"><div class="ml-rc-hd"><b class="ml-rv-ttl">'+g+' · '+esc(grp.name)+'</b><span class="ml-cap">'+grp.ids.length+' member(s)</span><span style="flex:1"></span>'+
      (can ? '<button class="ml-mini" onclick="MAIL.rcGrpRen(\''+g+'\')">✎ Rename</button> <button class="ml-mini" onclick="MAIL.rcGrpDel(\''+g+'\')">✕ Delete group</button>' : '')+'</div>';
    h += '<div class="ml-rc-sec">✉ Mails this group receives</div><table class="ml-rc-tbl ml-rv-tbl">';
    repKeys(c).forEach(k => { const rt = _rcRt(k), st = rt.to.includes(g) ? 'to' : rt.cc.includes(g) ? 'cc' : '';
      h += '<tr class="'+(st ? '' : 'ml-rv-off')+'"><td><b>'+k+'</b> '+esc(RP(k, c).ttl)+'</td><td>'+_seg(k, g, st, can)+'</td></tr>'; });
    h += '</table>';
    h += '<div class="ml-rc-sec">👤 Members</div><table class="ml-rc-tbl ml-rv-tbl"><tr><th>Name</th><th>Email</th><th>Department / position</th><th>Also in</th><th></th></tr>';
    grp.ids.forEach(id => {
      const p = _rcPerson(id);
      if(!p){ h += '<tr class="ml-rc-miss"><td colspan="4">Unknown id '+esc(id)+' (not in the directory)</td><td>'+(can ? '<button class="ml-mini" onclick="MAIL.rcGrpMember(\''+g+'\',\''+esc(id)+'\',false)">✕</button>' : '')+'</td></tr>'; return; }
      const ci = _ctInfo(p), other = _rcGroupsOf(id).filter(x => x !== g);
      h += '<tr class="'+(_rcMiss(p) ? 'ml-rc-miss' : '')+'"><td>'+_rcPName(p)+'</td><td>'+(p.e ? esc(p.e) : '<span style="color:#b45309">no email</span>')+'</td>'+
        '<td class="ml-rc-ro">'+esc(ci ? [ci.dept, ci.pos].filter(Boolean).join(' — ') : (p.title || ''))+'</td>'+
        '<td>'+other.map(x => '<span class="ml-chip">'+x+'</span>').join('')+'</td>'+
        '<td>'+(can ? '<button class="ml-mini" title="Remove from '+g+' only (stays in the directory and other groups)" onclick="MAIL.rcGrpMember(\''+g+'\',\''+esc(id)+'\',false)">✕ remove</button>' : '')+'</td></tr>';
    });
    if(!grp.ids.length) h += '<tr><td colspan="5" class="ml-cap">No member yet — search below to add.</td></tr>';
    h += '</table>';
    if(can) h += _pickHtml('g:'+g, 'Add a member to '+g);
    return h + '</div></div>';
  }
  /* ── ✉ By mail ── */
  function _rcByMailHtml(can){
    const c = ST.rc, K = repKeys(c);
    if(!ST.rcSelM || K.indexOf(ST.rcSelM) < 0) ST.rcSelM = K[0];
    let h = '<div class="ml-rv"><div class="ml-rv-side">'+K.map(k => { const F = _rcFinal(k);
      return '<button class="ml-rv-it'+(k === ST.rcSelM ? ' on' : '')+'" onclick="MAIL.rcSel(\'M\',\''+k+'\')"><b>'+k+'</b> '+esc(RP(k, c).ttl)+
        '<small>TO '+F.to.length+' · CC '+F.cc.length+'</small></button>'; }).join('')+
      (can ? '<button class="ml-btn" onclick="MAIL.rcMailAdd()">+ New text mail</button>' : '')+'</div>';
    const k = ST.rcSelM, rt = _rcRt(k), R0 = RP(k, c);
    h += '<div class="ml-rv-main"><div class="ml-rc-hd"><b class="ml-rv-ttl">'+k+' · '+esc(R0.ttl)+'</b><span style="flex:1"></span>'+
      (R0.custom && can ? '<button class="ml-mini" onclick="MAIL.rcMailRen(\''+k+'\')">✎ Rename</button> <button class="ml-mini" onclick="MAIL.rcMailDel(\''+k+'\')">✕ Delete mail</button>' : '')+'</div>';
    ['to','cc'].forEach(f => {
      h += '<div class="ml-rc-sec"><b class="ml-tag '+f+'">'+f.toUpperCase()+'</b></div>';
      if(!rt[f].length){ h += '<div class="ml-cap">— nobody —</div>'; return; }
      h += '<table class="ml-rc-tbl ml-rv-tbl">'+rt[f].map(r => {
        if(c.GROUPS[r]){
          const ids = c.GROUPS[r].ids.map(_rcPerson).filter(Boolean);
          return '<tr><td style="white-space:nowrap"><a class="ml-rv-pn" onclick="MAIL.rcSel(\'G\',\''+r+'\');MAIL.rcTab(\'group\')" title="Open this group">👥 <b>'+r+'</b> '+esc(c.GROUPS[r].name)+'</a> <span class="ml-rc-n">('+ids.length+')</span></td>'+
            '<td class="ml-cap">'+ids.map(p => esc(p.n)).join(', ')+'</td><td>'+_seg(k, r, f, can)+'</td></tr>';
        }
        const p = _rcPerson(r);
        return '<tr><td style="white-space:nowrap">👤 '+(p ? _rcPName(p) : esc(r)+' <span class="ml-cap">(not in directory)</span>')+' <span class="ml-tag cc" title="Added to this mail directly, not through a group">direct</span></td>'+
          '<td class="ml-cap">'+esc(p && p.e || '')+'</td><td>'+_seg(k, r, f, can)+'</td></tr>';
      }).join('')+'</table>';
    });
    if(can){
      const free = Object.keys(c.GROUPS).filter(g => !rt.to.includes(g) && !rt.cc.includes(g));
      if(free.length) h += '<div class="ml-rc-hd"><label class="ml-in">Add a group <select id="mlRvG">'+free.map(g => '<option value="'+g+'">'+g+' · '+esc(c.GROUPS[g].name)+'</option>').join('')+'</select></label>'+
        '<button class="ml-mini ml-mini-b" onclick="MAIL.rcMailGrp(\''+k+'\',\'to\')">+ TO</button><button class="ml-mini ml-mini-b" onclick="MAIL.rcMailGrp(\''+k+'\',\'cc\')">+ CC</button></div>';
      h += _pickHtml('m:'+k, 'Add a person directly (no group needed)');
    }
    const F = _rcFinal(k), nm = id => { const p = _rcPerson(id); return (p.e ? '' : '⚠ ')+esc(p.n); };
    h += '<div class="ml-rv-fin"><b>Final list ('+(F.to.length + F.cc.length)+' people, no duplicates — TO wins over CC):</b><br>'+
      '<b class="ml-tag to">TO</b> '+(F.to.map(nm).join(', ') || '—')+'<br><b class="ml-tag cc">CC</b> '+(F.cc.map(nm).join(', ') || '—')+
      '<div class="ml-cap">The person sending is taken out automatically. ⚠ = no email yet (left out of the mail).</div></div>';
    return h + '</div></div>';
  }
  /* ── 🔍 By person ── */
  function _rcByPersonHtml(){
    const c = ST.rc, nMiss = c.DIR.filter(_rcMiss).length;
    return '<div class="ml-rv-main"><div class="ml-rc-hd"><label class="ml-in">🔍 Person <input id="mlPQ" style="width:280px" placeholder="name, email, department — no accents needed" value="'+esc(ST.rcPQ || '')+'" oninput="MAIL.rcPQ(this.value)"></label>'+
      '<button class="ml-colt'+(ST.rcPMiss ? ' on' : '')+'" title="People in our recipient list whose email is NOT in the company contact list — left the company?" onclick="MAIL.rcPMissT()">⚠ Not in company list ('+nMiss+')</button>'+
      '<button class="ml-colt'+(ST.rcPAll ? ' on' : '')+'" onclick="MAIL.rcPAllT()">Show everyone ('+c.DIR.length+')</button></div>'+
      '<div id="mlPRes">'+_rcPersonRes()+'</div></div>';
  }
  function _rcPersonRes(){
    const c = ST.rc, can = _canEditRc(), CT = (typeof CONTACTS !== 'undefined') ? CONTACTS : null;
    const A = s => CT ? CT.ascii(String(s || '')).toLowerCase() : String(s || '').toLowerCase(), qq = A(ST.rcPQ).trim();
    let L = c.DIR.slice();
    if(ST.rcPMiss) L = L.filter(_rcMiss);
    if(qq) L = L.filter(p => { const ci = _ctInfo(p); return A([p.n, p.vn, p.e, p.title, ci && ci.dept, ci && ci.pos].filter(Boolean).join(' ')).indexOf(qq) >= 0; });
    else if(!ST.rcPMiss && !ST.rcPAll) return '<div class="ml-cap">Type a name to see which groups the person is in and which mails they get — and remove them everywhere when they leave.</div>';
    if(!L.length) return '<div class="ml-cap">No one in the recipient list matches.'+(qq ? ' (Only people already in the recipient directory are shown — add new people from 👥 By group or ✉ By mail.)' : '')+'</div>';
    return L.slice(0, 40).map(p => {
      const ci = _ctInfo(p), gs = _rcGroupsOf(p.id), ms = _rcMailsOf(p.id), miss = _rcMiss(p), i = _rcIdx(p.id);
      const free = Object.keys(c.GROUPS).filter(g => !gs.includes(g));
      return '<div class="ml-pc'+(miss ? ' miss' : '')+'"><div class="ml-rc-hd"><b style="font-size:13px">'+esc(p.n)+'</b>'+(p.vn && p.vn !== p.n ? ' <span class="ml-cap">'+esc(p.vn)+'</span>' : '')+
        ' <span class="ml-cap">'+(p.e ? esc(p.e) : '<span style="color:#b45309">no email</span>')+(ci ? ' · '+esc([ci.dept, ci.pos].filter(Boolean).join(' — ')) : '')+'</span>'+
        (miss ? ' <span class="ml-nomail">⚠ not in the company contact list — left the company?</span>'+(can && i >= 0 ? ' <a class="ml-rc-ic" title="New staff not listed yet — add to the contact list by hand" onclick="MAIL.ctNewFrom('+i+')">📇+</a>' : '') : '')+
        '<span style="flex:1"></span>'+(can ? '<button class="ml-mini ml-mini-r" title="Remove from the directory, every group and every mail" onclick="MAIL.rcDelId(\''+esc(p.id)+'\')">✕ Remove everywhere (left)</button>' : '')+'</div>'+
        '<div><span class="ml-cap">Groups:</span> '+(gs.map(g => '<span class="ml-chip" title="'+esc(c.GROUPS[g].name)+'">'+g+' · '+esc(c.GROUPS[g].name)+
          (can ? ' <a title="Remove from '+g+'" onclick="MAIL.rcGrpMember(\''+g+'\',\''+esc(p.id)+'\',false)">✕</a>' : '')+'</span>').join('') || '<span class="ml-cap">none</span>')+
          (can && free.length ? ' <select class="ml-rv-sel" onchange="MAIL.rcGrpMember(this.value,\''+esc(p.id)+'\',true)"><option value="">+ add to group…</option>'+free.map(g => '<option value="'+g+'">'+g+' · '+esc(c.GROUPS[g].name)+'</option>').join('')+'</select>' : '')+'</div>'+
        '<div><span class="ml-cap">Receives:</span> '+(ms.map(m => '<span class="ml-chip ml-chip-'+m.f+'" title="'+esc(RP(m.k, c).ttl)+'"><b>'+m.k+'</b> '+m.f.toUpperCase()+
          ' <small>via '+m.to.concat(m.cc).map(r => r === p.id ? 'direct' : r).join(', ')+'</small>'+
          (can && m.direct ? ' <a title="Remove the direct entry from '+m.k+'" onclick="MAIL.rcRouteSet(\''+m.k+'\',\''+esc(p.id)+'\',\'\')">✕</a>' : '')+'</span>').join('') || '<span class="ml-cap">no mail</span>')+'</div></div>';
    }).join('') + (L.length > 40 ? '<div class="ml-cap">… '+(L.length - 40)+' more — narrow the search.</div>' : '');
  }
  function rcPQ(v){ ST.rcPQ = v; const el = $('mlPRes'); if(el) el.innerHTML = _rcPersonRes(); }
  function rcPMissT(){ ST.rcPMiss = !ST.rcPMiss; if(ST.rcPMiss) ST.rcPAll = false; _renderRc(); }
  function rcPAllT(){ ST.rcPAll = !ST.rcPAll; if(ST.rcPAll) ST.rcPMiss = false; _renderRc(); }
  function rcSet(i, f, v){ const p = ST.rc.DIR[i]; if(!p) return; p[f] = String(v||'').trim(); if(f === 'n' && !p.vn) p.vn = p.n; ST.rcDirty = true; _renderRc(); }
  function rcGroup(i, g, on){
    const p = ST.rc.DIR[i], ids = ST.rc.GROUPS[g].ids, k = ids.indexOf(p.id);
    if(on && k < 0) ids.push(p.id); if(!on && k >= 0) ids.splice(k, 1);
    ST.rcDirty = true; _renderRc();
  }
  function rcSender(i, on){ const id = ST.rc.DIR[i].id, s = ST.rc.SENDERS, k = s.indexOf(id); if(on && k < 0) s.push(id); if(!on && k >= 0) s.splice(k, 1); ST.rcDirty = true; _renderRc(); }
  function rcRoute(rep, g){
    const rt = ST.rc.ROUTE[rep] || (ST.rc.ROUTE[rep] = { to:[], cc:[] });
    const inTo = rt.to.indexOf(g), inCc = rt.cc.indexOf(g);
    if(inTo >= 0){ rt.to.splice(inTo, 1); rt.cc.push(g); }          /* TO → CC */
    else if(inCc >= 0){ rt.cc.splice(inCc, 1); }                    /* CC → off */
    else rt.to.push(g);                                              /* off → TO */
    ST.rcDirty = true; _renderRc();
  }
  function rcAdd(){ const id = 'p' + Date.now().toString(36); ST.rc.DIR.push({ id, n:'', vn:'', e:'', title:'', sex:'' }); ST.rcDirty = true; _renderRc(); }
  function rcDel(i){
    const p = ST.rc.DIR[i]; if(!p) return;
    if(!confirm('Remove '+(p.n||'this person')+' from the directory and from every group?')) return;
    ST.rc.DIR.splice(i, 1);
    Object.values(ST.rc.GROUPS).forEach(g => { const k = g.ids.indexOf(p.id); if(k >= 0) g.ids.splice(k, 1); });
    Object.values(ST.rc.ROUTE).forEach(rt => ['to','cc'].forEach(f => { const k = rt[f].indexOf(p.id); if(k >= 0) rt[f].splice(k, 1); }));
    const k = ST.rc.SENDERS.indexOf(p.id); if(k >= 0) ST.rc.SENDERS.splice(k, 1);
    ST.rcDirty = true; _renderRc();
  }
  function rcReset(){ ST.rc = MAILCFG.snapshot(); ST.rcDirty = false; ST.ctNew = null; if(typeof CONTACTS !== 'undefined') CONTACTS.setPreview(ST.rc.CTX); _renderRc(); }
  function rcSave(){
    if(!_canEditRc()){ _toast('⛔ Only an administrator can change the default recipient list', 'er'); return; }
    const errs = _rcValidate(ST.rc);
    if(errs.length){ _toast('⚠ Fix the list first: '+errs[0], 'er'); return; }
    ST.rc.DIR.forEach(p => { if(!p.vn) p.vn = p.n; });
    MAILCFG.save(ST.rc).then(() => { ST.rcDirty = false; ST.rc = MAILCFG.snapshot(); if(typeof CONTACTS !== 'undefined') CONTACTS.setPreview(ST.rc.CTX); _toast('💾 Recipient list saved for everyone', 'ok'); _renderAll(); })
      .catch(e => _toast('⚠ Save failed: '+e.message, 'er'));
  }
  /* ── danh bạ công ty: tìm (RAM), thêm vào danh sách, import file ── */
  function _ctResults(){
    const CT = CONTACTS, c = ST.rc;
    if(!ST.ctQ || ST.ctQ.trim().length < 2) return '<div class="ml-cap">Type at least 2 letters to search '+(CT.rows() || []).length+' people.</div>';
    const res = CT.search(ST.ctQ, 30);
    if(!res.length) return '<div class="ml-cap">No match.</div>';
    const can = _canEditRc();
    return '<table class="ml-rc-tbl"><tr><th>Name</th><th>Email</th><th>Department / team</th><th>Position</th><th>Ext · Mobile</th><th></th></tr>'+
      res.map(r => {
        const p = c.DIR.find(x => (x.e||'').toLowerCase() === r[1].toLowerCase());
        const grp = p ? Object.keys(c.GROUPS).filter(g => c.GROUPS[g].ids.includes(p.id)).join(', ') : '';
        return '<tr><td>'+esc(r[0])+(CT.isManual(r) ? ' <span class="ml-tag cc" title="Added by hand — not in the company file">hand</span>' : '')+'</td><td>'+esc(r[1])+'</td><td>'+esc([r[2], r[3]].filter(Boolean).join(' · '))+'</td><td>'+esc(r[5] && r[5] !== 'x' ? r[5]+' / '+r[4] : r[4])+'</td>'+
          '<td>'+esc([r[6], r[7]].filter(Boolean).join(' · '))+'</td><td>'+
          (p ? '<span class="ml-ok">✓ in list'+(grp ? ' ('+grp+')' : '')+'</span> ' : '')+
          (can ? '<button class="ml-mini" onclick="MAIL.ctAdd(\''+esc(r[1])+'\')">'+(p ? '+ group' : '+ Add')+'</button>' : '')+'</td></tr>';
      }).join('')+'</table>';
  }
  function ctSearch(q){ ST.ctQ = q; const el = $('mlCtRes'); if(el) el.innerHTML = _ctResults(); }
  function ctAdd(email){
    const r = CONTACTS.byEmail(email); if(!r) return;
    const g = ($('mlCtG') || {}).value || ''; ST.ctG = g;
    const c = ST.rc;
    let p = c.DIR.find(x => (x.e||'').toLowerCase() === email.toLowerCase());
    if(!p){
      p = CONTACTS.toPerson(r);
      if(c.DIR.some(x => x.id === p.id)) p.id = p.id + '_' + Date.now().toString(36);
      c.DIR.push(p);
    }
    if(g && c.GROUPS[g] && !c.GROUPS[g].ids.includes(p.id)) c.GROUPS[g].ids.push(p.id);
    ST.rcDirty = true;
    _toast('+ '+p.n+(g ? ' → '+g : '')+' — press 💾 Save for everyone to keep it', 'ok');
    _renderRc();
    const q = $('mlCtQ'); if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  async function ctImport(inp){
    const f = inp.files && inp.files[0]; inp.value = ''; if(!f) return;
    try{
      await CONTACTS.load();
      const r = await CONTACTS.readFile(f);
      ST.ctImp = { file:f.name, rows:r.rows, upd:r.upd, diff:CONTACTS.diff(r.rows) };
      _renderRc();
    }catch(e){ _toast('⚠ Cannot read '+f.name+': '+e.message, 'er'); }
  }
  function ctCancel(){ ST.ctImp = null; _renderRc(); }
  function ctSave(){
    const I = ST.ctImp; if(!I) return;
    CONTACTS.save({ rows:I.rows, upd:I.upd }, I.file)
      .then(res => { ST.ctImp = null; _toast(res.skipped ? 'Contact list unchanged — nothing written' : '💾 Contact list saved ('+I.rows.length+' people)', 'ok'); _renderRc(); })
      .catch(e => _toast('⚠ Save failed: '+e.message, 'er'));
  }
  /* ═════════ v4.182 — nhóm G · email P tự soạn · ẩn cột · thêm tay danh bạ ═════════ */
  function _nextKey(pre, keys){ let n = 0; keys.forEach(k => { const m = String(k).match(new RegExp('^'+pre+'(\\d+)$')); if(m) n = Math.max(n, +m[1]); }); return pre + (n + 1); }
  function _rcNeed(){ if(!_canEditRc()){ _toast('⛔ Only an administrator can change this', 'er'); return false; } return true; }
  function rcGrpAdd(){
    if(!_rcNeed()) return;
    const c = ST.rc, nm = prompt('Name of the new recipient group (e.g. Maintenance, HSE):', '');
    if(nm == null || !nm.trim()) return;
    const g = _nextKey('G', Object.keys(c.GROUPS));
    c.GROUPS[g] = { name:nm.trim(), ids:[] };
    ST.rcDirty = true; _toast('+ '+g+' · '+nm.trim()+' — tick its members in the Directory, set TO/CC per mail, then 💾 Save for everyone', 'ok');
    _renderRc();
  }
  function rcGrpRen(g){
    if(!_rcNeed()) return;
    const c = ST.rc, nm = prompt('New name for '+g+':', c.GROUPS[g].name);
    if(nm == null || !nm.trim()) return;
    c.GROUPS[g].name = nm.trim(); ST.rcDirty = true; _renderRc();
  }
  function rcGrpDel(g){
    if(!_rcNeed()) return;
    const c = ST.rc, used = Object.keys(c.ROUTE).filter(k => c.ROUTE[k].to.includes(g) || c.ROUTE[k].cc.includes(g));
    if(!confirm('Delete group '+g+' · '+c.GROUPS[g].name+'?\n'+c.GROUPS[g].ids.length+' member(s) stay in the Directory.'+(used.length ? '\nIt is removed from: '+used.join(', ') : ''))) return;
    delete c.GROUPS[g];
    Object.values(c.ROUTE).forEach(rt => ['to','cc'].forEach(f => { const k = rt[f].indexOf(g); if(k >= 0) rt[f].splice(k, 1); }));
    if(ST.ctG === g) ST.ctG = '';
    ST.rcDirty = true; _renderRc();
  }
  function rcMailAdd(){
    if(!_rcNeed()) return;
    const c = ST.rc, nm = prompt('Name of the new mail (e.g. Monthly Odorant Stock):', '');
    if(nm == null || !nm.trim()) return;
    c.MAILS = c.MAILS || {};
    const k = _nextKey('P', Object.keys(REPORTS).concat(Object.keys(c.MAILS)));
    c.MAILS[k] = { ttl:nm.trim(), subj:'[LPGT] '+nm.trim()+' – {date}', body:'Dear Sir,\n\nI would like to send the '+nm.trim()+' on {long} as below.\n\n- \n\nThank you.', attach:'' };
    c.ROUTE[k] = { to:[], cc:[] };
    ST.rcDirty = true; _toast('+ '+k+' — click TO / CC for its groups, 💾 Save for everyone, then open '+k+' to write its text', 'ok');
    _renderRc();
  }
  function rcMailRen(k){
    if(!_rcNeed()) return;
    const m = (ST.rc.MAILS || {})[k]; if(!m) return;
    const nm = prompt('New name for '+k+':', m.ttl);
    if(nm == null || !nm.trim()) return;
    m.ttl = nm.trim(); ST.rcDirty = true; _renderRc();
  }
  function rcMailDel(k){
    if(!_rcNeed()) return;
    const m = (ST.rc.MAILS || {})[k]; if(!m) return;
    if(!confirm('Delete mail '+k+' · '+m.ttl+' (its text and recipients)?')) return;
    delete ST.rc.MAILS[k]; delete ST.rc.ROUTE[k];
    ST.rcDirty = true; _renderRc();
  }
  /* ẩn / hiện cột Directory — tiện ích theo máy (localStorage), không phải dữ liệu chung */
  function rcCol(k){ ST.rcHide = Object.assign({}, ST.rcHide); if(ST.rcHide[k]) delete ST.rcHide[k]; else ST.rcHide[k] = 1; _lsSet('lpg_v4_mail_rc_hide', ST.rcHide); _renderRc(); }
  /* email tự soạn — sửa chữ ở màn soạn thư, lưu thẳng mail_cfg.MAILS (cả bộ cfg như Save for everyone) */
  function cxEdit(){ const m = MAILCFG.MAILS[ST.rep]; if(!m || !_rcNeed()) return; ST.cx = Object.assign({ k:ST.rep }, m); _renderAll(); }
  function cxSet(f, v){ if(ST.cx) ST.cx[f] = v; }
  function cxCancel(){ ST.cx = null; _renderAll(); }
  function cxPreview(){
    const x = ST.cx; if(!x) return;
    $('mlSubj').value = tplFill(x.subj);
    $('mlPrev').innerHTML = _polish(txt2html(tplFill(x.body))) || '<p>&nbsp;</p>';
  }
  function cxSave(){
    const x = ST.cx; if(!x || !_rcNeed()) return;
    if(!String(x.ttl||'').trim()){ _toast('⚠ The mail needs a name', 'er'); return; }
    const cfg = MAILCFG.snapshot(); cfg.MAILS = cfg.MAILS || {};
    if(!cfg.MAILS[x.k]){ _toast('⚠ '+x.k+' no longer exists', 'er'); return; }
    cfg.MAILS[x.k] = { ttl:String(x.ttl).trim(), subj:String(x.subj||''), body:String(x.body||''), attach:String(x.attach||'') };
    MAILCFG.save(cfg).then(() => { ST.cx = null; _toast('💾 '+x.k+' text saved for everyone', 'ok'); _renderAll(); })
      .catch(e => _toast('⚠ Save failed: '+e.message, 'er'));
  }
  /* thêm TAY người vào danh bạ công ty — cùng cột với file Contact List */
  const CT_FORM = [['vn','Full name (with accents)','as in the contact list',190],['e','Email','name@hyosung.com',190],['dept','Department','e.g. LPG Terminal',130],
    ['team','Team / Section','e.g. Cavern Process',130],['pos','Position','e.g. Engineer',110],['title','Job title (Korean staff)','',110],
    ['ext','Extension','',60],['hp','Mobile','',100]];
  function ctNewOpen(pre){ if(!_rcNeed()) return; ST.ctNew = Object.assign({ vn:'', e:'', dept:'', team:'', pos:'', title:'', ext:'', hp:'', sex:'' }, pre || {}); _renderRc(); }
  function ctNewFrom(i){
    const p = ST.rc.DIR[i]; if(!p) return;
    ctNewOpen({ vn:p.vn || p.n, e:p.e || '', pos:p.title || '', sex:p.sex || '', hp:p.hp || '', _i:i });
    const el = document.querySelector('#mlRcMain .ml-ct'); if(el && el.scrollIntoView) el.scrollIntoView({ block:'nearest' });
  }
  function ctNewSet(f, v){ if(ST.ctNew){ ST.ctNew[f] = v; if(ST.ctNew._err) ST.ctNew._err = ''; } }
  function ctNewCancel(){ ST.ctNew = null; _renderRc(); }
  function _ctNewHtml(){
    const x = ST.ctNew; if(!x) return '';
    const G = Object.keys(ST.rc.GROUPS);
    return '<div class="ml-ct-imp"><b>➕ New person — not in the company contact list</b> <span class="ml-cap">Same columns as the HSVC Internal Contact List. Kept with the recipient list (💾 Save for everyone); if a later company file lists the same email, the file wins.</span>'+
      '<div class="ml-rc-hd" style="margin-top:4px">'+CT_FORM.map(([k, l, ph, w]) => '<label class="ml-in">'+l+' <input style="width:'+w+'px" placeholder="'+esc(ph)+'" value="'+esc(x[k]||'')+'" oninput="MAIL.ctNewSet(\''+k+'\',this.value)"></label>').join('')+
      '<label class="ml-in">Sex <select onchange="MAIL.ctNewSet(\'sex\',this.value)">'+['','Male','Female'].map(v => '<option'+(x.sex === v ? ' selected' : '')+'>'+v+'</option>').join('')+'</select></label>'+
      '<label class="ml-in">add to <select id="mlCtNewG" onchange="MAIL.ctNewSet(\'g\',this.value)">'+G.map(g => '<option value="'+g+'"'+(x.g === g ? ' selected' : '')+'>'+g+' · '+esc(ST.rc.GROUPS[g].name)+'</option>').join('')+'<option value=""'+(x.g ? '' : ' selected')+'>(directory only)</option></select></label></div>'+
      '<div style="margin-top:4px"><button class="ml-btn" onclick="MAIL.ctNewCancel()">Cancel</button> <button class="ml-btn ml-pri" onclick="MAIL.ctNewAdd()">➕ Add to contact list</button>'+
      (x._err ? ' <b style="color:#c62828">'+esc(x._err)+'</b>' : '')+'</div></div>';
  }
  function _ctxListHtml(){
    const X = ST.rc.CTX || []; if(!X.length) return '';
    return '<div class="ml-cap">Added by hand ('+X.length+'): '+X.map((r, j) => {
      const dup = CONTACTS.inCompany(r[1]);
      return '<span class="ml-chip'+(dup ? ' add' : '')+'" title="'+esc([r[1], r[2], r[3], r[4]].filter(Boolean).join(' · '))+(dup ? ' — now in the company file too: this hand entry can be removed' : '')+'">'+esc(r[0])+(dup ? ' ✓ in company file' : '')+
        (_canEditRc() ? ' <a title="Remove the hand-added entry (the person stays in the Directory)" onclick="MAIL.ctxDel('+j+')">✕</a>' : '')+'</span>';
    }).join(' ')+'</div>';
  }
  function ctNewAdd(){
    const x = ST.ctNew, c = ST.rc; if(!x || !_rcNeed()) return;
    const T = k => String(x[k] || '').trim();
    /* v4.190 — gõ mỗi mã NV (vd. cuong44260062) ⇒ tự thêm @hyosung.com như mọi email công ty */
    let e = T('e'); if(e && !/@/.test(e)){ e = e + '@hyosung.com'; x.e = e; }
    const bad = m => { x._err = m; _toast(m, 'er'); _renderRc(); };
    if(!T('vn')) return bad('⚠ Full name is required');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return bad('⚠ A valid email is required (e.g. name@hyosung.com)');
    if(CONTACTS.byEmail(e)) return bad('⚠ '+e+' is already in the contact list');
    const g = ($('mlCtNewG') || {}).value || x.g || '';
    const row = [T('vn'), e, T('dept'), T('team'), T('pos'), T('title'), T('ext'), T('hp'), T('sex'), 'Manual'];
    c.CTX = c.CTX || []; c.CTX.push(row);
    CONTACTS.setPreview(c.CTX);
    /* nối vào Directory: dòng đã chọn (📇+) / cùng email / cùng tên mà chưa có email (vd. nhân viên mới) / thêm mới */
    const A = s2 => CONTACTS.ascii(s2).toLowerCase();
    let p = x._i != null ? c.DIR[x._i] : null;
    if(!p) p = c.DIR.find(q => (q.e||'').toLowerCase() === e.toLowerCase());
    if(!p) p = c.DIR.find(q => !q.e && A(q.vn || q.n) === A(row[0]));
    const np = CONTACTS.toPerson(row);
    if(p){ p.e = e; if(!p.vn) p.vn = row[0]; if(!p.title && np.title) p.title = np.title; if(!p.hp && np.hp) p.hp = np.hp; if(!p.sex && row[8]) p.sex = row[8]; }
    else { p = np; if(c.DIR.some(q => q.id === p.id)) p.id = p.id + '_' + Date.now().toString(36); c.DIR.push(p); }
    if(g && c.GROUPS[g] && !c.GROUPS[g].ids.includes(p.id)) c.GROUPS[g].ids.push(p.id);
    ST.ctNew = null; ST.rcDirty = true;
    _toast('+ '+row[0]+' added to the contact list'+(g ? ' and '+g : '')+' — press 💾 Save for everyone to keep it', 'ok');
    _renderRc();
  }
  function ctxDel(j){
    if(!_rcNeed()) return;
    const X = ST.rc.CTX || [], r = X[j]; if(!r) return;
    if(!confirm('Remove '+r[0]+' <'+r[1]+'> from the hand-added contacts?\n(The person stays in the Directory and its groups.)')) return;
    X.splice(j, 1); CONTACTS.setPreview(X); ST.rcDirty = true; _renderRc();
  }
  function dirSort(k){ ST.dirSort = ST.dirSort === k ? '' : k; _renderRc(); }
  /* v4.183 — P2: xe bị gỡ khỏi plan có tính là huỷ không · ghi tay kế hoạch đầu ngày */
  function p2Record(force){
    if(typeof PLANDAY === 'undefined') return;
    if(force && !confirm('Replace the first plan of '+ST.date+' with Today Plan as it is NOW?\nThe original first plan will be lost.')) return;
    PLANDAY.recordNow(ST.date, !!force).then(v => { _toast(v ? '📌 First plan of '+ST.date+' saved ('+fmt(num(v.mt),3)+' MT)' : '⚠ Today Plan has no rows for '+ST.date, v ? 'ok' : 'er'); _renderAll(); });
  }
  function dirFilter(q){ ST.dirQ = q; _renderRc(); const el = document.querySelector('#mlRcMain input[oninput^="MAIL.dirFilter"]'); if(el){ el.focus(); el.setSelectionRange(q.length, q.length); } }

  /* ═════════ hành động ═════════ */
  function pick(k){
    if(k !== ST.rep && _dewDirty()){ _dewGuard(() => pick(k)); return; }      /* v4.207 */
    if(ST.view === 'rc' && ST.rcDirty && !confirm('Leave the recipient editor without saving?')) return;
    if(ST.view === 'rc' && typeof CONTACTS !== 'undefined') CONTACTS.setPreview(null);   /* v4.182 — bỏ bản nháp người thêm tay */
    const prev = ST.rep; ST.view = 'rep'; ST.rep = k; if(prev !== k) ST.cx = null;
    if(prev !== k){ ST.date = _defaultDate(k); ST.files = []; ST.bsWarn = null; ST.vlot = ''; }
    _renderAll();
  }
  function set(k, v){
    if(k === 'date' && v !== ST.date && _dewDirty()){ _dewGuard(() => set(k, v)); _renderAll(); return; }      /* v4.207 */
    ST[k] = v;
    if(k === 'sig') _lsSet(LS.sig, v);
    if(k === 'date'){ ST.files = ST.files.filter(f => !(f.auto && (f.rep === 'P2' || f.rep === 'P3') && f.date && f.date !== v));   /* v4.204 — bản dựng của ngày khác không còn đúng */
      ST.pick = {}; ST.bsWarn = null; ST.dew = { no:'', time:'09:00', ca:'', cb:'', da:'', db:'', loaded:'' }; ST.vlot = ''; if(ST.bsF){ ST.bsPlan = null; _bsInspect(); } }
    _renderAll();
  }
  function lot(k, on){ ST.pick[k] = !!on; _renderAll(); }
  /* v4.177 — P7: chọn lot tàu; mở thẳng từ tab Vessel (VMIX.mail) */
  function vlot(v){
    ST.vlot = String(v||'');
    const L = vesselLots().find(x => x.lot === ST.vlot);
    if(L && L.date) ST.date = L.date;
    _renderAll();
  }
  function openVessel(lotName){
    if(!_el) _mount();
    try{ MAILCFG.attach(); }catch(_){}
    if(ST.rep !== 'P7'){ ST.files = []; ST.bsWarn = null; }
    ST.rep = 'P7'; ST.view = 'rep';
    const L = lotName ? vesselLots().find(x => x.lot === lotName) : null;
    ST.vlot = L ? L.lot : '';
    ST.date = L && L.date ? L.date : _defaultDate('P7');
    _el.classList.add('on');
    _renderAll();
  }
  function ordT(k){ ST.order[k] = (ST.order[k] || 'C4') === 'C4' ? 'C3' : 'C4'; _renderAll(); }
  function ovr(k, f, v){ ST.ovr[k] = Object.assign({}, ST.ovr[k], { [f]:String(v).trim() }); _renderAll(); }
  function ovrSave(k, quiet){
    if(typeof ENG === 'undefined' || !ENG.upsertRow){ _toast('Tank Log not loaded', 'er'); return; }
    const r = (ENG.ROWS || []).find(x => lotKey(x) === k); const o = ST.ovr[k];
    if(!r || !o){ return; }
    const cells = r.slice(); Object.keys(OVR_COLS).forEach(f => { if(o[f] != null && o[f] !== '') cells[OVR_COLS[f]] = o[f]; });
    try{ ENG.upsertRow(cells, { rid:r._rid }); delete ST.ovr[k]; _toast('💾 '+r[1]+' updated in Tank Log', 'ok'); if(!quiet) _renderAll(); }
    catch(e){ _toast('⚠ Tank Log save failed: '+e.message, 'er'); }
  }
  /* 🔍 tìm lot trong Tank Log (chỉ những lot ĐÃ NẠP — bấm 📥 Load All ở Tank Log để có lot cũ hơn) */
  function _lotResults(){
    const q = String(ST.lotQ || '').trim().toLowerCase();
    if(q.length < 2) return '';
    const inMail = p1Lots();
    const res = _engRows().filter(r => {
      const hay = (r[1]+' '+r[2]+' '+r[3]+' '+dMonY(anyIso(r[3]))).toLowerCase();
      return q.split(/\s+/).every(w => hay.indexOf(w) >= 0);
    }).sort((a,b) => (+lotTail(b[1]) || 0) - (+lotTail(a[1]) || 0)).slice(0, 12);
    if(!res.length) return '<span class="ml-cap">No lot found among the '+_engRows().length+' loaded lots.</span>';
    return '<span class="ml-cap">Found:</span>'+res.map(r => {
      const k = lotKey(r), on = inMail.indexOf(r) >= 0;
      return '<label class="ml-lot'+(on ? ' on' : '')+'"><input type="checkbox"'+(on ? ' checked' : '')+' onchange="MAIL.lot(\''+esc(k)+'\',this.checked)"> '+
        esc(r[1])+' · '+esc(tankName(r[2]))+' · '+dMonY(anyIso(r[3]))+' '+sentBadge(r)+'</label>';
    }).join('');
  }
  function lotSearch(q){ ST.lotQ = q; const el = $('mlLotRes'); if(el) el.innerHTML = _lotResults(); }
  function ovrSaveAll(){ Object.keys(ST.ovr).forEach(k => ovrSave(k, true)); _renderAll(); }
  /* v4.207 — gõ số KHÔNG tự lưu (có thể gõ sai / đang thử); rời email mà chưa lưu thì _dewGuard hỏi */
  async function dew(k, v){
    { const P0 = DEW_PTS.find(p => p[0] === k); if(P0 && _dn(v) > 0 && typeof ENGX_U !== 'undefined' && ENGX_U.dewSign) v = await ENGX_U.dewSign(P0[1], v); }   /* v4.208 — số dương ⇒ hỏi ngay (v4.224: hộp của app, Enter + change chỉ hỏi một lần) */
    if(String(ST.dew[k] == null ? '' : ST.dew[k]) === String(v) && k !== 'no'){ _renderAll(); return; }
    ST.dew[k] = v; ST.dew.saved = false; ST.dew.touched = true;
    if(k === 'no') ST.dew.noUser = String(v).trim() !== '';           /* xoá trắng ô No. ⇒ quay về số tự điền */
    _renderAll(); }
  function _ab2b64(buf){
    const u = new Uint8Array(buf); let s = '';
    for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  /* đính kèm một Blob app vừa tạo (và tải về máy nếu dl) */
  async function attachBlob(blob, name, dl){
    if(dl){
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
    const b64 = _ab2b64(await blob.arrayBuffer());
    ST.files = ST.files.filter(f => f.name !== name);
    ST.files.push({ name, type:blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size:blob.size, b64, auto:true, rep:ST.rep });
    _renderAll();
  }
  function pickFiles(inp){
    const fl = Array.from(inp.files || []);
    Promise.all(fl.map(f => f.arrayBuffer().then(async buf => {
        /* v4.181 — P2: đính kèm tay file Daily Stock ⇒ đọc luỹ kế từ chính file đó */
        if(ST.rep === 'P2' && /\.xlsx$/i.test(f.name) && /daily|ball\s*tank/i.test(f.name)) await _accFrom(buf);
        return { name:f.name, type:f.type, size:f.size, b64:_ab2b64(buf) }; })))
      .then(arr => { ST.files = ST.files.concat(arr); inp.value = ''; _renderAll(); })
      .catch(e => _toast('⚠ Cannot read file: '+e.message, 'er'));
  }
  function dropFile(i){ ST.files.splice(i, 1); _renderAll(); }
  /* ── v4.176 — cầu nối với Engineer ▸ 💧 Dew Point / 🔥 Heater (engx.js) ── */
  function _isOpen(){ return !!(_el && _el.classList.contains('on')); }
  /* v4.180 — bảng kiểm Batch Stock đổi (máy khác quyết định, gõ số ở tab SAP…) ⇒ vẽ lại P6 */
  try{ if(typeof SWR !== 'undefined') SWR.onChange(() => { if(_isOpen() && ST.view === 'rep' && ST.rep === 'P6') _renderAll(); }); }catch(_){}
  /* v4.224 — file Excel dew point đổi (chọn ở tab Engineer hoặc ở đây) ⇒ vẽ lại P3 */
  try{ if(typeof DEWXL !== 'undefined') DEWXL.onChange(() => { if(_isOpen() && ST.view === 'rep' && ST.rep === 'P3') _renderAll(); }); }catch(_){}
  /* HTR đổi dữ liệu ⇒ email P5 đang mở thì vẽ lại (ngày thư = ngày START) */
  function refreshIf(rep){
    if(!_isOpen() || ST.view !== 'rep' || ST.rep !== rep) return;
    if(rep === 'P5' && ST.heat.start) ST.date = PMSHEAT.iso(ST.heat.start);
    _renderAll();
  }
  /* DEWPT vừa lưu / xoá ⇒ lần tới email P3 đọc lại Firebase cho ngày đó */
  function dewReload(date){
    if(ST.dew.loaded === date){ ST.dew = { no:'', time:'09:00', ca:'', cb:'', da:'', db:'', loaded:'' }; if(_isOpen() && ST.rep === 'P3') _renderAll(); }
  }
  async function heatAttachLast(){
    const o = ST.heat.lastOut; if(!o) return;
    await attachBlob(o.blob, o.name, false); _toast('📎 '+o.name+' attached', 'ok');
  }
  function heatChartHtml(){ return heatChart(); }
  function _out(){
    const r = recipients(ST.rep);
    return { to:r.to, cc:r.cc, subject:$('mlSubj').value.trim(), html:$('mlPrev').innerHTML, files:ST.files };
  }
  /* ⭐ CỔNG XÁC NHẬN: còn cảnh báo thì phải đọc và tick xác nhận mới mở/tải thư */
  function _gate(action, fn){
    const o = _cur || {}, w = _allWarn(o), block = o.block || [], M = o.miss;
    if(!w.length && !block.length){ fn(); return; }
    const g = $('mlGate');
    let t = '';
    /* bảng dữ liệu thiếu theo từng lot (P1) — ✓ có · ✗ thiếu */
    if(M && M.rows.length){
      t += '<div class="ml-gsec">Missing data per lot</div><div style="overflow:auto"><table class="ml-gtbl"><tr><th>Lot</th>'+M.cols.map(q => '<th title="'+esc(q.where)+'">'+esc(q.lbl)+(q.block ? ' *' : '')+'</th>').join('')+'</tr>'+
        M.rows.map(m => '<tr><td><b>'+esc(m.lot)+'</b><br><small>'+esc(m.tank)+'</small></td>'+M.cols.map(q => m.has[q.k] ? '<td class="ok">✓</td>' : '<td class="bad'+(q.block ? ' blk' : '')+'">✗</td>').join('')+'</tr>').join('')+
        '</table></div><div class="ml-cap">Fix in Tank Log, or type Temperature / Pressure / Density in the mail panel and press 💾 Save typed values to Tank Log.'+(M.cols.some(q => q.block) ? ' * = required — the mail cannot be sent without it.' : '')+'</div>';
    }
    const other = w.filter(x => !(M && M.rows.some(m => x.indexOf(esc(m.lot)+':') === 0 && / missing\.$/.test(x))));
    if(block.length) t += '<div class="ml-gsec red">⛔ Required data missing — cannot continue</div>'+block.map(x => '<div class="ml-gblk">• '+x+'</div>').join('');
    if(other.length) t += '<div class="ml-gsec">Other points to check</div>'+other.map(x => '<div>• '+x+'</div>').join('');
    g.innerHTML = '<div class="ml-gbox"><div class="ml-ghd">⚠ Check before sending — '+esc(RP(ST.rep).ttl)+'</div>'+
      '<div class="ml-gbd">'+t+'</div>'+
      (block.length ? '' : '<label class="ml-gck"><input type="checkbox" id="mlGateOk" onchange="document.getElementById(\'mlGateGo\').disabled=!this.checked"> I have checked the items above and still want to '+esc(action)+'</label>')+
      '<div class="ml-gft">'+(ST.rep === 'P1' && Object.keys(ST.ovr).length ? '<button class="ml-btn" onclick="MAIL.ovrSaveAll();MAIL._gateClose()">💾 Save typed values to Tank Log</button>' : '')+
      '<button class="ml-btn" onclick="MAIL._gateClose()">← Go back and fix</button>'+
      (block.length ? '' : '<button class="ml-btn ml-pri" id="mlGateGo" disabled>'+esc(action.charAt(0).toUpperCase() + action.slice(1))+'</button>')+'</div></div>';
    g.style.display = 'flex';
    if(!block.length) $('mlGateGo').onclick = () => { _gateClose(); fn(); };
  }
  /* P1: ghi dấu ĐÃ GỬI vào cột ✉ Mail của Tank Log cho mọi lot trong thư */
  function _markSent(){
    if(ST.rep !== 'P1' || typeof ENG === 'undefined' || !ENG.markMailSent) return;
    const who = (P(meId()) || {}).n || ((typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) || '');
    const lots = p1Lots();
    lots.forEach(r => { try{ ENG.markMailSent(r._rid, who); }catch(e){ console.warn('[MAIL] mark', e); } });
    if(lots.length) _toast('✉ Marked as sent in Tank Log: '+lots.map(r => lotTail(r[1])).join(', '), 'ok');
  }
  /* v4.187 — P2 đã gửi ⇒ đánh dấu plan_cx của ngày đó (đủ email + file Daily thì xoá) */
  function _p2Sent(){ try{ if(ST.rep === 'P2' && typeof PLANCX !== 'undefined') PLANCX.markUsed(ST.date, 'mail'); }catch(_){} }
  function _gateClose(){ const g = $('mlGate'); if(g) g.style.display = 'none'; }
  function eml(){
    _gate('download the Outlook draft', () => {
      const o = _out();
      const txt = buildEml(o);
      const blob = new Blob([txt], { type:'message/rfc822' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = o.subject.replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g,' ').trim().slice(0, 120) + '.eml';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      _toast('⬇ Outlook draft downloaded — open it, check, press Send', 'ok');
      _markSent(); _p2Sent(); _renderAll();
    });
  }
  /* v4.193 — Copy body: ghi HTML THÔ qua sự kiện copy (clipboardData.setData). navigator.clipboard.write
     của Chrome "làm sạch" text/html trước khi ghi ⇒ Outlook nhận bản mất font và mất căn phải/giữa,
     nên dán ra khác hẳn bản trên app. Chỉ khi cách này không chạy mới lùi về clipboard API. */
  async function _copy(){
    const html = _docHtml(_pasteHtml($('mlPrev').innerHTML)), text = $('mlPrev').innerText;
    let ok = false;
    const h = e => { try{ e.clipboardData.setData('text/html', html); e.clipboardData.setData('text/plain', text); e.preventDefault(); ok = true; }catch(_){} };
    document.addEventListener('copy', h, true);
    try{ document.execCommand('copy'); }catch(_){}
    document.removeEventListener('copy', h, true);
    if(ok) return;
    try{
      await navigator.clipboard.write([new ClipboardItem({ 'text/html':new Blob([html], { type:'text/html' }), 'text/plain':new Blob([text], { type:'text/plain' }) })]);
    }catch(_){
      const rg = document.createRange(); rg.selectNodeContents($('mlPrev'));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(rg);
      document.execCommand('copy'); s.removeAllRanges();
    }
  }
  function copyBody(){ _copy().then(() => _toast('📋 Body copied — paste into the mail with Ctrl+V', 'ok')); }
  function mailto(){
    _gate('open the mail in Outlook', () => {
      const o = _out();
      if(o.files.length && !confirm(o.files.length+' attachment(s) cannot travel through "Open in Outlook".\nAttach them by hand, or use ⬇ Outlook draft (.eml) instead.\n\nOK = continue without them')) return;
      const u = 'mailto:' + o.to.map(id=>P(id).e).join(';') +
        '?cc=' + encodeURIComponent(o.cc.map(id=>P(id).e).join(';')) +
        '&subject=' + encodeURIComponent(o.subject);
      _copy().then(() => { _toast('✉ Outlook is opening — click in the body and press Ctrl+V', 'ok'); _markSent(); _p2Sent(); window.location.href = u; setTimeout(_renderAll, 300); });
    });
  }
  async function copyList(which){
    const r = recipients(ST.rep);
    const s = r[which].map(addr).join('; ');
    try{ await navigator.clipboard.writeText(s); }catch(_){ prompt('Copy:', s); return; }
    _toast('⧉ '+which.toUpperCase()+' copied ('+r[which].length+')', 'ok');
  }

  function init(){
    try{ MAILCFG.attach(); }catch(_){}
  }

  return {
    init, open, close, pick, set, lot, lotSearch, vlot, openVessel, ord:ordT, ovr, ovrSave, ovrSaveAll, dew, dewSave, dewFill, dewRange, dewCopyChart, _dewDraw, _dewSeries,
    rcpFocus, rcpSearch, rcpAdd, rcpRm, rcpReset, fold, zoom, navMin, focus:focusT,
    heatFiles, heatRun, heatSet, heatSave, heatMaster, heatAttachLast, heatChartHtml, refreshIf, dewReload,
    bsFile, bsBuild, ol1Save, priceSave, dsFile, dsPick, dsBuild, dsClear,
    pickFiles, dropFile, eml, copyBody, mailto, copyList, _gateClose,
    recips, rcSet, rcGroup, rcSender, rcRoute, rcAdd, rcDel, rcReset, rcSave,
    ctSearch, ctAdd, ctImport, ctCancel, ctSave, dirFilter, dirSort,
    p2Record, _p1Skipped:p1Skipped, p2Cancel, cnPick, cnAll, cnOk,
    rcGrpAdd, rcGrpRen, rcGrpDel, rcMailAdd, rcMailRen, rcMailDel, rcCol, cxEdit, cxSet, cxCancel, cxPreview, cxSave,
    ctNewOpen, ctNewFrom, ctNewSet, ctNewCancel, ctNewAdd, ctxDel,
    rcRouteSet, rcGrpMember, rcMailGrp, rcTab, rcSel, rcFind, rcDelId, rcCtToggle, rcPickQ, rcPickAdd, rcPQ, rcPMissT, rcPAllT,
    /* cho test */
    _mixCalc:mixCalc, _build:k => RP(k).build(), _tplFill:tplFill, _txt2html:txt2html, _repKeys:repKeys, _state:ST, _buildEml:buildEml, _recipients:recipients, _meId:meId,
    _weekOf:weekOf, _v2L, _attachBlob:attachBlob, _allWarn, _vesselLots:vesselLots, _vesselTanks:vesselTanks
  };
})();
