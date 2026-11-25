// Signalling shared by the phone, viewer and control pages.
// Messages travel as plain HTTP (POST to send, long-poll GET to receive) so the phone page
// works behind a self-signed certificate, where Safari is unreliable about WebSockets.

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function makeSignal({ key = '', role, name = '' }) {
  const id = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  const api = (route, extra = '') => `/api/${route}?k=${encodeURIComponent(key)}${extra}`;

  async function send(to, type, data = null) {
    const res = await fetch(api('send'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: id, to, type, data }),
    });
    if (!res.ok) throw new Error(`send ${type} failed: ${res.status}`);
    return res.json();
  }

  async function listen(onMessage) {
    const query = `&id=${id}&role=${role}&name=${encodeURIComponent(name)}`;
    for (;;) {
      try {
        const res = await fetch(api('poll', query));
        if (!res.ok) throw new Error(`poll failed: ${res.status}`);
        for (const msg of await res.json()) {
          try {
            await onMessage(msg);
          } catch (e) {
            console.error('message handler failed', msg.type, e);
          }
        }
      } catch (e) {
        await sleep(1000);
      }
    }
  }

  return { id, api, send, listen };
}

// Resolves once ICE gathering finishes, or after a short wait, so the whole description can be
// sent in one message instead of trickling candidates.
export function waitForIce(pc, ms = 1500) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const timer = setTimeout(resolve, ms);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}
