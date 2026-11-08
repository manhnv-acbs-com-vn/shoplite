# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `lab2-speckit`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Khách nhập mã ở trang
thanh toán, thấy ngay số tiền giảm và tổng mới, có thể gỡ mã. Hai loại mã (phần trăm có mức tối đa,
số tiền cố định), có điều kiện đơn tối thiểu và ngày hết hạn, mỗi đơn một mã. Báo rõ lý do khi mã
không hợp lệ. Đơn lưu mã và số tiền giảm, hiển thị ở chi tiết đơn. Hệ thống xác nhận lại số tiền khi
đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026. Ngoài phạm vi: trang quản trị mã, giới hạn lượt
dùng, mã riêng cho từng khách."

## Clarifications

### Session 2026-11-08

- Q: Nếu mã còn hạn lúc áp dụng nhưng hết hạn khi bấm "Đặt hàng", hệ thống làm gì? → A: Từ chối đơn,
  báo "mã đã hết hạn", tự gỡ mã khỏi tóm tắt và hiện tổng tiền mới; khách bấm "Đặt hàng" lần nữa để
  xác nhận (Option B).
- Q: Khách xóa bớt sản phẩm khiến tạm tính xuống dưới mức tối thiểu của mã đã áp dụng thì sao? → A:
  Tự gỡ mã, hiển thị thông báo chưa đạt tối thiểu kèm số tiền cần mua thêm, tổng tiền về giá chưa
  giảm; muốn dùng lại khách phải mua thêm và nhập lại mã (Option A).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Ở trang thanh toán, khách nhập một mã giảm giá vào ô "Mã giảm giá" và bấm "Áp dụng". Nếu mã hợp lệ,
phần tóm tắt đơn hàng hiển thị ngay dòng "Giảm giá (MÃ)" với số tiền được giảm và tổng tiền mới.
Khách đặt hàng và số tiền phải trả đúng bằng tổng tiền đã giảm.

**Why this priority**: Đây là giá trị cốt lõi mà marketing cần - không có bước này thì không có
chương trình khuyến mãi nào chạy được.

**Independent Test**: Thêm sản phẩm vào giỏ cho đủ điều kiện, nhập `SHOPLITE10` ở trang thanh toán,
kiểm tra tóm tắt đơn và tổng tiền của đơn sau khi đặt.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 1.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** tóm tắt
   hiển thị giảm 100.000đ (10% = 100.000đ, đúng mức tối đa) và tổng tiền giảm tương ứng.
2. **Given** giỏ hàng có tạm tính 2.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền
   giảm là 100.000đ (10% = 200.000đ nhưng bị giới hạn ở mức tối đa 100.000đ).
3. **Given** giỏ hàng có tạm tính 300.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** mã được
   chấp nhận và giảm 30.000đ (đúng bằng mức tối thiểu vẫn hợp lệ).
4. **Given** giỏ hàng có tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm
   là 50.000đ.
5. **Given** khách đã áp dụng mã hợp lệ, **When** khách đặt hàng thành công, **Then** đơn hàng được
   tạo với số tiền giảm và tổng tiền do hệ thống tính, khớp với con số khách đã thấy.
6. **Given** khách nhập "&nbsp;shoplite10&nbsp;" (chữ thường, có khoảng trắng đầu/cuối), **When** bấm "Áp dụng",
   **Then** mã được nhận diện là `SHOPLITE10`.

---

### User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

Khi mã không dùng được, khách thấy thông báo bằng tiếng Việt ngay dưới ô nhập mã, nói rõ lý do: mã
không tồn tại, mã đã hết hạn, hoặc đơn chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm. Tổng
tiền không thay đổi.

**Why this priority**: Thông báo mơ hồ làm khách bỏ đơn và tăng câu hỏi gửi về hỗ trợ; đây là phần
không thể tách khỏi trải nghiệm áp dụng mã.

**Independent Test**: Lần lượt nhập mã không tồn tại, `TET2026` và `GIAM50K` với giỏ dưới 500.000đ,
kiểm tra nội dung từng thông báo.

**Acceptance Scenarios**:

1. **Given** bất kỳ giỏ hàng nào, **When** khách nhập `KHONGCO` và bấm "Áp dụng", **Then** hiển thị
   "Mã giảm giá không tồn tại" và không có giảm giá nào được áp dụng.
2. **Given** hôm nay sau ngày 28/02/2026, **When** khách áp dụng `TET2026`, **Then** hiển thị thông
   báo mã đã hết hạn kèm ngày hết hạn.
3. **Given** giỏ hàng có tạm tính 499.999đ, **When** khách áp dụng `GIAM50K`, **Then** hiển thị
   thông báo đơn chưa đạt tối thiểu 500.000đ và "cần mua thêm 1đ".
4. **Given** giỏ hàng có tạm tính 299.999đ, **When** khách áp dụng `SHOPLITE10`, **Then** hiển thị
   cần mua thêm 1đ để dùng mã.
5. **Given** ô nhập mã đang trống, **When** khách bấm "Áp dụng", **Then** hiển thị lời nhắc nhập mã
   và không gửi yêu cầu kiểm tra.

---

### User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

Khách đã áp dụng một mã có thể bấm "Gỡ mã" để quay về tổng tiền ban đầu, hoặc gỡ rồi nhập mã khác.
Tại mỗi thời điểm đơn chỉ có tối đa một mã.

**Why this priority**: Cần thiết để khách tự chọn mã có lợi nhất, nhưng luồng P1 vẫn có giá trị nếu
thiếu bước này.

**Independent Test**: Áp dụng `SHOPLITE10`, gỡ mã, kiểm tra tổng tiền trở về như cũ; áp dụng
`GIAM50K` thay thế và kiểm tra chỉ còn một dòng giảm giá.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến mất,
   tổng tiền trở về giá trị trước khi áp dụng và ô nhập mã sẵn sàng cho mã mới.
2. **Given** đã áp dụng một mã, **When** khách xem phần mã giảm giá, **Then** ô nhập mã mới không
   khả dụng cho tới khi gỡ mã hiện tại (đảm bảo chỉ một mã mỗi đơn).

---

### User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

Sau khi đặt hàng, trang chi tiết đơn hàng hiển thị mã đã dùng và số tiền được giảm, giữa tạm tính,
phí giao hàng và tổng tiền.

**Why this priority**: Giúp khách đối chiếu số tiền và giúp marketing đo hiệu quả chương trình; không
chặn luồng đặt hàng.

**Independent Test**: Đặt một đơn có `GIAM50K`, mở trang chi tiết đơn và kiểm tra dòng giảm giá; mở
một đơn không dùng mã và kiểm tra không có dòng giảm giá.

**Acceptance Scenarios**:

1. **Given** đơn đã đặt với `GIAM50K`, **When** khách mở chi tiết đơn, **Then** thấy "Giảm giá
   (GIAM50K): -50.000đ" và tổng tiền đã trừ giảm giá.
2. **Given** đơn đặt không dùng mã (kể cả các đơn tạo trước khi có tính năng này), **When** mở chi
   tiết đơn, **Then** không hiển thị dòng giảm giá và trang không lỗi.
3. **Given** đơn có mã đã bị hủy, **When** mở chi tiết đơn, **Then** thông tin mã và số tiền giảm
   vẫn được hiển thị.

---

### User Story 5 - Chống gian lận khi đặt hàng (Priority: P1)

Khi nhận yêu cầu đặt hàng, hệ thống tự kiểm tra lại mã và tự tính lại số tiền giảm và tổng tiền dựa
trên giá sản phẩm và quy tắc mã hiện hành, bỏ qua mọi con số về giá/giảm giá/tổng do trình duyệt gửi
lên.

**Why this priority**: Nếu không có bước này, khách có thể sửa con số trên trình duyệt để trả ít tiền
hơn - rủi ro tài chính trực tiếp.

**Independent Test**: Gửi yêu cầu đặt hàng trực tiếp (không qua giao diện) kèm số tiền giảm/tổng tiền
giả mạo hoặc mã đã hết hạn và kiểm tra kết quả.

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng có mã `SHOPLITE10` và kèm số tiền giảm 500.000đ do client tự điền,
   **When** hệ thống xử lý, **Then** đơn được lưu với số tiền giảm do hệ thống tính (tối đa 100.000đ).
2. **Given** yêu cầu đặt hàng kèm mã `TET2026` (đã hết hạn), **When** hệ thống xử lý, **Then** đơn
   không được tạo và khách nhận thông báo mã đã hết hạn.
3. **Given** khách áp dụng `SHOPLITE10` lúc mã còn hạn và mã hết hạn trước khi khách bấm "Đặt hàng",
   **When** khách bấm "Đặt hàng", **Then** đơn không được tạo, khách thấy thông báo mã đã hết hạn,
   mã tự được gỡ khỏi tóm tắt, tổng tiền hiển thị lại theo giá chưa giảm; **When** khách bấm "Đặt
   hàng" lần nữa, **Then** đơn được tạo theo tổng tiền chưa giảm vừa hiển thị.
4. **Given** khách áp dụng mã hợp lệ rồi giảm số lượng trong giỏ ở tab khác khiến tạm tính dưới mức
   tối thiểu nhưng trang thanh toán chưa kịp cập nhật, **When** khách đặt hàng, **Then** đơn không
   được tạo, khách nhận thông báo chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm, mã tự được
   gỡ và tổng tiền chưa giảm được hiển thị để khách bấm "Đặt hàng" xác nhận lại.

---

### Edge Cases

- **Đúng ngưỡng tối thiểu**: tạm tính 300.000đ với `SHOPLITE10` và 500.000đ với `GIAM50K` là hợp lệ;
  thấp hơn 1đ là không hợp lệ.
- **Đúng mức tối đa**: `SHOPLITE10` với tạm tính 999.999đ giảm 99.999đ (làm tròn xuống), 1.000.000đ
  giảm 100.000đ, 1.000.001đ vẫn giảm 100.000đ.
- **Làm tròn**: giảm theo phần trăm luôn làm tròn xuống tới đồng; không bao giờ giảm số lẻ.
- **Giảm vượt tạm tính**: số tiền giảm không bao giờ lớn hơn tạm tính; tạm tính sau giảm không âm.
- **Ngày hết hạn**: mã dùng được đến hết ngày hết hạn (23:59:59 theo giờ Việt Nam); từ 00:00 ngày
  hôm sau là hết hạn. `TET2026` dùng được hết ngày 28/02/2026.
- **Mã hết hạn giữa chừng**: mã áp dụng lúc còn hạn nhưng hết hạn trước khi bấm đặt hàng → đơn bị từ
  chối với thông báo hết hạn, mã tự được gỡ và tổng tiền chưa giảm được hiển thị; khách phải bấm
  "Đặt hàng" lần nữa để xác nhận. Không có đơn nào được tạo với số tiền khách chưa nhìn thấy.
- **Giỏ hàng thay đổi sau khi áp dụng mã**: số tiền giảm được tính lại theo tạm tính mới (vd.
  `SHOPLITE10` với giỏ giảm từ 1.200.000đ xuống 800.000đ thì giảm từ 100.000đ xuống 80.000đ). Nếu tạm
  tính xuống dưới mức tối thiểu, mã tự được gỡ, khách thấy thông báo cần mua thêm bao nhiêu và tổng
  tiền về giá chưa giảm; nút "Đặt hàng" vẫn dùng được. Mua thêm cho đủ mức không tự áp dụng lại mã.
- **Nhiều mã**: yêu cầu đặt hàng chứa nhiều hơn một mã bị từ chối.
- **Mã quá dài hoặc ký tự lạ**: được coi là "mã không tồn tại", không gây lỗi hệ thống.
- **Đơn cũ không có thông tin mã**: vẫn hiển thị bình thường như đơn không dùng mã.

## Requirements _(mandatory)_

### Functional Requirements

**Áp dụng mã ở trang thanh toán**

- **FR-001**: Trang thanh toán MUST có ô nhập mã giảm giá (có nhãn) và nút "Áp dụng".
- **FR-002**: Hệ thống MUST chuẩn hóa mã trước khi kiểm tra: bỏ khoảng trắng đầu/cuối và không phân
  biệt chữ hoa/chữ thường.
- **FR-003**: Khi mã hợp lệ, phần tóm tắt đơn hàng MUST hiển thị ngay mã đã áp dụng, số tiền được
  giảm và tổng tiền mới, không cần tải lại trang.
- **FR-004**: Khách MUST có thể gỡ mã đã áp dụng; sau khi gỡ, tóm tắt đơn trở về như chưa áp dụng.
- **FR-005**: Mỗi đơn hàng MUST áp dụng tối đa một mã; muốn dùng mã khác khách phải gỡ mã hiện tại.
- **FR-006**: Khi tạm tính thay đổi sau khi đã áp dụng mã, hệ thống MUST tính lại số tiền giảm và
  kiểm tra lại điều kiện tối thiểu. Nếu tạm tính mới thấp hơn mức tối thiểu, trang thanh toán MUST
  tự gỡ mã, hiển thị thông báo chưa đạt tối thiểu kèm số tiền cần mua thêm, và đưa tổng tiền về giá
  chưa giảm. Mã MUST NOT tự được áp dụng lại khi tạm tính đủ mức trở lại; khách phải nhập lại mã.

**Quy tắc tính giảm giá**

- **FR-007**: Hệ thống MUST hỗ trợ hai loại mã:
  - _Phần trăm_: giảm = tạm tính × phần trăm, làm tròn xuống tới đồng, không vượt mức giảm tối đa.
  - _Số tiền cố định_: giảm đúng số tiền quy định.
- **FR-008**: Số tiền giảm MUST được tính trên tạm tính (tổng tiền hàng), không tính trên phí giao
  hàng, và MUST NOT vượt quá tạm tính.
- **FR-009**: Tổng tiền MUST bằng tạm tính − số tiền giảm + phí giao hàng.
- **FR-010**: Điều kiện miễn phí giao hàng (tạm tính ≥ 500.000đ) MUST tiếp tục xét trên tạm tính
  **trước** khi giảm giá, để quy tắc phí ship hiện hành không đổi.
- **FR-011**: Mã có giá trị đơn tối thiểu MUST chỉ hợp lệ khi tạm tính ≥ giá trị tối thiểu.
- **FR-012**: Mã có ngày hết hạn MUST chỉ hợp lệ đến hết ngày đó theo giờ Việt Nam (UTC+7).

**Thông báo lỗi**

- **FR-013**: Khi mã không hợp lệ, hệ thống MUST hiển thị thông báo tiếng Việt ngay cạnh ô nhập mã,
  phân biệt ba lý do:
  - Mã không tồn tại.
  - Mã đã hết hạn (kèm ngày hết hạn).
  - Đơn chưa đạt giá trị tối thiểu (kèm giá trị tối thiểu và số tiền cần mua thêm =
    giá trị tối thiểu − tạm tính).
- **FR-014**: Mọi số tiền hiển thị (giảm giá, tối thiểu, cần mua thêm, tổng) MUST theo định dạng
  tiền tệ VND thống nhất của cửa hàng.

**Đặt hàng và chống gian lận**

- **FR-015**: Khi đặt hàng, hệ thống MUST tự kiểm tra lại mã (tồn tại, còn hạn, đủ tối thiểu) và tự
  tính lại số tiền giảm và tổng tiền từ giá sản phẩm hiện hành; mọi giá trị về giá, giảm giá hay
  tổng tiền do trình duyệt gửi lên MUST bị bỏ qua.
- **FR-016**: Nếu mã không còn hợp lệ tại thời điểm đặt hàng, hệ thống MUST từ chối tạo đơn và trả
  về đúng lý do như FR-013; MUST NOT tự động tạo đơn theo giá gốc. Với mọi lý do (hết hạn, chưa
  đạt tối thiểu, không tồn tại), trang thanh toán MUST tự gỡ mã khỏi tóm tắt và hiển thị tổng tiền chưa giảm; đơn chỉ được tạo
  khi khách bấm "Đặt hàng" thêm một lần để xác nhận tổng tiền mới.
- **FR-017**: Đơn hàng được tạo MUST lưu lại mã đã dùng (dạng chuẩn hóa) và số tiền được giảm tại
  thời điểm đặt; thông tin này không đổi kể cả khi mã sau đó hết hạn hoặc đơn bị hủy.

**Hiển thị đơn hàng**

- **FR-018**: Trang chi tiết đơn hàng MUST hiển thị mã đã dùng và số tiền được giảm khi đơn có dùng
  mã; đơn không dùng mã (kể cả đơn cũ) MUST hiển thị bình thường, không có dòng giảm giá.

**Dữ liệu mã ban đầu**

- **FR-019**: Hệ thống MUST có sẵn ba mã sau:

  | Mã         | Loại            | Giá trị | Giảm tối đa | Đơn tối thiểu | Hết hạn    |
  | ---------- | --------------- | ------- | ----------- | ------------- | ---------- |
  | SHOPLITE10 | Phần trăm       | 10%     | 100.000đ    | 300.000đ      | Không      |
  | GIAM50K    | Số tiền cố định | 50.000đ | -           | 500.000đ      | Không      |
  | TET2026    | Phần trăm       | 15%     | 200.000đ    | Không         | 28/02/2026 |

### Key Entities _(include if feature involves data)_

- **Mã giảm giá (Discount Code)**: mã định danh (viết hoa, duy nhất), loại (phần trăm / số tiền cố
  định), giá trị giảm, mức giảm tối đa (chỉ với loại phần trăm), giá trị đơn tối thiểu (tùy chọn),
  ngày hết hạn (tùy chọn). Danh sách mã do đội phát triển quản lý, không có giao diện quản trị.
- **Kết quả áp dụng mã**: hợp lệ (kèm số tiền giảm) hoặc không hợp lệ (kèm lý do: không tồn tại /
  hết hạn / chưa đạt tối thiểu, và số tiền cần mua thêm nếu có).
- **Đơn hàng (mở rộng)**: thêm mã đã dùng (tùy chọn) và số tiền được giảm (mặc định 0); tổng tiền
  của đơn đã phản ánh giảm giá.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng một mã hợp lệ và thấy số tiền giảm cùng tổng tiền mới trong vòng 1 giây
  sau khi bấm "Áp dụng".
- **SC-002**: 100% trường hợp mã không hợp lệ hiển thị đúng một trong ba lý do đã định nghĩa; với lý
  do chưa đạt tối thiểu, số tiền cần mua thêm chính xác tới từng đồng.
- **SC-003**: 100% đơn hàng có mã được lưu với số tiền giảm và tổng tiền khớp với kết quả hệ thống
  tự tính, kể cả khi yêu cầu đặt hàng chứa số tiền giả mạo.
- **SC-004**: Tất cả giá trị biên (ngay dưới / đúng bằng / ngay trên mức tối thiểu và mức giảm tối
  đa, ngày hết hạn) cho ra kết quả đúng như mô tả trong Edge Cases.
- **SC-005**: Khách hoàn tất luồng thanh toán có áp dụng mã chỉ thêm tối đa 2 thao tác (nhập mã và
  bấm "Áp dụng") so với luồng không dùng mã.
- **SC-006**: Luồng thanh toán không dùng mã và các đơn hàng cũ hoạt động như trước, không có thay
  đổi về số tiền.

## Assumptions

- Giảm giá áp dụng trên tạm tính tiền hàng; phí giao hàng giữ nguyên và điều kiện miễn phí giao hàng
  xét trên tạm tính trước giảm giá (giữ quy tắc phí ship hiện hành). Nếu marketing muốn xét sau giảm
  giá, cần làm rõ ở bước `/speckit-clarify`.
- Mã áp dụng ở trang thanh toán chỉ tồn tại trong phiên thanh toán đó; rời trang hoặc tải lại có thể
  phải nhập lại mã. Mã không được lưu vào giỏ hàng.
- Giờ Việt Nam (UTC+7) là chuẩn để xét ngày hết hạn.
- Không có giới hạn lượt dùng: một mã có thể được dùng cho nhiều đơn, bởi nhiều khách.
- Danh sách mã cố định trong hệ thống; thêm/sửa mã là thay đổi do đội phát triển thực hiện.
- Ngoài phạm vi: trang quản trị tạo/sửa mã, giới hạn số lượt sử dụng mỗi mã, mã dành riêng cho từng
  khách hàng, kết hợp nhiều mã, mã miễn phí giao hàng.
- Trang danh sách đơn hàng tiếp tục hiển thị tổng tiền (đã phản ánh giảm giá); chi tiết mã chỉ cần
  hiển thị ở trang chi tiết đơn.
