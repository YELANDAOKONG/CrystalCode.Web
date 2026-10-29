// Wire types for `crystal server`. Field names follow
// ../CrystalCode/docs/server.md and CrystalCode.Server/Wire. The protocol has
// no version identifier, so every list the server sends may grow.

export type Scope = 'observe' | 'operate' | 'admin'

export type ServerState = 'starting' | 'awaiting_operator' | 'ready' | 'closing' | 'failed'

export interface Usage {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number | null
  totalTokens: number
}

export interface BuildIdentity {
  crystalCode: string | null
  crystal: string | null
  sdk: string | null
  configuration: string | null
  runtime: string | null
  os: string | null
}

export interface ServerInfo {
  product: string
  build: BuildIdentity
  state: string
  error: string | null
  sessionId: string | null
  workspace: string | null
  scope: Scope
  authentication: boolean
  operations: string[]
  eventTypes: string[]
  interactionKinds: string[]
  slashCommands: string[]
}

/** Settings chosen during a turn that apply on the next one. A key exists only while it waits. */
export interface PendingSettings {
  provider?: string
  model?: string
  contextWindow?: number
  /** `unset` clears the slot. */
  serviceTier?: string
  speed?: string
  thinking?: string
  mode?: string
  approval?: string
}

/** An approval reviewer. `thinking`, `serviceTier`, and `speed` are display labels, blank when unset. */
export interface Reviewer {
  provider: string
  model: string
  thinking: string
  serviceTier: string
  speed: string
}

export interface ExtendedReviewer extends Reviewer {
  trigger: string
  includePrimaryReview: boolean
}

export interface Chrome {
  provider: string
  model: string
  workspace: string
  mode: string
  planMode: boolean
  approval: string
  thinking: string
  promptSet: string
  contextWindow: number
  serviceTier: string
  speed: string
  agentsEnabled: boolean
  pending: PendingSettings
  /** Null while that reviewer is off. */
  reviewer: Reviewer | null
  extendedApproval: ExtendedReviewer | null
  /** The compaction model, or null while it is off. */
  compaction: Reviewer | null
  /** The image-description model, or null while none is set. */
  image: Reviewer | null
}

export interface Preferences {
  estimatedTokens: boolean
  todoBar: boolean
  todoBarRows: number
  verboseTools: boolean
  verboseCommands: boolean
  verboseResults: boolean
  verboseCalls: boolean
  verboseApprovals: boolean
  verboseReview: boolean
  verboseThinking: boolean
  statusLineEnabled: boolean
  statusLineFields: string[]
}

export interface SlashCommand {
  name: string
  help: string
  keys: string[]
  argumentsOptional: boolean
  arguments: SlashCommand[]
  argumentsAfterValue: SlashCommand[]
}

export interface ToolCall {
  callId: string
  name: string
  arguments: string
  inputKind: string
}

export type ConversationItem =
  | { kind: 'message'; role: string; text: string; images: number[] }
  | { kind: 'reasoning'; segments: { kind: string; text: string }[]; hasState: boolean }
  | ({ kind: 'tool_call' } & ToolCall)
  | { kind: 'tool_result'; callId: string; status: string; text: string; images: number[] }
  | { kind: 'unknown' }

export interface LiveRound {
  text: string
  reasoning: string
  toolCalls: ToolCall[]
  retries: number
}

export interface Todo {
  id: string
  content: string
  status: string
}

export interface StatusField {
  name: string
  text: string
}

export interface SideExchange {
  question: string
  answer: string
}

export interface Side {
  announce: boolean
  running: boolean
  thinking: boolean
  pendingQuestion: string
  liveAnswer: string
  failure: string | null
  exchanges: SideExchange[]
}

export interface ChildSummary {
  id: string
  parentCallId: string
  agent: string
  label: string
  status: string
  stopReason: string | null
  model: {
    provider: string | null
    model: string | null
    thinking: string | null
    contextWindow: number | null
    serviceTier: string | null
    speed: string | null
  }
  tools: string[]
  todos: Todo[]
  usage: Usage | null
  cumulativeUsage: Usage | null
  modelCalls: number
  toolCalls: number
  notes: string[]
  archive: ConversationItem[] | null
}

export interface LastTurn {
  reason: string
  modelCalls: number
  toolCalls: number
}

export interface Classification {
  risk: string
  authority: string
  summary: string
  requirePrompt: boolean
  allowsReusableGrant: boolean
}

export interface Verdict {
  outcome: string
  riskLevel: string
  userAuthorization: string
  rationale: string
}

export interface QuestionOption {
  label: string
  description: string
}

export interface Question {
  header: string
  text: string
  multiple: boolean
  custom: boolean
  options: QuestionOption[]
}

export interface SessionSummary {
  id: string
  workspace: string
  mode: string
  createdUtc: string | null
  updatedUtc: string | null
  userTurns: number
  preview: string
}

export type InteractionPayload =
  | {
      kind: 'approval'
      call: ToolCall
      classification: Classification
      review: Verdict | null
      extendedReview: Verdict | null
      choices: string[]
    }
  | { kind: 'question'; questions: Question[] }
  | { kind: 'trust'; workspace: string; trustRoot: string; coversRepository: boolean }
  | { kind: 'choose_session'; currentId: string | null; listWorkspace: boolean; sessions: SessionSummary[] }
  | { kind: 'choose_child'; children: ChildSummary[] }
  | { kind: string }

export type Interaction = { id: string; target: string | null } & InteractionPayload

export interface Snapshot {
  state: string
  sessionId: string | null
  lastSeq: number
  chrome: Chrome | null
  preferences: Preferences | null
  commands: SlashCommand[]
  promptHistory: string[]
  conversation: ConversationItem[]
  live: LiveRound | null
  turnActive: boolean
  activity: string
  queue: string[]
  todos: Todo[]
  statusFields: StatusField[]
  usage: Usage | null
  cumulativeUsage: Usage | null
  contextWindow: number
  estimatedContextTokens: number | null
  side: Side
  children: ChildSummary[]
  lastTurn: LastTurn | null
  interactions: Interaction[]
}

export interface ServerEvent {
  seq: number
  type: string
  time: string
  sessionId: string | null
  origin: string | null
  target: string | null
  source: { childSessionId: string; invocationId: string } | null
  data: Record<string, unknown>
}

export interface QuickPrompt {
  name: string
  text: string
  error: string | null
}

export interface QuickPromptCatalog {
  directory: string
  error: string | null
  prompts: QuickPrompt[]
}

export interface IssuedToken {
  id: string
  scope: Scope
  label: string | null
  token?: string
}

export interface ProblemDetails {
  status: number
  detail: string
}

export interface StatusReport {
  full: boolean
  sessionId: string
  startedUtc: string
  workspace: string
  mode: string
  approval: string
  thinking: string
  promptSet: string
  provider: string
  model: string
  contextWindow: number
  serviceTier: string
  speed: string
  usage: Usage | null
  cumulativeUsage: Usage | null
  counts: Record<string, number>
  flags: Record<string, boolean>
  slots: Record<string, string>
}

export interface StatsReport {
  allWorkspaces: boolean
  sessions: number
  userTurns: number
  modelCalls: number
  toolCalls: number
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
  averageTokensPerSession: number
  medianTokensPerSession: number
  windowDays: number
  earliest: string | null
  latest: string | null
  topTools: { name: string; count: number }[]
}

export interface ToolDefinitionInfo {
  name: string
  description: string | null
  inputKind: string
  schema: unknown
}

export interface ExternalToolInfo {
  name: string
  set: string
  source: string
  plan: boolean
  work: boolean
  declaredApproval: string
  effectiveApproval: string
  hasApprovalClassifier: boolean
}

export interface ToolsReport {
  plan: ToolDefinitionInfo[]
  work: ToolDefinitionInfo[]
  external: ExternalToolInfo[]
  externalNotes: string[]
  externalToolsEnabled: boolean
  externalApproval: { home: string; project: string }
}

export interface HelpReport {
  builtIn: SlashCommand[]
  plugins: SlashCommand[]
}

export interface DocumentBlock {
  type: string
  columns: string[]
  rows: string[][]
  lines: string[]
  /** Rows or lines the server left out. */
  omitted: number
}

/** What `report.document` carries: a titled document a slash command or plugin wrote. */
export interface ReportDocument {
  title: string
  blocks: DocumentBlock[]
}

// --- structured queries (GET /sessions, /models, /options, /agents, /skills,
// /mcp, /plugins, /tasks) ---------------------------------------------------

export interface SavedSession extends SessionSummary {
  /** This process's current session. */
  current: boolean
  /** Another process, or this one, holds it open, so it cannot be resumed. */
  open: boolean
}

export interface ModelEntry {
  provider: string
  model: string
  protocol: string
  current: boolean
  credentialReady: boolean
  contextWindows: number[]
  thinking: boolean
  thinkingCanDisable: boolean
  thinkingEfforts: string[]
  serviceTiers: string[]
  speeds: string[]
  imageInput: boolean
  maxTokens: number | null
}

export interface ModelCatalog {
  models: ModelEntry[]
  pending: PendingSettings
}

export interface OptionValue {
  value: string
  name: string
  /** The slash command that selects it. Empty means it cannot be chosen directly. */
  command: string
  description: string | null
  group: string | null
}

export interface SessionOption {
  id: string
  name: string
  category: string
  current: string
  switch: boolean
  description: string | null
  values: OptionValue[]
}

export interface OptionCatalog {
  options: SessionOption[]
  pending: PendingSettings
}

export interface AgentEntry {
  name: string
  description: string
  custom: boolean
  /** Each field is null when the Agent inherits it from the session. */
  model: {
    provider: string | null
    model: string | null
    thinking: string | null
    context: number | null
    tier: string | null
    speed: string | null
  }
  /** Null means the default tool set. */
  tools: string[] | null
}

export interface AgentsReport {
  enabled: boolean
  concurrency: number
  /** Null is unlimited. */
  limits: { modelCalls: number | null; toolCalls: number | null; durationSeconds: number | null }
  agents: AgentEntry[]
  notes: string[]
}

export interface SkillEntry {
  name: string
  description: string
  /** `home` or `project`. */
  source: string
  location: string
}

export interface SkillsReport {
  enabled: boolean
  skills: SkillEntry[]
}

export interface McpServerEntry {
  name: string
  source: string
  transport: string
  status: string
  tools: string[]
  error: string
}

export interface McpReport {
  enabled: boolean
  servers: McpServerEntry[]
  notes: string[]
}

export interface PluginEntry {
  directory: string
  source: string
  name: string | null
  /** Null when the plugin has no switch of its own. */
  enabled: boolean | null
  effective: boolean
  loaded: boolean
  tools: number
  commands: number
  hooks: number
  error: string
}

export interface PluginsReport {
  enabled: boolean
  plugins: PluginEntry[]
  notes: string[]
}

export interface BackgroundTask {
  id: string
  command: string
  workingDirectory: string
  /** `starting`, `running`, `exited`, `failed`, `timed_out`, or `stopped`. */
  status: string
  exitCode: number | null
  startedUtc: string | null
  finishedUtc: string | null
  logStartOffset: number
  logEndOffset: number
}

export interface TaskLog {
  text: string
  nextOffset: number
  hasMore: boolean
}
