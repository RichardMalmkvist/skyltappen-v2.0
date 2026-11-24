import {useEffect, useState} from 'react';
import {readApiResponse} from '../../data/apiResponse';
import HomepageNotice from '../../components/layout/HomepageNotice';
import {compressHomepageImage} from '../../data/prepareHomepageImage';
import './HomepageNoticeEditor.css';

const endpoint = '/api/admin/homepage-notice';

export default function HomepageNoticeEditor({adminPassword}) {
  const [draft, setDraft] = useState(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const notice = draft && {
    imageSrc:draft.imageSrc || '', imageAlt:draft.imageAlt || 'Meddelande från Jönköpings Skyltfabrik',
    scrolling:Boolean(draft.scrolling), allPages:Boolean(draft.allPages),
    imageLayout:draft.imageLayout === 'repeat' ? 'repeat' : 'fill',
    enabled:Boolean(draft.imageSrc), heading:'', message:'', startsOn:'', endsOn:'', tone:'neutral', snow:false,
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, {headers: {'x-admin-password': adminPassword}, signal: controller.signal})
      .then(readApiResponse)
      .then(({notice}) => { if (!controller.signal.aborted) setDraft(notice); })
      .catch(() => { if (!controller.signal.aborted) setError('Kunde inte hämta startsidemeddelandet.'); });
    return () => controller.abort();
  }, [adminPassword, retry]);

  function change(patch) {
    setDraft(previous => ({...previous, ...patch}));
    setSaved(false);
  }

  async function chooseImage(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const imageSrc = await compressHomepageImage(file, {transparent: true});
      const imageAlt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 240);
      change({imageSrc, imageAlt});
    }
    catch (failure) { setError(failure.message); }
    finally { setUploading(false); }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', headers: {'x-admin-password': adminPassword, 'Content-Type': 'application/json'},
        body: JSON.stringify(notice),
      });
      const {notice: storedNotice} = await readApiResponse(response);
      setDraft(storedNotice);
      setSaved(true);
    } catch (failure) { setError(failure.message || 'Meddelandet kunde inte sparas.'); }
    finally { setSaving(false); }
  }

  return <section className="groups-featured-manager homepage-notice-editor" aria-labelledby="homepage-notice-heading">
    <h2 id="homepage-notice-heading">Startsidemeddelande</h2>
    <p>Bilden visas direkt under menyn när du sparar.</p>
    {error && <p role="alert" className="groups-image-error">{error}</p>}
    {!draft && (error ? <button type="button" onClick={() => {setError(''); setRetry(value => value + 1);}}>Försök igen</button> : <p role="status">Hämtar meddelandet…</p>)}
    {draft && <form onSubmit={save}>
      <fieldset disabled={saving || uploading} aria-label="Redigera startsidemeddelande">
        <label>Bannerbild<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
          const file = event.currentTarget.files[0]; event.currentTarget.value = ''; chooseImage(file);
        }}/></label>
        <label className="homepage-notice-checkbox"><input type="checkbox" checked={notice.scrolling} onChange={event => change({scrolling:event.target.checked})}/>Rulla bilden</label>
        <label className="homepage-notice-checkbox"><input type="checkbox" checked={notice.allPages} onChange={event => change({allPages:event.target.checked})}/>Visa även på övriga sidor i beställningsportalen</label>
        {notice.imageSrc && <div><button type="button" onClick={() => change({imageSrc:'', imageAlt:''})}>Ta bort bannerbild</button></div>}
      </fieldset>
      {notice.imageSrc && <div className="homepage-notice-preview"><p>Förhandsvisning</p><HomepageNotice notice={notice}/></div>}
      {uploading && <p role="status">Läser in bilden…</p>}
      <button className="homepage-notice-save" type="submit" disabled={saving || uploading}>{saving ? 'Sparar…' : 'Spara meddelande'}</button>
      {saved && <p role="status">Meddelandet har sparats.</p>}
    </form>}
  </section>;
}
