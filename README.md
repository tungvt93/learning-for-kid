# Bé Vui Học: Tiếng Anh & Toán cho bé 7 tuổi

## Cách chạy
```
./run.sh          chạy ở cổng mặc định 8765
./run.sh 9000     chọn cổng khác (hoặc: PORT=9000 ./run.sh)
./stop.sh         tắt (./stop.sh 9000 nếu chạy cổng khác)
```
Hoặc bấm đúp `start.command` (giống `./run.sh`). Khi chạy, cửa sổ in ra **cổng (PORT)** và hai địa chỉ: một cho máy tính, một cho điện thoại cùng Wi-Fi.
Nếu báo cổng đang bận thì bản cũ vẫn đang chạy: tắt bằng `./stop.sh`, hoặc chọn cổng khác.

## Hồ sơ và dữ liệu
- Mở trang lên: nếu có **từ 2 hồ sơ trở lên** thì hiện màn hình "Ai đang chơi nào?". Chỉ có 1 hồ sơ thì vào thẳng. Nút "🔄 Đổi bạn" ở trang chủ để chuyển bé.
- Mỗi bé có sao, sticker, cấp độ, từ đã thuộc, lượt chơi, nhiệm vụ ngày, cài đặt giọng đọc **riêng**.
- Khu bố mẹ → "Hồ sơ các bé": đổi tên, xóa hồ sơ, thêm hồ sơ mới.
- Dữ liệu lưu bằng **SQLite** tại `data/bevuihoc.db` trên máy tính chạy server, nên vào bằng IP hay thiết bị nào cũng thấy cùng dữ liệu. Xem bằng `sqlite3 data/bevuihoc.db` hoặc DB Browser for SQLite.
- Các bảng: `profiles`, `game_levels`, `word_stats`, `math_wrong`, `stickers`, `history`.
- Sao lưu: chép file `data/bevuihoc.db` khi server đang tắt (hoặc khi bé không chơi).
- `data/tts-cache/` là bộ nhớ đệm giọng đọc, xóa thoải mái, server sẽ tự tạo lại.
- `data/progress.json.da-chuyen` là bản cũ trước khi chuyển sang SQLite, giữ lại để dự phòng.

## Giọng đọc
- **Tiếng Việt** (nút 🔊 Nghe đề, lời khen, hướng dẫn) do **máy tính chạy server tạo ra** bằng lệnh `say` của macOS (giọng *Linh*), rồi phát cho mọi thiết bị. Nhờ vậy điện thoại hay máy nào cũng nghe được, dù trình duyệt của máy đó không có giọng tiếng Việt.
- **Tiếng Anh** dùng giọng của trình duyệt trước; nếu máy không có thì dùng giọng *Samantha* từ máy chủ.
- Khi server chạy, dòng "Giọng đọc máy chủ" cho biết giọng nào đang dùng. Khu Bố mẹ → Cài đặt cũng hiện giọng đang dùng.
- Nếu server không chạy trên macOS hoặc máy chưa có giọng tiếng Việt: vào Cài đặt hệ thống → Trợ năng → Nội dung được nói → Giọng hệ thống → Quản lý giọng → tải **Tiếng Việt (Linh)**.

## Có gì bên trong
| Trò | Môn | Bé làm gì | Số cấp |
|---|---|---|---|
| 🕵️ Thám tử nhí | Tiếng Anh | Nghe từ rồi chọn hình đúng (có nút đọc chậm 🐢) | 3 (3, 4 hoặc 6 hình) |
| 🃏 Lật thẻ trí nhớ | Tiếng Anh | Ghép thẻ hình với thẻ chữ | 3 (3, 4 hoặc 6 cặp) |
| 🤖 Túi bảo bối | Tiếng Anh | Điền chữ cái còn thiếu | 3 (từ 3 chữ, đến 5 chữ, rồi từ dài) |
| 🔤 Bảng chữ cái ABC | Tiếng Anh | Nghe tên chữ / âm đầu (phonics), chọn đúng chữ cái | 2 |
| 👋 Chào hỏi | Tiếng Anh | Nghe câu chào, chọn câu trả lời đúng | 1 |
| 🖌️ Tô màu tranh | Tiếng Anh | Nghe tên màu tiếng Anh, chọn đúng màu để tô vào tranh (mặt trời, diều, voi, hoa, cá, nhà, ô tô, công chúa, bướm, mèo, chim, kỳ lân...) | 2 |
| 🐭 Mèo đuổi chuột | Toán | Tính nhanh cộng trừ để chuột chạy thoát | 4 (trong 10, 20, 50, 100) |
| 🐊 Cá sấu so sánh | Toán | So sánh số lớn hơn / bằng, dấu > < = | 3 |
| 🍎 Đếm hình | Toán + Anh | "How many apples?", đếm và học số tiếng Anh | 3 |
| 🧮 Tổng và Hiệu | Toán | Gọi tên số hạng, tổng, số bị trừ, số trừ, hiệu; tìm số còn thiếu | 3 (trong 20, 50, 100) |
| ⚖️ Nhiều hơn, Ít hơn | Toán | Bài toán có lời văn: hơn kém bao nhiêu, nhiều hơn, ít hơn (có đọc đề) | 3 |
| 🔗 Đếm & Nối số | Toán | Kéo-thả số đúng vào ô có đúng số chấm | 2 (0-5, 0-10) |
| 🧩 Hình & Khối | Toán | Kéo-thả hình phẳng / khối 3D vào đúng giỏ | 2 |
| 🧮 Cộng trừ trong 10 | Toán | Tự gõ số bằng bàn phím để tính cộng trừ trong 10 | 2 |
| 📏 Đo độ dài | Toán | So sánh dài/ngắn, đo và gõ số xăng-ti-mét | 2 |
| ➕ Cộng trừ trong 100 | Toán | Cộng trừ không nhớ trong 100, tự gõ số | 2 (trong 50, trong 100) |
| 📅 Lịch & Thứ, Ngày | Toán | Thứ trong tuần, xem lịch tháng, hôm qua/ngày mai | 2 |
| 🕰️ Vặn kim đồng hồ | Toán | Kéo kim giờ đến đúng giờ được yêu cầu | 1 |

Các trò Toán 1 dùng hai cách chơi mới ngoài bấm trắc nghiệm: **gõ số bằng bàn phím** (Cộng trừ trong 10/100, Đo độ dài cấp 2) và **kéo-thả bằng tay** (Đếm & Nối số, Hình & Khối, Vặn kim đồng hồ).

- 10 chủ đề từ vựng (hơn 90 từ): con vật, màu sắc, số đếm, đồ ăn, đồ dùng học tập, đồ chơi, cơ thể, gia đình, thời tiết, hoạt động.
- **Tự điều chỉnh độ khó**: bé làm tốt 2 lượt liên tiếp thì lên cấp, sai nhiều thì xuống cấp.
- **Ôn từ hay sai**: từ bé trả lời sai sẽ được hỏi lại nhiều hơn ở các lượt sau.
- **Động lực**: sao ⭐, nhiệm vụ mỗi ngày (chơi 3 trò khác nhau để mở rương quà), chuỗi ngày học 🔥, và 24 sticker để sưu tập.
- **Khu bố mẹ** (phải trả lời một phép nhân mới vào được): xem từ đã thuộc, từ và phép tính bé hay sai, chỉnh cấp độ, tốc độ đọc, bật hoặc tắt giọng đọc tiếng Việt.

## Ghi chú
- Giọng đọc dùng giọng có sẵn của trình duyệt. Trên Mac, iPhone và Chrome, giọng tiếng Anh nghe tốt nhất.
  Một số máy Windows hoặc Android không có giọng tiếng Việt. Khi đó phần hướng dẫn chỉ hiện chữ, còn tiếng Anh vẫn đọc bình thường.
- Hình minh họa hiện dùng emoji, nên trên mỗi hệ điều hành trông sẽ hơi khác nhau.
- Muốn thêm từ: sửa danh sách `TOPICS` trong `js/data.js`.
- Hai máy cùng lưu một bé một lúc thì bản lưu sau cùng thắng.

## Cấu trúc
```
server.py       máy chủ + SQLite (API /api/profiles)
run.sh / stop.sh  chạy và tắt server
data/           bevuihoc.db (dữ liệu của các bé)
index.html      khung trang và menu
css/style.css   giao diện (điện thoại và máy tính)
js/data.js      từ vựng, sticker, avatar
js/core.js      lưu tiến độ, giọng đọc, âm thanh, hiệu ứng
js/games.js     6 trò chơi
js/app.js       trang chủ, chọn chủ đề, kết quả, bộ sưu tập, khu bố mẹ
```
