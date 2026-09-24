export function canEnableAuthoringMode(isDevelopment: boolean, search: string) {
  if (!isDevelopment) return false
  return new URLSearchParams(search).get('authoring') === '1'
}
