/**
 * THIS IS THE ENTRY POINT FOR THE CLIENT, JUST LIKE server.js IS THE ENTRY POINT FOR THE SERVER.
 */
import 'babel/polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Router from 'react-router';
import { createHistory, useQueries } from 'history';
import createStore from './redux/create';
import ApiClient from './helpers/ApiClient';
import createRoutes from './routes';

const history = useQueries(createHistory)();
const client = new ApiClient();
const dest = document.getElementById('content');
const store = createStore(client, window.__data);
const routes = createRoutes(store);

const component = (
  <Provider store={store} key="provider">
    <Router routes={routes} history={history} />
  </Provider>
);

if (__DEVTOOLS__) {
  const { DevTools, DebugPanel, LogMonitor } = require('redux-devtools/lib/react');
  console.info('You will see a "Warning: React attempted to reuse markup in a container but the checksum was' +
    ' invalid." message. That\'s because the redux-devtools are enabled.');
  ReactDOM.render(<div>
    {component}
    <DebugPanel top right bottom key="debugPanel">
      <DevTools store={store} monitor={LogMonitor}/>
    </DebugPanel>
  </div>, dest);
} else {
  ReactDOM.render(component, dest);
}

if (process.env.NODE_ENV !== 'production') {
  window.React = React; // enable debugger
  const reactRoot = window.document.getElementById('content');

  if (!reactRoot || !reactRoot.firstChild || !reactRoot.firstChild.attributes || !reactRoot.firstChild.attributes['data-react-checksum']) {
    console.error('Server-side React render was discarded. Make sure that your initial render does not contain any client-side code.');
  }
}
