import { webLightTheme } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
import { render } from 'solid-js/web';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';

import { InjectedWidget } from '../app/InjectedWidget';
import { parseAdoContext } from '../lib/ado';

export default defineContentScript({
    matches: ['https://dev.azure.com/*', 'https://*.visualstudio.com/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {
        const context = parseAdoContext(window.location.href);
        if (!context.isAzureDevOps) {
            return;
        }

        const ui = await createShadowRootUi(ctx, {
            name: 'ado-companion-ui',
            position: 'inline',
            anchor: 'body',
            onMount(container) {
                setTheme(webLightTheme, container);
                return render(
                    () => <InjectedWidget context={context} />,
                    container,
                );
            },
            onRemove(dispose) {
                dispose?.();
            },
        });

        ui.mount();
    },
});
