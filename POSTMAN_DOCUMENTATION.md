# 📮 الدليل المرجعي الكامل والشامل لاختبار الـ API عبر Postman
### نظام إدارة اختبارات الجودة (MCIT QA Test Suite Manager)

---

## 📌 الفهرس العام
1. [بيانات الاتصال المباشرة وروابط السيرفر](#1-بيانات-الاتصال-المباشرة-وروابط-السيرفر)
2. [نظام الأدوار والصلاحيات (Admin vs User)](#2-نظام-الأدوار-والصلاحيات-admin-vs-user)
3. [الاستيراد الفوري في Postman بملف الـ Collection](#3-الاستيراد-الفوري-في-postman)
4. [التفصيل الكامل لكل Endpoint بالرابط الكامل (Full URL)](#4-التفصيل-الكامل-لكل-endpoint)
   - [4.1 قسم المصادقة (Auth)](#41-المصادقة-auth)
   - [4.2 قسم المستخدمين وإضافة الحسابات (Users - Admin Only)](#42-المستخدمين-والفاحصين-users)
   - [4.3 قسم لوحة التحكم والإحصائيات (Dashboard Analytics)](#43-لوحة-التحكم-والإحصائيات-dashboard)
   - [4.4 قسم حالات الاختبار (Test Cases CRUD)](#44-حالات-الاختبار-test-cases)
   - [4.5 قسم إدارة المشاريع (Projects CRUD)](#45-إدارة-المشاريع-projects)
5. [سيناريو اختبار تطبيقي متكامل خطوة بخطوة في Postman](#5-سيناريو-اختبار-تطبيقي-متكامل)

---

## 1. بيانات الاتصال المباشرة وروابط السيرفر

جميع الروابط المذكورة أدناه هي روابط كاملة ومباشرة (Full URLs) جاهزة للنسخ واللصق فوراً داخل شريط الـ URL في Postman:

- **رابط السيرفر السحابي الأساسي (Live Production URL):**
  `https://mcit-test-case-backend.onrender.com/api`
- **رابط السيرفر المحلي (لو بتشغله على جهازك):**
  `http://localhost:3001/api`
- **واجهة Swagger التفاعلية للتجربة من المتصفح:**
  `https://mcit-test-case-backend.onrender.com/api/docs`

---

## 2. نظام الأدوار والصلاحيات (Admin vs User)

النظام يحتوي على مستويين من الأدوار (`role`):
1. **المدير (`admin`):**
   - الحساب الافتراضي الرئيسي: `h.ali@mcit.gov.eg` / `password123`.
   - يملك جميع الصلاحيات في النظام.
   - **الصلاحية الحصرية:** هو **الوحيد** المصرح له بإضافة مستخدمين وفاحصين جدد عبر الرابط الكامل:
     `https://mcit-test-case-backend.onrender.com/api/users`
     وتحديد دورهم سواء كان `admin` أو `user`.
2. **المستخدم العادي / الفاحص (`user`):**
   - حسابات الفاحصين (مثل: `sara@mcit.gov.eg` و `ahmed@mcit.gov.eg`).
   - يمكنه إضافة وتعديل حالات الاختبار والمشاريع ومتابعة الإحصائيات.
   - **ممنوع تماماً من إضافة مستخدمين جدد**؛ إذا حاول إرسال طلب لإضافة مستخدم جديد سيرفضه السيرفر فوراً برمز `403 Forbidden`.

---

## 3. الاستيراد الفوري في Postman

إذا أردت تحميل جميع هذه الطلبات جاهزة مسبقاً في Postman دون كتابتها يدوياً:
1. افتح برنامج **Postman**.
2. اضغط على زر **Import** في أعلى يسار الشاشة.
3. اختر الملف المرفق في مجلد الباك إند:
   `d:\MCIT\test_case\backend\mcit_qa_suite.postman_collection.json`
4. ستظهر لك مجموعة كاملة تحتوي على كل الروابط الكاملة والـ Body جاهزة!

---

## 4. التفصيل الكامل لكل Endpoint

---

### 4.1 المصادقة (Auth)

---

#### [POST] تسجيل الدخول (Login)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/login
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Content-Type`: `application/json`
- **الـ Body (اختر raw ثم اختر نوعه JSON):**
```json
{
  "email": "h.ali@mcit.gov.eg",
  "password": "password123"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `email`: صيغة بريد إلكتروني قياسية تطابق `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`.
  - `password`: كلمة مرور بين 6 و 50 حرفاً تطابق `/^.{6,50}$/`.
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoia2FyaW1AbWNpdC5nb3YuZWciLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3OTA1MTY4MDgsImV4cCI6MTc5MTExMjE2MDh9.vii-2H5fHOZF6qYw7xtCt3v7AKzdsjN4zQWNgT71hXE",
  "user": {
    "id": 1,
    "name": "Hassan Ali",
    "email": "h.ali@mcit.gov.eg",
    "role": "admin"
  }
}
```
> ⏱️ **صلاحية الـ Token:** صالحة لمدة **7 أيام كاملة (604,800 ثانية)**. انسخ قيمة `access_token` وضعها في أي طلب قادم بالـ Headers.

- **شكل الـ Response عند إرسال بريد أو باسورد لا يطابق الـ Regex (400 Bad Request):**
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

- **شكل الـ Response عند إدخال بيانات غير صحيحة (401 Unauthorized):**
```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

#### [GET] بيانات المستخدم الحالي (Get Me)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/me
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "id": 1,
  "name": "Hassan Ali",
  "email": "h.ali@mcit.gov.eg",
  "role": "admin",
  "createdAt": "2026-09-27 12:51:07"
}
```

---

#### [POST] تغيير كلمة المرور (Change Password)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/change-password
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_المستخدم>`
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "oldPassword": "password123",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "تم تغيير كلمة المرور بنجاح"
}
```
- **شكل الـ Response إذا كانت كلمة المرور الحالية خاطئة (400 Bad Request):**
```json
{
  "message": "كلمة المرور الحالية غير صحيحة",
  "error": "Bad Request",
  "statusCode": 400
}
```
- **شكل الـ Response إذا كانت كلمة المرور الجديدة وتأكيدها غير متطابقين (400 Bad Request):**
```json
{
  "message": "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### [POST] طلب كود استعادة كلمة المرور (Forgot Password - Send OTP)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/forgot-password
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "email": "h.ali@mcit.gov.eg"
}
```
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "تم إنشاء كود استعادة كلمة المرور وإرساله بنجاح إلى البريد الإلكتروني الخاص بـ Hassan Ali",
  "email": "h.ali@mcit.gov.eg",
  "code": "862200",
  "expiresIn": "15 دقيقة"
}
```
> 💡 **ملاحظة تيسيرية للاختبار:** يتم إرجاع قيمة الـ `code` في استجابة الـ JSON وطباعتها في الـ Console حتى تتمكن من تجربتها فوراً في Postman والواجهة دون الحاجة لإعداد خادم بريد SMTP خارجي.

- **شكل الـ Response إذا كان الإيميل غير مسجل (404 Not Found):**
```json
{
  "message": "البريد الإلكتروني غير مسجل في النظام",
  "error": "Not Found",
  "statusCode": 404
}
```

---

#### [POST] التحقق من صحة كود الاستعادة (Verify Reset Code)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/verify-reset-code
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "email": "h.ali@mcit.gov.eg",
  "code": "862200"
}
```
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "valid": true,
  "message": "كود التحقق صحيح. يمكنك الآن تعيين كلمة المرور وتأكيدها"
}
```
- **شكل الـ Response إذا كان الكود خاطئاً أو منتهياً (400 Bad Request):**
```json
{
  "message": "كود التحقق غير صحيح أو تم استخدامه بالفعل",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### [POST] تعيين كلمة المرور الجديدة وتأكيدها (Reset Password)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/reset-password
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "email": "h.ali@mcit.gov.eg",
  "code": "862200",
  "newPassword": "password123",
  "confirmPassword": "password123"
}
```
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة"
}
```
- **شكل الـ Response إذا كانت كلمة المرور وتأكيدها غير متطابقين (400 Bad Request):**
```json
{
  "message": "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

#### [POST] تسجيل الخروج (Logout)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/auth/logout
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 4.2 المستخدمين وإدارة المشاريع المسندة (Users & Project Assignments)

---

#### [POST] إضافة مستخدم جديد وتحديد دوره (Create User - للـ Admin فقط)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_حساب_الـ_Admin>`
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "name": "سعيد كمال",
  "email": "saeed@mcit.gov.eg",
  "password": "password123",
  "role": "user"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `name`: أحرف صحيحة بطول 2 إلى 50 حرفاً `/^[\p{L}\p{N}\s\-_.,()'"/]{2,50}$/u`.
  - `email`: بريد إلكتروني رسمي صحيح.
  - `password`: بين 6 و 50 حرفاً.
  - `role`: اختياري، يقبل حصراً إما **`admin`** أو **`user`** بـ Regex صارم: `/^(admin|user)$/` (القيمة الافتراضية هي `user`).
- **شكل الـ Response عند النجاح (201 Created):**
```json
{
  "id": 2,
  "name": "سعيد كمال",
  "email": "saeed@mcit.gov.eg",
  "role": "user",
  "createdAt": "2026-09-27 17:20:00",
  "_count": {
    "testCases": 0,
    "assignedProjects": 0
  },
  "assignedProjects": []
}
```
- **شكل الـ Response إذا حاول مستخدم غير Admin استدعاء الرابط (403 Forbidden):**
```json
{
  "message": "غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

#### [GET] عرض جميع المستخدمين والمشاريع المسندة إليهم (List Users - للـ Admin فقط)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_حساب_الـ_Admin>`
- **الصلاحية:** مخصص للـ **Admin فقط**. لو حاول مستخدم عادي طلبه سيرجع فوراً `403 Forbidden`.
- **شكل الـ Response عند النجاح (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Hassan Ali",
    "email": "h.ali@mcit.gov.eg",
    "role": "admin",
    "createdAt": "2026-09-27 12:51:07",
    "_count": {
      "testCases": 0,
      "assignedProjects": 0
    },
    "assignedProjects": []
  },
  {
    "id": 2,
    "name": "سعيد كمال",
    "email": "saeed@mcit.gov.eg",
    "role": "user",
    "createdAt": "2026-09-27 17:20:00",
    "_count": {
      "testCases": 0,
      "assignedProjects": 1
    },
    "assignedProjects": [
      {
        "id": 1,
        "name": "منظومة التحول الرقمي الوطنية",
        "description": "مشروع ميكنة وتطوير الخدمات الحكومية الرقمية",
        "environment": "staging",
        "status": "active",
        "assignedAt": "2026-09-27 17:25:00"
      }
    ]
  }
]
```
- **شكل الـ Response إذا حاول مستخدم عادي طلبه (403 Forbidden):**
```json
{
  "message": "غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

#### [POST] إسناد مشروع لمستخدم لاختباره (Assign Project to User - للـ Admin فقط)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users/2/assign-project
  ```
  *(استبدل رقم `2` برقم الـ ID الخاص بالمستخدم المراد إسناد المشروع له)*
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_حساب_الـ_Admin>`
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "projectId": 1
}
```
- **شكل الـ Response عند النجاح (201 Created):**
```json
{
  "message": "تم إسناد مشروع \"منظومة التحول الرقمي الوطنية\" للمستخدم \"سعيد كمال\" بنجاح للبدء في اختباره",
  "assignment": {
    "userId": 2,
    "userName": "سعيد كمال",
    "projectId": 1,
    "projectName": "منظومة التحول الرقمي الوطنية",
    "assignedAt": "2026-09-27T17:25:00.000Z"
  }
}
```
- **شكل الـ Response إذا حاول مستخدم عادي إسناد مشروع (403 Forbidden):**
```json
{
  "message": "غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط",
  "error": "Forbidden",
  "statusCode": 403
}
```
- **شكل الـ Response إذا كان المشروع مسنداً له بالفعل مسبقاً (409 Conflict):**
```json
{
  "message": "المشروع \"منظومة التحول الرقمي الوطنية\" مسند بالفعل للمستخدم \"سعيد كمال\"",
  "error": "Conflict",
  "statusCode": 409
}
```

---

#### [GET] المشاريع المسندة للمستخدم الحالي لاختبارها (My Assigned Projects)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users/my-assigned-projects
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_المستخدم_سواء_user_أو_admin>`
- **الوصف:** هذا الرابط يتيح لأي مستخدم تسجيل دخوله واستدعائه ليرى فوراً قائمة بجميع المشاريع المكلف باختبارها، مع إحصائيات حية لعدد حالات الاختبار ومعدل النجاح لكل مشروع.
- **شكل الـ Response عند النجاح (200 OK):**
```json
[
  {
    "id": 1,
    "name": "منظومة التحول الرقمي الوطنية",
    "description": "مشروع ميكنة وتطوير الخدمات الحكومية الرقمية",
    "environment": "staging",
    "status": "active",
    "assignedAt": "2026-09-27 17:25:00",
    "stats": {
      "total": 5,
      "passed": 4,
      "failed": 1,
      "pending": 0,
      "successRate": 80
    }
  }
]
```

---

#### [DELETE] إلغاء إسناد مشروع من مستخدم (Unassign Project - للـ Admin فقط)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users/2/assign-project/1
  ```
  *(استبدل `2` برقم المستخدم و `1` برقم المشروع)*
- **نوع الطلب (Method):** `DELETE`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_حساب_الـ_Admin>`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "تم إلغاء إسناد المشروع #1 من المستخدم #2 بنجاح"
}
```

---

#### [GET] جلب بيانات مستخدم محدد بالـ ID (Get User by ID - للـ Admin فقط)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/users/2
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <توكن_حساب_الـ_Admin>`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "id": 2,
  "name": "سعيد كمال",
  "email": "saeed@mcit.gov.eg",
  "role": "user",
  "createdAt": "2026-09-27 17:20:00",
  "_count": {
    "testCases": 0,
    "assignedProjects": 1
  },
  "assignedProjects": [
    {
      "id": 1,
      "name": "منظومة التحول الرقمي الوطنية",
      "description": "مشروع ميكنة وتطوير الخدمات الحكومية الرقمية",
      "environment": "staging",
      "status": "active",
      "assignedAt": "2026-09-27 17:25:00"
    }
  ]
}
```

---

### 4.3 لوحة التحكم والإحصائيات (Dashboard)

---

#### [GET] الإحصائيات العامة لبطاقات المؤشرات (KPI Stats)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/dashboard/stats
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
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
- **شرح الحقول:**
  - `total`: إجمالي عدد حالات الاختبار في النظام.
  - `passed`: عدد الحالات الناجحة.
  - `failed`: عدد الحالات الفاشلة.
  - `pending`: عدد الحالات المعلقة.
  - `passRate`: نسبة النجاح المئوية الحية المحسوبة تلقائياً (`passed / total * 100`).
  - `totalProjects`: إجمالي عدد المشاريع المسجلة.

---

#### [GET] بيانات الرسم البياني التراكمي اليومي (Execution Trend Chart)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/dashboard/chart?days=14
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
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

#### [GET] توزيع خطورة العيوب (Defect Severity Breakdown)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/dashboard/severity
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
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

### 4.4 حالات الاختبار (Test Cases)

---

#### [GET] قائمة حالات الاختبار مع فلاتر وبحث وترقيم (List Test Cases)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/test-cases?page=1&limit=10&status=passed&priority=critical&search=SSO
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **الـ Query Parameters (اختيارية):**
  - `page`: رقم الصفحة (`1`).
  - `limit`: عدد الحالات بالصفحة (`10`).
  - `status`: الفلترة بالحالة (`passed` أو `failed` أو `pending`).
  - `priority`: الفلترة بالأولوية (`critical` أو `high` أو `medium` أو `low`).
  - `module`: تصفية باسم الوحدة (مثل `Authentication`).
  - `projectId`: تصفية برقم المشروع (مثل `1`).
  - `search`: بحث نصي فوري في الـ (testId, module, scenario).
- **شكل الـ Response عند النجاح (200 OK):**
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
        "name": "Hassan Ali",
        "email": "h.ali@mcit.gov.eg"
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

#### [POST] إضافة حالة اختبار جديدة (Create Test Case)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/test-cases
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "testId": "TC-8515",
  "module": "Authentication",
  "pageName": "Forgot Password",
  "scenario": "Verify password reset OTP delivery on registered mobile",
  "preConditions": "User has an active account",
  "steps": [
    "Navigate to forgot password screen",
    "Enter registered mobile number",
    "Click send OTP",
    "Verify OTP code received within 30 seconds"
  ],
  "expectedResult": "OTP received and user redirected to enter new password",
  "actualResult": "OTP received in 4 seconds",
  "priority": "high",
  "status": "passed",
  "notes": "Tested via Postman API collection",
  "executedAt": "2026-09-27T14:30:00.000Z",
  "testerId": 1,
  "projectId": 1
}
```
- **قواعد الـ Regex للمدخلات:**
  - `testId`: اختياري (إن كُتب يجب أن يطابق `/^TC-\d{4,}$/`).
  - `module`: أحرف مقبولة بطول 2 إلى 50 حرفاً `/^[\p{L}\p{N}\s\-_.,()&/]{2,50}$/u`.
  - `priority`: حصراً `/^(critical|high|medium|low)$/`.
  - `status`: حصراً `/^(passed|failed|pending)$/`.
  - `executedAt`: صيغة ISO 8601 القياسية `/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/`.
- **شكل الـ Response عند النجاح (201 Created):**
```json
{
  "id": 11,
  "testId": "TC-8515",
  "module": "Authentication",
  "pageName": "Forgot Password",
  "scenario": "Verify password reset OTP delivery on registered mobile",
  "preConditions": "User has an active account",
  "steps": [
    "Navigate to forgot password screen",
    "Enter registered mobile number",
    "Click send OTP",
    "Verify OTP code received within 30 seconds"
  ],
  "expectedResult": "OTP received and user redirected to enter new password",
  "actualResult": "OTP received in 4 seconds",
  "priority": "high",
  "status": "passed",
  "notes": "Tested via Postman API collection",
  "executedAt": "2026-09-27T14:30:00.000Z",
  "testerId": 1,
  "projectId": 1,
  "createdAt": "2026-09-27 14:10:00",
  "updatedAt": "2026-09-27 14:10:00",
  "tester": {
    "id": 1,
    "name": "Hassan Ali",
    "email": "h.ali@mcit.gov.eg"
  },
  "project": {
    "id": 1,
    "name": "البوابة الرقمية المصرية"
  }
}
```

---

#### [GET] جلب تفاصيل حالة اختبار محددة بالـ ID
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/test-cases/1
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):** كائن الحالة كاملاً مع الخطوات `steps` ومعلومات الفاحص والمشروع.

---

#### [PATCH] تعديل جزئي لحالة اختبار (Update Test Case)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/test-cases/1
  ```
- **نوع الطلب (Method):** `PATCH`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
  - `Content-Type`: `application/json`
- **الـ Body (أرسل الحقول المراد تغييرها فقط):**
```json
{
  "status": "failed",
  "actualResult": "SMS gateway timed out during peak load test",
  "notes": "Issue reported to infrastructure operations"
}
```
- **شكل الـ Response عند النجاح (200 OK):** كائن الحالة كاملاً بالبيانات المحدثة مع تحديث تاريخ `updatedAt`.

---

#### [DELETE] حذف حالة اختبار (Delete Test Case)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/test-cases/11
  ```
- **نوع الطلب (Method):** `DELETE`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "Test case #11 deleted successfully"
}
```

---

### 4.5 إدارة المشاريع (Projects)

---

#### [GET] قائمة المشاريع مع نسب النجاح الحية (List Projects)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/projects?environment=production&status=active
  ```
- **نوع الطلب (Method):** `GET`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
- **شكل الـ Response عند النجاح (200 OK):**
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
  },
  {
    "id": 2,
    "name": "منظومة الرقابة على الاتصالات",
    "description": "Telecom quality monitoring and compliance",
    "environment": "production",
    "status": "active",
    "createdAt": "2026-09-27 12:51:07",
    "updatedAt": "2026-09-27 12:51:07",
    "stats": {
      "total": 1,
      "passed": 0,
      "failed": 1,
      "pending": 0,
      "successRate": 0
    }
  }
]
```

---

#### [POST] إنشاء مشروع جديد (Create Project)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/projects
  ```
- **نوع الطلب (Method):** `POST`
- **الـ Headers:**
  - `Authorization`: `Bearer <الصق_التوكن_هنا>`
  - `Content-Type`: `application/json`
- **الـ Body (raw / JSON):**
```json
{
  "name": "منظومة التحول الرقمي وميكنة التراخيص",
  "description": "بوابة ميكنة التراخيص الحكومية والمهنية الموحدة",
  "environment": "staging",
  "status": "active"
}
```
- **قواعد الـ Regex للمدخلات:**
  - `name`: أحرف مقبولة بطول 2 إلى 100 حرف `/^[\p{L}\p{N}\s\-_.,()&/]{2,100}$/u`.
  - `environment`: حصراً إما `production` أو `staging`.
  - `status`: حصراً إما `active` أو `archived`.
- **شكل الـ Response عند النجاح (201 Created):**
```json
{
  "id": 7,
  "name": "منظومة التحول الرقمي وميكنة التراخيص",
  "description": "بوابة ميكنة التراخيص الحكومية والمهنية الموحدة",
  "environment": "staging",
  "status": "active",
  "createdAt": "2026-09-27 14:15:00",
  "updatedAt": "2026-09-27 14:15:00",
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

#### [GET] تفاصيل مشروع محدد بالـ ID
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/projects/1
  ```
- **نوع الطلب (Method):** `GET`
- **شكل الـ Response عند النجاح (200 OK):** تفاصيل المشروع مع الإحصائيات الحية وآخر 5 حالات اختبار مسجلة له مع أسماء الفاحصين.

---

#### [PATCH] تعديل بيانات مشروع (Update Project)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/projects/1
  ```
- **نوع الطلب (Method):** `PATCH`
- **الـ Body (raw / JSON):**
```json
{
  "environment": "production",
  "status": "active"
}
```
- **شكل الـ Response عند النجاح (200 OK):** بيانات المشروع بعد التعديل وتحديث تاريخ `updatedAt`.

---

#### [DELETE] حذف مشروع (Delete Project)
- **الرابط الكامل في Postman:**
  ```text
  https://mcit-test-case-backend.onrender.com/api/projects/7
  ```
- **نوع الطلب (Method):** `DELETE`
- **شكل الـ Response عند النجاح (200 OK):**
```json
{
  "message": "Project #7 deleted successfully"
}
```

---

## 5. سيناريو اختبار تطبيقي متكامل

جرب هذه الخطوات الخمس بالترتيب داخل Postman:

1. **تسجيل الدخول (Login):**
   - الرابط: `POST https://mcit-test-case-backend.onrender.com/api/auth/login`
   - البودي: `{"email": "h.ali@mcit.gov.eg", "password": "password123"}`
   - سيعود لك `access_token` صالح لمدة **7 أيام كاملة**.
2. **إنشاء حساب فاحص جديد (Admin Only):**
   - الرابط: `POST https://mcit-test-case-backend.onrender.com/api/users`
   - الهيدر: `Authorization: Bearer <التوكن>`
   - البودي: `{"name": "محمود أحمد", "email": "mahmoud@mcit.gov.eg", "password": "password123", "role": "user"}`
   - سيعود لك الحساب المنشأ بالدور `user`.
3. **التأكد من أمان الصلاحيات (Role Security Test):**
   - سجل دخول بحساب سارة: `sara@mcit.gov.eg` / `password123` (دورها `user`).
   - حاول إرسال طلب إضافة مستخدم على `POST /api/users`.
   - ستستلم فوراً الرد الأمني: `403 Forbidden: غير مصرح لك. هذه العملية مخصصة لمدير النظام (admin) فقط`.
4. **إضافة حالة اختبار جديدة:**
   - الرابط: `POST https://mcit-test-case-backend.onrender.com/api/test-cases`
   - سجل حالة بحالة `"passed"`.
5. **مراجعة المؤشرات المحدثة فوراً:**
   - الرابط: `GET https://mcit-test-case-backend.onrender.com/api/dashboard/stats`
   - ستلاحظ ارتفاع إجمالي الاختبارات والناجحة ومعدل النجاح فوراً!
