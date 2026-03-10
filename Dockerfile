# 1. 빌드 및 런타임 환경 설정
FROM node:20-alpine

# 2. tree-sitter 네이티브 모듈 빌드를 위한 필수 패키지 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc6-compat

# 3. 작업 디렉토리 생성
WORKDIR /app

# 4. 의존성 파일 복사 및 설치
COPY package.json package-lock.json* ./
RUN npm install

# 5. 소스 코드 복사
COPY . .

# 6. 분석 대상 코드가 마운트될 디렉토리 생성
RUN mkdir -p /code

# 7. 포트 설정 (Express 서버용)
EXPOSE 3001

# 8. 환경 변수 기본값 설정
ENV BACKEND_URL=http://codevi-backend:13000/ast-data
ENV PORT=3001

# 9. 실행
CMD ["node", "index_treesitter.js"]