const fs = cep_node['require']('fs')
  , path = cep_node['require']('path')
  , os = cep_node['require']('os')
  , {execFile: execFile, execSync: execSync} = cep_node['require']('child_process')
  , csInterface = new CSInterface()
  , activateBtn = document['getElementById']('activateBtn')
  , pasteBtn = document['getElementById']('pasteBtn')
  , {spawn: spawn} = cep_node['require']('child_process')
  , pencilParkLink = document['getElementById']('pencilParkLink')
  , statusDiv = document['getElementById']('status');

window.addEventListener("DOMContentLoaded", () => {
  const cs = new CSInterface();

  let isShiftPressed = false;

  // Theo dõi trạng thái phím Shift
  window.addEventListener("keydown", (e) => {
    if (e.key === "Shift") isShiftPressed = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") isShiftPressed = false;
  });

  // Load JSX khi extension khởi động
  cs.evalScript('$.evalFile(new File("' + cs.getSystemPath(SystemPath.EXTENSION) + '/jsx/QuickToolsPro2.0.jsx"));');

// Quick Tool Panel /////////////////////////////////////////////////////////////////////////////////
  const offsetBtn = document.querySelector('[aria-label="Offset"]');
  offsetBtn.addEventListener("click", () => {
  cs.evalScript("offsetLayerAndKey()");
  });

  const renameBtn = document.querySelector('[aria-label="Rename"]');
  renameBtn.addEventListener("click", () => {
  cs.evalScript("showRenameWindow()");
  });

  const expressionBtn = document.querySelector('[aria-label="Expression"]');
  expressionBtn.addEventListener("click", () => {
  cs.evalScript("openAddExpressionWindow()");
  });
  
  const easeCopyBtn = document.querySelector('[aria-label="Ease Copy"]');
  easeCopyBtn.addEventListener("click", () => {
  cs.evalScript("copyEase()");
  });    

  const easePasteBtn = document.querySelector('[aria-label="Ease Paste"]');
  easePasteBtn.addEventListener("click", () => {
  cs.evalScript("pasteEase()");
  });  


  const overBtn = document.querySelector('[aria-label="Overshoot"]');
  overBtn.addEventListener("click", (event) => {
    const shiftPressed = event.shiftKey;
    cs.evalScript(`applyOverShootToSelected(${shiftPressed})`);
  });

  const bounceBtn = document.querySelector('[aria-label="Bounce"]');
  bounceBtn.addEventListener("click", (event) => {
    const shiftPressed = event.shiftKey;
    cs.evalScript(`applyBounceToSelected(${shiftPressed})`);
  });

  const effectorBtn = document.querySelector('[aria-label="Effector"]');
  effectorBtn.addEventListener("click", () => {
    cs.evalScript("effectorTools()");
  }); 

  const aniMarkerBtn = document.querySelector('[aria-label="Ani-Marker"]');
  aniMarkerBtn.addEventListener("click", () => {
    cs.evalScript("AniMarker()");
  }); 

  const randomBtn = document.querySelector('[aria-label="Randomize"]');
  randomBtn.addEventListener("click", () => {
    cs.evalScript("randomProperty()");
  });

  const purgeBtn = document.querySelector('[aria-label="Purge"]');
  purgeBtn.addEventListener("click", () => {
    cs.evalScript("app.purge(PurgeTarget.ALL_CACHES)");
  });

  const sortBtn = document.querySelector('[aria-label="Sort"]');
  sortBtn.addEventListener("click", () => {
    cs.evalScript("sortProject()");
  });

  const collectBtn = document.querySelector('[aria-label="Collect"]');
  collectBtn.addEventListener("click", () => {
    const overlay      = document.getElementById("collect-overlay");
    const modeSection  = document.getElementById("collect-mode-section");
    const progSection  = document.getElementById("collect-progress-section");
    const phaseLabel   = document.getElementById("collect-phase-label");
    const fileList     = document.getElementById("collect-file-list");
    const overallCount = document.getElementById("collect-overall-count");
    const startBtn     = document.getElementById("collect-start-btn");
    const cancelBtn    = document.getElementById("collect-cancel-btn");

    const cancelProgressBtn = document.getElementById("collect-cancel-progress-btn");

    // Reset UI to mode-selection state
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

      // ── Cancellation state ──────────────────────────────
      let cancelRequested = false;
      let activeAbort     = null; // set by copyWithProgress while a copy is in flight

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

        // Copy with progress + cancellation support
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

            // Expose abort so the cancel button can call it
            activeAbort = () => {
              activeAbort = null;
              rs.destroy();
              ws.destroy();
              // Remove partial file after streams close
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
              pct.textContent = "✓";
              collected++;
            } else {
              await copyWithProgress(item.src, item.dest, p => {
                bar.style.width = p + "%"; pct.textContent = p + "%";
              });
              row.classList.add("done");
              pct.textContent = "✓";
              collected++;
            }
          } catch(e) {
            if (e.message === 'cancelled' || cancelRequested) {
              bar.style.background = "#666";
              bar.style.width      = "100%";
              pct.textContent      = "✗";
              break;
            }
            bar.style.background = "#cc4444";
            pct.textContent      = "✗";
            errors.push(item.name + ": " + e.message);
          }

          await new Promise(r => setTimeout(r, 0));
        }

        // Cancelled — skip relink, show close button
        if (cancelRequested) {
          phaseLabel.textContent        = `Cancelled — ${collected} / ${total} files processed.`;
          cancelProgressBtn.disabled    = false;
          cancelProgressBtn.textContent = "Close";
          cancelProgressBtn.onclick     = () => { overlay.style.display = "none"; };
          return;
        }

        // Relink phase
        cancelProgressBtn.disabled  = true; // can't cancel during relink
        phaseLabel.textContent      = "Relinking in After Effects...";
        overallCount.textContent    = `${collected} / ${total} files copied`;
        await new Promise(r => setTimeout(r, 0));

        const relinkItems = manifest.items.filter(it => fs.existsSync(it.dest));
        const relinkJson  = JSON.stringify(relinkItems.map(it => ({ id: it.id, dest: it.dest })));

        cs.evalScript(`applyCollectRelink(${JSON.stringify(relinkJson)})`, () => {
          phaseLabel.textContent        = `Done! ${collected} / ${total} files collected.`;
          cancelProgressBtn.disabled    = false;
          cancelProgressBtn.textContent = "Close";
          cancelProgressBtn.onclick     = () => { overlay.style.display = "none"; };

          if (errors.length > 0) {
            alert(`Collected ${collected} / ${total} files\n\nErrors (${errors.length}):\n${errors.slice(0, 10).join("\n")}`);
          }
        });
      });
    };
  });

  // Time Remap inline controls
  const remapApplyBtn = document.getElementById("btn-remap-apply");
  const remapDeleteBtn = document.getElementById("btn-remap-delete");
  const remapMinusFrame = document.getElementById("remap-minus-frame");

  function getRadioValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  }

  remapApplyBtn.addEventListener("click", () => {
    const minusFrame = remapMinusFrame.checked;
    const loopDir = getRadioValue("remap-loop");
    const loopType = getRadioValue("remap-type");
    let expr = "";
    if (loopDir && loopDir !== "off") {
      expr = loopDir + "(type = '" + loopType + "', numKeyframes = 0)";
    }
    cs.evalScript(`applyTimeRemap(${minusFrame}, "${expr}")`);
  });

  remapDeleteBtn.addEventListener("click", () => {
    cs.evalScript("deleteTimeRemap()");
  });

  const wiggleBtn = document.querySelector('[aria-label="Wiggle"]');
  wiggleBtn.addEventListener("click", () => {
    cs.evalScript("wiggleControllerUI()");
  });

  const reduceBtn = document.querySelector('[aria-label="Reduce"]');
  reduceBtn.addEventListener("click", () => {
    cs.evalScript("reduceProject()");
  });

  const relinkBtn = document.querySelector('[aria-label="Relink"]');
  relinkBtn.addEventListener("click", () => {
    const { execSync } = cep_node['require']('child_process');
    const fs   = cep_node['require']('fs');
    const os   = cep_node['require']('os');
    const path = cep_node['require']('path');

    // Write result to a temp file using [IO.File]::WriteAllText (UTF-8, no BOM)
    // This avoids the pipe encoding problem where Chinese paths become garbled
    const tmpFile = path.join(os.tmpdir(), 'qtp_relink_' + Date.now() + '.txt');
    const tmpFilePS = tmpFile.replace(/\\/g, '/'); // forward slashes work in PS .NET calls

    const psLines = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '[System.Windows.Forms.Application]::EnableVisualStyles()',
      '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
      "$d.Description = 'Select folder to search for missing footage'",
      '$d.UseDescriptionForTitle = $true',
      '$d.ShowNewFolderButton = $false',
      `$_out = '${tmpFilePS}'`,
      '$_r = $d.ShowDialog()',
      // Write UTF-8 WITHOUT BOM using .NET directly — avoids all console encoding issues
      'if ($_r -eq [System.Windows.Forms.DialogResult]::OK) { [IO.File]::WriteAllText($_out, $d.SelectedPath, [Text.Encoding]::UTF8) } else { [IO.File]::WriteAllText($_out, [string]::Empty, [Text.Encoding]::UTF8) }'
    ].join('; ');

    const encoded = Buffer.from(psLines, 'utf16le').toString('base64');

    try {
      execSync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 60000 }  // no encoding option — we don't read stdout
      );

      if (fs.existsSync(tmpFile)) {
        const folderPath = fs.readFileSync(tmpFile, 'utf8').trim();
        try { fs.unlinkSync(tmpFile); } catch(e) {}

        if (folderPath) {
          const jsxPath = folderPath.replace(/\\/g, '/').replace(/"/g, '\\"');
          cs.evalScript(`relinkMissingFootage("${jsxPath}")`);
        }
      }
    } catch (e) {
      console.error('PowerShell folder picker failed, falling back:', e);
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch(e2) {}
      cs.evalScript('relinkMissingFootage()');
    }
  });

  const textToolBtn = document.querySelector('[aria-label="Text Tool"]');
  textToolBtn.addEventListener("click", () => {
    cs.evalScript("textToolsUI()");
  });

  const unPreCompBtn = document.querySelector('[aria-label="Un-Precomp"]');
  unPreCompBtn.addEventListener("click", () => {
    cs.evalScript("unPreCompMain()");
  });

  const dupCompBtn = document.querySelector('[aria-label="DUP-Comp"]');
  dupCompBtn.addEventListener("click", () => {
    cs.evalScript("dupComp()");
  });

  const selectPathBtn = document.querySelector('[aria-label="Select Path"]');
  selectPathBtn.addEventListener("click", () => {
    cs.evalScript("runShowPathWithMasks()");
  });

  const controlPathBtn = document.querySelector('[aria-label="Control Path"]');
  controlPathBtn.addEventListener("click", () => {
    cs.evalScript("runFullNullControlPath()");
  });

  const motionPathBtn = document.querySelector('[aria-label="Motion Path"]');
  motionPathBtn.addEventListener("click", () => {
    cs.evalScript("motionPath()");
  });

  const mergeBtn = document.querySelector('[aria-label="Merge"]');
  mergeBtn.addEventListener("click", () => {
    cs.evalScript("mergeShape()");
  });

  const splitBtn = document.querySelector('[aria-label="Split"]');
  splitBtn.addEventListener("click", () => {
    cs.evalScript("splitShape()");
  });

// Label Setup /////////////////////////////////////////////////////
  const labelDropdown = document.getElementById("label-select");
  const saveBtn = document.querySelector('[aria-label="Save Label"]');
  const selectBtn = document.querySelector('[aria-label="Select label"]');
  const enableBtn = document.querySelector('[aria-label="Enable/Disable"]');
  const colorControlBtn = document.querySelector('[aria-label="Color Control"]');

  colorControlBtn.addEventListener("click", () => {
    cs.evalScript("colorControl()");
  });

  const labelMap = {
    none: 0, red: 1, yellow: 2, aqua: 3, pink: 4, lavender: 5,
    peach: 6, seafoam: 7, blue: 8, green: 9, purple: 10,
    fuchsia: 11, tan: 12, olive: 13, orange: 14, brown: 15, magenta: 16
  };

  // 🧠 Hàm tiện ích: lấy giá trị label hiện tại
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

  // 🟥 Save Label
  saveBtn.addEventListener("click", () => {
    const labelVal = getCurrentLabel();
    if (labelVal === null) return;
    cs.evalScript(`saveLabel(${labelVal})`, (res) => console.log("✅", res));
  });

  // 🟨 Select Label
  selectBtn.addEventListener("click", (e) => {
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey; // ⌘ trên macOS

    // 🟦 Nếu nhấn Ctrl → chọn layer có label khác dropdown hiện tại
    if (isCtrl) {
      const labelVal = getCurrentLabel();
      if (labelVal === null) return;
      cs.evalScript(`selectLabelInverse(${labelVal})`, (res) => {
        console.log("✅ Inverse Select:", res);
      });
      return; // ✅ dừng ở đây, không chạy phần còn lại
    }

    // 🟨 Nếu nhấn Shift → chọn theo label của layer cuối cùng đang chọn
    const labelVal = isShift ? "auto" : getCurrentLabel();
    if (labelVal === null) return;

    cs.evalScript(`selectLabel("${labelVal}")`, (res) => {
      console.log("✅", res);

      // Chỉ update dropdown nếu shift-click, bình thường giữ nguyên
      if (isShift && res !== "0") {
        const labelName = Object.keys(labelMap).find(
          (key) => labelMap[key] === parseInt(res)
        );
        if (labelName) labelDropdown.value = labelName;
      }
    });
  });


  // 🟩 Enable / Disable
  enableBtn.addEventListener("click", (e) => {
    const labelVal = getCurrentLabel();
    if (labelVal === null) return;

    let mode = "normal";
    if (e.ctrlKey || e.metaKey) mode = "ctrl";   // Ctrl (Windows) hoặc Command (Mac)
    else if (e.shiftKey) mode = "shift";

    cs.evalScript(`toggleEnable(${labelVal}, "${mode}")`, (res) => console.log("✅", res));
  });





// Graph Tool ////////////////////////////////////////////////////////////
// --- CHECKBOX ---
const getFlag = () => document.getElementById("affect-layer")?.checked ? "true" : "false";

  const evalAE = (cmd) => {
    console.log("▶ AE:", cmd);
    cs.evalScript(cmd);
  };

  // --- Buttons ---
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

  // --- Sliders ---
  const bindSlider = (sliderId, inputId, jsxFn) => {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
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

    // Realtime kéo slider
    slider.addEventListener("input", (e) => {
      input.value = slider.value;
      apply(slider.value, e.shiftKey);
    });

    // Khi thả slider hoặc blur input
    slider.addEventListener("change", (e) => apply(slider.value, e.shiftKey));
    input.addEventListener("change", (e) => apply(input.value, e.shiftKey));

    // Nhấn Enter trong input
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        slider.value = input.value;
        apply(input.value, e.shiftKey);
        input.blur();
      }
    });

    // Click vào slider track mà không kéo
    slider.addEventListener("mouseup", (e) => apply(slider.value, e.shiftKey));
    slider.addEventListener("touchend", (e) => apply(slider.value, e.shiftKey));

      input.addEventListener("input", () => {
        slider.value = input.value;
        apply(input.value, false);
      });

      // optional: ensure keyup cho phím ↑/↓ cũng update
      input.addEventListener("keyup", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          slider.value = input.value;
          apply(input.value, e.shiftKey);
        }
      });
  };

  // --- Bind all sliders ---
  bindSlider("ease-in-slider", "ease-in-input", "applyInfluenceIn");
  bindSlider("ease-out-slider", "ease-out-input", "applyInfluenceOut");
  bindSlider("both-slider", "both-input", "applyInfluenceBoth");

  // --- SPEED input ---
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

// Set Anchor and Null ///////////////////////////////////////////////////////
const parentBtn = document.querySelector('[aria-label="Parent"]');
  parentBtn.addEventListener("click", () => {
    cs.evalScript("parentSelectedLayersToLast()");
  });

const setAnchorBtn = document.querySelector('[aria-label="Set Anchor"]');
  setAnchorBtn.addEventListener("click", () => {
    cs.evalScript("quickSetAnchor()");
  });

const quickSetNullBtn = document.querySelector('[aria-label="Set Null"]');
  quickSetNullBtn.addEventListener("click", () => {
    cs.evalScript("quickSetNull()");
  });

// Sell ====
const modeDropdown = document.getElementById("mode-select");
const ignoreMaskCheckbox = document.querySelector('[aria-label="Ignore Mask"]');
const anchorButtons = document.querySelectorAll(".control-pad .button.large");

const labelToXY = {
  "Top Left": [0, 0],
  "Top Center": [0.5, 0],
  "Top Right": [1, 0],
  "Middle Left": [0, 0.5],
  "Center": [0.5, 0.5],
  "Middle Right": [1, 0.5],
  "Bottom Left": [0, 1],
  "Bottom Center": [0.5, 1],
  "Bottom Right": [1, 1]
};

anchorButtons.forEach(btn => {
  btn.addEventListener("click", (e) => {
    const shiftHeld = e.shiftKey;
    const label = btn.getAttribute("aria-label");
    const [xx, yy] = labelToXY[label] || [0.5, 0.5];

    const moveTypeIndex = modeDropdown.selectedIndex || 0;
    const ignoreMasks = ignoreMaskCheckbox.checked;

    if (!shiftHeld) {
      cs.evalScript(`findAndMoveAnchor(${xx}, ${yy}, 0, ${moveTypeIndex}, ${ignoreMasks}, true)`);
    } else {
      cs.evalScript(`findAndSetNull(${xx}, ${yy}, 0, ${moveTypeIndex}, ${ignoreMasks}, true)`);
    }
  });
});

}); // end DOMContentLoaded

// ── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, type, duration) {
  const t = document.getElementById("qtp-toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "show" + (type ? " " + type : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ""; }, duration || 3000);
}

// ── Settings persistence (localStorage) ──────────────────────────────────────
window.addEventListener("DOMContentLoaded", function initPersistence() {
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
});

// ── Scale to Fit + Smart Precomp + Sequence + Stats + F&R + Collect + Relink + Stagger ──
window.addEventListener("DOMContentLoaded", () => {
  const cs2 = new CSInterface();

  // ── Stagger Layers ──────────────────────────────────────────────────────────
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
      cs2.evalScript(`staggerLayers(${num}, ${step}, "${mode}")`);
    });
  });

  const alignTimeBtn = document.querySelector('[aria-label="Align Time"]');
  if (alignTimeBtn) {
    alignTimeBtn.addEventListener("click", () => {
      cs2.evalScript("alignLayersToCurrentTime()");
    });
  }

  const scaleFitBtn = document.querySelector('[aria-label="Scale Fit"]');
  if (scaleFitBtn) {
    scaleFitBtn.addEventListener("click", (e) => {
      const mode = e.altKey ? "fill" : e.shiftKey ? "cover" : "contain";
      cs2.evalScript(`scaleLayersToFit("${mode}")`);
    });
  }

  // ── Smart Precomp ───────────────────────────────────────────────────────────
  const smartPrecompBtn = document.querySelector('[aria-label="Smart Precomp"]');
  if (smartPrecompBtn) {
    smartPrecompBtn.addEventListener("click", () => {
      cs2.evalScript("smartPrecomp()", (res) => {
        if (res && res.startsWith("Precomposed:")) showToast(res, "ok");
      });
    });
  }

  // ── Sequence Layers ─────────────────────────────────────────────────────────
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
      cs2.evalScript(`sequenceLayers(${overlap}, ${rev})`);
      seqOverlay.style.display = "none";
      showToast("Layers sequenced", "ok");
    };
  }

  // ── Project Stats ───────────────────────────────────────────────────────────
  const statsBtn = document.querySelector('[aria-label="Stats"]');
  if (statsBtn) {
    const statsOverlay  = document.getElementById("stats-overlay");
    const statsContent  = document.getElementById("stats-content");
    const statsCloseBtn = document.getElementById("stats-close-btn");

    statsCloseBtn.onclick = () => { statsOverlay.style.display = "none"; };

    statsBtn.addEventListener("click", () => {
      statsContent.innerHTML = "<div class='stats-label' style='color:#666;grid-column:1/-1'>Loading...</div>";
      statsOverlay.style.display = "flex";

      cs2.evalScript("getProjectStats()", (json) => {
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

  // ── Find & Replace Expressions ──────────────────────────────────────────────
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
      cs2.evalScript(`findReplaceExpressions(${JSON.stringify(find)}, ${JSON.stringify(replace)})`, (json) => {
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

  // ── Collect custom folder ───────────────────────────────────────────────────
  const folderBtn   = document.getElementById("collect-folder-btn");
  const folderLabel = document.getElementById("collect-folder-label");
  if (folderBtn) {
    let customFolder = "";

    folderBtn.addEventListener("click", () => {
      const { execSync: execSyncCF } = cep_node['require']('child_process');
      const fsCF   = cep_node['require']('fs');
      const osCF   = cep_node['require']('os');
      const pathCF = cep_node['require']('path');

      const tmpFile   = pathCF.join(osCF.tmpdir(), 'qtp_cf_' + Date.now() + '.txt');
      const tmpFilePS = tmpFile.replace(/\\/g, '/');
      const psLines = [
        'Add-Type -AssemblyName System.Windows.Forms',
        '[System.Windows.Forms.Application]::EnableVisualStyles()',
        '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
        "$d.Description = 'Choose output folder for collected footage'",
        '$d.UseDescriptionForTitle = $true',
        '$d.ShowNewFolderButton = $true',
        `$_out = '${tmpFilePS}'`,
        '$_r = $d.ShowDialog()',
        'if ($_r -eq [System.Windows.Forms.DialogResult]::OK) { [IO.File]::WriteAllText($_out, $d.SelectedPath, [Text.Encoding]::UTF8) } else { [IO.File]::WriteAllText($_out, [string]::Empty, [Text.Encoding]::UTF8) }'
      ].join('; ');
      const encoded = Buffer.from(psLines, 'utf16le').toString('base64');
      try {
        execSyncCF(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 60000 });
        if (fsCF.existsSync(tmpFile)) {
          const chosen = fsCF.readFileSync(tmpFile, 'utf8').trim();
          try { fsCF.unlinkSync(tmpFile); } catch(e) {}
          if (chosen) {
            customFolder = chosen;
            const short = chosen.length > 34 ? "..." + chosen.slice(-31) : chosen;
            folderLabel.textContent = short;
            folderLabel.title = chosen;
          }
        }
      } catch(e) {
        try { if (fsCF.existsSync(tmpFile)) fsCF.unlinkSync(tmpFile); } catch(e2) {}
      }
    });

    // Store getter so collect handler can read it
    const startBtn = document.getElementById("collect-start-btn");
    if (startBtn) startBtn._getCustomFolder = () => customFolder;
  }

  // ── Relink with toast feedback ──────────────────────────────────────────────
  // The relink handler in DOMContentLoaded calls cs.evalScript(relinkMissingFootage(...))
  // without a callback. We patch it by adding a second listener that temporarily
  // wraps cs.evalScript to intercept the relinkMissingFootage call.
  const relinkBtn2 = document.querySelector('[aria-label="Relink"]');
  if (relinkBtn2) {
    relinkBtn2.addEventListener("click", () => {
      const _orig = cs2.evalScript.bind(cs2);
      cs2.evalScript = function(script, cb) {
        if (script && script.indexOf('relinkMissingFootage(') === 0) {
          _orig(script, (json) => {
            cs2.evalScript = _orig;
            if (cb) cb(json);
            if (!json) return;
            try {
              const r = JSON.parse(json);
              if (r.relinked !== undefined) {
                const extra = r.notFound.length ? ` (${r.notFound.length + r.notFoundMore} not found)` : "";
                showToast(`Relinked ${r.relinked} / ${r.total}${extra}`, r.notFound.length > 0 ? "warn" : "ok", 5000);
              }
            } catch(e) {}
          });
        } else {
          _orig(script, cb);
        }
      };
    });
  }

  // ── Patch collect start to pass custom folder ───────────────────────────────
  // We need to inject customFolder into the buildCollectManifest call.
  // The existing handler calls: cs.evalScript(`buildCollectManifest(${isMove})`, ...)
  // We patch it here after the original listener is added.
  const collectStartBtn = document.getElementById("collect-start-btn");
  if (collectStartBtn) {
    collectStartBtn.addEventListener("click", function patchCollect() {
      // Remove this one-shot patch listener to avoid double-firing
      collectStartBtn.removeEventListener("click", patchCollect);
      // Store the custom folder getter reference so existing handler can pick it up
      // (the existing handler reads collectStartBtn._getCustomFolder)
    }, true); // capture phase so it runs before bubble
  }
});

