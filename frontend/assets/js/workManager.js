// frontend/assets/js/workManager.js

(function () {
  "use strict";

  if (window.WorkManager) {
    console.log("⏭️ WorkManager already loaded");
    return;
  }

  window.WorkManager = {
    initialized: false,
    eventListeners: [],

    async init() {
      if (this.initialized) {
        console.log("ℹ️ WorkManager already initialized");
        return;
      }

      console.log("🚀 Khởi tạo WorkManager...");
      this.initialized = true;

      if (!(await this.waitForContainer())) {
        this.showErrorState();
        return;
      }

      await this.loadTasks();
      this.bindEvents();
    },

    async waitForContainer(retries = 10, delay = 100) {
      return new Promise((resolve) => {
        const checkContainer = (attempt = 0) => {
          const container = document.getElementById("work-items-container");
          if (container) {
            console.log("✅ Work container found");
            this.hideErrorState();
            resolve(true);
          } else if (attempt < retries) {
            setTimeout(() => checkContainer(attempt + 1), delay);
          } else {
            console.error("❌ Work container not found");
            resolve(false);
          }
        };
        checkContainer();
      });
    },

    showErrorState() {
      const errorContainer = document.getElementById("work-error-container");
      const workContainer = document.getElementById("work-items-container");

      if (errorContainer) errorContainer.classList.remove("hidden");
      if (workContainer) workContainer.style.display = "none";
    },

    hideErrorState() {
      const errorContainer = document.getElementById("work-error-container");
      const workContainer = document.getElementById("work-items-container");

      if (errorContainer) errorContainer.classList.add("hidden");
      if (workContainer) workContainer.style.display = "block";
    },

    async loadTasks() {
      try {
        console.log("📡 Loading tasks...");

        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest("/api/tasks", "GET");

        if (!result.success) {
          throw new Error(result.message || "Lỗi tải công việc");
        }

        const tasks = result.data || [];
        this.renderTasks(tasks);
      } catch (err) {
        console.error("❌ Error loading tasks:", err);
        this.showErrorState();
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast(err.message || "Không thể tải công việc", "error");
        }
      }
    },

    reload() {
      console.log("🔄 Reloading tasks...");
      this.loadTasks();
    },

    updateStats(tasks) {
      const total = tasks.length;
      const pending = tasks.filter((t) => t.TrangThaiThucHien !== 2).length;
      const completed = tasks.filter((t) => t.TrangThaiThucHien === 2).length;
      const totalTime = tasks.reduce(
        (sum, t) => sum + (t.ThoiGianUocTinh || 0),
        0
      );

      const totalEl = document.getElementById("total-tasks");
      const pendingEl = document.getElementById("pending-tasks");
      const completedEl = document.getElementById("completed-tasks");
      const timeEl = document.getElementById("total-time");

      if (totalEl) totalEl.textContent = total;
      if (pendingEl) pendingEl.textContent = pending;
      if (completedEl) completedEl.textContent = completed;
      if (timeEl) timeEl.textContent = `${totalTime} phút`;
    },
    renderTasks(tasks) {
      const container = document.getElementById("work-items-container");
      if (!container) {
        console.error("❌ No container for rendering tasks");
        return;
      }

      // Xóa loading indicator
      const loadingIndicator = document.getElementById("loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      if (tasks.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-tasks"></i>
        </div>
        <h3 class="empty-state-title">Không có công việc nào</h3>
        <p class="empty-state-description">
          Bạn chưa có công việc nào được tạo. Hãy bắt đầu bằng cách tạo công việc mới!
        </p>
        <button id="create-empty-task-btn" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus mr-2"></i>Tạo công việc đầu tiên
        </button>
      </div>
    `;

        // Bind sự kiện cho nút tạo công việc
        const createBtn = document.getElementById("create-empty-task-btn");
        if (createBtn) {
          createBtn.addEventListener("click", () => {
            if (window.ModalManager) {
              ModalManager.showCreateTaskModal();
            }
          });
        }

        return;
      }

      let html = `
  <table class="work-table">
    <thead>
      <tr>
        <th class="w-12"><input type="checkbox" id="select-all-tasks" class="rounded"></th>
        <th>Công việc</th>
        <th class="w-32">Ưu tiên</th>
        <th class="w-32">Trạng thái</th>
        <th class="w-40">Thời gian</th>
        <th class="w-48">Thao tác</th>
      </tr>
    </thead>
    <tbody>
`;

      tasks.forEach((task) => {
        const isCompleted = task.TrangThaiThucHien === 2;
        const priorityMap = { 1: "low", 2: "medium", 3: "high", 4: "high" };
        const priorityClass = priorityMap[task.MucDoUuTien] || "medium";
        const categoryColor = task.MauSac || "#3B82F6";

        html += `
    <tr data-task-id="${task.MaCongViec}" class="${
          isCompleted ? "completed" : ""
        } priority-${priorityClass}">
      <td><input type="checkbox" class="task-checkbox rounded"></td>
      <td>
        <div class="flex items-center gap-3">
          <div class="w-1 h-12 rounded" style="background-color: ${categoryColor}"></div>
          <div class="flex-1">
            <div class="font-medium text-gray-900 ${
              isCompleted ? "line-through text-gray-500" : ""
            }">
              ${task.TieuDe}
            </div>
            ${
              task.MoTa
                ? `<div class="text-sm text-gray-600 mt-1">${task.MoTa}</div>`
                : ""
            }
          </div>
        </div>
      </td>
      <td>
        <span class="priority-indicator priority-${priorityClass}">
          <i class="fas fa-circle text-xs"></i>
          ${
            priorityClass === "high"
              ? "Cao"
              : priorityClass === "medium"
              ? "Trung bình"
              : "Thấp"
          }
        </span>
      </td>
      <td>
        <span class="status-badge ${
          isCompleted ? "status-completed" : "status-pending"
        }">
          ${isCompleted ? "Hoàn thành" : "Đang chờ"}
        </span>
      </td>
      <td class="text-sm text-gray-600">
        <i class="fas fa-clock mr-1"></i>${task.ThoiGianUocTinh || 60} phút
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn toggle-complete" data-task-id="${
            task.MaCongViec
          }">
            <i class="fas ${isCompleted ? "fa-undo" : "fa-check"}"></i>
            ${isCompleted ? "Mở lại" : "Hoàn thành"}
          </button>
          <button class="action-btn edit-task" data-task-id="${
            task.MaCongViec
          }">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="action-btn delete-task" data-task-id="${
            task.MaCongViec
          }">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </td>
    </tr>
  `;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;
      // ✅ FIX: Truyền tasks vào bindTableEvents
      this.bindTableEvents(tasks);

      // Setup filter và search
      this.setupFilters();

      console.log(`✅ Rendered ${tasks.length} tasks in table format`);
    },

    // Thêm hàm bindTableEvents để xử lý sự kiện
    bindTableEvents(tasks = []) {
      console.log(`🔗 Binding events for ${tasks.length} tasks`);

      // ✅ Toggle complete
      document.querySelectorAll(".toggle-complete").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const taskId = e.currentTarget.dataset.taskId;
          const isCompleted = e.currentTarget.textContent.includes("Mở lại");

          console.log(
            `🎯 Toggle task ${taskId}, currently: ${
              isCompleted ? "completed" : "pending"
            }`
          );

          await this.updateTaskStatus(taskId, !isCompleted);
        });
      });

      // ✅ Edit task
      document.querySelectorAll(".edit-task").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const taskId = e.currentTarget.dataset.taskId;
          console.log(`✏️ Edit task ${taskId}`);

          await this.editTask(taskId);
        });
      });

      // ✅ Delete task
      document.querySelectorAll(".delete-task").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const taskId = e.currentTarget.dataset.taskId;
          console.log(`🗑️ Delete task ${taskId}`);

          await this.deleteTask(taskId);
        });
      });

      // Select all checkbox
      const selectAll = document.getElementById("select-all-tasks");
      if (selectAll) {
        selectAll.addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
            checkbox.checked = isChecked;
          });
        });
      }

      // Individual checkboxes
      document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this.updateSelectAllCheckbox();
        });
      });

      console.log(`✅ Bound events for ${tasks.length} tasks`);
    },

    // Thêm hàm setupFilters
    setupFilters() {
      const statusFilter = document.getElementById("status-filter");
      const priorityFilter = document.getElementById("priority-filter");
      const searchInput = document.getElementById("task-search");

      if (statusFilter) {
        statusFilter.addEventListener("change", () => this.filterTasks());
      }

      if (priorityFilter) {
        priorityFilter.addEventListener("change", () => this.filterTasks());
      }

      if (searchInput) {
        searchInput.addEventListener("input", () => this.filterTasks());
      }
    },

    // Thêm hàm setupFilters
    setupFilters() {
      const statusFilter = document.getElementById("status-filter");
      const priorityFilter = document.getElementById("priority-filter");
      const searchInput = document.getElementById("task-search");

      if (statusFilter) {
        statusFilter.addEventListener("change", () => this.filterTasks());
      }

      if (priorityFilter) {
        priorityFilter.addEventListener("change", () => this.filterTasks());
      }

      if (searchInput) {
        searchInput.addEventListener("input", () => this.filterTasks());
      }
    },

    // Thêm hàm filterTasks
    filterTasks() {
      const statusFilter =
        document.getElementById("status-filter")?.value || "all";
      const priorityFilter =
        document.getElementById("priority-filter")?.value || "all";
      const searchText =
        document.getElementById("task-search")?.value.toLowerCase() || "";

      const rows = document.querySelectorAll(".work-table tbody tr");
      let visibleCount = 0;

      rows.forEach((row) => {
        const taskId = row.dataset.taskId;
        const isCompleted = row.classList.contains("completed");
        const priorityClass = Array.from(row.classList).find((cls) =>
          cls.includes("priority-")
        );

        let priorityValue = "medium";
        if (priorityClass?.includes("high")) priorityValue = "high";
        else if (priorityClass?.includes("low")) priorityValue = "low";

        const title =
          row
            .querySelector("td:nth-child(2) .font-medium")
            ?.textContent.toLowerCase() || "";
        const description =
          row
            .querySelector("td:nth-child(2) .text-sm")
            ?.textContent.toLowerCase() || "";

        // Kiểm tra status filter
        let statusMatch = true;
        if (statusFilter === "pending") {
          statusMatch = !isCompleted;
        } else if (statusFilter === "completed") {
          statusMatch = isCompleted;
        }

        // Kiểm tra priority filter
        let priorityMatch = true;
        if (priorityFilter !== "all") {
          priorityMatch = priorityValue === priorityFilter;
        }

        // Kiểm tra search
        let searchMatch = true;
        if (searchText) {
          searchMatch =
            title.includes(searchText) || description.includes(searchText);
        }

        // Hiển thị/ẩn dòng
        const shouldShow = statusMatch && priorityMatch && searchMatch;
        row.style.display = shouldShow ? "" : "none";

        if (shouldShow) visibleCount++;
      });

      // Cập nhật số lượng hiển thị
      const countElement = document.querySelector(
        ".work-table-container + .mt-4"
      );
      if (countElement) {
        countElement.innerHTML = `Hiển thị <span class="font-semibold">${visibleCount}</span> công việc`;
      }
    },

    // Thêm hàm updateSelectAllCheckbox
    updateSelectAllCheckbox() {
      const checkboxes = document.querySelectorAll(".task-checkbox");
      const selectAll = document.getElementById("select-all-tasks");

      if (!selectAll || checkboxes.length === 0) return;

      const checkedCount = Array.from(checkboxes).filter(
        (cb) => cb.checked
      ).length;

      if (checkedCount === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      } else if (checkedCount === checkboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
      } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
      }
    },

    async updateTaskStatus(taskId, completed) {
      try {
        console.log(
          `📝 Updating task ${taskId} to ${completed ? "completed" : "pending"}`
        );

        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
          TrangThaiThucHien: completed ? 2 : 0,
        });

        if (!result.success) {
          throw new Error(result.message || "Cập nhật thất bại");
        }

        Utils.showToast(
          `Đã ${completed ? "hoàn thành" : "hủy hoàn thành"} công việc`,
          "success"
        );

        // Reload tasks
        await this.loadTasks();
      } catch (err) {
        console.error("❌ Error updating task:", err);
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast("Cập nhật trạng thái thất bại", "error");
        }
      }
    },

    async deleteTask(id) {
      try {
        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        // Tìm công việc trong bảng để hiển thị thông tin
        const taskRow = document.querySelector(`tr[data-task-id="${id}"]`);
        let taskTitle = "";

        if (taskRow) {
          taskTitle =
            taskRow.querySelector("td:nth-child(2) .font-medium")
              ?.textContent || "Công việc này";
        }

        // Hiển thị xác nhận với sweetalert2 hoặc confirm
        const confirmation = await Swal.fire({
          title: "Xác nhận xóa",
          html: `Bạn có chắc chắn muốn xóa công việc "<strong>${taskTitle}</strong>"?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Xóa",
          cancelButtonText: "Hủy",
          reverseButtons: true,
        });

        if (!confirmation.isConfirmed) {
          if (typeof Utils !== "undefined" && Utils.showToast) {
            Utils.showToast("Đã hủy xóa", "info");
          }
          return;
        }

        // Gửi request xóa
        const result = await Utils.makeRequest(`/api/tasks/${id}`, "DELETE");

        if (result.success) {
          // Hiển thị thông báo thành công
          await Swal.fire({
            title: "Đã xóa!",
            text: result.message || "Công việc đã được xóa thành công.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          // Tải lại danh sách công việc
          await this.loadTasks();

          // Dispatch event để các module khác biết
          document.dispatchEvent(
            new CustomEvent("taskDeleted", {
              detail: { taskId: id },
            })
          );
        } else {
          // Xử lý các trường hợp đặc biệt
          if (result.requireConfirmation) {
            const forceConfirmation = await Swal.fire({
              title: "Xác nhận thêm",
              html: `${result.message}<br><br>${result.details}<br><br>Bạn vẫn muốn xóa?`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#d33",
              cancelButtonColor: "#3085d6",
              confirmButtonText: "Vẫn xóa",
              cancelButtonText: "Hủy",
            });

            if (forceConfirmation.isConfirmed) {
              // Gửi lại với force=true
              const forceResult = await Utils.makeRequest(
                `/api/tasks/${id}?force=true`,
                "DELETE"
              );

              if (forceResult.success) {
                await Swal.fire({
                  title: "Đã xóa!",
                  text:
                    forceResult.message || "Công việc đã được xóa thành công.",
                  icon: "success",
                  timer: 2000,
                  showConfirmButton: false,
                });

                await this.loadTasks();
                document.dispatchEvent(
                  new CustomEvent("taskDeleted", {
                    detail: { taskId: id },
                  })
                );
              } else {
                throw new Error(forceResult.message || "Xóa thất bại");
              }
            }
          } else {
            throw new Error(result.message || "Xóa thất bại");
          }
        }
      } catch (err) {
        console.error("❌ Error deleting task:", err);

        // Hiển thị lỗi
        await Swal.fire({
          title: "Lỗi!",
          text: err.message || "Không thể xóa công việc. Vui lòng thử lại.",
          icon: "error",
          confirmButtonText: "Đóng",
        });
      }
    },

    editTask(id) {
      console.log(`✏️ Editing task ${id}`);

      // Load task data từ server
      Utils.makeRequest(`/api/tasks/${id}`, "GET")
        .then((result) => {
          if (result.success && result.data) {
            // Mở modal edit với dữ liệu task
            if (window.ModalManager && ModalManager.showCreateTaskModal) {
              ModalManager.showCreateTaskModal(result.data);
            } else {
              Utils.showToast("Không thể mở chỉnh sửa", "error");
            }
          } else {
            Utils.showToast("Không tìm thấy công việc", "error");
          }
        })
        .catch((error) => {
          console.error("❌ Error loading task:", error);
          Utils.showToast("Lỗi tải công việc", "error");
        });
    },

    bindEvents() {
      // Nút tạo công việc mới
      const createBtn = document.getElementById("create-task-btn");
      if (createBtn) {
        createBtn.addEventListener("click", () => {
          if (window.ModalManager) {
            ModalManager.showCreateTaskModal();
          }
        });
      }

      // Nút tạo công việc đầu tiên (trong empty state)
      document.addEventListener("click", (e) => {
        if (e.target && e.target.id === "create-empty-task-btn") {
          if (window.ModalManager) {
            ModalManager.showCreateTaskModal();
          }
        }
      });

      // Setup event delegation cho action buttons
      document.addEventListener("click", (e) => {
        const target = e.target.closest(
          ".toggle-complete, .edit-task, .delete-task"
        );
        if (!target || !target.dataset.taskId) return;

        const taskId = target.dataset.taskId;

        if (target.classList.contains("toggle-complete")) {
          const isCompleted = target.innerHTML.includes("Mở lại");
          this.toggleTaskCompletion(taskId, !isCompleted);
        } else if (target.classList.contains("edit-task")) {
          this.openEditModal(taskId);
        } else if (target.classList.contains("delete-task")) {
          this.confirmDeleteTask(taskId);
        }
      });
    },

    setupTaskActions(tasks = []) {
      console.log(`🔗 Setting up actions for ${tasks.length} tasks`);

      // Xử lý hoàn thành/mở lại công việc
      document.querySelectorAll(".toggle-complete").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          const isCurrentlyCompleted =
            e.currentTarget.innerHTML.includes("Mở lại");
          await this.toggleTaskCompletion(taskId, !isCurrentlyCompleted);
        });
      });

      // Xử lý sửa công việc
      document.querySelectorAll(".edit-task").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          await this.openEditModal(taskId);
        });
      });

      // Xử lý xóa công việc
      document.querySelectorAll(".delete-task").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          await this.confirmDeleteTask(taskId);
        });
      });
    },

    // Phương thức hoàn thành/mở lại công việc
    async toggleTaskCompletion(taskId, complete) {
      try {
        const result = await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
          TrangThaiThucHien: complete ? 2 : 0,
        });

        if (result.success) {
          Utils.showToast(
            `Đã ${complete ? "hoàn thành" : "mở lại"} công việc`,
            "success"
          );

          // Cập nhật UI ngay lập tức
          this.updateTaskUI(taskId, complete);

          // Refresh toàn bộ danh sách sau 1 giây
          setTimeout(() => {
            this.loadTasks();
          }, 1000);
        } else {
          throw new Error(result.message || "Thao tác thất bại");
        }
      } catch (error) {
        console.error("❌ Error toggling task completion:", error);
        Utils.showToast("Không thể cập nhật trạng thái", "error");
      }
    },

    // Cập nhật UI ngay lập tức
    updateTaskUI(taskId, completed) {
      const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
      if (!row) return;

      const titleElement = row.querySelector("td:nth-child(2) .font-medium");
      const statusBadge = row.querySelector(".status-badge");
      const completeBtn = row.querySelector(".toggle-complete");

      if (completed) {
        // Cập nhật thành hoàn thành
        row.classList.add("completed");
        if (titleElement)
          titleElement.classList.add("line-through", "text-gray-500");
        if (statusBadge) {
          statusBadge.textContent = "Hoàn thành";
          statusBadge.className = "status-badge status-completed";
        }
        if (completeBtn) {
          completeBtn.innerHTML = '<i class="fas fa-undo"></i> Mở lại';
        }
      } else {
        // Cập nhật thành đang chờ
        row.classList.remove("completed");
        if (titleElement)
          titleElement.classList.remove("line-through", "text-gray-500");
        if (statusBadge) {
          statusBadge.textContent = "Đang chờ";
          statusBadge.className = "status-badge status-pending";
        }
        if (completeBtn) {
          completeBtn.innerHTML = '<i class="fas fa-check"></i> Hoàn thành';
        }
      }
    },

    // Mở modal chỉnh sửa
    async openEditModal(taskId) {
      try {
        // Hiển thị loading
        Utils.showToast("Đang tải thông tin công việc...", "info");

        // Gọi API lấy thông tin công việc
        const response = await Utils.makeRequest(`/api/tasks/${taskId}`, "GET");

        if (response.success && response.data) {
          const taskData = response.data;

          // Mở modal chỉnh sửa
          if (window.ModalManager && ModalManager.showCreateTaskModal) {
            ModalManager.showCreateTaskModal(taskData);
          } else {
            // Fallback: mở modal đơn giản
            this.showSimpleEditModal(taskData);
          }
        } else {
          throw new Error("Không tìm thấy thông tin công việc");
        }
      } catch (error) {
        console.error("❌ Error loading task for edit:", error);
        Utils.showToast("Không thể tải thông tin công việc", "error");
      }
    },

    // Xác nhận xóa
    async confirmDeleteTask(taskId) {
      try {
        // Tìm thông tin công việc trong DOM
        const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
        if (!row) {
          Utils.showToast("Không tìm thấy công việc", "error");
          return;
        }

        const taskTitle =
          row.querySelector("td:nth-child(2) .font-medium")?.textContent ||
          "Công việc này";

        // Hiển thị xác nhận
        const confirmation = await Swal.fire({
          title: "Xác nhận xóa",
          html: `Bạn có chắc chắn muốn xóa công việc <strong>"${taskTitle}"</strong>?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Xóa",
          cancelButtonText: "Hủy",
          reverseButtons: true,
          showLoaderOnConfirm: true,
          preConfirm: async () => {
            try {
              const result = await Utils.makeRequest(
                `/api/tasks/${taskId}`,
                "DELETE"
              );

              // Xử lý confirm nhiều lần nếu có lịch trình
              if (result.requireConfirmation) {
                const forceConfirm = await Swal.fire({
                  title: "Xác nhận thêm",
                  html: `${result.message}<br><br>${result.details}<br><br>Bạn vẫn muốn xóa?`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#d33",
                  cancelButtonColor: "#3085d6",
                  confirmButtonText: "Vẫn xóa",
                  cancelButtonText: "Hủy",
                });

                if (forceConfirm.isConfirmed) {
                  const forceResult = await Utils.makeRequest(
                    `/api/tasks/${taskId}?force=true`,
                    "DELETE"
                  );
                  return forceResult;
                }
                return null;
              }
              return result;
            } catch (error) {
              Swal.showValidationMessage(`Lỗi: ${error.message}`);
              return null;
            }
          },
        });

        if (confirmation.isConfirmed && confirmation.value?.success) {
          // Hiệu ứng xóa
          row.style.backgroundColor = "#fee";
          row.style.transition = "all 0.3s";
          setTimeout(() => {
            row.style.opacity = "0";
            row.style.height = "0";
            row.style.padding = "0";
            row.style.margin = "0";
            row.style.overflow = "hidden";
          }, 300);

          // Xóa hoàn toàn sau animation
          setTimeout(() => {
            this.loadTasks();
          }, 600);

          Utils.showToast("Đã xóa công việc thành công", "success");

          // Dispatch event để các module khác biết
          document.dispatchEvent(
            new CustomEvent("taskDeleted", {
              detail: { taskId },
            })
          );
        }
      } catch (error) {
        console.error("❌ Error deleting task:", error);
        Utils.showToast("Không thể xóa công việc", "error");
      }
    },

    // Fallback modal đơn giản
    showSimpleEditModal(taskData) {
      const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3 class="modal-title">Chỉnh sửa công việc</h3>
                <p class="text-gray-600 mb-4">Chức năng này cần ModalManager để hoạt động đầy đủ.</p>
                <pre class="bg-gray-100 p-4 rounded text-sm">${JSON.stringify(
                  taskData,
                  null,
                  2
                )}</pre>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Đóng</button>
                </div>
            </div>
        </div>
    `;

      document.body.insertAdjacentHTML("beforeend", modalHTML);
    },

    // Thêm vào workManager.js
    formatDate(dateString) {
      if (!dateString) return "Không có";
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },

    formatDateTime(dateString) {
      if (!dateString) return "Không có";
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    cleanup() {
      console.log("🧹 Cleaning up WorkManager...");

      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });

      this.eventListeners = [];
      this.initialized = false;

      console.log("✅ WorkManager cleaned up");
    },
  };
  document.addEventListener("work-tab-activated", () => {
    console.log("📢 Work tab activated event received");
    WorkManager.loadTasks();
  });

  // Lắng nghe sự kiện section-changed từ AppNavigation
  document.addEventListener("section-changed", (e) => {
    if (e.detail && e.detail.section === "work") {
      console.log("📢 Section changed to work - reloading tasks");
      setTimeout(() => {
        WorkManager.loadTasks();
      }, 300);
    }
  });

  // Lắng nghe sự kiện task created/updated/deleted để refresh
  document.addEventListener("taskCreated", () => {
    console.log("📢 Task created - refreshing work manager");
    setTimeout(() => {
      WorkManager.loadTasks();
    }, 500);
  });

  document.addEventListener("taskUpdated", () => {
    console.log("📢 Task updated - refreshing work manager");
    setTimeout(() => {
      WorkManager.loadTasks();
    }, 500);
  });

  document.addEventListener("taskDeleted", () => {
    console.log("📢 Task deleted - refreshing work manager");
    setTimeout(() => {
      WorkManager.loadTasks();
    }, 500);
  });

  // Kiểm tra và tự động init nếu đang ở tab work khi page load
  document.addEventListener("DOMContentLoaded", () => {
    // Kiểm tra sau 1 giây để đảm bảo DOM đã load xong
    setTimeout(() => {
      const workSection = document.getElementById("work-section");
      if (workSection && workSection.classList.contains("active")) {
        console.log("🔍 Work section is active on page load");
        if (!WorkManager.initialized) {
          WorkManager.init();
        } else {
          // Nếu đã initialized, vẫn reload data
          WorkManager.loadTasks();
        }
      }
    }, 1000);
  });

  // Thêm phương thức refresh để gọi từ bên ngoài
  WorkManager.refresh = function () {
    console.log("🔄 WorkManager.refresh() called");
    this.loadTasks();
  };

  // Phương thức để kiểm tra và reload nếu cần
  WorkManager.checkAndReload = function () {
    const workSection = document.getElementById("work-section");
    if (workSection && workSection.classList.contains("active")) {
      console.log("🔍 Work section is active - reloading tasks");
      this.loadTasks();
    }
  };

  console.log("✅ WorkManager loaded");
})();
