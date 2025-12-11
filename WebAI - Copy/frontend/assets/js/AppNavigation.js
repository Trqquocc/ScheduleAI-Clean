/**
 * AppNavigation Module - Handles page navigation and section switching
 * COMPLETELY NEW FILE - Renamed to avoid Native Navigation API conflict
 */

(function () {
  "use strict";

  // ✅ CHECK NEW NAME
  if (window.AppNavigation) {
    console.log("⏭️ AppNavigation already loaded");
    return;
  }

  const AppNavigation = {
    currentSection: null,
    initialized: false,
    navButtons: null,
    sections: null,

    init() {
      if (this.initialized) {
        console.log("ℹ️ AppNavigation already initialized");
        return;
      }

      console.log("🔧 AppNavigation.init() called");

      this.navButtons = document.querySelectorAll("[data-section]");
      this.sections = document.querySelectorAll(".section");

      if (this.navButtons.length === 0) {
        console.error("❌ No navigation buttons found with [data-section]!");
        return;
      }

      if (this.sections.length === 0) {
        console.error("❌ No sections found with .section class!");
        return;
      }

      console.log(`✅ Found ${this.navButtons.length} nav buttons`);
      console.log(`✅ Found ${this.sections.length} sections`);

      this.bindEvents();
      this.ensureSingleActiveSection();
      this.initialized = true;

      console.log("✅ AppNavigation initialized successfully");
      console.log(`   Current section: ${this.currentSection}`);
    },

    ensureSingleActiveSection() {
      let activeFound = false;
      this.sections.forEach((section) => {
        if (section.classList.contains("active")) {
          if (activeFound) {
            section.classList.remove("active");
            console.log(`⚠️ Removed duplicate active from: ${section.id}`);
          } else {
            activeFound = true;
            this.currentSection = section.id.replace("-section", "");
            console.log(`✅ Active section: ${this.currentSection}`);
          }
        }
      });

      if (!activeFound && this.sections.length > 0) {
        const scheduleSection = document.getElementById("schedule-section");
        if (scheduleSection) {
          scheduleSection.classList.add("active");
          this.currentSection = "schedule";
          console.log("✅ Set schedule as default active section");
        }
      }
    },

    bindEvents() {
      console.log("🔗 Binding navigation events...");

      this.navButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.handleNavigation(btn);
        });
        console.log(`  ✅ Bound click event: ${btn.dataset.section}`);
      });

      console.log("✅ All navigation events bound");
    },

    async handleNavigation(btn) {
      const targetSection = btn.dataset.section;
      console.log(`🖱️ Navigation clicked: ${targetSection}`);
      console.log(`   Current section: ${this.currentSection}`);

      if (targetSection === this.currentSection) {
        console.log("⏭️ Already on this section, skipping");
        return;
      }

      await this.navigateToSection(targetSection);
    },

    async navigateToSection(sectionName) {
      console.log(`🔄 Navigating to section: ${sectionName}`);

      await this.cleanupCurrentSection();
      this.updateNavButtons(sectionName);
      this.toggleSections(sectionName);
      await this.loadAndInitSection(sectionName);

      this.currentSection = sectionName;
      console.log(`✅ Navigation to ${sectionName} completed`);
    },

    async cleanupCurrentSection() {
      if (!this.currentSection) return;

      console.log(`🧹 Cleaning up: ${this.currentSection}`);

      const cleanupMap = {
        schedule: () => {
          if (window.CalendarModule && CalendarModule.destroy) {
            CalendarModule.destroy();
          }
        },
        work: () => {
          if (window.WorkManager && WorkManager.cleanup) {
            WorkManager.cleanup();
          }
        },
        salary: () => {
          if (window.SalaryManager && SalaryManager.cleanup) {
            SalaryManager.cleanup();
          }
        },
        profile: () => {
          if (window.ProfileManager && ProfileManager.cleanup) {
            ProfileManager.cleanup();
          }
        },
      };

      if (cleanupMap[this.currentSection]) {
        cleanupMap[this.currentSection]();
      }
    },

    updateNavButtons(targetSection) {
      console.log(`🔘 Updating nav buttons for: ${targetSection}`);

      this.navButtons.forEach((btn) => {
        btn.classList.remove("bg-gray-300", "text-gray-900", "bg-gray-200");
        btn.classList.add("text-gray-600", "hover:bg-gray-100");
        btn.removeAttribute("aria-current");
      });

      const targetBtn = document.querySelector(
        `[data-section="${targetSection}"]`
      );
      if (targetBtn) {
        targetBtn.classList.add("bg-gray-200", "text-gray-900");
        targetBtn.classList.remove("text-gray-600", "hover:bg-gray-100");
        targetBtn.setAttribute("aria-current", "page");
        console.log(`✅ Updated button: ${targetSection}`);
      }
    },

    toggleSections(targetSection) {
      console.log(`🔀 Toggling sections to: ${targetSection}`);

      this.sections.forEach((section) => {
        section.classList.remove("active");
      });

      const targetSectionEl = document.getElementById(
        `${targetSection}-section`
      );
      if (targetSectionEl) {
        targetSectionEl.classList.add("active");
        console.log(`✅ Activated section: ${targetSection}-section`);
      } else {
        console.error(`❌ Section not found: ${targetSection}-section`);
      }
    },

    async loadAndInitSection(sectionName) {
      const containerId = `${sectionName}-section`;
      const container = document.getElementById(containerId);

      if (!container) {
        console.error(`❌ Container not found: ${containerId}`);
        return;
      }

      console.log(`📦 Loading content for: ${sectionName}`);

      if (window.ComponentLoader) {
        if (!container.dataset.loaded || sectionName === "schedule") {
          console.log(`🔥 Loading content dynamically...`);
          await ComponentLoader.loadPageContent(sectionName);
        } else {
          console.log(`ℹ️ Content already loaded, re-initializing...`);
          ComponentLoader.initializePageSpecific(containerId);
        }
      }

      if (window.ModalManager) {
        setTimeout(() => {
          if (window.ModalManager.reinitializeEventHandlers) {
            ModalManager.reinitializeEventHandlers();
          }
        }, 100);
      }

      if (window.App) {
        setTimeout(() => window.App.updateUserInfo(), 100);
      }

      window.scrollTo(0, 0);
    },

    async refreshCurrentSection() {
      if (this.currentSection) {
        await this.loadAndInitSection(this.currentSection);
      }
    },
  };

  // ✅ EXPOSE WITH NEW NAME
  window.AppNavigation = AppNavigation;

  console.log("✅ AppNavigation loaded and ready");
  console.log("   Available methods:", Object.keys(AppNavigation));
})();
