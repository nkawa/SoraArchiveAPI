
Sora Video Archive management API.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.


for TEST

# 期待: JSONでファイル一覧
curl -s http://localhost:3000/api/recordings/16N01ATAHS32ZEBG4PVNRRJMS8/files | jq

# 異常系: 不正ID（400）
curl -s http://localhost:3000/api/recordings/../../etc/passwd/files | jq

# 異常系: 存在しないID（404）
curl -s http://localhost:3000/api/recordings/DOES_NOT_EXIST/files | jq
