import { GameState } from '../../engine/src/core/GameState.js';
import { PlushboundGameSession } from './PlushboundGameSession.js';

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

function resolveBase(scope = globalThis) {
  const script = scope.document?.currentScript;
  if (script?.src) return new URL('.', script.src);
  return new URL('./', scope.location?.href || 'file:///android_asset/');
}

export async function bootPlushboundGame({ scope = globalThis, baseUrl } = {}) {
  const runtimeBase = baseUrl ? new URL(baseUrl, scope.location?.href) : resolveBase(scope);
  const root = new URL('../', runtimeBase);
  const contentBase = new URL('content/', root);
  const runtimeDataBase = new URL('runtime/', root);

  const [index, opening, route, mapPackage] = await Promise.all([
    loadJson(new URL('content-index.json', contentBase)),
    loadJson(new URL('opening-elyndor.json', contentBase)),
    loadJson(new URL('elyndor-route-one.json', contentBase)),
    loadJson(new URL('elyndor-runtime-maps.json', runtimeDataBase))
  ]);

  const expectedBaseline = '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425';
  if (index.engineBaseline !== expectedBaseline) {
    throw new Error(`Game content expects Engine ${index.engineBaseline}; packaged game requires ${expectedBaseline}`);
  }

  const state = new GameState();
  const session = new PlushboundGameSession({
    state,
    contentPackages: [opening, route],
    mapPackage
  });
  session.enter(index.start.mapId);

  const runtime = {
    version: 1,
    engineBaseline: index.engineBaseline,
    contentIndex: index,
    state,
    session,
    snapshot: () => session.snapshot()
  };

  scope.PlushboundGame = runtime;
  scope.dispatchEvent?.(new CustomEvent('plushbound-game-ready', {
    detail: { engineBaseline: index.engineBaseline, startMapId: index.start.mapId }
  }));
  return runtime;
}

if (typeof window !== 'undefined' && window.document) {
  const script = document.currentScript;
  if (!script?.hasAttribute('data-plushbound-manual-boot')) {
    bootPlushboundGame({ scope: window }).catch(error => {
      console.error('Plushbound game boot failed', error);
      window.dispatchEvent?.(new CustomEvent('plushbound-game-boot-error', { detail: { message: String(error?.message || error) } }));
    });
  }
}
