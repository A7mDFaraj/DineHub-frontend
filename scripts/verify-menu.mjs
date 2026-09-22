import assert from 'node:assert/strict';
import { MENU_THEMES, activeDiscount, contrastInk } from '../lib/menu-themes.ts';
import { useCartStore } from '../store/cart-store.ts';

function luminance(hex) {
  const [r,g,b] = hex.slice(1).match(/../g).map((v) => parseInt(v,16)/255).map((v) => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return r*0.2126+g*0.7152+b*0.0722;
}
function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
for (const theme of MENU_THEMES) {
  for (const [foreground,background] of [[theme.text,theme.background],[theme.muted,theme.background],[theme.muted,theme.surface],[theme.heroText,theme.hero],[contrastInk(theme.accent),theme.accent]]) {
    assert.ok(contrast(foreground,background)>=4.5, `${theme.id}: insufficient contrast for ${foreground} on ${background}`);
  }
}
assert.equal(activeDiscount({showSpecialDiscount:false,discountPercent:23}),0);
for (const discountPercent of [-1,0,101,NaN,2.5]) assert.equal(activeDiscount({showSpecialDiscount:true,discountPercent}),0);
assert.equal(activeDiscount({showSpecialDiscount:true,discountPercent:23}),23);
const store = useCartStore;
store.getState().setContext('branch-a:table-1');
const item = {productId:'salad',nameAr:'سلطة',nameEn:'Salad',price:36.96};
store.getState().addItem({...item,itemNote:'No onions',quantity:2});
store.getState().addItem({...item,itemNote:'Extra sauce',quantity:1});
assert.equal(store.getState().items.length,2);
const firstId = store.getState().items[0].id;
store.getState().updateQuantity(firstId,3);
assert.deepEqual(store.getState().items.map((entry)=>entry.quantity),[3,1]);
store.getState().removeItem(firstId);
assert.equal(store.getState().items.length,1);
store.getState().syncPrices([{id:'salad',price:'40.00'}]);
assert.equal(store.getState().totalAmount(),40);
store.getState().setContext('branch-a:table-2');
assert.equal(store.getState().items.length,0);
store.getState().addItem(item);
store.getState().syncPrices([]);
assert.equal(store.getState().items.length,0);
console.log('Passed: all six theme contrast pairs, discount visibility, customized cart quantities, menu repricing, unavailable items, and table isolation.');
