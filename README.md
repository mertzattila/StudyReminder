# 📚 LearnReminder

A zero-install study planner that runs entirely in your browser. It reads your
exams, your subjects and lessons, and your availability, then builds a
day-by-day study plan so you always know **what to study today**.

Open it anywhere by hosting it free on **GitHub Pages** — no server, no build step,
no database. All your data (and attached files) live in your browser's local storage.

## What it does

- **Subjects → lessons/topics.** Each lesson has a *material length* (1–5) and a
  *difficulty* (1–5). The planner gives longer / harder topics more study days.
- **Exams.** Pre-filled from your schedule; fully editable. Add as many as you like.
- **Attach files per subject.** Keep your slides, PDFs and notes organized by subject.
- **Availability.** Pick which weekdays you study, set hours/day, and block specific
  dates you can't study at all.
- **Sequential strategy.** Finish one subject (the one with the soonest exam) before
  moving to the next — exactly as you asked.
- **Today view.** The single, clear answer: what subject + lesson to study today.
- **Study Plan view.** The full day-by-day calendar up to your last exam.
- Optional **review day** reserved right before each exam.
- **Export / import** your data as JSON for backups or moving between devices.

Your 3 current subjects are already loaded:
*Menedzsment és vállalkozásgazdaságtan*, *Mikrokontroller alapú rendszerek*, *Informatika2* —
with their ZH dates from your schedule. Add more subjects any time.

## Run it locally

Just open `index.html` in a browser. That's it.

Or serve it (nicer for file downloads):

```bash
# from this folder
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it on GitHub Pages (open it anywhere)

1. Create a new repository on GitHub (e.g. `learnreminder`).
2. Push these files to it:

   ```bash
   git init
   git add .
   git commit -m "LearnReminder study planner"
   git branch -M main
   git remote add origin https://github.com/<your-username>/learnreminder.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment**.
   Set **Source** to `Deploy from a branch`, **Branch** = `main`, folder = `/ (root)`.
4. Wait ~1 minute. Your app is live at:
   `https://<your-username>.github.io/learnreminder/`

Open that URL on your phone or any computer. (Data is stored per-browser, so use
**Export data** on one device and **Import data** on another to sync.)

## Notes & limits

- Attached files are stored inside the browser as base64. Browser storage is limited
  (roughly 5–10 MB total), so keep attachments small. Files over 4 MB are skipped.
- The exam schedule was read from your uploaded screenshots. Today's date in those
  screenshots had already passed some ZH dates (e.g. Mikrokontroller main ZH on
  Nov 3) — the planner simply targets the next upcoming exam/retake and ignores
  passed ones. Edit any date under the **Exams** tab.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and layout |
| `styles.css` | Styling |
| `data.js` | Storage + seeded subjects/exams |
| `planner.js` | The scheduling/recommendation engine |
| `app.js` | UI rendering and interactions |
