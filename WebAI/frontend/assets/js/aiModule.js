/**
 * AI Module v2.1 - INTEGRATED WITH AI HANDLER
 * Xử lý lịch trình đề xuất bởi AI và hiển thị lên calendar
 */

(function () {
  "use strict";

  // SINGLETON PATTERN - Chỉ một instance duy nhất
  if (window.AIModule && window.AIModule._singleton) {
    console.log("🤖 AIModule singleton already exists, reusing...");
    return window.AIModule;
  }

  const AIModule = {
    _singleton: true,
    calendar: null,
    isInitialized: false,
    initPromise: null,
    currentView: "timeGridWeek",
    suggestedEvents: [],

    // IDs động (có thể config từ bên ngoài để tránh xung đột)
    calendarElementId: "ai-calendar",
    titleElementId: "ai-calendar-title",
    prevBtnId: "ai-cal-prev-btn",
    nextBtnId: "ai-cal-next-btn",
    todayBtnId: "ai-cal-today-btn",
    dayBtnId: "ai-cal-day-view",
    weekBtnId: "ai-cal-week-view",
    monthBtnId: "ai-cal-month-view",

    // ==========================================================
    // PUBLIC: init()
    // ==========================================================
    async init() {
      // Nếu đã init và calendar còn sống -> chỉ refresh
      if (this.isInitialized && this.calendar) {
        console.log("🤖 AIModule already initialized, refreshing UI...");
        this.refreshUI();
        return;
      }

      if (this.initPromise) {
        console.log("🤖 Waiting for existing init promise...");
        return this.initPromise;
      }

      console.log("🤖 Khởi tạo AIModule v2.1...");
      this.initPromise = this._initInternal();

      try {
        await this.initPromise;
        this.isInitialized = true;
        console.log("✅ AIModule khởi tạo thành công!");
      } catch (err) {
        console.error("❌ AI Module initialization failed:", err);
        this.showError(err);
        this.isInitialized = false;
      } finally {
        this.initPromise = null;
      }
    },

    // ==========================================================
    // PRIVATE: _initInternal()
    // ==========================================================
    async _initInternal() {
      const calendarEl = await this.waitForElement(
        this.calendarElementId,
        8000
      );
      if (!calendarEl)
        throw new Error(`Không tìm thấy phần tử #${this.calendarElementId}`);

      await Promise.all([this.waitForFullCalendar(), this.waitForUtils()]);

      // Xóa loading spinner và render calendar
      calendarEl.innerHTML = "";
      calendarEl.style.minHeight = "700px";

      // Tải events thực tế (lịch đã có của người dùng)
      const existingEvents = await this.loadEventsForAI();

      // Render calendar với events hiện có
      this.renderCalendar(existingEvents);

      // Setup navbar và nút AI
      setTimeout(() => {
        this.initializeNavbarEvents();
        this.setupAIButton();
        this.updateCalendarTitle();
      }, 100);
    },

    // ==========================================================
    // ⭐ LOAD EVENTS - Tải lịch đã có của người dùng
    // ==========================================================
    async loadEventsForAI() {
      try {
        console.log("📥 Loading existing events for AI calendar...");

        if (!Utils?.makeRequest) {
          console.warn("Utils.makeRequest không tồn tại");
          return [];
        }

        const res = await Utils.makeRequest("/api/calendar/events", "GET");
        if (!res.success || !Array.isArray(res.data)) return [];

        const events = res.data.map((ev) => ({
          id: ev.MaLichTrinh || ev.ID,
          title: ev.TieuDe || "Không tiêu đề",
          start: ev.GioBatDau,
          end: ev.GioKetThuc || undefined,
          backgroundColor: ev.Color || "#3788d8",
          borderColor: ev.Color || "#3788d8",
          extendedProps: {
            note: ev.GhiChu || "",
            completed: ev.DaHoanThanh === 1,
            taskId: ev.MaCongViec || null,
            aiSuggested: false, // Đánh dấu đây không phải AI suggestion
          },
        }));

        console.log(`✅ Loaded ${events.length} existing events`);
        return events;
      } catch (err) {
        console.error("❌ Load events error:", err);
        return [];
      }
    },

    // ==========================================================
    // ⭐ LOAD AI SUGGESTIONS - Hàm chính để hiển thị AI suggestions
    // ==========================================================
    async loadAISuggestions(suggestions) {
      try {
        console.log("🤖 Loading AI suggestions:", suggestions);

        if (
          !suggestions ||
          !Array.isArray(suggestions) ||
          suggestions.length === 0
        ) {
          if (Utils && Utils.showToast) {
            Utils.showToast("Không có đề xuất từ AI", "warning");
          }
          return [];
        }

        // Convert AI suggestions to calendar events
        const aiEvents = suggestions.map((suggestion, index) => {
          const start = new Date(suggestion.scheduledTime);
          const end = new Date(
            start.getTime() + (suggestion.durationMinutes || 60) * 60000
          );

          return {
            id: `ai-suggestion-${suggestion.taskId || index}-${Date.now()}`,
            title:
              suggestion.taskTitle ||
              suggestion.title ||
              `Công việc #${suggestion.taskId || index}`,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: suggestion.color || "#8B5CF6",
            borderColor: suggestion.color || "#7c3aed",
            classNames: ["event-ai-suggested"], // CSS class để tạo style đặc biệt
            extendedProps: {
              taskId: suggestion.taskId,
              reason: suggestion.reason || "AI đề xuất",
              aiSuggested: true,
              durationMinutes: suggestion.durationMinutes || 60,
              priority: suggestion.priority || "medium",
            },
          };
        });

        // Lưu AI events
        this.suggestedEvents = aiEvents;

        // THÊM MỚI: Không xóa calendar cũ, chỉ thêm AI events
        if (this.calendar) {
          console.log(`📅 Adding ${aiEvents.length} AI events to calendar...`);

          // Xóa các AI events cũ trước khi thêm mới
          const existingAIEvents = this.calendar
            .getEvents()
            .filter((event) => event.id && event.id.includes("ai-suggestion-"));

          existingAIEvents.forEach((event) => {
            event.remove();
          });

          // Thêm AI events mới
          aiEvents.forEach((event) => {
            this.calendar.addEvent(event);
          });

          // Refresh calendar để hiển thị
          this.calendar.render();

          // Navigate to first AI event
          if (aiEvents.length > 0) {
            const firstEventDate = new Date(aiEvents[0].start);
            this.calendar.gotoDate(firstEventDate);
          }
        }

        if (Utils && Utils.showToast) {
          Utils.showToast(
            `✅ Đã thêm ${aiEvents.length} đề xuất từ AI`,
            "success"
          );
        }

        console.log("✅ AI suggestions loaded successfully");
        return this.suggestedEvents;
      } catch (err) {
        console.error("❌ Error loading AI suggestions:", err);
        if (Utils && Utils.showToast) {
          Utils.showToast("Lỗi tải đề xuất AI", "error");
        }
        return [];
      }
    },

    // ==========================================================
    // ⭐ FIXED: OPEN AI SUGGESTION MODAL - CẢI THIỆN VỚI AIHandler
    // ==========================================================
    openAiSuggestionModal() {
      console.log("🤖 Opening AI suggestion modal...");

      // Phương pháp 1: Dùng ModalManager nếu có
      if (window.ModalManager && ModalManager.showModalById) {
        const modalElement = document.getElementById("aiSuggestionModal");

        if (!modalElement) {
          console.error("❌ AI Suggestion Modal element not found");

          // Load modal nếu chưa có
          if (window.ComponentLoader && ComponentLoader.loadComponent) {
            console.log("📄 Loading AI modal via ComponentLoader...");
            ComponentLoader.loadComponent(
              "aiSuggestionModal",
              "components/modals/ai-suggestion-modal.html",
              { executeScripts: true }
            )
              .then((success) => {
                if (success) {
                  setTimeout(() => {
                    ModalManager.showModalById("aiSuggestionModal");
                    // Gọi AIHandler để populate tasks
                    this.initAIModalContent();
                  }, 300);
                }
              })
              .catch((err) => {
                console.error("❌ Failed to load AI modal:", err);
                // Fallback to method 2
                this.showAIModalFallback();
              });
          } else {
            this.showAIModalFallback();
          }
          return;
        }

        ModalManager.showModalById("aiSuggestionModal");

        // Gọi AIHandler để populate tasks
        setTimeout(() => {
          this.initAIModalContent();
        }, 500);
      } else {
        // Phương pháp 2: Fallback - tự hiển thị modal
        this.showAIModalFallback();
      }
    },

    /**
     * Initialize AI modal content với AIHandler
     */
    async initAIModalContent() {
      try {
        console.log("🔄 Initializing AI modal content...");

        // Chờ cho modal và AIHandler sẵn sàng
        await this.waitForModalReady();

        // Gọi AIHandler để populate tasks
        if (window.AIHandler && window.AIHandler.populateAIModal) {
          console.log("📋 Calling AIHandler.populateAIModal...");
          await AIHandler.populateAIModal();
        } else {
          console.warn(
            "⚠️ AIHandler not available or missing populateAIModal method"
          );
          this.showModalError("AIHandler không khả dụng");
        }
      } catch (error) {
        console.error("❌ Error initializing AI modal:", error);
        this.showModalError(error.message);
      }
    },

    /**
     * Chờ modal và dependencies sẵn sàng
     */
    async waitForModalReady() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;

        const check = () => {
          attempts++;

          const modal = document.getElementById("aiSuggestionModal");
          const taskList = modal?.querySelector(".task-list");

          if (modal && taskList && window.AIHandler) {
            console.log("✅ Modal and dependencies ready");
            resolve(true);
          } else if (attempts >= maxAttempts) {
            reject(new Error("Modal not ready after maximum attempts"));
          } else {
            console.log(`⏳ Waiting for modal... (${attempts}/${maxAttempts})`);
            setTimeout(check, 100);
          }
        };

        check();
      });
    },

    /**
     * Phương pháp fallback: Tự hiển thị modal
     */
    showAIModalFallback() {
      console.log("🔄 Using fallback method to show AI modal");

      // Tạo modal HTML tạm thời
      const modalHtml = `
        <div class="modal active show" id="aiSuggestionModal" style="display: flex; z-index: 10001;">
          <div class="modal-overlay"></div>
          <div class="modal-content">
            <div class="ai-modal-content">
              <div class="ai-modal-header">
                <div class="modal-header-left">
                  <div class="modal-icon">
                    <i class="fas fa-robot"></i>
                  </div>
                  <div class="modal-title">
                    <h3>🤖 Trợ lý AI Lập Lịch</h3>
                    <p class="modal-subtitle">AI sẽ giúp bạn sắp xếp công việc thông minh</p>
                  </div>
                </div>
                <button class="modal-close" onclick="document.getElementById('aiSuggestionModal').remove()">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <div class="ai-modal-body">
                <div class="loading-state">
                  <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                  </div>
                  <p>Đang tải danh sách công việc...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal
      document.getElementById("aiSuggestionModal")?.remove();

      // Add modal to body
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      document.body.classList.add("modal-open");

      // Gọi AIHandler để load tasks
      setTimeout(() => {
        if (window.AIHandler && window.AIHandler.populateAIModal) {
          AIHandler.populateAIModal();
        }
      }, 300);
    },

    /**
     * Hiển thị lỗi trong modal
     */
    showModalError(message) {
      const modalBody = document.querySelector(
        "#aiSuggestionModal .ai-modal-body"
      );
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Không thể tải dữ liệu</p>
            <p class="text-sm">${message}</p>
            <button class="retry-btn" onclick="AIModule.openAiSuggestionModal()">
              <i class="fas fa-redo"></i>
              Thử lại
            </button>
          </div>
        `;
      }
    },

    // ==========================================================
    // REFRESH UI
    // ==========================================================
    refreshUI() {
      if (this.calendar) {
        this.calendar.render();
        this.updateCalendarTitle();
        this.initializeNavbarEvents();
        this.setActiveView(this.currentView);
      }
    },

    // ==========================================================
    // UTILS
    // ==========================================================
    waitForElement(id, timeout = 8000) {
      return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
          const el = document.getElementById(id);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    waitForFullCalendar(timeout = 10000) {
      return new Promise((resolve, reject) => {
        if (typeof FullCalendar !== "undefined") return resolve();

        const start = Date.now();
        const check = () => {
          if (typeof FullCalendar !== "undefined") resolve();
          else if (Date.now() - start > timeout)
            reject(new Error("FullCalendar timeout"));
          else setTimeout(check, 100);
        };
        check();
      });
    },

    waitForUtils(timeout = 10000) {
      return new Promise((resolve, reject) => {
        if (typeof Utils !== "undefined") return resolve();

        const start = Date.now();
        const check = () => {
          if (typeof Utils !== "undefined") resolve();
          else if (Date.now() - start > timeout)
            reject(new Error("Utils timeout"));
          else setTimeout(check, 100);
        };
        check();
      });
    },

    showError(error) {
      const el = document.getElementById(this.calendarElementId);
      if (!el) return;

      el.innerHTML = `
        <div class="flex items-center justify-center h-96">
          <div class="text-center p-10 bg-red-50 rounded-xl">
            <div class="text-6xl mb-4">❌</div>
            <h3 class="text-2xl font-bold text-red-700 mb-3">Không tải được lịch AI</h3>
            <p class="text-gray-600 mb-6">${error.message || error}</p>
            <button onclick="location.reload()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Tải lại trang
            </button>
          </div>
        </div>
      `;
    },

    // ==========================================================
    // RENDER CALENDAR
    // ==========================================================
    renderCalendar(events) {
      const containerEl = document.getElementById(this.calendarElementId);

      if (this.calendar) {
        this.calendar.destroy();
        this.calendar = null;
      }

      this.calendar = new FullCalendar.Calendar(containerEl, {
        headerToolbar: false,
        initialView: this.currentView,
        height: "100%",
        editable: false,
        selectable: false,
        events: events,
        eventResizableFromStart: false,
        eventDurationEditable: false,
        eventDisplay: "block",
        allDaySlot: false,
        slotMinTime: "00:00:00",
        slotMaxTime: "24:00:00",
        slotDuration: "00:30:00",
        slotLabelFormat: {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        },
        eventTimeFormat: {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
        views: {
          timeGridWeek: {
            type: "timeGrid",
            duration: { weeks: 1 },
            buttonText: "Tuần",
          },
          timeGridDay: {
            type: "timeGrid",
            duration: { days: 1 },
            buttonText: "Ngày",
          },
          dayGridMonth: {
            type: "dayGrid",
            duration: { months: 1 },
            buttonText: "Tháng",
          },
        },
        eventClick: (info) => this.handleEventClick(info),
        locale: "vi",
        firstDay: 1,
        nowIndicator: true,
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "17:00",
        },
      });

      this.calendar.render();
      console.log("✅ AI Calendar rendered");
    },

    // ==========================================================
    // EVENT HANDLING
    // ==========================================================
    handleEventClick(info) {
      const props = info.event.extendedProps;
      console.log("Event clicked:", info.event.title, props);

      // Hiển thị thông tin sự kiện
      const isAI = props.aiSuggested;
      const modalTitle = isAI ? "🤖 Sự kiện do AI đề xuất" : "📅 Sự kiện";

      const startTime = new Date(info.event.start).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(info.event.end).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (window.Utils && Utils.showToast) {
        Utils.showToast(
          `${modalTitle}\n${info.event.title}\n${startTime} - ${endTime}\n${
            props.reason || props.note || ""
          }`,
          "info"
        );
      }
    },

    // ==========================================================
    // AI BUTTON SETUP
    // ==========================================================
    setupAIButton() {
      const btn = document.getElementById("ai-suggest-btn");
      if (btn) {
        // Remove old listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener("click", () => this.openAiSuggestionModal());
      }
    },

    // ==========================================================
    // VIEW MANAGEMENT
    // ==========================================================
    changeView(view) {
      this.currentView = view;
      if (this.calendar) {
        this.calendar.changeView(view);
        this.updateCalendarTitle();
        this.setActiveView(view);
      }
    },

    setActiveView(view) {
      [this.dayBtnId, this.weekBtnId, this.monthBtnId].forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const isActive =
          (view === "timeGridDay" && id === this.dayBtnId) ||
          (view === "timeGridWeek" && id === this.weekBtnId) ||
          (view === "dayGridMonth" && id === this.monthBtnId);

        if (isActive) {
          btn.classList.add("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.remove("text-gray-700", "hover:bg-white");
        } else {
          btn.classList.remove("bg-white", "text-gray-900", "shadow-sm");
          btn.classList.add("text-gray-700", "hover:bg-white");
        }
      });
    },

    updateCalendarTitle() {
      const titleEl = document.getElementById(this.titleElementId);
      if (titleEl && this.calendar) {
        titleEl.textContent = this.calendar.view.title;
      }
    },

    // ==========================================================
    // NAVBAR BUTTONS
    // ==========================================================
    initializeNavbarEvents() {
      const controls = {
        [this.prevBtnId]: () => {
          this.calendar.prev();
          this.updateCalendarTitle();
        },
        [this.nextBtnId]: () => {
          this.calendar.next();
          this.updateCalendarTitle();
        },
        [this.todayBtnId]: () => {
          this.calendar.today();
          this.updateCalendarTitle();
        },
        [this.dayBtnId]: () => this.changeView("timeGridDay"),
        [this.weekBtnId]: () => this.changeView("timeGridWeek"),
        [this.monthBtnId]: () => this.changeView("dayGridMonth"),
      };

      Object.entries(controls).forEach(([id, handler]) => {
        const btn = document.getElementById(id);
        if (btn) {
          // Remove old listeners by cloning
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handler();
          });
        }
      });

      this.setActiveView(this.currentView);
    },

    // ==========================================================
    // DESTROY & CLEANUP
    // ==========================================================
    destroy() {
      if (this.calendar) {
        try {
          this.calendar.destroy();
        } catch (e) {}
        this.calendar = null;
      }
      this.isInitialized = false;
      console.log("🤖 AIModule đã được cleanup");
    },

    refresh() {
      if (this.calendar && this.isInitialized) {
        console.log("🤖 Refreshing AI calendar...");
        this.refreshUI();
      } else {
        console.log("🤖 AIModule not initialized, calling init()...");
        this.init();
      }
    },

    getCalendar() {
      return this.calendar;
    },
  };

  // Export singleton
  window.AIModule = AIModule;
  console.log("🤖 AIModule v2.1 (Integrated with AIHandler) đã sẵn sàng!");
})();
