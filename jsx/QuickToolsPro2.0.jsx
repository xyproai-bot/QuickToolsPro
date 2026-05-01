// Ham Offset ////////////////////////////////////////////////////
function offsetLayerAndKey(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : 
              new Window("palette", "Offset", undefined, {resizeable:true});
    
    var grpMain = win.add("group");
    grpMain.orientation = "row";
    grpMain.alignChildren = ["left", "top"];


    // --- Setting Panel ---
    var grpSetting = grpMain.add("panel", undefined, "Setting");
    grpSetting.orientation = "column";
    grpSetting.alignChildren = ["left", "top"];
    grpSetting.margins = 5;
    grpSetting.spacing = 4;

    // Value input
    var grpValue = grpSetting.add("group");
    grpValue.margins = 4;
    grpValue.add("statictext", undefined, "Frames:");
    
    var etValue = grpValue.add("edittext", undefined, "0");
    etValue.characters = 5;
    var offsetDown = grpValue.add("button", undefined, "-");
    var offsetUp = grpValue.add("button", undefined, "+");
    offsetDown.size = [15,15];
    offsetUp.size = [15,15];


    offsetUp.onClick = function() {
        etValue.text = String(parseInt(etValue.text || "0", 10) + 1);
    };
    offsetDown.onClick = function() {
        etValue.text = String(parseInt(etValue.text || "0", 10) - 1);
    };
    

    // Radio 
    var groupB = grpSetting.add("group", undefined, "");
    groupB.orientation = "row";
    groupB.alignChildren = ["left", "top"];
    groupB.margins = 5;
    groupB.spacing = 8;

    var groupA = groupB.add("group", undefined, "");
    groupA.orientation = "column";
    groupA.alignChildren = ["left", "top"];
    groupA.margins = 5;
    groupA.spacing = 8;

    var rbOffset = groupA.add("radiobutton", undefined, "Offset");
    var rbSequence = groupA.add("radiobutton", undefined, "Sequence");
    var rbTrimStart = groupA.add("radiobutton", undefined, "Trim Start");
    var rbTrimEnd = groupA.add("radiobutton", undefined, "Trim End");
    rbOffset.value = true;

    var groupC = groupB.add("group", undefined, "");
    groupC.orientation = "column";
    groupC.alignChildren = ["left", "top"];
    groupC.margins = 5;
    groupC.spacing = 8;

    var layerGroup = groupC.add("checkbox", undefined, "GroupLayer");
    var quickTrimBtn = groupC.add("button", undefined, "QuickTrim");
    quickTrimBtn.helpTip = "Click = Trim in/out keys. \nShift+Click = Trim In. \nAlt+Click = Trim Out";

    // --- Method Panel  ---
    var grpMethod = grpMain.add("panel", undefined, "Method");
    grpMethod.orientation = "column";
    grpMethod.alignChildren = ["center", "top"];
    grpMethod.margins = 4;
    grpMethod.spacing = 4;


    var grpMethod2 = grpMethod.add("group", undefined, "");
    grpMethod2.orientation = "row";
    grpMethod2.margins = 8;
    grpMethod2.spacing = 8;

    var layerCheckbox = grpMethod2.add("radiobutton", undefined, "Layers");
    layerCheckbox.value = true;
    var keyCheckbox = grpMethod2.add("radiobutton", undefined, "Keys");

    function updateSettingState() {
        if (layerCheckbox.value) {
            rbOffset.enabled = true;
            rbSequence.enabled = true;
            rbTrimStart.enabled = true;
            rbTrimEnd.enabled = true;
            layerGroup.enabled = false;
        } else {
            rbOffset.enabled = true;
            rbSequence.enabled = true;
            layerGroup.enabled = true;
            rbTrimStart.enabled = false;
            rbTrimEnd.enabled = false;
        }
    }


    layerCheckbox.onClick = updateSettingState;
    keyCheckbox.onClick = updateSettingState;


    updateSettingState();

    var grpMethod3 = grpMethod.add("group", undefined, "");
    grpMethod3.orientation = "column";
    grpMethod3.margins = 8;
    grpMethod3.spacing = 8;

    var btnTopDown = grpMethod3.add("button", undefined, "Top - Down");
    var btnBottomUp = grpMethod3.add("button", undefined, "Bottom - Up");
    var btnRandom = grpMethod3.add("button", undefined, "Random");
    btnTopDown.size = [90,30];
    btnBottomUp.size = [90,30];
    btnRandom.size = [90,30];
  

    // ========== Helpers ==========
    function getOrderedLayers(comp, method) {
        var layers = comp.selectedLayers.slice();
        if (layers.length < 1) return [];
        if (method === "bottomup") {
            layers.reverse();
        } else if (method === "random") {
            for (var i = layers.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = layers[i];
                layers[i] = layers[j];
                layers[j] = temp;
            }
        }
        return layers;
    }

    function moveLayerBlockTo(layer, targetTime) {
        var delta = targetTime - layer.inPoint;
        layer.startTime += delta;
    }

    // ========== Core ==========
    function runAction(method) {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;

        var value = parseInt(etValue.text, 10);
        if (isNaN(value)) value = 0;

        var setting = rbOffset.value ? "offset" : 
                      (rbTrimStart.value ? "trimstart" : 
                      (rbTrimEnd.value ? "trimend" : "sequence"));
        var layers = getOrderedLayers(comp, method);
        if (layers.length < 1) return;

        app.beginUndoGroup("Offset/Trim/Sequence");

        var playhead = comp.time;
        var frameDur = comp.frameDuration;
        var offsetSecs = value * frameDur;
        var minDuration = frameDur;

        if (setting === "offset") {
            // Move all to playhead
            for (var i = 0; i < layers.length; i++) {
                moveLayerBlockTo(layers[i], playhead);
            }
            // Apply offsets
            for (var i = 0; i < layers.length; i++) {
                layers[i].startTime += i * offsetSecs;
            }

        } else if (setting === "sequence") {
            var currentTime = playhead;
            for (var i = 0; i < layers.length; i++) {
                moveLayerBlockTo(layers[i], currentTime);
                currentTime = layers[i].outPoint + offsetSecs;
            }

        } else if (setting === "trimstart") {
            for (var i = 0; i < layers.length; i++) {
                var candidateIn = playhead + i * offsetSecs;
                var originalOut = layers[i].outPoint;
                if (candidateIn < originalOut - minDuration) {
                    layers[i].inPoint = candidateIn;
                    layers[i].outPoint = originalOut; 
                }
            }

        } else if (setting === "trimend") {
            for (var i = 0; i < layers.length; i++) {
                var candidateOut = playhead + i * offsetSecs;
                var minAllowedOut = layers[i].inPoint + minDuration;
                if (candidateOut > minAllowedOut) {
                    layers[i].outPoint = candidateOut;
                }
            }
        }

        app.endUndoGroup();
    }

function runActionKeys(method) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return;

    var value = parseInt(etValue.text, 10);
    if (isNaN(value)) value = 0;

    var setting = rbOffset.value ? "offset" : "sequence";
    var frameDur = comp.frameDuration;
    var offsetSecs = value * frameDur;
    var useLayerGroup = layerGroup.value;

    // Collect group keyframe
    var groups = [];
    var selLayers = comp.selectedLayers || [];

    for (var li = 0; li < selLayers.length; li++) {
        var layer = selLayers[li];

        if (useLayerGroup) {

            var allProps = [];
            function collectProps(p) {
                if (!p) return;
                if (p.numProperties && p instanceof PropertyGroup) {
                    for (var i = 1; i <= p.numProperties; i++) collectProps(p.property(i));
                } else if (p instanceof Property && p.numKeys > 0) {
                    var selIdx = [];
                    for (var k = 1; k <= p.numKeys; k++) if (p.keySelected(k)) selIdx.push(k);
                    if (selIdx.length > 0) allProps.push({ prop: p, keyIndices: selIdx });
                }
            }
            for (var i = 1; i <= layer.numProperties; i++) collectProps(layer.property(i));
            if (allProps.length > 0) groups.push({ layer: layer, props: allProps });
        } else {

            function collectPropsIndividually(p) {
                if (!p) return;
                if (p.numProperties && p instanceof PropertyGroup) {
                    for (var i = 1; i <= p.numProperties; i++) collectPropsIndividually(p.property(i));
                } else if (p instanceof Property && p.numKeys > 0) {
                    var selIdx = [];
                    for (var k = 1; k <= p.numKeys; k++) if (p.keySelected(k)) selIdx.push(k);
                    if (selIdx.length > 0) groups.push({ layer: layer, props: [{ prop: p, keyIndices: selIdx }] });
                }
            }
            for (var i = 1; i <= layer.numProperties; i++) collectPropsIndividually(layer.property(i));
        }
    }

    if (groups.length < 1) return;


    if (method === "bottomup") groups.reverse();
    else if (method === "random") {
        for (var r = groups.length - 1; r > 0; r--) {
            var j = Math.floor(Math.random() * (r + 1));
            var tmp = groups[r]; groups[r] = groups[j]; groups[j] = tmp;
        }
    }

    app.beginUndoGroup("Offset/Sequence Keys (Direct Move)");

    var playhead = comp.time;
    var currentTime = playhead;
    var allNewKeys = [];

    for (var gi = 0; gi < groups.length; gi++) {
        var group = groups[gi];
        var groupEarliest = Infinity; 


        for (var pi = 0; pi < group.props.length; pi++) {
            var pObj = group.props[pi];
            groupEarliest = Math.min(groupEarliest, pObj.prop.keyTime(pObj.keyIndices[0]));
        }

        var delta = 0;
        if (setting === "offset" || setting === "sequence") {
            if (useLayerGroup) {
                delta = currentTime - groupEarliest; 
            } else {
                delta = currentTime - groupEarliest; 
            }
        }

        for (var pi = 0; pi < group.props.length; pi++) {
            var pObj = group.props[pi];

            // snapshot key
            var keyData = [];
            for (var i = 0; i < pObj.keyIndices.length; i++) {
                var k = pObj.keyIndices[i];
                keyData.push({
                    time: pObj.prop.keyTime(k),
                    value: pObj.prop.keyValue(k),
                    inType: pObj.prop.keyInInterpolationType(k),
                    outType: pObj.prop.keyOutInterpolationType(k),
                    easeIn: pObj.prop.keyInTemporalEase(k),
                    easeOut: pObj.prop.keyOutTemporalEase(k)
                });
            }

         
            for (var i = pObj.keyIndices.length - 1; i >= 0; i--) pObj.prop.removeKey(pObj.keyIndices[i]);

            
            var newIndices = [];
            for (var i = 0; i < keyData.length; i++) {
                var k = keyData[i];
                var newIdx = pObj.prop.addKey(k.time + delta);
                pObj.prop.setValueAtKey(newIdx, k.value);
                pObj.prop.setTemporalEaseAtKey(newIdx, k.easeIn, k.easeOut);
                pObj.prop.setInterpolationTypeAtKey(newIdx, k.inType, k.outType);
                newIndices.push(newIdx);
                allNewKeys.push({ prop: pObj.prop, index: newIdx });
            }
        }

        
        if (setting === "offset") {
            currentTime += offsetSecs;
        } else if (setting === "sequence") {
            if (useLayerGroup) {

                var layerLatest = -Infinity;
                for (var pi2 = 0; pi2 < group.props.length; pi2++) {
                    var p = group.props[pi2].prop;
                    for (var k = 1; k <= p.numKeys; k++) layerLatest = Math.max(layerLatest, p.keyTime(k));
                }
                currentTime = layerLatest + offsetSecs;
            } else {

                var lastTime = -Infinity;
                for (var pi2 = 0; pi2 < group.props.length; pi2++) {
                    var p = group.props[pi2].prop;
                    for (var k = 1; k <= p.numKeys; k++) lastTime = Math.max(lastTime, p.keyTime(k));
                }
                currentTime = lastTime + offsetSecs;
            }
        }
    }


    for (var i = 0; i < allNewKeys.length; i++) {
        allNewKeys[i].prop.setSelectedAtKey(allNewKeys[i].index, true);
    }

    app.endUndoGroup();
}


// ========== QuickTrim ==========
function quickTrimLayers() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Composition not Active.");
        return;
    }

    var layers = comp.selectedLayers;
    if (layers.length < 1) {
        alert("Please select at least one layer.");
        return;
    }

    // Modifier keys
    var ks = ScriptUI.environment.keyboardState;
    var trimInOnly = ks.shiftKey; // Shift → Trim In
    var trimOutOnly = ks.altKey;  // Alt → Trim Out

    app.beginUndoGroup("Quick Trim");

    for (var i = 0; i < layers.length; i++) {
        var lyr = layers[i];
        var firstKey = Number.POSITIVE_INFINITY;
        var lastKey = Number.NEGATIVE_INFINITY;
        var totalKeys = 0;

        function scanProp(prop) {
            if (!prop) return;
            try {
                if (prop.numProperties > 0) {
                    for (var j = 1; j <= prop.numProperties; j++) {
                        scanProp(prop.property(j));
                    }
                }
                if (prop.numKeys && prop.numKeys > 0) {
                    totalKeys += prop.numKeys;
                    var t1 = prop.keyTime(1);
                    var t2 = prop.keyTime(prop.numKeys);
                    if (t1 < firstKey) firstKey = t1;
                    if (t2 > lastKey) lastKey = t2;
                }
            } catch (e) {}
        }

        for (var p = 1; p <= lyr.numProperties; p++) {
            scanProp(lyr.property(p));
        }

        if (totalKeys > 0) {
            if (trimInOnly) {
                // Chỉ Trim In
                lyr.inPoint = firstKey;
            } else if (trimOutOnly) {
                // Chỉ Trim Out
                lyr.outPoint = lastKey;
            } else {
                // Không giữ phím → Trim cả In và Out
                lyr.inPoint = firstKey;
                lyr.outPoint = lastKey;
            }
        }
    }

    app.endUndoGroup();
}


   function runWithMode(method) {
        if (layerCheckbox.value) {
            runAction(method);
        } else {
            runActionKeys(method); 
        }
    }

    btnTopDown.onClick = function() { runWithMode("topdown"); };
    btnBottomUp.onClick = function() { runWithMode("bottomup"); };
    btnRandom.onClick = function() { runWithMode("random"); };
    quickTrimBtn.onClick = function() { quickTrimLayers();}

    if (win instanceof Window) {
        win.center();
        win.show();
    }
}

// Hàm Rename //////////////////////////////////////////
function showRenameWindow() {
    var floatWin = new Window("palette", "Rename Tool", undefined, {closeButton:true});
    floatWin.orientation = "column";
    floatWin.alignChildren = ["fill","top"];
    floatWin.spacing = 2;
    floatWin.margins = 6;

    // --- Main Controls Row ---
    var mainGroup = floatWin.add("group");
    mainGroup.orientation = "row";
    mainGroup.alignChildren = ["fill","center"];
    mainGroup.margins = 4;

    // Name group
    var nameGroup = mainGroup.add("group");
    nameGroup.orientation = "column";
    nameGroup.alignChildren = ["fill","center"];
    nameGroup.margins = 2;
    nameGroup.spacing = 3;

    nameGroup.add("statictext", undefined, "Name:");
    var nameInput = nameGroup.add("edittext", undefined, "");
    nameInput.characters = 12;

    // Separator group
    var sepGroup = mainGroup.add("group");
    sepGroup.orientation = "column";
    sepGroup.alignChildren = ["fill","center"];
    sepGroup.spacing = 0;
    sepGroup,margins = 0;
 
    sepGroup.add("statictext", undefined, "Separator:");
    var sepBtnsGroup = sepGroup.add("group");
    sepBtnsGroup.orientation = "row";
    sepBtnsGroup.alignChildren = ["left","center"];
    sepBtnsGroup.margins = 4;
    sepBtnsGroup.spacing = 8;
    sepBtnsGroup.preferredSize = [10, 10];

    var sepButtons = [];
    var sepValues = [" - ", " | ", "_"];
    for (var i = 0; i < sepValues.length; i++) {
        var b = sepBtnsGroup.add("button", undefined, sepValues[i]);
        b.preferredSize = [28, 24];
        sepButtons.push(b);
    }
    var selectedSep = "";

    function updateSep(sel) {
        selectedSep = sel;
        updateReview();
    }
    for (var j = 0; j < sepButtons.length; j++) {
        (function(index) {
            sepButtons[index].onClick = function() {
                updateSep(sepValues[index]);
            };
        })(j);
    }

    // Num group
    var numGroup = mainGroup.add("group");
    numGroup.orientation = "column";
    numGroup.alignChildren = ["fill","center"];
    numGroup.margins = 2;
    numGroup.spacing = 3;

    numGroup.add("statictext", undefined, "Num:");
    var numInput = numGroup.add("edittext", undefined, "00");
    numInput.characters = 4;

    // --- Review + Apply Row ---
    var reviewGroup = floatWin.add("group");
    reviewGroup.orientation = "row";
    reviewGroup.alignChildren = ["fill","center"];
    reviewGroup.margins = 4;


    var reviewInput = reviewGroup.add("edittext", undefined, "");
    reviewInput.characters = 18;
    reviewInput.enabled = false;
    reviewInput.margins = 2;
    reviewInput.spacing = 2;

    var applyBtn = reviewGroup.add("button", undefined, "Apply");
    applyBtn.size = [35, 28];
    applyBtn.margins = 2;
    applyBtn.spacing = 2;

    // --- Update Review ---
    function updateReview() {
        var nameVal = nameInput.text;
        var numVal = numInput.text;
        reviewInput.text = nameVal + selectedSep + numVal;
    }

    nameInput.onChanging = updateReview;
    numInput.onChanging = function() {
        var val = numInput.text;
        if (!/^-?\d*\.?\d*$/.test(val)) {
            numInput.text = val.replace(/[^0-9\.\-]/g, "");
        }
        updateReview();
    };

    // --- Apply Logic ---
    applyBtn.onClick = function() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        if (comp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        var nameVal = nameInput.text;
        var sepVal = selectedSep;
        var numStr = numInput.text;

        if (numStr === "" || isNaN(numStr)) {
            alert("Num must be a number.");
            return;
        }

        var numParts = numStr.split(".");
        var intPart = numParts[0];
        var decPart = numParts.length > 1 ? numParts[1] : "";
        var intPad = intPart.length;
        var decPad = decPart.length;

        var numVal = parseFloat(numStr);

        app.beginUndoGroup("Rename Layers");

        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var currentNum = numVal;
            if (decPad > 0) {
                currentNum = (numVal + (i * Math.pow(10, -decPad))).toFixed(decPad);
            } else {
                currentNum = (numVal + i).toString();
            }

            var parts = currentNum.split(".");
            var curInt = parts[0];
            var curDec = parts.length > 1 ? parts[1] : "";

            while (curInt.length < intPad) curInt = "0" + curInt;
            while (curDec.length < decPad) curDec = curDec + "0";

            var finalNum = curInt;
            if (decPad > 0) finalNum += "." + curDec;

            comp.selectedLayers[i].name = nameVal + sepVal + finalNum;
        }

        app.endUndoGroup();
    };

    // init
    updateReview();
    floatWin.center();
    floatWin.show();
}

// Hàm Add expression //////////////////////////////////////////////
function openAddExpressionWindow() {
    // --- Đường dẫn file preset ---
    var scriptPath = new File($.fileName).parent.fsName;
    var presetFile = new File(scriptPath + "/ae_expression_presets.json");
    var backupFile = new File(scriptPath + "/ae_expression_presets_backup.json");

    function loadPresets() {

        var defaultPresets = [
            { name: "Wiggle (2,30)", code: "wiggle(2,30)" },
            { name: "Loop Out (cycle)", code: "loopOut(\"cycle\")" },
            { name: "Time ×100", code: "time*100" }
        ];

        // Thử đọc file chính
        if (presetFile.exists) {
            try {
                presetFile.open("r");
                var content = presetFile.read();
                presetFile.close();
                var data = JSON.parse(content);
                if (data && data.constructor === Array) {
                    $.writeln("Loaded " + data.length + " presets from main file: " + presetFile.fsName);
                    return data;
                } else {
                    $.writeln("Invalid JSON format in main file: not an array.");
                }
            } catch (e) {
                $.writeln("Error loading main presets file: " + e.toString());
            }
        }

        // Nếu file chính không hợp lệ, thử file sao lưu
        if (backupFile.exists) {
            try {
                backupFile.open("r");
                var content = backupFile.read();
                backupFile.close();
                var data = JSON.parse(content);
                if (Array.isArray(data)) {
                    // Khôi phục file chính từ file sao lưu
                    presetFile.open("w");
                    presetFile.write(JSON.stringify(data, null, 2));
                    presetFile.close();
                    $.writeln("Loaded " + data.length + " presets from backup file: " + backupFile.fsName + ". Restored main file.");
                    alert("Presets loaded from backup. Main JSON file was invalid and has been restored.");
                    return data;
                } else {
                    $.writeln("Invalid JSON format in backup file: not an array.");
                }
            } catch (e) {
                $.writeln("Error loading backup presets file: " + e.toString());
            }
        }

        // Nếu cả file chính và sao lưu đều không hợp lệ, trả về mặc định và cảnh báo
        $.writeln("No valid preset file found. Using default presets.");
        alert("No valid preset file found (main or backup). Using default presets. Check your Documents folder for JSON files and restore manually if needed.");
        return defaultPresets;
    }

    function savePresets(list) {
        try {
            // Tạo bản sao lưu nếu file chính đã tồn tại
            if (presetFile.exists) {
                try {
                    presetFile.open("r");
                    var content = presetFile.read();
                    presetFile.close();
                    backupFile.open("w");
                    backupFile.write(content);
                    backupFile.close();
                    $.writeln("Backup created at: " + backupFile.fsName);
                } catch (e) {
                    $.writeln("Error creating backup: " + e.toString());
                    alert("Error creating backup JSON file: " + e.toString() + ". Presets may not be safe.");
                }
            }
            // Ghi vào file chính
            presetFile.open("w");
            presetFile.write(JSON.stringify(list, null, 2));
            presetFile.close();
            $.writeln("Saved " + list.length + " presets to: " + presetFile.fsName);
        } catch (e) {
            $.writeln("Error saving presets: " + e.toString());
            alert("Error saving presets to JSON: " + e.toString() + ". Your changes may not be saved.");
        }
    }

    // --- Load presets ---
    var presets = loadPresets();

    var exprWin = new Window("palette", "Add Expression", undefined, {resizable:true});
    exprWin.orientation = "column";
    exprWin.alignChildren = ["fill","top"];
    exprWin.spacing = 8;
    exprWin.margins = 12;

    // Toggle chọn source
    var toggleGroup = exprWin.add("group");
    toggleGroup.orientation = "row";
    toggleGroup.alignChildren = ["left","center"];
    toggleGroup.spacing = 15;
    toggleGroup.add("statictext", undefined, "Source:");
    var useSelected = toggleGroup.add("radiobutton", undefined, "Selected");
    useSelected.helpTip = "Add expression on selected properties";
    var useCustom   = toggleGroup.add("radiobutton", undefined, "From List");
    useCustom.helpTip = "Quick Add expression on choose properties";
    useCustom.value = true;

    // Panel chọn properties
    var propPanel = exprWin.add("panel", undefined, "Choose Properties");
    propPanel.orientation = "row"; 
    propPanel.alignChildren = ["left","center"];
    propPanel.margins = 10;
    propPanel.spacing = 15;
    var chkPosition = propPanel.add("checkbox", undefined, "Position");
    var chkScale    = propPanel.add("checkbox", undefined, "Scale");
    var chkRotation = propPanel.add("checkbox", undefined, "Rotation");
    var chkOpacity  = propPanel.add("checkbox", undefined, "Opacity");
    
    // Dropdown preset
    var presetGroup = exprWin.add("group");
    presetGroup.orientation = "row";
    presetGroup.alignChildren = ["fill","center"];
    presetGroup.spacing = 6;

   if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {
        var T, A, k;
        if (this == null) {
            throw new TypeError("this is null or not defined");
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function");
        }
        if (arguments.length > 1) {
            T = thisArg;
        }
        A = new Array(len);
        k = 0;
        while (k < len) {
            var kValue, mappedValue;
            if (k in O) {
                kValue = O[k];
                mappedValue = callback.call(T, kValue, k, O);
                A[k] = mappedValue;
            }
            k++;
        }
        return A;
    };
}

    var presetDropdown;
    try {
        presetDropdown = presetGroup.add(
            "dropdownlist",
            undefined,
            ["-- Select Preset --"].concat(presets.map(function(p){return p.name;}))
        );
    } catch (e) {
        alert("Error loading presets into dropdown: " + e.toString() + ". Presets may contain invalid data.");
        presetDropdown = presetGroup.add("dropdownlist", undefined, ["-- Select Preset --"]);
    }
    presetDropdown.preferredSize.width = 200;
    presetDropdown.selection = 0; // mặc định chọn "-- Select Preset --"

    var saveBtn  = presetGroup.add("button", undefined, "Save Current");
    var delBtn   = presetGroup.add("button", undefined, "Delete");

    // Ô nhập expression
    var exprInput = exprWin.add("edittext", undefined, "", {multiline:true});
    exprInput.preferredSize = [300,120]; 
    var _internalUpdate = false;

    // --- Preset logic ---
    presetDropdown.onChange = function() {
        var sel = presetDropdown.selection;
        if (sel && sel.index > 0) { // >0 mới là preset thật
            exprInput.text = presets[sel.index - 1].code;
        }
        // Không xóa text nếu index <=0 hoặc null, để giữ nguyên khi chỉnh sửa
    };

    // ---- Khi người dùng gõ/xóa trong ô expression, reset selection về 0 (không null)
    exprInput.onChanging = function() {
        if (_internalUpdate) return; 
        if (presetDropdown.selection !== null && presetDropdown.selection.index !== 0) {
            presetDropdown.selection = 0; // Reset về "-- Select Preset --" nhưng giữ text
        }
    };

    saveBtn.onClick = function() {
        var text = exprInput.text;
        if (!text) { alert("Expression is empty."); return; }
        var name = prompt("Enter a name for this preset:", "New Preset");
        if (name) {
            presets.push({ name: name, code: text });
            savePresets(presets);
            presetDropdown.add("item", name);
            presetDropdown.selection = presetDropdown.items[presetDropdown.items.length-1];
        }
    };

    delBtn.onClick = function() {
        var sel = presetDropdown.selection;
        if (sel && sel.index > 0) { // >0 mới là preset thật
            var presetIndex = sel.index - 1; // map index dropdown -> index presets
            if (confirm("Delete preset \"" + presets[presetIndex].name + "\"?")) {
                presets.splice(presetIndex, 1);
                savePresets(presets);

                // Xoá đúng item trong dropdown
                presetDropdown.remove(sel.index);

                // Reset selection về "-- Select Preset --"
                if (presetDropdown.items.length > 0) {
                    presetDropdown.selection = 0;
                }
                exprInput.text = "";
            }
        }
    };

    // Nhóm nút Run + Clear
    var btnGroup = exprWin.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignChildren = ["fill","center"];
    btnGroup.spacing = 10;
    var runBtn   = btnGroup.add("button", undefined, "Run");
    var clearBtn = btnGroup.add("button", undefined, "Clear");
    clearBtn.helpTip = "Remove expression on selected properties. Shift to remove all expression on selected layers";

    // --- Logic Run ---
    runBtn.onClick = function() {
        app.beginUndoGroup("Add Expression Tool");

        var exprText = exprInput.text;
        if (!exprText) exprText = "";

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        if (useSelected.value) {
            var selectedProps = comp.selectedProperties;
            if (selectedProps.length === 0) {
                alert("No properties selected.");
            } else {
                for (var i = 0; i < selectedProps.length; i++) {
                    try { selectedProps[i].expression = exprText; } catch (e) {}
                }
            }
        } else {
            for (var l = 0; l < selectedLayers.length; l++) {
                var layer = selectedLayers[l];
                try {
                    if (chkPosition.value) layer.transform.position.expression = exprText;
                    if (chkScale.value)    layer.transform.scale.expression = exprText;
                    if (chkRotation.value) layer.transform.rotation.expression = exprText;
                    if (chkOpacity.value)  layer.transform.opacity.expression = exprText;
                } catch (err) {}
            }
        }

        app.endUndoGroup();
    };

    // --- Logic Clear ---
    clearBtn.onClick = function() {
        app.beginUndoGroup("Clear Expressions");

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        var shiftHeld = ScriptUI.environment.keyboardState.shiftKey;

        if (shiftHeld) {
            for (var l = 0; l < selectedLayers.length; l++) {
                var layer = selectedLayers[l];
                function clearProps(propGroup) {
                    for (var i = 1; i <= propGroup.numProperties; i++) {
                        var p = propGroup.property(i);
                        if (p.propertyType === PropertyType.PROPERTY) {
                            if (p.canSetExpression) {
                                try { p.expression = ""; } catch(e) {}
                            }
                        } else {
                            clearProps(p);
                        }
                    }
                }
                clearProps(layer);
            }
        } else {
            if (useSelected.value) {
                var selectedProps = comp.selectedProperties;
                if (selectedProps.length === 0) {
                    alert("No properties selected.");
                } else {
                    for (var i = 0; i < selectedProps.length; i++) {
                        try { selectedProps[i].expression = ""; } catch (e) {}
                    }
                }
            } else {
                for (var l = 0; l < selectedLayers.length; l++) {
                    var layer = selectedLayers[l];
                    try {
                        if (chkPosition.value) layer.transform.position.expression = "";
                        if (chkScale.value)    layer.transform.scale.expression = "";
                        if (chkRotation.value) layer.transform.rotation.expression = "";
                        if (chkOpacity.value)  layer.transform.opacity.expression = "";
                    } catch (err) {}
                }
            }
        }

        app.endUndoGroup();
    };

    exprWin.center();
    exprWin.show();
}

///// Hàm copy và paste Ease ////////////////////////////////////
var easeBuffer = null;

function copyEase() {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return;

    // --- Lọc property ---
    var selProps = comp.selectedProperties;
    if (!selProps || selProps.length === 0) {
        alert("Please select at least one keyframe to copy ease.");
        return;
    }

    var keyProps = [];
    for (var i = 0; i < selProps.length; i++) {
        var p = selProps[i];
        if (p instanceof Property && p.isTimeVarying && p.selectedKeys.length > 0) {
            keyProps.push(p);
        }
    }

    if (keyProps.length === 0) {
        alert("Please select at least one keyframed property.");
        return;
    }

    var baseProp = keyProps[0];
    for (var i = 1; i < keyProps.length; i++) {
        if (keyProps[i] !== baseProp) {
            alert("Please select keyframes from only one property.");
            return;
        }
    }

    var p = baseProp;
    var keys = p.selectedKeys;
    if (!keys || keys.length === 0) return;

    app.beginUndoGroup("Copy Ease");

    var keyDatas = [];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var inArr = p.keyInTemporalEase(k);
        var outArr = p.keyOutTemporalEase(k);

        var status = "middle";
        if (p.numKeys === 1) status = "single";
        else if (k === 1) status = "first";
        else if (k === p.numKeys) status = "last";

        var inSpeed = [], inInfluence = [];
        for (var d = 0; d < inArr.length; d++) {
            inSpeed.push(inArr[d].speed);
            inInfluence.push(inArr[d].influence);
        }

        var outSpeed = [], outInfluence = [];
        for (var d = 0; d < outArr.length; d++) {
            outSpeed.push(outArr[d].speed);
            outInfluence.push(outArr[d].influence);
        }

        keyDatas.push({
            inSpeed: inSpeed,
            outSpeed: outSpeed,
            inInfluence: inInfluence,
            outInfluence: outInfluence,
            status: status
        });
    }

    easeBuffer = { keys: keyDatas, keyCount: keyDatas.length };

    app.endUndoGroup();
}


// helper: apply per-dimension arrays to target KeyframeEase array
function applyPerDim(targetArr, sourceSpeeds, sourceInfluences) {
    if (!sourceSpeeds) sourceSpeeds = [];
    if (!sourceInfluences) sourceInfluences = [];

    var lastSpeed = sourceSpeeds.length > 0 ? sourceSpeeds[sourceSpeeds.length - 1] : 0;
    var lastInflu = sourceInfluences.length > 0 ? sourceInfluences[sourceInfluences.length - 1] : 33.333;

    for (var d = 0; d < targetArr.length; d++) {
        var s = (d < sourceSpeeds.length) ? sourceSpeeds[d] : lastSpeed;
        var inf = (d < sourceInfluences.length) ? sourceInfluences[d] : lastInflu;
        targetArr[d].speed = s;
        targetArr[d].influence = inf;
    }
}

// --------- APPLY ----------
function copySpeed(p, k, copiedData) {
    if (!copiedData) return;

    var inArr = p.keyInTemporalEase(k);
    var outArr = p.keyOutTemporalEase(k);

    var status = copiedData.status;

    if (status === "middle") {
        applyPerDim(inArr, copiedData.inSpeed, copiedData.inInfluence);
        applyPerDim(outArr, copiedData.outSpeed, copiedData.outInfluence);
    }
    else if (status === "first") {
        if (k === 1) {
            applyPerDim(outArr, copiedData.outSpeed, copiedData.outInfluence);
        } else if (k === p.numKeys) {
            applyPerDim(inArr, copiedData.outSpeed, copiedData.outInfluence);
        } else {
            applyPerDim(outArr, copiedData.outSpeed, copiedData.outInfluence);
        }
    }
    else if (status === "last") {
        if (k === p.numKeys) {
            applyPerDim(inArr, copiedData.inSpeed, copiedData.inInfluence);
        } else if (k === 1) {
            applyPerDim(outArr, copiedData.inSpeed, copiedData.inInfluence);
        } else {
            applyPerDim(inArr, copiedData.inSpeed, copiedData.inInfluence);
        }
    }
    else if (status === "single") {
        var defIn = (copiedData.inInfluence && copiedData.inInfluence.length) ? copiedData.inInfluence : [33.333];
        var defOut = (copiedData.outInfluence && copiedData.outInfluence.length) ? copiedData.outInfluence : [33.333];

        for (var d = 0; d < inArr.length; d++) {
            inArr[d].speed = 0;
            inArr[d].influence = (d < defIn.length) ? defIn[d] : defIn[defIn.length - 1];
        }
        for (var d = 0; d < outArr.length; d++) {
            outArr[d].speed = 0;
            outArr[d].influence = (d < defOut.length) ? defOut[d] : defOut[defOut.length - 1];
        }
    }

    p.setTemporalEaseAtKey(k, inArr, outArr);
}

// --------- PASTE ----------
function pasteEase() {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return;
    if (!easeBuffer || !easeBuffer.keys) return;

    var selProps = comp.selectedProperties;
    if (!selProps || selProps.length === 0) return;

    app.beginUndoGroup("Paste Ease");

    for (var i = 0; i < selProps.length; i++) {
        var p = selProps[i];
        if (!(p instanceof Property) || !p.isTimeVarying) continue;

        var keys = p.selectedKeys;
        if (!keys || keys.length === 0) continue;

        if (easeBuffer.keyCount === 1) {
            // giữ logic cũ: 1 key copy -> apply cho tất cả key đã chọn
            var copiedData = easeBuffer.keys[0];
            for (var j = 0; j < keys.length; j++) {
                copySpeed(p, keys[j], copiedData);
            }
        } else {
            // multi-key: số lượng phải khớp
            if (keys.length !== easeBuffer.keyCount) {
                alert("The number of selected keys on property '" + p.name + "' does not match the number of copied keys (" + easeBuffer.keyCount + ").");
                continue;
            }
            for (var j = 0; j < keys.length; j++) {
                var copiedData = easeBuffer.keys[j];
                copySpeed(p, keys[j], copiedData);
            }
        }
    }

    app.endUndoGroup();
}

// Hàm cho OverShoot và Bounce //////////////////////////////////
function buildOverExpr(useNull, ctrlLayer, effectName) {
    var layerRef = useNull ? ("thisComp.layer(\"" + ctrlLayer + "\")") : "thisLayer";

    var expr =
        "try { ctl = " + layerRef + "; } catch(err) { ctl = thisLayer; }\n\n" +
        "// Read controls\n" +
        "try { amp = ctl.effect('" + effectName + "')('Amplitude').value/100; } catch(e1) { amp = 50/100; }\n" +
        "try { freq = ctl.effect('" + effectName + "')('Frequency').value/100; } catch(e1) { freq = 200/100; }\n" +
        "try { decay = ctl.effect('" + effectName + "')('Delay').value/100; } catch(e1) { decay = 100/100; }\n" +
        "try { langle = ctl.effect('" + effectName + "')('Lock Angle').value; } catch(e1) { langle=0; }\n" +
        "try { lx = ctl.effect('" + effectName + "')('Lock X').value; } catch(e1) { lx=0; }\n" +
        "try { ly = ctl.effect('" + effectName + "')('Lock Y').value; } catch(e1) { ly=0; }\n" +
        "try { lz = ctl.effect('" + effectName + "')('Lock Z').value; } catch(e1) { lz=0; }\n\n" +

        "// Safe type detection\n" +
        "propName = thisProperty.name.toString().toLowerCase();\n" +
        "isArray = (value instanceof Array);\n" +
        "isAngle = (propName.indexOf('rotation')>=0 || propName.indexOf('angle')>=0 || propName.indexOf('orientation')>=0);\n\n" +

        "// If no keyframes return value\n" +
            "if (numKeys == 0 || (isAngle && langle == 1)) {\n" +
            "  value;\n" +
            "} else {\n" +
            "  // nearest past-or-equal key\n" +
            "  n = nearestKey(time).index;\n" +
            "  if (key(n).time > time && n > 1) n = n - 1;\n" +
            "  if (n == 0) { value; } else {\n" +
            "    t = time - key(n).time;\n" +
            "    if (t < 0) { value; } else {\n" +
            "      eps = thisComp.frameDuration/10;\n" +
            "      // read incoming velocity slightly before key time\n" +
            "      try { v = velocityAtTime(key(n).time - eps); } catch(errV) { v = 0; }\n" +
            "      // envelope: sin(2π f t) * exp(-decay * t)\n" +
            "      env = Math.sin(2 * Math.PI * freq * t) * Math.exp(-decay * t);\n" +
            "      factor = amp * env;\n" +
            "\n" +
            "      if (value instanceof Array) {\n" +
            "        delta = [];\n" +
            "        for (i = 0; i < value.length; i++) {\n" +
            "          cv = (typeof v == 'object' && v.length > i) ? v[i] : (typeof v == 'number' ? v : 0);\n" +
            "          delta[i] = cv * factor;\n" +
            "        }\n" +
            "        if (value.length > 0 && lx == 1) delta[0] = 0;\n" +
            "        if (value.length > 1 && ly == 1) delta[1] = 0;\n" +
            "        if (value.length > 2 && lz == 1) delta[2] = 0;\n" +
            "        value + delta;\n" +
            "      } else {\n" +
            "        try { mag = length(v); } catch(eLen) { mag = Math.abs(v); }\n" +
            "        if (lx == 1 && ly == 1 && lz == 1 &&  langle == 1) value ; else value + mag * factor;\n" +
            "      }\n" +
            "    }\n" +
            "  }\n" +
            "}\n";

    return expr;
}

// ---------- Core apply function ----------
function applyOverShootToSelected(useNull) {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please select a composition first.");
        return;
    }

    var sel = comp.selectedProperties;
    if (!sel || sel.length === 0) {
        alert("Please select at least one property.");
        return;
    }

    app.beginUndoGroup("Apply OverShoot");
    

    var scriptFile = new File($.fileName); // đường dẫn script hiện tại
    var scriptFolder = new Folder(scriptFile.path + "/QTP_Presets");
    var presetFile = new File(scriptFolder.fsName + "/Overshoot Controls.ffx");

    var ctrlLayer;
    

    if (useNull) {
         // --- Xác định khoảng thời gian bao phủ cụm layer được chọn ---
        var minIn = Number.MAX_VALUE;
        var maxOut = 0;
        var topIndex = comp.numLayers + 1;

        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var lyr = comp.selectedLayers[i];
            if (lyr.inPoint < minIn) minIn = lyr.inPoint;
            if (lyr.outPoint > maxOut) maxOut = lyr.outPoint;
            if (lyr.index < topIndex) topIndex = lyr.index; // tìm layer trên cùng
        }

        // Tạo null chung để chứa control
        ctrlLayer = comp.layers.addNull();
        ctrlLayer.label = 9;
        ctrlLayer.name = "OverShoot Controls NULL";

        // --- Đặt vị trí null lên trên cùng cụm layer ---
        if (ctrlLayer.index < topIndex) {
            ctrlLayer.moveBefore(comp.layer(topIndex + 1));
        } 

        // --- Căn in/out point khớp cụm layer ---
        ctrlLayer.inPoint = minIn;
        ctrlLayer.outPoint = maxOut;
        
                if (presetFile.exists) {
                ctrlLayer.applyPreset(presetFile);

                // Sau khi apply preset, effect cuối cùng chính là Bounce Controls vừa tạo
                var effects = ctrlLayer.property("Effects");
                var lastEffect = effects.property(effects.numProperties);
                var effectName = lastEffect.name; 

                // Gắn expression cho từng property
                for (var i = 0; i < sel.length; i++) {
                    var prop = sel[i];
                    if (!prop.canSetExpression) continue;

                    var expr = buildOverExpr(useNull, ctrlLayer.name, effectName);

                    try {
                        prop.expression = expr;
                    } catch (e) {
                        alert("Failed on " + prop.name + ":\n" + e.toString());
                    }
                }

            } else {
                alert("Do not find preset Overshoot Controls.ffx");
            }
    } else {
        // Tạo control trực tiếp trên layer được chọn
        var targetLayer = sel[0].propertyGroup(sel[0].propertyDepth); // lấy layer gốc
        ctrlLayer = targetLayer;
        
    }

    if (presetFile.exists) {
        ctrlLayer.applyPreset(presetFile);
        

        // Sau khi apply preset, effect cuối cùng chính là Bounce Controls vừa tạo
        var effects = ctrlLayer.property("Effects");
        var lastEffect = effects.property(effects.numProperties);
        var effectName = lastEffect.name; // ví dụ: "Bounce Controls" hoặc "Bounce Controls 2"

        // Gắn expression cho từng property
        for (var i = 0; i < sel.length; i++) {
            var prop = sel[i];
            if (!prop.canSetExpression) continue;

            var expr = buildOverExpr(useNull, ctrlLayer.name, effectName);

            try {
                prop.expression = expr;
            } catch (e) {
                alert("Failed on " + prop.name + ":\n" + e.toString());
            }
        }

    } else {
        alert("Do not find preset Overshoot Controls.ffx");
    }

    app.endUndoGroup();
}

function buildBounceExpr(useNull, ctrlLayer, effectName) {
    var layerRef = useNull ? ("thisComp.layer(\"" + ctrlLayer + "\")") : "thisLayer";
    var expr =
                "try { ctl = " + layerRef + "; } catch(err) { ctl = thisLayer; }\n\n" +

        "// Read controls\n" +
        "try { elastic = ctl.effect('" + effectName + "')('Amplitude').value/200; } catch(e1) { elastic=0.25; }\n" +
        "try { gravity = ctl.effect('" + effectName + "')('Gravity').value*150; } catch(e1) { gravity=300; }\n" +
        "try { bounceMax = ctl.effect('" + effectName + "')('Max').value; } catch(e1) { bounceMax=5; }\n" +
        "try { on_off = ctl.effect('" + effectName + "')('Jump In/Out').value; } catch(e1) { on_off=0; }\n" +
        "try { langle = ctl.effect('" + effectName + "')('Lock Angle').value; } catch(e1) { langle=0; }\n" +
        "try { lx = ctl.effect('" + effectName + "')('Lock X').value; } catch(e1) { lx=0; }\n" +
        "try { ly = ctl.effect('" + effectName + "')('Lock Y').value; } catch(e1) { ly=0; }\n" +
        "try { lz = ctl.effect('" + effectName + "')('Lock Z').value; } catch(e1) { lz=0; }\n\n" +

        "// Safe type detection\n" +
        "propName = thisProperty.name.toString().toLowerCase();\n" +
        "isArray = (value.length !== undefined);\n" +
        "isAngle = (propName.indexOf('rotation')>=0 || propName.indexOf('angle')>=0 || propName.indexOf('orientation')>=0);\n\n" +

        "// If gravity invalid, bail out\n" +
        "if (gravity <= 0) { value; } else if (numKeys == 0) { value; } else {\n" +

        "  n = nearestKey(time).index;\n" +
        "  if (key(n).time > time && n>1) n--;\n" +
        "  if (n==0) { value; } else {\n" +

        "    // time since key n\n" +
        "    t = time - key(n).time;\n" +

        "    // --- CASE A: Angle properties (Rotation 1D or Orientation 3D) ---\n" +
        "    if (isAngle) {\n" +
        "      // If before keyframe, don't bounce for angles\n" +
        "      if (t < 0) { value; }\n" +
        "      else {\n" +
        "        // If Lock Angle requested, disable angle bounce entirely\n" +
        "        if (langle == 1) { value; }\n" +
        "        else {\n" +
        "          // Scalar angle (Rotation, X Rotation, etc.)\n" +
        "          if (!isArray) {\n" +
        "            v0 = -velocityAtTime(key(n).time - 0.001) * elastic;\n" +
        "            vl = Math.abs(v0);\n" +
        "            segDur = (gravity==0) ? 1e10 : (2 * vl / gravity);\n" +
        "            tCur = 0; tNext = segDur; nb = 1;\n" +
        "            // advance bounce segments\n" +
        "            while (tNext < t && nb <= bounceMax) {\n" +
        "              v0 *= elastic; vl *= elastic; segDur *= elastic;\n" +
        "              tCur = tNext; tNext += segDur; nb++;\n" +
        "            }\n" +
        "            if (nb <= bounceMax) {\n" +
        "              delta = t - tCur;\n" +
        "              dir = (v0 < 0) ? -1 : 1;\n" +
        "              inOut = dir * delta * (Math.abs(v0) - gravity * delta / 2);\n" +
        "              (on_off==1) ? value - inOut : value + inOut;\n" +
        "            } else { value; }\n" +
        "          }\n" +
        "          // 3D angle (Orientation) -> compute per-axis using scalar method per-channel\n" +
        "          else {\n" +
        "            velVec = velocityAtTime(key(n).time - 0.001);\n" +
        "            outArr = [];\n" +
        "            for (i = 0; i < value.length; i++) {\n" +
        "              vi = -velVec[i] * elastic;\n" +
        "              vli = Math.abs(vi);\n" +
        "              segDuri = (gravity==0) ? 1e10 : (2 * vli / gravity);\n" +
        "              tCuri = 0; tNexti = segDuri; nbi = 1;\n" +
        "              while (tNexti < t && nbi <= bounceMax) {\n" +
        "                vi *= elastic; vli *= elastic; segDuri *= elastic;\n" +
        "                tCuri = tNexti; tNexti += segDuri; nbi++;\n" +
        "              }\n" +
        "              if (nbi <= bounceMax) {\n" +
        "                deltai = t - tCuri;\n" +
        "                diri = (vi < 0) ? -1 : 1;\n" +
        "                inOuti = diri * deltai * (Math.abs(vi) - gravity * deltai / 2);\n" +
        "              } else { inOuti = 0; }\n" +
        "              // if axis locked, zero-out change\n" +
        "              if ((i==0 && lx==1) || (i==1 && ly==1) || (i==2 && lz==1)) outArr[i] = value[i];\n" +
        "              else outArr[i] = (on_off==1) ? value[i] - inOuti : value[i] + inOuti;\n" +
        "            }\n" +
        "            outArr;\n" +
        "          }\n" +
        "        }\n" +
        "      }\n" +
        "    }\n" +

        "    // --- CASE B: Non-angle properties ---\n" +
        "    else {\n" +
        "      // If array-like (Position, Scale, 3D point): use vector approach\n" +
        "      if (isArray) {\n" +
        "        v = -velocityAtTime(key(n).time - 0.001) * elastic;\n" +
        "        vl = length(v);\n" +
        "        if (vl == 0) { value; }\n" +
        "        else {\n" +
        "          segDur = (gravity==0) ? 1e10 : (2 * vl / gravity);\n" +
        "          tCur = 0; tNext = segDur; nb = 1;\n" +
        "          while (tNext < t && nb <= bounceMax) {\n" +
        "            v = v * elastic; vl *= elastic; segDur *= elastic;\n" +
        "            tCur = tNext; tNext += segDur; nb++;\n" +
        "          }\n" +
        "          if (nb <= bounceMax) {\n" +
        "            delta = t - tCur;\n" +
        "            inOutVec = normalize(v) * (delta * (vl - gravity * delta / 2));\n" +
        "            // apply axis locks\n" +
        "            if (lx==1) inOutVec[0] = 0;\n" +
        "            if (ly==1 && inOutVec.length>1) inOutVec[1] = 0;\n" +
        "            if (lz==1 && inOutVec.length>2) inOutVec[2] = 0;\n" +
        "            (on_off==1) ? value - inOutVec : value + inOutVec;\n" +
        "          } else { value; }\n" +
        "        }\n" +
        "      }\n" +
        "      // Scalar non-angle (Opacity, Slider...)\n" +
        "      else {\n" +
        "        v0 = -velocityAtTime(key(n).time - 0.001) * elastic;\n" +
        "        vl = Math.abs(v0);\n" +
        "        segDur = (gravity==0) ? 1e10 : (2 * vl / gravity);\n" +
        "        tCur = 0; tNext = segDur; nb = 1;\n" +
        "        while (tNext < t && nb <= bounceMax) {\n" +
        "          v0 *= elastic; vl *= elastic; segDur *= elastic;\n" +
        "          tCur = tNext; tNext += segDur; nb++;\n" +
        "        }\n" +
        "        if (nb <= bounceMax) {\n" +
        "          delta = t - tCur;\n" +
        "          dir = (v0 < 0) ? -1 : 1;\n" +
        "          inOut = dir * delta * (Math.abs(v0) - gravity * delta / 2);\n" +
        "          (on_off==1) ? value - inOut : value + inOut;\n" +
        "        } else { value; }\n" +
        "      }\n" +
        "    }\n" + // end non-angle\n
        "  }\n" + // end n==0 else
        "}\n"; // end main

    return expr;
}

// ---------- Core apply function ----------
function applyBounceToSelected(useNull) {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please select a composition first.");
        return;
    }

    var sel = comp.selectedProperties;
    if (!sel || sel.length === 0) {
        alert("Please select at least one property.");
        return;
    }

    app.beginUndoGroup("Apply Bounce");

    var scriptFile = new File($.fileName); // đường dẫn script hiện tại
    var scriptFolder = new Folder(scriptFile.path + "/QTP_Presets");
    var presetFile = new File(scriptFolder.fsName + "/Bounce Controls.ffx");

    var ctrlLayer;
    

    if (useNull) {
         // --- Xác định khoảng thời gian bao phủ cụm layer được chọn ---
        var minIn = Number.MAX_VALUE;
        var maxOut = 0;
        var topIndex = comp.numLayers + 1;

        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var lyr = comp.selectedLayers[i];
            if (lyr.inPoint < minIn) minIn = lyr.inPoint;
            if (lyr.outPoint > maxOut) maxOut = lyr.outPoint;
            if (lyr.index < topIndex) topIndex = lyr.index; // tìm layer trên cùng
        }

        // Tạo null chung để chứa control
        ctrlLayer = comp.layers.addNull();
        ctrlLayer.label = 9;
        ctrlLayer.name = "Bounce Controls NULL";

        // --- Đặt vị trí null lên trên cùng cụm layer ---
        if (ctrlLayer.index < topIndex) {
            ctrlLayer.moveBefore(comp.layer(topIndex + 1));
        } 

        // --- Căn in/out point khớp cụm layer ---
        ctrlLayer.inPoint = minIn;
        ctrlLayer.outPoint = maxOut;
        
                if (presetFile.exists) {
                ctrlLayer.applyPreset(presetFile);

                // Sau khi apply preset, effect cuối cùng chính là Bounce Controls vừa tạo
                var effects = ctrlLayer.property("Effects");
                var lastEffect = effects.property(effects.numProperties);
                var effectName = lastEffect.name; 

                // Gắn expression cho từng property
                for (var i = 0; i < sel.length; i++) {
                    var prop = sel[i];
                    if (!prop.canSetExpression) continue;

                    var expr = buildBounceExpr(useNull, ctrlLayer.name, effectName);

                    try {
                        prop.expression = expr;
                    } catch (e) {
                        alert("Failed on " + prop.name + ":\n" + e.toString());
                    }
                }

            } else {
                alert("Do not find preset Bounce Controls.ffx");
            }
    } else {
        // Tạo control trực tiếp trên layer được chọn
        var targetLayer = sel[0].propertyGroup(sel[0].propertyDepth); // lấy layer gốc
        ctrlLayer = targetLayer;
        
    }

    if (presetFile.exists) {
        ctrlLayer.applyPreset(presetFile);

        // Sau khi apply preset, effect cuối cùng chính là Bounce Controls vừa tạo
        var effects = ctrlLayer.property("Effects");
        var lastEffect = effects.property(effects.numProperties);
        var effectName = lastEffect.name; // ví dụ: "Bounce Controls" hoặc "Bounce Controls 2"

        // Gắn expression cho từng property
        for (var i = 0; i < sel.length; i++) {
            var prop = sel[i];
            if (!prop.canSetExpression) continue;

            var expr = buildBounceExpr(useNull, ctrlLayer.name, effectName);

            try {
                prop.expression = expr;
            } catch (e) {
                alert("Failed on " + prop.name + ":\n" + e.toString());
            }
        }

    } else {
        alert("Do not find preset Bounce Controls.ffx");
    }

    app.endUndoGroup();
}

// Efecctor Tool ///////////////////////////////////////////
function effectorTools() {

        // ---------- Helpers ----------
    function findLayerByName(comp, name) {
        for (var i = 1; i <= comp.numLayers; i++) {
            try {
                var L = comp.layer(i);
                if (L && L.name === name) return L;
            } catch (e) {}
        }
        return null;
    }

    function getUniqueControllerName(comp, baseName) {
        var name = baseName;
        var idx = 2;
        while (true) {
            var found = false;
            for (var i = 1; i <= comp.numLayers; i++) {
                try {
                    if (comp.layer(i).name === name) { found = true; break; }
                } catch (e) {}
            }
            if (!found) return name;
            name = baseName + " " + idx;
            idx++;
        }
    }

    function getOrCreateController(comp, baseName, forceNew) {
        var sel = comp.selectedLayers;
        if (!forceNew) {
            var existing = findLayerByName(comp, baseName);
            if (existing) {
                try { existing.selected = false; } catch (e) {}
                return existing;
            }
            var newNull = comp.layers.addNull();
            newNull.name = baseName;            
            newNull.label = 9;

            if (sel.length > 0) {
                var topLayer = sel[0];
                for (var i = 1; i < sel.length; i++) {
                    if (sel[i].index < topLayer.index) topLayer = sel[i];
                }
                newNull.moveBefore(topLayer);
            }

            if (sel && sel.length > 0) {
                var minIn = sel[0].inPoint;
                var maxOut = sel[0].outPoint;
                for (var i = 1; i < sel.length; i++) {
                    if (sel[i].inPoint < minIn)  minIn  = sel[i].inPoint;
                    if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
                }
            } else {
                var minIn = 0, maxOut = comp.duration;
            }
            newNull.inPoint  = minIn;
            newNull.outPoint = maxOut;

            try { newNull.selected = false; } catch (e) {}
            return newNull;
        } else {
            var uniqueName = getUniqueControllerName(comp, baseName);
            var newNull = comp.layers.addNull();
            newNull.name = uniqueName;
            newNull.label = 9;

            if (sel.length > 0) {
                var topLayer = sel[0];
                for (var i = 1; i < sel.length; i++) {
                    if (sel[i].index < topLayer.index) topLayer = sel[i];
                }
                newNull.moveBefore(topLayer);
            }

            if (sel && sel.length > 0) {
                var minIn = sel[0].inPoint;
                var maxOut = sel[0].outPoint;
                for (var i = 1; i < sel.length; i++) {
                    if (sel[i].inPoint < minIn)  minIn  = sel[i].inPoint;
                    if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
                }
            } else {
                var minIn = 0, maxOut = comp.duration;
            }
            newNull.inPoint  = minIn;
            newNull.outPoint = maxOut;

            try { newNull.selected = false; } catch (e) {}
            return newNull;
        }
    }
   
    function applyPresetSafely(targetLayer, presetFolder, presetName) {
        var presetFile = new File(presetFolder.fsName + "/" + presetName);
        if (!presetFile.exists) {
            alert("Preset not found: " + presetName);
            return;
        }

        var comp = app.project.activeItem;
        if (!comp) {
            alert("No active comp");
            return null;
        }

        // --- Bỏ chọn tất cả ---
        for (var i = 0; i < comp.numLayers; i++) {
            try { comp.layer(i + 1).selected = false; } catch (e) {}
        }

        // --- Chỉ chọn layer cần apply ---
        try { targetLayer.selected = true; } catch (e) {}

        // Đếm số lượng effect trước
        var beforeCount = 0;
        try {
            beforeCount = targetLayer.effect.numProperties;
        } catch (e) {
            beforeCount = 0;
        }

        try {
            targetLayer.applyPreset(presetFile);
        } catch (e) {
            alert("Error applying preset: " + e.toString());
            return null;
        }

        // Lấy effect mới vừa được thêm
        var fxName = null;
        try {
            var effects = targetLayer.effect;
            var afterCount = effects.numProperties;
            if (afterCount > beforeCount) {
                fxName = effects.property(afterCount).name;
            }
        } catch (e) {}

        return fxName;

    }
   
    

    function findTopProperty(layer, matchName) {
        for (var i = 1; i <= layer.numProperties; i++) {
            try {
                var p = layer.property(i);
                if (p && p.matchName === matchName) return p;
            } catch (e) {}
        }
        return null;
    }

    // ---------- getExpression: add SingleValue & Boolean cases; keep others ----------


    function getExpression(propType, ctrlName, fxName) {
        var C = ctrlName.replace(/"/g, '\\"');

        // fallback nếu fxName rỗng -> build default group name "Effector_<propTypeNoSpace>"
        var defaultGroup = "Effector_" + propType.replace(/\s+/g, '');
        var F;
        if (fxName && typeof fxName === "string") {
            F = fxName.replace(/"/g, '\\"');
        } else {
            F = defaultGroup;
        }

        if (propType === "Position") {
            return ""
        + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
        + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
        + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n" // lấy group effect động
        + "maxDist = fx(\"Max Distance | Position\");\n"
        + "strength = fx(\"Strength | Position\");\n"
        + "rev = fx(\"Reverse | Position\");\n"
        + "dist = length(nullPos, objPos);\n"
        + "if (dist == 0) { if (nullPos.length == 3) dir = [0,0,0]; else dir = [0,0]; } else { dir = normalize(objPos - nullPos); }\n"
        + "if (rev == 1) dir = -dir;\n"
        + "moveAmount = strength * (1 - clamp(dist / maxDist, 0, 1));\n"
        + "value + dir * moveAmount;\n";
            }

        if (propType === "Scale") {
            return ""
        + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
        + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
        + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
        + "maxDist = fx(\"Max Distance | Scale\");\n"
        + "strength = fx(\"Strength | Scale\");\n"
        + "rev = fx(\"Reverse | Scale\");\n"
        + "dist = length(nullPos, objPos);\n"
        + "influence = 1 - clamp(dist / maxDist, 0, 1);\n"
        + "if (rev == 1) influence = -influence;\n"
        + "baseScale = value;\n"
        + "n = baseScale.length;\n"
        + "addArr = [];\n"
        + "for (i = 0; i < n; i++) addArr.push(strength * influence);\n"
        + "baseScale + addArr;\n";
        }

        if (propType === "Rotation") {
            return ""
            + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
            + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "rev = fx(\"Reverse | Rotation\");\n"
            + "maxDist = fx(\"Max Distance | Rotation\");\n"
            + "dist = length(nullPos, objPos);\n"
            + "angle = -Math.atan2(objPos[1] - nullPos[1], objPos[0] - nullPos[0]) * 180 / Math.PI + 90;\n"
            + "if (rev == 1) angle = -angle;\n"
            + "a = value;\n"
            + "delta = angle - a;\n"
            + "while (delta > 180) delta -= 360;\n"
            + "while (delta < -180) delta += 360;\n"
            + "influence = 1 - clamp(dist / maxDist, 0, 1);\n"
            + "result = a + delta * influence;\n"
            + "result;\n";
        }



        if (propType === "Opacity") {
            // use In | Opacity and Out | Opacity (values clamped on sliders by slider expressions)
            return ""
            + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
            + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "maxDist = fx(\"Max Distance | Opacity\");\n"
            + "rev = fx(\"Reverse | Opacity\");\n"
            + "inVal = fx(\"In Opacity\");\n"
            + "outVal = fx(\"Out Opacity\");\n"
            + "dist = length(nullPos, objPos);\n"
            + "t = clamp(dist / maxDist, 0, 1);\n"
            + "val = linear(t, 0, 1, inVal, outVal);\n"
            + "if (rev == 1) { val = linear(t, 0, 1, outVal, inVal); }\n"
            + "linear(val, 0, 100, 0, value);\n";
            }

        if (propType === "Time Remap" || propType === "TimeRemap") {
            return ""
            + "nullLayer = thisComp.layer(\"" + C + "\");\n"
            + "distance = length(nullLayer.position, transform.position);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "maxDist = fx(\"Max Distance | Time\");\n"
            + "strengthDist = fx(\"Strength | Time\");\n"
            + "rev = fx(\"Reverse | Time\");\n"
            + "effectiveDist = clamp(strengthDist, 0, maxDist);\n"
            + "timeStart = fx(\"Time Start\");\n"
            + "timeEnd = fx(\"Time End\");\n"
            + "clampedDistance = clamp(distance, effectiveDist, maxDist);\n"
            + "remapTime = linear(clampedDistance, maxDist, effectiveDist, timeStart, timeEnd);\n"
            + "rev == 1 ? timeEnd - remapTime : remapTime;\n";
                    }

        if (propType === "Color") {
            return ""
            + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
            + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "maxDist = fx(\"Max Distance | Color\");\n"
            + "strength = fx(\"Strength | Color\");\n"
            + "rev = fx(\"Reverse | Color\");\n"
            + "stateCol = fx(\"State Color\");\n"
            + "varCol = fx(\"Variable Color\");\n"
            + "dist = length(nullPos, objPos);\n"
            + "influence = 1 - clamp(dist / maxDist, 0, 1);\n"
            + "t = rev == 1 ? 1 - influence : influence;\n"
            + "t *= strength/100;\n"
            + "r = stateCol[0] + (varCol[0] - stateCol[0]) * t;\n"
            + "g = stateCol[1] + (varCol[1] - stateCol[1]) * t;\n"
            + "b = stateCol[2] + (varCol[2] - stateCol[2]) * t;\n"
            + "a = (stateCol.length > 3 && varCol.length > 3) ? (stateCol[3] + (varCol[3] - stateCol[3]) * t) : 1;\n"
            + "[r,g,b,a];\n";
                    }

        if (propType === "SingleValue") {
            // Generic single-value mapping using In/Out sliders (no clamp)
            return ""
            + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
            + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "maxDist = fx(\"Max Distance | SV\");\n"
            + "inVal = fx(\"In\");\n"
            + "outVal = fx(\"Out\");\n"
            + "rev = fx(\"Reverse | SV\");\n"
            + "dist = length(nullPos, objPos);\n"
            + "t = clamp(dist / maxDist, 0, 1);\n"
            + "val = linear(t, 0, 1, inVal, outVal);\n"
            + "rev == 1 ? linear(t, 0, 1, outVal, inVal) : val;\n";
                    }

        if (propType === "Boolean") {
            // Boolean (0/1) based on distance < MaxDistance, optional Reverse
            return ""
            + "nullPos = thisComp.layer(\"" + C + "\").toWorld(thisComp.layer(\"" + C + "\").anchorPoint);\n"
            + "objPos = thisLayer.toWorld(thisLayer.anchorPoint);\n"
            + "fx = thisComp.layer(\"" + C + "\").effect(\"" + F + "\");\n"
            + "maxDist = fx(\"Max Distance | Boolean\");\n"
            + "rev = fx(\"Reverse | Boolean\");\n"
            + "dist = length(nullPos, objPos);\n"
            + "flag = (dist < maxDist) ? 1 : 0;\n"
            + "rev == 1 ? 1 - flag : flag;\n";
                    }

        return "";
    }

    // ---------- Populate controller dropdown (no recursion) ----------
    function populateControllerDropdown(comp, dropdown) {
        if (!dropdown) return;
        try {
            while (dropdown.items.length) dropdown.remove(0);
        } catch (e) {
            try { dropdown.removeAll(); } catch (e2) {}
        }
        dropdown.add('item', '- Selected Controller -');

        if (!(comp instanceof CompItem)) {
            dropdown.selection = 0;
            return;
        }

        // find layers whose names start with "Effector Control" OR "Effector Controller"
        for (var i = 1; i <= comp.numLayers; i++) {
            try {
                var L = comp.layer(i);
                if (L && L.name && (L.name.indexOf("Effector Control") === 0 || L.name.indexOf("Effector Controller") === 0)) {
                    dropdown.add('item', L.name);
                }
            } catch (e) {}
        }

        if (dropdown.items.length > 1) dropdown.selection = 1;
        else dropdown.selection = 0;
    }

    // ---------- UI Builder (kept like your ver) ----------
    function buildUI(thisObj) {
        var w = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Effector Tool", undefined, { resizable: true });

        // Controller dropdown + refresh + select button
        var ctrlGroup = w.add("group");
        ctrlGroup.orientation = "row";
        ctrlGroup.add("statictext", undefined, "");
        ctrlGroup.margins = 4;
        var ctrlDropdown = ctrlGroup.add("dropdownlist", undefined, []);
        ctrlDropdown.helpTip = "Select control to build effector";
        var refreshBtn = ctrlGroup.add("button", undefined, "Refresh");

        // Mode radios
        var modeGroup = w.add("group");
        modeGroup.orientation = "row";
        modeGroup.margins = 4;
        var rbFromList = modeGroup.add("radiobutton", undefined, "Quick Add");
        rbFromList.helpTip = "Quick make effector for multi properties below";
        var rbSelected = modeGroup.add("radiobutton", undefined, "Selected Properties");
        rbSelected.helpTip = "Pick properties type below to make effector for selected properties"
        rbFromList.value = true;

        // Choose properties
        var propsPanel = w.add("panel", undefined, "Attribute type");
        propsPanel.orientation = "row";
        propsPanel.alignChildren = ["left", "top"];
        propsPanel.margins = 10;

        var group1 = propsPanel.add("group", undefined, "");
        group1.orientation = "column";
        group1.alignChildren = ["left", "top"];
        group1.margins = 10;

        var group2 = propsPanel.add("group", undefined, "");
        group2.orientation = "column";
        group2.alignChildren = ["left", "top"];
        group2.margins = 10;

        var cbPosition = group1.add("checkbox", undefined, "Position");
        var cbScale = group1.add("checkbox", undefined, "Scale");
        var cbRotation = group1.add("checkbox", undefined, "Rotation");
        var cbOpacity = group1.add("checkbox", undefined, "Opacity");
        var cbTimeRemap = group2.add("checkbox", undefined, "Time Remap");
        var cbColor = group2.add("checkbox", undefined, "Color");
        var cbSingleValue = group2.add("checkbox", undefined, "SingleValue");
        var cbBoolean = group2.add("checkbox", undefined, "Boolean");

        function makeExclusive(checkBoxes) {
            for (var i = 0; i < checkBoxes.length; i++) {
                checkBoxes[i].onClick = function() {
                    if (this.value) {
                        for (var j = 0; j < checkBoxes.length; j++) {
                            if (checkBoxes[j] !== this) {
                                checkBoxes[j].value = false;
                            }
                        }
                    }
                };
            }
        }

        var allCBs = [cbPosition, cbScale, cbRotation, cbOpacity, cbTimeRemap, cbColor, cbSingleValue, cbBoolean];
        // originalHandlers snapshot
        var originalHandlers = [];
        for (var i = 0; i < allCBs.length; i++) {
            originalHandlers.push(allCBs[i].onClick);
        }

        // updateCheckboxStates: keep behavior: when Selected the checkboxes act as exclusive (radio-like)
        function updateCheckboxStates() {
            if (rbFromList.value) {
                cbPosition.enabled = true;
                cbScale.enabled = true;
                cbRotation.enabled = true;
                cbOpacity.enabled = true;
                cbTimeRemap.enabled = true;

                cbColor.enabled = false;
                cbColor.value = false;
                cbSingleValue.enabled = false;
                cbSingleValue.value = false;
                cbBoolean.enabled = false;
                cbBoolean.value = false;
            } else {
                cbPosition.enabled = true;
                cbScale.enabled = true;
                cbRotation.enabled = true;
                cbOpacity.enabled = true;
                cbTimeRemap.enabled = true;

                cbColor.enabled = true;
                cbSingleValue.enabled = true;
                cbBoolean.enabled = true;
            }
        }

        rbSelected.onClick = function() {
            if (rbSelected.value) {
                // Clear ticks
                for (var i = 0; i < allCBs.length; i++) {
                    allCBs[i].value = false;
                }
                // make exclusive
                makeExclusive(allCBs);
                updateCheckboxStates();
            }
        };

        rbFromList.onClick = function() {
            if (rbFromList.value) {
                // restore original handlers (remove exclusivity)
                for (var i = 0; i < allCBs.length; i++) {
                    allCBs[i].onClick = originalHandlers[i];
                }
                updateCheckboxStates();
            }
        };

        // initial
        updateCheckboxStates();

        // Run button
        var runBtn = w.add("button", undefined, "RUN");
        runBtn.helpTip = "Make null control to control the infuence. Shift to Make new null control";

        // store references on panel
        w._rbSelected = rbSelected;
        w._rbFromList = rbFromList;
        w._ctrlDropdown = ctrlDropdown;
        w._refreshBtn = refreshBtn;
        w._cbPosition = cbPosition;
        w._cbScale = cbScale;
        w._cbRotation = cbRotation;
        w._cbOpacity = cbOpacity;
        w._cbTimeRemap = cbTimeRemap;
        w._cbColor = cbColor;
        w._cbSingleValue = cbSingleValue;
        w._cbBoolean = cbBoolean;
        w._runBtn = runBtn;

        // initial populate
        try {
            var comp0 = app.project.activeItem;
            populateControllerDropdown(comp0, ctrlDropdown);
        } catch (e) {}

        // refresh handler
        refreshBtn.onClick = function () {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
            populateControllerDropdown(comp, ctrlDropdown);
        };

        return w;
    }

    // ---------- Build & show UI ----------
    
    var panel = buildUI(this);
    if (panel instanceof Window) { panel.center(); panel.show(); }

    // ---------- Main run implementation ----------
    function runMain(panel) {
        app.beginUndoGroup("Effector Tool v1.4");

        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) { alert("Please select a composition."); app.endUndoGroup(); return; }
            if (comp.selectedLayers.length === 0) { alert("Please select at least one layer."); app.endUndoGroup(); return; }

            // 1) Snapshot selection & selected properties BEFORE any controller creation
            var savedLayers = [];
            var selectedPropsMap = [];
            var selLayers = comp.selectedLayers;
            for (var i = 0; i < selLayers.length; i++) {
                var L = selLayers[i];
                savedLayers.push(L);
                var arr = [];
                try {
                    var sp = L.selectedProperties;
                    for (var j = 0; j < sp.length; j++) arr.push(sp[j]);
                } catch (e) {}
                selectedPropsMap.push({ layer: L, props: arr });
            }

            // 2) Determine controller to use (shift creates new)
            var shiftHeld = false;
            try { shiftHeld = ScriptUI.environment.keyboardState.shiftKey; } catch (e) {}

            var controller = null;
            var dropdown = panel._ctrlDropdown;

            if (shiftHeld) {
                controller = getOrCreateController(comp, "Effector Control", true);
                populateControllerDropdown(comp, dropdown);
                for (var ii = 0; ii < dropdown.items.length; ii++) {
                    try { if (dropdown.items[ii].text === controller.name) { dropdown.selection = ii; break; } } catch (e) {}
                }
            } else {
                var sel = dropdown.selection;
                if (sel && sel.index > 0) {
                    var chosen = sel.text;
                    controller = findLayerByName(comp, chosen);
                    if (!controller) {
                        controller = getOrCreateController(comp, "Effector Control", false);
                        populateControllerDropdown(comp, dropdown);
                        for (var jj = 0; jj < dropdown.items.length; jj++) {
                            try { if (dropdown.items[jj].text === controller.name) { dropdown.selection = jj; break; } } catch (e) {}
                        }
                    }
                } else {
                    controller = findLayerByName(comp, "Effector Control");
                    if (!controller) {
                        controller = getOrCreateController(comp, "Effector Control", false);
                        populateControllerDropdown(comp, dropdown);
                        for (var kk = 0; kk < dropdown.items.length; kk++) {
                            try { if (dropdown.items[kk].text === controller.name) { dropdown.selection = kk; break; } } catch (e) {}
                        }
                    }
                }
            }

            if (!controller) {
                alert("Failed to locate or create a controller.");
                app.endUndoGroup();
                return;
            }

            // 3) Decide which property categories are needed
            var need = { Position: false, Scale: false, Rotation: false, Opacity: false, TimeRemap: false, Color: false, SingleValue: false, Boolean: false };
            var rbFromList = panel._rbFromList;
            // ui checkboxes references
            var cbPos = panel._cbPosition;
            var cbScale = panel._cbScale;
            var cbRot = panel._cbRotation;
            var cbOp = panel._cbOpacity;
            var cbTR = panel._cbTimeRemap;
            var cbColor = panel._cbColor;
            var cbSingle = panel._cbSingleValue;
            var cbBool = panel._cbBoolean;

            // Determine need:
            // - If From List: use checkboxes values (same as before)
            // - If Selected: DO NOT auto-detect; use whichever checkbox is checked (radio-like enforced)
            if (rbFromList.value) {
                need.Position = cbPos.value;
                need.Scale = cbScale.value;
                need.Rotation = cbRot.value;
                need.Opacity = cbOp.value;
                need.TimeRemap = cbTR.value;
                need.Color = cbColor.value;
                need.SingleValue = cbSingle.value;
                need.Boolean = cbBool.value;
            } else {
                // Selected: respect only the one checkbox the user selected (radio-like)
                if (cbPos.value) need.Position = true;
                else if (cbScale.value) need.Scale = true;
                else if (cbRot.value) need.Rotation = true;
                else if (cbOp.value) need.Opacity = true;
                else if (cbTR.value) need.TimeRemap = true;
                else if (cbColor.value) need.Color = true;
                else if (cbSingle.value) need.SingleValue = true;
                else if (cbBool.value) need.Boolean = true;
            }

            // 4) Add controls (only once per category, with clear display names)
            var appliedFx = {}; // lưu tên group effect vừa apply

            try {
                var scriptFile = File($.fileName); // file script hiện tại
                var presetFolder = new Folder(scriptFile.path + "/QTP_Presets");

                if (need.Position) appliedFx.Position = applyPresetSafely(controller, presetFolder, "Effector_Position.ffx");
                if (need.Scale)    appliedFx.Scale    = applyPresetSafely(controller, presetFolder, "Effector_Scale.ffx");
                if (need.Rotation) appliedFx.Rotation = applyPresetSafely(controller, presetFolder, "Effector_Rotation.ffx");
                if (need.Opacity)  appliedFx.Opacity  = applyPresetSafely(controller, presetFolder, "Effector_Opacity.ffx");
                if (need.TimeRemap)appliedFx.TimeRemap= applyPresetSafely(controller, presetFolder, "Effector_TimeRemap.ffx");
                if (need.Color)    appliedFx.Color    = applyPresetSafely(controller, presetFolder, "Effector_Color.ffx");
                if (need.SingleValue) appliedFx.SingleValue = applyPresetSafely(controller, presetFolder, "Effector_SingleValue.ffx");
                if (need.Boolean)  appliedFx.Boolean  = applyPresetSafely(controller, presetFolder, "Effector_Boolean.ffx");
            } catch (e) {
                alert("Error applying preset: " + e.toString());
            }
           


            // 5) Prepare expressions
            var ctrlName = controller.name;
            var exprPos = getExpression("Position", ctrlName, appliedFx.Position);
            var exprScale = getExpression("Scale", ctrlName, appliedFx.Scale);
            var exprRot = getExpression("Rotation", ctrlName, appliedFx.Rotation);
            var exprOp  = getExpression("Opacity", ctrlName, appliedFx.Opacity);
            var exprTR  = getExpression("Time Remap", ctrlName, appliedFx.TimeRemap);
            var exprColor = getExpression("Color", ctrlName, appliedFx.Color);
            var exprSingle = getExpression("SingleValue", ctrlName, appliedFx.SingleValue);
            var exprBool = getExpression("Boolean", ctrlName, appliedFx.Boolean);
                        

            // 6) Apply expressions to savedLayers (so creation of controller didn't disturb selection)
            for (var t = 0; t < savedLayers.length; t++) {
                var L = savedLayers[t];
                if (L === controller) continue;

                // FROM LIST (Quick Add): apply to Transform.* as before
                if (rbFromList.value) {
                    // Position
                    if (need.Position) {
                        try { var posProp2 = L.property("Transform").property("Position"); if (posProp2 && posProp2.canSetExpression) posProp2.expression = exprPos; } catch (e) {}
                    }
                    // Scale
                    if (need.Scale) {
                        try { var sProp2 = L.property("Transform").property("Scale"); if (sProp2 && sProp2.canSetExpression) sProp2.expression = exprScale; } catch (e) {}
                    }
                    // Rotation
                    if (need.Rotation) {
                        try { var rProp2 = L.property("Transform").property("Rotation"); if (rProp2 && rProp2.canSetExpression) rProp2.expression = exprRot; } catch (e) {}
                    }
                    // Opacity
                    if (need.Opacity) {
                        try { var oProp2 = L.property("Transform").property("Opacity"); if (oProp2 && oProp2.canSetExpression) oProp2.expression = exprOp; } catch (e) {}
                    }
                    // Time Remap
                    if (need.TimeRemap) {
                        try {
                            if (L.canSetTimeRemapEnabled) {
                                if (!L.timeRemapEnabled) L.timeRemapEnabled = true;
                                var tr2 = findTopProperty(L, "ADBE Time Remapping");
                                if (!tr2) { try { tr2 = L.property("Time Remap"); } catch (e) {} }
                                if (tr2 && tr2.canSetExpression) tr2.expression = exprTR;
                            }
                        } catch (e) {}
                    }
                    // Color
                    if (need.Color) {
                        try {
                            var foundColorProp = null;
                            var effs = null;
                            try { effs = L.property("Effects"); } catch (e) { effs = null; }
                            if (effs) {
                                for (var ei = 1; ei <= effs.numProperties; ei++) {
                                    try {
                                        var effProp = effs.property(ei);
                                        if (!effProp) continue;
                                        for (var ci2 = 1; ci2 <= effProp.numProperties; ci2++) {
                                            try {
                                                var child = effProp.property(ci2);
                                                if (child && child.propertyValueType === PropertyValueType.COLOR) { foundColorProp = child; break; }
                                            } catch (e) {}
                                        }
                                        if (foundColorProp) break;
                                    } catch (e) {}
                                }
                            }
                            if (!foundColorProp) {
                                for (var pi2 = 1; pi2 <= L.numProperties; pi2++) {
                                    try {
                                        var ptop = L.property(pi2);
                                        if (ptop && ptop.propertyValueType === PropertyValueType.COLOR) { foundColorProp = ptop; break; }
                                    } catch (e) {}
                                }
                            }
                            if (foundColorProp && foundColorProp.canSetExpression) foundColorProp.expression = exprColor;
                        } catch (e) {}
                    }
                    // SingleValue (From List -> apply to transform? usually none; fall back to find first 1D property and apply)
                    if (need.SingleValue) {
                        try {
                            // try to apply to any first OneD property (excluding obvious transform properties)
                            var appliedSV = false;
                            for (var pi3 = 1; pi3 <= L.numProperties; pi3++) {
                                try {
                                    var ppp = L.property(pi3);
                                    if (!ppp) continue;
                                    if (ppp.propertyType === PropertyType.PROPERTY && ppp.propertyValueType === PropertyValueType.OneD && ppp.canSetExpression) {
                                        // avoid applying onto Opacity (if user didn't request opacity)
                                        if (ppp.matchName !== "ADBE Opacity") { ppp.expression = exprSingle; appliedSV = true; break; }
                                    }
                                } catch (e) {}
                            }
                        } catch (e) {}
                    }
                    // Boolean (From List -> try apply to a selected true/false style slider or marker? We'll apply to first OneD as fallback)
                    if (need.Boolean) {
                        try {
                            var appliedB = false;
                            for (var pi4 = 1; pi4 <= L.numProperties; pi4++) {
                                try {
                                    var ppp2 = L.property(pi4);
                                    if (!ppp2) continue;
                                    if (ppp2.propertyType === PropertyType.PROPERTY && ppp2.propertyValueType === PropertyValueType.OneD && ppp2.canSetExpression) {
                                        ppp2.expression = exprBool; appliedB = true; break;
                                    }
                                } catch (e) {}
                            }
                        } catch (e) {}
                    }

                } else {
                    // SELECTED PROPERTIES mode:
                    // Instead of auto-detecting property types, apply the expression that corresponds to the single checkbox the user selected
                    // (the UI ensures only one checkbox can be active in Selected mode).
                    // Apply expression to each selected property (props map) directly.
                    var propToApply = null;
                    if (cbPos.value) propToApply = "Position";
                    else if (cbScale.value) propToApply = "Scale";
                    else if (cbRot.value) propToApply = "Rotation";
                    else if (cbOp.value) propToApply = "Opacity";
                    else if (cbTR.value) propToApply = "Time Remap";
                    else if (cbColor.value) propToApply = "Color";
                    else if (cbSingle.value) propToApply = "SingleValue";
                    else if (cbBool.value) propToApply = "Boolean";

                    // Build expression string based on propToApply
                    var exprToAssign = "";
                    if (propToApply === "Position") exprToAssign = exprPos;
                    else if (propToApply === "Scale") exprToAssign = exprScale;
                    else if (propToApply === "Rotation") exprToAssign = exprRot;
                    else if (propToApply === "Opacity") exprToAssign = exprOp;
                    else if (propToApply === "Time Remap") exprToAssign = exprTR;
                    else if (propToApply === "Color") exprToAssign = exprColor;
                    else if (propToApply === "SingleValue") exprToAssign = exprSingle;
                    else if (propToApply === "Boolean") exprToAssign = exprBool;

                    // Apply to selected properties on this layer
                    var propsList = selectedPropsMap[t].props;
                    if (propsList && propsList.length > 0 && exprToAssign) {
                        for (var q = 0; q < propsList.length; q++) {
                            var prop = propsList[q];
                            if (!prop) continue;
                            try {
                                if (!prop.canSetExpression) continue;
                                // Special handling: if user chose Time Remap but selected a non-time-remap property,
                                // still assign expression to that property (user opted in); if they selected Time Remap property itself,
                                // it's fine to apply to that property as well.
                                prop.expression = exprToAssign;
                            } catch (e) {}
                        }
                    } else {
                        // If nothing was selected on this layer, fallback to applying to Transform.* if fits (preserve original behavior)
                        try {
                            if (propToApply === "Position") {
                                var posProp = L.property("Transform").property("Position");
                                if (posProp && posProp.canSetExpression) posProp.expression = exprPos;
                            } else if (propToApply === "Scale") {
                                var sProp = L.property("Transform").property("Scale");
                                if (sProp && sProp.canSetExpression) sProp.expression = exprScale;
                            } else if (propToApply === "Rotation") {
                                var rProp = L.property("Transform").property("Rotation");
                                if (rProp && rProp.canSetExpression) rProp.expression = exprRot;
                            } else if (propToApply === "Opacity") {
                                var oProp = L.property("Transform").property("Opacity");
                                if (oProp && oProp.canSetExpression) oProp.expression = exprOp;
                            } else if (propToApply === "Time Remap") {
                                if (L.canSetTimeRemapEnabled) {
                                    if (!L.timeRemapEnabled) L.timeRemapEnabled = true;
                                    var trp = findTopProperty(L, "ADBE Time Remapping");
                                    if (!trp) { try { trp = L.property("Time Remap"); } catch (e) { trp = null; } }
                                    if (trp && trp.canSetExpression) trp.expression = exprTR;
                                }
                            } else if (propToApply === "Color") {
                                // search for color prop
                                var foundColorProp = null;
                                var effs = null;
                                try { effs = L.property("Effects"); } catch (e) { effs = null; }
                                if (effs) {
                                    for (var ei = 1; ei <= effs.numProperties; ei++) {
                                        try {
                                            var effProp = effs.property(ei);
                                            if (!effProp) continue;
                                            for (var ci2 = 1; ci2 <= effProp.numProperties; ci2++) {
                                                try {
                                                    var child = effProp.property(ci2);
                                                    if (child && child.propertyValueType === PropertyValueType.COLOR) { foundColorProp = child; break; }
                                                } catch (e) {}
                                            }
                                            if (foundColorProp) break;
                                        } catch (e) {}
                                    }
                                }
                                if (!foundColorProp) {
                                    for (var pi2 = 1; pi2 <= L.numProperties; pi2++) {
                                        try {
                                            var ptop = L.property(pi2);
                                            if (ptop && ptop.propertyValueType === PropertyValueType.COLOR) { foundColorProp = ptop; break; }
                                        } catch (e) {}
                                    }
                                }
                                if (foundColorProp && foundColorProp.canSetExpression) foundColorProp.expression = exprColor;
                            } else if (propToApply === "SingleValue") {
                                // fallback: apply to first OneD property not Opacity
                                for (var pi3 = 1; pi3 <= L.numProperties; pi3++) {
                                    try {
                                        var ppp = L.property(pi3);
                                        if (!ppp) continue;
                                        if (ppp.propertyType === PropertyType.PROPERTY && ppp.propertyValueType === PropertyValueType.OneD && ppp.canSetExpression) {
                                            if (ppp.matchName !== "ADBE Opacity") { ppp.expression = exprSingle; break; }
                                        }
                                    } catch (e) {}
                                }
                            } else if (propToApply === "Boolean") {
                                for (var pi4 = 1; pi4 <= L.numProperties; pi4++) {
                                    try {
                                        var ppp2 = L.property(pi4);
                                        if (!ppp2) continue;
                                        if (ppp2.propertyType === PropertyType.PROPERTY && ppp2.propertyValueType === PropertyValueType.OneD && ppp2.canSetExpression) {
                                            ppp2.expression = exprBool; break;
                                        }
                                    } catch (e) {}
                                }
                            }
                        } catch (e) {}
                    }
                } // end selected handling
            } // end for savedLayers

            // 7) Update dropdown (in case we created controller)
            try { populateControllerDropdown(comp, panel._ctrlDropdown); } catch (e) {}

        } catch (err) {
            alert("Error " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    } // end runMain

    // ---------- Bind run button ----------
    try {
        if (panel && panel._runBtn) {
            panel._runBtn.onClick = function () { runMain(panel); };
        } else {
            var foundRun = null;
            if (panel) {
                for (var z = 0; z < panel.children.length; z++) {
                    try {
                        var ch = panel.children[z];
                        if (ch && ch.text === "RUN" && ch.type === "button") { foundRun = ch; break; }
                    } catch (e) {}
                }
            }
            if (foundRun) foundRun.onClick = function () { runMain(panel); };
        }
    } catch (e) {}

    // expose populate for manual use
    try { if (panel) panel._populateControllers = function () { populateControllerDropdown(app.project.activeItem, panel._ctrlDropdown); }; } catch (e) {}

}

// Ham AniMarker /////////////////////////////////////////////////////////
// Helpers
    function hasEffectByName(layer, name) {
        var fx = layer.property("ADBE Effect Parade");
        if (!fx) return false;
        for (var i = 1; i <= fx.numProperties; i++) {
            if (fx.property(i).name === name) return true;
        }
        return false;
    }

    function addReverseCheckboxIfMissing(layer) {
        var fx = layer.property("ADBE Effect Parade");
        if (!hasEffectByName(layer, "Reverse Animation")) {
            var newFx = fx.addProperty("ADBE Checkbox Control");
            newFx.name = "Reverse Animation";
            try { newFx.property(1).setValue(0); } catch (e) {}
        }
    }

    function markerExistsAtTime(markerProp, t, comp) {
        for (var m = 1; m <= markerProp.numKeys; m++) {
            if (Math.abs(markerProp.keyTime(m) - t) < comp.frameDuration / 2) return true;
        }
        return false;
    }

    function collectSelectedProperties(comp) {
        // Collect all selected properties and the indices of selected keys (store indices now)
        var selProps = comp.selectedProperties;
        var result = [];
        for (var i = 0; i < selProps.length; i++) {
            var p = selProps[i];
            // Ensure it's a property with keys
            if (!(p instanceof Property)) continue;
            if (p.numKeys < 1) continue;

            // Collect selected key indices on that property
            var keyIndices = [];
            for (var k = 1; k <= p.numKeys; k++) {
                try {
                    if (p.keySelected(k)) keyIndices.push(k);
                } catch (ee) {}
            }
            if (keyIndices.length === 0) continue; // skip properties with no selected keys

            // layer containing this property
            var layerRef = p.propertyGroup(p.propertyDepth);
            result.push({
                prop: p,
                layer: layerRef,
                keyIndices: keyIndices,
                firstIdx: Math.min.apply(null, keyIndices),
                lastIdx: Math.max.apply(null, keyIndices)
            });
        }
        return result;
    }

    function buildLocalExpression(firstIdx, lastIdx) {
        return  "try{\n" +
                "  main = thisLayer;\n\n" +
                "  firstKeyTime = thisProperty.key(" + firstIdx + ").time;\n" +
                "  lastKeyTime = thisProperty.key(" + lastIdx + ").time;\n" +
                "  mark = thisLayer(\"ADBE Marker\");\n" +
                "  if (mark.numKeys > 0){\n" +
                "    n = mark.nearestKey(time).index;\n" +
                "    if (mark.key(n).time > time) n--;\n" +
                "  } else { n = 0; }\n" +
                "  if(main(\"ADBE Effect Parade\")(\"Reverse Animation\")(1).value == true) {\n" +
                "    if (n > 0){\n" +
                "      t = time - mark.key(n).time + inPoint;\n" +
                "      if(n % 2 == 0){ thisProperty.valueAtTime(lastKeyTime - t); }\n" +
                "      else { thisProperty.valueAtTime(firstKeyTime + t); }\n" +
                "    } else {\n" +
                "      t = firstKeyTime;\n" +
                "      thisProperty.valueAtTime(t);\n" +
                "    }\n" +
                "  } else {\n" +
                "    if (n > 0) t = time - mark.key(n).time;\n" +
                "    else t = firstKeyTime;\n" +
                "    thisProperty.valueAtTime(firstKeyTime + t);\n" +
                "  }\n" +
                "} catch(e){ value; }";
    }

    function buildNullExpression(firstIdx, lastIdx) {
        return  "try{\n" +
                "  main = thisComp.layer(\"Marker Animation Null\");\n\n" +
                "  firstKeyTime = thisProperty.key(" + firstIdx + ").time;\n" +
                "  lastKeyTime = thisProperty.key(" + lastIdx + ").time;\n" +
                "  mark = main(\"ADBE Marker\");\n" +
                "  if (mark.numKeys > 0){\n" +
                "    n = mark.nearestKey(time).index;\n" +
                "    if (mark.key(n).time > time) n--;\n" +
                "  } else { n = 0; }\n" +
                "  if(main(\"ADBE Effect Parade\")(\"Reverse Animation\")(1).value == true) {\n" +
                "    if (n > 0){\n" +
                "      t = time - mark.key(n).time + inPoint;\n" +
                "      if(n % 2 == 0){ thisProperty.valueAtTime(lastKeyTime - t); }\n" +
                "      else { thisProperty.valueAtTime(firstKeyTime + t); }\n" +
                "    } else {\n" +
                "      t = firstKeyTime;\n" +
                "      thisProperty.valueAtTime(t);\n" +
                "    }\n" +
                "  } else {\n" +
                "    if (n > 0) t = time - mark.key(n).time;\n" +
                "    else t = firstKeyTime;\n" +
                "    thisProperty.valueAtTime(firstKeyTime + t);\n" +
                "  }\n" +
                "} catch(e){ value; }";
    }

function AniMarker() {
            var evt = ScriptUI.environment.keyboardState;
            var isShift = evt.shiftKey;

            var comp = app.project.activeItem;
            if (!(comp && comp instanceof CompItem)) {
                alert("Please open a composition and select property keyframes first.");
                return;
            }

            // Collect all selected properties & their selected key indices BEFORE doing anything
            var propsInfo = collectSelectedProperties(comp);
            if (propsInfo.length === 0) {
                alert("Please select at least one property keyframe (on the property) before pressing AniMarker.");
                return;
            }

            app.beginUndoGroup("AniMarker v1.1");

            var t = comp.time;

            if (!isShift) {
                // NORMAL click: operate per layer/property
                for (var i = 0; i < propsInfo.length; i++) {
                    var info = propsInfo[i];
                    var lyr = info.layer;
                    var prop = info.prop;

                    // Add Reverse checkbox on each layer (if missing)
                    addReverseCheckboxIfMissing(lyr);

                    // Add marker on that layer at current time, if not present
                    var markProp = lyr.property("ADBE Marker");
                    if (!markerExistsAtTime(markProp, t, comp)) {
                        markProp.setValueAtTime(t, new MarkerValue("AniMarker"));
                    }

                    // Build expression using stored first/last indices
                    var expr = buildLocalExpression(info.firstIdx, info.lastIdx);
                    try {
                        prop.expression = expr;
                    } catch (e) {
                        // if expression can't be set, skip and continue
                        alert("Could not set expression on property: " + prop.name + "\n" + e.toString());
                    }
                }
            } else {
                // SHIFT+click: create or use Marker Animation Null
                var nullLayer = null;
                for (var li = 1; li <= comp.numLayers; li++) {
                    if (comp.layer(li).name === "Marker Animation Null") {
                        nullLayer = comp.layer(li);
                        break;
                    }
                }

                if (!nullLayer) {
                    var selLyrs = comp.selectedLayers;
                    // create null
                    nullLayer = comp.layers.addNull();
                    nullLayer.name = "Marker Animation Null";

                    // move null lên trên cùng nhóm layer được chọn
                    if (selLyrs.length > 0) {
                        var topLayer = selLyrs[0];
                        for (var i = 1; i < selLyrs.length; i++) {
                            if (selLyrs[i].index < topLayer.index) topLayer = selLyrs[i];
                        }
                        nullLayer.moveBefore(topLayer);
                    }


                    // set in/out to match selected layers (if any were selected)
                    
                    if (selLyrs && selLyrs.length > 0) {
                        var inP = selLyrs[0].inPoint;
                        var outP = selLyrs[0].outPoint;
                        for (var s = 1; s < selLyrs.length; s++) {
                            inP = Math.min(inP, selLyrs[s].inPoint);
                            outP = Math.max(outP, selLyrs[s].outPoint);
                        }
                        try {
                            nullLayer.inPoint = inP;
                            nullLayer.outPoint = outP;
                        } catch (e) {}
                    }

                    // add checkbox on null
                    addReverseCheckboxIfMissing(nullLayer);
                } else {
                    // ensure checkbox exists
                    addReverseCheckboxIfMissing(nullLayer);
                }

                // add marker to null if missing
                var markNull = nullLayer.property("ADBE Marker");
                if (!markerExistsAtTime(markNull, t, comp)) {
                    markNull.setValueAtTime(t, new MarkerValue("AniMarker"));
                }

                // Now apply expression (that references the null) to each saved property
                for (var j = 0; j < propsInfo.length; j++) {
                    var info2 = propsInfo[j];
                    var prop2 = info2.prop;
                    var expr2 = buildNullExpression(info2.firstIdx, info2.lastIdx);
                    try {
                        prop2.expression = expr2;
                    } catch (e) {
                        alert("Could not set expression on property: " + prop2.name + "\n" + e.toString());
                    }
                }
            }

            app.endUndoGroup();
}

// Ham Randomize /////////////////////////////////////////////////

function randomProperty() {
        var rndWin = new Window("palette", "Randomize Properties", undefined, { resizeable: true });
        rndWin.orientation = "column";
        rndWin.alignChildren = ["fill", "top"];
        rndWin.margins = 8;

        // --- Panel checkboxes ---
        var propPanel = rndWin.add("panel", undefined, "Choose Properties");
        propPanel.orientation = "row";
        propPanel.alignChildren = ["fill", "top"];
        propPanel.margins = 8;

        // Bên trái: Position, Rotation, Opacity, Selected
        var leftGroup = propPanel.add("group");
        leftGroup.orientation = "column";
        leftGroup.alignChildren = ["left", "center"];
        leftGroup.margins = 3;

        var row1 = leftGroup.add("group");
        row1.orientation = "row";
        row1.alignChildren = ["left", "center"];
        row1.margins = 3;
        var chkPosition = row1.add("checkbox", undefined, "Position");
        var chkRotation = row1.add("checkbox", undefined, "Rotation");

        var row2 = leftGroup.add("group");
        row2.orientation = "row";
        row2.alignChildren = ["left", "center"];
        row2.margins = 3;
        var chkOpacity = row2.add("checkbox", undefined, "Opacity");
        var chkSelectedProps = row2.add("checkbox", undefined, "Selected");

        // Bên phải: Scale options (xếp column)
        var scalePanel = propPanel.add("panel", undefined, "Scale Options");
        scalePanel.orientation = "column";
        scalePanel.alignChildren = ["left", "top"];
        scalePanel.margins = 4;
        scalePanel.spacing = 8;
       

        var scaleGroup = scalePanel.add("group");
        scaleGroup.orientation = "row";
        scaleGroup.alignChildren = ["left", "center"];
        scaleGroup.margins = 4;
        scaleGroup.spacing = 8;

        var chkScale = scaleGroup.add("checkbox", undefined, "Scale");
        var scaleLinkChk = scaleGroup.add("checkbox", undefined, "Link");
        scaleLinkChk.value = true;

        // --- Slider group ---
        var sliderGroup = rndWin.add("group");
        sliderGroup.orientation = "row";
        sliderGroup.alignChildren = ["left", "center"];
        sliderGroup.margins = 3;

        sliderGroup.add("statictext", undefined, "Strength:");
        var strengthSlider = sliderGroup.add("slider", undefined, 50, 0, 100);
        strengthSlider.preferredSize = [220, 20];
        var strengthValue = sliderGroup.add("statictext", undefined, "50");
        strengthValue.preferredSize = [36, 20];
        strengthValue.justify = "center";

        // nội bộ: map 1–100 -> 50–1000 (dùng cho position/spacey props)
        function calcStrength(v) {
            return 50 + (v - 1) * (950 / 99);
        }

        strengthSlider.onChanging = function () {
            strengthValue.text = String(Math.round(strengthSlider.value));
        };

        // --- Apply button ---
        var applyBtn = rndWin.add("button", undefined, "Apply");

        applyBtn.onClick = function () {
            app.beginUndoGroup("Randomize Properties");

            var comp = app.project.activeItem;
            if (!(comp && comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            var userStrength = Math.round(strengthSlider.value);   // 0–100 (UI)
            var strength = userStrength;                           // dùng cho generic props (opacity, sliders...)
            var spatialStrength = calcStrength(Math.max(1, userStrength)); // dùng cho Position/TwoD/ThreeD to stronger effect
            var shiftHeld = ScriptUI.environment.keyboardState.shiftKey;

            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                try {
                    // Position: pass spatialStrength to make it stronger
                    if (chkPosition.value) {
                        applyRandom(layer.transform.position, "Position", spatialStrength, shiftHeld);
                    }
                    // Scale: pass normal strength for scale range logic (randomScaleRange expects 0-100)
                    if (chkScale.value) {
                        applyRandom(layer.transform.scale, "Scale", strength, shiftHeld, false, scaleLinkChk.value);
                    }
                    // Rotation
                    if (chkRotation.value) {
                        if (layer.threeDLayer) {
                            applyRandom(layer.transform.xRotation, "Rotation", strength, shiftHeld);
                            applyRandom(layer.transform.yRotation, "Rotation", strength, shiftHeld);
                            applyRandom(layer.transform.zRotation, "Rotation", strength, shiftHeld);
                        } else {
                            applyRandom(layer.transform.rotation, "Rotation", strength, shiftHeld);
                        }
                    }
                    // Opacity
                    if (chkOpacity.value) {
                        applyRandom(layer.transform.opacity, "Opacity", strength, shiftHeld, true);
                    }

                    // Selected properties: need to detect actual property type and call applyRandom accordingly
                    if (chkSelectedProps.value) {
                        var selProps = layer.selectedProperties;
                        for (var p = 0; p < selProps.length; p++) {
                            var prop = selProps[p];
                            if (prop.propertyValueType === PropertyValueType.NO_VALUE) {
                                // skip groups that aren't direct properties
                                continue;
                            }

                            // Detect specific types
                            var isOpacity = (prop.matchName === "ADBE Opacity");
                            var isScale = (prop.matchName === "ADBE Scale");
                            var isPosition = /Position/i.test(prop.matchName) || prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.ThreeD;

                            // choose strength: spatialStrength for spatial props, otherwise normal strength
                            var usedStrength = (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.ThreeD || /position/i.test(prop.matchName)) ? spatialStrength : strength;

                            if (isScale) {
                                // call as Scale, pass forceLinked from UI
                                applyRandom(prop, "Scale", usedStrength, shiftHeld, false, scaleLinkChk.value);
                            } else if (isOpacity) {
                                applyRandom(prop, "Opacity", usedStrength, shiftHeld, true, false);
                            } else if (isPosition) {
                                applyRandom(prop, "Position", usedStrength, shiftHeld);
                            } else {
                                // generic selected property
                                applyRandom(prop, "Selected", usedStrength, shiftHeld);
                            }
                        }
                    }

                } catch (e) {
                    // avoid stopping whole loop on one bad property
                    $.writeln("Randomizer error: " + e.toString());
                }
            }

            app.endUndoGroup();
        };

        rndWin.center();
        rndWin.show();
    }

    // --- Helper functions ---
    function randomOffset(strength) {
        return (Math.random() * 2 - 1) * strength;
    }

    function addArrays(a, b) {
        var result = [];
        for (var i = 0; i < a.length; i++) {
            result[i] = a[i] + (b[i] || 0);
        }
        return result;
    }

    function randomScaleRange(strength) {
        var min = 2;
        var max = 2000;
        var t = strength / 100;

        if (t <= 0) return 100;

        // slider = 50 => low = 10, high = 1000
        var low = 100 - (100 - 10) * t;
        var high = 100 + (max - 100) * t;

        return Math.floor(low + (high - low) * Math.random());
    }

    function applyRandom(prop, propType, strength, shiftHeld, isOpacity, forceLinked) {
        if (!prop) return;

        // --- Special handling for Scale (supports keyframes and non-keyed) ---
        if (propType === "Scale" || prop.matchName === "ADBE Scale") {
            // strength here is UI 0-100 for scaleRange
            if (prop.numKeys > 0) {
                for (var k = 1; k <= prop.numKeys; k++) {
                    var keyVal = prop.keyValue(k);
                    if (keyVal instanceof Array) {
                        if (forceLinked) {
                            var s = randomScaleRange(strength);
                            var newArr = [s, s];
                            if (keyVal.length > 2) newArr.push(s);
                            prop.setValueAtKey(k, newArr);
                        } else {
                            var a1 = randomScaleRange(strength);
                            var a2 = randomScaleRange(strength);
                            var a3 = keyVal.length > 2 ? randomScaleRange(strength) : undefined;
                            var setArr = [a1, a2];
                            if (a3 !== undefined) setArr.push(a3);
                            prop.setValueAtKey(k, setArr);
                        }
                    } else {
                        // single dimension scale
                        prop.setValueAtKey(k, randomScaleRange(strength));
                    }
                }
            } else {
                // no keyframes
                var curVal = prop.value;
                if (curVal instanceof Array) {
                    if (forceLinked) {
                        var s = randomScaleRange(strength);
                        var out = [s, s];
                        if (curVal.length > 2) out.push(s);
                        prop.setValue(out);
                    } else {
                        var s1 = randomScaleRange(strength);
                        var s2 = randomScaleRange(strength);
                        var s3 = curVal.length > 2 ? randomScaleRange(strength) : undefined;
                        var outArr = [s1, s2];
                        if (s3 !== undefined) outArr.push(s3);
                        prop.setValue(outArr);
                    }
                } else {
                    prop.setValue(randomScaleRange(strength));
                }
            }
            return;
        }

        // --- Generic handler for other types (handles keyframes too) ---
        var applyToVal = function (val, usedStrength, localIsOpacity) {
            if (val instanceof Array) {
                var offsetArr = [];
                // forceLinked handled above for scale; here we just random per-axis
                for (var j = 0; j < val.length; j++) offsetArr[j] = randomOffset(usedStrength);
                // colors need special clamp if propertyValueType is COLOR — detect via prop.propertyValueType above
                if (prop.propertyValueType === PropertyValueType.COLOR) {
                    var col = [];
                    for (var j = 0; j < val.length; j++) {
                        // treat strength as percent-ish for color: divide by 100 to get 0..1 offset
                        var off = offsetArr[j] / 255;
                        col[j] = Math.min(1, Math.max(0, val[j] + off));
                    }
                    return col;
                }
                return shiftHeld ? offsetArr : addArrays(val, offsetArr);
            } else {
                var newVal = shiftHeld ? randomOffset(usedStrength) : val + randomOffset(usedStrength);
                if (localIsOpacity) {
                    newVal = Math.min(100, Math.max(0, newVal));
                }
                return newVal;
            }
        };

        if (prop.numKeys > 0) {
            for (var kk = 1; kk <= prop.numKeys; kk++) {
                var kVal = prop.keyValue(kk);
                // choose usedStrength: for spatial properties we may have passed stronger strength
                var usedStrength = strength;
                var localIsOpacity = isOpacity === true;
                var newV = applyToVal(kVal, usedStrength, localIsOpacity);
                try {
                    prop.setValueAtKey(kk, newV);
                } catch (e) {
                    // some properties don't allow modifying key's value structure; ignore
                    $.writeln("Can't set key value for prop: " + prop.name + " (" + e.toString() + ")");
                }
            }
        } else {
            var v = prop.value;
            var newV = applyToVal(v, strength, isOpacity === true);
            try {
                prop.setValue(newV);
            } catch (e) {
                $.writeln("Can't set value for prop: " + prop.name + " (" + e.toString() + ")");
            }
        }
    }

// Ham Text Tools ////////////////////////////////////
function textToolsUI(thisObj) {

    function createTextBox() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Please select a composition");
        return;
    }
    if (comp.selectedLayers.length === 0) {
        alert("Please select a text layer");
        return;
    }

    app.beginUndoGroup("Create Box Shape");

    var selectedLayers = comp.selectedLayers.slice(); // clone list để không bị thay đổi
    for (var i = 0; i < selectedLayers.length; i++) {
        var textLayer = selectedLayers[i];

        if (!(textLayer instanceof TextLayer)) continue;

        // Tạo shape rỗng
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = "Box " + textLayer.name;
        shapeLayer.moveAfter(textLayer);
        // Sau khi tạo shape
        shapeLayer.threeDLayer = textLayer.threeDLayer;
        shapeLayer.transform.position.setValue(textLayer.transform.position.value);
        shapeLayer.transform.anchorPoint.setValue(textLayer.transform.anchorPoint.value);
        if (shapeLayer.threeDLayer == true) {
        shapeLayer.transform.orientation.setValue(textLayer.transform.orientation.value);
        shapeLayer.transform.xRotation.setValue(textLayer.transform.xRotation.value);
        shapeLayer.transform.yRotation.setValue(textLayer.transform.yRotation.value);
        shapeLayer.transform.zRotation.setValue(textLayer.transform.zRotation.value);
        } else {
        shapeLayer.transform.rotation.setValue(textLayer.transform.rotation.value);    
        }
        
        shapeLayer.parent = textLayer;

        if (shapeLayer.threeDLayer) {
        shapeLayer.transform.scale.setValue([100,100,100]);
        shapeLayer.transform.orientation.setValue([0,0,0]);
        shapeLayer.transform.xRotation.setValue(0);
        shapeLayer.transform.yRotation.setValue(0);
        shapeLayer.transform.zRotation.setValue(0);
        } else {
            shapeLayer.transform.scale.setValue([100,100]);
            shapeLayer.transform.rotation.setValue(0);
        }
        

        // Thêm Effect Controls
        var xMargin = shapeLayer.Effects.addProperty("ADBE Slider Control");
        xMargin.name = "X Margin";
        var yMargin = shapeLayer.Effects.addProperty("ADBE Slider Control");
        yMargin.name = "Y Margin";
        var offset = shapeLayer.Effects.addProperty("ADBE Point Control");
        offset.name = "Offset";
        offset.property("Point").setValue([0,0]);
        var specChar = shapeLayer.Effects.addProperty("ADBE Checkbox Control");
        specChar.name = "Spec_Character";
        specChar.property("Checkbox").setValue(1);

        // Expression string (không cần autoX / autoY)
        var expr =
            'xMargin = effect("X Margin")("Slider");\n' +
            'yMargin = effect("Y Margin")("Slider");\n' +
            'xOffset = effect("Offset")("Point")[0];\n' +
            'yOffset = effect("Offset")("Point")[1];\n' +
            'ignoreAD = effect("Spec_Character")("Checkbox");\n' +
            'par = parent.sourceRectAtTime(time);\n' +
            'boxLeft = par.left - xMargin + xOffset;\n' +
            'boxRight = par.left + par.width + xMargin + xOffset;\n' +
            'src = parent.text.sourceText;\n' +
            'if (ignoreAD == true) {\n' +
            '  textHeight = src.style.fontSize;\n' +
            '  if (src.style.autoLeading) {\n' +
            '    breakHeight = src.style.fontSize * 1.2;\n' +
            '  } else {\n' +
            '    breakHeight = src.style.leading;\n' +
            '  }\n' +
            '  breakCount = src.value.split(/[\\r\\n]/).length - 1;\n' +
            '  textLeading = breakHeight * breakCount;\n' +
            '  boxTop = -textHeight - yMargin + yOffset;\n' +
            '  boxBottom = textHeight/3 + textLeading + yMargin + yOffset;\n' +
            '} else {\n' +
            '  srcBox = parent.sourceRectAtTime(time);\n' +
            '  boxTop = srcBox.top - yMargin + yOffset;\n' +
            '  boxBottom = (srcBox.top + srcBox.height) + yMargin + yOffset;\n' +
            '}\n' +
            'createPath(points = [[boxLeft,boxTop],[boxRight,boxTop],[boxRight,boxBottom],[boxLeft,boxBottom]], inTangents = [], outTangents = [], isClosed = true);';

        // Tạo group + path + fill
        var contents = shapeLayer.property("Contents");
        var group = contents.addProperty("ADBE Vector Group");
        group.name = "Default Box";

        var pathGroup = group.property("Contents").addProperty("ADBE Vector Shape - Group");
        pathGroup.property("Path").expression = expr;

        var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([1, 0, 0]); // đỏ FF0000
    }

    app.endUndoGroup();
    }

    ////////// Ham Split TEXT //////////////////////////////////////////////////////////
function saveTransform(layer) {
    var origParent = layer.parent; 
    var saved;

    // Bỏ parent tạm thời để lấy transform trong world space
    if (origParent) {
        try { layer.parent = null; } catch (e) {}
    }

    // Lưu keyframe transform (nếu có)
    var transform = layer.property("Transform");
    var props = ["Anchor Point", "Position", "Scale", "Rotation"];
    if (layer.threeDLayer) {
        props = props.concat(["Orientation", "X Rotation", "Y Rotation", "Z Rotation"]);
    }
    var keysData = {};

    for (var p = 0; p < props.length; p++) {
        var prop = transform.property(props[p]);
        if (prop && prop.numKeys > 0) {
            keysData[props[p]] = [];
            for (var i = 1; i <= prop.numKeys; i++) {
                keysData[props[p]].push({
                    time: prop.keyTime(i),
                    value: prop.keyValue(i),
                    inInterp: prop.keyInInterpolationType(i),
                    outInterp: prop.keyOutInterpolationType(i),
                    inEase: prop.keyInTemporalEase(i),
                    outEase: prop.keyOutTemporalEase(i)
                });
            }

            // Freeze tại giá trị của keyframe đầu tiên
            var freezeVal = prop.keyValue(1);

            if (prop.name === "Scale") {
                if (prop.numKeys > 0) {
                    // Nếu là 2D → 2 chiều, nếu là 3D → 3 chiều
                    if (prop.value.length === 2) {
                        freezeVal = [100, 100];
                    } else {
                        freezeVal = [100, 100, 100];
                    }
                }
            }
            
            while (prop.numKeys > 0) prop.removeKey(1);
            prop.setValue(freezeVal);
        }
    }

    saved = {
        position: transform.property("Position").value,
        anchorPoint: transform.property("Anchor Point").value,
        scale: transform.property("Scale").value,
        rotation: transform.property("Rotation").value,
        orientation: layer.threeDLayer ? transform.property("Orientation").value : null,
        xRotation: layer.threeDLayer ? transform.property("X Rotation").value : null,
        yRotation: layer.threeDLayer ? transform.property("Y Rotation").value : null,
        zRotation: layer.threeDLayer ? transform.property("Z Rotation").value : null,
        parent: origParent,
        keys: keysData // lưu lại keyframe để restore sau
    };

    // Restore parent lại như cũ
    if (origParent) {
        try { layer.parent = origParent; } catch (e) {}
    }

    return saved;
}


function restoreTransform(layer, saved, mode) {
    layer.parent = null;
    var transform = layer.property("Transform");

    if (mode === "base") {
        if (saved.anchorPoint) transform.property("Anchor Point").setValue(saved.anchorPoint);
        if (saved.position)    transform.property("Position").setValue(saved.position);
    } 
    else if (mode === "final") {
        if (saved.scale)    transform.property("Scale").setValue(saved.scale);
        if (saved.rotation !== null) transform.property("Rotation").setValue(saved.rotation);

        if (layer.threeDLayer) {
            if (saved.orientation) transform.property("Orientation").setValue(saved.orientation);
            if (saved.xRotation !== null) transform.property("X Rotation").setValue(saved.xRotation);
            if (saved.yRotation !== null) transform.property("Y Rotation").setValue(saved.yRotation);
            if (saved.zRotation !== null) transform.property("Z Rotation").setValue(saved.zRotation);
        }
    }
    else if (mode === "reKey" && saved.keys) {
        for (var propName in saved.keys) {
            var prop = transform.property(propName);
            if (!prop) continue;

            var kfList = saved.keys[propName];
            if (kfList.length === 0) continue;

            for (var i = 0; i < kfList.length; i++) {
                var k = kfList[i];

                // ✅ Không cần delta, giữ nguyên giá trị gốc
                prop.setValueAtTime(k.time, k.value);

                var idx = prop.nearestKeyIndex(k.time);
                prop.setInterpolationTypeAtKey(idx, k.inInterp, k.outInterp);
                prop.setTemporalEaseAtKey(idx, k.inEase, k.outEase);
            }
        }
    }
}


function createRefLayer(orig, was3D) {
    // Chạy saveTransform trước
    var saved = saveTransform(orig);

    // Duplicate original layer to make a reference layer
    var refLayer = orig.duplicate();
    try { refLayer.name = orig.name + "_Line"; } catch (e) {}

    // --- Step 1: Unparent
    try { refLayer.parent = null; } catch (e) {}

    // --- Step 2: Nếu là 3D thì bỏ 3D ngay từ đầu
    if (was3D && refLayer.threeDLayer) {
        try { refLayer.threeDLayer = false; } catch (e) {}
    }

    // --- Step 3: Reset rotation về 0
    try { refLayer.transform.rotation.setValue(0); } catch (e) {}
    try { refLayer.transform.xRotation.setValue(0); } catch (e) {}
    try { refLayer.transform.yRotation.setValue(0); } catch (e) {}
    try { refLayer.transform.zRotation.setValue(0); } catch (e) {}

    // --- Step 3.5: Reset scale về 100%
    refLayer.transform.scale.setValue([100,100]);


    // --- Step 4: Lấy dữ liệu từ transform đã lưu
    var origPos = saved.position;       
    var origAnchor = saved.anchorPoint;

    // --- Step 5: Set anchor của refLayer về [0,0]
    try { refLayer.transform.anchorPoint.setValue([0,0]); } catch (e) {}

    // --- Step 6: Bù position = orig.position - orig.anchorPoint
    var refPos = [ origPos[0] - origAnchor[0],
                   origPos[1] - origAnchor[1] ];
    try { refLayer.transform.position.setValue(refPos); } catch (e) {}

    return refLayer;
}


function splitByLine(refLayer) {
    var comp = app.project.activeItem;
    if (!refLayer.property("Source Text")) {
        alert("Please select text layer.");
        return;
    }

    var fullTextDoc = refLayer.text.sourceText.value;
    var fullText = fullTextDoc.text.toString();
    var lines = fullText.split(/\r\n|\n|\r/);

    var basePos = refLayer.property("Transform").property("Position").value;

    var line0X; // giữ X của dòng đầu để áp cho tất cả
    var created = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // prefix từ đầu đến hết dòng i
        var tempPrefix = refLayer.duplicate();
        var tdPrefix = tempPrefix.text.sourceText.value;
        tdPrefix.text = lines.slice(0, i + 1).join("\r");
        tempPrefix.text.sourceText.setValue(tdPrefix);
        var prefixBBox = tempPrefix.sourceRectAtTime(comp.time, false);
        tempPrefix.remove();

        // layer cho dòng i
        var newLayer = refLayer.duplicate();
        var tdLine = newLayer.text.sourceText.value;
        tdLine.text = line; // giữ nguyên khoảng trắng đầu dòng
        newLayer.text.sourceText.setValue(tdLine);
        var lineBBox = newLayer.sourceRectAtTime(comp.time, false);

        // tính Y offset
        var lineY = basePos[1] + prefixBBox.top + prefixBBox.height - lineBBox.height - lineBBox.top;

        // X của dòng đầu tiên
        if (i === 0) {
            line0X = basePos[0] + prefixBBox.left - lineBBox.left;
        }

        var lineX = line0X;

        newLayer.property("Transform").property("Position").setValue([lineX, lineY]);
        created.push(newLayer);
    }
    // --- Chọn lại tất cả các layer đã tạo ---
    for (var j = 0; j < created.length; j++) {
        created[j].selected = true;
    }

    return created;
}

function splitByWords(refLayer) {
    var comp = refLayer.containingComp;
    var fullTextDoc = refLayer.text.sourceText.value;
    var fullText = fullTextDoc.toString();
    var just = fullTextDoc.justification;

    var created = [];
    var basePos = refLayer.property("Transform").property("Position").value;

    // toàn bộ bounding box để tham chiếu
    var fullBBox = refLayer.sourceRectAtTime(comp.time, false);

    // Tách tất cả từ (lưu start và end)
    var words = [];
    var regex = /\S+/g;
    var m;
    while ((m = regex.exec(fullText)) !== null) {
        words.push({
            text: m[0],
            start: m.index,
            end: m.index + m[0].length
        });
    }


    // ------------------------
    // CASE 1: LEFT JUSTIFY
    // ------------------------
    if (just == ParagraphJustification.LEFT_JUSTIFY) {
        for (var i = 0; i < words.length; i++) {
            var w = words[i];

            // đo prefix từ đầu -> hết từ hiện tại
            var tempLayer = refLayer.duplicate();
            var tempDoc = tempLayer.text.sourceText.value;
            tempDoc.text = fullText.substring(0, w.end);
            tempLayer.text.sourceText.setValue(tempDoc);
            var prefixBBox = tempLayer.sourceRectAtTime(comp.time, false);

            // layer từ hiện tại
            var newLayer = refLayer.duplicate();
            var newDoc = newLayer.text.sourceText.value;
            newDoc.text = w.text;
            newLayer.text.sourceText.setValue(newDoc);
            newLayer.name = w.text;

            var wordBBox = newLayer.sourceRectAtTime(comp.time, false);

            // vị trí X theo căn trái
            var wordX = basePos[0] + prefixBBox.left + prefixBBox.width - wordBBox.width - wordBBox.left;
            newLayer.property("Transform").property("Position").setValue([wordX, basePos[1]]);

            created.push(newLayer);
            tempLayer.remove();
        }
    }

    // ------------------------
    // CASE 2: RIGHT JUSTIFY (giữ logic gap cũ + neo mép phải chính xác)
    // ------------------------
    else if (just == ParagraphJustification.RIGHT_JUSTIFY) {
        var positions = []; // đây sẽ chứa 'desiredRight' cho từng từ (comp coord)

        // helper: đo bbox cho substring(fullText[start:end])
        function getBBoxForRange(start, end) {
            var tmp = refLayer.duplicate();
            var tdTmp = tmp.text.sourceText.value;
            tdTmp.text = fullText.substring(start, end);
            tmp.text.sourceText.setValue(tdTmp);
            var b = tmp.sourceRectAtTime(comp.time, false);
            tmp.remove();
            return b;
        }

        var n = words.length;
        if (n === 0) {
            // nothing
        } else {
            // bounding box toàn bộ câu để lấy mép phải chuẩn
            var fullPrefixBBox = refLayer.sourceRectAtTime(comp.time, false);
            var fullLeft = fullPrefixBBox.left;
            var fullWidth = fullPrefixBBox.width;
            var baseRight = basePos[0] + fullLeft + fullWidth; // mép phải của toàn đoạn (comp coord)

            // --- 1) Precompute prefix widths (width của substring từ 0 đến end của mỗi từ) ---
            var prefixWidths = new Array(n);
            for (var i = 0; i < n; i++) {
                var pbox = getBBoxForRange(0, words[i].end);
                prefixWidths[i] = pbox.width || 0;
            }

            // --- 2) desiredRight cho từng từ dựa trên prefix width (vẫn bám logic cũ) ---
            // desiredRight[i] = basePos.x + fullLeft + prefixWidths[i]
            for (var i = 0; i < n; i++) {
                positions[i] = basePos[0] + fullLeft + prefixWidths[i];
            }

            // --- 3) Tạo layer cho từng từ và đặt sao cho mép phải thực tế = positions[i] ---
            for (var j = 0; j < n; j++) {
                var newLayer = refLayer.duplicate();
                var newDoc = newLayer.text.sourceText.value;
                newDoc.text = words[j].text;
                newLayer.text.sourceText.setValue(newDoc);
                newLayer.name = words[j].text;

                // đo bbox của từ (isolate)
                var wordBBox = newLayer.sourceRectAtTime(comp.time, false);

                // đặt posX sao cho: posX + wordBBox.left + wordBBox.width === positions[j]
                var posX = Math.round((positions[j] - (wordBBox.left + wordBBox.width)) * 100) / 100;
                var posY = basePos[1];

                newLayer.property("Transform").property("Position").setValue([posX, posY]);

                created.push(newLayer);
            }
        }
    }


    // ------------------------
    // CASE 3: CENTER JUSTIFY (neo theo tâm đoạn full, spacing prefix-based)
    // ------------------------
    else if (just == ParagraphJustification.CENTER_JUSTIFY) {
        var positions = [];

        function getBBoxForRange(start, end) {
            var tmp = refLayer.duplicate();
            var tdTmp = tmp.text.sourceText.value;
            tdTmp.text = fullText.substring(start, end);
            tmp.text.sourceText.setValue(tdTmp);
            var b = tmp.sourceRectAtTime(comp.time, false);
            tmp.remove();
            return b;
        }

        var n = words.length;
        if (n === 0) {
            // nothing
        } else {
            var fullBBox = refLayer.sourceRectAtTime(comp.time, false);
            var fullLeft = fullBBox.left;
            var fullWidth = fullBBox.width;
            var fullCenter = basePos[0] + fullLeft + fullWidth / 2;

            // --- 1) prefixWidths cho từng từ ---
            var prefixWidths = new Array(n);
            for (var i = 0; i < n; i++) {
                var pbox = getBBoxForRange(0, words[i].end);
                prefixWidths[i] = pbox.width || 0;
            }

            // --- 2) desiredRight cho từng từ ---
            for (var i = 0; i < n; i++) {
                positions[i] = basePos[0] + fullLeft + prefixWidths[i];
            }

            // --- 3) Tạo layer cho từng từ ---
            for (var j = 0; j < n; j++) {
                var newLayer = refLayer.duplicate();
                var newDoc = newLayer.text.sourceText.value;
                newDoc.text = words[j].text;
                newLayer.text.sourceText.setValue(newDoc);
                newLayer.name = words[j].text;

                var wordBBox = newLayer.sourceRectAtTime(comp.time, false);
                var posX = Math.round((positions[j] - (wordBBox.left + wordBBox.width)) * 100) / 100;
                var posY = basePos[1];

                newLayer.property("Transform").property("Position").setValue([posX, posY]);
                created.push(newLayer);
            }

            // --- 4) Dịch toàn bộ cụm vào giữa ---
            var firstBBox = created[0].sourceRectAtTime(comp.time, false);
            var lastBBox = created[created.length - 1].sourceRectAtTime(comp.time, false);
            var clusterLeft = created[0].property("Transform").property("Position").value[0] + firstBBox.left;
            var clusterRight = created[created.length - 1].property("Transform").property("Position").value[0] + lastBBox.left + lastBBox.width;
            var clusterCenter = (clusterLeft + clusterRight) / 2;

            var shift = fullCenter - clusterCenter;
            for (var k = 0; k < created.length; k++) {
                var pos = created[k].property("Transform").property("Position").value;
                created[k].property("Transform").property("Position").setValue([pos[0] + shift, pos[1]]);
            }
        }
    }


////////////// // chọn các layer tạo ra
    for (var j = 0; j < created.length; j++) {
        created[j].selected = true;
    }

    return created;
}


function splitByCharacter(refLayer) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return;

    var fullTextDoc = refLayer.text.sourceText.value;
    var fullText = fullTextDoc.text;
    var just = fullTextDoc.justification;
    var basePos = refLayer.property("Transform").property("Position").value;
    var created = [];

    // helper đo bbox cho substring
    function getBBoxForRange(start, end) {
        var tmp = refLayer.duplicate();
        var tdTmp = tmp.text.sourceText.value;
        tdTmp.text = fullText.substring(start, end);
        tmp.text.sourceText.setValue(tdTmp);
        var b = tmp.sourceRectAtTime(comp.time, false);
        tmp.remove();
        return b;
    }

    var n = fullText.length;
    if (n === 0) return [];

    var positions = [];
    for (var i = 0; i < n; i++) {
        var prefixBBox = getBBoxForRange(0, i + 1);   // đo từ đầu tới ký tự i
        var charBBox   = getBBoxForRange(i, i + 1);   // đo riêng ký tự i

        var posX = basePos[0] + prefixBBox.width - charBBox.width - charBBox.left;
        positions[i] = posX;
    }

    // tạo layer mới cho từng ký tự
    for (var j = 0; j < n; j++) {
        var newLayer = refLayer.duplicate();
        var newDoc   = newLayer.text.sourceText.value;
        newDoc.text  = fullText[j];
        newLayer.text.sourceText.setValue(newDoc);
        newLayer.name = fullText[j];

        var posY = basePos[1];
        var posX = Math.round(positions[j] * 100) / 100;
        newLayer.property("Transform").property("Position").setValue([posX, posY]);

        created.push(newLayer);
    }

    // --- căn lại cả cụm ---
    if (created.length > 0) {
        var firstBBox = created[0].sourceRectAtTime(comp.time, false);
        var lastBBox  = created[created.length - 1].sourceRectAtTime(comp.time, false);
        var firstPos  = created[0].property("Transform").property("Position").value;
        var lastPos   = created[created.length - 1].property("Transform").property("Position").value;

        var clusterLeft   = firstPos[0] + firstBBox.left;
        var clusterRight  = lastPos[0] + lastBBox.left + lastBBox.width;
        var clusterCenter = (clusterLeft + clusterRight) / 2;

        var fullBBox = refLayer.sourceRectAtTime(comp.time, false);
        var fullLeft   = basePos[0] + fullBBox.left;
        var fullRight  = basePos[0] + fullBBox.left + fullBBox.width;
        var fullCenter = (fullLeft + fullRight) / 2;

        var shift = 0;
        if (just == ParagraphJustification.LEFT_JUSTIFY) {
            shift = fullLeft - clusterLeft;
        } else if (just == ParagraphJustification.RIGHT_JUSTIFY) {
            shift = fullRight - clusterRight;
        } else if (just == ParagraphJustification.CENTER_JUSTIFY) {
            shift = fullCenter - clusterCenter;
        }

        if (Math.abs(shift) > 0.0001) {
            for (var k = 0; k < created.length; k++) {
                var p = created[k].property("Transform").property("Position").value;
                created[k].property("Transform").property("Position").setValue([p[0] + shift, p[1]]);
            }
        }
    }
////////////// // chọn các layer tạo ra
    for (var j = 0; j < created.length; j++) {
        created[j].selected = true;
    }

    return created;
}
/////////////////////////////////////////////////

function cleanup(refLayer, orig, was3D, origParent, savedTransform) {
    var comp = refLayer.containingComp;
    orig.enabled = false;
    orig.selected = false;

    var created = comp.selectedLayers;

    // Bước 1: Restore Anchor Point + Position trước
    refLayer.threeDLayer = was3D; // đồng bộ 2D/3D
    restoreTransform(refLayer, savedTransform, "base");

    // parent vào refLayer
    for (var i = 0; i < created.length; i++) {
        var lyr = created[i];
        lyr.parent = refLayer;
        lyr.threeDLayer = was3D;
    }

    restoreTransform(refLayer, savedTransform, "final");
    
    // ✅ Đảm bảo chọn lại các layer cần match
    for (var i = 0; i < created.length; i++) {
        created[i].selected = true;
    }

    // Layer gốc được chọn cuối cùng
    orig.selected = true;

    // ✅ Gọi matchMAP
    try {
        matchMAP({ wrapUndo: false });
    } catch (e) {
        alert(e, "Match Error");
    }

    restoreTransform(orig, savedTransform, "reKey");
    
    for (var i = 0; i < created.length; i++) {
        restoreTransform(created[i], savedTransform, "reKey");
    }

     for (var j = 0; j < created.length; j++) {
            var lyr2 = created[j];
            lyr2.parent = origParent;

            if (was3D) {
                // convert orientation → rotation
                var ori = lyr2.transform.orientation.value;
                lyr2.transform.orientation.setValue([0,0,0]);
                lyr2.transform.xRotation.setValue(lyr2.transform.xRotation.value + ori[0]);
                lyr2.transform.yRotation.setValue(lyr2.transform.yRotation.value + ori[1]);
                lyr2.transform.zRotation.setValue(lyr2.transform.zRotation.value + ori[2]);
            }   
        }

    refLayer.remove();
}


function splitText(method) {
    app.beginUndoGroup("Split Text (" + method + ")");

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Select a composition with a text layer");
        return;
    }

    if (comp.selectedLayers.length === 0) {
        alert("Select at least one text layer");
        return;
    }

    var selectedLayers = comp.selectedLayers.slice(); // ✅ tạo bản sao danh sách
    var textLayers = [];

    for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i] instanceof TextLayer) {
            textLayers.push(selectedLayers[i]);
        }
    }

    if (textLayers.length === 0) {
        alert("Select at least one text layer");
        return;
    }

    for (var i = 0; i < textLayers.length; i++) {
        var orig = textLayers[i];
        var was3D = orig.threeDLayer;
        var origParent = orig.parent;
        var savedTransform = saveTransform(orig);

        var refLayer = createRefLayer(orig, was3D);

        if (method === "Line") {
            splitByLine(refLayer);
        } 
        else if (method === "Word") {
            var lineLayers = splitByLine(refLayer);
            var allWordLayers = [];
            for (var l = 0; l < lineLayers.length; l++) {
                var words = splitByWords(lineLayers[l]);
                allWordLayers = allWordLayers.concat(words);
            }
            for (var l = 0; l < lineLayers.length; l++) {
                try { lineLayers[l].remove(); } catch(e) {}
            }
            for (var w = 0; w < allWordLayers.length; w++) {
                allWordLayers[w].selected = true;
            }
        } 
        else if (method === "Character") {
            var lineLayers = splitByLine(refLayer);
            var allCharLayers = [];
            for (var l = 0; l < lineLayers.length; l++) {
                var words = splitByWords(lineLayers[l]);
                for (var j = 0; j < words.length; j++) {
                    var chars = splitByCharacter(words[j]);
                    allCharLayers = allCharLayers.concat(chars);
                    try { words[j].remove(); } catch(e) {}
                }
                try { lineLayers[l].remove(); } catch(e) {}
            }
            for (var c = 0; c < allCharLayers.length; c++) {
                allCharLayers[c].selected = true;
            }
        }

        cleanup(refLayer, orig, was3D, origParent, savedTransform);
    }

    app.endUndoGroup();
}

    // ========== XÂY DỰNG UI ==========
    function buildUI(thisObj) {
        
            var textToolsWindow;
            if (!textToolsWindow || !textToolsWindow.visible) {
                textToolsWindow = new Window("palette", "Text Tools Window", undefined, {resizeable:true});
                textToolsWindow.orientation = "column";
                textToolsWindow.alignChildren = ["fill","top"];

                // Nút Text Box
                var btnTextBox = textToolsWindow.add("button", undefined, "Text Box");
                btnTextBox.onClick = function() {
                    createTextBox();
                }

                // Panel Split Text
                var pnlSplit = textToolsWindow.add("panel", undefined, "Split Text");
                pnlSplit.orientation = "row";
                pnlSplit.alignChildren = ["left","center"];
                pnlSplit.margins = 8;
                pnlSplit.spacing = 8;

                // Nhóm radiobutton
                var grpRadios = pnlSplit.add("group");
                grpRadios.orientation = "column";
                grpRadios.alignChildren = "left";
                grpRadios.margins = 8;
                grpRadios.spacing = 8;

                var rdoLine = grpRadios.add("radiobutton", undefined, "By Line");
                var rdoWord = grpRadios.add("radiobutton", undefined, "By Word");
                var rdoChar = grpRadios.add("radiobutton", undefined, "By Character");

                // Mặc định chọn By Line
                rdoLine.value = true;

                // Nút Split
                var btnSplit = pnlSplit.add("button", undefined, "Split");
                btnSplit.onClick = function() {
                    if (rdoLine.value) {
                        splitText("Line");
                    } else if (rdoWord.value) {
                        splitText("Word");
                    } else if (rdoChar.value) {
                        splitText("Character");
                    }
                }

                textToolsWindow.center();
                textToolsWindow.show();
            } else {
                textToolsWindow.show();
                textToolsWindow.active = true; // focus lại nếu đã mở
            }
        

        return myPanel;
    }

    var myToolsPanel = buildUI(thisObj);
    if (myToolsPanel instanceof Window) {
        myToolsPanel.center();
        myToolsPanel.show();
    }
    
}

// Hàm DUP-Comp /////////////////////////////////
function duplicateCompWithPrecomps(comp, map) {
    // Nếu comp này đã được duplicate rồi → dùng lại
    if (map[comp.id]) return map[comp.id];

    // Tạo bản duplicate mới
    var newComp = comp.duplicate();
    newComp.name = comp.name + "_DUP";

    // Lưu lại vào map
    map[comp.id] = newComp;

    // Duyệt từng layer của comp mới
    for (var i = 1; i <= newComp.numLayers; i++) {
        var lyr = newComp.layer(i);

        if (lyr.source instanceof CompItem) {
            // Duplicate precomp con (hoặc dùng lại nếu đã có trong map)
            var preDup = duplicateCompWithPrecomps(lyr.source, map);
            lyr.replaceSource(preDup, false);
        }
    }

    return newComp;
}

function dupComp() {
    if (app.project.selection.length !== 1 || !(app.project.selection[0] instanceof CompItem)) {
        alert("Please select one comp in Project panel!");
        return;
    }

    app.beginUndoGroup("DUP-Comp with Precomps (smart)");

    var comp = app.project.selection[0];
    var map = {}; // <— đây là nơi lưu mapping comp gốc → comp duplicate
    var duplicated = duplicateCompWithPrecomps(comp, map);

    alert("Done: " + duplicated.name);

    app.endUndoGroup();
}


// Hàm Unprecomp ///////////////////////////////////////////////////////
    function findMenuId(name) {
        try { return app.findMenuCommandId(name); } catch(e){ return -1; }
    }

    var copyId = findMenuId("Copy");
    var pasteId = findMenuId("Paste");

    function clearSelection(comp) {
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
    }

    function removeUidMarkersFromComp(comp, uid) {
        try {
            for (var li = 1; li <= comp.numLayers; li++) {
                var L = comp.layer(li);
                var mp = L.property("Marker");
                if (!mp) continue;
                for (var k = mp.numKeys; k >= 1; k--) {
                    try {
                        var mv = mp.keyValue(k);
                        if (mv && ("" + mv.comment).indexOf(uid) !== -1) mp.removeKey(k);
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    function unPreCompMain() {
        app.beginUndoGroup("UnPreComp Safe Copy/Paste v2.2");

        var rootComp = app.project.activeItem;
        if (!(rootComp instanceof CompItem)) {
            alert("Comp is not active.");
            app.endUndoGroup();
            return;
        }

        var sel = rootComp.selectedLayers;
        if (!sel || sel.length === 0) {
            alert("At least 1 comp must be selected.");
            app.endUndoGroup();
            return;
        }

        for (var t = 0; t < sel.length; t++) {
            var preCompLayer = sel[t];
            if (!(preCompLayer.source instanceof CompItem)) continue;

            var srcComp = preCompLayer.source;
            var preStart = preCompLayer.startTime;
            var preStretch = preCompLayer.stretch;

            // --- Open source precomp
            srcComp.openInViewer();
            try { app.project.activeItem = srcComp; } catch(e){}

            // --- UID để đánh dấu
            var uid = "UNPRE_" + (new Date()).getTime() + "_" + Math.floor(Math.random() * 100000);

            // --- 1) prepare: save parent indices, unparent temporarily, add marker UID
            clearSelection(srcComp);
            var oldParentIndex = []; // store parent index (or null)
            var oldInPoint = []; // store in/out for precise placement
            var oldOutPoint = [];
            for (var li = 1; li <= srcComp.numLayers; li++) {
                var L = srcComp.layer(li);
                oldParentIndex[li] = (L.parent ? L.parent.index : null);
                try { L.parent = null; } catch(e){}
                // save original in/out points (inside srcComp)
                try { oldInPoint[li] = L.inPoint; } catch(e){ oldInPoint[li] = 0; }
                try { oldOutPoint[li] = L.outPoint; } catch(e){ oldOutPoint[li] = oldInPoint[li] + 1; }

                L.selected = true;
                try {
                    var mv = new MarkerValue(uid + "|" + li);
                    L.property("Marker").setValueAtTime(L.inPoint, mv);
                } catch(e){}
            }

            // --- 2) Copy all
            app.executeCommand(copyId);
            $.sleep(60);

            // --- 3) Restore parent back in source preComp (important)
            for (var li = 1; li <= srcComp.numLayers; li++) {
                try {
                    var L = srcComp.layer(li);
                    var pIdx = oldParentIndex[li];
                    if (pIdx && pIdx >= 1 && pIdx <= srcComp.numLayers) {
                        L.parent = srcComp.layer(pIdx);
                    } else {
                        L.parent = null;
                    }
                } catch(e){}
            }

            // --- 4) Remove the temporary markers from the source preComp (so source unchanged)
            removeUidMarkersFromComp(srcComp, uid);

            // --- 5) Switch back to root comp and select the original preComp layer (so paste lands above it)
            rootComp.openInViewer();
            try { app.project.activeItem = rootComp; } catch(e){}
            clearSelection(rootComp);
            preCompLayer.selected = true;

            // --- 6) Paste
            app.executeCommand(pasteId);
            $.sleep(80);

            // --- 7) Find pasted layers by marker UID (markers are in clipboard and thus in pasted layers)
            var pastedLayers = [];
            var mapOldToNew = {}; // oldIndex -> newLayer
            for (var li = 1; li <= rootComp.numLayers; li++) {
                var L = rootComp.layer(li);
                var mp = L.property("Marker");
                if (!mp) continue;
                for (var k = 1; k <= mp.numKeys; k++) {
                    try {
                        var mv = mp.keyValue(k);
                        if (mv && ("" + mv.comment).indexOf(uid) !== -1) {
                            var oldIdx = parseInt( (""+mv.comment).split("|")[1], 10 );
                            if (!isNaN(oldIdx)) {
                                pastedLayers.push(L);
                                mapOldToNew[oldIdx] = L;
                            }
                            break;
                        }
                    } catch(e){}
                }
            }

            if (pastedLayers.length === 0) {
                // nothing pasted or detection failed; continue safely
                continue;
            }

            // --- 8) Sort pastedLayers by oldIndex ascending (to respect original order)
            pastedLayers.sort(function(a,b){
                var aOld = parseInt(a.property("Marker").keyValue(1).comment.split("|")[1],10);
                var bOld = parseInt(b.property("Marker").keyValue(1).comment.split("|")[1],10);
                return aOld - bOld;
            });

            // --- 9) PRECISE placement: dịch nguyên cụm, giữ nguyên in/out relative ---
            var srcDisplayStart = (typeof srcComp.displayStartTime === "number") ? srcComp.displayStartTime : 0;
            var groupOffset = preStart - srcDisplayStart; // phần bù từ displayStart của precomp tới vị trí precomp trong root

            for (var oldIdx in mapOldToNew) {
                if (!mapOldToNew.hasOwnProperty(oldIdx)) continue;
                var newL = mapOldToNew[oldIdx];
                var idx = parseInt(oldIdx, 10);

                var origIn = (typeof oldInPoint[idx] !== "undefined") ? oldInPoint[idx] : 0;
                var origOut = (typeof oldOutPoint[idx] !== "undefined") ? oldOutPoint[idx] : (origIn + 1);
                var duration = origOut - origIn;

                try {
                    // vị trí mong muốn trong root comp (giữ nguyên vị trí tương đối so với precomp start)
                    var desiredIn  = preStart + (origIn  + srcDisplayStart);
                    var desiredOut = desiredIn + duration;

                    // delta giữa chỗ pasted layer đang đứng và chỗ nó nên đứng
                    var currentIn = (typeof newL.inPoint === "number") ? newL.inPoint : 0;
                    var delta = desiredIn - currentIn;

                    // dịch layer theo delta — giữ nguyên khoảng cách in/out (chỉ thay đổi absolute times)
                    try { newL.startTime += delta; } catch(e){}
                    try { newL.inPoint   = desiredIn; } catch(e){}
                    try { newL.outPoint  = desiredOut; } catch(e){}

                    // LƯU Ý: ở đây **không** thay đổi newL.stretch. Nếu bạn muốn áp stretch của precomp,
                    // bật dòng dưới (nhưng theo yêu cầu hiện tại bạn không muốn đổi):
                    // try { newL.stretch = (newL.stretch * preStretch) / 100; } catch(e){}

                } catch(e){}
            }


            // --- 10) Create null AFTER placing group, set startTime to preCompLayer.startTime
            var nullLayer = rootComp.layers.addNull();
            nullLayer.name = srcComp.name + "_CTRL";
            nullLayer.startTime = preStart;



            // --- 11) Restore parent relationships for pasted layers:
            // if old parent was also pasted -> parent to corresponding new layer
            // otherwise parent to null
            for (var oldIdx in mapOldToNew) {
                if (!mapOldToNew.hasOwnProperty(oldIdx)) continue;
                var newL = mapOldToNew[oldIdx];
                var pIdx = oldParentIndex[oldIdx];
                if (pIdx && mapOldToNew[pIdx]) {
                    try { newL.parent = mapOldToNew[pIdx]; } catch(e){}
                } else {
                    try { newL.parent = nullLayer; } catch(e){}
                }
            }

            // --- 12) Move null just above the pasted group
            var minIndex = rootComp.numLayers + 1;
            for (var i = 0; i < pastedLayers.length; i++) {
                try { if (pastedLayers[i].index < minIndex) minIndex = pastedLayers[i].index; } catch(e){}
            }
            try { nullLayer.moveBefore(rootComp.layer(minIndex)); } catch(e){}


            // --- 13) Remove UID markers from pasted layers (tidy)
            for (var i = 0; i < pastedLayers.length; i++) {
                var L = pastedLayers[i];
                var mp = L.property("Marker");
                if (!mp) continue;
                for (var k = mp.numKeys; k >= 1; k--) {
                    try {
                        var mv = mp.keyValue(k);
                        if (mv && ("" + mv.comment).indexOf(uid) !== -1) mp.removeKey(k);
                    } catch(e){}
                }
            }

            // --- 14) finally remove the original preComp layer in root comp
            try { preCompLayer.remove(); } catch(e){}

        } // end for each selected precomp

        app.endUndoGroup();
    }

// Ham Select Path ////////////////////////////////////////////////////
    function runShowPathWithMasks() {
        // Original ShowPathWithMasks.jsx logic (kept intact)
        app.beginUndoGroup("Show Shape/Mask Paths");

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("At least 1 layer must be selected.");
            app.endUndoGroup();
            return;
        }

        var selLayers = comp.selectedLayers;
        if (!selLayers || selLayers.length === 0) {
            alert("At least 1 layer must be selected.");
            app.endUndoGroup();
            return;
        }

        // Clear previous selection to avoid noise
        try { comp.selectedProperties = []; } catch (e) { }

        var found = false;
        var foundProps = [];

        // Recursive search for path properties
        function recurseFind(group) {
            if (!group || !group.numProperties) return;
            for (var k = 1; k <= group.numProperties; k++) {
                var p = group.property(k);
                if (!p) continue;
                try {
                    var m = p.matchName || "";
                    // Shape path OR Mask path
                    if (m === "ADBE Vector Shape" || m === "ADBE Mask Shape") {
                        found = true;
                        foundProps.push(p);
                        // Select property
                        try { p.selected = true; } catch (e) { }
                        // Expand/select all parents so timeline will show them
                        var parent = p.parentProperty;
                        while (parent) {
                            try { parent.selected = true; } catch (e) { }
                            parent = parent.parentProperty;
                        }
                    }
                } catch (e) { }
                // Recurse into groups
                try {
                    if (p.numProperties && p.numProperties > 0) recurseFind(p);
                } catch (e) { }
            }
        }

        for (var i = 0; i < selLayers.length; i++) {
            var layer = selLayers[i];
            try {
                var masks = layer.property("ADBE Mask Parade");
                if (masks) recurseFind(masks);
            } catch (e) { }
            try {
                recurseFind(layer);
            } catch (e) { }
        }

        if (foundProps.length > 0) {
            try { comp.selectedProperties = foundProps; } catch (e) { }
        }

        if (!found) {
            alert("Do not find property Path (Shape/Mask) in selected layers.");
        }

        app.endUndoGroup();
    }

// Ham Control Path //////////////////////////////////////////////////////
    function runFullNullControlPath() {
        // We'll run the original logic exactly as provided, encapsulated here.
        (function pointsFollowNullsWithCenteredAnchor() {

            function getActiveComp() {
                var comp = app.project.activeItem;
                if (!comp || !(comp instanceof CompItem)) {
                    alert("Error: Please select a composition.");
                    return null;
                }
                return comp;
            }

            function getSelectedLayers(comp) {
                return comp.selectedLayers;
            }

            function createNull(targetComp) {
                return targetComp.layers.addNull();
            }

            function getSelectedProperties(layer) {
                var props = layer.selectedProperties;
                if (!props || props.length < 1) return null;
                return props;
            }

            function matchMatchName(effect, matchNameString) {
                return (effect && effect.matchName === matchNameString) ? effect : null;
            }

            function getPropPath(prop, pathHierarchy) {
                var pathPath = "";
                while (prop.parentProperty !== null) {
                    if (prop.parentProperty.propertyType === PropertyType.INDEXED_GROUP) {
                        pathHierarchy.unshift(prop.propertyIndex);
                        pathPath = "(" + prop.propertyIndex + ")" + pathPath;
                    } else {
                        pathPath = "(\"" + prop.matchName.toString() + "\")" + pathPath;
                    }
                    prop = prop.parentProperty;
                }
                return pathPath;
            }

            function getPathPoints(path) {
                return path.value.vertices;
            }

            function forEachPath(fn) {
                var comp = getActiveComp();
                if (!comp) return;

                var selectedLayers = getSelectedLayers(comp);
                if (!selectedLayers || selectedLayers.length === 0) {
                    alert("Error: Please select at least one layer.");
                    return;
                }

                var selectedPaths = [];
                var parentLayers = [];
                for (var li = 0; li < selectedLayers.length; li++) {
                    var layer = selectedLayers[li];
                    var paths = getSelectedProperties(layer);
                    if (!paths) continue;

                    for (var pi = 0; pi < paths.length; pi++) {
                        var pathProp = paths[pi];
                        var isShapePath = matchMatchName(pathProp, "ADBE Vector Shape");
                        var isMaskPath = matchMatchName(pathProp, "ADBE Mask Shape");
                        if (isShapePath || isMaskPath) {
                            selectedPaths.push(pathProp);
                            parentLayers.push(layer);
                        }
                    }
                }

                if (selectedPaths.length === 0) {
                    alert("Error: No paths selected.");
                    return;
                }

                for (var p = 0; p < selectedPaths.length; p++) {
                    fn(comp, parentLayers[p], selectedPaths[p]);
                }
            }

            function linkPointsToNulls() {
                app.beginUndoGroup("Link Path Points to Nulls (center anchor)");

                forEachPath(function (comp, selectedLayer, path) {
                    var pathHierarchy = [];
                    var pathPath = getPropPath(path, pathHierarchy);

                    var nullSet = [];
                    var pathPoints = getPathPoints(path);

                    for (var i = 0; i < pathPoints.length; i++) {
                        var nullName = selectedLayer.name + ": " + path.parentProperty.name + " [" + pathHierarchy.join(".") + "." + i + "]";
                        nullSet.push(nullName);

                        if (comp.layer(nullName) == undefined) {
                            // tạo null và đặt tên
                            var newNull = createNull(comp);
                            newNull.moveBefore(selectedLayer);
                            newNull.name = nullName;
                            newNull.label = 11;

                            // Thêm Angle Control "Control Left"
                            var angleLeft = newNull.Effects.addProperty("ADBE Angle Control");
                            angleLeft.name = "Control Left";

                            // Thêm Angle Control "Control Right"
                            var angleRight = newNull.Effects.addProperty("ADBE Angle Control");
                            angleRight.name = "Control Right";

                            // --- THÊM 2 CHECKBOX CONTROL MẶC ĐỊNH FALSE ---
                            var chkDisableScale = newNull.Effects.addProperty("ADBE Checkbox Control");
                            chkDisableScale.name = "Disable Scale Control";
                            try { chkDisableScale.property(1).setValue(0); } catch (e) { }

                            var chkDisableRot = newNull.Effects.addProperty("ADBE Checkbox Control");
                            chkDisableRot.name = "Disable Rotation Control";
                            try { chkDisableRot.property(1).setValue(0); } catch (e) { }
                            // --- KẾT THÚC THÊM CHECKBOX ---

                            // --- bake vị trí tại điểm path (comp-space) ---
                            newNull.position.expression =
                                "var srcLayer = thisComp.layer(\"" + selectedLayer.name + "\");\r" +
                                "var srcPath = srcLayer" + pathPath + ".points()[" + i + "];\r" +
                                "srcLayer.toComp(srcPath);";
                            // ép evaluate và đóng băng giá trị vị trí
                            newNull.position.setValue(newNull.position.value);
                            newNull.position.expression = '';

                            // --- LƯU vị trí thế giới hiện tại của null (anchor hiện tại) ---
                            var oldWorldPos = newNull.position.value;

                            // --- Tính và đặt anchor vào giữa layer ---
                            var s = newNull.sourceRectAtTime(0, false);
                            var centerAnchor = [s.left + s.width / 2, s.top + s.height / 2];
                            newNull.anchorPoint.setValue(centerAnchor);

                            // --- Tính toạ độ thế giới của anchor mới ---
                            newNull.position.expression = "thisLayer.toComp(thisLayer.anchorPoint);";
                            var newAnchorWorld = newNull.position.value;
                            newNull.position.expression = '';

                            // --- Điều chỉnh position ---
                            var deltaX = oldWorldPos[0] - newAnchorWorld[0];
                            var deltaY = oldWorldPos[1] - newAnchorWorld[1];
                            var correctedPos = [oldWorldPos[0] + deltaX, oldWorldPos[1] + deltaY];
                            newNull.position.setValue(correctedPos);

                            // kết thúc: null nằm đúng trên điểm path và anchor ở giữa
                        }
                    }

                    // Link/add Layer Control effects (giữ nguyên logic cũ)
                    var existingEffects = [];
                    var effParade = selectedLayer.property("ADBE Effect Parade");
                    if (effParade) {
                        for (var e = 1; e <= effParade.numProperties; e++) {
                            var eff = effParade.property(e);
                            if (matchMatchName(eff, "ADBE Layer Control")) {
                                existingEffects.push(eff.name);
                            }
                        }
                    }

                    for (var n = 0; n < nullSet.length; n++) {
                        if (existingEffects.join("|").indexOf(nullSet[n]) != -1) {
                            selectedLayer.property("ADBE Effect Parade")(nullSet[n]).property("ADBE Layer Control-0001").setValue(comp.layer(nullSet[n]).index);
                        } else {
                            var newControl = selectedLayer.property("ADBE Effect Parade").addProperty("ADBE Layer Control");
                            newControl.name = nullSet[n];
                            newControl.property("ADBE Layer Control-0001").setValue(comp.layer(nullSet[n]).index);
                        }
                    }

                    // Set path expression (có thêm điều khiển bằng Control Left / Right)
                    path.expression =
                        "var nullLayerNames = [\"" + nullSet.join("\",\"") + "\"];\r" +
                        "var origPath = thisProperty;\r" +
                        "var origPoints = origPath.points();\r" +
                        "var origInTang = origPath.inTangents();\r" +
                        "var origOutTang = origPath.outTangents();\r" +
                        "function rotateVec(vec, ang){\r" +
                        "    var cosA = Math.cos(ang);\r" +
                        "    var sinA = Math.sin(ang);\r" +
                        "    return [vec[0]*cosA - vec[1]*sinA, vec[0]*sinA + vec[1]*cosA];\r" +
                        "}\r" +
                        "for (var i = 0; i < nullLayerNames.length; i++){\r" +
                        "    var nLayer = thisComp.layer(nullLayerNames[i]);\r" +
                        "    if (nLayer != null && nLayer.index != thisLayer.index){\r" +
                        "        var p = nLayer.toComp(nLayer.anchorPoint);\r" +
                        "        origPoints[i] = fromCompToSurface(p);\r" +

                        // read checkboxes safely, skip if not present
                        "        var disableScale = false;\r" +
                        "        var disableRot = false;\r" +
                        "        if (nLayer.effect && nLayer.effect(\"Disable Scale Control\") != null) {\r" +
                        "            disableScale = (nLayer.effect(\"Disable Scale Control\")(\"Checkbox\") == 1);\r" +
                        "        }\r" +
                        "        if (nLayer.effect && nLayer.effect(\"Disable Rotation Control\") != null) {\r" +
                        "            disableRot = (nLayer.effect(\"Disable Rotation Control\")(\"Checkbox\") == 1);\r" +
                        "        }\r" +

                        // apply layer rotation only if not disabled
                        "        if (!disableRot) {\r" +
                        "            var rot = degreesToRadians(nLayer.rotation);\r" +
                        "            origInTang[i] = rotateVec(origInTang[i], rot);\r" +
                        "            origOutTang[i] = rotateVec(origOutTang[i], rot);\r" +
                        "        }\r" +

                        // apply scale only if not disabled
                        "        if (!disableScale) {\r" +
                        "            var scaleX = nLayer.scale[0] / 100;\r" +
                        "            origInTang[i][0] *= scaleX;\r" +
                        "            origInTang[i][1] *= scaleX;\r" +
                        "            var scaleY = nLayer.scale[1] / 100;\r" +
                        "            origOutTang[i][0] *= scaleY;\r" +
                        "            origOutTang[i][1] *= scaleY;\r" +
                        "        }\r" +

                        // angle controls (applied if present)
                        "        if (nLayer.effect && nLayer.effect(\"Control Left\") != null) {\r" +
                        "            var angLeft = degreesToRadians(nLayer.effect(\"Control Left\")(\"Angle\"));\r" +
                        "            origInTang[i] = rotateVec(origInTang[i], angLeft);\r" +
                        "        }\r" +
                        "        if (nLayer.effect && nLayer.effect(\"Control Right\") != null) {\r" +
                        "            var angRight = degreesToRadians(nLayer.effect(\"Control Right\")(\"Angle\"));\r" +
                        "            origOutTang[i] = rotateVec(origOutTang[i], angRight);\r" +
                        "        }\r" +
                        "    }\r" +
                        "}\r" +
                        "createPath(origPoints,origInTang,origOutTang,origPath.isClosed());";

                });

                app.endUndoGroup();
            }

            linkPointsToNulls();

        })();
    }

// Ham Motion Path ///////////////////////////////////////////////////
    function esc(s) {
        return s.replace(/\"/g, '\\"');
    }

    function ensureSlider(layer) {
    var effects = layer.property("ADBE Effect Parade");
    if (!effects) return null;

    // --- ensure Motion Control (Slider) ---
    var ctrl = effects.property("Motion Control");
    if (!ctrl) {
        ctrl = effects.addProperty("ADBE Slider Control");
        ctrl.name = "Motion Control";
    }

    var slider = ctrl.property("ADBE Slider Control-0001") || ctrl.property(1);
    if (!slider) return ctrl;

    try {
        var comp = layer.containingComp;
        var inPoint = layer.inPoint;
        var frameDur = 1 / comp.frameRate;
        var t1 = inPoint;
        var t2 = inPoint + 30 * frameDur;

        slider.setValueAtTime(t1, 0);
        slider.setValueAtTime(t2, 100);

        if (typeof slider.setMinMaxValue === "function") {
            try { slider.setMinMaxValue(0, 100); } catch(e) {}
        }
    } catch(e) {}

    return ctrl;
    }

    function ensureAutoOrient(layer) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) return null;

        var orientCtrl = effects.property("Auto Orientation");
        if (!orientCtrl) {
            orientCtrl = effects.addProperty("ADBE Checkbox Control");
            orientCtrl.name = "Auto Orientation";
            var cb = orientCtrl.property("ADBE Checkbox Control-0001") || orientCtrl.property(1);
            var cbAttempts = 0;
            while (!cb && cbAttempts < 8) {
                try { $.sleep(30); } catch(e){}
                cb = orientCtrl.property("ADBE Checkbox Control-0001") || orientCtrl.property(1);
                cbAttempts++;
            }
            if (cb) {
                try { cb.setValue(1); } catch(e){}
            }
        } else {
            try {
                var cbExists = orientCtrl.property("ADBE Checkbox Control-0001") || orientCtrl.property(1);
                if (cbExists && (cbExists.value === undefined || cbExists.value === null)) {
                    try { cbExists.setValue(1); } catch(e){}
                }
            } catch(e){}
        }

        return orientCtrl;
    }

    function motionPath() {
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please open a composition and select layers.");
            return;
        }

        var selLayers = comp.selectedLayers;
        if (!selLayers || selLayers.length < 2) {
            alert("Select at least one target layer and a path layer as the last selected layer.");
            return;
        }

        // check Shift key state
        var shiftPressed = ScriptUI.environment.keyboardState.shiftKey;

        app.beginUndoGroup("Apply Motion Path 1.3 (Modified)");

        try {
            var pathLayer = selLayers[selLayers.length - 1];

            // check path property
            var pathProps = pathLayer.selectedProperties;
            if (!pathProps || pathProps.length === 0) {
                alert("Last selected layer must have a Mask Path or Shape Path selected.");
                app.endUndoGroup();
                return;
            }

            var pathProp = pathProps[pathProps.length - 1];
            if (!(pathProp.matchName === "ADBE Mask Shape" || pathProp.matchName === "ADBE Vector Shape")) {
                alert("Last selected property must be a Mask Path or a Shape Path.");
                app.endUndoGroup();
                return;
            }

            // nếu KHÔNG giữ shift → add slider vào pathLayer như cũ
            if (!shiftPressed) {
                ensureSlider(pathLayer);
            }

            // build expression string for Position
            function buildPosExpr(targetLayer) {
                var expr = "pathLayer = thisComp.layer(\"" + esc(pathLayer.name) + "\");\n";
                if (pathProp.matchName === "ADBE Mask Shape") {
                    var maskGroup = pathProp.parentProperty;
                    expr += "path = pathLayer.mask(\"" + esc(maskGroup.name) + "\").maskPath;\n";
                } else {
                    var chain = "";
                    var cur = pathProp.parentProperty;
                    while (cur && cur.parentProperty && cur.parentProperty !== pathLayer) {
                        if (String(cur.name) !== "Contents") chain = '.content(\"'+esc(cur.name)+'\")'+chain;
                        cur = cur.parentProperty;
                    }
                    expr += "path = pathLayer" + chain + ".path;\n";
                }

                if (shiftPressed) {
                    expr += "ctrl = thisLayer.effect(\"Motion Control\")(\"Slider\");\n";
                } else {
                    expr += "ctrl = pathLayer.effect(\"Motion Control\")(\"Slider\");\n";
                }

                expr += "t = ctrl/100;\n";
                expr += "if (path.isClosed()){ t=t%1; if(t<0) t+=1; } else { if(t<0){t=1+(t%1); if(t===1)t=0;} if(t>1){t=t%1; if(t===0)t=1;} t=Math.min(Math.max(t,0),1); }\n";
                expr += "p = path.pointOnPath(t);\n";
                expr += "pos = pathLayer.toComp(p);\n";
                expr += "ox = effect(\"Offset X\")(\"Slider\");\n";
                expr += "oy = effect(\"Offset Y\")(\"Slider\");\n";
                expr += "[pos[0]+ox,pos[1]+oy];";
                return expr;
            }

            function buildRotExpr(targetLayer) {
                var expr = "pathLayer = thisComp.layer(\"" + esc(pathLayer.name) + "\");\n";
                expr += "targetLayer = thisLayer;\n";
                expr += "useOrient = targetLayer.effect(\"Auto Orientation\")(\"Checkbox\");\n";
                expr += "if(useOrient==1){\n";
                if (shiftPressed) {
                    expr += "  ctrl = thisLayer.effect(\"Motion Control\")(\"Slider\");\n";
                } else {
                    expr += "  ctrl = pathLayer.effect(\"Motion Control\")(\"Slider\");\n";
                }
                expr += "  path=(function(){\n";
                if (pathProp.matchName === "ADBE Mask Shape") {
                    var maskGroup2 = pathProp.parentProperty;
                    expr += "    return pathLayer.mask(\"" + esc(maskGroup2.name) + "\").maskPath;\n";
                } else {
                    var chain2 = "";
                    var cur2 = pathProp.parentProperty;
                    while (cur2 && cur2.parentProperty && cur2.parentProperty !== pathLayer) {
                        if (String(cur2.name)!=="Contents") chain2 = '.content(\"'+esc(cur2.name)+'\")'+chain2;
                        cur2 = cur2.parentProperty;
                    }
                    expr += "    return pathLayer"+chain2+".path;\n";
                }
                expr += "  })();\n";
                expr += "  t = ctrl/100;\n";
                expr += "  if(path.isClosed()){ t=t%1; if(t<0)t+=1; } else { if(t<0){t=1+(t%1); if(t===1)t=0;} if(t>1){t=t%1; if(t===0)t=1;} t=Math.min(Math.max(t,0),1); }\n";
                expr += "  if(t==0) t=0.001; if(t==1)t=0.999;\n";
                expr += "  delta=0.001;\n";
                expr += "  t1=Math.min(t+delta,1);\n";
                expr += "  p1=path.pointOnPath(t);\n";
                expr += "  p2=path.pointOnPath(t1);\n";
                expr += "  v = p2 - p1;\n";
                expr += "  look = radiansToDegrees(Math.atan2(v[1],v[0]));\n";
                expr += "  look + value + pathLayer.transform.rotation;\n";
                expr += "} else { value + pathLayer.transform.rotation; }";
                return expr;
            }

            var appliedCount = 0;
            for(var i=0;i<selLayers.length-1;i++){
                var target = selLayers[i];

                // ensure Offset X/Y
                var tEffects = target.property("ADBE Effect Parade");
                if(tEffects){
                    if(!tEffects.property("Offset X")){
                        var offX = tEffects.addProperty("ADBE Slider Control");
                        offX.name="Offset X";
                        var oxProp = offX.property("ADBE Slider Control-0001")||offX.property(1);
                    }
                    if(!tEffects.property("Offset Y")){
                        var offY = tEffects.addProperty("ADBE Slider Control");
                        offY.name="Offset Y";
                        var oyProp = offY.property("ADBE Slider Control-0001")||offY.property(1);
                    }
                }

                // nếu shiftPressed thì add Motion Control cho từng target
                if (shiftPressed) {
                    ensureSlider(target);
                }

                // ensure Auto Orientation on target
                ensureAutoOrient(target);

                // set position expression
                target.property("ADBE Transform Group").property("ADBE Position").expression = buildPosExpr(target);

                // set rotation expression
                var rotProp = target.property("ADBE Transform Group").property("ADBE Rotate Z");
                if(rotProp && rotProp.canSetExpression){
                    rotProp.expression = buildRotExpr(target);
                }

                appliedCount++;
            }

            if(appliedCount===0) alert("No valid target layers found.");
        }
        catch(err){
            alert("Error: "+err.toString());
        }
        finally{
            app.endUndoGroup();
        }
    }

// Hàm merge shape ///////////////////////////////////////////////////////
function mergeShape() {
    app.beginUndoGroup("Merge Shape Layers - Improved");

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Please open a composition and select shape layers.");
        return;
    }

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) {
        alert("Please select at least one Shape Layer.");
        return;
    }

    // Helper: ensure 2-element arrays for 2D properties
    function safe2D(v) {
        try {
            if (v instanceof Array) {
                if (v.length >= 2) return [v[0], v[1]];
                if (v.length === 1) return [v[0], v[0]];
            }
        } catch (e) {}
        return [0, 0];
    }

    // Helper: copy simple value or nested properties from srcProp to dstProp
    function copyPropValue(srcProp, dstProp) {
        if (!srcProp || !dstProp) return;
        // If property has sub-properties, copy them by name when possible
        try {
            if (srcProp.numProperties && srcProp.numProperties > 0) {
                for (var s = 1; s <= srcProp.numProperties; s++) {
                    var sp = srcProp.property(s);
                    if (!sp) continue;
                    var dp = dstProp.property(sp.name);
                    if (dp && sp && sp.value !== undefined) {
                        try { dp.setValue(sp.value); } catch (e) {}
                    }
                }
            } else if (srcProp.value !== undefined) {
                try { dstProp.setValue(srcProp.value); } catch (e) {}
            }
        } catch (e) {}
    }

    // Recursive copy: copy all items under a "Contents" PropertyGroup from srcContents -> dstContents
    function copyContentsRecursive(srcContents, dstContents) {
        if (!srcContents || !dstContents) return;

        for (var i = 1; i <= srcContents.numProperties; i++) {
            var srcItem = srcContents.property(i);
            if (!srcItem) continue;

            // Skip disabled items (optional)
            if (srcItem.enabled === false) continue;

            // If it's a Vector Group, create a corresponding Vector Group and recurse
            if (srcItem.matchName === "ADBE Vector Group") {
                var createdGroup = null;
                try {
                    createdGroup = dstContents.addProperty("ADBE Vector Group");
                    createdGroup.name = srcItem.name || createdGroup.name;
                } catch (e) {
                    // if cannot add group, skip
                    createdGroup = null;
                }
                if (createdGroup) {
                    // Copy the group's internal Contents recursively
                    var srcSubContents = srcItem.property("Contents");
                    var dstSubContents = createdGroup.property("Contents");
                    copyContentsRecursive(srcSubContents, dstSubContents);

                    // Copy group's Transform if present
                    try {
                        var srcGT = srcItem.property("Transform");
                        var dstGT = createdGroup.property("Transform");
                        if (srcGT && dstGT) {
                            try { dstGT.property("Position").setValue(safe2D(srcGT.property("Position").value)); } catch(e){}
                            try { dstGT.property("Anchor Point").setValue(safe2D(srcGT.property("Anchor Point").value)); } catch(e){}
                            try { dstGT.property("Scale").setValue(safe2D(srcGT.property("Scale").value)); } catch(e){}
                            try { dstGT.property("Rotation").setValue(srcGT.property("Rotation").value); } catch(e){}
                            try { dstGT.property("Opacity").setValue(srcGT.property("Opacity").value); } catch(e){}
                        }
                    } catch (e) {}
                }
            } else {
                // It's a leaf vector property (Path, Fill, Stroke, etc.)
                // Try to add the same type to dstContents, then copy its values/subprops
                try {
                    var added = dstContents.addProperty(srcItem.matchName);
                    if (added) {
                        // Copy name if possible
                        try { added.name = srcItem.name || added.name; } catch(e){}

                        // Copy sub-properties or value safely
                        copyPropValue(srcItem, added);

                        // If it's a stroke/fill that has color, opacity, etc., copy their subproperties handled above
                    }
                } catch (e) {
                    // Some matchNames may not be allowed to add in this context; skip gracefully
                }
            }
        }
    }

    // Backup parents to restore
    var parents = [];
    for (var i = 0; i < sel.length; i++) {
        try { parents.push(sel[i].parent); } catch (e) { parents.push(null); }
    }

    // Force 2D for all selected layers (avoid 3D position z)
    for (var i = 0; i < sel.length; i++) {
        try { if (sel[i].threeDLayer) sel[i].threeDLayer = false; } catch (e) {}
    }

    // Unparent temporarily
    for (var i = 0; i < sel.length; i++) {
        try { sel[i].parent = null; } catch (e) {}
    }

    // Create merged layer
    var merged = comp.layers.addShape();
    merged.name = "Merged Shape Layer";
    try {
        merged.transform.position.setValue([0,0]);
        merged.transform.anchorPoint.setValue([0,0]);
        merged.transform.scale.setValue([100,100]);
        merged.transform.rotation.setValue(0);
        merged.transform.opacity.setValue(100);
    } catch (e) {}

    var copiedAny = false;

    // For each selected layer, create a top-level group container and copy its contents
    for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];
        try {
            if (layer.matchName !== "ADBE Vector Layer") continue;

            // Create layer container group inside merged Contents
            var layerContainer = merged.property("Contents").addProperty("ADBE Vector Group");
            layerContainer.name = layer.name || ("Layer " + (i+1));

            // Copy layer Transform into container Transform
            try {
                var srcT = layer.property("Transform");
                var dstT = layerContainer.property("Transform");
                if (srcT && dstT) {
                    try { dstT.property("Position").setValue(safe2D(srcT.property("Position").value)); } catch(e){}
                    try { dstT.property("Anchor Point").setValue(safe2D(srcT.property("Anchor Point").value)); } catch(e){}
                    try { dstT.property("Scale").setValue(safe2D(srcT.property("Scale").value)); } catch(e){}
                    try { dstT.property("Rotation").setValue(srcT.property("Rotation").value); } catch(e){}
                    try { dstT.property("Opacity").setValue(srcT.property("Opacity").value); } catch(e){}
                }
            } catch (e) {}

            // Copy the layer.contents recursively into layerContainer.Contents
            var srcContents = layer.property("Contents");
            var dstContents = layerContainer.property("Contents");
            if (srcContents && dstContents) {
                copyContentsRecursive(srcContents, dstContents);
                // detect if anything was copied: check dstContents.numProperties
                if (dstContents.numProperties && dstContents.numProperties > 0) copiedAny = true;
            }
        } catch (e) {
            // skip this layer on error
        }
    }

    // Check Shift key state
    var shiftPressed = ScriptUI.environment.keyboardState.shiftKey;

    // Hide or remove originals
    for (var i = 0; i < sel.length; i++) {
        try {
            if (shiftPressed) {
                sel[i].remove(); // Giữ Shift → xoá layer gốc
            } else {
                sel[i].enabled = false; // Bình thường → ẩn layer gốc
            }
        } catch (e) {}
    }

    // Restore parents (chỉ nếu không xoá)
    if (!shiftPressed) {
        for (var i = 0; i < sel.length; i++) {
            try { sel[i].parent = parents[i]; } catch (e) {}
        }
    }

    if (!copiedAny) {
        try { merged.remove(); } catch(e){}
        alert("No shapes copied. Ensure selected layers are Shape Layers with Contents.");
    }


    app.endUndoGroup();
}


// Hàm split shape /////////////////////////////////////////////////////////////////////////////////////////////
function splitShape() {
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Composition not Active.");
        return;
    }
    var selLayers = comp.selectedLayers;
    if (!selLayers || selLayers.length === 0) {
        alert("Please select at least 1 Shape Layer!");
        return;
    }
    app.beginUndoGroup("Split Shape Groups (FixSelection)");

    // helpers
    function findByPropertyIndex(parent, propIndex) {
        for (var i = 1; i <= parent.numProperties; i++) {
            var p = parent.property(i);
            if (p.propertyIndex === propIndex) return p;
        }
        return null;
    }

    function getPropertyPath(contentsRoot, target) {
        function recurse(group) {
            for (var i = 1; i <= group.numProperties; i++) {
                var p = group.property(i);
                if (p === target) return [p.propertyIndex];
                if (p.matchName === "ADBE Vector Group") {
                    var inner = p.property("ADBE Vectors Group");
                    var found = recurse(inner);
                    if (found) return [p.propertyIndex].concat(found);
                }
            }
            return null;
        }
        return recurse(contentsRoot);
    }

    // find group paths (full path arrays) where group.prop.selected === true
    function findSelectedGroupPaths(contentsRoot) {
        var results = [];
        function recurse(group, path) {
            for (var i = 1; i <= group.numProperties; i++) {
                var p = group.property(i);
                var newPath = path.concat([p.propertyIndex]);
                if (p.matchName === "ADBE Vector Group") {
                    if (p.selected) {
                        // selected group at this level -> record full path to this group property
                        results.push(newPath);
                    }
                    var inner = p.property("ADBE Vectors Group");
                    recurse(inner, newPath);
                }
            }
        }
        recurse(contentsRoot, []);
        return results;
    }

    // convert array-of-paths to map-unique keyed by JSON string
    function uniqPaths(paths) {
        var map = {};
        for (var i = 0; i < paths.length; i++) map[JSON.stringify(paths[i])] = paths[i];
        var out = [];
        for (var k in map) out.push(map[k]);
        return out;
    }

    // prune function reused from previous versions (keeps branch)
    function pruneKeepBranch(dupContents, path, depth, keepChildrenAtLeaf) {
        for (var j = dupContents.numProperties; j >= 1; j--) {
            var prop = dupContents.property(j);
            var pIdx = prop.propertyIndex;
            var shouldKeep = (path[depth] === pIdx);
            if (!shouldKeep) {
                if (prop.matchName && prop.matchName.indexOf("ADBE Vector") === 0) {
                    try { prop.remove(); } catch (e) {}
                }
            } else {
                if (depth < path.length - 1) {
                    if (prop.matchName === "ADBE Vector Group") {
                        var inner = prop.property("ADBE Vectors Group");
                        if (inner) pruneKeepBranch(inner, path, depth + 1, keepChildrenAtLeaf);
                    }
                } else {
                    if (keepChildrenAtLeaf && keepChildrenAtLeaf.length > 0) {
                        if (prop.matchName === "ADBE Vector Group") {
                            var leaf = prop.property("ADBE Vectors Group");
                            if (leaf) {
                                for (var k = leaf.numProperties; k >= 1; k--) {
                                    var child = leaf.property(k);
                                    if (child && child.matchName && child.matchName.indexOf("ADBE Vector") === 0) {
                                        if (keepChildrenAtLeaf.indexOf(child.propertyIndex) === -1) {
                                            try { child.remove(); } catch (e) {}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // helper to get property object by path (used for naming)
    function propertyByPath(contentsRoot, path) {
        if (!path || path.length === 0) return contentsRoot;
        var cur = contentsRoot;
        for (var i = 0; i < path.length; i++) {
            var found = findByPropertyIndex(cur, path[i]);
            if (!found) return null;
            if (i < path.length - 1) {
                if (found.matchName === "ADBE Vector Group") cur = found.property("ADBE Vectors Group");
                else return null;
            } else return found;
        }
        return null;
    }

    var finalSelection = [];

    for (var li = 0; li < selLayers.length; li++) {
        var layer = selLayers[li];
        var contents = layer.property("ADBE Root Vectors Group");
        if (!contents) continue;

        // 1) gather group selections via p.selected on tree
        var groupPaths = findSelectedGroupPaths(contents); // array of path arrays

        // 2) gather layer.selectedProperties mapped to paths under contents
        var selProps = layer.selectedProperties || [];
        var propPaths = [];
        for (var sp = 0; sp < selProps.length; sp++) {
            var p = selProps[sp];
            var path = getPropertyPath(contents, p);
            if (path) propPaths.push(path);
        }

        // 3) combine both sources and uniquify
        var combined = uniqPaths(groupPaths.concat(propPaths));

        // If still empty -> fallback to original top-level behavior
        if (combined.length === 0) {
            // original behavior: use selected top-level groups or all top-level groups
            var topSelected = [];
            for (var k = 1; k <= contents.numProperties; k++) {
                var tp = contents.property(k);
                if (tp.matchName === "ADBE Vector Group" && tp.selected) topSelected.push(tp);
            }
            if (topSelected.length === 0) {
                for (var k2 = 1; k2 <= contents.numProperties; k2++) {
                    var p2 = contents.property(k2);
                    if (p2.matchName === "ADBE Vector Group") topSelected.push(p2);
                }
            }
            var splitAll = (topSelected.length === contents.numProperties);
            var newLayers = [];
            for (var t = 0; t < topSelected.length; t++) {
                var origGroup = topSelected[t];
                var keepIdx = origGroup.propertyIndex;
                var newLayer = layer.duplicate();
                var newContents = newLayer.property("ADBE Root Vectors Group");
                for (var m = newContents.numProperties; m >= 1; m--) {
                    var pr = newContents.property(m);
                    if (pr.matchName === "ADBE Vector Group" && pr.propertyIndex !== keepIdx) {
                        try { pr.remove(); } catch(e) {}
                    }
                }
                newLayer.name = origGroup.name;
                newLayers.push(newLayer);
            }
            if (splitAll) layer.enabled = false;
            else {
                var rm = [];
                for (var g = 0; g < topSelected.length; g++) rm.push(topSelected[g].propertyIndex);
                rm.sort(function(a,b){ return b-a; });
                for (var rr = 0; rr < rm.length; rr++) {
                    var pRem = findByPropertyIndex(contents, rm[rr]);
                    if (pRem) try { pRem.remove(); } catch(e) {}
                }
            }
            for (var nl = 0; nl < newLayers.length; nl++) finalSelection.push(newLayers[nl]);
            continue;
        }

        // 4) we have combined selections (paths). Convert to filtered targets (remove descendants when ancestor present)
        combined.sort(function(a,b){ return a.length - b.length; });
        var filtered = [];
        for (var ci = 0; ci < combined.length; ci++) {
            var keep = true;
            for (var cj = 0; cj < filtered.length; cj++) {
                var anc = filtered[cj];
                var cur = combined[ci];
                if (anc.length < cur.length) {
                    var isAnc = true;
                    for (var z = 0; z < anc.length; z++) if (anc[z] !== cur[z]) { isAnc = false; break; }
                    if (isAnc) { keep = false; break; }
                }
            }
            if (keep) filtered.push(combined[ci]);
        }

        // 5) build targets: group vs child
        var targetsMap = {};
        for (var fi = 0; fi < filtered.length; fi++) {
            var pth = filtered[fi];
            var lastProp = propertyByPath(contents, pth);
            if (!lastProp) continue;
            if (lastProp.matchName === "ADBE Vector Group") {
                // keep whole group
                targetsMap[JSON.stringify(pth)] = { type: "group", path: pth, name: lastProp.name };
            } else {
                // child element -> map to parent path, collect child indices
                var parentPath = pth.slice(0, pth.length - 1);
                var childIdx = pth[pth.length - 1];
                var key = JSON.stringify(parentPath);
                if (!targetsMap[key]) {
                    var parentObj = propertyByPath(contents, parentPath);
                    var pname = parentObj && parentObj.name ? parentObj.name : ("Group");
                    targetsMap[key] = { type: "parent", path: parentPath, keepChildren: [], name: pname };
                }
                if (targetsMap[key].keepChildren.indexOf(childIdx) === -1) targetsMap[key].keepChildren.push(childIdx);
            }
        }

        // convert to targets array
        var targets = [];
        for (var k in targetsMap) {
            var o = targetsMap[k];
            if (o.type === "group") targets.push({ type: "group", path: o.path, keepChildren: null, name: o.name });
            else targets.push({ type: "parent", path: o.path, keepChildren: o.keepChildren, name: o.name });
        }

        // 6) duplicate & prune for each target
        var created = [];
        for (var ti = 0; ti < targets.length; ti++) {
            var t = targets[ti];
            var newLayer = layer.duplicate();
            var newContents = newLayer.property("ADBE Root Vectors Group");
            pruneKeepBranch(newContents, t.path, 0, t.keepChildren);
            // naming
            if (t.type === "group") newLayer.name = t.name || "Group";
            else {
                if (t.keepChildren.length === 1) {
                    var childObj = propertyByPath(contents, t.path.concat([t.keepChildren[0]]));
                    newLayer.name = (childObj && childObj.name) ? childObj.name : (t.name || "Group");
                } else newLayer.name = t.name || "Group";
            }
            created.push(newLayer);
        }

        // 7) prepare removals on original (group removals and child removals)
        var removeMap = {};
        for (var ri = 0; ri < targets.length; ri++) {
            var T = targets[ri];
            if (T.type === "group") {
                var parentPath = T.path.slice(0, T.path.length - 1);
                var idx = T.path[T.path.length - 1];
                var key = JSON.stringify(parentPath);
                if (!removeMap[key]) removeMap[key] = [];
                removeMap[key].push(idx);
            } else {
                var key2 = JSON.stringify(T.path);
                if (!removeMap[key2]) removeMap[key2] = [];
                for (var ci = 0; ci < T.keepChildren.length; ci++) {
                    if (removeMap[key2].indexOf(T.keepChildren[ci]) === -1) removeMap[key2].push(T.keepChildren[ci]);
                }
            }
        }

       var ops = [];
        for (var km in removeMap) {
            // parse parentPath
            var parentPathArr;
            try {
                parentPathArr = JSON.parse(km);
            } catch (e) {
                continue; // skip invalid keys
            }

            var arr = removeMap[km];

            // if arr is not a real array, try to coerce numeric properties into an array
            if (!arr || !(arr instanceof Array)) {
                var coerced = [];
                if (arr && typeof arr === "object") {
                    for (var kk in arr) {
                        // try only numeric-ish keys or values
                        if (!isNaN(Number(kk))) {
                            coerced.push(arr[kk]);
                        }
                    }
                }
                if (coerced.length > 0) arr = coerced;
                else continue;
            }

            // build uniqueIndices WITHOUT using indexOf
            var uniqueIndices = [];
            for (var u = 0; u < arr.length; u++) {
                var val = arr[u];
                var seen = false;
                for (var t = 0; t < uniqueIndices.length; t++) {
                    if (uniqueIndices[t] === val) { seen = true; break; }
                }
                if (!seen) uniqueIndices.push(val);
            }

            // sort descending numeric (safety)
            uniqueIndices.sort(function(a,b){ return b - a; });

            ops.push({ parentPath: parentPathArr, indices: uniqueIndices });
        }

        // sort ops so deeper parents handled first (same as original intent)
        ops.sort(function(a,b){ return b.parentPath.length - a.parentPath.length; });

        // --- execute removals (collect property objects first, then remove)
        for (var oi = 0; oi < ops.length; oi++) {
            var op = ops[oi];
            var parent = contents;
            if (op.parentPath.length > 0) {
                for (var d = 0; d < op.parentPath.length; d++) {
                    var pObj = findByPropertyIndex(parent, op.parentPath[d]);
                    if (!pObj) { parent = null; break; }
                    parent = pObj.property("ADBE Vectors Group");
                    if (!parent) break;
                }
            }
            if (!parent) continue;

            // collect target property objects before removing (avoid index shifting bugs)
            var toRemoveProps = [];
            for (var ii = 0; ii < op.indices.length; ii++) {
                var idx = op.indices[ii];
                var targetProp = findByPropertyIndex(parent, idx);
                if (targetProp) toRemoveProps.push(targetProp);
            }

            // now remove each collected prop
            for (var r = 0; r < toRemoveProps.length; r++) {
                try { toRemoveProps[r].remove(); } catch(e) {}
            }
        }

        // disable original if empty
        var anyLeft = false;
        for (var kk = 1; kk <= contents.numProperties; kk++) {
            var pp = contents.property(kk);
            if (pp && pp.matchName === "ADBE Vector Group") { anyLeft = true; break; }
        }
        if (!anyLeft) layer.enabled = false;

        for (var ci = 0; ci < created.length; ci++) finalSelection.push(created[ci]);
    } // end layers loop

    // update timeline selection
    for (var s = 1; s <= comp.numLayers; s++) comp.layer(s).selected = false;
    for (var n = 0; n < finalSelection.length; n++) finalSelection[n].selected = true;

    app.endUndoGroup();
}

// Ham Label ///////////////////////////////////////////////////////////////////////////////////////////////////
var aeLabelIndexMap = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    function saveLabel(labelVal) {
        try {
            var comp = app.project.activeItem;
            if (!(comp && comp instanceof CompItem)) {
            alert("No active composition.");
            return;
            }

            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
            alert("No layer selected.");
            return;
            }

            app.beginUndoGroup("Apply Label Color");
            for (var i = 0; i < selectedLayers.length; i++) {
            selectedLayers[i].label = parseInt(labelVal);
            }
            app.endUndoGroup();

            return "Applied label: " + labelVal;

        } catch (e) {
            alert("Error Apply: " + e.toString());
        }
    }

    function selectLabel(labelVal) {
        app.beginUndoGroup("Select Layers by Label");
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            app.endUndoGroup();
            return 0;
        }

        var targetLabel = labelVal;

        // Nếu shift-click, lấy label của last selected layer **trước khi deselect**
        if (labelVal === "auto") {
            for (var i = comp.numLayers; i >= 1; i--) {
                var l = comp.layer(i);
                if (l.selected) {
                    targetLabel = l.label;
                    break;
                }
            }
            if (targetLabel === undefined) {
                app.endUndoGroup();
                return 0;
            }
        }

        // Deselect all
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;

        // Select layers có label targetLabel
        var found = false;
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).label === parseInt(targetLabel)) {
                comp.layer(i).selected = true;
                found = true;
            }
        }

        app.endUndoGroup();
        return targetLabel; // trả về để JS cập nhật dropdown
    }

    function selectLabelInverse(labelVal) {
        app.beginUndoGroup("Select Layers by Inverse Label");
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Composition not Active.");
            app.endUndoGroup();
            return;
        }

        // Deselect all trước
        try {
            for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        } catch (e) { }

        var found = false;
        for (var i = 1; i <= comp.numLayers; i++) {
            // 🟠 Chọn layer có label khác với labelVal
            if (comp.layer(i).label !== parseInt(labelVal)) {
                comp.layer(i).selected = true;
                found = true;
            }
        }
        if (!found) alert("No layers with different label found.");
        app.endUndoGroup();
        return "Selected layers with label != " + labelVal;
    }

    function toggleEnable(labelVal, mode) {
        app.beginUndoGroup("Toggle Enable");

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Composition not Active.");
            app.endUndoGroup();
            return;
        }

        if (mode === "ctrl") {
            // 🟠 Ctrl + Click → Toggle all unselected layers
            var selected = comp.selectedLayers;
            var selectedSet = {};
            for (var i = 0; i < selected.length; i++) {
                selectedSet[selected[i].index] = true;
            }
            for (var i = 1; i <= comp.numLayers; i++) {
                if (!selectedSet[i]) {
                    comp.layer(i).enabled = !comp.layer(i).enabled;
                }
            }
        } 
        else if (mode === "shift") {
            // 🟢 Shift + Click → Toggle all selected layers
            var selected = comp.selectedLayers;
            if (selected.length === 0) {
                alert("No layer selected.");
            } else {
                for (var i = 0; i < selected.length; i++) {
                    selected[i].enabled = !selected[i].enabled;
                }
            }
        } 
        else {
            // ⚪ Normal click → Toggle by label (giữ nguyên logic cũ)
            var any = false;
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).label === parseInt(labelVal)) {
                    comp.layer(i).enabled = !comp.layer(i).enabled;
                    any = true;
                }
            }
            if (!any) alert("Not find layer with this label.");
        }

        app.endUndoGroup();
    }


// Graph Tools ///////////////////////////////////////////////////////////////////////////////////////////////////////
function getTargets(affectAll) {
    var res = [];
    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) return res;

    var layers = comp.selectedLayers;
    if (!layers || layers.length === 0) return res;

    function collectAnimProps(grp, arr) {
        if (!grp || typeof grp.numProperties !== "number") return;
        for (var i = 1; i <= grp.numProperties; i++) {
            var p = grp.property(i);
            if (!p) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                if (p.isTimeVarying) arr.push(p);
            } else {
                collectAnimProps(p, arr);
            }
        }
    }

    for (var li = 0; li < layers.length; li++) {
        var layer = layers[li];
        if (affectAll) {
            var propsAll = [];
            collectAnimProps(layer, propsAll);
            for (var pa = 0; pa < propsAll.length; pa++) {
                var propA = propsAll[pa];
                for (var k = 1; k <= propA.numKeys; k++) {
                    res.push({ prop: propA, key: k });
                }
            }
        } else {
            var props = layer.selectedProperties || [];
            for (var pi = 0; pi < props.length; pi++) {
                var prop = props[pi];
                if (!(prop && prop.propertyType === PropertyType.PROPERTY && prop.isTimeVarying)) continue;
                var sel = prop.selectedKeys || [];
                for (var si = 0; si < sel.length; si++) {
                    res.push({ prop: prop, key: sel[si] });
                }
            }
        }
    }
    return res;
}

function ensureBezier(prop, keyIndex) {
    try {
        prop.setInterpolationTypeAtKey(keyIndex, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setTemporalAutoBezierAtKey(keyIndex, false);
        prop.setTemporalContinuousAtKey(keyIndex, false);
    } catch (e) {}
}

// --- Apply Influence ---
function applyInfluence(side, val, affectAll) {
    app.beginUndoGroup("Set Influence (" + side + ")");
    var targets = getTargets(affectAll);
    for (var i = 0; i < targets.length; i++) {
        var p = targets[i].prop, k = targets[i].key;
        var inArr = p.keyInTemporalEase(k);
        var outArr = p.keyOutTemporalEase(k);
        for (var d = 0; d < inArr.length; d++) {
            if (side === "in" || side === "both") inArr[d].influence = val;
            if (side === "out" || side === "both") outArr[d].influence = val;
        }
        p.setTemporalEaseAtKey(k, inArr, outArr);
        ensureBezier(p, k);
    }
    app.endUndoGroup();
}

function applyInfluenceIn(v, affectAll) {
    applyInfluence("in", v, affectAll);
}
function applyInfluenceOut(v, affectAll) {
    applyInfluence("out", v, affectAll);
}
function applyInfluenceBoth(v, affectAll) {
    applyInfluence("both", v, affectAll);
}

// --- Apply Speed ---
function applySpeed(speedVal, affectAll) {
    app.beginUndoGroup("Set Speed");
    var targets = getTargets(affectAll);
    for (var i = 0; i < targets.length; i++) {
        var p = targets[i].prop, k = targets[i].key;
        var inArr = p.keyInTemporalEase(k);
        var outArr = p.keyOutTemporalEase(k);
        for (var d = 0; d < inArr.length; d++) {
            inArr[d].speed = speedVal;
            outArr[d].speed = speedVal;
        }
        p.setTemporalEaseAtKey(k, inArr, outArr);
        ensureBezier(p, k);
    }
    app.endUndoGroup();
}

// --- Temporal Mode ---
function resetToLinear(targets) {
    for (var i = 0; i < targets.length; i++) {
        var p = targets[i].prop, k = targets[i].key;
        try {
            p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            p.setTemporalAutoBezierAtKey(k, false);
            p.setTemporalContinuousAtKey(k, false);
        } catch (e) {}
    }
}

function setTemporalMode(mode, affectAll) {
    app.beginUndoGroup("Set Temporal: " + mode);

    var targets = getTargets(affectAll);
    resetToLinear(targets);

    for (var i = 0; i < targets.length; i++) {
            var p = targets[i].prop, k = targets[i].key;
            try {
                if (mode === "linear") {
                    // already done in reset
                } else if (mode === "holdL") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.LINEAR);
                } else if (mode === "holdR") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.HOLD);
                } else if (mode === "holdB") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                } else if (mode === "auto") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    p.setTemporalAutoBezierAtKey(k, true);
                    p.setTemporalContinuousAtKey(k, false);
                } else if (mode === "cont") {
                     var inArr = p.keyInTemporalEase(k);
                     var outArr = p.keyOutTemporalEase(k);

                    // Update speed only (preserve influence)
                     for (var d = 0; d < inArr.length; d++) {
                        inArr[d].speed = 0;
                        outArr[d].speed = 0;
                    }
                    p.setTemporalEaseAtKey(k, inArr, outArr);
                    ensureBezier(p, k);

                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    p.setTemporalAutoBezierAtKey(k, false);
                    p.setTemporalContinuousAtKey(k, true);
                    applyInfluence("both", 33.33, { wrapUndo: false });
                } else if (mode === "easeIn") {
                     var inArr = p.keyInTemporalEase(k);
                     var outArr = p.keyOutTemporalEase(k);

                    // Update speed only (preserve influence)
                     for (var d = 0; d < inArr.length; d++) {
                        inArr[d].speed = 0;
                        outArr[d].speed = 0;
                    }
                    p.setTemporalEaseAtKey(k, inArr, outArr);
                    ensureBezier(p, k);

                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.LINEAR);
                    applyInfluence("in", 33.33, { wrapUndo: false });
                } else if (mode === "easeOut") {
                     var inArr = p.keyInTemporalEase(k);
                     var outArr = p.keyOutTemporalEase(k);

                    // Update speed only (preserve influence)
                     for (var d = 0; d < inArr.length; d++) {
                        inArr[d].speed = 0;
                        outArr[d].speed = 0;
                    }
                    p.setTemporalEaseAtKey(k, inArr, outArr);
                    ensureBezier(p, k);

                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.BEZIER);
                    applyInfluence("out", 33.33, { wrapUndo: false });    
                }
            } catch (e) {}
        }
        app.endUndoGroup();
}


// Set Anchor point & Null //////////////////////////////////////////////////////////////////////////////////////////
function createGlobals() {
    var data = {
        ignoreMasks: false
    };
    function set(name, value) {
        data[name] = value;
    }
    function get(name) {
        return data[name];
    }
    return {
        get: get,
        set: set
    };
}
var globals = createGlobals();

function add(v1, v2) {
    var rest = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        rest[_i - 2] = arguments[_i];
    }
    var out = v1 + v2;
    for (var _a = 0, rest_1 = rest; _a < rest_1.length; _a++) {
        var r = rest_1[_a];
        out += r;
    }
    return out;
}
function sub(v1, v2) {
    var rest = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        rest[_i - 2] = arguments[_i];
    }
    var out = v1 - v2;
    for (var _a = 0, rest_2 = rest; _a < rest_2.length; _a++) {
        var r = rest_2[_a];
        out -= r;
    }
    return out;
}
function mul(v1, v2) {
    var rest = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        rest[_i - 2] = arguments[_i];
    }
    var out = v1 * v2;
    for (var _a = 0, rest_3 = rest; _a < rest_3.length; _a++) {
        var r = rest_3[_a];
        out *= r;
    }
    return out;
}
function propertyIs1D(value) {
    return typeof value === "number";
}
function propertyIs2D(propertyType, value) {
    return propertyType === PropertyValueType.TwoD || propertyType === PropertyValueType.TwoD_SPATIAL;
}
function is2DVector(value) {
    if (typeof value !== "object") {
        return false;
    }
    if (!("length" in value)) {
        return false;
    }
    if (value.length !== 2 && value.length !== 3) {
        return false;
    }
    if (typeof value[0] !== "number" || typeof value[1] !== "number") {
        return false;
    }
    if (value.length === 3 && value[2] !== 0) {
        return false;
    }
    return true;
}
function propertyIs3D(propertyType, value) {
    return propertyType === PropertyValueType.ThreeD || propertyType === PropertyValueType.ThreeD_SPATIAL;
}
function is3DVector(value) {
    if (typeof value !== "object") {
        return false;
    }
    if (!("length" in value)) {
        return false;
    }
    if (value.length !== 3) {
        return false;
    }
    if (typeof value[0] !== "number" || typeof value[1] !== "number" || typeof value[2] !== "number") {
        return false;
    }
    return true;
}
function cleanNumericArray(v) {
    for (var i = 0; i < v.length; i++) {
        if (isNaN(v[i])) {
            v[i] = 0;
        }
    }
    return v;
}

function deselectInvalidLayers(selection) {
    if (!(app.project.activeItem instanceof CompItem)) {
        return;
    }
    var out = [];
    var numSelected = selection.length;
    for (var i = 0; i < numSelected; i++) {
    var layer = selection[i];
    var isAVLayer = true;
    if (layer instanceof CameraLayer || layer instanceof LightLayer) {
        isAVLayer = false;
    }
    if (!isAVLayer) {
        layer.selected = false;
        continue;
    }
    out.push(layer);
    }
    return out;
}
function findTopLeft(ftl_CurLayer, ftl_time) {
    var scaleX = ftl_CurLayer.scale.value[0] / 100;
    var scaleY = ftl_CurLayer.scale.value[1] / 100;
    var scaleZ = ftl_CurLayer.scale.value[2] / 100;
    var startPosition = ftl_CurLayer.position.value;
    var preAPX = ftl_CurLayer.anchorPoint.value[0] * scaleX;
    var preAPY = ftl_CurLayer.anchorPoint.value[1] * scaleY;
    var preAPZ = ftl_CurLayer.anchorPoint.value[2] * scaleZ;
    var newLayerBounds = findMaskBounds(ftl_CurLayer, ftl_time);
    if (!ftl_CurLayer.threeDLayer) {
        var positionMinusAnchor = sub(startPosition, [preAPX, preAPY]);
        var rot = ftl_CurLayer.rotation.value;
        var rotationPoint = add(positionMinusAnchor, [newLayerBounds.left * scaleX, newLayerBounds.top * scaleY]);
        if (!propertyIs1D(rot) || !is2DVector(startPosition) || !is2DVector(rotationPoint)) {
            throw new Error("Invalid value types");
        }
        return rotatePointAroundPoint(rotationPoint, startPosition, rot);
    }
    else {
        var pma = sub(startPosition, [preAPX, preAPY, preAPZ]);
        var rot = [ftl_CurLayer.xRotation.value, ftl_CurLayer.yRotation.value, ftl_CurLayer.zRotation.value];
        var center = sub(startPosition, [newLayerBounds.left * scaleX, newLayerBounds.top * scaleY]);
        var rot2 = ftl_CurLayer.orientation.value;
        if (!is3DVector(rot) ||
            !is3DVector(rot2) ||
            !is3DVector(pma) ||
            !is3DVector(center) ||
            !is3DVector(startPosition)) {
            throw new Error("Invalid 3D vector");
        }
        var orientPoint = rotate3DPointAround3DPoint(pma, center, rot);
        var rotationPoint = add(orientPoint, [newLayerBounds.left * scaleX, newLayerBounds.top * scaleY]);
        return rotate3DPointAround3DPoint(rotationPoint, startPosition, rot2);
    }
}
function findTopLeftFromData(bounds, startPosition, initAnchor, initScale, initRotation, is3D, initOrientation) {
    var scaleX = initScale[0] / 100;
    var scaleY = initScale[1] / 100;
    var scaleZ = initScale[2] / 100;
    var preAPX = initAnchor[0] * scaleX;
    var preAPY = initAnchor[1] * scaleY;
    var preAPZ = initAnchor[2] * scaleZ;
    if (!is3D) {
        var positionMinusAnchor = sub(startPosition, [preAPX, preAPY]);
        var rotationPoint = add(positionMinusAnchor, [bounds.left * scaleX, bounds.top * scaleY]);
        if (!propertyIs1D(initRotation) || !is2DVector(startPosition) || !is2DVector(rotationPoint)) {
            throw new Error("Invalid value types");
        }
        return rotatePointAroundPoint(rotationPoint, startPosition, initRotation);
    }
    else {
       // alert(startPosition.toString());
       // alert([preAPX, preAPY, preAPZ].toString());
        var pma = sub(startPosition, cleanNumericArray([preAPX, preAPY, preAPZ]));
        var center = sub(startPosition, [bounds.left * scaleX, bounds.top * scaleY]);
        if (!is3DVector(initRotation) ||
            !is3DVector(initOrientation) ||
            !is3DVector(pma) ||
            !is3DVector(center) ||
            !is3DVector(startPosition)) {
            throw new Error("Invalid 3D vector");
        }
        var orientPoint = rotate3DPointAround3DPoint(pma, center, initRotation);
        var rotationPoint = add(orientPoint, [bounds.left * scaleX, bounds.top * scaleY]);
        return rotate3DPointAround3DPoint(rotationPoint, startPosition, initOrientation);
    }
}
function findPointOnLayer(pol_CurLayer, pol_type) {
    var curTime = app.project.activeItem.time;
    switch (pol_type) {
        case "tl":
            return findTopLeft(pol_CurLayer, curTime);
        case "tm":
            return findTopMid(pol_CurLayer, curTime);
        case "tr":
            return findTopRight(pol_CurLayer, curTime);
        case "ml":
            return findMidLeft(pol_CurLayer, curTime);
        case "mm":
            return findMidMid(pol_CurLayer, curTime);
        case "mr":
            return findMidRight(pol_CurLayer, curTime);
        case "bl":
            return findBottomLeft(pol_CurLayer, curTime);
        case "bm":
            return findBottomMid(pol_CurLayer, curTime);
        case "br":
            return findBottomRight(pol_CurLayer, curTime);
    }
}
function findSelectionBounds(fsb_selectedLayers) {
    var numSelected = fsb_selectedLayers.length;
    var top = 100000;
    var bottom = -100000;
    var left = 1000000;
    var right = -100000;
    var back = 10000000;
    var front = -10000000;
    for (var i = 0; i < numSelected; i++) {
        var c1 = findPointOnLayer(fsb_selectedLayers[i], "tl");
        var c2 = findPointOnLayer(fsb_selectedLayers[i], "tr");
        var c3 = findPointOnLayer(fsb_selectedLayers[i], "bl");
        var c4 = findPointOnLayer(fsb_selectedLayers[i], "br");
        if (c1[0] < left) {
            left = c1[0];
        }
        if (c1[0] > right) {
            right = c1[0];
        }
        if (c1[1] < top) {
            top = c1[1];
        }
        if (c1[1] > bottom) {
            bottom = c1[1];
        }
        if (c2[0] < left) {
            left = c2[0];
        }
        if (c2[0] > right) {
            right = c2[0];
        }
        if (c2[1] < top) {
            top = c2[1];
        }
        if (c2[1] > bottom) {
            bottom = c2[1];
        }
        if (c3[0] < left) {
            left = c3[0];
        }
        if (c3[0] > right) {
            right = c3[0];
        }
        if (c3[1] < top) {
            top = c3[1];
        }
        if (c3[1] > bottom) {
            bottom = c3[1];
        }
        if (c4[0] < left) {
            left = c4[0];
        }
        if (c4[0] > right) {
            right = c4[0];
        }
        if (c4[1] < top) {
            top = c4[1];
        }
        if (c4[1] > bottom) {
            bottom = c4[1];
        }
        if (fsb_selectedLayers[i].threeDLayer) {
            if (c1[2] > front) {
                front = c1[2];
            }
            if (c1[2] < back) {
                back = c1[2];
            }
            if (c2[2] > front) {
                front = c2[2];
            }
            if (c2[2] < back) {
                back = c2[2];
            }
            if (c3[2] > front) {
                front = c3[2];
            }
            if (c3[2] < back) {
                back = c3[2];
            }
            if (c4[2] > front) {
                front = c4[2];
            }
            if (c4[2] < back) {
                back = c4[2];
            }
        }
        else {
            front = 0;
            back = 0;
        }
    }
    if (front == 10000000) {
        front = 0;
    }
    if (back == -10000000) {
        back = 0;
    }
    return [top, bottom, left, right, front, back];
}
function findMaskBounds(fmbLayer, fmbTime) {
    var layerBounds = fmbLayer.sourceRectAtTime(fmbTime, false);
    var numMasks = fmbLayer.mask.numProperties;
    if (globals.get("ignoreMasks")) {
        return layerBounds;
    }
    if (numMasks == 0) {
        return layerBounds;
    }
    else if (numMasks == 1) {
        if (fmbLayer.mask(1).maskMode == MaskMode.SUBTRACT ||
            fmbLayer.mask(1).maskMode == MaskMode.NONE ||
            fmbLayer.mask(1).inverted) {
            return layerBounds;
        }
        else {
            var maskVerts = fmbLayer.mask(1).maskShape.value.vertices;
            var maskBounds = hiLowMaskVerts(maskVerts);
            return compareBounds(layerBounds, maskBounds);
        }
    }
    else if (numMasks > 1) {
        var totalMaskBounds = [];
        totalMaskBounds[0] = 100000;
        totalMaskBounds[1] = 100000;
        totalMaskBounds[2] = -100000;
        totalMaskBounds[3] = -100000;
        for (var n = 1; n <= numMasks; n++) {
            if (fmbLayer.mask(n).inverted) {
                return layerBounds;
            }
            var maskVerts = fmbLayer.mask(n).maskShape.value.vertices;
            var maskBounds = hiLowMaskVerts(maskVerts);
            if (maskBounds[0] < totalMaskBounds[0]) {
                totalMaskBounds[0] = maskBounds[0];
            }
            if (maskBounds[1] < totalMaskBounds[1]) {
                totalMaskBounds[1] = maskBounds[1];
            }
            if (maskBounds[2] > totalMaskBounds[2]) {
                totalMaskBounds[2] = maskBounds[2];
            }
            if (maskBounds[3] > totalMaskBounds[3]) {
                totalMaskBounds[3] = maskBounds[3];
            }
        }
        if (totalMaskBounds[0] == 100000 &&
            totalMaskBounds[1] == 100000 &&
            totalMaskBounds[2] == -100000 &&
            totalMaskBounds[3] == -100000)
            return layerBounds;
        return compareBounds(layerBounds, totalMaskBounds);
    }
}
function compareBounds(layerBounds, maskBounds) {
    var outputBounds = {};
    outputBounds.left = maskBounds[0] > layerBounds.left ? maskBounds[0] : layerBounds.left;
    outputBounds.top = maskBounds[1] > layerBounds.top ? maskBounds[1] : layerBounds.top;
    outputBounds.width =
        maskBounds[2] < layerBounds.width + layerBounds.left
            ? maskBounds[2] - outputBounds.left
            : layerBounds.width - outputBounds.left + layerBounds.left;
    outputBounds.height =
        maskBounds[3] < layerBounds.height + layerBounds.top
            ? maskBounds[3] - outputBounds.top
            : layerBounds.height - outputBounds.top + layerBounds.top;
    return outputBounds;
}
function hiLowMaskVerts(maskVerts) {
    var length = maskVerts.length;
    var left = 1000000;
    var top = 1000000;
    var right = -1000000;
    var bottom = -1000000;
    for (var hl = 0; hl < length; hl++) {
        var curVerts = maskVerts[hl];
        if (curVerts[0] < left) {
            left = curVerts[0];
        }
        if (curVerts[0] > right) {
            right = curVerts[0];
        }
        if (curVerts[1] < top) {
            top = curVerts[1];
        }
        if (curVerts[1] > bottom) {
            bottom = curVerts[1];
        }
    }
    return [left, top, right, bottom];
}
function changeCorner(ccLayer, ccTime, addCoord) {
    var tlPoint = findTopLeft(ccLayer, ccTime);
    if (is2DVector(tlPoint)) {
        var rot = ccLayer.rotation.value;
        return rotatePointAroundPoint(add(tlPoint, addCoord), tlPoint, rot);
    }
    else {
        var currentRotation = [ccLayer.xRotation.value, ccLayer.yRotation.value, ccLayer.zRotation.value];
        var orientPoint = rotate3DPointAround3DPoint(add(tlPoint, addCoord), tlPoint, currentRotation);
        var rot = ccLayer.orientation.value;
        return rotate3DPointAround3DPoint(orientPoint, tlPoint, rot);
    }
}
function changeCornerFromData(topLeftPoint, addCoord, rotation, orientation) {
    if (is2DVector(topLeftPoint)) {
        return rotatePointAroundPoint(add(topLeftPoint, addCoord), topLeftPoint, rotation);
    }
    else {
        var currentRotation = rotation;
        var orientPoint = rotate3DPointAround3DPoint(add(topLeftPoint, addCoord), topLeftPoint, currentRotation);
        return rotate3DPointAround3DPoint(orientPoint, topLeftPoint, orientation);
    }
}
function findTopRight(ftr_CurLayer, ftr_time) {
    var lw = findMaskBounds(ftr_CurLayer, ftr_time).width;
    var scaleX = ftr_CurLayer.scale.value[0] / 100;
    return changeCorner(ftr_CurLayer, ftr_time, [lw * scaleX, 0, 0]);
}
function findTopMid(ftm_CurLayer, ftm_time) {
    var ftm_lw = findMaskBounds(ftm_CurLayer, ftm_time).width / 2;
    var scaleX = ftm_CurLayer.scale.value[0] / 100;
    return changeCorner(ftm_CurLayer, ftm_time, [ftm_lw * scaleX, 0, 0]);
}
function findMidLeft(fml_CurLayer, fml_time) {
    var fml_lh = findMaskBounds(fml_CurLayer, fml_time).height / 2;
    var scaleY = fml_CurLayer.scale.value[1] / 100;
    return changeCorner(fml_CurLayer, fml_time, [0, fml_lh * scaleY, 0]);
}
function findMidMid(fmm_CurLayer, fmm_time) {
    var fmm_lw = findMaskBounds(fmm_CurLayer, fmm_time).width / 2;
    var fmm_lh = findMaskBounds(fmm_CurLayer, fmm_time).height / 2;
    var scaleX = fmm_CurLayer.scale.value[0] / 100;
    var scaleY = fmm_CurLayer.scale.value[1] / 100;
    return changeCorner(fmm_CurLayer, fmm_time, [fmm_lw * scaleX, fmm_lh * scaleY]);
}
function findMidRight(fmr_CurLayer, fmr_time) {
    var fmr_lw = findMaskBounds(fmr_CurLayer, fmr_time).width;
    var fmr_lh = findMaskBounds(fmr_CurLayer, fmr_time).height / 2;
    var scaleX = fmr_CurLayer.scale.value[0] / 100;
    var scaleY = fmr_CurLayer.scale.value[1] / 100;
    return changeCorner(fmr_CurLayer, fmr_time, [fmr_lw * scaleX, fmr_lh * scaleY]);
}
function findBottomLeft(fbl_CurLayer, fbl_time) {
    var fbl_lh = findMaskBounds(fbl_CurLayer, fbl_time).height;
    var scaleY = fbl_CurLayer.scale.value[1] / 100;
    return changeCorner(fbl_CurLayer, fbl_time, [0, fbl_lh * scaleY]);
}
function findBottomMid(fbm_CurLayer, fbm_time) {
    var fbm_lw = findMaskBounds(fbm_CurLayer, fbm_time).width / 2;
    var fbm_lh = findMaskBounds(fbm_CurLayer, fbm_time).height;
    var scaleX = fbm_CurLayer.scale.value[0] / 100;
    var scaleY = fbm_CurLayer.scale.value[1] / 100;
    return changeCorner(fbm_CurLayer, fbm_time, [fbm_lw * scaleX, fbm_lh * scaleY]);
}
function findBottomRight(fbr_CurLayer, fbr_time) {
    var fbr_lw = findMaskBounds(fbr_CurLayer, fbr_time).width;
    var fbr_lh = findMaskBounds(fbr_CurLayer, fbr_time).height;
    var scaleX = fbr_CurLayer.scale.value[0] / 100;
    var scaleY = fbr_CurLayer.scale.value[1] / 100;
    return changeCorner(fbr_CurLayer, fbr_time, [fbr_lw * scaleX, fbr_lh * scaleY]);
}
function rotatePointAroundPoint(point, center, rotation) {
    var adjustedPoint = sub(point, center);
    var degree = rotation;
    var angle = (degree * Math.PI) / 180;
    var newX = adjustedPoint[0] * Math.cos(angle) - adjustedPoint[1] * Math.sin(angle);
    var newY = adjustedPoint[0] * Math.sin(angle) + adjustedPoint[1] * Math.cos(angle);
    return add([newX, newY], center);
}
function rotate3DPointAround3DPoint(point, center, rotation) {
    point = sub(point, center);
    var x = point[0];
    var ox = point[0];
    var y = point[1];
    var oy = point[1];
    var z = point[2];
    var oz = point[2];
    var xRot = rotation[0];
    var yRot = rotation[1];
    var zRot = rotation[2];
    var angle = (zRot * Math.PI) / 180;
    x = ox * Math.cos(angle) - oy * Math.sin(angle);
    y = ox * Math.sin(angle) + oy * Math.cos(angle);
    ox = x;
    oy = y;
    angle = (yRot * Math.PI) / 180;
    z = oz * Math.cos(angle) - ox * Math.sin(angle);
    x = oz * Math.sin(angle) + ox * Math.cos(angle);
    ox = x;
    oz = z;
    angle = (xRot * Math.PI) / 180;
    y = oy * Math.cos(angle) - oz * Math.sin(angle);
    z = oy * Math.sin(angle) + oz * Math.cos(angle);
    point = [x, y, z];
    return add(point, center);
}
function brotate3DPointAround3DPoint(point, center, rotation) {
    point = point - center;
    var ox = point[0];
    var x = point[0];
    var oy = point[1];
    var y = point[1];
    var oz = point[2];
    var z = point[2];
    var xRot = rotation[0];
    var yRot = rotation[1];
    var zRot = rotation[2];
    var angle = (xRot * Math.PI) / 180;
    y = oy * Math.cos(angle) - oz * Math.sin(angle);
    z = oy * Math.sin(angle) + oz * Math.cos(angle);
    oy = y;
    oz = z;
    var angle = (yRot * Math.PI) / 180;
    z = oz * Math.cos(angle) - ox * Math.sin(angle);
    x = oz * Math.sin(angle) + ox * Math.cos(angle);
    ox = x;
    oz = z;
    var angle = (zRot * Math.PI) / 180;
    x = ox * Math.cos(angle) - oy * Math.sin(angle);
    y = ox * Math.sin(angle) + oy * Math.cos(angle);
    point = [x, y, z];
    return center + point;
}
function compCoords(xPercent, yPercent) {
    var ccComp = app.project.activeItem;
    if (!(ccComp instanceof AVItem)) {
        return null;
    }
    return [ccComp.width * xPercent, ccComp.height * yPercent];
}
function objectCustomMAP(ocm_coord, byPercent, opts) {
    opts = opts || {};
    var wrapUndo = (opts.wrapUndo !== false); // mặc định true

    if (wrapUndo) app.beginUndoGroup("Move Anchor Point");
    var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
    var numSelected = selectedLayers.length;
    var ocm_tempCoord = ocm_coord;
    var originalX = ocm_coord[0];
    var originalY = ocm_coord[1];
    for (var y = 0; y < numSelected; y++) {
        var usl = [];
        var shapeContentSelected = false;
        var selectedShapeContent = [];
        var shape = null;
        if (selectedLayers[y] instanceof ShapeLayer) {
            var layer = app.project.activeItem.selectedLayers[y];
            var numShapes = layer.property(2).numProperties;
            for (var i = 1; i <= numShapes; i++) {
                shape = layer.property(2).property(i);
                if (!shapeContentSelected && shape.selected) {
                    shapeContentSelected = true;
                }
                if (shape.selected) {
                    selectedShapeContent.push(shape);
                }
                if (!shape.selected && shape.enabled) {
                    usl.push(shape);
                }
            }
            if (shapeContentSelected) {
                for (var s = 0; s < usl.length; s++) {
                    usl[s].enabled = false;
                }
            }
        }
        ocm_tempCoord = ocm_coord;
        var curTime = app.project.activeItem.time;
        var maskBounds = findMaskBounds(selectedLayers[y], curTime);
        if (byPercent == true) {
            ocm_tempCoord[0] = maskBounds.width * originalX * (selectedLayers[y].scale.value[0] / 100);
            ocm_tempCoord[1] = maskBounds.height * originalY * (selectedLayers[y].scale.value[1] / 100);
            ocm_tempCoord[2] = 0;
        }
        var customCoords = changeCorner(selectedLayers[y], curTime, ocm_tempCoord);
        moveAnchorPoint(selectedLayers[y], customCoords);
        if (shapeContentSelected) {
            while ((shape = usl.pop())) {
                shape.enabled = true;
            }
        }
        if (selectedLayers[y] instanceof ShapeLayer) {
            var layer = app.project.activeItem.selectedLayers[y];
            var numShapes = layer.property(2).numProperties;
            var reenable = [];
            for (var i = 1; i <= numShapes; i++) {
                var s = layer.property(2).property(i);
                if (s.enabled) {
                    reenable.push(s);
                    s.enabled = false;
                }
            }
            for (var _i = 0, _a = selectedShapeContent; _i < _a.length; _i++) {
                var s = _a[_i];
                s.enabled = true;
                var curTime_1 = app.project.activeItem.time;
                var shapeContentBounds = findMaskBounds(selectedLayers[y], curTime_1);
                var scale = s.property("transform").property("scale").value;
                var rotation = s.property("transform").property("rotation").value;
                var topLeft = [shapeContentBounds.left, shapeContentBounds.top];
                if (byPercent == true) {
                    ocm_tempCoord[0] = shapeContentBounds.width * originalX * (scale[0] / 100);
                    ocm_tempCoord[1] = shapeContentBounds.height * originalY * (scale[1] / 100);
                    ocm_tempCoord[2] = 0;
                }
                var newCoords = changeCornerFromData(topLeft, ocm_tempCoord, rotation);
               // alert(newCoords.toString());
                try {
                    var _b = calculatePositionAndAnchorChange(s.property("transform").property("anchorPoint").value, s.property("transform").property("position").value, newCoords, false, rotation, scale), positionChange = _b[0], anchorChange = _b[1];
                    moveStandardPropertyValue(s.property("transform").property("position"), positionChange);
                    moveStandardPropertyValue(s.property("transform").property("anchorPoint"), anchorChange);
                    s.enabled = false;
                }
                catch (err) {
                    alert(err);
                }
            }
            for (var _c = 0, reenable_1 = reenable; _c < reenable_1.length; _c++) {
                var s = reenable_1[_c];
                s.enabled = true;
            }
        }
    }
    if (wrapUndo) app.endUndoGroup();
}
function compositionCustomMAP(ccm_coord, byPercent) {
    app.beginUndoGroup("Move Anchor Point");
    try {
        var ccm_comp = app.project.activeItem;
        var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
        var numSelected = selectedLayers.length;
        var tempCoord = ccm_coord;
        if (byPercent) {
            tempCoord[0] = ccm_comp.width * ccm_coord[0];
            tempCoord[1] = ccm_comp.height * ccm_coord[1];
            tempCoord[2] = 0;
        }
        for (var i = 0; i < numSelected; i++) {
            var parent = selectedLayers[i].parent;
            selectedLayers[i].parent = null;
            moveAnchorPoint(selectedLayers[i], tempCoord);
            selectedLayers[i].parent = parent;
        }
    }
    catch (err) {
        alert(err, "Error 1103");
    }
    app.endUndoGroup();
}
function selectionCustomMAP(scm_coord, byPercent) {
    app.beginUndoGroup("Move Anchor Point");
    var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
    var numSelected = selectedLayers.length;
    var curTime = app.project.activeItem.time;
    var parent = [];
    var tempCoord = scm_coord;
    for (var i = 0; i < numSelected; i++) {
        parent[i] = selectedLayers[i].parent;
        selectedLayers[i].parent = null;
    }
    var bounds = findSelectionBounds(selectedLayers);
    var top = bounds[0];
    var bottom = bounds[1];
    var left = bounds[2];
    var right = bounds[3];
    var scm_front = bounds[4];
    var scm_back = bounds[5];
    if (byPercent) {
        tempCoord[0] = (right - left) * scm_coord[0];
        tempCoord[1] = (bottom - top) * scm_coord[1];
        tempCoord[2] = (scm_front - scm_back) * scm_coord[2];
    }
    for (var j = 0; j < numSelected; j++) {
        if (selectedLayers[j].scale.valueAtTime(curTime, true)[0] == 0 ||
            selectedLayers[j].scale.valueAtTime(curTime, true)[1] == 0) {
            continue;
        }
        moveAnchorPoint(selectedLayers[j], [left + tempCoord[0], top + tempCoord[1], scm_back + tempCoord[2]]);
        selectedLayers[j].parent = parent[j];
    }
    app.endUndoGroup();
}

function moveAnchorPoint(map_CurLayer, coordinates) {
    var curAP = map_CurLayer.anchorPoint.value;
    var curP = map_CurLayer.position.value;
    var curValueType = map_CurLayer.anchorPoint.propertyValueType;
    if (!propertyIs2D(curValueType, curAP) && !propertyIs3D(curValueType, curAP)) {
        throw new Error("Invalid layer");
    }
    if (!propertyIs2D(curValueType, curP) && !propertyIs3D(curValueType, curP)) {
        throw new Error("Invalid layer");
    }
    if (curAP.length != coordinates.length) {
        throw new Error("Invalid coordinates length");
    }
    var newP = mul(-1, sub(curP, coordinates, curAP));
    var aChange = [];
    var pChange = [];
    if (!map_CurLayer.threeDLayer) {
        var degree = map_CurLayer.rotation.value;
        if (!propertyIs1D(degree)) {
            throw new Error("Invalid degree value type");
        }
        var angle = (degree * Math.PI) / 180;
        var curX = newP[0] - curAP[0];
        var curY = newP[1] - curAP[1];
        curY = curY * -1;
        var newX = curX * Math.cos(angle) - curY * Math.sin(angle);
        var newY = curX * Math.sin(angle) + curY * Math.cos(angle);
        var xScaleFactor = map_CurLayer.scale.value[0] / 100;
        var yScaleFactor = map_CurLayer.scale.value[1] / 100;
        var newAP = [0, 0];
        newAP = [newX / xScaleFactor + curAP[0], -1 * (newY / yScaleFactor - curAP[1])];
        if (isNaN(newAP[0])) {
            newAP[0] = curAP[0];
        }
        if (isNaN(newAP[1])) {
            newAP[1] = curAP[1];
        }
        pChange = sub(curP, coordinates);
        aChange = sub(curAP, newAP);
    }
    else {
        var scaleX = map_CurLayer.scale.value[0] / 100;
        var scaleY = map_CurLayer.scale.value[1] / 100;
        var scaleZ = map_CurLayer.scale.value[2] / 100;
        pChange = sub(curP, coordinates);
        var spRots = [map_CurLayer.xRotation.value, map_CurLayer.yRotation.value, map_CurLayer.zRotation.value];
        aChange = sub(curP, brotate3DPointAround3DPoint(brotate3DPointAround3DPoint(coordinates, curP, mul(-1, map_CurLayer.orientation.value)), curP, mul(-1, spRots)));
        scaleX = scaleX == 0 ? 1 : scaleX;
        scaleY = scaleY == 0 ? 1 : scaleY;
        scaleZ = scaleZ == 0 ? 1 : scaleZ;
        aChange = [aChange[0] / scaleX, aChange[1] / scaleY, aChange[2] / scaleZ];
    }
    try {
        if (!map_CurLayer.position.dimensionsSeparated) {
            if (map_CurLayer.position.isTimeVarying) {
                var numKeys = map_CurLayer.position.numKeys;
                for (var i = 1; i <= numKeys; i++) {
                    var pCurValue = map_CurLayer.position.keyValue(i);
                    map_CurLayer.position.setValueAtKey(i, sub(pCurValue, pChange));
                }
            }
            else {
                map_CurLayer.position.setValue(sub(curP, pChange));
            }
        }
        else {
            if (map_CurLayer.transform.xPosition.isTimeVarying) {
                var numKeys = map_CurLayer.transform.xPosition.numKeys;
                for (var i = 1; i <= numKeys; i++) {
                    var pCurValue = map_CurLayer.transform.xPosition.keyValue(i);
                    map_CurLayer.transform.xPosition.setValueAtKey(i, sub(pCurValue, pChange[0]));
                }
            }
            else {
                map_CurLayer.transform.xPosition.setValue(curP[0] - pChange[0]);
            }
            if (map_CurLayer.transform.yPosition.isTimeVarying) {
                var numKeys = map_CurLayer.transform.yPosition.numKeys;
                for (var i = 1; i <= numKeys; i++) {
                    var pCurValue = map_CurLayer.transform.yPosition.keyValue(i);
                    map_CurLayer.transform.yPosition.setValueAtKey(i, sub(pCurValue, pChange[1]));
                }
            }
            else {
                map_CurLayer.transform.yPosition.setValue(curP[1] - pChange[1]);
            }
            if (map_CurLayer.threeDLayer) {
                if (map_CurLayer.transform.zPosition.isTimeVarying) {
                    var numKeys = map_CurLayer.transform.zPosition.numKeys;
                    for (var i = 1; i <= numKeys; i++) {
                        var pCurValue = map_CurLayer.transform.zPosition.keyValue(i);
                        map_CurLayer.transform.zPosition.setValueAtKey(i, sub(pCurValue, pChange[2]));
                    }
                }
                else {
                    map_CurLayer.transform.zPosition.setValue(curP[2] - pChange[2]);
                }
            }
        }
    }
    catch (err) {
        alert(err, "Error 2016");
    }
    if (map_CurLayer.anchorPoint.isTimeVarying) {
        var numKeys = map_CurLayer.anchorPoint.numKeys;
        for (var i = 1; i <= numKeys; i++) {
            var aCurValue = map_CurLayer.anchorPoint.keyValue(i);
            map_CurLayer.anchorPoint.setValueAtKey(i, sub(aCurValue, aChange));
        }
    }
    else {
        map_CurLayer.anchorPoint.setValue(sub(curAP, aChange));
    }
}
function calculatePositionAndAnchorChange(curAP, curP, coordinates, is3D, rotation, scale, orientation) {
    if (curAP.length != coordinates.length) {
        throw new Error("Invalid coordinates length");
    }
    var newP = mul(-1, sub(curP, coordinates, curAP));
    var aChange = null;
    var pChange = null;
    if (!is3D) {
        if (!propertyIs1D(rotation)) {
            throw new Error("Invalid degree value type");
        }
        var angle = (rotation * Math.PI) / 180;
        var curX = newP[0] - curAP[0];
        var curY = newP[1] - curAP[1];
        curY = curY * -1;
        var newX = curX * Math.cos(angle) - curY * Math.sin(angle);
        var newY = curX * Math.sin(angle) + curY * Math.cos(angle);
        var xScaleFactor = scale[0] / 100;
        var yScaleFactor = scale[1] / 100;
        var newAP = [0, 0];
        newAP = [newX / xScaleFactor + curAP[0], -1 * (newY / yScaleFactor - curAP[1])];
        if (isNaN(newAP[0])) {
            newAP[0] = curAP[0];
        }
        if (isNaN(newAP[1])) {
            newAP[1] = curAP[1];
        }
        pChange = sub(curP, coordinates);
        aChange = sub(curAP, newAP);
    }
    else {
        var scaleX = scale[0] / 100;
        var scaleY = scale[1] / 100;
        var scaleZ = scale[2] / 100;
        pChange = sub(curP, coordinates);
        aChange = sub(curP, brotate3DPointAround3DPoint(brotate3DPointAround3DPoint(coordinates, curP, mul(-1, orientation)), curP, mul(-1, rotation)));
        scaleX = scaleX == 0 ? 1 : scaleX;
        scaleY = scaleY == 0 ? 1 : scaleY;
        scaleZ = scaleZ == 0 ? 1 : scaleZ;
        aChange = [aChange[0] / scaleX, aChange[1] / scaleY, aChange[2] / scaleZ];
    }
    return [pChange, aChange];
}
function moveStandardPropertyValue(property, change) {
    if (property.isTimeVarying) {
        var numKeys = property.numKeys;
        for (var i = 1; i <= numKeys; i++) {
            var pCurValue = property.keyValue(i);
            property.setValueAtKey(i, sub(pCurValue, change));
        }
    }
    else {
        property.setValue(sub(property.value, change));
    }
}
function setSeparatedPosition(xPosition, yPosition, zPosition, change) {
    moveStandardPropertyValue(xPosition, change[0]);
    moveStandardPropertyValue(yPosition, change[1]);
    moveStandardPropertyValue(zPosition, change[2]);
}
function matchMAP(opts) {
    opts = opts || {};
    var wrapUndo = (opts.wrapUndo !== false); // mặc định true

    if (wrapUndo) app.beginUndoGroup("Move Anchor Point");
    try {
        var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
        if (selectedLayers.length < 2) {
            alert("At least 2 layers must be selected...", "Can't Match");
            return;
        }
        var numSelected = selectedLayers.length;
        var keyLayer = selectedLayers[numSelected - 1];
        
        var curTime = app.project.activeItem.time;

        // Lưu lại parent gốc
        var originalParent = keyLayer.parent;

        // Bỏ parent tạm thời để lấy world position chính xác
        keyLayer.parent = null;
        var coords = keyLayer.position.valueAtTime(curTime, true);

        // Khôi phục parent
        keyLayer.parent = originalParent;

        if (!is3DVector(coords) && !is2DVector(coords)) {
            throw new Error("Invalid position value");
        }
        for (var i = 0; i < numSelected - 1; i++) {
            var parent = selectedLayers[i].parent;
            selectedLayers[i].parent = null;
            moveAnchorPoint(selectedLayers[i], coords);
            selectedLayers[i].parent = parent;
        }
        //Bỏ chọn key layer
        keyLayer.selected = false;
    }
    catch (err) {
        alert(err, "Error 1044");
    }
    if (wrapUndo) app.endUndoGroup();
}

function findAndMoveAnchor(inputX, inputY, inputZ, moveTypeInput, ignoreMasks, byPercent) {
    if (!app.project.activeItem) {
        return;
    }
    globals.set("ignoreMasks", ignoreMasks);
    var percentX = parseFloat(inputX);
    var percentY = parseFloat(inputY);
    var percentZ = parseFloat(inputZ);
    if (isNaN(percentX)) {
        percentX = 0;
    }
    if (isNaN(percentY)) {
        percentY = 0;
    }
    if (isNaN(percentZ)) {
        percentZ = 0;
    }
    var moveType = parseInt(moveTypeInput);
    switch (moveType) {
        case 0:
            objectCustomMAP([percentX, percentY, percentZ], byPercent);
            break;
        case 1:
            selectionCustomMAP([percentX, percentY, percentZ], byPercent);
            break;
        case 2:
            compositionCustomMAP([percentX, percentY, percentZ], byPercent);
            break;
        case 3:
            targetCustomMAP([percentX, percentY, percentZ], byPercent);
            break;
            
    }
}

function targetCustomMAP(ocm_coord, byPercent) {
    app.beginUndoGroup("Target Custom Anchor Point (Duplicate)");

    var comp = app.project.activeItem;
    var dup = null;
    var keyLayer = null;

    try {
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select a composition first.", "Can't Run");
            return;
        }

        var selectedLayers = deselectInvalidLayers(comp.selectedLayers);
        if (!selectedLayers || selectedLayers.length < 2) {
            alert("At least 2 layers must be selected...", "Can't Run");
            return;
        }

        // target = layer cuối trong selection
        keyLayer = selectedLayers[selectedLayers.length - 1];
        if (keyLayer.nullLayer || keyLayer instanceof CameraLayer || keyLayer instanceof LightLayer) {
            alert("Target layer must not be Camera/Light/Null.");
            return;
        }

        // 🔹 Duplicate target
        dup = keyLayer.duplicate();
        try { dup.name = "TMP_dummy_calc"; } catch (e) {}
        dup.enabled = false;   
        try { dup.moveBefore(keyLayer); } catch (e) {}

        // 🔹 Build selection cho objectCustomMAP
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        for (var k = 0; k < selectedLayers.length - 1; k++) {
            selectedLayers[k].selected = true; // chọn lại các layer khác
        }
        dup.selected = false;
        dup.selected = true; // chọn dup CUỐI CÙNG => dup chắc chắn thành target

        // chạy objectCustomMAP (trên dup)
        objectCustomMAP(ocm_coord, byPercent, { wrapUndo: false });

        // 🔹 Trả lại selection ban đầu (target thật + các layer khác)
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        for (var k = 0; k < selectedLayers.length - 1; k++) {
            selectedLayers[k].selected = true;
        }
        dup.selected = false;
        dup.selected = true;

        // 🔹 chạy matchMAP (match theo kết quả objectCustomMAP của dup)
        matchMAP({ wrapUndo: false });

    } catch (err) {
        alert(err.toString(), "Error in targetCustomMAP");
    } finally {
        // luôn xoá duplicate nếu tồn tại
        try {
            if (dup && keyLayer && dup !== keyLayer && dup.containingComp === comp) {
                dup.remove();
            }
        } catch (e) {}
        app.endUndoGroup();
    }
}

// Kiểm tra có layer 3D nào trong mảng
function anySelectedIs3D(layers) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i] && layers[i].threeDLayer) return true;
    }
    return false;
}

// Trả về toạ độ comp-space cho điểm trên layer theo percent/offset (KHÔNG dùng toComp/toWorld)
function getLayerPointByPercent(layer, coord, byPercent) {
    var t = app.project.activeItem.time;
    var b = findMaskBounds(layer, t);
    var scaleX = layer.scale.valueAtTime(t, true)[0] / 100;
    var scaleY = layer.scale.valueAtTime(t, true)[1] / 100;

    var dx, dy;
    if (byPercent) {
        dx = b.width  * coord[0] * scaleX;
        dy = b.height * coord[1] * scaleY;
    } else {
        dx = coord[0];
        dy = coord[1];
    }
    // changeCorner trả về comp-space (đã xử rotation/orientation)
    var pt = changeCorner(layer, t, [dx, dy, 0]);

    // Nếu layer 3D mà changeCorner trả về 2D, lấy z từ position valueAtTime
    if (layer.threeDLayer && pt.length === 2) {
        var p3 = layer.transform.position.valueAtTime(t, true);
        pt.push(typeof p3[2] === "number" ? p3[2] : 0);
    }
    return pt; // [x,y] hoặc [x,y,z]
}

// Tính toạ độ comp-space theo selection bounds (mask-aware)
function getSelectionPointByPercent(selectedLayers, coord, byPercent) {
    var bounds = findSelectionBounds(selectedLayers); // [top, bottom, left, right, front, back]
    var top = bounds[0], bottom = bounds[1], left = bounds[2], right = bounds[3], front = bounds[4], back = bounds[5];

    var x, y, z;
    if (byPercent) {
        x = left   + (right  - left)  * coord[0];
        y = top    + (bottom - top)   * coord[1];
        z = back   + (front  - back)  * (coord[2] || 0);
    } else {
        x = left + coord[0];
        y = top  + coord[1];
        z = back + (coord[2] || 0);
    }
    return [x, y, z];
}

// Trung bình Z của selection (dùng để đặt null 3D tương ứng)
function getAverageZ(layers) {
    if (!anySelectedIs3D(layers)) return 0;
    var sum = 0, count = 0;
    for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (L && L.threeDLayer) {
            var p = L.transform.position.valueAtTime(app.project.activeItem.time, true);
            if (p && typeof p[2] === "number") {
                sum += p[2];
                count++;
            }
        }
    }
    return count > 0 ? sum / count : 0;
}

// Copy rotation/orientation từ srcLayer -> destLayer (dùng valueAtTime(..., true))
// Gọi sau khi destLayer đã được gán parent = oldParent (để copy đúng hệ parent)
function copyRotationFromLayer(srcLayer, destLayer, curTime) {
    if (!srcLayer || !destLayer) return;
    try {
        if (srcLayer.threeDLayer) {
            destLayer.property("Transform").property("Orientation")
                .setValue(srcLayer.property("Transform").property("Orientation").valueAtTime(curTime, true));
            destLayer.property("Transform").property("X Rotation")
                .setValue(srcLayer.property("Transform").property("X Rotation").valueAtTime(curTime, true));
            destLayer.property("Transform").property("Y Rotation")
                .setValue(srcLayer.property("Transform").property("Y Rotation").valueAtTime(curTime, true));
            destLayer.property("Transform").property("Z Rotation")
                .setValue(srcLayer.property("Transform").property("Z Rotation").valueAtTime(curTime, true));
        } else {
            destLayer.property("Transform").property("Rotation")
                .setValue(srcLayer.property("Transform").property("Rotation").valueAtTime(curTime, true));
        }
    } catch (e) {
        // ignore for layers that don't expose those props in a standard way
    }
}

function isAncestor(a, b) {
    var p = b && b.parent;
    while (p) { if (p === a) return true; p = p.parent; }
    return false;
}

function resolveSafeParent(desiredParent, selectedSet) {
    var p = desiredParent;
    while (p && selectedSet[p.index]) p = p.parent; // tránh parent trỏ vào layer cũng đang được chọn
    return p || null;
}

// Leo lên cho tới khi parent KHÔNG còn là hậu duệ của bất kỳ layer nào trong nhóm (tránh vòng lặp)
function resolveSafeParentAgainstGroup(desiredParent, layers) {
    var p = desiredParent;
    outer: while (p) {
        for (var i = 0; i < layers.length; i++) {
            if (isAncestor(layers[i], p)) { p = p.parent; continue outer; }
        }
        break;
    }
    return p || null;
}

// helper: kiểm tra layer có nằm trong mảng frozen (so sánh tham chiếu)
function isInFrozen(layer, frozen) {
    if (!layer || !frozen) return false;
    for (var i = 0; i < frozen.length; i++) {
        if (frozen[i] === layer) return true;
    }
    return false;
}

// helper: nếu desiredParent nằm trong frozen (hoặc là hậu duệ của 1 layer trong frozen), leo lên tới parent ngoài nhóm
function resolveSafeParentAgainstFrozen(desiredParent, frozen) {
    var p = desiredParent;
    outer: while (p) {
        for (var i = 0; i < frozen.length; i++) {
            if (isAncestor(frozen[i], p)) { // nếu p là hậu duệ của frozen[i]
                p = p.parent;
                continue outer;
            }
        }
        break;
    }
    return p || null;
}

// === revised selectNull: chỉ thay phần selectedSet/resolveSafeParent ===
function selectNull(positionPercent, byPercent) {
    var comp = app.project.activeItem;
    var selectedLayers = deselectInvalidLayers(comp.selectedLayers);
    if (!selectedLayers || selectedLayers.length === 0) return;

    var frozen  = selectedLayers.slice();
    var curTime = comp.time;

    // Lưu parent gốc
    var oldParents = [];
    for (var i = 0; i < frozen.length; i++) oldParents[i] = frozen[i].parent;

    // 1) Unparent tất cả
    for (var u = 0; u < frozen.length; u++) frozen[u].parent = null;

    // 2) Tính điểm comp-space
    var points = [];
    for (var k = 0; k < frozen.length; k++) {
        var L = frozen[k];
        points[k] = getLayerPointByPercent(L, positionPercent, byPercent);
    }

    // Deselect những layer gốc (không dùng comp.selectedLayers = [])
    for (var s = 0; s < frozen.length; s++) {
        try { frozen[s].selected = false; } catch (e) {}
    }

    var createdNulls = [];

    // 3) Tạo null + parent
    for (var k2 = 0; k2 < frozen.length; k2++) {
        var L2 = frozen[k2];
        try {
            var pt = points[k2];

            var n = comp.layers.addNull();
            n.name = L2.name + "_CTRL";
            n.threeDLayer = !!L2.threeDLayer;
            n.inPoint  = L2.inPoint;
            n.outPoint = L2.outPoint;

            // --- đảm bảo anchor point nằm giữa null ---
            try {
                // width/height tồn tại với Null (solid). Anchor cho 3D cần 3 giá trị.
                if (n.threeDLayer) {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2, 0]);
                } else {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2]);
                }
            } catch (e) {
                // nếu không set được thì bỏ qua để không phá flow
            }

            // đặt vị trí theo điểm đã tính (giữ nguyên logic của bạn)
            if (n.threeDLayer) {
                n.position.setValue([pt[0], pt[1], (pt.length > 2 ? pt[2] : 0)]);
            } else {
                n.position.setValue([pt[0], pt[1]]);
            }

            // copy rotation trước khi parent (giữ nguyên thứ tự của bạn)
            copyRotationFromLayer(L2, n, curTime);

            // Parent layer vào null
            L2.parent = n;

            // Gán lại parent gốc cho null (giữ nguyên logic)
            var oldP = oldParents[k2];
            if (oldP) {
                n.parent = oldP;
            }

            try { n.moveBefore(L2); } catch (e) {}

            createdNulls.push(n);

        } catch (err) {
            $.writeln("selectNull error for " + (L2.name || k2) + ": " + err);
        }
    }

    // Chọn các null mới tạo
    for (var c = 0; c < createdNulls.length; c++) {
        try { createdNulls[c].selected = true; } catch (e) {}
    }
}

// =============================
// Mode 1: selection Custom Null
// =============================
function groupNull(positionPercent, byPercent) {
    var comp = app.project.activeItem;
    var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
    if (!selectedLayers || selectedLayers.length === 0) return;

    // copy selection để thao tác an toàn
    var frozen = selectedLayers.slice();

    // Tính khoảng thời gian chung của cụm
    var minIn = frozen[0].inPoint;
    var maxOut = frozen[0].outPoint;

    for (var i = 1; i < frozen.length; i++) {
        if (frozen[i].inPoint < minIn)  minIn  = frozen[i].inPoint;
        if (frozen[i].outPoint > maxOut) maxOut = frozen[i].outPoint;
    }

    // --- NEW: kiểm tra parent chung trước khi unparent ---
    var commonParent = selectedLayers[0].parent;
    var allSameParent = true;
    for (var i = 1; i < selectedLayers.length; i++) {
        if (selectedLayers[i].parent !== commonParent) {
            allSameParent = false;
            break;
        }
    }

    // 1) Unparent tất cả layer (để tính bounds/pos trong comp-space)
    for (var u = 0; u < frozen.length; u++) {
        try { frozen[u].parent = null; } catch (e) { $.writeln("unparent error: " + e); }
    }

    // 2) Tính điểm comp-space sau unparent
    var pos = getSelectionPointByPercent(frozen, positionPercent, byPercent); // [x,y,(z)]
    var make3D = anySelectedIs3D(frozen);

    // fallback nếu pos không hợp lệ
    if (!pos || isNaN(pos[0]) || isNaN(pos[1])) {
        pos = [comp.width / 2, comp.height / 2, 0];
    }

    // 3) Tạo null tại pos
    var n = comp.layers.addNull();
    n.name = "Selection_CTRL";
    n.threeDLayer = !!make3D;
    n.inPoint  = minIn;
    n.outPoint = maxOut;

    try {
                // width/height tồn tại với Null (solid). Anchor cho 3D cần 3 giá trị.
                if (n.threeDLayer) {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2, 0]);
                } else {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2]);
                }
            } catch (e) {
                // nếu không set được thì bỏ qua để không phá flow
            }

    try {
        if (n.threeDLayer) n.position.setValue([pos[0], pos[1], pos[2] || 0]);
        else               n.position.setValue([pos[0], pos[1]]);
    } catch (e) {
        $.writeln("set null pos error: " + e);
    }

    // 4) Parent tất cả layer vào null (dùng frozen để tránh bị ảnh hưởng bởi addNull)
    for (var k = 0; k < frozen.length; k++) {
        try {
            // nếu layer là 3D và null chưa 3D, nâng null lên 3D để AE cho phép parent
            if (frozen[k].threeDLayer && !n.threeDLayer) {
                n.threeDLayer = true;
                // (thường vẫn giữ world-pos đúng vì chúng ta đã đặt pos theo comp-space)
            }
            frozen[k].parent = n;
        } catch (err) {
            $.writeln("groupNull parent-to-null error: " + err);
        }
    }

    // 5) Nếu ban đầu tất cả có chung 1 parent (và khác null) -> parent null về parent cũ
    if (allSameParent && commonParent) {
        try {
            n.parent = commonParent;
        } catch (e) {
            $.writeln("failed to parent null to commonParent: " + e);
        }
    }

    // đặt null trước layer đầu để tiện quản lý
    var minIndex = frozen[0].index;
    for (var i = 1; i < frozen.length; i++) {
        if (frozen[i].index < minIndex) {
            minIndex = frozen[i].index;
        }
    }
    var topLayer = comp.layer(minIndex);

    // Giả sử bạn có 1 null là n
    n.moveBefore(topLayer);

    }

// =============================
// Mode 2: Composition Custom Null
// =============================
function compositionCustomNull(positionPercent, byPercent) {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return;

    // Lưu lại selection ban đầu
    var sel = comp.selectedLayers.slice();

    // Tính khoảng thời gian chung của cụm
    if (sel.length > 0) {
        var minIn = sel[0].inPoint;
        var maxOut = sel[0].outPoint;

        for (var i = 1; i < sel.length; i++) {
            if (sel[i].inPoint < minIn)  minIn  = sel[i].inPoint;
            if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
        }
    } else {
        var minIn = 0;
        var maxOut = comp.duration;
    }


    var W = comp.width, H = comp.height;
    var pos;

    if (byPercent) {
        pos = [W * positionPercent[0], H * positionPercent[1], 0];
    } else {
        switch (Math.round(positionPercent[0])) {
            case 0: pos = [0, 0, 0]; break;
            case 1: pos = [W/2, 0, 0]; break;
            case 2: pos = [W, 0, 0]; break;
            case 3: pos = [0, H/2, 0]; break;
            case 4: pos = [W/2, H/2, 0]; break;
            case 5: pos = [W, H/2, 0]; break;
            case 6: pos = [0, H, 0]; break;
            case 7: pos = [W/2, H, 0]; break;
            case 8: pos = [W, H, 0]; break;
            default: pos = [W/2, H/2, 0]; break;
        }
    }

    // Null 2D
    var n = comp.layers.addNull();
    n.name = "CompCTRL";
    n.threeDLayer = false;
    n.inPoint  = minIn;
    n.outPoint = maxOut;
    n.property("Position").setValue(pos);

    try {
            n.anchorPoint.setValue([n.width / 2, n.height / 2]);
                
            } catch (e) {
                // nếu không set được thì bỏ qua để không phá flow
            }

    try { n.moveToBeginning(); } catch (e) {}

    // Check parent chung
    if (sel.length > 0) {
        var commonParent = sel[0].parent;
        var allSameParent = true;

        for (var i = 1; i < sel.length; i++) {
            if (sel[i].parent !== commonParent) {
                allSameParent = false;
                break;
            }
        }

        // Bỏ parent cũ
        for (var j = 0; j < sel.length; j++) {
            sel[j].parent = null;
        }

        // Gán parent mới → null
        for (var k = 0; k < sel.length; k++) {
            sel[k].parent = n;
        }

        // Nếu có parent chung → null parent vào đó
        if (allSameParent && commonParent !== null) {
            n.parent = commonParent;
        }
    }

    return n;
}

// =============================
// Mode 3: Target Custom Null
// =============================
function targetCustomNull(positionPercent, byPercent, ignoreMasks) {
    var comp = app.project.activeItem;
    var selectedLayers = deselectInvalidLayers(app.project.activeItem.selectedLayers);
    if (!selectedLayers || selectedLayers.length < 2) return; // cần ít nhất target + 1 layer

    var frozen = selectedLayers.slice();

    // Tính khoảng thời gian chung của cụm
    var minIn = frozen[0].inPoint;
    var maxOut = frozen[0].outPoint;

    for (var i = 1; i < frozen.length; i++) {
        if (frozen[i].inPoint < minIn)  minIn  = frozen[i].inPoint;
        if (frozen[i].outPoint > maxOut) maxOut = frozen[i].outPoint;
    }

    var target = frozen[frozen.length - 1];   // layer cuối cùng là target
    var otherLayers = frozen.slice(0, frozen.length - 1);

    var selectedSet = {};
    for (var s = 0; s < frozen.length; s++) selectedSet[frozen[s].index] = true;

    // 1) Lưu parent hiện tại của target
    var targetOldParent = target.parent;

    // 2) Bỏ parent target để tính toán
    target.parent = null;

    // 3) Tính vị trí null dựa theo target (bounds hoặc corner)
    var pos = getLayerPointByPercent(target, positionPercent, byPercent, ignoreMasks); // [x,y,(z)]
    var make3D = anySelectedIs3D(frozen);

    // 4) Tạo null mới tại vị trí của target
    var n = comp.layers.addNull();
    n.name = target.name + "_TargetCTRL";
    n.threeDLayer = !!make3D;
    n.inPoint  = minIn;
    n.outPoint = maxOut;

    try {
                // width/height tồn tại với Null (solid). Anchor cho 3D cần 3 giá trị.
                if (n.threeDLayer) {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2, 0]);
                } else {
                    n.anchorPoint.setValue([n.width / 2, n.height / 2]);
                }
            } catch (e) {
                // nếu không set được thì bỏ qua để không phá flow
            }

    if (n.threeDLayer) n.position.setValue([pos[0], pos[1], pos[2] || 0]);
    else               n.position.setValue([pos[0], pos[1]]);

    // 5) Parent các layer khác vào null
    for (var i = 0; i < otherLayers.length; i++) {
        var L = otherLayers[i];
        try {
            L.parent = null;
            L.parent = n;
        } catch (err) {
            $.writeln("targetCustomNull parent error: " + err);
        }
    }

    // 6) Trả lại parent cũ cho target
    try { target.parent = targetOldParent; } catch (e) {}

    // 7) Đặt null ngay trước target
    try { n.moveBefore(target); } catch (e) {}

}

// ===== Main =====
function findAndSetNull(inputX, inputY, inputZ, moveTypeInput, ignoreMasks, byPercent) {
    if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) return;
    globals.set("ignoreMasks", !!ignoreMasks);

    var percentX = parseFloat(inputX);
    var percentY = parseFloat(inputY);
    var percentZ = parseFloat(inputZ);
    if (isNaN(percentX)) percentX = 0;
    if (isNaN(percentY)) percentY = 0;
    if (isNaN(percentZ)) percentZ = 0;

    var moveType = parseInt(moveTypeInput);
    var comp = app.project.activeItem;

    app.beginUndoGroup("Find and Set Null");

    switch (moveType) {
        case 0:
            selectNull([percentX, percentY, percentZ], byPercent);
            break;
        case 1:
            groupNull([percentX, percentY, percentZ], byPercent);
            break;
        case 2:
            compositionCustomNull([percentX, percentY, percentZ], byPercent);
            break;
        case 3:
            targetCustomNull([percentX, percentY, percentZ], byPercent);
            break;
    }

    app.endUndoGroup();
}

/// End phần tạo null
function createNullAtAnchorWithRotation() {
    if (!(app.project.activeItem instanceof CompItem)) {
        alert("Comp not Active.", "Create Null at Anchor");
        return;
    }

    var comp = app.project.activeItem;
    var selected = comp.selectedLayers;
    if (!selected || selected.length === 0) {
        alert("At least 1 layer must be selected.", "Create Null at Anchor");
        return;
    }

    var curTime = comp.time;
    app.beginUndoGroup("Create Null at Anchors with Rotation");

    var createdNulls = []; // lưu null mới tạo

    for (var i = 0; i < selected.length; i++) {
        var layer = selected[i];

        // Bỏ qua Camera, Light, Audio
        if (layer.nullLayer || layer.hasVideo === false) continue;

        // Tạo Null
        var nul = comp.layers.addNull();
        nul.name = layer.name + "_AnchorNull";
        nul.threeDLayer = layer.threeDLayer; // khớp 2D/3D
        nul.inPoint  = layer.inPoint;
        nul.outPoint = layer.outPoint;

        try {
            if (nul.threeDLayer) {
                nul.anchorPoint.setValue([nul.width / 2, nul.height / 2, 0]);
            } else {
                nul.anchorPoint.setValue([nul.width / 2, nul.height / 2]);
            }
        } catch (e) {}

        nul.moveBefore(layer);
        nul.parent = layer.parent; // giữ nguyên parent ban đầu của layer

        // Lấy vị trí anchor point hiển thị (snapshot)
        var pos = layer.property("Transform").property("Position").valueAtTime(curTime, true);
        nul.property("Transform").property("Position").setValue(pos);

        // Copy rotation
        if (layer.threeDLayer) {
            nul.property("Transform").property("Orientation").setValue(
                layer.property("Transform").property("Orientation").valueAtTime(curTime, true)
            );
            nul.property("Transform").property("X Rotation").setValue(
                layer.property("Transform").property("X Rotation").valueAtTime(curTime, true)
            );
            nul.property("Transform").property("Y Rotation").setValue(
                layer.property("Transform").property("Y Rotation").valueAtTime(curTime, true)
            );
            nul.property("Transform").property("Z Rotation").setValue(
                layer.property("Transform").property("Z Rotation").valueAtTime(curTime, true)
            );
        } else {
            nul.property("Transform").property("Rotation").setValue(
                layer.property("Transform").property("Rotation").valueAtTime(curTime, true)
            );
        }

        // Gán parent mới cho layer là Null vừa tạo
        layer.parent = nul;

        createdNulls.push(nul); // lưu lại
    }

    // Chọn tất cả null mới tạo
    for (var j = 0; j < createdNulls.length; j++) {
        createdNulls[j].selected = true;
    }

    app.endUndoGroup();
};

// Hàm Parent to target
function parentSelectedLayersToLast() {
    app.beginUndoGroup("Parent to Last Selected");

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("Comp not active");
        return;
    }

    var selLayers = comp.selectedLayers;
    if (selLayers.length < 2) {
        alert("At least 2 layers must be selected");
        return;
    }

    var target = selLayers[selLayers.length - 1];
    var layersToProcess = [];

    // --- Kiểm tra nếu target layer đang là con của 1 trong các layer cần set ---
    for (var i = 0; i < selLayers.length - 1; i++) {
        if (target.parent === selLayers[i]) {
            target.parent = null; // Bỏ parent của target trước
            break;
        }
    }

    // --- Hàm kiểm tra có phải là ancestor của một layer hay không ---
    function isAncestor(possibleAncestor, lyr) {
        var currentParent = lyr.parent;
        while (currentParent) {
            if (currentParent === possibleAncestor) {
                return true;
            }
            currentParent = currentParent.parent;
        }
        return false;
    }


    // --- Xác định danh sách layer cần set parent ---
    for (var i = 0; i < selLayers.length - 1; i++) {
        var lyr = selLayers[i];

        // Bỏ qua nếu layer đã parent vào target
        if (lyr.parent === target) {
            continue;
        }

        // Bỏ qua nếu target là con cháu của layer này (để tránh vòng lặp)
        if (isAncestor(lyr, target)) {
            continue;
        }

        layersToProcess.push(lyr);
    }

    // --- Bỏ parent trước ---
    for (var i = 0; i < layersToProcess.length; i++) {
        layersToProcess[i].parent = null;
    }

    // --- Set parent vào target ---
    for (var i = 0; i < layersToProcess.length; i++) {
        layersToProcess[i].parent = target;
    }

    //Chọn Target
    for (var i = 0; i < layersToProcess.length; i++) {
        layersToProcess[i].selected = false;
    }
    target.selected = true;

    app.endUndoGroup();
}

// Quick set Anchor ==========
function quickSetAnchor() {
        try {
            matchMAP();
        } catch (e) {
            alert(e, "Match Error");
        }    
}

// Quick set Null ======
function quickSetNull() {
    var shiftPressed = ScriptUI.environment.keyboardState.shiftKey;

    if (!shiftPressed) {  
        app.beginUndoGroup("Quick set Null At center") 
        try {
            groupNull([0.5,0.5,0.5], true);
        } catch (e) {
            alert(e, "Match Error");
        }    
        app.endUndoGroup();
    } else {
        try {
            createNullAtAnchorWithRotation();
        } catch (e) {
            alert(e, "Match Error");
        }
    }
}

// Hàm Color Control ////////////////////////////////////////////////////////////
function colorControl() {
    var win = new Window("palette", "Color Control", undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 8;

    // Header / Mode
    var modeG = win.add("group");
    modeG.add("statictext", undefined, "Search Mode:");
    var rbLayer = modeG.add("radiobutton", undefined, "Layer");
    var rbComp  = modeG.add("radiobutton", undefined, "Comp");
    rbLayer.value = true;

    // Colors found panel (grid)
    var colorPanel = win.add("panel", undefined, "Colors Found");
    colorPanel.preferredSize = [320, 120];
    colorPanel.alignChildren = ["left", "top"];
    colorPanel.margins = 8;

    var grid = colorPanel.add("group");
    grid.orientation = "row";
    grid.alignChildren = ["left", "top"];
    grid.spacing = 3;

    var MAX_COLS = 10;
    var swatches = [];

    function drawSwatch(btn) {
        var g = btn.graphics;
        var c = btn._col || [0.12, 0.12, 0.12];
        g.newPath();
        g.rectPath(0, 0, btn.size[0], btn.size[1]);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [c[0], c[1], c[2], 1]));
    }

    for (var i = 0; i < MAX_COLS; i++) {
        var b = grid.add("custombutton", undefined, "");
        b.preferredSize = [28, 28];
        b.visible = false;
        b.enabled = false;
        b._col = [0.12, 0.12, 0.12];
        b.onDraw = function() { drawSwatch(this); };
        b.target = null; // will store { prop, color, label }
        swatches.push(b);
    }

    // Buttons
    var btnRow = win.add("group");
    btnRow.orientation = "row";
    btnRow.alignChildren = ["center", "top"];
    btnRow.margins = 4;
    var attackBtn = btnRow.add("button", undefined, "Attack");
    var makeCtrlBtn = btnRow.add("button", undefined, "Make Control");

    // storage
    var colorTargets = []; // { prop, color, label }


    function safeGetValue(p) {
        try { return p.value; } catch(e) { return [0,0,0]; }
    }


    function getPropertyPath(prop) {
        if (!prop || typeof prop.matchName !== 'string') return null;
        
        var path = [];
        var currentProp = prop;

        // Lặp ngược lên đến khi parent là Layer (hoặc null)
        while (currentProp) {
            // Dùng matchName cho thuộc tính/nhóm thuộc tính
            // Dùng name cho các nhóm đặc biệt (như Contents Group)
            var namePart = currentProp.matchName; 

            // Nếu là Contents Group, chúng ta cần đảm bảo tên duy nhất được bao gồm.
            // Điều kiện này giúp phân biệt "Rectangle 1" với "Rectangle 2"
            if (currentProp.propertyType === PropertyType.NAMED_GROUP || 
                currentProp.propertyType === PropertyType.INDEXED_GROUP) {
                
                // Nếu đây là nhóm được người dùng đặt tên (như Rectangle 1)
                // Lấy Tên Hiển Thị + MatchName để đảm bảo tính duy nhất
                namePart = currentProp.name + " [" + currentProp.matchName + "]"; 
            }

            path.unshift(namePart);
            
            // Dừng lại khi lên đến layer
            if (currentProp.propertyDepth <= 1) break; 
            
            currentProp = currentProp.parentProperty;
        }
        
        // Loại bỏ tên Layer (phần tử đầu tiên) vì chúng ta đã có sourceLabel
        if (path.length > 0) path.shift(); 
        
        return path.join("/");
    }


    function getSafeProperty(item) {
        try {
            if (!item.layerIndex || !item.propPath) return item.prop || null;
            
            // 1. Tìm Comp (hoặc dùng Comp gốc nếu không có)
            var comp = item.comp || app.project.activeItem;
            if (!comp) return null;

            // 2. Tìm Layer
            var layer = comp.layer(item.layerIndex);
            if (!layer) return null;
            
            // 3. Tái tạo Property bằng đường dẫn
            return layer.propertyFromPath(item.propPath);
        } catch(e) { 
            return item.prop || null; // Fallback: trả về tham chiếu cũ (có thể hỏng)
        }
    }

    function scanPropertyGroup(group, results, sourceLabel, sourceLayer) {
        if (!group || typeof group.numProperties === "undefined") return;
        //if (/Material Options/i.test(group.name)) return;

        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (!p) continue;

            try {
                if (p.propertyType === PropertyType.PROPERTY &&
                    p.propertyValueType === PropertyValueType.COLOR) {

                    var val = safeGetValue(p);

                    // 🔍 thử gán lại chính giá trị của nó để test xem có set được không
                    var canSet = true;
                    try {
                        p.setValue(val);
                    } catch (err) {
                        canSet = false;
                    }

                    // nếu không set được thì bỏ qua luôn
                    if (!canSet) continue;

                    results.push({ // <-- Chỉ thay đổi dòng này
                    prop: p,
                    color: val,
                    label: sourceLabel + " | " + (p.parentProperty ? p.parentProperty.name + "/" + p.name : p.name),
                    layerIndex: sourceLayer.index,
                    comp: sourceLayer.containingComp,
                    propPath: getPropertyPath(p)
                });

                } else if (
                    p.propertyType === PropertyType.NAMED_GROUP ||
                    p.propertyType === PropertyType.INDEXED_GROUP
                ) {
                    // chỉ quét group hiển thị
                    if (p.enabled !== false && p.active !== false && p.name) {
                        scanPropertyGroup(p, results, sourceLabel, sourceLayer);
                    }
                }
            } catch (e) {
                // bỏ qua property lỗi hoặc không truy cập được
            }
        }
    }


    function findColorPropsInLayer(layer, results) {
        if (!layer) return;

    

        // 🟣 Trường hợp là Text Layer
        if (layer.property("Source Text")) {
            try {
                var textProp = layer.property("Source Text");
                var textDoc = textProp.value;

                if (textDoc && textDoc.applyFill && textDoc.fillColor) {
                    results.push({
                        prop: textProp,
                        color: textDoc.fillColor,
                        label: layer.name + " | Text Fill",
                        isTextFill: true,
                        isTextStroke: false,
                        layerIndex: layer.index,
                        _fakeId: layer.name + "_fill",
                        comp: layer.containingComp,
                        propPath: "ADBE Text Properties/ADBE Text Document"
                    });
                }
                if (textDoc && textDoc.applyStroke && textDoc.strokeColor) {
                    results.push({
                        prop: textProp,
                        color: textDoc.strokeColor,
                        label: layer.name + " | Text Stroke",
                        isTextFill: false,
                        isTextStroke: true,
                        layerIndex: layer.index,
                        _fakeId: layer.name + "_stroke",
                        comp: layer.containingComp,
                        propPath: "ADBE Text Properties/ADBE Text Document"
                    });
                }
            } catch (e) {
                $.writeln("Text color read error in layer “" + layer.name + "”: " + e.toString());
            }
        }

        // 1️⃣ Quét toàn bộ group trong layer (shape contents, transforms, material options,...)
        scanPropertyGroup(layer, results, layer.name, layer);

    }

    function findColorPropsInComp(comp, results, visited) {
        if (!comp || visited[comp.id]) return;
        visited[comp.id] = true;
        try {
            for (var i = 1; i <= comp.numLayers; i++) {
                var lyr = comp.layer(i);
                if (!lyr) continue;
                findColorPropsInLayer(lyr, results);
                if (lyr.source && lyr.source instanceof CompItem) {
                    findColorPropsInComp(lyr.source, results, visited);
                }
            }
        } catch(e){}
    }

    function showColorPicker(currentColor) {
        if (!currentColor) currentColor = [0.5, 0.5, 0.5];

        var win = new Window("dialog", "Color Picker", undefined);
        win.alignChildren = "fill";
        win.spacing = 10;
        win.margins = 10;

        // --- Preview ---
        var preview = win.add("panel", undefined, "");
        preview.preferredSize = [160, 50];
        preview.graphics.backgroundColor = win.graphics.newBrush(win.graphics.BrushType.SOLID_COLOR, currentColor);

        // --- RGB Sliders ---
        var rgbGroup = win.add("group");
        rgbGroup.orientation = "column";
        rgbGroup.alignChildren = ["fill", "top"];
        rgbGroup.spacing = 4;

        var labels = ["R", "G", "B"];
        var sliders = [];
        for (var i = 0; i < 3; i++) {
            var g = rgbGroup.add("group");
            g.add("statictext", undefined, labels[i] + ":").preferredSize = [60, 20];
            var s = g.add("slider", undefined, currentColor[i] * 255, 0, 255);
            s.preferredSize = [140, 16];
            var t = g.add("edittext", undefined, Math.round(currentColor[i] * 255));
            t.characters = 4;
            sliders.push({ slider: s, text: t });
        }

        // --- Brightness ---
        var brightGroup = rgbGroup.add("group");
        brightGroup.add("statictext", undefined, "Brightness:").preferredSize = [60, 20];
        var brightSlider = brightGroup.add("slider", undefined, 1, 0, 1);
        brightSlider.preferredSize = [140, 16];
        var brightText = brightGroup.add("edittext", undefined, "1.0");
        brightText.characters = 4;

        // --- HEX & Pick Button ---
        var hexGroup = win.add("group");
        hexGroup.alignChildren = ["center", "center"];
        hexGroup.add("statictext", undefined, "HEX:");
        var hexInput = hexGroup.add("edittext", undefined, rgbToHex(currentColor));
        hexInput.characters = 10;
        var pickBtn = hexGroup.add("button", undefined, "Pick Color");

        // --- Buttons ---
        var btnGroup = win.add("group");
        btnGroup.alignment = "center";
        var okBtn = btnGroup.add("button", undefined, "OK");
        var cancelBtn = btnGroup.add("button", undefined, "Cancel");

        // --- Helper functions ---
        function rgbToHex(rgb) {
            return (
                "#" +
                rgb
                    .map(function (v) {
                        var n = Math.round(v * 255).toString(16);
                        return n.length < 2 ? "0" + n : n;
                    })
                    .join("")
                    .toUpperCase()
            );
        }

        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{6})$/i.exec(hex);
            if (!result) return currentColor;
            var n = parseInt(result[1], 16);
            return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
        }

        function updatePreview(fromHex) {
            var r = sliders[0].slider.value / 255;
            var g = sliders[1].slider.value / 255;
            var b = sliders[2].slider.value / 255;
            var bright = parseFloat(brightSlider.value);
            var color = [r * bright, g * bright, b * bright].map(function (v) {
                return Math.min(1, Math.max(0, v));
            });
            preview.graphics.backgroundColor = win.graphics.newBrush(win.graphics.BrushType.SOLID_COLOR, color);
            if (!fromHex) hexInput.text = rgbToHex(color);
        }

        function setRGBFromHex(hex) {
            var rgb = hexToRgb(hex);
            for (var i = 0; i < 3; i++) {
                sliders[i].slider.value = rgb[i] * 255;
                sliders[i].text.text = Math.round(rgb[i] * 255);
            }
            updatePreview(true);
        }

        // --- Events ---
        for (var i = 0; i < 3; i++) {
            (function (idx) {
                sliders[idx].slider.onChanging = function () {
                    sliders[idx].text.text = Math.round(this.value);
                    updatePreview();
                };
                sliders[idx].text.onChange = function () {
                    var val = parseInt(this.text, 10);
                    if (isNaN(val)) val = 0;
                    val = Math.max(0, Math.min(255, val));
                    sliders[idx].slider.value = val;
                    updatePreview();
                };
            })(i);
        }

        brightSlider.onChanging = function () {
            brightText.text = this.value.toFixed(2);
            updatePreview();
        };
        brightText.onChange = function () {
            var val = parseFloat(this.text);
            if (isNaN(val)) val = 1;
            val = Math.max(0, Math.min(2, val));
            this.text = val.toFixed(2);
            brightSlider.value = val;
            updatePreview();
        };

        hexInput.onChange = function () {
            setRGBFromHex(this.text);
        };

        pickBtn.onClick = function () {
            var intColor = rgbArrToInt(currentColor);
            var picked = $.colorPicker(intColor);
            if (picked === -1) return;
            var rgb = intToRgbArr(picked);
            for (var i = 0; i < 3; i++) {
                sliders[i].slider.value = rgb[i] * 255;
                sliders[i].text.text = Math.round(rgb[i] * 255);
            }
            updatePreview();
        };

        function rgbArrToInt(arr) {
            return (Math.round(arr[0] * 255) << 16) + (Math.round(arr[1] * 255) << 8) + Math.round(arr[2] * 255);
        }

        function intToRgbArr(i) {
            return [(i >> 16 & 255) / 255, (i >> 8 & 255) / 255, (i & 255) / 255];
        }

        // --- Result ---
        var result = null;

        okBtn.onClick = function () {
            var r = sliders[0].slider.value / 255;
            var g = sliders[1].slider.value / 255;
            var b = sliders[2].slider.value / 255;
            var bright = parseFloat(brightSlider.value);
            result = [r * bright, g * bright, b * bright];
            win.close();
        };

        cancelBtn.onClick = function () {
            result = null; // không làm gì cả
            win.close();
        };

        win.center();
        win.show();

        return result;
    }

    // refresh UI swatches from colorTargets
    function refreshSwatches() {
        // clear UI
        for (var i = 0; i < swatches.length; i++) {
            var sb = swatches[i];
            sb.visible = false;
            sb.enabled = false;
            sb.target = null;
            sb._col = [0.12, 0.12, 0.12];
            sb.notify && sb.notify("onDraw");
        }

        // Nếu số lượng màu mới vượt quá số ô hiện có → thêm bù
        while (swatches.length < colorTargets.length) {
            var b = grid.add("custombutton", undefined, "");
            b.preferredSize = [28, 28];
            b.visible = false;
            b.enabled = false;
            b._col = [0.12, 0.12, 0.12];
            b.onDraw = function() { drawSwatch(this); };
            b.target = null;
            swatches.push(b);
        }

        // Nếu số lượng màu ít hơn và đang có nhiều ô hơn cần thiết → ẩn bớt hoặc xoá bớt, giữ tối thiểu 10
        while (swatches.length > Math.max(colorTargets.length, 10)) {
            var sb = swatches.pop(); // xoá khỏi mảng
            sb.visible = false;
            sb.enabled = false;
            try { sb.parent.remove(sb); } catch (e) {}
        }

        // Giới hạn số hiển thị
        MAX_COLS = Math.max(10, Math.min(colorTargets.length, 100)); // ít nhất 10, tối đa 100

        // fill
        for (var j = 0; j < Math.min(colorTargets.length, MAX_COLS); j++) {
            var info = colorTargets[j];
            var sb = swatches[j];
            sb.visible = true;
            sb.enabled = true;

            var c = info.color || [0.12, 0.12, 0.12];
            sb._col = [c[0], c[1], c[2]];
            sb.target = info;
            sb.helpTip = info.label || info.prop.name || "Color";

            (function (localBtn, localInfo) {
                localBtn.onClick = function () {
                    var current = localBtn._col || [0.12, 0.12, 0.12];
                    var picked = showColorPicker(current);
                    if (!picked) return; // Cancel thì thoát

                    localBtn._col = picked;
                    if (localBtn.notify) localBtn.notify("onDraw");

                    try {
                        // 🔹 Xử lý trường hợp có nhiều property liên kết cùng màu
                        if (localInfo.linkedProps && localInfo.linkedProps.length > 0) {
                            for (var i = 0; i < localInfo.linkedProps.length; i++) {
                                var item = localInfo.linkedProps[i];
                                var p = item.prop;
                                if (!p) continue;

                                // 🟣 Text Layer fill/stroke
                                if (item.isTextFill || item.isTextStroke) {
                                    var doc = p.value;
                                    if (item.isTextFill) doc.fillColor = picked;
                                    if (item.isTextStroke) doc.strokeColor = picked;
                                    p.setValue(doc);
                                } 
                                // 🟢 Property màu thường
                                else if (
                                    p.propertyValueType === PropertyValueType.COLOR ||
                                    p.canSetExpression === true
                                ) {
                                    p.setValue(picked);
                                }
                            }
                        } 
                        // 🔹 Trường hợp chỉ 1 prop
                        else if (localInfo.prop) {
                            var p = localInfo.prop;

                            if (localInfo.isTextFill || localInfo.isTextStroke) {
                                var doc = p.value;
                                if (localInfo.isTextFill) doc.fillColor = picked;
                                if (localInfo.isTextStroke) doc.strokeColor = picked;
                                p.setValue(doc);
                            } else {
                                p.setValue(picked);
                            }
                        }

                        localInfo.color = picked;
                    } catch (e) {
                        alert("Cannot set color on this property: " + e.toString());
                    }
                };
            })(sb, info);

            sb.notify && sb.notify("onDraw");
        }

        // Cập nhật layout
        colorPanel.layout.layout(true);
        win.layout.layout(true);
    }

    // Attack logic
    attackBtn.onClick = function() {
        app.beginUndoGroup("QC Attack");
        colorTargets = [];

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            alert("Please select a composition.");
            app.endUndoGroup();
            return;
        }

        var sel = comp.selectedLayers;
        if (!sel || sel.length === 0) {
            alert("Please select at least one layer.");
            app.endUndoGroup();
            return;
        }

        // 🔹 Kiểm tra nếu đang giữ phím Shift
        var shiftPressed = ScriptUI.environment.keyboardState.shiftKey;

        var found = [];
        if (rbLayer.value) {
            for (var i = 0; i < sel.length; i++) {
                findColorPropsInLayer(sel[i], found);
            }
        } else {
            for (var i = 0; i < sel.length; i++) {
                var lyr = sel[i];
                if (lyr.source && lyr.source instanceof CompItem) {
                    findColorPropsInComp(lyr.source, found, {});
                }
            }
        }

        // ---------------------------
        // 🔹 Xử lý loại trùng màu
        // ---------------------------
        var uniq = [];
        var seen = {};

        for (var k = 0; k < found.length; k++) {
            var it = found[k];
            try {
                var v = it.color || safeGetValue(it.prop);

                var key = "";
                
                if (shiftPressed) {
                    // 1. Giữ Shift: Chỉ gom theo màu RGB (Tất cả 4 thuộc tính Vàng gộp thành 1)
                    key = Math.round(v[0]*255) + "," + Math.round(v[1]*255) + "," + Math.round(v[2]*255);
                } else {
                    // 2. KHÔNG giữ Shift: Gom theo ĐƯỜNG DẪN + MÀU (Tất cả 4 thuộc tính Vàng KHÔNG gộp)
                    // 🏆 Dùng propPath (MatchName) hoặc _fakeId (Text) để đảm bảo key DUY NHẤT.
                    
                    var uniqueID = it.propPath || it._fakeId;
                    if (uniqueID) {
                        // Key hoàn toàn dựa trên đường dẫn tuyệt đối (propPath/fakeId) + màu
                        // (Thêm màu vào đề phòng các đường dẫn khác nhau nhưng màu là [0,0,0])
                        key = uniqueID + " • " + Math.round(v[0]*255) + "," + Math.round(v[1]*255) + "," + Math.round(v[2]*255);
                    } else {
                        // Giải pháp dự phòng nếu không có propPath (ít khi xảy ra)
                        key = Math.round(v[0]*255) + "," + Math.round(v[1]*255) + "," + Math.round(v[2]*255) + " • " + (it.label || "");
                    }
                }
                
                // gom các mục có key giống nhau (tức là trùng màu & trùng đường dẫn, hoặc chỉ trùng màu nếu Shift)
                if (!seen[key]) {
                    seen[key] = { color: v, props: [] };
                }
                seen[key].props.push(it);
            } catch (e) {
                // Xử lý lỗi
            }
        }

        // tạo mảng cuối cùng
        var linkedGroupIndex = 1;
        for (var key in seen) {
            var group = seen[key];
            uniq.push({
                prop: group.props[0].prop, // dùng prop đầu tiên làm tham chiếu
                color: group.color,
                label: (shiftPressed && group.props.length > 1)
                    ? (group.props.length + " linked colors_" + linkedGroupIndex)
                    : group.props[0].label,
                linkedProps: group.props // giữ tất cả props cùng màu
            });
            if (shiftPressed && group.props.length > 1) linkedGroupIndex++;
        }


        colorTargets = uniq;
        refreshSwatches();

        app.endUndoGroup();
    };


function escForExpr(s) {
    // Chuyển sang string an toàn, sau đó escape \ thành \\, và ' thành \'
    return (s || "").toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}


function tryAssignExpression(p, expr, info) {
        if (!p || !p.canSetExpression) return false;
        
        try {
            // Bước quan trọng: Gỡ bỏ expression hiện tại trước khi gán
            if (p.expressionEnabled) p.expression = ""; 
            
            p.expression = expr;
            return true;
        } catch (e) {
            return false;
        }
    }


makeCtrlBtn.onClick = function() {
    if (!colorTargets || colorTargets.length === 0) {
        alert("No colors detected. Run Attack first.");
        return;
    }

    app.beginUndoGroup("QC Make Control");

    var comp = app.project.activeItem;
    if (!(comp && comp instanceof CompItem)) {
        alert("No active comp.");
        app.endUndoGroup();
        return;
    }

    var rootComp = comp;

    // 🔍 Tìm hoặc tạo Null control
    var ctrl = null;
    for (var i = 1; i <= comp.numLayers; i++) {
        try {
            if (comp.layer(i).name === "Color Control") {
                ctrl = comp.layer(i);
                break;
            }
        } catch (e) {}
    }
    if (!ctrl) {
        ctrl = comp.layers.addNull();
        ctrl.name = "Color Control";
        ctrl.label = 9;
    }

    var effects = ctrl.property("ADBE Effect Parade");

    // 🧹 Xóa effect cũ (reset)
    try {
        for (var r = effects.numProperties; r >= 1; r--) {
            try { effects.property(r).remove(); } catch (e) {}
        }
    } catch(e){}

    var createdCount = 0;
    var textLayerMap = {};

    // 🧩 Vòng lặp chính: tạo **MỘT** Color Control cho **MỖI MÀU DUY NHẤT**
    for (var t = 0; t < colorTargets.length; t++) {
        var info = colorTargets[t];
        
        // 1. Tạo Color Control
            var newEff = null;
            try {
                newEff = effects.addProperty("ADBE Color Control");
            } catch(e) {
                continue; 
            }
            
            // 🏆 BỔ SUNG: TẠO TÊN DUY NHẤT CHO EFFECT
            
            // Tên cơ bản từ label hoặc mặc định
            var baseName = info.label || "Linked Color"; 
            
            // Thêm hậu tố số (ví dụ: 'Linked Color (1)', 'Linked Color (2)',...)
            // Dùng createdCount để đảm bảo số đếm liên tục
            var uniqueEffName = baseName + " (" + (createdCount + 1) + ")"; 
            
            // Nếu có _fakeId, vẫn giữ nó trong helpTip hoặc log
            if (info._fakeId) {
                 // Có thể dùng helpTip hoặc bỏ qua, nhưng tên chính phải là uniqueEffName
                 newEff.matchName = uniqueEffName; 
            }
            
            // Đặt tên Effect (Tên này BẮT BUỘC PHẢI LÀ DUY NHẤT!)
            try { newEff.name = uniqueEffName; } catch(e){}
            
            // Set giá trị ban đầu
            try { newEff.property(1).setValue(info.color); } catch(e){}
            
            // 2. Tạo HAI loại Expression
            // Expression phải dùng TÊN DUY NHẤT (uniqueEffName)
            var safeEffName = escForExpr(uniqueEffName);
            var safeRootCompName = escForExpr(rootComp.name);
            
            // Cập nhật Expression: Dùng uniqueEffName
            var safeExpr =
                'thisComp.layer("Color Control").effect(\'' + safeEffName + '\')("Color") || comp(\'' + safeRootCompName + '\').layer("Color Control").effect(\'' + safeEffName + '\')("Color") || value';

            // Cập nhật Expression: Dùng uniqueEffName
            var fullExpr =
                'try { thisComp.layer("Color Control").effect(\'' + safeEffName + '\')("Color") } ' +
                'catch(e1) { try { comp(\'' + safeRootCompName + '\').layer("Color Control").effect(\'' + safeEffName + '\')("Color") } ' +
                'catch(e2) { value } }';

        // 3. Duyệt qua TẤT CẢ thuộc tính liên kết
        var propsToLink = info.linkedProps || [];
        if (propsToLink.length === 0) {
            propsToLink.push(info);
        }
        
        var linkedSuccess = false;

        for (var p = 0; p < propsToLink.length; p++) {
            var linkedInfo = propsToLink[p];
            var linkedProp = linkedInfo.prop;
            
            if (!linkedProp) continue;
            
            // 🌈 Trường hợp Text Fill/Stroke: Lưu safeExpr vào Map Text
            if (linkedInfo.isTextFill || linkedInfo.isTextStroke) {
                var layerKey = linkedInfo.layerIndex || linkedProp.propertyGroup(linkedProp.propertyDepth - 1).name;
                
                if (!textLayerMap[layerKey]) {
                    var textProp = linkedProp.propertyGroup(linkedProp.propertyDepth).property("Source Text");
                    if (!textProp) textProp = linkedProp; 
                    
                    textLayerMap[layerKey] = { textProp: textProp, fillExpr: null, strokeExpr: null };
                }
                
                // LƯU Ý: Lưu safeExpr (KHÔNG có try/catch)
                if (linkedInfo.isTextFill) textLayerMap[layerKey].fillExpr = safeExpr;
                if (linkedInfo.isTextStroke) textLayerMap[layerKey].strokeExpr = safeExpr;
                
                linkedSuccess = true;
            } else {
                // 🟡 Trường hợp Property Màu Thường: Gán fullExpr (có try/catch)
                if (linkedProp && linkedProp.propertyValueType === PropertyValueType.COLOR) {
                    if (linkedProp.expressionEnabled) {
                        // Vô hiệu hóa expression cũ để gán mới
                        linkedProp.expression = ""; 
                    }
                    if (tryAssignExpression(linkedProp, fullExpr, linkedInfo)) {
                        linkedSuccess = true;
                    }
                }
            }
        }
        
        // 4. Kiểm tra thành công và cập nhật số lượng
        if (!linkedSuccess) {
            try { newEff.remove(); } catch (e) {}
        } else {
            createdCount++;
        }
    } // End of main control creation loop

    // --- Xử lý Expression Source Text Cuối cùng ---
    
    for (var key in textLayerMap) {
        if (!textLayerMap.hasOwnProperty(key)) continue;
        var entry = textLayerMap[key];
        
        if (!entry.textProp || entry.textProp.expressionEnabled) continue;
        
        var hasFill = !!entry.fillExpr;
        var hasStroke = !!entry.strokeExpr;
        if (!hasFill && !hasStroke) continue;

        // 🏆 TẠO EXPRESSION SOURCE TEXT SẠCH:
        // Sử dụng khối try/catch bao bọc lớn, và các biến cục bộ gán trực tiếp safeExpr (KHÔNG có try/catch).
        var textExpr = "try {\n";
        textExpr += " \tvar s = text.sourceText.style;\n";

        if (hasFill) {
            // entry.fillExpr đã là safeExpr (chỉ là chuỗi tham chiếu an toàn)
            textExpr += " \tvar fillColorValue = " + entry.fillExpr + ";\n"; 
            textExpr += " \ts = s.setApplyFill(true).setFillColor(fillColorValue);\n";
        }
        
        if (hasStroke) {
            textExpr += " \tvar strokeColorValue = " + entry.strokeExpr + ";\n";
            textExpr += " \ts = s.setApplyStroke(true).setStrokeColor(strokeColorValue);\n";
        }
        
        textExpr += " \ts;\n";
        textExpr += "} catch (e) { value; }"; // try...catch bao bọc toàn bộ khối expression

        try {
            entry.textProp.expression = textExpr;
            $.writeln("Added Source Text expression for: " + key);
        } catch(e) {
            $.writeln("Failed to add text expression for " + key + ": " + e.toString());
        }
    }
    
    // 🔘 Deselect tất cả, chỉ chọn control
    try {
        for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        ctrl.selected = true;
    } catch (e) {}

    app.endUndoGroup();
};

    win.onResizing = win.onResize = function() { this.layout.resize(); };
    win.layout.layout(true);
    if (win instanceof Window) win.center(), win.show();
}

// Sort Project ////////////////////////////////////////////////////
function sortProject() {
    app.beginUndoGroup("Sort Project");

    var proj = app.project;
    var rootFolder = proj.rootFolder;

    // 1. Build excluded set from selected items
    var excluded = {};
    var sel = proj.selection;
    for (var i = 0; i < sel.length; i++) {
        excluded[sel[i].id] = true;
    }

    // 2. Category definitions
    var categories = [
        { name: "Compositions", test: function(item) { return item instanceof CompItem; } },
        { name: "Nulls & Solids", test: function(item) { return (item instanceof FootageItem) && (item.mainSource instanceof SolidSource); } },
        { name: "Missing", test: function(item) { return (item instanceof FootageItem) && item.footageMissing; } },
        { name: "Audio", exts: ["wav","mp3","aif","aiff","aac","m4a","ogg","flac","wma"] },
        { name: "AI / PSD", exts: ["ai","psd","eps","svg","pdf","indd"] },
        { name: "Images", exts: ["png","jpg","jpeg","gif","tiff","tif","bmp","exr","hdr","webp","ico"] },
        { name: "Footage", exts: ["mov","mp4","avi","webm","mxf","mpg","mpeg","wmv","flv","mkv","m4v","3gp","prores"] }
    ];

    // 3. Find or create category folders
    var folderMap = {};
    for (var c = 0; c < categories.length; c++) {
        var catName = categories[c].name;
        var found = null;
        // Search existing root-level folders
        for (var j = 1; j <= rootFolder.numItems; j++) {
            var it = rootFolder.item(j);
            if ((it instanceof FolderItem) && it.name === catName) {
                found = it;
                break;
            }
        }
        folderMap[catName] = found || proj.items.addFolder(catName);
    }

    // 4. Helper: get file extension
    function getExt(item) {
        try {
            if (item.mainSource && item.mainSource.file) {
                var name = item.mainSource.file.name;
                var dot = name.lastIndexOf(".");
                if (dot >= 0) return name.substring(dot + 1).toLowerCase();
            }
        } catch(e) {}
        return "";
    }

    // 5. Classify and move items
    var moved = 0;
    // Collect items first to avoid index shifting
    var items = [];
    for (var k = 1; k <= proj.numItems; k++) {
        items.push(proj.item(k));
    }

    for (var m = 0; m < items.length; m++) {
        var item = items[m];

        if (item instanceof FolderItem) continue;

        // Selected items → always pulled out to project root
        if (excluded[item.id]) {
            item.parentFolder = rootFolder;
            continue;
        }

        // Skip if already inside a category folder — BUT always re-check items in
        // "Missing" because they may have been relinked since the last Sort.
        var alreadySorted = false;
        for (var fn in folderMap) {
            if (fn === "Missing") continue;
            if (item.parentFolder === folderMap[fn]) {
                alreadySorted = true;
                break;
            }
        }
        if (alreadySorted) continue;

        // Try each category
        var matched = false;
        for (var n = 0; n < categories.length; n++) {
            var cat = categories[n];
            if (cat.test) {
                if (cat.test(item)) {
                    item.parentFolder = folderMap[cat.name];
                    moved++;
                    matched = true;
                    break;
                }
            } else if (cat.exts) {
                var ext = getExt(item);
                if (ext !== "") {
                    for (var e = 0; e < cat.exts.length; e++) {
                        if (ext === cat.exts[e]) {
                            item.parentFolder = folderMap[cat.name];
                            moved++;
                            matched = true;
                            break;
                        }
                    }
                }
                if (matched) break;
            }
        }
    }

    // 6. Remove ALL empty folders in the project (not just Sort-created ones)
    var changed = true;
    while (changed) {
        changed = false;
        for (var ef = proj.numItems; ef >= 1; ef--) {
            var fi = proj.item(ef);
            if ((fi instanceof FolderItem) && fi.numItems === 0) {
                // Don't remove excluded (selected) folders
                if (!excluded[fi.id]) {
                    fi.remove();
                    changed = true;
                }
            }
        }
    }

    app.endUndoGroup();
    return "Sorted " + moved + " items.";
}

// Collect Files ////////////////////////////////////////////////////
// buildCollectManifest: called by CEP JS — builds file list, returns JSON.
// Actual file copy is done in Node.js (handles Unicode paths correctly).
function buildCollectManifest(isMove, customDir) {
    var proj    = app.project;
    var aepFile = proj.file;
    if (!aepFile) {
        return JSON.stringify({ error: "Please save the project (.aep) first before collecting files." });
    }

    var footageDir = customDir
        ? new Folder(customDir)
        : new Folder(aepFile.parent.fsName + "/footage");

    var items      = [];
    var destNames  = {};
    var srcToDest  = {};   // shared sources (PSD/AI layers) reuse same dest
    var srcRefCount = {};  // how many footage items share each source path

    // First pass: count how many footage items reference each source file
    for (var k = 1; k <= proj.numItems; k++) {
        var it = proj.item(k);
        if (!(it instanceof FootageItem)) continue;
        if (!it.mainSource || !(it.mainSource instanceof FileSource)) continue;
        if (it.footageMissing) continue;
        if (!it.mainSource.file || !it.mainSource.file.exists) continue;
        var p = it.mainSource.file.fsName;
        srcRefCount[p] = (srcRefCount[p] || 0) + 1;
    }

    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (!(item instanceof FootageItem)) continue;
        if (!item.mainSource || !(item.mainSource instanceof FileSource)) continue;
        if (item.footageMissing) continue;

        var srcFile = item.mainSource.file;
        if (!srcFile || !srcFile.exists) continue;

        // Skip if source is already inside the footage folder
        var destCheck = new File(footageDir.fsName + "/" + srcFile.name);
        if (srcFile.fsName === destCheck.fsName) continue;

        // Detect layered footage: multiple footage items share this source file
        // AND it's a PSD/AI/PSB/EPS file (layers preserved in original import)
        var lowerName = srcFile.name.toLowerCase();
        var isLayeredFile = /\.(psd|psb|ai|eps)$/.test(lowerName);
        var isLayered = isLayeredFile && (srcRefCount[srcFile.fsName] > 1);

        // If this source file was already mapped (e.g. another layer of the same PSD),
        // reuse the same destination — do NOT copy again, do NOT rename.
        if (srcToDest[srcFile.fsName]) {
            items.push({
                id:        item.id,
                name:      srcFile.name,
                src:       srcFile.fsName,
                dest:      srcToDest[srcFile.fsName],
                skip:      true,        // already handled by first occurrence
                isLayered: isLayered    // pass through so JS can warn
            });
            continue;
        }

        // Check: dest already exists with same name AND same file size → skip copy, just relink
        var dest = new File(footageDir.fsName + "/" + srcFile.name);
        var alreadyCollected = false;
        if (dest.exists && dest.length === srcFile.length) {
            alreadyCollected = true;
        }

        if (!alreadyCollected) {
            // Resolve unique destination filename if dest exists but is different
            var dotIdx = srcFile.name.lastIndexOf(".");
            var nameOnly = (dotIdx >= 0) ? srcFile.name.substring(0, dotIdx) : srcFile.name;
            var extOnly  = (dotIdx >= 0) ? srcFile.name.substring(dotIdx) : "";
            var counter  = 1;
            while (dest.exists || destNames[dest.fsName]) {
                dest = new File(footageDir.fsName + "/" + nameOnly + "_" + counter + extOnly);
                counter++;
            }
            destNames[dest.fsName] = true;
        }

        srcToDest[srcFile.fsName] = dest.fsName;

        items.push({
            id:        item.id,
            name:      srcFile.name,
            src:       srcFile.fsName,
            dest:      dest.fsName,
            skip:      alreadyCollected,
            isLayered: isLayered
        });
    }

    return JSON.stringify({
        footageDir: footageDir.fsName,
        isMove:     (isMove === 1),
        items:      items
    });
}

// applyCollectRelink: called after Node.js finishes copying.
// jsonStr is an array of { id, dest, isLayered } — relinks each item.
// Layered footage (PSD/AI/PSB layers) is skipped because item.replace() flattens them.
function applyCollectRelink(jsonStr) {
    try {
        var mappings = JSON.parse(jsonStr);
        app.beginUndoGroup("Collect Files - Relink");
        var relinked = 0;
        var skippedLayered = 0;
        var layeredFiles = {};
        for (var i = 0; i < mappings.length; i++) {
            try {
                var m = mappings[i];
                var item = app.project.itemByID(m.id);
                if (!item) continue;

                if (m.isLayered) {
                    // Don't replace — would break layer linkage. Track unique files.
                    layeredFiles[m.dest] = true;
                    skippedLayered++;
                    continue;
                }

                item.replace(new File(m.dest));
                relinked++;
            } catch(e) {}
        }
        app.endUndoGroup();

        var layeredFileCount = 0;
        for (var k in layeredFiles) { if (layeredFiles.hasOwnProperty(k)) layeredFileCount++; }

        return JSON.stringify({
            relinked: relinked,
            skippedLayered: skippedLayered,
            layeredFileCount: layeredFileCount
        });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}

// Legacy wrapper kept for compatibility
function collectFilesUI() {
    var proj = app.project;
    var aepFile = proj.file;
    if (!aepFile) {
        alert("Please save the project (.aep) first before collecting files.");
        return;
    }

    var win = new Window("dialog", "Collect Files", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 16;
    win.spacing = 10;
    win.preferredSize.width = 360;

    // Mode radio
    var grpMode = win.add("panel", undefined, "Mode");
    grpMode.orientation = "row";
    grpMode.alignChildren = ["left", "center"];
    grpMode.margins = 12;
    var rbCopy = grpMode.add("radiobutton", undefined, "Copy");
    var rbMove = grpMode.add("radiobutton", undefined, "Move (Cut)");
    rbCopy.value = true;

    // Progress area (hidden until collect starts)
    var grpProgress = win.add("panel", undefined, "Progress");
    grpProgress.orientation = "column";
    grpProgress.alignChildren = ["fill", "top"];
    grpProgress.margins = 12;
    grpProgress.spacing = 6;
    grpProgress.visible = false;

    var lblStatus = grpProgress.add("statictext", undefined, "Preparing...", { truncate: "middle" });
    lblStatus.alignment = ["fill", "top"];
    lblStatus.preferredSize.width = 320;

    var progressBar = grpProgress.add("progressbar", undefined, 0, 100);
    progressBar.alignment = ["fill", "top"];
    progressBar.preferredSize.height = 12;

    var lblCount = grpProgress.add("statictext", undefined, "0 / 0");
    lblCount.alignment = ["right", "top"];

    // Buttons
    var grpBtn = win.add("group");
    grpBtn.alignment = ["center", "top"];
    grpBtn.spacing = 8;
    var btnCollect = grpBtn.add("button", undefined, "Collect");
    var btnCancel = grpBtn.add("button", undefined, "Cancel");

    btnCollect.preferredSize = [100, 26];
    btnCancel.preferredSize = [80, 26];

    btnCancel.onClick = function() { win.close(); };

    btnCollect.onClick = function() {
        var isMove = rbMove.value;
        var aepFolder = aepFile.parent;
        var footageDir = new Folder(aepFolder.fsName + "/footage");
        if (!footageDir.exists) footageDir.create();

        // Collect the list of files to process first
        var toProcess = [];
        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (!(item instanceof FootageItem)) continue;
            if (!item.mainSource || !(item.mainSource instanceof FileSource)) continue;
            if (item.footageMissing) continue;
            var srcFile = item.mainSource.file;
            if (!srcFile || !srcFile.exists) continue;
            var destCheck = new File(footageDir.fsName + "/" + srcFile.name);
            if (srcFile.fsName === destCheck.fsName) continue; // already there
            toProcess.push({ item: item, srcFile: srcFile });
        }

        if (toProcess.length === 0) {
            alert("Nothing to collect — all footage is already in the target folder.");
            win.close();
            return;
        }

        // --- Phase 1: resolve all dest paths (dedup filenames) ---
        var mappings = []; // { item, src, dest (File) }
        var destNames = {}; // track names already used in this run

        for (var j = 0; j < toProcess.length; j++) {
            var src = toProcess[j].srcFile;
            var dest = new File(footageDir.fsName + "/" + src.name);

            // Dedup: check both existing files AND names already queued
            var baseName = src.name;
            var dotIdx = baseName.lastIndexOf(".");
            var nameOnly = (dotIdx >= 0) ? baseName.substring(0, dotIdx) : baseName;
            var extOnly  = (dotIdx >= 0) ? baseName.substring(dotIdx) : "";
            var counter = 1;
            while (dest.exists || destNames[dest.fsName]) {
                dest = new File(footageDir.fsName + "/" + nameOnly + "_" + counter + extOnly);
                counter++;
            }
            destNames[dest.fsName] = true;
            mappings.push({ item: toProcess[j].item, src: src, dest: dest });
        }

        // --- Show progress UI ---
        grpProgress.visible = true;
        btnCollect.enabled = false;
        btnCancel.enabled = false;
        grpMode.enabled = false;
        // Two phases: copy (50%) + relink (50%)
        progressBar.maxvalue = mappings.length * 2;
        progressBar.value = 0;
        lblCount.text = "0 / " + mappings.length;
        win.layout.layout(true);

        // --- Phase 2: batch copy via single PowerShell call (much faster than File.copy) ---
        lblStatus.text = "Copying " + mappings.length + " files via system...";
        win.update();

        // Build PowerShell script lines
        var psLines = [
            '$ErrorActionPreference = "SilentlyContinue"',
            '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8'
        ];

        // Quote helper: escape single-quotes inside PS literal path strings
        function psSafe(str) {
            return str.replace(/\\/g, "/").replace(/'/g, "''");
        }

        for (var k = 0; k < mappings.length; k++) {
            var srcPath  = psSafe(mappings[k].src.fsName);
            var destPath = psSafe(mappings[k].dest.fsName);
            if (isMove) {
                // Move-Item handles cross-drive automatically (copy+delete fallback)
                psLines.push("Move-Item -Force -LiteralPath '" + srcPath + "' -Destination '" + destPath + "'");
            } else {
                psLines.push("Copy-Item -Force -LiteralPath '" + srcPath + "' -Destination '" + destPath + "'");
            }
        }

        // Write temp PS1 file and execute it once
        var tempScript = new File(Folder.temp.fsName + "/qtp_collect_" + (new Date().getTime()) + ".ps1");
        tempScript.encoding = "UTF-8";
        tempScript.open("w");
        tempScript.write(psLines.join("\r\n"));
        tempScript.close();

        var psResult = system.callSystem(
            'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' +
            tempScript.fsName.replace(/\//g, "\\") + '"'
        );
        try { tempScript.remove(); } catch(e) {}

        // Advance bar to halfway
        progressBar.value = mappings.length;
        win.update();

        // --- Phase 3: relink in AE (fast, just metadata) ---
        lblStatus.text = "Relinking in After Effects...";
        win.update();

        app.beginUndoGroup("Collect Files");

        var collected = 0;
        var errors = [];

        for (var r = 0; r < mappings.length; r++) {
            var destFile = mappings[r].dest;
            lblStatus.text = "Relinking (" + (r + 1) + "/" + mappings.length + ") " + destFile.name;
            lblCount.text = (r + 1) + " / " + mappings.length;
            progressBar.value = mappings.length + r;
            win.update();

            if (destFile.exists) {
                try {
                    mappings[r].item.replace(destFile);
                    collected++;
                } catch (e) {
                    errors.push(destFile.name + ": " + e.toString());
                }
            } else {
                errors.push(mappings[r].src.name + " (file not found after copy)");
            }
        }

        app.endUndoGroup();

        // Final state
        progressBar.value = mappings.length * 2;
        lblCount.text = mappings.length + " / " + mappings.length;
        lblStatus.text = "Done! " + collected + " / " + mappings.length + " collected.";
        win.update();

        btnCancel.text = "Close";
        btnCancel.enabled = true;

        var msg = "Collected " + collected + " / " + mappings.length + " files\nTo: " + footageDir.fsName;
        if (errors.length > 0) msg += "\n\nErrors (" + errors.length + "):\n" + errors.slice(0, 10).join("\n");
        alert(msg);
        win.close();
    };

    win.center();
    win.show();
}

// Time Remap (inline panel version) ////////////////////////////////////
function applyTimeRemap(minusFrame, exprString) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    if (comp.selectedLayers.length === 0) { alert("Select at least one layer."); return; }

    app.beginUndoGroup("Apply Time Remap");
    var fps = comp.frameRate;
    var layers = comp.selectedLayers;

    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (!layer.canSetTimeRemapEnabled) continue;

        layer.timeRemapEnabled = false;
        layer.timeRemapEnabled = true;

        if (minusFrame) {
            if (layer.timeRemap.numKeys >= 2) {
                var key2Time = layer.timeRemap.keyTime(2);
                var key2Val = layer.timeRemap.keyValue(2);
                layer.timeRemap.removeKey(2);
                var newTime = key2Time - 1 / fps;
                var newVal = key2Val - 1 / fps;
                layer.timeRemap.addKey(newTime);
                layer.timeRemap.setValueAtKey(2, newVal);
            }
        }

        layer.timeRemap.expression = exprString;
    }
    app.endUndoGroup();
}

function deleteTimeRemap() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }

    app.beginUndoGroup("Delete Time Remap");
    var layers = comp.selectedLayers;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (!layer.canSetTimeRemapEnabled) continue;
        if (layer.timeRemapEnabled) {
            layer.timeRemap.expression = "";
            layer.timeRemapEnabled = false;
        }
    }
    app.endUndoGroup();
}

// Time Remap UI (dialog - legacy) ////////////////////////////////////////////////////
function timeRemapUI() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    if (comp.selectedLayers.length === 0) { alert("Select at least one layer."); return; }

    var win = new Window("dialog", "Time Remap", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 14;
    win.spacing = 10;

    // Remap options
    var grpRemap = win.add("panel", undefined, "Time Remap");
    grpRemap.orientation = "column";
    grpRemap.alignChildren = ["fill", "top"];
    grpRemap.margins = 10;
    var chkMinFrame = grpRemap.add("checkbox", undefined, "-1 frame (remove last hold frame)");
    chkMinFrame.value = false;

    // Loop options
    var grpLoop = win.add("panel", undefined, "Loop");
    grpLoop.orientation = "column";
    grpLoop.alignChildren = ["left", "top"];
    grpLoop.margins = 10;
    grpLoop.spacing = 6;

    var rbOff = grpLoop.add("radiobutton", undefined, "OFF");
    var rbLoopOut = grpLoop.add("radiobutton", undefined, "loopOut");
    var rbLoopIn = grpLoop.add("radiobutton", undefined, "loopIn");
    rbOff.value = true;

    var grpType = grpLoop.add("group");
    grpType.spacing = 10;
    var rbCycle = grpType.add("radiobutton", undefined, "cycle");
    var rbPingpong = grpType.add("radiobutton", undefined, "ping-pong");
    rbCycle.value = true;
    rbCycle.enabled = false;
    rbPingpong.enabled = false;

    rbOff.onClick = rbLoopOut.onClick = rbLoopIn.onClick = function() {
        var loopOn = !rbOff.value;
        rbCycle.enabled = loopOn;
        rbPingpong.enabled = loopOn;
    };

    // Buttons
    var grpBtn = win.add("group");
    grpBtn.alignment = ["center", "top"];
    grpBtn.spacing = 8;
    var btnApply = grpBtn.add("button", undefined, "Apply reMap");
    var btnDelete = grpBtn.add("button", undefined, "Delete reMap");
    var btnCancel = grpBtn.add("button", undefined, "Cancel");

    btnCancel.onClick = function() { win.close(); };

    // Get expression string
    function getLoopExpr() {
        if (rbOff.value) return "";
        var dir = rbLoopIn.value ? "loopIn" : "loopOut";
        var type = rbPingpong.value ? "pingpong" : "cycle";
        return dir + "(type = '" + type + "', numKeyframes = 0)";
    }

    // Apply
    btnApply.onClick = function() {
        app.beginUndoGroup("Time Remap");
        var fps = comp.frameRate;
        var expr = getLoopExpr();
        var layers = comp.selectedLayers;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (!layer.canSetTimeRemapEnabled) continue;

            layer.timeRemapEnabled = false;
            layer.timeRemapEnabled = true;

            if (chkMinFrame.value) {
                var key2Time = layer.timeRemap.keyTime(2);
                var key2Val = layer.timeRemap.keyValue(2);
                layer.timeRemap.removeKey(2);
                var newTime = key2Time - 1 / fps;
                var newVal = key2Val - 1 / fps;
                layer.timeRemap.addKey(newTime);
                layer.timeRemap.setValueAtKey(2, newVal);
            }

            layer.timeRemap.expression = expr;
        }
        app.endUndoGroup();
        win.close();
    };

    // Delete
    btnDelete.onClick = function() {
        app.beginUndoGroup("Delete Time Remap");
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (!layer.canSetTimeRemapEnabled) continue;
            if (layer.timeRemapEnabled) {
                layer.timeRemap.expression = "";
                layer.timeRemapEnabled = false;
            }
        }
        app.endUndoGroup();
        win.close();
    };

    win.center();
    win.show();
}

// Wiggle Controller UI ////////////////////////////////////////////////////
function wiggleControllerUI() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    if (comp.selectedLayers.length === 0) { alert("Select at least one layer."); return; }

    var win = new Window("dialog", "Wiggle Controller", undefined, { resizeable: false });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 14;
    win.spacing = 10;

    // Parameters
    var grpParams = win.add("panel", undefined, "Parameters");
    grpParams.orientation = "column";
    grpParams.alignChildren = ["fill", "top"];
    grpParams.margins = 10;
    grpParams.spacing = 8;

    var grpFreq = grpParams.add("group");
    grpFreq.add("statictext", undefined, "Frequency:");
    var etFreq = grpFreq.add("edittext", undefined, "2");
    etFreq.characters = 6;

    var grpAmp = grpParams.add("group");
    grpAmp.add("statictext", undefined, "Amplitude:");
    var etAmp = grpAmp.add("edittext", undefined, "20");
    etAmp.characters = 6;

    // Loop option
    var grpLoop = grpParams.add("group");
    var chkLoop = grpLoop.add("checkbox", undefined, "Loop");
    chkLoop.value = true;
    grpLoop.add("statictext", undefined, "Seconds:");
    var etSec = grpLoop.add("edittext", undefined, "10");
    etSec.characters = 5;

    // Properties
    var grpProps = win.add("panel", undefined, "Select Properties");
    grpProps.orientation = "column";
    grpProps.alignChildren = ["left", "top"];
    grpProps.margins = 10;
    grpProps.spacing = 6;

    var chkPos = grpProps.add("checkbox", undefined, "Position");
    chkPos.value = true;
    var chkRot = grpProps.add("checkbox", undefined, "Rotation");
    var chkScale = grpProps.add("checkbox", undefined, "Scale");
    var chkOpacity = grpProps.add("checkbox", undefined, "Opacity");

    // Buttons
    var grpBtn = win.add("group");
    grpBtn.alignment = ["center", "top"];
    grpBtn.spacing = 8;
    var btnApply = grpBtn.add("button", undefined, "Apply Wiggle");
    var btnRemove = grpBtn.add("button", undefined, "Remove Wiggle");
    var btnCancel = grpBtn.add("button", undefined, "Cancel");

    btnCancel.onClick = function() { win.close(); };

    // Build wiggle expression with slider references
    function buildWiggleExpr(freqSlider, ampSlider, useLoop, loopSec) {
        var expr = "";
        expr += "var freq = thisLayer.effect('" + freqSlider + "')('Slider').value;\n";
        expr += "var amp = thisLayer.effect('" + ampSlider + "')('Slider').value;\n";

        if (useLoop) {
            expr += "var loopTime = " + loopSec + ";\n";
            expr += "var t = time % loopTime;\n";
            expr += "var wiggle1 = wiggle(freq, amp, 1, 0.5, t);\n";
            expr += "var wiggle2 = wiggle(freq, amp, 1, 0.5, t - loopTime);\n";
            expr += "linear(t, 0, loopTime, wiggle1, wiggle2);\n";
        } else {
            expr += "wiggle(freq, amp);\n";
        }
        return expr;
    }

    // Apply
    btnApply.onClick = function() {
        var freq = parseFloat(etFreq.text) || 2;
        var amp = parseFloat(etAmp.text) || 20;
        var useLoop = chkLoop.value;
        var loopSec = parseFloat(etSec.text) || 10;

        var selProps = [];
        if (chkPos.value) selProps.push("Position");
        if (chkRot.value) selProps.push("Rotation");
        if (chkScale.value) selProps.push("Scale");
        if (chkOpacity.value) selProps.push("Opacity");

        if (selProps.length === 0) { alert("Select at least one property."); return; }

        app.beginUndoGroup("Apply Wiggle Controller");

        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var effects = layer.property("Effects");

            // Add Frequency slider
            var freqName = "Wiggle Frequency";
            var freqEffect = effects.addProperty("ADBE Slider Control");
            freqEffect.name = freqName;
            freqEffect.property("Slider").setValue(freq);

            // Add Amplitude slider
            var ampName = "Wiggle Amplitude";
            var ampEffect = effects.addProperty("ADBE Slider Control");
            ampEffect.name = ampName;
            ampEffect.property("Slider").setValue(amp);

            // Apply expression to each selected property
            for (var p = 0; p < selProps.length; p++) {
                var propName = selProps[p];
                var prop = null;

                try {
                    if (propName === "Position") {
                        prop = layer.property("Transform").property("Position");
                    } else if (propName === "Rotation") {
                        prop = layer.property("Transform").property("Rotation");
                        if (!prop) prop = layer.property("Transform").property("Z Rotation");
                    } else if (propName === "Scale") {
                        prop = layer.property("Transform").property("Scale");
                    } else if (propName === "Opacity") {
                        prop = layer.property("Transform").property("Opacity");
                    }
                } catch(e) {}

                if (prop && prop.canSetExpression) {
                    var expr = buildWiggleExpr(freqName, ampName, useLoop, loopSec);
                    try {
                        prop.expression = expr;
                    } catch(e) {}
                }
            }
        }

        app.endUndoGroup();
    };

    // Remove
    btnRemove.onClick = function() {
        app.beginUndoGroup("Remove Wiggle Controller");

        var layers = comp.selectedLayers;
        var propNames = ["Position", "Rotation", "Z Rotation", "Scale", "Opacity"];

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];

            // Remove expressions containing Wiggle
            for (var p = 0; p < propNames.length; p++) {
                try {
                    var prop = layer.property("Transform").property(propNames[p]);
                    if (prop && prop.expression && prop.expression.indexOf("Wiggle") >= 0) {
                        prop.expression = "";
                    }
                } catch(e) {}
            }

            // Remove slider effects (reverse loop to avoid index shift)
            var effects = layer.property("Effects");
            for (var ef = effects.numProperties; ef >= 1; ef--) {
                var eff = effects.property(ef);
                if (eff.name === "Wiggle Frequency" || eff.name === "Wiggle Amplitude") {
                    eff.remove();
                }
            }
        }

        app.endUndoGroup();
    };

    win.center();
    win.show();
}


// ============================================================
// Reduce Project
// Reduces the project to only items needed by selected comps.
// If no comp selected, uses the active comp.
// ============================================================
function reduceProject() {
    var proj = app.project;

    // 1. Collect target comps: selected CompItems first
    var targetComps = [];
    var sel = proj.selection;
    for (var i = 0; i < sel.length; i++) {
        if (sel[i] instanceof CompItem) {
            targetComps.push(sel[i]);
        }
    }

    // 2. Fall back to active comp if nothing selected
    if (targetComps.length === 0) {
        var active = proj.activeItem;
        if (active instanceof CompItem) {
            targetComps.push(active);
        }
    }

    if (targetComps.length === 0) {
        alert("Select one or more compositions in the Project panel first, then click Reduce.");
        return;
    }

    // 3. Walk dependency tree to estimate removal count
    var names = [];
    for (var n = 0; n < targetComps.length; n++) names.push(targetComps[n].name);
    var before = proj.numItems;

    var reachable = {};
    var queue = [];
    for (var q = 0; q < targetComps.length; q++) {
        reachable[targetComps[q].id] = true;
        queue.push(targetComps[q]);
    }
    while (queue.length > 0) {
        var cur = queue.shift();
        if (cur instanceof CompItem) {
            for (var li = 1; li <= cur.numLayers; li++) {
                try {
                    var lsrc = cur.layer(li).source;
                    if (lsrc && !reachable[lsrc.id]) {
                        reachable[lsrc.id] = true;
                        queue.push(lsrc);
                    }
                } catch(e) {}
            }
        }
    }
    var keepCount = 0;
    for (var k in reachable) { keepCount++; }
    var removeEst = before - keepCount;

    var msg = "Reduce project to:\n  " + names.join("\n  ")
        + "\n\nCurrent project: " + before + " items"
        + "\nEstimated to keep: " + keepCount + " items"
        + "\nEstimated to remove: " + removeEst + " items"
        + "\n\nAll unused items will be REMOVED. This cannot be undone outside of Edit > Undo.\n\nContinue?";
    if (!confirm(msg)) return;

    // 4. Reduce
    app.beginUndoGroup("Reduce Project");
    proj.reduceProject(targetComps);
    app.endUndoGroup();

    var removed = before - proj.numItems;
    alert("Reduce complete.\nRemoved " + removed + " unused item(s).");
}


// ============================================================
// Relink Missing Footage
// Recursively searches a user-selected folder for files whose
// name matches missing footage items, then relinks them.
// ============================================================
function relinkMissingFootage(folderPath) {
    var proj = app.project;

    // Collect all missing FootageItems that have a FileSource
    var missingItems = [];
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof FootageItem && item.footageMissing) {
            if (item.mainSource instanceof FileSource) {
                missingItems.push(item);
            }
        }
    }

    if (missingItems.length === 0) {
        alert("No missing footage found in the project.");
        return;
    }

    // If a path was passed from CEP (native folder picker), use it directly.
    // Otherwise fall back to ExtendScript's built-in folder dialog.
    var searchFolder;
    if (folderPath && folderPath.length > 0) {
        searchFolder = new Folder(folderPath);
        if (!searchFolder.exists) {
            alert("Folder not found:\n" + folderPath);
            return;
        }
    } else {
        searchFolder = Folder.selectDialog(
            "Select folder to search for missing footage (" + missingItems.length + " missing)"
        );
        if (!searchFolder) return;
    }

    // Recursively collect all File objects under the folder
    function getAllFiles(folder) {
        var result = [];
        var entries = folder.getFiles();
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] instanceof Folder) {
                var sub = getAllFiles(entries[i]);
                for (var j = 0; j < sub.length; j++) result.push(sub[j]);
            } else {
                result.push(entries[i]);
            }
        }
        return result;
    }

    var allFiles = getAllFiles(searchFolder);

    // Build a map: lowercase filename -> first File found (unique names win)
    var fileMap = {};
    for (var f = 0; f < allFiles.length; f++) {
        var lowerName = allFiles[f].name.toLowerCase();
        if (!fileMap[lowerName]) {
            fileMap[lowerName] = allFiles[f];
        }
    }

    app.beginUndoGroup("Relink Missing Footage");

    var relinked = 0;
    var notFound = [];

    for (var m = 0; m < missingItems.length; m++) {
        var mi = missingItems[m];
        var srcFile = mi.mainSource.file;
        if (!srcFile) { notFound.push(mi.name); continue; }

        var key = srcFile.name.toLowerCase();
        var match = fileMap[key];

        if (match) {
            try {
                mi.replace(match);
                relinked++;
            } catch (e) {
                notFound.push(mi.name);
            }
        } else {
            notFound.push(srcFile.name);
        }
    }

    app.endUndoGroup();

    return JSON.stringify({
        relinked: relinked,
        total: missingItems.length,
        notFound: notFound.slice(0, 20),
        notFoundMore: notFound.length > 20 ? notFound.length - 20 : 0
    });
}

// ============================================================
// Layer Stagger
// Offsets selected layers in time by numFrames each, in the
// chosen mode: forward, backward, or center-out.
// stepEvery: apply offset every N layers (1 = every layer)
// ============================================================
function staggerLayers(numFrames, stepEvery, mode) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    var layers = comp.selectedLayers;
    if (layers.length === 0) { alert("Select at least one layer."); return; }

    var fps       = comp.frameRate;
    var offsetSec = (numFrames || 1) / fps;
    var step      = Math.max(1, stepEvery || 1);

    // Sort by layer index (top to bottom)
    var sorted = [];
    for (var i = 0; i < layers.length; i++) sorted.push(layers[i]);
    sorted.sort(function(a, b) { return a.index - b.index; });

    app.beginUndoGroup("Stagger Layers");

    var n = sorted.length;
    for (var j = 0; j < n; j++) {
        var layer = sorted[j];
        var rank  = Math.floor(j / step); // which offset bucket this layer belongs to
        var delta = 0;

        if (mode === "forward") {
            delta = rank * offsetSec;
        } else if (mode === "backward") {
            var totalRanks = Math.floor((n - 1) / step);
            delta = (totalRanks - rank) * offsetSec;
        } else if (mode === "center") {
            var totalRanks2 = Math.floor((n - 1) / step);
            var mid = totalRanks2 / 2;
            delta = Math.abs(rank - mid) * offsetSec;
        } else { // random
            var maxRanks = Math.floor((n - 1) / step);
            delta = Math.random() * maxRanks * offsetSec;
        }

        layer.startTime = layer.startTime + delta;
    }

    app.endUndoGroup();
}

// ============================================================
// Align layers to current time (playhead)
// Moves all selected layers so their in-point = comp.time
// ============================================================
function alignLayersToCurrentTime() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    var layers = comp.selectedLayers;
    if (layers.length === 0) { alert("Select at least one layer."); return; }

    app.beginUndoGroup("Align to Current Time");
    var t = comp.time;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        layer.startTime = layer.startTime + (t - layer.inPoint);
    }
    app.endUndoGroup();
}

// ============================================================
// Scale Layers to Fit
// mode: "contain" | "cover" | "fill"
// ============================================================
function scaleLayersToFit(mode) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    var layers = comp.selectedLayers;
    if (layers.length === 0) { alert("Select at least one layer."); return; }

    app.beginUndoGroup("Scale to Fit: " + mode);
    var cw = comp.width;
    var ch = comp.height;

    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var lw = 0, lh = 0;

        // Try source dimensions (most reliable for footage/solids)
        try {
            if (layer.source && layer.source.width) {
                lw = layer.source.width;
                lh = layer.source.height;
            }
        } catch(e) {}

        // Fallback: sourceRectAtTime (shapes, text, etc.)
        if (!lw || !lh) {
            try {
                var rect = layer.sourceRectAtTime(comp.workAreaStart, false);
                lw = Math.abs(rect.width);
                lh = Math.abs(rect.height);
            } catch(e) {}
        }

        if (!lw || !lh) continue;

        var sx, sy;
        if (mode === "fill") {
            sx = (cw / lw) * 100;
            sy = (ch / lh) * 100;
        } else if (mode === "contain") {
            var sc = Math.min(cw / lw, ch / lh) * 100;
            sx = sc; sy = sc;
        } else { // cover
            var sc2 = Math.max(cw / lw, ch / lh) * 100;
            sx = sc2; sy = sc2;
        }

        try {
            var sp = layer.property("Scale");
            sp.setValue(sp.value.length === 3 ? [sx, sy, 100] : [sx, sy]);
        } catch(e) {}
    }

    app.endUndoGroup();
}

// ============================================================
// Smart Precomp
// Precompose selected layers, keep position, auto-name.
// ============================================================
function smartPrecomp() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    var layers = comp.selectedLayers;
    if (layers.length === 0) { alert("Select at least one layer."); return; }

    var baseName = layers.length === 1 ? layers[0].name : comp.name;
    var precompName = "Pre-" + baseName;

    // Collect 1-based indices
    var indices = [];
    for (var i = 0; i < layers.length; i++) indices.push(layers[i].index);

    app.beginUndoGroup("Smart Precomp");
    try {
        comp.layers.precompose(indices, precompName, true);
    } catch(e) {
        app.endUndoGroup();
        alert("Precomp failed: " + e.toString());
        return;
    }
    app.endUndoGroup();
    return "Precomposed: " + precompName;
}

// ============================================================
// Sequence Layers
// Arranges selected layers sequentially in time.
// overlapFrames: how many frames to overlap between layers
// reverse: if true, reverse the order
// ============================================================
function sequenceLayers(overlapFrames, reverse) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition first."); return; }
    var layers = comp.selectedLayers;
    if (layers.length < 2) { alert("Select at least 2 layers."); return; }

    var overlapSec = ((overlapFrames || 0) / comp.frameRate);

    // Sort by current layer index (top = 1, bottom = N)
    var sorted = [];
    for (var i = 0; i < layers.length; i++) sorted.push(layers[i]);
    sorted.sort(function(a, b) { return a.index - b.index; });
    if (reverse) sorted.reverse();

    app.beginUndoGroup("Sequence Layers");

    var cursor = sorted[0].inPoint; // anchor first layer

    for (var j = 0; j < sorted.length; j++) {
        var layer = sorted[j];
        var dur = layer.outPoint - layer.inPoint;
        var delta = cursor - layer.inPoint;
        layer.startTime = layer.startTime + delta;
        cursor = layer.outPoint - overlapSec;
    }

    app.endUndoGroup();
}

// ============================================================
// Project Stats
// Returns JSON with item counts and total footage size.
// ============================================================
function getProjectStats() {
    var proj = app.project;
    var comps = 0, footage = 0, audio = 0, images = 0, solids = 0, missing = 0, folders = 0;
    var totalBytes = 0;

    var audioExts = { wav:1, mp3:1, aif:1, aiff:1, aac:1, m4a:1, ogg:1 };
    var imageExts = { png:1, jpg:1, jpeg:1, gif:1, tiff:1, tif:1, bmp:1, exr:1, hdr:1, tga:1 };

    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem) {
            comps++;
        } else if (item instanceof FolderItem) {
            folders++;
        } else if (item instanceof FootageItem) {
            if (item.footageMissing) {
                missing++;
            } else if (item.mainSource instanceof SolidSource) {
                solids++;
            } else {
                var ext = "";
                if (item.mainSource && item.mainSource.file) {
                    var fn = item.mainSource.file.name.toLowerCase();
                    ext = fn.substring(fn.lastIndexOf('.') + 1);
                    try {
                        var f = item.mainSource.file;
                        if (f.exists) totalBytes += f.length;
                    } catch(e) {}
                }
                if (audioExts[ext]) { audio++; }
                else if (imageExts[ext]) { images++; }
                else { footage++; }
            }
        }
    }

    return JSON.stringify({
        comps: comps,
        footage: footage,
        audio: audio,
        images: images,
        solids: solids,
        missing: missing,
        folders: folders,
        totalItems: proj.numItems,
        totalBytes: totalBytes
    });
}

// ============================================================
// Find & Replace in Expressions
// Searches all comps, all layers, all properties for expressions
// containing findStr and replaces with replaceStr.
// ============================================================
function findReplaceExpressions(findStr, replaceStr) {
    if (!findStr) return JSON.stringify({ error: "Find string is empty" });

    var count = 0;

    function processPropGroup(group) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            try {
                if (prop.numProperties && prop.numProperties > 0) {
                    processPropGroup(prop);
                } else if (prop.canSetExpression) {
                    var expr = prop.expression;
                    if (expr && expr.indexOf(findStr) >= 0) {
                        prop.expression = expr.split(findStr).join(replaceStr);
                        count++;
                    }
                }
            } catch(e) {}
        }
    }

    app.beginUndoGroup("Find & Replace Expressions");
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (!(item instanceof CompItem)) continue;
        for (var j = 1; j <= item.numLayers; j++) {
            try { processPropGroup(item.layer(j)); } catch(e) {}
        }
    }
    app.endUndoGroup();

    return JSON.stringify({ count: count });
}


