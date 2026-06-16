# Install

ADO Companion is currently distributed as **GitHub Release** artifacts. Download the build for your browser below, then follow the steps to load it.

> Chrome and Edge block installing extensions from outside their store, so they use the built-in **Developer mode → Load unpacked** flow. The Firefox build is **signed by Mozilla**, so it installs directly from the downloaded `.xpi`. Official Chrome/Edge store listings (one-click install) are planned.

<div class="download-grid">
  <div class="download-card">
    <h3>🟦 Chrome</h3>
    <p>Chromium build (Manifest V3).</p>
    <a class="download-btn" href="https://github.com/MJuma/ado-companion/releases/latest/download/ado-companion-chrome.zip">Download for Chrome</a>
  </div>
  <div class="download-card">
    <h3>🟩 Edge</h3>
    <p>Uses the same Chromium build.</p>
    <a class="download-btn" href="https://github.com/MJuma/ado-companion/releases/latest/download/ado-companion-chrome.zip">Download for Edge</a>
  </div>
  <div class="download-card">
    <h3>🟧 Firefox</h3>
    <p>Signed Firefox build (Manifest V2).</p>
    <a class="download-btn" href="https://github.com/MJuma/ado-companion/releases/latest/download/ado-companion-firefox.xpi">Download for Firefox</a>
  </div>
</div>

## Chrome

1. **Download** `ado-companion-chrome.zip` (button above) and **unzip** it.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped folder.

The ADO Companion icon appears in your toolbar. Open any `dev.azure.com` page to see it in action.

## Edge

1. **Download** `ado-companion-chrome.zip` and **unzip** it.
2. Open `edge://extensions`.
3. Enable **Developer mode** (left sidebar).
4. Click **Load unpacked** and select the unzipped folder.

## Firefox

1. **Download** `ado-companion-firefox.xpi` (button above).
2. Open `about:addons`.
3. Click the gear icon (⚙️) → **Install Add-on From File…** and select the `.xpi` — or just **drag the `.xpi`** onto the `about:addons` page.
4. Confirm the prompt to add the extension.

The Firefox build is signed by Mozilla for self-distribution, so it installs and stays installed like any store add-on.

::: tip Developer builds
Unsigned local builds (e.g. `pnpm dev:firefox`) load via `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** (removed when Firefox restarts).
:::

## Updating

Download the latest build from the buttons above (they always point to the most recent release) and repeat the steps for your browser. For Chrome/Edge, you can click the **Reload** action on the extension card after replacing the folder.
