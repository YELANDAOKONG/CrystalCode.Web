import { arr, asObject, bool, isObject, num, optNum, optStr, str, strings, type JsonObject } from './json'
import type {
  BuildIdentity,
  Chrome,
  ChildSummary,
  Classification,
  ConversationItem,
  Interaction,
  LiveRound,
  Preferences,
  Question,
  QuickPromptCatalog,
  Scope,
  ServerEvent,
  ServerInfo,
  Side,
  SessionSummary,
  SlashCommand,
  Snapshot,
  StatusField,
  Todo,
  ToolCall,
  Usage,
  Verdict,
  StatusReport,
  StatsReport,
  ToolDefinitionInfo,
  ToolsReport,
  HelpReport,
} from './types'

export function parseScope(value: unknown): Scope {
  return value === 'admin' || value === 'operate' ? value : 'observe'
}

export function parseUsage(value: unknown): Usage | null {
  if (!isObject(value)) return null
  return {
    inputTokens: num(value.inputTokens),
    outputTokens: num(value.outputTokens),
    reasoningTokens: optNum(value.reasoningTokens),
    totalTokens: num(value.totalTokens),
  }
}

function parseBuild(value: unknown): BuildIdentity {
  const o = asObject(value)
  return {
    crystalCode: optStr(o.crystalCode),
    crystal: optStr(o.crystal),
    sdk: optStr(o.sdk),
    configuration: optStr(o.configuration),
    runtime: optStr(o.runtime),
    os: optStr(o.os),
  }
}

export function parseInfo(value: unknown): ServerInfo {
  const o = asObject(value)
  return {
    product: str(o.product),
    build: parseBuild(o.build),
    state: str(o.state),
    error: optStr(o.error),
    sessionId: optStr(o.sessionId),
    workspace: optStr(o.workspace),
    scope: parseScope(o.scope),
    authentication: bool(o.authentication, true),
    operations: strings(o.operations),
    eventTypes: strings(o.eventTypes),
    interactionKinds: strings(o.interactionKinds),
    slashCommands: strings(o.slashCommands),
  }
}

export function parseChrome(value: unknown): Chrome | null {
  if (!isObject(value)) return null
  return {
    model: str(value.model),
    workspace: str(value.workspace),
    mode: str(value.mode, 'work'),
    planMode: bool(value.planMode),
    approval: str(value.approval),
    thinking: str(value.thinking),
    promptSet: str(value.promptSet),
    contextWindow: num(value.contextWindow),
    serviceTier: str(value.serviceTier),
    speed: str(value.speed),
    agentsEnabled: bool(value.agentsEnabled),
  }
}

export function parsePreferences(value: unknown): Preferences | null {
  if (!isObject(value)) return null
  return {
    estimatedTokens: bool(value.estimatedTokens),
    todoBar: bool(value.todoBar),
    todoBarRows: num(value.todoBarRows),
    verboseTools: bool(value.verboseTools),
    verboseCommands: bool(value.verboseCommands),
    verboseResults: bool(value.verboseResults),
    verboseCalls: bool(value.verboseCalls),
    verboseApprovals: bool(value.verboseApprovals),
    verboseReview: bool(value.verboseReview),
    verboseThinking: bool(value.verboseThinking),
    statusLineEnabled: bool(value.statusLineEnabled),
    statusLineFields: strings(value.statusLineFields),
  }
}

export function parseCommands(value: unknown): SlashCommand[] {
  return arr(value).map((item) => {
    const o = asObject(item)
    return {
      name: str(o.name),
      help: str(o.help),
      keys: strings(o.keys),
      argumentsOptional: bool(o.argumentsOptional),
      arguments: parseCommands(o.arguments),
      argumentsAfterValue: parseCommands(o.argumentsAfterValue),
    }
  })
}

export function parseToolCall(value: unknown): ToolCall {
  const o = asObject(value)
  return {
    callId: str(o.callId),
    name: str(o.name),
    arguments: str(o.arguments),
    inputKind: str(o.inputKind, 'json'),
  }
}

function numbers(value: unknown): number[] {
  return arr(value).filter((item): item is number => typeof item === 'number')
}

export function parseItem(value: unknown): ConversationItem {
  const o = asObject(value)
  switch (o.kind) {
    case 'message':
      return { kind: 'message', role: str(o.role), text: str(o.text), images: numbers(o.images) }
    case 'reasoning':
      return {
        kind: 'reasoning',
        segments: arr(o.segments).map((segment) => {
          const s = asObject(segment)
          return { kind: str(s.kind), text: str(s.text) }
        }),
        hasState: bool(o.hasState),
      }
    case 'tool_call':
      return { kind: 'tool_call', ...parseToolCall(o) }
    case 'tool_result':
      return {
        kind: 'tool_result',
        callId: str(o.callId),
        status: str(o.status),
        text: str(o.text),
        images: numbers(o.images),
      }
    default:
      return { kind: 'unknown' }
  }
}

export function parseItems(value: unknown): ConversationItem[] {
  return arr(value).map(parseItem)
}

export function parseLive(value: unknown): LiveRound | null {
  if (!isObject(value)) return null
  return {
    text: str(value.text),
    reasoning: str(value.reasoning),
    toolCalls: arr(value.toolCalls).map(parseToolCall),
    retries: num(value.retries),
  }
}

export function parseTodos(value: unknown): Todo[] {
  return arr(value).map((item) => {
    const o = asObject(item)
    return { id: str(o.id), content: str(o.content), status: str(o.status) }
  })
}

export function parseStatusFields(value: unknown): StatusField[] {
  return arr(value).map((item) => {
    const o = asObject(item)
    return { name: str(o.name), text: str(o.text) }
  })
}

export function parseSide(value: unknown): Side {
  const o = asObject(value)
  return {
    announce: bool(o.announce),
    running: bool(o.running),
    thinking: bool(o.thinking),
    pendingQuestion: str(o.pendingQuestion),
    liveAnswer: str(o.liveAnswer),
    failure: optStr(o.failure),
    exchanges: arr(o.exchanges).map((item) => {
      const e = asObject(item)
      return { question: str(e.question), answer: str(e.answer) }
    }),
  }
}

export function parseChild(value: unknown): ChildSummary {
  const o = asObject(value)
  const model = asObject(o.model)
  return {
    id: str(o.id),
    parentCallId: str(o.parentCallId),
    agent: str(o.agent),
    label: str(o.label),
    status: str(o.status),
    stopReason: optStr(o.stopReason),
    model: {
      provider: optStr(model.provider),
      model: optStr(model.model),
      thinking: optStr(model.thinking),
      contextWindow: optNum(model.contextWindow),
      serviceTier: optStr(model.serviceTier),
      speed: optStr(model.speed),
    },
    tools: strings(o.tools),
    todos: parseTodos(o.todos),
    usage: parseUsage(o.usage),
    cumulativeUsage: parseUsage(o.cumulativeUsage),
    modelCalls: num(o.modelCalls),
    toolCalls: num(o.toolCalls),
    notes: strings(o.notes),
    archive: Array.isArray(o.archive) ? parseItems(o.archive) : null,
  }
}

export function parseClassification(value: unknown): Classification {
  const o = asObject(value)
  return {
    risk: str(o.risk),
    authority: str(o.authority),
    summary: str(o.summary),
    requirePrompt: bool(o.requirePrompt),
    allowsReusableGrant: bool(o.allowsReusableGrant),
  }
}

export function parseVerdict(value: unknown): Verdict | null {
  if (!isObject(value)) return null
  return {
    outcome: str(value.outcome),
    riskLevel: str(value.riskLevel),
    userAuthorization: str(value.userAuthorization),
    rationale: str(value.rationale),
  }
}

function parseQuestions(value: unknown): Question[] {
  return arr(value).map((item) => {
    const o = asObject(item)
    return {
      header: str(o.header),
      text: str(o.text),
      multiple: bool(o.multiple),
      custom: bool(o.custom),
      options: arr(o.options).map((option) => {
        const p = asObject(option)
        return { label: str(p.label), description: str(p.description) }
      }),
    }
  })
}

function parseSessionSummary(value: unknown): SessionSummary {
  const o = asObject(value)
  return {
    id: str(o.id),
    workspace: str(o.workspace),
    mode: str(o.mode),
    createdUtc: optStr(o.createdUtc),
    updatedUtc: optStr(o.updatedUtc),
    userTurns: num(o.userTurns),
    preview: str(o.preview),
  }
}

export function parseInteraction(value: unknown): Interaction {
  const o = asObject(value)
  const p: JsonObject = asObject(o.payload)
  const base = { id: str(o.id), target: optStr(o.target) }
  switch (o.kind) {
    case 'approval':
      return {
        ...base,
        kind: 'approval',
        call: parseToolCall(p.call),
        classification: parseClassification(p.classification),
        review: parseVerdict(p.review),
        extendedReview: parseVerdict(p.extendedReview),
        choices: strings(p.choices),
      }
    case 'question':
      return { ...base, kind: 'question', questions: parseQuestions(p.questions) }
    case 'trust':
      return {
        ...base,
        kind: 'trust',
        workspace: str(p.workspace),
        trustRoot: str(p.trustRoot),
        coversRepository: bool(p.coversRepository),
      }
    case 'choose_session':
      return {
        ...base,
        kind: 'choose_session',
        currentId: optStr(p.currentId),
        listWorkspace: bool(p.listWorkspace),
        sessions: arr(p.sessions).map(parseSessionSummary),
      }
    case 'choose_child':
      return { ...base, kind: 'choose_child', children: arr(p.children).map(parseChild) }
    default:
      return { ...base, kind: str(o.kind, 'unknown') }
  }
}

export function parseSnapshot(value: unknown): Snapshot {
  const o = asObject(value)
  return {
    state: str(o.state),
    sessionId: optStr(o.sessionId),
    lastSeq: num(o.lastSeq),
    chrome: parseChrome(o.chrome),
    preferences: parsePreferences(o.preferences),
    commands: parseCommands(o.commands),
    promptHistory: strings(o.promptHistory),
    conversation: parseItems(o.conversation),
    live: parseLive(o.live),
    turnActive: bool(o.turnActive),
    activity: str(o.activity, 'idle'),
    queue: strings(o.queue),
    todos: parseTodos(o.todos),
    statusFields: parseStatusFields(o.statusFields),
    usage: parseUsage(o.usage),
    cumulativeUsage: parseUsage(o.cumulativeUsage),
    contextWindow: num(o.contextWindow),
    estimatedContextTokens: optNum(o.estimatedContextTokens),
    side: parseSide(o.side),
    children: arr(o.children).map(parseChild),
    lastTurn: isObject(o.lastTurn)
      ? { reason: str(o.lastTurn.reason), modelCalls: num(o.lastTurn.modelCalls), toolCalls: num(o.lastTurn.toolCalls) }
      : null,
    interactions: arr(o.interactions).map(parseInteraction),
  }
}

export function parseEvent(value: unknown): ServerEvent | null {
  if (!isObject(value) || typeof value.seq !== 'number' || typeof value.type !== 'string') return null
  const source = isObject(value.source)
    ? { childSessionId: str(value.source.childSessionId), invocationId: str(value.source.invocationId) }
    : null
  return {
    seq: value.seq,
    type: value.type,
    time: str(value.time),
    sessionId: optStr(value.sessionId),
    origin: optStr(value.origin),
    target: optStr(value.target),
    source,
    data: asObject(value.data),
  }
}

export function parseQuickPrompts(value: unknown): QuickPromptCatalog {
  const o = asObject(value)
  return {
    directory: str(o.directory),
    error: optStr(o.error),
    prompts: arr(o.prompts).map((item) => {
      const p = asObject(item)
      return { name: str(p.name), text: str(p.text), error: optStr(p.error) }
    }),
  }
}

const STATUS_COUNTS = [
  'userTurns', 'modelCalls', 'toolCalls', 'queuedMessages', 'todos', 'planTools', 'workTools',
  'externalTools', 'plugins', 'mcpServers', 'mcpTools',
] as const

const STATUS_FLAGS = [
  'skillsEnabled', 'externalToolsEnabled', 'pluginsEnabled', 'mcpEnabled', 'globalRulesEnabled',
  'projectRulesEnabled', 'estimatedTokensEnabled', 'customStatusLineEnabled',
] as const

const STATUS_SLOTS = [
  'approvalModel', 'approvalThinking', 'extendedApprovalModel', 'extendedApprovalThinking',
  'extendedApprovalTrigger', 'compactionModel', 'microCompaction', 'retry', 'approvalRetry',
] as const

export function parseStatusReport(data: unknown): StatusReport {
  const root = asObject(data)
  const o = asObject(root.status)
  const counts: Record<string, number> = {}
  for (const key of STATUS_COUNTS) counts[key] = num(o[key])
  const flags: Record<string, boolean> = {}
  for (const key of STATUS_FLAGS) flags[key] = bool(o[key])
  const slots: Record<string, string> = {}
  for (const key of STATUS_SLOTS) {
    const value = optStr(o[key])
    if (value !== null && value !== '') slots[key] = value
  }

  return {
    full: bool(root.full),
    sessionId: str(o.sessionId),
    startedUtc: str(o.startedUtc),
    workspace: str(o.workspace),
    mode: str(o.mode),
    approval: str(o.approval),
    thinking: str(o.thinking),
    promptSet: str(o.promptSet),
    provider: str(o.provider),
    model: str(o.model),
    contextWindow: num(o.contextWindow),
    serviceTier: str(o.serviceTier),
    speed: str(o.speed),
    usage: parseUsage(o.usage),
    cumulativeUsage: parseUsage(o.cumulativeUsage),
    counts,
    flags,
    slots,
  }
}

export function parseStatsReport(data: unknown): StatsReport {
  const root = asObject(data)
  const o = asObject(root.report)
  return {
    allWorkspaces: bool(root.allWorkspaces),
    sessions: num(o.sessions),
    userTurns: num(o.userTurns),
    modelCalls: num(o.modelCalls),
    toolCalls: num(o.toolCalls),
    inputTokens: num(o.inputTokens),
    outputTokens: num(o.outputTokens),
    reasoningTokens: num(o.reasoningTokens),
    totalTokens: num(o.totalTokens),
    averageTokensPerSession: num(o.averageTokensPerSession),
    medianTokensPerSession: num(o.medianTokensPerSession),
    windowDays: num(o.windowDays),
    earliest: optStr(o.earliest),
    latest: optStr(o.latest),
    topTools: arr(o.topTools).map((item) => {
      const t = asObject(item)
      return { name: str(t.name), count: num(t.count) }
    }),
  }
}

function parseToolDefinitions(value: unknown): ToolDefinitionInfo[] {
  return arr(value).map((item) => {
    const o = asObject(item)
    return { name: str(o.name), description: optStr(o.description), inputKind: str(o.inputKind), schema: o.schema ?? null }
  })
}

export function parseToolsReport(data: unknown): ToolsReport {
  const o = asObject(asObject(data).report)
  const approval = asObject(o.externalApproval)
  return {
    plan: parseToolDefinitions(o.plan),
    work: parseToolDefinitions(o.work),
    external: arr(o.external).map((item) => {
      const e = asObject(item)
      return {
        name: str(e.name),
        set: str(e.set),
        source: str(e.source),
        plan: bool(e.plan),
        work: bool(e.work),
        declaredApproval: str(e.declaredApproval),
        effectiveApproval: str(e.effectiveApproval),
        hasApprovalClassifier: bool(e.hasApprovalClassifier),
      }
    }),
    externalNotes: strings(o.externalNotes),
    externalToolsEnabled: bool(o.externalToolsEnabled),
    externalApproval: { home: str(approval.home), project: str(approval.project) },
  }
}

export function parseHelpReport(data: unknown): HelpReport {
  const o = asObject(data)
  return { builtIn: parseCommands(o.builtIn), plugins: parseCommands(o.plugins) }
}
