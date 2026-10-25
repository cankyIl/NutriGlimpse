import type { RuleUpdateSource } from './ruleManager.ts';

/** Endpoint is compiled operator configuration, never user/archive/envelope content.
 * Streaming is required: runtimes without a bounded reader fail closed. */
export function createRuleUpdateSource(endpoint: string, fetcher: typeof fetch = fetch, timeoutMs = 10000): RuleUpdateSource {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search ||
      url.port || !url.hostname.includes('.') || /^(localhost|.*\.localhost|.*\.local)$/.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':') ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000)
    throw Error('A fixed public HTTPS rule endpoint is required.');
  const target = url.href;
  return async signal => {
    if (signal.aborted) throw Error('Rule update cancelled.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const operation = async () => {
      const response = await fetcher(target, { method: 'GET', signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (controller.signal.aborted) { void response.body?.cancel().catch(() => {}); throw Error('Rule update cancelled.'); }
      if (response.status !== 200 || response.redirected || (response.url && response.url !== target) ||
          response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
        { void response.body?.cancel().catch(() => {}); throw Error('Unexpected rule response.'); }
      const declared = response.headers.get('content-length');
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 524288)) throw Error('Rule response exceeds limit.');
      if (!response.body?.getReader) throw Error('Bounded rule downloads are unavailable in this runtime.');
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let bytes = 0; let text = '';
      while (true) {
        if (controller.signal.aborted) throw Error('Rule update cancelled.');
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 524288) throw Error('Rule response exceeds limit.');
        text += decoder.decode(part.value, { stream: true });
      }
      text += decoder.decode();
      if (!bytes) throw Error('Empty rule response.');
      return text;
    };
    try {
      // The deadline also bounds injected/native fetch implementations that ignore abort.
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(Error('Rule download timed out.')); }, timeoutMs);
        controller.signal.addEventListener('abort', () => reject(Error('Rule update cancelled.')), { once: true });
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      controller.abort();
      void reader?.cancel().catch(() => {});
    }
  };
}
