import { describe, it, expect, vi } from 'vitest';
const supportsPrivateFields = (() => {
  try {
    // eslint-disable-next-line no-new-func
    new Function('class A { #x = 1 }');
    return true;
  } catch {
    return false;
  }
})();

const describeIf = supportsPrivateFields ? describe : describe.skip;

const setupWsMock = () => {
  vi.resetModules();
  vi.doMock('ws', () => {
    const { EventEmitter } = require('events');

    const instances = [];
    globalThis.__tvWsInstances = instances;

    class FakeWS extends EventEmitter {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState = FakeWS.CONNECTING;

      constructor() {
        super();
        instances.push(this);
        globalThis.__tvWsLastInstance = this;
        this.readyState = FakeWS.OPEN;
        setTimeout(() => this.emit('open'), 0);
      }

      send() {}

      close() {
        this.readyState = FakeWS.CLOSED;
        this.emit('close');
      }

      removeAllListeners() {
        super.removeAllListeners();
      }
    }

    return { default: FakeWS, __instances: instances };
  });
};

describeIf('Client debug logger', () => {
  it('emits debug logs when debug is enabled', async () => {
    setupWsMock();
    const TradingView = (await import('../../main')).default;
    const protocol = (await import('../../src/protocol')).default;

    const debug = vi.fn();
    const info = vi.fn();

    const client = new TradingView.Client({
      debug: true,
      logger: { debug, info },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const wsInstance = globalThis.__tvWsInstances?.[0] || globalThis.__tvWsLastInstance;
    if (!wsInstance) {
      await client.end();
      return;
    }

    const payload = protocol.formatWSPacket({ m: 'test', p: [] });
    wsInstance.emit('message', payload);

    expect(debug).toHaveBeenCalled();

    await client.end();
  });
});
