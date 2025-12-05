import { GoogleGenerativeAI } from "@google/generative-ai";

// Dùng API key trực tiếp để test
const API_KEY = "AIzaSyCp8fxOCTgqcfPUPnzlyAu45KlICuAT_uU"; // THAY BẰNG KEY MỚI CỦA BẠN

if (!API_KEY || API_KEY.includes("YOUR")) {
  console.error("❌ Vui lòng thay YOUR_NEW_API_KEY_HERE bằng API key thật!");
  console.error("🔗 Tạo key tại: https://makersuite.google.com/app/apikey");
  process.exit(1);
}

console.log("=".repeat(60));
console.log("🧪 TEST GEMINI API");
console.log("=".repeat(60));
console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
console.log("");

async function testGemini() {
  try {
    // 1. Khởi tạo
    const genAI = new GoogleGenerativeAI(API_KEY);

    // 2. Test list models trước
    console.log("📋 1. Testing list models...");
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    if (!modelsResponse.ok) {
      const error = await modelsResponse.json();
      console.error("❌ Error listing models:", error);
      return;
    }

    const modelsData = await modelsResponse.json();
    console.log(`✅ Available models (${modelsData.models?.length || 0}):`);

    // Hiển thị các model có sẵn
    if (modelsData.models) {
      modelsData.models.slice(0, 5).forEach((model) => {
        console.log(`   - ${model.name} (${model.displayName || "No name"})`);
      });
      if (modelsData.models.length > 5) {
        console.log(`   ... and ${modelsData.models.length - 5} more`);
      }
    }

    // 3. Chọn model phù hợp
    // Các model thường dùng: gemini-1.5-flash, gemini-1.5-pro, gemini-pro
    const availableModel = modelsData.models?.find(
      (m) =>
        m.name.includes("gemini-1.5-flash") ||
        m.name.includes("gemini-1.5-pro") ||
        m.name.includes("gemini-pro")
    );

    if (!availableModel) {
      console.error("❌ Không tìm thấy model Gemini nào!");
      return;
    }

    console.log(`\n🎯 2. Using model: ${availableModel.name}`);

    // 4. Test generate content với model name đúng
    const model = genAI.getGenerativeModel({
      model: availableModel.name.split("/").pop(), // Lấy phần cuối cùng của tên model
    });

    console.log("💬 3. Testing generate content...");
    const result = await model.generateContent(
      "Hello! What is 2+2? Answer very briefly."
    );
    const text = await result.response.text();

    console.log("✅ 4. SUCCESS!");
    console.log("🤖 Response:", text);
  } catch (error) {
    console.error("❌ ERROR DETAILS:");
    console.error("   Message:", error.message);

    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }

    // Gợi ý sửa lỗi
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("1. Kiểm tra API key có hợp lệ không");
    console.log("2. API key có cần enable Gemini API không?");
    console.log("3. Vào: https://makersuite.google.com/app/apikey");
    console.log(
      "4. Bật Gemini API: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
    );
  }
}

// Chạy test
testGemini().then(() => {
  console.log("\n" + "=".repeat(60));
  console.log("🎉 TEST COMPLETED");
  console.log("=".repeat(60));
});
