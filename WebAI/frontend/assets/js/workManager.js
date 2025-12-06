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

      // Tạo bảng công việc
      let html = `
    <div class="work-table-container">
      <table class="work-table">
        <thead>
          <tr>
            <th style="width: 40px;">
              <input type="checkbox" id="select-all-tasks" class="rounded text-blue-600">
            </th>
            <th>Tiêu đề</th>
            <th>Danh mục</th>
            <th>Ưu tiên</th>
            <th>Trạng thái</th>
            <th>Thời hạn</th>
            <th>Thời gian ước tính</th>
            <th style="text-align: right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
  `;

      tasks.forEach((task) => {
        const isCompleted = task.TrangThaiThucHien === 2;
        const completedClass = isCompleted ? "completed" : "";

        // Xác định class ưu tiên
        let priorityClass = "";
        let priorityText = "";
        let priorityColor = "";

        switch (task.MucDoUuTien) {
          case 1:
            priorityClass = "low-priority";
            priorityText = "Thấp";
            priorityColor = "priority-low";
            break;
          case 2:
            priorityClass = "medium-priority";
            priorityText = "Trung bình";
            priorityColor = "priority-medium";
            break;
          case 3:
            priorityClass = "high-priority";
            priorityText = "Cao";
            priorityColor = "priority-high";
            break;
          case 4:
            priorityClass = "high-priority";
            priorityText = "Rất cao";
            priorityColor = "priority-high";
            break;
          default:
            priorityClass = "medium-priority";
            priorityText = "Trung bình";
            priorityColor = "priority-medium";
        }

        // Trạng thái
        let statusText = "";
        let statusClass = "";
        if (isCompleted) {
          statusText = "Hoàn thành";
          statusClass = "status-completed";
        } else {
          statusText = "Đang chờ";
          statusClass = "status-pending";
        }

        // Danh mục
        const categoryColor = task.MauSac || "#3B82F6";
        const categoryName = task.TenLoai || "Không phân loại";

        // Định dạng thời gian
        const estimateTime = task.ThoiGianUocTinh
          ? `${task.ThoiGianUocTinh} phút`
          : "Chưa xác định";

        // Thời hạn (nếu có)
        let deadlineText = "Không có";
        if (task.GioKetThucCoDinh) {
          const deadline = new Date(task.GioKetThucCoDinh);
          deadlineText = deadline.toLocaleDateString("vi-VN");
        } else if (task.ThoiHan) {
          const deadline = new Date(task.ThoiHan);
          deadlineText = deadline.toLocaleDateString("vi-VN");
        }

        html += `
      <tr class="${completedClass} ${priorityClass}" data-task-id="${task.ID}">
        <td>
          <input type="checkbox" class="task-checkbox rounded text-blue-600" data-task-id="${
            task.ID
          }">
        </td>
        <td>
          <div class="font-medium ${
            isCompleted ? "line-through text-gray-500" : "text-gray-900"
          }">
            ${task.TieuDe}
          </div>
          ${
            task.MoTa
              ? `<div class="text-sm text-gray-500 mt-1">${task.MoTa.substring(
                  0,
                  60
                )}${task.MoTa.length > 60 ? "..." : ""}</div>`
              : ""
          }
        </td>
        <td>
          <div class="category-tag" style="background-color: ${categoryColor}20; color: ${categoryColor};">
            <span class="category-color" style="background-color: ${categoryColor};"></span>
            ${categoryName}
          </div>
        </td>
        <td>
          <span class="priority-indicator ${priorityColor}">
            <i class="fas fa-${
              task.MucDoUuTien >= 3 ? "exclamation-triangle" : "flag"
            }"></i>
            ${priorityText}
          </span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td>${deadlineText}</td>
        <td>${estimateTime}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn complete-btn toggle-complete" data-task-id="${
              task.ID
            }">
              <i class="fas fa-${isCompleted ? "undo" : "check"}"></i>
              ${isCompleted ? "Mở lại" : "Hoàn thành"}
            </button>
            <button class="action-btn edit-btn edit-task" data-task-id="${
              task.ID
            }">
              <i class="fas fa-edit"></i>
              Sửa
            </button>
            <button class="action-btn delete-btn delete-task" data-task-id="${
              task.ID
            }">
              <i class="fas fa-trash"></i>
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
      });

      html += `
        </tbody>
      </table>
    </div>
    
    <!-- Thêm filter và search -->
    <div class="work-filters mt-6">
      <div class="filter-group">
        <label class="filter-label">Lọc theo trạng thái</label>
        <select id="status-filter" class="filter-select">
          <option value="all">Tất cả</option>
          <option value="pending">Đang chờ</option>
          <option value="completed">Đã hoàn thành</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="filter-label">Lọc theo ưu tiên</label>
        <select id="priority-filter" class="filter-select">
          <option value="all">Tất cả</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
        </select>
      </div>
      
      <div class="filter-group" style="flex-grow: 1;">
        <label class="filter-label">Tìm kiếm</label>
        <input type="text" id="task-search" class="search-input" placeholder="Tìm kiếm theo tiêu đề, mô tả...">
      </div>
    </div>
    
    <!-- Tổng số công việc -->
    <div class="mt-4 text-sm text-gray-600">
      Hiển thị <span class="font-semibold">${tasks.length}</span> công việc
    </div>
  `;

      container.innerHTML = html;

      // Bind sự kiện cho các nút trong bảng
      this.bindTableEvents();

      // Setup filter và search
      this.setupFilters();

      console.log(`✅ Rendered ${tasks.length} tasks in table format`);
    },

    // Thêm hàm bindTableEvents để xử lý sự kiện
    bindTableEvents() {
      // Toggle complete
      document.querySelectorAll(".toggle-complete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          const isCompleted = e.currentTarget
            .querySelector("i")
            .classList.contains("fa-check");
          this.updateTaskStatus(taskId, !isCompleted);
        });
      });

      // Edit task
      document.querySelectorAll(".edit-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          this.editTask(taskId);
        });
      });

      // Delete task
      document.querySelectorAll(".delete-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId = e.currentTarget.dataset.taskId;
          this.deleteTask(taskId);
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
        if (typeof Utils === "undefined") {
          throw new Error("Utils module not available");
        }

        const result = await Utils.makeRequest(`/api/tasks/${taskId}`, "PUT", {
          TrangThaiThucHien: completed ? 2 : 0,
        });

        if (!result.success) {
          // ĐỔI từ result.ok sang result.success
          throw new Error(result.message || "Cập nhật thất bại");
        }

        Utils.showToast(
          `Đã ${completed ? "hoàn thành" : "hủy hoàn thành"} công việc`,
          "success"
        );
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
      document.addEventListener("click", (e) => {
        if (e.target && e.target.id === "create-task-btn") {
          e.preventDefault();
          e.stopPropagation();
          if (window.ModalManager) {
            ModalManager.showCreateTaskModal();
          }
          return;
        }
      });

      const createBtn = document.getElementById("create-task-btn");
      if (createBtn) {
        const handler = () => {
          if (window.ModalManager) {
            ModalManager.showCreateTaskModal();
          }
        };

        createBtn.addEventListener("click", handler);
        this.eventListeners.push({
          element: createBtn,
          event: "click",
          handler,
        });
      }
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
