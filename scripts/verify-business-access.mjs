import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON||import.meta.url);const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();
const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
const keys=['dashboard.read','analytics.read','branches.read','branches.create','branches.update','branches.delete','branches.all','categories.read','categories.create','categories.update','categories.delete','menu.read','menu.create','menu.update','menu.delete','tables.read','tables.create','tables.update','tables.delete','users.read','users.create','access.manage','logs.read','orders.read','orders.prepare','orders.ready','orders.deliver','upload.create','settings.read'];
let permissions=[...keys],rating=null,savePayload=null,logRequests=0,analyticsRequests=0;
let branchProfile={id:'b',name:'الفرع الرئيسي'},branchSave=null;
const roles=[{key:'admin',name:'مدير النظام',permissions:keys},{key:'staff',name:'فريق التنفيذ',permissions:['orders.read','orders.prepare','orders.ready']}];
await page.route('https://dinehub-backend-42eq.onrender.com/**',async route=>{
 const path=new URL(route.request().url()).pathname; const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(path.endsWith('/auth/get-session'))return send({session:{id:'session',userId:'owner',expiresAt:'2099-01-01T00:00:00Z',token:'test'},user:{id:'owner',name:'أحمد',role:'admin',email:'owner@example.test',emailVerified:true}});
 if(path.endsWith('/access/me'))return send({id:'owner',role:'admin',branchId:null,permissions});
 if(path.endsWith('/staff/branches'))return send([branchProfile]);
 if(path.endsWith('/admin/branches/b') && route.request().method()==='PATCH'){branchSave=route.request().postDataJSON();const allowed=['name','nameAr','nameEn','phone','address','logoUrl','themeColor'];assert(Object.keys(branchSave).every(k=>allowed.includes(k)));branchProfile={...branchProfile,...branchSave};return send(branchProfile);}
 if(path.endsWith('/admin/users'))return send([{id:'u',name:'عضو الفريق',email:'team@example.test',role:'staff',branchId:'b',permissionGrants:[],permissionDenials:[]}]);
 if(path.endsWith('/admin/access'))return send({permissions:keys,roles});
 if(path.includes('/admin/access/users/')){savePayload=route.request().postDataJSON();return send({id:'u'})}
 if(path.includes('/admin/access/roles/'))return send({});
 if(path.endsWith('/admin/analytics')){analyticsRequests++;return send({summary:{orders:40,completed:35,active:5,averageMinutes:12.5,timedOrders:30,averageRating:4.6,ratings:20,completedValue:1850,acceptMinutes:2,prepareMinutes:8,handoffMinutes:2.5},popular:[{id:'p',name:'المنتج الأكثر طلباً',quantity:20,value:500}],daily:[{day:'2026-09-03',orders:10},{day:'2026-09-04',orders:14},{day:'2026-09-05',orders:16}]})}
 if(path.includes('/admin/logs')){logRequests++;return send({})}
 if(path.endsWith('/rating')){rating=route.request().postDataJSON().rating;return send({rating})}
 if(path.includes('/orders/'))return send({publicToken:'token',orderNumber:42,status:'delivered',createdAt:'2026-09-05T10:00:00Z',deliveredAt:'2026-09-05T10:15:00Z',table:{number:7},trackingPath:'/order/token',menuPath:'/menu/public/7',rating});
 return send({});
});
const base=process.env.FRONTEND_TEST_URL||'http://localhost:3100';
await page.context().addCookies([{name:'dinehub_admin_guide',value:'v1',url:base}]);
await page.goto(base+'/admin');await page.getByRole('heading',{name:'أرقام تساعدك تتخذ القرار.'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e});await page.getByText('1. المنتج الأكثر طلباً',{exact:true}).waitFor();
assert(analyticsRequests<4,'analytics request loop');
for(const width of [320,375,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`dashboard overflow ${width}`)}
await page.setViewportSize({width:1440,height:1100});await page.getByRole('heading',{name:'أرقام تساعدك تتخذ القرار.'}).scrollIntoViewIfNeeded();await page.screenshot({path:'C:/Users/ahmed/.codex/visualizations/2026/09/05/01a071b8-84cf-7661-8352-f3ef8cdaad01/business-dashboard.png',fullPage:true});
permissions=keys.filter(k=>k!=='logs.read');await page.reload();await page.getByRole('heading',{name:'أرقام تساعدك تتخذ القرار.'}).waitFor();assert.equal(await page.getByRole('link',{name:'سجل النظام'}).count(),0);
await page.goto(base+'/admin/logs');await page.getByText('هذه الصفحة غير متاحة لحسابك').waitFor();assert.equal(logRequests,0,'denied logs data fetched');
permissions=[...keys];await page.goto(base+'/admin/users');await page.getByRole('button',{name:'صلاحيات عضو الفريق'}).click();
const modal=page.getByRole('dialog');await modal.getByRole('combobox').first().selectOption('admin');await modal.getByRole('group',{name:'سجل النظام',exact:true}).getByRole('checkbox').uncheck();
for(const width of [320,375,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`permissions overflow ${width}`)}
await page.setViewportSize({width:1024,height:1000});await page.screenshot({path:'C:/Users/ahmed/.codex/visualizations/2026/09/05/01a071b8-84cf-7661-8352-f3ef8cdaad01/permissions-editor.png',fullPage:true});
await modal.getByRole('button',{name:'حفظ الصلاحيات',exact:true}).click();await page.getByText('تم حفظ الصلاحيات. تسري على الطلبات التالية مباشرة.').waitFor();assert(savePayload.denials.includes('logs.read'));assert.equal(savePayload.role,'admin');
await page.goto(base+'/order/token');await page.getByRole('heading',{name:'كيف كانت تجربتك؟'}).waitFor();await page.getByRole('button',{name:'5 من 5 — ممتازة'}).click();await page.getByText('ممتازة — شكراً لك!').waitFor();assert.equal(rating,5);await page.reload();await page.getByRole('button',{name:'5 من 5 — ممتازة'}).waitFor();assert.equal(await page.getByRole('button',{name:'5 من 5 — ممتازة'}).getAttribute('aria-pressed'),'true');
await page.setViewportSize({width:375,height:1000});await page.screenshot({path:'C:/Users/ahmed/.codex/visualizations/2026/09/05/01a071b8-84cf-7661-8352-f3ef8cdaad01/order-rating.png',fullPage:true});
await page.goto(base+'/admin/branches');await page.getByRole('button',{name:'تعديل بيانات الفرع'}).click();await page.locator('#branch-name').fill('فرع الاختبار');await page.locator('#branch-phone').fill('+966500000000');await page.getByRole('button',{name:'حفظ التعديلات',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(branchSave.name,'فرع الاختبار');assert.equal(branchSave.phone,'+966500000000');
await page.goto(base+'/admin/settings');await page.locator('#store-name-en').fill('Test Branch');await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();await page.waitForResponse(response=>response.url().endsWith('/staff/branches'));await page.reload();await page.locator('#store-name-en').waitFor();assert.equal(await page.locator('#store-name-en').inputValue(),'Test Branch');assert.deepEqual(pageErrors,[]);
console.log('PASS: branch editing and settings profile persist without page errors.');
console.log('PASS: business analytics, no denied logs navigation/data requests, permission checkbox payload, persisted one-tap rating, and six screen widths.');await browser.close();
