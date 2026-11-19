import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mountMenuSpaceFilm } from '../../../design/menu-space-film/runtime/layer.mjs';

const media = { posterUrl: '/menu/poster.jpg', filmUrl: '/menu/film.mp4' };

function fixture(play = () => Promise.resolve()) {
  class Element extends EventTarget {
    children = [];
    dataset = {};
    attrs = new Map();
    constructor(tag) {
      super();
      this.tag = tag;
      this.ownerDocument = document;
    }
    setAttribute(key, value) { this.attrs.set(key, value); }
    set src(value) { this.setAttribute('src', value); }
    get src() { return this.attrs.get('src'); }
    removeAttribute(key) { this.attrs.delete(key); }
    append(child) { this.children.push(child); child.parent = this; }
    before(child) { this.parent.children.unshift(child); child.parent = this.parent; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
    play() { return play(); }
    pause() { this.paused = true; }
    load() { this.released = this.src === undefined; }
    requestVideoFrameCallback(callback) { this.presentFrame = callback; }
  }
  const document = { createElement: tag => new Element(tag) };
  const frame = document.createElement('frame'), hero = document.createElement('hero');
  frame.append(hero);
  const film = mountMenuSpaceFilm(hero, media);
  return { frame, hero, film, layer: frame.children[0] };
}

test('the decorative menu layer shows its poster before the first submitted video frame', () => {
  const { layer, film } = fixture();
  assert.equal(layer.attrs.get('aria-hidden'), 'true');
  assert.equal(layer.children[0].src, media.posterUrl);
  assert.equal(layer.dataset.picture, 'poster');
  assert.equal(layer.children.length, 1);
  film.update({ visible: true, reduced: false });
  const movie = layer.children[1];
  assert.equal(movie.src, media.filmUrl);
  assert.ok(movie.muted && movie.playsInline && movie.loop);
  movie.dispatchEvent(new Event('playing'));
  assert.equal(layer.dataset.picture, 'poster');
  movie.presentFrame();
  assert.equal(layer.dataset.picture, 'playing');
});

test('Reduce Motion, concealment and disposing the hero release its media', () => {
  const { frame, layer, hero, film } = fixture();
  film.update({ visible: true, reduced: true });
  assert.equal(layer.dataset.picture, 'reduced');
  assert.equal(layer.children.length, 1);
  film.update({ visible: true, reduced: false });
  const movie = layer.children[1];
  movie.dispatchEvent(new Event('playing'));
  film.update({ visible: false, reduced: false });
  assert.ok(movie.paused && movie.released);
  movie.presentFrame();
  assert.equal(layer.dataset.picture, 'poster');
  film.update({ visible: true, reduced: false });
  assert.notEqual(layer.children[1], movie);
  film.dispose();
  assert.deepEqual(frame.children, [hero]);
  assert.equal(layer.children.length, 1);
});

test('blocked playback shows the same poster until the menu is revisited', async () => {
  let attempts = 0;
  const { layer, film } = fixture(() => { attempts++; return Promise.reject(new Error('blocked')); });
  film.update({ visible: true, reduced: false });
  await Promise.resolve();
  assert.equal(layer.dataset.picture, 'fallback');
  assert.equal(layer.children[0].src, media.posterUrl);
  assert.equal(layer.children.length, 1);
  film.update({ visible: true, reduced: false });
  assert.equal(attempts, 1);
  film.update({ visible: false, reduced: false });
  film.update({ visible: true, reduced: false });
  assert.equal(attempts, 2);
  await Promise.resolve();
});
