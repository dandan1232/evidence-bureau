# 物证档案局（Evidence Bureau）

一款以 3D 物证观察、线索归档和证据链推理为核心的浏览器调查游戏。第一宗案件为《消失的住客》。

## 开发环境

- Node.js 22.12 或更高版本
- pnpm 9.15.9

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://localhost:5173`。

## 质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

产品需求见 `docs/requirements/PRODUCT_REQUIREMENTS.md`，系统设计见 `docs/architecture/SYSTEM_ARCHITECTURE.md`。
