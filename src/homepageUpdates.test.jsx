import {act, fireEvent, render, screen, within} from '@testing-library/react';
import '@testing-library/jest-dom';
import AppHeader from './components/layout/AppHeader';
import HomepageNotice from './components/layout/HomepageNotice';
import LandingPage from './pages/LandingPage';
import HomepageNoticeEditor from './pages/admin/HomepageNoticeEditor';
import {getCatalogSnapshot, setCatalogSnapshot} from './data/catalogStore';
import {compressHomepageImage} from './data/prepareHomepageImage';

jest.mock('./data/prepareHomepageImage', () => ({compressHomepageImage:jest.fn()}));

const originalFetch = global.fetch;
const originalCatalog = getCatalogSnapshot();
const banner = {enabled: true, heading: '', message: '', startsOn: '', endsOn: '', tone: 'red', snow: true,
  allPages: true, scrolling: true, imageSrc: 'data:image/png;base64,AAAA', imageAlt: 'Julledigt 23 dec till 8 jan', imageLayout: 'fill'};
const response = notice => ({ok: true, headers: {get: () => 'application/json'}, json: async () => ({notice})});

afterEach(() => {
  global.fetch = originalFetch;
  setCatalogSnapshot(originalCatalog);
  jest.useRealTimers();
});

test('the banner follows the navigation on other pages and its motion can be paused', async () => {
  global.fetch = jest.fn().mockResolvedValue(response(banner));
  render(<AppHeader/>);
  const image = await screen.findByRole('img', {name: banner.imageAlt});
  const header = screen.getByRole('banner');
  expect(header).toContainElement(image);
  expect(image.closest('section')).toHaveAttribute('data-tone', 'red');
  expect(image.closest('section')).toHaveAttribute('data-full-width', 'true');
  expect(global.fetch).toHaveBeenCalledWith('/api/homepage-notice?scope=portal', expect.anything());
  const pause = within(header).getByRole('button', {name: 'Pausa rullning'});
  expect(pause).toBeEmptyDOMElement();
  fireEvent.click(pause);
  expect(within(header).getByRole('button', {name: 'Starta rullning'})).toBeVisible();
});

test('an image banner takes its height from the menu row', async () => {
  global.fetch = jest.fn().mockResolvedValue(response(banner));
  const bounds = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({height:78});
  try {
    render(<AppHeader/>);
    await screen.findByRole('img', {name:banner.imageAlt});
    expect(screen.getByRole('banner').style.getPropertyValue('--notice-height')).toBe('78px');
  } finally {bounds.mockRestore();}
});

test('a centered rolling banner advances by exactly the displayed image width', () => {
  const original = global.ResizeObserver;
  let resize;
  global.ResizeObserver = class {
    constructor(callback) {resize = callback;}
    observe() {}
    disconnect() {}
  };
  try {
    const {unmount} = render(<HomepageNotice notice={{...banner, imageLayout:'center'}}/>);
    expect(screen.getByRole('region', {name:'Meddelande'})).toHaveAttribute('data-full-width','true');
    expect(screen.getByRole('region', {name:'Meddelande'})).toHaveAttribute('data-image-layout','repeat');
    const content = screen.getByRole('img', {name:banner.imageAlt}).parentElement;
    resize([{contentRect:{width:510}}]);
    expect(content.style.getPropertyValue('--notice-tile-width')).toBe('510px');
    expect(content.style.getPropertyValue('--notice-image')).toContain(banner.imageSrc);
    fireEvent.click(screen.getByRole('button', {name:'Pausa rullning'}));
    expect(content).toHaveAttribute('data-paused','true');
    unmount();
  } finally {global.ResizeObserver = original;}
});

test('a previously centered static banner fills the page without a settings change', () => {
  render(<HomepageNotice notice={{...banner, imageLayout:'center', scrolling:false}}/>);
  expect(screen.getByRole('region', {name:'Meddelande'})).toHaveAttribute('data-full-width','true');
  expect(screen.getByRole('region', {name:'Meddelande'})).toHaveAttribute('data-image-layout','fill');
});

test('admin can upload one banner and choose motion and where it appears', async () => {
  const notice = {...banner, enabled: false, imageSrc: '', imageAlt: '', tone: 'green', allPages: false, snow: false};
  compressHomepageImage.mockResolvedValue(banner.imageSrc);
  global.fetch = jest.fn().mockResolvedValueOnce(response(notice)).mockImplementation(async (_url, request) => {
    return response(JSON.parse(request.body));
  });
  render(<HomepageNoticeEditor adminPassword="account:test"/>);
  const file = new File(['banner'], 'Julledigt.png', {type:'image/png'});
  fireEvent.change(await screen.findByLabelText('Bannerbild'), {target:{files:[file]}});
  expect(await screen.findByRole('img', {name:'Julledigt'})).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  fireEvent.click(screen.getByLabelText('Rulla bilden'));
  fireEvent.click(screen.getByLabelText('Visa även på övriga sidor i beställningsportalen'));
  fireEvent.click(screen.getByRole('button', {name: 'Spara meddelande'}));
  expect(await screen.findByText('Meddelandet har sparats.')).toBeVisible();
  const [url, request] = global.fetch.mock.calls[1];
  expect(url).toBe('/api/admin/homepage-notice');
  expect(JSON.parse(request.body)).toMatchObject({enabled:true, imageSrc:banner.imageSrc, imageAlt:'Julledigt', scrolling:false, allPages:true});
});

test('automatic image switching replaces the hero caption and its working button together', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue(response(null));
  const onLoginClick = jest.fn();
  setCatalogSnapshot({...originalCatalog, homepageImages: {hero: {autoplay: true, slides: [
    {src: '/first.jpg', alt: 'Första motivet', content: {heading: 'Första rubriken', buttonLabel: 'Sortiment', buttonTarget: 'catalog'}},
    {src: '/second.jpg', alt: 'Andra motivet', content: {heading: 'Andra rubriken', buttonLabel: 'Öppna mitt konto', buttonTarget: 'account'}},
  ]}}});
  render(<LandingPage getHeaderProps={() => ({onLoginClick})} openCategory={jest.fn()} openFeaturedProduct={jest.fn()}/>);
  expect(screen.getByRole('heading', {name: 'Första rubriken'})).toBeVisible();
  await act(async () => {jest.advanceTimersByTime(7000);});
  expect(screen.getByRole('heading', {name: 'Andra rubriken'})).toBeVisible();
  expect(screen.getByRole('img', {name: 'Andra motivet'})).toHaveAttribute('src', '/second.jpg');
  fireEvent.click(screen.getByRole('button', {name: 'Öppna mitt konto'}));
  expect(onLoginClick).toHaveBeenCalledTimes(1);
});

test('admin can remove the published banner by saving without a picture', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response({...banner, imageLayout: 'center', scrolling: false})).mockImplementation(async (_url, request) => {
    return response(JSON.parse(request.body));
  });
  render(<HomepageNoticeEditor adminPassword="account:test"/>);
  fireEvent.click(await screen.findByRole('button', {name:'Ta bort bannerbild'}));
  expect(screen.queryByRole('img', {name:banner.imageAlt})).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Spara meddelande'}));
  expect(await screen.findByText('Meddelandet har sparats.')).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toMatchObject({enabled:false, imageSrc:''});
});
