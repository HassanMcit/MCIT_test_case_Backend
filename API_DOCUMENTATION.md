# 📖 دليل التوثيق الشامل للـ REST API (QA Test Suite Manager)

دليل مطوري الواجهة الأمامية (Frontend Developer Guide) لربط واستدعاء جميع الـ Endpoints في النظام.

---

## 📌 معلومات عامة وإعدادات الاتصال

- **Base URL:** `http://localhost:3001`
- **Prefix:** `/api`
- **Swagger Interactive Docs:** `http://localhost:3001/api/docs`
- **Format:** `application/json` (UTF-8 كامل يدعم العربية)
- **CORS:** مفعل ومسموح لـ `http://localhost:3000`

### نمط المصادقة (Authentication Header):
جميع الـ Endpoints (ما عدا تسجيل الدخول `/api/auth/login`) تتطلب إرسال الـ JWT Token في الـ Headers:
```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

---

## 🛡️ قواعد التحقق بواسطة الـ Regex لكافة الـ Endpoints غير الـ GET (POST / PATCH):

| الـ Endpoint | الحقل | نمط الـ Regex | الوصف ورسالة الخطأ |
|---|---|---|---|
| `POST /api/auth/login` | `email` | `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` | بريد إلكتروني صالح (`user@domain.com`) |
| `POST /api/auth/login` | `password` | `/^.{6,50}$/` | كلمة المرور من 6 إلى 50 حرفاً |
| `POST / PATCH /api/projects` | `name` | `/^[\p{L}\p{N}\s\-_.,()&/]{2,100}$/u` | اسم المشروع (أحرف عربية/إنجليزية، أرقام، رموز مسموحة) |
| `POST / PATCH /api/projects` | `environment` | `/^(production\|staging)$/` | البيئة يجب أن تكون إما `production` أو `staging` |
| `POST / PATCH /api/projects` | `status` | `/^(active\|archived)$/` | حالة المشروع إما `active` أو `archived` |
| `POST / PATCH /api/test-cases` | `testId` | `/^TC-\d{4,}$/` | معرّف الاختبار يطابق `TC-XXXX` (مثل `TC-8492`) |
| `POST / PATCH /api/test-cases` | `module` | `/^[\p{L}\p{N}\s\-_.,()&/]{2,50}$/u` | اسم الوحدة البرمجية من 2 إلى 50 حرفاً |
| `POST / PATCH /api/test-cases` | `priority` | `/^(critical\|high\|medium\|low)$/` | الأولوية: `critical` أو `high` أو `medium` أو `low` |
| `POST / PATCH /api/test-cases` | `status` | `/^(passed\|failed\|pending)$/` | الحالة: `passed` أو `failed` أو `pending` |
| `POST / PATCH /api/test-cases` | `executedAt` | `/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/` | تاريخ التنفيذ بصيغة ISO 8601 القياسية |

---

## 1. وحدة المصادقة (Authentication)

### 1.1 تسجيل الدخول (Login)
- **الرابط:** `POST /api/auth/login`
- **الوصول:** عام (Public - لا يحتاج Token)
- **صلاحية الـ Token:** **7 أيام كاملة (7 Days / 604,800 ثانية)**
- **التحقق بواسطة Regex:**
  - `email`: `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` (صيغة البريد الإلكتروني القياسية).
  - `password`: `/^.{6,50}$/` (كلمة المرور بين 6 و 50 حرفاً).
- **الوصف:** التحقق من البريد وكلمة المرور فقط، وإنشاء جلسة JWT صالحة لمدة 7 أيام وإرجاع بيانات المستخدم. لا يتم مسح أي بيانات سابقة.

#### طلب الـ Request (JSON):
```json
{
  "email": "karim@mcit.gov.eg",
  "password": "password123"
}
```

#### استجابة النجاح (200 OK):
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

#### استجابة الفشل (401 Unauthorized):
```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

#### مثال كود الاستدعاء في الـ Frontend (TypeScript / Fetch):
```typescript
async function login(email: string, password: string) {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) throw new Error('فشل تسجيل الدخول');
  
  const data = await res.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}
```

---

### 1.2 جلب بيانات المستخدم الحالي (Get Me)
- **الرابط:** `GET /api/auth/me`
- **الوصول:** محمي (Bearer Token)
- **الوصف:** جلب بيانات حساب المستخدم صاحب التوكن الحالي للتأكد من استمرار صلاحية الجلسة.

#### استجابة النجاح (200 OK):
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

### 1.3 تسجيل الخروج (Logout)
- **الرابط:** `POST /api/auth/logout`
- **الوصول:** محمي (Bearer Token)
- **الوصف:** إشعار السيرفر بإنهاء الجلسة (الـ Token Stateless، وعلى الفرونت إزالة التوكن من الـ Storage).

#### استجابة النجاح (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

## 2. لوحة التحكم والتحليلات (Dashboard Analytics)

### 2.1 مؤشرات الأداء الرئيسية (KPI Stats)
- **الرابط:** `GET /api/dashboard/stats`
- **الوصول:** محمي
- **الوصف:** يغذي بطاقات الإحصائيات الخمس العلوية في صفحة الـ Dashboard (إجمالي الاختبارات، الناجحة، الفاشلة، المعلقة، ونسبة النجاح العامة).

#### استجابة النجاح (200 OK):
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
*ملاحظة:* `passRate` محسوب بدقة عشرية واحدة (`passed / total * 100`).

---

### 2.2 بيانات الرسم البياني التراكمي (Execution Trend Chart)
- **الرابط:** `GET /api/dashboard/chart?days=14`
- **الوصول:** محمي
- **الـ Query Params:**
  - `days` *(اختياري)*: عدد الأيام السابقة المطلوب عرضها (الافتراضي 14).
- **الوصف:** يرجع مصفوفة للأيام بالترتيب الزمني مع عدد الحالات الناجحة والفاشلة والمعلقة المنفذة في كل يوم لتغذية الرسم البياني (Stacked Bar Chart).

#### استجابة النجاح (200 OK):
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

### 2.3 توزيع خطورة العيوب (Defect Severity Breakdown)
- **الرابط:** `GET /api/dashboard/severity`
- **الوصول:** محمي
- **الوصف:** يرجع إحصائيات الحالات الفاشلة (Bugs) مقسمة حسب مستوى الأولوية / الخطورة (Critical, High, Medium, Low) مع النسب المئوية.

#### استجابة النجاح (200 OK):
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

## 3. حالات الاختبار (Test Cases)

### 3.1 جلب قائمة حالات الاختبار (List Test Cases)
- **الرابط:** `GET /api/test-cases`
- **الوصول:** محمي
- **الـ Query Parameters (فلاتر وبحث وترقيم):**
  - `page`: رقم الصفحة (افتراضي `1`)
  - `limit`: عدد السجلات في الصفحة (افتراضي `10`)
  - `status`: تصفية حسب الحالة (`passed` | `failed` | `pending`)
  - `priority`: تصفية حسب الأولوية (`critical` | `high` | `medium` | `low`)
  - `module`: تصفية باسم الوحدة (مثل `Authentication`, `Payments`)
  - `projectId`: تصفية برقم المشروع (مثل `1`)
  - `search`: بحث نصي فوري في الـ (testId, module, scenario)

#### مثال الرابط مع فلاتر:
`GET /api/test-cases?status=passed&priority=critical&page=1&limit=5`

#### استجابة النجاح (200 OK):
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
    "total": 10,
    "page": 1,
    "limit": 5,
    "totalPages": 2
  }
}
```

---

### 3.2 إضافة حالة اختبار جديدة (Create Test Case)
- **الرابط:** `POST /api/test-cases`
- **الوصول:** محمي
- **الوصف:** إنشاء حالة اختبار جديدة. إذا لم يتم إرسال `testId` سيقوم السيرفر بتوليده تلقائياً بالتسلسل (مثل `TC-8502`). في حال إرساله، يجب أن يطابق الـ Regex: `/^TC-\d{4,}$/`.

#### طلب الـ Request (JSON):
```json
{
  "module": "Authentication",
  "pageName": "Reset Password",
  "scenario": "Verify password reset email with temporary OTP token",
  "preConditions": "User email exists in system",
  "steps": [
    "Navigate to forgot password page",
    "Enter registered email",
    "Check email inbox for reset token",
    "Submit new password"
  ],
  "expectedResult": "Password updated and email confirmation sent",
  "actualResult": "Password updated successfully",
  "priority": "high",
  "status": "passed",
  "notes": "Verified on staging environment",
  "testerId": 1,
  "projectId": 1
}
```

#### استجابة النجاح (201 Created):
ترجع الكائن المُنشأ كاملاً مع رقمه التسلسلي ومعلومات الفاحص والمشروع.

---

### 3.3 جلب حالة اختبار مفردة (Get Single Test Case)
- **الرابط:** `GET /api/test-cases/:id`
- **الوصول:** محمي
- **استجابة النجاح (200 OK):** ترجع كائن الحالة مع مصفوفة الـ `steps` جاهزة ومعلومات الفاحص والمشروع.
- **استجابة الفشل (404 Not Found):** إذا كان الرقم غير موجود.

---

### 3.4 تعديل حالة اختبار (Update Test Case)
- **الرابط:** `PATCH /api/test-cases/:id`
- **الوصول:** محمي
- **الوصف:** تعديل جزئي (تستطيع إرسال الحقول التي تريد تغييرها فقط).

#### مثال لتحديث الحالة والنتيجة الفعلية:
```json
{
  "status": "failed",
  "actualResult": "API returned 504 Gateway Timeout during peak hours"
}
```

#### استجابة النجاح (200 OK):
ترجع الحالة بعد التعديل وتحديث حقل `updatedAt`.

---

### 3.5 حذف حالة اختبار (Delete Test Case)
- **الرابط:** `DELETE /api/test-cases/:id`
- **الوصول:** محمي
- **استجابة النجاح (200 OK):**
```json
{
  "message": "Test case #5 deleted successfully"
}
```

---

## 4. إدارة المشاريع (Projects Management)

### 4.1 جلب جميع المشاريع مع إحصائيات حية (List Projects)
- **الرابط:** `GET /api/projects`
- **الوصول:** محمي
- **الـ Query Params:**
  - `environment` *(اختياري)*: `production` أو `staging`
  - `status` *(اختياري)*: `active` أو `archived`
  - `search` *(اختياري)*: بحث في اسم أو وصف المشروع

#### استجابة النجاح (200 OK):
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

### 4.2 إنشاء مشروع جديد (Create Project)
- **الرابط:** `POST /api/projects`
- **الوصول:** محمي

#### طلب الـ Request (JSON):
```json
{
  "name": "منظومة الضرائب العقارية الإلكترونية",
  "description": "منصة تحصيل ومتابعة الضرائب العقارية للمواطنين",
  "environment": "staging",
  "status": "active"
}
```

#### استجابة النجاح (201 Created):
يرجع كائن المشروع الجديد مع كائن `stats` فارغ وجاهز.

---

### 4.3 جلب تفاصيل مشروع معين (Get Project Details)
- **الرابط:** `GET /api/projects/:id`
- **الوصول:** محمي
- **الوصف:** يرجع بيانات المشروع + الإحصائيات + آخر 5 حالات اختبار مسجلة له مع أسماء الفاحصين.

---

### 4.4 تعديل مشروع (Update Project)
- **الرابط:** `PATCH /api/projects/:id`
- **الوصول:** محمي

#### طلب الـ Request (JSON):
```json
{
  "environment": "production",
  "status": "active"
}
```

---

### 4.5 حذف مشروع (Delete Project)
- **الرابط:** `DELETE /api/projects/:id`
- **الوصول:** محمي
- **استجابة النجاح (200 OK):**
```json
{
  "message": "Project #7 deleted successfully"
}
```

---

## 5. المستخدمين والفاحصين (Users)

### 5.1 قائمة الفاحصين (List Users)
- **الرابط:** `GET /api/users`
- **الوصول:** محمي
- **الوصف:** مخصص لتعبئة القوائم المنسدلة (Dropdowns) عند إضافة أو تعيين حالة اختبار لمختبر معين. (كلمات المرور مستثناة تلقائياً).

#### استجابة النجاح (200 OK):
```json
[
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

### 5.2 جلب مستخدم محدد (Get User By ID)
- **الرابط:** `GET /api/users/:id`
- **الوصول:** محمي
- **الوصف:** يرجع بيانات الفاحص مع عدد الاختبارات المسندة له `_count.testCases`.

---

## 🛠️ دالة موحدة جاهزة للاستخدام في تطبيقك (ApiClient Helper)

يمكنك نسخ هذا الكود واستخدامه مباشرة في مشروع الـ Next.js / React لربط كافة الشاشات:

```typescript
// src/lib/api-client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
```
