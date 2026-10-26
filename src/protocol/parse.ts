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
