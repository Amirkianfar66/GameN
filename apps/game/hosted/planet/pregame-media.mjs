// The hosted build opts in when these exact same-origin assets are supplied by its release.
export const PREGAME_MEDIA = import.meta.env?.VITE_GAMEN_PREGAME_MEDIA === '1' ? Object.freeze({
  posterUrl: '/menu-film/480b53fb/night-passage.jpg',
  filmUrl: '/menu-film/480b53fb/night-passage.mp4',
  musicUrl: '/lobby-music/cold-wake-8dcae8a98433.mp3',
}) : null;
