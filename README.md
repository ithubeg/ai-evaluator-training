# 🎓AccuRater AI Evaluator – Training Edition
Made with ❤️ by [Mohamed Ali Maher] – let’s connect on LinkedIn.

**Train yourself to evaluate AI responses like a professional.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-blue)]([https://your-project.pages.dev](https://ai-evaluator-training.advertcore.workers.dev/))

A free, browser‑based tool that helps you practice the structured evaluation of AI‑generated text.  
Learn to identify factuality errors, instruction violations, logical flaws, safety issues and linguistic mistakes – the way high‑end AI companies do.

---

## ✦ What is AccuRater AI Evaluator?

AccuRater is a simple AI training application that presents you with a set of AI responses together with expected issues.  
Your job is to highlight the problematic part, choose the correct behavior category, sub‑description and impact.  
The tool instantly scores your work and, in Training Mode, shows exactly where you were right or wrong.

It is the **open‑source training companion** of a professional secure evaluation platform used by AI teams to qualify human evaluators.

---

## ✦ Why use it?

- **Practice makes perfect** – AI evaluation is a skill. This tool gives you realistic tasks with immediate feedback.
- **Learn the taxonomy** – Understand the difference between factuality, instruction following, logic, safety and linguistic quality.
- **Prepare for real work** – Many AI companies use similar classifications for their quality assurance processes.
- **No installation** – Just an HTML file and a JSON training pack. Works on any modern browser.
- **Track progress** – Built‑in session timer, per‑task score and overall performance summary.

---

## ✦ Who is it for?

- Aspiring **AI evaluators / annotators** who want to join platforms like Scale AI, Surge AI, or Invisible.
- **AI trainers** who need to standardise the evaluation skills of their team.
- **Students and researchers** studying AI safety, hallucination detection, and model behavior.
- **Anyone** curious about how large language models are judged.

---

## ✦ When should you use it?

- **Before applying** for an AI evaluation job to prove your skills.
- **During onboarding** of a new team to align everyone on the same definitions.
- **As a self‑assessment** tool to see how accurately you can spot model mistakes.

---

## ✦ Where to get it?

- **Live demo (free):** [https://your-project.pages.dev](https://your-project.pages.dev) (hosted on Cloudflare Pages)
- **Source code:** [https://github.com/yourusername/ai-evaluator-training](https://github.com/yourusername/ai-evaluator-training)
- **Sample training pack:** Download directly from the demo page.

---

## ✦ How it works

### Overview
1. **Load a training JSON** file that contains tasks (prompt + response) and the expected issues.
2. **For each task**, read the prompt and the model’s response.
3. **Highlight the exact part** of the response that contains a problem. The selected text becomes the **Evidence**.
4. Choose the **Behavior** category (e.g., Factuality Error, Instruction Violation…).
5. Pick the **Sub‑Description** (e.g., "Incorrect Fact", "Constraint Ignored").
6. Select the **Impact** (e.g., Trust Erosion, Operational Risk).
7. Click **Add Issue** – your evaluation appears in the right panel.
8. Move through all tasks using the navigation arrows or the task history panel.
9. Press **Show Score** to see your performance.

### Scoring System
Each expected issue is compared to your added issues:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Evidence + Impact | 50% | The highlighted text must contain all expected keywords, **and** the impact must match exactly. |
| Behavior | 30% | The main category must be correct. |
| Sub‑Description | 20% | The fine‑grained label must match. |

- Score for a task = average of the best‑matched expected issues.  
- Tasks with no expected issues automatically give 100% if you add none.  
- **Proportional evidence matching:** If only 2 out of 3 keywords appear, you get 0.5 × (2/3) = 0.33 instead of 0.5.

### Training vs Test Mode
- **Training Mode** (default): After submitting, you see a detailed table showing which issues you matched, missed, or added extra.  
- **Test Mode**: You only see the final overall percentage, simulating a real exam.

### Custom Entries
Toggle “Custom entries” to enable free‑text input for behavior, sub‑description or impact.  
In this mode, automatic scoring is **disabled**; you can export your work as a `.txt` file for manual review.

---

## ✦ Features

- ✅ Fully client‑side – works offline after first load
- ✅ Two languages (English / Arabic) with RTL support
- ✅ Session countdown timer (configurable)
- ✅ Auto‑save to `localStorage` – resume where you left off
- ✅ Keyboard shortcuts (`←` `→` to navigate, `Ctrl+Enter` to add issue)
- ✅ Task history panel for quick navigation
- ✅ Progress bar showing completion percentage
- ✅ Export to `.txt` in custom mode
- ✅ Zero‑dependency – all vanilla HTML/CSS/JS

---

## ✦ Getting Started

1. **Download** the `index.html` file from this repository.
2. **Open it** in any modern browser (Chrome, Firefox, Edge).
3. **Click “Download sample”** to get a training JSON, or prepare your own (see format below).
4. **Select Training or Test mode**, then upload the JSON file.
5. **Start evaluating!**

---

## ✦ Training JSON Format

Create a `.json` file with two sections:

```json
{
  "config": {
    "session_time_limit_seconds": 900,
    "behaviors": [ ... ],
    "impacts": [ ... ]
  },
  "tasks": [
    {
      "id": "t1",
      "prompt": "Optional – the original user request",
      "response": "The AI response to evaluate.",
      "expected_issues": [
        {
          "evidence_keywords": ["keyword1", "keyword2"],
          "behavior_key": "factuality",
          "sub_description": "Incorrect Fact",
          "impact_key": "trust"
        }
      ]
    }
  ]
}
