// The server sends the built-in modes in lower case and a custom mode as the
// user named it. The terminal shows the built-ins as Plan and Work; a custom
// mode gets the same leading capital so Review reads like its neighbours.
export function modeLabel(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}
