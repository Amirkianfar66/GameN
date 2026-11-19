/** Night Passage from 480b53fb. The menu owns visibility and effective motion preference. */
export function mountMenuSpaceFilm(hero, { posterUrl, filmUrl }) {
  const document = hero.ownerDocument;
  const layer = document.createElement('div');
  layer.className = 'night-passage';
  layer.dataset.picture = 'poster';
  layer.setAttribute('aria-hidden', 'true');
  const poster = document.createElement('img');
  poster.alt = '';
  poster.src = posterUrl;
  layer.append(poster);
  hero.before(layer);

  let video = null;
  let failed = false;

  function releaseVideo() {
    const old = video;
    video = null;
    if (!old) return;
    old.pause();
    old.removeAttribute('src');
    old.load();
    old.remove();
  }

  function startVideo() {
    const movie = document.createElement('video');
    video = movie;
    movie.defaultMuted = true;
    movie.muted = true;
    movie.playsInline = true;
    movie.loop = true;
    movie.tabIndex = -1;
    movie.disablePictureInPicture = true;
    const fallback = () => {
      if (video !== movie) return;
      failed = true;
      layer.dataset.picture = 'fallback';
      releaseVideo();
    };
    movie.addEventListener('error', fallback);
    movie.addEventListener('playing', () => {
      const uncover = () => { if (video === movie) layer.dataset.picture = 'playing'; };
      if (movie.requestVideoFrameCallback) movie.requestVideoFrameCallback(uncover);
      else uncover();
    });
    layer.append(movie);
    movie.src = filmUrl;
    movie.play().catch(fallback);
  }

  return {
    update({ visible, reduced }) {
      if (!visible || reduced) {
        if (!visible) failed = false;
        layer.dataset.picture = reduced ? 'reduced' : 'poster';
        releaseVideo();
      } else if (!video && !failed) {
        layer.dataset.picture = 'poster';
        startVideo();
      }
    },
    dispose() {
      releaseVideo();
      layer.remove();
    },
  };
}
