// js/ai-suggestion-handler.js - COMPLETE FIXED VERSION v7.0
console.log("🤖 AI Suggestion Handler v7.0 loaded");

const AIHandler = {
  API_ENDPOINTS: {
    suggestSchedule: "/api/ai/suggest-schedule",
    getTasks: "/api/tasks",
    getCalendarEvents: "/api/calendar/events",
  },

  /**
   * ======================================================
   * 1. MAIN INITIALIZATION - Hàm khởi tạo chính
   * ======================================================
   */
  async initAIModal() {
    try {
      console.log("🚀 Initializing AI modal...");

      // 1. Chờ modal sẵn sàng
      await this.waitForModalReady();

      // 2. Load và hiển thị tasks
      await this.populateAIModal();

      // 3. Setup tất cả event listeners
      this.setupAllEventListeners();

      // 4. Set default dates
      this.setDefaultDates();

      console.log("✅ AI modal initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing AI modal:", error);
      this.showErrorInModal(error.message);
    }
  },

  /**
   * Chờ modal sẵn sàng
   */
  async waitForModalReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max

      const check = () => {
        attempts++;

        const modal = document.getElementById("aiSuggestionModal");
        const modalContent = modal?.querySelector(".ai-modal-content");

        if (modal && modalContent) {
          console.log("✅ Modal is ready");
          resolve(true);
        } else if (attempts >= maxAttempts) {
          reject(new Error("Modal not ready after maximum attempts"));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  },

  /**
   * ======================================================
   * 2. TASK MANAGEMENT - Quản lý công việc
   * ======================================================
   */
  async populateAIModal() {
    try {
      console.log("📥 Populating AI modal with tasks...");

      const modal = document.getElementById("aiSuggestionModal");
      if (!modal) throw new Error("AI modal not found");

      const taskList = modal.querySelector(".task-list");
      if (!taskList) throw new Error("Task list not found");

      // Show loading
      taskList.innerHTML = this.getLoadingHTML();

      // Load tasks
      const tasks = await this.loadPendingTasks();
      console.log(`📋 Loaded ${tasks.length} tasks`);

      // Render tasks
      this.renderTasksToModal(tasks, taskList);

      console.log("✅ Modal populated with tasks");
    } catch (error) {
      console.error("❌ Error populating modal:", error);
      throw error;
    }
  },

  async loadPendingTasks() {
    try {
      console.log("🔍 Loading pending tasks...");

      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("No auth token found");

      let tasks = [];

      // Try primary endpoint
      try {
        const response = await fetch("/api/tasks?status=0", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            tasks = Array.isArray(result.data) ? result.data : [result.data];
            console.log(`✅ Found ${tasks.length} tasks from API`);
          }
        }
      } catch (apiError) {
        console.warn("API request failed:", apiError.message);
      }

      // Fallback to mock data if no tasks found
      if (tasks.length === 0) {
        console.warn("⚠️ No tasks from API, using mock data");
        return this.getMockTasks();
      }

      // Format tasks - FIX: Đảm bảo id là số
      return tasks.map((task) => {
        const taskId = task.MaCongViec || task.id || task.ID;
        return {
          id: taskId ? parseInt(taskId) : Math.random(),
          title: task.TieuDe || task.title || "Không tiêu đề",
          estimatedMinutes: task.ThoiGianUocTinh || 60,
          priority: task.MucDoUuTien || 2,
          color: task.MauSac || this.getPriorityColor(task.MucDoUuTien || 2),
          description: task.MoTa || "",
        };
      });
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      return this.getMockTasks();
    }
  },

  getMockTasks() {
    return [
      {
        id: 1,
        title: "Hoàn thiện báo cáo cuối kỳ",
        estimatedMinutes: 120,
        priority: 3,
        color: "#EF4444",
        description: "Viết báo cáo tổng kết dự án",
      },
      {
        id: 2,
        title: "Chuẩn bị slide thuyết trình",
        estimatedMinutes: 90,
        priority: 2,
        color: "#3B82F6",
        description: "Làm slide cho buổi meeting",
      },
      {
        id: 3,
        title: "Kiểm tra email công việc",
        estimatedMinutes: 45,
        priority: 1,
        color: "#10B981",
        description: "Trả lời email khách hàng",
      },
    ];
  },

  getPriorityColor(priority) {
    const colors = {
      1: "#10B981",
      2: "#3B82F6",
      3: "#F59E0B",
      4: "#EF4444",
    };
    return colors[priority] || "#8B5CF6";
  },

  renderTasksToModal(tasks, taskList) {
    if (!tasks || tasks.length === 0) {
      taskList.innerHTML = this.getEmptyStateHTML();
      return;
    }

    let html = "";
    tasks.forEach((task) => {
      const priorityClass = `priority-${task.priority}`;
      const duration = task.estimatedMinutes || 60;

      // FIXED: Đảm bảo checkbox có value và data-task-id đúng
      html += `
        <div class="task-item" data-task-id="${task.id}">
          <label class="task-checkbox-label">
            <input type="checkbox" 
                   class="task-checkbox" 
                   data-task-id="${task.id}"
                   value="${task.id}"
                   data-real-id="${task.id}">
            <span class="checkmark"></span>
          </label>
          <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-details">
              <span class="task-priority ${priorityClass}">
                Ưu tiên ${task.priority}
              </span>
              <span class="task-duration">
                <i class="far fa-clock"></i>
                ${duration} phút
              </span>
            </div>
          </div>
          <div class="task-color" style="background-color: ${task.color}"></div>
        </div>
      `;
    });

    taskList.innerHTML = html;
    this.updateTaskStats(tasks.length);
  },

  /**
   * ======================================================
   * 3. FORM SUBMIT HANDLING - Xử lý form submit (FIXED)
   * ======================================================
   */
  setupAllEventListeners() {
    console.log("🔗 Setting up all event listeners...");

    // 1. Form submit listener - FIXED VERSION
    const form = document.getElementById("aiSuggestionForm");
    if (form) {
      console.log("✅ Found AI form, setting up submit handler...");

      // Remove old listener nếu có
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);

      // Add new listener với arrow function để giữ context
      newForm.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 Form submit triggered!");
        this.handleFormSubmitAction();
      });

      console.log("✅ Form submit handler added");
    } else {
      console.error("❌ Form not found!");
    }

    // 2. Select all button
    const selectAllBtn = document.querySelector(
      "#aiSuggestionModal .btn-select-all"
    );
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleSelectAll();
      });
    }

    // 3. Checkbox listeners
    this.setupCheckboxListeners();

    // 4. Close buttons
    this.setupCloseButtons();

    console.log("✅ All event listeners setup complete");
  },

  async handleFormSubmitAction() {
    try {
      console.log("🚀 Starting form submission...");

      // 1. Get form data - Sử dụng hàm mới đã fix
      const formData = this.getFormDataFixed();
      if (!formData) return;

      console.log("📋 Form data:", formData);

      // 2. Validate
      if (!this.validateFormData(formData)) return;

      // 3. Show loading
      this.showFormLoading(true);

      // 4. Submit to AI API
      const result = await this.submitToAI(formData);

      // 5. Hide loading
      this.showFormLoading(false);

      // 6. Handle result
      if (result.success) {
        await this.handleSuccessResult(result, formData);
      } else {
        this.handleErrorResult(result);
      }
    } catch (error) {
      console.error("❌ Form submission error:", error);
      this.showFormLoading(false);
      this.showError("Lỗi: " + error.message);
    }
  },

  // FIXED VERSION: Lấy đúng task IDs
  getFormDataFixed() {
    try {
      console.log("🔍 Getting form data (fixed version)...");

      // Cách đúng: Lấy từ data-task-id của task-item
      const selectedTasks = [];
      const checkedCheckboxes = document.querySelectorAll(
        "#aiSuggestionModal .task-checkbox:checked"
      );

      checkedCheckboxes.forEach((checkbox) => {
        // Ưu tiên lấy từ data-task-id của parent element
        const taskItem = checkbox.closest(".task-item");
        if (taskItem && taskItem.dataset.taskId) {
          const taskId = taskItem.dataset.taskId;
          selectedTasks.push(parseInt(taskId));
          console.log(`✅ Added task ID: ${taskId} (from task-item)`);
        }
        // Fallback: lấy từ checkbox value
        else if (checkbox.value && checkbox.value !== "on") {
          selectedTasks.push(parseInt(checkbox.value));
          console.log(`✅ Added task ID: ${checkbox.value} (from checkbox)`);
        }
      });

      console.log(`📋 Selected ${selectedTasks.length} tasks:`, selectedTasks);

      if (selectedTasks.length === 0) {
        this.showError("Vui lòng chọn ít nhất một công việc!");
        return null;
      }

      // Get dates
      const startDate = document.getElementById("aiStartDate").value;
      const endDate = document.getElementById("aiEndDate").value;

      if (!startDate || !endDate) {
        this.showError("Vui lòng chọn khoảng thời gian!");
        return null;
      }

      // Get options
      const options = {
        avoidConflict:
          document.getElementById("aiOptionAvoidConflict")?.checked !== false,
        considerPriority:
          document.getElementById("aiOptionConsiderPriority")?.checked !==
          false,
        balanceWorkload:
          document.getElementById("aiOptionBalanceWorkload")?.checked !== false,
      };

      return {
        tasks: selectedTasks,
        startDate,
        endDate,
        options,
      };
    } catch (error) {
      console.error("❌ Error getting form data:", error);
      this.showError("Lỗi lấy dữ liệu form: " + error.message);
      return null;
    }
  },

  // Giữ nguyên hàm cũ cho compatibility
  getFormData() {
    return this.getFormDataFixed();
  },

  validateFormData(formData) {
    if (!formData.tasks || formData.tasks.length === 0) {
      this.showError("Vui lòng chọn ít nhất một công việc!");
      return false;
    }

    if (!formData.startDate || !formData.endDate) {
      this.showError("Vui lòng chọn khoảng thời gian!");
      return false;
    }

    // Check if end date is after start date
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end <= start) {
      this.showError("Ngày kết thúc phải sau ngày bắt đầu!");
      return false;
    }

    // Check if task IDs are valid numbers
    const invalidTasks = formData.tasks.filter((id) => isNaN(id) || id <= 0);
    if (invalidTasks.length > 0) {
      console.error("Invalid task IDs:", invalidTasks);
      this.showError("Có công việc không hợp lệ. Vui lòng thử lại.");
      return false;
    }

    return true;
  },

  async submitToAI(formData) {
    try {
      console.log("📤 Submitting to AI API:", formData);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await fetch("/api/ai/suggest-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      console.log("📥 AI API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText.substring(0, 200)}`
        );
      }

      const result = await response.json();
      console.log("🤖 AI API result:", result);

      if (!result.success) {
        throw new Error(result.message || "Lỗi xử lý AI");
      }

      return {
        success: true,
        data: result.data,
        message: result.message || "Thành công",
      };
    } catch (error) {
      console.error("❌ AI submission error:", error);
      return {
        success: false,
        message: error.message || "Lỗi kết nối AI",
      };
    }
  },

  async handleSuccessResult(result, formData) {
    console.log("✅ AI success:", result);

    // 1. Display results in modal
    this.displaySuccessResults(result.data);

    // 2. Add events to calendar
    if (result.data?.suggestions) {
      await this.addEventsToCalendar(result.data.suggestions);
    }

    // 3. Show success message
    this.showSuccess("🎉 AI đã tạo lịch trình thành công!");

    // 4. Close modal after delay
    setTimeout(() => {
      this.closeModal();
    }, 3000);
  },

  handleErrorResult(result) {
    console.error("❌ AI error:", result);
    this.showError(result.message || "Lỗi không xác định từ AI");
  },

  async addEventsToCalendar(suggestions) {
    try {
      if (!suggestions || suggestions.length === 0) return;

      console.log(`📅 Adding ${suggestions.length} events to calendar...`);

      if (window.AIModule && window.AIModule.loadAISuggestions) {
        await AIModule.loadAISuggestions(suggestions);
      } else {
        console.warn("⚠️ AIModule not available for adding events");
      }
    } catch (error) {
      console.error("❌ Error adding events to calendar:", error);
    }
  },

  /**
   * ======================================================
   * 4. UI HELPERS - Helper functions cho UI
   * ======================================================
   */
  setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 7); // 7 days from now

    const startDateInput = document.getElementById("aiStartDate");
    const endDateInput = document.getElementById("aiEndDate");

    if (startDateInput && endDateInput) {
      startDateInput.value = today.toISOString().split("T")[0];
      endDateInput.value = tomorrow.toISOString().split("T")[0];
      console.log(
        "📅 Set default dates:",
        startDateInput.value,
        "to",
        endDateInput.value
      );
    }
  },

  setupCheckboxListeners() {
    const taskList = document.querySelector("#aiSuggestionModal .task-list");
    if (!taskList) return;

    taskList.addEventListener("change", (e) => {
      if (e.target.classList.contains("task-checkbox")) {
        this.updateSelectedCount();
      }
    });
  },

  setupCloseButtons() {
    // Close button in header
    const closeBtn = document.querySelector("#aiSuggestionModal .modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.closeModal();
      });
    }

    // Cancel button in footer
    const cancelBtn = document.querySelector(
      "#aiSuggestionModal .btn-secondary"
    );
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.closeModal();
      });
    }
  },

  toggleSelectAll() {
    const checkboxes = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox"
    );
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

    checkboxes.forEach((cb) => {
      cb.checked = !allChecked;
    });

    this.updateSelectedCount();
  },

  updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox:checked"
    );
    const selectedCount = selectedCheckboxes.length;
    const totalCount = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox"
    ).length;

    console.log(`📊 Selected: ${selectedCount}/${totalCount} tasks`);

    const statsElement = document.querySelector(
      "#aiSuggestionModal .task-stats"
    );
    if (statsElement) {
      statsElement.innerHTML = `Đã chọn <strong>${selectedCount}</strong> / <strong>${totalCount}</strong> công việc`;
    }
  },

  updateTaskStats(count) {
    const statsElement = document.querySelector(
      "#aiSuggestionModal .task-stats"
    );
    if (statsElement) {
      statsElement.innerHTML = `Đã chọn <strong>0</strong> / <strong>${count}</strong> công việc`;
    }
  },

  showFormLoading(show) {
    const submitBtn = document.querySelector(
      '#aiSuggestionForm button[type="submit"]'
    );

    if (submitBtn) {
      if (show) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        console.log("⏳ Showing loading state...");
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-magic"></i> Tạo Lịch Trình AI';
        console.log("✅ Hiding loading state...");
      }
    }
  },

  displaySuccessResults(result) {
    const modalBody = document.querySelector(
      "#aiSuggestionModal .ai-modal-body"
    );
    if (!modalBody) return;

    // Hide form
    const form = modalBody.querySelector("#aiSuggestionForm");
    if (form) form.style.display = "none";

    // Show success message
    const successHTML = this.getSuccessHTML(result);
    modalBody.insertAdjacentHTML("beforeend", successHTML);
  },

  closeModal() {
    const modal = document.getElementById("aiSuggestionModal");
    if (modal) {
      modal.classList.remove("active", "show");
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
      console.log("✅ Modal closed");

      // Reset modal state khi đóng
      setTimeout(() => {
        if (modal.querySelector(".ai-summary-section")) {
          location.reload(); // Reload để reset hoàn toàn
        }
      }, 100);
    }
  },

  /**
   * ======================================================
   * 5. HTML TEMPLATES - Các template HTML
   * ======================================================
   */
  getLoadingHTML() {
    return `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Đang tải danh sách công việc...</p>
      </div>
    `;
  },

  getEmptyStateHTML() {
    return `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <p>Không có công việc nào chưa hoàn thành</p>
        <p class="text-sm text-gray-500 mt-2">Hãy tạo công việc mới trước khi sử dụng AI</p>
      </div>
    `;
  },

  getErrorHTML(message) {
    return `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message || "Đã xảy ra lỗi"}</p>
        <button class="retry-btn" onclick="AIHandler.initAIModal()">
          <i class="fas fa-redo"></i>
          Thử lại
        </button>
      </div>
    `;
  },

  getSuccessHTML(result) {
    const suggestionCount = result.suggestions?.length || 0;
    const summary = result.summary || `Đã tạo ${suggestionCount} khung giờ`;

    let suggestionsHTML = "";
    const previewSuggestions = result.suggestions?.slice(0, 3) || [];

    previewSuggestions.forEach((suggestion) => {
      const date = new Date(suggestion.scheduledTime);
      const timeStr = date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = date.toLocaleDateString("vi-VN");

      suggestionsHTML += `
        <div class="suggestion-item">
          <i class="far fa-calendar-check"></i>
          <div class="suggestion-info">
            <strong>Công việc #${suggestion.taskId}</strong>
            <small>${dateStr} lúc ${timeStr} (${
        suggestion.durationMinutes
      } phút)</small>
            <div class="text-xs text-gray-500 mt-1">${
              suggestion.reason || ""
            }</div>
          </div>
        </div>
      `;
    });

    if (suggestionCount > 3) {
      suggestionsHTML += `
        <div class="suggestion-more">
          + ${suggestionCount - 3} đề xuất khác
        </div>
      `;
    }

    const stats = result.statistics || {};

    return `
      <div class="ai-summary-section">
        <div class="summary-header success">
          <i class="fas fa-check-circle"></i>
          <h4>🎉 AI đã tạo lịch trình thành công!</h4>
        </div>
        <p><strong>${summary}</strong></p>
        
        <div class="ai-stats-grid">
          <div class="stat-item">
            <i class="fas fa-tasks"></i>
            <div>
              <strong>${stats.totalTasks || suggestionCount}</strong>
              <small>Công việc</small>
            </div>
          </div>
          <div class="stat-item">
            <i class="fas fa-clock"></i>
            <div>
              <strong>${
                stats.totalHours || Math.round(suggestionCount * 1.5)
              }</strong>
              <small>Giờ</small>
            </div>
          </div>
          <div class="stat-item">
            <i class="fas fa-calendar-days"></i>
            <div>
              <strong>${stats.daysUsed || 1}</strong>
              <small>Ngày</small>
            </div>
          </div>
        </div>
        
        <div class="suggestions-preview">
          <h5>📋 Xem trước đề xuất:</h5>
          <div class="suggestions-list">
            ${suggestionsHTML}
          </div>
        </div>
        
        <div class="summary-note">
          <i class="fas fa-lightbulb"></i>
          Những đề xuất này đã được thêm vào lịch AI của bạn
        </div>
        
        <div class="mt-6 text-center">
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-redo"></i>
            Tải lại trang
          </button>
        </div>
      </div>
    `;
  },

  /**
   * ======================================================
   * 6. UTILITIES - Tiện ích
   * ======================================================
   */
  showError(message) {
    console.error("❌ Error:", message);
    if (window.Utils && Utils.showToast) {
      Utils.showToast(message, "error");
    } else {
      alert("⚠️ " + message);
    }
  },

  showSuccess(message) {
    console.log("✅ Success:", message);
    if (window.Utils && Utils.showToast) {
      Utils.showToast(message, "success");
    }
  },

  showErrorInModal(message) {
    const modalBody = document.querySelector(
      "#aiSuggestionModal .ai-modal-body"
    );
    if (modalBody) {
      modalBody.innerHTML = this.getErrorHTML(message);
    }
  },

  /**
   * DEBUG HELPER - Kiểm tra tất cả task IDs trong modal
   */
  debugTaskIDs() {
    console.log("🔍 Debugging task IDs in modal...");

    const taskItems = document.querySelectorAll(
      "#aiSuggestionModal .task-item"
    );
    console.log(`Found ${taskItems.length} task items`);

    taskItems.forEach((item, index) => {
      const taskId = item.dataset.taskId;
      const checkbox = item.querySelector(".task-checkbox");

      console.log(`Task ${index}:`, {
        "data-task-id": taskId,
        "checkbox.value": checkbox?.value,
        "checkbox.dataset": checkbox?.dataset,
        "checkbox.checked": checkbox?.checked,
      });
    });

    const checkedBoxes = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox:checked"
    );
    console.log(`${checkedBoxes.length} checkboxes checked`);

    checkedBoxes.forEach((cb, index) => {
      console.log(`Checked ${index}: value="${cb.value}"`);
    });
  },
};

// Export to window
window.AIHandler = AIHandler;

// Auto-initialize when modal is shown
document.addEventListener("modal-shown", (e) => {
  if (e.detail && e.detail.modalId === "aiSuggestionModal") {
    console.log("🎯 AI Modal shown, initializing...");
    setTimeout(() => {
      AIHandler.initAIModal();
    }, 300);
  }
});

// Debug function để test
window.debugAIHandler = function () {
  console.log("=== AI Handler Debug ===");
  console.log("AIHandler available:", !!window.AIHandler);
  console.log("Methods:", Object.keys(AIHandler));

  // Test form submit
  const form = document.getElementById("aiSuggestionForm");
  console.log("Form exists:", !!form);

  // Debug task IDs
  if (AIHandler.debugTaskIDs) {
    AIHandler.debugTaskIDs();
  }
};

console.log("✅ AI Suggestion Handler v7.0 ready");
