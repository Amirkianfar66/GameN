import type {
  AdvanceIfExpiredRequest, AdvanceIfExpiredResponse, ApiFailure, AudienceView,
  CommandResponse, ReceiptLookupRequest, ReceiptLookupResponse, RegisterShot, ServerTimeResponse,
} from '@mothership/contracts';

// Interface only: fixture/emulator/production transports and React UI start in #3.
// Construct separately for each authorized route. Display transport uses PublicView.
export interface GameTransport<View extends AudienceView> {
  readonly mode: 'fixture' | 'emulator' | 'production';
  subscribe(onView: (view: View) => void, onDisconnect: () => void): () => void;
  submit(command: RegisterShot): Promise<CommandResponse>;
  lookupReceipt(request: ReceiptLookupRequest): Promise<ReceiptLookupResponse | ApiFailure>;
  advanceIfExpired(request: AdvanceIfExpiredRequest): Promise<AdvanceIfExpiredResponse | ApiFailure>;
  serverTime(): Promise<ServerTimeResponse | ApiFailure>;
}
