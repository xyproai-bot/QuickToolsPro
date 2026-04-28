document.addEventListener('DOMContentLoaded', () => {
  const tooltip = document.getElementById('tooltip-global');

  document.querySelectorAll('button[aria-label], .img-wrapper').forEach(btn => {
    btn.addEventListener('mouseenter', (event) => {
        // Reset hoàn toàn trước khi tính toán
        tooltip.classList.remove('show');
        tooltip.style.visibility = 'hidden';
        tooltip.style.left = '0';
        tooltip.style.top = '0';
        tooltip.textContent = '';

        const isShift = event.shiftKey;
        const info = btn.dataset.tooltipInfo;
        const text = (isShift && info) ? info : btn.getAttribute('aria-label');

        tooltip.textContent = text;
        const rootStyle = getComputedStyle(document.documentElement);
        const mainColor = rootStyle.getPropertyValue('--mainColor').trim()

        // style khác nếu là info
        if (isShift && info) {
            tooltip.style.backgroundColor = mainColor || '#FF4B4B';
            tooltip.style.color = '#FFFFFF';
        } else {
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#FFF';
        }

        // Tạm hiển thị để đo chính xác kích thước
        tooltip.style.display = 'block';
        tooltip.style.visibility = 'hidden';
        tooltip.classList.add('show');

        const rect = btn.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // vị trí
        let top = rect.top - tooltipRect.height - 2 + window.scrollY;
        let left = rect.left + window.scrollX + 34;

        // Kiểm tra tràn phải
        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.right - tooltipRect.width + window.scrollX;
        }

        // Kiểm tra tràn trái
        if (left < 0) left = 5;

        // Kiểm tra tràn trên
        if (top < 0) {
            top = rect.bottom + 5 + window.scrollY; // đưa xuống dưới nút
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        // Hiển thị thật sự
        tooltip.style.visibility = 'visible';
    });

    btn.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
    });
  });

  // --- MENU COLOR PICKER ---
    const menuBtn = document.querySelector('.menu-btn');
    const colorPanel = document.querySelector('.color-panel');

    // Lấy màu và theme lưu trong localStorage
    const savedColor = localStorage.getItem('mainColor');
    const savedTheme = localStorage.getItem('themeName') || 'red';

    if (savedColor) {
    document.documentElement.style.setProperty('--mainColor', savedColor);
    updateIconFolder(savedTheme);
    }

    // Toggle hiển thị palette khi bấm menu
    menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    colorPanel.classList.toggle('show');
    });

    // Khi chọn màu
    document.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const color = getComputedStyle(opt).getPropertyValue('--color').trim();
        const theme = opt.dataset.theme; // 🟢 Lấy tên theme từ data-theme

        // Cập nhật màu
        document.documentElement.style.setProperty('--mainColor', color);

        // Lưu lại
        localStorage.setItem('mainColor', color);
        localStorage.setItem('themeName', theme);

        // 🔁 Đổi icon folder tương ứng
        updateIconFolder(theme);

        // Ẩn bảng chọn
        colorPanel.classList.remove('show');
    });
    });

    // Click ra ngoài để đóng
    document.addEventListener('click', (e) => {
    if (!colorPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        colorPanel.classList.remove('show');
    }
    });

    // 🟢 Hàm đổi thư mục icon theo theme
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
});

// --- UI Scale +/- Controls ---
const SCALE_STEP = 0.05;
const SCALE_MIN = 0.5;
const SCALE_MAX = 1.2;

function getUIScale() {
  const saved = parseFloat(localStorage.getItem('uiScale'));
  return isNaN(saved) ? 1.0 : Math.min(Math.max(saved, SCALE_MIN), SCALE_MAX);
}

function setUIScale(val) {
  val = Math.round(val * 100) / 100; // avoid float drift
  val = Math.min(Math.max(val, SCALE_MIN), SCALE_MAX);
  localStorage.setItem('uiScale', val);
  document.documentElement.style.setProperty('--uiScale', val);
}

// Apply saved scale on load
setUIScale(getUIScale());

document.getElementById('scale-up')?.addEventListener('click', () => {
  setUIScale(getUIScale() + SCALE_STEP);
});

document.getElementById('scale-down')?.addEventListener('click', () => {
  setUIScale(getUIScale() - SCALE_STEP);
});

document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";

// About panel logic
const aboutBtn = document.querySelector('.about-btn');
const aboutPanel = document.getElementById('aboutPanel');
const closeAbout = document.getElementById('closeAbout');

aboutBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  aboutPanel.classList.toggle('show');
});

// Ẩn khi click ra ngoài hoặc bấm close
document.addEventListener('click', (e) => {
  if (!aboutPanel.contains(e.target) && !aboutBtn.contains(e.target)) {
    aboutPanel.classList.remove('show');
  }
});

closeAbout.addEventListener('click', () => {
  aboutPanel.classList.remove('show');
});


const toggleBtn = document.querySelector('.toggle-labels-btn');
const quickTools = document.querySelector('.quick-tools');

toggleBtn.addEventListener('click', () => {
  quickTools.classList.toggle('show-names');
});
