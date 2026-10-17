import axios from "axios";

const BACKEND_PROXY = "/api/backend";

export const api = axios.create({
baseURL: BACKEND_PROXY,
withCredentials: true,
});

// El backend devuelve rutas relativas (/uploads/...) para los archivos.
// Se piden a través del mismo proxy que el resto de las llamadas.
export function getBackendFileUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  return `${BACKEND_PROXY}${path.startsWith("/") ? "" : "/"}${path}`;
}
