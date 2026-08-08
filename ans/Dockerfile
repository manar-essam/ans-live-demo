# --- المرحلة الأولى: بناء التطبيق (Build Stage) ---
FROM node:18-alpine AS builder

WORKDIR /app

# نسخ ملفات الإعداد والاعتماديات
COPY package*.json ./
RUN npm install

# نسخ الكود وبناء المشروع لتوليد مجلد dist
COPY . .
RUN npm run build

# --- المرحلة الثانية: بيئة التشغيل والخادم الخفيف (Production Stage) ---
FROM node:18-alpine

WORKDIR /app

# نسخ ملفات package.json 
COPY package*.json ./

# الحل السحري: نسخ الـ node_modules الجاهزة والمبنية من المرحلة الأولى مباشرة
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# إعدادات الأمان والمستخدم غير الجذري (Non-root user)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# المنفذ الخاص بالسجل
EXPOSE 8080

# تشغيل السجل
CMD ["node", "dist/index.js"]