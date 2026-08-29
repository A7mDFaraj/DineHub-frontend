# PRD: DineHub MVP

نظام طلب ذكي للمطاعم والكافيهات عبر QR Code

\---

## 1\. الفكرة

العميل يمسح QR على الطاولة → يشوف المينيو → يطلب مباشرة بدون ما يجي نادل. الطلب يوصل مباشرة لشاشة الموظف اللي يحدّث حالته.

\---

## 2\. المستخدمون

* **العميل**: يمسح QR → يطلب
* **الموظف**: يشوف الطلبات → يحدّث حالتها
* **المالك**: يدير المينيو والطاولات والفروع

\---

## 3\. الميزات (Scope كامل الـ MVP - ولا شي زيادة)

### 3.1 المينيو

* عرض المنتجات مقسّمة لتصنيفات (Categories)
* كل منتج: اسم (عربي)، وصف (إنجليزي)، سعر، صورة، متاح/غير متاح
* كل منتج له مواصفات (Attributes) بشكل tags — مثال: "سكر قليل"، "سكر كثير"، "بدون سكر"، "حار"، "بدون لاكتوز"

  * تُعرض كـ badges تحت اسم المنتج
  * قائمة مواصفات موحّدة يديرها المالك (مو نص حر لكل منتج)
* خيارات بسيطة للمنتج (مثلاً: حجم) — اختياري لو الوقت ما يسمح

### 3.2 الطاولات و QR

* كل طاولة لها رقم فريد
* QR يوجّه لـ: `/menu/{branchId}/{tableNumber}`
* الصفحة تعرف تلقائياً أي فرع وأي طاولة

### 3.3 السلة والطلب

* إضافة/حذف منتجات من السلة
* ملاحظة نصية حرة على مستوى الطلب (مثلاً "بدون بصل")
* إرسال الطلب → يُحفظ بحالة `pending`

### 3.4 تتبع الحالة (العميل)

* العميل يشوف حالة طلبه: `pending → preparing → ready → delivered`
* تحديث كل 5 ثواني (polling) أو Socket.io لو الوقت يسمح

### 3.5 لوحة الموظف

* قائمة بكل الطلبات الحية (مرتبة بالأحدث أو الأقدم)
* زر لتغيير الحالة بضغطة وحدة
* فلترة حسب الحالة

### 3.6 لوحة المالك (أساسية جداً)

* إضافة/تعديل/حذف منتجات وتصنيفات
* إضافة/تعديل طاولات
* إضافة أكثر من فرع (كل فرع مينيو وطاولات مستقلة)

\---

## 4\. خارج الـ Scope (Version 2)

* الدفع الإلكتروني
* الحجز
* إدارة الانتظار (Queue)
* تقسيم الفاتورة
* تطبيق موبايل نيتيف
* تحليلات وتقارير
* برنامج ولاء

\---

## 5\. نموذج البيانات (Database Schema)

```
Branch
- id
- name
- address

Table
- id
- branch\_id (FK)
- number

Category
- id
- branch\_id (FK)
- name
- sort\_order

Product
- id
- category\_id (FK)
- name\_ar
- description\_en
- price
- image\_url
- is\_available (bool)

Attribute
- id
- branch\_id (FK)
- label\_ar        # مثال: "سكر قليل"
- label\_en        # مثال: "Low sugar"

ProductAttribute
- product\_id (FK)
- attribute\_id (FK)

Order
- id
- branch\_id (FK)
- table\_id (FK)
- status (pending | preparing | ready | delivered)
- note
- created\_at

OrderItem
- id
- order\_id (FK)
- product\_id (FK)
- quantity
- price\_at\_order

User (staff/owner)
- id
- branch\_id (FK, nullable لو owner على كل الفروع)
- name
- role (owner | staff)
- password\_hash
```

\---

## 6\. الـ API (REST - أساسي فقط)

```
GET    /api/menu/:branchId              → المينيو كامل (تصنيفات + منتجات)
GET    /api/table/:branchId/:tableNo    → تفاصيل الطاولة

POST   /api/orders                      → إنشاء طلب جديد
GET    /api/orders/:id                  → حالة طلب معيّن (للعميل)

GET    /api/staff/orders                → كل الطلبات الحية (للموظف)
PATCH  /api/staff/orders/:id/status     → تحديث الحالة

POST   /api/admin/products              → إضافة منتج
PATCH  /api/admin/products/:id          → تعديل منتج
DELETE /api/admin/products/:id          → حذف منتج

POST   /api/admin/attributes            → إضافة مواصفة (label\_ar + label\_en)
GET    /api/admin/attributes            → قائمة كل المواصفات المتاحة للفرع

POST   /api/admin/tables                → إضافة طاولة
POST   /api/admin/branches              → إضافة فرع

POST   /api/auth/login                  → دخول الموظف/المالك
```

\---

## 7\. التقنيات

* **Frontend**: React / Next.js + TailwindCSS
* **Backend**: Node.js + NestJS (أو Express لو أسرع)
* **DB**: PostgreSQL
* **Real-time**: Socket.io (اختياري - polling بديل كافي للـ MVP)
* **Auth**: use betterauth libaray JWT بسيط للموظف/المالك فقط (العميل بدون تسجيل دخول)

\---

## 8\. معايير القبول

* العميل يقدر يمسح QR ويطلب بأقل من دقيقتين بدون مساعدة
* الموظف يشوف الطلب الجديد فوراً (أو خلال 5 ثواني)
* المالك يقدر يضيف منتج/طاولة/فرع من غير دعم فني

\---

**الحالة**: جاهز للتنفيذ المباشر (Vibe Coding)

