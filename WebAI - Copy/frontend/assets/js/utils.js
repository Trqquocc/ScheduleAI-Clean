// frontend/assets/js/utils.js
// Check if already loaded
if (typeof window.CONFIG === "undefined") {
  /**
   * utils.js – Module tiện ích toàn cục
   * ĐÃ HOÀN THIỆN: Xử lý 409, token hết hạn, query params, toast đẹp
   */

  window.CONFIG = {
    API_BASE: "http://localhost:3000",
    ENDPOINTS: {
      register: "/api/auth/register",
      login: "/api/auth/login",
      logout: "/api/auth/logout",
      verify: "/api/auth/verify",
    },
    STORAGE_KEYS: {
      TOKEN: "auth_token",
      USER: "user_data",
    },
    HOURLY_WAGE: 0,
  };

  window.Utils = {
    // Gửi request API – Hỗ trợ query params & trả về cả lỗi có cấu trúc
    async makeRequest(endpoint, method = "GET", data = null, params = null) {
      let url = endpoint.startsWith("http")
        ? endpoint
        : CONFIG.API_BASE + endpoint;

      // Thêm query string nếu có (force=true, page=1, v.v.)
      if (params && Object.keys(params).length > 0) {
        const query = new URLSearchParams(params).toString();
        url += (url.includes("?") ? "&" : "?") + query;
      }

      const token =
        localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) ||
        localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options = {
        method,
        headers,
      };

      if (data !== null) {
        options.body = JSON.stringify(data);
      }

      try {
        console.log(`API [${method}] ${url}`);
        const response = await fetch(url, options);

        // Luôn parse JSON (trừ khi response rỗng)
        let result = {};
        const text = await response.text();
        if (text) {
          try {
            result = JSON.parse(text);
          } catch (e) {
            result = { message: text || "Lỗi server không phản hồi JSON" };
          }
        }

        // Xử lý token hết hạn
        if (response.status === 401 || response.status === 403) {
          this.handleTokenExpired();
          throw new Error("Token hết hạn hoặc không hợp lệ");
        }

        // Trả về object chuẩn hóa để caller dễ xử lý
        return {
          ...result,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      } catch (error) {
        console.error("API Request Failed:", error.message);

        // Chỉ toast lỗi mạng hoặc lỗi không phải do token
        if (!error.message.includes("Token")) {
          this.showToast(
            error.message || "Không thể kết nối đến server",
            "error"
          );
        }

        // Vẫn throw để caller có thể catch
        throw error;
      }
    },

    // Xử lý khi token hết hạn
    handleTokenExpired() {
      this.showToast("Phiên đăng nhập đã hết hạn", "warning");
      localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      localStorage.removeItem("token");

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1500);
    },

    // Toast đẹp, tự mất
    showToast(message, type = "info", duration = 3000) {
      document.querySelectorAll(".app-toast").forEach((t) => t.remove());

      const toast = document.createElement("div");
      toast.className = `app-toast fixed top-4 right-4 px-6 py-3 rounded-lg shadow-2xl text-white font-medium z-50 transform transition-all duration-300 scale-95 opacity-0`;

      const colors = {
        success: "bg-green-600",
        error: "bg-red-600",
        warning: "bg-yellow-600",
        info: "bg-blue-600",
      };

      toast.classList.add(colors[type] || colors.info);
      toast.textContent = message;
      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        toast.classList.replace("scale-95", "scale-100");
        toast.classList.replace("opacity-0", "opacity-100");
      });

      // Auto remove
      setTimeout(() => {
        toast.classList.add("opacity-0", "scale-95");
        toast.addEventListener("transitionend", () => toast.remove());
      }, duration);
    },

    // DOM Helpers
    getElement(selector) {
      return document.querySelector(selector);
    },

    getAllElements(selector) {
      return document.querySelectorAll(selector);
    },

    showElement(el) {
      el?.classList.remove("hidden");
    },

    hideElement(el) {
      el?.classList.add("hidden");
    },
  };

  console.log("Utils module loaded successfully");
} else {
  console.log("Utils already loaded, skipping...");
}
