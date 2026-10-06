// mothership:dev-only
//
// Operator console for the scripted fixture. It talks only to the local development
// server's operator endpoints and is loaded by no audience screen.

const AUDIENCE_LABELS = { public: 'Table display', 'seat-1': 'Player 1 phone', 'seat-2': 'Player 2 phone' };
const statusList = document.getElementById('operator-status');
const feedRows = document.getElementById('operator-feeds');

async function request(action, body) {
  const response = await fetch(`/api/operator/${action}`, body === undefined
    ? { cache: 'no-store' }
    : { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function feedButton(label, audience, action, kind) {
  const button = element('button', label, { type: 'button', 'data-action': action, 'data-audience': audience });
  if (kind) button.setAttribute('data-kind', kind);
  return button;
}

let lastStatus = '';
function show(status) {
  const serialized = JSON.stringify({ ...status, serverTimeMs: 0 });
  const remaining = status.phase.endsAt === null ? 'no deadline' : `${Math.max(0, Math.ceil((status.phase.endsAt - status.serverTimeMs) / 1000))} s left on the fixture server clock`;
  const facts = [
    ['Step', `${status.stepNumber} of ${status.stepCount}: ${status.step.label}`],
    ['Source', status.step.source],
    ['Phase', `${status.phase.id} (${status.phase.kind}), ${remaining}`],
    ['Variant', status.variant],
  ];
  statusList.replaceChildren(...facts.flatMap(([term, value]) => [element('dt', term), element('dd', value)]));

  // Rows are rebuilt only when something other than the clock changed, so focus is kept.
  if (serialized === lastStatus) return;
  lastStatus = serialized;
  feedRows.replaceChildren(...Object.keys(status.connected).map(audience => {
    const on = status.connected[audience];
    const controls = element('td');
    controls.className = 'harness-row';
    controls.append(
      feedButton(on ? 'Drop feed' : 'Restore feed', audience, on ? 'drop' : 'restore'),
      feedButton('Send again', audience, 'redeliver'),
      feedButton('Send other protocol', audience, 'inject', 'incompatible-protocol'),
      feedButton('Send unreadable', audience, 'inject', 'unreadable'),
    );
    if (audience !== 'public') controls.append(feedButton('Send the other seat’s view', audience, 'inject', 'other-audience'));
    const row = element('tr');
    row.append(
      element('th', AUDIENCE_LABELS[audience] ?? audience, { scope: 'row' }),
      element('td', on ? 'On' : 'Off'),
      element('td', String(status.revisions[audience])),
      element('td', String(status.subscribers[audience])),
      controls,
    );
    return row;
  }));
}

async function refresh() {
  try {
    show(await request('status'));
  } catch {
    statusList.replaceChildren(element('dt', 'Status'), element('dd', 'The fixture server is not reachable.'));
  }
}

document.addEventListener('click', async event => {
  const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
  if (button === null) return;
  const { action, audience, kind, variant } = button.dataset;
  const body = {};
  if (audience) body.audience = audience;
  if (kind) body.kind = kind;
  if (variant) body.variant = variant;
  try {
    show(await request(action, body));
  } catch {
    await refresh();
  }
});

await refresh();
window.setInterval(refresh, 1_000);
