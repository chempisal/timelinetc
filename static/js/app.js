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
  selectedTeacherCode: 'K1',
  selectedClassId: '12A',
  masterShift: 'morning',
  masterHighlightCode: '',
  teacherSearchQuery: '',
  teacherSubjectFilter: 'ALL',
  directorySubjectFilter: 'ALL',
  directorySearchQuery: '',
  workloadFilter: 'ALL',
  workloadSearch: ''
};

const PREFIX_MAP = ['Ed', 'En', 'Es', 'Em', 'K', 'M', 'P', 'C', 'B', 'H', 'G', 'I'];

function getSubjectKey(code) {
  if (!code || code === 'ពលកម្ម') return '';
  for (const p of PREFIX_MAP) {
    if (code.startsWith(p)) return p;
  }
  return '';
}

// LocalStorage helpers for persistent changes on serverless/static environments
function getLocalCustomHomeroom() {
  try {
    return JSON.parse(localStorage.getItem('timeline_custom_homeroom') || '{}');
  } catch (e) {
    return {};
  }
}

function setLocalCustomHomeroom(map) {
  try {
    const cur = getLocalCustomHomeroom();
    Object.assign(cur, map);
    localStorage.setItem('timeline_custom_homeroom', JSON.stringify(cur));
  } catch (e) {}
}

function getLocalCustomTeachers() {
  try {
    return JSON.parse(localStorage.getItem('timeline_custom_teachers') || '{}');
  } catch (e) {
    return {};
  }
}

function setLocalCustomTeachers(map) {
  try {
    const cur = getLocalCustomTeachers();
    Object.assign(cur, map);
    localStorage.setItem('timeline_custom_teachers', JSON.stringify(cur));
  } catch (e) {}
}

function applyLocalStorageOverrides() {
  if (!appState.data) return;
  const hrMap = getLocalCustomHomeroom();
  if (appState.data.classes) {
    for (const cls of appState.data.classes) {
      if (hrMap[cls.id]) {
        cls.homeroom = hrMap[cls.id];
      }
    }
  }

  const tMap = getLocalCustomTeachers();
  if (appState.data.teachers) {
    for (const [code, info] of Object.entries(tMap)) {
      if (appState.data.teachers[code]) {
        if (typeof info === 'string') {
          appState.data.teachers[code].name = info;
        } else if (typeof info === 'object') {
          Object.assign(appState.data.teachers[code], info);
        }
      }
    }
  }
}

// Fetch initial data
async function initApp() {
  // 1. Instant hydration from pre-rendered window.INITIAL_DATA
  if (window.INITIAL_DATA && window.INITIAL_DATA.status === 'success') {
    appState.data = window.INITIAL_DATA;
    applyLocalStorageOverrides();
    const codes = Object.keys(appState.data.teachers || {});
    if (codes.length > 0 && !codes.includes(appState.selectedTeacherCode)) {
      appState.selectedTeacherCode = codes[0];
    }
    renderStatsBar();
    renderActiveTab();
    setupEventListeners();
  }

  // 2. Fetch or sync latest data from /api/data
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        const hadData = !!appState.data;
        appState.data = json;
        applyLocalStorageOverrides();
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
}

// Refresh data from server without full reload
async function refreshData(callback) {
  try {
    const res = await fetch('/api/data');
    const json = await res.json();
    if (json.status === 'success') {
      appState.data = json;
      applyLocalStorageOverrides();
      renderStatsBar();
      renderActiveTab();
      if (callback) callback();
    }
  } catch (err) {
    console.error('Refresh error:', err);
    applyLocalStorageOverrides();
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
        <!-- Top Teacher Profile Card -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-sm" style="background-color: ${activeTeacher.subject_color}; color: ${activeTeacher.subject_text_color}; border: 2px solid ${activeTeacher.subject_border}">
                ${activeTeacher.code}
              </span>
              <div>
                <div class="flex items-center gap-2">
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

            <div class="flex items-center gap-2">
              <button
                onclick="printSingleTeacherCard('${activeTeacher.code}')"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
              >
                🖨️ បោះពុម្ពបណ្ណកាលវិភាគ
              </button>
              <button
                onclick="openEditTeacherModal('${activeTeacher.code}')"
                class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold border border-gray-300 transition"
              >
                ✏️ កែព័ត៌មាន
              </button>
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
          <div class="w-14 h-14 rounded-xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-sm">
            ${activeClass.id}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-gray-900">កាលវិភាគថ្នាក់ ${activeClass.id} (${activeClass.level})</h2>
              <span class="px-2.5 py-0.5 text-xs bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200">
                ថ្នាក់ទី ${activeClass.grade}
              </span>
            </div>
            <div class="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1.5">
                👨‍🏫 នាមគ្រូបន្ទុកថ្នាក់ ៖
                <strong class="text-blue-900 font-bold text-sm">${activeClass.homeroom}</strong>
                <button
                  onclick="openEditHomeroomModal('${activeClass.id}')"
                  class="ml-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded border border-amber-300 transition"
                >
                  ✏️ កែនាម
                </button>
              </span>
              <span>•</span>
              <span>ម៉ោងសិក្សាសរុប ៖ <strong>${totalClassHours} ម៉ោង/សប្ដាហ៍</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick="openEditHomeroomModal('${activeClass.id}')"
            class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-1.5"
          >
            ✏️ កែនាមគ្រូបន្ទុកថ្នាក់
          </button>
          <button
            onclick="printSingleClass('${activeClass.id}')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition"
          >
            🖨️ បោះពុម្ពកាលវិភាគថ្នាក់នេះ
          </button>
        </div>
      </div>

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
          <button
            onclick="openAddSubjectTeacherModal()"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            ➕ បន្ថែមគ្រូមុខវិជ្ជាថ្មី
          </button>
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
                    <button
                      onclick="openEditTeacherModal('${t.code}')"
                      class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                      title="កែប្រែព័ត៌មាន"
                    >
                      ✏️ កែ
                    </button>
                    <button
                      onclick="viewTeacherSchedule('${t.code}')"
                      class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition"
                      title="មើលកាលវិភាគ"
                    >
                      👁️ កាលវិភាគ
                    </button>
                    ${t.is_custom ? `
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

  // Extract list of all teachers for dropdown
  const teacherList = Object.values(teachers).sort((a, b) => a.name.localeCompare(b.name, 'km'));

  container.innerHTML = `
    <div class="space-y-5">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900">គ្រប់គ្រង និងកែនាមគ្រូបន្ទុកថ្នាក់ (Homeroom Teachers Manager)</h2>
          <p class="text-xs text-gray-500 mt-1">
            កែប្រែ ឬចាត់តាំងគ្រូបន្ទុកថ្នាក់សម្រាប់ថ្នាក់នីមួយៗ (១២A ដល់ ៧C)។ ឈ្មោះដែលបានកែប្រែ នឹងត្រូវធ្វើបច្ចុប្បន្នភាពលើកាលវិភាគរួម កាលវិភាគថ្នាក់ និងឯកសារបោះពុម្ពទាំងអស់។
          </p>
        </div>
        <button
          onclick="saveAllHomeroomTeachers()"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5"
        >
          💾 រក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ទាំងអស់
        </button>
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
                    class="w-full text-xs font-bold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </td>
                <td class="py-3 px-3">
                  <select
                    onchange="applyTeacherToHomeroomInput('${cls.id}', this.value)"
                    class="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none"
                  >
                    <option value="">-- ជ្រើសរើសគ្រូពីបញ្ជី --</option>
                    ${teacherList.map(t => `
                      <option value="${t.name}">${t.name} (${t.code} - ${t.subject_short})</option>
                    `).join('')}
                  </select>
                </td>
                <td class="py-3 px-3 text-center">
                  <button
                    onclick="saveSingleHomeroom('${cls.id}')"
                    class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-xs transition"
                  >
                    💾 រក្សាទុក
                  </button>
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

  setLocalCustomHomeroom({ [classId]: newName });

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: classId, homeroom: newName })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert(`✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ ${classId} ៖ ${newName}`);
      refreshData();
    }
  } catch (err) {
    alert(`✅ បានរក្សាទុកក្នុងកម្មវិធីរុករក (Browser) សម្រាប់ថ្នាក់ ${classId} ៖ ${newName}`);
    refreshData();
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

  setLocalCustomHomeroom(homeroomMap);

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeroom_map: homeroomMap })
    });
    const result = await res.json();
    if (result.status === 'success') {
      alert('✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ទាំង ១៧ ថ្នាក់ដោយជោគជ័យ!');
      refreshData();
    }
  } catch (err) {
    alert('✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ក្នុងកម្មវិធីរុករក (Browser) រួចរាល់!');
    refreshData();
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

  setLocalCustomHomeroom({ [classId]: newName });

  try {
    const res = await fetch('/api/save-homeroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_id: classId, homeroom: newName })
    });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal();
      refreshData();
    }
  } catch (err) {
    closeModal();
    refreshData();
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
  setLocalCustomTeachers({ [code]: payload });

  try {
    const res = await fetch('/api/add-subject-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal();
      refreshData();
    } else {
      closeModal();
      refreshData();
    }
  } catch (err) {
    closeModal();
    refreshData();
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

  setLocalCustomTeachers(payload);

  try {
    const res = await fetch('/api/save-teacher-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      closeModal();
      refreshData();
    }
  } catch (err) {
    closeModal();
    refreshData();
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
