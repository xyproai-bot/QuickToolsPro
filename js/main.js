// ── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, type, duration) {
  const t = document.getElementById("qtp-toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "show" + (type ? " " + type : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ""; }, duration || 3000);
}

window.addEventListener("DOMContentLoaded", () => {
  const cs = new CSInterface();

  // Load JSX on startup
  cs.evalScript('$.evalFile(new File("' + cs.getSystemPath(SystemPath.EXTENSION) + '/jsx/QuickToolsPro2.0.jsx"));');

  // ── Debounce helper ──────────────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Cross-platform folder picker ────────────────────────────────────────
  const _isMac = cep_node['require']('os').platform() === 'darwin';

  function pickFolder(description) {
    const { execSync } = cep_node['require']('child_process');
    const fs   = cep_node['require']('fs');
    const os   = cep_node['require']('os');
    const path = cep_node['require']('path');

    if (_isMac) {
      // macOS: use osascript
      const script = `osascript -e 'POSIX path of (choose folder with prompt "${description}")'`;
      try {
        const result = execSync(script, { timeout: 60000, encoding: 'utf8' }).trim();
        return result || null;
      } catch(e) {
        return null; // user cancelled
      }
    } else {
      // Windows: use PowerShell FolderBrowserDialog
      const tmpFile   = path.join(os.tmpdir(), 'qtp_pick_' + Date.now() + '.txt');
      const tmpFilePS = tmpFile.replace(/\\/g, '/');

      const psLines = [
        'Add-Type -AssemblyName System.Windows.Forms',
        '[System.Windows.Forms.Application]::EnableVisualStyles()',
        '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
        `$d.Description = '${description}'`,
        '$d.UseDescriptionForTitle = $true',
        '$d.ShowNewFolderButton = $true',
        `$_out = '${tmpFilePS}'`,
        '$_r = $d.ShowDialog()',
        'if ($_r -eq [System.Windows.Forms.DialogResult]::OK) { [IO.File]::WriteAllText($_out, $d.SelectedPath, [Text.Encoding]::UTF8) } else { [IO.File]::WriteAllText($_out, [string]::Empty, [Text.Encoding]::UTF8) }'
      ].join('; ');

      const encoded = Buffer.from(psLines, 'utf16le').toString('base64');
      try {
        execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 60000 });
        if (fs.existsSync(tmpFile)) {
          const chosen = fs.readFileSync(tmpFile, 'utf8').trim();
          try { fs.unlinkSync(tmpFile); } catch(e) {}
          return chosen || null;
        }
      } catch(e) {
        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch(e2) {}
      }
      return null;
    }
  }

  const evalAE = (cmd) => {
    console.log("▶ AE:", cmd);
    cs.evalScript(cmd);
  };

  // ── Quick Tool Panel ─────────────────────────────────────────────────────

  // Simple tool buttons: [aria-label, jsx function, toast message]
  const simpleTools = [
    ["Offset",       "offsetLayerAndKey()"],
    ["Rename",       "showRenameWindow()"],
    ["Expression",   "openAddExpressionWindow()"],
    ["Ease Copy",    "copyEase()",            "Ease copied"],
    ["Ease Paste",   "pasteEase()",           "Ease pasted"],
    ["Effector",     "effectorTools()"],
    ["Ani-Marker",   "AniMarker()"],
    ["Randomize",    "randomProperty()"],
    ["Purge",        "app.purge(PurgeTarget.ALL_CACHES)", "Cache purged"],
    ["Sort",         "sortProject()",         "Project sorted"],
    ["Wiggle",       "wiggleControllerUI()"],
    ["Reduce",       "reduceProject()"],
    ["Text Tool",    "textToolsUI()"],
    ["Un-Precomp",   "unPreCompMain()"],
    ["DUP-Comp",     "dupComp()"],
    ["Select Path",  "runShowPathWithMasks()"],
    ["Control Path", "runFullNullControlPath()"],
    ["Motion Path",  "motionPath()"],
    ["Color Control","colorControl()"],
    ["Parent",       "parentSelectedLayersToLast()"],
    ["Set Anchor",   "quickSetAnchor()"],
    ["Set Null",     "quickSetNull()"],
  ];

  simpleTools.forEach(([label, jsx, toast]) => {
    const btn = document.querySelector(`[aria-label="${label}"]`);
    if (!btn) return;
    btn.addEventListener("click", () => {
      cs.evalScript(jsx, (res) => {
        if (toast) showToast(toast, "ok");
      });
    });
  });

  // Buttons with shift modifier
  const overBtn = document.querySelector('[aria-label="Overshoot"]');
  if (overBtn) overBtn.addEventListener("click", (e) => {
    cs.evalScript(`applyOverShootToSelected(${e.shiftKey})`);
  });

  const bounceBtn = document.querySelector('[aria-label="Bounce"]');
  if (bounceBtn) bounceBtn.addEventListener("click", (e) => {
    cs.evalScript(`applyBounceToSelected(${e.shiftKey})`);
  });

  const mergeBtn = document.querySelector('[aria-label="Merge"]');
  if (mergeBtn) mergeBtn.addEventListener("click", (e) => {
    cs.evalScript(e.shiftKey ? "mergeShape(true)" : "mergeShape()");
  });

  const splitBtn = document.querySelector('[aria-label="Split"]');
  if (splitBtn) splitBtn.addEventListener("click", () => {
    cs.evalScript("splitShape()");
  });

  // ── Collect Files ────────────────────────────────────────────────────────
  const collectBtn = document.querySelector('[aria-label="Collect"]');
  if (collectBtn) collectBtn.addEventListener("click", () => {
    const overlay      = document.getElementById("collect-overlay");
    const modeSection  = document.getElementById("collect-mode-section");
    const progSection  = document.getElementById("collect-progress-section");
    const phaseLabel   = document.getElementById("collect-phase-label");
    const fileList     = document.getElementById("collect-file-list");
    const overallCount = document.getElementById("collect-overall-count");
    const startBtn     = document.getElementById("collect-start-btn");
    const cancelBtn    = document.getElementById("collect-cancel-btn");
    const cancelProgressBtn = document.getElementById("collect-cancel-progress-btn");

    modeSection.style.display       = "";
    progSection.style.display       = "none";
    fileList.innerHTML               = "";
    startBtn.disabled                = false;
    cancelBtn.textContent            = "Cancel";
    cancelProgressBtn.textContent    = "Cancel";
    cancelProgressBtn.disabled       = false;
    overlay.style.display            = "flex";

    cancelBtn.onclick = () => { overlay.style.display = "none"; };

    startBtn.onclick = () => {
      const isMove = document.querySelector('input[name="collect-mode"]:checked').value === "move";

      modeSection.style.display = "none";
      progSection.style.display = "";
      phaseLabel.textContent    = "Building file list...";
      fileList.innerHTML        = "";
      overallCount.textContent  = "";

      let cancelRequested = false;
      let activeAbort     = null;

      cancelProgressBtn.disabled  = false;
      cancelProgressBtn.textContent = "Cancel";
      cancelProgressBtn.onclick = () => {
        cancelRequested = true;
        cancelProgressBtn.disabled = true;
        cancelProgressBtn.textContent = "Cancelling...";
        if (activeAbort) activeAbort();
      };

      const _customDir = (startBtn._getCustomFolder && startBtn._getCustomFolder()) || "";
      const _dirArg = _customDir ? `, ${JSON.stringify(_customDir.replace(/\\/g, "/"))}` : "";
      cs.evalScript(`buildCollectManifest(${isMove ? 1 : 0}${_dirArg})`, async (json) => {
        if (!json || json === "null") { overlay.style.display = "none"; return; }

        let manifest;
        try { manifest = JSON.parse(json); } catch(e) {
          alert("Error: " + e.message); overlay.style.display = "none"; return;
        }
        if (manifest.error) { alert(manifest.error); overlay.style.display = "none"; return; }
        if (!manifest.items || manifest.items.length === 0) {
          alert("Nothing to collect — all footage is already in the target folder.");
          overlay.style.display = "none"; return;
        }

        const fs   = cep_node['require']('fs');
        const path = cep_node['require']('path');

        if (!fs.existsSync(manifest.footageDir)) {
          fs.mkdirSync(manifest.footageDir, { recursive: true });
        }

        function copyWithProgress(src, dest, onProgress) {
          return new Promise((resolve, reject) => {
            let size = 0;
            try { size = fs.statSync(src).size; } catch(e) {}

            if (size === 0) {
              try { fs.copyFileSync(src, dest); onProgress(100); resolve(); }
              catch(e) { reject(e); }
              return;
            }

            let copied = 0, lastPct = 0;
            const CHUNK = 1024 * 512;
            const rs = fs.createReadStream(src, { highWaterMark: CHUNK });
            const ws = fs.createWriteStream(dest);

            activeAbort = () => {
              activeAbort = null;
              rs.destroy();
              ws.destroy();
              setTimeout(() => {
                try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch(e) {}
              }, 150);
              reject(new Error('cancelled'));
            };

            rs.on('data', chunk => {
              copied += chunk.length;
              const pct = Math.min(99, Math.round((copied / size) * 100));
              if (pct !== lastPct) { lastPct = pct; onProgress(pct); }
            });
            rs.on('error', e => { activeAbort = null; ws.destroy(); reject(e); });
            ws.on('error', e => { activeAbort = null; reject(e); });
            ws.on('finish', () => { activeAbort = null; onProgress(100); resolve(); });
            rs.pipe(ws);
          });
        }

        const total   = manifest.items.length;
        let collected = 0;
        const errors  = [];

        phaseLabel.textContent = isMove ? "Moving files..." : "Copying files...";

        for (let i = 0; i < total; i++) {
          if (cancelRequested) break;

          const item = manifest.items[i];
          const row = document.createElement("div");
          row.className = "cfi";
          row.innerHTML = `
            <div class="cfi-name" title="${item.name}">${item.name}</div>
            <div class="cfi-row">
              <div class="cfi-bar-wrap"><div class="cfi-bar"></div></div>
              <div class="cfi-pct">0%</div>
            </div>`;
          fileList.appendChild(row);
          fileList.scrollTop = fileList.scrollHeight;

          const bar = row.querySelector(".cfi-bar");
          const pct = row.querySelector(".cfi-pct");

          overallCount.textContent = `${i + 1} / ${total} files`;
          await new Promise(r => setTimeout(r, 0));

          try {
            if (item.skip) {
              bar.style.width      = "100%";
              bar.style.background = "#557799";
              pct.textContent      = "=";
              row.classList.add("done");
              row.style.opacity    = "0.6";
              collected++;
            } else if (isMove) {
              let moved = false;
              try { fs.renameSync(item.src, item.dest); moved = true; } catch(e) {}
              if (moved) {
                bar.style.width = "100%"; pct.textContent = "100%";
              } else {
                await copyWithProgress(item.src, item.dest, p => {
                  bar.style.width = p + "%"; pct.textContent = p + "%";
                });
                fs.unlinkSync(item.src);
              }
              row.classList.add("done");
              pct.textContent = "\u2713";
              collected++;
            } else {
              await copyWithProgress(item.src, item.dest, p => {
                bar.style.width = p + "%"; pct.textContent = p + "%";
              });
              row.classList.add("done");
              pct.textContent = "\u2713";
              collected++;
            }
          } catch(e) {
            if (e.message === 'cancelled' || cancelRequested) {
              bar.style.background = "#666";
              bar.style.width      = "100%";
              pct.textContent      = "\u2717";
              break;
            }
            bar.style.background = "#cc4444";
            pct.textContent      = "\u2717";
            errors.push(item.name + ": " + e.message);
          }

          await new Promise(r => setTimeout(r, 0));
        }

        if (cancelRequested) {
          phaseLabel.textContent        = `Cancelled \u2014 ${collected} / ${total} files processed.`;
          cancelProgressBtn.disabled    = false;
          cancelProgressBtn.textContent = "Close";
          cancelProgressBtn.onclick     = () => { overlay.style.display = "none"; };
          return;
        }

        cancelProgressBtn.disabled  = true;
        phaseLabel.textContent      = "Relinking in After Effects...";
        overallCount.textContent    = `${collected} / ${total} files copied`;
        await new Promise(r => setTimeout(r, 0));

        const relinkItems = manifest.items.filter(it => fs.existsSync(it.dest));
        const relinkJson  = JSON.stringify(relinkItems.map(it => ({
          id: it.id, dest: it.dest, isLayered: !!it.isLayered
        })));

        cs.evalScript(`applyCollectRelink(${JSON.stringify(relinkJson)})`, (json) => {
          phaseLabel.textContent        = `Done! ${collected} / ${total} files collected.`;
          cancelProgressBtn.disabled    = false;
          cancelProgressBtn.textContent = "Close";
          cancelProgressBtn.onclick     = () => { overlay.style.display = "none"; };

          let layeredWarning = "";
          if (json) {
            try {
              const r = JSON.parse(json);
              if (r.layeredFileCount > 0) {
                layeredWarning =
                  `\n\nNote: ${r.layeredFileCount} layered file(s) (PSD/AI/PSB) ` +
                  `were copied to the new folder but not auto-relinked, because ` +
                  `relinking would flatten the layers.\n\n` +
                  `If you move the .aep project, manually re-import these files ` +
                  `(File > Import) in After Effects.`;
              }
            } catch(e) {}
          }

          if (errors.length > 0 || layeredWarning) {
            const errMsg = errors.length > 0
              ? `\n\nErrors (${errors.length}):\n${errors.slice(0, 10).join("\n")}`
              : "";
            alert(`Collected ${collected} / ${total} files${layeredWarning}${errMsg}`);
          }
        });
      });
    };
  });

  // ── Time Remap ───────────────────────────────────────────────────────────
  const remapApplyBtn  = document.getElementById("btn-remap-apply");
  const remapDeleteBtn = document.getElementById("btn-remap-delete");
  const remapMinusFrame = document.getElementById("remap-minus-frame");

  function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  if (remapApplyBtn) remapApplyBtn.addEventListener("click", () => {
    const minusFrame = remapMinusFrame.checked;
    const loopDir = getRadioValue("remap-loop");
    const loopType = getRadioValue("remap-type");
    let expr = "";
    if (loopDir && loopDir !== "off") {
      expr = loopDir + "(type = '" + loopType + "', numKeyframes = 0)";
    }
    cs.evalScript(`applyTimeRemap(${minusFrame}, "${expr}")`);
  });

  if (remapDeleteBtn) remapDeleteBtn.addEventListener("click", () => {
    cs.evalScript("deleteTimeRemap()");
  });

  // ── Relink (cross-platform with toast feedback) ──────────────────────────
  const relinkBtn = document.querySelector('[aria-label="Relink"]');
  if (relinkBtn) relinkBtn.addEventListener("click", () => {
    function handleRelinkResult(json) {
      if (!json) return;
      try {
        const r = JSON.parse(json);
        if (r.relinked !== undefined) {
          const extra = r.notFound && r.notFound.length
            ? ` (${r.notFound.length + (r.notFoundMore || 0)} not found)` : "";
          showToast(`Relinked ${r.relinked} / ${r.total}${extra}`, r.notFound && r.notFound.length > 0 ? "warn" : "ok", 5000);
        }
      } catch(e) {}
    }

    const folderPath = pickFolder('Select folder to search for missing footage');
    if (folderPath) {
      const jsxPath = folderPath.replace(/\\/g, '/').replace(/"/g, '\\"');
      cs.evalScript(`relinkMissingFootage("${jsxPath}")`, handleRelinkResult);
    } else {
      cs.evalScript('relinkMissingFootage()', handleRelinkResult);
    }
  });

  // ── Label Setup ──────────────────────────────────────────────────────────
  const labelDropdown = document.getElementById("label-select");
  const saveBtn       = document.querySelector('[aria-label="Save Label"]');
  const selectBtn     = document.querySelector('[aria-label="Select label"]');
  const enableBtn     = document.querySelector('[aria-label="Enable/Disable"]');

  const labelMap = {
    none: 0, red: 1, yellow: 2, aqua: 3, pink: 4, lavender: 5,
    peach: 6, seafoam: 7, blue: 8, green: 9, purple: 10,
    fuchsia: 11, tan: 12, olive: 13, orange: 14, brown: 15, magenta: 16
  };

  function getCurrentLabel() {
    const selected = labelDropdown.value;
    if (!selected || selected === "none") {
      alert("Select label first.");
      return null;
    }
    const labelVal = labelMap[selected];
    if (labelVal === undefined) {
      alert("Invalid label selected.");
      return null;
    }
    return labelVal;
  }

  if (saveBtn) saveBtn.addEventListener("click", () => {
    const labelVal = getCurrentLabel();
    if (labelVal === null) return;
    cs.evalScript(`saveLabel(${labelVal})`);
  });

  if (selectBtn) selectBtn.addEventListener("click", (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl) {
      const labelVal = getCurrentLabel();
      if (labelVal === null) return;
      cs.evalScript(`selectLabelInverse(${labelVal})`);
      return;
    }

    const isShift = e.shiftKey;
    const labelVal = isShift ? "auto" : getCurrentLabel();
    if (labelVal === null) return;

    cs.evalScript(`selectLabel("${labelVal}")`, (res) => {
      if (isShift && res !== "0") {
        const labelName = Object.keys(labelMap).find(
          (key) => labelMap[key] === parseInt(res)
        );
        if (labelName) labelDropdown.value = labelName;
      }
    });
  });

  if (enableBtn) enableBtn.addEventListener("click", (e) => {
    const labelVal = getCurrentLabel();
    if (labelVal === null) return;

    let mode = "normal";
    if (e.ctrlKey || e.metaKey) mode = "ctrl";
    else if (e.shiftKey) mode = "shift";

    cs.evalScript(`toggleEnable(${labelVal}, "${mode}")`);
  });

  // ── Graph Tools ──────────────────────────────────────────────────────────
  const getFlag = () => document.getElementById("affect-layer")?.checked ? "true" : "false";

  const btnMap = {
    "btn-linear": "linear",
    "btn-holdL": "holdL",
    "btn-hold": "holdB",
    "btn-holdR": "holdR",
    "btn-auto": "auto",
    "btn-cont": "cont",
    "btn-ease-in": "easeIn",
    "btn-ease-out": "easeOut",
  };

  Object.entries(btnMap).forEach(([id, mode]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      evalAE(`setTemporalMode('${mode}', ${getFlag()})`);
    });
  });

  // ── Sliders (with debounce) ──────────────────────────────────────────────
  const bindSlider = (sliderId, inputId, jsxFn) => {
    const slider = document.getElementById(sliderId);
    const input  = document.getElementById(inputId);
    if (!slider || !input) return;

    const apply = (val, shift = false) => {
      val = Math.max(0, Math.min(100, parseFloat(val) || 0));
      slider.value = val;
      input.value = val;
      const v = parseFloat(val);
      if (isNaN(v)) return;
      evalAE(`${jsxFn}(${v}, ${getFlag()})`);
      if (shift) evalAE(`applySpeed(0, ${getFlag()})`);
    };

    // Debounced apply for realtime dragging — 60ms
    const debouncedApply = debounce((val, shift) => apply(val, shift), 60);

    // Realtime slider drag — sync input value immediately, debounce AE call
    slider.addEventListener("input", (e) => {
      input.value = slider.value;
      debouncedApply(slider.value, e.shiftKey);
    });

    // Final value on release
    slider.addEventListener("change", (e) => apply(slider.value, e.shiftKey));

    // Input field changes
    input.addEventListener("change", () => {
      slider.value = input.value;
      apply(input.value, false);
    });

    // Enter key in input
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        slider.value = input.value;
        apply(input.value, e.shiftKey);
        input.blur();
      }
    });
  };

  bindSlider("ease-in-slider", "ease-in-input", "applyInfluenceIn");
  bindSlider("ease-out-slider", "ease-out-input", "applyInfluenceOut");
  bindSlider("both-slider", "both-input", "applyInfluenceBoth");

  // ── Speed input ──────────────────────────────────────────────────────────
  const speedInput = document.getElementById("speed-input");
  if (speedInput) {
    speedInput.addEventListener("change", () => {
      const v = parseFloat(speedInput.value);
      if (!isNaN(v)) evalAE(`applySpeed(${v}, ${getFlag()})`);
    });
    speedInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const v = parseFloat(speedInput.value);
        if (!isNaN(v)) evalAE(`applySpeed(${v}, ${getFlag()})`);
        speedInput.blur();
      }
    });
  }

  // ── Anchor / Null Controls ───────────────────────────────────────────────
  const modeDropdown      = document.getElementById("mode-select");
  const ignoreMaskCheckbox = document.querySelector('[aria-label="Ignore Mask"]');
  const anchorButtons     = document.querySelectorAll(".control-pad .button.large");

  const labelToXY = {
    "Top Left": [0, 0],    "Top Center": [0.5, 0],    "Top Right": [1, 0],
    "Middle Left": [0, 0.5], "Center": [0.5, 0.5],    "Middle Right": [1, 0.5],
    "Bottom Left": [0, 1],  "Bottom Center": [0.5, 1], "Bottom Right": [1, 1]
  };

  anchorButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const label = btn.getAttribute("aria-label");
      const [xx, yy] = labelToXY[label] || [0.5, 0.5];
      const moveTypeIndex = modeDropdown.selectedIndex || 0;
      const ignoreMasks = ignoreMaskCheckbox.checked;

      if (!e.shiftKey) {
        cs.evalScript(`findAndMoveAnchor(${xx}, ${yy}, 0, ${moveTypeIndex}, ${ignoreMasks}, true)`);
      } else {
        cs.evalScript(`findAndSetNull(${xx}, ${yy}, 0, ${moveTypeIndex}, ${ignoreMasks}, true)`);
      }
    });
  });

  // ── Scale Fit ────────────────────────────────────────────────────────────
  const scaleFitBtn = document.querySelector('[aria-label="Scale Fit"]');
  if (scaleFitBtn) {
    scaleFitBtn.addEventListener("click", (e) => {
      const mode = e.altKey ? "fill" : e.shiftKey ? "cover" : "contain";
      cs.evalScript(`scaleLayersToFit("${mode}")`);
    });
  }

  // ── Smart Precomp ────────────────────────────────────────────────────────
  const smartPrecompBtn = document.querySelector('[aria-label="Smart Precomp"]');
  if (smartPrecompBtn) {
    smartPrecompBtn.addEventListener("click", () => {
      cs.evalScript("smartPrecomp()", (res) => {
        if (res && res.startsWith("Precomposed:")) showToast(res, "ok");
      });
    });
  }

  // ── Sequence Layers ──────────────────────────────────────────────────────
  const sequenceBtn = document.querySelector('[aria-label="Sequence"]');
  if (sequenceBtn) {
    const seqOverlay   = document.getElementById("sequence-overlay");
    const seqApplyBtn  = document.getElementById("seq-apply-btn");
    const seqCancelBtn = document.getElementById("seq-cancel-btn");
    const seqOverlap   = document.getElementById("seq-overlap");
    const seqReverse   = document.getElementById("seq-reverse");

    sequenceBtn.addEventListener("click", () => { seqOverlay.style.display = "flex"; });
    seqCancelBtn.onclick = () => { seqOverlay.style.display = "none"; };
    seqApplyBtn.onclick = () => {
      const overlap = parseInt(seqOverlap.value) || 0;
      const rev = seqReverse.checked;
      cs.evalScript(`sequenceLayers(${overlap}, ${rev})`);
      seqOverlay.style.display = "none";
      showToast("Layers sequenced", "ok");
    };
  }

  // ── Project Stats ────────────────────────────────────────────────────────
  const statsBtn = document.querySelector('[aria-label="Stats"]');
  if (statsBtn) {
    const statsOverlay  = document.getElementById("stats-overlay");
    const statsContent  = document.getElementById("stats-content");
    const statsCloseBtn = document.getElementById("stats-close-btn");

    statsCloseBtn.onclick = () => { statsOverlay.style.display = "none"; };

    statsBtn.addEventListener("click", () => {
      statsContent.innerHTML = "<div class='stats-label' style='color:#666;grid-column:1/-1'>Loading...</div>";
      statsOverlay.style.display = "flex";

      cs.evalScript("getProjectStats()", (json) => {
        if (!json) { statsContent.innerHTML = "<div class='stats-label'>No project open.</div>"; return; }
        let s;
        try { s = JSON.parse(json); } catch(e) { return; }

        function fmtSize(bytes) {
          if (!bytes) return "0 B";
          if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
          if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + " MB";
          return (bytes/1024/1024/1024).toFixed(2) + " GB";
        }

        const rows = [
          ["Compositions",   s.comps,   false],
          ["Video Footage",  s.footage, false],
          ["Audio",          s.audio,   false],
          ["Images",         s.images,  false],
          ["Solids / Nulls", s.solids,  false],
          ["Folders",        s.folders, false],
          null,
          ["Missing",        s.missing, s.missing > 0],
          null,
          ["Total Items",    s.totalItems,           false],
          ["Footage Size",   fmtSize(s.totalBytes),  false],
        ];

        statsContent.innerHTML = rows.map(r => {
          if (!r) return `<div class="stats-divider"></div><div class="stats-divider"></div>`;
          const val = typeof r[1] === "number" ? r[1].toLocaleString() : r[1];
          return `<div class="stats-label">${r[0]}</div><div class="stats-value${r[2]?" warn":""}">${val}</div>`;
        }).join("");
      });
    });
  }

  // ── Find & Replace Expressions ───────────────────────────────────────────
  const findReplaceBtn = document.querySelector('[aria-label="Find Replace"]');
  if (findReplaceBtn) {
    const fnrOverlay   = document.getElementById("fnr-overlay");
    const fnrApplyBtn  = document.getElementById("fnr-apply-btn");
    const fnrCancelBtn = document.getElementById("fnr-cancel-btn");
    const fnrFind      = document.getElementById("fnr-find");
    const fnrReplace   = document.getElementById("fnr-replace");
    const fnrResult    = document.getElementById("fnr-result");

    findReplaceBtn.addEventListener("click", () => {
      fnrResult.style.display = "none";
      fnrOverlay.style.display = "flex";
    });
    fnrCancelBtn.onclick = () => { fnrOverlay.style.display = "none"; };
    fnrApplyBtn.onclick = () => {
      const find = fnrFind.value;
      const replace = fnrReplace.value;
      if (!find) { showToast("Find field is empty", "warn"); return; }
      fnrApplyBtn.disabled = true;
      fnrApplyBtn.textContent = "Working...";
      cs.evalScript(`findReplaceExpressions(${JSON.stringify(find)}, ${JSON.stringify(replace)})`, (json) => {
        fnrApplyBtn.disabled = false;
        fnrApplyBtn.textContent = "Replace All";
        if (!json) return;
        try {
          const res = JSON.parse(json);
          if (res.error) { showToast(res.error, "err"); return; }
          fnrResult.textContent = `Replaced ${res.count} expression${res.count !== 1 ? "s" : ""}`;
          fnrResult.style.display = "block";
          fnrResult.style.color = res.count > 0 ? "#44aa66" : "#888";
        } catch(e) {}
      });
    };
  }

  // ── Collect custom folder (cross-platform) ───────────────────────────────
  const folderBtn   = document.getElementById("collect-folder-btn");
  const folderLabel = document.getElementById("collect-folder-label");
  if (folderBtn) {
    let customFolder = "";

    folderBtn.addEventListener("click", () => {
      const chosen = pickFolder('Choose output folder for collected footage');
      if (chosen) {
        customFolder = chosen;
        const short = chosen.length > 34 ? "..." + chosen.slice(-31) : chosen;
        folderLabel.textContent = short;
        folderLabel.title = chosen;
      }
    });

    const startBtn = document.getElementById("collect-start-btn");
    if (startBtn) startBtn._getCustomFolder = () => customFolder;
  }

  // ── Stagger Layers ───────────────────────────────────────────────────────
  const staggerNumInput  = document.getElementById("stagger-num");
  const staggerStepInput = document.getElementById("stagger-step");

  function getStaggerParams() {
    return {
      num:  parseInt(staggerNumInput?.value)  || 1,
      step: parseInt(staggerStepInput?.value) || 1,
    };
  }

  [["Stagger Forward","forward"],["Stagger Backward","backward"],["Stagger Center","center"],["Stagger Random","random"]].forEach(([label, mode]) => {
    const btn = document.querySelector(`[aria-label="${label}"]`);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const { num, step } = getStaggerParams();
      cs.evalScript(`staggerLayers(${num}, ${step}, "${mode}")`);
    });
  });

  const alignTimeBtn = document.querySelector('[aria-label="Align Time"]');
  if (alignTimeBtn) {
    alignTimeBtn.addEventListener("click", () => {
      cs.evalScript("alignLayersToCurrentTime()");
      showToast("Layers aligned", "ok");
    });
  }

  // ── Settings persistence (localStorage) ────────────────────────────────
  const fields = [
    { id: "ease-in-input",  key: "qtp_ease_in"   },
    { id: "ease-out-input", key: "qtp_ease_out"  },
    { id: "both-input",     key: "qtp_ease_both" },
    { id: "speed-input",    key: "qtp_speed"     },
    { id: "mode-select",    key: "qtp_anchor_mode"},
    { id: "label-select",   key: "qtp_label"     },
  ];
  const checks = [
    { selector: '[aria-label="Ignore Mask"]', key: "qtp_ignore_mask"  },
    { selector: '#affect-layer',              key: "qtp_affect_layer" },
  ];
  fields.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const v = localStorage.getItem(key);
    if (v !== null) {
      el.value = v;
      const slider = document.getElementById(id.replace("-input", "-slider"));
      if (slider) slider.value = v;
    }
    el.addEventListener("change", () => localStorage.setItem(key, el.value));
    el.addEventListener("input",  () => localStorage.setItem(key, el.value));
  });
  checks.forEach(({ selector, key }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const v = localStorage.getItem(key);
    if (v !== null) el.checked = v === "true";
    el.addEventListener("change", () => localStorage.setItem(key, el.checked));
  });

}); // end DOMContentLoaded
