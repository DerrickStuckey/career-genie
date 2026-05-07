# Design Decisions: Selectable Options (Issue #34)

GitHub issue: https://github.com/DerrickStuckey/career-genie/issues/34

## Problem

The career chat LLM frequently asks "which do you like of 1-4?" and similar multiple-choice questions. Users have to type or copy-paste their answer, which is clunky.

## Decisions

### How the LLM signals options: New tool call

A dedicated `present_options` tool call, not markdown parsing. Parsing numbered lists from streamed text would be fragile — the LLM formats lists inconsistently. A tool call provides reliable, structured option data.

### Option data model: Title + description

Each option has a short `title` (sent as the user message when clicked) and a one-sentence `description`. This gives users enough context to decide without overwhelming the UI.

### What gets sent on selection: Title only

When the user clicks an option, only the `title` is sent as the user message. The LLM already has the full option context from its own tool call.

### Free text always available

The regular text input remains active when option buttons are shown. Users can type a custom response instead of clicking. This avoids boxing people into predefined choices.

### Single-select only

Always single-select — one click, one choice. If the LLM needs multiple inputs, it should ask follow-up questions. No `multiSelect` flag.

### After selection: Disable all, highlight chosen

After a selection (click or free text), all option buttons become disabled. The clicked option is highlighted with emerald styling. If the user typed free text instead, all buttons are disabled with none highlighted. This preserves a clear record of what was asked and answered.

### Placement: Below the message

Option buttons render as a separate block below the assistant's text, not inline. The tool call naturally comes at the end of the LLM's turn, so this is the simplest correct placement.

### No redundant text list

The system prompt instructs the LLM to NOT list options as numbered items in its text response. The buttons ARE the options. The text should provide context and ask the question, then let the buttons speak for themselves.

### 2-4 options max

The tool schema enforces `minItems: 2, maxItems: 4`. This keeps the UI compact (stacked buttons without scrolling) and forces the LLM to present focused, differentiated choices.

### System prompt guidance

Explicit instructions in the `<tools_guidance>` section tell the LLM when to use `present_options` and the rules for using it. Relying solely on the tool description would be less predictable.

### Deferred tool_result

Both Anthropic and OpenAI APIs require a `tool_result` for every `tool_use` before the next API call. Rather than sending a synthetic "waiting for selection" result immediately, we defer the `tool_result` until the user actually responds. At that point, the result contains their real selection (e.g., `"User selected: Software Engineering Manager"`). This gives the LLM maximum context.

### Mixed tools edge case: Error and retry

The system prompt instructs the LLM not to combine `present_options` with other tool calls. If it does anyway, all tool calls receive error `tool_result` messages ("present_options cannot be combined with other tool calls") and the tool loop continues, giving the LLM a chance to retry correctly. This avoids complex partial-execution logic and teaches the LLM to follow the rule.

### State derived from message positions

No new fields on `ChatMessage`, no new reducer actions. Whether options are interactive or disabled is derived from the message array: if a subsequent user message exists after an assistant message with `present_options`, the options are answered. The selected option is identified by matching the next user message's content against option titles. This keeps state management simple and avoids needing to mutate existing messages.

### Reuse existing `handleSend`

Clicking an option calls the same `handleSend(title)` function as typing in the text input. No separate handler needed — the click produces a user message identical to what the user would have typed.
