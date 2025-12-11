const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware xác thực
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "Không có token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ success: false, message: "Token không hợp lệ" });
  }
};

// GET tất cả lịch trình
router.get("/events", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pool = await dbPoolPromise;

    const result = await pool.request().input("UserID", sql.Int, userId).query(`
        SELECT 
          MaLichTrinh,
          MaCongViec,
          UserID,
          TieuDe,
          GioBatDau,
          GioKetThuc,
          DaHoanThanh,
          GhiChu,
          AI_DeXuat,
          NgayTao
        FROM LichTrinh
        WHERE UserID = @UserID
        ORDER BY GioBatDau DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Lỗi load lịch:", error);
    res.status(500).json({ success: false });
  }
});

// POST – tạo sự kiện
router.post("/events", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const d = req.body;

    const result = await pool
      .request()
      .input("UserID", sql.Int, req.userId)
      .input("MaCongViec", sql.Int, d.taskId || null)
      .input("TieuDe", sql.NVarChar, d.title)
      .input("GioBatDau", sql.DateTime, new Date(d.start))
      .input("GioKetThuc", sql.DateTime, d.end ? new Date(d.end) : null)
      .input("DaHoanThanh", sql.Bit, d.completed ? 1 : 0)
      .input("GhiChu", sql.NVarChar, d.note || null)
      .input("AI_DeXuat", sql.Bit, 0)
      .input("NgayTao", sql.DateTime, new Date()).query(`
        INSERT INTO LichTrinh (
          UserID, MaCongViec, TieuDe,
          GioBatDau, GioKetThuc,
          DaHoanThanh, GhiChu, AI_DeXuat, NgayTao
        )
        OUTPUT INSERTED.MaLichTrinh
        VALUES (
          @UserID, @MaCongViec, @TieuDe,
          @GioBatDau, @GioKetThuc,
          @DaHoanThanh, @GhiChu, @AI_DeXuat, @NgayTao
        )
      `);

    res.json({ success: true, eventId: result.recordset[0].MaLichTrinh });
  } catch (error) {
    console.error("Lỗi tạo lịch:", error);
    res.status(500).json({ success: false });
  }
});

// PUT – cập nhật sự kiện
router.put("/events/:id", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const d = req.body;

    const request = pool
      .request()
      .input("MaLichTrinh", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId);

    const updates = [];

    if (d.title !== undefined) {
      updates.push("TieuDe = @TieuDe");
      request.input("TieuDe", sql.NVarChar, d.title);
    }

    if (d.note !== undefined) {
      updates.push("GhiChu = @GhiChu");
      request.input("GhiChu", sql.NVarChar, d.note);
    }

    if (d.start !== undefined) {
      updates.push("GioBatDau = @GioBatDau");
      request.input("GioBatDau", sql.DateTime, new Date(d.start));
    }

    if (d.end !== undefined) {
      updates.push("GioKetThuc = @GioKetThuc");
      request.input("GioKetThuc", sql.DateTime, d.end ? new Date(d.end) : null);
    }

    if (d.completed !== undefined) {
      updates.push("DaHoanThanh = @DaHoanThanh");
      request.input("DaHoanThanh", sql.Bit, d.completed ? 1 : 0);
    }

    if (updates.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Không có gì để cập nhật" });

    const query = `
      UPDATE LichTrinh SET ${updates.join(", ")}
      WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
    `;

    await request.query(query);

    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ success: false });
  }
});

// DELETE – xoá event
router.delete("/events/:id", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;

    await pool
      .request()
      .input("MaLichTrinh", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId).query(`
        DELETE FROM LichTrinh
        WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
      `);

    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa:", error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
