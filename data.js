/* ============================================================
   LearnReminder — data layer
   Stores everything in localStorage. Pre-seeds with the user's
   current-semester subjects and exam dates from their schedule.
   ============================================================ */

const STORAGE_KEY = "learnreminder.v1";

/* Default seed data. Subjects, lessons, exams, availability.
   Exam dates taken from the uploaded ZH schedule screenshots.
   Everything here is editable in the UI. */
function seedData() {
  return {
    version: 1,
    subjects: [
      {
        id: "subj-bszf",
        name: "Beágyazott szoftverrendszerek a gyakorlatban",
        code: "BSZF",
        difficulty: 4,
        color: "#f87171",
        // Lessons seeded from the uploaded BSZF PDFs (lectures + practices).
        // Length weighted by PDF size (more material = higher length).
        lessons: [
          mkLesson("Előadás 1 — Bevezető", 2, 2),
          mkLesson("Előadás 2-3 — CMSIS", 4, 4),
          mkLesson("Előadás 4 — Megszakítás, C, megosztott változók", 3, 4),
          mkLesson("Előadás 5 — DMA", 3, 4),
          mkLesson("Előadás 6 — Layers", 5, 4),
          mkLesson("Előadás 7 — Modes", 3, 3),
          mkLesson("Előadás 8 — Modes 2 / Energy Saving", 4, 4),
          mkLesson("Gyakorlat 1", 2, 2),
          mkLesson("Gyakorlat 2", 2, 2),
          mkLesson("Gyakorlat 3", 2, 3),
          mkLesson("Gyakorlat 4", 2, 3),
          mkLesson("Gyakorlat 5", 3, 3),
          mkLesson("Gyakorlat 6", 2, 3),
          mkLesson("Gyakorlat 7", 3, 3),
        ],
        // Pre-linked to your uploaded files (relative paths in the repo).
        files: [
          mkRepoFile("BSzF_1_bevezeto_2026.pdf", "BSZF/Eloadas/BSzF_1_bevezeto_2026.pdf"),
          mkRepoFile("BSzF_2-3_CMSIS_1.pdf", "BSZF/Eloadas/BSzF_2-3_CMSIS_1.pdf"),
          mkRepoFile("BSzF_4_megszakitas_C_megosztott_valt.pdf", "BSZF/Eloadas/BSzF_4_megszakitas_C_megosztott_valt.pdf"),
          mkRepoFile("BRSZF_ea_05_DMA_2026.pdf", "BSZF/Eloadas/BRSZF_ea_05_DMA_2026.pdf"),
          mkRepoFile("BRSZF_ea_06_Layers_2026.pdf", "BSZF/Eloadas/BRSZF_ea_06_Layers_2026.pdf"),
          mkRepoFile("BRSZF_ea_07_Modes_2026.pdf", "BSZF/Eloadas/BRSZF_ea_07_Modes_2026.pdf"),
          mkRepoFile("BRSZF_ea_08_Modes_2_EnergySaving_2026.pdf", "BSZF/Eloadas/BRSZF_ea_08_Modes_2_EnergySaving_2026.pdf"),
          mkRepoFile("BSzF_gyak_1.pdf", "BSZF/Gyakorlat/BSzF_gyak_1.pdf"),
          mkRepoFile("BSzF_gyak_2.pdf", "BSZF/Gyakorlat/BSzF_gyak_2.pdf"),
          mkRepoFile("BSzF_gyak_3.pdf", "BSZF/Gyakorlat/BSzF_gyak_3.pdf"),
          mkRepoFile("BSzF_gyak_4.pdf", "BSZF/Gyakorlat/BSzF_gyak_4.pdf"),
          mkRepoFile("BSzF_gyak_5_v2026.pdf", "BSZF/Gyakorlat/BSzF_gyak_5_v2026.pdf"),
          mkRepoFile("gyak_06_BSzF.pdf", "BSZF/Gyakorlat/gyak_06_BSzF.pdf"),
          mkRepoFile("BSzF_gyak_07.pdf", "BSZF/Gyakorlat/BSzF_gyak_07.pdf"),
        ],
      },
      {
        id: "subj-menedzsment",
        name: "Menedzsment és vállalkozásgazdaságtan",
        code: "GT20A001",
        difficulty: 3, // 1..5
        color: "#4f9cf9",
        lessons: [
          mkLesson("Bevezetés, vállalkozási alapfogalmak", 2, 2),
          mkLesson("Vállalati gazdaságtan alapjai", 3, 3),
          mkLesson("Menedzsment funkciók", 3, 3),
          mkLesson("Szervezeti formák", 2, 2),
          mkLesson("Döntéshozatal", 2, 3),
          mkLesson("Pénzügyi alapok, költségszámítás", 4, 4),
        ],
        files: [],
      },
      {
        id: "subj-mikrokontroller",
        name: "Mikrokontroller alapú rendszerek",
        code: "VIAUAC12",
        difficulty: 4,
        color: "#34d399",
        lessons: [
          mkLesson("Mikrokontroller architektúra", 3, 4),
          mkLesson("GPIO és perifériák", 3, 3),
          mkLesson("Megszakítások (interrupts)", 3, 4),
          mkLesson("Timerek és PWM", 3, 4),
          mkLesson("Soros kommunikáció (UART/SPI/I2C)", 4, 4),
          mkLesson("ADC/DAC", 2, 3),
        ],
        files: [],
      },
      {
        id: "subj-informatika2",
        name: "Informatika2",
        code: "VIAUAC10",
        difficulty: 3,
        color: "#fbbf24",
        lessons: [
          mkLesson("Adatszerkezetek áttekintés", 3, 3),
          mkLesson("Algoritmusok és komplexitás", 4, 4),
          mkLesson("Objektumorientált programozás", 3, 3),
          mkLesson("Rekurzió", 2, 3),
          mkLesson("Rendezés és keresés", 3, 3),
        ],
        files: [],
      },
    ],
    exams: [
      // Beágyazott szoftverrendszerek a gyakorlatban (BSZF) — next exam
      mkExam("subj-bszf", "zh", "2026-11-13", "14:00"),
      // Menedzsment és vállalkozásgazdaságtan (GT20A001)
      mkExam("subj-menedzsment", "zh1", "2026-10-20", "14:00"),
      mkExam("subj-menedzsment", "zh2", "2026-12-03", "14:00"),
      mkExam("subj-menedzsment", "pzh1 (pótlás)", "2026-12-08", "14:00"),
      mkExam("subj-menedzsment", "pzh2 (pótlás)", "2026-12-10", "14:00"),
      // Mikrokontroller alapú rendszerek (VIAUAC12)
      mkExam("subj-mikrokontroller", "zh", "2026-11-03", "18:00"),
      mkExam("subj-mikrokontroller", "pzh (pótlás)", "2026-11-17", "18:00"),
      // Informatika2 (VIAUAC10)
      mkExam("subj-informatika2", "zh", "2026-12-04", "14:00"),
      mkExam("subj-informatika2", "pót zh", "2026-12-11", "14:00"),
      mkExam("subj-informatika2", "pótpót zh", "2026-12-18", "08:00"),
    ],
    availability: {
      // Which weekdays you can study. 0=Sun ... 6=Sat
      weekdays: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
      // Default study hours per available weekday
      hoursPerDay: 3,
      // Specific blocked dates (ISO yyyy-mm-dd) you can't study at all
      blockedDates: [],
    },
    settings: {
      // "sequential" = finish one subject then move to next (user's choice)
      strategy: "sequential",
      // reserve a day right before each exam for final review
      reviewDayBeforeExam: true,
    },
  };
}

function mkLesson(name, length, difficulty) {
  return {
    id: "les-" + Math.random().toString(36).slice(2, 9),
    name,
    length,      // relative material length 1..5 (pages/chapters/hours)
    difficulty,  // 1..5
    done: false,
  };
}

/* A file stored as a relative path in the repo (not embedded base64).
   Used for files the user dropped into the project folder. */
function mkRepoFile(name, path) {
  return {
    id: "file-" + Math.random().toString(36).slice(2, 9),
    name,
    path,       // relative URL, served alongside the app
    data: null, // no embedded data
  };
}

function mkExam(subjectId, label, date, time) {
  return {
    id: "exam-" + Math.random().toString(36).slice(2, 9),
    subjectId,
    label,
    date, // yyyy-mm-dd
    time, // HH:MM
  };
}

/* ---------------- Store ---------------- */
const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.state = JSON.parse(raw);
        // make sure newer fields exist
        this.state.settings = this.state.settings || seedData().settings;
        this.state.availability = this.state.availability || seedData().availability;
      } else {
        this.state = seedData();
        this.save();
      }
    } catch (e) {
      console.error("Failed to load state, reseeding", e);
      this.state = seedData();
      this.save();
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      alert("Could not save data. Browser storage may be full (attached files take space).");
      console.error(e);
    }
  },

  reset() {
    this.state = seedData();
    this.save();
  },

  // helpers
  subject(id) { return this.state.subjects.find(s => s.id === id); },
  examsFor(id) { return this.state.exams.filter(e => e.subjectId === id); },
  exam(id) { return this.state.exams.find(e => e.id === id); },
};
