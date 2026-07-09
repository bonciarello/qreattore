/* ============================================================
   Qreattore — Client logic
   ============================================================ */

(function () {
  "use strict";

  /* DOM refs */
  const form = document.getElementById("qr-form");
  const input = document.getElementById("qr-input");
  const typeBadge = document.getElementById("type-badge");
  const hintMsg = document.querySelector(".hint-msg");
  const inputError = document.getElementById("input-error");
  const generateBtn = document.getElementById("generate-btn");
  const resultSection = document.getElementById("result-section");
  const emptyState = document.getElementById("empty-state");
  const qrDisplay = document.getElementById("qr-display");
  const downloadBtn = document.getElementById("download-btn");
  const copySvgBtn = document.getElementById("copy-svg-btn");
  const resultUrl = document.getElementById("result-url");

  /* State */
  let currentSvg = null;
  let currentData = "";
  let currentType = "";

  /* ── Type detection ──────────────────────────────────── */

  function detectType(raw) {
    var t = raw.trim();
    if (!t) return "idle";

    /* URL: has protocol or looks like a domain */
    if (/^https?:\/\//i.test(t)) return "url";
    if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(t) && !/\s/.test(t))
      return "url";

    /* Phone: international or local format */
    if (/^\+?[\d\s\-().]{7,20}$/.test(t) && /\d/.test(t)) return "phone";

    return "text";
  }

  function prepareData(raw) {
    var t = raw.trim();
    var type = detectType(t);

    if (type === "phone" && !t.startsWith("tel:")) {
      /* Strip spaces/dashes and add tel: */
      var digits = t.replace(/[\s\-().]/g, "");
      return { data: "tel:" + digits, type: type };
    }

    if (
      type === "url" &&
      !/^https?:\/\//i.test(t) &&
      !/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(t)
    ) {
      /* Not a clear domain after all, treat as text */
      return { data: t, type: "text" };
    }

    if (
      type === "url" &&
      !/^https?:\/\//i.test(t) &&
      /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(t)
    ) {
      return { data: "https://" + t, type: type };
    }

    return { data: t, type: type };
  }

  /* ── UI updates ──────────────────────────────────────── */

  var badgeClasses = ["hint-badge--idle", "hint-badge--url", "hint-badge--phone", "hint-badge--text"];

  function updateHint(raw) {
    var type = detectType(raw);
    /* Remove all badge classes */
    badgeClasses.forEach(function (c) {
      typeBadge.classList.remove(c);
    });

    switch (type) {
      case "idle":
        typeBadge.textContent = "Pronto";
        typeBadge.classList.add("hint-badge--idle");
        hintMsg.textContent = "Incolla il contenuto e premi Genera";
        break;
      case "url":
        typeBadge.textContent = "URL";
        typeBadge.classList.add("hint-badge--url");
        hintMsg.textContent =
          "URL rilevato" +
          (raw.trim().startsWith("http") ? "" : " — sarà aggiunto https://");
        break;
      case "phone":
        typeBadge.textContent = "Telefono";
        typeBadge.classList.add("hint-badge--phone");
        hintMsg.textContent = "Numero rilevato — sarà aggiunto il prefisso tel:";
        break;
      case "text":
        typeBadge.textContent = "Testo";
        typeBadge.classList.add("hint-badge--text");
        hintMsg.textContent =
          "Testo libero — sarà codificato in un QR standard";
        break;
    }
  }

  function showError(msg) {
    inputError.textContent = msg;
    inputError.hidden = false;
    input.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    inputError.textContent = "";
    inputError.hidden = true;
    input.removeAttribute("aria-invalid");
  }

  function showResult() {
    resultSection.hidden = false;
    emptyState.hidden = true;
  }

  function hideResult() {
    resultSection.hidden = true;
    emptyState.hidden = false;
  }

  /* ── Toast ───────────────────────────────────────────── */

  function showToast(msg) {
    var toast = document.querySelector(".toast");
    if (toast) {
      toast.textContent = msg;
      toast.classList.remove("is-hiding");
      clearTimeout(toast._timeout);
    } else {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = msg;
      document.body.appendChild(toast);
    }

    toast._timeout = setTimeout(function () {
      toast.classList.add("is-hiding");
      toast._timeout2 = setTimeout(function () {
        if (toast.parentNode) toast.remove();
      }, 200);
    }, 2000);
  }

  /* ── QR generation ───────────────────────────────────── */

  function setLoading(loading) {
    if (loading) {
      generateBtn.classList.add("is-loading");
      generateBtn.disabled = true;
    } else {
      generateBtn.classList.remove("is-loading");
      generateBtn.disabled = false;
    }
  }

  function displayQr(svgText) {
    currentSvg = svgText;
    qrDisplay.innerHTML = svgText;
    downloadBtn.disabled = false;
    copySvgBtn.disabled = false;
    showResult();

    /* Show the decoded URL/text under the QR */
    if (currentData) {
      resultUrl.hidden = false;
      resultUrl.textContent =
        currentType === "url"
          ? "Punta a: " + currentData
          : currentType === "phone"
          ? "Chiama: " + currentData.replace("tel:", "")
          : "Contiene: " + currentData;
    }
  }

  function generateQr(raw) {
    clearError();
    var prepared = prepareData(raw);
    currentData = prepared.data;
    currentType = prepared.type;

    if (!currentData) {
      showError("Inserisci un testo, URL o numero di telefono.");
      input.focus();
      return;
    }

    setLoading(true);

    var url =
      "api/generate?data=" +
      encodeURIComponent(currentData) +
      "&format=svg";

    fetch(url)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.error || "Errore del server.");
          });
        }
        return res.text();
      })
      .then(function (svg) {
        displayQr(svg);
        setLoading(false);
      })
      .catch(function (err) {
        showError(err.message || "Impossibile generare il QR code. Riprova.");
        setLoading(false);
        hideResult();
      });
  }

  /* ── Download PNG ────────────────────────────────────── */

  function downloadPng() {
    if (!currentData) return;

    var url =
      "api/generate?data=" +
      encodeURIComponent(currentData) +
      "&format=png";

    fetch(url)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.error || "Errore nel download.");
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        var blobUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = blobUrl;
        a.download = "qreattore-qr-code.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(blobUrl);
        }, 200);
      })
      .catch(function (err) {
        showError(err.message || "Impossibile scaricare il PNG.");
      });
  }

  /* ── Copy SVG ────────────────────────────────────────── */

  function copySvg() {
    if (!currentSvg) return;

    /* Write SVG + ClipboardItem for modern browsers */
    var blob = new Blob([currentSvg], { type: "image/svg+xml" });
    var item = new ClipboardItem({ "image/svg+xml": blob });

    navigator.clipboard
      .write([item])
      .then(function () {
        showToast("SVG copiato negli appunti");
      })
      .catch(function () {
        /* Fallback: copy SVG source as text */
        navigator.clipboard
          .writeText(currentSvg)
          .then(function () {
            showToast("Codice SVG copiato negli appunti");
          })
          .catch(function () {
            showError("Impossibile copiare. Prova a selezionare il testo manualmente.");
          });
      });
  }

  /* ── Event listeners ─────────────────────────────────── */

  input.addEventListener("input", function () {
    updateHint(input.value);
    clearError();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    generateQr(input.value);
  });

  downloadBtn.addEventListener("click", function () {
    downloadPng();
  });

  copySvgBtn.addEventListener("click", function () {
    copySvg();
  });

  /* Keyboard: Ctrl+Enter / Cmd+Enter to generate */
  input.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      generateQr(input.value);
    }
  });

  /* ── Init ────────────────────────────────────────────── */

  updateHint("");
})();
