export function pickFields(source, keys) {
  return Object.fromEntries(keys.filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]]));
}

/** Project a validated own-seat Food view onto the component's input fields. */
export function renderFoodView(view, viewKeys) {
  const task = view.participantTask;
  const placement = task?.ownReturnPlacement;
  return {
    ...pickFields(view, viewKeys),
    stock: { doses: view.stock.doses },
    offers: view.offers.map(offer => pickFields(offer, ['type', 'inputs', 'partnerSeatIds'])),
    participantTask: task && {
      ...pickFields(task, ['taskId', 'winchSeatId', 'panelSeatId', 'selfControl', 'startedAt', 'runningAt', 'deadlineAt', 'returnsAt',
        'stage', 'people', 'panel', 'crate', 'broken', 'outcome']),
      ownGesture: task.ownGesture && { pendingIntent: task.ownGesture.pendingIntent !== null },
      ...(placement === undefined ? {} : { ownReturnPlacement: pickFields(placement, ['location']) }),
      events: { events: task.events.events.map(event => pickFields(event, ['kind', 'at', 'mechanism', 'crateId'])) },
    },
  };
}
