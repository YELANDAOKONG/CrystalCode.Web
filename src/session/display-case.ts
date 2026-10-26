// Port of the terminal's `DisplayCase.Token` (CrystalCode.Engine/Configuration).
// The server sends tokens such as `review` or `outside_workspace`; the
// terminal shows them as `Review` and `Outside Workspace`. Keep the two lists
// of special cases in step with the engine.
export function displayToken(value: string): string {
  if (value.length === 0) return value
  switch (value.toLowerCase()) {
    case 'todowrite':
      return 'TodoWrite'
    case 'todoread':
      return 'TodoRead'
    case 'outside_workspace':
      return 'Outside Workspace'
    case 'privileged_escalation':
      return 'Privileged Escalation'
    default:
      return value
        .replaceAll('_', ' ')
        .split(' ')
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
  }
}
