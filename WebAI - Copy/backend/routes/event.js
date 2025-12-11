const express = require("express");
const router = express.Router();

// ✅ FIX: Sử dụng dbPoolPromise thay vì poolPromise
const { dbPoolPromise, sql } = require("../config/database");

// ✅ GET /api/calendar/events - Lấy tất cả events của user - FIXED VERSION
router.get("/events", async (req, res) => {
  try {
    const userId = req.user.UserID;
    console.log(`📅 Fetching events for user: ${userId}`);

    // ✅ FIX: Sử dụng dbPoolPromise
    const pool = await dbPoolPromise;

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          lt.MaLichTrinh AS ID,
          lt.MaCongViec,
          lt.UserID,
          lt.GioBatDau AS ThoiGianBatDau,
          lt.GioKetThuc AS ThoiGianKetThuc,
          lt.DaHoanThanh,
          lt.GhiChu,
          lt.AI_DeXuat,
          lt.NgayTao AS LichTrinhNgayTao,
          cv.TieuDe,
          cv.MoTa,
          cv.NgayTao AS CongViecNgayTao,
          lc.MauSac AS MaMau
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        LEFT JOIN LoaiCongViec lc ON cv.MaLoai = lc.MaLoai
        WHERE lt.UserID = @userId 
        ORDER BY lt.GioBatDau ASC
      `);

    console.log(
      `✅ Found ${result.recordset.length} events for user ${userId}`
    );

    // ✅ FIX: Xử lý dữ liệu an toàn hơn
    const events = result.recordset.map((ev) => {
      // Đảm bảo không có giá trị undefined
      const eventData = {
        ID: ev.ID || 0,
        title: ev.TieuDe || "Không có tiêu đề",
        TieuDe: ev.TieuDe || "Không có tiêu đề",
        start: ev.ThoiGianBatDau
          ? new Date(ev.ThoiGianBatDau).toISOString()
          : new Date().toISOString(),
        end: ev.ThoiGianKetThuc
          ? new Date(ev.ThoiGianKetThuc).toISOString()
          : null,
        ThoiGianBatDau: ev.ThoiGianBatDau,
        ThoiGianKetThuc: ev.ThoiGianKetThuc,
        backgroundColor: ev.MaMau || "#3788d8",
        MaMau: ev.MaMau || "#3788d8",
        extendedProps: {
          note: ev.GhiChu || "",
          completed: ev.DaHoanThanh || false,
          aiSuggested: ev.AI_DeXuat || false,
          taskId: ev.MaCongViec || null,
          description: ev.MoTa || "",
          created: ev.CongViecNgayTao || ev.LichTrinhNgayTao,
        },
      };

      return eventData;
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải lịch trình",
      error: error.message,
    });
  }
});

// ✅ POST /api/calendar/events - Tạo event mới - FIXED VERSION
router.post("/events", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const {
      MaCongViec,
      GioBatDau,
      GioKetThuc,
      GhiChu,
      AI_DeXuat = false,
    } = req.body;

    if (!GioBatDau) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // ✅ FIX: Sử dụng dbPoolPromise
    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("MaCongViec", sql.Int, MaCongViec)
      .input("GioBatDau", sql.DateTime, GioBatDau)
      .input("GioKetThuc", sql.DateTime, GioKetThuc)
      .input("GhiChu", sql.NVarChar, GhiChu || null)
      .input("AI_DeXuat", sql.Bit, AI_DeXuat)
      .input("NgayTao", sql.DateTime, new Date()).query(`
        INSERT INTO LichTrinh (
          MaCongViec, UserID, GioBatDau, GioKetThuc, 
          DaHoanThanh, GhiChu, AI_DeXuat, NgayTao
        ) 
        OUTPUT INSERTED.MaLichTrinh
        VALUES (
          @MaCongViec, @UserID, @GioBatDau, @GioKetThuc, 
          0, @GhiChu, @AI_DeXuat, @NgayTao
        )
      `);

    // ✅ FIX: Cập nhật trạng thái công việc nếu cần
    if (MaCongViec) {
      await pool
        .request()
        .input("MaCongViec", sql.Int, MaCongViec)
        .input("UserID", sql.Int, userId).query(`
          UPDATE CongViec
          SET TrangThaiThucHien = 1  -- Đang thực hiện
          WHERE MaCongViec = @MaCongViec AND UserID = @UserID
        `);
    }

    res.json({
      success: true,
      data: {
        id: result.recordset[0].MaLichTrinh,
        message: "Tạo sự kiện thành công",
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi tạo sự kiện",
      error: error.message,
    });
  }
});

// ✅ PUT /api/calendar/events/:id - Cập nhật event - FIXED VERSION
router.put("/events/:id", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const eventId = req.params.id;
    const { ThoiGianBatDau, ThoiGianKetThuc, GhiChu, DaHoanThanh } = req.body;

    // ✅ FIX: Sử dụng dbPoolPromise
    const pool = await dbPoolPromise;

    await pool
      .request()
      .input("MaLichTrinh", sql.Int, eventId)
      .input("UserID", sql.Int, userId)
      .input("GioBatDau", sql.DateTime, ThoiGianBatDau || null)
      .input("GioKetThuc", sql.DateTime, ThoiGianKetThuc || null)
      .input(
        "DaHoanThanh",
        sql.Bit,
        DaHoanThanh !== undefined ? DaHoanThanh : null
      )
      .input("GhiChu", sql.NVarChar, GhiChu || null).query(`
        UPDATE LichTrinh
        SET 
          GioBatDau = COALESCE(@GioBatDau, GioBatDau),
          GioKetThuc = COALESCE(@GioKetThuc, GioKetThuc),
          DaHoanThanh = COALESCE(@DaHoanThanh, DaHoanThanh),
          GhiChu = COALESCE(@GhiChu, GhiChu)
        WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
      `);

    // ✅ FIX: Cập nhật trạng thái công việc nếu hoàn thành
    if (DaHoanThanh !== undefined) {
      const eventResult = await pool
        .request()
        .input("MaLichTrinh", sql.Int, eventId)
        .input("UserID", sql.Int, userId).query(`
          SELECT MaCongViec FROM LichTrinh 
          WHERE MaLichTrinh = @MaLichTrinh AND UserID = @UserID
        `);

      const MaCongViec = eventResult.recordset[0]?.MaCongViec;

      if (MaCongViec) {
        await pool
          .request()
          .input("MaCongViec", sql.Int, MaCongViec)
          .input("TrangThaiThucHien", sql.TinyInt, DaHoanThanh ? 2 : 1)
          .input("UserID", sql.Int, userId).query(`
            UPDATE CongViec
            SET TrangThaiThucHien = @TrangThaiThucHien
            WHERE MaCongViec = @MaCongViec AND UserID = @UserID
          `);
      }
    }

    res.json({
      success: true,
      message: "Cập nhật sự kiện thành công",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật sự kiện",
      error: error.message,
    });
  }
});

// ✅ DELETE /api/calendar/events/:id - Xóa event - FIXED VERSION
router.delete("/events/:id", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const eventId = req.params.id;

    // ✅ FIX: Sử dụng dbPoolPromise
    const pool = await dbPoolPromise;

    // ✅ FIX: Lấy MaCongViec trước khi xóa
    const eventResult = await pool
      .request()
      .input("id", sql.Int, eventId)
      .input("userId", sql.Int, userId).query(`
        SELECT MaCongViec FROM LichTrinh 
        WHERE MaLichTrinh = @id AND UserID = @userId
      `);

    const MaCongViec = eventResult.recordset[0]?.MaCongViec;

    // Xóa lịch trình
    await pool
      .request()
      .input("id", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(
        "DELETE FROM LichTrinh WHERE MaLichTrinh = @id AND UserID = @userId"
      );

    // ✅ FIX: Cập nhật trạng thái công việc nếu có
    if (MaCongViec) {
      await pool
        .request()
        .input("MaCongViec", sql.Int, MaCongViec)
        .input("UserID", sql.Int, userId).query(`
          UPDATE CongViec
          SET TrangThaiThucHien = 0  -- Chờ thực hiện
          WHERE MaCongViec = @MaCongViec AND UserID = @UserID
        `);
    }

    res.json({
      success: true,
      message: "Xóa sự kiện thành công",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sự kiện",
      error: error.message,
    });
  }
});

// ✅ GET /api/calendar/range - Lấy events trong khoảng thời gian
router.get("/range", async (req, res) => {
  try {
    const userId = req.user.UserID;
    const { start, end } = req.query;

    // ✅ FIX: Sử dụng dbPoolPromise
    const pool = await dbPoolPromise;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số start hoặc end",
      });
    }

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("start", sql.DateTime, start)
      .input("end", sql.DateTime, end).query(`
        SELECT 
          lt.MaLichTrinh,
          lt.MaCongViec,
          lt.UserID,
          lt.GioBatDau,
          lt.GioKetThuc,
          lt.DaHoanThanh,
          lt.GhiChu,
          lt.AI_DeXuat,
          lt.NgayTao AS LichTrinhNgayTao,
          cv.TieuDe,
          cv.MoTa,
          cv.NgayTao AS CongViecNgayTao,
          lc.MauSac AS MaMau
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        LEFT JOIN LoaiCongViec lc ON cv.MaLoai = lc.MaLoai
        WHERE lt.UserID = @userId 
        AND lt.GioBatDau >= @start 
        AND lt.GioBatDau <= @end
        ORDER BY lt.GioBatDau ASC
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error("Error fetching events by range:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải lịch trình",
      error: error.message,
    });
  }
});

module.exports = router;
