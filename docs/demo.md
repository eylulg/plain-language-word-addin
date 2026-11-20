# Demo video plan

A 90 second screen recording of Word on Mac with the task pane open. Record at 1440 x 900 or larger, with dark mode off and notifications muted.

## Setup before recording

- Server running with an `ANTHROPIC_API_KEY`. Without one it runs in demo mode and shows a "Demo mode" badge, which is fine for a dry run but not for the final cut.
- A new Word document with these paragraphs:
  1. "Tenancy notice"
  2. "In the event that the tenant fails to make payment of the rent in accordance with the terms hereinafter set out, the landlord shall be entitled to terminate the agreement forthwith and to recover possession of the premises."
  3. "The deposit will be returned within 14 days. It should be noted that deductions may be made by the landlord for damage that is really quite serious."
  4. "Please call us if you have any questions."
- Track changes off, so the restore step is visible.

## Shots

1. **Open (0:00 to 0:08).** Home tab, click **Plain Language**. The task pane opens and the score card fills in. Hold on the grade and the "above grade 8" badge.
2. **Issues (0:08 to 0:20).** Scroll the issue list. Point at the counts per paragraph and the types (long sentence, passive voice, jargon).
3. **Jump to a sentence (0:20 to 0:28).** Click the long sentence issue. The sentence is selected in the document.
4. **Highlight all (0:28 to 0:36).** Turn on **Highlight long sentences**. The sentence turns yellow. Turn it off again.
5. **Settings (0:36 to 0:44).** Open **Settings**, set the target grade to 7, tone to friendly, and add "landlord" as a protected term.
6. **Rewrite (0:44 to 1:02).** Put the cursor in paragraph 2 and click **Rewrite in plain language**. Hold on the word diff and the "What changed" list.
7. **Insert (1:02 to 1:16).** Click **Insert as tracked change**. Show the deletion and insertion in the document, then open **Review** and show that track changes is off again.
8. **Accept (1:16 to 1:24).** Accept the change in the Review tab. Click **Analyse**; the grade drops.
9. **Close (1:24 to 1:30).** End on the task pane with the new score.

## Captions to add in the edit

- "Only the paragraph you rewrite is sent to the server."
- "Inserted as a tracked change, with your own tracking setting restored."
