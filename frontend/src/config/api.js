// Keep the local API convenient for `npm run dev`, while ensuring a Vercel
// build never falls back to a server running on the visitor's own computer.
// `VITE_API_BASE` remains available for preview/staging deployments.
const defaultApiBase = import.meta.env.PROD
  ? 'https://procter-exam-system-v2.onrender.com/api'
  : 'http://localhost:5000/api';

export const API_BASE = (import.meta.env.VITE_API_BASE || defaultApiBase).replace(/\/$/, '');

// In production Vite values are embedded at build time. Deriving the socket
// host from VITE_API_BASE prevents a missing VITE_SOCKET_URL from silently
// sending the browser back to localhost.
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');
