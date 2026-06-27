import http from 'node:http';

export type ParsedOAuthCallback =
  | {
      ok: true;
      code: string;
    }
  | {
      ok: false;
      error: string;
    };

export function parseOAuthCallbackUrl(requestUrl: string, expectedState: string): ParsedOAuthCallback {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const error = url.searchParams.get('error');
  if (error) {
    return {
      ok: false,
      error: `Google OAuth returned an error: ${error}.`
    };
  }

  if (url.searchParams.get('state') !== expectedState) {
    return {
      ok: false,
      error: 'OAuth state did not match.'
    };
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return {
      ok: false,
      error: 'OAuth callback did not include a code.'
    };
  }

  return {
    ok: true,
    code
  };
}

export function waitForOAuthCode(input: { expectedState: string; port: number; timeoutMs: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const parsed = parseOAuthCallbackUrl(request.url ?? '/', input.expectedState);
      if (!parsed.ok) {
        response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
        response.end(`<h1>Signalbox could not connect Gmail</h1><p>${escapeHtml(parsed.error)}</p>`);
        cleanup();
        reject(new Error(parsed.error));
        return;
      }

      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<h1>Gmail connected</h1><p>You can return to Signalbox.</p>');
      cleanup();
      resolve(parsed.code);
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Google OAuth callback.'));
    }, input.timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      server.close();
    };

    server.listen(input.port, '127.0.0.1');
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
