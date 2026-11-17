// The production inbox uses the existing loopback Firestore data group. Keep
// real retry/unknown-commit, independent listener and takeover checks in CI;
// injected-clock fixtures must not run beside live Functions/Tasks triggers.
import '../../../services/game-api/dev/food-task-coordinator/inbox-store.test.mjs';
import '../../../services/game-api/dev/food-task-coordinator/inbox-service.test.mjs';
