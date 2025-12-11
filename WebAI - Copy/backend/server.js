require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { authenticateToken } = require("./middleware/auth");
const { dbPoolPromise, sql } = require("./config/database");

// Routes
const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const calendarRoutes = require("./routes/calendar");
const categoriesRoutes = require("./routes/categories"); // Thêm dòng này

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// CẤU HÌNH CƠ BẢN
// ===========================
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ===========================
// KẾT NỐI DATABASE
// ===========================
let dbPool;
const initializeDatabase = async () => {
  try {
    dbPool = await dbPoolPromise;
    console.log("Database connected successfully!");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

// ===========================
// ĐĂNG KÝ ROUTES (CHỈ MỘT LẦN DUY NHẤT!)
// ===========================
app.use("/api/auth", authRoutes);
app.use("/api/tasks", authenticateToken, tasksRoutes);
app.use("/api/calendar", authenticateToken, calendarRoutes);
app.use("/api/categories", authenticateToken, categoriesRoutes); // Thêm dòng này

// ===========================
// CÁC API CŨ BỊ GỌI SAI (404) → FIX BẰNG REDIRECT HOẶC TRẢ DỮ LIỆU
// ===========================

// WorkManager vẫn gọi /api/work/tasks → redirect về route chính
app.get("/api/work/tasks", authenticateToken, async (req, res) => {
  try {
    const result = await tasksRoutes(req, res); // Chuyển tiếp
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Cập nhật profile (cũ)
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const { hoten, SoDienThoai, DiaChi } = req.body;

    await pool
      .request()
      .input("userId", sql.Int, req.userId)
      .input("hoten", sql.NVarChar, hoten || "")
      .input("soDienThoai", sql.NVarChar, SoDienThoai || "")
      .input("diaChi", sql.NVarChar, DiaChi || "").query(`
        UPDATE Users 
        SET HoTen = @hoten, 
            SoDienThoai = @soDienThoai, 
            DiaChi = @diaChi 
        WHERE UserID = @userId
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ===========================
// HTML ROUTES (SPA)
// ===========================
const sendIndex = (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
const sendLogin = (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
const sendRegister = (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/register.html"));

// Trang đăng nhập/đăng ký
app.get("/login", sendLogin);
app.get("/register", sendRegister);

// Tất cả route khác → trả về index.html (cho SPA)
app.get(
  ["/", "/dashboard", "/home", "/work", "/salary", "/profile", "/calendar"],
  sendIndex
);

// Catch-all
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ success: false, message: "API không tồn tại" });
  } else {
    sendIndex(req, res);
  }
});

// ===========================
// XỬ LÝ LỖI TOÀN CỤC
// ===========================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
});

// ===========================
// KHỞI ĐỘNG SERVER
// ===========================
const startServer = async () => {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
  });
};

startServer();
