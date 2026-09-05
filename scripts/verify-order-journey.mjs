import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();
const base = process.env.FRONTEND_TEST_URL || 'http://localhost:3100';
const token = 'public-tracking-token';
const createdAt = new Date(Date.now()-120000).toISOString();
let status = 'pending', patches = 0, failPatch = false, stale = false;
const order = () => ({ id:'internal-order', orderNumber:42, publicToken:token, table:{number:7}, status, createdAt, deliveredAt: status === 'delivered' ? new Date().toISOString() : null, items:[{productId:'product',quantity:2,product:{nameAr:'برجر الدجاج'}}] });
await page.route('https://dinehub-backend-42eq.onrender.com/**', async route => {
 const path = new URL(route.request().url()).pathname;
 const send = (data, code=200) => route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(data)});
 if(route.request().method()==='OPTIONS') return send({});
 if(path.endsWith('/auth/get-session')) return send({session:{id:'session',userId:'staff',expiresAt:'2099-01-01T00:00:00Z',token:'test'},user:{id:'staff',name:'موظف',role:'cashier',branchId:'branch-1',email:'staff@example.test',emailVerified:true}});
 if(path.endsWith('/access/me')) return send({role:'cashier',branchId:'branch-1',permissions:['orders.read','orders.prepare','orders.ready','orders.deliver']});
 if(path.endsWith('/staff/branches')) return send([{id:'branch-1',name:'الفرع الرئيسي'}]);
 if(path.endsWith('/status') && route.request().method()==='PATCH') {
  patches++; await new Promise(resolve=>setTimeout(resolve,900));
  if(failPatch) return send({message:'test failure'},500);
  status=route.request().postDataJSON().status; return send(order());
 }
 if(path.endsWith('/history')) return send(status === 'delivered' ? [order()] : []);
 if(path.endsWith('/staff/orders/branch-1')) return send(status==='delivered'?[]:[{...order(),status:stale?'pending':status}]);
 if(path.endsWith('/orders') && route.request().method()==='POST') {
  const payload=route.request().postDataJSON();
  assert.equal(payload.branchId,'branch-1'); assert.equal(payload.tableId,'internal-table');
  return send({trackingPath:`/order/${token}`},201);
 }
 if(path.includes('/orders/')) return send({...order(),menuPath:'/menu/restaurant/7',trackingPath:`/order/${token}`});
 if(path.includes('/table/')) return send({id:'internal-table',branchId:'branch-1',number:7,branch:{publicCode:'restaurant',name:'المطعم'}});
 if(path.includes('/menu/')) return send({branch:{publicCode:'restaurant'},categories:[{id:'cat',nameAr:'الأطباق',products:[{id:'product',nameAr:'برجر الدجاج',price:25,isAvailable:true}]}]});
 return send({});
});
await page.goto(`${base}/menu/legacy/order/legacy-order`);
await page.getByText('أظهر هذا الرمز للموظف عند استلام الطلب').waitFor();
await page.waitForURL(`**/order/${token}`);
assert(!(await page.locator('body').innerText()).includes('internal-'));
for(const width of [320,375,768,1024,1440,1920]) {
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`customer overflow ${width}`);
}
await page.setViewportSize({width:375,height:900});
await page.screenshot({path:'scripts/customer-order.png',fullPage:true});
await page.getByRole('link',{name:'طلب المزيد أو العودة إلى قائمة الطعام'}).click();
await page.waitForURL('**/menu/restaurant/7');
await page.getByText('برجر الدجاج',{exact:true}).waitFor();
assert(!(await page.locator('body').innerText()).includes('Validation failed'));
await page.getByText('برجر الدجاج',{exact:true}).click();
await page.getByRole('button',{name:/إضافة إلى الطلب/}).click();
await page.getByRole('button',{name:/عرض ومراجعة الطلب/}).click();
await page.getByRole('button',{name:'تأكيد وإرسال الطلب إلى الطاقم'}).click();
await page.waitForURL(`**/order/${token}`);
await page.goto(`${base}/staff`);
await page.getByRole('button',{name:'قبول الطلب وبدء التجهيز'}).waitFor();
const accept=page.getByRole('button',{name:'قبول الطلب وبدء التجهيز'});
await accept.click();
assert(await page.getByRole('button',{name:'جارٍ تأكيد التحديث…'}).isDisabled());
await page.getByRole('button',{name:'جاهز للتسليم',exact:true}).waitFor();
assert.equal(patches,1);
stale=true;
await page.getByRole('button',{name:'تحديث',exact:true}).click();
await page.waitForTimeout(1000);
assert.equal(await page.getByRole('button',{name:'قبول الطلب وبدء التجهيز'}).count(),0);
stale=false; failPatch=true;
await page.getByRole('button',{name:'جاهز للتسليم',exact:true}).click();
await page.getByRole('alert').filter({hasText:'تعذر تأكيد التحديث'}).waitFor();
assert.equal(status,'preparing');
failPatch=false;
await page.getByRole('button',{name:'جاهز للتسليم',exact:true}).click();
await page.getByRole('button',{name:'تأكيد التسليم',exact:true}).waitFor();
await page.getByText('طابق الرمز #0042 مع شاشة العميل قبل التسليم.').waitFor();
for(const width of [320,375,768,1024,1440,1920]) {
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`staff overflow ${width}`);
}
await page.setViewportSize({width:1024,height:900});
await page.screenshot({path:'scripts/staff-orders.png',fullPage:true});
await page.getByRole('button',{name:'تأكيد التسليم',exact:true}).click();
await page.getByRole('button',{name:/سجل التسليم/}).click();
await page.getByText('تم تسليم الطلب',{exact:true}).waitFor();
console.log('PASS: public canonical links, table return navigation, shared code, loading lock, stale poll protection, failure retry, full lifecycle and six responsive widths.');
await browser.close();

