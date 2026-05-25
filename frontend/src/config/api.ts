const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
	throw new Error('Missing VITE_API_URL environment variable.');
}

export const API_BASE = configuredApiUrl.replace(/\/+$/, '');
