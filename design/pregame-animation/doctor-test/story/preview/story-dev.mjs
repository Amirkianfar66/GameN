import { renderStory } from '../../story/panels.mjs';
import { createDoctorTest } from '../../scene.mjs';
window.__render = async (only = null) => {
  const aboard = async () => {
    const holder = document.createElement('div'); document.body.append(holder);
    const scene = createDoctorTest(holder, { width: 390, height: 844, world: 'novel', pixelRatio: 2 });
    await scene.ready(); scene.paint(2350);
    return scene.canvas;
  };
  const canvases = await renderStory(document, { aboard, only });
  return canvases.map(c => c.toDataURL('image/jpeg', 0.88));
};
