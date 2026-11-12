# Sử dụng Node.js LTS
FROM node:22-alpine

# Thư mục làm việc
WORKDIR /app

# Sao chép file cấu hình package
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép mã nguồn
COPY . .

# Mở cổng Next.js
EXPOSE 3000

# Chạy ứng dụng ở chế độ development
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
