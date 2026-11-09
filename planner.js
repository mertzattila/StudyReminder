/* ============================================================
   LearnReminder — planner (recommendation engine)

   Strategy: SEQUENTIAL.
   - Work on one subject at a time, ordered by its next upcoming exam.
   - A subject's lessons are spread across the available study days
     *before* that subject's exam.
   - Each lesson gets study time weighted by (length x difficulty),
     so longer / harder material gets more of the available days.
   - Optionally reserve the day right before the exam for review.
   - Only unfinished lessons are scheduled; checking a lesson "done"
     frees up its days for the rest.
   ============================================================ */

const Planner = {
  /* Return an array of day objects from `fromISO` up to the last exam.
     Each: { iso, date, weekday, tasks: [...], exams: [...], studyable } */
  build(state, fromISO) {
    const today = fromISO ? parseISO(fromISO) : startOfDay(new Date());
    const avail = state.availability;
    const settings = state.settings;

    // Horizon = last exam date (or 30 days out if no exams)
    const examDates = state.exams.map(e => parseISO(e.date)).sort((a, b) => a - b);
    let horizon = examDates.length ? examDates[examDates.length - 1] : addDays(today, 30);
    horizon = addDays(horizon, 1);

    // Build empty day map
    const days = [];
    const dayByIso = {};
    for (let d = new Date(today); d <= horizon; d = addDays(d, 1)) {
      const iso = toISO(d);
      const studyable =
        avail.weekdays[d.getDay()] === true &&
        !avail.blockedDates.includes(iso);
      const day = {
        iso,
        date: new Date(d),
        weekday: d.getDay(),
        tasks: [],
        exams: [],
        studyable,
      };
      days.push(day);
      dayByIso[iso] = day;
    }

    // Place exams on their days
    for (const ex of state.exams) {
      const day = dayByIso[ex.date];
      if (day) day.exams.push(ex);
    }

    // Determine subject order: by each subject's *next* upcoming exam.
    const subjectsWithNext = state.subjects
      .map(s => {
        const upcoming = Store_examsSorted(state, s.id).filter(e => parseISO(e.date) >= today);
        const nextExam = upcoming[0] || null;
        return { subject: s, nextExam };
      })
      .filter(x => x.nextExam) // only subjects that still have an exam ahead
      .sort((a, b) => parseISO(a.nextExam.date) - parseISO(b.nextExam.date));

    // Track which days are already used so subjects don't collide.
    // SEQUENTIAL: a subject uses the earliest free studyable days up to its exam.
    const usedDays = new Set();

    for (const { subject, nextExam } of subjectsWithNext) {
      const examDay = parseISO(nextExam.date);

      // Candidate study days: studyable, strictly before exam day, not yet used.
      let candidates = days.filter(
        d => d.studyable && d.date < examDay && !usedDays.has(d.iso)
      );

      // Reserve the last candidate day as a review day if enabled.
      let reviewDay = null;
      if (settings.reviewDayBeforeExam && candidates.length > 1) {
        reviewDay = candidates[candidates.length - 1];
        candidates = candidates.slice(0, -1);
      }

      const lessons = subject.lessons.filter(l => !l.done);
      if (lessons.length === 0) {
        if (reviewDay) {
          reviewDay.tasks.push(reviewTask(subject, nextExam));
          usedDays.add(reviewDay.iso);
        }
        continue;
      }

      if (candidates.length === 0) {
        // Not enough time: cram everything on the review day (or the exam-eve).
        const target = reviewDay || null;
        if (target) {
          for (const l of lessons) target.tasks.push(lessonTask(subject, l, nextExam, true));
          usedDays.add(target.iso);
        }
        continue;
      }

      const nDays = candidates.length;

      if (lessons.length <= nDays) {
        // ---- Enough time: give heavier lessons more days. ----
        // Weight = length * difficulty. Keep lessons in order (finish one, next).
        const weighted = lessons.map(l => ({
          lesson: l,
          weight: Math.max(1, l.length) * Math.max(1, l.difficulty),
        }));
        const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);

        // How many days each lesson deserves (at least 1), then fit to nDays.
        let dayQuota = weighted.map(w => Math.max(1, Math.round((w.weight / totalWeight) * nDays)));
        let diff = nDays - dayQuota.reduce((a, b) => a + b, 0);
        let idx = 0;
        while (diff !== 0 && dayQuota.length) {
          const i = idx % dayQuota.length;
          if (diff > 0) { dayQuota[i]++; diff--; }
          else if (dayQuota[i] > 1) { dayQuota[i]--; diff++; }
          idx++;
          if (idx > 10000) break; // safety
        }

        let dayPtr = 0;
        weighted.forEach((w, li) => {
          const q = dayQuota[li];
          for (let k = 0; k < q && dayPtr < candidates.length; k++) {
            const day = candidates[dayPtr++];
            const part = q > 1 ? ` (part ${k + 1}/${q})` : "";
            day.tasks.push(lessonTask(subject, w.lesson, nextExam, false, part));
            usedDays.add(day.iso);
          }
        });
      } else {
        // ---- Tight: more lessons than days. Order lessons by priority
        // (heaviest length*difficulty first) and spread them evenly across the
        // days so each day gets a balanced, focused batch instead of a dump. ----
        const ordered = [...lessons].sort(
          (a, b) =>
            (Math.max(1, b.length) * Math.max(1, b.difficulty)) -
            (Math.max(1, a.length) * Math.max(1, a.difficulty))
        );
        // Interleave so each day mixes a heavy + lighter topic rather than all
        // heavy topics landing on day one.
        const buckets = Array.from({ length: nDays }, () => []);
        ordered.forEach((l, i) => buckets[i % nDays].push(l));
        buckets.forEach((bucket, di) => {
          const day = candidates[di];
          const tight = bucket.length > 1;
          bucket.forEach(l => {
            day.tasks.push(lessonTask(subject, l, nextExam, tight,
              tight ? ` (${bucket.length} topics today — tight schedule)` : ""));
            usedDays.add(day.iso);
          });
        });
      }

      if (reviewDay) {
        reviewDay.tasks.push(reviewTask(subject, nextExam));
        usedDays.add(reviewDay.iso);
      }
    }

    return days;
  },

  /* The single recommendation for a given day (used in Today view). */
  todayTasks(state) {
    const days = this.build(state);
    const todayIso = toISO(startOfDay(new Date()));
    const day = days.find(d => d.iso === todayIso);
    return day || { iso: todayIso, tasks: [], exams: [], studyable: false, weekday: new Date().getDay() };
  },
};

/* ---- task builders ---- */
function lessonTask(subject, lesson, exam, cram, partLabel) {
  return {
    type: "lesson",
    subjectId: subject.id,
    subjectName: subject.name,
    color: subject.color,
    lessonId: lesson.id,
    lessonName: lesson.name + (partLabel || ""),
    difficulty: lesson.difficulty,
    length: lesson.length,
    examLabel: exam.label,
    examDate: exam.date,
    cram: !!cram,
    // Material for this lesson: a file explicitly linked to the lesson if any,
    // otherwise all of the subject's files (so the study material is one click
    // away from the daily recommendation).
    files: lessonFiles(subject, lesson),
  };
}
function reviewTask(subject, exam) {
  return {
    type: "review",
    subjectId: subject.id,
    subjectName: subject.name,
    color: subject.color,
    lessonName: "Final review — go over all lessons",
    examLabel: exam.label,
    examDate: exam.date,
    files: subject.files || [],
  };
}

/* Pick the files to show for a lesson. If the lesson has `fileIds`, show just
   those; otherwise show all the subject's files. */
function lessonFiles(subject, lesson) {
  const all = subject.files || [];
  if (lesson.fileIds && lesson.fileIds.length) {
    return all.filter(f => lesson.fileIds.includes(f.id));
  }
  return all;
}

/* ---- date helpers ---- */
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function parseISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function daysBetween(aIso, bIso) {
  return Math.round((parseISO(bIso) - parseISO(aIso)) / 86400000);
}

/* Exams for a subject sorted by date ascending. */
function Store_examsSorted(state, subjectId) {
  return state.exams
    .filter(e => e.subjectId === subjectId)
    .sort((a, b) => parseISO(a.date) - parseISO(b.date));
}
