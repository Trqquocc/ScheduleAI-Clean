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

    renderTasks(tasks) {
      const container = document.getElementById("work-items-container");
      if (!container) {
        console.error("❌ No container for rendering tasks");
        return;
      }

      container.innerHTML = "";

      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="text-center text-gray-500 py-8">
            <i class="fas fa-tasks text-4xl mb-4"></i>
            <p>Không có công việc nào</p>
            <p class="text-sm mt-2">Nhấn "Tạo công việc" để bắt đầu</p>
          </div>
        `;
        return;
      }

      tasks.forEach((task) => {
        const color = task.MauSac || "#3B82F6";
        const item = document.createElement("div");
        item.className =
          "work-item bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow";
        item.dataset.taskId = task.ID;

        const completedClass =
          task.TrangThaiThucHien === 2 ? "line-through text-gray-500" : "";
        const statusIcon =
          task.TrangThaiThucHien === 2
            ? "fa-check-circle text-green-500"
            : "fa-circle text-gray-400";

        item.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="mt-1">
              <i class="fas ${statusIcon} text-xl cursor-pointer toggle-complete"></i>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <h4 class="font-semibold ${completedClass}">${task.TieuDe}</h4>
                <div class="flex gap-2">
                  <button class="edit-task text-blue-500 hover:text-blue-700">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="delete-task text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              ${
                task.MoTa
                  ? `<p class="text-sm text-gray-600 mt-1 ${completedClass}">${task.MoTa}</p>`
                  : ""
              }
              <div class="flex gap-4 mt-2 text-xs text-gray-500">
                ${
                  task.ThoiGianUocTinh
                    ? `<span><i class="fas fa-clock"></i> ${task.ThoiGianUocTinh} phút</span>`
                    : ""
                }
                ${
                  task.MucDoUuTien
                    ? `<span><i class="fas fa-exclamation"></i> Ưu tiên: ${task.MucDoUuTien}</span>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;

        // Style theo màu danh mục
        item.style.borderLeft = `4px solid ${color}`;

        // Toggle complete
        item
          .querySelector(".toggle-complete")
          ?.addEventListener("click", () => {
            const completed = task.TrangThaiThucHien !== 2;
            this.updateTaskStatus(task.ID, completed);
          });

        // Edit
        item.querySelector(".edit-task")?.addEventListener("click", () => {
          this.editTask(task.ID);
        });

        // Delete
        item.querySelector(".delete-task")?.addEventListener("click", () => {
          this.deleteTask(task.ID);
        });

        container.appendChild(item);
      });
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

        // Gửi request xóa lần đầu
        const result = await Utils.makeRequest(`/api/tasks/${id}`, "DELETE");

        // Kiểm tra nếu backend yêu cầu confirm
        if (result.requireConfirmation) {
          const confirmMsg = `${result.message}\n\n${result.details}\n\nBạn có chắc muốn xóa?`;

          if (!confirm(confirmMsg)) {
            Utils.showToast("Đã hủy xóa", "info");
            return;
          }

          // Gửi lại với force=true QUA QUERY PARAM
          const forceResult = await Utils.makeRequest(
            `/api/tasks/${id}?force=true`, // THÊM ?force=true vào URL
            "DELETE"
          );

          if (!forceResult.success) {
            throw new Error(forceResult.message || "Xóa thất bại");
          }

          Utils.showToast(forceResult.message || "Đã xóa công việc", "success");
          await this.loadTasks();
          return;
        }

        // Nếu thành công ngay (không có lịch trình)
        if (result.success) {
          Utils.showToast(result.message || "Đã xóa công việc", "success");
          await this.loadTasks();
          return;
        }

        // Các lỗi khác
        throw new Error(result.message || "Xóa thất bại");
      } catch (err) {
        console.error("❌ Error deleting task:", err);
        if (typeof Utils !== "undefined" && Utils.showToast) {
          Utils.showToast(err.message || "Xóa thất bại", "error");
        }
      }
    },

    editTask(id) {
      console.log(`✏️ Editing task ${id}`);
      if (typeof Utils !== "undefined" && Utils.showToast) {
        Utils.showToast("Tính năng cập nhật đang được phát triển", "info");
      }
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

  console.log("✅ WorkManager loaded");
})();
