# Remote Query Apps

Use this for standalone Helios apps that search or download live data from APIs such as OpenAlex, Crossref, Semantic Scholar, Netzschleuder-like catalogues, or custom graph endpoints.

## Startup State

Do not show a synthetic graph just to make the canvas look active. Use one of these:

- Empty ready state with search controls visible.
- A clearly real default query only when the user asks for a default example.
- A bundled sample only when the app is explicitly an offline demo.

The status line should say what the app is waiting for, such as `Enter a search term` or `Ready`.

## Probe the API Early

Before writing lots of UI or tests, verify the live endpoint:

```bash
curl -sS 'https://api.example.org/search?q=test&per-page=3' | head
```

For browser-only APIs, run the Vite app early and check the browser console/network panel. Unit tests should encode parameters after live verification, not before it.

## Caps, Progress, and Cancellation

Large remote downloads need visible, editable limits:

- Numeric input for max records/nodes/edges/pages.
- Progress text with exact counts.
- Cancellation with `AbortController`.
- Clear status when a cap is reached.
- No hidden hard caps that contradict the user's requested scale.

Pattern:

```js
const state = {
  maxWorks: 500,
  maxReferencesPerWork: 50,
  abortController: null,
};

async function runDownload(query) {
  state.abortController?.abort();
  state.abortController = new AbortController();
  let downloaded = 0;
  try {
    for await (const page of fetchPages(query, { signal: state.abortController.signal })) {
      downloaded += page.results.length;
      setStatus(`Downloaded ${downloaded.toLocaleString()} / ${state.maxWorks.toLocaleString()}`);
      if (downloaded >= state.maxWorks) break;
    }
  } catch (error) {
    if (error?.name === 'AbortError') setStatus('Cancelled');
    else throw error;
  }
}
```

## Helios Startup

Remote-query apps should usually start persistence-free because the graph is transient:

```js
const helios = new Helios(network, {
  container: viewer,
  storage: false,
  session: false,
  warnOnUnsavedChanges: false,
});
```

Preserve Helios mode/projection/layout defaults unless the API returns trusted coordinates or the user asks for a specific layout. If you need fit, pause/resume, or zoom controls, check built-in Helios quick controls before adding custom floating buttons.

## Replacing Results

When a query returns a new graph, prefer replacing the network in place:

```js
await helios.replaceNetwork(nextNetwork, {
  keepCamera: false,
  keepMappers: false,
  frame: false,
  markNetworkDirty: false,
});
applyMappers(helios);
helios.requestFrameNetwork({ animate: false });
```

Expose `window.helios` and `window.heliosNetwork` during development so browser smoke checks can verify node/edge counts and mapper state.

## Browser Verification

Run the first browser smoke test as soon as search, download, and rendering are connected. Check:

- Autocomplete or search parameters match the live API.
- Pagination advances and terminates.
- Download caps are visible and editable.
- Cancel stops the in-flight request.
- The app does not render a blank canvas silently.
- Pointer events reach custom controls; panels do not block Helios interactions unexpectedly.
- Reload returns to an empty or clearly documented default state without session prompts.
