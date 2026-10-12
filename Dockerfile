# مرحلة التشغيل المتكاملة عبر Node.js لتشغيل الواجهة وقاعدة بيانات libSQL المحلية
FROM node:20-slim

WORKDIR /app

# نسخ ملفات الحزم والاعتماديات
COPY package*.json ./
RUN npm install

# نسخ ملفات المشروع بالكامل (بما فيها قاعدة بيانات wecare.db)
COPY . .

# بناء الواجهة الأمامية لتوليد مجلد الإنتاج dist
RUN npm run build

# إعداد متغيرات البيئة
ENV NODE_ENV=production
ENV PORT=3000

# فتح المنفذ الافتراضي لـ Easypanel
EXPOSE 3000

# تشغيل خادم Node.js
CMD ["node", "server.js"]