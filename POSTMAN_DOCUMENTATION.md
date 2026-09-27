# 📮 الدليل المرجعي الكامل والشامل لاختبار الـ API عبر Postman
### نظام إدارة اختبارات الجودة (MCIT QA Test Suite Manager)

---

## 📌 الفهرس العام
1. [نظرة عامة وبيانات الاتصال السحابية والمحلية](#1-نظرة-عامة-وبيانات-الاتصال)
2. [نظام الأدوار والصلاحيات (Admin vs User)](#2-نظام-الأدوار-والصلاحيات-admin-vs-user)
3. [الاستيراد الفوري في Postman (خطوة واحدة بملف الـ Collection)](#3-الاستيراد-الفوري-في-postman)
4. [كيفية عمل المصادقة والـ Token الأوتوماتيكي في Postman](#4-كيفية-عمل-المصادقة-والتوكن-الأوتوماتيكي)
5. [التفصيل الكامل لكل Endpoint (المدخلات والمخرجات وحالات الخطأ)](#5-التفصيل-الكامل-لكل-endpoint)
   - [5.1 قسم المصادقة (Auth)](#51-المصادقة-auth)
   - [5.2 قسم المستخدمين وإضافة الحسابات (Users - Admin Only)](#52-المستخدمين-والفاحصين-users)
   - [5.3 قسم لوحة التحكم والإحصائيات (Dashboard Analytics)](#53-لوحة-التحكم-والإحصائيات-dashboard)
   - [5.4 قسم حالات الاختبار (Test Cases CRUD)](#54-حالات-الاختبار-test-cases)
   - [5.5 قسم إدارة المشاريع (Projects CRUD)](#55-إدارة-المشاريع-projects)
6. [سيناريو اختبار تطبيقي متكامل من البداية للنهاية](#6-سيناريو-اختبار-تطبيقي-متكامل)

---

## 1. نظرة عامة وبيانات الاتصال

السيرفر يعمل بكامل طاقته ومرفوع على بيئة سحابية (Render) ويعمل أيضاً محلياً على جهازك:

- **الرابط السحابي الحي (Live Cloud URL):**
  `https://mcit-test-case-backend.onrender.com/api`
- **الرابط المحلي (Local URL):**
  `http://localhost:3001/api`
- **واجهة Swagger التفاعلية للمتصفح:**
  `https://mcit-test-case-backend.onrender.com/api/docs`

---

## 2. نظام الأدوار والصلاحيات (Admin vs User)

النظام يحتوي على مستويين من الأدوار (`role`):
1. **المدير (`admin`):**
   - الحساب الافتراضي الرئيسي: `karim@mcit.gov.eg` / `password123`.
   - يملك جميع الصلاحيات في النظام.
   - **الصلاحية الحصرية:** هو **الوحيد** المصرح له بإضافة مستخدمين وفاحصين جدد (`POST /api/users`)، وتحديد أدوارهم ما إذا كان المستخدم الجديد `admin` أو `user`.
2. **المستخدم العادي / الفاحص (`user`):**
   - حسابات الفاحصين (مثل: `sara@mcit.gov.eg` و `ahmed@mcit.gov.eg`).
   - يمكنه تنفيذ وتعديل حالات الاختبار والمشاريع ومتابعة الإحصائيات.
   - **ممنوع تماماً من إضافة مستخدمين جدد**؛ إذا حاول إرسال طلب إلى `POST /api/users` سيرفضه السيرفر فوراً برمز `403 Forbidden`.

---

## 3. الاستيراد الفوري في Postman

بدلاً من كتابة الروابط والـ Headers والـ JSON يدوياً، جهزت لك ملف Collection مبرمج جاهز:

1. افتح برنامج **Postman**.
2. اضغط على زر **Import** في أعلى يسار نافذة البرنامج.
3. اختر الملف المرفق في مشروعك:
   `d:\MCIT\test_case\backend\mcit_qa_suite.postman_collection.json`
4. ستظهر لك مجموعة جاهزة باسم **`MCIT QA Test Suite Manager API`** مقسمة في مجلدات تشمل كل العمليات.

---

## 4. كيفية عمل المصادقة والتوكن الأوتوماتيكي

في هذه الـ Collection، لا تحتاج أبداً إلى نسخ ولصق الـ JWT Token يدوياً:
- عند تنفيذ الطلب **`1.1 Login`**، يقوم سكريبت Postman مدمج (Tests script) بالتقاط الـ `access_token` الراجع وحفظه تلقائياً في متغير المجموعة `{{token}}`.
- جميع الطلبات التالية تم ضبطها في الـ Headers بـ:
  ```http
  Authorization: Bearer {{token}}
  ```
- **صلاحية الـ Token:** **7 أيام كاملة (604,800 ثانية)** من تاريخ الإصدار.

---

## 5. التفصيل الكامل لكل Endpoint

---

### 5.1 المصادقة (Auth)

#### [POST] 1.1 تسجيل الدخول (Login)
- **الرابط:** `{{baseUrl}}/auth/login`
- **الصلاحية:** عام (Public - بدون توكن)
- **إعدادات Postman:**
  - تبويب **Headers**: `Content-Type: application/json`
  - تبويب **Body** -> اختر **raw** -> اختر **JSON**
- **الـ Request Body:**
```json
{
  "email": "karim@mcit.gov.eg",
  "password": "password123"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `email`: صيغة بريد إلكتروني قياسية تطابق `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`.
  - `password`: كلمة مرور بين 6 و 50 حرفاً تطابق `/^.{6,50}$/`.
- **الـ Response في حالة النجاح (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Karim Mansour",
    "email": "karim@mcit.gov.eg",
    "role": "admin"
  }
}
```
- **الـ Response في حالة الخطأ (400 Bad Request - خطأ Regex):**
```json
{
  "message": [
    "البريد الإلكتروني غير صالح. يجب أن يطابق الصيغة user@domain.com",
    "كلمة المرور يجب أن تكون بين 6 إلى 50 حرفاً"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```
- **الـ Response في حالة بيانات دخول غير صحيحة (401 Unauthorized):**
```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

#### [GET] 1.2 بيانات المستخدم الحالي (Get Me)
- **الرابط:** `{{baseUrl}}/auth/me`
- **الصلاحية:** محمي بـ `Authorization: Bearer {{token}}`
- **الـ Response في حالة النجاح (200 OK):**
```json
{
  "id": 1,
  "name": "Karim Mansour",
  "email": "karim@mcit.gov.eg",
  "role": "admin",
  "createdAt": "2026-09-27 12:51:07"
}
```

---

### 5.2 المستخدمين والفاحصين (Users)

#### [POST] 2.1 إضافة مستخدم جديد وتحديد دوره (Create User - Admin Only)
- **الرابط:** `{{baseUrl}}/users`
- **الصلاحية:** **خاص بالـ `admin` فقط** (حساب كريم مثلاً).
- **الـ Request Body:**
```json
{
  "name": "محمود أحمد النجار",
  "email": "mahmoud@mcit.gov.eg",
  "password": "password123",
  "role": "user"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `name`: أحرف مقبولة (عربية أو إنجليزية) بطول 2 إلى 50 حرفاً `/^[\p{L}\p{N}\s\-_.,()'"/]{2,50}$/u`.
  - `email`: بريد إلكتروني صحيح.
  - `password`: بين 6 و 50 حرفاً.
  - `role`: يقبل حصراً إما **`admin`** أو **`user`** بمطابقة `/^(admin|user)$/`.
- **الـ Response في حالة النجاح (201 Created):**
```json
{
  "id": 4,
  "name": "محمود أحمد النجار",
  "email": "mahmoud@mcit.gov.eg",
  "role": "user",
  "createdAt": "2026-09-27 13:58:12",
  "_count": {
    "testCases": 0
  }
}
```
*(لاحظ: تم تشفير كلمة المرور بـ bcrypt وإخفائها تلقائياً من الاستجابة لدواعي الأمان)*.

- **الـ Response إذا حاول مستخدم غير Admin إضافة حساب (403 Forbidden):**
```json
{
  "message": "غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط",
  "error": "Forbidden",
  "statusCode": 403
}
```

- **الـ Response في حال إرسال دور غير مسموح به (400 Bad Request):**
```json
{
  "message": [
    "الدور (role) يجب أن يكون إما admin أو user فقط"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

- **الـ Response إذا كان البريد مسجلاً مسبقاً (409 Conflict):**
```json
{
  "message": "البريد الإلكتروني مسجل بالفعل لمستخدم آخر",
  "error": "Conflict",
  "statusCode": 409
}
```

---

#### [GET] 2.2 قائمة المستخدمين (List Users)
- **الرابط:** `{{baseUrl}}/users`
- **الصلاحية:** محمي بـ Token.
- **الوظيفة:** إرجاع قائمة المستخدمين لتعبئة القوائم المنسدلة (Dropdowns) لاختيار الفاحص المسند إليه الاختبار.
- **الـ Response المتوقع (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Karim Mansour",
    "email": "karim@mcit.gov.eg",
    "role": "admin",
    "createdAt": "2026-09-27 12:51:07"
  },
  {
    "id": 2,
    "name": "Sara Fouad",
    "email": "sara@mcit.gov.eg",
    "role": "user",
    "createdAt": "2026-09-27 12:51:07"
  }
]
```

---

### 5.3 لوحة التحكم والإحصائيات (Dashboard)

#### [GET] 3.1 الإحصائيات العامة (KPI Stats)
- **الرابط:** `{{baseUrl}}/dashboard/stats`
- **الـ Response المتوقع (200 OK):**
```json
{
  "total": 10,
  "passed": 6,
  "failed": 2,
  "pending": 2,
  "passRate": 60,
  "totalProjects": 6
}
```
- **معنى القيم:**
  - `total`: إجمالي عدد الاختبارات.
  - `passed`: عدد الاختبارات الناجحة.
  - `failed`: عدد الاختبارات الفاشلة.
  - `pending`: عدد الاختبارات المعلقة.
  - `passRate`: نسبة النجاح المحسوبة (`passed / total * 100`).
  - `totalProjects`: إجمالي عدد المشاريع الحالية.

---

#### [GET] 3.2 بيانات الرسم البياني التراكمي (Execution Chart)
- **الرابط:** `{{baseUrl}}/dashboard/chart?days=14`
- **الـ Params:** `days`: عدد الأيام المطلوب تتبعها (افتراضياً 14).
- **الـ Response المتوقع (200 OK):**
```json
[
  {
    "date": "2026-09-14",
    "passed": 0,
    "failed": 0,
    "pending": 0
  },
  {
    "date": "2026-09-27",
    "passed": 6,
    "failed": 2,
    "pending": 2
  }
]
```

---

#### [GET] 3.3 توزيع خطورة العيوب (Defect Severity)
- **الرابط:** `{{baseUrl}}/dashboard/severity`
- **الـ Response المتوقع (200 OK):**
```json
{
  "total": 2,
  "breakdown": [
    { "priority": "critical", "count": 0, "percentage": 0 },
    { "priority": "high", "count": 2, "percentage": 100 },
    { "priority": "medium", "count": 0, "percentage": 0 },
    { "priority": "low", "count": 0, "percentage": 0 }
  ]
}
```

---

### 5.4 حالات الاختبار (Test Cases)

#### [GET] 4.1 جلب الحالات مع فلاتر وبحث (List Test Cases)
- **الرابط:** `{{baseUrl}}/test-cases?page=1&limit=10&status=passed&priority=critical&search=SSO`
- **الـ Query Params المدعومة:**
  - `page`: رقم الصفحة (`1`).
  - `limit`: عدد العناصر بالصفحة (`10`).
  - `status`: الفلترة بالحالة (`passed` أو `failed` أو `pending`).
  - `priority`: الفلترة بالأولوية (`critical` أو `high` أو `medium` أو `low`).
  - `module`: تصفية باسم الوحدة (مثل `Authentication`).
  - `projectId`: تصفية بحسب المشروع (رقم صحيح مثل `1`).
  - `search`: بحث نصي فوري في الـ (testId, module, scenario).
- **الـ Response المتوقع (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "testId": "TC-8492",
      "module": "Authentication",
      "pageName": "Login Page",
      "scenario": "Validate SSO token via SMS 2FA",
      "preConditions": "User has active account with verified phone number",
      "steps": [
        "Navigate to /login",
        "Enter civil ID and password",
        "Receive OTP via SMS",
        "Submit OTP"
      ],
      "expectedResult": "User session created, JWT returned, redirected to dashboard",
      "actualResult": "Redirected successfully to dashboard with 200 OK",
      "priority": "critical",
      "status": "passed",
      "notes": "Tested on Chrome & Edge",
      "executedAt": "2026-09-27T12:51:07.556Z",
      "testerId": 1,
      "projectId": 1,
      "createdAt": "2026-09-27 12:51:07",
      "updatedAt": "2026-09-27 12:51:07",
      "tester": {
        "id": 1,
        "name": "Karim Mansour",
        "email": "karim@mcit.gov.eg"
      },
      "project": {
        "id": 1,
        "name": "البوابة الرقمية المصرية"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

#### [POST] 4.2 إضافة حالة اختبار جديدة (Create Test Case)
- **الرابط:** `{{baseUrl}}/test-cases`
- **الـ Request Body:**
```json
{
  "testId": "TC-8510",
  "module": "Civil Registry",
  "pageName": "Citizen Services",
  "scenario": "Verify national ID checksum validation algorithm",
  "preConditions": "Citizen database service online",
  "steps": [
    "Input 14-digit national ID",
    "Calculate Luhn checksum algorithm",
    "Click validate button"
  ],
  "expectedResult": "Success response indicating valid ID format",
  "actualResult": "Checksum verified in 12ms",
  "priority": "critical",
  "status": "passed",
  "notes": "High priority security verification",
  "executedAt": "2026-09-27T14:30:00.000Z",
  "testerId": 1,
  "projectId": 1
}
```
- **قواعد الـ Regex للمدخلات:**
  - `testId`: اختياري (يولد تلقائياً بالتسلسل إن لم يُرسل)، وإن تم إرساله يجب أن يطابق `/^TC-\d{4,}$/`.
  - `module`: أحرف عربية/إنجليزية بين 2 و 50 حرفاً `/^[\p{L}\p{N}\s\-_.,()&/]{2,50}$/u`.
  - `priority`: حصراً `/^(critical|high|medium|low)$/`.
  - `status`: حصراً `/^(passed|failed|pending)$/`.
  - `executedAt`: صيغة تاريخ ISO 8601 مثل `YYYY-MM-DDTHH:mm:ss.sssZ`.
- **الـ Response في حالة النجاح (201 Created):** يُرجع كائن الحالة المنشأة كاملاً مع كائن الفاحص وكائن المشروع.

---

#### [PATCH] 4.3 تعديل حالة اختبار (Update Test Case)
- **الرابط:** `{{baseUrl}}/test-cases/1`
- **الـ Request Body (تعديل الحقول المطلوبة فقط):**
```json
{
  "status": "failed",
  "actualResult": "Unexpected HTTP 500 error returned by downstream gateway",
  "notes": "Ticket logged with DevOps team"
}
```
- **الـ Response في حالة النجاح (200 OK):** يُرجع الكائن كاملاً بعد التعديل وتحديث `updatedAt`.

---

#### [DELETE] 4.4 حذف حالة اختبار (Delete Test Case)
- **الرابط:** `{{baseUrl}}/test-cases/11`
- **الـ Response في حالة النجاح (200 OK):**
```json
{
  "message": "Test case #11 deleted successfully"
}
```

---

### 5.5 إدارة المشاريع (Projects)

#### [GET] 5.1 قائمة المشاريع مع نسب النجاح الحية (List Projects)
- **الرابط:** `{{baseUrl}}/projects?environment=production&status=active`
- **الـ Response المتوقع (200 OK):**
```json
[
  {
    "id": 1,
    "name": "البوابة الرقمية المصرية",
    "description": "National digital government services portal",
    "environment": "production",
    "status": "active",
    "createdAt": "2026-09-27 12:51:07",
    "updatedAt": "2026-09-27 12:51:07",
    "stats": {
      "total": 4,
      "passed": 3,
      "failed": 1,
      "pending": 0,
      "successRate": 75
    }
  }
]
```

---

#### [POST] 5.2 إنشاء مشروع جديد (Create Project)
- **الرابط:** `{{baseUrl}}/projects`
- **الـ Request Body:**
```json
{
  "name": "منظومة الضرائب والجمارك الموحدة",
  "description": "بوابة التحصيل والربط الجمركي الإلكتروني",
  "environment": "staging",
  "status": "active"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `name`: بين 2 إلى 100 حرف `/^[\p{L}\p{N}\s\-_.,()&/]{2,100}$/u`.
  - `environment`: حصراً `/^(production|staging)$/`.
  - `status`: حصراً `/^(active|archived)$/`.
- **الـ Response في حالة النجاح (201 Created):**
```json
{
  "id": 7,
  "name": "منظومة الضرائب والجمارك الموحدة",
  "description": "بوابة التحصيل والربط الجمركي الإلكتروني",
  "environment": "staging",
  "status": "active",
  "createdAt": "2026-09-27 14:00:00",
  "updatedAt": "2026-09-27 14:00:00",
  "stats": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "pending": 0,
    "successRate": 0
  },
  "recentTestCases": []
}
```

---

#### [GET] 5.3 تفاصيل مشروع معين (Get Project by ID)
- **الرابط:** `{{baseUrl}}/projects/1`
- **الـ Response المتوقع (200 OK):** يُرجع بيانات المشروع + إحصائياته الحية + آخر 5 حالات اختبار مسجلة له مع أسماء الفاحصين.

---

#### [PATCH] 5.4 تعديل مشروع (Update Project)
- **الرابط:** `{{baseUrl}}/projects/1`
- **الـ Request Body:**
```json
{
  "environment": "production",
  "status": "active"
}
```
- **الـ Response في حالة النجاح (200 OK):** بيانات المشروع بعد التعديل.

---

#### [DELETE] 5.5 حذف مشروع (Delete Project)
- **الرابط:** `{{baseUrl}}/projects/7`
- **الـ Response في حالة النجاح (200 OK):**
```json
{
  "message": "Project #7 deleted successfully"
}
```

---

## 6. سيناريو اختبار تطبيقي متكامل

للتأكد من فهم المنظومة عملياً، جرب هذا الترتيب البسيط في Postman:

1. **الخطوة الأولى:** افتح طلب **`1.1 Login`** واضغط **Send**.
   - سترى الاستجابة برمز `200 OK` والـ Token تم حفظه تلقائياً.
2. **الخطوة الثانية (اختبار صلاحية الـ Admin):**
   - افتح طلب **`5.2 Create User - Admin Only`**.
   - أرسل بيانات مستخدم جديد ودوره `"user"`.
   - ستستلم `201 Created`، وتتأكد أن الـ Admin أضاف الحساب بنجاح.
3. **الخطوة الثالثة (اختبار الـ Security والرفض):**
   - جرب تسجيل الدخول بحساب المستخدم العادي (`sara@mcit.gov.eg`).
   - حاول إرسال طلب لإضافة مستخدم في `5.2 Create User`.
   - ستستلم فوراً `403 Forbidden: غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط`.
4. **الخطوة الرابعة (إضافة اختبار):**
   - ارجع لحساب الـ Admin، وافتح **`3.2 Create Test Case`** وسجل اختباراً جديداً بحالة `"passed"`.
5. **الخطوة الخامسة (متابعة المؤشرات الحية):**
   - افتح **`2.1 Overall KPI Stats`** واضغط **Send**.
   - ستشاهد إجمالي الاختبارات ونسبة النجاح (`passRate`) تم تحديثها بدقة فوراً!
