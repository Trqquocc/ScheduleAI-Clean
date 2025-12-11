-- NguoiDung: Thông tin người dùng
CREATE TABLE NguoiDung (
  MaNguoiDung INT IDENTITY(1,1) PRIMARY KEY,
  HoTen NVARCHAR(100) NOT NULL,
  Email NVARCHAR(100) UNIQUE NOT NULL,
  MatKhauHash NVARCHAR(255) NOT NULL,  --chuyển mật khẩu thành dạng hash để tăng tính bảo mật cho tài khoản
  LuongTheoGio DECIMAL(10,2) NULL, 
  NgayTao DATE DEFAULT GETDATE() -- lấy ngày tạo nhằm thống kê được dữ liệu từ ngày tạo đến cuối tháng ở tháng đầu tiên
);

-- LoaiCongViec: Phân loại công việc
CREATE TABLE LoaiCongViec (
  MaLoai INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  TenLoai NVARCHAR(100) NOT NULL,
  MauSac VARCHAR(20) DEFAULT '#3498db'
);

-- CongViec: Danh sách công việc
CREATE TABLE CongViec (
  MaCongViec INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  MaLoai INT NULL FOREIGN KEY REFERENCES LoaiCongViec(MaLoai),
  TieuDe NVARCHAR(255) NOT NULL,
  MoTa NVARCHAR(MAX) NULL,
  Tag NVARCHAR(255) NULL, -- Gắn nhãn
  ThoiLuongPhut INT NOT NULL, -- Thời gian ước tính hoàn thành công việc (phút)
  CoThoiGianCoDinh BIT DEFAULT 0, -- Có thời gian cố định hay không
  GioBatDauCoDinh DATETIME NULL, -- Giờ bắt đầu cố định
  TrangThaiThucHien TINYINT DEFAULT 0, -- 0: Chưa xếp, 1: Đã xếp, 2: Hoàn thành, 3: Hủy
  ThuTuUuTien INT NULL, -- Mức độ ưu tiên công việc (1 là ưu tiên cao nhất)
  NgayTao DATETIME DEFAULT GETDATE(),
  MaCongViecPhuThuoc INT NULL, -- Công việc phụ thuộc vào công việc này (nếu có)
  ThoiGianUocTinh INT NOT NULL, -- Thời gian ước tính cho công việc (phút)
  );


CREATE TABLE CongViecPhuThuoc (
  MaCongViecPhuThuoc INT IDENTITY(1,1) PRIMARY KEY,
  MaCongViecCha INT FOREIGN KEY REFERENCES CongViec(MaCongViec),  -- Công việc "cha"
  MaCongViecPhu INT FOREIGN KEY REFERENCES CongViec(MaCongViec),  -- Công việc "phụ"
  ThoiGianHoanThanhUocTinh INT NULL, -- Thời gian ước tính công việc "cha" hoàn thành (phút)
  TrangThaiPhuThuoc NVARCHAR(20) DEFAULT 'Chưa thực hiện',  -- Trạng thái công việc phụ thuộc (chưa hoàn thành, hoàn thành)
  NgayDuKien DATE NULL  -- Ngày dự kiến công việc phụ sẽ được thực hiện sau khi công việc "cha" hoàn thành
);

-- TieuChiAI: Tiêu chí AI xếp lịch
CREATE TABLE TieuChiAI (
  MaTieuChi INT IDENTITY(1,1) PRIMARY KEY,
  MaCongViec INT FOREIGN KEY REFERENCES CongViec(MaCongViec),
  MucDoUuTien INT NOT NULL CHECK (MucDoUuTien BETWEEN 1 AND 5),
  MucDoPhucTap INT NOT NULL CHECK (MucDoPhucTap BETWEEN 1 AND 5),
  MucDoTapTrung INT NOT NULL CHECK (MucDoTapTrung BETWEEN 1 AND 5),
  ThoiDiemThichHop TINYINT NULL CHECK (ThoiDiemThichHop BETWEEN 1 AND 4) 
  -- 1: Sáng, 2: Trưa, 3: Chiều, 4: Tối
);

CREATE TABLE LichTrinh (
  MaLichTrinh INT IDENTITY(1,1) PRIMARY KEY,
  MaCongViec INT FOREIGN KEY REFERENCES CongViec(MaCongViec),
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  GioBatDau DATETIME NOT NULL,
  GioKetThuc DATETIME NOT NULL,
  DaHoanThanh BIT DEFAULT 0,
  GhiChu NVARCHAR(500) NULL,
  AI_DeXuat BIT DEFAULT 0,
  NgayTao DATETIME DEFAULT GETDATE()
);

-- ThongKeNgay: Thống kê theo ngày
CREATE TABLE ThongKeNgay (
  MaThongKe INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  Ngay DATE NOT NULL,
  SoCongViecHoanThanh INT DEFAULT 0,
  SoCongViecDuKien INT DEFAULT 0,
  TongPhutLamViec INT DEFAULT 0,
  TiLeHoanThanh DECIMAL(5,2) DEFAULT 0,
  LuongTrongNgay DECIMAL(10,2) DEFAULT 0,
  MucDoHaiLong TINYINT NULL -- 1-5 do người dùng tự đánh giá
);

-- Bảng thống kê theo tháng
CREATE TABLE ThongKeThang (
  MaThongKe INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  Thang INT NOT NULL CHECK (Thang BETWEEN 1 AND 12),
  Nam INT NOT NULL,
  SoCongViecHoanThanh INT DEFAULT 0,
  SoCongViecDuKien INT DEFAULT 0,
  TongPhutLamViec INT DEFAULT 0,
  TiLeHoanThanh DECIMAL(5,2) DEFAULT 0,
  LuongTrongThang DECIMAL(10,2) DEFAULT 0,
  MucDoHaiLongTrungBinh DECIMAL(3,2) NULL, -- Điểm trung bình hài lòng trong tháng
  CONSTRAINT UQ_ThongKeThang_NguoiDung_ThangNam UNIQUE (MaNguoiDung, Thang, Nam)
);

-- Bảng thống kê theo quý
CREATE TABLE ThongKeQuy (
  MaThongKe INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  Quy INT NOT NULL CHECK (Quy BETWEEN 1 AND 4),
  Nam INT NOT NULL,
  SoCongViecHoanThanh INT DEFAULT 0,
  SoCongViecDuKien INT DEFAULT 0,
  TongPhutLamViec INT DEFAULT 0,
  TiLeHoanThanh DECIMAL(5,2) DEFAULT 0,
  LuongTrongQuy DECIMAL(10,2) DEFAULT 0,
  MucDoHaiLongTrungBinh DECIMAL(3,2) NULL,
  CONSTRAINT UQ_ThongKeQuy_NguoiDung_QuyNam UNIQUE (MaNguoiDung, Quy, Nam)
);

-- Bảng thống kê theo năm
CREATE TABLE ThongKeNam (
  MaThongKe INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  Nam INT NOT NULL,
  SoCongViecHoanThanh INT DEFAULT 0,
  SoCongViecDuKien INT DEFAULT 0,
  TongPhutLamViec INT DEFAULT 0,
  TiLeHoanThanh DECIMAL(5,2) DEFAULT 0,
  LuongTrongNam DECIMAL(10,2) DEFAULT 0,
  MucDoHaiLongTrungBinh DECIMAL(3,2) NULL,
  CONSTRAINT UQ_ThongKeNam_NguoiDung_Nam UNIQUE (MaNguoiDung, Nam)
);

--  ThoiGianNghi: Khoảng nghỉ chi tiết (tách khỏi JSON)
CREATE TABLE ThoiGianNghi (
  MaNghi INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  Ngay DATE NOT NULL,
  GioBatDau TIME NOT NULL,
  GioKetThuc TIME NOT NULL,
  LyDo NVARCHAR(255) NULL
);

-- ThietLapCaNhan: Cài đặt của người dùng
CREATE TABLE ThietLapCaNhan (
  MaThietLap INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT UNIQUE FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  GioBatDauLamViec TIME DEFAULT '08:00',
  GioKetThucLamViec TIME DEFAULT '18:00',
  NgayLamViecTrongTuan VARCHAR(20) DEFAULT '1,2,3,4,5', -- 1: Thứ Hai, 7: Chủ Nhật
  BuoiSangBatDau TIME DEFAULT '08:00',
  BuoiSangKetThuc TIME DEFAULT '12:00',
  BuoiChieuBatDau TIME DEFAULT '13:30',
  BuoiChieuKetThuc TIME DEFAULT '18:00',
  GhiChu NVARCHAR(MAX) NULL
);

-- PhienAIDeXuat: Lịch sử AI đề xuất
CREATE TABLE PhienAIDeXuat (
  MaPhien INT IDENTITY(1,1) PRIMARY KEY,
  MaNguoiDung INT FOREIGN KEY REFERENCES NguoiDung(MaNguoiDung),
  NgayDeXuat DATETIME DEFAULT GETDATE(),
  NoiDungYeuCau NVARCHAR(MAX) NULL,
  KetQuaDeXuat NVARCHAR(MAX) NULL,
  DaApDung BIT DEFAULT 0,
  ThoiGianApDung DATETIME NULL -- Mới thêm: thời điểm áp dụng đề xuất
);

-- Indexes giúp tăng tốc truy vấn
CREATE INDEX IX_CongViec_MaNguoiDung ON CongViec(MaNguoiDung);
CREATE INDEX IX_LichTrinh_MaNguoiDung ON LichTrinh(MaNguoiDung);
CREATE INDEX IX_LichTrinh_NgayGio ON LichTrinh(GioBatDau, GioKetThuc);
CREATE INDEX IX_ThongKeNgay_MaNguoiDung_Ngay ON ThongKeNgay(MaNguoiDung, Ngay);

-- Chỉ mục cho bảng thống kê tháng
CREATE INDEX IX_ThongKeThang_MaNguoiDung ON ThongKeThang(MaNguoiDung);
CREATE INDEX IX_ThongKeThang_MaNguoiDung_ThangNam ON ThongKeThang(MaNguoiDung, Thang, Nam);

-- Chỉ mục cho bảng thống kê quý
CREATE INDEX IX_ThongKeQuy_MaNguoiDung ON ThongKeQuy(MaNguoiDung);
CREATE INDEX IX_ThongKeQuy_MaNguoiDung_QuyNam ON ThongKeQuy(MaNguoiDung, Quy, Nam);

-- Chỉ mục cho bảng thống kê năm
CREATE INDEX IX_ThongKeNam_MaNguoiDung ON ThongKeNam(MaNguoiDung);
CREATE INDEX IX_ThongKeNam_MaNguoiDung_Nam ON ThongKeNam(MaNguoiDung, Nam);