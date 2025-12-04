/**
 * ComponentLoader v2.0 - PRO VERSION WITH PERSISTENT SECTIONS
 * Giữ nguyên nội dung section khi chuyển qua lại (như React <KeepAlive>)
 */

(function () {
  "use strict";

  if (window.ComponentLoader) {
    console.log("ComponentLoader already loaded");
    return;
  }

  // Danh sách các section được "giữ nguyên" khi chuyển tab (persistent)
  const PERSISTENT_SECTIONS = new Set(["schedule"]); // Thêm tên section nếu muốn giữ nguyên

  window.ComponentLoader = {
    loadedComponents: new Set(), // Các container đã load HTML
    loadedScripts: new Set(), // Các script external đã load
    fullyLoadedSections: new Set(), // Section đã load đầy đủ (HTML + sidebar + scripts)

    // Load component thông minh
    async loadComponent(containerId, filePath, options = {}) {
      const { forceReload = false } = options;
      const container = document.getElementById(containerId);

      if (!container) {
        console.warn(`Container không tồn tại: #${containerId}`);
        return false;
      }

      // Nếu đã load và không force → bỏ qua
      if (this.loadedComponents.has(containerId) && !forceReload) {
        console.log(`Component đã tồn tại: ${containerId}`);
        return true;
      }

      try {
        console.log(`Đang load: ${filePath} → #${containerId}`);
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`404: ${filePath}`);

        const html = await response.text();
        container.innerHTML = html;
        await this.executeScripts(container);

        this.loadedComponents.add(containerId);
        container.dataset.loaded = "true";
        console.log(`ĐÃ LOAD XONG: ${containerId}`);

        return true;
      } catch (err) {
        console.error(`LỖI LOAD: ${filePath}`, err);
        container.innerHTML = `<div class="p-8 text-center text-red-600">Lỗi tải nội dung</div>`;
        return false;
      }
    },

    // Thực thi script an toàn, không load trùng
    async executeScripts(container) {
      const scripts = container.querySelectorAll("script");
      for (const script of scripts) {
        const newScript = document.createElement("script");
        if (script.src) {
          if (this.loadedScripts.has(script.src)) {
            script.remove();
            continue;
          }
          newScript.src = script.src;
          newScript.onload = () => this.loadedScripts.add(script.src);
          newScript.onerror = () =>
            console.error("Load script lỗi:", script.src);
        } else {
          newScript.textContent = script.textContent;
        }
        document.head.appendChild(newScript);
        script.remove();
      }
    },

    // Hàm chính: chuyển tab thông minh
    async loadPageContent(sectionName) {
      console.log(`Chuyển tab → ${sectionName}`);
      const containerId = `${sectionName}-section`;

      const pageMap = {
        schedule: "pages/calendar-content.html",
        work: "pages/work.html",
        salary: "pages/salary.html",
        profile: "pages/profile.html",
        ai: "pages/ai.html",
      };

      const filePath = pageMap[sectionName];
      if (!filePath) {
        console.error(`Không tìm thấy file cho section: ${sectionName}`);
        return false;
      }

      // TRƯỜNG HỢP ĐẶC BIỆT: Section persistent & đã load đầy đủ → chỉ init lại
      if (
        PERSISTENT_SECTIONS.has(sectionName) &&
        this.fullyLoadedSections.has(sectionName)
      ) {
        console.log(`${sectionName} đã load đầy đủ → chỉ khởi động lại module`);
        this.initializePageSpecific(containerId);
        return true;
      }

      // Load nội dung chính
      const success = await this.loadComponent(containerId, filePath, {
        forceReload: false,
      });

      if (!success) return false;

      // Load các phần phụ (sidebar, header riêng, v.v.) chỉ 1 lần
      if (sectionName === "schedule") {
        await this.loadComponent(
          "calendar-sidebar",
          "components/calendar-sidebar.html"
        );
      }

      // Đánh dấu section này đã load đầy đủ (HTML + sidebar + tất cả)
      if (PERSISTENT_SECTIONS.has(sectionName)) {
        this.fullyLoadedSections.add(sectionName);
        console.log(
          `Đã đánh dấu ${sectionName} là fully loaded (sẽ không reload nữa)`
        );
      }

      // Khởi động module tương ứng
      this.initializePageSpecific(containerId);

      return true;
    },

    // Khởi động module theo section
    initializePageSpecific(containerId) {
      console.log(`Khởi động module cho: ${containerId}`);

      const initMap = {
        "schedule-section": () => {
          if (window.CalendarModule?.init) {
            setTimeout(() => CalendarModule.init(), 100);
          }
        },
        "work-section": () => window.WorkManager?.init?.(),
        "salary-section": () => {
          window.SalaryManager?.init?.();
          window.TabManager?.init?.();
        },
        "profile-section": () => window.ProfileManager?.init?.(),
        "ai-section": () => console.log("AI section ready"),
      };

      const initFn = initMap[containerId];
      if (initFn) {
        try {
          initFn();
        } catch (e) {
          console.error("Lỗi khởi động module:", e);
        }
      }
    },

    // Khởi động toàn bộ app
    async init() {
      console.log("ComponentLoader v2.0 - Khởi động...");

      await this.loadComponent("sidebar-container", "components/sidebar.html");
      await this.loadComponent("navbar-container", "components/navbar.html");
      await this.loadModals();

      // Load section đang active
      const active = document.querySelector(".section.active");
      if (active) {
        const section = active.id.replace("-section", "");
        await this.loadPageContent(section);
      }

      console.log("TẤT CẢ ĐÃ SẴN SÀNG! (Persistent mode enabled)");
    },

    async loadModals() {
      await this.loadComponent(
        "createTaskModal",
        "components/modals/create-task-modal.html"
      );
      await this.loadComponent(
        "settingsModal",
        "components/modals/settings-modal.html"
      );
    },

    // Helper: Xem trạng thái persistent
    debug() {
      console.log("=== ComponentLoader Debug ===");
      console.log("Loaded components:", [...this.loadedComponents]);
      console.log("Fully loaded sections:", [...this.fullyLoadedSections]);
      console.log("Persistent sections:", [...PERSISTENT_SECTIONS]);
    },
  };

  // Thêm lệnh debug nhanh
  window.debugLoader = () => window.ComponentLoader.debug();

  console.log("ComponentLoader v2.0 (Persistent) đã sẵn sàng!");
})();
