document.addEventListener('DOMContentLoaded', () => {
  const tooltip = document.getElementById('tooltip-global');

  // ── Tooltip system ─────────────────────────────────────────────────────
  // Default: show data-tooltip-info if available, otherwise aria-label
  // Shift+hover: always show aria-label (short name) even if info exists
  document.querySelectorAll('button[aria-label], .img-wrapper').forEach(btn => {
    btn.addEventListener('mouseenter', (event) => {
        tooltip.classList.remove('show');
        tooltip.style.visibility = 'hidden';
        tooltip.style.left = '0';
        tooltip.style.top = '0';
        tooltip.textContent = '';

        const isShift = event.shiftKey;
        const info = btn.dataset.tooltipInfo;
        // Default: show info if available; Shift: show short label
        const text = (!isShift && info) ? info : btn.getAttribute('aria-label');

        tooltip.textContent = text;
        const rootStyle = getComputedStyle(document.documentElement);
        const mainColor = rootStyle.getPropertyValue('--mainColor').trim();

        // Style: info text uses mainColor background
        if (!isShift && info) {
            tooltip.style.backgroundColor = mainColor || '#FF4B4B';
            tooltip.style.color = '#FFFFFF';
        } else {
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#FFF';
        }

        tooltip.style.display = 'block';
        tooltip.style.visibility = 'hidden';
        tooltip.classList.add('show');

        const rect = btn.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top - tooltipRect.height - 2 + window.scrollY;
        let left = rect.left + window.scrollX + 34;

        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.right - tooltipRect.width + window.scrollX;
        }
        if (left < 0) left = 5;
        if (top < 0) {
            top = rect.bottom + 5 + window.scrollY;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.visibility = 'visible';
    });

    btn.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
    });
  });

  // ── Menu Color Picker ──────────────────────────────────────────────────
  const menuBtn = document.querySelector('.menu-btn');
  const colorPanel = document.querySelector('.color-panel');

  const savedColor = localStorage.getItem('mainColor');
  const savedTheme = localStorage.getItem('themeName') || 'red';

  if (savedColor) {
    document.documentElement.style.setProperty('--mainColor', savedColor);
    updateIconFolder(savedTheme);
  }
  updateActiveTheme(savedTheme);

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    colorPanel.classList.toggle('show');
  });

  document.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const color = getComputedStyle(opt).getPropertyValue('--color').trim();
        const theme = opt.dataset.theme;

        document.documentElement.style.setProperty('--mainColor', color);
        localStorage.setItem('mainColor', color);
        localStorage.setItem('themeName', theme);

        updateIconFolder(theme);
        updateActiveTheme(theme);

        colorPanel.classList.remove('show');
    });
  });

  document.addEventListener('click', (e) => {
    if (!colorPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        colorPanel.classList.remove('show');
    }
  });

  function updateIconFolder(theme) {
    const folderMap = {
        red: 'img',
        green: 'img_Green',
        blue: 'img_Blue',
        yellow: 'img_Yellow',
        pink: 'img_Pink'
    };

    const folder = folderMap[theme] || 'img';

    document.querySelectorAll('.tool img').forEach(img => {
        const originalSrc = img.getAttribute('src');
        const fileName = originalSrc.split('/').pop();
        img.setAttribute('src', `./icons/${folder}/${fileName}`);
    });
  }

  function updateActiveTheme(theme) {
    document.querySelectorAll('.color-option').forEach(opt => {
        if (opt.dataset.theme === theme) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
  }

  // ── UI Scale +/- Controls ──────────────────────────────────────────────
  const SCALE_STEP = 0.05;
  const SCALE_MIN = 0.5;
  const SCALE_MAX = 1.2;

  function getUIScale() {
    const saved = parseFloat(localStorage.getItem('uiScale'));
    return isNaN(saved) ? 1.0 : Math.min(Math.max(saved, SCALE_MIN), SCALE_MAX);
  }

  function setUIScale(val) {
    val = Math.round(val * 100) / 100;
    val = Math.min(Math.max(val, SCALE_MIN), SCALE_MAX);
    localStorage.setItem('uiScale', val);
    document.documentElement.style.setProperty('--uiScale', val);
  }

  setUIScale(getUIScale());

  document.getElementById('scale-up')?.addEventListener('click', () => {
    setUIScale(getUIScale() + SCALE_STEP);
  });

  document.getElementById('scale-down')?.addEventListener('click', () => {
    setUIScale(getUIScale() - SCALE_STEP);
  });

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  // ── About panel ────────────────────────────────────────────────────────
  const aboutBtn = document.querySelector('.about-btn');
  const aboutPanel = document.getElementById('aboutPanel');
  const closeAbout = document.getElementById('closeAbout');

  aboutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    aboutPanel.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!aboutPanel.contains(e.target) && !aboutBtn.contains(e.target)) {
      aboutPanel.classList.remove('show');
    }
  });

  closeAbout.addEventListener('click', () => {
    aboutPanel.classList.remove('show');
  });

  // ── Toggle labels button ───────────────────────────────────────────────
  const toggleBtn = document.querySelector('.toggle-labels-btn');
  const quickTools = document.querySelector('.quick-tools');

  toggleBtn.addEventListener('click', () => {
    quickTools.classList.toggle('show-names');
  });
});
