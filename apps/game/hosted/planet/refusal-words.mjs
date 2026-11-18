// A refused command's words in the open sheet (R2 with A3, the one inline-error rule: approved by the Lead and,
// for its look, by the owner on 18 November 2026). The controller gives no structured refusal: no code and no
// command (R6, on #222, would add one). So the connection tells a refusal only from this phone's own Offer,
// Accept, Decline or Register, seen under way, and the model's message, verbatim: any words but Frontend's own
// for a command sending or registered, and for a phase the server has closed.
//
// Frontend's words are pinned here, in one place (the Lead's note 1): planetRegistrationText, imported; and the two
// the controller writes inline and does not export, each pinned by apps/game/test/planet-refusals.test.mjs against
// the real controller, which fails if Frontend changes them. R6 replaces this reading of words.
//
// The words then hold for the view they were read in (refusalHeld). The controller clears its message at every read
// of the view (controller.ts receive()), and the session reads it every 2 s even when nothing has changed
// (session.ts), so the message alone would take them within 2 s.
import {planetRegistrationText} from '@mothership/presentation';

/** The controller's words while a command sends (controller.ts confirm(), and the model's sending prompt). */
export const SENDING_WORDS='Registering…';
/**
 * The controller's words when the server says the phase has closed. The sheet goes with the phase, and the shell's
 * phase-closed toast says it once, so they are never a note in the sheet (the Lead's note 2).
 */
export const PHASE_CLOSED_WORDS='The server closed that phase.';

/**
 * The model's message as the refusal of `type`, which this phone sent, or null: only on a live connection, with
 * no "Outcome unknown" (that is Actions' part), and words that are none of Frontend's sending, registration or
 * phase-closed words. The caller checks that the command was this phone's own and that the model no longer has it.
 */
export function refusalWords(model,type){
 const words=model?.message;
 if(model?.connection!=='live'||model.recovery||typeof words!=='string'||!words.trim())return null;
 if(words===SENDING_WORDS||words===PHASE_CLOSED_WORDS||words===planetRegistrationText(type))return null;
 return words;
}

/**
 * Whether a refusal's words, read at revision `at`, still hold: the same view, with the connection live and no
 * other words. A re-read of that view, where the controller only clears its message, keeps them; the next view,
 * other words and a connection that is not live take them. The caller also drops them at the player's next tap,
 * with the sheet and with the phase.
 */
export function refusalHeld(model,words,at){
 return model?.connection==='live'&&!model.recovery&&(model.revision??null)===at&&(model.message==null||model.message===words);
}

/**
 * The game's status line beside a refusal's words (R2). `said` is the words an open sheet showed last, with the
 * view's revision, match and viewer; `noted` is the words it shows now, or null. The line keeps still while the
 * model's message is still the words the sheet showed, in that view, for that viewer, so they are said once. Once
 * the message or the view moves on (a new send says "Registering…"; a read of the view clears the message), or
 * another match or seat is on the phone, the same words again are new, and the line says them. Returns the next
 * `said` and whether the line keeps still.
 */
export function refusalStatus(said,model,noted){
 const revision=model?.revision??null,match=model?.matchId??null,viewer=model?.ownSeatId??null;
 const same=!!said&&model?.message===said.words&&revision===said.revision&&match===said.match&&viewer===said.viewer;
 const next=noted?{words:noted,revision,match,viewer}:same?said:null;
 return {said:next,quiet:!!next&&model?.message===next.words};
}
