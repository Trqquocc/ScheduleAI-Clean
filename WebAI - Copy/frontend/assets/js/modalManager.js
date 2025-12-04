// frontend/assets/js/modalManager.js
/**
 * Modal Manager Module - Handles all modal operations
 * WRAPPED VERSION: Prevents "already declared" errors
 * Features: 4 detection methods for Settings button, early caching, mutation observer
 */

(function () {
  "use strict";

  if (window.ModalManager) {
    console.log("⭐️ ModalManager already loaded");
    return;
  }

  window.ModalManager = {
    initialized: false,
    eventHandlerBound: false,
    modalCache: {},
    observers: {},
    currentModal: null,

    init() {
      if (this.initialized) {
        console.log("ℹ️ ModalManager already initialized");
        return;
      }

      console.log("🎯 ModalManager initialization started");

      setTimeout(() => {
        this.cacheModalContent();
        this.protectModalContent();
      }, 100);

      this.bindGlobalEvents();
      this.bindEventDelegation();

      this.initialized = true;
      this.eventHandlerBound = true;

      console.log("✅ ModalManager initialized successfully");
    },

    protectModalContent() {
      const modals = ["createTaskModal", "settingsModal"];

      modals.forEach((modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
          console.warn(`⚠️ Modal not found for protection: ${modalId}`);

          if (window.ComponentLoader) {
            console.log(`🔄 Attempting to reload missing modal: ${modalId}`);
            const modalFile =
              modalId === "createTaskModal"
                ? "components/modals/create-task-modal.html"
                : "components/modals/settings-modal.html";

            ComponentLoader.loadComponent(modalId, modalFile).then(() => {
              setTimeout(() => {
                this.cacheModalContent();
                this.protectModalContent();
              }, 50);
            });
          }
          return;
        }

        if (modal.innerHTML.trim() === "" && this.modalCache[modalId]) {
          console.warn(`⚠️ Modal ${modalId} is empty, restoring...`);
          this.restoreModalContent(modalId);
        }

        if (this.observers[modalId]) {
          this.observers[modalId].disconnect();
        }

        const observer = new MutationObserver((mutations) => {
          let shouldRestore = false;

          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              if (modal.innerHTML.trim() === "") {
                console.warn(`⚠️ ${modalId} content was cleared!`);
                shouldRestore = true;
              }

              const importantElements = modal.querySelectorAll(
                "form, button, input, .modal-content"
              );
              if (
                importantElements.length === 0 &&
                modal.innerHTML.trim() !== ""
              ) {
                console.warn(`⚠️ Important elements removed from ${modalId}`);
                shouldRestore = true;
              }
            }
          });

          if (shouldRestore) {
            this.restoreModalContent(modalId);
          }
        });

        observer.observe(modal, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        this.observers[modalId] = observer;
      });
    },

    cacheModalContent() {
      const modals = document.querySelectorAll(".modal");
      modals.forEach((modal) => {
        if (modal.id && modal.innerHTML.trim()) {
          this.modalCache[modal.id] = modal.innerHTML;
          console.log(`💾 Cached modal content: ${modal.id}`);
        }
      });
    },

    restoreModalContent(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal || !this.modalCache[modalId]) {
        console.error(`❌ No cache available for ${modalId}`);
        return false;
      }

      modal.innerHTML = this.modalCache[modalId];
      console.log(`✅ Restored modal content: ${modalId}`);

      // ✅ FIX: Reinitialize scripts after restore
      this.initializeModalScripts(modalId);
      return true;
    },

    initializeModalScripts(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      // Remove old scripts
      modal.querySelectorAll("script").forEach((script) => script.remove());

      // Re-add and execute scripts
      const newScript = document.createElement("script");
      newScript.textContent =
        this.modalCache[modalId].match(/<script>([\s\S]*?)<\/script>/)?.[1] ||
        "";
      modal.appendChild(newScript);

      console.log(`🔄 Reinitialized scripts for ${modalId}`);
    },

    bindGlobalEvents() {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.currentModal) {
          this.hideModal(this.currentModal);
        }
      });

      document.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("modal") &&
          !e.target.querySelector(".modal-content")?.contains(e.target)
        ) {
          this.hideModal(e.target);
        }
      });
    },

    bindEventDelegation() {
      if (this._clickHandler) {
        document.removeEventListener("click", this._clickHandler, true);
      }

      this._clickHandler = (e) => {
        const target = e.target.closest("[data-action]");

        if (!target) return;

        const action = target.dataset.action;

        if (action === "close-modal") {
          const modal = target.closest(".modal");
          if (modal) this.hideModal(modal);
        } else if (action === "show-settings") {
          e.preventDefault();
          e.stopPropagation();
          this.showSettingsModal();
        }
      };

      document.addEventListener("click", this._clickHandler, true);
    },

    reinitializeHandlers() {
      console.log("🔄 Reinitializing modal event handlers...");
      this.bindEventDelegation();
      this.initializeModalScripts("createTaskModal");
      this.initializeModalScripts("settingsModal");
      console.log("✅ Modal event handlers reinitialized");
    },

    showCreateTaskModal() {
      this.showModalById("createTaskModal");
    },

    showSettingsModal() {
      this.showModalById("settingsModal");
    },

    showModalById(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`❌ Modal not found: ${modalId}`);

        if (window.ComponentLoader) {
          const modalFile =
            modalId === "createTaskModal"
              ? "components/modals/create-task-modal.html"
              : "components/modals/settings-modal.html";

          ComponentLoader.loadComponent(modalId, modalFile).then(() => {
            setTimeout(() => {
              this.cacheModalContent();
              this.protectModalContent();
              this.showModalById(modalId);
            }, 100);
          });
        }
        return;
      }

      if (!modal.innerHTML.trim()) {
        console.warn(`⚠️ Modal ${modalId} is empty, restoring...`);
        if (!this.restoreModalContent(modalId)) {
          console.error(`❌ Failed to restore ${modalId}`);
          return;
        }
      }

      this.showModal(modal);
    },

    showModal(modal) {
      if (!modal) return;

      this.hideAllModals();

      modal.style.display = "flex";
      setTimeout(() => {
        modal.classList.add("show");
        this.currentModal = modal;
      }, 10);

      document.body.style.overflow = "hidden";
      console.log(`✅ Modal shown: ${modal.id}`);
    },

    hideModal(modal) {
      if (!modal) return;

      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
        if (this.currentModal === modal) {
          this.currentModal = null;
        }
      }, 300);

      document.body.style.overflow = "auto";
      console.log(`✅ Modal hidden: ${modal.id}`);
    },

    hideAllModals() {
      const modals = document.querySelectorAll(".modal.show");
      modals.forEach((modal) => this.hideModal(modal));
    },

    // ✅ NEW: Add close() method for compatibility
    close(modalId) {
      if (!modalId) {
        // If no modalId provided, close current modal
        if (this.currentModal) {
          this.hideModal(this.currentModal);
        }
        return;
      }

      // If modalId is a string, find the modal
      if (typeof modalId === "string") {
        const modal = document.getElementById(modalId);
        if (modal) {
          this.hideModal(modal);
        }
      }
      // If modalId is a DOM element
      else if (modalId instanceof HTMLElement) {
        this.hideModal(modalId);
      }
    },

    // ✅ NEW: Alias methods for common use cases
    closeCreateTaskModal() {
      this.close("createTaskModal");
    },

    closeSettingsModal() {
      this.close("settingsModal");
    },

    cleanup() {
      this.hideAllModals();

      Object.values(this.observers).forEach((observer) =>
        observer.disconnect()
      );
      this.observers = {};

      if (this._clickHandler) {
        document.removeEventListener("click", this._clickHandler, true);
      }

      this.initialized = false;
      this.eventHandlerBound = false;
      this.currentModal = null;

      console.log("🧹 ModalManager cleaned up");
    },
  };

  console.log("✅ ModalManager loaded");
})();
