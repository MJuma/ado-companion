# Install

ADO Companion is currently distributed as **GitHub Release** artifacts. Download the build for your browser below, then follow the steps to load it.

> Browsers block installing extensions from outside their official stores, so for now Chrome and Edge use the built-in **Developer mode → Load unpacked** flow, and Firefox uses a **temporary add-on**. Official store listings (one-click install) are planned.

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
    <p>Firefox build (Manifest V2).</p>
    <a class="download-btn" href="https://github.com/MJuma/ado-companion/releases/latest/download/ado-companion-firefox.zip">Download for Firefox</a>
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

1. **Download** `ado-companion-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select the downloaded `.zip` file.

::: warning Temporary install
Firefox removes temporarily-loaded add-ons when it restarts. Permanent, one-click installation requires the build to be signed by Mozilla (AMO) — this is planned.
:::

## Updating

Download the latest build from the buttons above (they always point to the most recent release) and repeat the steps for your browser. For Chrome/Edge, you can click the **Reload** action on the extension card after replacing the folder.
