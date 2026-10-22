// Room labels are neutral public controls. Eligibility is read only after the
// player opens their own private controller; this never submits a command.
export function openRoomMovement(screen, destination) {
  if (!['Room A', 'Room B', 'Command Room'].includes(destination)) return 'That room is not a movement destination.';
  const current = screen.getFrame().model;
  if (!current.match || current.match.result) return 'This match is not accepting moves.';
  if (!current.match.privateArea.open) screen.dispatch({ type: 'private/toggle' });
  const card = () => screen.getFrame().model.match?.privateArea.content?.actions.card;
  if (!card()) return 'Reconnect to move.';
  if (card().status !== 'idle') return 'Finish or cancel the current action first.';
  screen.dispatch({ type: 'action/open', kind: 'move' });
  const body = card()?.body;
  if (body?.step === 'choosing' && body.choices.some(choice => choice.value === destination)) {
    screen.dispatch({ type: 'action/choose', value: destination });
    return null;
  }
  // Close only the new, unsent movement choice; never replace a pending receipt.
  if (body?.step === 'choosing') screen.dispatch({ type: 'action/back' });
  return 'You cannot move to that room right now.';
}
