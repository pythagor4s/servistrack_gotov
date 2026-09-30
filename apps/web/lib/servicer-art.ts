const WITH_ART = new Set([
  "svc_cnc",
  "svc_esko",
  "svc_finish",
  "svc_grafo",
  "svc_it",
  "svc_hvac",
  "svc_packaging",
  "svc_print",
  "svc_welding",
  "svc_zund",
]);

export function servicerArt(id: string): { logo: string } | null {
  return WITH_ART.has(id) ? { logo: `/servicers/${id}-logo.svg` } : null;
}
