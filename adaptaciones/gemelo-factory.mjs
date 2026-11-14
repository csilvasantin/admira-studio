import {isStarbucksFormat} from './starbucks-twin-core.mjs?v=stock-sync-1';
export {isStarbucksFormat};
export const isAdmiraNextFormat=f=>f?.client?.id==='admiranext'||f?.installation?.catalogClient==='admiranext';
export const twinKind=f=>isAdmiraNextFormat(f)?'admiranext':isStarbucksFormat(f)?'starbucks':'retail';
export async function createFormatTwin(options){
 if(isAdmiraNextFormat(options.format)){const {createAdmiraNextTwin}=await import('./admiranext-twin.mjs?v=1');return createAdmiraNextTwin(options);}
 if(isStarbucksFormat(options.format)){const {createStarbucksTwin}=await import('./starbucks-twin.mjs?v=coffee-footer-1');return createStarbucksTwin(options);}
 const {createRetailTwin}=await import('./gemelo-better.mjs?v=coffee-footer-1');const twin=await createRetailTwin(options);twin.sceneKind='retail';return twin;
}
