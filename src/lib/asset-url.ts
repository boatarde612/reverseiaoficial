// Media pointers (*.asset.json) hold root-relative URLs that only Lovable hosting serves.
// Builds hosted elsewhere (Netlify) set VITE_ASSET_ORIGIN to the Lovable site that serves them.
const ORIGIN = (import.meta.env.VITE_ASSET_ORIGIN as string | undefined)?.replace(/\/+$/, "") ?? "";

export function assetUrl(path: string): string {
  return path.startsWith("/") ? `${ORIGIN}${path}` : path;
}
