/* ============================================================
 * PLAN  —  plan.js
 * ------------------------------------------------------------
 * NGUỒN (V4-54): lpg-station-v4_54_0-cavern-collapsible-sections.html
 *   dòng 9951–12568   (~2618 dòng)
 * Global xuất ra : window.PLAN
 * Phase tách     : P5C
 * Phụ thuộc      : sync, ct, pp, wgcheck, fcheck, Tabulator
 * Khởi tạo (boot): PLAN qua API; init trong boot
 * ------------------------------------------------------------
 * MÔ TẢ: ★ LỚN NHẤT (~2.6k dòng). Module PLAN (Today/Tomorrow) + object API (12310). Factory dùng chung tạo 2 instance TP/TMR; 2 chế độ Table(Tabulator)/Ledger. GỢI Ý tách con sau: plan-core / plan-table / plan-ledger / plan-status.
 *
 * API công khai (điền/đối chiếu khi tách):
 *   TP.*, TMR.* (qua API): init, buildTable, renderLedger, planRows, rebuildTableData, applyView, toggleView
 * ------------------------------------------------------------
 * CÁCH TÁCH (khi tới phase này):
 *   1) Mở V4-54, copy nguyên khối module PLAN từ dòng 9951 đến 12568.
 *   2) Dán xuống DƯỚI dòng này. GIỮ NGUYÊN tên global (window.PLAN).
 *   3) node --check plan.js   → phải PASS (không lỗi cú pháp).
 *   4) Mở index.html trên trình duyệt → kiểm tra chức năng hoạt động.
 *   5) Cập nhật docs/PLAN-TACH-MODULE.md: đánh dấu [x] module này.
 * ============================================================ */

/* TODO[P5C]: dán thân module PLAN (V4-54 dòng 9951–12568) vào đây. */

/* ===== v4.188 (25/09/2026) =====
   • ĐỐI CHIẾU TỔNG KHỐI LƯỢNG VỚI FILE SALE: dòng tổng cuối bảng của sale (cột Quantity, dòng
     không có No — vd. 172.500) được đọc lúc dán. Tổng kế hoạch SAU KHI áp các lựa chọn (link ALT
     tính một lần, MULTI-DO theo MT đã chia, dòng huỷ không tính) phải BẰNG số đó. Bảng duyệt và hộp
     diff hiện ✓ khớp / ⚠ lệch (tính lại ngay khi tick / đổi kiểu / sửa MT); dải Plan của Ledger giữ
     cảnh báo cho tới lần dán sau (RAM, không ghi Firebase).
   ===== v4.187 (25/09/2026) =====
   • CANCEL NHÓM "1 trong các xe": các dòng cancel cùng khách, liền nhau, CÙNG XE khác tài xế (hoặc
     đã cùng nhóm 🔗 ALT) gộp thành MỘT mục duyệt = MỘT chuyến huỷ; áp dụng thì huỷ cả nhóm và link ALT
     để mọi tổng / Cancel List chỉ đếm 1. Một xe trong nhóm đã nạp ⇒ xe còn lại KHÔNG tính huỷ.
   • XE BIẾN MẤT KHỎI TODAY PLAN (chỉ Today — Tomorrow chưa bán nên được đổi tự do): dán plan mới mà
     xe của plan cũ (cùng ngày) không còn, không ghi cancel ⇒ bảng duyệt thêm mục 🕳 "Missing from the
     new plan" (tick sẵn = tính là chuyến huỷ). Xe được thay bằng xe mới ghi "Change TL / đổi xe / thay xe"
     cùng khách ⇒ KHÔNG tính (hiện, không tick). Quyết định ghi Firebase plan_cx/<ngày> (push, không
     listener) — chỉ máy làm báo cáo / gửi email P2 mới đọc; xoá khi đã gửi email P2 VÀ xuất báo cáo
     (hoặc tự dọn sau 3 ngày).
   ===== v4.184 (25/09/2026) =====
   • BƯỚC DUYỆT GHI CHÚ SALE (📋 Sale note review): sau hộp diff, mọi việc app định tự làm từ ghi chú
     sale hiện thành MỘT BẢNG đủ thông tin (khách, No, xe, rơ-moóc, tài xế, MT, DO, loại hàng, note, lý do)
     — tick để làm, bỏ tick để giữ nguyên. Gồm: 🚫 Cancel (nhiều kiểu chữ: cancel/cxl/hủy/không lấy hàng/
     no show/postpone…, có loại trừ phủ định "không hủy"), ↺ trả về AUTO, 🔗 ALT (một trong các xe/tài xế
     sẽ lấy hàng) và 🔗 MULTI-DO (một xe nhiều DO — ô Quantity gộp). MULTI-DO đề xuất chia MT theo note
     (vd. 7.52 MT 50:50 + phần còn lại 70:30), sửa được; số đã chia mang cờ _qtyFix nên dán lại (Update)
     không bị ô gộp điền đè lại.
   • AILOG (Firebase ai_log): ghi lại MỌI đề xuất + người dùng nhận/bỏ/sửa gì — CHỈ GHI, app không đọc lại.
     ⚙ (admin) ▸ tải JSON / xoá sạch.
   ===== v4.204 (28/09/2026) =====
   • PLANDAY TỰ GHI (_pdayAuto): Today Plan có dòng của HÔM NAY mà plan_day/<hôm nay>/first chưa có ⇒ 30 s
     sau đợt đồng bộ app tự chụp (src 'auto'), không cần bấm 📌. Biến ngày _pdayDay đổi lúc qua nửa đêm ⇒ reset;
     máy mở qua đêm kiểm lại 5 phút/lần. Dán / promote vẫn ghi ngay như cũ.
   ===== v4.183 (25/09/2026) =====
   • SALE NOTE "CANCEL": lúc dán, dòng có ghi chú Cancel/Hủy được GỢI Ý chuyển 🚫 Cancelled ngay
     trong hộp xác nhận (tick bỏ được). Ghi chú điền-xuống từ ô gộp chỉ tính khi xe chưa có DO và
     Allow load = NO. Dán lại mà sale gỡ chữ cancel ⇒ gợi ý trả về AUTO (chỉ dòng do dán huỷ: _cxPaste).
     Promote Tomorrow → Today GIỮ trạng thái cancel.
   • PLANDAY (plan_day/<ngày>/first): ảnh chụp KẾ HOẠCH ĐẦU NGÀY — ghi MỘT lần ở lần dán / promote
     đầu tiên của ngày (transaction, không ghi đè). Kế hoạch CUỐI = RAM lúc làm báo cáo (không lưu).
     Email P2 dùng để điền Daily plan + danh sách xe huỷ (kể cả xe bị gỡ khỏi plan).
   • SNOTE (sale_notes/<khoá mẫu>): sổ gom GHI CHÚ CỦA SALE (cột M) theo mẫu — để sau này dạy app
     hiểu note (vd. một xe hai loại hàng, cố định số tấn một loại). Chỉ gom, chưa tự xử lý.
     v4.231 — CHỈ GHI, app không đọc lại; phân tích bằng ⚙ ▸ ⬇ Download JSON.
   ===== BÓC TỪ V4-54 dòng 9940–12568 ===== */
function _makePlanModule(opts){
  /* destructure once for readability (these are CONSTANT for the lifetime
     of the instance, so it is safe to capture them in closures) */
  const ID      = opts.idPrefix;     /* DOM id prefix: "tp" or "tmr" */
  const FBN     = opts.fbNode;       /* Firebase node: "plan_today_" or "plan_tomorrow_" */
  const VERK    = opts.versionKey;   /* version counter node */
  const LSK     = opts.lsKey;        /* localStorage cache key */
  const PERMK   = opts.permKey;      /* canWrite/logAudit area key */
  const UILABEL = opts.uiLabel;      /* user-facing label */
  const DEFD    = opts.defaultDate;  /* () => ISO date string */
  /* live state */
  const PLAN = {};                 // keyed by _oid: { _oid, doNum, customer, plate, ... }
  let table = null;
  let planDate = DEFD();           // load date (instance-default — today or tomorrow)
  /* Display filter: a SET of plan dates the user has clicked to show. EMPTY = show
     ALL dates (the new default). planDate above stays as the module's default for
     paste seeding / temp-oid / legacy-row fallback — it is NOT the view filter. */
  const _dateSel = new Set();
  let autoSync = true;             // toggle for auto-update of status / actual
  /* ═══════ v4.138 · CHAN DOI AM CUA CHINH MINH — THEO TUNG DON, KHONG CHAN CA BANG ═══════
     Truoc day mot bien dem toan cuc (_suppressEcho) duoc bat len 600ms quanh MOI
     lenh ghi cua may nay, va ba listener child_added/changed/removed deu
     `if(_suppressEcho) return;`. Hau qua: trong 600ms do, MOI su kien cua MAY KHAC
     cung bi vut bo — dung luc doi tac vua doi ten DO tam thanh DO that thi may nay
     nhan child_added(DO moi) nhung MAT child_removed(DO tam) ⇒ hai dong cung mot
     don hang nam song song = TRUNG LAP. Su kien da mat khong bao gio duoc ban lai.
     Nay: danh dau THEO _oid vua ghi (rut tu chinh payload), chi bo qua doi am cua
     dung nhung don do, va chi khi nguoi sua chinh la minh (lastBy). Moi su kien
     cua may khac LUON duoc ap dung. */
  const _selfEcho = new Map();     // oid → thoi diem het han danh dau (ms)
  const SELF_ECHO_MS = 1500;
  let _selfWrites = 0;             // CHI de theo doi/debug — KHONG duoc dung de chan su kien
  function _meName(){
    const u = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : {};
    return u.name || u.email || 'unknown';
  }
  /* Rut moi _oid co trong payload ("plan_today/OID" hoac "plan_today/OID/field") */
  function _markSelf(payload){
    const now = Date.now();
    Object.keys(payload||{}).forEach(k=>{
      if(k.indexOf(FBN) !== 0) return;
      const oid = k.slice(FBN.length).split('/')[0];
      if(oid) _selfEcho.set(oid, now + SELF_ECHO_MS);
    });
    if(_selfEcho.size > 400){ _selfEcho.forEach((t,o)=>{ if(t < now) _selfEcho.delete(o); }); }
  }
  /* true = day dung la doi am cua chinh may nay. row=null khi xoa/quet lai. */
  function _isSelfEcho(oid, row){
    const t = _selfEcho.get(oid);
    if(!t) return false;
    if(Date.now() > t){ _selfEcho.delete(oid); return false; }
    if(row){
      const by = String(row.lastBy || '');
      if(by && by !== _meName()) return false;   /* nguoi khac vua sua → PHAI ap dung */
    }
    return true;
  }
  /* Cong ghi DUY NHAT ra Firebase cho module nay: danh dau roi moi ghi. */
  function _fbUpdate(payload){
    _markSelf(payload);
    _selfWrites++;
    /* ⚠ CHI DUY NHAT cho nay duoc goi FB_DB.ref().update() trong plan.js —
       moi noi khac phai di qua _fbUpdate de dong danh dau doi am. */
    return FB_DB.ref().update(payload)
      .finally(()=>{ _selfWrites = Math.max(0, _selfWrites - 1); });
  }
  let _pendingPaste = null;        // { rows, mode } awaiting confirmation
  let _pendingDiff = null;         // { changes, mode } awaiting Apply
  let _pasteDateForBatch = '';     // forDate of the rows currently being pasted
  let _versions = { plan:0 };      // local idea of the area version
  let _loaded = false;             // v4.138 — da nhan anh chup dau tien tu Firebase chua
  let _loadErr = false;            // v4.138 — lan doc dau tien that bai (mat mang / chua co quyen)
  let _firstPaintDone = false;     // v4.138 — da ve mot lan sau anh chup dau tien chua
  const LS_KEY = LSK; // separate cache key per area (bandwidth-saving)

  /* ── v4.35.0 Customer Ledger state (RAM + one localStorage pref) ── */
  const G = (ID === 'tp') ? 'TP' : 'TMR';        // global name for onclick strings
  const PANE = (ID === 'tp') ? 'sub-today' : 'sub-tmr';
  let viewMode = 'ledger';   /* v4: LUÔN mở mặc định Ledger cho TP & TMR (bỏ qua localStorage cũ có thể = 'table') */
  let _ledgerFilter = 'all';                     // all | pending | loading | done | cancel
  const _grpOpen = {};                           // customer → explicit open/close; undefined = auto

  /* ═══════ v4.138 · PLAN CHAY HOAN TOAN TREN RAM — KHONG CON CACHE ═══════
     Ke hoach thay doi lien tuc trong ca lam viec, nen cache localStorage khong
     tiet kiem duoc gi ma con la NGUON GOC cua hai loi kinh nien:
       ① Vua dang nhap: bang ve NGAY bang du lieu cu trong localStorage, phai
          doi Firebase tra ve moi dung ⇒ "F5 moi hien dung".
       ② Dong "ma": dong da bi xoa o may khac trong luc may nay offline van nam
          lai trong cache, hien them ⇒ TRUNG LAP / lech tong.
     Tu v4.138: PLAN chi song trong RAM. Moi lan mo trang deu lay tu Firebase.
     ⚠ TUYET DOI khong khoi phuc localStorage cho PLAN. Neu can "mo nhanh", hay
     dung Firebase ref.keepSynced/persistence chu KHONG phai blob tu ghi. */
  let _cachePurged = false;
  function loadCache(){
    /* Xoa mot lan blob cu de khong con gi song sot khi ai do lui file. */
    if(!_cachePurged){ _cachePurged = true; try{ localStorage.removeItem(LS_KEY); }catch(_){} }
    return null;
  }
  function saveCache(){ /* v4.138 — RAM-only. Co y de TRONG. */ }
  /* bump the area version into a payload + persist cache, just before a FB write */
  function bumpVersion(payload){
    _versions.plan = (_versions.plan||0) + 1;
    payload[VERK] = _versions.plan;
    saveCache();
  }

  /* ═══════════ v4.126 · DẤU VẾT SỬA: AI · LÚC NÀO · VAI TRÒ ═══════════
     lastBy/lastAt đã có từ trước nhưng nằm rải rác 6 chỗ, mỗi chỗ chép tay một
     kiểu. Gom về ĐÚNG MỘT hàm và thêm lastRole — máy khác cần biết thay đổi này
     do TÀI KHOẢN SALE gây ra để bật thông báo ở tab Scale.
     ⚠ KHÔNG có node Firebase riêng cho thông báo: nó được sinh TẠI CHỖ trên
     từng máy từ chính sự kiện đồng bộ của bảng (xem _saleNotify bên dưới). */
  /* Đóng dấu THẲNG vào object dòng — dùng khi ghi NGUYÊN dòng (thêm mới / đổi
     _oid). ⚠ KHÔNG được đóng dấu bằng payload dạng "plan_today/X/lastBy" khi
     trong cùng payload đã có "plan_today/X" — Firebase từ chối multi-path update
     có đường dẫn cha-con chồng nhau, cả lệnh dán Excel sẽ hỏng. */
  function _stampRow(row, now){
    if(!row) return row;
    const u = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : {};
    row.lastBy   = u.name || u.email || 'unknown';
    row.lastAt   = now || Date.now();
    row.lastRole = u.role || '';
    return row;
  }

  function _stampWho(payload, oid, now){
    const u  = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : {};
    const nm = u.name || u.email || 'unknown';
    const rl = u.role || '';
    const t  = now || Date.now();
    const row = PLAN[oid];
    if(row){ row.lastBy = nm; row.lastAt = t; row.lastRole = rl; }
    payload[`${FBN}${oid}/lastBy`]   = nm;
    payload[`${FBN}${oid}/lastAt`]   = t;
    payload[`${FBN}${oid}/lastRole`] = rl;
    return t;
  }

  /* Nhãn tiếng Anh cho từng trường, dùng trong câu thông báo. */
  const NOTIF_LBL = {
    no:'No', customer:'Customer', contractQty:'Contract Qty', type:'Type',
    plate:'Truck', rmooc:'Rmooc', driver:'Driver', qty:'Qty',
    tolerance:'Tolerance', allowGate:'Allow gate', allowLoad:'Allow load',
    doNum:'DO', note:'Note', forDate:'Plan date', _status:'Status',
    _actualQty:'Actual', _autoSync:'Auto-sync', _lnkK:'Order link'
  };
  const NOTIF_FIELDS = Object.keys(NOTIF_LBL);

  function _notifDiff(prev, next){
    const out = [];
    if(!prev || !next) return out;
    NOTIF_FIELDS.forEach(f=>{
      const a = String(prev[f] === undefined || prev[f] === null ? '' : prev[f]).trim();
      const b = String(next[f] === undefined || next[f] === null ? '' : next[f]).trim();
      if(a !== b) out.push({ field:f, label:NOTIF_LBL[f] || f, old:a, new:b });
    });
    return out;
  }

  /* Biến một sự kiện đồng bộ thành thông báo — CHỈ khi người sửa là tài khoản
     role "sale", và không phải chính mình. Trả về true nếu có đẩy thông báo
     (dùng cho test). */
  function _saleNotify(kind, oid, prev, next){
    try{
      const src = next || prev;
      if(!src) return false;
      if(String(src.lastRole || '').toLowerCase() !== 'sale') return false;
      const me = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : {};
      /* chính người sale vừa sửa thì không tự báo lại cho mình */
      if(String(me.role||'') === 'sale' && String(me.name||'') === String(src.lastBy||'')) return false;
      const fields = (kind === 'edit') ? _notifDiff(prev, next) : [];
      if(kind === 'edit' && !fields.length) return false;   /* chỉ đổi lastAt — bỏ qua */
      if(typeof SALENOTIF === 'undefined' || !SALENOTIF || !SALENOTIF.push) return false;
      SALENOTIF.push({
        table : UILABEL,
        area  : PERMK,
        kind  : kind,                       /* add | edit | del */
        oid   : oid,
        who   : src.lastBy || 'sale',
        at    : src.lastAt || Date.now(),
        doNum : src.doNum || oid,
        cust  : src.customer || '',
        plate : src.plate || '',
        fields: fields
      });
      return true;
    }catch(_){ return false; }
  }

  /* -------- helpers -------- */
  function isoToday(){
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function isoLabel(iso){
    if(!iso) return '—';
    const p = iso.split('-');
    return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  }
  /* Add N days to an ISO date string (YYYY-MM-DD), returning a new ISO string.
     Uses local time so the date arithmetic matches what the user sees. */
  function _addDaysIso(iso, days){
    const p = String(iso||'').split('-').map(Number);
    if(p.length !== 3) return iso;
    const d = new Date(p[0], p[1]-1, p[2]);
    d.setDate(d.getDate() + (days|0));
    const pad = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function isRealDO(v){
    return /^\d{7,}$/.test(String(v||'').trim());
  }
  /* 3-letter uppercase customer prefix (letters only; padded with X if short). */
  function tempPrefix(customer){
    const s = String(customer||'').replace(/[^A-Za-z]/g,'').toUpperCase();
    return (s.slice(0,3) || 'XXX').padEnd(3,'X');
  }
  /* Temp DO id = <3-letter customer prefix> + <YYMMDD> + <per-customer seq, 2-digit>.
     e.g. KNHC + 2026-06-02 + 1st order  →  KNH26060201 */
  function makeTempOid(forDate, seq, customer){
    const ds = (forDate||isoToday()).replaceAll('-','');   /* YYYYMMDD */
    const yymmdd = ds.slice(2);                            /* YYMMDD   */
    return tempPrefix(customer) + yymmdd + String(seq).padStart(2,'0');
  }
  /* ══════════ v4.139 · KHOA DINH DANH MOT DONG KE HOACH ══════════
     Dung cho HAI viec: chan ghi trung luc dan, va do tim dong trung da co.
     Gom DU nhung gi phan biet hai dong THAT SU khac nhau — ke ca doNum (cung
     bien so cung khoi luong nhung KHAC DO la hai don khac nhau, vi du
     TOTALENERGIES 86778972/86778973 cung xe 50H-16286) va cot `no`. */
  function _normTxt(v){ return String(v==null?'':v).replace(/\s+/g,' ').trim().toUpperCase(); }
  function _identKey(r, forDate){
    if(!r) return '';
    const cu = _normTxt(r.customer).replace(/[^A-Z0-9]/g,'');
    const pl = _normTxt(r.plate).replace(/[^A-Z0-9]/g,'');
    const dr = _normTxt(r.driver).replace(/[^A-Z0-9]/g,'');
    if(!cu && !pl && !dr) return '';
    const doN = _normTxt(r.doNum).replace(/[^A-Z0-9]/g,'');
    const qt  = _normTxt(r.qty).replace(/[^0-9.]/g,'');
    const fd  = forDate || r._forDate || planDate;
    return [fd, cu, dr, pl, _normTxt(r.no), qt, doN].join('|');
  }
  /* Dong RAC: khoa con tren Firebase nhung khong con du lieu nghiep vu nao.
     Sinh ra khi mot may ghi mot O LE (vi du plan_today/<oid>/_autoSync) cho
     dong ma may khac VUA XOA — Firebase tao lai khoa do voi DUY NHAT o vua ghi.
     Vi du that trong ban xuat 09/09/26: "86777221-260908": { _autoSync: true }. */
  function _isJunkRow(r){
    if(!r || typeof r !== 'object') return true;
    return !String(r.customer||'').trim() && !String(r.plate||'').trim()
        && !String(r.driver||'').trim()   && !String(r.doNum||'').trim();
  }

  /* positional fingerprint — used to match new/old rows on re-paste.
     Customer name normalized to first 8 alpha-num chars (matches v406 behavior). */
  function posFingerprint(row, forDate){
    const pl = String(row.plate||'').replace(/[-.\s]/g,'').toUpperCase();
    const cu = String(row.customer||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,8);
    const dr = String(row.driver||'').replace(/\s+/g,'').toLowerCase();
    const no = String(row.no||'0');
    const fd = forDate || row._forDate || planDate;
    return `${cu}|${dr}|${pl}|${no}|${fd}`;
  }
  /* Internal, NON-DO key for planning/summary rows (no real DO, no "after loading").
     Not a real DO and not a temp DO, so it never appears as a temp DO and is never
     written into the DO column — it only gives the row a stable Firebase key. */
  let _rowKeySeq = 0;
  function makeRowKey(forDate){
    const ds = (forDate||isoToday()).replaceAll('-','').slice(2);   /* YYMMDD */
    _rowKeySeq++;
    return 'PLN-' + ds + '-' + Date.now().toString(36) + _rowKeySeq.toString(36);
  }
  /* The single source-of-truth identifier resolver:
     - keep an existing _oid (sticky);
     - real DO (>=7 digits) → DO + '-YYMMDD' so the same real DO sold on
       different _forDate values gets distinct Firebase keys (fixes the
       cross-date overwrite bug). The DO column itself still carries the
       plain real DO — only the _oid (Firebase key) bears the date suffix;
     - DO column contains "after loading" (sales-approved) → generate a temp DO;
     - otherwise (planning/summary row) → internal non-DO key, NO temp DO.
     Suffix format note: the dash makes isRealDO() reject the suffixed
     value (it requires pure digits), so the suffixed _oid is never
     mistaken for a real DO downstream. */
  function resolveOid(row, forDate, seqMap){
    if(row._oid) return row._oid;
    const doN = String(row.doNum||'').trim();
    if(isRealDO(doN)){
      const ymd = (forDate||planDate).replaceAll('-','').slice(2);   /* YYMMDD */
      return doN + '-' + ymd;
    }
    if(/after\s*loading/i.test(doN)){
      const pfx = tempPrefix(row.customer);
      seqMap[pfx] = (seqMap[pfx]||0) + 1;
      return makeTempOid(forDate, seqMap[pfx], row.customer);
    }
    return makeRowKey(forDate);
  }

  /* -------- TSV parser (RFC 4180 with quoted multiline support) -------- */
  function parseTSV(text){
    const rows = [];
    let row = [], field = '', inQuote = false;
    const s = String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    for(let i=0; i<s.length; i++){
      const ch = s[i];
      if(inQuote){
        if(ch === '"'){
          if(i+1 < s.length && s[i+1] === '"'){ field += '"'; i++; }
          else inQuote = false;
        } else field += ch;
      } else {
        if(ch === '"' && field === '') inQuote = true;
        else if(ch === '\t'){ row.push(field); field = ''; }
        else if(ch === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if(field || row.length){ row.push(field); rows.push(row); }
    return rows;
  }

  /* -------- Plan-sheet parser (v406 port, English comments only) --------
     TABLE BOUNDARY RULE: col[3] is the per-customer row-no (1..99).
     Valid row: col[3] is a positive integer 1..99.
     Table END signal: first row where col[3] is empty AND col[7] has a numeric
     value (the grand-total row appended after the last vehicle row).
     FILL-DOWN: col[0]=customer, col[1]=contractQty, col[2]=type;
                col[7]=qty, col[8]=tolerance — reset whenever col[3] resets to 1.
     SUB-GROUP: col[3] resetting to 1 within the same customer = new batch. */
  function parsePlanSheet(rows){
    /* skip optional header within first 5 rows */
    let startRow = 2;
    for(let i=0; i<Math.min(rows.length,5); i++){
      const j = rows[i].join(' ').toLowerCase();
      if(j.includes('plate') || j.includes('driver') || j.includes('allow')){
        startRow = i + 1; break;
      }
    }
    const out = [];
    const skipped = [];                                          /* v4.49.3 — rows missing "No" but carrying real vehicle data */
    let lastCust='', lastContractQty='', lastType='', lastQty='', lastTol='';
    let lastNote='';                                              /* v4.22.17 — merged-note fill-down */
    let subGroupIdx = 0, prevNo = 0, lastCustForSubgroup = '';
    let foundValidRow = false;
    let sheetTotal = null;                                        /* v4.188 */
    /* v4.55.4 — global paste-order index. Stamped on every emitted row in the
       exact order it appears in the pasted/Excel sheet, so TABLE VIEW can keep
       that order verbatim (NOT customer-grouped, NOT no-sorted) for 1:1 visual
       cross-reference against the source file. */
    let gseq = 0;

    for(let i=startRow; i<rows.length; i++){
      const r = rows[i].map(c => (c||'').trim());
      const noRaw = r[3] || '';
      const col7  = r[7] || '';
      const noInt = parseInt(noRaw, 10);
      const noValid = noRaw && !isNaN(noInt) && noInt >= 1 && noInt <= 99;
      /* v4.49.3 — a row with plate/rmooc/driver/DO is a real vehicle row,
         never the grand-total line. Used both to avoid a false table-end
         break and to flag blank-No rows for confirmation instead of dropping. */
      const looksData = !!(r[4] || r[5] || r[6] || r[11]);

      /* table-end detection — a numeric col7 with no vehicle data is the total line */
      if(foundValidRow && !noRaw && col7 && !isNaN(parseFloat(col7)) && !looksData){
        sheetTotal = parseFloat(String(col7).replace(/,/g,''));        /* v4.188 — tổng MT của sale */
        break;
      }
      if(!noValid){
        if(looksData){
          prevNo += 1;                                           /* keep suggested numbers unique & increasing */
          skipped.push({
            rowIdx: i, suggestedNo: prevNo,
            customer: r[0] || lastCust || '',
            plate: r[4]||'', rmooc: r[5]||'', driver: r[6]||'',
            qty: r[7]||'', doNum: String(r[11]||'').trim()
          });
        }
        continue;
      }
      foundValidRow = true;

      /* fill-down header fields */
      if(r[0]) lastCust = r[0];
      if(r[1]) lastContractQty = r[1];
      if(r[2]) lastType = r[2];

      /* sub-group detection */
      if(lastCust !== lastCustForSubgroup){
        subGroupIdx = 0; prevNo = 0; lastQty=''; lastTol='';
        lastNote='';                                              /* v4.22.17 — reset note on customer change */
        lastCustForSubgroup = lastCust;
      }
      if(noInt === 1 && prevNo > 1){ subGroupIdx++; lastQty=''; lastTol=''; lastNote=''; }
      prevNo = noInt;

      if(r[7]) lastQty = r[7];
      if(r[8]) lastTol = r[8];
      /* v4.22.17 — Note fill-down. Excel often merges the note cell across
         multiple plate rows for the same customer/sub-group; when the paste
         is split into TSV, only the first row carries the note text and
         subsequent rows have an empty r[12]. Mirror the lastCust pattern:
         remember the most recent non-empty note and reuse it on rows where
         r[12] is empty. Reset on customer change AND sub-group reset above
         so a note from one customer's block can never leak into the next. */
      if(r[12]) lastNote = r[12];

      const gateRaw = (r[9]||'').toUpperCase().replace(/\s+/g,'');
      const loadRaw = (r[10]||'').toUpperCase().replace(/\s+/g,'');

      out.push({
        no:          noRaw,
        customer:    lastCust,
        contractQty: lastContractQty,
        type:        lastType,
        plate:       r[4]  || '',
        rmooc:       r[5]  || '',
        driver:      r[6]  || '',
        qty:         r[7]  || lastQty,
        tolerance:   r[8]  || lastTol,
        allowGate:   gateRaw === 'OK' ? 'OK' : 'NO',
        allowLoad:   loadRaw === 'OK' ? 'OK' : 'NO',
        doNum:       cleanDO(r[11]||''),                          /* strip WMS leading zeros (V406 parity) */
        note:        r[12] || lastNote,                            /* v4.22.17 — fill-down */
        __noteOwn:   r[12] || '',                                  /* v4.183 — note của CHÍNH dòng (không điền xuống) */
        __qtyOwn:    r[7]  || '',                                  /* v4.184 — MT của CHÍNH dòng (trống = ô Quantity gộp) */
        _subGroup:   subGroupIdx,
        _seq:        gseq++,                                       /* v4.55.4 — paste/Excel source order */
        _status:     '',
        _actualQty:  '',
        _autoSync:   true,                                         /* v4.59 — auto-sync is ALWAYS the default */
        _forDate:    planDate
      });
    }
    return { rows: out, skipped, total: sheetTotal };
  }

  /* -------- Diff computation --------
     Compares a parsed paste against the current PLAN by positional fingerprint.
     For 'replace' mode: every old row that has no positional match becomes a removal,
                        every matched row turns into a field-by-field change (oid kept),
                        every unmatched new row is an add (gets a fresh oid).
     For 'update' mode:  same matching but unmatched OLD rows are NOT removed —
                        they stay as-is. Unmatched NEW rows are added. */
  const COMPARE_FIELDS = ['no','customer','contractQty','type','plate','rmooc','driver',
                          'qty','tolerance','allowGate','allowLoad','doNum','note'];

  function rowFieldChanged(oldRow, newRow){
    for(const f of COMPARE_FIELDS){
      if(String(oldRow[f]||'').trim() !== String(newRow[f]||'').trim()) return true;
    }
    return false;
  }
  function fieldDiffs(oldRow, newRow){
    const out = [];
    for(const f of COMPARE_FIELDS){
      const ov = String(oldRow[f]||'').trim();
      const nv = String(newRow[f]||'').trim();
      if(ov !== nv) out.push({field:f, old:ov, new:nv});
    }
    return out;
  }

  function computeDiff(newRows, mode, forDate, opts){
    /* v4.22.2 — 3-pass matching to survive sales re-paste edge cases:
       PASS 1: real DO equality — strongest identity.
       PASS 2: plate + driver + customer (positionless) — survives sales
               inserting a new customer in the middle of the list, which
               used to shift `no` and break the old position fingerprint.
       PASS 3: full position fingerprint (legacy behavior) — fallback for
               planning rows with no clear identity.
       Each pass marks both sides as consumed so the next pass can't double-
       match. After all passes:
         - Unmatched new rows → ADDED (fresh oid via resolveOid).
         - Unmatched old rows → REMOVED.
         - Matched pairs → CHANGED if any field differs, else UNCHANGED.
       Special migrations on matched pairs:
         (a) old._oid is TMP, new has real DO → migrate _oid to real DO.
         (b) old has real DO, new shows "After loading" / non-real DO →
             KEEP old real DO + _oid (sales sheet hasn't been updated to
             reflect the WMS GI promotion that already happened — do NOT
             demote the row).
         (c) _oid still TMP and no real DO came in → write the temp _oid
             into the DO column so it shows directly. */
    const oldOnDate = Object.values(PLAN).filter(r => (r._forDate || planDate) === forDate);
    const matchedOldOids = new Set();
    const matchedNewIdx  = new Set();
    const seqMap = _tempSeqMap(forDate);
    const pairs = [];   /* [{ or, nr }] */

    /* ══════════════════ v4.140 · LUẬT NHẬN DIỆN ĐƠN KHI DÁN LẠI ══════════════════
       Chốt của người dùng (09/09/26):
         · Đơn ĐÃ CÓ SỐ DO  → dò theo DO là chuẩn nhất, không cần gì khác.
         · Đơn CHƯA CÓ DO   → dò theo biển số + tên tài xế + cột No (No đếm theo
                              TỪNG CỤM KHÁCH HÀNG, không phải số thứ tự cả bảng).
         · Trùng tài xế + biển số + khối lượng mà CHỈ LỆCH CỘT No → KHÔNG được tự
           quyết: hỏi nhân viên "đơn khác hay đơn cũ bị đổi vị trí?".
       Vì sao phải hỏi: sale chèn thêm dòng vào giữa là cột No của mọi dòng phía
       dưới dịch hết. Máy đoán bừa thì hoặc gộp nhầm hai đơn thật (mất một chuyến
       xe), hoặc tách một đơn thành hai (sinh dòng trùng). Cả hai đều im lặng.

       BỐN vòng ĐẦU là chắc chắn ⇒ ghép thẳng, không hỏi:
         PASS 1  DO thật
         PASS 2  khách + biển số + tài xế + No   (khớp đủ, không mơ hồ)
         PASS 3  vân tay vị trí (khách 8 ký tự + tài xế + xe + No + ngày)
         PASS 4  _identKey xếp hàng — N dòng y hệt ghép đúng N dòng
       HAI vòng SAU là mơ hồ ⇒ gom vào danh sách chờ NHÂN VIÊN XÁC NHẬN:
         PASS A  khách + xe + tài xế khớp, chỉ LỆCH No   (đơn cũ đổi vị trí?)
         PASS B  khách + No khớp, đổi xe HOẶC tài xế      (đổi xe/đổi tài?)
       `opts.decisions[<oid>»<chỉ số dòng dán>]` = 'same' | 'diff' là câu trả lời
       của nhân viên; chưa có câu trả lời thì dồn vào `opts.ambiguous` và KHÔNG
       ghép (lượt tính sau sẽ chạy lại với đầy đủ quyết định). */
    const _decisions = (opts && opts.decisions) || null;
    const _ambOut    = (opts && opts.ambiguous) || null;
    const _pair = (or, nr, ni)=>{ pairs.push({ or, nr }); matchedOldOids.add(or._oid); matchedNewIdx.add(ni); };
    /* Một dòng chỉ được đưa ra hỏi ĐÚNG MỘT LẦN: đã hỏi ở PASS A rồi thì PASS B
       không được hỏi lại về chính dòng đó (nhân viên sẽ thấy hai câu hỏi mâu
       thuẫn nhau về cùng một xe). */
    const _askedOld = new Set(), _askedNew = new Set();
    /* Ghép "có điều kiện": chỉ ghép khi nhân viên đã xác nhận là MỘT đơn. */
    function _pairIfConfirmed(or, nr, ni, kind){
      if(_askedOld.has(or._oid) || _askedNew.has(ni)) return false;
      const dk = String(or._oid||'') + '»' + ni;
      const dec = _decisions ? _decisions[dk] : undefined;
      if(dec === 'same'){ _pair(or, nr, ni); return true; }
      _askedOld.add(or._oid); _askedNew.add(ni);
      if(dec === 'diff') return false;                 /* nhân viên nói: đơn KHÁC */
      if(_ambOut) _ambOut.push({ dkey:dk, kind, old:or, neu:nr, ni });
      return false;                                    /* chưa hỏi ⇒ chưa ghép */
    }
    const _cu   = r => _normTxt(r.customer).replace(/[^A-Z0-9]/g,'');
    const _pl   = r => _normTxt(r.plate).replace(/[^A-Z0-9]/g,'');
    const _dr   = r => _normTxt(r.driver).replace(/[^A-Z0-9]/g,'');
    const _rm   = r => _normTxt(r.rmooc).replace(/[^A-Z0-9]/g,'');
    const _noOf = r => _normTxt(r.no);
    const _qty  = r => _normTxt(r.qty).replace(/[^0-9.]/g,'');

    /* ── PASS 1 — DO thật (mạnh nhất, bỏ qua mọi thứ khác) ── */
    const oldByDO = new Map();
    oldOnDate.forEach(or => {
      const d = String(or.doNum||'').trim();
      if(isRealDO(d) && !oldByDO.has(d)) oldByDO.set(d, or);
    });
    newRows.forEach((nr, ni) => {
      const d = String(nr.doNum||'').trim();
      if(!isRealDO(d)) return;
      const or = oldByDO.get(d);
      if(!or || matchedOldOids.has(or._oid)) return;
      _pair(or, nr, ni);
      oldByDO.delete(d);
    });

    /* ── PASS 2 — khách + biển số + tài xế + No (đủ bốn ⇒ chắc chắn một đơn) ──
       No ở đây là số thứ tự TRONG CỤM KHÁCH HÀNG (cột `no` của bảng sale), nên
       hai khách khác nhau cùng có dòng "1" không bao giờ đụng nhau. */
    const _k4 = r => {
      const cu = _cu(r), pl = _pl(r), no = _noOf(r);
      if(!cu || !pl || !no) return '';
      return cu + '|' + pl + '|' + _dr(r) + '|' + no;
    };
    const oldBy4 = new Map();
    oldOnDate.forEach(or => {
      if(matchedOldOids.has(or._oid)) return;
      const k = _k4(or); if(!k) return;
      if(!oldBy4.has(k)) oldBy4.set(k, []);
      oldBy4.get(k).push(or);
    });
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      const k = _k4(nr); if(!k) return;
      const arr = oldBy4.get(k);
      if(!arr || !arr.length) return;
      _pair(arr.shift(), nr, ni);
    });

    /* ── PASS 3 — vân tay vị trí (giữ từ v4.22.2; cũng đã gồm cột No) ── */
    const oldByFp = new Map();
    oldOnDate.forEach(or => {
      if(matchedOldOids.has(or._oid)) return;
      const fp = posFingerprint(or, forDate);
      if(fp && !oldByFp.has(fp)) oldByFp.set(fp, or);
    });
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      const fp = posFingerprint(nr, forDate);
      if(!fp) return;
      const or = oldByFp.get(fp);
      if(!or || matchedOldOids.has(or._oid)) return;
      _pair(or, nr, ni);
      oldByFp.delete(fp);
    });

    /* ── PASS 4 — _identKey xếp hàng (N dòng y hệt ghép đúng N dòng) ── */
    const oldByIdent2 = new Map();
    oldOnDate.forEach(or => {
      if(matchedOldOids.has(or._oid)) return;
      const k = _identKey(or, forDate);
      if(!k) return;
      if(!oldByIdent2.has(k)) oldByIdent2.set(k, []);
      oldByIdent2.get(k).push(or);
    });
    oldByIdent2.forEach(arr => arr.sort((a,b)=>Number(a.lastAt||0) - Number(b.lastAt||0)));
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      const k = _identKey(nr, forDate);
      if(!k) return;
      const arr = oldByIdent2.get(k);
      if(!arr || !arr.length) return;
      _pair(arr.shift(), nr, ni);
    });

    /* ── PASS A (HỎI) — khách + xe + tài xế khớp, CHỈ LỆCH cột No ──
       Đây đúng là cảnh "sale chèn thêm dòng vào giữa": mọi dòng dưới dịch No.
       Rất có thể là đơn cũ đổi vị trí, nhưng cũng có thể là chuyến thứ hai của
       cùng xe cùng tài xế ⇒ để nhân viên quyết. Xếp theo No để ghép cặp gần
       nhau nhất khi một khách có nhiều chuyến cùng xe. */
    const oldByCDP = new Map(), newByCDP = new Map();
    oldOnDate.forEach(or => {
      if(matchedOldOids.has(or._oid)) return;
      const cu = _cu(or), pl = _pl(or);
      if(!cu || !pl) return;
      const k = cu + '|' + pl + '|' + _dr(or);
      if(!oldByCDP.has(k)) oldByCDP.set(k, []);
      oldByCDP.get(k).push(or);
    });
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      const cu = _cu(nr), pl = _pl(nr);
      if(!cu || !pl) return;
      const k = cu + '|' + pl + '|' + _dr(nr);
      if(!newByCDP.has(k)) newByCDP.set(k, []);
      newByCDP.get(k).push({ nr, ni });
    });
    const _byNo = (a,b)=>(parseInt(_noOf(a),10)||0) - (parseInt(_noOf(b),10)||0);
    newByCDP.forEach((news, k) => {
      const olds = oldByCDP.get(k);
      if(!olds || !olds.length) return;
      olds.sort(_byNo);
      news.sort((x,y)=>_byNo(x.nr, y.nr));
      const n = Math.min(olds.length, news.length);
      for(let i = 0; i < n; i++){
        const or = olds[i], { nr, ni } = news[i];
        if(matchedOldOids.has(or._oid) || matchedNewIdx.has(ni)) continue;
        _pairIfConfirmed(or, nr, ni, 'moved');
      }
    });

    /* ── PASS B (HỎI) — khách + No khớp nhưng ĐỔI XE hoặc ĐỔI TÀI XẾ ──
       Chỉ xét khi mỗi bên còn ĐÚNG MỘT dòng chưa khớp ở khoá (khách|No) và hai
       dòng còn chung ít nhất một dấu hiệu mạnh: xe · tài xế · rơ-moóc · DO thật.
       Vẫn phải hỏi: có thể là đổi xe cho đúng đơn cũ, mà cũng có thể là sale
       thay hẳn đơn khác vào vị trí đó. */
    const _shareToken = (a, b) => {
      const da = String(a.doNum||'').trim(), db = String(b.doNum||'').trim();
      if(isRealDO(da) && da === db) return true;
      if(_pl(a) && _pl(a) === _pl(b)) return true;
      if(_dr(a) && _dr(a) === _dr(b)) return true;
      if(_rm(a) && _rm(a) === _rm(b)) return true;
      return false;
    };
    const _cuNo = r => {
      const cu = _cu(r).slice(0,12), no = _noOf(r);
      return (cu && no) ? (cu + '|' + no) : '';
    };
    const oldByCuNo = new Map(), newByCuNo = new Map();
    oldOnDate.forEach(or => {
      if(matchedOldOids.has(or._oid)) return;
      const k = _cuNo(or); if(!k) return;
      if(!oldByCuNo.has(k)) oldByCuNo.set(k, []);
      oldByCuNo.get(k).push(or);
    });
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      const k = _cuNo(nr); if(!k) return;
      if(!newByCuNo.has(k)) newByCuNo.set(k, []);
      newByCuNo.get(k).push({ nr, ni });
    });
    newByCuNo.forEach((news, k) => {
      const olds = oldByCuNo.get(k);
      if(!olds || olds.length !== 1 || news.length !== 1) return;   /* mơ hồ ⇒ bỏ qua */
      const or = olds[0], { nr, ni } = news[0];
      if(matchedOldOids.has(or._oid) || matchedNewIdx.has(ni)) return;
      if(!_shareToken(or, nr)) return;                              /* không còn dấu hiệu chung */
      _pairIfConfirmed(or, nr, ni, 'swap');
    });

    /* Apply matched pairs — preserve oid/status/actual, handle DO migrations. */
    const added = [], removed = [], changed = [], unchanged = [];
    pairs.forEach(({ or, nr }) => {
      nr._oid       = or._oid;
      nr._status    = or._status || '';
      nr._actualQty = or._actualQty || '';
      /* v4.59 — carry the per-row auto flag through the re-paste. Before this,
         a matched row whose _oid changed (TMP → real DO) was written as a FULL
         node from `nr` (which had no _autoSync), silently dropping a manual
         lock / cancel override. Default stays AUTO (true). */
      nr._autoSync  = (or._autoSync === false) ? false : true;
      /* v4.109 — mang LINK qua re-paste. Nếu không copy 4 trường này thì mỗi
         lần sale dán lại kế hoạch là mọi nhóm 🔗 biến mất và tổng PLAN lại
         phình lên như cũ. */
      nr._lnkG      = or._lnkG || '';
      nr._lnkK      = or._lnkK || '';
      nr._lnkPrint  = or._lnkPrint || '';
      nr._altSkip   = or._altSkip || false;
      nr._forDate   = forDate;
      const newDO = String(nr.doNum||'').trim();
      const oldDO = String(or.doNum||'').trim();
      /* (a) TMP → real DO migration. */
      if(isRealDO(newDO) && !isRealDO(or._oid) && isTempOid(or._oid)){
        const ymd = (forDate||planDate).replaceAll('-','').slice(2);   /* YYMMDD */
        nr._oid = newDO + '-' + ymd;
      }
      /* (b) v4.22.2 — REAL → "After loading" demotion guard. When the old
         row carries a real DO (already promoted from WMS GI) but the new
         sales paste regressed to "after loading" or blank, KEEP the real
         DO. Sales sheet just hasn't caught up with the WMS GI promotion
         that already happened — losing the real DO here would force a
         re-promotion next paste. */
      if(isRealDO(oldDO) && !isRealDO(newDO)){
        nr.doNum = or.doNum;
      }
      /* (c) Temp _oid carryover when no real DO came in. */
      if(isTempOid(String(nr._oid||'')) && !isRealDO(String(nr.doNum||'').trim())){
        nr.doNum = nr._oid;
      }
      const diffs = fieldDiffs(or, nr);
      if(diffs.length) changed.push({ old: or, new: nr, diffs });
      else unchanged.push({ old: or, new: nr });
    });

    /* Unmatched new rows → ADDED with fresh oid. */
    newRows.forEach((nr, ni) => {
      if(matchedNewIdx.has(ni)) return;
      nr._oid = resolveOid(nr, forDate, seqMap);
      nr._forDate = forDate;
      nr._status = nr._status || '';
      nr._autoSync = true;               /* v4.59 — new rows are ALWAYS auto */
      if(isTempOid(String(nr._oid||''))){
        nr.doNum = nr._oid;
      }
      added.push(nr);
    });

    /* Unmatched old rows → REMOVED. */
    oldOnDate.forEach(or => {
      if(!matchedOldOids.has(or._oid)) removed.push(or);
    });

    /* ══════════ v4.139 · KHONG BAO GIO GHI THEM MOT DONG DA CO ══════════
       Su that 09/09/26: Firebase co 50 dong, trong do 18 dong la BAN SAO Y HET
       (PLN-260909-mtsjgip5x cua may A luc 02:35 va PLN-260909-mtteu4zax cua may
       B luc 08:18 — giong nhau tung o). Vi sao: computeDiff doi chieu voi PLAN
       trong RAM cua MAY DANG DAN; may do luc ay dang giu du lieu CU (cache cu /
       lo su kien) nen khong thay dong nao khop ⇒ moi dong deu la "them moi" va
       nhan mot khoa PLN-... ngau nhien MOI.
       v4.139 vá hai lop:
         ① runChoice() quét lại Firebase TRƯỚC khi tính diff (xem _resyncNow);
         ② lưới cuối cùng ngay đây — một dòng "thêm mới" mà trên bảng VẪN CÒN
            một dòng y hệt (không được khớp, không bị xoá trong lần dán này)
            thì KHÔNG ghi; nó được dồn vào diff.blocked để báo cho người dùng.
       Đếm theo SỐ LƯỢNG nên vẫn dán được hai dòng cố ý giống nhau: chỉ chặn
       đúng phần dư so với số dòng đã có. */
    const _surviveCnt = new Map();
    oldOnDate.forEach(or=>{
      if(matchedOldOids.has(or._oid)) return;      /* đã khớp = chính dòng này */
      if(removed.indexOf(or) >= 0) return;         /* sắp bị xoá trong lần dán này */
      const k = _identKey(or, forDate);
      if(k) _surviveCnt.set(k, (_surviveCnt.get(k)||0) + 1);
    });
    const blocked = [];
    const addedKept = [];
    added.forEach(nr=>{
      const k = _identKey(nr, forDate);
      const n = k ? (_surviveCnt.get(k)||0) : 0;
      if(n > 0){ _surviveCnt.set(k, n - 1); blocked.push(nr); }
      else addedKept.push(nr);
    });
    added.length = 0; addedKept.forEach(r=>added.push(r));

    const duplicates = _detectCrossDateDuplicates(added, forDate);
    return { added, removed, changed, unchanged, duplicates, blocked,
             ambiguous: _ambOut || [] };
  }
  /* Cross-date duplicate real-DO scan — shared by computeDiff and
     computeReplaceWipe. Principle from operations: 1 real DO = 1 order.
     If a row being added carries a real DO that already exists in PLAN on a
     DIFFERENT _forDate, surface it as a soft warning. The new -YYMMDD suffix
     on _oid means both rows can safely coexist in Firebase (distinct keys),
     so this is a heads-up, NOT a blocker. The operator decides whether to
     keep both rows (e.g. order rolled forward after cancellation) or cancel
     and clean up the older entry first.
     Only real DOs are scanned (temp DOs already embed the date in their id,
     so they can't collide cross-date). */
  function _detectCrossDateDuplicates(addedRows, forDate){
    const dups = [];
    if(!addedRows || !addedRows.length) return dups;
    addedRows.forEach(nr=>{
      const newDO = String(nr.doNum||'').trim();
      if(!isRealDO(newDO)) return;
      Object.values(PLAN).forEach(or=>{
        if(or._oid === nr._oid) return;        /* same row (shouldn't happen for added, defensive) */
        const orDO   = String(or.doNum||'').trim();
        const orDate = or._forDate || planDate;
        if(orDO === newDO && orDate !== forDate){
          dups.push({newRow:nr, existingRow:or, existingDate:orDate});
        }
      });
    });
    return dups;
  }
  /* True-wipe builder for Replace All mode. Unlike computeDiff, this does NOT
     attempt to match rows, preserve _status/_actualQty, or carry oids forward.
     It simply removes every row currently on the given _forDate and adds every
     pasted row as brand-new. Operational state (status, actual) on existing
     rows is intentionally discarded — that is what "Replace All (Wipe)" means.
     Rows on OTHER dates are untouched. Result has the same shape as computeDiff
     so applyDiff / showDiff can render it unchanged. */
  function computeReplaceWipe(newRows, forDate){
    const removed = Object.values(PLAN).filter(r => (r._forDate || planDate) === forDate);
    const seqMap = _tempSeqMap(forDate);
    const added = newRows.map(nr => {
      nr._oid = resolveOid(nr, forDate, seqMap);
      nr._forDate = forDate;
      nr._status = '';
      nr._actualQty = '';
      nr._autoSync = true;               /* v4.59 — wipe restores the AUTO default */
      if(isTempOid(String(nr._oid||''))){
        nr.doNum = nr._oid;
      }
      return nr;
    });
    const duplicates = _detectCrossDateDuplicates(added, forDate);
    return { added, removed, changed: [], unchanged: [], duplicates };
  }
  /* find the highest TMP sequence already in PLAN for the given forDate
     so generated temp oids don't collide on repeated pastes */
  /* Build {prefix: maxSeq} from existing temp ids on this date so re-paste /
     re-run continues each customer's counter instead of colliding. New format
     only (ABC + YYMMDD + seq); the seq is namespaced by the visible 3-letter
     prefix, which guarantees unique Firebase keys even if two customers share it. */
  function _tempSeqMap(forDate){
    const ds = (forDate||planDate).replaceAll('-','');
    const yymmdd = ds.slice(2);
    const map = {};
    Object.keys(PLAN).forEach(k=>{
      const m = /^([A-Z]{3})(\d{6})(\d{1,})$/.exec(String(k));
      if(m && m[2] === yymmdd){
        const n = parseInt(m[3], 10);
        if(!isNaN(n) && n > (map[m[1]]||0)) map[m[1]] = n;
      }
    });
    return map;
  }

  /* -------- Apply (per-field delta writes) -------- */
  function applyDiff(diff, mode, reason){
    if(!canWrite(PERMK)){ toast('You do not have permission to edit '+UILABEL,'er'); return; }
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    const payload = {};
    let writes = 0;

    /* removals */
    diff.removed.forEach(or=>{
      delete PLAN[or._oid];
      payload[`${FBN}${or._oid}`] = null;
      writes++;
    });

    /* additions — write full row at once (it's brand new, no point in deltas) */
    diff.added.forEach(nr=>{
      /* v4.126 — dòng mới cũng phải mang dấu vết; đóng dấu vào CHÍNH object rồi
         mới ghi nguyên dòng (không tách path con — xem chú thích _stampRow). */
      const _nrow = _stampRow(sanitizeForStorage(nr));
      PLAN[nr._oid] = _nrow;
      payload[`${FBN}${nr._oid}`] = _nrow;
      writes++;
    });

    /* field-level changes — only touched fields go up */
    diff.changed.forEach(c=>{
      /* if oid changed (e.g. TMP → real DO), we must move the node */
      const oldOid = c.old._oid;
      const newOid = c.new._oid;
      if(oldOid !== newOid){
        delete PLAN[oldOid];
        payload[`${FBN}${oldOid}`] = null;
        const _nrow = _stampRow(sanitizeForStorage(c.new));   /* v4.126 */
        PLAN[newOid] = _nrow;
        payload[`${FBN}${newOid}`] = _nrow;
        writes++;
      } else {
        const row = PLAN[oldOid] || (PLAN[oldOid] = sanitizeForStorage(c.old));
        c.diffs.forEach(d=>{
          row[d.field] = d.new;
          payload[`${FBN}${oldOid}/${d.field}`] = d.new;
          writes++;
        });
        /* stamp last-edit (v4.126 — kèm vai trò người sửa) */
        _stampWho(payload, oldOid);
      }
    });

    /* v4.55.4 — keep paste/Excel order (_seq) in sync for EVERY current row,
       even when only the order changed and no other field differs. _seq is not
       in COMPARE_FIELDS (so it never shows up as a user-facing "changed" field
       in the diff modal), but it must still be written so TABLE VIEW mirrors
       the latest pasted order. Added rows already carry _seq via their full
       write above; here we cover same-oid changed rows and unchanged rows. */
    const _stampSeq = (oid, seq)=>{
      if(seq === undefined || seq === null) return;
      const row = PLAN[oid];
      if(!row || row._seq === seq) return;
      row._seq = seq;
      payload[`${FBN}${oid}/_seq`] = seq;
      writes++;
    };
    diff.changed.forEach(c=>{ if(c.old._oid === c.new._oid) _stampSeq(c.new._oid, c.new._seq); });
    (diff.unchanged||[]).forEach(u=>{ _stampSeq(u.new._oid, u.new._seq); });

    /* v4.183 — sale note Cancel ⇒ trạng thái (đã được người dán xác nhận trong hộp diff) */
    const cxN = _cxApply(diff, payload);
    writes += cxN;

    if(!writes){ toast('No changes to write','ok'); return; }

    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>{
        toast(`${UILABEL} ${reason}: ${diff.added.length}+ / ${diff.removed.length}- / ${diff.changed.length}~`+(cxN ? ` · 🚫 ${cxN} by sale note` : ''), 'ok');
      })
      .catch(e=>{ console.error('plan push', e); toast(UILABEL+': Firebase write failed','er'); });

    if(table) rebuildTableData();
    refreshCounts();
    refreshBadge();
  }

  /* ═══ v4.183 — SALE NOTE "CANCEL" ⇒ gợi ý 🚫 Cancelled ngay lúc dán ═══
     Sale đánh dấu xe huỷ bằng chữ "Cancel. Customer change plan" ở cột Note (M),
     kèm Quantity trống, Allow gate/load = NO, không DO. App KHÔNG tự đoán thêm:
     chỉ liệt kê trong hộp xác nhận dán, tick sẵn, người dán bỏ tick nếu sai.
       own  = chính ô Note của dòng có chữ cancel/hủy
       down = chữ cancel đến từ ô gộp (điền xuống) ⇒ chỉ nhận khi xe chưa có DO
              thật và Allow load ≠ OK (dòng thật đang chạy không bị kéo theo)   */
  /* v4.184 — NHIỀU KIỂU CHỮ để không sót: cancel/cancelled/canceled/cancellation/cxl/canc,
     hủy/huỷ/huy chuyến/huy xe, không lấy/nhận/đến/vào (hàng), no show, not come/load/take,
     won't/will not…, bỏ chuyến/xe/đơn, postpone/hoãn/dời ngày. Loại trừ PHỦ ĐỊNH:
     "không hủy", "not cancel", "no cancel", "un-cancel", "cancel lại/revoke cancel".       */
  const CX_RES = [
    /\bcan+cel+(?:l?ed|ling|lation)?\b/i, /\bcxl\b/i, /\bcanc\b/i, /\bcnl\b/i,
    /h[uủ][yỷ]\s*(?:chuy[eếẾ]n|xe|[đd][oơ]n|l[aấ]y|h[aà]ng|k[eế]\s*ho[aạ]ch|plan)/i, /(?:^|[^a-zà-ỹ])h(?:ủy|uỷ)(?![a-zà-ỹ])/i,
    /kh[oô]ng\s*(?:l[aấ]y\s*h[aà]ng|nh[aậ]n\s*h[aà]ng|(?:[đd][eế]n|t[oớ]i|v[aà]o)\s*l[aấ]y|ch[aạ]y|n[aạ]p\s*h[aà]ng|l[aấ]y\s*n[uữ]a|[đd][eế]n\s*n[uữ]a)/i, /\bko\s*(?:l[aấ]y|ch[aạ]y)\b/i,
    /\bno[\s-]*show\b/i, /\bnot\s*(?:come|coming|arrive|arriving|take\s*(?:the\s*)?cargo)\b/i,
    /\b(?:won'?t|will\s*not|wont)\s*(?:come|arrive|take\s*(?:the\s*)?cargo)\b/i,
    /\bb[oỏ]\s*(?:chuy[eế]n|xe|[đd][oơ]n)\b/i,
    /\bpostpone[ds]?\b/i, /ho[ãÃ]n/i, /d[oờ]i\s*(?:ng[aà]y|l[iị]ch|sang)/i
  ];
  const CX_NEG = /(?:kh[oô]ng|ko|chưa|not|no|un-?|đừng)\s*(?:c[aầ]n\s*)?(?:h[uủ][yỷ]|cancel)|cancel\s*(?:l[aạ]i|revoked?)|revoke\s*cancel|re-?(?:instate|activate)/i;
  function cxText(t){
    const s = String(t || '');
    if(!s.trim() || CX_NEG.test(s)) return false;
    return CX_RES.some(re => re.test(s));
  }
  const CX_RE = { test: cxText };   /* giữ tên cũ cho các chỗ đang gọi CX_RE.test */
  function _cxWhy(r){
    if(!r) return '';
    const own = String(r.__noteOwn == null ? r.note || '' : r.__noteOwn).trim();
    if(own) return cxText(own) ? 'own' : '';
    if(cxText(String(r.note||'')) && !isRealDO(r.doNum) && String(r.allowLoad||'').toUpperCase() !== 'OK') return 'down';
    return '';
  }
  /* ── v4.184 — 🔗 GỢI Ý LINK TỪ Ô GỘP + GHI CHÚ ─────────────────────────
     Sale gộp ô Quantity (H) qua nhiều dòng ⇒ TSV chỉ dòng đầu có MT, các dòng sau trống.
     Khối = dòng có MT riêng + các dòng NGAY SAU cùng khách/cùng nhóm mà MT trống (không
     tính dòng cancel). Ngoài ra ghi chú gộp (M) kiểu "1 driver/truck will take cargo",
     "1 trong các xe sẽ lấy hàng" cũng lập khối dù mỗi dòng có MT.
     Chọn kiểu:
       note một xe nhiều DO / chia tấn (SNOTE.parseSplit) ............ MDO
       note "1 trong các xe / 1 driver / 1 truck / one of / either" .. ALT
       cùng xe, cùng tài xế, ≥2 DO .................................... MDO
       cùng xe, khác tài xế ........................................... ALT (một trong các tài xế)
       khác xe, ≤1 DO ................................................. ALT (một trong các xe)
       khác xe, mỗi xe có DO riêng .................................... ALT nhưng KHÔNG tick sẵn
     Người dùng đổi kiểu / bỏ tick trong bảng duyệt.                                        */
  const ALT_RE = /\b(?:1|one|m[oộ]t)\s+(?:of\s+(?:the\s+)?|in\s+|trong\s+(?:c[aá]c\s+|s[oố]\s+|nh[uữ]ng\s+)?)?(?:\d+\s+)?(?:drivers?|trucks?|t[aà]i\s*x[eế]|xe|t\/?l)\b|\beither\b|\bone\s+of\b|ch[iỉ]\s*(?:1|m[oộ]t)\s*(?:xe|t[aà]i)|\balternat/i;
  const MDO_RE = /(?:1|m[oộ]t|one)\s*(?:xe|truck|t\/?l)\s*(?:\d+|hai|two|nhi[eề]u|several|2)\s*(?:do|lo[aạ]i|types?|cargo|[đd][oơ]n)|multi[\s-]*do|nhi[eề]u\s*do\b|\b[2-9]\s*dos?\b|\btwo\s*dos?\b|gh[eé]p\s*(?:do|[đd][oơ]n)/i;
  const _npl = v => String(v||'').replace(/[-.\s]/g,'').toUpperCase();
  const _ndr = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z]/g,'');
  function _qn(v){ const x = parseFloat(String(v==null?'':v).replace(/,/g,'')); return isFinite(x) ? x : 0; }
  function _rowInfo(r){
    return { oid:String(r._oid||''), cust:r.customer||'', no:String(r.no||''), plate:r.plate||'', rmooc:r.rmooc||'', driver:r.driver||'',
             qty:r.qty||'', qtyOwn:String(r.__qtyOwn==null?r.qty||'':r.__qtyOwn), doNum:isRealDO(r.doNum)?String(r.doNum).trim():'', type:r.type||'',
             note:String(r.note||''), noteOwn:String(r.__noteOwn==null?'':r.__noteOwn) };
  }
  function _lkScan(diff, mode){
    const list = [].concat(diff.added || [], (diff.changed||[]).map(c => c.new), (diff.unchanged||[]).map(u => u.new))
      .filter(r => r && r._oid).sort((a, b) => (a._seq||0) - (b._seq||0));
    const blocks = [], used = new Set();
    /* ① ô Quantity gộp */
    let cur = null;
    list.forEach(r => {
      const own = String(r.__qtyOwn == null ? r.qty || '' : r.__qtyOwn).trim();
      const same = cur && r.customer === cur.cust && r._subGroup === cur.sg;
      if(own){ cur = { cust:r.customer, sg:r._subGroup, rows:[r], total:_qn(own), src:'qty' }; blocks.push(cur); }
      else if(same && !_cxWhy(r)) cur.rows.push(r);
      else if(!same) cur = null;
    });
    /* ② ô Note gộp có chữ "1 trong các xe…" */
    let nb = null; const nblocks = [];
    list.forEach(r => {
      const own = String(r.__noteOwn || '').trim();
      if(own){ nb = { note:own, cust:r.customer, rows:[r], src:'note' }; nblocks.push(nb); return; }
      if(nb && r.customer === nb.cust && String(r.note||'').trim() === nb.note) nb.rows.push(r); else nb = null;
    });
    const out = [];
    const noteOf = rows => { const o = rows.map(r => String(r.__noteOwn||'').trim()).find(Boolean); return o || String(rows[0].note||'').trim(); };
    const mk = (b) => {
      const rows = b.rows.filter(r => !used.has(r._oid));
      if(rows.length < 2) return;
      if(rows.some(r => lnkIsLinked(PLAN[r._oid] || r) || lnkIsLinked(r))) return;          /* đã link (mang qua re-paste) */
      const busy = rows.filter(r => { const st = String(getEffectiveStatus(PLAN[r._oid] || r)||'').toLowerCase(); return st === 'loading' || st === 'done'; });
      if(busy.length > 1) return;
      const note = noteOf(rows);
      const plates = new Set(rows.map(r => _npl(r.plate)).filter(Boolean));
      const drivers = new Set(rows.map(r => _ndr(r.driver)).filter(Boolean));
      const dos = new Set(rows.map(r => isRealDO(r.doNum) ? String(r.doNum).trim() : '').filter(Boolean));
      const px = (typeof SNOTE !== 'undefined') ? SNOTE.parseSplit(note) : null;
      let kind = 'alt', why = '', on = true;
      if(MDO_RE.test(note) || px){ kind = 'mdo'; why = 'Sale note: one truck, several DOs / cargo types'; }
      else if(ALT_RE.test(note)){ kind = 'alt'; why = 'Sale note: only one of these ' + (plates.size > 1 ? 'trucks' : 'drivers') + ' will take the cargo'; }
      else if(b.src === 'note') return;                                                 /* ô note gộp thường — không phải link */
      else if(plates.size === 1 && drivers.size <= 1 && dos.size >= 2){ kind = 'mdo'; why = 'Merged quantity · same truck and driver · ' + dos.size + ' DOs'; }
      else if(plates.size === 1 && drivers.size > 1){ kind = 'alt'; why = 'Merged quantity · same truck, ' + drivers.size + ' drivers — one of them will come'; }
      else if(plates.size > 1 && dos.size <= 1){ kind = 'alt'; why = 'Merged quantity · ' + plates.size + ' trucks — one of them will come'; }
      else if(plates.size <= 1){ kind = 'mdo'; why = 'Merged quantity · same truck'; }
      else { kind = 'alt'; on = false; why = 'Merged quantity but ' + plates.size + ' trucks each with a DO — check with sales'; }
      rows.forEach(r => used.add(r._oid));
      const total = b.total || _qn(rows[0].__qtyOwn || rows[0].qty);
      /* MDO: đề xuất chia MT — theo note nếu đọc được, nếu không dòng đầu = cả khối, còn lại 0 */
      const q = {};
      rows.forEach((r, i) => { q[r._oid] = String(r.__qtyOwn == null ? r.qty || '' : r.__qtyOwn).trim(); });
      const qm = {};
      if(b.src === 'qty'){
        let rest = total; const left = [];
        rows.forEach(r => {
          const ty = String(r.type||''), dn = String(r.doNum||'').trim();
          const f = px && (px.fixed||[]).find(x => (x.type && ty.indexOf(x.type) >= 0 && !Object.values(qm).some(v => v.f === x)) || (px.dos||[]).indexOf(dn) >= 0);
          if(f && isFinite(f.mt)){ qm[r._oid] = { v:f.mt, f }; rest -= f.mt; } else left.push(r);
        });
        if(px && left.length === 1 && (px.fixed||[]).length) qm[left[0]._oid] = { v:Math.round(rest * 1000) / 1000 };
        if(!px || !Object.keys(qm).length){ rows.forEach((r, i) => { qm[r._oid] = { v: i === 0 ? total : 0 }; }); }
        rows.forEach(r => { if(!qm[r._oid]) qm[r._oid] = { v:0 }; });
      }
      const mdoQ = {}; Object.keys(qm).forEach(k => { mdoQ[k] = String(qm[k].v); });
      out.push({ act:'link', kind, sugKind:kind, why, on, sugOn:on, src:b.src, total, note, px:px || null,
                 oids:rows.map(r => r._oid), rows:rows.map(_rowInfo), mdoQ, sugQ:Object.assign({}, mdoQ) });
    };
    blocks.filter(b => b.rows.length > 1).forEach(mk);
    nblocks.filter(b => b.rows.length > 1).forEach(mk);
    return out;
  }
  /* ── v4.187 — gộp CANCEL của nhóm "1 trong các xe/tài xế" thành MỘT chuyến ── */
  function _cxGroup(items, diff){
    const byOid = {};
    [].concat(diff.added || [], (diff.changed||[]).map(c => c.new), (diff.unchanged||[]).map(u => u.new)).forEach(r => { if(r && r._oid) byOid[r._oid] = r; });
    const cx = items.filter(x => x.act === 'cancel').sort((a, b) => ((byOid[a.oid]||{})._seq||0) - ((byOid[b.oid]||{})._seq||0));
    const altG = x => { const o = PLAN[x.oid]; return (o && lnkKind(o) === LNK_ALT) ? lnkGid(o) : ''; };
    const out = [], done = new Set();
    cx.forEach((x, i) => {
      if(done.has(x)) return;
      const r = byOid[x.oid] || {}, grp = [x];
      for(let j = i + 1; j < cx.length; j++){
        const y = cx[j], q = byOid[y.oid] || {};
        const sameAlt = altG(x) && altG(x) === altG(y);
        const sameTruck = _npl(r.plate) && _npl(q.plate) === _npl(r.plate) && q.customer === r.customer && _ndr(q.driver) !== _ndr(r.driver);
        if(sameAlt || sameTruck){ grp.push(y); done.add(y); } else if(!altG(x)) break;
      }
      done.add(x);
      if(grp.length > 1){
        out.push(Object.assign({}, x, { oids:grp.map(g => g.oid), rows:grp.map(g => g.rows[0]), alt:true, busy:grp.some(g => g.busy),
          on:!grp.some(g => g.busy), sugOn:!grp.some(g => g.busy),
          why:(x.why === 'down' ? 'Cancel note (merged cell)' : 'Sale note says cancel') + ' · one of ' + grp.length + ' drivers / trucks — counts as ONE cancelled trip' }));
      } else out.push(x);
    });
    return out.concat(items.filter(x => x.act !== 'cancel'));
  }
  /* ── v4.187 — XE BIẾN MẤT khỏi Today Plan (không ghi cancel) ─────────────────────
     Plan cũ của ngày đó (RAM, đã quét lại Firebase trước khi dán) ↔ các dòng vừa dán.
     Khớp: _oid · DO thật · xe + khách · (không xe, không DO) khách + No.
     Không tính: xe đã Cancelled / đang nạp / đã xong / dòng ALT bị park; nhóm ALT còn
     một xe trong plan mới; xe được thay bằng xe mới cùng khách ghi Change TL / đổi xe.  */
  const CHG_RE = /change\s*t\/?l|chg\s*t\/?l|[đd][oổ]i\s*xe|thay\s*xe|thay\s*t\/?l|replace(?:d)?\s*(?:by|truck|t\/?l)|swap\s*truck/i;
  function _vanishScan(diff, mode){
    if(ID !== 'tp') return [];
    const date = _pasteDateForBatch || planDate;
    const olds = Object.values(PLAN).filter(r => r && !_isJunkRow(r) && (r._forDate || planDate) === date);
    if(!olds.length) return [];
    const news = [].concat(diff.added || [], (diff.changed||[]).map(c => c.new), (diff.unchanged||[]).map(u => u.new), diff.blocked || []).filter(Boolean);
    const _ncu = v => _ndr(v).slice(0, 12);
    const used = new Set();
    const findNew = o => news.findIndex((n, i) => !used.has(i) && (
      (o._oid && n._oid === o._oid) ||
      (isRealDO(o.doNum) && String(n.doNum||'').trim() === String(o.doNum).trim()) ||
      (_npl(o.plate) && _npl(n.plate) === _npl(o.plate) && _ncu(n.customer) === _ncu(o.customer)) ||
      (!_npl(o.plate) && !isRealDO(o.doNum) && _ncu(n.customer) === _ncu(o.customer) && String(n.no||'') === String(o.no||''))));
    const matched = new Set(), gone = [];
    olds.forEach(o => { const i = findNew(o); if(i >= 0){ used.add(i); matched.add(o._oid); } else gone.push(o); });
    const st = o => String(getEffectiveStatus(o)||'').toLowerCase();
    let cand = gone.filter(o => { const s2 = st(o); return s2 !== 'cancel' && s2 !== 'done' && s2 !== 'loading' && !o._altSkip; });
    /* ⭐ v4.221 — xe ĐÃ 🚫 Cancelled mà bản dán mới gỡ luôn khỏi plan: không hỏi lại (đã huỷ rồi) nhưng
       PHẢI ghi plan_cx (wc=1) — trước đây bị bỏ qua ⇒ mất dấu khỏi danh sách huỷ email P2 / Cancel List.
       Nhóm 🔗 ALT = MỘT chuyến; nhóm còn xe trong plan mới / có xe đang nạp · đã xong ⇒ không tính. */
    try{
      const cxg = gone.filter(o => st(o) === 'cancel' && !o._altSkip), seenG = new Set(), its = [];
      cxg.forEach(o => {
        const g = lnkKind(o) === LNK_ALT ? lnkGid(o) : '';
        let grp = [o];
        if(g){
          if(seenG.has(g)) return; seenG.add(g);
          const mem = lnkMembers(g);
          if(mem.some(m => matched.has(m._oid) || /^(loading|done)$/.test(st(m)))) return;
          grp = cxg.filter(q => lnkKind(q) === LNK_ALT && lnkGid(q) === g);
        }
        its.push({ act:'vanish', wasCx:1, on:true, oids:grp.map(q => q._oid), oid:o._oid, alt:grp.length > 1, date,
          rows:grp.map(q => Object.assign(_rowInfo(q), { qtyOwn:String(q.qty||''), noteOwn:String(q.note||'') })),
          why:'Already cancelled in Today Plan — dropped by the new paste' });
      });
      diff.__cxGone = its;
    }catch(e){ console.warn('[plan] cancelled-gone scan', e); diff.__cxGone = []; }
    /* nhóm ALT: còn một xe trong plan mới ⇒ cả nhóm không tính */
    cand = cand.filter(o => !(lnkKind(o) === LNK_ALT && lnkMembers(lnkGid(o)).some(m => matched.has(m._oid))));
    /* xe mới ghi Change TL cùng khách thay cho xe biến mất */
    const repl = news.map((n, i) => ({ n, i })).filter(x => !used.has(x.i) && CHG_RE.test(String(x.n.__noteOwn || x.n.note || '')));
    const replOf = {};
    cand.forEach(o => {
      const k = repl.findIndex(x => _ncu(x.n.customer) === _ncu(o.customer) && (String(x.n.no||'') === String(o.no||'') || String(x.n.type||'') === String(o.type||'')));
      if(k >= 0){ replOf[o._oid] = repl[k].n; repl.splice(k, 1); }
    });
    /* gộp nhóm: cùng ALT, hoặc liền nhau cùng khách + cùng xe khác tài xế */
    cand.sort((a, b) => (a._seq||0) - (b._seq||0));
    const out = [], taken = new Set();
    cand.forEach((o, i) => {
      if(taken.has(o._oid)) return;
      const grp = [o]; taken.add(o._oid);
      cand.slice(i + 1).forEach(q => {
        if(taken.has(q._oid)) return;
        const sameAlt = lnkKind(o) === LNK_ALT && lnkGid(o) === lnkGid(q);
        const sameTruck = _npl(o.plate) && _npl(q.plate) === _npl(o.plate) && q.customer === o.customer && _ndr(q.driver) !== _ndr(o.driver);
        if(sameAlt || sameTruck){ grp.push(q); taken.add(q._oid); }
      });
      const rp = grp.map(g => replOf[g._oid]).find(Boolean);
      const info = grp.map(g => Object.assign(_rowInfo(g), { qtyOwn:String(g.qty||''), noteOwn:String(g.note||'') }));
      out.push({ act:'vanish', oids:grp.map(g => g._oid), oid:grp[0]._oid, rows:info, alt:grp.length > 1, date,
        on:!rp, sugOn:!rp, replacedBy:rp ? (rp.plate||'') : '',
        why:rp ? 'Replaced by ' + (rp.plate || 'a new truck') + ' (' + String(rp.__noteOwn || rp.note || '').trim() + ') — not a cancellation'
               : 'Was in the plan, missing from the new paste and not marked cancel' + (grp.length > 1 ? ' · one of ' + grp.length + ' drivers / trucks — ONE trip' : '') });
    });
    return out;
  }
  /* ── v4.188 — tổng MT của plan SAU KHI áp các lựa chọn đang tick (so với dòng tổng của sale) ── */
  let _sheetChk = null;              /* { date, total } — lần dán gần nhất (RAM) */
  function _simTotal(diff){
    const rows = [].concat(diff.added || [], (diff.changed||[]).map(c => c.new), (diff.unchanged||[]).map(u => u.new), diff.blocked || []).filter(Boolean);
    const key = (r, i) => String(r._oid || ('#' + i));
    const q = {}, grp = {}, out = new Set();
    rows.forEach((r, i) => {
      const k = key(r, i); q[k] = _qn(r.qty);
      const old = PLAN[r._oid];
      if(old && old._autoSync === false && old._status === 'cancel') out.add(k);
      if(r._lnkG && String(r._lnkK||'') === LNK_ALT) grp[k] = 'old:' + r._lnkG;
    });
    (diff.cx || []).forEach((x, n) => {
      const oids = x.oids || [x.oid];
      if(x.act === 'restore' && x.on) oids.forEach(o => out.delete(o));
      if(!x.on) return;
      if(x.act === 'cancel') oids.forEach(o => out.add(o));
      if(x.act === 'link'){
        if(x.kind === LNK_ALT) oids.forEach(o => { grp[o] = 'new:' + n; });
        else if(x.src === 'qty' && x.mdoQ) oids.forEach(o => { if(x.mdoQ[o] != null) q[o] = _qn(x.mdoQ[o]); });
      }
    });
    let tot = 0; const gmax = {};
    rows.forEach((r, i) => {
      const k = key(r, i);
      /* dòng huỷ: file sale vẫn cộng số MT GHI TRÊN CHÍNH DÒNG đó (thường để trống) */
      if(out.has(k)){ tot += _qn(r.__qtyOwn == null ? 0 : r.__qtyOwn); return; }
      if(grp[k]){ gmax[grp[k]] = Math.max(gmax[grp[k]] || 0, q[k]); return; }
      tot += q[k];
    });
    Object.values(gmax).forEach(v => { tot += v; });
    return Math.round(tot * 1000) / 1000;
  }
  function _totHtml(diff){
    const T = _pendingPaste && _pendingPaste.total;
    if(T == null || !isFinite(T)) return '<div class="nr-tot">ℹ No total line found under the sales table — quantity check skipped.</div>';
    const S = _simTotal(diff), d = Math.round((S - T) * 1000) / 1000;
    return Math.abs(d) < 0.0005
      ? '<div class="nr-tot ok">✓ Plan total after these actions <b>'+S.toFixed(3)+' MT</b> = sales sheet total <b>'+T.toFixed(3)+' MT</b></div>'
      : '<div class="nr-tot bad">⚠ Plan total after these actions <b>'+S.toFixed(3)+' MT</b> ≠ sales sheet total <b>'+T.toFixed(3)+' MT</b> (Δ '+(d > 0 ? '+' : '')+d.toFixed(3)+' MT) — check the links (a wrong 🔗 ALT / multi-DO, a merged quantity counted twice, or a cancelled row left unticked).</div>';
  }
  /* v4.188 — tổng lệch mà chỉ khớp khi tick các nhóm "khác xe, mỗi xe một DO" ⇒ tick sẵn các nhóm đó */
  function _autoTickByTotal(diff){
    const T = _pendingPaste && _pendingPaste.total;
    if(T == null || !isFinite(T) || !diff.cx) return;
    if(Math.abs(_simTotal(diff) - T) < 0.0005) return;
    const off = diff.cx.filter(x => x.act === 'link' && !x.on && !x.sugOn);
    if(!off.length) return;
    off.forEach(x => { x.on = true; });
    if(Math.abs(_simTotal(diff) - T) < 0.0005){
      off.forEach(x => { x.sugOn = true; x.why += ' · ticked: the sales sheet total ('+T.toFixed(3)+' MT) only matches when these rows are ONE order'; });
    } else off.forEach(x => { x.on = false; });
  }
  /* mọi việc định tự làm từ ghi chú sale cho lần dán này */
  function _actScan(diff, mode){
    let cx = _cxScan(diff, mode);
    try{ cx = _cxGroup(cx, diff); }catch(e){ console.warn('[plan] cancel group', e); }
    try{ cx = cx.concat(_vanishScan(diff, mode)); }catch(e){ console.warn('[plan] vanish scan', e); }
    let lk = [];
    try{ lk = _lkScan(diff, mode); }catch(e){ console.warn('[plan] link scan', e); }
    const cxOids = new Set(cx.filter(x => x.act === 'cancel').map(x => x.oid));
    cx.forEach(x => (x.oids || []).forEach(o => cxOids.add(o)));
    lk = lk.filter(x => !x.oids.some(o => cxOids.has(o)));
    return cx.concat(lk);
  }
  function _cxScan(diff, mode){
    const out = [], seen = {};
    const push = (r, oid, oldOid) => {
      if(!r || !oid || seen[oid]) return; seen[oid] = 1;
      const old = mode === 'replace' ? null : (PLAN[oldOid || oid] || null);
      const oldSt = old ? String(getEffectiveStatus(old)||'').toLowerCase() : '';
      const busy = oldSt === 'loading' || oldSt === 'done';
      const why = _cxWhy(r);
      const base = { oid, plate:r.plate||'', cust:r.customer||'', no:r.no||'', note:String(r.note||''), qty:r.qty||'', rows:[_rowInfo(r)] };
      if(why){
        if(old && old._autoSync === false && old._status === 'cancel') return;     /* đã huỷ sẵn */
        out.push(Object.assign(base, { act:'cancel', why, busy, on:!busy, sugOn:!busy }));
      } else if(old && old._cxPaste && old._autoSync === false && old._status === 'cancel'){
        out.push(Object.assign(base, { act:'restore', on:true, sugOn:true }));
      }
    };
    diff.added.forEach(r => push(r, r._oid));
    diff.changed.forEach(c => push(c.new, c.new._oid, c.old && c.old._oid));
    (diff.unchanged||[]).forEach(u => push(u.new, (u.new && u.new._oid) || (u.old && u.old._oid), u.old && u.old._oid));
    return out;
  }
  function _cxHtml(cx){
    const nC = cx.filter(x => x.act === 'cancel').length, nR = cx.length - nC;
    let h = `<div class="tp-diff-section rem"><h4><span class="badge">🚫 SALE NOTE</span> `
          + (nC ? `${nC} row(s) marked <b>Cancel</b> by sales — will be set to 🚫 Cancelled` : '')
          + (nC && nR ? ' · ' : '') + (nR ? `${nR} row(s) no longer say cancel — back to AUTO` : '')
          + `</h4><div class="tp-diff-list">`;
    cx.forEach((x, i) => {
      h += `<label class="tp-diff-item" style="display:flex;gap:6px;align-items:center;cursor:pointer">`
         + `<input type="checkbox"${x.on ? ' checked' : ''} onchange="${G}.cxTick(${i},this.checked)">`
         + `<span class="who">${escapeHtml(x.plate||'(no truck)')}</span> · ${escapeHtml(x.cust)} · No ${escapeHtml(x.no)} `
         + `<span class="field">${x.act === 'cancel' ? '→ Cancelled' : '→ AUTO'}</span>`
         + `<span class="nv" title="Sale note">${escapeHtml(x.note||'(no note)')}</span>`
         + (x.why === 'down' ? ` <span class="stat-tag" title="The note comes from a merged cell above; accepted because this truck has no DO and Allow load = NO">merged note</span>` : '')
         + (x.busy ? ` <span class="stat-tag" style="background:#fee;color:#a32a1f">already loading / done — not ticked</span>` : '')
         + `</label>`;
    });
    return h + '</div></div>';
  }
  function cxTick(i, on){ if(_pendingDiff && _pendingDiff.diff && _pendingDiff.diff.cx && _pendingDiff.diff.cx[i]) _pendingDiff.diff.cx[i].on = !!on; }
  /* ═══ v4.184 — 📋 BẢNG DUYỆT GHI CHÚ SALE (bước riêng, sau hộp diff) ═══ */
  let _revEl = null;
  function _revItems(){ return (_pendingDiff && _pendingDiff.diff && _pendingDiff.diff.cx) || []; }
  function _revRender(){
    if(!_revEl) return;
    const L = _revItems();
    const lbl = x => x.act === 'cancel' ? '🚫 Cancel' + (x.alt ? ' · 1 trip' : '') : x.act === 'restore' ? '↺ Back to AUTO'
                   : x.act === 'vanish' ? '🕳 Missing from new plan → cancelled' + (x.alt ? ' · 1 trip' : '')
                   : x.kind === 'mdo' ? '🔗 One truck · multi-DO' : '🔗 One order · alternate trucks';
    const cls = x => x.act === 'cancel' ? 'cx' : x.act === 'restore' ? 'rs' : x.act === 'vanish' ? 'vn' : x.kind;
    let h = '<table class="nr-tbl"><tr><th></th><th>Action</th><th>Customer</th><th>No</th><th>Truck</th><th>Romooc</th><th>Driver</th><th>MT</th><th>DO</th><th>Cargo type</th><th>Sale note</th><th>Why</th></tr>';
    L.forEach((x, i) => {
      const n = x.rows.length;
      x.rows.forEach((r, j) => {
        h += '<tr class="nr-'+cls(x)+(x.on ? '' : ' off')+(j === 0 ? ' nr-first' : '')+'">';
        if(j === 0){
          h += '<td rowspan="'+n+'"><input type="checkbox"'+(x.on ? ' checked' : '')+' onchange="'+G+'.revTick('+i+',this.checked)"></td>'
             + '<td rowspan="'+n+'">'+(x.act === 'link'
                 ? '<select onchange="'+G+'.revKind('+i+',this.value)"><option value="alt"'+(x.kind === 'alt' ? ' selected' : '')+'>🔗 One order · alternate trucks (count once)</option><option value="mdo"'+(x.kind === 'mdo' ? ' selected' : '')+'>🔗 One truck · multi-DO</option></select>'
                   + (x.kind === 'mdo' && x.src === 'qty' ? '<div class="nr-sum">Merged MT '+(x.total||0)+' · split Σ <b>'+Object.values(x.mdoQ).reduce((a,v)=>a+_qn(v),0).toFixed(3)+'</b></div>' : '')
                 : '<b>'+lbl(x)+'</b>'+(x.busy ? '<div class="nr-warn">already loading / done</div>' : ''))+'</td>';
        }
        const qCell = (x.act === 'link' && x.kind === 'mdo' && x.src === 'qty')
          ? '<input class="nr-q" value="'+escapeHtml(x.mdoQ[r.oid])+'" onchange="'+G+'.revQty('+i+',\''+escapeHtml(r.oid)+'\',this.value)" title="MT of this DO (the merged cell holds the whole truck)">'
          : escapeHtml(r.qtyOwn || (r.qty ? r.qty+' ⇣' : ''));
        h += '<td>'+escapeHtml(r.cust)+'</td><td>'+escapeHtml(r.no)+'</td><td>'+escapeHtml(r.plate||'—')+'</td><td>'+escapeHtml(r.rmooc)+'</td><td>'+escapeHtml(r.driver)+'</td>'
           + '<td>'+qCell+'</td><td>'+escapeHtml(r.doNum||'—')+'</td><td>'+escapeHtml(r.type)+'</td>'
           + '<td class="nr-note">'+escapeHtml(r.noteOwn || (r.note ? r.note+' (merged)' : ''))+'</td>';
        if(j === 0) h += '<td rowspan="'+n+'" class="nr-why">'+escapeHtml(x.act === 'cancel' ? (x.why === 'down' ? 'Cancel note from a merged cell; truck has no DO and Allow load = NO' : 'Sale note says cancel')
                                                                     : x.act === 'restore' ? 'Was cancelled by a sale note; the note no longer says cancel' : x.why)
                                                   + (x.act === 'cancel' && x.alt ? ' · one of '+n+' drivers / trucks — counts as ONE cancelled trip' : '')+'</td>';
        h += '</tr>';
      });
    });
    h += '</table>';
    const on = L.filter(x => x.on).length;
    _revEl.querySelector('.nr-bd').innerHTML =
      '<div class="nr-cap">The app read these actions from the sales notes (column M) and merged cells. <b>Ticked</b> = do it · <b>unticked</b> = leave the row as pasted. Every choice is logged to help improve the rules.'
      + (L.some(x => x.act === 'vanish') ? '<br>🕳 <b>Missing from new plan</b>: trucks of the current Today Plan that the new paste drops without a cancel note. <b>Ticked</b> = count as a cancelled trip in today\'s Daily report (Cancel List / mail P2).' : '') + '</div>' + h;
    _revEl.querySelector('.nr-go').textContent = '✓ Apply ' + on + ' ticked & save plan';
    const tb = _revEl.querySelector('.nr-totbox'); if(tb) tb.innerHTML = _totHtml(_pendingDiff.diff);   /* v4.188 */
  }
  function _revOpen(){
    if(!_revEl){
      _revEl = document.createElement('div'); _revEl.className = 'nr-ov';
      _revEl.innerHTML = '<div class="nr-box"><div class="nr-hd"><b>📋 Sale note review — ' + UILABEL + '</b><span style="flex:1"></span></div><div class="nr-bd"></div>'
        + '<div class="nr-ft"><div class="nr-totbox" style="flex:1"></div><button class="btn" onclick="'+G+'.revBack()">← Back</button>'
        + '<button class="btn" onclick="'+G+'.revApply(false)" title="Save the plan exactly as pasted — no cancel, no link">Save plan without these</button>'
        + '<button class="btn nr-go" style="background:#0d6e3a;color:#fff;border-color:#0d6e3a" onclick="'+G+'.revApply(true)">✓ Apply</button></div></div>';
      document.body.appendChild(_revEl);
    }
    _revRender();
    _revEl.classList.add('on');
  }
  function _revClose(){ if(_revEl) _revEl.classList.remove('on'); }
  function revTick(i, on){ const x = _revItems()[i]; if(x){ x.on = !!on; _revRender(); } }
  function revKind(i, k){ const x = _revItems()[i]; if(x && (k === 'alt' || k === 'mdo')){ x.kind = k; _revRender(); } }
  function revQty(i, oid, v){ const x = _revItems()[i]; if(x && x.mdoQ){ x.mdoQ[oid] = String(v).trim(); _revRender(); } }
  function revBack(){ _revClose(); }
  function revApply(doIt){
    if(!_pendingDiff) { _revClose(); return; }
    const d = _pendingDiff.diff;
    if(!doIt) (d.cx||[]).forEach(x => { x.on = false; });
    d.__reviewed = true;
    _revClose();
    confirmDiff();
  }
  /* ghi các lựa chọn cancel/restore vào CÙNG payload của lần dán */
  function _cxApply(diff, payload){
    let n = 0;
    (diff.cx||[]).forEach(x => {
      if(!x.on || (x.act !== 'cancel' && x.act !== 'restore')) return;
      const oids = x.oids || [x.oid];
      const altGid = (x.act === 'cancel' && x.alt && oids.length > 1 && !oids.some(o => PLAN[o] && lnkIsLinked(PLAN[o]))) ? lnkNewGid() : '';
      oids.forEach(oid => {
        const row = PLAN[oid]; if(!row) return;
        const whole = !!payload[`${FBN}${oid}`];          /* dòng ghi nguyên cục ⇒ sửa chính object, không thêm path con */
        const set = (f, v) => { if(v === null) delete row[f]; else row[f] = v; if(!whole) payload[`${FBN}${oid}/${f}`] = v; };
        if(x.act === 'cancel'){ set('_autoSync', false); set('_status', 'cancel'); set('_actualQty', computeActualFromState(row) || ''); set('_cxPaste', 1); }
        else { set('_autoSync', true); set('_status', ''); set('_actualQty', ''); set('_cxPaste', null); }
        if(altGid){ set('_lnkG', altGid); set('_lnkK', LNK_ALT); set('_lnkPrint', null); }   /* v4.187 — nhóm "1 trong các xe" huỷ = 1 chuyến */
        if(!whole) _stampWho(payload, oid);
        n++;
      });
    });
    /* v4.184 — 🔗 link (ALT / MDO) + MT đã chia của MDO, cùng payload */
    (diff.cx||[]).forEach(x => {
      if(x.act !== 'link' || !x.on) return;
      const rows = x.oids.map(o => PLAN[o]).filter(Boolean);
      if(rows.length < 2 || rows.some(lnkIsLinked)) return;
      const gid = lnkNewGid();
      rows.forEach(row => {
        const oid = String(row._oid);
        const whole = !!payload[`${FBN}${oid}`];
        const set = (f, v) => { if(v === null) delete row[f]; else row[f] = v; if(!whole) payload[`${FBN}${oid}/${f}`] = v; };
        set('_lnkG', gid); set('_lnkK', x.kind); set('_lnkPrint', x.kind === LNK_MDO ? 'combined' : null); set('_altSkip', null);
        if(x.kind === LNK_MDO && x.src === 'qty' && x.mdoQ && x.mdoQ[oid] != null && String(x.mdoQ[oid]) !== String(row.qty||'')){
          set('qty', String(x.mdoQ[oid])); set('_qtyFix', 1);
        }
        if(!whole) _stampWho(payload, oid);
        n++;
      });
    });
    return n;
  }
  /* v4.184 — MT đã chia tay cho MDO (_qtyFix) KHÔNG bị ô gộp điền đè ở lần dán Update sau */
  function _keepQtyFix(diff){
    const keep = [];
    (diff.changed||[]).forEach(c => {
      if(!c.old || !c.old._qtyFix || String(c.new.__qtyOwn||'').trim()) { keep.push(c); return; }
      c.new.qty = c.old.qty; c.new._qtyFix = 1;
      c.diffs = (c.diffs||[]).filter(d => d.field !== 'qty');
      if(c.diffs.length || c.old._oid !== c.new._oid) keep.push(c);
      else (diff.unchanged = diff.unchanged || []).push({ old:c.old, new:c.new });
    });
    diff.changed = keep;
    return diff;
  }
  /* v4.183 — ảnh chụp kế hoạch ĐẦU NGÀY (chỉ Today Plan) */
  function _pdayRecord(date, src){
    if(ID !== 'tp' || typeof PLANDAY === 'undefined' || !date) return;
    const rows = Object.values(PLAN).filter(r => r && !_isJunkRow(r) && (r._forDate || planDate) === date);
    PLANDAY.recordFirst(date, rows, r => String(getEffectiveStatus(r)||'').toLowerCase(), lnkTotals, src);
  }
  /* ⭐ v4.204 — TỰ GHI kế hoạch đầu ngày, không cần ai bấm 📌.
     Biến _pdayDay = NGÀY HÔM NAY của máy; sang ngày mới là biến đổi ⇒ tự "reset" và ghi cho ngày mới.
     Chỉ cho HÔM NAY (ngày cũ không biết kế hoạch đầu là gì). Plan của hôm nay đã có trong RAM (dán / promote
     từ hôm trước / máy khác nhập) mà plan_day/<hôm nay>/first chưa có ⇒ chờ 30 s cho dữ liệu lắng rồi ghi
     (transaction, không ghi đè). Tốn tối đa 1 lần đọc + 1 lần ghi nhỏ mỗi ngày mỗi máy. */
  let _pdayDay = '', _pdayT = null;
  function _pdayAuto(){
    if(ID !== 'tp' || typeof PLANDAY === 'undefined' || !_loaded) return;
    /* v4.210 — chỉ máy ĐƯỢC SỬA Today Plan mới lo việc ghi (máy xem / trạm cân chỉ đọc không tốn lượt đọc plan_day) */
    if(typeof canWrite === 'function' && !canWrite(PERMK)) return;
    const d = _isoToday();
    if(d !== _pdayDay){ _pdayDay = d; }                /* sang ngày mới ⇒ reset */
    if(PLANDAY.get(d)) return;                        /* hôm nay đã có kế hoạch đầu ngày */
    clearTimeout(_pdayT);
    _pdayT = setTimeout(() => {
      _pdayT = null;
      if(_isoToday() !== _pdayDay) return;            /* vừa qua nửa đêm ⇒ lượt sau lo */
      const has = Object.values(PLAN).some(r => r && !_isJunkRow(r) && (r._forDate || planDate) === _pdayDay);
      if(!has) return;
      PLANDAY.load(_pdayDay).then(f => { if(!f && _isoToday() === _pdayDay) _pdayRecord(_pdayDay, 'auto'); });
    }, 30000);
  }

  /* strip runtime-only props before sending to Firebase */
  function sanitizeForStorage(r){
    const out = {};
    Object.keys(r).forEach(k=>{
      if(k.startsWith('__')) return;        /* skip internal markers */
      if(r[k] === undefined) return;
      out[k] = r[k];
    });
    return out;
  }

  /* -------- Single-cell edit (Tabulator cellEdited handler) -------- */
  function editCellField(oid, field, value){
    if(!canWrite(PERMK)){ toast('You do not have permission','er'); return; }
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    const row = PLAN[oid];
    if(!row) return;
    /* v4.56 — DO values typed/pasted from WMS carry leading zeros
       ("0086687802" → "86687802"). Strip them on every DO-carrying edit;
       cleanDO leaves temp DOs / non-DO text unchanged. */
    let _doCleaned = false;
    if((field === 'doNum' || field === '_oid') && typeof cleanDO === 'function'){
      const _c = cleanDO(String(value==null?'':value));
      if(_c !== value){ value = _c; _doCleaned = true; }
    }
    /* special-case: editing the _oid (DO Var) column → rename the node */
    if(field === '_oid'){
      const newOid = String(value||'').trim();
      if(!newOid){ toast('Order ID cannot be empty','er'); rebuildTableData(); return; }
      if(newOid === oid) return;
      if(PLAN[newOid]){ toast('Order ID already exists: '+newOid,'er'); rebuildTableData(); return; }
      if(renameOid(oid, newOid)) toast('Order ID renamed: '+oid+' → '+newOid,'ok');
      else { toast('Rename failed','er'); rebuildTableData(); }
      return;
    }
    /* special-case: editing the DO column on a TEMP order.
       The temp DO IS the order identity, so the edit must migrate _oid too.
       - new value empty → ignore (keep current temp DO)
       - new value already used by another order → reject
       - otherwise rename _oid to the new value and mirror it into doNum */
    if(field === 'doNum' && isTempOid(String(oid))){
      const newDo = String(value||'').trim();
      if(!newDo){ toast('DO cannot be empty','er'); rebuildTableData(); return; }
      if(newDo === oid) return;
      if(PLAN[newDo]){ toast('DO already exists: '+newDo,'er'); rebuildTableData(); return; }
      if(renameOid(oid, newDo, { writeDoNum:true })) toast('DO renamed: '+oid+' → '+newDo,'ok');
      else { toast('DO rename failed','er'); rebuildTableData(); }
      return;
    }
    row[field] = value;
    const payload = {};
    payload[`${FBN}${oid}/${field}`] = value;
    _stampWho(payload, oid);
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>{})
      .catch(e=>{ console.error('plan edit', e); toast('Edit write failed','er'); });
    /* v4.56 — the cell keeps showing the raw typed text (with leading zeros)
       until the next redraw; force one so the operator sees the cleaned DO. */
    if(_doCleaned && table) rebuildTableData();
    refreshCounts();
  }

  /* -------- Auto-sync gate (PER-ROW) --------
     Each plan row carries its own _autoSync flag (default ON / true).
     When _autoSync !== false (AUTO mode) the row's _status / _actualQty are PURELY
     COMPUTED at render time from station state and TL Data — NEVER persisted to
     Firebase. autoSet() therefore does no I/O; it just nudges the table so the
     computed value gets re-rendered. This is the core Spark-saver.
     When _autoSync === false (MANUAL mode), external callers are refused; the
     operator drives both fields by hand and those edits go through editCellField
     (which writes to Firebase, so other machines see the override). */
  function autoSet(oid, field, value){
    const row = PLAN[oid];
    if(!row) return false;
    if(row._autoSync === false) return false;          /* per-row manual lock */
    if(field !== '_status' && field !== '_actualQty') return false;
    /* RAM-only: just trigger a re-render so the computed status reflects the new state.
       We deliberately do NOT mutate row._status — that value is virtual in AUTO mode. */
    if(table){
      try{
        const r = table.getRow(oid);
        if(r){ r.reformat(); rowFmt(r); }
      }catch(_){}
    }
    refreshCounts();
    return true;
  }

  /* Flip the per-row auto-sync flag.
     - MANUAL → AUTO: wipe stored _status and _actualQty from Firebase so all
       machines drop the override; status reverts to computed.
     - AUTO   → MANUAL: snapshot the current computed status into Firebase so the
       row keeps that value when the operator edits it from a known baseline. */
  function toggleRowSync(oid){
    const row = PLAN[oid];
    if(!row) return;
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    if(!canWrite(PERMK)){ toast('You do not have permission','er'); return; }
    const goingAuto = (row._autoSync === false);
    const payload   = {};
    const now       = Date.now();
    if(goingAuto){
      /* Going AUTO — broadcast the wipe so peers also drop their stored override. */
      payload[`${FBN}${oid}/_autoSync`] = true;
      payload[`${FBN}${oid}/_status`]   = null;
      payload[`${FBN}${oid}/_actualQty`] = null;
      row._autoSync  = true;
      row._status    = '';
      row._actualQty = '';
    } else {
      /* Going MANUAL — snapshot whatever AUTO was showing as the starting point. */
      const snap = computeStatusFromState(row);
      payload[`${FBN}${oid}/_autoSync`] = false;
      payload[`${FBN}${oid}/_status`]   = snap;
      row._autoSync = false;
      row._status   = snap;
    }
    _stampWho(payload, oid, now);
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>{ try{ logAudit(PERMK + ':autoSync', oid, '_autoSync', !goingAuto, goingAuto, goingAuto?'auto on':'auto off'); }catch(_){} })
      .catch(e=>{ console.error('plan toggleRowSync', e); toast('Toggle failed','er'); });
    setTimeout(()=>{
      if(table){
        try{ const r = table.getRow(oid); if(r){ r.reformat(); rowFmt(r); } }catch(_){}
      }
      refreshCounts();
      try{ renderLedger(); }catch(_){}
      try{ _ledFlash(oid); }catch(_){}   /* v4.124 */
    }, 30);
    toast('Row '+(row.plate||oid)+': Auto-sync '+(goingAuto?'ON':'OFF (manual)'), 'ok');
  }

  /* v4.59 — CANCEL from AUTO mode, one click.
     Operators must be able to cancel an order without first hunting for the
     AUTO checkbox. This flips the row to MANUAL and stores the given status
     (always 'cancel' today) in ONE atomic Firebase write. The current computed
     Actual is snapshotted too, so a partially-loaded row keeps its weight.
     Re-checking the AUTO box (toggleRowSync) un-cancels: it wipes the override
     and the row goes back to computed status. */
  function setManualStatus(oid, status){
    const row = PLAN[oid];
    if(!row) return;
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    if(!canWrite(PERMK)){ toast('You do not have permission','er'); return; }
    const now  = Date.now();
    const snapAct = computeActualFromState(row);   /* keep whatever was loaded */
    const payload = {};
    payload[`${FBN}${oid}/_autoSync`]  = false;
    payload[`${FBN}${oid}/_status`]    = status;
    payload[`${FBN}${oid}/_actualQty`] = snapAct || '';
    row._autoSync  = false;
    row._status    = status;
    row._actualQty = snapAct || '';
    _stampWho(payload, oid, now);
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>{ try{ logAudit(PERMK + ':status', oid, '_status', '', status, 'cancel from auto'); }catch(_){} })
      .catch(e=>{ console.error('plan setManualStatus', e); toast('Status write failed','er'); });
    setTimeout(()=>{
      if(table){ try{ const r = table.getRow(oid); if(r){ r.reformat(); rowFmt(r); } }catch(_){} }
      refreshCounts();
      try{ renderLedger(); }catch(_){}
      try{ _ledFlash(oid); }catch(_){}   /* v4.124 */
    }, 30);
    toast('Row '+(row.plate||oid)+': '+status.toUpperCase()+' (Auto-sync OFF — re-check ☑ to undo)', 'ok');
  }

  /* ═══════════════════════════════════════════════════════════════════
     v4.109 — ORDER LINKS (🔗) · gộp nhiều DÒNG kế hoạch thành 1 ĐƠN
     -------------------------------------------------------------------
     Sale dán kế hoạch theo DÒNG XE, nên một đơn hàng thật có thể nằm
     trên nhiều dòng. Có hai kiểu hoàn toàn khác nhau:

       'alt' — MỘT TRONG SỐ các xe sẽ vào lấy. 3 dòng × 25 MT nhưng thực
               tế chỉ 1 xe / 25 MT được bán. Trước v4.109 phần mềm cộng cả
               3 ⇒ PLAN 75 MT (SAI). Nay nhóm 'alt' chỉ tính MỘT lần với
               qty LỚN NHẤT trong nhóm; xe nào vào station trước thì các
               dòng còn lại tự bị "park" (cancel + cờ _altSkip) và tự mở
               lại nếu xe đó rời station.

       'mdo' — MỘT XE chở NHIỀU DO. Tất cả các dòng đều bán thật nên tổng
               vẫn cộng đủ; cái lợi là lúc assign ở tab Scale phần mềm
               KHÔNG phải dò tìm rồi hỏi "load together?" nữa — đã link
               thì gộp thẳng, chỉ còn hỏi in PTT/DN gộp hay tách.

     Lưu ngay trên dòng kế hoạch (Firebase `${FBN}<oid>/`):
       _lnkG     id nhóm, ví dụ "LK5F2A1C3"   (rỗng = không link)
       _lnkK     'alt' | 'mdo'
       _lnkPrint 'combined' | 'separate'  — chỉ nhóm 'mdo', chọn lúc assign
       _altSkip  true trên dòng ALT bị park (phần mềm tự đặt / tự gỡ)
     Bốn trường này được mang qua re-paste trong computeDiff nên dán lại
     kế hoạch KHÔNG làm mất link.
     ═══════════════════════════════════════════════════════════════════ */
  const LNK_ALT = 'alt', LNK_MDO = 'mdo';
  function lnkGid(r){ return String((r && r._lnkG) || '').trim(); }
  function lnkKind(r){
    const k = String((r && r._lnkK) || '').trim().toLowerCase();
    return (k === LNK_ALT || k === LNK_MDO) ? k : '';
  }
  function lnkIsLinked(r){ return !!(lnkGid(r) && lnkKind(r)); }
  function lnkIsParked(r){ return !!(r && r._altSkip); }
  function lnkNewGid(){
    return 'LK' + Date.now().toString(36).toUpperCase()
         + Math.floor(Math.random()*36).toString(36).toUpperCase();
  }
  /* Mọi dòng cùng nhóm, theo thứ tự dán (_seq). RAM — không đọc Firebase. */
  function lnkMembers(gid){
    const g = String(gid || '').trim();
    if(!g) return [];
    return Object.values(PLAN).filter(r => lnkGid(r) === g).sort((a,b)=>{
      const sa = (typeof a._seq === 'number') ? a._seq : Number.MAX_SAFE_INTEGER;
      const sb = (typeof b._seq === 'number') ? b._seq : Number.MAX_SAFE_INTEGER;
      return sa !== sb ? sa - sb : String(a._oid||'').localeCompare(String(b._oid||''));
    });
  }
  /* Dòng ĐẠI DIỆN của một nhóm ALT: xe đã vào (loading/done) nếu có,
     ngược lại dòng qty lớn nhất — hoà thì dòng đầu theo _seq. */
  function _lnkAltRep(members){
    if(!members || !members.length) return null;
    const live = members.find(r=>{
      const st = computeStatusFromState(r);
      return st === 'loading' || st === 'done';
    });
    if(live) return live;
    let best = members[0], bq = parseFloat(best.qty||0) || 0;
    members.forEach(r=>{ const q = parseFloat(r.qty||0)||0; if(q > bq){ bq = q; best = r; } });
    return best;
  }
  /* Thu gọn danh sách dòng: mỗi nhóm ALT chỉ còn dòng đại diện. Nhóm MDO và
     dòng không link giữ nguyên. Dùng cho MỌI phép tính tổng.
     Đại diện được chọn TRONG danh sách truyền vào, nên khi ledger đang lọc
     theo ngày / ô tìm kiếm thì tổng vẫn khớp với đúng những gì đang hiện. */
  function lnkCollapse(rows){
    const list = rows || [];
    const present = new Set(list.map(r => String(r._oid||'')));
    const out = [], seen = new Set();
    list.forEach(r=>{
      const gid = lnkGid(r);
      if(gid && lnkKind(r) === LNK_ALT){
        if(seen.has(gid)) return;
        seen.add(gid);
        const vis = lnkMembers(gid).filter(m => present.has(String(m._oid||'')));
        out.push(_lnkAltRep(vis) || r);
        return;
      }
      out.push(r);
    });
    return out;
  }
  /* Tổng kế hoạch CÓ HIỂU LINK — nguồn DUY NHẤT cho cả dải Plan·Loaded·Remain
     của Ledger lẫn thẻ PLAN tab Scale, nên hai chỗ không bao giờ lệch nhau.
       planMT    Σ qty đơn không cancel      · loadedMT Σ qty đơn done + loading
       remainMT  planMT − loadedMT
       planCnt/doneCnt  số ĐƠN (đã thu gọn ALT), KHÔNG phải số dòng
       tripCnt/tripDone ⭐ v4.232 — số CHUYẾN XE: ALT = 1 xe (đã thu gọn), MỘT
                 NHÓM 🔗 MDO = 1 xe · 1 lần nạp (nhiều DO chỉ là tách hoá đơn).
                 Nhóm MDO tính là đã nạp khi có một DO của nhóm done/loading.
       altSaved  số dòng bị loại nhờ ALT (để hiện chú thích) */
  function lnkTotals(rows){
    const src  = rows || Object.values(PLAN);
    const list = lnkCollapse(src);
    let planMT = 0, loadedMT = 0, planCnt = 0, doneCnt = 0, tripCnt = 0, tripDone = 0;
    const mdo = new Map();                       /* gid nhóm MDO → đã tính 'done' chưa */
    list.forEach(r=>{
      const q  = parseFloat(r.qty||0) || 0;
      const st = String(getEffectiveStatus(r)||'').toLowerCase();
      if(st === 'cancel') return;
      const isDone = (st === 'done' || st === 'loading');
      planCnt++; planMT += q;
      if(isDone){ doneCnt++; loadedMT += q; }
      const gid = lnkKind(r) === LNK_MDO ? lnkGid(r) : '';
      if(!gid){ tripCnt++; if(isDone) tripDone++; return; }
      if(!mdo.has(gid)){ mdo.set(gid, isDone); tripCnt++; if(isDone) tripDone++; }
      else if(isDone && !mdo.get(gid)){ mdo.set(gid, true); tripDone++; }
    });
    return { planMT, loadedMT, remainMT: Math.max(0, planMT - loadedMT),
             planCnt, doneCnt, remainCnt: Math.max(0, planCnt - doneCnt),
             tripCnt, tripDone, tripRemain: Math.max(0, tripCnt - tripDone),
             altSaved: src.length - list.length };
  }

  /* ── Tự khoá / mở khoá dòng ALT thua ────────────────────────────────
     Khi một xe trong nhóm ALT đã vào station (loading) hoặc cân xong
     (done) thì những dòng còn lại KHÔNG còn hàng để bán: đặt chúng về
     MANUAL + cancel + cờ _altSkip. Cờ này là dấu để phần mềm biết CHÍNH
     NÓ đã khoá, nên khi xe kia rời station (không còn loading/done) nó tự
     gỡ đúng những dòng nó khoá — cancel do người dùng bấm tay (không có
     _altSkip) tuyệt đối không bị đụng.
     Idempotent: không có gì đổi thì KHÔNG ghi Firebase (giữ quota Spark).
     Chạy trong refreshStatus nên mọi thay đổi station/TL đều kích hoạt. */
  let _lnkSyncing = false;
  function lnkSyncAlt(){
    if(_lnkSyncing) return;
    if(typeof FB_DB === 'undefined' || !FB_DB) return;
    try{ if(!canWrite(PERMK)) return; }catch(_){ return; }
    const groups = new Map();
    Object.values(PLAN).forEach(r=>{
      if(lnkKind(r) !== LNK_ALT) return;
      const g = lnkGid(r); if(!g) return;
      if(!groups.has(g)) groups.set(g, []);
      groups.get(g).push(r);
    });
    if(!groups.size) return;
    const payload = {}, touched = [];
    groups.forEach(members=>{
      const winner = members.find(r=>{
        const st = computeStatusFromState(r);
        return st === 'loading' || st === 'done';
      });
      members.forEach(r=>{
        const oid = String(r._oid||''); if(!oid) return;
        const parked = lnkIsParked(r);
        if(winner && r !== winner && !parked){
          if(computeStatusFromState(r)) return;   /* dòng này cũng đang chạy — đừng đụng */
          if(r._autoSync === false && String(r._status||'')) return;  /* người dùng đã chốt tay */
          payload[`${FBN}${oid}/_autoSync`] = false;
          payload[`${FBN}${oid}/_status`]   = 'cancel';
          payload[`${FBN}${oid}/_altSkip`]  = true;
          r._autoSync = false; r._status = 'cancel'; r._altSkip = true;
          touched.push(oid);
        } else if(parked && (!winner || r === winner)){
          payload[`${FBN}${oid}/_autoSync`]  = true;
          payload[`${FBN}${oid}/_status`]    = null;
          payload[`${FBN}${oid}/_actualQty`] = null;
          payload[`${FBN}${oid}/_altSkip`]   = null;
          r._autoSync = true; r._status = ''; r._actualQty = ''; r._altSkip = false;
          touched.push(oid);
        }
      });
    });
    if(!touched.length) return;
    bumpVersion(payload);
    _lnkSyncing = true;
    _fbUpdate(payload)
      .then(()=>{ try{ logAudit(PERMK + ':altLink', touched.join(','), '_altSkip', '', '', 'auto park / release'); }catch(_){} })
      .catch(e=>{ console.error('plan lnkSyncAlt', e); })
      /* Mở khoá _lnkSyncing NGAY khi ghi xong: hai thay đổi trạng thái sát nhau
         — xe rời station ngay sau khi vào — không được bỏ qua lần đồng bộ thứ hai. */
      .finally(()=>{ _lnkSyncing = false; });
    setTimeout(()=>{ try{ renderLedger(); }catch(_){} try{ refreshCounts(); }catch(_){} }, 40);
  }

  /* Ghi link cho một loạt dòng. kind='' ⇒ GỠ link (và gỡ luôn park). */
  function lnkWrite(oids, kind, printMode){
    const list = (oids||[]).map(o=>String(o||'').trim()).filter(o=>PLAN[o]);
    if(!list.length){ toast('No rows selected','er'); return false; }
    if(typeof FB_DB === 'undefined' || !FB_DB){ toast('Offline — Firebase not connected','er'); return false; }
    if(!canWrite(PERMK)){ toast('You do not have permission','er'); return false; }
    const k   = (kind === LNK_ALT || kind === LNK_MDO) ? kind : '';
    const gid = k ? lnkNewGid() : '';
    const pm  = (printMode === 'separate') ? 'separate' : 'combined';
    const now = Date.now();
    const payload = {};
    list.forEach(oid=>{
      const r = PLAN[oid];
      payload[`${FBN}${oid}/_lnkG`]     = k ? gid : null;
      payload[`${FBN}${oid}/_lnkK`]     = k ? k   : null;
      payload[`${FBN}${oid}/_lnkPrint`] = (k === LNK_MDO) ? pm : null;
      r._lnkG = k ? gid : ''; r._lnkK = k ? k : ''; r._lnkPrint = (k === LNK_MDO) ? pm : '';
      /* Gỡ link ⇒ dòng đang bị park phải được trả về AUTO ngay, nếu không nó
         nằm mãi ở trạng thái Cancelled mà không ai gỡ được. */
      if(!k && lnkIsParked(r)){
        payload[`${FBN}${oid}/_autoSync`]  = true;
        payload[`${FBN}${oid}/_status`]    = null;
        payload[`${FBN}${oid}/_actualQty`] = null;
        r._autoSync = true; r._status = ''; r._actualQty = '';
      }
      payload[`${FBN}${oid}/_altSkip`] = null;
      r._altSkip = false;
      _stampWho(payload, oid, now);
    });
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>{ try{ logAudit(PERMK + ':link', list.join(','), '_lnkK', '', k || '(unlink)', k ? ('group ' + gid) : 'unlink'); }catch(_){} })
      .catch(e=>{ console.error('plan lnkWrite', e); toast('Link write failed','er'); });
    setTimeout(()=>{
      if(table){ try{ rebuildTableData(); }catch(_){} }
      refreshCounts();
      try{ renderLedger(); }catch(_){}
      try{ if(typeof SCALE !== 'undefined' && SCALE.refreshRow1) SCALE.refreshRow1(); }catch(_){}
      lnkSyncAlt();
    }, 40);
    return true;
  }
  /* Đổi chế độ in của một nhóm MDO ('combined' | 'separate'). */
  function lnkSetPrint(gid, mode){
    const ms = lnkMembers(gid);
    if(!ms.length) return false;
    if(typeof FB_DB === 'undefined' || !FB_DB) return false;
    try{ if(!canWrite(PERMK)) return false; }catch(_){ return false; }
    const pm = (mode === 'separate') ? 'separate' : 'combined';
    const payload = {};
    ms.forEach(r=>{
      const oid = String(r._oid||''); if(!oid) return;
      payload[`${FBN}${oid}/_lnkPrint`] = pm;
      r._lnkPrint = pm;
    });
    bumpVersion(payload);
    _fbUpdate(payload)
      .catch(e=>console.error('plan lnkSetPrint', e));
    setTimeout(()=>{ try{ renderLedger(); }catch(_){} }, 40);
    return true;
  }
  /* Chip 🔗 hiện trên ô DO của cả Ledger lẫn Table view. */
  function lnkBadgeHtml(r){
    const k = lnkKind(r), gid = lnkGid(r);
    if(!k || !gid) return '';
    const ms = lnkMembers(gid), n = ms.length;
    const i  = ms.findIndex(m => String(m._oid||'') === String(r._oid||'')) + 1;
    if(k === LNK_ALT){
      if(lnkIsParked(r))
        return '<span class="tp-lnk alt off" title="Linked order — another truck in this group is already loading, so this row is parked and is not counted. It is released automatically if that truck leaves the station.">⏸ ALT ' + i + '/' + n + '</span>';
      const rep = _lnkAltRep(ms);
      const isRep = !!(rep && String(rep._oid||'') === String(r._oid||''));
      return '<span class="tp-lnk alt' + (isRep ? ' rep' : '') + '" title="ALTERNATE trucks — ONE order, ' + n
           + ' possible trucks. Only one of them is counted in PLAN / LOADED / REMAIN'
           + (isRep ? ' — this is the row being counted.' : '.') + '">🔗 ALT ' + i + '/' + n + (isRep ? ' ★' : '') + '</span>';
    }
    const pm = (String(r._lnkPrint||'') === 'separate') ? 'separate' : 'combined';
    return '<span class="tp-lnk mdo" title="MULTI-DO — one truck carries ' + n
         + ' DOs. Assigning any of them loads them together, no questions asked; PTT / DN print ' + pm
         + '.">🔗 MDO ' + i + '/' + n + '</span>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     v4.109 — Hộp thoại 🔗 LINK ORDERS
     Dựng DOM ngay trong JS (như PTT_EARLY) để index.html chỉ cần thêm
     ĐÚNG một cái nút. Mỗi instance (tp / tmr) có id riêng nên hai bảng
     kế hoạch không giẫm lên nhau.
     ═══════════════════════════════════════════════════════════════════ */
  const _lnkSel = new Set();
  function _lnkBgId(){ return ID + 'LinkBg'; }
  function _lnkEnsureModal(){
    let bg = document.getElementById(_lnkBgId());
    if(bg) return bg;
    bg = document.createElement('div');
    bg.id = _lnkBgId();
    bg.className = 'lnk-bg';
    bg.innerHTML =
        '<div class="lnk-modal">'
      +   '<div class="lnk-hdr">'
      +     '<div><h3>🔗 Link orders</h3>'
      +     '<div class="lnk-sub">One real order can arrive on several plan rows. Link them so the software stops counting the same load twice.</div></div>'
      +     '<button class="lnk-x" onclick="'+G+'.closeLink()">✕</button>'
      +   '</div>'
      +   '<div class="lnk-body" id="'+ID+'LinkBody"></div>'
      +   '<div class="lnk-foot" id="'+ID+'LinkFoot"></div>'
      + '</div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', e=>{ if(e.target === bg) closeLink(); });
    return bg;
  }
  function openLink(){
    _lnkEnsureModal();
    _lnkSel.clear();
    _lnkRender();
    document.getElementById(_lnkBgId()).classList.add('on');
  }
  function closeLink(){
    const bg = document.getElementById(_lnkBgId());
    if(bg) bg.classList.remove('on');
    _lnkSel.clear();
  }
  function lnkToggleSel(oid, on){
    const k = String(oid||'');
    if(on) _lnkSel.add(k); else _lnkSel.delete(k);
    _lnkRenderFoot();
  }
  function _lnkRowLine(r){
    const oid  = String(r._oid||'');
    const dn   = String(r.doNum||'').trim() || '—';
    const st   = String(getEffectiveStatus(r)||'').toLowerCase();
    const linked = lnkIsLinked(r);
    const stTxt = st === 'done' ? '✅ Done' : st === 'loading' ? '⛽ Loading'
                : st === 'cancel' ? (lnkIsParked(r) ? '⏸ Parked' : '🚫 Cancelled')
                : st === 'entered' ? '🚛 Entered' : '— Pending';
    return '<label class="lnk-row'+(linked?' linked':'')+(st==='done'||st==='loading'?' busy':'')+'">'
      + '<input type="checkbox" '+(linked?'disabled':'')+' '+(_lnkSel.has(oid)?'checked':'')
      + ' onchange="'+G+'.lnkToggleSel(\''+escapeHtml(oid).replace(/'/g,"")+'\', this.checked)">'
      + '<span class="lnk-c plate">'+escapeHtml(String(r.plate||'—'))+'</span>'
      + '<span class="lnk-c do">'+escapeHtml(dn)+'</span>'
      + '<span class="lnk-c drv">'+escapeHtml(String(r.driver||'—'))+'</span>'
      /* v4.133 — CỘT NOTE. Lý do phải link hai dòng lại gần như luôn nằm ở
         ô Note của kế hoạch ("xe thay thế", "1 xe 2 DO", tên xe dự phòng…).
         Trước đây modal không hiện Note nên nhân viên phải nhớ hoặc mở lại
         Today Plan để dò — dễ link nhầm hai dòng khác đơn. Ô trống để TRẮNG
         (không in dấu —) để mắt chỉ dừng ở dòng thật sự có ghi chú. */
      + (function(){ const nt = String(r.note||'').trim();
          return '<span class="lnk-c note'+(nt?'':' empty')+'" title="'
               + escapeHtml(nt ? ('Note: '+nt) : 'No note on this plan row')+'">'
               + escapeHtml(nt)+'</span>'; })()
      + '<span class="lnk-c qty">'+escapeHtml(String(r.qty||'—'))+' MT</span>'
      + '<span class="lnk-c date">'+escapeHtml(isoLabel(r._forDate||''))+'</span>'
      + '<span class="lnk-c st">'+stTxt+'</span>'
      + '<span class="lnk-c bdg">'+lnkBadgeHtml(r)+'</span>'
      + '</label>';
  }
  function _lnkRender(){
    const body = document.getElementById(ID + 'LinkBody');
    if(!body) return;
    const rows = planRows();
    /* ── các nhóm đang có ── */
    const gseen = new Set(); const gHtml = [];
    rows.forEach(r=>{
      const gid = lnkGid(r);
      if(!gid || !lnkKind(r) || gseen.has(gid)) return;
      gseen.add(gid);
      const ms = lnkMembers(gid), k = lnkKind(r);
      const tot = ms.reduce((a,m)=>a + (parseFloat(m.qty||0)||0), 0);
      const pm  = (String(ms[0]._lnkPrint||'') === 'separate') ? 'separate' : 'combined';
      gHtml.push('<div class="lnk-grp '+k+'">'
        + '<div class="lnk-grp-hd">'
        +   '<span class="lnk-kind '+k+'">'+(k===LNK_ALT?'🔗 ALTERNATE TRUCKS':'🔗 MULTI-DO')+'</span>'
        +   '<span class="lnk-grp-meta">'+ms.length+' rows · '
        +     (k===LNK_ALT ? ('counts as 1 order, '+_fmtMT(_lnkAltRep(ms) ? (parseFloat(_lnkAltRep(ms).qty||0)||0) : 0)+' MT')
                           : ('one truck, total '+_fmtMT(tot)+' MT'))+'</span>'
        +   (k===LNK_MDO
              ? '<span class="lnk-pm">Print PTT / DN: '
                + '<button class="lnk-pmb'+(pm==='combined'?' on':'')+'" onclick="'+G+'.lnkSetPrint(\''+gid+'\',\'combined\')">Combined</button>'
                + '<button class="lnk-pmb'+(pm==='separate'?' on':'')+'" onclick="'+G+'.lnkSetPrint(\''+gid+'\',\'separate\')">Separate</button></span>'
              : '')
        +   '<button class="lnk-unbtn" onclick="'+G+'.lnkUnlink(\''+gid+'\')">✂ Unlink</button>'
        + '</div>'
        + '<div class="lnk-grp-rows">'
        +   ms.map(m=>'<div class="lnk-mini">'
        +     '<b>'+escapeHtml(String(m.plate||'—'))+'</b> · '+escapeHtml(String(m.doNum||'—'))
        +     ' · '+escapeHtml(String(m.qty||'—'))+' MT · '+escapeHtml(String(m.customer||'—'))
        +     (String(m.note||'').trim()
                ? ' · <span class="lnk-mnote">'+escapeHtml(String(m.note).trim())+'</span>' : '')
        +     (lnkIsParked(m)?' <span class="lnk-parked">⏸ parked</span>':'')+'</div>').join('')
        + '</div></div>');
    });
    /* ── danh sách dòng để chọn, gom theo khách hàng ── */
    const byCust = new Map();
    rows.forEach(r=>{
      const c = (String(r.customer||'').trim() || '—');
      if(!byCust.has(c)) byCust.set(c, []);
      byCust.get(c).push(r);
    });
    let list = '';
    byCust.forEach((items, cust)=>{
      list += '<div class="lnk-cust">'+escapeHtml(cust)+'<span>'+items.length+' row'+(items.length>1?'s':'')+'</span></div>'
            + items.map(_lnkRowLine).join('');
    });
    if(!rows.length) list = '<div class="lnk-empty">No plan rows for the dates currently shown.</div>';
    body.innerHTML =
        '<div class="lnk-help">'
      +   '<div><b>🔗 Alternate trucks</b> — one order, several trucks on the plan, and only <b>one</b> of them will actually come. '
      +   'The group is counted <b>once</b> (largest qty in the group). The moment one truck is assigned, the others are parked automatically, and released again if that truck leaves the station.</div>'
      +   '<div><b>🔗 Multi-DO</b> — one truck carrying several DOs. Everything is still sold, so nothing is deducted; assigning any row loads them all together with no pop-up, and the only question left is whether PTT / DN print combined or separate.</div>'
      + '</div>'
      + (gHtml.length ? '<div class="lnk-sect">Existing groups</div>' + gHtml.join('') : '')
      + '<div class="lnk-sect">Plan rows — tick the ones that belong to the same order</div>'
      /* v4.133 — hàng tiêu đề cột: có Note rồi thì phải nói rõ cột nào là cột nào,
         không thì nhìn một dãy chữ nghiêng chẳng biết đó là gì. */
      + (rows.length ? '<div class="lnk-row lnk-hd">'
        +   '<span></span>'
        +   '<span class="lnk-c">Truck</span>'
        +   '<span class="lnk-c">DO</span>'
        +   '<span class="lnk-c drv">Driver</span>'
        +   '<span class="lnk-c">Note</span>'
        +   '<span class="lnk-c qty">Qty</span>'
        +   '<span class="lnk-c">Date</span>'
        +   '<span class="lnk-c">Status</span>'
        +   '<span></span></div>' : '')
      + list;
    _lnkRenderFoot();
  }
  function _lnkRenderFoot(){
    const foot = document.getElementById(ID + 'LinkFoot');
    if(!foot) return;
    const n = _lnkSel.size;
    const sel = Array.from(_lnkSel).map(o=>PLAN[o]).filter(Boolean);
    const tot = sel.reduce((a,r)=>a + (parseFloat(r.qty||0)||0), 0);
    const maxQ = sel.reduce((a,r)=>Math.max(a, parseFloat(r.qty||0)||0), 0);
    foot.innerHTML =
        '<span class="lnk-count">'+n+' row'+(n===1?'':'s')+' selected'
      +   (n>1 ? ' · sum '+_fmtMT(tot)+' MT · largest '+_fmtMT(maxQ)+' MT' : '')+'</span>'
      + '<button class="lnk-btn alt" '+(n<2?'disabled':'')+' onclick="'+G+'.lnkApply(\'alt\')" '
      +   'title="One order — only one of these trucks will come. Counted once.">🔗 One order · alternate trucks</button>'
      + '<button class="lnk-btn mdo" '+(n<2?'disabled':'')+' onclick="'+G+'.lnkApply(\'mdo\')" '
      +   'title="One truck carrying all of these DOs. Everything is still sold.">🔗 One truck · multi-DO</button>'
      + '<button class="lnk-btn ghost" onclick="'+G+'.closeLink()">Close</button>';
  }
  /* Tạo nhóm từ các dòng đang tick. Chặn những tổ hợp chắc chắn sai, cảnh báo
     những tổ hợp đáng ngờ nhưng vẫn cho làm (kế hoạch thực tế rất lộn xộn). */
  function lnkApply(kind){
    const oids = Array.from(_lnkSel).filter(o=>PLAN[o]);
    if(oids.length < 2){ toast('Select at least 2 rows','er'); return; }
    const rows = oids.map(o=>PLAN[o]);
    if(rows.some(lnkIsLinked)){ toast('Some rows are already linked — unlink them first','er'); return; }
    const dates = new Set(rows.map(r=>String(r._forDate||'').trim()));
    if(dates.size > 1){ toast('All rows in a group must share the same plan date','er'); return; }
    const busy = rows.filter(r=>{ const st = getEffectiveStatus(r); return st === 'done' || st === 'loading'; });
    if(busy.length > 1){ toast('More than one row is already loading / done — they cannot be one order','er'); return; }
    const norm = v => String(v||'').replace(/[-.\s]/g,'').toUpperCase();
    if(kind === LNK_MDO){
      const plates = new Set(rows.map(r=>norm(r.plate)));
      if(plates.size > 1 &&
         !confirm('MULTI-DO means ONE truck carrying every DO in the group, but the selected rows list '
                + plates.size + ' different plates.\n\nLink them anyway?')) return;
      const tot = rows.reduce((a,r)=>a + (parseFloat(r.qty||0)||0), 0);
      if(tot > 27 &&
         !confirm('Combined quantity is ' + tot.toFixed(3) + ' MT, above the 27 MT a single truck can take.\n\nLink them anyway?')) return;
    } else {
      const qs = Array.from(new Set(rows.map(r=>parseFloat(r.qty||0)||0)));
      if(qs.length > 1 &&
         !confirm('Alternate trucks normally carry the SAME quantity, but the selected rows differ ('
                + qs.map(q=>q.toFixed(3)).join(' / ') + ' MT).\n\nThe group will be counted as '
                + Math.max.apply(null, qs).toFixed(3) + ' MT (the largest). Link them anyway?')) return;
    }
    if(lnkWrite(oids, kind)){
      toast('Linked ' + oids.length + ' rows as ' + (kind === LNK_ALT ? 'ONE ORDER (alternate trucks)' : 'ONE TRUCK (multi-DO)'), 'ok');
      _lnkSel.clear();
      setTimeout(_lnkRender, 120);
    }
  }
  /* ══ v4.112 — LINK MULTI-DO TỪ TAB SCALE (không qua hộp thoại) ══════
     Sáng nhiều xe quá, sale chưa kịp bấm 🔗 Link Orders. Nhân viên cân
     phát hiện xe nhiều DO ngay lúc assign và chọn "bán gộp" — lựa chọn đó
     PHẢI quay ngược về kế hoạch, nếu không Today Plan vẫn coi đây là hai
     đơn rời và hai bên nói khác nhau.
     Khác `lnkApply`: không đọc ô tick, không hỏi confirm (nhân viên cân vừa
     trả lời đúng câu đó ở trạm rồi), không bao giờ tự gỡ link người khác đã
     đặt. Trả 'created' | 'updated' | 'noop' | '' (không làm được). */
  function lnkLinkMdo(oids, printMode){
    const list = (oids||[]).map(o=>String(o||'').trim()).filter(o=>PLAN[o]);
    if(list.length < 2) return '';
    const pm   = (printMode === 'separate') ? 'separate' : 'combined';
    const rows = list.map(o=>PLAN[o]);
    const gids = new Set(rows.map(r=>lnkGid(r)).filter(Boolean));
    /* Cả nhóm đã nằm sẵn trong MỘT nhóm 🔗 ⇒ chỉ cập nhật cách in. */
    if(gids.size === 1 && rows.every(lnkIsLinked)){
      const gid = Array.from(gids)[0];
      if(lnkKind(rows[0]) !== LNK_MDO) return '';       /* nhóm ALT — KHÔNG đụng */
      if(rows.some(r=>lnkGid(r) !== gid)) return '';
      const cur = (String(rows[0]._lnkPrint||'') === 'separate') ? 'separate' : 'combined';
      if(cur === pm) return 'noop';
      return lnkSetPrint(gid, pm) ? 'updated' : '';
    }
    /* Có dòng đang thuộc một nhóm KHÁC ⇒ dừng. Gỡ link của người khác để
       tự lập nhóm mới là việc quá tay, phải do người dùng quyết định. */
    if(gids.size) return '';
    return lnkWrite(list, LNK_MDO, pm) ? 'created' : '';
  }
  function lnkUnlink(gid){
    const ms = lnkMembers(gid);
    if(!ms.length) return;
    if(!confirm('Unlink this group of ' + ms.length + ' rows?\n\nEvery row goes back to being counted on its own.')) return;
    if(lnkWrite(ms.map(r=>String(r._oid||'')), '')){
      toast('Unlinked ' + ms.length + ' rows','ok');
      setTimeout(_lnkRender, 120);
    }
  }

  /* -------- Ensure temp DOs for orders without a real DO --------
     This is the MANUAL trigger of the same logic that runs automatically on paste
     (resolveOid). It NEVER creates a blank row. It scans existing plan orders and,
     for any whose DO column is empty or a placeholder (e.g. "after loading") and that
     does not already carry a temp id, assigns a TMP-YYYYMMDD-NNN identifier. */
  /* Low-level single-field writer to PLAN + Firebase, bypassing the special-case
     branches in editCellField (used for repairs / programmatic writes). */
  function _writeField(oid, field, value){
    const row = PLAN[oid];
    if(!row || !FB_DB) return;
    row[field] = value;
    const payload = {};
    payload[`${FBN}${oid}/${field}`] = value;
    _stampWho(payload, oid);
    bumpVersion(payload);
    _fbUpdate(payload)
      .catch(e=>{ console.error('plan _writeField', e); });
  }

  function createTempDO(){
    if(!canWrite(PERMK)){ toast('You do not have permission to edit '+UILABEL,'er'); return; }
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    const seqMap = _tempSeqMap(planDate);
    let created = 0, skipped = 0;
    Object.values(PLAN).slice().forEach(r=>{          /* snapshot — renameOid mutates PLAN */
      const doN = String(r.doNum||'').trim();
      const oid = String(r._oid||'');
      if(isRealDO(doN)) return;                        /* already has a real DO → skip */
      if(isTempOid(oid)) return;                       /* already a temp order → repaired below */
      /* SALES GATE: a temp DO may be issued ONLY when sales has written
         "after loading" into the DO column. Any other value (blank, a note, etc.)
         means temp-DO selling is NOT approved → leave the row untouched. */
      if(!/after\s*loading/i.test(doN)){ if(doN) skipped++; return; }
      const pfx = tempPrefix(r.customer);
      seqMap[pfx] = (seqMap[pfx]||0) + 1;
      const newOid = makeTempOid(planDate, seqMap[pfx], r.customer);
      if(renameOid(oid, newOid, { writeDoNum:true })) created++;
    });
    /* repair any temp order whose DO column still shows placeholder text */
    const repaired = _repairTempDoNums();
    const parts = [];
    if(created)  parts.push(`${created} new temp DO`);
    if(repaired) parts.push(`wrote temp DO into ${repaired} row(s)`);
    if(parts.length)      toast('Done: '+parts.join(', ')+(skipped?` · ${skipped} row(s) skipped (no "after loading")`:''),'ok');
    else if(skipped)      toast(`No temp DO created — ${skipped} row(s) have no "after loading" mark from sales`,'');
    else                  toast('All orders already have a DO (real or temp) — column is correct','ok');
    rebuildTableData();
  }

  /* -------- Identity helpers shared with SYNC (Phase 2) --------
     Normalization mirrors posFingerprint so cross-module matching is consistent. */
  function normPlate(v){ return String(v||'').replace(/[-.\s]/g,'').toUpperCase(); }
  function normDriver(v){ return String(v||'').replace(/\s+/g,'').toLowerCase(); }

  /* v4.22.1 — VN-aware normalizer for driver/customer matching.
     Lowercase + remove diacritics + collapse whitespace. Lets us compare
     "HOÀNG TRẦN NGỌC" with "Trần Ngọc Hoàng" by word-set after this strips
     the marks and downcases. Mirrors V406 _normVNName. */
  function _normVN(s){
    return String(s||'')
      .trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'d')
      .replace(/\s+/g,' ');
  }
  /* WMS vehicle field combines truck+rmooc separated by whitespace, e.g.
     "70E-00375 70R-02272". The plan stores them separately (plate vs rmooc).
     Match any whitespace-split token against the plan plate (normalized).
     Mirrors V406's plate-parts.some(p => p === rdPlateClean) logic. */
  function _plateMatchAny(wmsVehicle, planPlate){
    const planClean = String(planPlate||'').replace(/[-.\s]/g,'').toUpperCase();
    if(!planClean) return false;
    return String(wmsVehicle||'').split(/\s+/).some(p =>
      p.replace(/[-.\s]/g,'').toUpperCase() === planClean
    );
  }
  /* Driver matching that survives Vietnamese name re-ordering. Three rungs:
       1. exact after VN normalize          (toggleable diacritics, casing)
       2. sorted word-set                   ("Hoang Tran Ngoc" === "Tran Ngoc Hoang")
       3. subset (all words of shorter set appear in larger set; >=2 each side)
     Mirrors V406's _matchDriverName. */
  function _driverMatch(a, b){
    if(!a || !b) return false;
    const na = _normVN(a), nb = _normVN(b);
    if(na === nb) return true;
    const wa = na.split(' ').filter(Boolean).sort().join(' ');
    const wb = nb.split(' ').filter(Boolean).sort().join(' ');
    if(wa === wb) return true;
    const sa = new Set(na.split(' ').filter(Boolean));
    const sb = new Set(nb.split(' ').filter(Boolean));
    if(sa.size >= 2 && sb.size >= 2){
      const smaller = sa.size <= sb.size ? sa : sb;
      const larger  = sa.size <= sb.size ? sb : sa;
      let all = true;
      smaller.forEach(w => { if(!larger.has(w)) all = false; });
      if(all) return true;
    }
    return false;
  }

  /* Find a TEMP order (oid starts 'TMP-') matching a vehicle plate (+ optional driver).
     Returns the matching _oid string, or null. ONLY temp orders are eligible — a real
     DO order is never matched here (its identity is already final). */
  function findTempOrderByVehicle(plate, driver){
    const np = normPlate(plate);
    if(!np) return null;
    const nd = normDriver(driver);
    let hit = null;
    Object.values(PLAN).forEach(r=>{
      if(hit) return;
      if(!isTempOid(String(r._oid||''))) return;     /* promote temp orders only */
      if(normPlate(r.plate) !== np) return;
      /* driver is a loose tie-breaker: only reject when both sides have a driver and differ */
      const rd = normDriver(r.driver);
      if(nd && rd && rd !== nd) return;
      hit = r._oid;
    });
    return hit;
  }

  /* Normalize a customer name for matching: keep alphanumerics, uppercase.
     WMS customer names and plan customer names rarely match char-for-char, so we
     compare on a normalized substring-overlap basis (either contains the other). */
  function normCust(v){ return String(v||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function custMatch(a, b){
    const na = normCust(a), nb = normCust(b);
    if(!na || !nb) return false;
    if(na === nb) return true;
    const short = na.length <= nb.length ? na : nb;
    const long  = na.length <= nb.length ? nb : na;
    return short.length >= 4 && long.includes(short);
  }

  /* v4.22.1 — Customer match that resolves the plan customer through the
     CUST table to its canonical WMS name first. This handles the common case
     where the plan shows a short label ("THAI LYHUOT (EXPORT)") and WMS shows
     the legal name ("THAI LYHUOT IMPORT EXPORT CO LTD"). CT.wmsName returns
     the input unchanged if no record is found, so the fallback degrades to
     the legacy custMatch behavior. */
  function _custMatchViaCt(wmsCustomer, planCustomer){
    if(!wmsCustomer || !planCustomer) return false;
    let planMapped = planCustomer;
    try{
      if(typeof CT !== 'undefined' && CT.wmsName) planMapped = CT.wmsName(planCustomer) || planCustomer;
    }catch(_){}
    /* Exact diacritic-insensitive comparison on the mapped name. */
    const nw = normCust(wmsCustomer);
    const np = normCust(planMapped);
    if(nw && np && nw === np) return true;
    /* Word-set fallback after VN-normalize, mirrors driver matching. Catches
       "GAS SOUTH JOINT STOCK COMPANY" vs "Gas South JSC" by token overlap. */
    const sw = new Set(_normVN(wmsCustomer).split(/\s+/).filter(w => w.length >= 3));
    const sp = new Set(_normVN(planMapped).split(/\s+/).filter(w => w.length >= 3));
    if(sw.size && sp.size){
      const smaller = sw.size <= sp.size ? sw : sp;
      const larger  = sw.size <= sp.size ? sp : sw;
      let all = true;
      smaller.forEach(w => { if(!larger.has(w)) all = false; });
      if(all) return true;
    }
    /* Last resort — the legacy substring rule (mostly to keep older test
       data from regressing if CT is empty). */
    return custMatch(wmsCustomer, planMapped);
  }

  /* STRICT match for WMS GI promotion (Phase 2, per user spec):
       customer (WMS name) + driver + plate must all line up against a TEMP order.
     Returns the matching _oid or null. Used only to decide candidates; the actual
     promote still goes through the user-confirmed table.
     v4.22.1 — switched to _plateMatchAny (split WMS vehicle), _driverMatch
     (VN-aware word-set), and _custMatchViaCt (resolves plan.customer through
     CT.wmsName before compare). The previous strict-equality logic failed on
     real data: WMS vehicle "70E-00375 70R-02272" never equalled plan plate
     "70E-00375", and "HOÀNG TRẦN NGỌC" never equalled "Trần Ngọc Hoàng". */
  function findTempOrderStrict(wmsCustomer, driver, plate){
    if(!plate) return null;
    let hit = null;
    Object.values(PLAN).forEach(r=>{
      if(hit) return;
      if(!isTempOid(String(r._oid||''))) return;          /* temp orders only */
      if(!_plateMatchAny(plate, r.plate)) return;          /* plate must match (any WMS part) */
      if(driver && r.driver && !_driverMatch(driver, r.driver)) return;
      if(wmsCustomer && r.customer && !_custMatchViaCt(wmsCustomer, r.customer)) return;
      hit = r._oid;
    });
    return hit;
  }

  /* Rename the unified order id = move the Firebase node (old → new), keeping all data.
     Single source of the rename mechanic, reused by the manual "DO Var" cell edit and by
     SYNC.promoteFromWMS. Returns true on success, false if blocked (no row / target exists
     / no permission / offline). Does NOT touch _status. */
  function renameOid(oldOid, newOid, opts){
    oldOid = String(oldOid||'');
    newOid = String(newOid||'').trim();
    if(!oldOid || !newOid || oldOid === newOid) return false;
    const row = PLAN[oldOid];
    if(!row) return false;
    if(PLAN[newOid]) return false;                  /* refuse to clobber an existing order */
    if(!canWrite(PERMK) || !FB_DB) return false;
    const cloned = { ...row, _oid: newOid };
    /* mirror the id into the DO column so clicking the order shows its (temp/real) DO number,
       which is what gets carried to TL Data / SCALE assign / PTT printout. */
    if(opts && opts.writeDoNum){ cloned.doNum = newOid; }
    delete PLAN[oldOid];
    PLAN[newOid] = cloned;
    const payload = {};
    payload[`${FBN}${oldOid}`] = null;
    payload[`${FBN}${newOid}`] = sanitizeForStorage(cloned);
    bumpVersion(payload);
    _fbUpdate(payload)
      .catch(e=>{ console.error('plan renameOid', e); });
    rebuildTableData();
    return true;
  }

  /* -------- Firebase listeners (per-area cache + version) -------- */
  let FB_DB = null;
  /* v4.139 — cửa gọi "quét lại Firebase ngay" từ ngoài attachFirebase (paste,
     nút 🧹 dedup). Được gán thật khi listener đã gắn; trước đó là no-op. */
  let _resyncNow = ()=>Promise.resolve(0);
  let _resyncOk = false;          /* lan quet gan nhat co DOC DUOC Firebase khong */
  function attachFirebase(){
    if(typeof firebase === 'undefined') return;
    FB_DB = firebase.database();
    /* v4.204 — app để mở qua đêm: 5 phút xem lại một lần ⇒ sang ngày mới là tự ghi kế hoạch đầu ngày mới */
    if(ID === 'tp') setInterval(() => { try{ _pdayAuto(); }catch(_){} }, 300000);

    FB_DB.ref(VERK).on('value', s=>{
      const v = s.val()||0;
      if(v > _versions.plan) _versions.plan = v;
    });

    const ref = FB_DB.ref(FBN);

    /* v4.126 — đợt child_added ĐẦU TIÊN là replay toàn bộ bảng lúc mở app, không
       phải thay đổi mới ⇒ chưa được phép bắn thông báo. Cờ mở sau once('value').
       ⚠ PHẢI khai báo TRƯỚC khối once('value') bên dưới: trong test (và với
       Firebase đang có cache) promise đó có thể resolve NGAY, gọi ngược lên đây
       khi biến còn trong vùng chết của `const` → ReferenceError, hỏng cả bảng. */
    let _replayDone = false;
    const _openNotifGate = ()=>{ setTimeout(()=>{ _replayDone = true; }, 1500); };

    /* ══════════ v4.138 · FIREBASE LA NGUON DUY NHAT — QUET LAI TOAN BANG ══════════
       PLAN khong con cache dia (xem dau file). Ham nay keo NGUYEN TRANG THAI tren
       Firebase ve RAM va lam cho RAM GIONG HET server:
         ① XOA moi dong RAM ma server khong con  → het dong "ma" / trung lap;
         ② LAY BAN SERVER cua moi dong server co → lanh luon nhung lan
            child_changed bi lo (tab ngu, rot mang, throttle nen tab).
       Idempotent, khong bao gio DAY dong tu RAM len server (day chinh la loi cu
       "cache ghi de Firebase", lam song lai don da xoa o may khac).
       Dong nao may nay VUA ghi (con trong _selfEcho) thi bo qua o buoc ②, de
       mot lan quet khong nuot mat thao tac vua go.
       CHAY LUC: mo trang · moi lan noi lai mang · tab hien ra lai · dinh ky. */
    /* Co ban RIENG voi promise dang chay: neu Firebase (hoac firebase gia trong
       test) resolve NGAY, khoi .finally chay TRUOC khi phep gan promise hoan
       tat — gop hai thu lam mot se de lai mot promise "dang chay" khong bao gio
       duoc xoa, va moi lan quet sau deu bi bo qua. */
    let _resyncBusy = false, _resyncP = null;
    _resyncNow = (reason)=>_fullResync(reason||'manual');
    function _fullResync(reason){
      if(!FB_DB) return Promise.resolve(0);
      /* Dang quet do ⇒ bam vao chinh lan quet ay, dung tra ve "xong" gia
         (paste dua vao ket qua nay de biet RAM da khop server chua). */
      if(_resyncBusy && _resyncP) return _resyncP;
      _resyncBusy = true;
      const _p = ref.once('value').then(snap => {
        const fb = snap.val() || {};
        let dropped = 0, refreshed = 0; const junk = [];
        Object.keys(PLAN).forEach(oid=>{
          if(Object.prototype.hasOwnProperty.call(fb, oid)) return;
          /* Dong may nay VUA tao (lenh ghi con dang bay, anh chup nay chup truoc
             khi no toi server) KHONG phai dong ma — de yen, lan quet sau tinh. */
          if(_isSelfEcho(oid, null)) return;
          delete PLAN[oid]; dropped++;
        });
        Object.keys(fb).forEach(oid=>{
          const row = fb[oid];
          if(!row || typeof row !== 'object') return;
          /* v4.139 — khoa RAC (chi con vai o le, khong con du lieu nghiep vu):
             khong nap vao RAM, va don khoi Firebase neu co quyen ghi. */
          if(_isJunkRow(row)){
            if(PLAN[oid]){ delete PLAN[oid]; dropped++; }
            junk.push(oid);
            return;
          }
          if(_isSelfEcho(oid, null)) return;          /* lenh ghi cua minh dang bay */
          row._oid = oid;
          const cur = PLAN[oid];
          if(!cur || _rowSig(cur) !== _rowSig(row)){ PLAN[oid] = row; refreshed++; }
        });
        _loaded = true; _loadErr = false;
        if(junk.length) _purgeJunk(junk);
        try{ _pdayAuto(); }catch(e){ console.warn('[PLANDAY] auto', e); }   /* v4.204 */
        if(dropped || refreshed){
          console.warn(`[${PERMK}] resync(${reason||''}): -${dropped} ghost · ${refreshed} row(s) taken from Firebase`);
        }
        if(dropped || refreshed || !_firstPaintDone){
          _firstPaintDone = true;
          if(table) rebuildTableData(); else renderLedger();
          refreshCounts(); refreshBadge();
          try{ if(typeof FCHECK!=='undefined') FCHECK.recompute(); }catch(_){}
        }
        /* moc version theo server de lan ghi sau khong mang so thap hon */
        try{
          FB_DB.ref(VERK).once('value').then(vs => {
            const v = vs.val()||0;
            if(v > _versions.plan) _versions.plan = v;
          });
        }catch(_){}
        _resyncOk = true;
        return dropped + refreshed;
      }).catch(e => {
        _resyncOk = false;
        console.warn(`[${PERMK}] resync read failed (offline?) — listeners van chay`, e);
        /* Chua co du lieu that lan nao ⇒ phai NOI RA, dung de bang trong im lim
           bi doc nham la "hom nay khong co don". */
        if(!_loaded){ _loadErr = true; try{ renderLedger(); }catch(_){} }
        return 0;
      }).finally(()=>{ _resyncBusy = false; _resyncP = null; });
      if(_resyncBusy) _resyncP = _p;      /* chua xong ⇒ ghi nho de lan goi sau bam vao */
      return _p;
    }
    /* Chu ky on dinh cua mot dong, de biet co that su khac ban server khong. */
    function _rowSig(o){
      if(!o || typeof o !== 'object') return String(o);
      return Object.keys(o).filter(k=>k!=='_oid').sort()
             .map(k=>k+'='+String(o[k]===undefined||o[k]===null?'':o[k])).join('|');
    }
    /* Dang go trong o? Thi hoan quet dinh ky lai — dung cuop phim cua nguoi dung. */
    function _userIsTyping(){
      try{
        const el = document.activeElement;
        if(!el) return false;
        const t = (el.tagName||'').toUpperCase();
        return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
      }catch(_){ return false; }
    }

    _fullResync('open').then(_openNotifGate, _openNotifGate);   /* v4.126 gate, either way */

    /* Moi lan NOI LAI mang (lan `true` dau tien la luc mo trang, da co lenh tren). */
    let _fbConnectedOnce = false;
    FB_DB.ref('.info/connected').on('value', s=>{
      if(!s.val()) return;
      if(_fbConnectedOnce) _fullResync('reconnect');
      _fbConnectedOnce = true;
    });

    /* Tab bi an lau (may ngu, chuyen cua so) — trinh duyet bop socket, su kien
       co the khong ve day du. Hien ra lai thi quet mot lan, giam toi da 15s/lan. */
    let _lastVisResync = 0;
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) return;
      const now = Date.now();
      if(now - _lastVisResync < 15000) return;
      _lastVisResync = now;
      _fullResync('visible');
    });

    /* Luoi an toan cuoi cung: quet lai dinh ky khi tab dang hien va khong ai go.
       Mot node plan chi vai chuc dong ⇒ chi phi khong dang ke, doi lai la bao dam
       hai may KHONG BAO GIO hien hai con so khac nhau qua 2 phut. */
    setInterval(()=>{
      if(document.hidden || _userIsTyping()) return;
      _fullResync('periodic');
    }, 120000);

    /* ── v4.34.0 — child events coalesce into ONE debounced refresh.
       The initial replay fires child_added once per row; the old handlers
       ran saveCache (full-PLAN serialize) + rebuildTableData per row,
       making startup O(N²). RAM is mutated immediately; cache/table/badge
       refresh once per burst. Zero change in Firebase traffic. */
    let _syncT = null;
    const _scheduleSync = ()=>{
      if(_syncT) return;
      _syncT = setTimeout(()=>{
        _syncT = null;
        _loaded = true;   /* v4.138 — da co du lieu that tu Firebase */
        saveCache();
        if(table) rebuildTableData();
        refreshCounts(); refreshBadge();
        try{ if(typeof FCHECK!=='undefined') FCHECK.recompute(); }catch(_){}
        try{ _pdayAuto(); }catch(e){ console.warn('[PLANDAY] auto', e); }   /* v4.204 */
      }, 100);
    };
    ref.on('child_added', snap=>{
      const oid = snap.key, row = snap.val();
      if(!row) return;
      if(_isJunkRow(row)) return;   /* v4.139 — khoa rac, khong co du lieu nghiep vu */
      /* v4.138 — chi bo qua doi am cua CHINH don vua ghi tu may nay; su kien
         cua may khac LUON duoc ap dung (truoc day mot lenh ghi bat ky cua may
         nay lam mat 600ms su kien cua ca bang ⇒ dong ma / trung lap). */
      if(PLAN[oid] && _isSelfEcho(oid, row)) return;
      row._oid = oid;
      const prev = PLAN[oid];
      PLAN[oid] = row;
      if(_replayDone && !prev) _saleNotify('add', oid, null, row);
      _scheduleSync();
    });
    ref.on('child_changed', snap=>{
      const oid = snap.key, row = snap.val();
      if(!row) return;
      /* v4.139 — dong bi rut het du lieu = coi nhu da xoa. */
      if(_isJunkRow(row)){ if(PLAN[oid]){ delete PLAN[oid]; _scheduleSync(); } return; }
      if(PLAN[oid] && _isSelfEcho(oid, row)) return;
      row._oid = oid;
      const prev = PLAN[oid];
      PLAN[oid] = row;
      if(_replayDone) _saleNotify('edit', oid, prev, row);
      _scheduleSync();
    });
    ref.on('child_removed', snap=>{
      const oid = snap.key;
      const prev = PLAN[oid];
      /* XOA thi LUON ap dung — dong nay da bien mat tren Firebase. Idempotent:
         neu chinh may nay vua xoa thi PLAN[oid] von da khong con. Day chinh la
         su kien tung bi nuot mat va sinh ra dong trung lap. */
      delete PLAN[oid];
      if(_replayDone && !_isSelfEcho(oid, null)) _saleNotify('del', oid, prev, null);
      _scheduleSync();
    });

    /* One-time data repair after the initial snapshot: any TEMP order whose DO column
       still holds placeholder text (e.g. "After loading") gets its temp id written into
       doNum, in a single batched update. This makes the stored value match the temp DO
       (no more "After loading" lurking under the display) and keeps each order's doNum
       unique so station search/assign works. */
    ref.once('value').then(()=>{ setTimeout(_repairTempDoNums, 400); }).catch(()=>{});
  }

  /* Batched repair: write _oid into doNum for every temp order where they differ. */
  function _repairTempDoNums(){
    if(!FB_DB || !canWrite(PERMK)) return 0;
    const payload = {}; let n = 0;
    Object.values(PLAN).forEach(r=>{
      const oid = String(r._oid||'');
      if(isTempOid(oid) && String(r.doNum||'') !== oid){
        r.doNum = oid;
        payload[`${FBN}${oid}/doNum`] = oid;
        n++;
      }
    });
    if(n){
      bumpVersion(payload);
      _fbUpdate(payload)
        .catch(e=>{ console.warn('plan repair doNum', e); });
      if(table) rebuildTableData();
    }
    return n;
  }

  /* -------- Tabulator -------- */
  const STATUS_OPTS = [
    {val:'',        label:'Pending',   cls:'s-pending', icon:'—'},
    {val:'entered', label:'Entered',   cls:'s-entered', icon:'🚛'},
    {val:'loading', label:'Loading',   cls:'s-loading', icon:'⛽'},
    {val:'done',    label:'Done',      cls:'s-done',    icon:'✅'},
    {val:'cancel',  label:'Cancelled', cls:'s-cancel',  icon:'🚫'}
  ];

  /* ─── Effective status (the heart of AUTO mode) ───
     In AUTO mode (_autoSync !== false), a plan row's status is computed at render
     time from station state + TL Data presence — never persisted to Firebase. This
     is the Spark-quota saver: thousands of status flips a day cost zero writes.
     In MANUAL mode (_autoSync === false) we honor the stored row._status value,
     which IS written to Firebase (so other machines see the operator's override).

     Compute rules — Highest priority wins:
       1. TL Data has a row matching this _oid or doNum → 'done'
       2. A station has this _oid in 'loading' state            → 'loading'
       3. Otherwise                                              → '' (pending)
     The 'entered' / 'cancel' values are MANUAL-only; AUTO never produces them. */
  function computeStatusFromState(row){
    if(!row) return '';
    const oid    = String(row._oid||'').trim();
    const doStr  = String(row.doNum||'').trim();
    if(!oid && !doStr) return '';
    /* TL Data presence wins. v4.34.0 — O(1) lookups in TL.getIndex()
       (rebuilt lazily once per TL mutation) instead of scanning every
       TL row for every plan row on every table render. */
    if(typeof TL !== 'undefined' && TL.getIndex){
      const byKey = TL.getIndex().byKey;
      if(oid   && byKey.has(oid))   return 'done';
      if(doStr && byKey.has(doStr)) return 'done';
    }
    /* Station state — only 'loading' is meaningful (the only non-empty state now). */
    if(typeof DB_SC !== 'undefined' && DB_SC.stations){
      for(const id in DB_SC.stations){
        const s = DB_SC.stations[id];
        if(!s || s.status !== 'loading') continue;
        if(oid && String(s._oid||'') === oid) return 'loading';
        /* multi-DO: a station may carry several DOs combined — a linked plan row
           whose own DO is part of that load is also 'loading'. */
        if(doStr && s.doNum && typeof dosOverlap==='function' && dosOverlap(s.doNum, doStr)) return 'loading';
      }
    }
    return '';
  }
  function getEffectiveStatus(row){
    if(!row) return '';
    return row._autoSync === false ? (row._status||'') : computeStatusFromState(row);
  }

  /* ─── Effective Actual quantity (AUTO mode, RAM-only) ───
     Mirrors computeStatusFromState: sum the LPG net (lpgQty, kg) of every TL Data
     row that matches this plan order by _oid or real DO. Computed at render time,
     NEVER written to Firebase (a TMP order can have several scale turns; summing
     gives the total loaded). In MANUAL mode the stored _actualQty is honoured.
     v4.34.0 — sums via TL.getIndex(); the rid→qty maps for the two keys are
     unioned so a TL row matching BOTH keys is never double-counted. */
  function computeActualFromState(row){
    if(!row) return '';
    const oid   = String(row._oid||'').trim();
    const doStr = String(row.doNum||'').trim();
    if(!oid && !doStr) return '';
    if(typeof TL === 'undefined' || !TL.getIndex) return '';
    const byKey = TL.getIndex().byKey;
    const seen = new Map();   /* rid → qty|null, unioned across the two keys */
    [oid, doStr].forEach(k=>{
      if(!k) return;
      const m = byKey.get(k);
      if(m) m.forEach((q, rid)=>{ seen.set(rid, q); });
    });
    if(!seen.size) return '';
    let sum = 0, found = false;
    seen.forEach(q=>{ if(q !== null && !isNaN(q)){ sum += q; found = true; } });
    return found ? String(sum) : '';   /* kg — actualFormatter renders MT when >=1000 */
  }
  function getEffectiveActual(row){
    if(!row) return '';
    return row._autoSync === false ? (row._actualQty||'') : computeActualFromState(row);
  }

  function statusFormatter(cell){
    const row = cell.getRow().getData();
    const v   = getEffectiveStatus(row);
    const opt = STATUS_OPTS.find(o=>o.val===v) || STATUS_OPTS[0];
    /* Subtle marker on the pill so operators can tell at a glance whether the
       value is computed (AUTO) or stored manually. */
    const manual = row._autoSync === false ? ' tp-status-manual' : '';
    return `<span class="tp-status-pill ${opt.cls}${manual}" title="${row._autoSync===false?'Manual':'Auto'}"><span class="pdot"></span>${opt.icon} ${opt.label}</span>`;
  }
  function doFormatter(cell){
    const v = String(cell.getValue()||'').trim();
    const rowData = cell.getRow().getData();
    // Build WG diff badges (RAM-only) — appended after the DO value
    let wgBadges = '';
    try{ if(typeof WGCHECK !== 'undefined') wgBadges = WGCHECK.badgeHtml(rowData); }catch(_){}
    wgBadges += lnkBadgeHtml(rowData);   /* v4.109 — chip 🔗 ALT / MDO */
    /* real DO → show plain */
    if(isRealDO(v)) return `<span class="tp-do">${escapeHtml(v)}</span>${wgBadges}`;
    /* temp DO (stored in the DO column) → editable temp value */
    if(isTempOid(v)) return `<span class="tp-do tp-do-temp" title="Temp DO — editable; auto-upgrades to real DO when WMS GI matches">${escapeHtml(v)}</span>${wgBadges}`;
    /* nothing yet → prompt to create a temp DO */
    if(!v) return `<span class="tp-do tp-do-empty">no DO</span>${wgBadges}`;
    /* any leftover placeholder text (e.g. "After loading") → flag it */
    return `<span class="tp-do tp-do-empty" title="No temp DO — click '🔢 Create temp DO'">${escapeHtml(v)}</span>${wgBadges}`;
  }
  function oidFormatter(cell){
    const v = String(cell.getValue()||'').trim();
    if(!v) return `<span class="tp-var tp-var-empty">—</span>`;
    return `<span class="tp-var">${escapeHtml(v)}</span>`;
  }
  /* Plate cell: 3-level visual state — RAM-only, no Firebase reads.
       1) PLATE_DIFF (WG cross-check) → orange/red BLINK + 🚨 (priority over plain Fleet-missing
          because PLATE_DIFF is a stronger semantic: the truck IS in Fleet but doesn't match the WMS DO)
       2) Plate missing in Fleet      → red BLINK + ⚠
       3) Plate-cert expired/etc.     → red BLINK + 🔴N badge via FCHECK.cellWarn
       4) OK                          → plain text */
  function plateFormatter(cell){
    const v = String(cell.getValue()||'').trim();
    if(!v) return '<span class="tp-plate-empty">—</span>';
    const rowData = cell.getRow().getData();
    // Layer 1: WG plate diff
    try{
      if(typeof WGCHECK !== 'undefined' && WGCHECK.plateHasDiff(rowData)){
        const tip = (rowData._wgWarns || [])
          .filter(w => w.code === 'PLATE_DIFF')
          .map(w => w.msg).join('\n').replace(/"/g,'&quot;');
        return `<span class="tp-plate-wg-diff" title="${tip}">${escapeHtml(v)}</span>`;
      }
    }catch(_){}
    /* Layer 1b (v4.80): ⛔ BLOCK — xe bị nhà máy cấm nhận hàng. Đặt TRƯỚC
       layer "missing in Fleet" vì lệnh cấm có thể được ghi ở tab TW AVG cho
       một biển số chưa có trong TANK LORRY/TRACTOR; nếu để sau, nhánh missing
       return sớm và badge ⛔ không bao giờ hiện. */
    try{
      if(typeof FCHECK !== 'undefined' && FCHECK.blockedForPlate){
        const bl = FCHECK.blockedForPlate(v);
        if(bl.length){
          const btip = bl.map(b => 'CẤM NHẬN HÀNG: ' + (b.note || '(chưa ghi lý do)'))
                         .join('\n').replace(/"/g,'&quot;');
          return `<span class="tp-cert-blink">${escapeHtml(v)}</span>`
               + `<span class="tp-cert-badge blk" title="${btip}">⛔</span>`;
        }
      }
    }catch(_){}
    // Layer 2: missing in Fleet
    let missing = false;
    try{ if(typeof FCHECK!=='undefined') missing = !FCHECK.plateInFleet(v); }catch(_){}
    if(missing) return `<span class="fc-plate-missing" title="Plate not found in Fleet — verify">${escapeHtml(v)}</span>`;
    // Layer 3: expired/other Fleet cert problem on this plate
    try{
      if(typeof FCHECK !== 'undefined' && FCHECK.cellWarn){
        const w = FCHECK.cellWarn(rowData, 'plate');
        if(w.blink) return `<span class="tp-cert-blink">${escapeHtml(v)}</span>${w.badges}`;
      }
    }catch(_){}
    return escapeHtml(v);
  }

  /* Driver cell: red BLINK + per-issue badges (missing / expired / duplicate name).
     Mirrors V406 _planCertCell(r,'driver'). RAM-only. */
  function driverFormatter(cell){
    const v = String(cell.getValue()||'').trim();
    if(!v) return '<span class="tp-plate-empty">—</span>';
    try{
      if(typeof FCHECK !== 'undefined' && FCHECK.cellWarn){
        const w = FCHECK.cellWarn(cell.getRow().getData(), 'driver');
        if(w.blink) return `<span class="tp-cert-blink">${escapeHtml(v)}</span>${w.badges}`;
      }
    }catch(_){}
    return escapeHtml(v);
  }

  /* Rmooc cell: red BLINK + missing/expired badges. Mirrors V406. */
  function rmoocFormatter(cell){
    const v = String(cell.getValue()||'').trim();
    if(!v) return '<span class="tp-plate-empty">—</span>';
    try{
      if(typeof FCHECK !== 'undefined' && FCHECK.cellWarn){
        const w = FCHECK.cellWarn(cell.getRow().getData(), 'rmooc');
        if(w.blink) return `<span class="tp-cert-blink">${escapeHtml(v)}</span>${w.badges}`;
      }
    }catch(_){}
    return escapeHtml(v);
  }
  function actualFormatter(cell){
    const v = getEffectiveActual(cell.getRow().getData());
    if(v === '' || v == null) return `<span class="tp-actual tp-actual-empty">—</span>`;
    const n = parseFloat(v);
    if(isNaN(n)) return `<span class="tp-actual">${escapeHtml(String(v))}</span>`;
    /* v4.109 — LUÔN 3 số thập phân (đọc được tới kg). Giá trị lưu là kg khi
       >= 1000; số nhỏ hơn là MT gõ tay ở chế độ MANUAL nên giữ nguyên. */
    const disp = (n >= 1000 ? n/1000 : n).toFixed(3);
    return `<span class="tp-actual" title="${escapeHtml(String(v))} kg">${disp}</span>`;
  }

  function statusEditor(cell, onRendered, success, cancel){
    /* v4.59 — AUTO mode no longer refuses outright. Status is still computed
       there (Pending/Loading/Done follow the scale + TL Data), but the
       operator may pick CANCEL directly: it flips the row to MANUAL + cancel
       in one write (setManualStatus). Other statuses stay disabled in AUTO —
       they would be overwritten by the computed value anyway. */
    const rowData = cell.getRow().getData();
    const isAuto  = rowData._autoSync !== false;
    const current = isAuto ? getEffectiveStatus(rowData) : (rowData._status || '');
    const oid     = String(rowData._oid||'');
    const menu = document.createElement('div');
    menu.className = 'tp-stdd';
    STATUS_OPTS.forEach(opt=>{
      const item = document.createElement('div');
      const disabled = isAuto && opt.val !== 'cancel';
      item.className = 'tp-stdd-item' + (current === opt.val ? ' on' : '');
      if(disabled){
        item.style.opacity = '.45';
        item.style.cursor  = 'not-allowed';
        item.title = 'Auto-sync ON — this status is computed from the scale / TL Data. Uncheck ☑ to set it manually.';
      }
      item.innerHTML = `<span class="pdot" style="background:${opt.cls==='s-pending'?'#90a0ad':
        opt.cls==='s-entered'?'#00b8c8':opt.cls==='s-loading'?'#e8740c':
        opt.cls==='s-done'?'#1f9d55':'#d8392b'}"></span>${opt.icon} ${opt.label}`;
      item.onmousedown = e=>{ e.preventDefault(); e.stopPropagation();
        if(disabled){ toast('Auto-sync ON — only Cancel can be set here. Uncheck ☑ for full manual control.',''); return; }
        document.body.removeChild(menu);
        document.removeEventListener('mousedown', closer, true);
        if(isAuto && opt.val === 'cancel'){
          /* bypass Tabulator's cellEdited (which writes _status only and would
             be ignored while _autoSync is true) — do the atomic flip instead. */
          cancel();
          setManualStatus(oid, 'cancel');
          return;
        }
        success(opt.val);
      };
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    onRendered(()=>{
      const rect = cell.getElement().getBoundingClientRect();
      const menuH = STATUS_OPTS.length * 38 + 12;
      const top = (rect.bottom + menuH > window.innerHeight - 8)
        ? Math.max(8, rect.top - menuH - 4)
        : rect.bottom + 4;
      menu.style.top = top + 'px';
      menu.style.left = rect.left + 'px';
    });
    function closer(e){
      if(!menu.contains(e.target)){
        try{ document.body.removeChild(menu); }catch(_){}
        document.removeEventListener('mousedown', closer, true);
        cancel();
      }
    }
    setTimeout(()=>document.addEventListener('mousedown', closer, true), 10);
    /* return a hidden dummy element — Tabulator requires a Node */
    const dummy = document.createElement('input');
    dummy.type = 'hidden';
    return dummy;
  }

  /* per-row auto-sync control: a checkbox. CHECKED = ON (status auto-computes from
     station state + TL Data, no Firebase persistence). UNCHECKED = OFF (manual lock —
     the operator types status / actual by hand; those edits ARE written to Firebase
     so other machines see the override). */
  function autoSyncFormatter(cell){
    const on  = cell.getRow().getData()._autoSync !== false;
    const oid = String(cell.getRow().getData()._oid||'');
    const tip = on ? 'Auto-sync ON — uncheck to edit status manually'
                   : 'Manual (locked) — check to re-enable Auto-sync (clears the override on all machines)';
    return `<input type="checkbox" class="tp-sync-chk" ${on?'checked':''} title="${tip}"`
         + ` onclick="event.stopPropagation(); ${ID}ToggleRowSync('${oid}')">`;
  }
  /* Plan-date column formatter. Today = neutral; future = orange highlight
     (assignment to a station will be refused); past = red strikethrough
     (stale row from a previous day, also blocked). */
  function forDateFormatter(cell){
    const fd  = String(cell.getValue() || cell.getRow().getData()._forDate || '').trim();
    const tod = isoToday();
    if(!fd) return '<span class="tp-fordate-stale">—</span>';
    if(fd === tod) return `<span class="tp-fordate-today">${escapeHtml(isoLabel(fd))}</span>`;
    if(fd > tod)   return `<span class="tp-fordate-future" title="Future plan — cannot be assigned to a station yet">${escapeHtml(isoLabel(fd))}</span>`;
    return `<span class="tp-fordate-stale" title="Stale plan from ${escapeHtml(isoLabel(fd))} — cannot be assigned">${escapeHtml(isoLabel(fd))}</span>`;
  }

  /* ── v4.66 — product-type ratio helpers ──────────────────────────
     Plan col[2] carries free text ("50:50", "C3:20/C4:80", "30:70 Cargo
     July SPOT", "Pure Propane"…). Normalize through _pfDeriveType, which
     accepts the FULL ratio range (any a:b with a+b=100 → 10:90 … 90:10)
     plus the pure grades. Rows with no ratio derive to 50:50 (hàng bán
     phổ thông) — same fallback the PTT/DN printers use.
     Any ratio ≠ 50:50 (or a pure grade) is flagged with a warning badge
     so the operator double-checks tank/lot before selling. */
  function prodRatio(t){
    const norm = (typeof _pfDeriveType==='function') ? _pfDeriveType(t||'') : String(t||'');
    const m = norm.match(/C3:(\d{1,3})\/C4:(\d{1,3})/i);
    if(m) return parseInt(m[1],10)+':'+parseInt(m[2],10);
    if(/pure\s*propane/i.test(norm)) return 'Pure C3';
    if(/pure\s*butane/i.test(norm))  return 'Pure C4';
    return '';
  }
  function isSpecialType(t){
    const r = prodRatio(t);
    return r !== '' && r !== '50:50';
  }
  function typeBadgeHtml(t){
    if(!isSpecialType(t)) return '';
    const r = prodRatio(t);
    return '<span class="tp-type-badge" title="Product type '+r
         + ' — KHÁC hàng phổ thông 50:50. Kiểm tra tank/lot/COQ trước khi cân!">⚠ '+r+'</span>';
  }

  function buildColumns(){
    return [
      {title:'#', field:'no', width:50, hozAlign:'center', headerSort:false, sorter:'number',
        cssClass:'tp-no'},
      {title:'☑', field:'_autoSync', width:44, hozAlign:'center', headerSort:false,
        formatter:autoSyncFormatter,
        headerTooltip:'Per-row Auto-sync. Checked = Status & Actual computed from station + TL Data (no Firebase writes). Unchecked = manual entry (writes to Firebase).',
        cellClick:(e,cell)=>API.toggleRowSync(cell.getRow().getData()._oid)},
      {title:'Date', field:'_forDate', width:88, hozAlign:'center', headerSort:false,
        formatter:forDateFormatter,
        headerTooltip:'Plan date for this row. Rows whose date is not today cannot be assigned to a station — they are a future plan staged in advance.'},
      {title:'Status', field:'_status', width:130, hozAlign:'center', headerSort:false,
        formatter:statusFormatter, editor:statusEditor},
      {title:'Customer', field:'customer', minWidth:170, editor:'input', cssClass:'tp-customer',
        /* v4.66 — append a warning badge when the order's product type
           (full C3:C4 ratio range) is NOT the common 50:50 grade */
        formatter:function(cell){
          const d = cell.getRow().getData();
          return escapeHtml(String(cell.getValue()||'')) + typeBadgeHtml(d.type);
        }},
      {title:'Plate', field:'plate', width:115, editor:'input', cssClass:'tp-plate', formatter:plateFormatter},
      {title:'Rmooc', field:'rmooc', width:100, editor:'input', cssClass:'tp-rmooc', formatter:rmoocFormatter},
      {title:'Driver', field:'driver', minWidth:140, editor:'input', cssClass:'tp-driver', formatter:driverFormatter},
      {title:'Qty (MT)', field:'qty', width:80, editor:'input', cssClass:'tp-qty'},
      {title:'Tol.', field:'tolerance', width:60, editor:'input', cssClass:'tp-qty'},
      {title:'Actual', field:'_actualQty', width:90, editor:'input',
        formatter:actualFormatter, hozAlign:'right'},
      {title:'Gate', field:'allowGate', width:60, hozAlign:'center', editor:'list',
        editorParams:{values:['OK','NO']}},
      {title:'Load', field:'allowLoad', width:60, hozAlign:'center', editor:'list',
        editorParams:{values:['OK','NO']}},
      {title:'DO No.', field:'doNum', width:110, editor:'input', formatter:doFormatter},
      {title:'Note', field:'note', minWidth:140, editor:'input'},
      {title:'Last Edit', field:'lastAt', width:90, headerSort:false,
        formatter:lastEditFormatter, cssClass:'cell-lastedit-wrap'},
      {title:'🗑', width:44, hozAlign:'center', headerSort:false, formatter:()=>'✕',
        cssClass:'cell-del', cellClick:(e,cell)=>API.requestDeleteRow(cell.getRow().getData())},
      /* the unified order-id column — last, editable */
      {title:'DO Var', field:'_oid', width:155, editor:'input', formatter:oidFormatter,
        headerTooltip:'Unified Order ID (also the Firebase key). Auto = real DO if available, else a temp DO: <3-letter customer><YYMMDD><seq>, e.g. KNH26060201.'}
    ];
  }

  function rowFmt(row){
    const el = row.getElement();
    el.classList.remove('tp-row-done','tp-row-loading','tp-row-cancel','tp-row-temp','tp-row-future','tr-wg-warn','tr-wg-warn-plate');
    const d  = row.getData();
    const st = getEffectiveStatus(d);
    if(st === 'done')        el.classList.add('tp-row-done');
    else if(st === 'loading') el.classList.add('tp-row-loading');
    else if(st === 'cancel')  el.classList.add('tp-row-cancel');
    /* mark TMP-* rows with an orange edge */
    if(d._oid && isTempOid(d._oid)) el.classList.add('tp-row-temp');
    /* dim rows whose plan date isn't today — these can't be assigned to a
       station; they're either a pre-staged future plan or a stale leftover. */
    const fd = String(d._forDate || '').trim();
    if(fd && fd !== isoToday()) el.classList.add('tp-row-future');
    /* WG cross-check tint — RAM-only, no Firebase read. Plate-diff takes
       precedence over generic warning because it's the highest-severity. */
    try{
      if(typeof WGCHECK !== 'undefined'){
        const lvl = WGCHECK.rowLevel(d);
        if(lvl === 'plate')      el.classList.add('tr-wg-warn-plate');
        else if(lvl === 'any')   el.classList.add('tr-wg-warn');
      }
    }catch(_){}
  }

  function planRows(){
    const q = (document.getElementById(ID + 'Search')||{}).value || '';
    const ql = q.trim().toLowerCase();
    /* Display filter: with NO date chips selected, show every plan date (the
       default). With one or more selected, show only those. Legacy rows without
       _forDate fall back to the module default date. */
    let rows = Object.values(PLAN).filter(r => _dateSel.size === 0 ? true : _dateSel.has(r._forDate || planDate));
    if(ql){
      rows = rows.filter(r=>{
        const hay = (r.plate||'')+(r.driver||'')+(r.customer||'')+
                    (r.doNum||'')+(r.rmooc||'')+(r.no||'')+(r.note||'')+(r._oid||'');
        return hay.toLowerCase().includes(ql);
      });
    }
    /* v4.55.5 — LEDGER VIEW order = paste/Excel-source order (giống TABLE VIEW):
       _forDate → _seq. Ledger vẫn group theo customer (grouping dùng
       first-appearance order trong renderLedger), nên customer hiện theo đúng
       thứ tự được paste, và trong mỗi customer các dòng cũng giữ thứ tự paste.
       Dòng thiếu _seq (legacy / pre-v4.55.4 Firebase) chìm xuống cuối, fallback
       theo "no"; chúng lấy lại thứ tự thật ở lần paste kế tiếp. */
    rows.sort((a,b)=>{
      const da = String(a._forDate||''), db = String(b._forDate||'');
      if(da !== db) return da.localeCompare(db);
      const sa = (typeof a._seq === 'number') ? a._seq : Number.MAX_SAFE_INTEGER;
      const sb = (typeof b._seq === 'number') ? b._seq : Number.MAX_SAFE_INTEGER;
      if(sa !== sb) return sa - sb;
      return (parseInt(a.no,10)||0) - (parseInt(b.no,10)||0);
    });
    return rows;
  }

  /* v4.55.4 — TABLE VIEW order = paste/Excel-source order (NOT customer-grouped,
     NOT user-sortable) so staff can cross-reference against the source sheet
     row-for-row. Ordered by _forDate, then by _seq (the global paste index
     stamped in parsePlanSheet). The old "#" (no) column is per-customer and
     resets to 1 each customer/sub-group, so sorting by it scrambled the order
     across customers — _seq keeps every row exactly where it was pasted.
     Rows without _seq (legacy / pre-v4.55.4 Firebase data) sink to the bottom
     and fall back to no-order; they regain real order on the next paste. */
  function tableRows(){
    const q = (document.getElementById(ID + 'Search')||{}).value || '';
    const ql = q.trim().toLowerCase();
    let rows = Object.values(PLAN).filter(r => _dateSel.size === 0 ? true : _dateSel.has(r._forDate || planDate));
    if(ql){
      rows = rows.filter(r=>{
        const hay = (r.plate||'')+(r.driver||'')+(r.customer||'')+
                    (r.doNum||'')+(r.rmooc||'')+(r.no||'')+(r.note||'')+(r._oid||'');
        return hay.toLowerCase().includes(ql);
      });
    }
    rows.sort((a,b)=>{
      const da = String(a._forDate||''), db = String(b._forDate||'');
      if(da !== db) return da.localeCompare(db);
      const sa = (typeof a._seq === 'number') ? a._seq : Number.MAX_SAFE_INTEGER;
      const sb = (typeof b._seq === 'number') ? b._seq : Number.MAX_SAFE_INTEGER;
      if(sa !== sb) return sa - sb;
      return (parseInt(a.no,10)||0) - (parseInt(b.no,10)||0);
    });
    return rows;
  }

  function buildTable(){
    if(table){ try{ table.destroy(); }catch(_){} table = null; }
    table = new Tabulator('#' + ID + 'Grid', {
      data: tableRows(),
      layout: 'fitDataStretch',
      height: '100%',
      index: '_oid',
      columns: buildColumns(),
      /* v4.54.1 — keep paste/Excel order: no column sorting, no column moving */
      columnDefaults: { headerSort: false },
      movableColumns: false,
      rowFormatter: rowFmt,
      placeholder: 'No ' + UILABEL + ' loaded — click "📋 Paste from Excel" to import',
      clipboard: true,
      clipboardPasteAction: 'replace'
    });
    table.on('cellEdited', cell=>{
      const field = cell.getField();
      const oid   = cell.getRow().getData()._oid;
      const value = cell.getValue();
      editCellField(oid, field, value);
      setTimeout(()=>{ table.getRows().forEach(r=>rowFmt(r)); refreshCounts(); }, 30);
      try{ if(typeof FCHECK!=='undefined') FCHECK.recompute(); }catch(_){}
      /* WGCHECK: re-evaluate this row when a cross-check input field changes.
         Re-render the row so badges/tints/blink reflect the new state. */
      try{
        if(typeof WGCHECK !== 'undefined'
           && /^(plate|rmooc|driver|qty|doNum|customer|note|_status)$/.test(field)){
          const r = PLAN[oid];
          if(r){
            WGCHECK.recheckRow(r);
            const trow = table.getRow(oid);
            if(trow){ trow.reformat(); rowFmt(trow); }
          }
        }
      }catch(_){}
    });
    refreshCounts();
    refreshBadge();
    /* refreshBadge() already calls _refreshDateChips() which rebuilds the
       toolbar date chips from every date present in PLAN. No further setup. */
  }

  function rebuildTableData(){
    if(!table){ buildTable(); renderLedger(); return; }
    /* v4.124 — chế độ TABLE cũng phải đứng yên: replaceData của Tabulator
       thỉnh thoảng trả khung về đầu. Chụp scrollTop của .tabulator-tableholder
       rồi đặt lại ngay sau khi thay dữ liệu (và một lần nữa sau lượt rowFmt,
       vì reformat có thể đổi chiều cao dòng). */
    let _hold = null, _holdTop = 0, _holdLeft = 0;
    try{
      _hold = document.getElementById(PANE) && document.getElementById(PANE).querySelector('.tabulator-tableholder');
      if(_hold){ _holdTop = _hold.scrollTop; _holdLeft = _hold.scrollLeft; }
    }catch(_){}
    try{ table.replaceData(tableRows()); }
    catch(_){ buildTable(); }
    if(_hold && (_holdTop || _holdLeft)){ try{ _hold.scrollTop = _holdTop; _hold.scrollLeft = _holdLeft; }catch(_){} }
    setTimeout(()=>{
      table.getRows().forEach(r=>rowFmt(r));
      if(_hold && (_holdTop || _holdLeft)){ try{ _hold.scrollTop = _holdTop; _hold.scrollLeft = _holdLeft; }catch(_){} }
    }, 30);
    renderLedger();   /* v4.35.0 — keep the Customer Ledger view in sync */
  }

  function refreshCounts(){
    /* Counts mirror the table's date filter: all dates when none selected,
       otherwise only the chosen dates. */
    const all = Object.values(PLAN).filter(r => _dateSel.size === 0 ? true : _dateSel.has(r._forDate || planDate));
    let p=0,e=0,l=0,d=0,c=0;
    all.forEach(r=>{
      switch(getEffectiveStatus(r)){
        case 'entered': e++; break;
        case 'loading': l++; break;
        case 'done':    d++; break;
        case 'cancel':  c++; break;
        default:        p++;
      }
    });
    document.getElementById(ID + 'CntPending').textContent  = p;
    document.getElementById(ID + 'CntEntered').textContent  = e;
    document.getElementById(ID + 'CntLoading').textContent  = l;
    document.getElementById(ID + 'CntDone').textContent     = d;
    document.getElementById(ID + 'CntCancel').textContent   = c;
    document.getElementById(ID + 'CntTotal').textContent    = all.length;
    document.getElementById(ID + 'CntShown').textContent    =
      table ? table.getRows('active').length : all.length;
    /* v4.58 — live counter on the "PTT TODAY" bulk-print buttons (Scale Quick
       Actions + Today Plan toolbar). Only the Today module drives it. */
    if(ID === 'tp' && typeof PTT_EARLY !== 'undefined' && PTT_EARLY.updateTodayBadge){
      try{ PTT_EARLY.updateTodayBadge(); }catch(_){}
    }
  }
  /* Re-render rows when an external module (SCALE, TL) changes state.
     Call without args to refresh everything, or with a specific _oid to refresh one row.
     Pure RAM op — no Firebase reads or writes. */
  function refreshStatus(oid){
    /* v4.59 — do NOT bail out when the Tabulator isn't built yet. The default
       view is the LEDGER; returning early here dropped every SCALE/TL push,
       leaving the ledger stuck on stale status/actual until the operator
       toggled the AUTO box (whose handler calls renderLedger directly). */
    if(table){
      if(oid){
        try{
          const r = table.getRow(oid);
          if(r){ r.reformat(); rowFmt(r); }
        }catch(_){}
      } else {
        try{ table.getRows().forEach(r=>{ r.reformat(); rowFmt(r); }); }catch(_){}
      }
    }
    refreshCounts();
    renderLedger();   /* v4.35.0 — statuses changed (SCALE/TL push) → refresh ledger pills */
    /* v4.109 — nhóm ALT: xe nào vào station trước thì các dòng anh em tự bị
       park. Hàm idempotent, không đổi gì thì không ghi Firebase. */
    try{ lnkSyncAlt(); }catch(e){ console.warn('[PLAN] lnkSyncAlt', e); }
    /* v4.22.4 — bubble up to SCALE row-1 stats: PLAN remaining MT changes
       whenever a row goes DONE / cancel / new assignment. RAM-only. */
    try{ if(typeof SCALE !== 'undefined' && SCALE.refreshRow1) SCALE.refreshRow1(); }catch(_){}
  }
  function refreshBadge(){
    /* Badge shows the total across ALL dates (PLAN size) so the operator can
       see at a glance how many rows are stored in this node — including those
       on a different date than the one currently being viewed. */
    const el = document.getElementById(ID + 'BadgeCount');
    if(el) el.textContent = Object.keys(PLAN).length;
    /* v4.58 — data changed (Firebase push / paste / delete) → refresh the
       "PTT TODAY" button counters too (refreshCounts only runs with a table). */
    if(ID === 'tp' && typeof PTT_EARLY !== 'undefined' && PTT_EARLY.updateTodayBadge){
      try{ PTT_EARLY.updateTodayBadge(); }catch(_){}
    }
    /* Whenever data changes, also rebuild the toolbar date chips so they
       always reflect the actual set of dates present in PLAN. */
    _refreshDateChips();
  }
  /* Rebuild the toolbar's Plan-Date CHIPS from PLAN's actual data. One chip per
     distinct _forDate (with row count), plus an ALL chip. A chip is highlighted
     when its date is in _dateSel; ALL is highlighted when nothing is selected
     (= every date shown). Pure RAM — no Firebase. */
  function _refreshDateChips(){
    const host = document.getElementById(ID + 'PlanDateChips');
    if(!host) return;
    const counts = {};
    Object.values(PLAN).forEach(r=>{
      const d = r._forDate || planDate;
      counts[d] = (counts[d]||0) + 1;
    });
    const dates = Object.keys(counts).sort();
    if(!dates.length){ host.innerHTML = '<span class="pl-datechip-empty">No plans yet</span>'; return; }
    const total = Object.keys(PLAN).length;
    const allOn = _dateSel.size === 0;
    let html = '<span class="pl-datechip all'+(allOn?' on':'')+'" onclick="'+ID+'ClearDateSel()" title="Show every plan date">ALL ('+total+')</span>';
    dates.forEach(d=>{
      const on = _dateSel.has(d);
      html += '<span class="pl-datechip'+(on?' on':'')+'" onclick="'+ID+'ToggleDate(\''+d+'\')"'
            + ' title="'+(on?'Click to remove this date from the view':'Click to show this date')+'">'
            + escapeHtml(isoLabel(d)) + ' (' + counts[d] + ')</span>';
    });
    host.innerHTML = html;
  }
  /* Toggle a plan date in/out of the display set. Clicking a selected date again
     removes it; when the set empties, every date shows again. RAM only. */
  function toggleDateSel(iso){
    if(!iso) return;
    if(_dateSel.has(iso)) _dateSel.delete(iso); else _dateSel.add(iso);
    _refreshDateChips();
    rebuildTableData();
    refreshCounts();
  }
  function clearDateSel(){
    _dateSel.clear();
    _refreshDateChips();
    rebuildTableData();
    refreshCounts();
  }
  /* setPlanDate — used by the paste flow to point the module default at the
     just-pasted date (paste seed / temp-oid). It no longer single-filters the
     view; instead it clears the date selection so the freshly pasted plan is
     visible among all dates. RAM only. */
  function setPlanDate(iso){
    if(iso) planDate = iso;
    _dateSel.clear();
    _refreshDateChips();
    rebuildTableData();
    refreshCounts();
    refreshBadge();
  }

  /* -------- Paste flow -------- */
  /* The paste modal's date picker seeds from the toolbar's current planDate
     (so user's view selection carries into the paste). Both TP and TMR allow
     the user to pick any date — responsibility is on the operator to pick the
     correct day. Station-assign gating still refuses non-today rows. */
  function openPaste(){
    const dateInp = document.getElementById(ID + 'PasteDate');
    if(dateInp){
      dateInp.value = planDate || opts.defaultDate();
      dateInp.disabled = false;
      /* TMR keeps a sensible min (strictly future) so operators don't
         accidentally paste a today-date row into the future-drafts node. */
      if(opts.minFuture){
        dateInp.min = _addDaysIso(isoToday(), 1);
      } else {
        dateInp.removeAttribute('min');
      }
    }
    document.getElementById(ID + 'PasteModal').classList.add('on');
    /* Always open empty — pasted data is never retained between sessions. */
    const ta = document.getElementById(ID + 'PasteArea');
    if(ta) ta.value = '';
    setTimeout(()=>document.getElementById(ID + 'PasteArea').focus(), 50);
  }
  function closePaste(){
    document.getElementById(ID + 'PasteModal').classList.remove('on');
    /* Discard whatever was pasted — leaving on exit must not keep stale text,
       so the next open starts from a clean empty state. */
    const ta = document.getElementById(ID + 'PasteArea');
    if(ta) ta.value = '';
  }
  /* v4.49.3 — Missing-"No" confirmation overlay (RAM-only, no Firebase).
     Built in JS so it inherits factory scope (ID / escapeHtml / toast). Shown
     when a paste contains vehicle rows (plate/rmooc/driver/DO present) whose
     "No" column is blank — these would otherwise be silently dropped or, worse,
     mistaken for the grand-total line and halt parsing. */
  function showPlanSkipOverlay(skips, cb){
    cb = cb || {};
    if(!document.getElementById('pskStyle')){
      const st = document.createElement('style');
      st.id = 'pskStyle';
      st.textContent = `
        #planSkipOverlay{position:fixed;inset:0;z-index:100000;display:flex;
          align-items:center;justify-content:center;background:rgba(15,23,42,.55);}
        #planSkipOverlay .psk-card{background:#fff;border-radius:14px;width:min(680px,94vw);
          max-height:86vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.35);
          font-family:Barlow,system-ui,sans-serif;overflow:hidden;}
        #planSkipOverlay .psk-head{padding:18px 22px 12px;border-bottom:1px solid #eef0f3;}
        #planSkipOverlay .psk-title{font-size:17px;font-weight:800;color:#b45309;margin:0;}
        #planSkipOverlay .psk-sub{font-size:12.5px;color:#475569;margin:6px 0 0;line-height:1.45;}
        #planSkipOverlay .psk-body{padding:6px 22px;overflow:auto;}
        #planSkipOverlay .psk-row{display:flex;gap:10px;align-items:baseline;
          padding:8px 0;border-bottom:1px dashed #eef0f3;font-size:13px;}
        #planSkipOverlay .psk-no{flex:0 0 auto;min-width:30px;height:22px;padding:0 7px;border-radius:6px;
          background:#fde68a;color:#92400e;font-weight:800;font-size:12px;display:inline-flex;
          align-items:center;justify-content:center;}
        #planSkipOverlay .psk-info{color:#1e293b;}
        #planSkipOverlay .psk-info .psk-dim{color:#94a3b8;}
        #planSkipOverlay .psk-foot{padding:14px 22px;border-top:1px solid #eef0f3;display:flex;
          gap:10px;justify-content:flex-end;}
        #planSkipOverlay .psk-btn{border:0;border-radius:9px;padding:9px 16px;font-size:13.5px;
          font-weight:700;cursor:pointer;font-family:inherit;}
        #planSkipOverlay .psk-cancel{background:#f1f5f9;color:#334155;}
        #planSkipOverlay .psk-cancel:hover{background:#e2e8f0;}
        #planSkipOverlay .psk-include{background:#2563eb;color:#fff;}
        #planSkipOverlay .psk-include:hover{background:#1d4ed8;}
      `;
      document.head.appendChild(st);
    }
    const prev = document.getElementById('planSkipOverlay');
    if(prev) prev.remove();

    const ov = document.createElement('div');
    ov.id = 'planSkipOverlay';
    const rowsHtml = skips.map(s=>{
      const bits = [];
      if(s.customer) bits.push(escapeHtml(s.customer));
      if(s.plate)    bits.push(escapeHtml(s.plate));
      if(s.rmooc)    bits.push(escapeHtml(s.rmooc));
      if(s.driver)   bits.push(escapeHtml(s.driver));
      if(s.doNum)    bits.push('DO ' + escapeHtml(s.doNum));
      if(s.qty)      bits.push('Qty ' + escapeHtml(s.qty));
      const detail = bits.length ? bits.join(' <span class="psk-dim">·</span> ') : '<span class="psk-dim">(no other data)</span>';
      return `<div class="psk-row"><span class="psk-no">${escapeHtml(String(s.suggestedNo))}</span>`
           + `<span class="psk-info">${detail}</span></div>`;
    }).join('');
    ov.innerHTML = `
      <div class="psk-card" role="dialog" aria-modal="true">
        <div class="psk-head">
          <p class="psk-title">⚠ ${skips.length} row(s) missing a "No" value</p>
          <p class="psk-sub">These rows have real vehicle data but a blank <b>No</b> column, so they were left out.
            You can auto-number them with the suggested No shown on the left and include them, or cancel and fix the sheet.</p>
        </div>
        <div class="psk-body">${rowsHtml}</div>
        <div class="psk-foot">
          <button class="psk-btn psk-cancel" id="pskCancelBtn">Cancel (fix sheet)</button>
          <button class="psk-btn psk-include" id="pskIncludeBtn">Auto-number &amp; include</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const close = ()=>{ ov.remove(); };
    ov.querySelector('#pskCancelBtn').addEventListener('click', ()=>{ close(); if(cb.onCancel) cb.onCancel(); });
    ov.querySelector('#pskIncludeBtn').addEventListener('click', ()=>{ close(); if(cb.onInclude) cb.onInclude(); });
  }

  function submitPaste(){
    const txt = document.getElementById(ID + 'PasteArea').value;
    if(!txt.trim()){ toast('Nothing to paste','er'); return; }
    /* Read the user-chosen date from the picker. TMR rejects same-day/past
       dates to keep the future-drafts semantics clean.
       v4.41.0 — Today Plan is ALWAYS today's sales plan (V406 parity): the
       date picker is hidden and the paste date is forced to today regardless
       of the toolbar. TMR keeps its future-date picker. */
    const dateInp = document.getElementById(ID + 'PasteDate');
    const pickedDate = (opts.kind === 'today')
      ? isoToday()
      : ((dateInp && dateInp.value) || planDate);
    if(opts.minFuture && pickedDate <= isoToday()){
      toast('Tomorrow Plan must use a date AFTER today. Use Today Plan for today\'s rows.','er'); return;
    }
    const rows = parseTSV(txt);
    const parsed = parsePlanSheet(rows);
    if(!parsed.rows.length && !parsed.skipped.length){
      toast('No valid plan rows detected','er'); return;
    }
    /* Closure holding the original flow: close paste modal, stage the pending
       paste, and open the Replace/Update choice modal. Called either directly
       (no skips) or after the user resolves the missing-No overlay. */
    const proceed = (finalRows)=>{
      if(!finalRows.length){ toast('No valid plan rows detected','er'); return; }
      closePaste();
      _pendingPaste = { rows: finalRows, forDate: pickedDate, total: parsed.total };
      _pasteDateForBatch = pickedDate;
      /* show choice modal */
      document.getElementById(ID + 'PchoiceCount').textContent    = finalRows.length;
      document.getElementById(ID + 'PchoiceOldCount').textContent =
        Object.values(PLAN).filter(r => (r._forDate||planDate) === pickedDate).length;
      document.getElementById(ID + 'PchoiceModal').classList.add('on');
    };

    if(parsed.skipped.length){
      /* Some rows carried real vehicle data but had a blank "No" column.
         Ask the user before silently dropping them (RAM-only, no Firebase). */
      showPlanSkipOverlay(parsed.skipped, {
        onInclude: ()=>{
          /* Write the suggested sequential No back into the raw TSV and re-parse
             so fill-down + sub-group context apply correctly to recovered rows. */
          parsed.skipped.forEach(s => { if(rows[s.rowIdx]) rows[s.rowIdx][3] = String(s.suggestedNo); });
          const re = parsePlanSheet(rows);
          proceed(re.rows);
        },
        onCancel: ()=>{
          /* Leave the paste modal open so the user can fix the sheet and retry. */
          toast('Add a No to those rows, then paste again','warn');
        }
      });
      return;
    }
    proceed(parsed.rows);
  }
  function closeChoice(){
    document.getElementById(ID + 'PchoiceModal').classList.remove('on');
    _pendingPaste = null;
  }
  function runChoice(mode){
    if(!_pendingPaste) return;
    document.getElementById(ID + 'PchoiceModal').classList.remove('on');
    /* ⭐ v4.139 — QUET LAI FIREBASE TRUOC KHI TINH DIFF.
       computeDiff doi chieu bang dan voi PLAN trong RAM. Neu RAM dang thieu /
       cu (may vua mo, vua rot mang, tab ngu lau) thi moi dong deu thanh "them
       moi" va sinh ra ban sao tren Firebase — dung nhu 18 dong trung ngay
       09/09/26. Dan la thao tac ghi de len ca bang, nen phai nhin THAT su
       Firebase truoc, khong duoc tin RAM. */
    toast('Checking Firebase for the latest plan…','ok');
    _resyncNow('before-paste').then(()=>{
      if(!_pendingPaste) return;                   /* người dùng đã đóng giữa chừng */
      if(!_resyncOk){
        toast('Cannot read the current plan from Firebase — paste aborted. Check the connection and try again.','er');
        _pendingPaste = null; return;
      }
      if(mode === 'replace'){
        const diff = computeReplaceWipe(_rowsCopy(), _pendingPaste.forDate);
        _pendingDiff = { diff, mode };
        showDiff(diff, mode);
        return;
      }
      /* v4.140 — LƯỢT MỘT: chỉ để DÒ những cặp mơ hồ (lệch cột No / đổi xe–tài
         xế). Kết quả lượt này bị bỏ đi, nên phải tính trên BẢN SAO các dòng:
         computeDiff có đóng dấu _oid vào chính object dòng dán, dùng lại object
         cũ ở lượt hai sẽ mang theo _oid của lượt một. */
      const amb = [];
      computeDiff(_rowsCopy(), mode, _pendingPaste.forDate, { ambiguous: amb });
      if(amb.length){ _ambOpen(amb, mode); return; }      /* hỏi nhân viên trước */
      _runDiffWith(null, mode);
    });
  }
  function _rowsCopy(){ return (_pendingPaste ? _pendingPaste.rows : []).map(r=>({ ...r })); }
  /* LƯỢT HAI — tính diff thật, mang theo câu trả lời của nhân viên. */
  function _runDiffWith(decisions, mode){
    if(!_pendingPaste) return;
    const diff = _keepQtyFix(computeDiff(_rowsCopy(), mode, _pendingPaste.forDate, { decisions: decisions || null }));
    _pendingDiff = { diff, mode };
    showDiff(diff, mode);
  }

  /* -------- Diff modal -------- */
  function showDiff(diff, mode){
    const modal = document.getElementById(ID + 'DiffModal');
    const title = mode==='replace'
      ? 'Confirm: Replace All (Wipe)'
      : 'Confirm: Update (Smart Diff Sync)';
    document.getElementById(ID + 'DiffTitle').textContent = title;
    document.getElementById(ID + 'DiffSubtitle').textContent =
      `${mode==='replace'?'Wipe + re-upload every row for the plan date.':'Apply only the differences for the plan date (add / change / remove).'} · Plan date: ${isoLabel(_pasteDateForBatch||planDate)}`;

    let html = '';
    /* stats grid */
    html += '<div class="tp-diff-stats">';
    html += `<div class="tp-diff-stat add"><div class="v">${diff.added.length}</div><div class="l">Added</div></div>`;
    html += `<div class="tp-diff-stat rem"><div class="v">${diff.removed.length}</div><div class="l">Removed</div></div>`;
    html += `<div class="tp-diff-stat chg"><div class="v">${diff.changed.length}</div><div class="l">Changed</div></div>`;
    html += `<div class="tp-diff-stat same"><div class="v">${diff.unchanged.length}</div><div class="l">Unchanged</div></div>`;
    html += '</div>';

    /* v4.183 — xe sale ghi Cancel ⇒ tick để chuyển 🚫 Cancelled */
    if(!diff.cx){ diff.cx = _actScan(diff, mode); try{ _autoTickByTotal(diff); }catch(_){} }
    try{ html += _totHtml(diff); }catch(_){}                               /* v4.188 */
    if(diff.cx.length){
      const c = t => diff.cx.filter(x => x.act === t).length;
      html += `<div class="tp-diff-warn" style="background:#fff7e6;border-color:#ffc266;color:#7c2d12">📋 The sales notes ask for <b>${diff.cx.length}</b> action(s)`
            + ` — ${c('cancel')} cancel · ${c('restore')} back to AUTO · ${c('link')} link group(s). You will review them in the next step before anything is saved.</div>`;
    }

    /* v4.139 — dong bi CHAN vi tren bang da co dong y het (chong ghi trung) */
    if(diff.blocked && diff.blocked.length){
      html += `<div class="tp-diff-warn">🛡 ${diff.blocked.length} pasted row(s) are already on the plan and will NOT be written again `
            + `(same date, customer, driver, truck, No, quantity and DO). This is what used to create duplicate rows.</div>`;
    }

    /* danger warning if removing live rows */
    const dangerRemoved = diff.removed.filter(r=>r._status==='loading' || r._status==='done');
    if(dangerRemoved.length){
      html += `<div class="tp-diff-warn">⚠ ${dangerRemoved.length} row(s) currently in <b>loading</b> or <b>done</b> state will be removed. Verify carefully before confirming.</div>`;
    }

    /* cross-date duplicate real-DO warning (Phase 1, v4.19.9).
       Soft warning, not a blocker — user can still confirm because the
       date-suffixed _oid keeps the rows in separate Firebase keys. */
    if(diff.duplicates && diff.duplicates.length){
      const forDateLbl = isoLabel(_pasteDateForBatch || planDate);
      let dupHtml = '';
      dupHtml += `<div class="tp-diff-warn" style="background:#fff7e6;border-color:#ffc266;color:#a04b00">`;
      dupHtml += `⚠ <b>Cross-date duplicate DO detected</b> (${diff.duplicates.length} row${diff.duplicates.length>1?'s':''})<br>`;
      dupHtml += `<span style="font-size:11.5px;line-height:1.55">Principle: <b>1 real DO = 1 order</b>. Valid case: the order was rolled forward from a previous day. `;
      dupHtml += `Confirm to keep <b>both</b> rows (they live in separate Firebase keys thanks to the date suffix), or cancel and delete the old-date row first if you mean to move the order.</span>`;
      dupHtml += `<ul style="margin:8px 0 0 18px;padding:0;font-size:11.5px;line-height:1.6">`;
      diff.duplicates.slice(0,15).forEach(d=>{
        const ex = d.existingRow;
        dupHtml += `<li>DO <b>${escapeHtml(d.newRow.doNum||'?')}</b> on <b>${escapeHtml(forDateLbl)}</b> also exists on <b>${escapeHtml(isoLabel(d.existingDate))}</b> — plate <b>${escapeHtml(ex.plate||'?')}</b>, customer ${escapeHtml(ex.customer||'?')}${ex._status?` <span class="stat-tag" style="background:#fee;color:#a32a1f">${escapeHtml(ex._status)}</span>`:''}</li>`;
      });
      if(diff.duplicates.length > 15){
        dupHtml += `<li style="font-style:italic">…and ${diff.duplicates.length-15} more</li>`;
      }
      dupHtml += `</ul></div>`;
      html += dupHtml;
    }

    /* added */
    if(diff.added.length){
      html += `<div class="tp-diff-section add"><h4><span class="badge">+ NEW</span> ${diff.added.length} row(s) added</h4><div class="tp-diff-list">`;
      diff.added.forEach(r=>{
        html += `<div class="tp-diff-item"><span class="who">${escapeHtml(r.plate||'?')}</span> · ${escapeHtml(r.customer||'?')} · ${escapeHtml(r.driver||'')} <span class="field">DO Var</span> <span class="nv">${escapeHtml(r._oid)}</span></div>`;
      });
      html += '</div></div>';
    }
    /* removed */
    if(diff.removed.length){
      html += `<div class="tp-diff-section rem"><h4><span class="badge">- REMOVE</span> ${diff.removed.length} row(s) removed</h4><div class="tp-diff-list">`;
      diff.removed.forEach(r=>{
        const statTag = r._status ? `<span class="stat-tag" style="background:#fee;color:#a32a1f">${r._status}</span>` : '';
        html += `<div class="tp-diff-item"><span class="who">${escapeHtml(r.plate||'?')}</span> · ${escapeHtml(r.customer||'?')} · ${escapeHtml(r.driver||'')} <span class="field">DO Var</span> <span class="ov">${escapeHtml(r._oid)}</span>${statTag}</div>`;
      });
      html += '</div></div>';
    }
    /* changed */
    if(diff.changed.length){
      html += `<div class="tp-diff-section chg"><h4><span class="badge">~ CHANGED</span> ${diff.changed.length} row(s) with field changes</h4><div class="tp-diff-list">`;
      diff.changed.slice(0,40).forEach(c=>{
        let line = `<div class="tp-diff-item"><span class="who">${escapeHtml(c.new.plate||'?')}</span> · ${escapeHtml(c.new.customer||'?')} `;
        c.diffs.forEach(d=>{
          line += `<span class="field">${escapeHtml(d.field)}</span><span class="ov">${escapeHtml(d.old||'(empty)')}</span><span class="arr">→</span><span class="nv">${escapeHtml(d.new||'(empty)')}</span> `;
        });
        line += '</div>';
        html += line;
      });
      if(diff.changed.length > 40){
        html += `<div class="tp-diff-item" style="font-style:italic;color:var(--ink-3)">…and ${diff.changed.length-40} more row(s)</div>`;
      }
      html += '</div></div>';
    }
    if(!diff.added.length && !diff.removed.length && !diff.changed.length && !(diff.cx||[]).some(x=>x.on)){
      html += '<div class="tp-diff-warn" style="background:var(--green-soft);border-color:#bfe3cc;color:#157a40">✓ No changes detected — paste is identical to the current plan.</div>';
    }
    document.getElementById(ID + 'DiffBody').innerHTML = html;
    modal.classList.add('on');
  }
  function closeDiff(){
    document.getElementById(ID + 'DiffModal').classList.remove('on');
    _pendingDiff = null;
    _pendingPaste = null;
  }
  function confirmDiff(){
    if(!_pendingDiff){ closeDiff(); return; }
    const { diff, mode } = _pendingDiff;
    /* v4.184 — có việc từ ghi chú sale ⇒ BƯỚC DUYỆT trước, chưa ghi gì */
    if(!diff.cx) diff.cx = _actScan(diff, mode);
    if(diff.cx.length && !diff.__reviewed){ _revOpen(); return; }
    const pastedDate = _pasteDateForBatch || planDate;
    const pastedRows = (_pendingPaste && _pendingPaste.rows) ? _pendingPaste.rows.slice() : [];
    /* v4.188 — nhớ tổng của sale để dải Plan cảnh báo nếu lệch */
    _sheetChk = (_pendingPaste && _pendingPaste.total != null && isFinite(_pendingPaste.total)) ? { date:pastedDate, total:_pendingPaste.total, ownQ:{} } : null;
    if(_sheetChk) [].concat(diff.added || [], (diff.changed||[]).map(c => c.new), (diff.unchanged||[]).map(u => u.new)).forEach(r => { if(r && r._oid) _sheetChk.ownQ[r._oid] = _qn(r.__qtyOwn == null ? r.qty : r.__qtyOwn); });
    applyDiff(diff, mode, mode==='replace'?'replace':'update');
    closeDiff();
    if((diff.cx||[]).some(x => x.act === 'link' && x.on)) setTimeout(()=>{ try{ lnkSyncAlt(); renderLedger(); }catch(_){} }, 60);
    try{ if(diff.cx.length && typeof AILOG !== 'undefined') AILOG.paste(UILABEL, pastedDate, mode, diff.cx); }catch(e){ console.warn('[AILOG]', e); }
    try{ const vn = (diff.cx||[]).filter(x => x.act === 'vanish').concat(diff.__cxGone || []); if(vn.length && typeof PLANCX !== 'undefined') PLANCX.record(pastedDate, vn); }catch(e){ console.warn('[PLANCX]', e); }   /* v4.221 — + xe đã huỷ bị gỡ (wc=1) */
    /* v4.183 — kế hoạch đầu ngày (một lần) + sổ ghi chú sale */
    try{ _pdayRecord(pastedDate, 'paste'); }catch(e){ console.warn('[PLANDAY]', e); }
    try{ if(typeof SNOTE !== 'undefined') SNOTE.collect(pastedRows, pastedDate); }catch(e){ console.warn('[SNOTE]', e); }
    /* If the user pasted under a different date than the one currently shown,
       switch the toolbar to that date so the new rows are visible. */
    if(pastedDate !== planDate) setPlanDate(pastedDate);
    /* RAM-only fleet/cert check over the resulting plan — no Firebase reads/writes.
       Pass the local PLAN so a paste into Tomorrow scans plan_tomorrow_ rows
       (not today's). Each row's _forDate already drives the cert checkDate. */
    try{ if(typeof FCHECK !== 'undefined'){ setTimeout(function(){ FCHECK.runPasteCheck(PLAN); }, 200); FCHECK.recompute(); } }catch(_){}
    /* WMS GI cross-check (RAM-only) — sets r._wgWarns and tints rows.
       Run after FCHECK so the toast/overlay order matches V406. */
    try{ if(typeof WGCHECK !== 'undefined'){ WGCHECK.runCheck(PLAN, {toast:true}); setTimeout(function(){ rebuildTableData(); }, 250); } }catch(_){}
    /* v4.38.0 — V406 parity: after the paste applies, prompt for any pasted
       customer that does not resolve to a CUST Short Name, then remember the
       choice (CT.aliasSave) so the Scale→TL push yields the short name. */
    try{
      if(typeof CT!=='undefined' && CT.resolvesShort){
        const unmatched={};
        const scan=r=>{ const c=String((r&&r.customer)||'').trim();
          if(c && !CT.resolvesShort(c)) unmatched[c]=(unmatched[c]||0)+1; };
        (diff.added||[]).forEach(scan);
        (diff.changed||[]).forEach(c=>scan(c.new));
        if(Object.keys(unmatched).length) setTimeout(()=>_custMatchModal(unmatched), 300);
      }
    }catch(_){}
  }

  /* -------- Clear all / Delete row -------- */
  /* If the node holds rows for a single date, the modal still appears but
     shows just that one date pre-checked (one click confirms). If it holds
     multiple dates, the operator picks which dates to wipe via checkboxes. */
  function clearAll(){
    if(!canWrite(PERMK)){ toast('No permission','er'); return; }
    /* v4.139 — Clear All xoa theo DANH SACH TRONG RAM. Neu RAM thieu dong nao
       (may vua mo, vua rot mang) thi dong do song sot tren Firebase va nguoi
       dung tuong da xoa sach. Quet lai truoc khi dung bang chon ngay. */
    _resyncNow('before-clear').then(()=>{
      if(!_resyncOk){ toast('Cannot read the current plan from Firebase — try again in a moment','er'); return; }
      _clearAllModal();
    });
  }
  function _clearAllModal(){
    const n = Object.keys(PLAN).length;
    if(!n){ toast(UILABEL+' is already empty','er'); return; }
    /* Tally rows per _forDate (fallback to module's planDate for legacy rows
       that pre-date this field). */
    const byDate = {};
    Object.values(PLAN).forEach(r=>{
      const d = r._forDate || planDate;
      byDate[d] = (byDate[d]||0) + 1;
    });
    const dates = Object.keys(byDate).sort();
    /* Build modal body */
    document.getElementById('planClearTitle').textContent = '🗑 Clear ' + UILABEL;
    document.getElementById('planClearLead').innerHTML =
      dates.length === 1
        ? 'This node holds <b>' + n + '</b> row(s) on one date. Confirm to wipe.'
        : 'This node holds <b>' + n + '</b> row(s) across <b>' + dates.length + '</b> dates. Tick the dates whose rows should be removed.';
    const listEl = document.getElementById('planClearList');
    listEl.innerHTML = '';
    /* "Select all" master checkbox when multiple dates */
    if(dates.length > 1){
      const allRow = document.createElement('label');
      allRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 9px;background:#fff;border:1.5px solid var(--line);border-radius:6px;font-weight:700';
      allRow.innerHTML = '<input type="checkbox" id="planClearAllChk" onclick="planClearToggleAll(this.checked)"> <span>Select all dates</span>';
      listEl.appendChild(allRow);
    }
    dates.forEach(d=>{
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 9px;background:#fff;border:1px solid var(--line);border-radius:6px;cursor:pointer';
      lbl.innerHTML = '<input type="checkbox" class="planClearDateChk" data-date="'+escapeHtml(d)+'"'
                    + (dates.length===1 ? ' checked' : '') + '> '
                    + '<span style="flex:1">'+escapeHtml(isoLabel(d))+'</span>'
                    + '<span style="color:var(--ink-2);font-size:11.5px">'+byDate[d]+' row(s)</span>';
      listEl.appendChild(lbl);
    });
    /* Stash the owning module so the shared modal can dispatch back */
    window._planClearOwner = API;
    document.getElementById('planClearModal').classList.add('on');
  }
  /* Internal: actually run the wipe for the given dates. One bulk Firebase
     update with all matched keys set to null. */
  function _clearDatesActual(datesToClear){
    if(!FB_DB){ toast('Offline — Firebase not connected','er'); return; }
    if(!datesToClear || !datesToClear.length){ toast('Pick at least one date','er'); return; }
    const setToClear = new Set(datesToClear);
    const payload = {};
    let n = 0;
    const removedOids = [];
    Object.values(PLAN).forEach(r=>{
      const d = r._forDate || planDate;
      if(setToClear.has(d)){
        payload[`${FBN}${r._oid}`] = null;
        removedOids.push(r._oid);
        n++;
      }
    });
    if(!n){ toast('Nothing matched the selected date(s)','er'); return; }
    removedOids.forEach(oid=>delete PLAN[oid]);
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>toast('Cleared '+n+' row(s) in '+UILABEL+' ('+datesToClear.length+' date'+(datesToClear.length>1?'s':'')+')','ok'))
      .catch(e=>{ console.error(e); toast('Clear failed','er'); });
    try{ logAudit(PERMK+':clear_dates', '_bulk_', '_clearAll', n+' rows', datesToClear.join(','), 'clear'); }catch(_){}
    rebuildTableData();
    refreshCounts();
    refreshBadge();
    try{ if(typeof FCHECK!=='undefined') FCHECK.recompute(); }catch(_){}
  }
  /* Pending oid for the shared delete-confirm modal. Local to this closure,
     so TP and TMR each have their own pointer; the modal itself is shared but
     only one instance can hold it open at a time (modal singleton). */
  let _pendingDeleteOid = null;
  function requestDeleteRow(rowData){
    _pendingDeleteOid = rowData._oid;
    const name = rowData.plate || ('row '+(rowData.no||'?'));
    document.getElementById('delConfirmMsg').innerHTML =
      'Delete row <b>"'+escapeHtml(name)+'"</b> (DO Var: '+escapeHtml(rowData._oid)+') from '+UILABEL+'?<br>This cannot be undone.';
    document.getElementById('delConfirmInput').value = '';
    document.getElementById('delConfirmBtn').classList.remove('ready');
    document.getElementById('delConfirmModal').classList.add('on');
    /* Re-target the shared delete button to this instance's handler. Restored to
       Fleet's executeDelete inside executeDeleteRow / cancel paths below. */
    document.getElementById('delConfirmBtn').onclick = executeDeleteRow;
    setTimeout(()=>document.getElementById('delConfirmInput').focus(), 80);
  }
  function executeDeleteRow(){
    if(!_pendingDeleteOid) return;
    if(document.getElementById('delConfirmInput').value.trim().toLowerCase() !== 'confirm'){
      toast('Type "Confirm" to delete','er'); return;
    }
    if(!canWrite(PERMK)){ toast('No permission','er'); return; }
    if(!FB_DB){ toast('Offline','er'); return; }
    const oid = _pendingDeleteOid;
    delete PLAN[oid];
    const payload = {};
    payload[`${FBN}${oid}`] = null;
    bumpVersion(payload);
    _fbUpdate(payload)
      .then(()=>toast('Row deleted','ok'))
      .catch(e=>{ console.error(e); toast('Delete failed','er'); });
    try{ if(table){ const r = table.getRow(oid); if(r) r.delete(); } }catch(_){}
    refreshCounts(); refreshBadge();
    try{ if(typeof FCHECK!=='undefined') FCHECK.recompute(); }catch(_){}
    closeDelConfirm();
    /* Restore Fleet's delete handler so the shared modal works for fleet again. */
    document.getElementById('delConfirmBtn').onclick = executeDelete;
    _pendingDeleteOid = null;
  }

  /* ⛔ v4.231 — ĐÃ GỠ ⬇ Export (CSV) của Today/Tomorrow Plan — user: không cần. */

  /* -------- Public API -------- */
  /* ════════ v4.35.0 — CUSTOMER LEDGER render layer ════════
     Pure RAM view over the SAME PLAN data (per approved mockup): one band
     per customer with MT total / loaded progress / per-order status dots /
     cert flag; orders inside without repeating customer info. The Tabulator
     stays as the editing "Table view"; toggleView switches between them and
     the choice persists in localStorage. NO Firebase reads or writes here. */
  function _ledChipKey(st){ return (st === '' || st === 'entered') ? 'pending' : st; }
  function _ledBay(r){
    /* Which station is loading this order right now (for the LOADING pill). */
    try{
      if(typeof DB_SC === 'undefined' || !DB_SC.stations) return '';
      const oid = String(r._oid||''), doStr = String(r.doNum||'').trim();
      for(const id in DB_SC.stations){
        const s = DB_SC.stations[id];
        if(!s || s.status !== 'loading') continue;
        if(oid && String(s._oid||'') === oid) return id;
        if(doStr && s.doNum && typeof dosOverlap === 'function' && dosOverlap(s.doNum, doStr)) return id;
      }
    }catch(_){}
    return '';
  }
  function _ledDoneTime(r){
    /* Latest TL timeOut among the rows that made this order DONE. */
    try{
      if(typeof TL === 'undefined' || !TL.getIndex) return '';
      const byKey = TL.getIndex().byKey;
      let bestTs = -1, bestT = '';
      [String(r._oid||'').trim(), String(r.doNum||'').trim()].forEach(k=>{
        if(!k) return;
        const m = byKey.get(k);
        if(!m) return;
        m.forEach((q, rid)=>{
          const tr = TL.ROWS[rid];
          if(!tr) return;
          const ts = tr._ts || 0;
          if(ts >= bestTs && tr.timeOut){ bestTs = ts; bestT = String(tr.timeOut); }
        });
      });
      return bestT;
    }catch(_){ return ''; }
  }
  function _ledWarn(r){
    try{
      if(typeof FCHECK === 'undefined' || !FCHECK.orderWarning) return null;
      const cd = (typeof window.parseDate === 'function') ? window.parseDate(r._forDate || planDate) : undefined;
      return FCHECK.orderWarning(r, cd || undefined);
    }catch(_){ return null; }
  }
  function applyView(){
    const pane = document.getElementById(PANE);
    if(!pane) return;
    const tableWrap = pane.querySelector('.tp-table-full');
    const led = document.getElementById(ID + 'Ledger');
    const btn = document.getElementById(ID + 'ViewToggle');
    const ledger = viewMode === 'ledger';
    if(tableWrap) tableWrap.style.display = ledger ? 'none' : '';
    if(led) led.style.display = ledger ? '' : 'none';
    if(btn) btn.textContent = ledger ? '▤ TABLE VIEW' : '▦ LEDGER VIEW';
    if(ledger) renderLedger();
    else if(table){ try{ table.redraw(true); }catch(_){} }
  }
  function toggleView(){
    viewMode = (viewMode === 'ledger') ? 'table' : 'ledger';
    try{ localStorage.setItem('lpg_v4_planview_' + ID, viewMode); }catch(_){}
    applyView();
  }
  function setLedgerFilter(f){ _ledgerFilter = f; renderLedger(); }
  function toggleGroup(key){
    const k = decodeURIComponent(key);
    _grpOpen[k] = !(_grpOpen[k] === undefined ? _grpAutoOpen[k] : _grpOpen[k]);
    renderLedger();
  }
  let _grpAutoOpen = {};   // computed per render: customer → auto open state
  function ledgerEdit(oid){
    /* Edit happens in the Tabulator — switch view, scroll to the row, flash it. */
    if(viewMode !== 'table'){ viewMode = 'table'; try{ localStorage.setItem('lpg_v4_planview_' + ID, viewMode); }catch(_){} applyView(); }
    setTimeout(()=>{
      try{
        const row = table && table.getRow(oid);
        if(row){
          table.scrollToRow(oid, 'center', false);
          const el = row.getElement();
          el.classList.remove('pl-flash'); void el.offsetWidth; el.classList.add('pl-flash');
        }
      }catch(_){}
    }, 60);
  }
  function ledgerDel(oid){
    const r = PLAN[oid];
    if(r) requestDeleteRow(r);
  }
  /* ── Ledger inline editing (parity with the table view) ──────────────
     Commit a single field through the SAME write path as the table, then
     mirror the table's cellEdited side-effects (FCHECK / WGCHECK recompute)
     and re-render. RAM-delta write only. */
  function _ledgerCommit(oid, field, value){
    editCellField(oid, field, value);
    try{ if(typeof FCHECK!=='undefined' && FCHECK.recompute) FCHECK.recompute(); }catch(_){}
    try{
      if(typeof WGCHECK!=='undefined' && WGCHECK.recheckRow
         && /^(plate|rmooc|driver|qty|doNum|customer|note|_status)$/.test(field)){
        const r = PLAN[oid]; if(r) WGCHECK.recheckRow(r);
      }
    }catch(_){}
    rebuildTableData();   /* re-renders table + ledger */
    try{ _ledFlash(oid); }catch(_){}   /* v4.124 */
  }
  /* Click a data cell → swap to an inline input; Enter / blur commit, Esc cancels. */
  function ledgerCellEdit(oid, field, td, ev){
    if(ev){ ev.stopPropagation(); }
    if(!td || td.querySelector('input,select')) return;
    const row = PLAN[oid]; if(!row) return;
    const cur = (row[field]==null ? '' : String(row[field]));
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'pv-inp'; inp.value = cur;
    td.innerHTML = ''; td.appendChild(inp);
    inp.focus(); inp.select();
    let done = false;
    const commit = ()=>{ if(done) return; done = true;
      const v = inp.value.trim();
      if(v !== cur) _ledgerCommit(oid, field, v); else renderLedger(); };
    const cancel = ()=>{ if(done) return; done = true; renderLedger(); };
    inp.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); commit(); }
      else if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cancel(); }
    });
    inp.addEventListener('blur', commit);
  }
  /* Double-click GATE / LOAD → toggle OK ↔ NO. */
  function ledgerToggleGL(oid, field, ev){
    if(ev){ ev.stopPropagation(); }
    const row = PLAN[oid]; if(!row) return;
    const cur = String(row[field]||'') === 'OK' ? 'OK' : 'NO';
    _ledgerCommit(oid, field, cur === 'OK' ? 'NO' : 'OK');
  }
  /* Click STATUS (manual rows only) → inline dropdown of the status options. */
  function ledgerPickStatus(oid, td, ev){
    if(ev){ ev.stopPropagation(); }
    const row = PLAN[oid]; if(!row) return;
    if(!td || td.querySelector('select')) return;
    /* v4.59 — AUTO rows are no longer blocked: the dropdown opens with every
       computed status disabled and only CANCEL selectable (atomic flip to
       MANUAL + cancel via setManualStatus). Manual rows keep full choice. */
    const isAuto = row._autoSync !== false;
    const cur = isAuto ? String(getEffectiveStatus(row)||'') : String(row._status||'');
    const sel = document.createElement('select');
    sel.className = 'pv-statsel';
    STATUS_OPTS.forEach(o=>{
      const op = document.createElement('option');
      op.value = o.val; op.textContent = o.icon + ' ' + o.label;
      if(o.val === cur) op.selected = true;
      if(isAuto && o.val !== 'cancel' && o.val !== cur) op.disabled = true;
      sel.appendChild(op);
    });
    if(isAuto) sel.title = 'Auto-sync ON — only 🚫 Cancelled can be picked here. Uncheck AUTO for full manual control.';
    td.innerHTML = ''; td.appendChild(sel); sel.focus();
    let done = false;
    const commit = ()=>{ if(done) return; done = true;
      const v = sel.value;
      if(v === cur){ renderLedger(); return; }
      if(isAuto){
        if(v === 'cancel') setManualStatus(oid, 'cancel');
        else { toast('Auto-sync ON — only Cancel can be set here','er'); renderLedger(); }
        return;
      }
      _ledgerCommit(oid, '_status', v); };
    sel.addEventListener('change', commit);
    sel.addEventListener('blur', commit);
    sel.addEventListener('keydown', e=>{ if(e.key === 'Escape'){ done = true; e.stopPropagation(); renderLedger(); } });
  }
  /* v4.109 — MỌI số MT trên Ledger + thẻ PLAN tab Scale hiện 3 số thập phân
     (1 chữ số = 100 kg, không đủ để đối chiếu cân). Dùng minimumFractionDigits
     để 25 hiện "25.000" chứ không phải "25" — cột số nhìn thẳng hàng. */
  function _fmtMT(v){
    const n = parseFloat(v);
    if(!isFinite(n)) return '0.000';
    return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  /* ══ v4.124 — ĐỔI TRẠNG THÁI KHÔNG ĐƯỢC LÀM BẢNG NHẢY LÊN ĐẦU ═══════════
     BỆNH: ledger vẽ lại bằng host.innerHTML = h, tức khung cuộn .pv-scroll bị
     THAY MỚI hoàn toàn ⇒ scrollTop về 0. Nhân viên đang làm ở dòng thứ 40,
     bấm đổi trạng thái một cái là màn hình văng lên đầu bảng, phải cuộn lại
     và rất dễ bấm nhầm sang dòng khác.
     CÁCH CHỮA: TRƯỚC khi vẽ, ghi lại DÒNG (data-oid) đang nằm sát mép trên
     khung cuộn cùng khoảng cách của nó tới mép; SAU khi vẽ, tìm lại đúng dòng
     đó và kéo scrollTop sao cho nó về lại đúng chỗ cũ.
     Vì sao neo theo DÒNG chứ không nhớ mỗi con số scrollTop: chiều cao bảng
     có thể đổi giữa hai lần vẽ (dòng bị bộ lọc loại bỏ, thanh chip đếm xuống
     hàng, badge cảnh báo mọc thêm…) — nhớ số thô sẽ lệch. Không tìm thấy dòng
     neo (ví dụ dòng vừa bị lọc mất) thì trả lại scrollTop cũ.
     Giữ cả scrollLeft (bảng rộng, hay đang cuộn ngang), scrollTop của các
     khung cuộn CHA và của cả trang. */
  function _ledScrollSave(){
    const host = document.getElementById(ID + 'Ledger');
    if(!host) return null;
    const anc = [];
    for(let el = host.parentElement; el && el.nodeType === 1; el = el.parentElement){
      if(el.scrollTop > 0 || el.scrollLeft > 0) anc.push({ el:el, t:el.scrollTop, l:el.scrollLeft });
    }
    const st = { sc:null, anc:anc, win:(window.pageYOffset || 0) };
    const sc = host.querySelector('.pv-scroll');
    if(sc){
      st.sc = { top: sc.scrollTop, left: sc.scrollLeft, oid:'', delta:0 };
      const base = sc.getBoundingClientRect().top;
      const rows = sc.querySelectorAll('tr.pv-row[data-oid]');
      for(let i = 0; i < rows.length; i++){
        const d = rows[i].getBoundingClientRect().top - base;
        if(d >= -1){ st.sc.oid = rows[i].getAttribute('data-oid'); st.sc.delta = d; break; }
      }
      /* đã cuộn quá cuối bảng → neo vào dòng cuối cùng */
      if(!st.sc.oid && rows.length){
        const last = rows[rows.length - 1];
        st.sc.oid   = last.getAttribute('data-oid');
        st.sc.delta = last.getBoundingClientRect().top - base;
      }
    }
    return st;
  }
  function _ledScrollRestore(st){
    if(!st) return;
    const host = document.getElementById(ID + 'Ledger');
    if(!host) return;
    const sc = host.querySelector('.pv-scroll');
    if(sc && st.sc){
      sc.scrollLeft = st.sc.left;
      sc.scrollTop  = st.sc.top;                 /* mặc định: y như trước */
      if(st.sc.oid){
        let sel = null;
        try{ sel = 'tr.pv-row[data-oid="' + ((window.CSS && CSS.escape) ? CSS.escape(st.sc.oid) : st.sc.oid) + '"]'; }catch(_){}
        let el = null;
        try{ el = sel ? sc.querySelector(sel) : null; }catch(_){}
        if(el){
          const d = el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
          sc.scrollTop += (d - st.sc.delta);     /* kéo dòng neo về đúng mép cũ */
        }
      }
    }
    st.anc.forEach(a=>{ try{ a.el.scrollTop = a.t; a.el.scrollLeft = a.l; }catch(_){} });
    if(st.win){ try{ window.scrollTo(window.pageXOffset || 0, st.win); }catch(_){} }
  }
  /* v4.124 — nháy vàng dòng vừa sửa. Trước đây bảng nhảy lên đầu nên người
     dùng "biết" là máy đã ăn lệnh; nay bảng đứng yên thì phải có dấu hiệu
     khác, nếu không lại tưởng bấm hụt và bấm thêm lần nữa. Gọi SAU khi vẽ
     lại (renderLedger tự lo), chỉ đụng class nên không tốn Firebase. */
  function _ledFlash(oid){
    if(!oid || viewMode !== 'ledger') return;
    const host = document.getElementById(ID + 'Ledger');
    if(!host) return;
    let el = null;
    try{
      el = host.querySelector('tr.pv-row[data-oid="'
        + ((window.CSS && CSS.escape) ? CSS.escape(String(oid)) : String(oid)) + '"]');
    }catch(_){}
    if(!el) return;
    el.classList.remove('pl-flash');
    void el.offsetWidth;              /* ép trình duyệt chạy lại animation */
    el.classList.add('pl-flash');
  }
  /* Lớp bọc DUY NHẤT: mọi nơi trong app vẫn gọi renderLedger() như cũ, không
     phải sửa ~15 chỗ gọi. Hàm vẽ thật đổi tên thành _renderLedgerRaw. */
  function renderLedger(){
    if(viewMode !== 'ledger') return;
    const st = _ledScrollSave();
    _renderLedgerRaw();
    try{ _ledScrollRestore(st); }catch(e){ console.warn('[PLAN] ledger scroll restore', e); }
  }
  function _renderLedgerRaw(){
    if(viewMode !== 'ledger') return;
    const host = document.getElementById(ID + 'Ledger');
    if(!host) return;
    /* v4.42.0 — V406-style grouped plan table (render-only; same data, same
       handlers, same date logic). TMR is a pre-load plan → no STATUS / ACTUAL
       columns. Status is shown as a read-only badge (computed), not editable. */
    const isTmr = (opts.kind === 'tomorrow');
    const rows = planRows();   // search + date filtered, sorted by paste order (_forDate → _seq)

    const info = rows.map(r=>{
      const st = getEffectiveStatus(r) || '';
      return { r, st, chip: _ledChipKey(st) };
    });
    const cnt = { all: info.length, pending:0, loading:0, done:0, cancel:0 };
    info.forEach(i=>{ if(cnt[i.chip] !== undefined) cnt[i.chip]++; });
    const shown = (_ledgerFilter === 'all') ? info : info.filter(i => i.chip === _ledgerFilter);

    /* v4.59 — Plan/Loaded/Remain theo dõi KẾ HOẠCH SALE: toàn bộ theo cột
       qty (MT). Loaded = Σ qty đơn 'done' + 'loading' (xe đang nạp tạm trừ
       khỏi Remain; về queue thì tự cộng lại). KHÔNG cân thực TL, KHÔNG max
       tole. Remain = Plan − Loaded. Khớp 1:1 với PLAN card tab Scale. */
    /* v4.109 — tổng đi qua lnkTotals: nhóm 🔗 ALT (một trong N xe sẽ vào lấy)
       chỉ được tính MỘT lần, nếu không 1 đơn 25 MT khai 3 xe sẽ thành 75 MT. */
    const _tot = lnkTotals(info.map(i=>i.r));
    const planMT = _tot.planMT, loadedMT = _tot.loadedMT, remainMT = _tot.remainMT;

    const FCH = [['all','ALL'],['pending','PENDING'],['loading','LOADING'],['done','DONE'],['cancel','CANCEL']];
    let h = '<div class="pl-fbar">' + FCH.map(([k,lbl])=>
      '<span class="pl-fchip'+(_ledgerFilter===k?' on':'')+'" onclick="'+G+'.setLedgerFilter(\''+k+'\')">'+lbl+' '+cnt[k]+'</span>'
    ).join('')
      + '<span class="pv-sum">Plan <b>'+_fmtMT(planMT)+'</b> · Loaded <b class="g">'+_fmtMT(loadedMT)+'</b> · Remain <b class="o">'+_fmtMT(remainMT)+'</b> MT'
      + '<span class="pv-sum-cnt">'+_tot.planCnt+' order'+(_tot.planCnt===1?'':'s')
      +   (_tot.tripCnt !== _tot.planCnt ? ' · <span title="🔗 Multi-DO: one truck, one loading — counted as one trip">'+_tot.tripCnt+' truck'+(_tot.tripCnt===1?'':'s')+'</span>' : '')+'</span>'
      + (_tot.altSaved>0
          ? '<span class="pv-sum-alt" title="'+_tot.altSaved+' row(s) belong to a 🔗 ALT group (one order, several possible trucks) and are NOT counted a second time.">🔗 −'+_tot.altSaved+' alt row'+(_tot.altSaved===1?'':'s')+'</span>'
          : '')
      + (function(){                                                         /* v4.188 — so với dòng tổng file sale */
          if(!_sheetChk) return '';
          const dRows = Object.values(PLAN).filter(r => r && !_isJunkRow(r) && (r._forDate || planDate) === _sheetChk.date);
          /* như file sale: plan (ALT một lần) + MT ghi trên chính các dòng đã huỷ */
          const pm = lnkTotals(dRows).planMT + dRows.filter(r => String(getEffectiveStatus(r)||'').toLowerCase() === 'cancel').reduce((a, r) => a + (_sheetChk.ownQ[r._oid] || 0), 0);
          const dd = Math.round((pm - _sheetChk.total) * 1000) / 1000;
          return Math.abs(dd) < 0.0005
            ? '<span class="pv-sum-sheet ok" title="Plan total of '+_sheetChk.date+' = total line of the last pasted sales sheet">✓ sheet '+_fmtMT(_sheetChk.total)+'</span>'
            : '<span class="pv-sum-sheet bad" title="Plan total of '+_sheetChk.date+' ('+_fmtMT(pm)+' MT) differs from the total line of the last pasted sales sheet — check 🔗 links, merged quantities and cancelled rows">⚠ sheet '+_fmtMT(_sheetChk.total)+' (Δ '+(dd > 0 ? '+' : '')+dd.toFixed(3)+')</span>';
        })()
      + '</span>'
      + '</div>';

    if(!shown.length){
      /* v4.138 — RAM-only: truoc khi anh chup dau tien tu Firebase ve, bang RONG
         khong co nghia la "khong co don" — noi ro la dang tai. */
      host.innerHTML = h + (_loaded
        ? '<div class="pv-empty">No orders match the current filter / search.</div>'
        : (_loadErr
            ? '<div class="pv-empty">⚠ Cannot reach Firebase — nothing is shown rather than stale data. Retrying automatically…</div>'
            : '<div class="pv-empty">⏳ Loading from Firebase…</div>'));
      return;
    }

    /* ── v4.54.1 — V406 layout: customers in display order become header rows
       INSIDE one continuous table (no collapsible cards). ── */
    const groups = [];
    const byCust = new Map();
    shown.forEach(i=>{
      const c = (i.r.customer || '—').trim() || '—';
      let g = byCust.get(c);
      if(!g){ g = { cust:c, items:[] }; byCust.set(c, g); groups.push(g); }
      g.items.push(i);
    });

    /* Sub-group colour bands (ported from V406 SG_COLORS / SG_BORDERS): a
       distinct hue per sub-group, cycling per customer. */
    const SG_COLORS = ['rgba(0,200,216,.07)','rgba(255,140,0,.08)','rgba(120,80,255,.09)','rgba(0,220,100,.07)','rgba(255,60,120,.08)','rgba(0,160,255,.08)','rgba(255,220,0,.07)','rgba(180,90,30,.09)'];
    const SG_BORDERS = ['rgba(0,200,216,.35)','rgba(255,140,0,.40)','rgba(120,80,255,.40)','rgba(0,220,100,.35)','rgba(255,60,120,.40)','rgba(0,160,255,.40)','rgba(255,220,0,.35)','rgba(180,90,30,.40)'];
    const sgColorIdx = {}, custSgCount = {};
    shown.forEach(i=>{
      const c = (i.r.customer || '—').trim() || '—';
      const key = c + '||' + i.r._subGroup;
      if(sgColorIdx[key] === undefined){
        if(custSgCount[c] === undefined) custSgCount[c] = 0;
        sgColorIdx[key] = custSgCount[c]++;
      }
    });

    /* One shared header for the whole table; widths in px (V406-style). */
    const colSpec = [['#',42]];
    if(!isTmr) colSpec.push(['AUTO',34]);
    colSpec.push(['DATE',72]);
    if(!isTmr) colSpec.push(['STATUS',122]);
    colSpec.push(['PLATE',100],['RMOOC',84],['DRIVER',130],['QTY (MT)',64],['TOL.',48]);
    if(!isTmr) colSpec.push(['ACTUAL',66]);
    colSpec.push(['GATE',48],['LOAD',48],['DO NO.',108],['NOTE',160],['PRICE',66],['',56]);
    const N = colSpec.length;
    const headCols = '<tr>'+colSpec.map(c=>'<th style="width:'+c[1]+'px">'+c[0]+'</th>').join('')+'</tr>';

    h += '<div class="pv-scroll"><table class="pv-tbl"><thead>'+headCols+'</thead><tbody>';

    groups.forEach(g=>{
      const short = (typeof CT!=='undefined' && CT.lookup) ? CT.lookup(g.cust) : g.cust;
      const hasShort = short && short !== g.cust;
      /* v4.109 — tổng của KHÁCH HÀNG cũng phải thu gọn nhóm ALT, nếu không
         header khách vẫn khai 75 MT trong khi dải tổng phía trên đã đúng 25. */
      const _gTot = lnkTotals(g.items.map(i=>i.r));
      let gQty = _gTot.planMT, gAct = 0;

      let body = '', lastSg = null;
      g.items.forEach((i, idx)=>{
        const r = i.r, st = i.st;
        const q = parseFloat(r.qty) || 0;
        const akg = parseFloat(computeActualFromState(r));
        const actMT = (isFinite(akg) && akg > 0) ? akg/1000 : 0;
        if(st === 'done') gAct += (actMT>0?actMT:q);   /* actual thật — dòng ALT bị park không có cân nên không cộng trùng */

        const oid = String(r._oid||'').replace(/['"\\]/g,'');

        /* STATUS split-button (V406 .sbtn) — today only; TMR is a draft. */
        let stCell = '';
        if(!isTmr){
          let lbl = '—', scls = '';
          if(st === 'entered'){ lbl='🚛 Entered'; scls=' ent'; }
          else if(st === 'loading'){ const bay=_ledBay(r); lbl='⛽ Loading'+(bay?' · '+escapeHtml(bay):''); scls=' load'; }
          else if(st === 'done'){ const t=_ledDoneTime(r); lbl='✅ Completed'+(t?' '+escapeHtml(t):''); scls=' done'; }
          else if(st === 'cancel'){ lbl='🚫 Cancelled'; scls=' cxl'; }
          const autoOnS = r._autoSync !== false;
          const lock = autoOnS ? ' lock' : '';
          const btn = '<span class="pv-stwrap"><span class="pv-sbtn split'+scls+lock+'">'+lbl+'</span><span class="pv-sbtn arrow'+scls+lock+'">▾</span></span>';
          /* v4.59 — AUTO cells are clickable too: the picker opens with only
             🚫 Cancel selectable (computed statuses stay read-only). */
          stCell = autoOnS
            ? '<td class="pv-stc pv-editable" title="Auto-sync ON (computed). Click to CANCEL this order — uncheck AUTO for full manual." onclick="'+G+'.ledgerPickStatus(\''+oid+'\',this,event)">'+btn+'</td>'
            : '<td class="pv-stc pv-editable" title="Click to set status (manual)" onclick="'+G+'.ledgerPickStatus(\''+oid+'\',this,event)">'+btn+'</td>';
        }

        /* DO cell — mirror the table-view doFormatter. */
        const dn = String(r.doNum||'').trim();
        let doH;
        if(isRealDO(dn))        doH = '<span class="pv-do">'+escapeHtml(dn)+'</span>';
        else if(isTempOid(dn))  doH = '<span class="pv-do temp" title="Temp DO — auto-upgrades when WMS GI matches">'+escapeHtml(dn)+'</span>';
        else if(!dn)            doH = '<span class="pv-do none">no DO</span>';
        else                    doH = '<span class="pv-do none" title="No temp DO yet">'+escapeHtml(dn)+'</span>';
        let doBadges = ''; try{ if(typeof WGCHECK!=='undefined' && WGCHECK.badgeHtml) doBadges = WGCHECK.badgeHtml(r) || ''; }catch(_){}
        doBadges += lnkBadgeHtml(r);   /* v4.109 — chip 🔗 ALT / MDO */
        const tolRaw = String(r.tolerance||'').trim();

        /* PLATE cell — WG plate-diff → Fleet-missing → cert blink */
        const plateV = String(r.plate||'').trim();
        let plateH;
        if(!plateV){ plateH = '<span class="pv-cell-empty">—</span>'; }
        else {
          let resolved = false;
          try{ if(typeof WGCHECK!=='undefined' && WGCHECK.plateHasDiff && WGCHECK.plateHasDiff(r)){
            const tip = (r._wgWarns||[]).filter(w=>w.code==='PLATE_DIFF').map(w=>w.msg).join(' · ').replace(/"/g,'&quot;');
            plateH = '<span class="tp-plate-wg-diff" title="'+tip+'">'+escapeHtml(plateV)+'</span>'; resolved = true;
          }}catch(_){}
          if(!resolved){ let missing=false; try{ if(typeof FCHECK!=='undefined' && FCHECK.plateInFleet) missing = !FCHECK.plateInFleet(plateV); }catch(_){}
            if(missing){ plateH = '<span class="fc-plate-missing" title="Plate not found in Fleet — verify">'+escapeHtml(plateV)+'</span>'; resolved = true; } }
          if(!resolved){ try{ if(typeof FCHECK!=='undefined' && FCHECK.cellWarn){ const w=FCHECK.cellWarn(r,'plate'); if(w.blink){ plateH='<span class="tp-cert-blink">'+escapeHtml(plateV)+'</span>'+w.badges; resolved=true; } } }catch(_){} }
          if(!resolved) plateH = escapeHtml(plateV);
        }
        /* RMOOC cell */
        const rmoocV = String(r.rmooc||'').trim();
        let rmoocH = rmoocV ? escapeHtml(rmoocV) : '<span class="pv-cell-empty">—</span>';
        if(rmoocV){ try{ if(typeof FCHECK!=='undefined' && FCHECK.cellWarn){ const w=FCHECK.cellWarn(r,'rmooc'); if(w.blink) rmoocH='<span class="tp-cert-blink">'+escapeHtml(rmoocV)+'</span>'+w.badges; } }catch(_){} }
        /* DRIVER cell */
        const drvV = String(r.driver||'').trim();
        let drvH = drvV ? escapeHtml(drvV) : '<span class="pv-cell-empty">—</span>';
        if(drvV){ try{ if(typeof FCHECK!=='undefined' && FCHECK.cellWarn){ const w=FCHECK.cellWarn(r,'driver'); if(w.blink) drvH='<span class="tp-cert-blink">'+escapeHtml(drvV)+'</span>'+w.badges; } }catch(_){} }

        /* AUTO-sync toggle (today only) */
        const autoOn = r._autoSync !== false;
        const autoH = '<input type="checkbox" class="tp-sync-chk" '+(autoOn?'checked':'')
                    + ' title="'+(autoOn?'Auto-sync ON — uncheck to edit status manually':'Manual (locked) — check to re-enable')+'"'
                    + ' onclick="event.stopPropagation(); '+ID+'ToggleRowSync(\''+oid+'\')">';
        /* DATE cell */
        const fd = String(r._forDate||'').trim();
        let dateH;
        if(!fd)                   dateH = '<span class="tp-fordate-stale">—</span>';
        else if(fd === isoToday())dateH = '<span class="tp-fordate-today">'+escapeHtml(isoLabel(fd))+'</span>';
        else if(fd > isoToday())  dateH = '<span class="tp-fordate-future" title="Future plan — cannot be assigned yet">'+escapeHtml(isoLabel(fd))+'</span>';
        else                      dateH = '<span class="tp-fordate-stale" title="Stale plan from '+escapeHtml(isoLabel(fd))+'">'+escapeHtml(isoLabel(fd))+'</span>';
        /* row-level WG-warning tint */
        let warnCls = '';
        try{ if(typeof WGCHECK!=='undefined' && WGCHECK.rowLevel){ const lvl=WGCHECK.rowLevel(r); if(lvl==='plate') warnCls=' tr-wg-warn-plate'; else if(lvl==='any') warnCls=' tr-wg-warn'; } }catch(_){}

        const noteRaw = String(r.note||'');
        let noteH = '';
        noteH += typeBadgeHtml(r.type);   /* v4.66 — non-50:50 product-type warning */
        if(/8\s*h|trước\s*8|truoc\s*8|before\s*8/i.test(noteRaw)) noteH += '<span class="pv-h8">8H</span>';
        const warn = _ledWarn(r);
        if(warn && warn.hasWarn){ const tip=warn.badges.map(b=>b.text).join(' · '); noteH += '<span class="pv-cw" title="'+escapeHtml(tip)+'">⚠</span>'; }
        noteH += escapeHtml(noteRaw);

        const gateOk = String(r.allowGate||'')==='OK', loadOk = String(r.allowLoad||'')==='OK';
        const gateH = '<span class="pv-gl '+(gateOk?'ok':'no')+'">'+(gateOk?'OK':'NO')+'</span>';
        const loadH = '<span class="pv-gl '+(loadOk?'ok':'no')+'">'+(loadOk?'OK':'NO')+'</span>';

        let priceH = '';
        if(typeof PP!=='undefined' && PP.planLookupPrice){
          const p = PP.planLookupPrice(hasShort?short:g.cust, r.type, '');
          if(typeof p === 'number' && isFinite(p) && p>0) priceH = String(p);
        }

        /* Status tint wins over the sub-group band (V406 rule). */
        const statusCls = (st==='done')?' done':(st==='loading')?' loading':(st==='cancel')?' cancel':(st==='entered')?' entered':'';
        const sgKey = ((r.customer||'—').trim()||'—') + '||' + r._subGroup;
        const colorIdx = (sgColorIdx[sgKey]||0) % SG_COLORS.length;
        /* Thin coloured divider when the sub-group changes within a customer. */
        if(idx > 0 && r._subGroup !== lastSg){
          body += '<tr class="pv-sgdiv"><td colspan="'+N+'" style="background:'+SG_BORDERS[colorIdx]+'"></td></tr>';
        }
        lastSg = r._subGroup;
        const sgStyle = statusCls ? '' : (' style="background-color:'+SG_COLORS[colorIdx]+';border-left:3px solid '+SG_BORDERS[colorIdx]+'"');

        const ec = (field)=>' pv-editable" onclick="'+G+'.ledgerCellEdit(\''+oid+'\',\''+field+'\',this,event)';
        body += '<tr class="pv-row'+statusCls+warnCls+'" data-oid="'+oid+'"'+sgStyle+'>'
          + '<td class="pv-no">'+escapeHtml(String(r.no||idx+1))+'</td>'
          + (isTmr?'':'<td class="pv-autoc">'+autoH+'</td>')
          + '<td class="pv-datec">'+dateH+'</td>'
          + stCell
          + '<td class="pv-plate'+ec('plate')+'" title="Click to edit">'+plateH+'</td>'
          + '<td class="pv-rmooc'+ec('rmooc')+'" title="Click to edit">'+rmoocH+'</td>'
          + '<td class="pv-drv'+ec('driver')+'" title="Click to edit">'+drvH+'</td>'
          + '<td class="pv-num'+ec('qty')+'" title="Click to edit">'+escapeHtml(String(r.qty||'—'))+'</td>'
          + '<td class="pv-num tol'+ec('tolerance')+'" title="Click to edit">'+(tolRaw?escapeHtml(tolRaw):'—')+'</td>'
          + (isTmr?'':'<td class="pv-num act'+(actMT>0?'':' act-empty')+(autoOn?'">':' pv-editable" title="Click to edit actual (manual)" onclick="'+G+'.ledgerCellEdit(\''+oid+'\',\'_actualQty\',this,event)">')+(actMT>0?_fmtMT(actMT):'—')+'</td>')
          + '<td class="pv-c pv-editable" title="Double-click to toggle OK / NO" ondblclick="'+G+'.ledgerToggleGL(\''+oid+'\',\'allowGate\',event)">'+gateH+'</td>'
          + '<td class="pv-c pv-editable" title="Double-click to toggle OK / NO" ondblclick="'+G+'.ledgerToggleGL(\''+oid+'\',\'allowLoad\',event)">'+loadH+'</td>'
          + '<td class="pv-docell'+ec('doNum')+'" title="Click to edit DO">'+doH+doBadges+'</td>'
          + '<td class="pv-note'+ec('note')+'" title="Click to edit">'+(noteH||'—')+'</td>'
          + '<td class="pv-price">'+(priceH||'')+'</td>'
          + '<td class="pv-act"><button class="ed" title="Edit (full form)" onclick="'+G+'.ledgerEdit(\''+oid+'\')">✎</button><button class="de" title="Delete" onclick="'+G+'.ledgerDel(\''+oid+'\')">✕</button></td>'
          + '</tr>';
      });

      /* Customer header row INSIDE the table (V406 .tr-cust). */
      const gName = hasShort
        ? '<b class="pv-gname">'+escapeHtml(short)+'</b><span class="pv-gfull">('+escapeHtml(g.cust)+')</span>'
        : '<b class="pv-gname">'+escapeHtml(g.cust)+'</b><span class="pv-noshort">⚠ NO SHORT</span>';
      /* v4.66 — group type chip: highlight + badge when ANY order in the
         group carries a non-50:50 product type (full C3:C4 ratio range) */
      const gTypeRaw = (g.items[0] && g.items[0].r.type) ? String(g.items[0].r.type) : '';
      const gSpecials = Array.from(new Set(
        g.items.map(it=>prodRatio(it.r.type)).filter(rt=>rt && rt!=='50:50')
      ));
      let typeChip = gTypeRaw ? '<span class="pv-type'+(gSpecials.length?' pv-type-warn':'')+'">'+escapeHtml(gTypeRaw)+'</span>' : '';
      if(gSpecials.length){
        typeChip += '<span class="tp-type-badge" title="Nhóm có đơn hàng product type '+gSpecials.join(', ')
                  + ' — KHÁC hàng phổ thông 50:50. Kiểm tra tank/lot/COQ trước khi cân!">⚠ '+gSpecials.join(' · ')+'</span>';
      }
      const actChip  = (!isTmr && gAct>0) ? '<span class="pv-gact">✅ '+_fmtMT(gAct)+' MT</span>' : '';
      const _cntTxt = (_gTot.altSaved > 0)
        ? (g.items.length + ' rows · ' + _gTot.planCnt + ' order' + (_gTot.planCnt === 1 ? '' : 's'))
        : (g.items.length + ' order' + (g.items.length > 1 ? 's' : ''));
      const cntChip  = '<span class="pv-gmeta" style="font-size:10px;color:#6b8299;margin-left:8px"'
                     + (_gTot.altSaved > 0 ? ' title="Some rows are 🔗 ALT alternates of the same order — only one of them is counted."' : '')
                     + '>'+_cntTxt+'</span>';
      const custCell = gName + typeChip + cntChip + '<span class="pv-gqty">'+_fmtMT(gQty)+' MT</span>' + actChip;

      h += '<tr class="pv-cust"><td colspan="'+N+'">'+custCell+'</td></tr>' + body;
    });
    h += '</tbody></table></div>';
    host.innerHTML = h;
  }
  /* ⛔ v4.231 — ĐÃ GỠ nút 🧹 Duplicates (dedupOpen/Scan/Apply) theo yêu cầu user.
     Chặn dòng trùng lúc dán (v4.139 quét-lại-trước-khi-dán) vẫn giữ. */
  function _hasProgress(r){
    const st = String(r._status||'');
    return st === 'loading' || st === 'done' || !!String(r._actualQty||'').trim();
  }
  /* ════════ v4.140 · HỎI NHÂN VIÊN KHI KHÔNG CHẮC ĐÓ CÓ PHẢI MỘT ĐƠN KHÔNG ════════
     Chỉ hiện khi computeDiff gặp cặp mơ hồ:
       kind 'moved' — trùng khách + xe + tài xế, CHỈ LỆCH cột No (sale chèn dòng
                      vào giữa làm dịch số) ⇒ đơn cũ đổi vị trí, hay chuyến khác?
       kind 'swap'  — trùng khách + No nhưng ĐỔI XE / ĐỔI TÀI XẾ ⇒ vẫn đơn cũ, hay
                      sale thay hẳn đơn khác vào chỗ đó?
     Mặc định chọn "SAME" (đơn cũ, chỉ cập nhật) vì đó là tình huống hay gặp hơn,
     nhưng luôn hiện rõ hai bên để nhân viên nhìn mà quyết. Dòng cũ đang cân dở /
     đã cân xong được tô đỏ cảnh báo: chọn "DIFFERENT" là dòng đó bị XOÁ. */
  let _ambPending = null;     /* { list, choice, mode } */
  function _ambModal(){
    let m = document.getElementById(ID + 'AmbModal');
    if(m) return m;
    m = document.createElement('div');
    m.className = 'tp-diff-modal';
    m.id = ID + 'AmbModal';
    m.innerHTML =
      '<div class="tp-diff-box">'
      + '<div class="tp-diff-hdr"><div><h3>❓ Same order, or a different one?</h3>'
      + '<div class="sub" id="' + ID + 'AmbSub"></div></div>'
      + '<button class="modal-close" onclick="' + G + '.ambCancel()">×</button></div>'
      + '<div class="tp-diff-body" id="' + ID + 'AmbBody"></div>'
      + '<div class="tp-diff-foot">'
      + '<button class="btn" onclick="' + G + '.ambSetAll(\'same\')">All: same order</button>'
      + '<button class="btn" onclick="' + G + '.ambSetAll(\'diff\')">All: different orders</button>'
      + '<span style="flex:1"></span>'
      + '<button class="btn" onclick="' + G + '.ambCancel()">Cancel paste</button>'
      + '<button class="btn btn-green" onclick="' + G + '.ambConfirm()">✓ Continue</button>'
      + '</div></div>';
    document.body.appendChild(m);
    return m;
  }
  function _ambRowHtml(it, i, choice){
    const o = it.old, n = it.neu;
    const fmt = r => escapeHtml(String(r.no||'—')) + ' · ' + escapeHtml(String(r.plate||'—'))
              + ' · ' + escapeHtml(String(r.driver||'—')) + ' · ' + escapeHtml(String(r.qty||'—')) + ' MT'
              + (String(r.doNum||'').trim() ? ' · DO ' + escapeHtml(String(r.doNum)) : '');
    const prog = _hasProgress(o);
    const kindLbl = (it.kind === 'moved')
      ? 'Same truck &amp; driver, different row No (' + escapeHtml(String(o.no||'—')) + ' → ' + escapeHtml(String(n.no||'—')) + ')'
      : 'Same customer &amp; row No, different truck / driver';
    const btn = (val, lbl) =>
      '<button class="btn' + (choice === val ? ' btn-green' : '') + '" style="padding:3px 9px;font-size:11px"'
      + ' onclick="' + G + '.ambSet(' + i + ',\'' + val + '\')">' + lbl + '</button>';
    return '<div class="tp-diff-section' + (prog && choice === 'diff' ? ' rem' : '') + '">'
      + '<h4>' + escapeHtml(String(o.customer || n.customer || '—')) + '<span class="badge" style="background:var(--orange);color:#fff">'
      + (it.kind === 'moved' ? 'ROW No CHANGED' : 'TRUCK / DRIVER CHANGED') + '</span>'
      + '<span style="text-transform:none;font-weight:600;color:var(--ink-3)">' + kindLbl + '</span></h4>'
      + '<div class="tp-diff-list">'
      + '<div class="tp-diff-item"><span class="who">On the plan</span> — ' + fmt(o)
      + ' · <span class="stat-tag" style="background:var(--line-2)">' + escapeHtml(String(o._status || 'pending')) + '</span>'
      + (String(o._actualQty||'').trim() ? ' · loaded ' + escapeHtml(String(o._actualQty)) : '')
      + (String(o._lnkK||'') ? ' · 🔗' : '') + '</div>'
      + '<div class="tp-diff-item"><span class="who">Pasted row</span> — ' + fmt(n) + '</div>'
      + (prog ? '<div class="tp-diff-item" style="color:#b4232c"><b>⚠ This order is already loading / loaded.</b> '
              + 'Marking it as a different order DELETES it together with its weighing state.</div>' : '')
      + '<div class="tp-diff-item">' + btn('same', '✓ Same order (just updated)') + ' '
      + btn('diff', '✚ Different order (keep both)') + '</div>'
      + '</div></div>';
  }
  function _ambRender(){
    if(!_ambPending) return;
    const { list, choice } = _ambPending;
    const nSame = list.filter(it=>choice[it.dkey] === 'same').length;
    document.getElementById(ID + 'AmbSub').textContent =
      list.length + ' row(s) could not be identified with certainty · '
      + nSame + ' marked as the same order · ' + (list.length - nSame) + ' as different';
    document.getElementById(ID + 'AmbBody').innerHTML =
      '<div class="tp-diff-warn">The paste matched these rows on everything except one thing. '
      + 'Sales inserting a line in the middle shifts every row No below it, so a different No does not always mean a different order — '
      + 'and the same No does not always mean the same truck. Confirm each one; the plan is not touched until you press Continue.</div>'
      + list.map((it,i)=>_ambRowHtml(it, i, choice[it.dkey])).join('');
  }
  function _ambOpen(list, mode){
    const choice = {};
    list.forEach(it=>{ choice[it.dkey] = 'same'; });   /* mặc định: đơn cũ, chỉ cập nhật */
    _ambPending = { list, choice, mode };
    _ambModal().classList.add('on');
    _ambRender();
  }
  function ambSet(i, val){
    if(!_ambPending) return;
    const it = _ambPending.list[i];
    if(!it) return;
    _ambPending.choice[it.dkey] = (val === 'diff') ? 'diff' : 'same';
    _ambRender();
  }
  function ambSetAll(val){
    if(!_ambPending) return;
    _ambPending.list.forEach(it=>{ _ambPending.choice[it.dkey] = (val === 'diff') ? 'diff' : 'same'; });
    _ambRender();
  }
  function ambCancel(){
    const m = document.getElementById(ID + 'AmbModal');
    if(m) m.classList.remove('on');
    _ambPending = null;
    _pendingPaste = null;
    toast('Paste cancelled — nothing was written','ok');
  }
  function ambConfirm(){
    if(!_ambPending){ return; }
    const { choice, mode } = _ambPending;
    const m = document.getElementById(ID + 'AmbModal');
    if(m) m.classList.remove('on');
    _ambPending = null;
    _runDiffWith(choice, mode);
  }

  const API = {
    init(){
      /* v4.138 — KHONG nap gi tu localStorage nua. Bang bat dau RONG va hien
         "Loading from Firebase…" cho toi khi anh chup dau tien ve, de con so 0
         khong bao gio bi doc nham la so that. loadCache() chi con nhiem vu xoa
         blob cu con sot lai tren may nguoi dung. */
      loadCache();
      refreshBadge();
      attachFirebase();
      applyView();   /* v4.35.0 — restore the saved Ledger/Table view */
      /* v4.59 — self-healing repaint. Status/Actual are COMPUTED at render
         time (RAM-only); if any push event is ever missed (listener race,
         suppressed echo, tab hidden), the row froze until a manual AUTO
         toggle. A cheap 30s reformat guarantees the view converges to the
         real TL / station state with zero Firebase traffic. */
      setInterval(()=>{ try{ if(!document.hidden) refreshStatus(); }catch(_){} }, 30000);
    },
    buildTable,
    rebuildTableData,
    openPaste, closePaste, submitPaste,
    closeChoice, runChoice,
    closeDiff, confirmDiff,
    clearAll, requestDeleteRow,
    createTempDO, toggleRowSync,
    autoSet, refreshStatus,
    setPlanDate, toggleDateSel, clearDateSel,
    _clearDatesActual,
    findTempOrderByVehicle, findTempOrderStrict, renameOid,
    /* v4.139 — khoa dinh danh (test dung truc tiep) · v4.231 gỡ dedup* */
    _identKey, _isJunkRow,
    /* v4.140 — hộp thoại xác nhận "một đơn hay hai đơn" */
    ambSet, ambSetAll, ambConfirm, ambCancel,
    cxTick, _cxScan, _cxWhy, _cxApply, _parse: parsePlanSheet,   /* v4.183 */
    revTick, revKind, revQty, revBack, revApply, _actScan, _lkScan, _keepQtyFix, _cxText: cxText,   /* v4.184 */
    _vanishScan, _cxGroup,   /* v4.187 */
    _simTotal, _totHtml, _autoTickByTotal, _setPendingTotal(t){ _pendingPaste = Object.assign(_pendingPaste || {}, { total:t }); },   /* v4.188 */
    _revTest(diff){ _pendingDiff = { diff, mode:'replace' }; _revOpen(); return _revEl; },
    _computeDiff: computeDiff,   /* test: kiem dinh luoi chan ghi trung */
    /* v4 — exposed so WMS GI can reuse the SAME plate/driver matchers (handles
       WMS reversed driver name + combined truck/rmooc plate). Logic unchanged. */
    plateMatchAny: _plateMatchAny, driverMatch: _driverMatch,
    /* v4.35.0 — Customer Ledger view */
    toggleView, setLedgerFilter, toggleGroup, ledgerEdit, ledgerDel, renderLedger,
    ledgerCellEdit, ledgerToggleGL, ledgerPickStatus,
    getEffectiveStatus,   /* v4.22.7 — RAM-only status check (TL.ROWS + DB_SC.stations).
                              Used by SCALE.scShowResults to gray out done/cancel orders
                              and by scAssignToStation as a defense-in-depth race guard. */
    /* ── v4.109 — ORDER LINKS (🔗) ─────────────────────────────────
       openLink/closeLink/lnkToggleSel/lnkApply/lnkUnlink : hộp thoại.
       lnkTotals : tổng CÓ HIỂU LINK — SCALE._updateRow1 gọi hàm này để
                   thẻ PLAN và dải tổng của Ledger không bao giờ lệch nhau.
       lnkMembers/lnkKind/lnkIsParked : SCALE đọc để biết nhóm đã link mà
                   gộp thẳng khi assign, khỏi hỏi "load together?". */
    openLink, closeLink, lnkToggleSel, lnkApply, lnkUnlink,
    lnkSetPrint(gid, mode){ const ok = lnkSetPrint(gid, mode); if(ok) setTimeout(_lnkRender, 120); return ok; },
    /* v4.112 — SCALE gọi khi nhân viên cân chọn "bán gộp" ngay lúc assign:
       nhóm 🔗 MULTI-DO được lập / cập nhật ngay trên Today Plan. */
    lnkLinkMdo(oids, mode){ const r = lnkLinkMdo(oids, mode); if(r) setTimeout(_lnkRender, 120); return r; },
    lnkMembers, lnkTotals, lnkCollapse, lnkKind, lnkGid,
    lnkIsLinked, lnkIsParked, lnkBadgeHtml, lnkSyncAlt,
    _pdayAuto, _setLoaded:v => { _loaded = !!v; },   /* v4.204 — test: tự ghi kế hoạch đầu ngày */
    getEffectiveActual,   /* RAM-only ACTUAL loaded (kg) for a row from TL weights.
                              Dùng cho PLAN card donut (SCALE._updateRow1) để LOADED
                              lấy ĐÚNG khối lượng cân thực, không dùng plan qty. */
    /* v4.126 — mở ra để test kiểm chứng được luật sinh thông báo (không dùng ở UI) */
    _saleNotify, _notifDiff, _stampWho, _stampRow,
    get table(){ return table; },
    get PLAN(){ return PLAN; },
    get planDate(){ return planDate; },
    get autoSync(){ return autoSync; },
    set autoSync(v){ autoSync = !!v; }
  };
  return API;
}

/* Instantiate the two PLAN modules.
   - TP   handles \"plan_today_\"    (default load date = today)
   - TMR  handles \"plan_tomorrow_\" (default load date = tomorrow)
   Each gets its own Firebase node, localStorage cache, Tabulator table and
   modal DOM ids. They share zero state at runtime. */
function _isoToday(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function _isoTomorrow(){
  const d = new Date(); d.setDate(d.getDate()+1);
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
const TP = _makePlanModule({
  kind:'today', idPrefix:'tp', fbNode:'plan_today/',
  versionKey:'plan_today_version', lsKey:'lpg_v4_plan_v1',
  permKey:'plan_today', uiLabel:'Today Plan',
  defaultDate: _isoToday,
  minFuture: false       /* Today Plan accepts any date (operator's responsibility) */
});
const TMR = _makePlanModule({
  kind:'tomorrow', idPrefix:'tmr', fbNode:'plan_tomorrow/',
  versionKey:'plan_tomorrow_version', lsKey:'lpg_v4_plan_tmr_v1',
  permKey:'plan_tomorrow', uiLabel:'Tomorrow Plan',
  defaultDate: _isoTomorrow,
  minFuture: true        /* Tomorrow Plan only accepts dates AFTER today */
});

/* ═══════════════════════════════════════════════════════════════════
   v4.183 — PLANDAY · KẾ HOẠCH ĐẦU NGÀY  (Firebase plan_day/<YYYY-MM-DD>/first)
   -------------------------------------------------------------------
   Báo cáo Daily cần "Daily plan" = kế hoạch sale gửi ĐẦU NGÀY, và danh sách
   xe huỷ = xe có trong kế hoạch đầu ngày mà cuối ngày bị huỷ HOẶC bị gỡ khỏi
   plan (sale gửi mail mới không còn dòng đó ⇒ dán Replace là mất dấu).
   Kế hoạch đầu ngày KHÔNG tính lại được sau khi bị sửa ⇒ PHẢI lưu (một lần
   mỗi ngày, ~3 KB, transaction nên hai máy dán cùng lúc cũng chỉ một bản).
   Kế hoạch CUỐI = Today Plan trong RAM lúc làm báo cáo ⇒ KHÔNG lưu.
   Tổng tấn dùng CHUNG TP.lnkTotals (hiểu 🔗 ALT) như dải Plan của Ledger.
   rows[]: o=_oid c=khách t=loại hàng n=No p=xe m=rơ-moóc d=tài xế q=MT
           do=DO thật x=1 nếu đã huỷ ngay lúc chụp nt=ghi chú              */
const PLANDAY = (function(){
  const FB = 'plan_day';
  const C = {};                    /* ngày → bản chụp | null (đã đọc, chưa có) */
  const _db = () => (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
  const _num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const _who = () => { try{ return (CURRENT_USER && (CURRENT_USER.name || CURRENT_USER.email)) || '?'; }catch(_){ return '?'; } };
  const _emit = d => { try{ document.dispatchEvent(new CustomEvent('planday:changed', { detail:d })); }catch(_){} };
  function _pack(r, st){
    const dn = String(r.doNum || '').trim();
    return { o:String(r._oid||''), c:String(r.customer||''), t:String(r.type||''), n:String(r.no||''), p:String(r.plate||''),
             m:String(r.rmooc||''), d:String(r.driver||''), q:_num(r.qty), do:/^\d{7,}$/.test(dn) ? dn : '',
             x:st === 'cancel' ? 1 : 0, nt:String(r.note||'').slice(0, 160),
             g:(String(r._lnkK||'') === 'alt' && r._lnkG) ? String(r._lnkG) : '' };     /* v4.187 — nhóm ALT = 1 chuyến */
  }
  function build(date, rows, stOf, totals, src){
    const t = totals ? totals(rows) : null;
    return { at:Date.now(), by:_who(), src:src || '', date, n:t ? t.planCnt : rows.length,
             mt:Math.round((t ? t.planMT : 0) * 1000) / 1000, rows:rows.map(r => _pack(r, stOf ? stOf(r) : '')) };
  }
  /* ghi MỘT lần — đã có thì thôi (không bao giờ ghi đè kế hoạch đầu ngày) */
  function recordFirst(date, rows, stOf, totals, src, force){
    const db = _db();
    if(!db || !date || !rows || !rows.length) return Promise.resolve(null);
    if(C[date] && !force) return Promise.resolve(C[date]);
    const snap = build(date, rows, stOf, totals, src);
    const ref = db.ref(FB + '/' + date + '/first');
    if(!force && typeof ref.transaction !== 'function') return Promise.resolve(null);
    const p = force ? ref.set(snap).then(() => ({ committed:true, snapshot:{ val:() => snap } }))
                    : ref.transaction(cur => cur ? undefined : snap);
    return p.then(res => {
      C[date] = res.snapshot.val() || null;
      if(res.committed){ try{ logAudit('plan_day:first', date, 'first', '', snap.mt + ' MT · ' + snap.n + ' orders', src); }catch(_){} }
      _emit(date);
      return C[date];
    }).catch(e => { console.warn('[PLANDAY] record', e); return null; });
  }
  /* promote: dòng mang _forDate của chúng ⇒ chụp theo từng ngày */
  function recordPromoted(rows){
    const by = {};
    (rows || []).forEach(r => { const d = String(r._forDate || ''); if(d) (by[d] = by[d] || []).push(r); });
    const st = r => (r._autoSync === false && r._status === 'cancel') ? 'cancel' : '';
    const tot = (typeof TP !== 'undefined' && TP.lnkTotals) ? TP.lnkTotals : null;
    return Promise.all(Object.keys(by).map(d => recordFirst(d, by[d], st, tot, 'promote')));
  }
  /* ghi TAY từ Today Plan hiện tại (khi ngày đó chưa có, hoặc admin chụp lại) */
  function recordNow(date, force){
    if(typeof TP === 'undefined') return Promise.resolve(null);
    const rows = Object.values(TP.PLAN || {}).filter(r => r && (!TP._isJunkRow || !TP._isJunkRow(r)) && String(r._forDate || date) === date);
    if(!rows.length) return Promise.resolve(null);
    return recordFirst(date, rows, r => String(TP.getEffectiveStatus(r)||'').toLowerCase(), TP.lnkTotals, force ? 'manual (re-record)' : 'manual', !!force);
  }
  function load(date){
    const db = _db();
    if(!db || !date) return Promise.resolve(null);
    if(date in C) return Promise.resolve(C[date]);
    return db.ref(FB + '/' + date + '/first').once('value')
      .then(s => { C[date] = s.val() || null; _emit(date); return C[date]; })
      .catch(e => { console.warn('[PLANDAY] load', e); return null; });
  }
  function get(date){ return C[date]; }       /* undefined = chưa đọc */
  const _pl = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const _cu = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  /* xe có trong kế hoạch đầu ngày mà KHÔNG còn trong kế hoạch cuối (bị gỡ, không ghi cancel)
     v4.221 — withCx: lấy cả dòng ĐÃ HUỶ lúc chụp (x=1) rồi bị gỡ — trước đây bị bỏ, mất khỏi danh sách huỷ */
  function dropped(date, finalRows, withCx){
    const f = C[date]; if(!f || !f.rows) return [];
    const fr = finalRows || [];
    const all = (Array.isArray(f.rows) ? f.rows : Object.values(f.rows)).filter(Boolean);
    const inFinal = x => fr.some(g =>
      (x.o && String(g._oid||'') === x.o) ||
      (x.do && String(g.doNum||'').trim() === x.do) ||
      (x.p && _pl(g.plate) === _pl(x.p) && _cu(g.customer) === _cu(x.c)) ||
      (!x.p && !x.do && _cu(g.customer) === _cu(x.c) && String(g.no||'') === x.n && String(g.type||'') === x.t));
    /* v4.187 — nhóm ALT: còn một xe trong plan cuối ⇒ không tính; mất cả nhóm ⇒ MỘT chuyến */
    const liveG = new Set(all.filter(x => x.g && inFinal(x)).map(x => x.g));
    const seenG = new Set();
    return all.filter(x => {
      if((x.x && !withCx) || inFinal(x)) return false;
      if(x.g){ if(liveG.has(x.g) || seenG.has(x.g)) return false; seenG.add(x.g); x.grpN = all.filter(y => y.g === x.g).length; }
      return true;
    });
  }
  return { recordFirst, recordPromoted, recordNow, load, get, dropped, build, _cache:C };
})();

/* ═══════════════════════════════════════════════════════════════════
   v4.183 — SNOTE · SỔ GHI CHÚ CỦA SALE  (Firebase sale_notes/<khoá mẫu>)
   -------------------------------------------------------------------
   Mỗi lần dán Today/Tomorrow Plan, ghi chú ở cột Note (M) được gom theo MẪU
   (chữ thường, số → #). Mỗi mẫu một bản ghi nhỏ: loại (kinds), số NGÀY gặp,
   ngày đầu/cuối, và tối đa 12 ví dụ đủ ngữ cảnh (khách, loại hàng, xe, DO,
   các dòng cùng ô gộp) để sau này dựng luật xử lý thông minh (vd. một xe hai
   loại hàng — cố định số tấn một loại, GI phần còn lại vào loại kia).
   Chỉ GOM + PHÂN LOẠI THÔ, chưa tự đổi dữ liệu nào (trừ Cancel ở trên).
   ⭐ v4.231 — CHỈ GHI, KHÔNG BAO GIỜ ĐỌC. App không tải node này (kể cả lúc
   dán); gỡ luôn nút 📝 Sale notes. Mỗi lần dán ghi thẳng theo đường dẫn:
     sale_notes/<khoá>/{pat, kinds, ex}        — ghi đè (ex = câu chữ mới nhất)
     sale_notes/<khoá>/days/<ngày> = true      — số ngày gặp = số khoá days
     sale_notes/<khoá>/eg/<ngày>_<biển số>     — ví dụ đủ ngữ cảnh
   Cần phân tích thì admin ⚙ ▸ ⬇ Download JSON rồi đưa file cho Claude đọc.
   (Bản ghi cũ trước v4.231 còn các trường n / first / last — giữ nguyên.)    */
const SNOTE = (function(){
  const FB = 'sale_notes';
  const KINDS = [
    ['cancel',      { test:s => (typeof TP !== 'undefined' && TP._cxText) ? TP._cxText(s) : /\bcancel|hủy|huỷ/i.test(s) }, 'Cancelled — truck will not come'],
    ['split',       null,                                                'One truck, several cargo types / fixed tonnage'],
    ['multi_trip',  /\b(?:1|one|m[oộ]t)\s+(?:of\s+|in\s+|trong\s+(?:c[aá]c\s+)?)?(?:\d+\s+)?(?:drivers?|trucks?|t[aà]i\s*x[eế]|xe)\b.*(?:take|l[aấ]y|will|s[eẽ])|\beither\b|\bone\s+of\b/i, 'Only one of the listed trucks / drivers will take the cargo (🔗 ALT)'],
    ['arrived',     /\barrived\b/i,                                      'Truck has arrived'],
    ['after_load',  /after\s*loading/i,                                  'Load after another truck / later'],
    ['time',        /^\s*\d{1,2}\s*[hH:]\s*\d{0,2}\s*$/,                 'Arrival time'],
    ['arrive_by',   /arrive\s*before|tới trước|toi truoc/i,             'Must arrive before a time'],
    ['priority',    /ưu tiên|uu tien|priority/i,                         'Priority'],
    ['overnight',   /ngủ lại|qua đêm|overnight/i,                        'Truck stays overnight in the plant'],
    ['customs',     /hải quan|customs/i,                                 'Customs clearance'],
    ['photo_print', /chụp hình|in thêm|photo|print/i,                    'Extra photo / extra printed ticket'],
    ['wait_do',     /wait\s*for\s*do|get\s*do\b/i,                       'Waiting for DO'],
    ['wait_sales',  /wait\s*for\s*sales|sales\s*confirm/i,              'Waiting for sales confirmation'],
    ['add_later',   /add\s*later/i,                                      'Truck to be added later'],
    ['add_tl',      /add\s*tl/i,                                         'Truck added'],
    ['change_tl',   /change\s*tl/i,                                      'Truck changed']
  ];
  const TYPE_RE = /(\d{2})\s*:\s*(\d{2})|pure\s*c\s*[34]|propane|butane/gi;
  /* "load 7.5MT 50:50 cargo and 15.5MT 70:30 cargo" · "GI cố định 7.52mt hàng 50:50 (DO: 86801837); còn lại hàng 70:30" */
  function parseSplit(note){
    const s = String(note || '');
    const types = [];
    s.replace(TYPE_RE, (m, a, b, i) => { const t = a ? (+a) + ':' + (+b) : m.replace(/\s+/g, '').toUpperCase(); if(!a || +a + +b === 100) types.push({ t, i }); return m; });
    const distinct = Array.from(new Set(types.map(x => x.t)));
    if(distinct.length < 2 && !/còn lại|con lai|remaining|the rest/i.test(s)) return null;
    const fixed = [];
    s.replace(/(\d+(?:[.,]\d+)?)\s*(?:mt|tấn|tan|ton)\b/gi, (m, v, i) => {
      const nx = types.find(x => x.i > i && x.i - i < 40);
      fixed.push({ mt:parseFloat(v.replace(',', '.')), type:nx ? nx.t : '' });
      return m;
    });
    const rm = s.match(/(?:còn lại|con lai|remaining|the rest)[^0-9]{0,20}((\d{2})\s*:\s*(\d{2}))/i);
    const dos = (s.match(/\b\d{8,}\b/g) || []);
    if(!fixed.length && !rm) return null;
    return { fixed, rest:rm ? (+rm[2]) + ':' + (+rm[3]) : '', types:distinct, dos };
  }
  function classify(note){
    const s = String(note || '');
    const k = [];
    KINDS.forEach(([id, re]) => { if(id === 'split' ? !!parseSplit(s) : re.test(s)) k.push(id); });
    return k.length ? k : ['other'];
  }
  function pattern(note){ return String(note || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/\d+([.,]\d+)?/g, '#'); }
  function keyOf(pat){ let h = 5381; for(let i = 0; i < pat.length; i++) h = ((h << 5) + h + pat.charCodeAt(i)) >>> 0; return 'n' + h.toString(36); }
  const _db = () => (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
  /* rows = dòng vừa dán (parsePlanSheet), theo thứ tự trong file. Gom khối ô gộp. */
  function blocks(rows){
    const out = [];
    let cur = null;
    (rows || []).forEach(r => {
      const own = String(r.__noteOwn || '').trim();
      if(own){ cur = { note:own, rows:[r] }; out.push(cur); return; }
      if(cur && String(r.note || '').trim() === cur.note && r.customer === cur.rows[0].customer) cur.rows.push(r);
      else cur = null;
    });
    return out;
  }
  function collect(rows, date){
    const db = _db(); if(!db || !date) return Promise.resolve(0);
    const bl = blocks(rows); if(!bl.length) return Promise.resolve(0);
    const payload = {};
    bl.forEach(b => {
      const pat = pattern(b.note), key = keyOf(pat), kinds = classify(b.note);
      const r0 = b.rows[0], egk = date + '_' + (String(r0.plate || r0.no || 'x').replace(/[^A-Za-z0-9]/g, '') || 'x');
      const eg = { d:date, c:String(r0.customer||''), t:String(r0.type||''), note:b.note,
                   rows:b.rows.slice(0, 4).map(r => ({ no:String(r.no||''), p:String(r.plate||''), do:String(r.doNum||''), t:String(r.type||''), q:String(r.qty||'') })) };
      const px = kinds.indexOf('split') >= 0 ? parseSplit(b.note) : null;
      if(px) eg.px = px;
      const P = FB + '/' + key + '/';
      payload[P + 'pat'] = pat; payload[P + 'kinds'] = kinds.join(','); payload[P + 'ex'] = b.note;
      payload[P + 'days/' + date] = true;
      payload[P + 'eg/' + egk] = eg;
    });
    return db.ref().update(payload).then(() => bl.length).catch(e => { console.warn('[SNOTE] write', e); return 0; });
  }
  return { collect, classify, parseSplit, pattern, keyOf, blocks, KINDS };
})();

/* ═══════════════════════════════════════════════════════════════════
   v4.187 — PLANCX · XE BIẾN MẤT KHỎI TODAY PLAN ĐÃ XÁC NHẬN  (Firebase plan_cx/<ngày>/<push>)
   -------------------------------------------------------------------
   Ghi lúc dán Today Plan (bước 📋 duyệt): cx=1 ⇒ tính là chuyến huỷ, cx=0 ⇒ người dùng
   nói KHÔNG phải huỷ (vd. đổi xe). KHÔNG listener — chỉ máy làm báo cáo / gửi email P2
   đọc (load) khi cần. Dọn: email P2 đã gửi (mail) VÀ file Daily đã xuất (rpt) ⇒ xoá ngày
   đó; ngày cũ hơn 3 ngày tự xoá khi có máy đọc.                                         */
const PLANCX = (function(){
  const FB = 'plan_cx';
  const C = {};                                   /* ngày → [bản ghi] (đã đọc) */
  const _db = () => (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
  const _who = () => { try{ return (CURRENT_USER && (CURRENT_USER.name || CURRENT_USER.email)) || '?'; }catch(_){ return '?'; } };
  const _iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  function record(date, items){
    const db = _db(); if(!db || !date || !items || !items.length) return Promise.resolve(0);
    const payload = {}, now = Date.now();
    items.forEach(x => {
      const r0 = x.rows[0] || {};
      const key = db.ref(FB + '/' + date).push().key;
      const rec = { at:now, by:_who(), cx:x.on ? 1 : 0, wc:x.wasCx ? 1 : 0, trips:1, n:x.rows.length, why:String(x.why||''), repl:String(x.replacedBy||''),
                    c:r0.cust||'', p:x.rows.map(r => r.plate).filter(Boolean).join(' / '), m:r0.rmooc||'', d:x.rows.map(r => r.driver).filter(Boolean).join(' / '),
                    q:parseFloat(String(r0.qtyOwn || r0.qty || '').replace(/,/g,'')) || 0, t:r0.type||'', no:r0.no||'', do:r0.doNum||'', nt:r0.noteOwn || r0.note || '',
                    oids:(x.oids || [x.oid]).join(',') };
      payload[FB + '/' + date + '/' + key] = rec;
      if(C[date]) C[date].push(rec);
    });
    return db.ref().update(payload).then(() => items.length).catch(e => { console.warn('[PLANCX] write', e); return 0; });
  }
  function load(date, force){
    const db = _db(); if(!db || !date) return Promise.resolve([]);
    if(!force && C[date]) return Promise.resolve(C[date]);
    return db.ref(FB + '/' + date).once('value').then(s => {
      const v = s.val() || {};
      C[date] = Object.keys(v).filter(k => k !== '_used' && v[k] && typeof v[k] === 'object').map(k => Object.assign({ key:k }, v[k]));
      C[date]._used = v._used || {};
      try{ _purgeOld(db); }catch(_){}
      try{ document.dispatchEvent(new CustomEvent('plancx:changed', { detail:date })); }catch(_){}
      return C[date];
    }).catch(e => { console.warn('[PLANCX] load', e); return C[date] || []; });
  }
  let _purged = false;
  function _purgeOld(db){
    if(_purged) return; _purged = true;
    const cut = new Date(); cut.setDate(cut.getDate() - 3);
    db.ref(FB).orderByKey().endAt(_iso(cut)).limitToFirst(30).once('value')
      .then(s => { const v = s.val() || {}; const p = {}; Object.keys(v).forEach(k => { p[FB + '/' + k] = null; }); if(Object.keys(p).length) return db.ref().update(p); })
      .catch(() => {});
  }
  function get(date){ return C[date]; }
  /* what = 'mail' | 'rpt' — cả hai đã xong ⇒ xoá dữ liệu ngày đó */
  function markUsed(date, what){
    const db = _db(); if(!db || !date) return Promise.resolve(false);
    const u = Object.assign({}, (C[date] && C[date]._used) || {}); u[what] = Date.now();
    if(u.mail && u.rpt){ delete C[date]; return db.ref(FB + '/' + date).remove().then(() => true).catch(() => false); }
    if(C[date]) C[date]._used = u;
    return db.ref(FB + '/' + date + '/_used/' + what).set(u[what]).then(() => false).catch(() => false);
  }
  return { record, load, get, markUsed, FB, _cache:C };
})();

/* ═══════════════════════════════════════════════════════════════════
   v4.184 — AILOG · SỔ QUYẾT ĐỊNH CỦA NGƯỜI DÙNG  (Firebase ai_log/<push>)
   -------------------------------------------------------------------
   Mỗi lần dán có đề xuất từ ghi chú sale: một bản ghi gồm từng đề xuất
   (loại, lý do, dòng, MT…) + người dùng NHẬN / BỎ / SỬA gì. CHỈ GHI — app
   không bao giờ đọc lại (Spark). Admin: ⚙ ▸ tải JSON đưa Claude phân tích,
   hoặc xoá sạch khi không cần nữa.                                          */
const AILOG = (function(){
  const FB = 'ai_log';
  const _db = () => (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
  const _who = () => { try{ return (CURRENT_USER && (CURRENT_USER.name || CURRENT_USER.email)) || '?'; }catch(_){ return '?'; } };
  const _role = () => { try{ return (CURRENT_USER && CURRENT_USER.role) || ''; }catch(_){ return ''; } };
  function paste(area, date, mode, items){
    const db = _db(); if(!db || !items || !items.length) return Promise.resolve(null);
    const it = items.map(x => {
      const o = { act:x.act, decision:x.on ? 'accepted' : 'rejected', why:String(x.why||''), rows:x.rows || [] };
      if(x.act === 'link'){
        o.kind = x.kind; o.sugKind = x.sugKind; o.src = x.src; o.total = x.total || 0; o.note = x.note || '';
        o.sugOn = !!x.sugOn; o.kindChanged = x.kind !== x.sugKind;
        if(x.kind === 'mdo'){ o.qty = x.mdoQ || {}; o.sugQty = x.sugQ || {}; o.qtyEdited = JSON.stringify(x.mdoQ||{}) !== JSON.stringify(x.sugQ||{}); }
        if(x.px) o.px = x.px;
      } else { o.sugOn = x.sugOn !== false; o.busy = !!x.busy; }
      o.userChanged = (o.sugOn !== !!x.on) || !!o.kindChanged || !!o.qtyEdited;
      return o;
    });
    const rec = { at:Date.now(), by:_who(), role:_role(), kind:'paste', area:String(area||''), date:String(date||''), mode:String(mode||''),
                  n:it.length, accepted:it.filter(x => x.decision === 'accepted').length, items:JSON.parse(JSON.stringify(it)) };
    return db.ref(FB).push(rec).then(() => true).catch(e => { console.warn('[AILOG] write', e); return false; });
  }
  function _dl(name, obj){
    const b = new Blob([JSON.stringify(obj, null, 1)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const _stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()); };
  /* chỉ admin — đọc node MỘT lần khi bấm tải */
  function download(node){
    const db = _db(); if(!db) return Promise.resolve(0);
    return db.ref(node).once('value').then(s => { const v = s.val() || {}; _dl(node + '_' + _stamp() + '.json', v); return Object.keys(v).length; });
  }
  function clear(node){ const db = _db(); if(!db) return Promise.reject(new Error('offline')); return db.ref(node).remove(); }
  return { paste, download, clear, FB };
})();

/* v4.184 — ⚙ ADMIN SETTINGS (nút ⚙ trên thanh điều hướng) — chỉ admin mở được */
const ADMSET = (function(){
  let _el = null;
  const isAdmin = () => { try{ return String((CURRENT_USER || {}).role || '') === 'admin'; }catch(_){ return false; } };
  const NODES = [
    ['ai_log',     '🧠 Sale-note decisions', 'Every suggestion made from sales notes at paste time (cancel, alternate trucks, multi-DO) and what the user accepted, rejected or edited. Write-only — the app never reads it back.'],
    ['plan_cx',    '🕳 Trucks missing from Today Plan', 'Confirmed at Today Plan paste (counted as cancelled trips in the Daily report). Cleared automatically after the P2 mail is sent AND the Daily file is exported, or after 3 days.'],
    ['sale_notes', '📝 Sale notes log',      'Sales notes (column M) grouped by pattern, with examples. Written at every plan paste; the app never reads it back — download the JSON here to analyse.']
  ];
  function open(){
    if(!isAdmin()){ try{ toast('⚙ Settings — administrators only', 'er'); }catch(_){} return; }
    if(!_el){
      _el = document.createElement('div'); _el.className = 'nr-ov';
      _el.innerHTML = '<div class="nr-box" style="width:min(640px,94vw)"><div class="nr-hd"><b>⚙ Admin settings</b><span style="flex:1"></span><button class="btn" onclick="ADMSET.close()">✕</button></div><div class="nr-bd" id="admBody"></div></div>';
      document.body.appendChild(_el);
      _el.addEventListener('mousedown', e => { if(e.target === _el) close(); });
    }
    document.getElementById('admBody').innerHTML = NODES.map(([k, t, d]) =>
      '<div class="adm-sec"><b>'+t+'</b> <code>'+k+'</code><div class="nr-cap">'+d+'</div>'+
      '<button class="btn" onclick="ADMSET.dl(\''+k+'\')">⬇ Download JSON</button> '+
      '<button class="btn" style="color:#b91c1c;border-color:#fecaca" onclick="ADMSET.del(\''+k+'\')">🗑 Delete all</button></div>').join('');
    _el.classList.add('on');
  }
  function close(){ if(_el) _el.classList.remove('on'); }
  function dl(k){
    if(!isAdmin()) return;
    AILOG.download(k).then(n => toast('⬇ ' + k + ': ' + n + ' record(s) downloaded', 'ok')).catch(e => toast('Download failed: ' + e.message, 'er'));
  }
  function del(k){
    if(!isAdmin()) return;
    if(!confirm('Delete ALL data in "' + k + '"?\n\nDownload it first if you may need it — this cannot be undone.')) return;
    if(!confirm('Really delete every record of "' + k + '"?')) return;
    AILOG.clear(k).then(() => { toast('🗑 ' + k + ' cleared', 'ok'); })
      .catch(e => toast('Delete failed: ' + e.message, 'er'));
  }
  return { open, close, dl, del, isAdmin };
})();

/* Tabulator-level shims used by Today Plan (mirrors fleet helpers) */
function tpOpenPaste(){ TP.openPaste(); }
function tpClosePaste(){ TP.closePaste(); }
function tpSubmitPaste(){ TP.submitPaste(); }
function tpCloseChoice(){ TP.closeChoice(); }
function tpRunChoice(m){ TP.runChoice(m); }
function tpCloseDiff(){ TP.closeDiff(); }
function tpConfirmDiff(){ TP.confirmDiff(); }
function tpClearAll(){ TP.clearAll(); }
function tpRequestDeleteRow(r){ TP.requestDeleteRow(r); }
function tpCreateTemp(){ TP.createTempDO(); }
/* v4.109 — 🔗 LINK ORDERS (Today Plan) */
function tpOpenLink(){ TP.openLink(); }
function tpToggleRowSync(oid){ TP.toggleRowSync(oid); }
function tpChangePlanDate(iso){ TP.setPlanDate(iso); }
function tpToggleDate(iso){ TP.toggleDateSel(iso); }
function tpClearDateSel(){ TP.clearDateSel(); }

/* Tabulator-level shims used by Tomorrow Plan (mirror of tp* helpers; same
   factory module, different instance) */
function tmrOpenPaste(){ TMR.openPaste(); }
function tmrClosePaste(){ TMR.closePaste(); }
function tmrSubmitPaste(){ TMR.submitPaste(); }
function tmrCloseChoice(){ TMR.closeChoice(); }
function tmrRunChoice(m){ TMR.runChoice(m); }
function tmrCloseDiff(){ TMR.closeDiff(); }
function tmrConfirmDiff(){ TMR.confirmDiff(); }
function tmrClearAll(){ TMR.clearAll(); }
function tmrRequestDeleteRow(r){ TMR.requestDeleteRow(r); }
function tmrCreateTemp(){ TMR.createTempDO(); }
function tmrToggleRowSync(oid){ TMR.toggleRowSync(oid); }
function tmrChangePlanDate(iso){ TMR.setPlanDate(iso); }
function tmrToggleDate(iso){ TMR.toggleDateSel(iso); }
function tmrClearDateSel(){ TMR.clearDateSel(); }

/* ─── Shared Clear-All modal handlers (TP & TMR) ─────────────────
   The modal is shared DOM; the owning plan module is stashed on
   window._planClearOwner when clearAll() is called and is the only
   route by which planClearConfirm() applies the wipe. No Firebase
   activity until the operator clicks "Clear selected". */
function planClearClose(){
  document.getElementById('planClearModal').classList.remove('on');
  window._planClearOwner = null;
}
function planClearToggleAll(on){
  document.querySelectorAll('#planClearList .planClearDateChk').forEach(cb => { cb.checked = !!on; });
}
function planClearConfirm(){
  const owner = window._planClearOwner;
  if(!owner){ planClearClose(); return; }
  const checks = Array.from(document.querySelectorAll('#planClearList .planClearDateChk'));
  const picked = checks.filter(c => c.checked).map(c => c.dataset.date);
  if(!picked.length){ toast('Pick at least one date','er'); return; }
  owner._clearDatesActual(picked);
  planClearClose();
}

/* ═══════════════ PROMOTE TOMORROW → TODAY (v4.141) ═══════════════════
   HAI CHẾ ĐỘ, DỮ LIỆU QUYẾT ĐỊNH chứ không phải người dùng chọn:

   ① REPLACE — Today Plan KHÔNG còn xe nào đang nạp.
      Một lệnh update NGUYÊN TỬ thay CẢ NODE:
          plan_today = { …các dòng của Tomorrow… }
          plan_tomorrow = null
      ⚠ Vì sao thay cả node chứ không liệt kê từng khoá `null` như bản cũ:
      bản cũ xoá theo DANH SÁCH TRONG RAM (`Object.keys(TP.PLAN)`). Khoá nào
      có trên Firebase mà RAM chưa kịp biết (máy vừa mở, vừa rớt mạng, sự
      kiện bị nuốt) thì KHÔNG bị xoá ⇒ dòng cũ sống sót bên cạnh dòng vừa
      promote = TRÙNG LẶP. Ghi đè cả node thì RAM đúng hay sai không còn
      quan trọng nữa — đây là bản vá gốc, không phải vá triệu chứng.

   ② ADD — Today Plan CÒN xe đang nạp (ca đêm kéo qua nửa đêm).
      KHÔNG xoá gì cả, chỉ THÊM dòng của Tomorrow vào. Nhờ vậy xe của kế
      hoạch hôm nay nạp xong bình thường, mà xe của ngày mai cũng bán được
      ngay. Dòng Tomorrow nào trùng _oid với một dòng Today ĐANG NẠP / ĐÃ
      XONG thì BỎ QUA (không đè lên xe đang cân).

   Cả hai chế độ đều XOÁ SẠCH plan_tomorrow — đã đẩy sang thì Tomorrow Plan
   trống để sale dán kế hoạch ngày kế tiếp, không nhìn hai nơi cùng một dữ
   liệu rồi sửa lệch nhau.

   ⚠ NGUỒN DỮ LIỆU LÀ FIREBASE, KHÔNG PHẢI RAM. Cả lúc mở modal lẫn lúc bấm
   xác nhận đều đọc lại `plan_today` + `plan_tomorrow`. Đọc lỗi thì HUỶ, y
   như đường dán (_resyncNow('before-paste')) và Clear All đã làm từ v4.139.
   Đọc bằng RAM là cách 18 dòng trùng ngày 09/09/2026 ra đời.

   ⚠ Dòng của ngày mai sau khi promote MANG NGÀY MAI. Trạm cân vẫn chỉ bán
   đơn của HÔM NAY cho tới khi ai đó bật 📆 MULTI-DAY (xem window.MDAY trong
   helpers.js). Đó là chủ ý: promote sớm không đồng nghĩa được bán sớm.  */

let _promoteCtx = null;      /* ảnh chụp Firebase của lần mở modal gần nhất */

/* Đọc một node plan thành mảng dòng sạch (bỏ khoá RÁC, đóng _oid vào dòng). */
function _promoteRowsOf(snapVal){
  const out = [];
  Object.keys(snapVal || {}).forEach(oid=>{
    const r = snapVal[oid];
    if(!r || typeof r !== 'object') return;
    try{ if(TP._isJunkRow && TP._isJunkRow(r)) return; }catch(_){}
    r._oid = oid;
    out.push(r);
  });
  return out;
}
/* Trạng thái hiệu lực của một dòng (RAM: TL.ROWS + DB_SC.stations). */
function _promoteStatusOf(r){
  try{
    if(typeof TP !== 'undefined' && TP.getEffectiveStatus)
      return String(TP.getEffectiveStatus(r) || '').toLowerCase();
  }catch(_){}
  return String(r._status || '').toLowerCase();
}
function _promoteIsBusy(r){ return _promoteStatusOf(r) === 'loading'; }
function _promoteIsSpent(r){ const s=_promoteStatusOf(r); return s==='loading' || s==='done'; }

/* Đọc lại CẢ HAI node và dựng bối cảnh promote. Trả về Promise. */
function _promoteReadFirebase(){
  if(typeof firebase === 'undefined') return Promise.reject(new Error('offline'));
  const FB = firebase.database();
  return Promise.all([
    FB.ref('plan_today').once('value'),
    FB.ref('plan_tomorrow').once('value')
  ]).then(([ts, ms])=>{
    const todayRows = _promoteRowsOf(ts.val());
    const tmrRows   = _promoteRowsOf(ms.val());
    const busy      = todayRows.filter(_promoteIsBusy);
    const done      = todayRows.filter(r=>_promoteStatusOf(r)==='done');
    /* Chế độ do DỮ LIỆU quyết định: còn xe đang nạp ⇒ tuyệt đối không xoá. */
    const mode = busy.length ? 'add' : 'replace';
    /* Chế độ ADD: dòng Tomorrow trùng _oid với dòng Today đang nạp/đã xong
       thì bỏ qua — đè lên là cướp mất trạng thái của xe đang cân. */
    const spent = new Set(todayRows.filter(_promoteIsSpent).map(r=>String(r._oid)));
    const skipped = (mode === 'add') ? tmrRows.filter(r=>spent.has(String(r._oid))) : [];
    const take    = (mode === 'add') ? tmrRows.filter(r=>!spent.has(String(r._oid))) : tmrRows;
    return { todayRows, tmrRows, busy, done, mode, skipped, take };
  });
}

/* Dựng bản sao một dòng Tomorrow để ghi xuống plan_today. */
function _promoteClone(r){
  const cloned = {};
  Object.keys(r).forEach(k => { if(!k.startsWith('__')) cloned[k] = r[k]; });
  /* _forDate giữ NGUYÊN — nó là thứ nói cho phần mềm biết dòng này của ngày nào. */
  /* v4.183 — xe ĐÃ HUỶ ở Tomorrow Plan (sale ghi Cancel / bấm tay) vẫn là xe huỷ sau promote */
  if(r._autoSync === false && String(r._status||'') === 'cancel'){
    cloned.lastBy   = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) ? CURRENT_USER.name : 'system';
    cloned.lastAt   = Date.now();
    cloned.lastRole = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.role) ? CURRENT_USER.role : '';
    return cloned;
  }
  cloned._status    = '';
  cloned._actualQty = '';
  /* v4.59 — dòng promote LUÔN về AUTO. Giữ lại khoá tay là cái bẫy: _status /
     _actualQty đã bị xoá ở trên, nên dòng promote với _autoSync:false đứng im
     ở "Pending" cả ngày (không bao giờ nhận Loading/Done từ trạm cân) cho tới
     khi có người để ý thấy ô chưa tick. */
  cloned._autoSync  = true;
  cloned.lastBy   = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) ? CURRENT_USER.name : 'system';
  cloned.lastAt   = Date.now();
  cloned.lastRole = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.role) ? CURRENT_USER.role : '';
  return cloned;
}

/* Vẽ modal theo bối cảnh vừa đọc. */
function _promoteRender(ctx){
  const isAdd = ctx.mode === 'add';
  document.getElementById('tmrPromoteReplaceBox').style.display = isAdd ? 'none' : '';
  document.getElementById('tmrPromoteAddBox').style.display     = isAdd ? '' : 'none';
  document.getElementById('tmrPromoteTitle').textContent = isAdd
    ? '➕ Add Tomorrow Plan into Today Plan'
    : '🚀 Promote Tomorrow Plan → Today Plan';
  const go = document.getElementById('tmrPromoteGoBtn');
  go.textContent = isAdd ? '➕ Add into Today (keep current rows)' : '✓ Promote & replace Today';
  if(isAdd){
    document.getElementById('tmrPromoteBusyCount').textContent = ctx.busy.length;
    document.getElementById('tmrPromoteAddCount').textContent  = ctx.take.length;
    document.getElementById('tmrPromoteKeepCount').textContent = ctx.todayRows.length;
    document.getElementById('tmrPromoteSkipNote').textContent  = ctx.skipped.length
      ? ' — ' + ctx.skipped.length + ' row(s) skipped because the same order is already loading or done'
      : '';
  } else {
    document.getElementById('tmrPromoteCount').textContent    = ctx.tmrRows.length;
    document.getElementById('tmrPromoteOldCount').textContent = ctx.todayRows.length
      + (ctx.done.length ? ' (incl. ' + ctx.done.length + ' already done)' : '');
  }
  document.getElementById('tmrPromoteModal').classList.add('on');
}

function tmrOpenPromote(){
  if(!canWrite('plan_today') || !canWrite('plan_tomorrow')){
    toast('You do not have permission to promote','er'); return;
  }
  if(typeof firebase === 'undefined'){ toast('Offline — Firebase not connected','er'); return; }
  _promoteReadFirebase().then(ctx=>{
    if(!ctx.tmrRows.length){ toast('Tomorrow Plan is empty — nothing to promote','er'); return; }
    _promoteCtx = ctx;
    _promoteRender(ctx);
  }).catch(e=>{
    console.warn('promote read', e);
    toast('Cannot read the plan from Firebase — try again in a moment','er');
  });
}
function tmrClosePromote(){
  document.getElementById('tmrPromoteModal').classList.remove('on');
}
function tmrPromoteToToday(){ tmrOpenPromote(); }

function tmrConfirmPromote(){
  if(!canWrite('plan_today') || !canWrite('plan_tomorrow')){
    toast('You do not have permission to promote','er'); return;
  }
  if(typeof firebase === 'undefined'){ toast('Offline — Firebase not connected','er'); return; }
  const shownMode = _promoteCtx ? _promoteCtx.mode : '';
  /* ĐỌC LẠI ngay trước khi ghi. Giữa lúc mở modal và lúc bấm, một xe có thể
     vừa lên trạm ở máy khác — lúc đó REPLACE trở thành thao tác phá hoại. */
  _promoteReadFirebase().then(ctx=>{
    if(!ctx.tmrRows.length){ tmrClosePromote(); toast('Tomorrow Plan is empty','er'); return; }
    /* Chế độ đổi giữa chừng ⇒ KHÔNG ghi, vẽ lại modal và bắt xác nhận lần nữa. */
    if(shownMode && ctx.mode !== shownMode){
      _promoteCtx = ctx;
      _promoteRender(ctx);
      toast(ctx.mode === 'add'
        ? 'A truck started loading just now — switched to ADD mode. Confirm again.'
        : 'Loading finished just now — switched to REPLACE mode. Confirm again.', 'er');
      return;
    }
    tmrClosePromote();
    const FB = firebase.database();
    const ts = Date.now();
    const payload = {};
    let n = 0;

    const clones = [];                                   /* v4.183 — cho ảnh chụp kế hoạch đầu ngày */
    if(ctx.mode === 'replace'){
      /* ⭐ THAY CẢ NODE. Không liệt kê khoá null, không phụ thuộc RAM. */
      const node = {};
      ctx.take.forEach(r=>{ node[r._oid] = _promoteClone(r); clones.push(Object.assign({}, node[r._oid], { _oid:r._oid })); n++; });
      payload['plan_today'] = node;
    } else {
      /* ⭐ CHỈ THÊM. Không đụng một dòng Today nào đang có. */
      ctx.take.forEach(r=>{ payload['plan_today/' + r._oid] = _promoteClone(r); clones.push(Object.assign({}, payload['plan_today/' + r._oid], { _oid:r._oid })); n++; });
    }
    payload['plan_tomorrow']         = null;
    payload['plan_today_version']    = ts;
    payload['plan_tomorrow_version'] = ts;

    FB.ref().update(payload)
      .then(()=>{
        toast(ctx.mode === 'replace'
          ? 'Promoted ' + n + ' row(s) → Today Plan (' + ctx.todayRows.length + ' old row(s) replaced)'
          : 'Added ' + n + ' row(s) into Today Plan · ' + ctx.todayRows.length + ' existing row(s) kept'
            + (ctx.skipped.length ? ' · ' + ctx.skipped.length + ' skipped' : ''), 'ok');
        /* v4.183 — promote là lần đưa kế hoạch vào Today ⇒ ghi kế hoạch đầu ngày (nếu ngày đó chưa có) */
        try{ PLANDAY.recordPromoted(clones); }catch(e){ console.warn('[PLANDAY]', e); }
        /* Dòng vừa thêm mang NGÀY MAI — nhắc đúng lúc, đừng để nhân viên cân
           đứng trước một bảng đầy đơn mà trạm báo "future plan". */
        if(ctx.mode === 'add'){
          try{
            const t = MDAY.today();
            if(ctx.take.some(r=>String(r._forDate||'') !== t) && !MDAY.isOn())
              setTimeout(()=>toast('Turn on 📆 MULTI-DAY at the Scale console to sell the rows just added','er'), 900);
          }catch(_){}
        }
      })
      .catch(e=>{ console.error('promote', e); toast('Promote failed: '+(e.message||e),'er'); });

    try{ logAudit('plan_today:' + (ctx.mode === 'replace' ? 'promote' : 'promote_add'),
                  '_bulk_', '_promoteFromTomorrow', ctx.todayRows.length, n,
                  ctx.mode === 'replace' ? 'replace' : 'add · ' + ctx.busy.length + ' loading'); }catch(_){}

    /* Hàng đợi cân trỏ vào _oid của plan_today. REPLACE thay sạch bảng ⇒ mọi
       _oid trong hàng đợi thành rác, phải dọn. ADD thì KHÔNG — xe đang chờ là
       xe thật, dòng của nó vẫn còn nguyên. */
    if(ctx.mode === 'replace'){
      try{ if(typeof SCALE!=='undefined' && SCALE.waitClear) SCALE.waitClear(); }catch(_){}
    }
  }).catch(e=>{
    console.warn('promote confirm read', e);
    toast('Cannot read the plan from Firebase — nothing was changed','er');
  });
}

function switchSalesTab(t){
  document.querySelectorAll('#salesSubs .stab').forEach(s=>s.classList.toggle('on', s.dataset.sub===t));
  document.querySelectorAll('#page-sales .sub-pane').forEach(p=>p.classList.toggle('on', p.id==='sub-'+t));
  if(t==='scale'){ scRenderCtrl(); try{ if(typeof FCHECK!=='undefined') FCHECK.renderPanel(); }catch(_){} }
  /* TL Data: lazy-build its Tabulator the first time the sub-tab is opened.
     Without this the grid div stays empty even though ROWS / cache hold data
     (badge + CSV export read ROWS directly, so they looked correct). */
  if(t==='tl' && !TL.table){ TL.buildTable(); }
  if(t==='tl' && TL.table){ setTimeout(()=>{ try{ TL.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='wms' && !WG.table){ WG.buildTable(); }
  if(t==='st' && !WS.table){ WS.buildTable(); }
  if(t==='sap' && !SP.table){ SP.buildTable(); }
  if(t==='cust' && !CT.table){ CT.buildTable(); }
  if(t==='price' && !PP.table){ PP.buildTable(); }
  if(t==='tmr' && !TMR.table){ TMR.buildTable(); }
  if(t==='today' && TP.table){ setTimeout(()=>{ try{ TP.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='tmr' && TMR.table){ setTimeout(()=>{ try{ TMR.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='wms' && WG.table){ setTimeout(()=>{ try{ WG.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='st' && WS.table){ setTimeout(()=>{ try{ WS.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='sap' && SP.table){ setTimeout(()=>{ try{ SP.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='cust' && CT.table){ setTimeout(()=>{ try{ CT.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='price' && PP.table){ setTimeout(()=>{ try{ PP.table.redraw(true); }catch(_){ } }, 50); }
  if(t==='vs'){ try{ if(typeof vsRender==='function') vsRender(); }catch(_){ } }
  /* v4.109 — tab 🎯 ALLOCATION đã GỠ HẲN (không còn dùng). Nhánh mở tab,
     nút, khung #sub-alloc, alloc.js và alloc.css đều đã bỏ khỏi index.html. */
}

/* live search wiring */
document.getElementById('tpSearch').addEventListener('input', ()=>{
  if(TP.table) TP.rebuildTableData();
});
document.getElementById('tmrSearch').addEventListener('input', ()=>{
  if(TMR.table) TMR.rebuildTableData();
});

/* close TP/TMR modals on Escape (extends the fleet ESC handler) */
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape'){
    document.getElementById('tpPasteModal').classList.remove('on');
    document.getElementById('tpPchoiceModal').classList.remove('on');
    document.getElementById('tpDiffModal').classList.remove('on');
    document.getElementById('tmrPasteModal').classList.remove('on');
    document.getElementById('tmrPchoiceModal').classList.remove('on');
    document.getElementById('tmrDiffModal').classList.remove('on');
    document.getElementById('tmrPromoteModal').classList.remove('on');
  }
});

/* ============================================================
   WMS GI MODULE  (build p1.9-wms-gi)
   ─────────────────────────────────────────────────────────
   Goods-Issue register imported from the WMS Excel export.
   Architecture mirrors the Fleet Sync Core:
     - Per-field delta writes via multi-path update (wms_gi_/{rid}/{field}).
     - localStorage cache (key 'lpg_v4_wms_v1') for instant, offline-safe UI.
     - Own version counter node 'wms_gi_version' (bumped per write batch).
     - rid = 12-char base36 random (collision-safe, offline-create friendly).
   Identity / paste merge:
     - Rows are matched on delivId (the WMS Delivery-ID). A re-paste UPDATES
       the matching row's changed fields and ADDS rows with new delivId
       (mirrors v406 _wmsSaveIncoming). Existing rows whose delivId is absent
       from the paste are KEPT (the export is incremental, not authoritative).
     - Leading zeros are stripped from delivId at the source (v406 behavior).
   Date handling:
     - transDate / arrival are normalized to canonical DD/MM/YY via
       normalizeDate() at applyAndPush() time (source-of-truth), never at
       display. parseDate() already understands YYYYMMDD compact ISO.
   NOTE: TL Data / Today-Plan cross-checks are intentionally NOT wired here
         (to be added in a later phase once a TL Data tab exists).
   ============================================================ */
