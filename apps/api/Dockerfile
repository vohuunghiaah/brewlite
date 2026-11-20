# Sử dụng Node.js 24
FROM node:24-alpine

# Thư mục làm việc trong container
WORKDIR /app

# Sao chép file quản lý thư viện
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Sao chép mã nguồn
COPY . .

# Mở cổng Backend
EXPOSE 3001

# Khởi chạy NestJS ở chế độ development
CMD ["npm", "run", "start:dev"]
