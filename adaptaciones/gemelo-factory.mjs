import {isStarbucksFormat} from './starbucks-twin-core.mjs?v=stock-sync-1';
export {isStarbucksFormat};
export async function createFormatTwin(options){
 if(isStarbucksFormat(options.format)){const {createStarbucksTwin}=await import('./starbucks-twin.mjs?v=coffee-footer-1');return createStarbucksTwin(options);}
 const {createRetailTwin}=await import('./gemelo-better.mjs?v=coffee-footer-1');const twin=await createRetailTwin(options);twin.sceneKind='retail';return twin;
}
