// js/ai-modal-handler.js - Xử lý modal AI
console.log("🤖 AI Modal Handler loaded");

const AIModalHandler = {
  /**
   * Khởi tạo modal AI
   */
  async init() {
    console.log("🤖 Initializing AI modal...");

    // Chờ modal được load
    await this.waitForModal();

    // Load tasks vào modal
    await this.loadTasksIntoModal();

    // Setup event listeners
    this.setupEventListeners();

    console.log("✅ AI modal initialized");
  },

  /**
   * Chờ modal được load vào DOM
   */
  async waitForModal() {
    return new Promise((resolve) => {
      const checkModal = () => {
        const modal = document.getElementById("aiSuggestionModal");
        if (modal && modal.querySelector(".task-list")) {
          console.log("✅ AI modal found");
          resolve(true);
        } else {
          console.log("⏳ Waiting for AI modal...");
          setTimeout(checkModal, 100);
        }
      };
      checkModal();
    });
  },

  /**
   * Load tasks vào modal
   */
  async loadTasksIntoModal() {
    try {
      console.log("📥 Loading tasks for modal...");

      // Gọi API để lấy tasks
      const tasks = await this.fetchPendingTasks();

      // Render tasks vào modal
      this.renderTasks(tasks);
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      this.showErrorMessage("Không thể tải danh sách công việc");
    }
  },

  /**
   * Fetch tasks từ API
   */
  async fetchPendingTasks() {
    const token = localStorage.getItem("auth_token");

    const response = await fetch("/api/tasks?status=0&limit=20", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data || [];
    } else {
      throw new Error(result.message || "Lỗi tải công việc");
    }
  },

  /**
   * Render tasks vào modal
   */
  renderTasks(tasks) {
    const taskList = document.querySelector("#aiSuggestionModal .task-list");
    if (!taskList) {
      console.error("❌ Task list element not found");
      return;
    }

    if (tasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-tasks"></i>
          <p>Không có công việc nào chưa hoàn thành</p>
        </div>
      `;
      return;
    }

    let html = "";

    tasks.forEach((task, index) => {
      const priorityClass = `priority-${task.MucDoUuTien || 2}`;
      const duration = task.ThoiGianUocTinh || 60;

      html += `
        <div class="task-item" data-task-id="${task.MaCongViec}">
          <label class="task-checkbox-label">
            <input type="checkbox" class="task-checkbox" data-task-id="${
              task.MaCongViec
            }">
            <span class="checkmark"></span>
          </label>
          <div class="task-content">
            <div class="task-title">${task.TieuDe || "Không tiêu đề"}</div>
            <div class="task-details">
              <span class="task-priority ${priorityClass}">
                Ưu tiên ${task.MucDoUuTien || 2}
              </span>
              <span class="task-duration">
                <i class="far fa-clock"></i>
                ${duration} phút
              </span>
            </div>
          </div>
          <div class="task-color" style="background-color: ${
            task.MauSac || "#8B5CF6"
          }"></div>
        </div>
      `;
    });

    taskList.innerHTML = html;

    // Update stats
    this.updateTaskStats(tasks.length);
  },

  /**
   * Update task statistics
   */
  updateTaskStats(count) {
    const statsElement = document.querySelector(
      "#aiSuggestionModal .task-stats"
    );
    if (statsElement) {
      statsElement.innerHTML = `Đã chọn <strong>0</strong> / <strong>${count}</strong> công việc`;
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Select all checkbox
    const selectAllBtn = document.querySelector(
      "#aiSuggestionModal .btn-select-all"
    );
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", () => this.toggleSelectAll());
    }

    // Form submit
    const form = document.getElementById("aiSuggestionForm");
    if (form) {
      form.addEventListener("submit", (e) => this.handleFormSubmit(e));
    }

    // Task checkbox change
    const taskList = document.querySelector("#aiSuggestionModal .task-list");
    if (taskList) {
      taskList.addEventListener("change", (e) => {
        if (e.target.classList.contains("task-checkbox")) {
          this.updateSelectedCount();
        }
      });
    }
  },

  /**
   * Toggle select all tasks
   */
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

  /**
   * Update selected tasks count
   */
  updateSelectedCount() {
    const checkboxes = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox:checked"
    );
    const totalCheckboxes = document.querySelectorAll(
      "#aiSuggestionModal .task-checkbox"
    ).length;

    const statsElement = document.querySelector(
      "#aiSuggestionModal .task-stats"
    );
    if (statsElement) {
      statsElement.innerHTML = `Đã chọn <strong>${checkboxes.length}</strong> / <strong>${totalCheckboxes}</strong> công việc`;
    }
  },

  /**
   * Handle form submit
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    try {
      console.log("🤖 Processing AI form submission...");

      // Get selected task IDs
      const selectedTasks = Array.from(
        document.querySelectorAll("#aiSuggestionModal .task-checkbox:checked")
      ).map((cb) => cb.dataset.taskId);

      if (selectedTasks.length === 0) {
        alert("Vui lòng chọn ít nhất một công việc");
        return;
      }

      // Get date range
      const startDate = document.getElementById("aiStartDate").value;
      const endDate = document.getElementById("aiEndDate").value;

      if (!startDate || !endDate) {
        alert("Vui lòng chọn khoảng thời gian");
        return;
      }

      // Get AI options
      const options = {
        avoidConflict:
          document.getElementById("aiOptionAvoidConflict")?.checked || true,
        considerPriority:
          document.getElementById("aiOptionConsiderPriority")?.checked || true,
        balanceWorkload:
          document.getElementById("aiOptionBalanceWorkload")?.checked || true,
      };

      // Call AI API
      const result = await window.AIHandler?.handleFormSubmit?.({
        tasks: selectedTasks,
        startDate,
        endDate,
        options,
      });

      if (result.success) {
        console.log("✅ AI suggestions received:", result);

        // Display results
        this.displayResults(result);

        // Dispatch event để calendar nhận suggestions
        window.dispatchEvent(
          new CustomEvent("ai-schedule-generated", {
            detail: result,
          })
        );
      } else {
        alert(result.message || "Lỗi xử lý AI");
      }
    } catch (error) {
      console.error("❌ Form submission error:", error);
      alert("Lỗi xử lý form: " + error.message);
    }
  },

  /**
   * Display results in modal
   */
  displayResults(result) {
    const modalBody = document.querySelector(
      "#aiSuggestionModal .ai-modal-body"
    );
    if (!modalBody) return;

    let html = `
      <div class="ai-summary-section">
        <div class="summary-header success">
          <i class="fas fa-check-circle"></i>
          <h4>AI đã tạo lịch trình thành công!</h4>
        </div>
        <p>${result.summary || "Đã tạo lịch trình"}</p>
        
        <div class="suggestions-preview">
          <h5>Xem trước đề xuất:</h5>
          <div class="suggestions-list">
    `;

    // Show first 3 suggestions
    const previewSuggestions = result.suggestions?.slice(0, 3) || [];
    previewSuggestions.forEach((suggestion) => {
      const date = new Date(suggestion.scheduledTime);
      const timeStr = date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = date.toLocaleDateString("vi-VN");

      html += `
        <div class="suggestion-item">
          <i class="far fa-calendar-check"></i>
          <div class="suggestion-info">
            <strong>${suggestion.taskTitle || "Công việc"}</strong>
            <small>${dateStr} lúc ${timeStr} (${
        suggestion.durationMinutes
      } phút)</small>
          </div>
        </div>
      `;
    });

    if (result.suggestions?.length > 3) {
      html += `
        <div class="suggestion-more">
          + ${result.suggestions.length - 3} đề xuất khác
        </div>
      `;
    }

    html += `
          </div>
        </div>
        
        <div class="summary-note">
          <i class="fas fa-lightbulb"></i>
          Những đề xuất này đã được thêm vào lịch của bạn
        </div>
      </div>
    `;

    modalBody.insertAdjacentHTML("beforeend", html);
  },

  /**
   * Show error message
   */
  showErrorMessage(message) {
    const taskList = document.querySelector("#aiSuggestionModal .task-list");
    if (taskList) {
      taskList.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
          <button class="retry-btn" onclick="AIModalHandler.loadTasksIntoModal()">
            <i class="fas fa-redo"></i>
            Thử lại
          </button>
        </div>
      `;
    }
  },
};

// Export to window
window.AIModalHandler = AIModalHandler;

// Auto-init khi modal được mở
document.addEventListener("modal-shown", (e) => {
  if (e.detail && e.detail.modalId === "aiSuggestionModal") {
    console.log("🎯 AI Modal shown, initializing...");
    setTimeout(() => {
      AIModalHandler.init();
    }, 300);
  }
});

console.log("✅ AI Modal Handler ready");
