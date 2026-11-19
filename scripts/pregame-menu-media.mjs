import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

// Only the three same-origin exports verified in the owner's private playtest.
const menuMediaExports = [
  ['menu-film/480b53fb/night-passage.mp4', 6337309, 'b3617a8d5364e4c74060b2c0566e8de08072cd4660e6388bd286ba308e3cb54f'],
  ['menu-film/480b53fb/night-passage.jpg', 126704, '99bbd983b31bb3a366d46a37ebc847b78f1023fc57ad704409c290b7c4ce0546'],
  ['lobby-music/cold-wake-8dcae8a98433.mp3', 3127106, '8dcae8a98433b8d09454ebea1191a3479858576b2ee5667ef8322c895900cc1f'],
];

export function pregameMenuMediaPlugin(env = process.env) {
  const directory = env.MOTHERSHIP_PREGAME_MEDIA_DIR;
  const selection = env.VITE_GAMEN_PREGAME_MEDIA ?? (directory ? '1' : '0');
  if (!['0', '1'].includes(selection)) throw Error('VITE_GAMEN_PREGAME_MEDIA must be 0 or 1');
  if (selection === '1' && !directory) throw Error('A menu-media build requires MOTHERSHIP_PREGAME_MEDIA_DIR');
  return {
    name: 'verified-pregame-menu-media',
    config: () => ({define: {'import.meta.env.VITE_GAMEN_PREGAME_MEDIA': JSON.stringify(selection)}}),
    async generateBundle() {
      if (selection === '0') return;
      for (const [fileName, length, digest] of menuMediaExports) {
        const source = await readFile(join(directory, fileName));
        if (source.length !== length || createHash('sha256').update(source).digest('hex') !== digest) {
          throw Error(`Pre-game media differs from the reviewed export: ${fileName}`);
        }
        this.emitFile({type: 'asset', fileName, source});
      }
    },
  };
}
