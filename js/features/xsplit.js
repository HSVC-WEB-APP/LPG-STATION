/* ============================================================
 * XSPLIT  —  xsplit.js            (v4.136)
 * ------------------------------------------------------------
 * Global xuất ra : window.XSPLIT
 * Gọi từ         : nút 🔀 trên THẺ TK-3501 / TK-3502 của tab Scale
 *                  (scx2.js · _buildTankExtras) — bấm ở thẻ nào cũng
 *                  mở CÙNG một bảng, thẻ vừa bấm chỉ quyết định bồn
 *                  GI mặc định.
 * ------------------------------------------------------------
 * BÀI TOÁN THẬT (nguồn: Calculation TK3502.xlsx, 04/09/2026)
 *
 *   Có xe vì lý do vận hành phải lấy hàng từ CẢ HAI ball tank
 *   (vd xe 86773703: 24.120 kg = 14.310 từ TK-3501 + 9.810 từ TK-3502),
 *   nhưng phiếu cân và bút toán GI trên WMS chỉ làm được từ MỘT bồn.
 *
 *   ⇒ Phần khối lượng đã bán từ bồn KIA phải:
 *       1) tách ra C3 / C4 theo %wt COQ của LOT bồn đó, rồi
 *       2) cross-transfer trên WMS về hết bồn sẽ GI.
 *
 *   Ví dụ trong file Excel: 51.650 kg lấy từ TK-3502, %wt 51,72/48,28
 *       → C3 26.713 kg · C4 24.937 kg  chuyển TK-3502 ➜ TK-3501.
 *
 * VÌ SAO KHÔNG PHẢI LÚC NÀO CŨNG CHUYỂN TRỌN CỤC
 *   Chuyển hết cục lớn ⇒ tổng GI dồn về một bồn có thể LỚN HƠN lượng
 *   LPG bồn đó thực có theo COQ (kiểm được bằng lot đã xuất hàng).
 *   Nếu KL lấy từ một bồn đủ trọn 1–2–3 xe thì GI trọn mấy xe đó ngay
 *   tại bồn đó, chỉ phần DƯ nhỏ mới phải chuyển sang bồn kia:
 *       GI tại TK-3502 xe 25.340 + 25.060 = 50.400
 *       thực lấy từ TK-3502            = 51.650
 *       ⇒ chỉ còn 1.250 kg phải chuyển  (thay vì 51.650 kg)
 *
 * CÁCH LÀM CỦA MÔ-ĐUN
 *   • Tìm xe theo NGÀY / biển số / tài xế / DO / khách trong TL Data.
 *   • Mỗi dòng chọn: app lấy sẵn Net Weight · bồn · lot từ TL; nhân
 *     viên chỉ gõ MỘT số = KL lấy từ bồn KIA, phần còn lại tự suy.
 *   • %wt C3 lấy theo COQ của lot (ENG.findRowByLotTank → filledBy),
 *     gõ tay đè lên được khi lot chưa có COQ.
 *   • Duyệt MỌI cách gán xe → bồn GI (n ≤ 18 duyệt hết, đông hơn thì
 *     tham lam + đổi chỗ), xếp theo KL phải chuyển kho NHỎ NHẤT.
 *   • Cảnh báo khi tổng GI dồn vào một bồn vượt LPG của lot theo COQ.
 *
 * KHÔNG GHI GÌ CẢ — mọi số nằm trong RAM và SỐNG SUỐT PHIÊN LÀM VIỆC:
 *   đóng bảng đi làm việc khác rồi mở lại vẫn còn nguyên danh sách xe
 *   và các số đã gõ (yêu cầu của vận hành). Muốn trắng thì bấm ✕ CLEAR.
 *   Không đụng Firebase ⇒ không tốn quota, không sửa nhầm TL Data.
 *
 * ⚠ MỌI CHUỖI HIỂN THỊ TRONG BẢNG NÀY PHẢI LÀ TIẾNG ANH (luật chung V4).
 * ⚠ Ô nhập dùng type="text" + cập nhật TẠI CHỖ, KHÔNG vẽ lại cả bảng khi
 *   gõ — đúng bài học v4.114 (ô đơ / mất con trỏ).
 * ------------------------------------------------------------
 * API: XSPLIT.open(sloc|1|2) · close() · plan(inp) [thuần tính, cho test]
 * ============================================================ */
const XSPLIT = (function(){

  const TKNM  = { '2100':'TK-3501', '2101':'TK-3502' };
  const OTHER = { '2100':'2101', '2101':'2100' };
  const SLOCS = ['2100','2101'];
  const MAX_EXACT = 18;          /* 2^18 = 262.144 tổ hợp — duyệt hết vẫn nhanh */

  /* ── TRẠNG THÁI RAM (sống suốt phiên) ── */
  const S = {
    gi   : '2100',                       /* bồn GI mặc định = thẻ vừa bấm */
    picks: [],                           /* [{rid, other}] other = kg lấy từ bồn KIA */
    lot  : { '2100':'', '2101':'' },     /* lot dùng làm nền COQ */
    w3   : { '2100':'', '2101':'' },     /* %wt C3 gõ tay (rỗng = theo COQ) */
    cap  : { '2100':'', '2101':'' },     /* LPG khả dụng gõ tay (kg, rỗng = COQ) */
    date : '', q:'', sel:0
  };
  let _P = null;                         /* kết quả plan() gần nhất */

  /* ── tiện ích ── */
  function _n(v){
    if(v==null) return NaN;
    const s=String(v).replace(/,/g,'').trim();
    if(!s) return NaN;
    const x=parseFloat(s);
    return isFinite(x)?x:NaN;
  }
  function _kg(n){ const x=_n(n); return Math.round(isFinite(x)?x:0).toLocaleString('en-US'); }
  function _esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _slocOf(t){
    const s=String(t||'').toUpperCase();
    if(s.indexOf('3501')>=0) return '2100';
    if(s.indexOf('3502')>=0) return '2101';
    return '';
  }
  function _normVN(s){
    return String(s||'').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ');
  }
  function _todayDdmmyy(){
    const d=new Date(), p=n=>String(n).padStart(2,'0');
    return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(-2);
  }
  function _isoToDdmmyy(iso){
    const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[3]+'/'+m[2]+'/'+m[1].slice(-2) : '';
  }
  function _ddmmyyToIso(s){
    const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(!m) return '';
    const y=m[3].length===2?'20'+m[3]:m[3];
    return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  }
  /* Lot hiển thị rút gọn: "LPG-2026-400" → "400" (đúng lối của thẻ tank ở
     Scale). Số đầy đủ vẫn nằm ở tooltip để tra khi cần. */
  function _shortLot(l){ return String(l||'').replace(/^LPG-\d{4}-/i,''); }
  function _rows(){ return (typeof TL!=='undefined' && TL.ROWS) ? TL.ROWS : {}; }
  function _row(rid){ const R=_rows(); return R?R[rid]:null; }

  /* ── nền COQ của một lot trong một bồn ────────────────────────────
     Trả về {w3, lpg, src}:
       w3  — tỉ lệ C3 (0..1) suy từ Filled C3/C4 theo ĐÚNG phương pháp
             đã chọn cho lot đó ở Tank Log (COQ trước, GC khi chưa có).
       lpg — LPG của lot (kg) để đối chiếu "GI có vượt hàng của bồn không".
     Tank Log chưa nạp đủ (ENG.allLoaded=false) thì trả rỗng — nhân
     viên gõ tay %wt, KHÔNG được đoán bừa. */
  function _coqOf(sloc, lot){
    const out={ w3:null, lpg:null, src:'' };
    const L=String(lot||'').trim();
    if(!L) return out;
    try{
      if(typeof ENG==='undefined' || !ENG.findRowByLotTank) return out;
      const row=ENG.findRowByLotTank(L, TKNM[sloc]);
      if(!row) return out;
      if(ENG.filledBy){
        const f=ENG.filledBy(row);
        const c3=Math.abs(_n(f.c3)||0), c4=Math.abs(_n(f.c4)||0), t=c3+c4;
        if(t>0){ out.w3=c3/t; out.src=f.method||''; }
      }
      if(ENG.lpgOf){
        const l=ENG.lpgOf(row);
        if(l && l.v!=null && isFinite(l.v)) out.lpg=Math.abs(l.v)*1000;   /* tấn → kg */
      }
    }catch(_){ }
    return out;
  }

  /* Lot mặc định của một bồn: lot xuất hiện nhiều nhất trong các dòng đã
     chọn của bồn đó; không có thì lấy lot đang gắn trên thẻ tank ở Scale. */
  function _defLot(sloc){
    const cnt={};
    S.picks.forEach(p=>{
      const r=_row(p.rid); if(!r) return;
      if(_slocOf(r.ltank)!==sloc) return;
      const l=String(r.lot||'').trim(); if(!l) return;
      cnt[l]=(cnt[l]||0)+1;
    });
    let best='', n=0;
    Object.keys(cnt).forEach(k=>{ if(cnt[k]>n){ n=cnt[k]; best=k; } });
    if(best) return best;
    try{
      const cfg=(typeof SCALE!=='undefined'&&SCALE.getTkCfg)?SCALE.getTkCfg():null;
      const c=cfg?cfg[sloc==='2100'?'tk1':'tk2']:null;
      if(c && c.lot) return String(c.lot);
    }catch(_){ }
    return '';
  }

  /* %wt C3 dùng cho một bồn — gõ tay đè lên COQ. Nhận cả "51.72" lẫn
     "0.5172"; số ngoài khoảng (0,100] bị bỏ qua thay vì ra tỉ lệ vô lý. */
  function _w3Of(sloc){
    const typed=_n(S.w3[sloc]);
    if(isFinite(typed) && typed>0 && typed<=100) return typed>1 ? typed/100 : typed;
    const c=_coqOf(sloc, S.lot[sloc]);
    if(c.w3!=null) return c.w3;
    try{
      if(typeof INV!=='undefined' && INV.stockFor){
        const st=INV.stockFor(sloc);
        if(st && st.hasInit && isFinite(st.wtC3) && st.wtC3>0 && st.wtC3<100) return st.wtC3/100;
      }
    }catch(_){ }
    return null;
  }
  function _capOf(sloc){
    const typed=_n(S.cap[sloc]);
    if(isFinite(typed) && typed>0) return typed;
    const c=_coqOf(sloc, S.lot[sloc]);
    return c.lpg!=null ? c.lpg : null;
  }
  /* KL đã ghi trên TL cho (bồn + lot) NHƯNG KHÔNG kể mấy dòng đang chọn —
     đây là phần GI "cứng" đã có, cộng với phương án mới ra tổng dự kiến. */
  function _baseOf(sloc){
    const lot=String(S.lot[sloc]||'').trim();
    if(!lot) return 0;
    const picked={}; S.picks.forEach(p=>picked[p.rid]=1);
    const R=_rows(); let sum=0;
    Object.keys(R).forEach(rid=>{
      const r=R[rid];
      if(!r || r.disabled || picked[rid]) return;
      if(_slocOf(r.ltank)!==sloc) return;
      if(String(r.lot||'').trim()!==lot) return;
      const q=_n(r.lpgQty); if(isFinite(q)) sum+=q;
    });
    return sum;
  }

  /* ══════════════════════════════════════════════════════════════
     plan(inp) — TOÀN BỘ PHÉP TÍNH, THUẦN HÀM (không đụng DOM).
     inp = { trucks:[{id, net, home:'2100'|'2101', other}],
             w3:{'2100':0..1,'2101':0..1},
             base:{'2100':kg,'2101':kg}, cap:{'2100':kg|null,...}, max }
     → { ok, err, qty, total, opts:[…] }
     opts[i] = { mask, giKg, ids:{'2100':[],'2101':[]}, res, amount,
                 from, to, c3, c4, cross, over:[…], all }
       res    = GI tại 2101 − hàng thật lấy từ 2101
       amount = |res| = KL phải chuyển kho; from → to là CHIỀU chuyển
       c3+c4  = amount ĐÚNG TỪNG KG (làm tròn C3, C4 lấy phần bù)
     ══════════════════════════════════════════════════════════════ */
  function plan(inp){
    inp=inp||{};
    const T=inp.trucks||[], w3=inp.w3||{}, base=inp.base||{}, cap=inp.cap||{};
    const maxOpt=inp.max||5;
    const out={ ok:false, err:'', n:T.length, exhaustive:true, total:0,
                qty:{'2100':0,'2101':0}, opts:[] };
    if(!T.length){ out.err='no-trucks'; return out; }

    const rows=[];
    for(let i=0;i<T.length;i++){
      const t=T[i]||{};
      const net=Math.round(_n(t.net)||0);
      const home=(t.home==='2101')?'2101':'2100';
      const oth=Math.round(_n(t.other)||0);
      if(!(net>0)){ out.err='bad-net'; out.badId=t.id; return out; }
      if(!(oth>=0) || oth>net){ out.err='bad-other'; out.badId=t.id; return out; }
      const q={'2100':0,'2101':0};
      q[home]=net-oth; q[OTHER[home]]=oth;
      out.qty['2100']+=q['2100']; out.qty['2101']+=q['2101'];
      out.total+=net;
      rows.push({ id:(t.id!=null?t.id:i), net, home, other:oth, q,
                  major:(q['2101']>q['2100']?'2101':'2100') });
    }
    const n=rows.length, B=out.qty['2101'], TOT=out.total;

    /* ── mọi giá trị "GI tại 2101" đạt được, giữ tổ hợp ÍT XE BỊ GÁN
          NGƯỢC nhất cho mỗi giá trị (dễ giải thích cho người vận hành) ── */
    const best=new Map();                 /* giB → {mask, cross} */
    const keep=(mask,giB,cross)=>{
      const p=best.get(giB);
      if(!p || cross<p.cross) best.set(giB,{mask,cross});
    };
    const crossOf=m=>{
      let c=0;
      for(let i=0;i<n;i++) if((((m>>i)&1)?'2101':'2100')!==rows[i].major) c++;
      return c;
    };
    if(n<=MAX_EXACT){
      const lim=1<<n;
      for(let m=0;m<lim;m++){
        let giB=0, cross=0;
        for(let i=0;i<n;i++){
          const at=(m>>i)&1;
          if(at) giB+=rows[i].net;
          if((at?'2101':'2100')!==rows[i].major) cross++;
        }
        keep(m,giB,cross);
      }
    }else{
      /* Quá đông để duyệt hết: xếp xe lớn trước, mỗi xe cho vào bên nào
         kéo tổng GI-2101 gần B hơn, rồi thử ĐỔI CHỖ từng xe một lượt. */
      out.exhaustive=false;
      const idx=rows.map((r,i)=>i).sort((a,b)=>rows[b].net-rows[a].net);
      let mask=0, giB=0;
      idx.forEach(i=>{
        const withIt=Math.abs(giB+rows[i].net-B), without=Math.abs(giB-B);
        if(withIt<without){ mask|=(1<<i); giB+=rows[i].net; }
      });
      keep(mask,giB,crossOf(mask));
      for(let i=0;i<n;i++){
        const m2=mask^(1<<i);
        let g=0; for(let j=0;j<n;j++) if((m2>>j)&1) g+=rows[j].net;
        keep(m2,g,crossOf(m2));
      }
      keep(0,0,crossOf(0));
      keep((1<<n)-1,TOT,crossOf((1<<n)-1));
    }

    const cands=[];
    best.forEach((v,giB)=>cands.push({ mask:v.mask, giB, cross:v.cross }));
    cands.sort((a,b)=>{
      const da=Math.abs(a.giB-B), db=Math.abs(b.giB-B);
      if(da!==db) return da-db;
      if(a.cross!==b.cross) return a.cross-b.cross;
      return a.mask-b.mask;
    });

    const mk=c=>{
      const res=c.giB-B;                       /* >0 ⇒ GI ở 2101 nhiều hơn hàng 2101 có */
      const amount=Math.abs(res);
      const from=res>0?'2100':'2101', to=OTHER[from];
      const w=w3[from];
      let c3=null, c4=null;
      if(amount>0 && w!=null && isFinite(w) && w>=0 && w<=1){
        c3=Math.round(amount*w); c4=amount-c3;   /* cộng lại KHỚP TỪNG KG */
      }
      const ids={'2100':[],'2101':[]};
      rows.forEach((r,i)=>ids[((c.mask>>i)&1)?'2101':'2100'].push(r.id));
      const giKg={ '2100':TOT-c.giB, '2101':c.giB };
      const over=[];
      SLOCS.forEach(s=>{
        const cp=cap[s];
        if(cp!=null && isFinite(cp) && cp>0){
          const proj=(_n(base[s])||0)+giKg[s];
          if(proj>cp+0.5) over.push({ sloc:s, proj, cap:cp, by:Math.round(proj-cp) });
        }
      });
      return { mask:c.mask, giB:c.giB, giKg, ids, res, amount, from, to, c3, c4,
               cross:c.cross, over,
               all:(c.mask===0?'2100':(c.mask===((1<<n)-1)?'2101':null)) };
    };

    const picked=[], seen={};
    cands.forEach(c=>{
      if(picked.length>=maxOpt || seen[c.mask]) return;
      seen[c.mask]=1; picked.push(mk(c));
    });
    /* Luôn kèm phương án CHUYỂN TRỌN CỤC (GI hết tại một bồn) để so sánh */
    [0,(1<<n)-1].forEach(m=>{
      if(seen[m]) return;
      let g=0; for(let j=0;j<n;j++) if((m>>j)&1) g+=rows[j].net;
      seen[m]=1; picked.push(mk({ mask:m, giB:g, cross:crossOf(m) }));
    });
    out.opts=picked; out.ok=true;
    return out;
  }

  /* ══════════════════ Bảng: gom dữ liệu từ RAM ══════════════════ */
  function _trucks(){
    const list=[];
    S.picks.forEach(p=>{
      const r=_row(p.rid); if(!r) return;
      const home=_slocOf(r.ltank);
      const net=_n(r.lpgQty);
      list.push({ id:p.rid, net:isFinite(net)?net:0, home:home||'2100',
                  other:_n(p.other)||0, _row:r, _noTank:!home });
    });
    return list;
  }
  function _run(){
    const tr=_trucks();
    _P=plan({ trucks:tr.map(t=>({id:t.id,net:t.net,home:t.home,other:t.other})),
              w3 :{ '2100':_w3Of('2100'), '2101':_w3Of('2101') },
              base:{ '2100':_baseOf('2100'), '2101':_baseOf('2101') },
              cap :{ '2100':_capOf('2100'), '2101':_capOf('2101') },
              max:5 });
    if(S.sel>=(_P.opts||[]).length) S.sel=0;
    return _P;
  }

  /* ══════════════════ Tìm xe trong TL Data ══════════════════ */
  /* v4.137 — KHÔNG đổ cả danh sách xe ra màn hình. Chưa gõ gì thì trả rỗng;
     phải gõ ít nhất 2 ký tự (biển số / tài xế / DO / khách) mới tra. Ngày chỉ
     là bộ LỌC THÊM, không phải cái để liệt kê. */
  function _find(){
    const R=_rows(), q=_normVN(S.q), day=S.date;
    if(q.length<2) return [];
    const picked={}; S.picks.forEach(p=>picked[p.rid]=1);
    const out=[];
    Object.keys(R).forEach(rid=>{
      const r=R[rid];
      if(!r || r.disabled || picked[rid]) return;
      if(day && String(r.date||'').trim()!==day && String(r.giDate||'').trim()!==day) return;
      if(q){
        const hay=_normVN([r.truck,r.rmooc,r.driver,r.doNo,r.cust,r.custFull,r.lot,r.ltank].join(' '));
        if(hay.indexOf(q)<0) return;
      }
      out.push(Object.assign({rid},r));
    });
    out.sort((a,b)=>{
      const k=x=>_ddmmyyToIso(x.date||x.giDate||'')+'|'+String(x.scaleNo||'').padStart(2,'0')
                +'|'+String(x.turn||'').padStart(3,'0');
      return k(a).localeCompare(k(b));
    });
    return out.slice(0,8);
  }

  /* ══════════════════ Vẽ ══════════════════ */
  function _renderFind(){
    const box=document.getElementById('xsRes'); if(!box) return;
    const typed=_normVN(S.q).length>=2;
    if(!typed){                       /* chưa gõ ⇒ khung biến mất hẳn */
      box.className='xs-res'; box.innerHTML='';
      return;
    }
    const rows=_find();
    box.className='xs-res on';
    if(!rows.length){
      box.innerHTML='<div class="xs-res-empty">No TL row matches'
        +(S.date?(' on '+_esc(S.date)+' — press All dates to widen'):'')+'.</div>';
      return;
    }
    box.innerHTML=rows.map(r=>{
      const sl=_slocOf(r.ltank);
      return '<button class="xs-res-row'+(sl?(' s'+sl):' notk')+'" onclick="XSPLIT.add(\''+_esc(r.rid)+'\')">'
        +'<span class="plus">+</span>'
        +'<span class="t">'+_esc(r.truck||'—')+'</span>'
        +'<span class="dr">'+_esc(r.driver||'')+'</span>'
        +'<span class="d">'+_esc(r.date||r.giDate||'')+'</span>'
        +'<span class="tk">'+(sl?TKNM[sl]:'no tank')+(r.lot?(' · '+_esc(_shortLot(r.lot))):'')+'</span>'
        +'<span class="n">'+_kg(r.lpgQty)+'</span></button>';
    }).join('');
  }

  function _renderTanks(){
    const box=document.getElementById('xsTanks'); if(!box) return;
    box.innerHTML=SLOCS.map(s=>{
      const c=_coqOf(s,S.lot[s]);
      const w=_w3Of(s);
      const cap=_capOf(s);
      const basis=c.w3!=null
        ? ((c.src==='gc'?'GC':'COQ')+' basis '+(c.w3*100).toFixed(2)+' / '+((1-c.w3)*100).toFixed(2))
        : 'no COQ for this lot — type %wt C3 by hand';
      return '<div class="xs-tk p'+s+(S.gi===s?' gi':'')+'">'
        +'<div class="xs-tk-hd"><b>'+TKNM[s]+'</b><span class="sl">SLoc '+s+'</span>'
        +  '<button class="xs-gi-btn'+(S.gi===s?' on':'')+'" onclick="XSPLIT.setGi(\''+s+'\')"'
        +  ' title="Tank used as the GI tank in the full-transfer option">'+(S.gi===s?'★ GI TANK':'set as GI')+'</button></div>'
        +'<div class="xs-tk-f">'
        +  '<label><span>LOT</span><input type="text" maxlength="20" id="xsLot'+s+'" value="'+_esc(S.lot[s])+'"'
        +    ' autocomplete="off" oninput="XSPLIT.setLot(\''+s+'\',this.value)"></label>'
        +  '<label><span>%wt C3</span><input type="text" inputmode="decimal" id="xsW3'+s+'" value="'+_esc(S.w3[s])+'"'
        +    ' placeholder="'+(c.w3!=null?(c.w3*100).toFixed(2):'—')+'" autocomplete="off"'
        +    ' oninput="XSPLIT.setW3(\''+s+'\',this.value)"></label>'
        +  '<label><span>LOT LPG · kg</span><input type="text" inputmode="decimal" id="xsCap'+s+'" value="'+_esc(S.cap[s])+'"'
        +    ' placeholder="'+(c.lpg!=null?Math.round(c.lpg).toLocaleString('en-US'):'—')+'" autocomplete="off"'
        +    ' oninput="XSPLIT.setCap(\''+s+'\',this.value)"></label>'
        +'</div>'
        +'<div class="xs-tk-b">'+_esc(basis)+'</div>'
        +'<div class="xs-tk-s">'
        +  '<span class="st"><i>USED %wt C3 / C4</i><b>'+(w!=null?((w*100).toFixed(2)+' / '+((1-w)*100).toFixed(2)):'—')+'</b></span>'
        +  '<span class="st"><i>TAKEN · kg</i><b id="xsTaken'+s+'">—</b></span>'
        +  '<span class="st"><i>ALREADY ON TL</i><b>'+_kg(_baseOf(s))+'</b></span>'
        +  '<span class="st"><i>LOT LPG · kg</i><b>'+(cap!=null?_kg(cap):'—')+'</b></span>'
        +'</div></div>';
    }).join('');
  }

  function _renderTbl(){
    const box=document.getElementById('xsTbl'); if(!box) return;
    const tr=_trucks();
    if(!tr.length){
      box.innerHTML='<div class="xs-empty">Type a truck plate or a driver name above, then click the row to add it here.</div>';
      return;
    }
    const head='<div class="xs-r xs-hd">'
      +'<span class="c x"></span><span class="c d">DATE</span><span class="c t">TRUCK</span>'
      +'<span class="c dr">DRIVER</span><span class="c do">DO No.</span>'
      +'<span class="c tk">TL TANK · LOT</span><span class="c n">NET WT</span>'
      +'<span class="c in">kg FROM OTHER TANK</span>'
      +'<span class="c n a">@ TK-3501</span><span class="c n b">@ TK-3502</span>'
      +'<span class="c gi">GI AT</span></div>';
    const body=tr.map(t=>{
      const r=t._row, oth=OTHER[t.home];
      const q={'2100':0,'2101':0};
      q[t.home]=t.net-t.other; q[oth]=t.other;
      const bad=!(t.other>=0) || t.other>t.net;
      return '<div class="xs-r'+(bad?' bad':'')+(t._noTank?' notk':'')+'" id="xsR'+_esc(t.id)+'">'
        +'<span class="c x"><button onclick="XSPLIT.del(\''+_esc(t.id)+'\')" title="Remove this row">✕</button></span>'
        +'<span class="c d">'+_esc(r.date||r.giDate||'—')+'</span>'
        +'<span class="c t">'+_esc(r.truck||'—')+'</span>'
        +'<span class="c dr">'+_esc(r.driver||'')+'</span>'
        +'<span class="c do">'+_esc(r.doNo||'')+'</span>'
        +'<span class="c tk s'+t.home+'" title="'+_esc(r.lot||'')+'">'
        +  (t._noTank?'⚠ no tank on TL':TKNM[t.home])
        +  (r.lot?('<i>lot '+_esc(_shortLot(r.lot))+'</i>'):'')+'</span>'
        +'<span class="c n">'+_kg(t.net)+'</span>'
        +'<span class="c in"><input type="text" inputmode="decimal" id="xsO'+_esc(t.id)+'"'
        +  ' value="'+(t.other?String(Math.round(t.other)):'')+'" placeholder="kg from '+TKNM[oth]+'"'
        +  ' autocomplete="off" oninput="XSPLIT.setOther(\''+_esc(t.id)+'\',this.value)"></span>'
        +'<span class="c n a" id="xsA'+_esc(t.id)+'">'+_kg(q['2100'])+'</span>'
        +'<span class="c n b" id="xsB'+_esc(t.id)+'">'+_kg(q['2101'])+'</span>'
        +'<span class="c gi" id="xsG'+_esc(t.id)+'">—</span>'
        +'</div>';
    }).join('');
    const foot='<div class="xs-r xs-ft">'
      +'<span class="c x"></span><span class="c d"></span>'
      +'<span class="c t">TOTAL · '+tr.length+' row'+(tr.length===1?'':'s')+'</span>'
      +'<span class="c dr"></span><span class="c do"></span><span class="c tk"></span>'
      +'<span class="c n" id="xsTotNet">—</span><span class="c in"></span>'
      +'<span class="c n a" id="xsTot2100">—</span><span class="c n b" id="xsTot2101">—</span>'
      +'<span class="c gi"></span></div>';
    box.innerHTML=head+body+foot;
  }

  /* Chỉ vẽ lại VÙNG KẾT QUẢ + mấy ô suy ra — gõ số không được đụng
     vào chính ô đang gõ (bài học v4.114). */
  function _renderOut(){
    const P=_run();
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    _trucks().forEach(t=>{
      const q={'2100':0,'2101':0};
      q[t.home]=t.net-t.other; q[OTHER[t.home]]=t.other;
      set('xsA'+t.id,_kg(q['2100'])); set('xsB'+t.id,_kg(q['2101']));
      const row=document.getElementById('xsR'+t.id);
      if(row) row.classList.toggle('bad', !(t.other>=0) || t.other>t.net);
    });
    set('xsTotNet',_kg(P.total)); set('xsTot2100',_kg(P.qty['2100'])); set('xsTot2101',_kg(P.qty['2101']));
    set('xsTaken2100',_kg(P.qty['2100'])); set('xsTaken2101',_kg(P.qty['2101']));

    const box=document.getElementById('xsOut'); if(!box) return;
    if(!P.ok){
      const msg = P.err==='no-trucks' ? 'Pick at least one truck.'
                : P.err==='bad-other' ? 'A "from other tank" figure is bigger than that row’s net weight — fix the red row.'
                : 'Net weight is missing on one of the picked rows.';
      box.innerHTML='<div class="xs-warn">'+_esc(msg)+'</div>';
      return;
    }
    const gap = P.qty['2100']===0 || P.qty['2101']===0;
    const head='<div class="xs-out-hd">'
      +'<span>Actually taken — <b class="a">'+TKNM['2100']+' '+_kg(P.qty['2100'])+' kg</b>'
      +' · <b class="b">'+TKNM['2101']+' '+_kg(P.qty['2101'])+' kg</b></span>'
      +(gap?'<span class="xs-note">Every kg sits on one tank — type the split per row to get a cross-transfer.</span>':'')
      +(P.exhaustive?'':'<span class="xs-note">Too many rows for a full search — showing the best combinations found.</span>')
      +'</div>';
    const opts=P.opts.map((o,i)=>{
      const nm=x=>{ const r=_row(x); return r?(r.truck||r.doNo||x):x; };
      const listA=o.ids['2100'].map(nm), listB=o.ids['2101'].map(nm);
      const tag = o.all ? ('FULL TRANSFER · every row GI at '+TKNM[o.all])
                        : (i===0?'★ SMALLEST TRANSFER':'ALTERNATIVE');
      const money = o.amount===0
        ? '<b class="ok">No cross-transfer needed — GI lines up with what each tank gave.</b>'
        : ('<b class="mv">'+TKNM[o.from]+' ➜ '+TKNM[o.to]+'</b>'
           +'<span class="amt">'+_kg(o.amount)+' kg</span>'
           +(o.c3!=null
              ? '<span class="c3">C3 '+_kg(o.c3)+'</span><span class="c4">C4 '+_kg(o.c4)+'</span>'
              : '<span class="miss">⚠ %wt C3 of '+TKNM[o.from]+' unknown — type it above to split C3/C4</span>'));
      const warn=o.over.map(v=>'<span class="xs-over">⚠ GI at '+TKNM[v.sloc]+' '+_kg(v.proj)
        +' kg exceeds the lot LPG ('+_kg(v.cap)+' kg) by '+_kg(v.by)+' kg</span>').join('');
      return '<div class="xs-opt'+(S.sel===i?' on':'')+(o.over.length?' over':'')+'" onclick="XSPLIT.pick('+i+')">'
        +'<div class="xs-opt-hd"><span class="tag'+(i===0&&!o.all?' best':'')+'">'+tag+'</span>'
        +  '<button class="xs-copy" onclick="event.stopPropagation();XSPLIT.copy('+i+')" title="Copy the transfer figures">⧉ COPY</button></div>'
        +'<div class="xs-opt-mv">'+money+'</div>'
        +'<div class="xs-opt-gi">'
        +  '<span class="g a"><i>GI at '+TKNM['2100']+'</i>'+_kg(o.giKg['2100'])+' kg'
        +    (listA.length?('<u>'+listA.map(_esc).join(', ')+'</u>'):'<u>none</u>')+'</span>'
        +  '<span class="g b"><i>GI at '+TKNM['2101']+'</i>'+_kg(o.giKg['2101'])+' kg'
        +    (listB.length?('<u>'+listB.map(_esc).join(', ')+'</u>'):'<u>none</u>')+'</span>'
        +'</div>'+(warn?('<div class="xs-opt-warn">'+warn+'</div>'):'')+'</div>';
    }).join('');
    box.innerHTML=head+'<div class="xs-opts">'+opts+'</div>';

    /* cột GI AT của bảng xe theo phương án đang chọn */
    const o=P.opts[S.sel];
    if(o){
      const at={}; o.ids['2100'].forEach(x=>at[x]='2100'); o.ids['2101'].forEach(x=>at[x]='2101');
      _trucks().forEach(t=>{
        const el=document.getElementById('xsG'+t.id); if(!el) return;
        const s=at[t.id];
        el.textContent=s?TKNM[s]:'—';
        el.className='c gi'+(s?(' s'+s+(s!==t.home?' moved':'')):'');
      });
    }
  }

  function _renderAll(){ _renderTanks(); _renderTbl(); _renderOut(); _renderFind(); }

  /* ══════════════════ Thao tác ══════════════════ */
  function add(rid){
    if(!rid || S.picks.some(p=>p.rid===rid)) return;
    const r=_row(rid); if(!r){ if(typeof toast==='function') toast('TL row not found','er'); return; }
    S.picks.push({ rid, other:0 });
    const sl=_slocOf(r.ltank);
    if(sl && !S.lot[sl] && r.lot) S.lot[sl]=String(r.lot);
    SLOCS.forEach(s=>{ if(!S.lot[s]) S.lot[s]=_defLot(s); });
    /* v4.137 — chọn xong là ô tìm trắng lại và danh sách biến mất: xe đã chọn
       nằm ở bảng dưới, nhân viên gõ tiếp biển số xe sau. */
    S.q='';
    const si=document.getElementById('xsSearch');
    if(si){ si.value=''; try{ si.focus(); }catch(_){ } }
    _renderAll();
  }
  function del(rid){ S.picks=S.picks.filter(p=>p.rid!==rid); _renderAll(); }
  function setOther(rid,v){
    const p=S.picks.find(x=>x.rid===rid); if(!p) return;
    const n=_n(v);
    p.other=isFinite(n)?n:0;
    _renderOut();                      /* KHÔNG vẽ lại bảng ⇒ con trỏ ở nguyên chỗ */
  }
  function _refreshBasis(s){
    const c=_coqOf(s,S.lot[s]);
    const el=document.querySelector('.xs-tk.p'+s+' .xs-tk-b');
    if(el) el.textContent=c.w3!=null
      ? ((c.src==='gc'?'GC':'COQ')+' basis '+(c.w3*100).toFixed(2)+' / '+((1-c.w3)*100).toFixed(2))
      : 'no COQ for this lot — type %wt C3 by hand';
    const w=_w3Of(s);
    const st=document.querySelector('.xs-tk.p'+s+' .xs-tk-s .st b');
    if(st) st.textContent=w!=null?((w*100).toFixed(2)+' / '+((1-w)*100).toFixed(2)):'—';
  }
  function setLot(s,v){ S.lot[s]=String(v||'').trim(); _renderOut(); _refreshBasis(s); }
  function setW3 (s,v){ S.w3[s] =String(v||'').trim(); _renderOut(); _refreshBasis(s); }
  function setCap(s,v){ S.cap[s]=String(v||'').trim(); _renderOut(); }
  function setGi(s){ S.gi=s; _renderTanks(); _renderOut(); }
  function pick(i){ S.sel=i; _renderOut(); }
  function onSearch(v){ S.q=String(v||''); _renderFind(); }
  function onDate(iso){ S.date=_isoToDdmmyy(iso); _renderFind(); }
  function dateToday(){
    S.date=_todayDdmmyy();
    const el=document.getElementById('xsDate'); if(el) el.value=_ddmmyyToIso(S.date);
    _renderFind();
  }
  function dateAll(){
    S.date='';
    const el=document.getElementById('xsDate'); if(el) el.value='';
    _renderFind();
  }
  function clearAll(){
    if(S.picks.length && typeof confirm==='function'
       && !confirm('Clear every picked row and every figure typed in this window?')) return;
    S.picks=[]; S.sel=0;
    SLOCS.forEach(s=>{ S.w3[s]=''; S.cap[s]=''; });
    _renderAll();
  }
  function copy(i){
    const P=_P||_run(); const o=P.opts&&P.opts[i]; if(!o) return;
    const nm=x=>{ const r=_row(x); return r?(r.truck||r.doNo||x):x; };
    const L=[];
    if(o.amount===0) L.push('No cross-transfer needed.');
    else{
      L.push('Cross-transfer  '+TKNM[o.from]+' -> '+TKNM[o.to]);
      L.push('Total '+_kg(o.amount)+' kg'
             +(o.c3!=null?('   |   C3 '+_kg(o.c3)+' kg   |   C4 '+_kg(o.c4)+' kg'):'   |   C3/C4 split unknown'));
    }
    SLOCS.forEach(s=>{
      const ids=o.ids[s];
      L.push('GI at '+TKNM[s]+': '+_kg(o.giKg[s])+' kg'+(ids.length?('  ['+ids.map(nm).join(', ')+']'):'  [none]'));
    });
    const txt=L.join('\n');
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
      else{
        const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      if(typeof toast==='function') toast('⧉ Transfer figures copied','ok');
    }catch(_){ if(typeof toast==='function') toast('Copy failed — select the text by hand','er'); }
  }

  function open(n){
    const sl = (n==='2101'||n===2||n==='2'||String(n).indexOf('3502')>=0) ? '2101' : '2100';
    S.gi=sl;
    SLOCS.forEach(s=>{ if(!S.lot[s]) S.lot[s]=_defLot(s); });
    const di=document.getElementById('xsDate'); if(di) di.value=_ddmmyyToIso(S.date);
    const si=document.getElementById('xsSearch'); if(si) si.value=S.q;
    _renderAll();
    const m=document.getElementById('xsModal'); if(m) m.classList.add('on');
  }
  function close(){ const m=document.getElementById('xsModal'); if(m) m.classList.remove('on'); }

  return { open, close, add, del, setOther, setLot, setW3, setCap, setGi,
           pick, copy, onSearch, onDate, dateToday, dateAll, clearAll,
           /* thuần tính — dùng cho test node */
           plan, _S:S, _coqOf, _w3Of };
})();
window.XSPLIT = XSPLIT;
