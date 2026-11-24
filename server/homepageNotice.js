const stockholmDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
});
const emptyNotice = {enabled: false, heading: '', message: '', startsOn: '', endsOn: '', tone: 'green', scrolling: false, snow: false, allPages: false, imageSrc: '', imageAlt: '', imageLayout: 'center'};
const tones = ['green', 'amber', 'blue', 'neutral', 'red'];
const imageLayouts = ['center', 'fill', 'repeat'];

function validDate(value) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function installHomepageNotice(app, {asyncRoute, canEdit, read, write, now = () => new Date()}) {
  app.get('/api/homepage-notice', asyncRoute(async (req, res) => {
    const notice = await read();
    const today = stockholmDate.format(now());
    const visible = notice?.enabled && (req.query.scope !== 'portal' || notice.allPages) && (notice.message || notice.imageSrc) &&
      (!notice.startsOn || notice.startsOn <= today) && (!notice.endsOn || today <= notice.endsOn);
    res.set('Cache-Control', 'no-store').json({
      notice: visible ? {heading: notice.heading, message: notice.message, tone: notice.tone,
        scrolling: notice.scrolling, snow: notice.snow, allPages: notice.allPages,
        imageSrc: notice.imageSrc, imageAlt: notice.imageAlt, imageLayout: notice.imageLayout || 'center'} : null,
    });
  }));

  const adminPath = '/api/admin/homepage-notice';
  app.get(adminPath, asyncRoute(async (req, res) => {
    if (!await canEdit(req)) return res.status(401).json({message: 'Obehörig.'});
    return res.set('Cache-Control', 'no-store').json({notice: {...emptyNotice, ...await read()}});
  }));

  app.put(adminPath, asyncRoute(async (req, res) => {
    if (!await canEdit(req)) return res.status(401).json({message: 'Obehörig.'});
    const {enabled, heading, message, startsOn, endsOn, tone, scrolling, snow, allPages, imageSrc, imageAlt, imageLayout = 'center'} = req.body || {};
    if (typeof enabled !== 'boolean' || typeof heading !== 'string' || typeof message !== 'string' ||
        typeof startsOn !== 'string' || typeof endsOn !== 'string' || heading.length > 100 || message.length > 600) {
      return res.status(400).json({message: 'Rubriken får ha högst 100 tecken och texten högst 600 tecken.'});
    }
    if (!validDate(startsOn) || !validDate(endsOn) || (startsOn && endsOn && endsOn < startsOn)) {
      return res.status(400).json({message: 'Ange giltiga datum. Sista visningsdagen måste vara samma som eller senare än första visningsdagen.'});
    }
    if (!tones.includes(tone) || !imageLayouts.includes(imageLayout) || [scrolling, snow, allPages].some(value => typeof value !== 'boolean')) {
      return res.status(400).json({message: 'Välj en giltig färg och visning för meddelandet.'});
    }
    if (typeof imageSrc !== 'string' || imageSrc.length > 3000000 ||
        (imageSrc && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageSrc)) ||
        typeof imageAlt !== 'string' || imageAlt.length > 240) {
      return res.status(400).json({message: 'Använd en JPG-, PNG- eller WebP-bild och högst 240 tecken i bildens textbeskrivning.'});
    }
    const notice = {enabled, heading: heading.trim(), message: message.trim(), startsOn, endsOn, tone,
      scrolling, snow, allPages, imageSrc, imageAlt: imageAlt.trim(), imageLayout};
    if (enabled && !(imageSrc ? notice.imageAlt : notice.message)) {
      return res.status(400).json({message: imageSrc ? 'Skriv bildens budskap som text innan du aktiverar meddelandet.' : 'Skriv en text innan du aktiverar meddelandet.'});
    }
    await write(notice);
    return res.json({notice});
  }));
}

module.exports = {installHomepageNotice};
