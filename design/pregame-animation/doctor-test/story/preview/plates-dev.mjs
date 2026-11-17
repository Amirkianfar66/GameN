import { renderPlates } from '../../story/plates.mjs';
window.__plates = async () => (await renderPlates(document)).map(c => c.toDataURL('image/jpeg', 0.9));
