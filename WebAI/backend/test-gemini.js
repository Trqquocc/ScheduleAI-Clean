/**
 * Script kiểm tra Gemini API Key
 * Chạy: node test-gemini.js
 */

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBjvuBaNpYe3wH_pJSwM_ApjDCpTZvf2AE";

console.log("=".repeat(60));
console.log("🔍 KIỂM TRA GEMINI API KEY");
console.log("=".repeat(60));
console.log(`📝 API Key: ${API_KEY.substring(0, 20)}...`);
console.log("");

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);

    // 1. Kiểm tra list models có sẵn
    console.log("📋 BƯỚC 1: Lấy danh sách models có sẵn...");
    console.log("-".repeat(60));

    try {
      // Gọi API để lấy danh sách models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
      );

      if (!response.ok) {
        console.error(
          `❌ API Error: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text();
        console.error(`Chi tiết lỗi: ${errorText}`);
        return;
      }

      const data = await response.json();

      if (data.models && data.models.length > 0) {
        console.log(`✅ Tìm thấy ${data.models.length} models:\n`);

        data.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          if (model.displayName) {
            console.log(`   📌 Tên hiển thị: ${model.displayName}`);
          }
          if (model.description) {
            console.log(`   📄 Mô tả: ${model.description}`);
          }
          if (model.supportedGenerationMethods) {
            console.log(
              `   🔧 Hỗ trợ: ${model.supportedGenerationMethods.join(", ")}`
            );
          }
          console.log("");
        });

        // Lọc ra models hỗ trợ generateContent
        const usableModels = data.models.filter(
          (m) =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes("generateContent")
        );

        console.log("=".repeat(60));
        console.log(`✅ CÓ ${usableModels.length} MODELS SỬ DỤNG ĐƯỢC:\n`);
        usableModels.forEach((model) => {
          console.log(`   • ${model.name}`);
        });

        // 2. Thử gọi API với model đầu tiên có sẵn
        if (usableModels.length > 0) {
          console.log("\n" + "=".repeat(60));
          console.log("🚀 BƯỚC 2: Test gọi API với model đầu tiên...");
          console.log("-".repeat(60));

          const testModelName = usableModels[0].name.split("/")[1]; // Lấy tên model
          console.log(`📌 Đang test model: ${testModelName}`);

          const model = genAI.getGenerativeModel({
            model: testModelName,
          });

          const prompt = "Chào bạn! Hãy trả lời ngắn gọn: 2+2 = ?";
          console.log(`💬 Prompt test: "${prompt}"`);

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          console.log(`✅ Phản hồi từ AI: "${text}"`);
          console.log("");
          console.log("🎉 API KEY HOẠT ĐỘNG HOÀN HẢO!");
          console.log(`📌 Bạn nên dùng model: ${testModelName}`);
        } else {
          console.log("❌ Không tìm thấy model nào hỗ trợ generateContent");
        }
      } else {
        console.log("❌ Không lấy được danh sách models");
        console.log("Dữ liệu trả về:", JSON.stringify(data, null, 2));
      }
    } catch (fetchError) {
      console.error("❌ Lỗi khi gọi API:", fetchError.message);
    }
  } catch (error) {
    console.error("\n❌ LỖI CHUNG:", error.message);

    if (error.message.includes("API_KEY_INVALID")) {
      console.log("\n💡 NGUYÊN NHÂN: API key không hợp lệ");
      console.log("🔧 GIẢI PHÁP:");
      console.log(
        "   1. Kiểm tra lại API key tại: https://aistudio.google.com/app/apikey"
      );
      console.log("   2. Tạo API key mới nếu cần");
      console.log("   3. Cập nhật vào file .env");
    } else if (error.message.includes("403")) {
      console.log(
        "\n💡 NGUYÊN NHÂN: API key chưa được kích hoạt hoặc bị giới hạn"
      );
      console.log("🔧 GIẢI PHÁP:");
      console.log("   1. Đăng nhập vào https://aistudio.google.com");
      console.log("   2. Chấp nhận điều khoản sử dụng");
      console.log("   3. Tạo API key mới");
    } else if (error.message.includes("429")) {
      console.log("\n💡 NGUYÊN NHÂN: Đã vượt quá giới hạn request");
      console.log("🔧 GIẢI PHÁP: Chờ một chút rồi thử lại");
    }
  }
}

// Thông tin về Gemini Free
console.log("📊 THÔNG TIN VỀ GEMINI API FREE:");
console.log("-".repeat(60));
console.log("✅ Gemini API CÓ PHIÊN BẢN FREE với giới hạn:");
console.log("   • 15 requests/phút");
console.log("   • 1,500 requests/ngày");
console.log("   • 1 triệu tokens/phút");
console.log("");
console.log("🔗 Tạo API key miễn phí tại:");
console.log("   👉 https://aistudio.google.com/app/apikey");
console.log("");
console.log("=".repeat(60));
console.log("");

// Chạy test
testGeminiAPI()
  .then(() => {
    console.log("\n" + "=".repeat(60));
    console.log("✅ HOÀN TẤT KIỂM TRA");
    console.log("=".repeat(60));
  })
  .catch((err) => {
    console.error("\n❌ Lỗi không mong muốn:", err);
  });
