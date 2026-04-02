// نقطة إطلاق بديلة لـ Render إذا لم يقم المستخدم بتعديل "Root Directory"
// هذا الملف يقوم بتوجيه التشغيل إلى المجلد الصحيح (tunisia-mind-web)

const path = require('path');

// تغيير مسار العمل إلى المجلد الفرعي
process.chdir(path.join(__dirname, 'tunisia-mind-web'));

// تشغيل الخادم الأساسي
require('./tunisia-mind-web/server.js');
