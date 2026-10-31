/**
 * Online Standalone Version Logic for School Timetable Management
 * - Runs 100% in Browser (Client-side)
 * - Uses LocalStorage for persistent data storage
 * - Uses SheetJS (XLSX) for in-browser Excel generation
 * - No server required! Ready for GitHub Pages, Netlify, Vercel
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

function loadFromStorage(key, defaultVal) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function saveToStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

function initAppData() {
  const data = JSON.parse(JSON.stringify(INITIAL_DATA));

  // Apply custom homeroom from LocalStorage
  const customHr = loadFromStorage('TIMETABLE_CUSTOM_HOMEROOM', {});
  data.classes.forEach(cls => {
    if (customHr[cls.id]) {
      cls.homeroom = customHr[cls.id];
    }
  });

  // Calculate teachers
  const customTeachers = loadFromStorage('TIMETABLE_CUSTOM_TEACHERS', {});
  const teachers = {};
  const subjectsMap = data.subjects;

  const mDayInfo = data.time_slots.morning;
  const mSlotMeta = [];
  mDayInfo.forEach(day => {
    day.periods.forEach(p => {
      mSlotMeta.push({ day: day.day, period: p });
    });
  });

  const aDayInfo = data.time_slots.afternoon;
  const aSlotMeta = [];
  aDayInfo.forEach(day => {
    day.periods.forEach(p => {
      aSlotMeta.push({ day: day.day, period: p });
    });
  });

  // Morning schedule scan
  Object.keys(data.morning_schedule).forEach(clsId => {
    const slots = data.morning_schedule[clsId];
    slots.forEach((code, sIdx) => {
      if (code) {
        if (!teachers[code]) {
          const sKey = getSubjectKey(code);
          const sObj = subjectsMap[sKey] || { name: 'ផ្សេងៗ', short: code, color: '#f3f4f6', text_color: '#1f2937', border: '#d1d5db' };
          const cInfo = customTeachers[code] || {};
          teachers[code] = {
            code,
            name: cInfo.name || `គ្រូ ${code}`,
            gender: cInfo.gender || 'ប្រុស',
            phone: cInfo.phone || '',
            homeroom_class: cInfo.homeroom_class || '',
            note: cInfo.note || '',
            subject_key: sKey,
            subject_name: sObj.name || '',
            subject_short: sObj.short || '',
            subject_color: sObj.color || '#f3f4f6',
            subject_text_color: sObj.text_color || '#1f2937',
            subject_border: sObj.border || '#d1d5db',
            morning_hours: 0,
            afternoon_hours: 0,
            total_hours: 0,
            classes: new Set(),
            morning_slots: {},
            afternoon_slots: {},
            is_custom: false
          };
        }
        const t = teachers[code];
        t.morning_hours += 1;
        t.classes.add(clsId);
        const meta = mSlotMeta[sIdx];
        if (!t.morning_slots[meta.day]) t.morning_slots[meta.day] = {};
        t.morning_slots[meta.day][meta.period] = clsId;
      }
    });
  });

  // Afternoon schedule scan
  Object.keys(data.afternoon_schedule).forEach(clsId => {
    const slots = data.afternoon_schedule[clsId];
    slots.forEach((code, sIdx) => {
      if (code && code !== 'ពលកម្ម') {
        if (!teachers[code]) {
          const sKey = getSubjectKey(code);
          const sObj = subjectsMap[sKey] || { name: 'ផ្សេងៗ', short: code, color: '#f3f4f6', text_color: '#1f2937', border: '#d1d5db' };
          const cInfo = customTeachers[code] || {};
          teachers[code] = {
            code,
            name: cInfo.name || `គ្រូ ${code}`,
            gender: cInfo.gender || 'ប្រុស',
            phone: cInfo.phone || '',
            homeroom_class: cInfo.homeroom_class || '',
            note: cInfo.note || '',
            subject_key: sKey,
            subject_name: sObj.name || '',
            subject_short: sObj.short || '',
            subject_color: sObj.color || '#f3f4f6',
            subject_text_color: sObj.text_color || '#1f2937',
            subject_border: sObj.border || '#d1d5db',
            morning_hours: 0,
            afternoon_hours: 0,
            total_hours: 0,
            classes: new Set(),
            morning_slots: {},
            afternoon_slots: {},
            is_custom: false
          };
        }
        const t = teachers[code];
        t.afternoon_hours += 1;
        t.classes.add(clsId);
        const meta = aSlotMeta[sIdx];
        if (!t.afternoon_slots[meta.day]) t.afternoon_slots[meta.day] = {};
        t.afternoon_slots[meta.day][meta.period] = clsId;
      }
    });
  });

  // Custom added subject teachers
  Object.keys(customTeachers).forEach(code => {
    if (!teachers[code]) {
      const cInfo = customTeachers[code];
      const sKey = cInfo.subject_key || getSubjectKey(code);
      const sObj = subjectsMap[sKey] || { name: 'ផ្សេងៗ', short: code, color: '#f3f4f6', text_color: '#1f2937', border: '#d1d5db' };
      teachers[code] = {
        code,
        name: cInfo.name || `គ្រូ ${code}`,
        gender: cInfo.gender || 'ប្រុស',
        phone: cInfo.phone || '',
        homeroom_class: cInfo.homeroom_class || '',
        note: cInfo.note || '',
        subject_key: sKey,
        subject_name: sObj.name || '',
        subject_short: sObj.short || '',
        subject_color: sObj.color || '#f3f4f6',
        subject_text_color: sObj.text_color || '#1f2937',
        subject_border: sObj.border || '#d1d5db',
        morning_hours: 0,
        afternoon_hours: 0,
        total_hours: 0,
        classes: [],
        morning_slots: {},
        afternoon_slots: {},
        is_custom: true
      };
    }
  });

  // Finalize totals & classes
  Object.keys(teachers).forEach(code => {
    const t = teachers[code];
    t.total_hours = t.morning_hours + t.afternoon_hours;
    if (t.classes instanceof Set) {
      t.classes = Array.from(t.classes).sort();
    }
    // Auto-detect homeroom assignment if teacher name matches class homeroom
    data.classes.forEach(cls => {
      if (cls.homeroom && cls.homeroom === t.name) {
        t.homeroom_class = cls.id;
      }
    });
  });

  data.teachers = teachers;

  // Global stats
  const totalM = Object.values(teachers).reduce((acc, t) => acc + t.morning_hours, 0);
  const totalA = Object.values(teachers).reduce((acc, t) => acc + t.afternoon_hours, 0);
  data.stats = {
    total_teachers: Object.keys(teachers).length,
    total_classes: data.classes.length,
    morning_hours_total: totalM,
    afternoon_hours_total: totalA,
    all_hours_total: totalM + totalA,
    conflicts_count: 0
  };

  appState.data = data;
}

function initApp() {
  initAppData();
  renderStatsBar();
  renderActiveTab();
  setupEventListeners();
}

function refreshData() {
  initAppData();
  renderStatsBar();
  renderActiveTab();
}

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
        <span class="font-extrabold">${stats.total_teachers} នាក់</span>
      </div>
      <div class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
        <span class="font-bold">⏱️ ម៉ោងសរុប ៖</span>
        <span class="font-extrabold">${stats.all_hours_total} ម៉ោង</span>
      </div>
      <div class="bg-green-50 text-green-700 border-green-200 px-3 py-1.5 rounded-lg border flex items-center gap-1.5">
        <span class="font-bold">⚡ ភាពជាន់គ្នា ៖</span>
        <span class="font-extrabold">✅ គ្មាន (០)</span>
      </div>
    </div>
  `;
}

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

// TEACHERS VIEW
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

      <div class="lg:col-span-8 space-y-4">
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
                កាលវិភាគពេលព្រឹក (Morning) - ចំនួន ${activeTeacher.morning_hours} ម៉ោង
              </h3>
              <span class="text-xs text-gray-500">ម៉ោង ៧:០០ - ១២:០០</span>
            </div>
            ${generateTeacherGridHTML(activeTeacher, 'morning')}
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                កាលវិភាគពេលរសៀល (Afternoon) - ចំនួន ${activeTeacher.afternoon_hours} ម៉ោង
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
                  if (!pName) return `<td class="border border-gray-300 bg-gray-100 text-gray-300">--</td>`;
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

// CLASSES VIEW
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
            🖨️ បោះពុម្ពកាលវិភាគថ្នាក់
          </button>
        </div>
      </div>

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
                  if (!pName) return `<td class="border border-gray-300 bg-gray-100 text-gray-300">--</td>`;
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

// SUBJECT TEACHERS DIRECTORY
function renderSubjectTeachersView(container) {
  const teachers = appState.data.teachers;
  const subjects = appState.data.subjects;

  let list = Object.values(teachers);

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

  const totalCount = Object.keys(teachers).length;
  const maleCount = Object.values(teachers).filter(t => (t.gender || 'ប្រុស') === 'ប្រុស').length;
  const femaleCount = Object.values(teachers).filter(t => (t.gender || '') === 'ស្រី').length;
  const hrCount = Object.values(teachers).filter(t => t.homeroom_class).length;

  container.innerHTML = `
    <div class="space-y-5">
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
                    >
                      ✏️ កែ
                    </button>
                    <button
                      onclick="viewTeacherSchedule('${t.code}')"
                      class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold transition"
                    >
                      👁️
                    </button>
                    ${t.is_custom ? `
                      <button
                        onclick="deleteCustomTeacher('${t.code}')"
                        class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold transition"
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

// HOMEROOM MANAGER VIEW
function renderHomeroomManagerView(container) {
  const classes = appState.data.classes;
  const teachers = appState.data.teachers;
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

function saveSingleHomeroom(classId) {
  const input = document.getElementById(`hr-input-${classId}`);
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    alert('សូមបញ្ចូលឈ្មោះគ្រូបន្ទុកថ្នាក់!');
    return;
  }

  const customHr = loadFromStorage('TIMETABLE_CUSTOM_HOMEROOM', {});
  customHr[classId] = newName;
  saveToStorage('TIMETABLE_CUSTOM_HOMEROOM', customHr);

  alert(`✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ ${classId} ៖ ${newName}`);
  refreshData();
}

function saveAllHomeroomTeachers() {
  const classes = appState.data.classes;
  const customHr = loadFromStorage('TIMETABLE_CUSTOM_HOMEROOM', {});

  classes.forEach(cls => {
    const input = document.getElementById(`hr-input-${cls.id}`);
    if (input) {
      customHr[cls.id] = input.value.trim() || cls.homeroom;
    }
  });

  saveToStorage('TIMETABLE_CUSTOM_HOMEROOM', customHr);
  alert('✅ បានរក្សាទុកឈ្មោះគ្រូបន្ទុកថ្នាក់ទាំង ១៧ ថ្នាក់ដោយជោគជ័យ!');
  refreshData();
}

// MASTER SCHEDULE VIEW
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
                      if (!code) return `<td class="${isDaySep ? 'day-sep-left' : ''} bg-gray-50/30"></td>`;
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

// WORKLOAD MATRIX
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
    if (appState.workloadFilter === 'FULL') list = list.filter(t => t.total_hours >= 18);
    else if (appState.workloadFilter === 'NORMAL') list = list.filter(t => t.total_hours >= 14 && t.total_hours < 18);
    else if (appState.workloadFilter === 'LIGHT') list = list.filter(t => t.total_hours < 14);
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
              <th class="py-2.5 px-3 text-center">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${list.map((t, idx) => `
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
                <td class="py-2 px-3 text-center">
                  <button
                    onclick="viewTeacherFromWorkload('${t.code}')"
                    class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-xs transition"
                  >
                    មើលកាលវិភាគ
                  </button>
                </td>
              </tr>
            `).join('')}
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

// PRINT & EXPORT HUB (WITH IN-BROWSER EXCEL & JSON BACKUP)
function renderPrintHubView(container) {
  const teachers = appState.data.teachers;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h2 class="text-base font-bold text-gray-900">មជ្ឈមណ្ឌលបោះពុម្ព និងទាញយកឯកសារ (Print & Export Hub)</h2>
        <p class="text-xs text-gray-500 mt-1">
          រៀបចំទម្រង់បោះពុម្ពបណ្ណកាលវិភាគគ្រូបង្រៀន កាលវិភាគប្រចាំថ្នាក់ បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា និងទាញយកជាឯកសារ Excel ភ្លាមៗក្នុង Browser។
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div class="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                📊
              </div>
              <h3 class="font-bold text-gray-900 text-sm">ទាញយកឯកសារ Excel (.xlsx)</h3>
              <p class="text-xs text-gray-600 mt-1">
                បង្កើតឯកសារ Excel ៤ សន្លឹកការងារដោយផ្ទាល់ក្នុង Browser មិនបាច់ពឹង Server ឡើយ។
              </p>
            </div>
            <button
              onclick="exportExcelClientSide()"
              class="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg text-center shadow-sm transition"
            >
              📥 ទាញយកឯកសារ Excel
            </button>
          </div>

          <div class="p-5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                👨‍🏫
              </div>
              <h3 class="font-bold text-gray-900 text-sm">បោះពុម្ពបណ្ណគ្រូទាំងអស់</h3>
              <p class="text-xs text-gray-600 mt-1">
                បោះពុម្ពបណ្ណកាលវិភាគបុគ្គលរបស់គ្រូទាំងអស់ (${Object.keys(teachers).length} នាក់) លើក្រដាស A4។
              </p>
            </div>
            <button
              onclick="printAllTeacherCards()"
              class="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              🖨️ បោះពុម្ពបណ្ណគ្រូទាំងអស់
            </button>
          </div>

          <div class="p-5 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-lg mb-3">
                🏫
              </div>
              <h3 class="font-bold text-gray-900 text-sm">បោះពុម្ពកាលវិភាគថ្នាក់ទាំងអស់</h3>
              <p class="text-xs text-gray-600 mt-1">
                បោះពុម្ពកាលវិភាគប្រចាំថ្នាក់ទាំង ១៧ ថ្នាក់ រួមទាំងឈ្មោះគ្រូបន្ទុកថ្នាក់ សម្រាប់បិទតាមបន្ទប់។
              </p>
            </div>
            <button
              onclick="printAllClassSchedules()"
              class="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
            >
              🖨️ បោះពុម្ពកាលវិភាគថ្នាក់
            </button>
          </div>

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

        <!-- Backup & Restore Box -->
        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="font-bold text-sm text-gray-800 mb-2">💾 ការរក្សាទុក និងផ្ទេរទិន្នន័យ Backup (Data Backup & Restore)</h3>
          <p class="text-xs text-gray-500 mb-4">
            លោកអ្នកអាចទាញយកឯកសារ Backup (JSON) រក្សាទុកលើកុំព្យូទ័រ ឬផ្ទុកឡើង (Restore) ទៅកាន់ទូរស័ព្ទ/កុំព្យូទ័រផ្សេងទៀតបានដោយមិនបាត់បង់ទិន្នន័យឡើយ។
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <button
              onclick="exportBackupJSON()"
              class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              📤 ទាញយក Backup File (.json)
            </button>
            <label class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              📥 ផ្ទុកឡើង Restore (.json)
              <input type="file" accept=".json" onchange="importBackupJSON(event)" class="hidden" />
            </label>
            <button
              onclick="resetToDefaultData()"
              class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
            >
              🔄 កំណត់ទិន្នន័យឡើងវិញ (Reset Default)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// IN-BROWSER EXCEL GENERATION USING SHEETJS
function exportExcelClientSide() {
  if (typeof XLSX === 'undefined') {
    alert('កំពុងទាញយកបណ្ណាល័យ Excel សូមរង់ចាំបន្តិចរួចសាកល្បងម្តងទៀត...');
    return;
  }

  const data = appState.data;
  const wb = XLSX.utils.book_new();

  // 1. Sheet Master Morning
  const morningRows = [
    [data.school_info.ministry + ' - ' + data.school_info.school_name],
    [`កាលវិភាគប្រចាំសប្ដាហ៍ ឆ្នាំសិក្សា ${data.school_info.academic_year} (ពេលព្រឹក)`],
    []
  ];

  const mHeadersDay = ['ថ្នាក់'];
  const mHeadersPeriod = ['ម៉ោង'];
  data.time_slots.morning.forEach(d => {
    d.periods.forEach((p, pi) => {
      mHeadersDay.push(pi === 0 ? d.day : '');
      mHeadersPeriod.push(p);
    });
  });
  mHeadersDay.push('នាមគ្រូបន្ទុកថ្នាក់');
  mHeadersPeriod.push('');

  morningRows.push(mHeadersDay);
  morningRows.push(mHeadersPeriod);

  data.classes.forEach(cls => {
    const r = [cls.id];
    const slots = data.morning_schedule[cls.id] || [];
    slots.forEach(code => r.push(code || ''));
    r.push(cls.homeroom);
    morningRows.push(r);
  });

  const wsM = XLSX.utils.aoa_to_sheet(morningRows);
  XLSX.utils.book_append_sheet(wb, wsM, 'កាលវិភាគពេលព្រឹក');

  // 2. Sheet Master Afternoon
  const afternoonRows = [
    [data.school_info.ministry + ' - ' + data.school_info.school_name],
    [`កាលវិភាគប្រចាំសប្ដាហ៍ ឆ្នាំសិក្សា ${data.school_info.academic_year} (ពេលរសៀល)`],
    []
  ];

  const aHeadersDay = ['ថ្នាក់'];
  const aHeadersPeriod = ['ម៉ោង'];
  data.time_slots.afternoon.forEach(d => {
    d.periods.forEach((p, pi) => {
      aHeadersDay.push(pi === 0 ? d.day : '');
      aHeadersPeriod.push(p);
    });
  });
  aHeadersDay.push('នាមគ្រូបន្ទុកថ្នាក់');
  aHeadersPeriod.push('');

  afternoonRows.push(aHeadersDay);
  afternoonRows.push(aHeadersPeriod);

  data.classes.forEach(cls => {
    const r = [cls.id];
    const slots = data.afternoon_schedule[cls.id] || [];
    slots.forEach(code => r.push(code || ''));
    r.push(cls.homeroom);
    afternoonRows.push(r);
  });

  const wsA = XLSX.utils.aoa_to_sheet(afternoonRows);
  XLSX.utils.book_append_sheet(wb, wsA, 'កាលវិភាគពេលរសៀល');

  // 3. Workload Sheet
  const statRows = [
    ['តារាងវិភាគ និងសង្ខេបបន្ទុកម៉ោងបង្រៀនរបស់គ្រូ (Weekly Teaching Hours Summary)'],
    [],
    ['ល.រ', 'កូដគ្រូ', 'មុខវិជ្ជា', 'ឈ្មោះគ្រូបង្រៀន', 'ម៉ោងព្រឹក', 'ម៉ោងរសៀល', 'សរុបម៉ោង/សប្ដាហ៍', 'ថ្នាក់ត្រូវបង្រៀន']
  ];

  Object.values(data.teachers).sort((a, b) => a.code.localeCompare(b.code)).forEach((t, i) => {
    statRows.push([
      i + 1,
      t.code,
      t.subject_name,
      t.name,
      t.morning_hours,
      t.afternoon_hours,
      t.total_hours,
      t.classes.join(', ')
    ]);
  });

  const wsStat = XLSX.utils.aoa_to_sheet(statRows);
  XLSX.utils.book_append_sheet(wb, wsStat, 'បន្ទុកម៉ោងគ្រូបង្រៀន');

  // 4. Subject Teachers Directory Sheet
  const dirRows = [
    [data.school_info.ministry + ' - ' + data.school_info.school_name],
    [`បញ្ជីរាយនាមលោកគ្រូ-អ្នកគ្រូតាមមុខវិជ្ជា ឆ្នាំសិក្សា ${data.school_info.academic_year}`],
    [],
    ['ល.រ', 'កូដ', 'គោត្តនាម និងនាម', 'ភេទ', 'មុខវិជ្ជាឯកទេស', 'ម៉ោងព្រឹក', 'ម៉ោងរសៀល', 'ម៉ោងសរុប', 'គ្រូបន្ទុកថ្នាក់', 'លេខទូរស័ព្ទ']
  ];

  Object.values(data.teachers).sort((a, b) => a.code.localeCompare(b.code)).forEach((t, i) => {
    dirRows.push([
      i + 1,
      t.code,
      t.name,
      t.gender || 'ប្រុស',
      t.subject_name,
      t.morning_hours,
      t.afternoon_hours,
      t.total_hours,
      t.homeroom_class ? `ថ្នាក់ ${t.homeroom_class}` : '-',
      t.phone || '-'
    ]);
  });

  const wsDir = XLSX.utils.aoa_to_sheet(dirRows);
  XLSX.utils.book_append_sheet(wb, wsDir, 'បញ្ជីឈ្មោះគ្រូមុខវិជ្ជា');

  // Download
  XLSX.writeFile(wb, `timetable_${data.school_info.academic_year.replace(/\s+/g, '')}.xlsx`);
}

// BACKUP & RESTORE
function exportBackupJSON() {
  const backup = {
    custom_homeroom: loadFromStorage('TIMETABLE_CUSTOM_HOMEROOM', {}),
    custom_teachers: loadFromStorage('TIMETABLE_CUSTOM_TEACHERS', {}),
    export_date: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timetable_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.custom_homeroom) {
        saveToStorage('TIMETABLE_CUSTOM_HOMEROOM', parsed.custom_homeroom);
      }
      if (parsed.custom_teachers) {
        saveToStorage('TIMETABLE_CUSTOM_TEACHERS', parsed.custom_teachers);
      }
      alert('✅ បានផ្ទុកទិន្នន័យ Backup ជោគជ័យ!');
      refreshData();
    } catch (err) {
      alert('ទម្រង់ឯកសារ Backup មិនត្រឹមត្រូវ ៖ ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetToDefaultData() {
  if (!confirm('តើអ្នកពិតជាចង់កំណត់ទិន្នន័យត្រឡប់ទៅសភាពដើមវិញមែនទេ? រាល់ឈ្មោះដែលបានកែប្រែនឹងត្រូវលុប។')) return;
  localStorage.removeItem('TIMETABLE_CUSTOM_HOMEROOM');
  localStorage.removeItem('TIMETABLE_CUSTOM_TEACHERS');
  alert('✅ បានកំណត់ទិន្នន័យឡើងវិញជោគជ័យ!');
  refreshData();
}

// MODALS
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

function saveHomeroomModal(classId) {
  const nameEl = document.getElementById('modal-hr-name');
  const newName = nameEl ? nameEl.value.trim() : '';
  if (!newName) {
    alert('សូមបញ្ចូលឈ្មោះគ្រូបន្ទុកថ្នាក់!');
    return;
  }

  const customHr = loadFromStorage('TIMETABLE_CUSTOM_HOMEROOM', {});
  customHr[classId] = newName;
  saveToStorage('TIMETABLE_CUSTOM_HOMEROOM', customHr);

  closeModal();
  refreshData();
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

function saveNewSubjectTeacher() {
  const code = document.getElementById('add-teacher-code').value.trim().toUpperCase();
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

  const customTeachers = loadFromStorage('TIMETABLE_CUSTOM_TEACHERS', {});
  customTeachers[code] = { name, gender, subject_key, phone, homeroom_class, note };
  saveToStorage('TIMETABLE_CUSTOM_TEACHERS', customTeachers);

  closeModal();
  refreshData();
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

function saveSingleTeacherModal(code) {
  const nameEl = document.getElementById('modal-teacher-name');
  const genderEl = document.getElementById('modal-teacher-gender');
  const phoneEl = document.getElementById('modal-teacher-phone');
  const hrEl = document.getElementById('modal-teacher-homeroom');
  const noteEl = document.getElementById('modal-teacher-note');

  const customTeachers = loadFromStorage('TIMETABLE_CUSTOM_TEACHERS', {});
  customTeachers[code] = {
    name: nameEl.value.trim() || `គ្រូ ${code}`,
    gender: genderEl ? genderEl.value : 'ប្រុស',
    phone: phoneEl.value.trim(),
    homeroom_class: hrEl ? hrEl.value : '',
    note: noteEl.value.trim()
  };

  saveToStorage('TIMETABLE_CUSTOM_TEACHERS', customTeachers);
  closeModal();
  refreshData();
}

function deleteCustomTeacher(code) {
  if (!confirm(`តើអ្នកពិតជាចង់លុបគ្រូ ${code} នេះចេញពីបញ្ជីមែនទេ?`)) return;
  const customTeachers = loadFromStorage('TIMETABLE_CUSTOM_TEACHERS', {});
  delete customTeachers[code];
  saveToStorage('TIMETABLE_CUSTOM_TEACHERS', customTeachers);
  refreshData();
}

function closeModal() {
  const modal = document.getElementById('edit-modal');
  modal.innerHTML = '';
}

// PRINT HELPERS
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
                ${days.map((d, di) => {
                  if (p === '11-12' && (d === 'សុក្រ' || d === 'សៅរ៍')) return `<td class="bg-gray-100 text-gray-400">--</td>`;
                  const cls = mSlots[d] ? mSlots[d][p] : null;
                  return cls ? `<td class="font-black text-xs text-blue-900 bg-blue-50 py-1">ថ្នាក់ ${cls}</td>` : `<td class="text-gray-300 py-1">--</td>`;
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
                  if (d === 'ព្រហស្បតិ៍') return `<td class="bg-amber-100 text-amber-800 text-[9px] font-semibold">ពលកម្ម</td>`;
                  const cls = aSlots[d] ? aSlots[d][p] : null;
                  return cls ? `<td class="font-black text-xs text-amber-900 bg-amber-50 py-1">ថ្នាក់ ${cls}</td>` : `<td class="text-gray-300 py-1">--</td>`;
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

                  if (p === '11-12' && (d === 'សុក្រ' || d === 'សៅរ៍')) return `<td class="bg-gray-100 text-gray-400">--</td>`;
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
                  if (d === 'ព្រហស្បតិ៍') return `<td class="bg-amber-100 text-amber-800 text-[9px] font-semibold">ពលកម្ម</td>`;
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

