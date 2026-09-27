# 📮 دليل استخدام وتوثيق Postman الشامل (MCIT QA Test Suite API)

تم إعداد هذا الدليل وملف الـ Collection المصاحب له لتتمكن من تجربة وفحص جميع الـ Endpoints في برنامج **Postman** بضغطة زر واحدة.

---

## ⚡ خطوة واحدة للاستيراد السريع في Postman (One-Click Import):

1. افتح برنامج **Postman**.
2. اضغط على زر **Import** في أعلى يسار الشاشة.
3. اسحب وأفلت الملف التالي (أو تصفح واختره من جهازك):
   📁 `d:\MCIT\test_case\backend\mcit_qa_suite.postman_collection.json`
4. ستظهر لك مجموعة كاملة اسمها **`MCIT QA Test Suite Manager API`** تحتوي على جميع الطلبات مرتبة في مجلدات ومنسقة مسبقاً!

> 💡 **ميزة أوتوماتيكية مدمجة في الـ Collection:**  
> بمجرد أن ترسل طلب **1.1 Login**، يقوم كود فحص مدمج (Tests Script) بنسخ الـ `access_token` تلقائياً وحفظه في متغير `{{token}}`. وبالتالي **لن تحتاج إلى نسخ ولصق التوكن يدوياً في أي طلب آخر!**

---

## 🌐 المتغيرات العامة (Variables):

| المتغير | القيمة الافتراضية | الوصف |
|---|---|---|
| `{{baseUrl}}` | `https://mcit-test-case-backend.onrender.com/api` | رابط السيرفر السحابي المباشر |
| `{{token}}` | يتم ملؤه أوتوماتيكياً بعد تسجيل الدخول | رمز المصادقة JWT (صالح لمدة 7 أيام) |

---

## 📑 الشرح التفصيلي للطلبات مع شكل الـ Request والـ Response:

---

### 1. وحدة المصادقة (Authentication)

#### [POST] 1.1 تسجيل الدخول (Login)
- **الرابط:** `{{baseUrl}}/auth/login`
- **الـ Headers:** `Content-Type: application/json`
- **الـ Body (raw / JSON):**
```json
{
  "email": "karim@mcit.gov.eg",
  "password": "password123"
}
```
- **شكل الـ Response المتوقع (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Karim Mansour",
    "email": "karim@mcit.gov.eg",
    "role": "lead"
  }
}
```
- **شكل الـ Response في حالة الخطأ (400 Bad Request - عدم مطابقة Regex):**
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

---

#### [GET] 1.2 بيانات المستخدم الحالي (Get Me)
- **الرابط:** `{{baseUrl}}/auth/me`
- **الـ Headers:** `Authorization: Bearer {{token}}`
- **شكل الـ Response المتوقع (200 OK):**
```json
{
  "id": 1,
  "name": "Karim Mansour",
  "email": "karim@mcit.gov.eg",
  "role": "lead",
  "createdAt": "2026-09-27 12:51:07"
}
```

---

### 2. لوحة المؤشرات والتحليلات (Dashboard)

#### [GET] 2.1 الإحصائيات العامة (KPI Stats)
- **الرابط:** `{{baseUrl}}/dashboard/stats`
- **الـ Headers:** `Authorization: Bearer {{token}}`
- **شكل الـ Response المتوقع (200 OK):**
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
  - `total`: إجمالي عدد حالات الاختبار المسجلة في النظام.
  - `passed`: عدد الاختبارات الناجحة.
  - `failed`: عدد الاختبارات التي تم تسجيلها كعيوب/فاشلة.
  - `pending`: عدد الاختبارات قيد التنفيذ أو المعلقة.
  - `passRate`: النسبة المئوية للنجاح المحسوبة تلقائياً (`passed / total * 100`).
  - `totalProjects`: إجمالي عدد المشاريع في المنظومة.

---

#### [GET] 2.2 بيانات الرسم البياني التراكمي (Execution Trend Chart)
- **الرابط:** `{{baseUrl}}/dashboard/chart?days=14`
- **الـ Params:** `days`: 14 (اختياري)
- **الـ Headers:** `Authorization: Bearer {{token}}`
- **شكل الـ Response المتوقع (200 OK):**
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

#### [GET] 2.3 توزيع خطورة العيوب (Defect Severity)
- **الرابط:** `{{baseUrl}}/dashboard/severity`
- **الـ Headers:** `Authorization: Bearer {{token}}`
- **شكل الـ Response المتوقع (200 OK):**
```json
{
  "total": 2,
  "breakdown": [
    {
      "priority": "critical",
      "count": 0,
      "percentage": 0
    },
    {
      "priority": "high",
      "count": 2,
      "percentage": 100
    },
    {
      "priority": "medium",
      "count": 0,
      "percentage": 0
    },
    {
      "priority": "low",
      "count": 0,
      "percentage": 0
    }
  ]
}
```

---

### 3. حالات الاختبار (Test Cases)

#### [GET] 3.1 جلب الحالات مع فلاتر وبحث (List Test Cases)
- **الرابط:** `{{baseUrl}}/test-cases?page=1&limit=5&status=passed`
- **الـ Query Params المتاحة:**
  - `page`: رقم الصفحة (`1`)
  - `limit`: عدد الحالات في الصفحة (`5`)
  - `status`: الفلترة بالحالة (`passed` | `failed` | `pending`)
  - `priority`: الفلترة بالأولوية (`critical` | `high` | `medium` | `low`)
  - `module`: بحث باسم الموديول (`Authentication`, `Payments`)
  - `search`: بحث نصي شامل
- **شكل الـ Response المتوقع (200 OK):**
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
    "total": 6,
    "page": 1,
    "limit": 5,
    "totalPages": 2
  }
}
```

---

#### [POST] 3.2 إضافة حالة اختبار جديدة (Create Test Case)
- **الرابط:** `{{baseUrl}}/test-cases`
- **الـ Headers:**
  - `Authorization: Bearer {{token}}`
  - `Content-Type: application/json`
- **الـ Body (raw / JSON):**
```json
{
  "testId": "TC-8505",
  "module": "Authentication",
  "pageName": "Forgot Password",
  "scenario": "Verify OTP code sent to registered user phone",
  "preConditions": "User phone is verified in system",
  "steps": [
    "Navigate to forgot password",
    "Enter phone number",
    "Verify SMS received",
    "Submit code"
  ],
  "expectedResult": "Password reset screen opens successfully",
  "actualResult": "Screen opened in 1.2s",
  "priority": "high",
  "status": "passed",
  "notes": "Tested via Postman API",
  "executedAt": "2026-09-27T14:30:00.000Z",
  "testerId": 1,
  "projectId": 1
}
```
- **شكل الـ Response المتوقع (201 Created):**
```json
{
  "id": 11,
  "testId": "TC-8505",
  "module": "Authentication",
  "pageName": "Forgot Password",
  "scenario": "Verify OTP code sent to registered user phone",
  "preConditions": "User phone is verified in system",
  "steps": [
    "Navigate to forgot password",
    "Enter phone number",
    "Verify SMS received",
    "Submit code"
  ],
  "expectedResult": "Password reset screen opens successfully",
  "actualResult": "Screen opened in 1.2s",
  "priority": "high",
  "status": "passed",
  "notes": "Tested via Postman API",
  "executedAt": "2026-09-27T14:30:00.000Z",
  "testerId": 1,
  "projectId": 1,
  "createdAt": "2026-09-27 13:45:00",
  "updatedAt": "2026-09-27 13:45:00",
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
```

---

#### [PATCH] 3.3 تعديل جزئي لحالة اختبار (Update Test Case)
- **الرابط:** `{{baseUrl}}/test-cases/1`
- **الـ Body (raw / JSON):**
```json
{
  "status": "failed",
  "actualResult": "Connection timeout during gateway handshake",
  "notes": "Updated from Postman collection"
}
```
- **شكل الـ Response المتوقع (200 OK):**
يرجع الكائن كاملاً بعد التحديث مع تحديث حقل `updatedAt`.

---

#### [DELETE] 3.4 حذف حالة اختبار (Delete Test Case)
- **الرابط:** `{{baseUrl}}/test-cases/11`
- **شكل الـ Response المتوقع (200 OK):**
```json
{
  "message": "Test case #11 deleted successfully"
}
```

---

### 4. إدارة المشاريع (Projects)

#### [GET] 4.1 قائمة المشاريع مع نسب النجاح الحية (List Projects)
- **الرابط:** `{{baseUrl}}/projects`
- **شكل الـ Response المتوقع (200 OK):**
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

#### [POST] 4.2 إنشاء مشروع جديد (Create Project)
- **الرابط:** `{{baseUrl}}/projects`
- **الـ Body (raw / JSON):**
```json
{
  "name": "منظومة الفاتورة الإلكترونية الموحدة",
  "description": "بوابة الفواتير الضريبية الإلكترونية للمؤسسات والشركات",
  "environment": "staging",
  "status": "active"
}
```
- **شكل الـ Response المتوقع (201 Created):**
```json
{
  "id": 7,
  "name": "منظومة الفاتورة الإلكترونية الموحدة",
  "description": "بوابة الفواتير الضريبية الإلكترونية للمؤسسات والشركات",
  "environment": "staging",
  "status": "active",
  "createdAt": "2026-09-27 13:46:00",
  "updatedAt": "2026-09-27 13:46:00",
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

#### [DELETE] 4.3 حذف مشروع (Delete Project)
- **الرابط:** `{{baseUrl}}/projects/7`
- **شكل الـ Response المتوقع (200 OK):**
```json
{
  "message": "Project #7 deleted successfully"
}
```

---

### 5. الفاحصين والمستخدمين (Users)

#### [GET] 5.1 قائمة الفاحصين (List Users)
- **الرابط:** `{{baseUrl}}/users`
- **شكل الـ Response المتوقع (200 OK):**
```json
[
  {
    "id": 3,
    "name": "Ahmed El-Shenawy",
    "email": "ahmed@mcit.gov.eg",
    "role": "tester",
    "createdAt": "2026-09-27 12:51:07"
  },
  {
    "id": 1,
    "name": "Karim Mansour",
    "email": "karim@mcit.gov.eg",
    "role": "lead",
    "createdAt": "2026-09-27 12:51:07"
  },
  {
    "id": 2,
    "name": "Sara Fouad",
    "email": "sara@mcit.gov.eg",
    "role": "tester",
    "createdAt": "2026-09-27 12:51:07"
  }
]
```

---

## 💡 نصائح مهمة أثناء استخدام Postman:
1. **الترتيب الأمثل للتجربة:**
   - ابدأ بطلب **1.1 Login** واضغط Send.
   - ستلاحظ فوراً في تبويب الـ Console أن التوكن تم حفظه تلقائياً.
   - افتح أي طلب بعده واضغط Send فوراً وسيعمل بنجاح بدون أي تعديلات!
2. **تجربة الـ Regex:**
   - جرب إرسال بريد خاطئ مثل `test` في تسجيل الدخول ولاحظ رسالة الخطأ العربية الواضحة بـ `400 Bad Request`.
