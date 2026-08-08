// api.js — Cliente REST. Toda la persistencia pasa por aquí; el resto del
// frontend nunca habla con el disco directamente.

async function j(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (_) {}
    throw new Error(`${res.status} · ${detail}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  listProjects: () => j('GET', '/api/projects'),
  createProject: (name) => j('POST', '/api/projects', { name }),
  duplicateProject: (slug, name) => j('POST', `/api/projects/${slug}/duplicate`, { name: name || null }),
  getProject: (slug) => j('GET', `/api/projects/${slug}`),
  saveProject: (slug, project) => j('PUT', `/api/projects/${slug}`, project),
  deleteProject: (slug) => j('DELETE', `/api/projects/${slug}`),
  duplicateSlide: (slug, slideId) =>
    j('POST', `/api/projects/${slug}/slides/duplicate`, { slideId }),

  async uploadAsset(slug, file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/projects/${slug}/assets`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Error subiendo asset: ${res.status}`);
    return res.json(); // { src, url }
  },

  assetUrl: (slug, src) => `/api/projects/${slug}/${src}`,
};
