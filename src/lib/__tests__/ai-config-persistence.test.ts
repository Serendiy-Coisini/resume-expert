import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getUserAIConfig, useAIConfigStore } from '@/store/ai-config-store';

test('session-only AI credentials work in memory but are excluded from browser persistence', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (name: string) => entries.get(name) ?? null,
        setItem: (name: string, value: string) => { entries.set(name, value); },
        removeItem: (name: string) => { entries.delete(name); },
      },
    },
  });
  const snapshot = useAIConfigStore.getState();
  try {
    snapshot.setRememberCredentials(false);
    snapshot.setConfig({ apiKey: 'session-secret', serverAccessToken: 'session-token' });
    assert.equal(getUserAIConfig()?.apiKey, 'session-secret');
    const stored = entries.get('resume_expert_user_ai_config') ?? '';
    assert.ok(!stored.includes('session-secret'));
    assert.ok(!stored.includes('session-token'));

    snapshot.setRememberCredentials(true);
    const remembered = entries.get('resume_expert_user_ai_config') ?? '';
    assert.ok(remembered.includes('session-secret'));
    assert.ok(remembered.includes('session-token'));
    snapshot.setRememberCredentials(false);
    const cleared = entries.get('resume_expert_user_ai_config') ?? '';
    assert.ok(!cleared.includes('session-secret'));
    assert.ok(!cleared.includes('session-token'));
  } finally {
    useAIConfigStore.setState(snapshot, true);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
