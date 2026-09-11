# HSVC LPG STATION — v4 (modular)

Phần mềm quản lý trạm LPG (đội xe & chứng chỉ, kế hoạch giao hàng, cân xe, pha trộn,
tồn kho cavern, đối soát SAP/WMS, báo cáo). Dữ liệu lưu trên **Firebase Realtime
Database**. Bản này tách từ file đơn `lpg-station-v4_54_0` ra nhiều module để dễ bảo trì.

## ⭐ NGÔN NGỮ: GIAO DIỆN LÀ **TIẾNG ANH**

Chốt của người dùng, áp cho **toàn bộ V4** — không riêng tab nào.

**Phải tiếng Anh** — mọi chuỗi người dùng đọc được: tiêu đề tab/cột/thẻ, nhãn ô nhập,
placeholder, chữ trên nút, tooltip (`title=`), chip trạng thái, dải cảnh báo, `toast()`,
hộp `confirm()`/`alert()`, thông báo lỗi, tiêu đề file Excel/CSV xuất ra, nội dung modal.

**Vẫn tiếng Việt** — những thứ người dùng KHÔNG đọc trong giao diện: chú thích trong mã,
tên biến/hàm, thông điệp commit, tài liệu trong `docs/`, tên và mô tả các bài test.
Lý do giữ tiếng Việt: chú thích ghi lại *vì sao* làm thế, người bảo trì đọc bằng tiếng Việt
nhanh và chính xác hơn.

**Ngoại lệ đang tồn tại** (mã cũ, chưa chuyển): các tab dựng trước v4.106 vẫn còn chuỗi
tiếng Việt lẫn trong giao diện — sửa tới đâu chuyển tới đó, đừng viết THÊM chuỗi tiếng Việt mới.
Phần đã chuyển và **có test canh**: tab SAP/kho ngoại quan (`tests/bond-dom.smoke.js`) và
bảng ⚖ Stock-transfer reconciliation (`tests/stx-recon-dom.smoke.js`) — cả hai đều có mục
quét dấu tiếng Việt trong chuỗi hiển thị, gõ tiếng Việt vào là test đỏ ngay.

## 🔄 TODAY / TOMORROW PLAN — CHẠY TRÊN RAM, FIREBASE LÀ NGUỒN DUY NHẤT (v4.138)

Kế hoạch thay đổi liên tục trong ca, nên bảng plan **không lưu cache localStorage**.
Mở trang là lấy thẳng trạng thái trên Firebase về RAM.

| Luật | Vì sao |
|---|---|
| **KHÔNG cache localStorage cho PLAN** (`loadCache()` chỉ còn xoá blob cũ, `saveCache()` rỗng) | Cache là thứ vẽ ra số cũ ngay khi vừa đăng nhập ("F5 mới đúng") và là chỗ dòng "ma" sống dai qua nhiều phiên |
| **`_fullResync()` làm RAM giống HỆT server** — xoá dòng server không còn **và** lấy về dòng server có mà RAM thiếu/khác | Sự kiện `child_*` bị lỡ (tab ngủ, rớt mạng) không bao giờ được Firebase bắn lại |
| Chạy resync lúc: **mở trang · nối lại mạng · tab hiện ra lại (giãn 15 s) · mỗi 120 s** khi tab hiện và không ai đang gõ | Cơ chế tự phục hồi mà chỉ chạy lúc khởi động thì không phục hồi được gì cho một phiên mở cả ngày |
| **Không bao giờ đẩy dòng từ RAM lên server trong lúc resync** | Đó chính là lỗi cũ "cache ghi đè Firebase", làm sống lại đơn đã xoá ở máy khác |
| Chặn đối âm của chính mình **THEO TỪNG `_oid`** (`_fbUpdate` → `_selfEcho`), **không** dùng cờ toàn cục | Cờ toàn cục (`_suppressEcho` cũ) nuốt luôn sự kiện của MÁY KHÁC trong 600 ms quanh mỗi lệnh ghi ⇒ mất `child_removed` ⇒ **dòng trùng lặp** |
| `child_removed` **luôn** được áp dụng | Xoá là idempotent; đây đúng là sự kiện từng bị nuốt |
| Bảng rỗng khi chưa có ảnh chụp đầu tiên hiện **⏳ Loading from Firebase…** | Số 0 không được phép bị đọc nhầm là "hôm nay không có đơn" |

⚠ **Mọi lệnh ghi của plan.js phải đi qua `_fbUpdate(payload)`** — đó là chỗ duy nhất
được gọi `FB_DB.ref().update()`, và là chỗ đóng dấu đối âm. Test canh:
`tests/plan-reconcile-reconnect.test.js`.

### Dòng TRÙNG trên Firebase — vì sao có và chặn ở đâu (v4.139)

Bản xuất RTDB 09/09/2026 có **50 khoá, trong đó 18 dòng là bản sao y hệt**
(`PLN-260909-mtsjgip5x` lúc 02:35 và `PLN-260909-mtteu4zax` lúc 08:18 — giống nhau
từng ô). Đây **không** phải lỗi hiển thị: Firebase thật sự có hai bản.

Nguyên nhân: `computeDiff()` đối chiếu bảng dán với **PLAN trong RAM của máy đang dán**.
Máy đó đang giữ dữ liệu cũ/thiếu (lỗi cache đã vá ở v4.138) nên không dòng nào khớp ⇒
mọi dòng thành "thêm mới" và nhận một khoá `PLN-…` **ngẫu nhiên mới**.

| Chốt chặn (v4.139) | Ở đâu |
|---|---|
| **Dán phải quét lại Firebase TRƯỚC khi tính diff**; đọc không được thì **huỷ dán** | `runChoice()` → `_resyncNow('before-paste')` |
| **PASS 4 — khớp theo `_identKey` có xếp hàng**: N dòng cũ giống hệt ghép đúng N dòng dán (PASS 2/3 mỗi khoá chỉ giữ được MỘT dòng cũ) | `computeDiff()` |
| **Lưới cuối**: dòng "thêm mới" mà trên bảng vẫn còn dòng y hệt ⇒ không ghi, dồn vào `diff.blocked` và hiện cảnh báo 🛡 trong modal xác nhận | `computeDiff()` / `showDiff()` |
| **Khoá RÁC** (chỉ còn `{_autoSync:true}` — do một máy ghi ô lẻ vào dòng máy khác vừa xoá) không bao giờ vào RAM và được dọn khỏi Firebase | `_isJunkRow` / `_purgeJunk` |
| **🧹 Duplicates** — nút dọn các dòng trùng đã lỡ ghi: quét lại Firebase → gom nhóm → liệt kê KEEP/DELETE → người dùng bấm mới xoá. Dòng đã `loading`/`done`/có Actual luôn được giữ; nhóm mà **cả hai** dòng đã cân thì **không xoá gì**, chỉ đánh dấu xem tay | `dedupScan/dedupOpen/dedupApply` |

`_identKey` = ngày · khách · tài xế · biển số · No · qty · **DO**. Có DO trong khoá nên
hai đơn cùng xe cùng khối lượng nhưng khác DO (TOTALENERGIES 86778972 / 86778973)
**không** bị coi là trùng. Test canh: `tests/plan-dup-guard.test.js` (dựng lại đúng dữ
liệu ngày 09/09/2026).

### Dán lại (UPDATE) — đơn nào là "đã có, chỉ sửa thông tin" (v4.140)

Thứ tự khớp trong `computeDiff()`; khớp được ở vòng nào thì **giữ nguyên `_oid`** ⇒ giữ
trạng thái · Actual · nhóm 🔗 · DO tạm đã in PTT:

**Luật (chốt của người dùng 09/09/26):** đơn **đã có số DO** thì dò theo **DO** là chuẩn
nhất. Đơn **chưa có DO** thì dò theo **biển số + tên tài xế + cột No** (No đếm theo TỪNG
CỤM KHÁCH HÀNG). Nếu trùng tài xế + xe + khối lượng mà **chỉ lệch cột No** thì **hỏi
nhân viên**, không tự quyết.

| Vòng | Khoá khớp | Cứu tình huống | Tự động? |
|---|---|---|---|
| PASS 1 | **DO thật** | mạnh nhất — kệ No, kệ xe, kệ tài xế | ✔ im lặng |
| PASS 2 | khách + xe + tài xế + **No** | khớp đủ bốn ⇒ chắc chắn một đơn | ✔ im lặng |
| PASS 3 | vân tay vị trí (khách 8 ký tự + tài xế + xe + No + ngày) | dự phòng | ✔ im lặng |
| PASS 4 | `_identKey`, **xếp hàng** nhiều dòng | bảng đã có N dòng giống hệt nhau | ✔ im lặng |
| **PASS A** | khách + xe + tài xế khớp, **chỉ lệch No** | **sale chèn dòng vào giữa** làm dịch No — hay đây là chuyến thứ hai của cùng xe? | ❓ **HỎI** |
| **PASS B** | khách + No khớp, **đổi xe hoặc đổi tài xế** (còn chung xe/tài xế/rơ-moóc/DO, và mỗi bên chỉ còn đúng một dòng) | đổi tài xế cho đúng đơn cũ — hay thay hẳn đơn khác vào chỗ đó? | ❓ **HỎI** |

Hai vòng ❓ gom vào hộp thoại **"❓ Same order, or a different one?"** hiện TRƯỚC bảng xác
nhận thay đổi: mỗi cặp hiện *dòng đang có trên bảng* (kèm trạng thái · Actual · 🔗) cạnh
*dòng vừa dán*, chọn **Same order (just updated)** hay **Different order (keep both)**;
có nút "All: same" / "All: different". Dòng đang cân dở/đã cân được cảnh báo đỏ vì chọn
"different" là xoá nó. Bấm Cancel thì **không ghi gì cả**. Một dòng chỉ bị hỏi ĐÚNG MỘT
LẦN (đã hỏi ở PASS A thì PASS B không hỏi lại).

Đổi qty · tolerance · note · rmooc · cờ gate/load · cấp DO thật ⇒ **CHANGED** trên đúng
dòng cũ, không hỏi. Chỉ đơn thật sự mới mới **ADDED**; đơn biến mất khỏi sheet ⇒
**REMOVED**. Sheet lùi DO thật về trống thì **giữ** DO đã cấp.
Test canh: `tests/plan-update-repaste.test.js` (có dựng nguyên cảnh sale chèn dòng vào giữa).

**Clear All** (v4.139) cũng quét lại Firebase trước khi liệt kê ngày — trước đó nó xoá theo
danh sách trong RAM, RAM thiếu dòng nào thì dòng đó **sống sót** trên Firebase sau khi
người dùng tưởng đã xoá sạch.

## 🔗 ORDER LINKS (v4.109) — một đơn hàng, nhiều dòng kế hoạch

Sale dán kế hoạch theo **dòng xe**, nên một đơn hàng thật hay nằm trên nhiều dòng.
Nút **🔗 Link Orders** trên thanh công cụ Today Plan khai trước điều đó:

| Kiểu | Nghĩa | Phần mềm làm gì |
|---|---|---|
| **ALT** — alternate trucks | Một đơn, khai sẵn 2–3 xe, **chỉ một** xe sẽ vào lấy | Nhóm chỉ tính **MỘT** lần vào PLAN / LOADED / REMAIN (lấy qty lớn nhất). Xe nào vào station trước thì các dòng còn lại tự **park**; xe đó rời station thì tự mở lại |
| **MDO** — multi-DO | Một xe chở nhiều DO | Tổng vẫn cộng đủ. Lúc assign ở tab Scale **gộp thẳng**, bỏ hẳn popup "load together?", chỉ còn hỏi in PTT **gộp hay tách** |

Lưu ngay trên dòng kế hoạch (`_lnkG` · `_lnkK` · `_lnkPrint` · `_altSkip`) và được
mang qua re-paste, nên dán lại kế hoạch không làm mất link.
`TP.lnkTotals()` là **nguồn duy nhất** của dải Plan·Loaded·Remain (Ledger) lẫn thẻ
PLAN (tab Scale) — hai chỗ không bao giờ lệch nhau nữa. Test canh:
`tests/order-link.test.js` + `tests/order-link-dom.smoke.js`.

## 🖨 MULTI-DO: in GỘP hay in TÁCH (v4.110)

Một xe chở nhiều DO thì có hai chứng từ phải quyết định cách in: **PTT** (lúc
assign) và **phiếu cân / Delivery Note** (lúc cân xong).

* **Hỏi đúng MỘT lần, lúc assign.** Cả hai đường — nhóm đã link bằng 🔗 Link
  Orders lẫn nhóm phần mềm tự dò ra — đều hiện cùng một hộp với hai nút
  *1 COMBINED SLIP* / *N SEPARATE SLIPS*. Lựa chọn ghi lên trạm (`_pttMode`),
  nên hộp hỏi phiếu cân lúc PRINT & DONE **mở sẵn đúng ô đó**.
* **Hộp hỏi là modal thật.** Trước v4.110 nó được vẽ vào ô kết quả tìm kiếm của
  trạm (`#sc-res-N`) — mà ô đó bị handler click-outside ẩn đi, và bị
  `scRenderCtrl()` ghi đè mỗi lần **bất kỳ** trạm nào đổi trạng thái (kể cả do
  máy khác đẩy về). Đó chính là lý do chức năng "khi được khi không".
* **Số chia per-DO sống sót qua F5 / đổi máy.** `tech._mdoNets` +
  `tech._tlTurn` lưu trên trạm; nếu RAM trống thì dựng lại y nguyên N phiếu.
  Không dựng lại được thì **báo rõ**, không âm thầm in một phiếu gộp.
* **Không dead-end.** Hộp hỏi không đóng khi bấm ra nền; bấm Cancel thì có
  toast nhắc bấm lại PRINT & DONE.

Test canh: `tests/mdo-print.test.js`.

## ⌨ VÁ LỖI GÕ Ô "SYSTEM OPENING" (v4.114)

User báo: *"nhập tay số opening stock của WMS, mỗi số nhập vào lại đơ ra ngay."*

**Nguyên nhân.** `oninput` gọi `renderStx()` → hàm này ghi đè `body.innerHTML`, mà trước
đó phải **kéo hai ô `<input>` ra kho ẩn** rồi gắn lại (`_stxPark` / `_stxMountInputs`).
Element vẫn sống và giữ nguyên giá trị — chú thích cũ nói đúng phần đó — nhưng **chuyển
một element ĐANG FOCUS sang cha khác là trình duyệt cắt focus**. Gõ được đúng một chữ số
là ô chết, chữ số sau rơi ra ngoài.

**Đã sửa, ba lớp:**

1. **Đường gõ không đụng tới `innerHTML` của bảng nữa.** `_stxLive(sloc)` chỉ ghi lại đúng
   mấy ô số phụ thuộc (đánh dấu `data-c="sopen-t"`, `sclose-*`, `gopen-*`, `gclose-*`) và
   dựng lại phần chân. Ô nhập đứng yên tuyệt đối ⇒ focus và con trỏ không bao giờ mất.
2. **Lượt vẽ ĐẦY ĐỦ vẫn có thể rơi đúng lúc đang gõ** (máy khác đẩy về, bản nháp vừa nạp).
   `renderStx` nay **chụp focus + vị trí con trỏ TRƯỚC** mọi lượt `_stxPark` và trả lại
   sau khi gắn ô về chỗ; và hàm đổ số **không bao giờ ghi đè ô đang gõ**.
3. **Ô nhập đổi `type=number` → `type=text` + `inputmode=decimal`.** Ô `number` không cho
   đọc/đặt vị trí con trỏ (`selectionStart` ném lỗi), lăn chuột lên là tự đổi số, và một
   ký tự lỡ tay làm ô trả về **chuỗi rỗng** — mất luôn con số đang nhập. Phần mềm tự tách
   số nên `20,000` và `20 000` đều nhận. Ô nhập trên thẻ thông báo Tank Mix cũng vậy.

Tiện thể: INV chỉ vẽ lại thẻ thông báo **khi modal 🔔 đang mở** — trước đây mỗi chữ số gõ
ra là dựng lại 4 thẻ, mỗi thẻ quét lại Tank Log, dù chẳng ai nhìn.

Test canh: `tests/stx-recon-dom.smoke.js` mục **K** (jsdom tái hiện đúng việc mất focus khi
chuyển node, nên test này bắt được lỗi thật).

## 💾 THÔNG BÁO TRỘN — mất dữ liệu hay không? (v4.113)

Câu hỏi vận hành: nhân viên gõ dở tồn đầu hệ thống ở ô thông báo, chưa kịp ✅, thì bồn
lại trộn xong mẻ mới và đẩy thông báo lot mới vào — có mất số của lot cũ không?

| Dữ liệu | Nằm ở đâu | Có bị đè khi lot mới vào? |
|---|---|---|
| Thông báo C3/C4 gửi Check Booth | `/mix_notify/<TK>_<LOT>` | **Không** — khoá theo TỪNG LOT, đã vậy từ đầu. Chỉ mất khi bấm ✅ hoặc ✕ |
| Tồn đầu hệ thống gõ tay | `/stx_draft/<TK>_<LOT>` (**v4.113**) | **Không** — cũng khoá theo từng lot |
| Kết quả đối chiếu chính thức | 4 cột Tank Log (v4.111) | — nơi lưu chính thức |

**Trước v4.113 con số gõ tay CHỈ nằm trong RAM và chỉ MỘT ô cho mỗi bồn** ⇒ trộn mẻ mới
là mất, F5 là mất, người bấm ✅ ngồi máy khác thì không thấy. Nay nó được ghi tạm lên
`/stx_draft` (ghi gộp 700 ms để gõ từng chữ số không thành một lượt ghi), kèm **người gõ
và thời điểm** — dòng nguồn dưới ô nhập nói rõ cả hai.

**Bản nháp bị xoá ngay khi** kết quả đã lưu vào Tank Log (nút 💾 hoặc ✅ ở ô thông báo),
hoặc khi bấm ⟳ reload. Ghi Tank Log **thất bại** thì bản nháp được **giữ nguyên** — không
bắt gõ lại. Nháp quá **30 ngày** bị dọn lúc nạp (một thông báo trộn được trả lời trong vài
giờ; nháp cả tháng chỉ còn là rác).

Bảng thông báo chỉ có **4 ô**; từ thông báo thứ 5 trở đi vẫn nằm nguyên trên Firebase và
nay có dòng `+ N more mix notifications are waiting` bên dưới — trước đây nhìn vào tưởng
đã hết việc.

⚠ Nếu Firebase Security Rules của dự án liệt kê từng node thì nhớ **mở quyền ghi cho
`/stx_draft`**; ghi hỏng thì app toast cảnh báo và giữ số trong RAM chứ không im lặng.

Test canh: `tests/stx-recon-dom.smoke.js` mục **J**.

## 🚚 MULTI-DO: hai đường phát hiện chạy SONG SONG (v4.112)

Một xe chở nhiều DO có **hai** cách được nhận ra, và từ v4.112 cả hai đều dùng được
cùng lúc — sáng nhiều xe quá không kịp link thì trạm vẫn tự dò ra.

| Đường | Khi nào | Phần mềm hỏi gì |
|---|---|---|
| 🔗 **Link Orders** (Today Plan) | sale khai trước từ sáng | chỉ hỏi **in gộp hay in tách** |
| 🔍 **Dò tìm ở trạm** (lúc assign) | chưa kịp link | hỏi đủ: **bán gộp hay chỉ lấy DO này**, rồi **in gộp hay in tách** |

**Chọn "bán gộp" ở trạm thì Today Plan tự lập nhóm 🔗 MULTI-DO** (`TP.lnkLinkMdo`),
nên kế hoạch, thẻ PLAN và mọi tổng đều hiểu ngay đây là MỘT xe — không phải chờ ai
vào link lại bằng tay. Nhóm đã có sẵn thì chỉ cập nhật cách in, và **không bao giờ**
tự gỡ link người khác đã đặt.

### ⚠ Bốn cửa chặn IM LẶNG đã gỡ — gốc của lỗi "đã link mà vẫn chỉ hiện 1 đơn"

1. **Anh em đang xếp HÀNG ĐỢI bị tính là "đã cam kết"** ⇒ nhóm co lại còn một dòng ⇒
   assign lặng lẽ thành đơn lẻ. Nay xe chờ vẫn gộp được, và anh em được gộp thì bị dọn
   khỏi hàng đợi ngay sau khi trạm nhận.
2. **Phép dò tìm đòi trùng TÀI XẾ tuyệt đối** — kế hoạch thật hay bỏ trống ô tài xế ở
   dòng thứ hai. Nay biển số + ngày là bắt buộc, tài xế chỉ dùng để LOẠI khi hai tên
   khác hẳn nhau.
3. **Cửa chặn `tổng ≤ 27 MT`** nuốt luôn popup. Quá tải chính là lúc cần hỏi nhất —
   nay popup vẫn hiện, kèm dòng cảnh báo đỏ, và vẫn chọn được "chỉ lấy DO này".
4. **Nhóm còn nhưng hết anh em gộp được thì không nói gì.** Nay nêu đích danh lý do
   (đã done / đã huỷ / đang ở trạm khác). Thẻ trạm cũng hiện dòng nhắc
   `🔗 MULTI-DO — N more DO not on this load` khi sale link SAU lúc xe đã vào trạm.

### Phiếu PTT của xe gộp

`pttPrint` nay đọc `station._linkedRows`: ô **DO Info** liệt kê **từng DO kèm số của
nó** (hai cột, mỗi DO một dòng), tiêu đề có nhãn `COMBINED · N DO`, ô Loading Q'ty
ghi thêm `(total)`. Xe một DO giữ **nguyên** hình dạng phiếu cũ. Ô sửa tay
`#pttov-do` / `#pttov-doqty` vẫn còn nguyên.

### TL Data: cột `Multi-DO` (mdoG)

Một lượt xe gộp ghi thành **nhiều dòng TL** (mỗi DO một dòng) nhưng ngoài bãi chỉ có
**một** lượt xe. Mấy dòng đi chung một chuyến nay mang cùng một khoá
`MDO-<ddmmyy>-S<trạm>-T<turn>-<biển số>`. Cột **Trips** của báo cáo gộp theo khoá này
⇒ không còn đếm dư đúng bằng số DO phụ. Cột **không cho sửa tay**.

Test canh: `tests/mdo-station-detect.test.js` + `tests/mdo-print.test.js`.

## ⚖ ĐỐI CHIẾU CHUYỂN KHO — lưu lại thành dữ liệu (v4.111)

Bảng **📏 Stock-transfer reconciliation** (nút 📏 trên thẻ tank, tab Inventory) từ
v4.108 đã gợi ý được con số chuyển kho đúng. v4.111 biến nó từ *máy tính tạm* thành
*dữ liệu có thể tra cứu*, và đưa phần cần dùng hằng ngày ra ngay chỗ nhân viên cân
đang đứng.

* **Lot đang tính nằm cùng hàng với TK-3501 / TK-3502.** Ô nhập LOT hầu như luôn để
  trống vì lot được lấy tự động, nên trước đây nhìn bảng không biết mấy con số thuộc
  mẻ nào. Nay có chip `LOT LPG-2026-xxx` ngay cạnh tên bồn — gõ số trần "900" thì chip
  vẫn in **lot đầy đủ** đúng như Tank Log lưu.
* **Nút 💾 Save to Tank Log** ghi kết quả xuống **4 cột mới** của Tank Log (đơn vị **kg**):

  | Cột | Ý nghĩa |
  |---|---|
  | `[69]` Gap C3 | tồn đầu THỰC TẾ − tồn đầu HỆ THỐNG, phần C3 |
  | `[70]` Gap C4 | như trên, phần C4 |
  | `[71]` Adj ST C3 | số chuyển kho ĐÃ ĐIỀU CHỈNH = tồn cuối thực − tồn đầu hệ thống |
  | `[72]` Adj ST C4 | như trên, phần C4 |

  Ô trống nghĩa là **chưa ai đối chiếu lot đó**, không phải "lệch 0" — bảng in dấu `·`
  chứ không in số 0. Phần mềm không bao giờ tự điền; chỉ ghi khi có người bấm.
  `ROW_W` 69 → **73** (phải khớp ở cả `eng.js` lẫn `mixctrl.js`).
* **✅ ở ô thông báo Tank Mix cũng ghi.** Xác nhận đã chuyển kho trên WMS là đúng thời
  điểm chốt số, nên nút đó ghi 4 ô trên **trước**, rồi mới tick cờ ST. Thiếu tồn đầu hệ
  thống thì chỉ nhắc bằng toast — **không bao giờ chặn** việc tick ST.
* **Ô thông báo Tank Mix hiện đủ 4 dòng**: NOTIFIED (COQ) · SYSTEM OPENING (**sửa được
  tại chỗ**) · GAP AT OPENING · ADJUSTED TRANSFER. Nhân viên cân xử lý gọn ngay trong ô
  thông báo, chỉ mở bảng 📏 khi cần xem chi tiết.
* **Tồn đầu hệ thống chỉ có MỘT nguồn** (`INV._stxSys`, khoá theo bồn + lot): gõ ở ô
  thông báo đúng bằng gõ trong bảng đối chiếu, hai màn hình không thể nói khác nhau.
* **⚠ Bẫy đã vá sẵn:** `ENG.upsertRow` giữ lại 4 ô này khi MC/paste ghi đè dòng — y như
  cách nó giữ cờ ST từ v4.68. Không có nó thì mỗi lần *CALC + SAVE* lại một lot là xoá
  sạch kết quả đối chiếu.

Test canh: `tests/stx-recon-dom.smoke.js` (mục F–I).

## 📗 TAB ODORANT XUẤT THẲNG RA FILE EXCEL (v4.142)

Nút **⬇ Export Excel** của tab 🧴 Odorant (`js/data/odorxl.js` — `ODORXL`) nhận vào
**chính file `Cavern Odorant Stock ….xlsx` đang dùng**, **chèn thêm dòng** cho tháng báo
cáo vào **cả hai sheet** `ODR_Consumption_Cavern` và `Cavern`, rồi lưu ra **file mới**.
File gốc không bị sửa. (Bản CSV cũ `ODOR.exportCsv` đã **bỏ hẳn**.)

### Vì sao KHÔNG dùng SheetJS

`XLSX.writeFile` đọc–ghi lại workbook là **mất sạch** style, viền, comment, conditional
formatting, drawing/VML, print setting. Ở đây sửa **trực tiếp XML trong zip bằng JSZip**:
chỉ `xl/worksheets/sheet1.xml`, `sheet2.xml` và `workbook.xml` bị chạm — `styles.xml`,
`sharedStrings.xml`, `comments1.xml`, `vmlDrawing1.vml`, `printerSettings*.bin` và hai
sheet còn lại **giữ nguyên từng byte** (đã đối chiếu `cmp` trên file thật).

### "Chèn một dòng" phải làm đủ 6 việc — thiếu việc nào cũng SAI IM LẶNG

1. **Gỡ shared formula** (`t="shared"`). File này dùng dày đặc, có ô con `si=20` ở `O29`
   cách ô chủ `O22` **7 dòng**. Đánh số lại dòng mà bỏ bước này ⇒ Excel bắt repair.
2. **Dịch mọi tham chiếu** tới sheet đích (hàng ≥ chỗ chèn thì +n), ở **mọi sheet** —
   sheet `Cavern` tra sang `ODR` bằng `LOOKUP` — kèm `<formula>` của conditional
   formatting và `definedNames`. Vùng có **điểm cuối ≥ chỗ chèn thì nới ra**, nên
   `SUM(C9:C28)` tự thành `SUM(C9:C29)` đúng như Excel làm.
3. **Đánh số lại** `r=` của `<row>` và của từng ô `<c>`.
4. **Dịch** `mergeCells` · `dimension` · `autoFilter` · `sqref` của
   `conditionalFormatting`/`dataValidation`/`ignoredErrors` · `hyperlink` · `ref` comment.
5. **Xoá `xl/calcChain.xml`** (kèm rel + `[Content_Types].xml`) và bật `fullCalcOnLoad`.
6. **BỎ `<v>` cache của ô nào ĐỔI công thức.** ⚠ Đây là cái bẫy nguy nhất: giữ cache lại
   thì Excel/LibreOffice hiện **số cũ** đúng định dạng, không báo lỗi gì — dòng Total nói
   dối rất thuyết phục cho tới khi có người bấm `Ctrl+Alt+F9`.

### Công thức dòng mới KHÔNG hard-code

Mỗi cột lấy công thức bằng cách **dịch công thức của ô cùng cột ở dòng gần nhất phía trên
có công thức**. Sửa công thức bên Excel thì dòng mới tự theo. Cột dữ liệu nhập tay
(Date · Mixing Q'ty · FQ · Gravity · Charging · LG 21201 · Inventory m³ · Remark) ghi số
từ `ODOR.snapshot()`; cột không thuộc hai loại trên (ngưỡng H.H/H/L Inventory) **copy y
nguyên** ô của dòng mẫu. Map cột **theo tên header**, không theo vị trí.

### Vài chốt nữa

* **Viền đáy bảng**: dòng cuối của sheet `Cavern` mang style riêng (viền đậm). Dòng mới
  nhận style đó, dòng cuối cũ bị **hạ về style dòng giữa** ⇒ viền đáy luôn ở đúng dòng cuối.
* **Chạy lại bao nhiêu lần cũng được**: tháng đã có dòng thì **cập nhật tại chỗ** (giữ
  nguyên công thức), không sinh dòng trùng. Chọn tháng cách xa dòng cuối thì mọi tháng
  còn thiếu ở giữa được chèn đủ. Tháng nằm **giữa** bảng mà chưa có dòng thì **từ chối**,
  bắt chèn tay trong Excel để không phá thứ tự thời gian.
* **Nới vùng Average/Total** (tuỳ chọn, mặc định bật): hàng `Average` của file gốc dừng ở
  `C9:C19` nên thiếu tháng — bật thì kéo tới dòng dữ liệu cuối. Chỉ nới vùng **rõ ràng là
  vùng dữ liệu** (mốc đầu bám dòng dữ liệu đầu, lệch tối đa 3 dòng vì file gốc có chỗ ghi
  `SUM(D3:D15)`).
* **Ô "Date: 260630"** ở đầu sheet ODR được cập nhật thành ngày cuối tháng báo cáo.
* `ODORXL` **có gán `window.ODORXL`** nên `LOCK_FNS` của `auth.js` khoá được thật với vai
  trò `sale`. ⚠ Mấy entry `ODOR.exportCsv` · `ENG.*` · `TLXK.*` · `SCALE.*` · `PTT_EARLY.*`
  · `KTPTVC.*` trong `LOCK_FNS` **chưa bao giờ khoá được gì** vì `_lockFn` tra
  `window[OBJ]` mà mấy module đó khai bằng `const` (không gán ra `window`).

Test: `node tests/odorxl.test.js` — **119 mục**, không cần cài gì.

## Chạy / xuất bản

Đây là web tĩnh, **không cần build**. Đẩy repo lên GitHub rồi bật **Settings → Pages**
(branch `main`, thư mục gốc). Đồng nghiệp dùng qua URL Pages. File `.nojekyll` đảm bảo
GitHub phục vụ file y nguyên. Chạy thử cục bộ: dùng **Live Server** (VS Code) — đừng mở
thẳng bằng `file://` vì sẽ chặn vài request.

## Cấu trúc

```
index.html        shell: nạp CDN + css + module theo thứ tự
vendor/           tabulator.min.js/.css (thư viện ngoài)
css/              core, plan, fleet, scale, cavern, report, engineer, inventory
js/core/          config · helpers · sync(SC) · auth ★
js/data/          tl · wg · ws · sp · ct · pp · bulkops · tlxk · odorxl
js/checks/        fcheck · wgcheck
js/features/      fleet · plan · scale · eng · rpt · inv · tkv · vlog · staff
                  · mixctrl · vmix · mixnotify · cav · scx2
js/integrations/  ptt-early · sync2 · notif
js/boot.js        khởi động đúng thứ tự
docs/             PLAN-TACH-MODULE.md · V4-54_MODULE-MAP.md
```

**Đã tách xong toàn bộ** (P1–P5 + boot): mọi file JS đã chứa code thật, `node --check`
33/33 PASS, smoke test headless PASS (xem [`docs/PROGRESS.md`](docs/PROGRESS.md)). Module dùng
kiểu **global** (IIFE gán biến như `WG`, `TP`, `SC`…) nên **thứ tự `<script>` trong
`index.html` rất quan trọng**: core → data → checks → features → integrations → boot.

## Phân quyền người dùng (whitelist)

Logic user/whitelist gom trong [`js/core/auth.js`](js/core/auth.js): `CURRENT_USER`,
`canWrite(area)`, đăng nhập Google, kiểm tra email theo `/users_whitelist`. **Khoá thật**
nằm ở **Firebase Security Rules** (phía server), không phải ở client — chi tiết & rules mẫu
trong `docs/PLAN-TACH-MODULE.md` §7. `apiKey` trong cấu hình Firebase là công khai theo
thiết kế, commit được.

### 🔐 VAI TRÒ `sale` (v4.126) — chỉ xem, chỉ thao tác hai bảng kế hoạch

| Vai trò | Được ghi |
|---|---|
| `admin` / `editor` | mọi vùng (`'*'`) |
| **`sale`** | **CHỈ** Today Plan + Tomorrow Plan |
| `viewer` | không gì cả |

Cấp quyền: trên Firebase, node `/users_whitelist/<email có dấu . đổi thành ,>` đặt

```json
{ "active": true, "role": "sale", "name": "Nguyen Van A" }
```

**Sale làm được gì:** xem mọi trang; trên Today Plan & Tomorrow Plan thì toàn quyền —
sửa ô, đổi trạng thái / cancel, thêm–xoá dòng, **📋 Paste from Excel**, 🔗 Link Orders,
promote Tomorrow → Today. Thêm **một ô duy nhất** ngoài hai bảng đó: **Fleet ▸ DRIVER ▸
cột Phone** (v4.130 — xem mục dưới).
**Sale KHÔNG làm được gì:** ghi bất cứ node nào khác (Scale/trạm, TL Data, phần còn lại
của Fleet, SAP, Engineer, Staff, Cavern, Vessel, dự báo tồn…), **in phiếu** và
**xuất Excel/CSV**.

**Hai lớp khoá** — vì rất nhiều module ghi thẳng Firebase mà không hỏi `canWrite()`:

1. `canWrite(area)` — như cũ, `MATRIX.sale = ['plan_today','plan_tomorrow']`.
2. ⭐ **Cổng theo đường dẫn** — `AUTH.installWriteGuard()` vá
   `Reference.prototype.set/update/remove/push/transaction`. Với vai trò hạn chế, mọi
   lệnh ghi đều bị soi đường dẫn: chỉ `plan_today/*`, `plan_tomorrow/*`,
   `plan_today_version`, `plan_tomorrow_version` được đi qua; một lệnh `update()`
   đa-đường-dẫn mà lẫn **một** node cấm thì **cả lệnh** bị chặn.
   Tiền tố không đủ để lọt: `plan_today_backup/x` vẫn bị cấm.
   Hàm in/xuất bị thay thân bằng thông báo từ chối (`AUTH.LOCK_FNS`).

⚠ Đây vẫn là **lưới an toàn phía client**. Rules mẫu tương ứng cần đặt trên server:

```
"plan_today":    { ".write": "auth != null && root.child('users_whitelist')
                              .child(auth.token.email.replace('.', ',')).child('role').val()
                              .matches(/^(admin|editor|sale)$/)" }
```
(áp tương tự cho `plan_tomorrow`, `plan_today_version`, `plan_tomorrow_version`; mọi node
còn lại chỉ cho `admin|editor`.)

### 📞 QUYỀN THEO Ô — sale bổ sung số điện thoại tài xế (v4.130)

Nghiệp vụ: sale cần gõ thêm số điện thoại vào Fleet ▸ DRIVER, nhưng không được đụng gì
khác trong Fleet. `canWrite('fleet')` quá thô (bật là mở toang cả tab) ⇒ thêm một tầng
mịn hơn: **`AUTH.canWriteField(area, tab, field)`** đọc bảng `AUTH.FIELD_ALLOW`.

```js
var FIELD_ALLOW = { sale: [ { area:'fleet', tab:'driver', fields:['phone'] } ] };
```

`canWrite('fleet')` **vẫn = false** cho sale, nên thêm dòng · xoá dòng · dán Excel ·
🗑 · ⛔ tick · Clear all đều chặn y như cũ. Ba chỗ cùng canh:

1. **`SC.applyAndPush`** (sync.js) — không có quyền cả vùng thì lô ghi chỉ qua được khi
   **MỌI** thay đổi đều nằm trong `FIELD_ALLOW`. Lẫn **một** ô cấm là chặn **cả lô** —
   ghi nửa vời còn tệ hơn không ghi. Xoá dòng mang `field:'__DELETE__'` nên tự rớt.
2. **Cổng đường dẫn** (auth.js) — chỉ `fleet_/driver/<rid>/(phone|lastBy|lastAt)` và
   `fleet_version` lọt. Ghi sang cột khác, sang tab tanklorry/tractor/rmooc/twavg, hay ghi
   đè cả dòng `fleet_/driver/<rid>` đều bị chặn.
3. **`applyFleetFieldPerm()`** (globals.js) — lưới Fleet gỡ `editor` khỏi mọi cột không
   được phép và thay `cellClick` bằng câu từ chối.
   ⚠ Ô 🗑 và ô ⛔ ghi qua `cellClick` **chứ không phải** `editor`, gỡ editor thôi là chưa đủ.

Mở thêm ô khác cho sale = thêm một dòng vào `FIELD_ALLOW` **và** một regex vào
`PATH_ALLOW`. Thiếu một trong hai thì UI cho gõ nhưng lệnh ghi bị chặn (hoặc ngược lại).

### 📨 THÔNG BÁO "SALE VỪA ĐỔI KẾ HOẠCH" (v4.126)

Mỗi dòng plan mang sẵn **dấu vết sửa**: `lastBy` · `lastAt` · **`lastRole`** (mới) —
đóng dấu ở đúng một chỗ, [`_stampWho()` / `_stampRow()`](js/features/plan.js).
Cột **Last Edit** trên bảng đọc thẳng từ đó.

Đường đi của thông báo — **KHÔNG có node Firebase nào cho nó**:

1. Máy sale sửa dòng → ghi Firebase như thường, kèm `lastRole:"sale"`.
2. Máy khác vốn đã nghe sẵn `child_added/changed/removed` của hai node plan →
   thấy `lastRole==='sale'` thì **tự sinh** thông báo tại chỗ (so dòng cũ ↔ dòng mới
   để biết trường nào đổi, cũ → mới).
3. [`SALENOTIF`](js/integrations/salenotify.js) cho **nổi ~5 giây** ở góc phải
   (mọi trang, không riêng tab Scale), sau đó nằm trong nút **📨 Sale Notification**
   ở *Sales ▸ Scale* kèm badge đếm.
4. Bấm **✓ Confirm** (trên tấm nổi hoặc trong bảng) là **xoá hẳn** trên máy đó.
   Danh sách sống trong RAM: F5 / đóng tab là sạch.

Không báo khi: người sửa không phải role `sale`; chính người sale đó tự sửa; hoặc chỉ có
`lastAt` đổi mà không trường nghiệp vụ nào khác. Đợt `child_added` lúc mới mở app (replay
cả bảng) bị chặn bằng cờ `_replayDone`.

Test canh: [`tests/sale-role.test.js`](tests/sale-role.test.js) — `node tests/sale-role.test.js`.

## Kiểm thử nhanh (không cần trình duyệt)

```bash
npm i jsdom && node test/smoke.mjs
node tests/odorxl.test.js     # 119 muc — engine chen dong Excel cua tab Odorant
```
Kiểm: nạp đủ 33 script · không lỗi "X is not defined" · boot chạy hết · không module init lỗi.

## Trạng thái

✅ **Tách module HOÀN TẤT** (P1–P5 + boot). `node --check` 33/33 PASS · audit tham chiếu chéo PASS ·
smoke test headless PASS. Nhật ký chi tiết: [`docs/PROGRESS.md`](docs/PROGRESS.md).

**Còn lại:** (1) test 1 lượt trên trình duyệt (Live Server/Pages) cho chức năng & giao diện;
(2) bật whitelist thật — theo [`docs/P6-WHITELIST-SETUP.md`](docs/P6-WHITELIST-SETUP.md) rồi đổi
`AUTH_ENFORCE=true` trong `js/core/auth.js`.
