export function getBaseURL(): string {
  return import.meta.env.BASE_URL.replace(/\/+$/, '');
}
