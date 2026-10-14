import {isStarbucksFormat} from './starbucks-twin-core.mjs?v=starbucks-room-1';
export {isStarbucksFormat};
export async function createFormatTwin(options){
 if(isStarbucksFormat(options.format)){const {createStarbucksTwin}=await import('./starbucks-twin.mjs?v=starbucks-room-1');return createStarbucksTwin(options);}
 const {createRetailTwin}=await import('./gemelo-better.mjs?v=installation-20261009');const twin=await createRetailTwin(options);twin.sceneKind='retail';return twin;
}
