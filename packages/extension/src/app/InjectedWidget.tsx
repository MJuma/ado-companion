import '@fluentui/web-components/button/define.js';

import type { AdoContext } from '../lib/ado';

interface InjectedWidgetProps {
    context: AdoContext;
}

export function InjectedWidget(props: InjectedWidgetProps) {
    return (
        <div class="ado-companion-widget">
            <fluent-button appearance="primary">ADO Companion</fluent-button>
            {props.context.project !== null ? (
                <span> · {props.context.project}</span>
            ) : null}
        </div>
    );
}
