// components/modals/create-task-modal.js - PHIÊN BẢN FINAL

console.log("🎯 CREATE-TASK-MODAL.JS loaded - FINAL VERSION");

// Biến để tránh khởi tạo nhiều lần
let modalInitialized = false;

// Hàm load danh mục
async function loadCategoriesForModal() {
  console.log("🔄 [CREATE-TASK-MODAL] loadCategoriesForModal CALLED!");

  const container = document.getElementById("category-container");
  if (!container) {
    console.error("❌ [CREATE-TASK-MODAL] category-container NOT FOUND!");
    return;
  }

  // Hiển thị loading
  container.innerHTML =
    '<div class="text-gray-500 text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải danh mục...</div>';

  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập");
    }

    console.log("📤 [CREATE-TASK-MODAL] Fetching categories...");
    const response = await fetch("/api/categories", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("📥 [CREATE-TASK-MODAL] Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("📦 [CREATE-TASK-MODAL] API result:", result);

    if (result.success && result.data) {
      renderCategories(result.data);
    } else {
      throw new Error(result.message || "Lỗi tải danh mục");
    }
  } catch (error) {
    console.error("❌ [CREATE-TASK-MODAL] Error loading categories:", error);
    const container = document.getElementById("category-container");
    if (container) {
      container.innerHTML = `
        <div class="text-red-500 text-center p-3">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Lỗi tải danh mục: ${error.message}
          <br>
          <button onclick="window.loadCategoriesForModal()" class="text-blue-500 text-sm mt-2 hover:underline">
            Thử lại
          </button>
        </div>
      `;
    }
  }
}

function renderCategories(categories) {
  const container = document.getElementById("category-container");
  if (!container) return;

  if (!categories || categories.length === 0) {
    container.innerHTML = `
      <div class="text-gray-500 text-center py-4 italic">
        Chưa có danh mục nào.
        <br>
        Nhấn "+ Tạo mới danh mục" để thêm.
      </div>
    `;
    return;
  }

  let html = "";
  categories.forEach((category, index) => {
    html += `
      <div class="flex items-center justify-between border border-gray-300 rounded px-3 py-2 mb-2 hover:bg-gray-50">
        <label class="flex items-center gap-3 cursor-pointer flex-1">
          <input type="radio" name="taskCategory" value="${category.MaLoai}" 
                 class="category-radio h-4 w-4 text-blue-600 focus:ring-blue-500" 
                 data-color="${category.MauSac || "#3B82F6"}"
                 ${index === 0 ? "checked" : ""} />
          <span class="text-sm font-medium text-gray-700">${
            category.TenLoai
          }</span>
          <div class="w-4 h-4 rounded-full border-2 border-gray-300" 
               style="background-color: ${category.MauSac || "#3B82F6"}"></div>
        </label>
        <button type="button" class="delete-category text-red-500 hover:text-red-700 text-xs" 
                data-id="${category.MaLoai}" title="Xóa danh mục">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
  console.log(
    `✅ [CREATE-TASK-MODAL] Rendered ${categories.length} categories`
  );

  // Gán sự kiện xóa
  container.querySelectorAll(".delete-category").forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.stopPropagation();

      if (!confirm("Xóa danh mục này?")) {
        return;
      }

      try {
        const categoryId = this.getAttribute("data-id");
        const token = localStorage.getItem("auth_token");

        await fetch(`/api/categories/${categoryId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Load lại danh sách
        await loadCategoriesForModal();

        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast("Đã xóa danh mục", "success");
        }
      } catch (error) {
        console.error("Lỗi xóa danh mục:", error);
        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast("Lỗi xóa danh mục", "error");
        }
      }
    });
  });
}

// Hàm xử lý sự kiện cho modal
function setupModalEvents() {
  console.log("🔧 [CREATE-TASK-MODAL] Setting up modal events...");

  // 1. Nút tạo danh mục mới
  const createBtn = document.getElementById("createNewCategoryBtn");
  if (createBtn) {
    console.log("✅ [CREATE-TASK-MODAL] Found createNewCategoryBtn");
    createBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // QUAN TRỌNG: Ngăn sự kiện lan ra
      e.stopImmediatePropagation(); // Ngăn tất cả handlers khác

      console.log("➕ [CREATE-TASK-MODAL] Create category button clicked");

      const categoryModal = document.getElementById("createCategoryModal");
      if (!categoryModal) {
        console.error("❌ Category modal not found!");
        return;
      }

      // FORCE HIỂN THỊ
      categoryModal.classList.remove("hidden");
      categoryModal.style.display = "flex";
      categoryModal.style.position = "fixed";
      categoryModal.style.zIndex = "10000"; // CAO HƠN modal chính
      categoryModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      categoryModal.style.opacity = "1";
      categoryModal.style.visibility = "visible";

      // Focus vào input
      setTimeout(() => {
        const nameInput = document.getElementById("newCategoryName");
        if (nameInput) nameInput.focus();
      }, 50);

      console.log("✅ Category modal shown with z-index: 10000");
    });
  }

  // 2. Nút đóng modal danh mục (X) - ĐẶT RA NGOÀI if block!
  const closeCategoryBtn = document.getElementById("closeCategoryModalBtn");
  if (closeCategoryBtn) {
    console.log("✅ [CREATE-TASK-MODAL] Found closeCategoryModalBtn");
    closeCategoryBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log("❌ Closing category modal (X button)");

      const categoryModal = document.getElementById("createCategoryModal");
      if (categoryModal) {
        categoryModal.classList.add("hidden");
        categoryModal.style.display = "none";
      }
    });
  }

  // 3. Đóng modal khi click ra ngoài (chỉ modal danh mục)
  const categoryModal = document.getElementById("createCategoryModal");
  if (categoryModal) {
    categoryModal.addEventListener("click", function (e) {
      // Chỉ đóng nếu click vào backdrop (không phải content)
      if (e.target === this) {
        console.log("❌ Closing category modal (backdrop click)");
        this.classList.add("hidden");
        this.style.display = "none";
      }
    });

    // Ngăn click trong content đóng modal
    const categoryContent = categoryModal.querySelector("div");
    if (categoryContent) {
      categoryContent.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
  }

  // 4. Nút hủy modal danh mục (nút "Hủy" trong form)
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  if (cancelCategoryBtn) {
    cancelCategoryBtn.addEventListener("click", function () {
      console.log("❌ Closing category modal (Cancel button)");
      document.getElementById("createCategoryModal").classList.add("hidden");
      document.getElementById("createCategoryForm").reset();
    });
  }

  // 5. Form tạo danh mục
  const categoryForm = document.getElementById("createCategoryForm");
  if (categoryForm) {
    categoryForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("📝 [CREATE-TASK-MODAL] Submitting category form");

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tạo...';
      submitBtn.disabled = true;

      try {
        const categoryData = {
          TenLoai: document.getElementById("newCategoryName").value.trim(),
          MauSac: document.getElementById("newCategoryColor").value,
          MoTa: document.getElementById("newCategoryDesc").value.trim() || "",
        };

        if (!categoryData.TenLoai) {
          throw new Error("Vui lòng nhập tên danh mục");
        }

        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(categoryData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Lỗi tạo danh mục");
        }

        // Đóng modal
        document.getElementById("createCategoryModal").classList.add("hidden");
        this.reset();

        // Load lại danh mục
        await loadCategoriesForModal();

        // Hiển thị thông báo
        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast("✅ Tạo danh mục thành công", "success");
        }
      } catch (error) {
        console.error("❌ [CREATE-TASK-MODAL] Error creating category:", error);
        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast(error.message || "Lỗi tạo danh mục", "error");
        }
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // 6. Form tạo công việc (cơ bản)
  // 4. Form tạo công việc (ĐÃ SỬA THEO BACKEND)
  const taskForm = document.getElementById("createTaskForm");
  if (taskForm) {
    taskForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("📤 [CREATE-TASK-MODAL] Submitting task form");

      // Hiển thị loading
      const submitBtn = this.querySelector('button[type="submit"]');
      const submitText = submitBtn.querySelector(".submit-text");
      const submitLoading = submitBtn.querySelector(".submit-loading");

      if (submitText) submitText.classList.add("hidden");
      if (submitLoading) submitLoading.classList.remove("hidden");
      submitBtn.disabled = true;

      try {
        // Lấy dữ liệu từ form (THEO ĐÚNG FIELD NAME CỦA BACKEND)
        const taskData = {
          TieuDe: document.getElementById("taskTitle").value.trim(),
          MoTa: document.getElementById("taskDescription").value.trim() || "",
          MaLoai:
            document.querySelector('input[name="taskCategory"]:checked')
              ?.value || null,
          Tag: document.getElementById("taskTag").value.trim() || "",
          ThoiGianUocTinh:
            parseInt(document.getElementById("taskDuration").value) || 60,
          MucDoUuTien:
            parseInt(document.getElementById("taskPriority").value) || 2,
          MucDoPhucTap: document.getElementById("taskComplexity").value
            ? parseInt(document.getElementById("taskComplexity").value)
            : null,
          MucDoTapTrung: document.getElementById("taskFocusLevel").value
            ? parseInt(document.getElementById("taskFocusLevel").value)
            : null,
          ThoiDiemThichHop:
            document.getElementById("taskSuitableTime").value || null,
          LuongTheoGio:
            parseFloat(document.getElementById("taskHourlyWage").value) || 0,
        };

        // Validate required fields
        if (!taskData.TieuDe) {
          throw new Error("Vui lòng nhập tiêu đề công việc");
        }

        // Kiểm tra thời gian cố định
        const isFixedTime = document.getElementById("taskFixedTime").checked;
        taskData.CoThoiGianCoDinh = isFixedTime;

        if (isFixedTime) {
          const startTimeInput =
            document.getElementById("taskFixedStartTime").value;
          const duration =
            parseInt(document.getElementById("taskFixedDuration").value) || 60;
          const repeatOption =
            document.getElementById("taskRepeatOption").value || "";

          if (!startTimeInput) {
            throw new Error(
              "Vui lòng chọn thời gian bắt đầu cho công việc cố định"
            );
          }

          taskData.GioBatDauCoDinh = startTimeInput;
          taskData.ThoiGianUocTinh = duration; // Cập nhật lại thời gian ước tính

          // Nếu có giờ kết thúc riêng (từ input readonly)
          const endTimeInput =
            document.getElementById("taskFixedEndTime").value;
          if (endTimeInput) {
            taskData.GioKetThucCoDinh = endTimeInput;
          }

          // Nếu có lặp lại
          if (repeatOption) {
            taskData.LapLai = repeatOption;
          }
        }

        console.log("📦 Task data to send:", taskData);

        // Gọi API tạo task
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(taskData),
        });

        console.log("📥 API Response status:", response.status);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            const errorText = await response.text();
            if (errorText) errorMessage += `: ${errorText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log("✅ Task created result:", result);

        if (!result.success) {
          throw new Error(result.message || "Lỗi tạo công việc");
        }

        // Đóng modal
        if (window.ModalManager) {
          ModalManager.close("createTaskModal");
        }

        // Hiển thị thông báo thành công
        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast(
            result.message || "✅ Tạo công việc thành công",
            "success"
          );
        }

        // Reload danh sách công việc nếu đang ở trang work
        if (window.WorkManager && typeof WorkManager.reload === "function") {
          setTimeout(() => {
            WorkManager.reload();
          }, 500);
        }

        // Reset form
        this.reset();
      } catch (error) {
        console.error("❌ [CREATE-TASK-MODAL] Error creating task:", error);

        // Hiển thị thông báo lỗi
        if (window.Utils && typeof Utils.showToast === "function") {
          Utils.showToast(error.message || "Lỗi tạo công việc", "error");
        }

        // Không đóng modal nếu có lỗi
      } finally {
        // Khôi phục button
        if (submitText) submitText.classList.remove("hidden");
        if (submitLoading) submitLoading.classList.add("hidden");
        submitBtn.disabled = false;
      }
    });
  }

  // Thêm phần này sau các event listeners khác

  // 7. Toggle hiển thị thời gian cố định
  const fixedTimeCheckbox = document.getElementById("taskFixedTime");
  const fixedTimeFields = document.getElementById("fixedTimeFields");

  if (fixedTimeCheckbox && fixedTimeFields) {
    console.log("✅ [CREATE-TASK-MODAL] Found fixed time elements");

    fixedTimeCheckbox.addEventListener("change", function (e) {
      if (this.checked) {
        console.log("🕒 Fixed time enabled");
        fixedTimeFields.classList.remove("hidden");
        fixedTimeFields.style.opacity = "1";
        fixedTimeFields.style.maxHeight = "600px";

        // Set default datetime (now + 1 hour)
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60000);

        // Format cho datetime-local input
        const formatDateTime = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        document.getElementById("taskFixedStartTime").value =
          formatDateTime(now);
        updateEndTime();
      } else {
        console.log("🕒 Fixed time disabled");
        fixedTimeFields.classList.add("hidden");
        fixedTimeFields.style.opacity = "0";
        fixedTimeFields.style.maxHeight = "0";
      }
    });

    // Cập nhật thời gian kết thúc khi thay đổi
    const startTimeInput = document.getElementById("taskFixedStartTime");
    const durationInput = document.getElementById("taskFixedDuration");

    if (startTimeInput && durationInput) {
      const updateEndTime = () => {
        const startTime = new Date(startTimeInput.value);
        const duration = parseInt(durationInput.value) || 60;

        if (!isNaN(startTime.getTime())) {
          const endTime = new Date(startTime.getTime() + duration * 60000);
          const formattedEndTime = formatDateTime(endTime);
          document.getElementById("taskFixedEndTime").value = formattedEndTime;
          console.log("📅 Updated end time:", formattedEndTime);
        }
      };

      startTimeInput.addEventListener("change", updateEndTime);
      durationInput.addEventListener("input", updateEndTime);

      // Format function
      function formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      window.updateEndTime = updateEndTime;
    }
  }
  console.log("✅ [CREATE-TASK-MODAL] Modal events setup complete");
}

// Hàm khởi tạo chính
function initCreateTaskModal() {
  console.log("🔧 [CREATE-TASK-MODAL] initCreateTaskModal CALLED!");

  // Kiểm tra xem đã khởi tạo chưa
  if (modalInitialized) {
    console.log("⚠️ [CREATE-TASK-MODAL] Already initialized, skipping");
    return;
  }

  // Kiểm tra xem các phần tử đã tồn tại chưa
  const taskForm = document.getElementById("createTaskForm");
  const container = document.getElementById("category-container");

  if (!taskForm || !container) {
    console.error(
      "❌ [CREATE-TASK-MODAL] Required elements not found, retrying..."
    );
    setTimeout(initCreateTaskModal, 100);
    return;
  }

  console.log("✅ [CREATE-TASK-MODAL] All elements found");

  // Load danh mục
  loadCategoriesForModal();

  // Setup events
  setupModalEvents();

  modalInitialized = true;
  console.log("✅ [CREATE-TASK-MODAL] Initialized successfully");
}

// ====== CÁCH 1: Lắng nghe sự kiện modalOpened ======
document.addEventListener("modalOpened", function (e) {
  console.log("🎭 [CREATE-TASK-MODAL] modalOpened event received:", e.detail);
  if (e.detail && e.detail.modalId === "createTaskModal") {
    console.log("🎯 [CREATE-TASK-MODAL] Our modal opened!");
    // Gọi hàm khởi tạo
    initCreateTaskModal();
  }
});

// ====== CÁCH 2: Lắng nghe click trên document ======
document.addEventListener("click", function (e) {
  // Kiểm tra nếu click vào nút có id 'create-task-btn'
  if (
    e.target.id === "create-task-btn" ||
    e.target.closest("#create-task-btn")
  ) {
    console.log("🖱️ [CREATE-TASK-MODAL] Create task button clicked!");
    // Khởi tạo sau 100ms để modal kịp hiển thị
    setTimeout(initCreateTaskModal, 100);
  }
});

// ====== CÁCH 3: Monkey patch ModalManager.showById ======
if (window.ModalManager && window.ModalManager.showById) {
  const originalShowById = ModalManager.showById;
  ModalManager.showById = function (modalId) {
    console.log(
      `🔧 [CREATE-TASK-MODAL] ModalManager.showById intercepted: ${modalId}`
    );

    if (modalId === "createTaskModal") {
      console.log("🎯 [CREATE-TASK-MODAL] Initializing before modal opens...");
      // Gọi khởi tạo trước khi mở modal
      setTimeout(initCreateTaskModal, 50);
    }

    return originalShowById.apply(this, arguments);
  };
  console.log("✅ [CREATE-TASK-MODAL] ModalManager.showById monkey-patched");
}

// ====== CÁCH 4: Kiểm tra nếu modal đang active ======
setTimeout(() => {
  const modal = document.getElementById("createTaskModal");
  if (modal && modal.classList.contains("active")) {
    console.log(
      "🚀 [CREATE-TASK-MODAL] Modal is already active, initializing..."
    );
    initCreateTaskModal();
  }
}, 1000);

// Xuất hàm public để test
window.initCreateTaskModal = initCreateTaskModal;
window.loadCategoriesForModal = loadCategoriesForModal;

console.log(
  "✅ [CREATE-TASK-MODAL] Script ready with ALL initialization methods"
);
