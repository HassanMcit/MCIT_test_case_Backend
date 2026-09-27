# QA Test Suite Manager — Backend API (NestJS + Express)

نظام إدارة اختبارات الجودة (Quality Assurance Test Suite Manager) لوزارة الاتصالات وتكنولوجيا المعلومات.

---

## 🚀 كيفية التشغيل (Quick Start)

### 1. المتطلبات:
- Node.js v20+ (تم اختباره وتأكيده على v24.18.0)
- npm

### 2. التثبيت والتشغيل:
```bash
cd backend
npm install
npm run build
npm run start:prod
# أو لوضع التطوير:
npm run start:dev
```

- السيرفر يعمل على: `http://localhost:3001`
- توثيق Swagger التفاعلي: `http://localhost:3001/api/docs`

---

## 🔑 الحسابات الافتراضية (Default Credentials)

تم تهيئة قاعدة البيانات تلقائياً بالبيانات التجريبية:
- **البريد الإلكتروني:** `karim@mcit.gov.eg`
- **كلمة المرور:** `password123`
- **الدور:** `lead`

---

## 📡 قائمة جميع الـ Endpoints في النظام

### 1. المصادقة (Authentication) — `@Controller('auth')`
| Method | Endpoint | الوصول | الوصف |
|---|---|---|---|
| `POST` | `/api/auth/login` | عام (Public) | تسجيل الدخول بالبريد وكلمة المرور والحصول على JWT Token |
| `GET` | `/api/auth/me` | محمي (Bearer Token) | جلب بيانات المستخدم الحالي المسجل |
| `POST` | `/api/auth/logout` | محمي (Bearer Token) | تسجيل الخروج |

### 2. لوحة المؤشرات (Dashboard Analytics) — `@Controller('dashboard')`
| Method | Endpoint | الوصول | الوصف |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | محمي | إحصائيات عامة (الإجمالي، الناجح، الفاشل، المعلق، نسبة النجاح) |
| `GET` | `/api/dashboard/chart?days=14` | محمي | بيانات الرسم البياني التراكمي لآخر N يوم (افتراضياً 14) |
| `GET` | `/api/dashboard/severity` | محمي | توزيع العيوب حسب الأولوية/الخطورة (Critical, High, Medium, Low) |

### 3. حالات الاختبار (Test Cases) — `@Controller('test-cases')`
| Method | Endpoint | الوصول | الوصف |
|---|---|---|---|
| `GET` | `/api/test-cases` | محمي | عرض جميع حالات الاختبار مع فلترة وبحث وترقيم صفحات |
| `POST` | `/api/test-cases` | محمي | إنشاء حالة اختبار جديدة (توليد تلقائي للـ testId مثل `TC-8502`) |
| `GET` | `/api/test-cases/:id` | محمي | جلب تفاصيل حالة اختبار معينة بالـ ID |
| `PATCH` | `/api/test-cases/:id` | محمي | تحديث جزئي لبيانات حالة الاختبار |
| `DELETE` | `/api/test-cases/:id` | محمي | حذف حالة اختبار |

**الفلاتر المدعومة في `GET /api/test-cases`:**
- `page`: رقم الصفحة (افتراضي 1)
- `limit`: عدد العناصر لكل صفحة (افتراضي 10)
- `status`: الفلترة حسب الحالة (`passed`, `failed`, `pending`)
- `priority`: الفلترة حسب الأولوية (`critical`, `high`, `medium`, `low`)
- `module`: البحث باسم الوحدة البرمجية
- `projectId`: الفلترة بمشروع معين
- `search`: بحث نصي شامل في (testId, module, scenario)

### 4. إدارة المشاريع (Projects) — `@Controller('projects')`
| Method | Endpoint | الوصول | الوصف |
|---|---|---|---|
| `GET` | `/api/projects` | محمي | جلب جميع المشاريع مع إحصائيات حية لنسب النجاح لكل مشروع |
| `POST` | `/api/projects` | محمي | إضافة مشروع جديد |
| `GET` | `/api/projects/:id` | محمي | جلب تفاصيل مشروع مع آخر 5 حالات اختبار خاصة به |
| `PATCH` | `/api/projects/:id` | محمي | تعديل بيانات المشروع |
| `DELETE` | `/api/projects/:id` | محمي | حذف مشروع |

### 5. المستخدمين والفاحصين (Users) — `@Controller('users')`
| Method | Endpoint | الوصول | الوصف |
|---|---|---|---|
| `GET` | `/api/users` | محمي | قائمة الفاحصين لتعبئة القوائم المنسدلة في نماذج الاختبار |
| `GET` | `/api/users/:id` | محمي | جلب بيانات فاحص معين وعدد اختباراته |
