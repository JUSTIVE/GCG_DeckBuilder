FROM oven/bun:1

WORKDIR /app

# data/ 디렉토리 (backend가 읽는 카드 데이터)
COPY data/3.processed.json data/3.processed.json

# backend
COPY backend/ backend/

# symlink 대신 실제 파일 복사
COPY frontend/schema.graphql backend/schema/schema.graphql

WORKDIR /app/backend
RUN bun install --frozen-lockfile

EXPOSE 8080

CMD ["bun", "run", "start"]
