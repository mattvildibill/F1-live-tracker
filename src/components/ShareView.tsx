import { useRef, useState } from 'react';

export default function ShareView({ getURL }: { getURL: () => string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setURL] = useState('');
  const [status, setStatus] = useState('');
  async function copy() {
    const link = getURL();
    setURL(link);
    try { await navigator.clipboard.writeText(link); setStatus('Link copied'); }
    catch { setStatus(''); dialog.current?.showModal(); }
  }
  return <div className="share-view"><button onClick={copy}>Copy view link</button><span role="status">{status}</span><dialog ref={dialog} aria-labelledby="share-view-title"><h2 id="share-view-title">Link to this view</h2><p>Copy this link to return to the same panel and paused demo time.</p><label>View link<input readOnly value={url} onFocus={e => e.target.select()}/></label><button onClick={() => dialog.current?.close()}>Close</button></dialog></div>;
}
