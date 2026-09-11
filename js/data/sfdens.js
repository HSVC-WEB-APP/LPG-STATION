/* ============================================================
 * SFDENS — sfdens.js                                  (v4.143)
 * ------------------------------------------------------------
 * Global xuất ra : window.SFDENS
 * Phụ thuộc      : ENG (Tank Log, tuỳ chọn) · firebase (tuỳ chọn)
 *                  sfDensity()/sfFillPct() của globals.js (fallback)
 * ------------------------------------------------------------
 * DENSITY CHO "SAFE FILL ALLOW" — LẤY THEO LOT ĐANG BÁN
 *
 * VÌ SAO CÓ FILE NÀY
 *   Safe Fill Allow = cap bồn xe (m³) × density (t/m³) × Fill %.
 *   Trước v4.143 density là MỘT CON SỐ CỐ ĐỊNH gõ tay (0.538) cho mọi
 *   xe, mọi lot. Nhưng mỗi lot mix có density riêng (COQ ghi ở cột [33]
 *   của Tank Log): lot 30:70 nặng hơn lot 70:30 khá nhiều. Dùng chung
 *   một số ⇒ xe chở hàng nặng bị cho phép nạp QUÁ mức an toàn, còn xe
 *   chở hàng nhẹ thì bị cắt oan.
 *
 * BỐN NẤC — NẤC TRÊN THẮNG NẤC DƯỚI
 *   ① Đơn Pure C3 / Pure C4 (bơm TK-3301 / TK-3401, KHÔNG qua Tank Log)
 *      ⇒ tra BẢNG DENSITY BÃO HOÀ theo nhiệt độ (ô "Pure temp °C").
 *   ② Lot đang bán CÓ density trong Tank Log ⇒ dùng thẳng số đó.
 *   ③ Lot đang bán CHƯA có density (lưu draft lúc chưa có kết quả COQ
 *      nhưng hàng đã xuất bán) ⇒ dò lot GẦN SÁT NHẤT theo %C3, lấy
 *      density của lot đó. Xem "LUẬT DÒ" bên dưới.
 *   ④ Không ra gì ⇒ lùi về số gõ tay trên thanh Safe Fill.
 *
 * LUẬT DÒ (nấc ③)
 *   Mốc so sánh (target) của lot đang bán lấy theo thứ tự:
 *      COQ Pro/Bu %Vol [44] → %C3 [8] → Target C3% [29]   (cơ sở VOL)
 *      COQ Pro/Bu %Wt  [45]                                (cơ sở WT)
 *   Lot chưa có COQ thì [44]/[45] trống, nên thực tế nó rơi về
 *   Target C3% [29] — ĐÚNG Ý NGHIỆP VỤ: lúc lưu draft chỉ có dữ liệu
 *   target mix. Ứng viên trong kho lịch sử cũng quy ra hai cơ sở y hệt.
 *   So VOL với VOL, WT với WT (ưu tiên VOL vì luôn có). Cùng độ lệch
 *   thì LOT MỚI HƠN thắng — hàng gần đây phản ánh dòng sản phẩm hiện tại.
 *
 * QUÉT FIREBASE — RAM, KHÔNG CACHE ĐĨA
 *   Tank Log chỉ nạp 10 lot gần nhất (ENG INIT_LOTS). Khi 10 lot đó
 *   không đủ để dò, module đọc MỘT LẦT toàn bộ node eng_tkmix bằng
 *   once('value') và giữ kết quả TRONG RAM suốt phiên. TUYỆT ĐỐI
 *   KHÔNG ghi localStorage: người dùng yêu cầu rõ — sợ dữ liệu cũ.
 *   Quét chạy BẤT ĐỒNG BỘ: lần gọi đầu trả về nấc ④ kèm cờ .scanning,
 *   quét xong thì gọi mọi subscriber (SFDENS.onReady) để vẽ lại.
 *   Không đụng vào listener của ENG — đọc một phát rồi thôi.
 *
 * KHÔNG ÁP DỤNG CHO
 *   · Cột "Safe Fill T" ở tab Fleet — bảng đó liệt kê XE, không gắn
 *     đơn hàng nào, nên giữ density gõ tay.
 *   · Ô Safe Fill trong modal chứng chỉ xe (Scale ▸ thẻ xe) — cùng lý do.
 * ============================================================ */

const SFDENS = (function(){
  'use strict';

  const FB_PATH = 'eng_tkmix';

  /* Cột Tank Log dùng ở đây — trùng schema ENG (ROW_W 75) */
  const C_LOT = 1, C_TANK = 2, C_DATE = 3, C_PCT_C3 = 8,
        C_TGT_C3 = 29, C_DENS = 33, C_COQ_VOL = 44, C_COQ_WT = 45;

  /* Bảng density lỏng bão hoà [°C, kg/m³] — chép từ js/data/density.js
     (file đó đã gỡ khỏi bản chạy từ v4.86). C4 là butan thương phẩm
     70 % n-C4 + 30 % i-C4, KHÔNG phải n-butan tinh khiết — xem ghi chú
     gốc trong density.js, đừng thay bằng số n-C4 tinh khiết. */
  const T_C3 = [
    [-5,535.2],[0,528.5],[5,521.7],[10,514.6],[15,507.3],[20,499.9],
    [25,492.1],[30,484.1],[35,475.9],[40,467.2],[45,458.2],[50,448.7]
  ];
  const T_C4 = [
    [-5,600.1],[0,594.7],[5,589.2],[10,583.5],[15,577.7],[20,571.9],
    [25,565.9],[30,559.9],[35,553.7],[40,547.5],[45,541.1],[50,534.6]
  ];

  const DEF_TEMP = 30;          /* °C — mặc định cho đơn Pure */
  const GAP_WARN = 10;          /* điểm %C3 — lệch hơn thì gắn cờ nhắc */

  let _hist = null;             /* RAM: toàn bộ lot đọc từ Firebase       */
  let _scanning = false;
  let _scanFailed = false;
  const _subs = [];

  /* ---------- helpers ---------- */
  function _num(v){
    if(v===''||v==null) return null;
    const x = parseFloat(String(v).replace(/[,\s]/g,''));
    return isFinite(x) ? x : null;
  }
  /* %C3 về ĐIỂM PHẦN TRĂM (0–100). Tank Log lưu khi thì 0.55 khi thì 55
     tuỳ đường ghi (xem ghi chú cột 8/9 ở eng.js), nên chuẩn hoá một chỗ. */
  function _pct(v){
    const x = _num(v);
    if(x==null || x<=0) return null;
    return x > 1.5 ? x : x*100;
  }
  function _lotKey(s){
    const m = String(s||'').match(/(?:LPG-)?(\d{4})-?(\d+)/i);
    if(m) return parseInt(m[1],10)*1e6 + parseInt(m[2],10);
    const n = parseInt(s,10);
    return isNaN(n) ? 0 : n;
  }
  function _el(id){ try{ return document.getElementById(id); }catch(_){ return null; } }

  /* Density gõ tay trên thanh Safe Fill — nấc ④ */
  function manualDensity(){
    try{ if(typeof sfDensity==='function') return sfDensity(); }catch(_){}
    const el = _el('sfDensity');
    return (el && parseFloat(el.value)) || 0.538;
  }
  function fillPct(){
    try{ if(typeof sfFillPct==='function') return sfFillPct(); }catch(_){}
    const el = _el('sfFill');
    return ((el && parseFloat(el.value)) || 90)/100;
  }
  function pureTemp(){
    const el = _el('sfTemp');
    const t = el ? _num(el.value) : null;
    return (t==null) ? DEF_TEMP : t;
  }

  /* ---------- ① bảng density bão hoà theo nhiệt độ ---------- */
  function tableDensity(fluid, temp){
    /* DENS (js/data/density.js) chính xác hơn vì bảng sửa được trên
       Firebase — dùng nếu bản chạy có nạp lại file đó. */
    try{
      if(typeof DENS!=='undefined' && DENS && DENS.lookup){
        const r = DENS.lookup(fluid, temp);
        if(r && r.rhoT>0) return r.rhoT;
      }
    }catch(_){}
    const rows = (String(fluid||'').toLowerCase().indexOf('4')>=0) ? T_C4 : T_C3;
    const t = _num(temp);
    if(t==null) return null;
    let a = rows[0], b = rows[1];
    for(let k=0;k<rows.length-1;k++){
      if(t>=rows[k][0] && t<=rows[k+1][0]){ a=rows[k]; b=rows[k+1]; break; }
      if(t>rows[rows.length-1][0]){ a=rows[rows.length-2]; b=rows[rows.length-1]; }
    }
    const span = (b[0]-a[0]) || 1;
    const f = (t-a[0])/span;
    const rho = a[1] + (b[1]-a[1])*f;
    return Math.round(rho*100)/100000;      /* kg/m³ → t/m³, giữ 0.01 kg/m³ */
  }

  /* Đơn Pure? Chép đúng luật _scPureType của scale.js — bỏ token ASCII
     "thuan" vì nó khớp địa danh "Binh Thuan" (bẫy đã dính ở v4.63). */
  function pureType(type){
    const t = String(type||'').toLowerCase();
    if(!/pure|thuần|순수/.test(t)) return '';
    if(/c4|butane|부탄/.test(t)) return 'C4';
    if(/c3|propane|프로판/.test(t)) return 'C3';
    return 'C3';
  }

  /* Tỉ lệ bán từ ô Type — trả %C3 theo VOL, hoặc null.
     Dùng cho phiếu in SỚM (tomorrow plan) khi chưa chốt lot nào. */
  function ratioC3(type){
    let norm = String(type||'');
    try{ if(typeof _pfDeriveType==='function') norm = _pfDeriveType(type||''); }catch(_){}
    const m = norm.match(/C3:(\d{1,3})\/C4:(\d{1,3})/i);
    if(m) return parseInt(m[1],10);
    if(/pure\s*propane/i.test(norm)) return 100;
    if(/pure\s*butane/i.test(norm))  return 0;
    return 50;                       /* ô Type trống ⇒ 50:50, như PTT/DN */
  }

  /* ---------- kho lot ---------- */
  /* Một ứng viên: { lot, tank, date, k, dens, vol, wt } */
  function _cand(cells){
    if(!cells) return null;
    const lot = String(cells[C_LOT]||'').trim();
    if(!lot) return null;
    return {
      lot:  lot,
      tank: String(cells[C_TANK]||'').trim(),
      date: String(cells[C_DATE]||''),
      k:    _lotKey(lot),
      dens: _num(cells[C_DENS]),
      vol:  _pct(cells[C_COQ_VOL]) ?? _pct(cells[C_PCT_C3]) ?? _pct(cells[C_TGT_C3]),
      wt:   _pct(cells[C_COQ_WT])
    };
  }
  /* Lot đang có trong RAM của ENG (10 lot gần nhất, hoặc cả bảng nếu
     người dùng đã bấm 📥 Load All). */
  function _ramCands(){
    let rows = [];
    try{ rows = (typeof ENG!=='undefined' && ENG.ROWS) ? ENG.ROWS : []; }catch(_){ return []; }
    const out = [];
    rows.forEach(r=>{ const c=_cand(r); if(c) out.push(c); });
    return out;
  }
  /* RAM + kết quả quét Firebase, khử trùng theo số lot (RAM thắng vì mới hơn) */
  function pool(){
    const out = [], seen = Object.create(null);
    _ramCands().forEach(c=>{ const k=c.k||c.lot; if(!seen[k]){ seen[k]=1; out.push(c); } });
    if(_hist) _hist.forEach(c=>{ const k=c.k||c.lot; if(!seen[k]){ seen[k]=1; out.push(c); } });
    return out;
  }

  /* ---------- quét Firebase MỘT LẦN, giữ trong RAM ---------- */
  function scan(cb){
    if(_hist){ if(cb) cb(_hist); return; }
    if(_scanning){ if(cb) _subs.push(cb); return; }
    let db = null;
    try{ db = (typeof firebase!=='undefined' && firebase.database) ? firebase.database() : null; }catch(_){}
    if(!db){ _scanFailed = true; if(cb) cb(null); return; }
    _scanning = true;
    db.ref(FB_PATH).once('value').then(snap=>{
      const val = snap.val() || {};
      const out = [];
      for(const rid in val){
        const v = val[rid];
        const cells = Array.isArray(v) ? v : (v && Array.isArray(v.cells) ? v.cells : null);
        const c = _cand(cells);
        if(c) out.push(c);
      }
      out.sort((a,b)=>b.k-a.k);
      _hist = out;
      _scanning = false;
      _notify();
      if(cb) cb(_hist);
    }).catch(()=>{
      _scanning = false;
      _scanFailed = true;
      _notify();
      if(cb) cb(null);
    });
  }
  const _ready = [];
  function _notify(){
    const list = _subs.slice();
    _subs.length = 0;
    list.forEach(f=>{ try{ f(_hist); }catch(_){} });
    _ready.forEach(f=>{ try{ f(); }catch(_){} });
  }
  function onReady(fn){ if(typeof fn==='function') _ready.push(fn); }
  /* Dùng khi muốn ép đọc lại trong phiên (ví dụ vừa nhập COQ xong) */
  function reset(){ _hist = null; _scanning = false; _scanFailed = false; }

  /* ---------- dò lot gần sát nhất ---------- */
  /* target = {vol, wt} điểm %C3 của lot đang bán (một trong hai có thể null) */
  /* skipKey — KHOÁ LOT ĐANG GIẢI, phải loại ra.
     BẪy thật đã dính: lot có density nhưng THIẾU %wt thì nó vẫn lọt qua
     bộ lọc `dens>0` và tự khớp với chính mình (lệch 0 điểm, lại là lot mới
     nhất nên thắng) ⇒ đi mượn %wt của chính nó = vẫn rỗng. */
  function nearest(target, list, skipKey){
    if(!target || (target.vol==null && target.wt==null)) return null;
    let best = null;
    (list||pool()).forEach(c=>{
      if(!(c.dens>0)) return;
      if(skipKey && c.k && c.k===skipKey) return;
      let gap = null, basis = '';
      if(target.vol!=null && c.vol!=null){ gap = Math.abs(c.vol-target.vol); basis='vol'; }
      if(gap==null && target.wt!=null && c.wt!=null){ gap = Math.abs(c.wt-target.wt); basis='wt'; }
      if(gap==null) return;
      /* lệch nhỏ hơn thì thắng; lệch bằng nhau (trong 0.05 điểm) thì LOT
         MỚI HƠN thắng — hàng gần đây sát dòng sản phẩm đang chạy hơn. */
      if(!best || gap < best.gap-0.05 || (Math.abs(gap-best.gap)<=0.05 && c.k>best.c.k)){
        best = { c:c, gap:gap, basis:basis };
      }
    });
    return best;
  }

  /* ---------- tìm lot đang bán trong kho ---------- */
  function findLot(lot, tank, list){
    const lotStr = String(lot||'').trim();
    if(!lotStr) return null;
    const n = _lotKey(lotStr);
    const tk = String(tank||'').trim().toUpperCase();
    const arr = list || pool();
    /* vòng 1 — khớp cả bồn */
    if(tk){
      for(const c of arr){
        const ct = c.tank.toUpperCase();
        const tkOk = ct && (ct===tk || ct.indexOf(tk)>=0 || tk.indexOf(ct)>=0);
        if(tkOk && (c.lot===lotStr || (n && c.k===n))) return c;
      }
    }
    /* vòng 2 — số lot là duy nhất trong Tank Log nên bỏ điều kiện bồn */
    for(const c of arr){ if(c.lot===lotStr || (n && c.k===n)) return c; }
    /* vòng 3 — người dùng / hệ cũ hay ghi TRỐNG phần "LPG-2026-",
       chỉ còn "40". So số đuôi, y như ENG.findRowByLotTank. */
    const m = lotStr.match(/(\d+)\s*$/);
    const tail = m ? parseInt(m[1],10) : NaN;
    if(!isNaN(tail)){
      for(const c of arr){
        const m2 = c.lot.match(/(\d+)\s*$/);
        if(m2 && parseInt(m2[1],10)===tail) return c;
      }
    }
    return null;
  }

  /* ══ HÀM CHÍNH ═════════════════════════════════════════════════════
     ctx = { lot, tank, type }
     trả { dens, src, lot, tank, basis, target, gap, scanning, far, label }
       src: 'pure' | 'lot' | 'near' | 'manual'
     ĐỒNG BỘ — không chờ Firebase. Cần quét mà chưa có thì trả nấc ④ kèm
     scanning:true và tự gọi subscriber khi quét xong. */
  function resolve(ctx){
    ctx = ctx || {};
    const man = manualDensity();

    /* ① Pure C3 / C4 — không đi qua Tank Log */
    const pt = pureType(ctx.type);
    if(pt){
      const t = pureTemp();
      const d = tableDensity(pt==='C4'?'c4':'c3', t);
      if(d>0) return { dens:d, src:'pure', lot:'', tank:'', basis:'temp',
                       target:null, gap:null, scanning:false, far:false,
                       label:'Pure '+pt+' @ '+t+'°C' };
      return { dens:man, src:'manual', lot:'', tank:'', basis:'', target:null,
               gap:null, scanning:false, far:false, label:'Manual density' };
    }

    const list = pool();
    const row  = findLot(ctx.lot, ctx.tank, list);

    /* ② lot đang bán đã có density */
    if(row && row.dens>0){
      return { dens:row.dens, src:'lot', lot:row.lot, tank:row.tank, basis:'coq',
               target:null, gap:null, scanning:false, far:false,
               label:'Lot '+row.lot };
    }

    /* ③ chưa có density ⇒ dò lot gần sát nhất theo %C3 */
    let target = null;
    if(row){
      target = { vol:row.vol, wt:row.wt };
    } else {
      const rc = ratioC3(ctx.type);
      if(rc!=null) target = { vol:rc, wt:null };
    }
    if(target && (target.vol!=null || target.wt!=null)){
      const hit = nearest(target, list, row ? row.k : 0);
      if(hit){
        return { dens:hit.c.dens, src:'near', lot:hit.c.lot, tank:hit.c.tank,
                 basis:hit.basis, target:(hit.basis==='wt'?target.wt:target.vol),
                 gap:hit.gap, scanning:false, far:(hit.gap>GAP_WARN),
                 label:'Nearest lot '+hit.c.lot };
      }
      /* RAM chỉ có 10 lot — đọc cả bảng rồi thử lại */
      if(!_hist && !_scanFailed){
        scan();
        return { dens:man, src:'manual', lot:'', tank:'', basis:'', target:null,
                 gap:null, scanning:true, far:false,
                 label:'Scanning Tank Log…' };
      }
    }

    /* ④ */
    return { dens:man, src:'manual', lot:'', tank:'', basis:'', target:null,
             gap:null, scanning:false, far:false, label:'Manual density' };
  }

  /* ══ v4.143 — THẺ BỒN: density + %wt C3 của LOT ĐANG NẰM TRONG BỒN ══
     Khác resolve() ở chỗ: không cần cap xe, và trả thêm %wt C3 theo COQ
     để vẽ lên thẻ tank. Cùng một luật dò — lot chưa có COQ thì MƯỢN cả
     density LẪN %wt của ĐÚNG MỘT lot gần sát nhất, để hai con số hiện
     trên thẻ luôn cùng một nguồn, không chắp vá hai lot khác nhau.
     trả { lot, found, dens, densSrc, wt, wtSrc, vol, refLot, gap, far,
             scanning, pure } — src: 'coq' | 'near' | 'manual' | 'pure' | '' */
  function tankInfo(lot, tank, type){
    const out = { lot:String(lot||'').trim(), found:false, dens:null, densSrc:'',
                  wt:null, wtSrc:'', vol:null, refLot:'', gap:null, far:false,
                  scanning:false, pure:'' };

    /* Bồn chứa hàng Pure thì không có lot mix nào để tra */
    const pt = pureType(type);
    if(pt){
      out.pure = pt;
      out.dens = tableDensity(pt==='C4'?'c4':'c3', pureTemp());
      out.densSrc = 'pure';
      out.wt = (pt==='C3') ? 100 : 0;
      out.wtSrc = 'pure';
      return out;
    }

    const list = pool();
    const row  = findLot(out.lot, tank, list);
    if(row){
      out.found = true;
      out.vol = row.vol;
      if(row.dens>0){ out.dens = row.dens; out.densSrc = 'coq'; }
      if(row.wt!=null){ out.wt = row.wt; out.wtSrc = 'coq'; }
    }

    /* thiếu density HOẶC thiếu %wt ⇒ mượn cả hai từ MỘT lot gần nhất */
    if(out.dens==null || out.wt==null){
      let target = row ? { vol:row.vol, wt:row.wt } : null;
      if(!target || (target.vol==null && target.wt==null)){
        const rc = ratioC3(type);
        if(rc!=null) target = { vol:rc, wt:null };
      }
      if(target && (target.vol!=null || target.wt!=null)){
        const hit = nearest(target, list, row ? row.k : 0);
        if(hit){
          out.refLot = hit.c.lot; out.gap = hit.gap; out.far = hit.gap>GAP_WARN;
          if(out.dens==null){ out.dens = hit.c.dens; out.densSrc = 'near'; }
          if(out.wt==null && hit.c.wt!=null){ out.wt = hit.c.wt; out.wtSrc = 'near'; }
          if(out.vol==null) out.vol = target.vol;
        } else if(!_hist && !_scanFailed){
          scan();
          out.scanning = true;
        }
      }
    }
    if(out.dens==null){ out.dens = manualDensity(); out.densSrc = 'manual'; }
    return out;
  }

  /* Safe Fill Allow (kg) cho một cap bồn xe — null khi không có cap */
  function kg(capM3, ctx){
    const cap = _num(capM3);
    if(!(cap>0)) return null;
    const r = resolve(ctx);
    return Math.round(cap * r.dens * fillPct() * 1000);
  }
  /* Cùng một lần giải — trả cả số kg lẫn nguồn, để UI khỏi gọi hai lượt */
  function kgInfo(capM3, ctx){
    const cap = _num(capM3);
    const r = resolve(ctx);
    r.kg = (cap>0) ? Math.round(cap * r.dens * fillPct() * 1000) : null;
    return r;
  }
  /* Câu mô tả ngắn cho tooltip / dòng GW AVG ref (TIẾNG ANH — luật V4) */
  function note(r){
    if(!r) return '';
    const d = (Math.round(r.dens*10000)/10000).toFixed(4);
    if(r.src==='lot')  return 'ρ '+d+' — lot '+r.lot;
    if(r.src==='pure') return 'ρ '+d+' — '+r.label;
    if(r.src==='near'){
      const g = (r.gap==null) ? '' : (' , Δ'+(Math.round(r.gap*10)/10)+' pt');
      return 'ρ '+d+' — nearest lot '+r.lot+' by %'+(r.basis==='wt'?'wt':'vol')+' C3'+g
             + (r.far ? ' ⚠ far from target' : '');
    }
    if(r.scanning) return 'ρ '+d+' — manual (scanning Tank Log…)';
    return 'ρ '+d+' — manual';
  }

  return {
    resolve, kg, kgInfo, note, tankInfo,
    scan, onReady, reset,
    manualDensity, fillPct, pureTemp,
    tableDensity, pureType, ratioC3, nearest, findLot, pool,
    get scanning(){ return _scanning; },
    get loaded(){ return !!_hist; },
    COLS: { LOT:C_LOT, TANK:C_TANK, DATE:C_DATE, PCT_C3:C_PCT_C3,
            TGT_C3:C_TGT_C3, DENS:C_DENS, COQ_VOL:C_COQ_VOL, COQ_WT:C_COQ_WT },
    GAP_WARN: GAP_WARN
  };
})();
try{ window.SFDENS = SFDENS; }catch(_){}
if(typeof module!=='undefined' && module.exports) module.exports = SFDENS;
