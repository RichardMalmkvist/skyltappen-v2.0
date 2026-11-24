import fs from 'fs';
import path from 'path';
import {cleanDoorPhoto0608,cleanDoorPhoto0608Url} from './data/cleanDoorPhoto0608';
const asset=fs.readFileSync(path.join(process.cwd(),'public/door-photo-0608-clean.svg'),'utf8');
const original=asset.match(/<image href="([^"]+)"/)[1];

test('Only the known 0608 photo is replaced consistently in primary, card and gallery images',()=>{
 const a={articleNumber:'0608',image:original,cardImage:original,images:[original,'/alternate.png'],price:660};
 const result=cleanDoorPhoto0608(a);
 expect(result.image).toBe(cleanDoorPhoto0608Url);expect(result.cardImage).toBe(result.image);expect(result.images).toEqual([result.image,'/alternate.png']);expect(result.price).toBe(660);expect(a.image).toBe(original);expect(cleanDoorPhoto0608(result)).toBe(result);
});
test('Future uploads and other articles are preserved',()=>{
 const custom={articleNumber:'0608',image:'/new-photo.png',images:['/new-photo.png']};expect(cleanDoorPhoto0608(custom)).toBe(custom);
 const other={articleNumber:'0607',image:original};expect(cleanDoorPhoto0608(other)).toBe(other);
});
