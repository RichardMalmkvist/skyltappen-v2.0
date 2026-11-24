const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {installHomepageNotice} = require('./homepageNotice');
const {normalizeHomepageImages} = require('./homepageImages');

test('only admins can edit a banner and it appears in the selected scope during Swedish calendar days', async () => {
  const app = express();
  app.use(express.json());
  let saved, now = new Date('2026-12-22T22:59:00Z');
  installHomepageNotice(app, {
    asyncRoute: handler => (req, res, next) => handler(req, res).catch(next),
    canEdit: req => req.headers.authorization === 'admin',
    read: async () => saved,
    write: async notice => { saved = notice; },
    now: () => now,
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const endpoint = origin + '/api/admin/homepage-notice';
    const banner = {enabled: true, heading: '', message: '', startsOn: '2026-12-23', endsOn: '2027-01-08',
      tone: 'red', scrolling: true, snow: true, allPages: false,
      imageSrc: 'data:image/webp;base64,AAAA', imageAlt: 'Julledigt 23 dec till 8 jan', imageLayout: 'repeat'};
    const put = (payload, auth = 'admin') => fetch(endpoint, {
      method: 'PUT', headers: {authorization: auth, 'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    });
    const publicNotice = async suffix => (await (await fetch(origin + '/api/homepage-notice' + (suffix || ''))).json()).notice;
    assert.equal((await fetch(endpoint)).status, 401);
    assert.equal((await put(banner, 'personal')).status, 401);
    assert.equal((await put({...banner, imageAlt: ''})).status, 400);
    assert.equal((await put({...banner, startsOn: '2026-02-30'})).status, 400);
    assert.equal((await put(banner)).status, 200);
    assert.equal(await publicNotice(), null);
    now = new Date('2026-12-22T23:00:00Z');
    assert.equal((await publicNotice()).imageAlt, banner.imageAlt);
    assert.equal((await publicNotice()).imageLayout, 'repeat');
    assert.equal(await publicNotice('?scope=portal'), null);
    assert.equal((await put({...banner, allPages: true})).status, 200);
    now = new Date('2027-01-08T22:59:00Z');
    assert.equal((await publicNotice('?scope=portal')).tone, 'red');
    now = new Date('2027-01-08T23:00:00Z');
    assert.equal(await publicNotice(), null);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('catalog writes keep the old picture and each slide’s separate button configuration', () => {
  const first = {src: 'data:image/jpeg;base64,AAAA', content: {heading: 'Befintlig rubrik', buttonTarget: 'catalog'}};
  const second = {src: 'data:image/jpeg;base64,BBBB', content: {heading: 'Ny rubrik', buttonTarget: 'account'}};
  const slots = normalizeHomepageImages({detail: first, hero: {slides: [first, second], autoplay: true}});
  assert.deepEqual(slots.detail.content, first.content);
  assert.deepEqual(slots.hero.slides.map(slide => slide.content.buttonTarget), ['catalog', 'account']);
  assert.equal(slots.hero.autoplay, true);
  assert.throws(() => normalizeHomepageImages({hero: {slides: Array(5).fill(first)}}), /högst 4/);
});
