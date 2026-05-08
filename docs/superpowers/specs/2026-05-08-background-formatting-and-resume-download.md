# Background Resume Formatting + Resume Download

## Context

The career chat page currently blocks on a resume-formatting LLM call before the coaching session starts. Users see "Preparing your resume..." for several seconds. This design eliminates that wait by running formatting in the background, and adds .docx and PDF download options for the formatted resume.

## Change 1: Background Parallel Formatting

### Current Flow (sequential)

```
initializeChat()
  → setFormattingResume(true)
  → await sendMessage(RESUME_FORMATTING_SYSTEM_PROMPT, resumeText)  // BLOCKS
  → dispatch SET_UPDATED_RESUME_MARKDOWN
  → setFormattingResume(false)
  → runChatTurn([])
```

### New Flow (parallel)

```
initializeChat()
  → formatResumeInBackground()   // fire-and-forget, no await
  → runChatTurn([])              // starts immediately with raw text
```

### Implementation Details

**File: `src/app/chat/page.tsx`**

1. Add `const formattingCompleteRef = useRef(false)` alongside `initializedRef`.

2. Extract formatting into `formatResumeInBackground()`:
   - Calls `sendMessage()` with `RESUME_FORMATTING_SYSTEM_PROMPT` and fast model (Haiku/GPT-5-mini)
   - On completion: sets `formattingCompleteRef.current = true` and dispatches `SET_UPDATED_RESUME_MARKDOWN`
   - On error: logs warning, sets `formattingCompleteRef.current = true` (allow tool calls even if formatting failed — raw text is acceptable)

3. Rewrite `initializeChat()`:
   - If `state.resumeText.trim() && !state.updatedResumeMarkdown`: call `formatResumeInBackground()` (no await)
   - Call `runChatTurn([])` (starts immediately)

4. Gate `update_resume` tool calls in `runChatTurn`:
   - When processing tool calls, if `tc.name === 'update_resume'` and `formattingCompleteRef.current === false`: push an error result `"Resume formatting is still in progress. Please wait a moment and try again."` instead of executing the tool
   - This ensures `update_resume` always operates on the formatted base

5. Remove:
   - `formattingResume` state (line 28)
   - `setFormattingResume(true/false)` calls (lines 154, 180)
   - "Preparing your resume..." UI (lines 309-311)

### Why This Is Safe

- `buildChatSystemPrompt()` (prompts.ts:99) falls back to raw `resumeText` when `updatedResumeMarkdown` is empty. First chat turn uses raw text — the coaching model handles it fine.
- The formatting call (Haiku) completes in ~1-3 seconds. The coaching model won't call `update_resume` until much later in the conversation (after discussing scenarios, refining goals). The gate will almost never trigger.
- If formatting fails, the gate opens anyway and `update_resume` works with whatever state exists.

## Change 2: Resume Download Options

### Architecture

**New file: `src/lib/resume-export.ts`**

Contains:
- `parseResumeMarkdown(md: string): ResumeSection[]` — Parses our constrained markdown format into structured data. The format is defined by `RESUME_FORMATTING_SYSTEM_PROMPT`: `#` name, `*italics*` contact, `##` sections, `**bold**` titles, `-` bullets, nested bullets, `---` rules.
- `generateResumeDocx(markdown: string): Promise<Blob>` — Uses `parseResumeMarkdown` output to build a `docx.Document` with styled paragraphs. Returns `Packer.toBlob()`.
- `openResumePrintView(markdown: string): void` — Opens a new browser window with the resume rendered as styled HTML. Triggers `window.print()` for the user's native Save-as-PDF dialog.
- `downloadBlob(blob: Blob, filename: string): void` — Creates object URL, triggers anchor click download, revokes URL.

**New dependency: `docx` npm package** (~150KB gzipped, zero server deps)

### UI Changes

**File: `src/components/ResumePanel.tsx`**

Replace the single "Download Resume (.md)" button with a three-button group:

```
[.md] [.docx] [PDF]
```

- **.md** — existing behavior (`downloadTextFile(content, 'resume.md')`)
- **.docx** — calls `generateResumeDocx(markdown)` then `downloadBlob(blob, 'resume.docx')`. Shows brief loading state while generating.
- **PDF** — calls `openResumePrintView(markdown)`. Opens browser print dialog.

Download buttons only appear when `updatedResumeMarkdown` has content (existing condition at line 14).

### DOCX Formatting

The `docx` package builds documents programmatically. Our parser maps markdown elements to Word styles:

| Markdown | Word Style |
|----------|-----------|
| `# Name` | Title paragraph, bold, 24pt |
| `*contact info*` | Subtitle, italic, 10pt |
| `##` Section | Heading2, bold, 14pt |
| `**Title** at Company` | Bold text run + normal text |
| `- bullet` | Bullet paragraph, indent level 0 |
| `  - nested` | Bullet paragraph, indent level 1 |
| `---` | Horizontal border paragraph |

### PDF via Browser Print

`openResumePrintView()` implementation:
1. Convert markdown to HTML (simple string transform matching our constrained format)
2. Open `window.open('', '_blank')`
3. Write a complete HTML document with inline CSS (professional resume styling: serif fonts, proper margins, clean spacing)
4. Call `printWindow.print()`

This produces a searchable, crisp PDF with zero added dependencies.

## Interaction Between Changes

- Background formatting provides the `updatedResumeMarkdown` that download buttons consume
- Download buttons only render once `updatedResumeMarkdown` is populated (either from background formatting or from `update_resume` tool call)
- Both sources produce valid markdown that the download functions consume
- If `update_resume` tool call happens after background formatting, it overwrites with richer content — downloads always use the latest state

## Files Modified

| File | Change |
|------|--------|
| `src/app/chat/page.tsx` | Refactor `initializeChat`, add ref, gate tool calls, remove loading state |
| `src/components/ResumePanel.tsx` | Add .docx and PDF download buttons |
| `src/lib/resume-export.ts` | **New** — markdown parser, docx generator, print view, blob download |
| `src/lib/__tests__/resume-export.test.ts` | **New** — tests for parsing and generation |
| `package.json` | Add `docx` dependency |

## Verification

1. **Background formatting**: Start a chat session → verify chat streams immediately (no "Preparing your resume..." message) → open Resume panel after a few seconds → verify formatted markdown appears
2. **Formatting gate**: (Hard to trigger naturally) Verify that if `update_resume` were called before formatting completes, it returns an error message
3. **Download .md**: Open Resume panel → click .md → verify file downloads with correct content
4. **Download .docx**: Open Resume panel → click .docx → open in Word/Google Docs → verify structure matches
5. **PDF**: Open Resume panel → click PDF → verify print dialog opens with styled resume → save as PDF
6. **Full flow**: Complete all steps → enter chat → let formatting run → have AI suggest resume edits → accept → verify downloads reflect the edited version
