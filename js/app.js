/**
 * TETRA AEROMECH - Main Application Controller (Apple & SAP Bright Edition)
 * Manages CSRF tokens, i18n dynamic translation, tabbed capabilities picker,
 * component filtering & blueprint modals, RFQ submission with CAD uploads, and mobile navigation.
 */

(function () {
  let csrfToken = "";
  let currentLang = "en";

  // Official Manufactured Precision Components Dataset (from Company Profile)
  const componentsList = [
    {
      id: "avionics-chassis",
      title: "Avionics Chassis Baseplate",
      sector: "aerospace",
      sectorLabel: "Aerospace & Avionics Defense",
      image: "/images/comp5_avionics_chassis.png",
      material: "Aerospace Aluminum 7075-T651 / 6061-T6",
      tolerance: "±0.005 mm (Sub-Micron Webbing)",
      surface_finish: "Ra 0.4 µm + MIL-A-8625 Hard Anodize",
      process: "5-Axis Simultaneous Precision VMC Pocketing",
      gdt: "Flatness 0.005 mm, True Position Ø0.008 mm",
      traceability: "AS9102 FAIR Form 1-3, 100% CMM Verified",
      badge: "5-Axis Aerospace"
    },
    {
      id: "finned-coldplate",
      title: "Finned Cold Plate (Thin Fin)",
      sector: "thermal",
      sectorLabel: "Thermal Management & Electronics",
      image: "/images/comp8_finned_coldplate.png",
      material: "Oxygen-Free Copper C11000 / Al 6063",
      tolerance: "±0.003 mm Fin Thickness (0.5 mm Fins)",
      surface_finish: "Ra 0.2 µm Mirror Finish",
      process: "High-Aspect Ratio Thin-Fin EDM & Micro-Milling",
      gdt: "Fin Parallelism 0.004 mm, Vacuum Seal Lip Flatness 0.003 mm",
      traceability: "Helium Mass-Spectrometer Leak Tested (< 10⁻⁸ mbar·l/s)",
      badge: "High-Aspect Thin Fin"
    },
    {
      id: "clevis-shafts",
      title: "Turned & Milled Clevis Shafts",
      sector: "shafts",
      sectorLabel: "Flight Control & Mechanical Linkages",
      image: "/images/comp1_clevis_shafts.png",
      material: "17-4 PH / 15-5 PH Stainless Steel (Condition H1025)",
      tolerance: "±0.002 mm Cylindrical Bore & O.D.",
      surface_finish: "Ra 0.15 µm Ground & Polished",
      process: "Dual-Operation CNC Turning & 4-Axis Milling",
      gdt: "Concentricity 0.003 mm, Fork Symmetrical Alignment 0.004 mm",
      traceability: "Magnetic Particle Inspection (MPI), Mill Cert 3.1",
      badge: "Dual Turn-Mill"
    },
    {
      id: "slotted-guide",
      title: "2.1mm Micro-Slotted Guide",
      sector: "tooling",
      sectorLabel: "Micro Metrology & Tooling Guides",
      image: "/images/comp2_slotted_guide.png",
      material: "Hardened Tool Steel D2 / H13 (58-62 HRC)",
      tolerance: "±0.002 mm Critical Slot Width (2.100 mm)",
      surface_finish: "Ra 0.1 µm Precision EDM Wire Lapped",
      process: "Micro-Slotting, Precision Wire EDM & Cryo Stress Relief",
      gdt: "Perpendicularity 0.002 mm, Sidewall Parallelism 0.002 mm",
      traceability: "Zeiss Optical CMM Scanning, Hardness Certified",
      badge: "Precision EDM"
    },
    {
      id: "treated-bracket",
      title: "Treated Guide Bracket",
      sector: "aerospace",
      sectorLabel: "Structural Airframe & Automation Mounts",
      image: "/images/comp3_treated_bracket.png",
      material: "Titanium Ti-6Al-4V Grade 5 / Alloy Steel",
      tolerance: "±0.005 mm Datum Alignment",
      surface_finish: "Ra 0.4 µm + AMS 2700 Chemical Passivation",
      process: "Monolithic 5-Axis VMC Machining & Surface Treatment",
      gdt: "Profile of Surface 0.008 mm, Angularity 0.005 mm",
      traceability: "Fluorescent Penetrant Inspected (FPI Level 3)",
      badge: "Surface Treated"
    },
    {
      id: "brass-bushing",
      title: "Precision Brass Bushing",
      sector: "bearings",
      sectorLabel: "High-Wear Spindle & Pivot Friction Joints",
      image: "/images/comp6_brass_bushing.png",
      material: "High-Tensile Phosphor Bronze SAE 660 / High-Leaded Brass",
      tolerance: "H7 Internal Bore (+0.008/-0.000 mm)",
      surface_finish: "Ra 0.2 µm Diamond Turned",
      process: "High-Tolerance CNC Turning with Internal Spiral Lube Grooves",
      gdt: "Cylindricity 0.002 mm, Runout < 0.003 mm",
      traceability: "100% Air-Gauge Diameter Inspected",
      badge: "High-Tolerance Turn"
    },
    {
      id: "star-shims",
      title: "Precision Star Shims & Spacers",
      sector: "tooling",
      sectorLabel: "Micro Metrology & Spindle Preload",
      image: "/images/comp4_star_shims.png",
      material: "Hardened Spring Steel / Titanium Grade 5",
      tolerance: "±0.001 mm Thickness Calibration",
      surface_finish: "Ra 0.1 µm Lapped & Burr-Free",
      process: "Sub-Micron Laser Stamping & Wire EDM Profiling",
      gdt: "Flatness 0.0015 mm, Thickness Uniformity < 1 Micron",
      traceability: "Dial Indicator & Micrometer Calibration Batch Matrix",
      badge: "Sub-Micron Calibration"
    },
    {
      id: "portfolio-collection",
      title: "Precision Machined Assembly Portfolio",
      sector: "aerospace",
      sectorLabel: "Aerospace, Defense, Medical & Automobile",
      image: "/images/comp7_portfolio_collection.png",
      material: "Inconel 718, Ti-6Al-4V, 7075-T6, 17-4 PH, Brass",
      tolerance: "Sub-Micron to ±0.002 mm",
      surface_finish: "Ra 0.15 µm to Ra 0.8 µm",
      process: "End-to-End CNC, VMC, Turning, EDM & Qualified Surface Processes",
      gdt: "ASME Y14.5 / ISO 1101 Full GD&T Compliance",
      traceability: "AS9100D Aligned, ISO 9001:2015, AS9102 FAIR",
      badge: "Comprehensive Portfolio"
    }
  ];

  // ------------------------------------------------------------------
  // CSRF Token Initialization
  // ------------------------------------------------------------------
  async function fetchCsrfToken() {
    try {
      const resp = await fetch("/api/csrf-token");
      if (resp.ok) {
        const data = await resp.json();
        csrfToken = data.csrf_token;
      }
    } catch (e) {
      console.warn("Could not obtain CSRF token:", e);
    }
  }

  // ------------------------------------------------------------------
  // Multi-Language Translation Engine (i18n)
  // ------------------------------------------------------------------
  function setLanguage(lang) {
    if (!window.TRANSLATIONS || !window.TRANSLATIONS[lang]) return;
    currentLang = lang;
    const dict = window.TRANSLATIONS[lang];

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      const key = el.getAttribute("data-i18n-ph");
      if (dict[key]) {
        el.setAttribute("placeholder", dict[key]);
      }
    });

    // Update active dropdown UI
    document.querySelectorAll(".lang-option").forEach(opt => {
      opt.classList.toggle("active", opt.getAttribute("data-lang") === lang);
    });

    const currentLangLabel = document.getElementById("currentLangLabel");
    if (currentLangLabel) {
      const map = { en: "EN", de: "DE", fr: "FR", ja: "日本語", es: "ES" };
      currentLangLabel.textContent = map[lang] || lang.toUpperCase();
    }
  }

  // ------------------------------------------------------------------
  // Tabbed Capabilities Picker & Machinery Switcher
  // ------------------------------------------------------------------
  window.switchTab = function (tabId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    document.querySelectorAll(".tab-content").forEach(content => {
      content.classList.toggle("active", content.id === `tab-${tabId}`);
    });
  };

  window.switchMachineTab = function (panelId) {
    document.querySelectorAll(".machine-nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-machine") === panelId);
    });

    document.querySelectorAll(".machine-showcase-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `machine-${panelId}`);
    });
  };

  function initTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        window.switchTab(tab);
      });
    });

    document.querySelectorAll(".machine-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const machine = btn.getAttribute("data-machine");
        window.switchMachineTab(machine);
      });
    });
  }

  // ------------------------------------------------------------------
  // Component Gallery Rendering & Filtering
  // ------------------------------------------------------------------
  function renderGallery(filter = "all") {
    const container = document.getElementById("componentsGrid");
    if (!container) return;

    const filtered = (filter === "all") 
      ? componentsList 
      : componentsList.filter(c => c.sector === filter);

    container.innerHTML = filtered.map(c => `
      <div class="comp-card" data-id="${c.id}">
        <div class="comp-img-wrap">
          <img src="${c.image}" alt="${c.title}" class="comp-img" loading="lazy">
        </div>
        <div class="comp-header">
          <span class="comp-badge">${c.badge}</span>
          <span class="comp-sector">${c.sectorLabel.split("&")[0]}</span>
        </div>
        <h3 class="comp-title">${c.title}</h3>
        <div class="comp-meta-grid">
          <div class="comp-meta-item">
            <span class="comp-meta-lbl">Alloy Material</span>
            <span class="comp-meta-val">${c.material.split("/")[0]}</span>
          </div>
          <div class="comp-meta-item">
            <span class="comp-meta-lbl">Critical Tolerance</span>
            <span class="comp-meta-val text-blue font-mono">${c.tolerance.split("(")[0]}</span>
          </div>
          <div class="comp-meta-item">
            <span class="comp-meta-lbl">Surface Finish</span>
            <span class="comp-meta-val font-mono">${c.surface_finish.split("+")[0]}</span>
          </div>
          <div class="comp-meta-item">
            <span class="comp-meta-lbl">Machining Cell</span>
            <span class="comp-meta-val">${c.process.split("&")[0]}</span>
          </div>
        </div>
        <div>
          <button class="btn btn-sm btn-outline btn-block" onclick="window.inspectComponent('${c.id}')">
            Inspect Blueprint & Telemetry
          </button>
        </div>
      </div>
    `).join("");
  }

  window.filterComponents = function (filter) {
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-filter") === filter);
    });
    renderGallery(filter);
  };

  // Modal Component Inspector
  window.inspectComponent = function (id) {
    const comp = componentsList.find(c => c.id === id);
    if (!comp) return;

    const modal = document.getElementById("compModal");
    const content = document.getElementById("compModalContent");
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <div>
          <span class="badge-pill">${comp.badge}</span>
          <h2 style="font-size: 1.4rem; margin-top: 4px;">${comp.title}</h2>
          <p style="font-size: 0.88rem; color: var(--text-secondary);">${comp.sectorLabel}</p>
        </div>
        <button class="modal-close" onclick="window.closeCompModal()">&times;</button>
      </div>

      <div style="text-align: center; background: radial-gradient(circle at center, rgba(0, 112, 242, 0.05) 0%, rgba(248, 250, 252, 1) 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 20px; margin-bottom: 20px;">
        <img src="${comp.image}" alt="${comp.title}" style="max-height: 180px; width: auto; max-width: 90%; object-fit: contain; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.12));">
      </div>

      <div style="background-color: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--sap-blue); margin-bottom: 8px;">
          <span>DRAWING REF: TA-ENG-2026-D</span>
          <span>DATUM [A|B|C] VERIFIED</span>
        </div>
        <div style="text-align: center; padding: 10px 0;">
          <div style="display: inline-block; border: 2px solid var(--sap-blue); padding: 6px 20px; border-radius: var(--radius-xs); background: #FFFFFF; font-family: var(--font-mono); font-size: 1.2rem; font-weight: 700; color: var(--sap-blue);">
            ⌀ ${comp.tolerance}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
          <span>INSPECTION: ZEISS CMM SCANNING</span>
          <span style="color: #107E3E; font-weight: 700;">STATUS: PASS (Cpk = 1.78)</span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Material Specification</span>
          <span style="font-weight: 600;">${comp.material}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Dimensional Tolerance</span>
          <span style="font-weight: 700; color: var(--sap-blue); font-family: var(--font-mono);">${comp.tolerance}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Surface Roughness</span>
          <span style="font-weight: 600; font-family: var(--font-mono);">${comp.surface_finish}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Machining Process</span>
          <span style="font-weight: 600;">${comp.process}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">GD&T Callout</span>
          <span style="font-weight: 600; font-family: var(--font-mono);">${comp.gdt}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-xs); font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Quality & Traceability</span>
          <span style="font-weight: 600;">${comp.traceability}</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="window.prefillRFQ('${comp.title}', '${comp.material}', '${comp.tolerance}')">
          Request Quote For This Specification
        </button>
        <button class="btn btn-secondary" onclick="window.closeCompModal()">Close</button>
      </div>
    `;

    modal.classList.add("active");
  };

  window.requestQuoteForComponent = function (id) {
    const comp = componentsList.find(c => c.id === id);
    if (comp) {
      window.prefillRFQ(comp.title, comp.material, comp.tolerance);
    }
  };

  window.closeCompModal = function () {
    const modal = document.getElementById("compModal");
    if (modal) modal.classList.remove("active");
  };

  // Pre-fill RFQ Form
  window.prefillRFQ = function (title, material, tolerance) {
    window.closeCompModal();
    const rfqSec = document.getElementById("rfq");
    if (rfqSec) {
      rfqSec.scrollIntoView({ behavior: "smooth" });
    }
    const matInput = document.getElementById("rfqMaterial");
    const tolInput = document.getElementById("rfqTolerance");
    const notesInput = document.getElementById("rfqNotes");

    if (matInput) matInput.value = material;
    if (tolInput) tolInput.value = tolerance;
    if (notesInput) notesInput.value = `RFQ inquiry based on component: ${title}. Please provide DFM feedback.`;
  };

  // ------------------------------------------------------------------
  // Toast Notifications
  // ------------------------------------------------------------------
  function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 24px; z-index: 1100;
      background: #FFFFFF; border: 1px solid var(--border-subtle);
      border-left: 4px solid ${type === 'success' ? '#107E3E' : '#D92D20'};
      box-shadow: var(--shadow-lg); padding: 14px 20px;
      border-radius: var(--radius-sm); font-size: 0.9rem;
      display: flex; align-items: center; gap: 10px;
      animation: slideUp 0.3s ease;
    `;
    toast.innerHTML = `
      <span style="display:inline-flex; align-items:center; color:${type === 'success' ? '#107E3E' : '#D92D20'};">
        ${type === 'success' 
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'}
      </span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s ease";
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // ------------------------------------------------------------------
  // RFQ Submission Handler
  // ------------------------------------------------------------------
  function initRFQForm() {
    const form = document.getElementById("rfqForm");
    const fileInput = document.getElementById("rfqFile");
    const fileStatus = document.getElementById("rfqFileStatus");

    if (fileInput && fileStatus) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
          const f = fileInput.files[0];
          fileStatus.textContent = `Attached: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
          fileStatus.textContent = "";
        }
      });
    }

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `Transmitting RFQ to Secure Vault...`;

      try {
        const formData = new FormData(form);
        formData.append("csrf_token", csrfToken);

        const resp = await fetch("/api/rfq", {
          method: "POST",
          headers: {
            "X-CSRF-Token": csrfToken
          },
          body: formData
        });

        const result = await resp.json();

        if (resp.ok && result.status === "success") {
          showRFQSuccess(result);
          form.reset();
          if (fileStatus) fileStatus.textContent = "";
        } else {
          showToast(result.error || "RFQ submission issue. Please try again.", "error");
        }
      } catch (err) {
        showToast("Network transmission error. Please check your connection.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  function showRFQSuccess(data) {
    const container = document.getElementById("rfqSuccessContainer");
    if (!container) return;

    container.innerHTML = `
      <div class="rfq-success-card">
        <div style="width: 52px; height: 52px; background: var(--sap-blue-light); border: 2px solid var(--sap-blue); color: var(--sap-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h3 style="font-size: 1.5rem; margin-bottom: 8px;">Request for Quote Successfully Received</h3>
        <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 16px auto;">
          Your aerospace engineering requirements have been secured in our ITAR/NDA-compliant database.
        </p>
        <div class="rfq-ref-pill">${data.reference_id}</div>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 20px;">
          Our Technical Directors (Hemanth Kumar Ramesh & Yeshwanth Parameshwara) will perform a comprehensive DFM review and issue your quote within 24–48 hours.
        </p>
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('rfqSuccessContainer').innerHTML=''">Submit Another RFQ</button>
      </div>
    `;

    container.scrollIntoView({ behavior: "smooth" });
  }

  // ------------------------------------------------------------------
  // Careers Application Modal Handler
  // ------------------------------------------------------------------
  function initCareers() {
    window.openCareerModal = function (roleName) {
      const modal = document.getElementById("careerModal");
      const roleInput = document.getElementById("careerRoleInput");
      const roleTitle = document.getElementById("careerRoleTitle");

      if (roleInput) roleInput.value = roleName;
      if (roleTitle) roleTitle.textContent = `Position: ${roleName}`;
      if (modal) modal.classList.add("active");
    };

    window.closeCareerModal = function () {
      const modal = document.getElementById("careerModal");
      if (modal) modal.classList.remove("active");
    };

    const careerForm = document.getElementById("careerForm");
    if (!careerForm) return;

    careerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = careerForm.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "Submitting Application...";

      const payload = {
        csrf_token: csrfToken,
        full_name: document.getElementById("careerName").value,
        email: document.getElementById("careerEmail").value,
        phone: document.getElementById("careerPhone").value,
        role: document.getElementById("careerRoleInput").value,
        experience: document.getElementById("careerExp").value,
        notes: document.getElementById("careerNotes").value
      };

      try {
        const resp = await fetch("/api/careers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify(payload)
        });

        const res = await resp.json();
        if (resp.ok && res.status === "success") {
          showToast(res.message, "success");
          careerForm.reset();
          window.closeCareerModal();
        } else {
          showToast(res.error || "Application submission failed.", "error");
        }
      } catch (err) {
        showToast("Submission error. Please check your network.", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }

  // ------------------------------------------------------------------
  // Contact Form Handler
  // ------------------------------------------------------------------
  function initContactForm() {
    const contactForm = document.getElementById("contactForm");
    if (!contactForm) return;

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      btn.disabled = true;

      const payload = {
        csrf_token: csrfToken,
        name: document.getElementById("contactName").value,
        email: document.getElementById("contactEmail").value,
        department: document.getElementById("contactDept").value,
        subject: document.getElementById("contactSubject").value,
        message: document.getElementById("contactMsg").value
      };

      try {
        const resp = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          body: JSON.stringify(payload)
        });

        const res = await resp.json();
        if (resp.ok && res.status === "success") {
          showToast(res.message, "success");
          contactForm.reset();
        } else {
          showToast(res.error || "Failed to send message.", "error");
        }
      } catch (err) {
        showToast("Error sending message. Please email directly.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------
  // Mobile Navigation & Language Dropdown
  // ------------------------------------------------------------------
  function initNav() {
    const mobileToggle = document.getElementById("mobileToggle");
    const mobileDrawer = document.getElementById("mobileDrawer");
    const mobileOverlay = document.getElementById("mobileDrawerOverlay");
    const mobileClose = document.getElementById("mobileDrawerClose");
    const mobileChatBtn = document.getElementById("mobileChatLauncher");

    function closeDrawer() {
      if (mobileDrawer) mobileDrawer.classList.remove("active");
      if (mobileOverlay) mobileOverlay.classList.remove("active");
      if (mobileToggle) mobileToggle.classList.remove("active");
      document.body.classList.remove("menu-open");
    }

    function openDrawer() {
      if (mobileDrawer) mobileDrawer.classList.add("active");
      if (mobileOverlay) mobileOverlay.classList.add("active");
      if (mobileToggle) mobileToggle.classList.add("active");
      document.body.classList.add("menu-open");
    }

    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener("click", () => {
        if (mobileDrawer.classList.contains("active")) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });

      if (mobileOverlay) {
        mobileOverlay.addEventListener("click", closeDrawer);
      }

      if (mobileClose) {
        mobileClose.addEventListener("click", closeDrawer);
      }

      // Close when clicking any nav link inside drawer
      document.querySelectorAll(".mobile-nav-item, .mobile-rfq-btn, .mobile-link").forEach(link => {
        link.addEventListener("click", closeDrawer);
      });

      // Mobile chat launcher
      if (mobileChatBtn) {
        mobileChatBtn.addEventListener("click", () => {
          closeDrawer();
          if (typeof window.openChat === "function") {
            window.openChat();
          }
        });
      }

      // Close on ESC
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && mobileDrawer.classList.contains("active")) {
          closeDrawer();
        }
      });

      // Touch swipe right to close drawer on mobile
      let touchStartX = 0;
      let touchEndX = 0;
      mobileDrawer.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      mobileDrawer.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 60) {
          // Swiped right -> close
          closeDrawer();
        }
      }, { passive: true });
    }

    // Language Dropdown
    const langBtn = document.getElementById("langDropdownBtn");
    const langMenu = document.getElementById("langDropdownMenu");

    if (langBtn && langMenu) {
      langBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        langMenu.classList.toggle("active");
      });

      document.addEventListener("click", () => {
        langMenu.classList.remove("active");
      });

      document.querySelectorAll(".lang-option").forEach(opt => {
        opt.addEventListener("click", () => {
          const l = opt.getAttribute("data-lang");
          setLanguage(l);
          langMenu.classList.remove("active");
        });
      });
    }

    // Component Filter Buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const f = btn.getAttribute("data-filter");
        window.filterComponents(f);
      });
    });
  }

  // ------------------------------------------------------------------
  // On DOM Ready
  // ------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", () => {
    fetchCsrfToken();
    initNav();
    initTabs();
    renderGallery("all");
    initRFQForm();
    initCareers();
    initContactForm();

    // Default language check
    setLanguage("en");
  });
})();

/* ==========================================================================
   UX ENHANCEMENTS — Scroll Reveal, Scroll-to-Top, Progress Bar, Active Nav
   ========================================================================== */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // 1. Scroll-Reveal via Intersection Observer
  // ------------------------------------------------------------------
  function initScrollReveal() {
    const opts = { threshold: 0.12, rootMargin: "0px 0px -40px 0px" };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target); // fire once
        }
      });
    }, opts);

    document
      .querySelectorAll(".reveal, .reveal-group, .reveal-left, .reveal-right, .reveal-scale")
      .forEach((el) => observer.observe(el));
  }

  // ------------------------------------------------------------------
  // 2. Scroll-to-Top Button
  // ------------------------------------------------------------------
  function initScrollTop() {
    const btn = document.getElementById("scrollTopBtn");
    if (!btn) return;

    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    }, { passive: true });

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ------------------------------------------------------------------
  // 3. Page Scroll Progress Bar
  // ------------------------------------------------------------------
  function initProgressBar() {
    const bar = document.getElementById("pageProgress");
    if (!bar) return;

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct.toFixed(1) + "%";
    }, { passive: true });
  }

  // ------------------------------------------------------------------
  // 4. Active Nav Section Highlighting
  // ------------------------------------------------------------------
  function initActiveNav() {
    // Map section ids to nav button text
    const sectionMap = {
      "capabilities": "Capabilities",
      "metrology": "Quality & Metrology",
      "components": "Components",
      "supply-chain": "Supply Chain & 7S",
      "sustainability": "Sustainability",
      "leadership": "Company",
      "careers": "Company",
      "contact": "Company",
      "rfq": null, // no nav item
    };

    const navBtns = document.querySelectorAll(".nav-link-btn");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sid = entry.target.id;
        const label = sectionMap[sid];

        navBtns.forEach((btn) => {
          const parentItem = btn.closest(".nav-item");
          const btnText = btn.querySelector("span[data-i18n], span:first-child");
          const text = btnText ? btnText.textContent.trim() : btn.textContent.trim();

          if (label && text.startsWith(label.split("&")[0].trim())) {
            btn.classList.add("active-section");
            if (parentItem) parentItem.classList.add("active-section");
          } else {
            btn.classList.remove("active-section");
            if (parentItem) parentItem.classList.remove("active-section");
          }
        });
      });
    }, { threshold: 0.25 });

    Object.keys(sectionMap).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // ------------------------------------------------------------------
  // 5. Smooth hover ripple on CTA buttons
  // ------------------------------------------------------------------
  function initButtonRipple() {
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement("span");
        ripple.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:0;height:0;border-radius:50%;
          background:rgba(255,255,255,0.35);
          transform:translate(-50%,-50%);
          animation:rippleAnim 0.55s ease-out forwards;
          pointer-events:none;
        `;
        if (!btn.style.position || btn.style.position === "static") {
          btn.style.position = "relative";
          btn.style.overflow = "hidden";
        }
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Inject ripple keyframe once
    if (!document.getElementById("ripple-style")) {
      const s = document.createElement("style");
      s.id = "ripple-style";
      s.textContent = `@keyframes rippleAnim {
        to { width: 280px; height: 280px; opacity: 0; }
      }`;
      document.head.appendChild(s);
    }
  }

  // ------------------------------------------------------------------
  // Boot all UX enhancements
  // ------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initScrollTop();
    initProgressBar();
    initActiveNav();
    initButtonRipple();
  });
})();
