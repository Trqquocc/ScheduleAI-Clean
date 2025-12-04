const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { dbPoolPromise, sql } = require("../config/database");
require("dotenv").config();

// ============================================
// GEMINI AI INITIALIZATION - WORKING VERSION
// ============================================
let geminiModel = null;
let geminiAvailable = false;

try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    console.log("ðŸ”§ Initializing Gemini AI...");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // âœ… Sá»¬ Dá»¤NG MODEL ÄÃšNG: gemini-2.5-flash (theo káº¿t quáº£ test)
    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Model má»›i nháº¥t, Ä‘Ã£ test thÃ nh cÃ´ng
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    geminiAvailable = true;
    console.log(
      "âœ… Gemini AI initialized successfully with model: gemini-2.5-flash"
    );
  } else {
    console.warn("âš ï¸ GEMINI_API_KEY is missing or empty in .env file");
    console.log("ðŸ”¶ AI will run in simulation mode");
  }
} catch (error) {
  console.error("âŒ Error initializing Gemini AI:", error.message);
  console.log("ðŸ”¶ AI will run in simulation mode");
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Láº¥y thÃ´ng tin chi tiáº¿t cá»§a tasks tá»« database
 */
async function getTaskDetailsFromDatabase(taskIds, userId) {
  try {
    if (!taskIds || taskIds.length === 0) {
      return [];
    }

    const pool = await dbPoolPromise;
    const taskIdList = taskIds.join(",");

    const query = `
      SELECT 
        cv.MaCongViec as id,
        cv.TieuDe as title,
        cv.ThoiGianUocTinh as estimatedMinutes,
        cv.MucDoUuTien as priority,
        cv.MucDoPhucTap as complexity,
        cv.MucDoTapTrung as focusLevel,
        cv.ThoiDiemThichHop as suitableTimeCode,
        lc.MauSac as color
      FROM CongViec cv
      LEFT JOIN LoaiCongViec lc ON cv.MaLoai = lc.MaLoai
      WHERE cv.MaCongViec IN (${taskIdList}) 
        AND cv.UserID = @userId
        AND cv.TrangThaiThucHien = 0
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(query);

    const taskDetails = result.recordset.map((task) => {
      const timeMap = {
        1: "morning",
        2: "noon",
        3: "afternoon",
        4: "evening",
        5: "anytime",
      };

      return {
        id: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes || 60,
        priority: task.priority || 2,
        complexity: task.complexity || 2,
        focusLevel: task.focusLevel || 2,
        suitableTime: timeMap[task.suitableTimeCode] || "anytime",
        color: task.color || "#8B5CF6",
      };
    });

    console.log(`ðŸ“Š Loaded ${taskDetails.length} task details from database`);
    return taskDetails;
  } catch (error) {
    console.error("âŒ Error fetching task details:", error);
    return [];
  }
}

/**
 * Láº¥y lá»‹ch hiá»‡n cÃ³ tá»« database
 */
async function getExistingEvents(userId, startDate, endDate) {
  try {
    const pool = await dbPoolPromise;

    const query = `
      SELECT 
        lt.GioBatDau as start_time,
        lt.GioKetThuc as end_time,
        cv.TieuDe as title
      FROM LichTrinh lt
      INNER JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
      WHERE cv.UserID = @userId
        AND lt.GioBatDau >= @startDate
        AND lt.GioBatDau <= @endDate
      ORDER BY lt.GioBatDau
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(endDate))
      .query(query);

    console.log(`ðŸ“… Found ${result.recordset.length} existing events`);
    return result.recordset.map((event) => ({
      ...event,
      start: event.start_time,
      end: event.end_time,
    }));
  } catch (error) {
    console.error("âŒ Error fetching existing events:", error.message);
    return [];
  }
}

/**
 * XÃ¢y dá»±ng prompt cho Gemini AI
 */
function buildGeminiPrompt(
  taskDetails,
  startDate,
  endDate,
  options,
  existingEvents
) {
  const taskList = taskDetails
    .map(
      (task) => `
    - CÃ´ng viá»‡c "${task.title}" (ID: ${task.id}):
      + Thá»i lÆ°á»£ng: ${task.estimatedMinutes} phÃºt
      + Æ¯u tiÃªn: ${task.priority}/4
      + Thá»i Ä‘iá»ƒm thÃ­ch há»£p: ${task.suitableTime}
      + Äá»™ phá»©c táº¡p: ${task.complexity}/5
  `
    )
    .join("\n");

  const existingSchedule = existingEvents
    .map(
      (event) => `
    - "${event.title}": ${new Date(event.start).toLocaleString("vi-VN")}
  `
    )
    .join("\n");

  return `Báº¡n lÃ  trá»£ lÃ½ láº­p lá»‹ch thÃ´ng minh. HÃ£y sáº¯p xáº¿p cÃ¡c cÃ´ng viá»‡c sau vÃ o lá»‹ch:

CÃC CÃ”NG VIá»†C Cáº¦N Sáº®P Xáº¾P:
${taskList}

KHOáº¢NG THá»œI GIAN: Tá»« ${startDate} Ä‘áº¿n ${endDate}

Lá»ŠCH HIá»†N CÃ“ (trÃ¡nh trÃ¹ng):
${existingEvents.length > 0 ? existingSchedule : "KhÃ´ng cÃ³ lá»‹ch"}

YÃŠU Cáº¦U:
1. ${
    options.considerPriority
      ? "Æ¯u tiÃªn viá»‡c quan trá»ng trÆ°á»›c"
      : "BÃ¬nh thÆ°á»ng"
  }
2. ${
    options.avoidConflict
      ? "TrÃ¡nh trÃ¹ng lá»‹ch cÃ³ sáºµn"
      : "KhÃ´ng cáº§n trÃ¡nh"
  }
3. ${
    options.balanceWorkload
      ? "CÃ¢n báº±ng cÃ´ng viá»‡c cÃ¡c ngÃ y"
      : "KhÃ´ng cáº§n cÃ¢n báº±ng"
  }
4. Xáº¿p viá»‡c vÃ o thá»i Ä‘iá»ƒm thÃ­ch há»£p cá»§a nÃ³ (morning/noon/afternoon/evening)
5. Má»—i ngÃ y khÃ´ng quÃ¡ 8 tiáº¿ng lÃ m viá»‡c
6. LÃ m viá»‡c tá»« 8:00 Ä‘áº¿n 22:00

HÃ£y tráº£ vá» Káº¾T QUáº¢ dÆ°á»›i dáº¡ng JSON (CHá»ˆ TRáº¢ Vá»€ JSON, KHÃ”NG GIáº¢I THÃCH):

{
  "suggestions": [
    {
      "taskId": [sá»‘],
      "scheduledTime": "YYYY-MM-DDTHH:mm:ss",
      "durationMinutes": [sá»‘],
      "reason": "lÃ½ do báº±ng tiáº¿ng Viá»‡t"
    }
  ],
  "summary": "tÃ³m táº¯t báº±ng tiáº¿ng Viá»‡t",
  "statistics": {
    "totalTasks": [sá»‘],
    "totalHours": [sá»‘],
    "daysUsed": [sá»‘]
  }
}

VÃ­ dá»¥ scheduledTime: "2025-12-04T09:00:00"
Thá»i gian pháº£i náº±m trong khoáº£ng tá»« ${startDate} Ä‘áº¿n ${endDate}.`;
}

/**
 * Gá»i Gemini AI API vá»›i error handling
 */
async function callGeminiAI(prompt) {
  try {
    console.log("ðŸ¤– Calling Gemini AI API...");

    if (!geminiAvailable || !geminiModel) {
      throw new Error("Gemini AI is not available");
    }

    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`ðŸ”„ Attempt ${attempt}/${maxRetries}`);

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("âœ… Gemini AI response received");

        // TÃ¬m vÃ  parse JSON
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate response
        if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
          throw new Error("Invalid response format: missing suggestions array");
        }

        console.log(`ðŸ“¦ Parsed ${parsed.suggestions.length} suggestions`);
        return parsed;
      } catch (attemptError) {
        lastError = attemptError;
        console.log(`âš ï¸ Attempt ${attempt} failed:`, attemptError.message);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error("âŒ Gemini AI API error:", error.message);
    throw error;
  }
}

/**
 * Táº¡o lá»‹ch trÃ¬nh simulation
 */
async function generateSimulatedSchedule(
  taskDetails,
  startDate,
  endDate,
  options,
  existingEvents
) {
  console.log("ðŸ”¶ Generating simulated schedule...");

  const suggestions = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const days = Math.max(1, Math.min(daysDiff, 7));

  const sortedTasks = [...taskDetails].sort((a, b) => b.priority - a.priority);

  const dailySlots = [
    { hour: 9, label: "sÃ¡ng" },
    { hour: 13, label: "chiá»u" },
    { hour: 16, label: "chiá»u muá»™n" },
    { hour: 19, label: "tá»‘i" },
  ];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];

    const dayIndex = i % days;
    const scheduleDate = new Date(start);
    scheduleDate.setDate(scheduleDate.getDate() + dayIndex);

    let slotIndex = 0;
    switch (task.suitableTime) {
      case "morning":
        slotIndex = 0;
        break;
      case "noon":
        slotIndex = 1;
        break;
      case "afternoon":
        slotIndex = 2;
        break;
      case "evening":
        slotIndex = 3;
        break;
      default:
        slotIndex = i % dailySlots.length;
    }

    const slot = dailySlots[slotIndex];
    scheduleDate.setHours(slot.hour, 0, 0, 0);

    let hasConflict = false;
    if (options.avoidConflict && existingEvents.length > 0) {
      const taskEnd = new Date(
        scheduleDate.getTime() + task.estimatedMinutes * 60000
      );
      hasConflict = existingEvents.some((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return scheduleDate < eventEnd && taskEnd > eventStart;
      });

      if (hasConflict) {
        slotIndex = (slotIndex + 1) % dailySlots.length;
        scheduleDate.setHours(dailySlots[slotIndex].hour);
      }
    }

    const reasons = [
      `Æ¯u tiÃªn ${task.priority}, xáº¿p vÃ o buá»•i ${slot.label}`,
      `PhÃ¹ há»£p vá»›i thá»i Ä‘iá»ƒm ${task.suitableTime}`,
      `CÃ´ng viá»‡c quan trá»ng, cáº§n hoÃ n thÃ nh sá»›m`,
      `PhÃ¢n bá»• há»£p lÃ½ trong káº¿ hoáº¡ch tuáº§n`,
    ];

    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    suggestions.push({
      taskId: task.id,
      scheduledTime: scheduleDate.toISOString(),
      durationMinutes: task.estimatedMinutes,
      reason: reason,
      color: task.color,
    });
  }

  const uniqueDays = new Set(
    suggestions.map((s) => new Date(s.scheduledTime).toDateString())
  ).size;

  const totalMinutes = suggestions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  return {
    suggestions,
    summary: `ÄÃ£ táº¡o ${
      suggestions.length
    } khung giá» trong ${uniqueDays} ngÃ y. Tá»•ng thá»i lÆ°á»£ng: ${Math.round(
      totalMinutes / 60
    )} giá».`,
    statistics: {
      totalTasks: suggestions.length,
      totalHours: Math.round(totalMinutes / 60),
      daysUsed: uniqueDays,
    },
  };
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/ai/suggest-schedule
 */
router.post("/suggest-schedule", authenticateToken, async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("ðŸ¤– AI SCHEDULE REQUEST RECEIVED");
  console.log("=".repeat(50));

  try {
    const userId = req.userId;
    const { tasks: taskIds, startDate, endDate, options = {} } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lÃ²ng chá»n Ã­t nháº¥t má»™t cÃ´ng viá»‡c",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lÃ²ng chá»n khoáº£ng thá»i gian",
      });
    }

    console.log(`ðŸ‘¤ User ID: ${userId}`);
    console.log(`ðŸ“‹ Tasks: ${taskIds.length} tasks`);
    console.log(`ðŸ“… Date range: ${startDate} to ${endDate}`);

    const taskDetails = await getTaskDetailsFromDatabase(taskIds, userId);
    if (taskDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "KhÃ´ng tÃ¬m tháº¥y cÃ´ng viá»‡c Ä‘Æ°á»£c chá»n",
      });
    }

    console.log(`ðŸ“Š Task details loaded: ${taskDetails.length} tasks`);

    let existingEvents = [];
    if (options.avoidConflict) {
      try {
        existingEvents = await getExistingEvents(userId, startDate, endDate);
        console.log(`ðŸ“… Existing events: ${existingEvents.length}`);
      } catch (eventError) {
        console.log(
          `âš ï¸ Could not load existing events: ${eventError.message}`
        );
        existingEvents = [];
      }
    }

    let aiResult;
    let mode = "simulation";

    if (geminiAvailable) {
      try {
        console.log("ðŸš€ Attempting to use Gemini AI...");
        const prompt = buildGeminiPrompt(
          taskDetails,
          startDate,
          endDate,
          options,
          existingEvents
        );

        aiResult = await callGeminiAI(prompt);
        mode = "gemini";
        console.log("âœ… Gemini AI processed successfully");
      } catch (aiError) {
        console.error("âŒ Gemini AI failed:", aiError.message);
        aiResult = await generateSimulatedSchedule(
          taskDetails,
          startDate,
          endDate,
          options,
          existingEvents
        );
        mode = "simulation_fallback";
      }
    } else {
      aiResult = await generateSimulatedSchedule(
        taskDetails,
        startDate,
        endDate,
        options,
        existingEvents
      );
      mode = "simulation";
    }

    if (!aiResult.suggestions || !Array.isArray(aiResult.suggestions)) {
      throw new Error("Invalid response format from AI");
    }

    const response = {
      success: true,
      data: {
        suggestions: aiResult.suggestions.map((suggestion) => ({
          taskId: suggestion.taskId,
          scheduledTime: suggestion.scheduledTime,
          durationMinutes: suggestion.durationMinutes,
          reason: suggestion.reason || "ÄÆ°á»£c xáº¿p tá»± Ä‘á»™ng",
          color: suggestion.color || "#8B5CF6",
        })),
        summary:
          aiResult.summary ||
          `ÄÃ£ táº¡o ${aiResult.suggestions.length} khung giá»`,
        statistics: aiResult.statistics || {
          totalTasks: aiResult.suggestions.length,
          totalHours: Math.round(
            aiResult.suggestions.reduce(
              (sum, s) => sum + s.durationMinutes,
              0
            ) / 60
          ),
          daysUsed: Math.min(
            new Set(
              aiResult.suggestions.map((s) =>
                new Date(s.scheduledTime).toDateString()
              )
            ).size,
            7
          ),
        },
        mode: mode,
      },
      message:
        mode === "gemini"
          ? "AI Ä‘Ã£ táº¡o lá»‹ch trÃ¬nh thÃ nh cÃ´ng"
          : "ÄÃ£ táº¡o lá»‹ch trÃ¬nh (cháº¿ Ä‘á»™ mÃ´ phá»ng)",
    };

    console.log(
      `ðŸ“ˆ Generated ${response.data.suggestions.length} suggestions`
    );
    console.log(`ðŸ·ï¸ Mode: ${mode}`);
    console.log("âœ… AI request completed successfully");
    console.log("=".repeat(50) + "\n");

    res.json(response);
  } catch (error) {
    console.error("âŒ AI processing failed:", error);

    res.status(500).json({
      success: false,
      message: "Lá»—i xá»­ lÃ½ AI",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      mode: "error",
    });
  }
});

/**
 * GET /api/ai/test
 */
router.get("/test", authenticateToken, (req, res) => {
  res.json({
    success: true,
    geminiAvailable: geminiAvailable,
    model: "gemini-2.5-flash",
    message: geminiAvailable
      ? "Gemini AI is ready to use"
      : "Gemini AI is not available (check GEMINI_API_KEY in .env)",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
