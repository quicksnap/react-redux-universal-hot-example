import Express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createLocation } from 'history';
import { RoutingContext, match } from 'react-router';
import {Provider} from 'react-redux';
import config from './config';
import createRoutes from './routes';
import favicon from 'serve-favicon';
import compression from 'compression';
import httpProxy from 'http-proxy';
import path from 'path';
import createStore from './redux/create';
import ApiClient from './helpers/ApiClient';
// import universalRouter from './helpers/universalRouter';
import Html from './helpers/Html';
import PrettyError from 'pretty-error';

const pretty = new PrettyError();
const app = new Express();
const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:' + config.apiPort
});

app.use(compression());
app.use(favicon(path.join(__dirname, '..', 'static', 'favicon.ico')));

app.use(require('serve-static')(path.join(__dirname, '..', 'static')));

// Proxy to API server
app.use('/api', (req, res) => {
  proxy.web(req, res);
});

// added the error handling to avoid https://github.com/nodejitsu/node-http-proxy/issues/527
proxy.on('error', (error, req, res) => {
  let json;
  console.log('proxy error', error);
  if (!res.headersSent) {
    res.writeHead(500, {'content-type': 'application/json'});
  }

  json = { error: 'proxy_error', reason: error.message };
  res.end(JSON.stringify(json));
});

app.use((req, res) => {
  if (__DEVELOPMENT__) {
    // Do not cache webpack stats: the script file would change since
    // hot module replacement is enabled in the development env
    webpackIsomorphicTools.refresh();
  }
  const client = new ApiClient(req);
  const store = createStore(client);
  const routes = createRoutes(store);
  const location = createLocation(req.url);

  function hydrateOnClient() {
    res.send('<!doctype html>\n' +
      renderToString(<Html assets={webpackIsomorphicTools.assets()} component={<div/>} store={store}/>));
  }

  if (__DISABLE_SSR__) {
    hydrateOnClient();
    return;
  }

  function getFetchData(component = {}) {
    return component.WrappedComponent ?
      getFetchData(component.WrappedComponent) :
      component.fetchData;
  }

  function fetchRouteData(components, callback) {
    const promises = components
      .filter((component) => getFetchData(component))   // only look at ones with a static fetchData()
      .map(getFetchData)                                // pull out fetch data methods
      .map(fetchData => fetchData(store, req.params, req.query || {}));   // call fetch data methods and save promises

    Promise.all(promises)
      .then(() => {
        callback(); // can't just pass callback to then() because callback assumes first param is error
      }, (error) => {
        callback(error);
      });
  }

  function hydrateErrorToClient(error) {
    // let client render error page or re-request data
    console.error('ROUTER ERROR:', pretty.render(error));
    hydrateOnClient();
  }

  match({ routes, location }, (error, redirectLocation, renderProps) => {
    if (redirectLocation) {
      res.redirect(301, redirectLocation.pathname + redirectLocation.search);
    } else if (error || renderProps === null) {
      // TODO: Is this correct? Is it working? This whole block needs testing
      if (error && error.redirect) {
        res.redirect(error.redirect);
        return;
      }

      hydrateErrorToClient(error);
    } else {
      fetchRouteData(renderProps.components, (err) => {
        if (err) {
          hydrateErrorToClient(err);
        }

        const component = (
          <Provider store={store} key='provider'>
            <RoutingContext {...renderProps}/>
          </Provider>
        );

        const domStr = renderToString(<Html assets={webpackIsomorphicTools.assets()} component={component} store={store}/>);

        res.send('<!doctype html>\n' + domStr);
      });
    }
  });
});

if (config.port) {
  app.listen(config.port, (err) => {
    if (err) {
      console.error(err);
    }
    console.info('----\n==> ✅  %s is running, talking to API server on %s.', config.app.name, config.apiPort);
    console.info('==> 💻  Open http://localhost:%s in a browser to view the app.', config.port);
  });
} else {
  console.error('==>     ERROR: No PORT environment variable has been specified');
}
