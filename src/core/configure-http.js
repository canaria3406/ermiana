import { Agent, setGlobalDispatcher } from 'undici';

export function configureHttp() {
  setGlobalDispatcher(new Agent({
    keepAliveTimeout: 30000,
    keepAliveMaxTimeout: 60000,
  }));
}
