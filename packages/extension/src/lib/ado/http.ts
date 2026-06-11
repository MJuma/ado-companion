// Low-level fetch helpers for the Azure DevOps REST API.
//
// All requests use the browser's existing ADO session cookies
// (`credentials: 'include'`) and send `X-TFS-FedAuthRedirect: Suppress` so an
// unauthenticated request returns a JSON/empty 401 instead of an auth-redirect
// HTML page (which would otherwise fail JSON parsing in confusing ways).

export class AdoApiError extends Error {
    readonly status: number;
    readonly body: string;

    constructor(status: number, body: string) {
        super(`ADO API error ${status}: ${body}`);
        this.name = 'AdoApiError';
        this.status = status;
        this.body = body;
    }
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
    json?: unknown;
    body?: BodyInit;
    contentType?: string;
}

function buildInit(method: HttpMethod, options: RequestOptions): RequestInit {
    const headers = new Headers({ 'X-TFS-FedAuthRedirect': 'Suppress' });
    const init: RequestInit = { method, credentials: 'include', headers };

    if (options.json !== undefined) {
        headers.set('Content-Type', 'application/json');
        init.body = JSON.stringify(options.json);
    } else if (options.body !== undefined) {
        if (options.contentType) {
            headers.set('Content-Type', options.contentType);
        }
        init.body = options.body;
    }

    return init;
}

async function request(
    method: HttpMethod,
    url: string,
    options: RequestOptions = {},
): Promise<Response> {
    const response = await fetch(url, buildInit(method, options));
    if (!response.ok) {
        let body = '';
        try {
            body = await response.text();
        } catch {
            body = '';
        }
        throw new AdoApiError(response.status, body);
    }
    return response;
}

export async function adoGetJson<T>(url: string): Promise<T> {
    const response = await request('GET', url);
    return response.json() as Promise<T>;
}

export async function adoGetText(url: string): Promise<string> {
    const response = await request('GET', url);
    return response.text();
}

export async function adoSendJson<T>(
    method: HttpMethod,
    url: string,
    json?: unknown,
): Promise<T> {
    const response = await request(method, url, { json });
    return response.json() as Promise<T>;
}

export async function adoSendVoid(
    method: HttpMethod,
    url: string,
    json?: unknown,
): Promise<void> {
    await request(method, url, json === undefined ? {} : { json });
}

export async function adoPostBinary<T>(
    url: string,
    body: BodyInit,
    contentType = 'application/octet-stream',
): Promise<T> {
    const response = await request('POST', url, { body, contentType });
    return response.json() as Promise<T>;
}
