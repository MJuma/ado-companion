import { render } from 'solid-js/web';

import { Options } from '../../app/options/Options';

const root = document.getElementById('app');
if (root !== null) {
    render(() => <Options />, root);
}
