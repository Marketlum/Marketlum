Absolutely — this is a killer feature for Marketlum. “Chat with your market” is *exactly* the kind of interface that makes complex structures feel alive.

Below is a **simple but elegant MVP spec** that you can build incrementally, while keeping the architecture ready for multiple LLMs, tools, and future automation.

---

# Claude Code Spec — Market Chat (Multi-LLM, Multi-Chat, Market Q&A)

## 0) Goal

Implement a **Market Chat** module where a user can ask questions about their Marketlum data in natural language, e.g.:

* “How many open agreements are there?”
* “Which Value is most used?”
* “Show me exchanges grouped by value stream”
* “What channels are performing best?”

Core requirements:

* Chat UI with **multiple chats**
* Conversation history persisted
* Ability to choose **LLM provider + model**
* Answers grounded in Marketlum data (not hallucinated)
* Start with a **small set of safe queries** (read-only)

---

# 1) UX / Frontend

## 1.1 Route

`/chat`

Left sidebar:

* “New chat” button
* Chat list (title + last message time)
* Search chats (optional)

Main area:

* Chat header:

  * Chat title (editable)
  * Model selector dropdown (per-chat)
  * “Clear chat” (optional)
* Message thread (user + assistant messages)
* Input box:

  * multiline textarea
  * Send button
  * Enter to send, Shift+Enter newline

Message UI:

* assistant messages support:

  * markdown rendering
  * “sources” / “data used” block (optional)
  * tool results displayed as tables (simple)

---

## 1.2 Model selector

Dropdown showing available models grouped by provider, e.g.:

* OpenAI

  * GPT-4.1
  * GPT-4o-mini
* Anthropic

  * Claude 3.5 Sonnet
  * Claude 3 Haiku
* Local / OSS (later)

  * Llama 3.x

Per chat:

* Chat stores `provider` + `model`
* Default model comes from user settings

---

## 1.3 “Simple but elegant” behavior

MVP behaviors:

* Chat title auto-generated from first user message:

  * “Open agreements”
  * “Top values”
* Assistant answers in a structured format:

  * short summary
  * bullet points
  * optional “Details” section

---

# 2) Data Model

## 2.1 Entity: `Chat`

Fields:

* `id: UUID`
* `title: string` *(required, default “New chat”)*
* `provider: LlmProvider` *(required)*
* `model: string` *(required)*
* `createdByUserId: UUID`
* `createdAt: datetime`
* `updatedAt: datetime`
* `archivedAt: datetime | null` *(optional)*

Enum: `LlmProvider`

* `openai`
* `anthropic`
* `local` *(future)*

---

## 2.2 Entity: `ChatMessage`

Fields:

* `id: UUID`
* `chatId: UUID`
* `role: ChatRole` *(user | assistant | system | tool)*
* `content: string` *(markdown text)*
* `createdAt: datetime`

Optional metadata:

* `toolName: string | null`
* `toolInput: json | null`
* `toolOutput: json | null`
* `tokenUsage: json | null`
* `latencyMs: number | null`
* `error: string | null`

Enum: `ChatRole`

* `user`
* `assistant`
* `system`
* `tool`

---

# 3) Backend API

## 3.1 Chats

### List chats

`GET /chats`
Query:

* `q` (search title)
* pagination optional

Return:

```json
{
  "data": [
    { "id": "...", "title": "Open agreements", "provider": "openai", "model": "gpt-4.1", "updatedAt": "..." }
  ]
}
```

### Create chat

`POST /chats`
Body:

```json
{ "title": "New chat", "provider": "openai", "model": "gpt-4o-mini" }
```

### Update chat

`PATCH /chats/:id`
Body:

```json
{ "title": "Agreement analysis", "provider": "anthropic", "model": "claude-3-5-sonnet" }
```

### Delete/Archive chat

`DELETE /chats/:id`
MVP: archive is safer than delete.

---

## 3.2 Messages

### Get messages for a chat

`GET /chats/:id/messages`
Return ordered list.

### Send message

`POST /chats/:id/messages`
Body:

```json
{ "content": "How many open agreements are there?" }
```

Response:

* user message created
* assistant message created (final answer)
* tool messages (optional)

---

# 4) LLM Architecture (Multi-provider, Tool-ready)

## 4.1 Abstraction layer

Implement `LlmClient` interface:

```ts
interface LlmClient {
  generateResponse(input: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools?: ToolDefinition[];
  }): Promise<LlmResult>;
}
```

Implement providers:

* `OpenAiLlmClient`
* `AnthropicLlmClient`

---

## 4.2 Prompting (MVP)

Add a system prompt:

**System prompt (MVP):**

* You are Marketlum Assistant
* You can answer using available data
* If missing data, say so
* Prefer short structured answers
* Do not invent numbers

---

# 5) “Chat with your market” = Tool-based Q&A

## 5.1 Tooling concept

Instead of letting the model query the DB directly, expose **read-only tools** that return safe structured data.

### Tool: `getAgreementsStats`

Input:

```json
{ "state": "open" }
```

Output:

```json
{ "openCount": 12, "completedCount": 7 }
```

### Tool: `getMostPopularValues`

Input:

```json
{ "limit": 5 }
```

Output:

```json
{
  "values": [
    { "valueId": "...", "name": "Coaching", "count": 22 }
  ]
}
```

### Tool: `getExchangesByValueStream`

Input:

```json
{ "state": "open" }
```

---

## 5.2 MVP tool list (start small)

Start with 6 tools:

1. `getAgreementsCountByStatus`
2. `getUsersCount`
3. `getExchangesCountByStatus`
4. `getTopValuesByUsage`
5. `getOfferingsCountByState`
6. `searchEntities` *(basic search across modules)*

> “Usage” for Values can be computed from:

* OfferingItems referencing Value
* ExchangeFlows referencing Value
* Ledger Accounts referencing Value
* ValueInstances referencing Value

---

## 5.3 Tool execution policy

MVP policy:

* Tools are **read-only**
* No writes
* No destructive actions
* Model must ask for clarification if query is ambiguous

---

# 6) Response format (Elegant + grounded)

Assistant responses should include:

1. **Answer summary**
2. **Result table** (if applicable)
3. **Where this came from** (optional small “Data used”)

Example answer:

**Open agreements:** 12
**Completed agreements:** 7

Data used: Agreements module (status field)

---

# 7) Conversation History & Context

## 7.1 Context window strategy

When sending messages to LLM:

* include last N messages (e.g. 20)
* include system prompt
* include tool results (as tool messages)

Optional later:

* “memory” summary per chat

---

# 8) Security & Tenant Safety

* All tool queries must be scoped to current tenant
* Never allow cross-tenant data leakage
* Avoid exposing raw SQL to model
* Mask secrets (API keys, tokens)

---

# 9) Admin / Settings

## 9.1 User settings

Add user-level defaults:

* default provider
* default model

## 9.2 Available models endpoint

`GET /llm/models`
Returns list based on server config:

```json
{
  "providers": [
    { "provider": "openai", "models": ["gpt-4.1", "gpt-4o-mini"] }
  ]
}
```

---

# 10) Seed Data (Optional)

Seed chats:

* “Welcome to Market Chat”
* Pre-filled message examples:

  * “How many open exchanges are there?”
  * “What are my top 5 Values?”

---

# 11) Testing Requirements

Backend:

* create chat
* send message creates user + assistant message
* tool execution returns correct results
* switching model per chat works

Frontend:

* multiple chats UI works
* history persists
* model dropdown updates chat config
* messages render markdown

---

# 12) Acceptance Criteria (MVP)

* User can create multiple chats.
* Chat stores provider + model.
* User can send a message and receive an answer.
* Answers can include real Marketlum stats (agreements/exchanges/values).
* Conversation history is persisted and reloaded.
* System prevents hallucinated numeric answers by grounding via tools.

---

# Final remarks (to decide MVP shape)

1. the assistant should be **read-only** for now (recommended)
2. I want **streaming responses** (token-by-token) in the UI 
3. the model selector be per-chat (recommended)
