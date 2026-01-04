const LS_API_BASE = 'gc_api_base';

export function getApiBase() {
  return localStorage.getItem(LS_API_BASE) || 'http://localhost:4000';
}

export function setApiBase(nextBase) {
  localStorage.setItem(LS_API_BASE, nextBase);
}
