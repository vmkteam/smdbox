import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import merge from 'lodash/merge';
import Application from 'containers/Application';
import { get as getStore } from 'helpers/session';
import configureStore from './configureStore';

import './styles/main.scss';

const autoInitSelector = '#json-rpc-root';

const defaultOptions = {
    endpoint: null,
    smdUrl: null,
    headers: {},
    selector: '#smdbox-root',
};

let rootNode;

const renderApp = (App, store) =>
    render(
        <Provider store={store}>
            <App key={Date.now()} />
        </Provider>,
        rootNode
    );

if (module.hot) {
    module.hot.accept(['containers/Application'], () => {
        const NextApp = require('containers/Application').default;
        renderApp(NextApp);
    });
}


const init = (opts = {}) => {
    const options = {
        ...defaultOptions,
        ...opts
    };

    const { smdUrl, endpoint, selector, headers } = options;
    if (selector) {
        rootNode = document.querySelector(selector);
    }

    getStore((storeData = {}) => {
        // set preconfigured smdUrl, endpoint and headers from config
        merge(storeData, { project: { smdUrl, endpoint, headers } });
        const store = configureStore(storeData);
        renderApp(Application, store);
    });
};

// try to auto init without calls (backward compatibilty)
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector(autoInitSelector)) {
        init({ selector: autoInitSelector });
    }
});

window.smdbox = init;

export default init;

