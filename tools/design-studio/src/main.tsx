import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, type Auth } from 'firebase/auth';
import { ReactFlowProvider } from '@xyflow/react';
import { api, base, initializeSession } from './session';
import '@xyflow/react/dist/style.css';
import './style.css';
import './development-ideas.css';
import './migration.css';
const Studio = lazy(() => import('./Studio'));
const DevelopmentIdeas = lazy(() => import('./DevelopmentIdeas'));

function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    let unsubscribe = () => {};
    let disposed = false;
    initializeSession().then(a => {
      if (disposed) return;
      setAuth(a);
      if (!a) { setReady(true); setChecking(false); return; }
      if (isSignInWithEmailLink(a, location.href)) {
        setFinishing(true);
        setEmail(localStorage.getItem('gamen-studio:login-email') || '');
      }
      unsubscribe = onAuthStateChanged(a, async user => {
        setReady(false);
        if (user) {
          try { await api('/api/session'); if (!disposed && a.currentUser?.uid === user.uid) setReady(true); }
          catch (e) { if (!disposed) setMessage((e as Error).message); }
        }
        if (!disposed) setChecking(false);
      });
    }).catch(e => { setMessage(e.message); setChecking(false); });
    return () => { disposed = true; unsubscribe(); };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!auth || busy) return;
    setBusy(true); setMessage('');
    try {
      const address = email.trim();
      if (finishing) {
        await signInWithEmailLink(auth, address, location.href);
        localStorage.removeItem('gamen-studio:login-email');
        history.replaceState(null, '', base);
        setFinishing(false);
      } else {
        await sendSignInLinkToEmail(auth, address, { url: location.origin + base, handleCodeInApp: true });
        localStorage.setItem('gamen-studio:login-email', address);
        setMessage('Check your inbox. Open the sign-in link, then confirm your email to enter the studio.');
      }
    } catch { setMessage('Sign-in could not be completed. Check your email address or request a new link.'); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="studio-login"><p role="status">Opening Design Studio…</p></main>;
  if (!ready) return <main className="studio-login"><a href="/">← GameN</a><span className="studio-kicker">DEVELOPMENT / PRIVATE WORKSPACE</span><h1>GameN<br /><em>Design Studio.</em></h1><p>Your roles, ideas and decisions in one place.</p><form onSubmit={submit}><label>Designer email<input autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><button className="primary" disabled={busy || !auth}>{busy ? 'Please wait…' : finishing ? 'Complete sign-in' : 'Email me a sign-in link'}</button></form><p role="status">{message}</p>{auth?.currentUser && <button onClick={() => void signOut(auth)}>Use another account</button>}<small>Only the approved designer account can read or save this workspace.</small></main>;
  return <><div className="studio-session"><a href="/development/">← Development</a><span>{auth ? 'Private designer workspace' : 'Local design preview · separate sample storage'}</span>{auth && <button onClick={() => void signOut(auth)}>Sign out</button>}</div><Suspense fallback={<p>Loading studio…</p>}>{location.pathname.endsWith('/ideas') ? <DevelopmentIdeas /> : <ReactFlowProvider><Studio hosted /></ReactFlowProvider>}</Suspense></>;
}
createRoot(document.getElementById('root')!).render(<App />);
