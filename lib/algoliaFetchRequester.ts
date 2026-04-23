import type {
  Destroyable,
  Request,
  Requester,
  Response,
} from "@algolia/requester-common";

/**
 * Requester HTTP para `algoliasearch` v4 sin `url.parse()` (Node DEP0169).
 * Usa `fetch` global (WHATWG URL); mismo contrato que `@algolia/requester-node-http`.
 */
export function createAlgoliaFetchRequester(): Requester & Destroyable {
  return {
    send(request: Request): Readonly<Promise<Response>> {
      return new Promise((resolve) => {
        const deadlineMs = Math.max(
          1,
          (request.connectTimeout + request.responseTimeout) * 1000
        );
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), deadlineMs);

        fetch(request.url, {
          method: request.method,
          headers: { ...request.headers },
          body: request.data,
          signal: controller.signal,
        })
          .then(async (res) => {
            clearTimeout(timer);
            const content = await res.text();
            resolve({ status: res.status, content, isTimedOut: false });
          })
          .catch((err: unknown) => {
            clearTimeout(timer);
            const name =
              err && typeof err === "object" && "name" in err
                ? String((err as { name?: string }).name)
                : "";
            const isAbort = name === "AbortError";
            resolve({
              status: 0,
              content: isAbort
                ? "Socket timeout"
                : String(err instanceof Error ? err.message : err),
              isTimedOut: isAbort,
            });
          });
      });
    },
    destroy() {
      return Promise.resolve();
    },
  };
}
