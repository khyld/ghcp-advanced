---
name: sdd-tasks
description: Describe when to use this prompt
---

<!-- Tip: Use /create-prompt in chat to generate content with agent assistance -->

---
description: Break an approved plan into an ordered task list.
---
Goal: produce `specs/${input:storyId}/tasks.md` from `specs/${input:storyId}/plan.md`.

Rules:
- Each task is independently committable and has a clear acceptance check
  (e.g. "`vitest` for X passes").
- Number tasks sequentially. Note dependencies between them.
- Do not write code. Do not modify the spec or the plan.
- Stop after writing tasks.md and wait for approval.
