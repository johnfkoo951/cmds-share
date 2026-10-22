// Pele diagram rendering for share pages.
// vendor/cmds-pele/ is a consumer copy of the cmds-pele module (bootstrap, theme, version stamp).
// The Pele bundle itself (~680 KB) is not shipped: pages load it from jsDelivr, pinned to the
// stamp's version and checked with Subresource Integrity against the stamp's sha256.
import bootstrap from '../vendor/cmds-pele/cmds-pele.bootstrap.txt';
import theme from '../vendor/cmds-pele/cmds-pele.theme.css';
import stamp from '../vendor/cmds-pele/cmds-pele.version.json';

export const PELE_VERSION: string = stamp.pele;
export const CMDS_PELE_VERSION: string = stamp.version;
export const PELE_URL = `https://cdn.jsdelivr.net/npm/pele@${stamp.pele}/dist/pele.global.js`;
export const PELE_SRI = `sha256-${hexToBase64(stamp.files['pele.global.js'])}`;

/** Inline-safe copies: a literal "</script" inside the bootstrap would close the host <script>. */
export const CMDS_PELE_JS: string = bootstrap.replace(/<\/script/gi, '<\\/script');
export const CMDS_PELE_CSS: string = theme.replace(/<\/style/gi, '<\\/style');

function hexToBase64(hex: string): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	const bytes: number[] = [];
	for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
	let out = '';
	for (let i = 0; i < bytes.length; i += 3) {
		const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
		out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63]
			+ (i + 1 < bytes.length ? chars[(n >> 6) & 63] : '=')
			+ (i + 2 < bytes.length ? chars[n & 63] : '=');
	}
	return out;
}
