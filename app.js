/* ============================================================
   LearnReminder — app / UI
   ============================================================ */

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let state;

document.addEventListener("DOMContentLoaded", () => {
  state = Store.load();
  setupTabs();
  setupModal();
  bindGlobalButtons();
  renderAll();
});

/* ---------------- navigation ---------------- */
function setupTabs() {
  document.getElementById("tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const view = btn.dataset.view;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".view").forEach(v =>
      v.classList.toggle("hidden", v.dataset.view !== view)
    );
    renderView(view);
  });
}

function renderAll() {
  renderView("today");
}

function renderView(view) {
  switch (view) {
    case "today": renderToday(); break;
    case "plan": renderPlan(); break;
    case "subjects": renderSubjects(); break;
    case "exams": renderExams(); break;
    case "availability": renderAvailability(); break;
    case "settings": renderSettings(); break;
  }
}

function bindGlobalButtons() {
  document.getElementById("add-subject").addEventListener("click", () => openSubjectModal(null));
  document.getElementById("add-exam").addEventListener("click", () => openExamModal(null));
  document.getElementById("regen-plan").addEventListener("click", () => {
    renderPlan();
    toast("Plan regenerated");
  });
}

/* ---------------- TODAY ---------------- */
function renderToday() {
  const now = new Date();
  document.getElementById("today-date").textContent =
    `${WEEKDAY_FULL[now.getDay()]}, ${now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;

  const day = Planner.todayTasks(state);
  const el = document.getElementById("today-content");
  let html = "";

  // Exams today
  for (const ex of day.exams) {
    const subj = Store.subject(ex.subjectId);
    html += `<div class="big-task" style="border-left-color:var(--danger)">
      <h3>📝 EXAM TODAY — ${esc(subj ? subj.name : "")}</h3>
      <div class="less">${esc(ex.label)} at ${esc(ex.time || "")}</div>
    </div>`;
  }

  if (!day.studyable && day.tasks.length === 0) {
    html += `<div class="empty">Today is marked as a non-study day. Enjoy the break! 🌿<br>
      <span class="muted">Change this under Availability.</span></div>`;
  } else if (day.tasks.length === 0) {
    html += `<div class="empty">Nothing scheduled for today. You're on track — or add more lessons/exams.</div>`;
  } else {
    for (const t of day.tasks) {
      if (t.type === "review") {
        html += `<div class="big-task" style="border-left-color:${t.color}">
          <h3>🔁 ${esc(t.subjectName)}</h3>
          <div class="less">${esc(t.lessonName)}</div>
          <div class="meta">Exam coming: <b>${esc(t.examLabel)}</b> on ${fmtDate(t.examDate)} (${daysUntil(t.examDate)})</div>
          ${fileLinks(t.files, "Open material")}
        </div>`;
      } else {
        html += `<div class="big-task" style="border-left-color:${t.color}">
          <h3>${esc(t.subjectName)}</h3>
          <div class="less">📖 ${esc(t.lessonName)}</div>
          <div class="meta">
            ${diffDots(t.difficulty)} difficulty · length ${t.length}/5
            ${t.cram ? ' · <span style="color:var(--danger)">⚠ tight schedule</span>' : ""}
            <br>For <b>${esc(t.examLabel)}</b> on ${fmtDate(t.examDate)} (${daysUntil(t.examDate)})
          </div>
          ${fileLinks(t.files, "Open study material")}
          <div style="margin-top:10px">
            <button class="btn small" onclick="markLessonDone('${t.subjectId}','${t.lessonId}')">✓ Mark lesson done</button>
          </div>
        </div>`;
      }
    }
  }

  // Next exams overview
  html += renderNextExams();
  el.innerHTML = html;
}

function renderNextExams() {
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = state.exams
    .map(e => ({ e, d: new Date(e.date) }))
    .filter(x => x.d >= today)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  if (!upcoming.length) return "";
  let rows = upcoming.map(({ e }) => {
    const subj = Store.subject(e.subjectId);
    return `<tr>
      <td>${esc(subj ? subj.name : "?")}</td>
      <td>${esc(e.label)}</td>
      <td>${fmtDate(e.date)} ${esc(e.time || "")}</td>
      <td>${urgencyPill(e.date)}</td>
    </tr>`;
  }).join("");
  return `<div class="card">
    <div class="card-head"><h3>Upcoming exams</h3></div>
    <table><thead><tr><th>Subject</th><th>Type</th><th>When</th><th>In</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

function markLessonDone(subjectId, lessonId) {
  const subj = Store.subject(subjectId);
  if (!subj) return;
  const les = subj.lessons.find(l => l.id === lessonId);
  if (les) { les.done = true; Store.save(); toast("Lesson marked done"); renderToday(); }
}

/* ---------------- STUDY PLAN ---------------- */
function renderPlan() {
  const days = Planner.build(state);
  const el = document.getElementById("plan-content");
  const visible = days.filter(d => d.tasks.length || d.exams.length);

  if (!visible.length) {
    el.innerHTML = `<div class="empty">No study days to plan. Add lessons & exams, and check your availability.</div>`;
    return;
  }

  let html = `<div class="card">`;
  for (const d of visible) {
    html += `<div class="plan-day">
      <div class="plan-date">
        <div class="d">${fmtDateShort(d.iso)}</div>
        <div class="wd">${WEEKDAY_NAMES[d.weekday]}</div>
      </div>
      <div class="plan-tasks">`;
    for (const ex of d.exams) {
      const subj = Store.subject(ex.subjectId);
      html += `<div class="plan-exam">📝 EXAM — ${esc(subj ? subj.name : "")} (${esc(ex.label)}) ${esc(ex.time || "")}</div>`;
    }
    for (const t of d.tasks) {
      if (t.type === "review") {
        html += `<div class="plan-task" style="border-left-color:${t.color}">
          <div class="subj">🔁 ${esc(t.subjectName)}</div>
          <div class="less">${esc(t.lessonName)}</div>
        </div>`;
      } else {
        html += `<div class="plan-task" style="border-left-color:${t.color}">
          <div class="subj">${esc(t.subjectName)}${t.cram ? ' ⚠' : ''}</div>
          <div class="less">📖 ${esc(t.lessonName)} · ${diffDots(t.difficulty)}</div>
        </div>`;
      }
    }
    if (!d.tasks.length && !d.exams.length && d.studyable) {
      html += `<div class="plan-rest">Free / buffer</div>`;
    }
    html += `</div></div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

/* ---------------- SUBJECTS ---------------- */
function renderSubjects() {
  const el = document.getElementById("subjects-content");
  if (!state.subjects.length) {
    el.innerHTML = `<div class="empty">No subjects yet. Add your first subject.</div>`;
    return;
  }
  el.innerHTML = state.subjects.map(s => {
    const done = s.lessons.filter(l => l.done).length;
    const pct = s.lessons.length ? Math.round((done / s.lessons.length) * 100) : 0;
    const lessons = s.lessons.map(l => `
      <div class="lesson-row">
        <input type="checkbox" class="checkbox" ${l.done ? "checked" : ""}
          onchange="toggleLesson('${s.id}','${l.id}', this.checked)">
        <span class="lesson-name ${l.done ? "lesson-done" : ""}">${esc(l.name)}</span>
        <span class="muted" style="font-size:12px">len ${l.length}/5 · ${diffDots(l.difficulty)}</span>
        <button class="icon-btn" title="Edit" onclick="openLessonModal('${s.id}','${l.id}')">✎</button>
        <button class="icon-btn" title="Delete" onclick="deleteLesson('${s.id}','${l.id}')">🗑</button>
      </div>`).join("");

    const files = s.files.map(f => {
      // Repo files link by relative path and open in a new tab; uploaded files
      // are base64 data URLs that download.
      const href = f.path ? esc(f.path) : f.data;
      const attrs = f.path ? `target="_blank" rel="noopener"` : `download="${esc(f.name)}"`;
      return `
      <span class="file-chip">
        <a href="${href}" ${attrs}>📎 ${esc(f.name)}</a>
        <span class="x" title="Remove" onclick="removeFile('${s.id}','${f.id}')">✕</span>
      </span>`;
    }).join("");

    return `<div class="card">
      <div class="card-head">
        <div>
          <h3 style="border-left:4px solid ${s.color};padding-left:10px">${esc(s.name)}</h3>
          <div class="subj-meta">${esc(s.code || "")} · overall difficulty ${diffDots(s.difficulty)} · ${done}/${s.lessons.length} lessons done</div>
        </div>
        <div class="row">
          <button class="btn small" onclick="openSubjectModal('${s.id}')">Edit</button>
          <button class="btn small danger" onclick="deleteSubject('${s.id}')">Delete</button>
        </div>
      </div>
      <div class="progress"><div style="width:${pct}%"></div></div>

      <div style="margin-top:14px">
        <div class="row" style="justify-content:space-between">
          <b>Lessons / topics</b>
          <button class="btn small" onclick="openLessonModal('${s.id}', null)">+ Add lesson</button>
        </div>
        <div style="margin-top:6px">${lessons || '<div class="muted">No lessons yet.</div>'}</div>
      </div>

      <div style="margin-top:14px">
        <div class="row" style="justify-content:space-between">
          <b>Study material (files)</b>
          <label class="btn small" style="display:inline-block;cursor:pointer">
            + Attach files
            <input type="file" multiple style="display:none" onchange="attachFiles('${s.id}', this.files)">
          </label>
        </div>
        <div style="margin-top:6px">${files || '<div class="muted">No files attached.</div>'}</div>
      </div>
    </div>`;
  }).join("");
}

function toggleLesson(subjectId, lessonId, checked) {
  const les = Store.subject(subjectId).lessons.find(l => l.id === lessonId);
  if (les) { les.done = checked; Store.save(); renderSubjects(); }
}
function deleteLesson(subjectId, lessonId) {
  if (!confirm("Delete this lesson?")) return;
  const s = Store.subject(subjectId);
  s.lessons = s.lessons.filter(l => l.id !== lessonId);
  Store.save(); renderSubjects();
}
function deleteSubject(id) {
  if (!confirm("Delete this subject and its exams?")) return;
  state.subjects = state.subjects.filter(s => s.id !== id);
  state.exams = state.exams.filter(e => e.subjectId !== id);
  Store.save(); renderSubjects();
}

function attachFiles(subjectId, fileList) {
  const s = Store.subject(subjectId);
  const files = Array.from(fileList);
  let pending = files.length;
  if (!pending) return;
  files.forEach(file => {
    if (file.size > 4 * 1024 * 1024) {
      alert(`"${file.name}" is larger than 4 MB and may not fit in browser storage. Skipped.`);
      if (--pending === 0) finish();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      s.files.push({ id: "file-" + Math.random().toString(36).slice(2, 9), name: file.name, data: reader.result });
      if (--pending === 0) finish();
    };
    reader.onerror = () => { if (--pending === 0) finish(); };
    reader.readAsDataURL(file);
  });
  function finish() { Store.save(); renderSubjects(); toast("Files attached"); }
}
function removeFile(subjectId, fileId) {
  const s = Store.subject(subjectId);
  s.files = s.files.filter(f => f.id !== fileId);
  Store.save(); renderSubjects();
}

/* ---------------- EXAMS ---------------- */
function renderExams() {
  const el = document.getElementById("exams-content");
  const sorted = [...state.exams].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!sorted.length) {
    el.innerHTML = `<div class="empty">No exams yet. Add one.</div>`;
    return;
  }
  const rows = sorted.map(e => {
    const subj = Store.subject(e.subjectId);
    return `<tr>
      <td>${esc(subj ? subj.name : "?")}</td>
      <td>${esc(e.label)}</td>
      <td>${fmtDate(e.date)}</td>
      <td>${esc(e.time || "")}</td>
      <td>${urgencyPill(e.date)}</td>
      <td style="text-align:right">
        <button class="btn small" onclick="openExamModal('${e.id}')">Edit</button>
        <button class="btn small danger" onclick="deleteExam('${e.id}')">Delete</button>
      </td>
    </tr>`;
  }).join("");
  el.innerHTML = `<div class="card"><table>
    <thead><tr><th>Subject</th><th>Type</th><th>Date</th><th>Time</th><th>In</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
function deleteExam(id) {
  if (!confirm("Delete this exam?")) return;
  state.exams = state.exams.filter(e => e.id !== id);
  Store.save(); renderExams();
}

/* ---------------- AVAILABILITY ---------------- */
function renderAvailability() {
  const el = document.getElementById("availability-content");
  const a = state.availability;
  const wdBtns = WEEKDAY_NAMES.map((n, i) =>
    `<button class="weekday-btn ${a.weekdays[i] ? "on" : ""}" onclick="toggleWeekday(${i})">${n}</button>`
  ).join("");

  const blocked = a.blockedDates.sort().map(d =>
    `<span class="file-chip">🚫 ${fmtDate(d)} <span class="x" onclick="unblockDate('${d}')">✕</span></span>`
  ).join("");

  el.innerHTML = `
    <div class="card">
      <label>Weekdays you can study</label>
      <div class="weekday-grid">${wdBtns}</div>

      <div class="field" style="margin-top:16px;max-width:240px">
        <label>Study hours per available day</label>
        <input type="number" min="0.5" step="0.5" value="${a.hoursPerDay}"
          onchange="setHoursPerDay(this.value)">
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Blocked dates</h3></div>
      <p class="muted">Specific days you can't study at all (holidays, work, travel).</p>
      <div class="field-inline" style="max-width:360px;align-items:flex-end">
        <div class="field grow"><label>Add a blocked date</label><input type="date" id="block-date-input"></div>
        <div class="field"><button class="btn" onclick="addBlockedDate()">Block</button></div>
      </div>
      <div>${blocked || '<div class="muted">No blocked dates.</div>'}</div>
    </div>`;
}
function toggleWeekday(i) {
  state.availability.weekdays[i] = !state.availability.weekdays[i];
  Store.save(); renderAvailability();
}
function setHoursPerDay(v) {
  state.availability.hoursPerDay = Math.max(0.5, parseFloat(v) || 1);
  Store.save();
}
function addBlockedDate() {
  const v = document.getElementById("block-date-input").value;
  if (!v) return;
  if (!state.availability.blockedDates.includes(v)) state.availability.blockedDates.push(v);
  Store.save(); renderAvailability();
}
function unblockDate(d) {
  state.availability.blockedDates = state.availability.blockedDates.filter(x => x !== d);
  Store.save(); renderAvailability();
}

/* ---------------- SETTINGS ---------------- */
function renderSettings() {
  const el = document.getElementById("settings-content");
  const s = state.settings;
  el.innerHTML = `
    <div class="card">
      <div class="field">
        <label>Study strategy</label>
        <select onchange="setStrategy(this.value)">
          <option value="sequential" ${s.strategy === "sequential" ? "selected" : ""}>Sequential — finish one subject, then the next</option>
        </select>
        <p class="muted">You chose sequential. More strategies can be added later.</p>
      </div>
      <div class="field">
        <label><input type="checkbox" class="checkbox" ${s.reviewDayBeforeExam ? "checked" : ""}
          onchange="setReviewDay(this.checked)" style="display:inline-block;vertical-align:middle;margin-right:6px">
          Reserve the last study day before each exam for review</label>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Data</h3></div>
      <p class="muted">Everything is stored in this browser only. Export to keep a backup or move devices.</p>
      <div class="row">
        <button class="btn" onclick="exportData()">⬇ Export data (JSON)</button>
        <label class="btn" style="cursor:pointer">⬆ Import data
          <input type="file" accept="application/json" style="display:none" onchange="importData(this.files)">
        </label>
        <button class="btn danger" onclick="resetData()">Reset to defaults</button>
      </div>
    </div>`;
}
function setStrategy(v) { state.settings.strategy = v; Store.save(); }
function setReviewDay(v) { state.settings.reviewDayBeforeExam = v; Store.save(); }

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "learnreminder-backup.json"; a.click();
  URL.revokeObjectURL(url);
}
function importData(files) {
  const file = files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.subjects || !data.exams) throw new Error("bad file");
      Store.state = data; Store.save(); state = Store.state;
      toast("Data imported"); renderSettings();
    } catch (e) { alert("Invalid backup file."); }
  };
  reader.readAsText(file);
}
function resetData() {
  if (!confirm("Reset everything to the default seeded data? This erases your changes and files.")) return;
  Store.reset(); state = Store.state; toast("Reset done"); renderSettings();
}

/* ---------------- MODAL ---------------- */
let modalConfirm = null;
function setupModal() {
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}
function openModal(title, bodyHtml, onConfirm, confirmLabel = "Save") {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-foot").innerHTML =
    `<button class="btn" id="modal-cancel">Cancel</button>
     <button class="btn primary" id="modal-ok">${confirmLabel}</button>`;
  document.getElementById("modal-cancel").onclick = closeModal;
  document.getElementById("modal-ok").onclick = () => { if (onConfirm() !== false) closeModal(); };
  document.getElementById("modal-backdrop").classList.remove("hidden");
}
function closeModal() { document.getElementById("modal-backdrop").classList.add("hidden"); }

function openSubjectModal(id) {
  const s = id ? Store.subject(id) : null;
  openModal(s ? "Edit subject" : "Add subject", `
    <div class="field"><label>Name</label><input id="m-name" value="${s ? esc(s.name) : ""}"></div>
    <div class="field"><label>Code (optional)</label><input id="m-code" value="${s ? esc(s.code || "") : ""}"></div>
    <div class="field"><label>Overall difficulty (1–5)</label>
      <input id="m-diff" type="number" min="1" max="5" value="${s ? s.difficulty : 3}"></div>
    <div class="field"><label>Color</label><input id="m-color" type="color" value="${s ? s.color : "#4f9cf9"}" style="height:40px"></div>
  `, () => {
    const name = document.getElementById("m-name").value.trim();
    if (!name) { alert("Name required"); return false; }
    const diff = clamp(parseInt(document.getElementById("m-diff").value) || 3, 1, 5);
    const code = document.getElementById("m-code").value.trim();
    const color = document.getElementById("m-color").value;
    if (s) { s.name = name; s.code = code; s.difficulty = diff; s.color = color; }
    else {
      state.subjects.push({
        id: "subj-" + Math.random().toString(36).slice(2, 9),
        name, code, difficulty: diff, color, lessons: [], files: [],
      });
    }
    Store.save(); renderSubjects(); toast("Saved");
  });
}

function openLessonModal(subjectId, lessonId) {
  const s = Store.subject(subjectId);
  const l = lessonId ? s.lessons.find(x => x.id === lessonId) : null;
  openModal(l ? "Edit lesson" : "Add lesson", `
    <div class="field"><label>Lesson / topic name</label><input id="m-lname" value="${l ? esc(l.name) : ""}"></div>
    <div class="field-inline">
      <div class="field"><label>Material length (1–5)</label>
        <input id="m-len" type="number" min="1" max="5" value="${l ? l.length : 3}"></div>
      <div class="field"><label>Difficulty (1–5)</label>
        <input id="m-ldiff" type="number" min="1" max="5" value="${l ? l.difficulty : 3}"></div>
    </div>
    <p class="muted">Length and difficulty decide how many study days this topic gets.</p>
  `, () => {
    const name = document.getElementById("m-lname").value.trim();
    if (!name) { alert("Name required"); return false; }
    const len = clamp(parseInt(document.getElementById("m-len").value) || 3, 1, 5);
    const diff = clamp(parseInt(document.getElementById("m-ldiff").value) || 3, 1, 5);
    if (l) { l.name = name; l.length = len; l.difficulty = diff; }
    else { s.lessons.push(mkLesson(name, len, diff)); }
    Store.save(); renderSubjects(); toast("Saved");
  });
}

function openExamModal(id) {
  const e = id ? Store.exam(id) : null;
  const opts = state.subjects.map(s =>
    `<option value="${s.id}" ${e && e.subjectId === s.id ? "selected" : ""}>${esc(s.name)}</option>`
  ).join("");
  openModal(e ? "Edit exam" : "Add exam", `
    <div class="field"><label>Subject</label><select id="m-subj">${opts}</select></div>
    <div class="field"><label>Type / label (e.g. zh1, pótzh)</label>
      <input id="m-label" value="${e ? esc(e.label) : "zh"}"></div>
    <div class="field-inline">
      <div class="field"><label>Date</label><input id="m-date" type="date" value="${e ? e.date : ""}"></div>
      <div class="field"><label>Time</label><input id="m-time" type="time" value="${e ? e.time || "" : ""}"></div>
    </div>
  `, () => {
    const subjectId = document.getElementById("m-subj").value;
    const label = document.getElementById("m-label").value.trim() || "zh";
    const date = document.getElementById("m-date").value;
    const time = document.getElementById("m-time").value;
    if (!subjectId) { alert("Pick a subject (add one first)"); return false; }
    if (!date) { alert("Date required"); return false; }
    if (e) { e.subjectId = subjectId; e.label = label; e.date = date; e.time = time; }
    else { state.exams.push(mkExam(subjectId, label, date, time)); }
    Store.save(); renderExams(); toast("Saved");
  });
}

/* ---------------- helpers ---------------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/* Render a compact set of "open material" links for a task.
   Handles both repo files (path, open in new tab) and uploaded files
   (base64 data URL, download). Returns "" if there are no files. */
function fileLinks(files, label) {
  if (!files || !files.length) return "";
  const chips = files.map(f => {
    const href = f.path ? esc(f.path) : f.data;
    const attrs = f.path ? `target="_blank" rel="noopener"` : `download="${esc(f.name)}"`;
    return `<a class="file-chip" href="${href}" ${attrs}>📎 ${esc(f.name)}</a>`;
  }).join("");
  return `<div style="margin-top:10px">
    <div class="muted" style="font-size:12px;margin-bottom:4px">${esc(label || "Material")}</div>
    <div>${chips}</div>
  </div>`;
}
function diffDots(n) {
  let d = "";
  for (let i = 1; i <= 5; i++) d += `<span class="dot ${i <= n ? "on" : ""}"></span>`;
  return `<span class="diff-dots">${d}</span>`;
}
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function daysUntil(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const n = Math.round((d - today) / 86400000);
  if (n < 0) return "passed";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
}
function urgencyPill(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const n = Math.round((d - today) / 86400000);
  if (n < 0) return `<span class="pill done">passed</span>`;
  if (n <= 3) return `<span class="pill urgent">${daysUntil(iso)}</span>`;
  if (n <= 10) return `<span class="pill soon">${daysUntil(iso)}</span>`;
  return `<span class="pill ok">${daysUntil(iso)}</span>`;
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 1800);
}
