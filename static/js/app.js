/**
 * Timetable Management & Decomposer Application Logic
 * Supports:
 * - Teacher Timetable View
 * - Class Timetable View & Homeroom Teacher Editing
 * - Subject Teachers Directory (បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា)
 * - Homeroom Teachers Manager (គ្រប់គ្រងគ្រូបន្ទុកថ្នាក់)
 * - Master Timetable View & Spotlight
 * - Workload Matrix & Analytics
 * - Print & Export Hub
 */

let appState = {
  data: null,
  activeTab: 'teachers',
  selectedTeacherCode: 'I3',
  selectedClassId: '12A',
  masterShift: 'morning',
  masterHighlightCode: '',
  teacherSearchQuery: '',
  teacherSubjectFilter: 'ALL',
  directorySubjectFilter: 'ALL',
  directorySearchQuery: '',
  workloadFilter: 'ALL',
  workloadSearch: '',
  // User Roles & Permissions
  userRole: 'student', // 'admin' | 'teacher' | 'student'
  currentTeacherCode: '',
  adminPin: '',
  selectedDay: 'ALL', // 'ALL', 'TODAY', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'
  isOnline: navigator.onLine,
  // Timetable Scheduler State (រៀបចំកាលវិភាគ)
  schedulerMode: 'class', // 'class' or 'teacher'
  schedulerShift: 'morning', // 'morning' or 'afternoon'
  schedulerClassId: '12A',
  schedulerTeacherCode: 'I3',
  schedulerSwapFirstSlot: null, // null or { shift, classId, slotIndex, dayLabel, periodLabel, teacherCode }
  schedulerTeacherSearch: '',
  schedulerSubjectFilter: 'ALL'
};

const PREFIX_MAP = ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I'];

function getSubjectKey(code) {
  if (!code || code === 'ពលកម្ម') return '';
  for (const p of PREFIX_MAP) {
    if (code.startsWith(p)) return p;
  }
  return '';
}

// Cloud Database is the Single Source of Truth (ទិន្នន័យរួមគ្នាតែមួយពី Online Database)
function getLocalCustomHomeroom() {
  return {};
}

function setLocalCustomHomeroom(map) {
  // Deprecated: Database in source code is authoritative
}

function getLocalCustomTeachers() {
  return {};
}

function setLocalCustomTeachers(map) {
  // Deprecated: Database in source code is authoritative
}

function applyLocalStorageOverrides() {
  // Deprecated: No local storage overrides. All devices share the unified cloud database.
}

// -------------------------------------------------------------
// USER ROLES & PERMISSIONS SYSTEM (ប្រព័ន្ធសិទ្ធិអ្នកប្រើប្រាស់)
// -------------------------------------------------------------
function loadStoredRole() {
  try {
    appState.userRole = localStorage.getItem('timeline_user_role') || 'student';
    appState.currentTeacherCode = localStorage.getItem('timeline_teacher_code') || '';
    appState.adminPin = localStorage.getItem('timeline_admin_pin') || '';
    if (appState.userRole === 'teacher' && appState.currentTeacherCode) {
      appState.selectedTeacherCode = appState.currentTeacherCode;
    }
  } catch (e) {}
}

function saveStoredRole(role, teacherCode = '', pin = '') {
  try {
    localStorage.setItem('timeline_user_role', role);
    localStorage.setItem('timeline_teacher_code', teacherCode);
    if (pin) localStorage.setItem('timeline_admin_pin', pin);
    else localStorage.removeItem('timeline_admin_pin');
    appState.userRole = role;
    appState.currentTeacherCode = teacherCode;
    appState.adminPin = pin;
  } catch (e) {}
  updateRoleUI();
  renderActiveTab();
}

function updateRoleUI() {
  const badgeText = document.getElementById('role-badge-text');
  const badgeIcon = document.getElementById('role-badge-icon');
  const bottomNavIcon = document.getElementById('bottom-nav-role-icon');
  const bottomNavLabel = document.getElementById('bottom-nav-role-label');
  const homeroomTabBtn = document.getElementById('tab-btn-homeroom');

  let title = 'សិស្ស';
  let icon = '🎓';

  if (appState.userRole === 'admin') {
    title = 'Admin';
    icon = '🛡️';
  } else if (appState.userRole === 'teacher') {
    const t = appState.data && appState.data.teachers ? appState.data.teachers[appState.currentTeacherCode] : null;
    title = t ? t.name : (appState.currentTeacherCode || 'គ្រូ');
    icon = '👨‍🏫';
  }

  if (badgeText) badgeText.textContent = title;
  if (badgeIcon) badgeIcon.textContent = icon;
  if (bottomNavIcon) bottomNavIcon.textContent = icon;
  if (bottomNavLabel) bottomNavLabel.textContent = title;

  if (homeroomTabBtn) {
    if (appState.userRole !== 'admin') {
      homeroomTabBtn.innerHTML = `<span>🎯</span> <span>កែនាមគ្រូ</span> <span class="text-[10px] text-amber-500">🔒</span>`;
    } else {
      homeroomTabBtn.innerHTML = `<span>🎯</span> <span>កែនាមគ្រូបន្ទុកថ្នាក់</span>`;
    }
  }

  const schedulerTabBtn = document.getElementById('tab-btn-scheduler');
  if (schedulerTabBtn) {
    if (appState.userRole !== 'admin') {
      schedulerTabBtn.innerHTML = `<span>🛠️</span> <span>រៀបចំកាលវិភាគ</span> <span class="text-[10px] text-amber-500">🔒</span>`;
    } else {
      schedulerTabBtn.innerHTML = `<span>🛠️</span> <span>រៀបចំកាលវិភាគ</span>`;
    }
  }
}

function openRoleModal(initialTab = '') {
  const modal = document.getElementById('role-modal');
  if (!modal) return;

  const currentRole = appState.userRole;
  const teachers = appState.data ? appState.data.teachers : {};
  const tList = Object.values(teachers).sort((a,b) => a.code.localeCompare(b.code));

  modal.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 my-auto border border-slate-200">
      <div class="flex justify-between items-center border-b pb-3">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">👤</span>
          <div>
            <h3 class="font-bold text-base text-gray-900">សិទ្ធិអ្នកប្រើប្រាស់ (User Roles)</h3>
            <p class="text-[11px] text-gray-500">ជ្រើសរើសតួនាទីដើម្បីប្រើប្រាស់លើទូរស័ព្ទ ឬកុំព្យូទ័រ</p>
          </div>
        </div>
        <button onclick="closeRoleModal()" class="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
      </div>

      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-600">សិទ្ធិកំពុងប្រើប្រាស់ ៖</span>
        <span class="px-2.5 py-1 text-xs font-extrabold rounded-full ${
          currentRole === 'admin' ? 'bg-purple-100 text-purple-800' :
          currentRole === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
        }">
          ${currentRole === 'admin' ? '🛡️ អ្នកគ្រប់គ្រង (Admin)' :
            currentRole === 'teacher' ? `👨‍🏫 គ្រូ ${appState.currentTeacherCode}` : '🎓 សិស្ស & អាណាព្យាបាល'}
        </span>
      </div>

      <div class="space-y-3">
        <!-- 1. Student / Public Option -->
        <div class="border rounded-xl p-3.5 transition ${currentRole === 'student' ? 'border-emerald-500 bg-emerald-50/40' : 'border-gray-200 hover:border-gray-300'}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex gap-2.5">
              <span class="text-2xl">🎓</span>
              <div>
                <h4 class="font-bold text-sm text-gray-900">សិស្ស និងអាណាព្យាបាល</h4>
                <p class="text-xs text-gray-500 mt-0.5">មើលកាលវិភាគតាមថ្នាក់រៀន តាមដានមុខវិជ្ជា និងម៉ោងរៀនប្រចាំថ្ងៃ (Read-only)</p>
              </div>
            </div>
            <button
              onclick="selectStudentRole()"
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
            >
              ${currentRole === 'student' ? '✓ កំពុងជ្រើស' : 'ជ្រើសរើស'}
            </button>
          </div>
        </div>

        <!-- 2. Teacher Option -->
        <div class="border rounded-xl p-3.5 transition ${currentRole === 'teacher' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex gap-2.5">
              <span class="text-2xl">👨‍🏫</span>
              <div class="flex-1">
                <h4 class="font-bold text-sm text-gray-900">លោកគ្រូ-អ្នកគ្រូ</h4>
                <p class="text-xs text-gray-500 mt-0.5">ផ្ទាំងកាលវិភាគផ្ទាល់ខ្លួន កែប្រែព័ត៌មានទំនាក់ទំនង និងចែករំលែកតាម Telegram</p>
                <div class="mt-2.5 flex items-center gap-2">
                  <select id="modal-teacher-select" class="text-xs border border-gray-300 rounded-lg p-1.5 flex-1 focus:ring-2 focus:ring-blue-500">
                    <option value="">-- ជ្រើសរើសឈ្មោះគ្រូ --</option>
                    ${tList.map(t => `
                      <option value="${t.code}" ${t.code === appState.currentTeacherCode ? 'selected' : ''}>
                        ${t.code} - ${t.name} (${t.subject_name})
                      </option>
                    `).join('')}
                  </select>
                  <button
                    onclick="selectTeacherRole()"
                    class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
                  >
                    ចូលប្រើ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Administrator Option -->
        <div class="border rounded-xl p-3.5 transition ${currentRole === 'admin' ? 'border-purple-500 bg-purple-50/40' : 'border-gray-200 hover:border-gray-300'}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex gap-2.5">
              <span class="text-2xl">🛡️</span>
              <div class="flex-1">
                <h4 class="font-bold text-sm text-gray-900">នាយកសាលា / អ្នកគ្រប់គ្រង</h4>
                <p class="text-xs text-gray-500 mt-0.5">សិទ្ធិពេញលេញ ៖ កែនាមគ្រូបន្ទុកថ្នាក់ បន្ថែម/កែ/លុបគ្រូមុខវិជ្ជា និងគ្រប់គ្រងទិន្នន័យ</p>
                <div class="mt-2.5">
                  <div class="flex items-center gap-2">
                    <input
                      type="password"
                      id="modal-admin-pin"
                      placeholder="PIN សម្ងាត់ (Default: 1234)"
                      maxlength="10"
                      class="text-xs border border-gray-300 rounded-lg p-1.5 flex-1 focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onclick="selectAdminRole()"
                      class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
                    >
                      ចូលជា Admin
                    </button>
                  </div>
                  <div class="mt-2 text-right">
                    <button onclick="togglePinChangeUI()" class="text-[11px] text-purple-700 hover:underline">
                      🔑 ផ្លាស់ប្តូរលេខកូដ PIN ថ្មី
                    </button>
                  </div>
                </div>

                <!-- Hidden Change PIN Drawer -->
                <div id="drawer-change-pin" class="hidden mt-3 p-3 bg-white rounded-lg border border-purple-200 text-xs space-y-2">
                  <div class="font-bold text-purple-900">ផ្លាស់ប្តូរលេខ PIN ថ្មី ៖</div>
                  <input type="password" id="old-pin-input" placeholder="លេខកូដ PIN ចាស់" class="w-full border rounded p-1.5 text-xs">
                  <input type="password" id="new-pin-input" placeholder="លេខកូដ PIN ថ្មី (យ៉ាងតិច ៤ ខ្ទង់)" class="w-full border rounded p-1.5 text-xs">
                  <div class="flex justify-end gap-2 pt-1">
                    <button onclick="togglePinChangeUI()" class="px-2.5 py-1 text-gray-500 text-xs">បោះបង់</button>
                    <button onclick="submitChangePin()" class="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold">រក្សាទុក PIN ថ្មី</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-2 border-t flex justify-between items-center text-xs text-gray-500">
        <span>ប្រព័ន្ធរក្សាទុកស្វ័យប្រវត្តិតាមឧបករណ៍</span>
        <button onclick="closeRoleModal()" class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition">បិទ</button>
      </div>
    </div>
  `;
}

function closeRoleModal() {
  const modal = document.getElementById('role-modal');
  if (modal) {
    modal.className = "hidden";
    modal.innerHTML = "";
  }
}

function selectStudentRole() {
  saveStoredRole('student');
  closeRoleModal();
}

async function selectTeacherRole() {
  const select = document.getElementById('modal-teacher-select');
  const code = select ? select.value.trim() : '';
  if (!code) {
    alert('សូមជ្រើសរើសឈ្មោះគ្រូបង្រៀនមួយរូប!');
    return;
  }
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'teacher', teacher_code: code })
    });
    const result = await res.json();
    if (result.status === 'success') {
      saveStoredRole('teacher', code);
      appState.selectedTeacherCode = code;
      appState.activeTab = 'teachers';
      closeRoleModal();
    }
  } catch (err) {
    saveStoredRole('teacher', code);
    appState.selectedTeacherCode = code;
    appState.activeTab = 'teachers';
    closeRoleModal();
  }
}

async function selectAdminRole() {
  const pinInput = document.getElementById('modal-admin-pin');
  const pin = pinInput ? pinInput.value.trim() : '';
  if (!pin) {
    alert('សូមបញ្ចូលលេខកូដសម្ងាត់ PIN!');
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', pin: pin })
    });
    const result = await res.json();
    if (result.status === 'success') {
      saveStoredRole('admin', '', pin);
      alert('✅ បានចូលប្រើប្រាស់ជាអ្នកគ្រប់គ្រង (Admin) ដោយជោគជ័យ!');
      closeRoleModal();
    } else {
      alert(result.message || 'លេខសម្ងាត់ PIN មិនត្រឹមត្រូវទេ!');
    }
  } catch (err) {
    if (pin === '1234' || (appState.adminPin && pin === appState.adminPin)) {
      saveStoredRole('admin', '', pin);
      alert('✅ បានចូលប្រើប្រាស់ជា Admin (Offline Mode)');
      closeRoleModal();
    } else {
      alert('លេខកូដ PIN មិនត្រឹមត្រូវទេ! (Default PIN: 1234)');
    }
  }
}

function togglePinChangeUI() {
  const drawer = document.getElementById('drawer-change-pin');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
}

async function submitChangePin() {
  const oldPin = document.getElementById('old-pin-input').value.trim();
  const newPin = document.getElementById('new-pin-input').value.trim();
  if (!oldPin || !newPin) {
    alert('សូមបំពេញលេខ PIN ចាស់ និង PIN ថ្មី!');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ ' + result.message);
      saveStoredRole('admin', '', newPin);
      togglePinChangeUI();
    } else {
      alert('⚠️ ' + result.message);
    }
  } catch (err) {
    alert('មានបញ្ហាក្នុងការភ្ជាប់ទៅ Server ៖ ' + err.message);
  }
}

// Day Filter & Telegram Share Helpers
function setDayFilter(day) {
  if (day === 'TODAY') {
    const khmerDays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const todayIdx = new Date().getDay();
    if (todayIdx === 0) {
      alert('📅 ថ្ងៃនេះជាថ្ងៃអាទិត្យ (ថ្ងៃឈប់សម្រាក) — បង្ហាញកាលវិភាគថ្ងៃចន្ទជំនួស');
      appState.selectedDay = 'ចន្ទ';
    } else {
      appState.selectedDay = khmerDays[todayIdx];
    }
  } else {
    appState.selectedDay = day;
  }
  renderActiveTab();
}

function shareTeacherScheduleTelegram(code) {
  const t = appState.data.teachers[code];
  if (!t) return;

  const school = appState.data.school_info ? appState.data.school_info.school_name : 'វិទ្យាល័យ';
  const year = appState.data.school_info ? appState.data.school_info.academic_year : '២០២៦-២០២៧';
  
  let text = `📅 *កាលវិភាគបង្រៀនគ្រូ*\n`;
  text += `🏫 ${school} | ឆ្នាំសិក្សា ${year}\n`;
  text += `👤 *លោកគ្រូ-អ្នកគ្រូ* ៖ ${t.name} (${t.code})\n`;
  text += `📚 *មុខវិជ្ជា* ៖ ${t.subject_name}\n`;
  text += `⏱️ *បន្ទុកម៉ោង* ៖ ${t.total_hours} ម៉ោង/សប្ដាហ៍ (${t.classes.join(', ')})\n\n`;

  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  
  text += `☀️ *ពេលព្រឹក* ៖\n`;
  let hasM = false;
  days.forEach(d => {
    if (t.morning_slots && t.morning_slots[d] && Object.keys(t.morning_slots[d]).length > 0) {
      const periods = Object.entries(t.morning_slots[d]).map(([p, cls]) => `ម៉ោង ${p} (${cls})`).join(', ');
      text += `• ${d} ៖ ${periods}\n`;
      hasM = true;
    }
  });
  if (!hasM) text += `• គ្មានម៉ោងព្រឹក\n`;

  text += `\n⛅ *ពេលរសៀល* ៖\n`;
  let hasA = false;
  days.forEach(d => {
    if (t.afternoon_slots && t.afternoon_slots[d] && Object.keys(t.afternoon_slots[d]).length > 0) {
      const periods = Object.entries(t.afternoon_slots[d]).map(([p, cls]) => `ម៉ោង ${p} (${cls})`).join(', ');
      text += `• ${d} ៖ ${periods}\n`;
      hasA = true;
    }
  });
  if (!hasA) text += `• គ្មានម៉ោងរសៀល\n`;

  text += `\n🌐 ចូលមើលលើអនឡាញ ៖ ${window.location.origin}`;

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank');
}

function shareClassScheduleTelegram(classId) {
  const cls = appState.data.classes.find(c => c.id === classId);
  if (!cls) return;

  const school = appState.data.school_info ? appState.data.school_info.school_name : 'វិទ្យាល័យ';
  const year = appState.data.school_info ? appState.data.school_info.academic_year : '២០២៦-២០២៧';

  let text = `📅 *កាលវិភាគសិក្សាថ្នាក់ ${cls.id}*\n`;
  text += `🏫 ${school} | ឆ្នាំសិក្សា ${year}\n`;
  text += `👨‍🏫 *គ្រូបន្ទុកថ្នាក់* ៖ ${cls.homeroom}\n\n`;

  const mSlots = appState.data.morning_schedule[cls.id] || [];
  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  
  text += `☀️ *កាលវិភាគពេលព្រឹក* ៖\n`;
  days.forEach((d, dIdx) => {
    const p1 = mSlots[dIdx * 4] || '--';
    const p2 = mSlots[dIdx * 4 + 1] || '--';
    const p3 = mSlots[dIdx * 4 + 2] || '--';
    const p4 = mSlots[dIdx * 4 + 3] || '--';
    text += `• ${d} ៖ 1-2(${p1}), 2-3(${p2}), 3-4(${p3}), 4-5(${p4})\n`;
  });

  text += `\n🌐 ចូលមើលលើអនឡាញ ៖ ${window.location.origin}`;

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank');
}

function updateOnlineStatus(isOnline) {
  appState.isOnline = isOnline;
  const badge = document.getElementById('connection-status-badge');
  const txt = document.getElementById('connection-status-text');
  if (badge && txt) {
    if (isOnline) {
      badge.className = "text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1";
      txt.textContent = "អនឡាញ";
    } else {
      badge.className = "text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1";
      txt.textContent = "ក្រៅបណ្តាញ (Offline)";
    }
  }
}
window.addEventListener('online', () => updateOnlineStatus(true));
window.addEventListener('offline', () => updateOnlineStatus(false));

// -------------------------------------------------------------
// CLOUD DATABASE & REALTIME AUTO-SYNC (សមកាលកម្ម Cloud DB ស្វ័យប្រវត្តិ)
// -------------------------------------------------------------
// GOOGLE SHEETS & CLOUD REALTIME AUTO-SYNC
// -------------------------------------------------------------
async function checkCloudStatus() {
  try {
    const res = await fetch('/api/google-sheets/status');
    const json = await res.json();
    if (json.status === 'success') {
      appState.googleSheetsConfigured = json.is_configured;
      const el = document.getElementById('cloud-sync-text');
      const btn = document.getElementById('cloud-sync-btn');
      if (el) {
        if (json.is_configured) {
          el.textContent = "Google Sheets (ON)";
          if (btn) btn.className = "text-[10px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-1 transition";
        } else {
          el.textContent = "Google Sheets";
          if (btn) btn.className = "text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-1 transition";
        }
      }
    }
  } catch (e) {
    console.warn("Could not check Google Sheets status:", e);
  }
}

// Silent background auto-sync without interrupting user
async function silentCloudSync() {
  if (appState.isSyncing || !navigator.onLine) return;
  appState.isSyncing = true;
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        const curCloudTime = appState.data ? (appState.data.cloud_updated_at || '') : '';
        const newCloudTime = json.cloud_updated_at || '';
        if (newCloudTime !== curCloudTime || !curCloudTime) {
          appState.data = json;
          renderStatsBar();
          renderActiveTab();
        }
      }
    }
  } catch (e) {
    console.warn("Silent sync notice:", e);
  } finally {
    appState.isSyncing = false;
  }
}

// Manual Sync by User
async function manualCloudSync() {
  const icon = document.getElementById('manual-sync-icon');
  if (icon) icon.classList.add('animate-spin');

  try {
    const res = await fetch('/api/data');
    const json = await res.json();
    if (json.status === 'success') {
      appState.data = json;
      renderStatsBar();
      renderActiveTab();
      showToast("✅ បានទាញយកទិន្នន័យចុងក្រោយពី Cloud Database ដោយជោគជ័យ!");
    } else {
      alert("⚠️ " + (json.message || "មិនអាចទាញយកទិន្នន័យបានទេ"));
    }
  } catch (err) {
    alert("⚠️ មិនអាចភ្ជាប់ទៅកាន់ Server ៖ " + err.message);
  } finally {
    setTimeout(() => {
      if (icon) icon.classList.remove('animate-spin');
    }, 600);
  }
}

function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed top-16 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 transition duration-300 transform translate-y-0 opacity-100 flex items-center gap-2';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('hidden', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

// Google Sheets Database Management Modal
async function openCloudModal() {
  const modal = document.getElementById('cloud-modal');
  if (!modal) return;

  modal.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 my-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex justify-between items-center border-b pb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">📊</span>
          <div>
            <h3 class="font-bold text-base text-gray-900">Google Sheets Database (ប្រព័ន្ធទិន្នន័យ Google Sheet)</h3>
            <p class="text-[11px] text-gray-500">ប្រើប្រាស់ Google Sheet ផ្ទាល់ខ្លួនជា Database រួមគ្នាតាមអនឡាញ (Single Source of Truth)</p>
          </div>
        </div>
        <button onclick="closeCloudModal()" class="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
      </div>

      <!-- Status Banner -->
      <div id="gs-status-banner" class="p-3.5 rounded-xl border flex items-center justify-between text-xs bg-slate-50 border-slate-200">
        <div class="flex items-center gap-2">
          <span id="gs-status-dot" class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          <span id="gs-status-title" class="font-bold text-slate-700">កំពុងពិនិត្យស្ថានភាព...</span>
        </div>
        <span id="gs-status-badge" class="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-slate-200 text-slate-700">ពិនិត្យ</span>
      </div>

      <!-- URL Input Box -->
      <div class="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
        <label class="block font-bold text-xs text-slate-800">
          🔗 Google Apps Script Web App URL ៖
        </label>
        <div class="flex gap-2">
          <input
            type="url"
            id="cfg-gs-url"
            placeholder="https://script.google.com/macros/s/.../exec"
            class="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
          />
          <button
            onclick="saveGoogleSheetsUrl()"
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-sm transition"
          >
            💾 រក្សាទុក URL
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            onclick="testGoogleSheetsConnection()"
            class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1"
          >
            🔌 តេស្តការតភ្ជាប់
          </button>
          <button
            onclick="syncInitialDataToGoogleSheets()"
            class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition flex items-center gap-1"
          >
            📤 Push ទិន្នន័យដំបូងទៅ Sheet
          </button>
          <button
            onclick="manualCloudSync(); closeCloudModal();"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            🔄 Sync ភ្លាមៗ
          </button>
        </div>
      </div>

      <!-- Quick 5-step Guide with Copy Button -->
      <div class="border border-emerald-200 rounded-xl p-3.5 bg-emerald-50/40 text-xs space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="font-bold text-emerald-950 flex items-center gap-1.5">
            <span>📝</span> <span>របៀបបង្កើត Google Sheet ធ្វើជា Database (ងាយស្រួលត្រឹម ១ នាទី)</span>
          </span>
          <button
            onclick="copyAppsScriptCode()"
            id="btn-copy-script"
            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shadow-sm transition flex items-center gap-1"
          >
            <span>📋</span> <span>ចម្លងកូដ Apps Script</span>
          </button>
        </div>
        <ol class="list-decimal list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
          <li>បើកបង្កើត Google Sheet ថ្មីមួយនៅ <a href="https://sheets.new" target="_blank" class="text-blue-600 underline font-bold">sheets.new</a> (ដាក់ឈ្មោះ <strong>«កាលវិភាគបង្រៀន»</strong>)</li>
          <li>ចុចម៉ឺនុយ <strong>Extensions (ផ្នែកបន្ថែម)</strong> -> ជ្រើសរើស <strong>Apps Script</strong></li>
          <li>លុបកូដចាស់ចោល រួចចុចប៊ូតុង <strong>«ចម្លងកូដ Apps Script»</strong> ខាងលើនេះយកទៅ Paste ចូល</li>
          <li>ចុចប៊ូតុង <strong>Deploy (ដាក់ឱ្យប្រើ)</strong> -> <strong>New deployment</strong> -> ជ្រើសរើសប្រភេទ <strong>Web app</strong> ៖
            <ul class="list-disc list-inside ml-4 mt-0.5 text-slate-600">
              <li>Execute as: <strong>Me (ខ្ញុំ)</strong></li>
              <li>Who has access: <strong>Anyone (អ្នកណាដែលមានតំណភ្ជាប់)</strong></li>
            </ul>
          </li>
          <li>ចុច <strong>Deploy</strong> រួច Copy យក <strong>Web app URL</strong> មកបិទភ្ជាប់ (Paste) ក្នុងប្រអប់ខាងលើ ហើយចុច <strong>«រក្សាទុក URL»</strong> ជាការស្រេច!</li>
        </ol>
      </div>

      <div class="flex justify-end pt-2 border-t">
        <button onclick="closeCloudModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition">
          បិទ
        </button>
      </div>
    </div>
  `;

  // Fetch current config into input and update status
  try {
    const res = await fetch('/api/google-sheets/status');
    const json = await res.json();
    if (json.status === 'success') {
      const input = document.getElementById('cfg-gs-url');
      if (input && json.web_app_url) input.value = json.web_app_url;

      const dot = document.getElementById('gs-status-dot');
      const title = document.getElementById('gs-status-title');
      const badge = document.getElementById('gs-status-badge');
      const banner = document.getElementById('gs-status-banner');

      if (json.is_configured) {
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
        if (title) title.textContent = "🟢 បានតភ្ជាប់ទៅកាន់ Google Sheets Database រួចរាល់";
        if (badge) {
          badge.textContent = "ភ្ជាប់ជោគជ័យ";
          badge.className = "px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300";
        }
        if (banner) banner.className = "p-3.5 rounded-xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200";
      } else {
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
        if (title) title.textContent = "⚪ មិនទាន់ភ្ជាប់ Google Sheets (កំពុងប្រើ Backup Database ក្នុង Source Code)";
        if (badge) {
          badge.textContent = "មិនទាន់ភ្ជាប់";
          badge.className = "px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-300";
        }
        if (banner) banner.className = "p-3.5 rounded-xl border flex items-center justify-between text-xs bg-amber-50 border-amber-200";
      }
    }
  } catch (e) {}
}

function closeCloudModal() {
  const modal = document.getElementById('cloud-modal');
  if (modal) {
    modal.className = "hidden";
    modal.innerHTML = "";
  }
}

async function saveGoogleSheetsUrl() {
  const urlEl = document.getElementById('cfg-gs-url');
  if (!urlEl) return;
  const url = urlEl.value.trim();
  try {
    const res = await fetch('/api/google-sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ web_app_url: url })
    });
    const json = await res.json();
    if (json.status === 'success') {
      showToast('✅ ' + json.message);
      checkCloudStatus();
      openCloudModal();
    } else {
      alert('⚠️ ' + json.message);
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកបាន ៖ ' + err.message);
  }
}

async function testGoogleSheetsConnection() {
  const urlEl = document.getElementById('cfg-gs-url');
  const url = urlEl ? urlEl.value.trim() : '';
  try {
    const res = await fetch('/api/google-sheets/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ web_app_url: url })
    });
    const json = await res.json();
    alert(`[${json.provider || 'Google Sheets'}]\n\n${json.message}`);
  } catch (err) {
    alert('កំហុសក្នុងការតេស្ត ៖ ' + err.message);
  }
}

async function syncInitialDataToGoogleSheets() {
  try {
    showToast('⏳ កំពុងផ្ញើទិន្នន័យកាលវិភាគទៅ Google Sheets...');
    const res = await fetch('/api/google-sheets/sync', { method: 'POST' });
    const json = await res.json();
    if (json.status === 'success') {
      alert('✅ ' + json.message + '\n\nឥឡូវអ្នកអាចបើកមើល Google Sheet នោះ នឹងឃើញសន្លឹកបៀកាលវិភាគ និងបញ្ជីគ្រូទាំងអស់!');
      openCloudModal();
    } else {
      alert('⚠️ ' + json.message);
    }
  } catch (err) {
    alert('កំហុស ៖ ' + err.message);
  }
}

async function copyAppsScriptCode() {
  const btn = document.getElementById('btn-copy-script');
  try {
    const res = await fetch('/api/google-sheets/script');
    const json = await res.json();
    if (json.status === 'success' && json.script) {
      await navigator.clipboard.writeText(json.script);
      if (btn) btn.innerHTML = '<span>✅</span> <span>បានចម្លងរួចរាល់!</span>';
      showToast('✅ បានចម្លងកូដ Google Apps Script ទៅក្នុង Clipboard!');
      setTimeout(() => {
        if (btn) btn.innerHTML = '<span>📋</span> <span>ចម្លងកូដ Apps Script</span>';
      }, 3000);
    } else {
      alert('មិនអាចទាញយកកូដ Script បានទេ');
    }
  } catch (err) {
    alert('កំហុសក្នុងការចម្លង ៖ ' + err.message);
  }
}

async function testCloudConnectionInModal() {
  return testGoogleSheetsConnection();
}

async function saveCloudConfigFromModal() {
  return saveGoogleSheetsUrl();
}

async function pushDataToCloudFromModal() {
  return syncInitialDataToGoogleSheets();
}

// Fetch initial data
async function initApp() {
  loadStoredRole();

  // Clear any legacy local overrides from previous sessions so all devices stay 100% unified
  try {
    localStorage.removeItem('timeline_custom_homeroom');
    localStorage.removeItem('timeline_custom_teachers');
  } catch (e) {}

  // 1. Instant hydration from pre-rendered window.INITIAL_DATA
  if (window.INITIAL_DATA && window.INITIAL_DATA.status === 'success') {
    appState.data = window.INITIAL_DATA;
    const codes = Object.keys(appState.data.teachers || {});
    if (codes.length > 0 && !codes.includes(appState.selectedTeacherCode)) {
      appState.selectedTeacherCode = appState.currentTeacherCode || codes[0];
    }
    renderStatsBar();
    updateRoleUI();
    renderActiveTab();
    setupEventListeners();
  }

  // 2. Fetch or sync latest data from /api/data directly from cloud database
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        const hadData = !!appState.data;
        appState.data = json;
        const codes = Object.keys(json.teachers || {});
        if (codes.length > 0 && (!appState.selectedTeacherCode || !codes.includes(appState.selectedTeacherCode))) {
          appState.selectedTeacherCode = codes[0];
        }
        renderStatsBar();
        renderActiveTab();
        if (!hadData) {
          setupEventListeners();
        }
      }
    }
  } catch (err) {
    console.warn('API sync warning:', err);
    if (!appState.data) {
      const tabEl = document.getElementById('tab-content');
      if (tabEl) {
        tabEl.innerHTML = `
          <div class="py-12 text-center max-w-md mx-auto bg-white rounded-xl shadow p-6 border border-red-200">
            <div class="text-4xl mb-3">⚠️</div>
            <h3 class="text-lg font-bold text-red-700 mb-2">មិនអាចទាញយកទិន្នន័យបាន</h3>
            <p class="text-sm text-slate-600 mb-4">សូមពិនិត្យមើលការភ្ជាប់អ៊ីនធឺណិត ឬសាកល្បងចុច Refresh ឡើងវិញ។</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow hover:bg-blue-700">🔄 ផ្ទុកទំព័រឡើងវិញ (Refresh)</button>
          </div>
        `;
      }
    }
  }

  // Check Cloud Database connection
  checkCloudStatus();

  // Auto-sync from online shared database every 15 seconds
  setInterval(silentCloudSync, 15000);

  // Auto-sync when user returns to app/tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      silentCloudSync();
    }
  });
}

// Refresh data from server without full reload
async function refreshData(callback) {
  try {
    const res = await fetch('/api/data');
    const json = await res.json();
    if (json.status === 'success') {
      appState.data = json;
      renderStatsBar();
      renderActiveTab();
      if (callback) callback();
    }
  } catch (err) {
    console.error('Refresh error:', err);
    renderActiveTab();
  }
}

// Render Top Quick Stats
function renderStatsBar() {
  const stats = appState.data.stats;
  const el = document.getElementById('quick-stats');
  if (!el) return;

  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 text-xs md:text-sm">
      <div class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5">
        <span class="font-bold">🏫 សរុបថ្នាក់ ៖</span>
        <span class="font-extrabold">${stats.total_classes} ថ្នាក់</span>
      </div>
      <div class="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1.5">
        <span class="font-bold">👨‍🏫 គ្រូមុខវិជ្ជា ៖</span>
        <span class="font-extrabold">${stats.total_teachers} នាក់/កូដ</span>
      </div>
      <div class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
        <span class="font-bold">⏱️ ម៉ោងសរុប ៖</span>
        <span class="font-extrabold">${stats.all_hours_total} ម៉ោង</span>
      </div>
      <div class="${stats.conflicts_count === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} px-3 py-1.5 rounded-lg border flex items-center gap-1.5">
        <span class="font-bold">⚡ ភាពជាន់គ្នា ៖</span>
        <span class="font-extrabold">${stats.conflicts_count === 0 ? '✅ គ្មានជាន់គ្នា (០)' : '⚠️ ' + stats.conflicts_count + ' ម៉ោង'}</span>
      </div>
    </div>
  `;
}

// Tab Switching
function switchTab(tabId) {
  appState.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('border-blue-600', 'text-blue-600', 'bg-blue-50', 'font-bold');
      btn.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-800');
    } else {
      btn.classList.remove('border-blue-600', 'text-blue-600', 'bg-blue-50', 'font-bold');
      btn.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-800');
    }
  });

  renderActiveTab();
}

function renderActiveTab() {
  const container = document.getElementById('tab-content');
  if (!container) return;

  switch (appState.activeTab) {
    case 'teachers':
      renderTeachersView(container);
      break;
    case 'classes':
      renderClassesView(container);
      break;
    case 'subject_teachers':
      renderSubjectTeachersView(container);
      break;
    case 'homeroom_manager':
      renderHomeroomManagerView(container);
      break;
    case 'scheduler':
      renderSchedulerView(container);
      break;
    case 'master':
      renderMasterView(container);
      break;
    case 'workload':
      renderWorkloadView(container);
      break;
    case 'print_hub':
      renderPrintHubView(container);
      break;
    default:
      container.innerHTML = '<div class="p-6 text-center text-gray-500">ទំព័រមិនមានទិន្នន័យ</div>';
  }
}

// -------------------------------------------------------------
// TAB 1: TEACHERS VIEW
// -------------------------------------------------------------
function renderTeachersView(container) {
  const teachers = appState.data.teachers;
  const subjects = appState.data.subjects;
  const activeCode = appState.selectedTeacherCode;
  const activeTeacher = teachers[activeCode] || Object.values(teachers)[0];

  const filteredCodes = Object.keys(teachers).filter(code => {
    const t = teachers[code];
    const matchSearch = !appState.teacherSearchQuery ||
      code.toLowerCase().includes(appState.teacherSearchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(appState.teacherSearchQuery.toLowerCase()) ||
      t.subject_name.toLowerCase().includes(appState.teacherSearchQuery.toLowerCase());
    const matchSubject = appState.teacherSubjectFilter === 'ALL' || t.subject_key === appState.teacherSubjectFilter;
    return matchSearch && matchSubject;
  });

  const morningSlots = activeTeacher.morning_slots || {};
  const afternoonSlots = activeTeacher.afternoon_slots || {};
  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const freeDays = days.filter(d => {
    const hasM = morningSlots[d] && Object.keys(morningSlots[d]).length > 0;
    const hasA = afternoonSlots[d] && Object.keys(afternoonSlots[d]).length > 0;
    return !hasM && !hasA;
  });

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left sidebar: Teacher selection -->
      <div class="lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[750px]">
        <div class="mb-3">
          <label class="block text-xs font-bold text-gray-600 mb-1">ស្វែងរកគ្រូបង្រៀន ៖</label>
          <input
            type="text"
            id="teacher-search-input"
            value="${appState.teacherSearchQuery}"
            placeholder="វាយកូដគ្រូ (K1, M1...) ឬឈ្មោះ..."
            class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div class="flex flex-wrap gap-1 mb-3 overflow-x-auto pb-1 max-h-24">
          <button
            onclick="setTeacherSubjectFilter('ALL')"
            class="px-2.5 py-1 text-xs rounded-full border transition ${appState.teacherSubjectFilter === 'ALL' ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}"
          >
            ទាំងអស់ (${Object.keys(teachers).length})
          </button>
          ${Object.keys(subjects).map(k => `
            <button
              onclick="setTeacherSubjectFilter('${k}')"
              class="px-2 py-0.5 text-xs rounded-full border transition ${appState.teacherSubjectFilter === k ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}"
            >
              ${subjects[k].short}
            </button>
          `).join('')}
        </div>

        <div class="text-xs text-gray-500 font-semibold mb-2">
          បញ្ជីគ្រូ (${filteredCodes.length} នាក់) ៖
        </div>

        <div class="overflow-y-auto flex-1 space-y-1.5 pr-1">
          ${filteredCodes.map(code => {
            const t = teachers[code];
            const isSelected = code === activeCode;
            return `
              <div
                onclick="selectTeacher('${code}')"
                class="p-2.5 rounded-lg cursor-pointer border transition flex items-center justify-between ${isSelected ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}"
              >
                <div class="flex items-center gap-2.5">
                  <span class="w-9 h-9 rounded-md flex items-center justify-center font-bold text-sm" style="background-color: ${t.subject_color}; color: ${t.subject_text_color}; border: 1px solid ${t.subject_border}">
                    ${t.code}
                  </span>
                  <div>
                    <div class="font-bold text-sm text-gray-900">${t.name}</div>
                    <div class="text-xs text-gray-500">${t.subject_name}</div>
                  </div>
                </div>
                <div class="text-right">
                  <span class="inline-block px-2 py-0.5 text-xs font-bold rounded-full ${t.total_hours >= 18 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                    ${t.total_hours} ម៉ោង
                  </span>
                  <div class="text-[10px] text-gray-400 mt-0.5">${t.classes.length} ថ្នាក់</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right area: Detailed Individual Teacher Schedule Card -->
      <div class="lg:col-span-8 space-y-4">
        ${appState.userRole === 'teacher' && activeTeacher.code === appState.currentTeacherCode ? `
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between gap-3">
            <div>
              <div class="text-xs text-blue-200">👋 សូមស្វាគមន៍លោកគ្រូ-អ្នកគ្រូ</div>
              <div class="text-lg font-black mt-0.5">${activeTeacher.name} (${activeTeacher.code})</div>
              <div class="text-xs text-blue-100 mt-1">កាលវិភាគបង្រៀនផ្ទាល់ខ្លួនសរុប <strong>${activeTeacher.total_hours} ម៉ោង/សប្ដាហ៍</strong> (${activeTeacher.classes.join(', ')})</div>
            </div>
            <button onclick="shareTeacherScheduleTelegram('${activeTeacher.code}')" class="px-3.5 py-2 bg-white text-blue-700 font-extrabold text-xs rounded-lg shadow hover:bg-blue-50 transition shrink-0 flex items-center gap-1.5">
              <span>✈️</span> ចែករំលែក Telegram
            </button>
          </div>
        ` : ''}

        <!-- Top Teacher Profile Card -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-sm shrink-0" style="background-color: ${activeTeacher.subject_color}; color: ${activeTeacher.subject_text_color}; border: 2px solid ${activeTeacher.subject_border}">
                ${activeTeacher.code}
              </span>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-xl font-bold text-gray-900">${activeTeacher.name}</h2>
                  <span class="px-2.5 py-0.5 text-xs rounded-full font-bold" style="background-color: ${activeTeacher.subject_color}; color: ${activeTeacher.subject_text_color}; border: 1px solid ${activeTeacher.subject_border}">
                    ${activeTeacher.subject_name}
                  </span>
                  ${activeTeacher.homeroom_class ? `
                    <span class="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded font-bold border border-purple-200">
                      គ្រូបន្ទុកថ្នាក់ ${activeTeacher.homeroom_class}
                    </span>
                  ` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>ភេទ ៖ <strong>${activeTeacher.gender || 'ប្រុស'}</strong></span>
                  <span>•</span>
                  <span>📱 ទូរស័ព្ទ ៖ ${activeTeacher.phone || 'មិនទាន់កំណត់'}</span>
                  <span>•</span>
                  <span>📚 បង្រៀនថ្នាក់ ៖ <strong class="text-gray-700">${activeTeacher.classes.join(', ') || 'គ្មាន'}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                onclick="shareTeacherScheduleTelegram('${activeTeacher.code}')"
                class="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
                title="ផ្ញើកាលវិភាគទៅកាន់ Telegram"
              >
                <span>✈️</span> Telegram
              </button>
              <button
                onclick="printSingleTeacherCard('${activeTeacher.code}')"
                class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
              >
                🖨️ បោះពុម្ព
              </button>
              ${(appState.userRole === 'admin' || (appState.userRole === 'teacher' && activeTeacher.code === appState.currentTeacherCode)) ? `
                <button
                  onclick="openEditTeacherModal('${activeTeacher.code}')"
                  class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold border border-gray-300 transition"
                >
                  ✏️ កែព័ត៌មាន
                </button>
              ` : ''}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
              <div class="text-xs text-blue-600 font-semibold">ម៉ោងបង្រៀនសរុប</div>
              <div class="text-2xl font-black text-blue-900 mt-0.5">${activeTeacher.total_hours} <span class="text-xs font-normal">ម៉ោង/សប្ដាហ៍</span></div>
            </div>
            <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">
              <div class="text-xs text-indigo-600 font-semibold">ពេលព្រឹក</div>
              <div class="text-2xl font-black text-indigo-900 mt-0.5">${activeTeacher.morning_hours} <span class="text-xs font-normal">ម៉ោង</span></div>
            </div>
            <div class="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
              <div class="text-xs text-amber-600 font-semibold">ពេលរសៀល</div>
              <div class="text-2xl font-black text-amber-900 mt-0.5">${activeTeacher.afternoon_hours} <span class="text-xs font-normal">ម៉ោង</span></div>
            </div>
            <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
              <div class="text-xs text-emerald-600 font-semibold">ថ្ងៃទំនេរ (Off-duty)</div>
              <div class="text-sm font-bold text-emerald-900 mt-2">${freeDays.length > 0 ? freeDays.join(', ') : 'គ្មាន (មានម៉ោងរាល់ថ្ងៃ)'}</div>
            </div>
          </div>
        </div>

        <!-- Day Filter Bar -->
        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
            <span class="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">📅 ជ្រើសរើសថ្ងៃ ៖</span>
            <button onclick="setDayFilter('ALL')" class="px-3 py-1 rounded-full border transition ${appState.selectedDay === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">ទាំងអស់</button>
            <button onclick="setDayFilter('TODAY')" class="px-3 py-1 rounded-full border transition ${appState.selectedDay === 'TODAY' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'}">⚡ ថ្ងៃនេះ</button>
            ${days.map(d => `
              <button onclick="setDayFilter('${d}')" class="px-2.5 py-1 rounded-full border transition ${appState.selectedDay === d ? 'bg-blue-600 text-white font-bold' : 'bg-white text-gray-600 hover:bg-gray-100'}">${d}</button>
            `).join('')}
          </div>
          <div class="text-xs text-slate-500 font-semibold">
            ${appState.selectedDay === 'ALL' ? 'ទិដ្ឋភាពពេញសប្តាហ៍' : `ទិដ្ឋភាពថ្ងៃ${appState.selectedDay}`}
          </div>
        </div>

        ${appState.selectedDay !== 'ALL' ? `
          ${generateTeacherDailyCardsHTML(activeTeacher, appState.selectedDay)}
        ` : `
          <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  កាលវិភាគពេលព្រឹក (Morning Schedule) - ចំនួន ${activeTeacher.morning_hours} ម៉ោង
                </h3>
                <span class="text-xs text-gray-500">ម៉ោង ៧:០០ - ១២:០០</span>
              </div>
              ${generateTeacherGridHTML(activeTeacher, 'morning')}
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                  កាលវិភាគពេលរសៀល (Afternoon Schedule) - ចំនួន ${activeTeacher.afternoon_hours} ម៉ោង
                </h3>
                <span class="text-xs text-gray-500">ម៉ោង ១៣:០០ - ១៧:០០</span>
              </div>
              ${generateTeacherGridHTML(activeTeacher, 'afternoon')}
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  const searchInput = document.getElementById('teacher-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.teacherSearchQuery = e.target.value;
      renderActiveTab();
      const el = document.getElementById('teacher-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
}

function generateTeacherDailyCardsHTML(teacher, dayName) {
  const mSlots = teacher.morning_slots && teacher.morning_slots[dayName] ? teacher.morning_slots[dayName] : {};
  const aSlots = teacher.afternoon_slots && teacher.afternoon_slots[dayName] ? teacher.afternoon_slots[dayName] : {};

  const mPeriods = [
    { name: 'ម៉ោង ៧-៨', label: '7-8', classId: mSlots['7-8'] },
    { name: 'ម៉ោង ៨-៩', label: '8-9', classId: mSlots['8-9'] },
    { name: 'ម៉ោង ៩-១០', label: '9-10', classId: mSlots['9-10'] },
    { name: 'ម៉ោង ១០-១១', label: '10-11', classId: mSlots['10-11'] },
    { name: 'ម៉ោង ១១-១២', label: '11-12', classId: mSlots['11-12'] }
  ];

  const aPeriods = [
    { name: 'ម៉ោង ១-២', label: '1-2', classId: aSlots['1-2'] },
    { name: 'ម៉ោង ២-៣', label: '2-3', classId: aSlots['2-3'] },
    { name: 'ម៉ោង ៣-៤', label: '3-4', classId: aSlots['3-4'] },
    { name: 'ម៉ោង ៤-៥', label: '4-5', classId: aSlots['4-5'] }
  ];

  const totalTeaching = Object.keys(mSlots).length + Object.keys(aSlots).length;

  return `
    <div class="space-y-4">
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs font-bold text-blue-700 uppercase">ទិដ្ឋភាពប្រចាំថ្ងៃ (Daily View)</span>
          <h4 class="text-lg font-black text-blue-950 mt-0.5">ថ្ងៃ${dayName}</h4>
        </div>
        <div class="text-right">
          <span class="px-3 py-1 bg-blue-600 text-white font-bold rounded-full text-xs shadow-sm">
            ${totalTeaching > 0 ? `មានបង្រៀន ${totalTeaching} ម៉ោង` : '🌴 ទំនេរ (គ្មានម៉ោង)'}
          </span>
        </div>
      </div>

      <!-- Morning Periods -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
        <div class="text-xs font-bold text-blue-700 flex items-center gap-1.5 pb-2 border-b">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          ពេលព្រឹក (៧:០០ - ១២:០០)
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${mPeriods.map(p => `
            <div class="p-3 rounded-lg border flex items-center justify-between ${p.classId ? 'bg-blue-50/70 border-blue-300' : 'bg-gray-50 border-gray-200 opacity-60'}">
              <span class="text-xs font-bold ${p.classId ? 'text-blue-900' : 'text-gray-500'}">${p.name}</span>
              ${p.classId ? `
                <span class="px-3 py-1 bg-blue-600 text-white font-extrabold text-xs rounded-md shadow-sm">
                  ថ្នាក់ ${p.classId}
                </span>
              ` : `
                <span class="text-xs text-gray-400 font-medium">ទំនេរ</span>
              `}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Afternoon Periods -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
        <div class="text-xs font-bold text-amber-700 flex items-center gap-1.5 pb-2 border-b">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          ពេលរសៀល (១៣:០០ - ១៧:០០)
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${aPeriods.map(p => {
            const isLabor = dayName === 'ព្រហស្បតិ៍';
            return `
              <div class="p-3 rounded-lg border flex items-center justify-between ${
                isLabor ? 'bg-orange-50 border-orange-200' :
                p.classId ? 'bg-amber-50/70 border-amber-300' : 'bg-gray-50 border-gray-200 opacity-60'
              }">
                <span class="text-xs font-bold ${p.classId ? 'text-amber-900' : 'text-gray-500'}">${p.name}</span>
                ${isLabor ? `
                  <span class="px-2.5 py-0.5 bg-orange-100 text-orange-800 font-bold text-xs rounded">ពលកម្ម</span>
                ` : p.classId ? `
                  <span class="px-3 py-1 bg-amber-600 text-white font-extrabold text-xs rounded-md shadow-sm">
                    ថ្នាក់ ${p.classId}
                  </span>
                ` : `
                  <span class="text-xs text-gray-400 font-medium">ទំនេរ</span>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateClassDailyCardsHTML(classId, dayName) {
  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const dayIdx = days.indexOf(dayName);
  if (dayIdx === -1) return '';

  const mSlots = appState.data.morning_schedule[classId] || [];
  const aSlots = appState.data.afternoon_schedule[classId] || [];
  const teachers = appState.data.teachers || {};

  const mPeriods = [
    { name: 'ម៉ោង ៧-៨', code: mSlots[dayIdx * 4] },
    { name: 'ម៉ោង ៨-៩', code: mSlots[dayIdx * 4 + 1] },
    { name: 'ម៉ោង ៩-១០', code: mSlots[dayIdx * 4 + 2] },
    { name: 'ម៉ោង ១០-១១', code: mSlots[dayIdx * 4 + 3] }
  ];

  const aPeriods = [
    { name: 'ម៉ោង ១-២', code: aSlots[dayIdx * 4] },
    { name: 'ម៉ោង ២-៣', code: aSlots[dayIdx * 4 + 1] },
    { name: 'ម៉ោង ៣-៤', code: aSlots[dayIdx * 4 + 2] },
    { name: 'ម៉ោង ៤-៥', code: aSlots[dayIdx * 4 + 3] }
  ];

  return `
    <div class="space-y-4">
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs font-bold text-blue-700 uppercase">កាលវិភាគថ្នាក់ ${classId}</span>
          <h4 class="text-lg font-black text-blue-950 mt-0.5">ថ្ងៃ${dayName}</h4>
        </div>
        <button onclick="shareClassScheduleTelegram('${classId}')" class="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1">
          <span>✈️</span> Telegram
        </button>
      </div>

      <!-- Morning Periods -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
        <div class="text-xs font-bold text-blue-700 flex items-center gap-1.5 pb-2 border-b">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          ពេលព្រឹក (៧:០០ - ១២:០០)
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${mPeriods.map(p => {
            const t = p.code && teachers[p.code] ? teachers[p.code] : null;
            return `
              <div class="p-3 rounded-lg border flex items-center justify-between ${p.code ? 'bg-blue-50/70 border-blue-300' : 'bg-gray-50 border-gray-200 opacity-60'}">
                <span class="text-xs font-bold ${p.code ? 'text-blue-900' : 'text-gray-500'}">${p.name}</span>
                ${p.code ? `
                  <div class="text-right">
                    <span class="inline-block px-2.5 py-0.5 font-extrabold text-xs rounded" style="background-color: ${t ? t.subject_color : '#e2e8f0'}; color: ${t ? t.subject_text_color : '#1e293b'}">
                      ${t ? t.subject_name : p.code}
                    </span>
                    <div class="text-[10px] text-gray-500 mt-0.5">${t ? t.name : p.code} (${p.code})</div>
                  </div>
                ` : `
                  <span class="text-xs text-gray-400 font-medium">គ្មានម៉ោង</span>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Afternoon Periods -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
        <div class="text-xs font-bold text-amber-700 flex items-center gap-1.5 pb-2 border-b">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          ពេលរសៀល (១៣:០០ - ១៧:០០)
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${aPeriods.map(p => {
            const isLabor = p.code === 'ពលកម្ម' || (dayName === 'ព្រហស្បតិ៍' && (!p.code || p.code === 'ពលកម្ម'));
            const t = p.code && teachers[p.code] ? teachers[p.code] : null;
            return `
              <div class="p-3 rounded-lg border flex items-center justify-between ${
                isLabor ? 'bg-orange-50 border-orange-200' :
                p.code ? 'bg-amber-50/70 border-amber-300' : 'bg-gray-50 border-gray-200 opacity-60'
              }">
                <span class="text-xs font-bold ${p.code ? 'text-amber-900' : 'text-gray-500'}">${p.name}</span>
                ${isLabor ? `
                  <span class="px-2.5 py-0.5 bg-orange-100 text-orange-800 font-bold text-xs rounded">ពលកម្ម</span>
                ` : p.code ? `
                  <div class="text-right">
                    <span class="inline-block px-2.5 py-0.5 font-extrabold text-xs rounded" style="background-color: ${t ? t.subject_color : '#fed7aa'}; color: ${t ? t.subject_text_color : '#7c2d12'}">
                      ${t ? t.subject_name : p.code}
                    </span>
                    <div class="text-[10px] text-gray-500 mt-0.5">${t ? t.name : p.code} (${p.code})</div>
                  </div>
                ` : `
                  <span class="text-xs text-gray-400 font-medium">គ្មានម៉ោង</span>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateTeacherGridHTML(teacher, shift) {
  const timeSlots = appState.data.time_slots[shift];
  const slots = shift === 'morning' ? teacher.morning_slots : teacher.afternoon_slots;

  let maxPeriods = 0;
  timeSlots.forEach(d => {
    if (d.periods.length > maxPeriods) maxPeriods = d.periods.length;
  });

  return `
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full text-xs text-center border-collapse">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="border border-gray-300 py-2 px-3 w-24">ម៉ោង \\ ថ្ងៃ</th>
            ${timeSlots.map(d => `
              <th class="border border-gray-300 py-2 px-3 font-bold text-sm bg-blue-50 text-blue-900">${d.day}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxPeriods }).map((_, pIdx) => {
            const periodLabel = shift === 'morning'
              ? (['7-8', '8-9', '9-10', '10-11', '11-12'][pIdx] || '')
              : (['1-2', '2-3', '3-4', '4-5'][pIdx] || '');

            return `
              <tr class="hover:bg-gray-50">
                <td class="border border-gray-300 py-2.5 px-2 font-bold bg-gray-50 text-gray-600">${periodLabel}</td>
                ${timeSlots.map(d => {
                  const pName = d.periods[pIdx];
                  if (!pName) {
                    return `<td class="border border-gray-300 bg-gray-100 text-gray-300">--</td>`;
                  }
                  if (shift === 'afternoon' && d.day_key === 'Thu') {
                    return `<td class="border border-gray-300 bg-amber-50 text-amber-700 text-xs font-semibold">ពលកម្ម</td>`;
                  }
                  const classId = slots && slots[d.day] ? slots[d.day][pName] : null;
                  if (classId) {
                    return `
                      <td class="border border-gray-300 py-2.5 px-2">
                        <span class="inline-block px-3 py-1 bg-blue-600 text-white font-bold rounded-md shadow-sm text-xs">
                          ថ្នាក់ ${classId}
                        </span>
                      </td>
                    `;
                  }
                  return `<td class="border border-gray-300 py-2.5 px-2 text-gray-300">--</td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function selectTeacher(code) {
  appState.selectedTeacherCode = code;
  renderActiveTab();
}

function setTeacherSubjectFilter(filter) {
  appState.teacherSubjectFilter = filter;
  renderActiveTab();
}

// -------------------------------------------------------------
// TAB 2: CLASSES VIEW & HOMEROOM EDIT BUTTON
// -------------------------------------------------------------
function renderClassesView(container) {
  const classes = appState.data.classes;
  const activeId = appState.selectedClassId;
  const activeClass = classes.find(c => c.id === activeId) || classes[0];

  const morningSlots = appState.data.morning_schedule[activeId] || [];
  const afternoonSlots = appState.data.afternoon_schedule[activeId] || [];
  const teachers = appState.data.teachers;

  const classTeachers = {};
  [...morningSlots, ...afternoonSlots].forEach(code => {
    if (code && code !== 'ពលកម្ម') {
      if (!classTeachers[code]) {
        classTeachers[code] = { count: 0, teacher: teachers[code] };
      }
      classTeachers[code].count += 1;
    }
  });

  const totalClassHours = Object.values(classTeachers).reduce((a, b) => a + b.count, 0);

  container.innerHTML = `
    <div class="space-y-5">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div class="text-xs text-gray-500 font-bold mb-2">ជ្រើសរើសថ្នាក់រៀន ៖</div>
        <div class="flex flex-wrap gap-2">
          ${classes.map(c => `
            <button
              onclick="selectClass('${c.id}')"
              class="px-3 py-1.5 text-sm rounded-lg font-bold transition border ${c.id === activeId ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}"
            >
              ${c.id}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Class Header Banner with Homeroom Edit Button -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 rounded-xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-sm shrink-0">
            ${activeClass.id}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-bold text-gray-900">កាលវិភាគថ្នាក់ ${activeClass.id} (${activeClass.level})</h2>
              <span class="px-2.5 py-0.5 text-xs bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200">
                ថ្នាក់ទី ${activeClass.grade}
              </span>
            </div>
            <div class="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1.5">
                👨‍🏫 នាមគ្រូបន្ទុកថ្នាក់ ៖
                <strong class="text-blue-900 font-bold text-sm">${activeClass.homeroom}</strong>
                ${appState.userRole === 'admin' ? `
                  <button
                    onclick="openEditHomeroomModal('${activeClass.id}')"
                    class="ml-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded border border-amber-300 transition"
                  >
                    ✏️ កែនាម
                  </button>
                ` : ''}
              </span>
              <span>•</span>
              <span>ម៉ោងសិក្សាសរុប ៖ <strong>${totalClassHours} ម៉ោង/សប្ដាហ៍</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            onclick="shareClassScheduleTelegram('${activeClass.id}')"
            class="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
            title="ផ្ញើកាលវិភាគថ្នាក់ទៅកាន់ Telegram"
          >
            <span>✈️</span> Telegram
          </button>
          <button
            onclick="printSingleClass('${activeClass.id}')"
            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            🖨️ បោះពុម្ព
          </button>
          ${appState.userRole === 'admin' ? `
            <button
              onclick="openEditHomeroomModal('${activeClass.id}')"
              class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5"
            >
              ✏️ កែនាមគ្រូ
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Day Filter Bar -->
      <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
          <span class="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">📅 ជ្រើសរើសថ្ងៃ ៖</span>
          <button onclick="setDayFilter('ALL')" class="px-3 py-1 rounded-full border transition ${appState.selectedDay === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">ទាំងអស់</button>
          <button onclick="setDayFilter('TODAY')" class="px-3 py-1 rounded-full border transition ${appState.selectedDay === 'TODAY' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'}">⚡ ថ្ងៃនេះ</button>
          ${['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'].map(d => `
            <button onclick="setDayFilter('${d}')" class="px-2.5 py-1 rounded-full border transition ${appState.selectedDay === d ? 'bg-blue-600 text-white font-bold' : 'bg-white text-gray-600 hover:bg-gray-100'}">${d}</button>
          `).join('')}
        </div>
        <div class="text-xs text-slate-500 font-semibold">
          ${appState.selectedDay === 'ALL' ? 'ទិដ្ឋភាពពេញសប្តាហ៍' : `ទិដ្ឋភាពថ្ងៃ${appState.selectedDay}`}
        </div>
      </div>

      ${appState.selectedDay !== 'ALL' ? `
        ${generateClassDailyCardsHTML(activeClass.id, appState.selectedDay)}
      ` : `
        <!-- Class Morning Table -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-blue-900 flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-blue-600"></span>
              កាលវិភាគពេលព្រឹក (Morning) - ថ្នាក់ ${activeClass.id}
            </h3>
            <span class="text-xs text-gray-500">ម៉ោង ៧:០០ - ១២:០០</span>
          </div>
          ${generateClassShiftTable(activeClass.id, 'morning')}
        </div>

        <!-- Class Afternoon Table -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              កាលវិភាគពេលរសៀល (Afternoon) - ថ្នាក់ ${activeClass.id}
            </h3>
            <span class="text-xs text-gray-500">ម៉ោង ១៣:០០ - ១៧:០០</span>
          </div>
          ${generateClassShiftTable(activeClass.id, 'afternoon')}
        </div>
      `}

      <!-- Teachers List for this Class -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h3 class="text-sm font-bold text-gray-800 mb-3">បញ្ជីគ្រូបង្រៀនប្រចាំថ្នាក់ ${activeClass.id} ៖</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          ${Object.keys(classTeachers).map(code => {
            const item = classTeachers[code];
            const t = item.teacher;
            return `
              <div class="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded font-bold text-xs flex items-center justify-center" style="background-color: ${t.subject_color}; color: ${t.subject_text_color}; border: 1px solid ${t.subject_border}">
                    ${t.code}
                  </span>
                  <div>
                    <div class="text-xs font-bold text-gray-900">${t.name}</div>
                    <div class="text-[11px] text-gray-500">${t.subject_name}</div>
                  </div>
                </div>
                <span class="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  ${item.count} ម៉ោង
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateClassShiftTable(classId, shift) {
  const timeSlots = appState.data.time_slots[shift];
  const slots = shift === 'morning'
    ? appState.data.morning_schedule[classId]
    : appState.data.afternoon_schedule[classId];
  const teachers = appState.data.teachers;

  let maxPeriods = 0;
  timeSlots.forEach(d => {
    if (d.periods.length > maxPeriods) maxPeriods = d.periods.length;
  });

  return `
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full text-xs text-center border-collapse">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="border border-gray-300 py-2 px-3 w-24">ម៉ោង \\ ថ្ងៃ</th>
            ${timeSlots.map(d => `
              <th class="border border-gray-300 py-2 px-3 font-bold text-sm bg-blue-50 text-blue-900">${d.day}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxPeriods }).map((_, pIdx) => {
            const periodLabel = shift === 'morning'
              ? (['7-8', '8-9', '9-10', '10-11', '11-12'][pIdx] || '')
              : (['1-2', '2-3', '3-4', '4-5'][pIdx] || '');

            return `
              <tr class="hover:bg-gray-50">
                <td class="border border-gray-300 py-3 px-2 font-bold bg-gray-50 text-gray-600">${periodLabel}</td>
                ${timeSlots.map(d => {
                  const pName = d.periods[pIdx];
                  if (!pName) {
                    return `<td class="border border-gray-300 bg-gray-100 text-gray-300">--</td>`;
                  }
                  if (shift === 'afternoon' && d.day_key === 'Thu') {
                    return `<td class="border border-gray-300 bg-amber-100 text-amber-800 font-bold text-xs py-2">ពលកម្ម</td>`;
                  }
                  let slotIndex = 0;
                  for (let di = 0; di < timeSlots.length; di++) {
                    if (timeSlots[di].day_key === d.day_key) {
                      slotIndex += pIdx;
                      break;
                    } else {
                      slotIndex += timeSlots[di].periods.length;
                    }
                  }

                  const code = slots[slotIndex];
                  if (code && code !== 'ពលកម្ម') {
                    const t = teachers[code];
                    return `
                      <td class="border border-gray-300 py-2 px-2" style="background-color: ${t ? t.subject_color : '#fff'}">
                        <div class="font-extrabold text-sm" style="color: ${t ? t.subject_text_color : '#000'}">${code}</div>
                        <div class="text-[10px] text-gray-600 truncate max-w-[90px] mx-auto">${t ? t.subject_short : ''} (${t ? t.name : ''})</div>
                      </td>
                    `;
                  }
                  return `<td class="border border-gray-300 py-2 px-2 text-gray-300">--</td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function selectClass(classId) {
  appState.selectedClassId = classId;
  renderActiveTab();
}

// -------------------------------------------------------------
// TAB 3: SUBJECT TEACHERS DIRECTORY (បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា)
// -------------------------------------------------------------
function renderSubjectTeachersView(container) {
  const teachers = appState.data.teachers;
  const subjects = appState.data.subjects;

  let list = Object.values(teachers);

  // Filter
  if (appState.directorySubjectFilter !== 'ALL') {
    list = list.filter(t => t.subject_key === appState.directorySubjectFilter);
  }

  if (appState.directorySearchQuery) {
    const q = appState.directorySearchQuery.toLowerCase();
    list = list.filter(t =>
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.subject_name.toLowerCase().includes(q) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.homeroom_class && t.homeroom_class.toLowerCase().includes(q))
    );
  }

  // Count stats
  const totalCount = Object.keys(teachers).length;
  const maleCount = Object.values(teachers).filter(t => (t.gender || 'ប្រុស') === 'ប្រុស').length;
  const femaleCount = Object.values(teachers).filter(t => (t.gender || '') === 'ស្រី').length;
  const hrCount = Object.values(teachers).filter(t => t.homeroom_class).length;

  container.innerHTML = `
    <div class="space-y-5">
      <!-- Top banner & actions -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-gray-900">បញ្ជីរាយនាមលោកគ្រូ-អ្នកគ្រូតាមមុខវិជ្ជា</h2>
            <span class="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
              ${totalCount} នាក់
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            គ្រប់គ្រងឈ្មោះពិត ភេទ មុខវិជ្ជាឯកទេស លេខទូរស័ព្ទ បន្ទុកថ្នាក់ និងបន្ទុកម៉ោងបង្រៀនរបស់គ្រូម្នាក់ៗ។
          </p>
        </div>

        <div class="flex items-center gap-2">
          ${appState.userRole === 'admin' ? `
            <button
              onclick="openAddSubjectTeacherModal()"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              ➕ បន្ថែមគ្រូមុខវិជ្ជាថ្មី
            </button>
          ` : `
            <button
              onclick="openRoleModal('admin')"
              class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 flex items-center gap-1"
            >
              🔒 ចូល Admin ដើម្បីបន្ថែមគ្រូ
            </button>
          `}
          <button
            onclick="printSubjectTeachersRoster()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            🖨️ បោះពុម្ពបញ្ជីឈ្មោះគ្រូ
          </button>
        </div>
      </div>

      <!-- Quick Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
          <div class="text-xs text-gray-500 font-semibold">សរុបគ្រូទាំងអស់</div>
          <div class="text-2xl font-black text-gray-900 mt-0.5">${totalCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
        <div class="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-sm text-center">
          <div class="text-xs text-blue-700 font-semibold">លោកគ្រូ (ប្រុស)</div>
          <div class="text-2xl font-black text-blue-900 mt-0.5">${maleCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
        <div class="bg-pink-50 p-3.5 rounded-xl border border-pink-200 shadow-sm text-center">
          <div class="text-xs text-pink-700 font-semibold">អ្នកគ្រូ (ស្រី)</div>
          <div class="text-2xl font-black text-pink-900 mt-0.5">${femaleCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
        <div class="bg-purple-50 p-3.5 rounded-xl border border-purple-200 shadow-sm text-center">
          <div class="text-xs text-purple-700 font-semibold">គ្រូបន្ទុកថ្នាក់</div>
          <div class="text-2xl font-black text-purple-900 mt-0.5">${hrCount} <span class="text-xs font-normal">ថ្នាក់</span></div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex-1 max-w-md">
            <input
              type="text"
              id="directory-search-input"
              value="${appState.directorySearchQuery}"
              placeholder="ស្វែងរកតាមឈ្មោះ កូដ មុខវិជ្ជា លេខទូរស័ព្ទ ឬថ្នាក់បន្ទុក..."
              class="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div class="text-xs text-gray-500">
            បង្ហាញលទ្ធផល ៖ <strong>${list.length}</strong> នាក់
          </div>
        </div>

        <!-- Subject pills -->
        <div class="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          <button
            onclick="setDirectorySubjectFilter('ALL')"
            class="px-2.5 py-1 text-xs rounded-full border transition ${appState.directorySubjectFilter === 'ALL' ? 'bg-blue-600 text-white font-bold border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}"
          >
            មុខវិជ្ជាទាំងអស់ (${totalCount})
          </button>
          ${Object.keys(subjects).map(k => `
            <button
              onclick="setDirectorySubjectFilter('${k}')"
              class="px-2.5 py-1 text-xs rounded-full border transition ${appState.directorySubjectFilter === k ? 'bg-blue-600 text-white font-bold border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}"
            >
              ${subjects[k].short}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Subject Teachers Table -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-gray-100 text-gray-700 border-b border-gray-200">
              <th class="py-2.5 px-3 text-center w-12">ល.រ</th>
              <th class="py-2.5 px-3 text-center w-16">កូដ</th>
              <th class="py-2.5 px-3">គោត្តនាម និងនាម</th>
              <th class="py-2.5 px-3 text-center w-16">ភេទ</th>
              <th class="py-2.5 px-3">មុខវិជ្ជាឯកទេស</th>
              <th class="py-2.5 px-3 text-center">ម៉ោងបង្រៀន</th>
              <th class="py-2.5 px-3 text-center">គ្រូបន្ទុកថ្នាក់</th>
              <th class="py-2.5 px-3">លេខទូរស័ព្ទ</th>
              <th class="py-2.5 px-3">កំណត់សម្គាល់</th>
              <th class="py-2.5 px-3 text-center w-36">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${list.map((t, idx) => `
              <tr class="hover:bg-gray-50 transition">
                <td class="py-2.5 px-3 text-center text-gray-400 font-semibold">${idx + 1}</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="inline-block px-2.5 py-1 rounded font-bold text-xs" style="background-color: ${t.subject_color}; color: ${t.subject_text_color}; border: 1px solid ${t.subject_border}">
                    ${t.code}
                  </span>
                </td>
                <td class="py-2.5 px-3 font-bold text-gray-900 text-sm">
                  ${t.name}
                  ${t.is_custom ? '<span class="ml-1 text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">បន្ថែមថ្មី</span>' : ''}
                </td>
                <td class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${t.gender === 'ស្រី' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}">
                    ${t.gender || 'ប្រុស'}
                  </span>
                </td>
                <td class="py-2.5 px-3 font-semibold text-gray-800">${t.subject_name}</td>
                <td class="py-2.5 px-3 text-center">
                  <span class="font-bold text-gray-900">${t.total_hours} ម៉ោង</span>
                  <div class="text-[10px] text-gray-500">(ព្រឹក: ${t.morning_hours}, រសៀល: ${t.afternoon_hours})</div>
                </td>
                <td class="py-2.5 px-3 text-center">
                  ${t.homeroom_class ? `
                    <span class="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-xs border border-purple-200">
                      ថ្នាក់ ${t.homeroom_class}
                    </span>
                  ` : '<span class="text-gray-300">--</span>'}
                </td>
                <td class="py-2.5 px-3 text-gray-700 font-medium">${t.phone || '<span class="text-gray-300">--</span>'}</td>
                <td class="py-2.5 px-3 text-gray-500 text-xs">${t.note || ''}</td>
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    ${(appState.userRole === 'admin' || (appState.userRole === 'teacher' && t.code === appState.currentTeacherCode)) ? `
                      <button
                        onclick="openEditTeacherModal('${t.code}')"
                        class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                        title="កែប្រែព័ត៌មាន"
                      >
                        ✏️ កែ
                      </button>
                    ` : ''}
                    <button
                      onclick="viewTeacherSchedule('${t.code}')"
                      class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition"
                      title="មើលកាលវិភាគ"
                    >
                      👁️ កាលវិភាគ
                    </button>
                    ${(t.is_custom && appState.userRole === 'admin') ? `
                      <button
                        onclick="deleteCustomTeacher('${t.code}')"
                        class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition"
                        title="លុបគ្រូនេះ"
                      >
                        🗑️
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const sInput = document.getElementById('directory-search-input');
  if (sInput) {
    sInput.addEventListener('input', (e) => {
      appState.directorySearchQuery = e.target.value;
      renderActiveTab();
      const el = document.getElementById('directory-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
}

function setDirectorySubjectFilter(f) {
  appState.directorySubjectFilter = f;
  renderActiveTab();
}

function viewTeacherSchedule(code) {
  appState.selectedTeacherCode = code;
  switchTab('teachers');
}

// -------------------------------------------------------------
// TAB 4: HOMEROOM TEACHERS MANAGER (គ្រប់គ្រងគ្រូបន្ទុកថ្នាក់)
// -------------------------------------------------------------
function renderHomeroomManagerView(container) {
  const classes = appState.data.classes;
  const teachers = appState.data.teachers;
  const isAdmin = appState.userRole === 'admin';

  // Extract list of all teachers for dropdown
  const teacherList = Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, 'km'));

  container.innerHTML = `
    <div class="space-y-5">
      ${!isAdmin ? `
        <div class="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap shadow-sm">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🔒</span>
            <div>
              <h4 class="font-bold text-sm text-amber-950">ផ្ទាំងនេះសម្រាប់តែអ្នកគ្រប់គ្រង (Admin)</h4>
              <p class="text-xs text-amber-800 mt-0.5">ដើម្បីកែនាមគ្រូបន្ទុកថ្នាក់ សូមបញ្ចូលលេខកូដសម្ងាត់ PIN របស់អ្នកគ្រប់គ្រង</p>
            </div>
          </div>
          <button
            onclick="openRoleModal('admin')"
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            🔑 ចូលជា Admin (PIN)
          </button>
        </div>
      ` : ''}

      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900">គ្រប់គ្រង និងកែនាមគ្រូបន្ទុកថ្នាក់ (Homeroom Teachers Manager)</h2>
          <p class="text-xs text-gray-500 mt-1">
            កែប្រែ ឬចាត់តាំងគ្រូបន្ទុកថ្នាក់សម្រាប់ថ្នាក់នីមួយៗ (១២A ដល់ ៧C)។ ឈ្មោះដែលបានកែប្រែ នឹងត្រូវធ្វើបច្ចុប្បន្នភាពលើកាលវិភាគរួម កាលវិភាគថ្នាក់ និងឯកសារបោះពុម្ពទាំងអស់។
          </p>
        </div>
        ${isAdmin ? `
          <button
            onclick="saveAllHomeroomTeachers()"
            class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            💾 រក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ទាំងអស់
          </button>
        ` : ''}
      </div>

      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-gray-100 text-gray-700 border-b border-gray-200">
              <th class="py-3 px-3 text-center w-14">ល.រ</th>
              <th class="py-3 px-3 text-center w-20">ថ្នាក់</th>
              <th class="py-3 px-3 w-32">កម្រិតសិក្សា</th>
              <th class="py-3 px-3 w-24 text-center">កម្រិតទី</th>
              <th class="py-3 px-3 w-72">នាមគ្រូបន្ទុកថ្នាក់បច្ចុប្បន្ន</th>
              <th class="py-3 px-3">ជ្រើសរើសពីបញ្ជីគ្រូមុខវិជ្ជា (Quick Select)</th>
              <th class="py-3 px-3 text-center w-28">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${classes.map((cls, idx) => `
              <tr class="hover:bg-gray-50">
                <td class="py-3 px-3 text-center text-gray-400 font-semibold">${idx + 1}</td>
                <td class="py-3 px-3 text-center">
                  <span class="inline-block px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-md shadow-sm">
                    ${cls.id}
                  </span>
                </td>
                <td class="py-3 px-3 font-semibold text-gray-700">${cls.level}</td>
                <td class="py-3 px-3 text-center font-bold text-gray-800">ទី ${cls.grade}</td>
                <td class="py-3 px-3">
                  <input
                    type="text"
                    id="hr-input-${cls.id}"
                    value="${cls.homeroom}"
                    ${isAdmin ? '' : 'disabled'}
                    class="w-full text-xs font-bold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${isAdmin ? 'bg-white' : 'bg-gray-100 text-gray-600 cursor-not-allowed'}"
                  />
                </td>
                <td class="py-3 px-3">
                  ${isAdmin ? `
                    <select
                      onchange="applyTeacherToHomeroomInput('${cls.id}', this.value)"
                      class="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                    >
                      <option value="">-- ជ្រើសរើសគ្រូពីបញ្ជី --</option>
                      ${teacherList.map(t => `
                        <option value="${t.name}">${t.name} (${t.code} - ${t.subject_short})</option>
                      `).join('')}
                    </select>
                  ` : `
                    <span class="text-xs text-gray-400">🔒 ជាប់សោរ</span>
                  `}
                </td>
                <td class="py-3 px-3 text-center">
                  ${isAdmin ? `
                    <button
                      onclick="saveSingleHomeroom('${cls.id}')"
                      class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-xs transition"
                    >
                      💾 រក្សាទុក
                    </button>
                  ` : `
                    <span class="text-xs text-gray-400">🔒</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function applyTeacherToHomeroomInput(classId, teacherName) {
  if (!teacherName) return;
  const input = document.getElementById(`hr-input-${classId}`);
  if (input) {
    input.value = teacherName;
  }
}

async function saveSingleHomeroom(classId) {
  const input = document.getElementById(`hr-input-${classId}`);
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    alert('សូមបញ្ចូលឈ្មោះគ្រូបន្ទុកថ្នាក់!');
    return;
  }

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: classId, homeroom: newName })
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(`✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ ${classId} ៖ ${newName}`);
      refreshData();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចរក្សាទុកបានទេ'));
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកទៅកាន់ Server ៖ ' + err.message);
  }
}

async function saveAllHomeroomTeachers() {
  const classes = appState.data.classes;
  const homeroomMap = {};

  classes.forEach(cls => {
    const input = document.getElementById(`hr-input-${cls.id}`);
    if (input) {
      homeroomMap[cls.id] = input.value.trim() || cls.homeroom;
    }
  });

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeroom_map: homeroomMap })
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast('✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ទាំង ១៧ ថ្នាក់ក្នុង Database រួចរាល់!');
      refreshData();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចរក្សាទុកបានទេ'));
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកទៅកាន់ Server ៖ ' + err.message);
  }
}

// -------------------------------------------------------------
// TAB 5: MASTER SCHEDULE VIEW
// -------------------------------------------------------------
function renderMasterView(container) {
  const isMorning = appState.masterShift === 'morning';
  const timeSlots = isMorning ? appState.data.time_slots.morning : appState.data.time_slots.afternoon;
  const scheduleData = isMorning ? appState.data.morning_schedule : appState.data.afternoon_schedule;
  const classes = appState.data.classes;
  const teachers = appState.data.teachers;
  const subjects = appState.data.subjects;
  const highlight = appState.masterHighlightCode;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <button
            onclick="setMasterShift('morning')"
            class="px-4 py-2 rounded-lg text-sm font-bold transition ${isMorning ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            ☀️ កាលវិភាគពេលព្រឹក (Morning)
          </button>
          <button
            onclick="setMasterShift('afternoon')"
            class="px-4 py-2 rounded-lg text-sm font-bold transition ${!isMorning ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            ⛅ កាលវិភាគពេលរសៀល (Afternoon)
          </button>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-gray-600">ស្វែងរក/ហាយឡាយគ្រូ ៖</label>
          <select
            onchange="setMasterHighlight(this.value)"
            class="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">-- បង្ហាញទាំងអស់ --</option>
            ${Object.keys(teachers).sort().map(code => {
              const t = teachers[code];
              return `<option value="${code}" ${highlight === code ? 'selected' : ''}>${code} - ${t.name} (${t.subject_short})</option>`;
            }).join('')}
          </select>
          ${highlight ? `
            <button onclick="setMasterHighlight('')" class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold">
              ✕ លុបការហាយឡាយ
            </button>
          ` : ''}
        </div>
      </div>

      <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-2 text-xs">
        <span class="font-bold text-gray-600 mr-1">កំណត់សម្គាល់មុខវិជ្ជា ៖</span>
        ${Object.keys(subjects).map(k => `
          <span class="px-2 py-0.5 rounded font-semibold text-[11px]" style="background-color: ${subjects[k].color}; color: ${subjects[k].text_color}; border: 1px solid ${subjects[k].border}">
            ${k}: ${subjects[k].short}
          </span>
        `).join('')}
      </div>

      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="timetable-table text-xs">
          <thead>
            <tr>
              <th rowspan="2" class="bg-blue-800 text-white font-bold py-2 px-3 sticky left-0 z-20">ថ្នាក់</th>
              ${timeSlots.map((d, di) => `
                <th colspan="${d.periods.length}" class="bg-blue-600 text-white font-bold py-2 ${di > 0 ? 'day-sep-left' : ''}">
                  ${d.day}
                </th>
              `).join('')}
              <th rowspan="2" class="bg-blue-800 text-white font-bold py-2 px-4 sticky right-0 z-20">នាមគ្រូបន្ទុកថ្នាក់</th>
            </tr>
            <tr>
              ${timeSlots.map((d, di) =>
                d.periods.map((p, pi) => `
                  <th class="bg-indigo-50 text-indigo-900 font-semibold py-1 px-1.5 text-[11px] ${pi === 0 && di > 0 ? 'day-sep-left' : ''}">
                    ${p}
                  </th>
                `).join('')
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${classes.map((cls, rowIdx) => {
              const slots = scheduleData[cls.id] || [];
              let slotCounter = 0;
              return `
                <tr class="hover:bg-blue-50/50">
                  <td class="font-bold text-blue-900 bg-gray-100 py-1.5 px-2 sticky left-0 z-10 border-r border-gray-300">
                    ${cls.id}
                  </td>
                  ${timeSlots.map((d, di) => {
                    return d.periods.map((p, pi) => {
                      const code = slots[slotCounter] || '';
                      slotCounter++;

                      const isDaySep = pi === 0 && di > 0;
                      if (!isMorning && d.day_key === 'Thu') {
                        if (rowIdx === 0 && pi === 0) {
                          return `<td class="labor-cell ${isDaySep ? 'day-sep-left' : ''}" title="ពលកម្ម">ពលកម្ម</td>`;
                        } else {
                          return `<td class="labor-cell ${isDaySep ? 'day-sep-left' : ''}"></td>`;
                        }
                      }

                      if (!code) {
                        return `<td class="${isDaySep ? 'day-sep-left' : ''} bg-gray-50/30"></td>`;
                      }

                      const t = teachers[code];
                      const isHighlighted = highlight && highlight === code;
                      const isDimmed = highlight && highlight !== code;

                      return `
                        <td
                          onclick="setMasterHighlight('${code}')"
                          class="cell-slot ${isDaySep ? 'day-sep-left' : ''} ${isHighlighted ? 'cell-highlighted' : ''} ${isDimmed ? 'cell-dimmed' : ''}"
                          style="background-color: ${t ? t.subject_color : '#fff'}; color: ${t ? t.subject_text_color : '#000'}"
                          title="${code} - ${t ? t.name : ''} (${t ? t.subject_name : ''}) | ចុចដើម្បីហាយឡាយ"
                        >
                          ${code}
                        </td>
                      `;
                    }).join('');
                  }).join('')}
                  <td class="text-left font-medium text-gray-800 bg-gray-50 py-1.5 px-3 sticky right-0 z-10 border-l border-gray-300 whitespace-nowrap text-xs">
                    ${cls.homeroom}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setMasterShift(shift) {
  appState.masterShift = shift;
  renderActiveTab();
}

function setMasterHighlight(code) {
  appState.masterHighlightCode = code;
  renderActiveTab();
}

// -------------------------------------------------------------
// TAB 6: WORKLOAD MATRIX
// -------------------------------------------------------------
function renderWorkloadView(container) {
  const teachers = appState.data.teachers;

  let list = Object.values(teachers);

  if (appState.workloadSearch) {
    const q = appState.workloadSearch.toLowerCase();
    list = list.filter(t =>
      t.code.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.subject_name.toLowerCase().includes(q) ||
      t.classes.some(cls => cls.toLowerCase().includes(q))
    );
  }

  if (appState.workloadFilter !== 'ALL') {
    if (appState.workloadFilter === 'FULL') {
      list = list.filter(t => t.total_hours >= 18);
    } else if (appState.workloadFilter === 'NORMAL') {
      list = list.filter(t => t.total_hours >= 14 && t.total_hours < 18);
    } else if (appState.workloadFilter === 'LIGHT') {
      list = list.filter(t => t.total_hours < 14);
    }
  }

  const fullCount = Object.values(teachers).filter(t => t.total_hours >= 18).length;
  const normalCount = Object.values(teachers).filter(t => t.total_hours >= 14 && t.total_hours < 18).length;
  const lightCount = Object.values(teachers).filter(t => t.total_hours < 14).length;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div class="text-xs text-gray-500 font-semibold">សរុបគ្រូទាំងអស់</div>
          <div class="text-2xl font-black text-gray-900 mt-1">${Object.keys(teachers).length} <span class="text-xs font-normal">នាក់/កូដ</span></div>
        </div>
        <div class="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm cursor-pointer hover:bg-green-100 transition" onclick="setWorkloadFilter('FULL')">
          <div class="text-xs text-green-700 font-semibold">ពេញបន្ទុក (≥១៨ ម៉ោង)</div>
          <div class="text-2xl font-black text-green-900 mt-1">${fullCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
        <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm cursor-pointer hover:bg-blue-100 transition" onclick="setWorkloadFilter('NORMAL')">
          <div class="text-xs text-blue-700 font-semibold">បន្ទុកមធ្យម (១៤ - ១៧ ម៉ោង)</div>
          <div class="text-2xl font-black text-blue-900 mt-1">${normalCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
        <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100 transition" onclick="setWorkloadFilter('LIGHT')">
          <div class="text-xs text-amber-700 font-semibold">បន្ទុកស្រាល (&lt;១៤ ម៉ោង)</div>
          <div class="text-2xl font-black text-amber-900 mt-1">${lightCount} <span class="text-xs font-normal">នាក់</span></div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            id="workload-search-input"
            value="${appState.workloadSearch}"
            placeholder="ស្វែងរកតាមកូដ ឈ្មោះ មុខវិជ្ជា ឬថ្នាក់..."
            class="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-gray-500 font-bold">ច្រោះតាមបន្ទុក ៖</span>
          <button onclick="setWorkloadFilter('ALL')" class="px-2.5 py-1 rounded border ${appState.workloadFilter === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-700'}">ទាំងអស់</button>
          <button onclick="setWorkloadFilter('FULL')" class="px-2.5 py-1 rounded border ${appState.workloadFilter === 'FULL' ? 'bg-green-600 text-white font-bold' : 'bg-gray-100 text-gray-700'}">ពេញបន្ទុក</button>
          <button onclick="setWorkloadFilter('NORMAL')" class="px-2.5 py-1 rounded border ${appState.workloadFilter === 'NORMAL' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-700'}">មធ្យម</button>
          <button onclick="setWorkloadFilter('LIGHT')" class="px-2.5 py-1 rounded border ${appState.workloadFilter === 'LIGHT' ? 'bg-amber-600 text-white font-bold' : 'bg-gray-100 text-gray-700'}">ស្រាល</button>
        </div>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-gray-100 text-gray-700 border-b border-gray-200">
              <th class="py-2.5 px-3 text-center w-12">ល.រ</th>
              <th class="py-2.5 px-3 text-center w-16">កូដគ្រូ</th>
              <th class="py-2.5 px-3">មុខវិជ្ជា</th>
              <th class="py-2.5 px-3">ឈ្មោះគ្រូបង្រៀន</th>
              <th class="py-2.5 px-3 text-center">ព្រឹក</th>
              <th class="py-2.5 px-3 text-center">រសៀល</th>
              <th class="py-2.5 px-3 text-center">សរុបម៉ោង</th>
              <th class="py-2.5 px-3">ថ្នាក់ដែលត្រូវបង្រៀន</th>
              <th class="py-2.5 px-3">បន្ទុកធៀបស្តង់ដារ (១៨h)</th>
              <th class="py-2.5 px-3 text-center">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${list.map((t, idx) => {
              const pct = Math.min(100, Math.round((t.total_hours / 18) * 100));
              let barColor = 'bg-green-500';
              let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">ពេញបន្ទុក</span>';
              if (t.total_hours < 14) {
                barColor = 'bg-amber-500';
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">ស្រាល</span>';
              } else if (t.total_hours < 18) {
                barColor = 'bg-blue-500';
                statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">មធ្យម</span>';
              }

              return `
                <tr class="hover:bg-gray-50 transition">
                  <td class="py-2 px-3 text-center font-semibold text-gray-400">${idx + 1}</td>
                  <td class="py-2 px-3 text-center">
                    <span class="inline-block px-2 py-1 rounded font-bold text-xs" style="background-color: ${t.subject_color}; color: ${t.subject_text_color}; border: 1px solid ${t.subject_border}">
                      ${t.code}
                    </span>
                  </td>
                  <td class="py-2 px-3 font-semibold text-gray-800">${t.subject_name}</td>
                  <td class="py-2 px-3 font-bold text-gray-900">${t.name}</td>
                  <td class="py-2 px-3 text-center font-semibold text-indigo-700">${t.morning_hours}</td>
                  <td class="py-2 px-3 text-center font-semibold text-amber-700">${t.afternoon_hours}</td>
                  <td class="py-2 px-3 text-center font-black text-gray-900 text-sm">${t.total_hours}</td>
                  <td class="py-2 px-3 text-gray-700 font-medium">${t.classes.join(', ')}</td>
                  <td class="py-2 px-3 w-48">
                    <div class="flex items-center gap-2">
                      <div class="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div class="${barColor} h-2 rounded-full" style="width: ${pct}%"></div>
                      </div>
                      ${statusBadge}
                    </div>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <button
                      onclick="viewTeacherFromWorkload('${t.code}')"
                      class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-xs transition"
                    >
                      មើលកាលវិភាគ
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const sInput = document.getElementById('workload-search-input');
  if (sInput) {
    sInput.addEventListener('input', (e) => {
      appState.workloadSearch = e.target.value;
      renderActiveTab();
      const el = document.getElementById('workload-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
}

function setWorkloadFilter(f) {
  appState.workloadFilter = f;
  renderActiveTab();
}

function viewTeacherFromWorkload(code) {
  appState.selectedTeacherCode = code;
  switchTab('teachers');
}

// -------------------------------------------------------------
// TAB 7: PRINT & EXPORT HUB
// -------------------------------------------------------------
function renderPrintHubView(container) {
  const teachers = appState.data.teachers;
  const classes = appState.data.classes;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h2 class="text-base font-bold text-gray-900">មជ្ឈមណ្ឌលបោះពុម្ព និងទាញយកឯកសារ (Print & Export Hub)</h2>
        <p class="text-xs text-gray-500 mt-1">
          រៀបចំទម្រង់បោះពុម្ពបណ្ណកាលវិភាគគ្រូបង្រៀន កាលវិភាគប្រចាំថ្នាក់ បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា និងទាញយកជាឯកសារ Excel ផ្លូវការ។
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <!-- Excel Export -->
          <div class="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                📊
              </div>
              <h3 class="font-bold text-gray-900 text-sm">ទាញយកឯកសារ Excel (.xlsx)</h3>
              <p class="text-xs text-gray-600 mt-1">
                ឯកសារ Excel ៤ សន្លឹក៖ តារាងព្រឹក, តារាងរសៀល, បន្ទុកម៉ោង និងបញ្ជីឈ្មោះគ្រូមុខវិជ្ជា។
              </p>
            </div>
            <a
              href="/api/export-excel"
              class="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg text-center shadow-sm transition block"
            >
              📥 ទាញយកឯកសារ Excel
            </a>
          </div>

          <!-- Print All Teacher Cards -->
          <div class="p-5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                👨‍🏫
              </div>
              <h3 class="font-bold text-gray-900 text-sm">បោះពុម្ពបណ្ណគ្រូទាំងអស់</h3>
              <p class="text-xs text-gray-600 mt-1">
                បោះពុម្ពបណ្ណកាលវិភាគបុគ្គលរបស់គ្រូទាំងអស់ (${Object.keys(teachers).length} នាក់) លើក្រដាស A4 មានក្បាលលិខិតក្រសួង។
              </p>
            </div>
            <button
              onclick="printAllTeacherCards()"
              class="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              🖨️ បោះពុម្ពបណ្ណគ្រូទាំងអស់
            </button>
          </div>

          <!-- Print All Class Schedules -->
          <div class="p-5 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                🏫
              </div>
              <h3 class="font-bold text-gray-900 text-sm">បោះពុម្ពកាលវិភាគថ្នាក់ទាំងអស់</h3>
              <p class="text-xs text-gray-600 mt-1">
                បោះពុម្ពកាលវិភាគប្រចាំថ្នាក់ទាំង ១៧ ថ្នាក់ (១២A - ៧C) រួមទាំងឈ្មោះគ្រូបន្ទុកថ្នាក់ សម្រាប់បិទតាមបន្ទប់។
              </p>
            </div>
            <button
              onclick="printAllClassSchedules()"
              class="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              🖨️ បោះពុម្ពកាលវិភាគថ្នាក់
            </button>
          </div>

          <!-- Print Subject Teachers Roster -->
          <div class="p-5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                👥
              </div>
              <h3 class="font-bold text-gray-900 text-sm">បោះពុម្ពបញ្ជីឈ្មោះគ្រូមុខវិជ្ជា</h3>
              <p class="text-xs text-gray-600 mt-1">
                បោះពុម្ពតារាងរាយនាមលោកគ្រូ-អ្នកគ្រូតាមមុខវិជ្ជា ភេទ ម៉ោងបង្រៀន និងថ្នាក់បន្ទុក។
              </p>
            </div>
            <button
              onclick="printSubjectTeachersRoster()"
              class="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              🖨️ បោះពុម្ពបញ្ជីឈ្មោះគ្រូ
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// MODALS: HOMEROOM EDIT, ADD TEACHER, EDIT TEACHER
// -------------------------------------------------------------
function openEditHomeroomModal(classId) {
  const cls = appState.data.classes.find(c => c.id === classId);
  if (!cls) return;

  const teachers = appState.data.teachers;
  const teacherList = Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, 'km'));

  const modal = document.getElementById('edit-modal');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex justify-between items-center border-b pb-3">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">${cls.id}</span>
            <h3 class="font-bold text-base text-gray-900">កែប្រែនាមគ្រូបន្ទុកថ្នាក់ ${cls.id}</h3>
          </div>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">ថ្នាក់រៀន ៖</label>
            <div class="font-semibold text-gray-800 bg-gray-100 p-2 rounded">ថ្នាក់ ${cls.id} (${cls.level} ទី ${cls.grade})</div>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">ជ្រើសរើសពីបញ្ជីគ្រូមុខវិជ្ជា ៖</label>
            <select
              id="modal-hr-select"
              onchange="document.getElementById('modal-hr-name').value = this.value"
              class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- ជ្រើសរើសគ្រូពីបញ្ជី --</option>
              ${teacherList.map(t => `
                <option value="${t.name}" ${t.name === cls.homeroom ? 'selected' : ''}>${t.name} (${t.code} - ${t.subject_short})</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">ឬ វាយបញ្ចូលឈ្មោះគ្រូបន្ទុកថ្នាក់ដោយផ្ទាល់ ៖</label>
            <input
              type="text"
              id="modal-hr-name"
              value="${cls.homeroom}"
              placeholder="វាយបញ្ចូលឈ្មោះ..."
              class="w-full text-sm font-bold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">បោះបង់</button>
          <button onclick="saveHomeroomModal('${cls.id}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">រក្សាទុក</button>
        </div>
      </div>
    </div>
  `;
}

async function saveHomeroomModal(classId) {
  const nameEl = document.getElementById('modal-hr-name');
  const newName = nameEl ? nameEl.value.trim() : '';
  if (!newName) {
    alert('សូមបញ្ចូលឈ្មោះគ្រូបន្ទុកថ្នាក់!');
    return;
  }

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: classId, homeroom: newName })
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(`✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ ${classId} ៖ ${newName}`);
      closeModal();
      refreshData();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចរក្សាទុកបានទេ'));
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកទៅកាន់ Server ៖ ' + err.message);
  }
}

function openAddSubjectTeacherModal() {
  const subjects = appState.data.subjects;
  const classes = appState.data.classes;

  const modal = document.getElementById('edit-modal');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex justify-between items-center border-b pb-3">
          <h3 class="font-bold text-base text-gray-900">➕ បន្ថែមគ្រូមុខវិជ្ជាថ្មី</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">មុខវិជ្ជាឯកទេស ៖</label>
              <select
                id="add-teacher-subject"
                class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                ${Object.keys(subjects).map(k => `
                  <option value="${k}">${subjects[k].name} (${k})</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">កូដគ្រូ (ឧ. K6, M5) ៖</label>
              <input
                type="text"
                id="add-teacher-code"
                placeholder="ឧ. K6"
                class="w-full text-xs uppercase font-bold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">គោត្តនាម និងនាម ៖</label>
            <input
              type="text"
              id="add-teacher-name"
              placeholder="វាយឈ្មោះគ្រូបង្រៀន..."
              class="w-full text-sm font-bold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">ភេទ ៖</label>
              <select
                id="add-teacher-gender"
                class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ប្រុស">ប្រុស (លោកគ្រូ)</option>
                <option value="ស្រី">ស្រី (អ្នកគ្រូ)</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ ៖</label>
              <input
                type="text"
                id="add-teacher-phone"
                placeholder="012 345 678"
                class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">គ្រូបន្ទុកថ្នាក់ (បើមាន) ៖</label>
            <select
              id="add-teacher-homeroom"
              class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- គ្មាន --</option>
              ${classes.map(c => `
                <option value="${c.id}">ថ្នាក់ ${c.id}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-1">កំណត់សម្គាល់ ៖</label>
            <input
              type="text"
              id="add-teacher-note"
              placeholder="កំណត់សម្គាល់..."
              class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">បោះបង់</button>
          <button onclick="saveNewSubjectTeacher()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition">បន្ថែមគ្រូ</button>
        </div>
      </div>
    </div>
  `;
}

async function saveNewSubjectTeacher() {
  const code = document.getElementById('add-teacher-code').value.trim();
  const name = document.getElementById('add-teacher-name').value.trim();
  const gender = document.getElementById('add-teacher-gender').value;
  const subject_key = document.getElementById('add-teacher-subject').value;
  const phone = document.getElementById('add-teacher-phone').value.trim();
  const homeroom_class = document.getElementById('add-teacher-homeroom').value;
  const note = document.getElementById('add-teacher-note').value.trim();

  if (!code || !name) {
    alert('សូមបញ្ចូលកូដ និងឈ្មោះគ្រូបង្រៀន!');
    return;
  }

  const payload = { code, name, gender, subject_key, phone, homeroom_class, note };

  try {
    const res = await fetch('/api/add-subject-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(`✅ បានបន្ថែមគ្រូ ${name} (${code}) ទៅកាន់ Database ជោគជ័យ!`);
      closeModal();
      refreshData();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចបន្ថែមបានទេ'));
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកទៅកាន់ Server ៖ ' + err.message);
  }
}

function openEditTeacherModal(code) {
  const t = appState.data.teachers[code];
  if (!t) return;

  const classes = appState.data.classes;

  const modal = document.getElementById('edit-modal');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div class="flex justify-between items-center border-b pb-3">
          <h3 class="font-bold text-base text-gray-900">កែសម្រួលព័ត៌មានគ្រូ ${t.code}</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-gray-700 mb-1">មុខវិជ្ជា ៖</label>
            <div class="font-semibold text-gray-800 bg-gray-100 p-2 rounded">${t.subject_name} (${t.code})</div>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">ឈ្មោះគ្រូបង្រៀនពិត ៖</label>
            <input type="text" id="modal-teacher-name" value="${t.name}" class="w-full text-sm font-bold px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-gray-700 mb-1">ភេទ ៖</label>
              <select id="modal-teacher-gender" class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                <option value="ប្រុស" ${t.gender === 'ប្រុស' ? 'selected' : ''}>ប្រុស (លោកគ្រូ)</option>
                <option value="ស្រី" ${t.gender === 'ស្រី' ? 'selected' : ''}>ស្រី (អ្នកគ្រូ)</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ ៖</label>
              <input type="text" id="modal-teacher-phone" value="${t.phone || ''}" placeholder="012 345 678" class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">គ្រូបន្ទុកថ្នាក់ ៖</label>
            <select id="modal-teacher-homeroom" class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
              <option value="">-- គ្មាន --</option>
              ${classes.map(c => `
                <option value="${c.id}" ${t.homeroom_class === c.id ? 'selected' : ''}>ថ្នាក់ ${c.id}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">កំណត់សម្គាល់ ៖</label>
            <input type="text" id="modal-teacher-note" value="${t.note || ''}" placeholder="កំណត់សម្គាល់..." class="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button onclick="closeModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition">បោះបង់</button>
          <button onclick="saveSingleTeacherModal('${t.code}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">រក្សាទុក</button>
        </div>
      </div>
    </div>
  `;
}

async function saveSingleTeacherModal(code) {
  const nameEl = document.getElementById('modal-teacher-name');
  const genderEl = document.getElementById('modal-teacher-gender');
  const phoneEl = document.getElementById('modal-teacher-phone');
  const hrEl = document.getElementById('modal-teacher-homeroom');
  const noteEl = document.getElementById('modal-teacher-note');

  const payload = {
    [code]: {
      name: nameEl.value.trim() || `គ្រូ ${code}`,
      gender: genderEl ? genderEl.value : 'ប្រុស',
      phone: phoneEl.value.trim(),
      homeroom_class: hrEl ? hrEl.value : '',
      note: noteEl.value.trim()
    }
  };

  try {
    const res = await fetch('/api/save-teacher-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      showToast(`✅ បានកែសម្រួលព័ត៌មានគ្រូ ${code} រួចរាល់!`);
      closeModal();
      refreshData();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចកែសម្រួលបានទេ'));
    }
  } catch (err) {
    alert('❌ មិនអាចរក្សាទុកទៅកាន់ Server ៖ ' + err.message);
  }
}

async function deleteCustomTeacher(code) {
  if (!confirm(`តើអ្នកពិតជាចង់លុបគ្រូ ${code} នេះចេញពីបញ្ជីមែនទេ?`)) return;

  try {
    const res = await fetch('/api/delete-subject-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const result = await res.json();
    if (result.status === 'success') {
      refreshData();
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('មានបញ្ហាក្នុងការលុប ៖ ' + err.message);
  }
}

function closeModal() {
  const modal = document.getElementById('edit-modal');
  modal.innerHTML = '';
}

// -------------------------------------------------------------
// TIMETABLE SCHEDULER & ARRANGER (មុខងាររៀបចំកាលវិភាគបង្រៀន)
// -------------------------------------------------------------

function getShiftSlotIndex(timeSlots, dayIndex, periodIndex) {
  let idx = 0;
  for (let d = 0; d < dayIndex; d++) {
    idx += timeSlots[d].periods.length;
  }
  return idx + periodIndex;
}

function getShiftSlotInfo(timeSlots, slotIndex) {
  let count = 0;
  for (let d = 0; d < timeSlots.length; d++) {
    const dayObj = timeSlots[d];
    for (let p = 0; p < dayObj.periods.length; p++) {
      if (count === slotIndex) {
        return {
          dayIndex: d,
          day: dayObj.day,
          dayKey: dayObj.day_key,
          periodIndex: p,
          period: dayObj.periods[p]
        };
      }
      count++;
    }
  }
  return null;
}

function getScheduleConflicts(data) {
  if (!data) return { list: [], count: 0, conflictedSlotMap: {} };
  const conflicts = [];
  const conflictedSlotMap = {};

  const classes = (data.classes || []).map(c => c.id);
  const teachers = data.teachers || {};

  // Check Morning (28 slots)
  const mSlots = (data.time_slots && data.time_slots.morning) || [];
  const mSlotInfos = [];
  mSlots.forEach(d => {
    (d.periods || []).forEach(p => {
      mSlotInfos.push({ day: d.day, period: p });
    });
  });

  for (let sIdx = 0; sIdx < mSlotInfos.length; sIdx++) {
    const seen = {};
    for (const c of classes) {
      const slots = (data.morning_schedule && data.morning_schedule[c]) || [];
      if (sIdx < slots.length) {
        const code = slots[sIdx];
        if (code && code !== 'ពលកម្ម') {
          if (seen[code]) {
            const t = teachers[code];
            const conflictObj = {
              shift: 'morning',
              slotIndex: sIdx,
              day: mSlotInfos[sIdx].day,
              period: mSlotInfos[sIdx].period,
              teacherCode: code,
              teacherName: t ? t.name : code,
              subjectName: t ? t.subject_name : '',
              classA: seen[code],
              classB: c
            };
            conflicts.push(conflictObj);
            conflictedSlotMap[`morning_${seen[code]}_${sIdx}`] = conflictObj;
            conflictedSlotMap[`morning_${c}_${sIdx}`] = conflictObj;
          } else {
            seen[code] = c;
          }
        }
      }
    }
  }

  // Check Afternoon (24 slots)
  const aSlots = (data.time_slots && data.time_slots.afternoon) || [];
  const aSlotInfos = [];
  aSlots.forEach(d => {
    (d.periods || []).forEach(p => {
      aSlotInfos.push({ day: d.day, period: p });
    });
  });

  for (let sIdx = 0; sIdx < aSlotInfos.length; sIdx++) {
    const seen = {};
    for (const c of classes) {
      const slots = (data.afternoon_schedule && data.afternoon_schedule[c]) || [];
      if (sIdx < slots.length) {
        const code = slots[sIdx];
        if (code && code !== 'ពលកម្ម') {
          if (seen[code]) {
            const t = teachers[code];
            const conflictObj = {
              shift: 'afternoon',
              slotIndex: sIdx,
              day: aSlotInfos[sIdx].day,
              period: aSlotInfos[sIdx].period,
              teacherCode: code,
              teacherName: t ? t.name : code,
              subjectName: t ? t.subject_name : '',
              classA: seen[code],
              classB: c
            };
            conflicts.push(conflictObj);
            conflictedSlotMap[`afternoon_${seen[code]}_${sIdx}`] = conflictObj;
            conflictedSlotMap[`afternoon_${c}_${sIdx}`] = conflictObj;
          } else {
            seen[code] = c;
          }
        }
      }
    }
  }

  return { list: conflicts, count: conflicts.length, conflictedSlotMap };
}

function getTeacherOccupiedClasses(data, shift, slotIndex, teacherCode) {
  if (!data || !teacherCode || teacherCode === 'ពលកម្ម') return [];
  const sched = shift === 'morning' ? data.morning_schedule : data.afternoon_schedule;
  if (!sched) return [];
  const occupied = [];
  for (const c in sched) {
    const slots = sched[c] || [];
    if (slots[slotIndex] === teacherCode) {
      occupied.push(c);
    }
  }
  return occupied;
}

function setSchedulerMode(mode) {
  appState.schedulerMode = mode;
  appState.schedulerSwapFirstSlot = null;
  renderActiveTab();
}

function setSchedulerShift(shift) {
  appState.schedulerShift = shift;
  appState.schedulerSwapFirstSlot = null;
  renderActiveTab();
}

function setSchedulerClass(classId) {
  appState.schedulerClassId = classId;
  appState.schedulerSwapFirstSlot = null;
  renderActiveTab();
}

function setSchedulerTeacher(teacherCode) {
  appState.schedulerTeacherCode = teacherCode;
  appState.schedulerSwapFirstSlot = null;
  renderActiveTab();
}

function renderSchedulerView(container) {
  if (!appState.data) {
    container.innerHTML = '<div class="p-8 text-center text-gray-500">កំពុងដំណើរការទិន្នន័យ...</div>';
    return;
  }

  const data = appState.data;
  const classes = data.classes || [];
  const teachers = data.teachers || {};
  const isAdmin = appState.userRole === 'admin';
  const conflictsData = getScheduleConflicts(data);
  const shift = appState.schedulerShift || 'morning';
  const mode = appState.schedulerMode || 'class';
  const swapSlot = appState.schedulerSwapFirstSlot;

  const activeClass = classes.find(c => c.id === appState.schedulerClassId) || classes[0];
  const activeTeacher = teachers[appState.schedulerTeacherCode] || Object.values(teachers)[0];

  container.innerHTML = `
    <div class="space-y-5">
      <!-- Top Header & Status Banner -->
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
              🛠️
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg sm:text-xl font-bold text-gray-900">ប្រព័ន្ធរៀបចំកាលវិភាគបង្រៀន (Timetable Scheduler)</h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${conflictsData.count === 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'}">
                  ${conflictsData.count === 0 ? '🟢 គ្មានការជាន់ម៉ោង' : `⚠️ ជាន់ម៉ោង ${conflictsData.count} ករណី`}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                រៀបចំ ប្តូរម៉ោង និងចាត់ចែងគ្រូបង្រៀនតាមថ្នាក់ ជាមួយប្រព័ន្ធត្រួតពិនិត្យការជាន់ម៉ោងផ្ទាល់ភ្លាមៗ (Real-time Conflict Checking)
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button
              onclick="saveAllScheduleToCloud()"
              class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              title="រក្សាទុកកាលវិភាគទាំងស្រុងទៅកាន់ Database"
            >
              <span>💾</span> រក្សាទុកកាលវិភាគ
            </button>
            <button
              onclick="window.location.href='/api/export-excel'"
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
            >
              <span>📥</span> Excel
            </button>
            <button
              onclick="printSchedulerSchedule()"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <span>🖨️</span> បោះពុម្ព
            </button>
          </div>
        </div>

        ${!isAdmin ? `
          <div class="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2.5 text-xs text-amber-900">
              <span class="text-xl">🔒</span>
              <div>
                <strong>របៀបមើលសាកល្បង (View Only) ៖</strong>
                <span>ដើម្បីផ្លាស់ប្តូរ និងរក្សាទុកកាលវិភាគទៅកាន់ Cloud Database សូមប្តូរសិទ្ធិជាអ្នកគ្រប់គ្រង (Admin)</span>
              </div>
            </div>
            <button
              onclick="openRoleModal('admin')"
              class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              🛡️ បញ្ចូល Admin PIN
            </button>
          </div>
        ` : ''}

        ${swapSlot ? `
          <div class="mt-4 p-3.5 bg-indigo-50 border-2 border-indigo-400 rounded-xl flex items-center justify-between gap-3 flex-wrap shadow-sm animate-pulse">
            <div class="flex items-center gap-2.5 text-xs text-indigo-900">
              <span class="text-xl">🔄</span>
              <div>
                <strong class="text-sm">កំពុងដំណើរការប្តូរម៉ោងបង្រៀន (Swap Slots) ៖</strong>
                <div class="mt-0.5">
                  បានជ្រើសរើសម៉ោងទី១ ៖ <span class="bg-white px-2 py-0.5 rounded font-bold border border-indigo-300">ថ្ងៃ${swapSlot.dayLabel} (${swapSlot.periodLabel}) - គ្រូ ${swapSlot.teacherCode || '(ទំនេរ)'}</span>
                  • សូមចុចលើក្រឡាម៉ោងទី២ ដើម្បីប្តូរគ្នាភ្លាមៗ!
                </div>
              </div>
            </div>
            <button
              onclick="cancelSchedulerSwap()"
              class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
            >
              ✕ បោះបង់ការប្តូរ
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Control Toolbar: Mode Switcher, Shift, Target Picker -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <!-- Mode Switcher -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">ទិដ្ឋភាព ៖</span>
            <div class="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onclick="setSchedulerMode('class')"
                class="px-3 py-1.5 rounded-lg transition ${mode === 'class' ? 'bg-white text-blue-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}"
              >
                🏫 តាមថ្នាក់រៀន
              </button>
              <button
                onclick="setSchedulerMode('teacher')"
                class="px-3 py-1.5 rounded-lg transition ${mode === 'teacher' ? 'bg-white text-blue-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}"
              >
                👨‍🏫 តាមគ្រូបង្រៀន
              </button>
            </div>
          </div>

          <!-- Shift Switcher -->
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-500">វេនសិក្សា ៖</span>
            <div class="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onclick="setSchedulerShift('morning')"
                class="px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${shift === 'morning' ? 'bg-blue-600 text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}"
              >
                <span>☀️</span> ពេលព្រឹក (៧-១២)
              </button>
              <button
                onclick="setSchedulerShift('afternoon')"
                class="px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${shift === 'afternoon' ? 'bg-amber-600 text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}"
              >
                <span>🌙</span> ពេលរសៀល (១-៥)
              </button>
            </div>
          </div>
        </div>

        <!-- Target Selector (Classes or Teachers) -->
        ${mode === 'class' ? `
          <div>
            <div class="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between">
              <span>ជ្រើសរើសថ្នាក់ដែលត្រូវរៀបចំ ៖</span>
              <span class="text-slate-400">សរុប ${classes.length} ថ្នាក់</span>
            </div>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              ${classes.map(c => `
                <button
                  onclick="setSchedulerClass('${c.id}')"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 border ${c.id === activeClass.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
                >
                  ${c.id}
                </button>
              `).join('')}
            </div>
          </div>
        ` : `
          <div>
            <div class="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between">
              <span>ជ្រើសរើសលោកគ្រូ-អ្នកគ្រូ ៖</span>
              <span class="text-slate-400">សរុប ${Object.keys(teachers).length} នាក់</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <select
                onchange="setSchedulerTeacher(this.value)"
                class="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 max-w-xs"
              >
                ${Object.values(teachers).sort((a,b) => a.code.localeCompare(b.code)).map(t => `
                  <option value="${t.code}" ${t.code === activeTeacher.code ? 'selected' : ''}>
                    ${t.code} - ${t.name} (${t.subject_name})
                  </option>
                `).join('')}
              </select>

              <div class="text-xs text-slate-600 flex items-center gap-2">
                <span>បន្ទុកម៉ោងសរុប ៖ <strong class="text-blue-900">${activeTeacher.total_hours} ម៉ោង/សប្ដាហ៍</strong></span>
                <span>•</span>
                <span>ព្រឹក ៖ <strong>${activeTeacher.morning_hours}h</strong></span>
                <span>•</span>
                <span>រសៀល ៖ <strong>${activeTeacher.afternoon_hours}h</strong></span>
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- Conflicts Alert Details (if any) -->
      ${conflictsData.count > 0 ? `
        <div class="bg-rose-50 border border-rose-300 rounded-2xl p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5">
              <span class="text-2xl mt-0.5">⚠️</span>
              <div>
                <h3 class="font-bold text-sm text-rose-950">រកឃើញការជាន់ម៉ោងបង្រៀនចំនួន ${conflictsData.count} ករណី!</h3>
                <p class="text-xs text-rose-800 mt-0.5">លោកគ្រូ-អ្នកគ្រូដូចគ្នា ត្រូវបានដាក់បង្រៀននៅថ្នាក់លើសពីមួយ ក្នុងពេលតែមួយ។ សូមពិនិត្យ និងកែសម្រួលក្រឡាដែលមានពណ៌ក្រហមខាងក្រោម ៖</p>
                <div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  ${conflictsData.list.map(cf => `
                    <div class="bg-white/90 p-2.5 rounded-xl border border-rose-200 text-xs shadow-2xs flex items-center justify-between gap-2">
                      <div>
                        <div class="font-bold text-rose-900">${cf.teacherCode} (${cf.teacherName})</div>
                        <div class="text-[11px] text-rose-700">${cf.shift === 'morning' ? 'ព្រឹក' : 'រសៀល'} ថ្ងៃ${cf.day} (${cf.period})</div>
                      </div>
                      <div class="text-right">
                        <span class="px-2 py-0.5 rounded font-black bg-rose-100 text-rose-800 text-[10px]">
                          ${cf.classA} ⚡ ${cf.classB}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Main Schedule Grid Rendering -->
      ${mode === 'class' ? renderSchedulerClassMode(activeClass, shift, conflictsData) : renderSchedulerTeacherMode(activeTeacher, shift, conflictsData)}
    </div>
  `;
}

function renderSchedulerClassMode(activeClass, shift, conflictsData) {
  const data = appState.data;
  const timeSlots = data.time_slots[shift] || [];
  const sched = shift === 'morning' ? data.morning_schedule : data.afternoon_schedule;
  const slots = sched[activeClass.id] || [];
  const teachers = data.teachers || {};
  const swapSlot = appState.schedulerSwapFirstSlot;

  let maxPeriods = 0;
  timeSlots.forEach(d => {
    if (d.periods.length > maxPeriods) maxPeriods = d.periods.length;
  });

  // Calculate subject counts in this class for summary
  const subjectHours = {};
  slots.forEach(code => {
    if (code && code !== 'ពលកម្ម') {
      const t = teachers[code];
      const subj = t ? t.subject_name : code;
      subjectHours[subj] = (subjectHours[subj] || 0) + 1;
    }
  });

  const totalAssignedHours = Object.values(subjectHours).reduce((a, b) => a + b, 0);
  const totalCapacity = shift === 'morning' ? 28 : 24;

  return `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <!-- Class Subheader -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
            ${activeClass.id}
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>កាលវិភាគថ្នាក់ ${activeClass.id} (${activeClass.level})</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${shift === 'morning' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                ${shift === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល'}
              </span>
            </h3>
            <div class="text-xs text-slate-500 mt-0.5">
              គ្រូបន្ទុកថ្នាក់ ៖ <strong>${activeClass.homeroom}</strong> • ម៉ោងបង្រៀនសរុប ៖ <strong>${totalAssignedHours}/${totalCapacity} ម៉ោង</strong>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            onclick="openClearClassModal('${shift}', '${activeClass.id}')"
            class="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition flex items-center gap-1"
          >
            <span>🧹</span> សម្អាតថ្នាក់នេះ
          </button>
        </div>
      </div>

      <!-- Grid Table -->
      <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
        <table class="w-full text-xs text-center border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="border border-slate-200 py-2.5 px-3 w-20 text-[11px] font-bold">ម៉ោង \\ ថ្ងៃ</th>
              ${timeSlots.map(d => `
                <th class="border border-slate-200 py-2.5 px-3 font-bold text-xs ${shift === 'morning' ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-900'}">
                  ថ្ងៃ${d.day}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: maxPeriods }).map((_, pIdx) => {
              const periodLabel = shift === 'morning'
                ? (['៧:០០-៨:០០', '៨:០០-៩:០០', '៩:០០-១០:០០', '១០:០០-១១:០០', '១១:០០-១២:០០'][pIdx] || '')
                : (['១:០០-២:០០', '២:០០-៣:០០', '៣:០០-៤:០០', '៤:០០-៥:០០'][pIdx] || '');

              const shortPeriodLabel = shift === 'morning'
                ? (['7-8', '8-9', '9-10', '10-11', '11-12'][pIdx] || '')
                : (['1-2', '2-3', '3-4', '4-5'][pIdx] || '');

              return `
                <tr class="hover:bg-slate-50/50 transition">
                  <td class="border border-slate-200 py-2 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">
                    <div>${shortPeriodLabel}</div>
                    <div class="text-[9px] text-slate-400 font-normal">${periodLabel}</div>
                  </td>
                  ${timeSlots.map((d, dIdx) => {
                    const pName = d.periods[pIdx];
                    if (!pName) {
                      return `<td class="border border-slate-200 bg-slate-100 text-slate-300">--</td>`;
                    }

                    if (shift === 'afternoon' && d.day_key === 'Thu') {
                      return `
                        <td class="border border-slate-200 bg-amber-50 text-amber-800 font-bold text-xs py-3 px-2">
                          <span class="px-2 py-1 rounded bg-amber-200 text-amber-900 text-[11px]">🛠️ ពលកម្ម</span>
                        </td>
                      `;
                    }

                    const slotIdx = getShiftSlotIndex(timeSlots, dIdx, pIdx);
                    const code = slots[slotIdx] || '';
                    const teacher = teachers[code];
                    const conflictKey = `${shift}_${activeClass.id}_${slotIdx}`;
                    const hasConflict = !!conflictsData.conflictedSlotMap[conflictKey];
                    const isSelectedForSwap = swapSlot && swapSlot.shift === shift && swapSlot.classId === activeClass.id && swapSlot.slotIndex === slotIdx;

                    return `
                      <td
                        class="border border-slate-200 p-1.5 transition relative group ${isSelectedForSwap ? 'ring-4 ring-indigo-500 bg-indigo-50 font-bold' : ''} ${hasConflict ? 'bg-rose-50 border-rose-400' : ''}"
                      >
                        ${code && code !== 'ពលកម្ម' ? `
                          <div
                            onclick="handleSchedulerCellClick('${shift}', '${activeClass.id}', ${slotIdx}, '${d.day}', '${shortPeriodLabel}', '${code}')"
                            class="p-2 rounded-xl cursor-pointer transition transform hover:scale-[1.02] shadow-2xs border ${hasConflict ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}"
                            style="background-color: ${hasConflict ? '#fff1f2' : (teacher ? teacher.subject_color : '#f8fafc')};"
                          >
                            <div class="flex items-center justify-between gap-1">
                              <span class="font-black text-sm" style="color: ${hasConflict ? '#be123c' : (teacher ? teacher.subject_text_color : '#0f172a')}">
                                ${code}
                              </span>
                              ${hasConflict ? `
                                <span class="px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold text-[9px] animate-pulse">
                                  ជាន់!
                                </span>
                              ` : ''}
                            </div>
                            <div class="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                              ${teacher ? teacher.name : code}
                            </div>
                            <div class="text-[10px] text-slate-500 truncate">
                              ${teacher ? teacher.subject_name : ''}
                            </div>

                            <!-- Hover / Action Buttons -->
                            <div class="mt-1.5 pt-1 border-t border-black/5 flex items-center justify-center gap-1.5 text-[10px]">
                              <button
                                onclick="event.stopPropagation(); startSchedulerSwap('${shift}', '${activeClass.id}', ${slotIdx}, '${d.day}', '${shortPeriodLabel}', '${code}')"
                                class="px-1.5 py-0.5 rounded bg-white/80 hover:bg-white text-slate-700 font-bold border border-slate-300 shadow-2xs"
                                title="ជ្រើសរើសដើម្បីប្តូរម៉ោង"
                              >
                                🔄 ប្តូរ
                              </button>
                              <button
                                onclick="event.stopPropagation(); saveSchedulerSlot('${shift}', '${activeClass.id}', ${slotIdx}, '')"
                                class="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 shadow-2xs"
                                title="សម្អាតម៉ោងនេះ"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ` : `
                          <div
                            onclick="handleSchedulerCellClick('${shift}', '${activeClass.id}', ${slotIdx}, '${d.day}', '${shortPeriodLabel}', '')"
                            class="p-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer text-slate-400 hover:text-blue-600 transition flex flex-col items-center justify-center min-h-[72px]"
                          >
                            <span class="text-sm font-bold">+</span>
                            <span class="text-[10px] font-medium mt-0.5">ដាក់គ្រូ</span>
                          </div>
                        `}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Subject Allocation Breakdown for this Class -->
      <div class="pt-3 border-t border-slate-100">
        <h4 class="text-xs font-bold text-slate-600 mb-2 flex items-center justify-between">
          <span>បែងចែកម៉ោងតាមមុខវិជ្ជាក្នុងថ្នាក់ ${activeClass.id} ៖</span>
          <span class="text-blue-700 font-bold">${totalAssignedHours} / ${totalCapacity} ម៉ោង</span>
        </h4>
        <div class="flex flex-wrap gap-2">
          ${Object.keys(subjectHours).length > 0 ? Object.entries(subjectHours).map(([sName, hrs]) => `
            <div class="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5">
              <span class="font-semibold text-slate-700">${sName} ៖</span>
              <strong class="text-blue-700">${hrs} ម៉ោង</strong>
            </div>
          `).join('') : '<span class="text-xs text-slate-400">មិនទាន់មានមុខវិជ្ជាត្រូវបានចាត់ចែងនៅឡើយទេ។</span>'}
        </div>
      </div>
    </div>
  `;
}

function renderSchedulerTeacherMode(activeTeacher, shift, conflictsData) {
  const data = appState.data;
  const timeSlots = data.time_slots[shift] || [];
  const sched = shift === 'morning' ? data.morning_schedule : data.afternoon_schedule;
  const classes = data.classes || [];

  let maxPeriods = 0;
  timeSlots.forEach(d => {
    if (d.periods.length > maxPeriods) maxPeriods = d.periods.length;
  });

  return `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
            ${activeTeacher.code}
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900">
              កាលវិភាគរបស់លោកគ្រូ-អ្នកគ្រូ ៖ ${activeTeacher.name}
            </h3>
            <div class="text-xs text-slate-500 mt-0.5">
              មុខវិជ្ជា ៖ <strong>${activeTeacher.subject_name}</strong> • បន្ទុកម៉ោង ៖ <strong>${activeTeacher.total_hours} ម៉ោង/សប្ដាហ៍</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
        <table class="w-full text-xs text-center border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="border border-slate-200 py-2.5 px-3 w-20 text-[11px] font-bold">ម៉ោង \\ ថ្ងៃ</th>
              ${timeSlots.map(d => `
                <th class="border border-slate-200 py-2.5 px-3 font-bold text-xs ${shift === 'morning' ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-900'}">
                  ថ្ងៃ${d.day}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: maxPeriods }).map((_, pIdx) => {
              const shortPeriodLabel = shift === 'morning'
                ? (['7-8', '8-9', '9-10', '10-11', '11-12'][pIdx] || '')
                : (['1-2', '2-3', '3-4', '4-5'][pIdx] || '');

              return `
                <tr class="hover:bg-slate-50/50 transition">
                  <td class="border border-slate-200 py-2 px-2 font-bold bg-slate-50 text-slate-600 text-[11px]">
                    ${shortPeriodLabel}
                  </td>
                  ${timeSlots.map((d, dIdx) => {
                    const slotIdx = getShiftSlotIndex(timeSlots, dIdx, pIdx);
                    // Find all classes this teacher is teaching at this slot
                    const occupiedClasses = [];
                    for (const c of classes) {
                      const classSlots = sched[c.id] || [];
                      if (classSlots[slotIdx] === activeTeacher.code) {
                        occupiedClasses.push(c.id);
                      }
                    }

                    const hasConflict = occupiedClasses.length > 1;

                    return `
                      <td class="border border-slate-200 p-2 ${hasConflict ? 'bg-rose-50 border-rose-400' : ''}">
                        ${occupiedClasses.length > 0 ? `
                          <div class="p-2 rounded-xl ${hasConflict ? 'bg-rose-100 border border-rose-400 text-rose-900' : 'bg-blue-50 border border-blue-200 text-blue-950'} font-bold">
                            <div class="text-sm">
                              ${occupiedClasses.map(cid => `ថ្នាក់ ${cid}`).join(', ')}
                            </div>
                            ${hasConflict ? `
                              <div class="text-[10px] text-rose-700 font-extrabold mt-1">
                                ⚠️ ជាន់ម៉ោង (${occupiedClasses.join(' & ')})
                              </div>
                            ` : `
                              <div class="text-[10px] text-slate-500 font-normal mt-0.5">
                                កំពុងបង្រៀន
                              </div>
                            `}
                          </div>
                        ` : `
                          <div class="p-2 text-slate-300 font-semibold">
                            -- ទំនេរ --
                          </div>
                        `}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function handleSchedulerCellClick(shift, classId, slotIndex, dayLabel, periodLabel, currentCode) {
  const swap = appState.schedulerSwapFirstSlot;
  if (swap) {
    if (swap.shift === shift && swap.classId === classId && swap.slotIndex === slotIndex) {
      // Clicked same cell -> cancel swap
      cancelSchedulerSwap();
    } else {
      // Execute swap
      executeSchedulerSwap(shift, classId, swap.slotIndex, slotIndex);
    }
  } else {
    // Open editor modal
    openSlotEditorModal(shift, classId, slotIndex, dayLabel, periodLabel);
  }
}

function startSchedulerSwap(shift, classId, slotIndex, dayLabel, periodLabel, teacherCode) {
  appState.schedulerSwapFirstSlot = { shift, classId, slotIndex, dayLabel, periodLabel, teacherCode };
  renderActiveTab();
  showToast(`🔄 បានជ្រើសរើសម៉ោងទី១ (ថ្ងៃ${dayLabel} ${periodLabel})! សូមចុចលើម៉ោងទី២ ដើម្បីប្តូរ។`);
}

function cancelSchedulerSwap() {
  appState.schedulerSwapFirstSlot = null;
  renderActiveTab();
  showToast('បានបោះបង់ការប្តូរម៉ោង');
}

async function executeSchedulerSwap(shift, classId, idxA, idxB) {
  if (appState.userRole !== 'admin') {
    showToast('⚠️ ទាមទារសិទ្ធិ Admin ដើម្បីប្តូរម៉ោងបង្រៀន!');
    openRoleModal('admin');
    return;
  }

  try {
    const res = await fetch('/api/schedule/swap-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift: shift,
        class_id: classId,
        index_a: idxA,
        index_b: idxB
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      appState.data.morning_schedule = result.morning_schedule;
      appState.data.afternoon_schedule = result.afternoon_schedule;
      appState.schedulerSwapFirstSlot = null;
      showToast('✅ បានផ្លាស់ប្តូរម៉ោងបង្រៀនដោយជោគជ័យ!');
      // Refresh teacher calculations
      await refreshData();
      renderActiveTab();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចផ្លាស់ប្តូរម៉ោងបានទេ'));
    }
  } catch (err) {
    alert('❌ មានបញ្ហាក្នុងការភ្ជាប់ Database ៖ ' + err.message);
  }
}

function openSlotEditorModal(shift, classId, slotIndex, dayLabel, periodLabel) {
  const data = appState.data;
  const sched = shift === 'morning' ? data.morning_schedule : data.afternoon_schedule;
  const slots = sched[classId] || [];
  const currentCode = slots[slotIndex] || '';
  const currentTeacher = data.teachers[currentCode];
  const teachers = Object.values(data.teachers || {}).sort((a, b) => a.name.localeCompare(b.name, 'km'));
  const subjects = data.subjects || {};

  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  function renderModalContent(filterSubj = 'ALL', searchQ = '') {
    let filteredTeachers = teachers;
    if (filterSubj !== 'ALL') {
      filteredTeachers = filteredTeachers.filter(t => t.subject_key === filterSubj);
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filteredTeachers = filteredTeachers.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.subject_name.toLowerCase().includes(q)
      );
    }

    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 my-auto border border-slate-200">
          <!-- Header -->
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                ${classId}
              </span>
              <div>
                <h3 class="font-bold text-base text-gray-900">ជ្រើសរើសគ្រូបង្រៀន</h3>
                <p class="text-[11px] text-slate-500">ថ្នាក់ ${classId} • ពេល${shift === 'morning' ? 'ព្រឹក' : 'រសៀល'} ថ្ងៃ${dayLabel} (${periodLabel})</p>
              </div>
            </div>
            <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 font-bold text-xl px-2">✕</button>
          </div>

          <!-- Current Assignment Card -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span class="text-[11px] text-slate-500 font-bold">គ្រូបង្រៀនបច្ចុប្បន្ន ៖</span>
              <div class="font-bold text-sm text-slate-900 mt-0.5">
                ${currentCode ? `${currentCode} - ${currentTeacher ? currentTeacher.name : currentCode} (${currentTeacher ? currentTeacher.subject_name : ''})` : '<span class="text-slate-400 italic">មិនទាន់មានគ្រូ (ម៉ោងទំនេរ)</span>'}
              </div>
            </div>
            ${currentCode ? `
              <button
                onclick="saveSchedulerSlot('${shift}', '${classId}', ${slotIndex}, '')"
                class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition"
              >
                ✕ លុបគ្រូចេញ
              </button>
            ` : ''}
          </div>

          <!-- Search & Filter -->
          <div class="space-y-2">
            <input
              type="text"
              id="slot-teacher-search"
              placeholder="ស្វែងរកតាមឈ្មោះ ឬកូដគ្រូ (ឧ. K1, សុខ...)"
              value="${searchQ}"
              class="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <!-- Subject Pills -->
            <div class="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                data-filter="ALL"
                class="subject-pill px-2.5 py-1 rounded-lg border font-bold transition shrink-0 ${filterSubj === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}"
              >
                ទាំងអស់
              </button>
              ${Object.entries(subjects).map(([k, name]) => `
                <button
                  data-filter="${k}"
                  class="subject-pill px-2.5 py-1 rounded-lg border font-bold transition shrink-0 ${filterSubj === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}"
                >
                  ${name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Teachers List with Availability -->
          <div class="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
            ${filteredTeachers.map(t => {
              const occupiedClasses = getTeacherOccupiedClasses(data, shift, slotIndex, t.code);
              const isOccupiedHere = occupiedClasses.includes(classId);
              const isBusyElsewhere = occupiedClasses.filter(cid => cid !== classId).length > 0;
              const isFree = occupiedClasses.length === 0;

              return `
                <div class="pt-1.5 first:pt-0 flex items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded-xl transition">
                  <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs" style="background-color: ${t.subject_color}; color: ${t.subject_text_color}">
                      ${t.code}
                    </span>
                    <div>
                      <div class="font-bold text-xs text-slate-900">${t.name}</div>
                      <div class="text-[10px] text-slate-500">
                        ${t.subject_name} • បន្ទុក ${t.total_hours} ម៉ោង
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    ${isBusyElsewhere ? `
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        ជាន់ថ្នាក់ ${occupiedClasses.filter(c => c !== classId).join(', ')}
                      </span>
                    ` : (isOccupiedHere ? `
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        កំពុងនៅទីនេះ
                      </span>
                    ` : `
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        🟢 ទំនេរ
                      </span>
                    `)}

                    <button
                      onclick="saveSchedulerSlot('${shift}', '${classId}', ${slotIndex}, '${t.code}')"
                      class="px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${isBusyElsewhere ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'}"
                    >
                      ${isOccupiedHere ? 'រក្សាទុក' : 'ជ្រើសរើស'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Footer -->
          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onclick="closeModal()"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              បិទផ្ទាំង
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook listeners for search & subject pills
    const searchInput = document.getElementById('slot-teacher-search');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        renderModalContent(filterSubj, e.target.value);
      });
      // Keep focus and cursor at end
      if (searchQ) {
        searchInput.focus();
        searchInput.setSelectionRange(searchQ.length, searchQ.length);
      }
    }

    document.querySelectorAll('.subject-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        renderModalContent(btn.dataset.filter, searchQ);
      });
    });
  }

  renderModalContent();
}

async function saveSchedulerSlot(shift, classId, slotIndex, teacherCode) {
  if (appState.userRole !== 'admin') {
    showToast('⚠️ ទាមទារសិទ្ធិ Admin ដើម្បីកែប្រែកាលវិភាគ!');
    openRoleModal('admin');
    return;
  }

  try {
    const res = await fetch('/api/schedule/save-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift: shift,
        class_id: classId,
        slot_index: slotIndex,
        teacher_code: teacherCode
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      appState.data.morning_schedule = result.morning_schedule;
      appState.data.afternoon_schedule = result.afternoon_schedule;
      closeModal();
      showToast(`✅ ${result.message}`);
      await refreshData();
      renderActiveTab();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចកែប្រែម៉ោងបានទេ'));
    }
  } catch (err) {
    alert('❌ មានបញ្ហាក្នុងការភ្ជាប់ Database ៖ ' + err.message);
  }
}

function openClearClassModal(shift, classId) {
  if (appState.userRole !== 'admin') {
    showToast('⚠️ ទាមទារសិទ្ធិ Admin ដើម្បីសម្អាតម៉ោងបង្រៀន!');
    openRoleModal('admin');
    return;
  }

  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
        <div class="flex items-center gap-3 border-b pb-3">
          <span class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl font-bold">
            🧹
          </span>
          <div>
            <h3 class="font-bold text-base text-gray-900">សម្អាតកាលវិភាគថ្នាក់ ${classId}</h3>
            <p class="text-xs text-slate-500">លុបម៉ោងបង្រៀនទាំងអស់ក្នុងថ្នាក់នេះដើម្បីរៀបចំសារជាថ្មី</p>
          </div>
        </div>

        <div class="space-y-2 text-xs">
          <p class="text-slate-600">សូមជ្រើសរើសជម្រើសសម្អាត ៖</p>
          <div class="grid grid-cols-1 gap-2">
            <button
              onclick="confirmClearClass('${classId}', 'morning')"
              class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 font-bold transition flex items-center justify-between"
            >
              <span>☀️ សម្អាតតែពេលព្រឹក (Morning 28 ម៉ោង)</span>
              <span class="text-slate-400">➔</span>
            </button>
            <button
              onclick="confirmClearClass('${classId}', 'afternoon')"
              class="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 font-bold transition flex items-center justify-between"
            >
              <span>🌙 សម្អាតតែពេលរសៀល (Afternoon 24 ម៉ោង)</span>
              <span class="text-slate-400">➔</span>
            </button>
            <button
              onclick="confirmClearClass('${classId}', 'both')"
              class="w-full text-left p-3 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold transition flex items-center justify-between"
            >
              <span>💥 សម្អាតទាំងព្រឹក និងរសៀល (ទាំងស្រុង)</span>
              <span class="text-rose-500">➔</span>
            </button>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onclick="closeModal()"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            បោះបង់
          </button>
        </div>
      </div>
    </div>
  `;
}

async function confirmClearClass(classId, clearShift) {
  try {
    const res = await fetch('/api/schedule/clear-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
        shift: clearShift
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      appState.data.morning_schedule = result.morning_schedule;
      appState.data.afternoon_schedule = result.afternoon_schedule;
      closeModal();
      showToast(`✅ ${result.message}`);
      await refreshData();
      renderActiveTab();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចសម្អាតបានទេ'));
    }
  } catch (err) {
    alert('❌ មានបញ្ហា ៖ ' + err.message);
  }
}

async function saveAllScheduleToCloud() {
  if (appState.userRole !== 'admin') {
    showToast('⚠️ ទាមទារសិទ្ធិ Admin ដើម្បីរក្សាទុកកាលវិភាគទៅ Cloud!');
    openRoleModal('admin');
    return;
  }

  try {
    showToast('⏳ កំពុងរក្សាទុកកាលវិភាគទៅកាន់ Cloud Database...');
    const res = await fetch('/api/schedule/save-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        morning_schedule: appState.data.morning_schedule,
        afternoon_schedule: appState.data.afternoon_schedule
      })
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast('✅ បានរក្សាទុកកាលវិភាគទៅកាន់ Cloud Database រួចរាល់!');
      await refreshData();
      renderActiveTab();
    } else {
      alert('⚠️ ' + (result.message || 'មិនអាចរក្សាទុកបានទេ'));
    }
  } catch (err) {
    alert('❌ មានបញ្ហាក្នុងការរក្សាទុក ៖ ' + err.message);
  }
}

function printSchedulerSchedule() {
  const mode = appState.schedulerMode || 'class';
  if (mode === 'class') {
    printSingleClass(appState.schedulerClassId || '12A');
  } else {
    printSingleTeacherCard(appState.schedulerTeacherCode || 'I3');
  }
}

// -------------------------------------------------------------
// PRINT HELPERS
// -------------------------------------------------------------
function printSingleTeacherCard(code) {
  const teacher = appState.data.teachers[code];
  if (!teacher) return;
  const printArea = document.getElementById('printable-area');
  printArea.innerHTML = generateTeacherCardPrintHTML(teacher);
  window.print();
}

function printAllTeacherCards() {
  const teachers = appState.data.teachers;
  const printArea = document.getElementById('printable-area');
  let html = '';
  const codes = Object.keys(teachers).sort();
  codes.forEach((code, i) => {
    html += generateTeacherCardPrintHTML(teachers[code]);
    if (i < codes.length - 1) {
      html += '<div class="page-break"></div>';
    }
  });
  printArea.innerHTML = html;
  window.print();
}

function generateTeacherCardPrintHTML(teacher) {
  const info = appState.data.school_info;
  const mSlots = teacher.morning_slots || {};
  const aSlots = teacher.afternoon_slots || {};
  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

  return `
    <div class="teacher-slip-card font-battambang">
      <div class="text-center mb-3">
        <div class="font-moul text-sm">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="font-moul text-xs">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div class="text-[10px] text-gray-400">--- 3 ---</div>
      </div>

      <div class="flex justify-between items-start text-xs mb-3 border-b pb-2">
        <div>
          <div>${info.ministry}</div>
          <div class="font-bold">${info.school_name}</div>
        </div>
        <div class="text-right">
          <div>ឆ្នាំសិក្សា ៖ <strong>${info.academic_year}</strong></div>
          <div class="text-[10px] text-gray-500">${info.effective_date}</div>
        </div>
      </div>

      <div class="text-center mb-3">
        <h2 class="font-moul text-base text-blue-900">បណ្ណកាលវិភាគបង្រៀនប្រចាំសប្ដាហ៍</h2>
      </div>

      <div class="bg-gray-50 border border-gray-300 p-2.5 rounded mb-3 text-xs flex justify-between items-center">
        <div>
          <div>ឈ្មោះគ្រូបង្រៀន ៖ <strong class="text-sm font-bold">${teacher.name}</strong> (កូដ ៖ <strong>${teacher.code}</strong>) ភេទ ៖ <strong>${teacher.gender || 'ប្រុស'}</strong></div>
          <div>មុខវិជ្ជាឯកទេស ៖ <strong>${teacher.subject_name}</strong> ${teacher.homeroom_class ? `| គ្រូបន្ទុកថ្នាក់ ៖ <strong>${teacher.homeroom_class}</strong>` : ''}</div>
        </div>
        <div class="text-right">
          <div>បន្ទុកម៉ោងសរុប ៖ <strong class="text-sm font-black text-blue-900">${teacher.total_hours} ម៉ោង/សប្ដាហ៍</strong></div>
          <div class="text-[11px] text-gray-600">(ព្រឹក: ${teacher.morning_hours} ម៉ោង, រសៀល: ${teacher.afternoon_hours} ម៉ោង)</div>
        </div>
      </div>

      <div class="mb-3">
        <div class="font-bold text-xs mb-1 text-blue-900">១. ពេលព្រឹក (៧:០០ - ១២:០០)</div>
        <table class="timetable-table text-[10px] text-center w-full">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-1 px-2">ម៉ោង \\ ថ្ងៃ</th>
              ${days.map(d => `<th class="py-1 px-2 font-bold">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${['7-8', '8-9', '9-10', '10-11', '11-12'].map(p => `
              <tr>
                <td class="font-bold py-1 bg-gray-50">${p}</td>
                ${days.map(d => {
                  if (p === '11-12' && (d === 'សុក្រ' || d === 'សៅរ៍')) {
                    return `<td class="bg-gray-100 text-gray-400">--</td>`;
                  }
                  const cls = mSlots[d] ? mSlots[d][p] : null;
                  return cls
                    ? `<td class="font-black text-xs text-blue-900 bg-blue-50 py-1">ថ្នាក់ ${cls}</td>`
                    : `<td class="text-gray-300 py-1">--</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mb-4">
        <div class="font-bold text-xs mb-1 text-amber-900">២. ពេលរសៀល (១៣:០០ - ១៧:០០)</div>
        <table class="timetable-table text-[10px] text-center w-full">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-1 px-2">ម៉ោង \\ ថ្ងៃ</th>
              ${days.map(d => `<th class="py-1 px-2 font-bold">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${['1-2', '2-3', '3-4', '4-5'].map(p => `
              <tr>
                <td class="font-bold py-1 bg-gray-50">${p}</td>
                ${days.map(d => {
                  if (d === 'ព្រហស្បតិ៍') {
                    return `<td class="bg-amber-100 text-amber-800 text-[9px] font-semibold">ពលកម្ម</td>`;
                  }
                  const cls = aSlots[d] ? aSlots[d][p] : null;
                  return cls
                    ? `<td class="font-black text-xs text-amber-900 bg-amber-50 py-1">ថ្នាក់ ${cls}</td>`
                    : `<td class="text-gray-300 py-1">--</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="grid grid-cols-2 text-center text-xs pt-4 border-t border-gray-300">
        <div>
          <div class="font-bold">បានឃើញ និងឯកភាព</div>
          <div class="text-[11px] text-gray-600">នាយកសាលា</div>
          <div class="h-14"></div>
          <div class="font-semibold text-gray-400">...................................................</div>
        </div>
        <div>
          <div class="text-[11px] text-gray-500">${info.effective_date}</div>
          <div class="font-bold">ហត្ថលេខាគ្រូបង្រៀន</div>
          <div class="h-14"></div>
          <div class="font-bold text-gray-900">${teacher.name}</div>
        </div>
      </div>
    </div>
  `;
}

function printSingleClass(classId) {
  const printArea = document.getElementById('printable-area');
  printArea.innerHTML = generateClassPrintHTML(classId);
  window.print();
}

function printAllClassSchedules() {
  const classes = appState.data.classes;
  const printArea = document.getElementById('printable-area');
  let html = '';
  classes.forEach((c, i) => {
    html += generateClassPrintHTML(c.id);
    if (i < classes.length - 1) {
      html += '<div class="page-break"></div>';
    }
  });
  printArea.innerHTML = html;
  window.print();
}

function generateClassPrintHTML(classId) {
  const info = appState.data.school_info;
  const clsObj = appState.data.classes.find(c => c.id === classId);
  const mSlots = appState.data.morning_schedule[classId] || [];
  const aSlots = appState.data.afternoon_schedule[classId] || [];
  const teachers = appState.data.teachers;
  const days = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

  return `
    <div class="teacher-slip-card font-battambang">
      <div class="text-center mb-3">
        <div class="font-moul text-sm">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="font-moul text-xs">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div class="text-[10px] text-gray-400">--- 3 ---</div>
      </div>

      <div class="flex justify-between items-start text-xs mb-2 border-b pb-2">
        <div>
          <div>${info.ministry}</div>
          <div class="font-bold">${info.school_name}</div>
        </div>
        <div class="text-right">
          <div>ឆ្នាំសិក្សា ៖ <strong>${info.academic_year}</strong></div>
          <div class="text-[10px] text-gray-500">${info.effective_date}</div>
        </div>
      </div>

      <div class="text-center mb-2">
        <h2 class="font-moul text-lg text-blue-900">កាលវិភាគសិក្សាប្រចាំថ្នាក់ ${classId}</h2>
        <div class="text-xs text-gray-700 mt-0.5">
          គ្រូបន្ទុកថ្នាក់ ៖ <strong class="text-blue-900 font-bold">${clsObj ? clsObj.homeroom : ''}</strong>
        </div>
      </div>

      <div class="mb-3">
        <div class="font-bold text-xs mb-1 text-blue-900">កាលវិភាគពេលព្រឹក (៧:០០ - ១២:០០)</div>
        <table class="timetable-table text-[10px] text-center w-full">
          <thead>
            <tr class="bg-gray-100 font-bold">
              <th class="py-1 px-2">ម៉ោង \\ ថ្ងៃ</th>
              ${days.map(d => `<th class="py-1 px-2">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${['7-8', '8-9', '9-10', '10-11', '11-12'].map((p, pIdx) => `
              <tr>
                <td class="font-bold py-1 bg-gray-50">${p}</td>
                ${days.map((d, dIdx) => {
                  let slotIdx = 0;
                  const dayLens = [5, 5, 5, 5, 4, 4];
                  for (let i = 0; i < dIdx; i++) slotIdx += dayLens[i];
                  slotIdx += pIdx;

                  if (p === '11-12' && (d === 'សុក្រ' || d === 'សៅរ៍')) {
                    return `<td class="bg-gray-100 text-gray-400">--</td>`;
                  }
                  const code = mSlots[slotIdx];
                  const t = code ? teachers[code] : null;
                  return code
                    ? `<td class="font-bold text-xs py-1" style="background-color: ${t ? t.subject_color : '#fff'}; color: ${t ? t.subject_text_color : '#000'}">${code}</td>`
                    : `<td class="text-gray-300 py-1">--</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mb-3">
        <div class="font-bold text-xs mb-1 text-amber-900">កាលវិភាគពេលរសៀល (១៣:០០ - ១៧:០០)</div>
        <table class="timetable-table text-[10px] text-center w-full">
          <thead>
            <tr class="bg-gray-100 font-bold">
              <th class="py-1 px-2">ម៉ោង \\ ថ្ងៃ</th>
              ${days.map(d => `<th class="py-1 px-2">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${['1-2', '2-3', '3-4', '4-5'].map((p, pIdx) => `
              <tr>
                <td class="font-bold py-1 bg-gray-50">${p}</td>
                ${days.map((d, dIdx) => {
                  let slotIdx = dIdx * 4 + pIdx;
                  if (d === 'ព្រហស្បតិ៍') {
                    return `<td class="bg-amber-100 text-amber-800 text-[9px] font-semibold">ពលកម្ម</td>`;
                  }
                  const code = aSlots[slotIdx];
                  const t = code && code !== 'ពលកម្ម' ? teachers[code] : null;
                  return code && code !== 'ពលកម្ម'
                    ? `<td class="font-bold text-xs py-1" style="background-color: ${t ? t.subject_color : '#fff'}; color: ${t ? t.subject_text_color : '#000'}">${code}</td>`
                    : `<td class="text-gray-300 py-1">--</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function printSubjectTeachersRoster() {
  const info = appState.data.school_info;
  const teachers = appState.data.teachers;
  const list = Object.values(teachers).sort((a, b) => a.code.localeCompare(b.code));

  const printArea = document.getElementById('printable-area');
  printArea.innerHTML = `
    <div class="teacher-slip-card font-battambang">
      <div class="text-center mb-3">
        <div class="font-moul text-sm">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="font-moul text-xs">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div class="text-[10px] text-gray-400">--- 3 ---</div>
      </div>

      <div class="flex justify-between items-start text-xs mb-3 border-b pb-2">
        <div>
          <div>${info.ministry}</div>
          <div class="font-bold">${info.school_name}</div>
        </div>
        <div class="text-right">
          <div>ឆ្នាំសិក្សា ៖ <strong>${info.academic_year}</strong></div>
          <div class="text-[10px] text-gray-500">${info.effective_date}</div>
        </div>
      </div>

      <div class="text-center mb-3">
        <h2 class="font-moul text-base text-blue-900">បញ្ជីរាយនាមលោកគ្រូ-អ្នកគ្រូតាមមុខវិជ្ជា និងបន្ទុកម៉ោងបង្រៀន</h2>
      </div>

      <table class="timetable-table text-[10px] text-left w-full mb-4">
        <thead>
          <tr class="bg-gray-100 font-bold">
            <th class="py-1 px-2 text-center w-8">ល.រ</th>
            <th class="py-1 px-2 text-center w-12">កូដ</th>
            <th class="py-1 px-2">គោត្តនាម និងនាម</th>
            <th class="py-1 px-2 text-center w-12">ភេទ</th>
            <th class="py-1 px-2">មុខវិជ្ជាឯកទេស</th>
            <th class="py-1 px-2 text-center w-16">ម៉ោងព្រឹក</th>
            <th class="py-1 px-2 text-center w-16">ម៉ោងរសៀល</th>
            <th class="py-1 px-2 text-center w-16">សរុបម៉ោង</th>
            <th class="py-1 px-2 text-center w-20">គ្រូបន្ទុកថ្នាក់</th>
            <th class="py-1 px-2 w-24">លេខទូរស័ព្ទ</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((t, i) => `
            <tr>
              <td class="text-center py-1">${i + 1}</td>
              <td class="text-center font-bold py-1">${t.code}</td>
              <td class="font-bold py-1">${t.name}</td>
              <td class="text-center py-1">${t.gender || 'ប្រុស'}</td>
              <td class="py-1">${t.subject_name}</td>
              <td class="text-center py-1">${t.morning_hours}</td>
              <td class="text-center py-1">${t.afternoon_hours}</td>
              <td class="text-center font-black py-1">${t.total_hours}</td>
              <td class="text-center font-bold py-1">${t.homeroom_class ? 'ថ្នាក់ ' + t.homeroom_class : '-'}</td>
              <td class="py-1">${t.phone || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="grid grid-cols-2 text-center text-xs pt-4 border-t border-gray-300">
        <div>
          <div class="font-bold">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
          <div class="text-[11px] text-gray-600">ការិយាល័យសិក្សា</div>
          <div class="h-14"></div>
          <div class="font-semibold text-gray-400">...................................................</div>
        </div>
        <div>
          <div class="text-[11px] text-gray-500">${info.effective_date}</div>
          <div class="font-bold">នាយកសាលា</div>
          <div class="h-14"></div>
          <div class="font-semibold text-gray-400">...................................................</div>
        </div>
      </div>
    </div>
  `;
  window.print();
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
