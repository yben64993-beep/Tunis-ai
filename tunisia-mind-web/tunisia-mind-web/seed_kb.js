const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function seed() {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.error("serviceAccountKey.json not found. Cannot seed.");
    process.exit(1);
  }

  const db = admin.firestore();
  const kb = [
    {
      question: "ما هو العقل التونسي؟",
      answer: "العقل التونسي هو مساعد ذكاء اصطناعي متطور مصمم للإجابة على تساؤلاتكم، توليد الصور، وتحليل الملفات باحترافية وسرعة.",
      category: "about"
    },
    {
      question: "كيف يمكنني استخدام الموقع؟",
      answer: "يمكنك البدء مباشرة بكتابة سؤالك في صندوق الدردشة. يمكنك أيضاً رفع صور لتحليلها أو طلب إنشاء صور فنية جديدة.",
      category: "usage"
    },
    {
      question: "هل استخدام الموقع مجاني؟",
      answer: "نعم، الموقع يوفر خدمات أساسية مجانية للمستخدمين مع حدود معقولة للاستخدام لضمان أفضل تجربة للجميع.",
      category: "billing"
    },
    {
      question: "من هو مطور العقل التونسي؟",
      answer: "تم تطوير هذا المشروع من قبل فريق تقني يسعى لتعزيز المحتوى العربي والذكاء الاصطناعي في تونس والعالم العربي.",
      category: "team"
    },
    {
      question: "ما هي اللغات التي يدعمها الذكاء الاصطناعي؟",
      answer: "يدعم العقل التونسي العربية (بما في ذلك الدارجة التونسية)، الإنجليزية، والفرنسية بطلاقة تامة.",
      category: "languages"
    }
  ];

  console.log("Seeding Knowledge Base...");
  for (const item of kb) {
    await db.collection('knowledge_base').add({
      ...item,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Added: ${item.question}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed();
