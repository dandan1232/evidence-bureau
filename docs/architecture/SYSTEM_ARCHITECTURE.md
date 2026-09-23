# 物证档案局（Evidence Bureau）系统架构文档

> 文档状态：第一版基线
>
> 对应需求：`docs/requirements/PRODUCT_REQUIREMENTS.md`
>
> 架构目标：纯前端静态游戏、数据驱动案件、可复现 3D 调查判定

## 1. 架构结论

第一版采用单仓库、单前端应用、纯静态部署：

```text
React + TypeScript + Vite
        |
        ├── React Three Fiber / Three.js：3D 物证与调查工具
        ├── Zustand：运行时游戏状态
        ├── Zod：案件 JSON 运行时验证
        ├── localStorage：版本化本地存档
        └── 静态 JSON + GLB：案件内容与物证资源
```

线上游戏不连接 Step1X-3D、不连接数据库、不要求用户登录。Step1X-3D 在离线资产流水线中生成 Geometry，随后由人工或脚本清理、压缩并发布为静态 GLB。

选择该架构的原因：

- 第一版只有一宗固定案件，没有后端必要性。
- 静态部署降低成本、故障面和隐私风险。
- 案件数据与引擎逻辑分离，为后续多案件和编辑器保留空间。
- 3D 交互需要稳定帧循环，React Three Fiber 便于与 React UI 状态协作。
- 所有谜题判定在客户端可重复执行，便于自动化测试。

## 2. 技术栈

| 层 | 选择 | 用途 |
|---|---|---|
| 构建 | Vite | 快速开发与静态生产构建 |
| UI | React + TypeScript | 页面、档案、推理板和状态展示 |
| 3D | Three.js + React Three Fiber | GLB 渲染、射线检测、相机与材质 |
| 3D 辅助 | `@react-three/drei` | 控制器、加载器、边界与性能工具 |
| 状态 | Zustand | 小型、明确的客户端游戏状态 |
| 数据验证 | Zod | 案件 JSON、存档和导入数据验证 |
| 图结构 | 自定义轻量证据图模型 | 避免第一版引入过重流程引擎 |
| 样式 | CSS Variables + CSS Modules | 建立明确视觉令牌并避免全局污染 |
| 单元测试 | Vitest | 规则、迁移、评分与数据验证 |
| 组件测试 | React Testing Library | UI 状态和可访问行为 |
| 端到端测试 | Playwright | 从开案到结案的关键路径 |
| 包管理 | pnpm | 可复现依赖与较低磁盘占用 |

第一版不引入 Redux、服务端框架、数据库、消息队列或微服务。

## 3. 系统上下文

```text
资产作者
  |
  | 照片 / 参考图
  v
Step1X-3D（GB10 服务器，离线制作环节）
  |
  | Geometry GLB
  v
网格清理与压缩
  |
  | 发布级 GLB
  v
开发者标注模式 ──> 案件 JSON
                         |
                         v
              静态站点构建与部署
                         |
                         v
                    玩家浏览器
                         |
               localStorage 本地存档
```

重要边界：

- GB10 推理服务器不属于玩家请求链路。
- 静态站点故障不会影响服务器上的模型服务，反之亦然。
- 玩家数据默认不离开浏览器。
- 案件答案存在于静态资源中，不能防止开发者工具查看；第一版不做无意义的安全混淆。

## 4. 推荐目录结构

```text
evidence-bureau/
├── public/
│   └── cases/
│       └── vanished-tenant/
│           ├── case.json
│           ├── locales/
│           │   └── zh-CN.json
│           ├── evidence/
│           │   ├── desk.glb
│           │   ├── camera.glb
│           │   └── brass-key.glb
│           ├── images/
│           └── audio/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx
│   ├── engine/
│   │   ├── camera/
│   │   ├── evidence/
│   │   ├── hotspots/
│   │   ├── tools/
│   │   ├── deduction/
│   │   └── rating/
│   ├── features/
│   │   ├── briefing/
│   │   ├── workbench/
│   │   ├── archive/
│   │   ├── deduction-board/
│   │   ├── hints/
│   │   ├── debrief/
│   │   └── authoring/
│   ├── cases/
│   │   ├── schema.ts
│   │   ├── loader.ts
│   │   └── localization.ts
│   ├── state/
│   │   ├── game-store.ts
│   │   ├── save-store.ts
│   │   └── migrations.ts
│   ├── components/
│   ├── styles/
│   ├── lib/
│   └── test/
├── tools/
│   ├── validate-case.ts
│   ├── optimize-model.mjs
│   └── check-asset-budget.ts
├── docs/
│   ├── requirements/
│   └── architecture/
├── package.json
├── vite.config.ts
└── README.md
```

正式发布的 GLB 需要作为游戏资源进入 `public/cases/**/evidence/`。根目录其他生成结果继续由 `.gitignore` 忽略。若单个正式资源明显超过 Git 适合管理的大小，应迁移到对象存储/CDN，而不是无上限扩大仓库。

## 5. 应用模块

### 5.1 App Shell

职责：

- 路由和顶层布局。
- 加载案件清单和语言资源。
- 初始化设置与存档。
- 捕获不可恢复的渲染错误。
- 在 WebGL 不可用时显示降级页面。

建议路由：

```text
/                         案件入口
/case/:caseId             恢复或开始案件
/case/:caseId/evidence/:id 物证工作台
/case/:caseId/archive     线索、证词和文档
/case/:caseId/deduction   推理板
/case/:caseId/debrief     结案报告
/authoring/:caseId/:id    开发环境标注模式
```

### 5.2 Case Loader

职责：

1. 获取 `case.json`。
2. 使用 Zod 验证数据结构。
3. 验证引用的物证、线索、文档和结论 ID。
4. 加载所选语言文本。
5. 生成只读的规范化案件对象。

数据无效时不得进入游戏；开发环境展示具体路径错误，生产环境显示可理解的“案件档案损坏”页面并允许重试。

### 5.3 Evidence Viewer

职责：

- 按需加载和释放 GLB。
- 计算模型包围盒，自动归一化观察尺度。
- 管理相机、OrbitControls 和视角书签。
- 根据工具切换材质、灯光和后处理。
- 执行光线投射并向 Hotspot Engine 提供交点。
- 维持帧率监控与动态降级。

React 只保存业务状态，不在每一帧写入全局 store。相机矩阵、指针位置和临时交点保留在 Three.js/ref 层，只有发现进度、工具切换等离散事件进入 Zustand。

### 5.4 Tool System

所有工具实现统一接口：

```ts
interface InvestigationTool {
  id: ToolId;
  activate(context: ToolContext): void;
  deactivate(context: ToolContext): void;
  update?(frame: FrameContext): void;
  getHotspotSignal(hotspot: HotspotRuntime): number;
}
```

第一版工具：

- `white-light`
- `raking-light`
- `ultraviolet`
- `wireframe`
- `measure`

工具负责视觉表现和信号强度，不直接把线索标记为发现。最终判定统一由 Hotspot Engine 完成，避免规则散落在各工具组件中。

### 5.5 Hotspot Engine

热点保存在模型局部坐标中，模型在场景中变换后仍能正确定位。第一版支持球形和盒形区域。

每帧只对当前光标附近或射线命中的候选区域计算详细条件，避免遍历复杂网格和全部热点。

判定输入：

```text
工具匹配
× 区域命中
× 相机角度
× 相机距离
× 停留进度
× 前置线索
= 可确认线索
```

建议将连续条件规范化为 `0～1` 信号，全部必要条件满足后累计 dwell progress；指针离开或工具不匹配时逐步衰减，而不是瞬间归零，以减少操作挫败。

### 5.6 Archive

职责：

- 展示已发现线索、证词和文档。
- 管理已读状态。
- 从线索跳回物证视角书签。
- 将可用节点发送到推理板。

Archive 不推导结论，只呈现已知事实。

### 5.7 Deduction Engine

推理板是有限图，而不是自由文本 AI 判断。

```ts
type NodeKind =
  | "clue"
  | "statement"
  | "document-fact"
  | "intermediate-conclusion"
  | "final-conclusion";

type RelationKind = "supports" | "contradicts" | "causes" | "matches";
```

案件配置定义合法推理规则。例如：

```text
desk.floor-dust
  + manager.table-never-moved
  + relation: contradicts
  -> conclusion.table-was-moved
```

引擎将玩家图规范化后匹配规则，不要求节点的屏幕位置一致。错误连接不会销毁已有进度；只返回错误类别或缺失维度。

### 5.8 Hint Engine

提示由案件作者预先编写，绑定阻塞目标和三级内容。系统根据当前发现状态判断哪些目标尚未完成，但只有玩家主动请求才展示提示。

记录：

- 每一级提示是否查看。
- 查看时间。
- 对应目标是否随后完成。

第一版只用于评级和体验改进，不上传分析数据。

### 5.9 Rating Engine

评分应确定、可测试、与速度弱相关。建议初始权重：

```text
核心线索：40%
证据链正确性：30%
可选/隐藏发现：15%
提示与错误提交：10%
完成时间：5%
```

评级阈值作为案件配置，不硬编码在 UI 中。时间只用于区分接近分数，不让阅读速度较慢的玩家受到明显惩罚。

### 5.10 Authoring Mode

仅当以下条件同时满足时注册路由：

```text
import.meta.env.DEV === true
且 URL 明确进入 /authoring/...
```

生产构建通过条件编译排除作者工具代码或至少不暴露入口。作者点击模型表面时，将世界坐标和法线转换为模型局部坐标，然后编辑半径、工具、角度、距离、停留和依赖。

导出前必须使用同一套 Zod schema 验证，防止作者工具和游戏加载器产生两种协议。

## 6. 案件数据协议

### 6.1 顶层结构

```ts
interface CaseDefinition {
  schemaVersion: number;
  id: string;
  contentVersion: string;
  defaultLocale: string;
  supportedLocales: string[];
  metadata: CaseMetadata;
  evidence: EvidenceDefinition[];
  clues: ClueDefinition[];
  statements: StatementDefinition[];
  documents: DocumentDefinition[];
  deductions: DeductionRule[];
  hints: HintDefinition[];
  rating: RatingDefinition;
  ending: EndingDefinition;
}
```

显示文案不直接写进逻辑对象，而是使用 `titleKey`、`descriptionKey` 等键从 locale 文件读取。

### 6.2 物证定义

```ts
interface EvidenceDefinition {
  id: string;
  modelUrl: string;
  posterUrl: string;
  titleKey: string;
  descriptionKey: string;
  initialCamera: CameraBookmark;
  cameraLimits: CameraLimits;
  hotspots: HotspotDefinition[];
  assetBudget?: {
    maxBytes: number;
    maxTriangles: number;
  };
}
```

### 6.3 热点定义

```ts
interface HotspotDefinition {
  id: string;
  clueId: string;
  shape:
    | { type: "sphere"; center: Vec3; radius: number }
    | { type: "box"; center: Vec3; size: Vec3; rotation: Vec3 };
  requiredTool: ToolId;
  surfaceNormal?: Vec3;
  maxViewAngleDeg?: number;
  minCameraDistance?: number;
  maxCameraDistance?: number;
  dwellMs: number;
  prerequisites: string[];
  bookmarkOnDiscover?: CameraBookmark;
}
```

坐标、旋转和法线全部相对于物证根节点。导入模型时若重新居中或缩放，必须在资产固化阶段完成，不能让运行时每次产生不同坐标。

### 6.4 推理规则

```ts
interface DeductionRule {
  id: string;
  requiredNodes: string[];
  requiredRelations: Array<{
    from: string;
    to: string;
    kind: RelationKind;
  }>;
  unlocksConclusionId: string;
  feedbackKey: string;
}
```

规则匹配使用 ID 和关系，不使用中文文本。

## 7. 状态模型

### 7.1 会话状态

```ts
interface GameSession {
  caseId: string;
  caseContentVersion: string;
  phase: "briefing" | "investigation" | "deduction" | "debrief";
  startedAt: string;
  activePlayMs: number;
  currentEvidenceId?: string;
  selectedTool: ToolId;
  discoveredClueIds: string[];
  readStatementIds: string[];
  readDocumentIds: string[];
  viewedHintLevels: Record<string, number>;
  deductionGraph: SerializedDeductionGraph;
  failedSubmissions: number;
  completedAt?: string;
  rating?: RatingResult;
}
```

### 7.2 Zustand 切片

建议按职责拆分：

- `sessionSlice`：案件阶段和计时。
- `evidenceSlice`：当前物证、工具和已发现线索。
- `archiveSlice`：已读档案。
- `deductionSlice`：节点布局、连接和结论。
- `hintSlice`：提示状态。
- `settingsSlice`：音量、动态效果、图形质量、语言。

不要把 Three.js 的每帧状态放进全局 store。

## 8. 本地存档架构

第一版存档较小，使用 `localStorage` 足够。键名：

```text
evidence-bureau:save:<caseId>
evidence-bureau:settings
```

存档包装：

```ts
interface SaveEnvelope {
  saveSchemaVersion: number;
  savedAt: string;
  checksum?: string;
  payload: GameSession;
}
```

保存策略：

- 离散重要事件后立即防抖保存，例如发现线索、查看提示、建立推理连接。
- 页面隐藏或卸载前尝试保存。
- 存档读取先 JSON 解析，再 Zod 验证，再运行版本迁移。
- 损坏存档备份为诊断文本并启动新档，不让应用白屏。
- 提供“导出存档”“导入存档”“重置案件”。

## 9. 3D 渲染与性能

### 9.1 加载策略

- 入口页不加载 GLB，只加载小尺寸海报。
- 进入物证工作台后才加载对应 GLB。
- 可在浏览下一件物证前预取，但同时只挂载一件高精模型。
- 离开物证时释放几何体、材质和纹理引用；确认缓存策略不会造成 GPU 内存持续增长。

### 9.2 资产规范

发布级建议：

```text
格式：GLB 2.0
单件大小：目标 < 10 MB
三角面：按物证复杂度设置预算，优先 < 200k
纹理：可选，最长边建议不超过 2048
压缩：Meshopt 优先；必要时 Draco
坐标：Y-up，统一单位，根节点变换冻结
动画：第一版物证默认无骨骼动画
```

Meshopt 解码与 Draco 解码的选择必须经过真实浏览器测试；文件更小不代表总加载体验一定更快。

### 9.3 质量降级

- 监测长帧和平均 FPS。
- 低质量模式关闭非必要后处理、降低像素比、简化阴影。
- 最大 device pixel ratio 建议限制在 1.5～2。
- 扫描材质优先使用简单 shader，避免多层全屏后处理。
- 线框模式对高面数模型需评估性能，不直接复制超大几何。

## 10. 资产生产流水线

```text
参考照片
  → Step1X-3D Geometry
  → Blender/脚本网格检查
  → 删除浮片与退化面
  → 必要的封洞、减面和法线修复
  → 统一方向、单位、原点与比例
  → 添加简化扫描材质或材质槽
  → GLB 压缩
  → 资产预算检查
  → Authoring Mode 标注热点
  → 案件 schema 验证
  → 浏览器视觉与性能 QA
```

Step1X-3D 原始输出保存在被忽略的工作目录，不直接进入正式资源。只有经过检查的发布级 GLB 才进入 `public/cases/.../evidence/`。

建议工具脚本：

- `optimize-model`：调用 glTF Transform 完成去重、压缩和报告。
- `check-asset-budget`：检查字节数、三角面、纹理尺寸和节点数。
- `validate-case`：校验 schema、引用完整性和本地化键。

## 11. 国际化

首发只有 `zh-CN`，但逻辑数据不保存显示文案。

```json
{
  "case.vanishedTenant.title": "消失的住客",
  "evidence.desk.title": "被移动过的桌子",
  "clue.desk.floorDust.title": "异常的桌腿积尘"
}
```

构建检查必须验证：

- 默认语言中不存在缺失键。
- locale 文件不存在重复或未使用的关键核心键。
- 文案插值变量和类型匹配。

## 12. 错误处理

| 故障 | 用户体验 | 技术处理 |
|---|---|---|
| WebGL 不可用 | 显示设备不支持说明和档案阅读入口 | 启动前能力检测 |
| case.json 404 | 显示案件暂不可用，可重试 | Loader 捕获网络错误 |
| schema 无效 | 显示档案损坏编号 | 记录 Zod issue 路径 |
| GLB 下载失败 | 保留文字档案，提供重试 | Error Boundary + loader retry |
| GLB 解析失败 | 显示海报和故障报告 | 卸载损坏资源 |
| 存档损坏 | 提供备份、重置和继续新档 | 验证、迁移、隔离坏档 |
| GPU 内存压力 | 自动进入低质量模式 | 释放资源并降低 DPR |
| 音频无法播放 | 静默继续，不影响线索 | 音频非关键路径 |

所有错误需有稳定错误码，便于用户反馈，例如 `CASE_SCHEMA_INVALID`、`MODEL_LOAD_FAILED`。

## 13. 安全与隐私

- 第一版不采集账号、照片、位置或个人身份信息。
- 本地存档不上传。
- 不在前端包含 Step1X-3D 服务器密钥或 SSH 信息。
- 静态资源只能引用可信同源或明确允许的 CDN。
- 渲染案件文案时不使用未净化的 `dangerouslySetInnerHTML`。
- Authoring Mode 不接受生产环境的任意远程模型 URL。
- 内容答案可被查看源码发现，这是静态单机游戏的已知边界，不用加密伪装成安全控制。

## 14. 测试策略

### 14.1 单元测试

- Case schema 成功与失败样例。
- 热点工具、角度、距离、停留和前置条件组合。
- 推理图规则匹配与顺序无关性。
- 评级边界。
- 存档迁移、损坏恢复和重置。
- 本地化键完整性。

热点数学逻辑应尽量写成无 Three.js 场景依赖的纯函数，便于大量边界测试。

### 14.2 组件测试

- 工具栏键盘操作和选中状态。
- 线索确认对话框。
- 提示逐级解锁。
- 推理板节点和关系操作。
- 错误与加载状态。

### 14.3 端到端测试

至少覆盖：

1. 新玩家开始案件并完成教学。
2. 通过测试入口模拟发现三条核心线索。
3. 构建正确证据链并结案。
4. 刷新页面恢复状态。
5. 使用提示后评级变化。
6. GLB 请求失败时可重试。
7. 存档版本升级后数据仍可读。

E2E 不依赖像素级拖动找到真实热点；引擎提供仅测试构建可用的确定性辅助接口，避免测试脆弱。

### 14.4 人工 QA

- 三种不同显卡/屏幕缩放组合。
- 鼠标与触控板。
- 减少动态效果。
- 浏览器缩放 100%、125%、150%。
- 三件物证的热点从预期角度均可稳定发现。
- 完整案件逻辑盲测。

## 15. 构建和部署

### 15.1 CI 门禁

每次提交执行：

```text
安装锁定依赖
→ TypeScript 类型检查
→ ESLint
→ 单元/组件测试
→ 案件 schema 与引用验证
→ 资产预算检查
→ Vite 生产构建
→ Playwright 核心烟雾测试
```

### 15.2 静态部署

首选 Vercel 或 Cloudflare Pages；GitHub Pages 可作为备选。部署必须支持：

- SPA 路由回退到 `index.html`，或使用 Hash Router 避免服务端配置。
- GLB 正确 MIME 类型与缓存头。
- 带内容 hash 的 JS/CSS 长缓存。
- 案件 JSON 使用较短缓存或以 contentVersion 版本化。
- HTTPS。

第一版推荐使用 Hash Router，减少不同静态托管平台的回退配置差异；确定正式域名和托管平台后再决定是否切换 History Router。

## 16. 可观测性

第一版默认不接入用户行为分析。提供本地诊断面板：

- 应用版本、案件版本和存档版本。
- 浏览器、WebGL renderer 和质量档位。
- 当前 FPS、已加载资源和估算三角面。
- 最近错误码。
- 一键复制不含个人数据的诊断信息。

若以后增加匿名分析，必须单独更新隐私说明，并只收集明确需要的事件。

## 17. 关键架构决策记录

| 决策 | 选择 | 原因 |
|---|---|---|
| 产品形态 | 单宗完整案件 | 先验证核心玩法，不提前建设平台 |
| 目标设备 | 桌面浏览器 | 鼠标适合精细观察，链接便于分享 |
| 运行架构 | 纯静态前端 | 无账号和动态内容，不需要后端 |
| 3D 技术 | React Three Fiber | 与 React UI 协作并保持 Three.js 能力 |
| 状态 | Zustand | 规模适中、低样板代码 |
| 存档 | localStorage | 数据量小、无需服务端 |
| 推理 | 确定性证据图 | 可验证、可测试，不依赖 AI 自由文本判断 |
| 模型生成 | 离线资产流程 | 避免玩家等待和随机失败 |
| 视觉 | 扫描/几何风格 | 发挥 Geometry 优势，降低纹理依赖 |
| 标注 | 开发者可视化模式 | 避免手写三维坐标，不扩大成公众编辑器 |
| 首发语言 | 简体中文 + i18n 数据结构 | 保证案件文案质量并保留扩展能力 |

## 18. 演进路线

### 阶段一：单案件静态引擎

完成本文架构，不引入后端。

### 阶段二：多案件内容包

增加案件索引、跨案件档案和版本兼容，仍可保持静态部署。

### 阶段三：内部案件编辑器

将标注模式扩展为完整内容制作工具，可先本地导出文件，不急于上云。

### 阶段四：创作者平台

只有在确实需要用户发布时才引入认证、对象存储、数据库、审核、任务队列和内容版本服务。届时保持游戏引擎读取相同案件协议，避免重写玩家端。

## 19. 实现顺序

推荐按垂直切片推进，而不是先搭完所有空页面：

1. 初始化 Vite/React/TypeScript 和质量工具。
2. 定义最小 Case/Hotspot/Save schema。
3. 加载桌子 GLB，完成相机与基础工具栏。
4. 完成一个侧光热点的发现闭环。
5. 将线索送入档案和推理板，生成一个中间结论。
6. 完成本地存档和恢复。
7. 建立开发者热点标注模式。
8. 接入另外两件物证和完整案件数据。
9. 加入提示、评级、结案回放和性能降级。
10. 完成测试、资产预算和静态部署。

第 4～5 步完成时，项目应已经具备一个真正可玩的最小闭环，而不是只有技术框架。
