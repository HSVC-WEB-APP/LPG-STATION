/* ============================================================
 * MAILCFG — mailcfg.js  (v4.172 · v4.177: tuyến P7 Vessel Mixing Report
 *                        · v4.182: nhóm G tự thêm, email P tự soạn, danh bạ thêm tay)
 * v4.182: cfg có thêm MAILS {P8:{ttl,subj,body,attach}} = email CHỈ CÓ CHỮ do admin soạn
 *         trên app (email cần dữ liệu vẫn viết trong mail.js), và CTX = người THÊM TAY vào
 *         danh bạ công ty (nhân viên mới chưa có trong file Contact List) — cùng định dạng
 *         dòng của CONTACTS. Firebase bỏ mảng rỗng ⇒ apply() chuẩn hoá lại ids/to/cc.
 * ------------------------------------------------------------
 * DANH BẠ + NHÓM NGƯỜI NHẬN của các email báo cáo định kỳ (module MAIL).
 * Nguồn: HSVC Internal Contact List cập nhật 11/09/2026 + chỉ đạo của
 * Mr. Kim Ji Min (22/09/2026): danh sách To/CC phải CỐ ĐỊNH, không trùng,
 * không còn người đã nghỉ việc.
 *
 * ⭐ ĐỔI NGƯỜI NHẬN = CHỈ SỬA FILE NÀY (không đụng mail.js):
 *   • Thêm / bớt người  → sửa mảng DIR (e = email; để '' là CHƯA CÓ EMAIL —
 *     app vẫn hiện tên nhưng KHÔNG đưa vào ô To/CC và nhắc bằng chip vàng).
 *   • Đổi thành viên nhóm → sửa GROUPS.
 *   • Đổi nhóm nhận của từng báo cáo → sửa ROUTE.
 * Người đang gửi (chọn ở ô "From") tự bị loại khỏi To/CC; người trùng giữa
 * các nhóm chỉ xuất hiện MỘT lần (To thắng CC).
 * ============================================================ */
const MAILCFG = (function(){
  'use strict';
  /* n = tên hiển thị ASCII (giống Outlook) · vn = tên có dấu (chữ ký)
     title = chức danh (người Hàn: cột Job Title) · hp = di động (chữ ký) */
  const DIR = [
    { id:"kimjk", n:"Kim Jong Ki", vn:"Kim Jong Ki", e:"kimjk@hyosung.com", title:"General Director", sex:"Male" },
    { id:"geniejm", n:"Kim Ji Min", vn:"Kim Ji Min", e:"geniejm@hyosung.com", title:"Department chief", sex:"Male", hp:"0852.829.088" },
    { id:"hwangmh", n:"Hwang Mun Hyun", vn:"Hwang Mun Hyun", e:"hwangmh@hyosung.com", title:"Performance Manager", sex:"Male", hp:"0828.120.209" },
    { id:"jmyun", n:"Yoon Jae Min", vn:"Yoon Jae Min", e:"jmyun@hyosung.com", title:"Professional", sex:"Male", hp:"0888.002.069" },
    { id:"trung44180062", n:"Hoang Trung", vn:"Hoàng Trung", e:"trung44180062@hyosung.com", title:"General Manager", sex:"Male", hp:"0966.671.312" },
    { id:"hung44210053", n:"Nguyen Quoc Hung", vn:"Nguyễn Quốc Hùng", e:"hung44210053@hyosung.com", title:"A.Manager", sex:"Male", hp:"0797.957.978" },
    { id:"nhan44220044", n:"Nguyen Van Hoang Nhan", vn:"Nguyễn Văn Hoàng Nhân", e:"nhan44220044@hyosung.com", title:"A.Manager", sex:"Male", hp:"0909.387.945" },
    { id:"an44220072", n:"Lam Thuan An", vn:"Lâm Thuận An", e:"an44220072@hyosung.com", title:"D.Manager", sex:"Male", hp:"0795.689.064" },
    { id:"thanh44220075", n:"Duong Xuan Thanh", vn:"Dương Xuân Thạnh", e:"thanh44220075@hyosung.com", title:"A.Manager", sex:"Male", hp:"0911.470.713" },
    { id:"loc44240070", n:"Nguyen Ba Loc", vn:"Nguyễn Bá Lộc", e:"loc44240070@hyosung.com", title:"Assistant", sex:"Male", hp:"0949.988.353" },
    { id:"quoc44250040", n:"Vu Ngoc Quoc", vn:"Vũ Ngọc Quốc", e:"quoc44250040@hyosung.com", title:"Assistant", sex:"Male", hp:"0869.835.426" },
    { id:"viet44250066", n:"Ngo Tran Bao Viet", vn:"Ngô Trần Bảo Việt", e:"viet44250066@hyosung.com", title:"Assistant", sex:"Male", hp:"0367.269.371" },
    { id:"huong44220014", n:"Tran Thi My Huong", vn:"Trần Thị Mỹ Hương", e:"huong44220014@hyosung.com", title:"Sub-Assistant 2", sex:"Female", hp:"0329.392.446" },
    { id:"anh44220088", n:"Le Phan Hong Anh", vn:"Lê Phan Hồng Anh", e:"anh44220088@hyosung.com", title:"Sub-Assistant 3", sex:"Female", hp:"0334.172.830" },
    { id:"loc44260001", n:"Tran Huu Loc", vn:"Trần Hữu Lộc", e:"loc44260001@hyosung.com", title:"Sub-Assistant 3", sex:"Male", hp:"0812.547.973" },
    { id:"van44180057", n:"Phan Quynh Van", vn:"Phan Quỳnh Vân", e:"van44180057@hyosung.com", title:"Manager", sex:"Female", hp:"0797.676.749" },
    { id:"chjo", n:"Jo Choon Ho", vn:"Jo Choon Ho", e:"chjo@hyosung.com", title:"Sales Director", sex:"Male" },
    { id:"yswoo", n:"Woo Young Suk", vn:"Woo Young Suk", e:"yswoo@hyosung.com", title:"Performance Manager", sex:"Male" },
    { id:"cha2633", n:"Cha Jin Cheol", vn:"Cha Jin Cheol", e:"cha2633@hyosung.com", title:"Performance Manager", sex:"Male" },
    { id:"thuong-duc.cao", n:"Cao Thuong Duc", vn:"Cao Thượng Đức", e:"thuong-duc.cao@hyosung.com", title:"General Manager", sex:"Male" },
    { id:"locnh", n:"Nguyen Huu Loc", vn:"Nguyễn Hữu Lộc", e:"locnh@hyosung.com", title:"D.Manager", sex:"Male" },
    { id:"kimquy.vo", n:"Vo Kim Quy", vn:"Võ Kim Quy", e:"kimquy.vo@hyosung.com", title:"A.Manager", sex:"Male" },
    { id:"yennguyen", n:"Nguyen Thi Hai Yen", vn:"Nguyễn Thị Hải Yến", e:"yennguyen@hyosung.com", title:"D.Manager", sex:"Female" },
    { id:"thienkim", n:"Nguyen Ngoc Thien Kim", vn:"Nguyễn Ngọc Thiên Kim", e:"thienkim@hyosung.com", title:"A.Manager", sex:"Female" },
    { id:"nhung44200023", n:"Tran Thi Hong Nhung", vn:"Trần Thị Hồng Nhung", e:"nhung44200023@hyosung.com", title:"D.Manager", sex:"Female" },
    { id:"thu44210105", n:"Pham Nguyen Anh Thu", vn:"Phạm Nguyễn Anh Thư", e:"thu44210105@hyosung.com", title:"A.Manager", sex:"Female" },
    { id:"anh44180147", n:"Chu Thi Ngoc Anh", vn:"Chu Thị Ngọc Anh", e:"anh44180147@hyosung.com", title:"General Manager", sex:"Female" },
    { id:"thuy44180046", n:"Nguyen Thu Thuy", vn:"Nguyễn Thu Thủy", e:"thuy44180046@hyosung.com", title:"D.Manager", sex:"Female" },
    { id:"trang44180083", n:"Nguyen Ha Trang", vn:"Nguyễn Hà Trang", e:"trang44180083@hyosung.com", title:"D.Manager", sex:"Female" },
    { id:"hanh44240016", n:"Tran Thi Bich Hanh", vn:"Trần Thị Bích Hạnh", e:"hanh44240016@hyosung.com", title:"Assistant", sex:"Female" },
    { id:"nhi44250024", n:"Tran Thi Yen Nhi", vn:"Trần Thị Yến Nhi", e:"nhi44250024@hyosung.com", title:"A.Manager", sex:"Female" },
    { id:"thy44210095", n:"Nguyen Thi Minh Thy", vn:"Nguyễn Thị Minh Thy", e:"thy44210095@hyosung.com", title:"Manager", sex:"Female" },
    { id:"yen44210094", n:"Nguyen Pham Thao Yen", vn:"Nguyễn Phạm Thảo Yên", e:"yen44210094@hyosung.com", title:"A.Manager", sex:"Female" },
    { id:"nsigma", n:"Jang Jong Chan", vn:"Jang Jong Chan", e:"nsigma@hyosung.com", title:"Department chief", sex:"Male" },
    { id:"cuong_new", n:"Tong Manh Cuong", vn:"Tống Mạnh Cường", e:"", title:"Engineer", sex:"Male" },
    { id:"vc9D20", n:"LPG 영업팀(비나케미칼즈)", vn:"LPG 영업팀(비나케미칼즈)", e:"vc9D20@hyosung.com", title:"Group mailbox", sex:"" },
  ];

  const GROUPS = {
    G1:{ name:'LPGT Management',                 ids:['geniejm','hwangmh'] },
    G2:{ name:'Cavern Process — Engineers',      ids:['trung44180062','hung44210053','nhan44220044','an44220072',
                                                      'thanh44220075','loc44240070','quoc44250040','viet44250066','cuong_new'] },
    G3:{ name:'Cavern Process — Check booth',    ids:['huong44220014','anh44220088','loc44260001'] },
    G4:{ name:'Secretary (Tank Terminal)',       ids:['van44180057'] },
    G5:{ name:'LPG Sales — VN',                  ids:['thuong-duc.cao','locnh','kimquy.vo','yennguyen','thienkim',
                                                      'nhung44200023','thu44210105'] },
    G6:{ name:'LPG Sales — Korean managers',     ids:['chjo','yswoo','cha2633','vc9D20'] },
    G7:{ name:'PP Technical',                    ids:['anh44180147','thuy44180046','trang44180083','hanh44240016','nhi44250024'] },
    G8:{ name:'Planning',                        ids:['thy44210095','yen44210094'] },
    G9:{ name:'DH Process (OL1)',                ids:['nsigma'] }
  };

  /* To / CC của từng báo cáo — tham chiếu nhóm (G..) hoặc id người */
  const ROUTE = {
    P1:{ to:['G1'],      cc:['G2','G3','G4','G5','G7'] },            /* Ball Tank Mixing (E1+E2) */
    P2:{ to:['G1'],      cc:['G2','G3','G4','G6','G5','G8'] },       /* Daily LPG Loading        */
    P3:{ to:['G1'],      cc:['G2','G9'] },                           /* Dew Point                */
    P4:{ to:['geniejm'], cc:['hwangmh','G2','G4'] },                 /* Terminal Weekly          */
    P5:{ to:['G1'],      cc:['G2','G3','G4'] },                      /* Heater Consumption       */
    P6:{ to:['G1'],      cc:['G2','G3','G4'] },                      /* Cavern SAP/WMS Batch     */
    P7:{ to:['G1'],      cc:['G2','G3','G4','G5','G7'] }             /* v4.177 Vessel Mixing — mặc định giống P1 */
  };

  /* người được chọn làm "From" (chữ ký) — toàn bộ LPG Terminal VN */
  const SENDERS = ['trung44180062','hung44210053','nhan44220044','an44220072','thanh44220075','loc44240070',
                   'quoc44250040','viet44250066','cuong_new','huong44220014','anh44220088','loc44260001','van44180057'];

  /* v4.182 — email tự soạn (chỉ chữ) + người thêm tay vào danh bạ công ty */
  const MAILS = {};
  const CTX = [];

  const COMPANY = {
    team:'LPG Terminal Team',
    name:'HYOSUNG VINA CHEMICALS CO., LTD',
    addr:'Lot 01CN~08CN, Cai Mep Industrial Zone, Tan Phuoc Ward, Ho Chi Minh City, Viet Nam.'
  };

  /* ── v4.173 — CẤU HÌNH SỬA ĐƯỢC TRÊN APP (✉ ▸ 👥 Recipients) ──────────
     Bảng DIR/GROUPS/ROUTE ở trên chỉ là MẶC ĐỊNH. Khi admin/editor bấm
     Save trong màn hình Recipients, cả bộ ghi vào node Firebase `mail_cfg`
     (MỘT object nhỏ, ghi rất hiếm) và mọi máy nạp lại bằng listener. Đây là
     dữ liệu NGƯỜI GÕ nên được lên Firebase (đúng luật RAM v4.170).       */
  const DEF = { DIR: JSON.parse(JSON.stringify(DIR)), GROUPS: JSON.parse(JSON.stringify(GROUPS)),
                ROUTE: JSON.parse(JSON.stringify(ROUTE)), SENDERS: SENDERS.slice(), MAILS:{}, CTX:[] };
  let BYID = {};
  let META = { src:'default', at:0, by:'' };
  function _reindex(){ BYID = {}; DIR.forEach(p => { if(p && p.id) BYID[p.id] = p; }); }
  _reindex();
  function _replace(arr, next){ arr.length = 0; (next || []).forEach(x => arr.push(x)); }
  function _replaceObj(obj, next){ Object.keys(obj).forEach(k => delete obj[k]); Object.assign(obj, next || {}); }
  /* Firebase trả mảng rỗng thành "không có", mảng thưa thành object ⇒ đưa về mảng */
  function _arr(v){ return Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === 'object') ? Object.values(v).filter(x => x != null) : []; }
  /* nạp một bộ cấu hình (từ Firebase hoặc từ màn hình sửa) */
  function apply(cfg, meta){
    if(!cfg || !Array.isArray(cfg.DIR) || !cfg.GROUPS || !cfg.ROUTE) return false;
    _replace(DIR, cfg.DIR.filter(p => p && p.id));
    _replaceObj(GROUPS, cfg.GROUPS);
    Object.keys(GROUPS).forEach(g => { const x = GROUPS[g] || {}; GROUPS[g] = { name:String(x.name || g), ids:_arr(x.ids) }; });
    _replaceObj(ROUTE, cfg.ROUTE);
    Object.keys(ROUTE).forEach(k => { const r = ROUTE[k] || {}; ROUTE[k] = { to:_arr(r.to), cc:_arr(r.cc) }; });
    /* v4.182 — email tự soạn + người thêm tay */
    const mm = {};
    Object.keys(cfg.MAILS || {}).forEach(k => { const m = cfg.MAILS[k]; if(!m || !/^P\d+$/.test(k)) return;
      mm[k] = { ttl:String(m.ttl || k), subj:String(m.subj || ''), body:String(m.body || ''), attach:String(m.attach || '') };
      if(!ROUTE[k]) ROUTE[k] = { to:[], cc:[] }; });
    _replaceObj(MAILS, mm);
    _replace(CTX, _arr(cfg.CTX).map(r => { const a = _arr(r); return Array.from({ length:10 }, (_, i) => String(a[i] == null ? '' : a[i])); })
      .filter(r => r[0] && /@/.test(r[1])).map(r => { r[9] = 'Manual'; return r; }));
    /* v4.177 — bộ cấu hình lưu TRƯỚC khi có báo cáo mới (vd. P7) sẽ thiếu tuyến của nó
       ⇒ bù tuyến MẶC ĐỊNH cho đúng những báo cáo còn thiếu, không đụng tuyến admin đã chỉnh */
    Object.keys(DEF.ROUTE).forEach(k => { if(!ROUTE[k]) ROUTE[k] = JSON.parse(JSON.stringify(DEF.ROUTE[k])); });
    if(Array.isArray(cfg.SENDERS)) _replace(SENDERS, cfg.SENDERS);
    META = Object.assign({ src:'firebase', at:0, by:'' }, meta || {});
    _reindex();
    try{ document.dispatchEvent(new CustomEvent('mailcfg:changed')); }catch(_){}
    return true;
  }
  function snapshot(){
    return JSON.parse(JSON.stringify({ DIR, GROUPS, ROUTE, SENDERS, MAILS, CTX }));
  }
  function resetDefault(){ apply(JSON.parse(JSON.stringify(DEF)), { src:'default', at:0, by:'' }); }
  let _ref = null;
  function attach(){
    if(_ref) return;
    try{
      if(typeof firebase === 'undefined' || !firebase.database) return;
      _ref = firebase.database().ref('mail_cfg');
      _ref.on('value', s => {
        const v = s.val();
        if(v && v.cfg) apply(v.cfg, { src:'firebase', at:v.at || 0, by:v.by || '' });
      }, e => console.warn('[MAILCFG] listen', e));
    }catch(e){ console.warn('[MAILCFG] attach', e); }
  }
  function save(cfg){
    const by = (typeof CURRENT_USER !== 'undefined' && (CURRENT_USER.name || CURRENT_USER.email)) || '?';
    const at = Date.now();
    apply(cfg, { src:'firebase', at, by });
    if(!_ref){ attach(); }
    if(!_ref) return Promise.reject(new Error('Firebase not ready'));
    return _ref.set({ cfg:snapshot(), at, by });
  }
  function person(id){ return BYID[id] || null; }
  /* mở rộng danh sách tham chiếu (G.. / id) thành mảng id duy nhất, giữ thứ tự */
  function expand(refs){
    const out = [], seen = {};
    (refs || []).forEach(ref => {
      const ids = GROUPS[ref] ? GROUPS[ref].ids : [ref];
      (ids || []).forEach(id => { if(!seen[id] && BYID[id]){ seen[id] = 1; out.push(id); } });
    });
    return out;
  }
  return { DIR, GROUPS, ROUTE, SENDERS, MAILS, CTX, COMPANY, person, expand,
           apply, snapshot, save, attach, resetDefault, meta:() => META, DEF };
})();
