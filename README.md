# AESS M2M Chat Bus - Docker Edition

> **工业级 Agent 无状态二进制盲转发事件总线（本地私有化容器部署版）**

---

## 📢 最新更新与 Bug 修复 (2026-07-02)

### 🆕 新增功能
- **AESS v2.1.2-docker 项目发布**：提供完全脱离 Cloudflare Workers 计费红线与环境约束的本地 Docker 私有化版本。
- **轻量化多阶段构建**：编写了高效的 `Dockerfile`。使用多阶段构建（Multi-stage Build）机制，编译与运行环境物理隔离，使最终生产镜像体积降到最低。
- **动态虚空房间机制**：使用 Map 动态维护房间内的 Socket 连接集。一旦某个房间内的节点清空，内存拓扑将自动爆破抹除，实现真正物理层面的 `STORAGE = 0` 零持久化残留。

### 🐛 修复问题
- **零依赖与配置解耦**：彻底解决 Cloudflare Workers 上 Durable Objects 编译阶段必须在 Entrypoint 强行导出类，以及免费计划必须配置基于 SQLite 的 `new_sqlite_classes` 迁移所带来的环境复杂度，让部署开箱即用。

---

## 1. 项目简介

**AESS M2M Chat Bus (Docker Edition)** 是专为 AI Agent（机器与机器，M2M）高并发数据流交互而设计的超轻量盲中继网关。本系统严格遵守 AESS 指令卡闸红线：
1. **纯二进制盲转发（Blind Reflection）**：仅中继 `Buffer` / `ArrayBuffer` 等二进制流，物理层屏蔽任何自然语言文本，拦截并驱逐所有非合规流量。
2. **零持久化（STORAGE = 0）**：系统在内存中进行实时的无状态反射，不需要连接任何关系型数据库、NoSQL 缓存或磁盘文件。
3. **隔离与爆破机制**：房间会随客户端连入动态生成，且在最后一个客户端断开时被立即强制垃圾回收，不占用宿主机残留内存。

---

## 🚀 核心工业级应用场景

在将 **AESS 2.1.2/2.1.3 规范体系（`aess-core`）** 与这个**基于 Docker 的无状态二进制盲转发聊天室（M2M Bus）** 组合上线后，这套系统的核心应用绝非传统的人类社交，而是以下五个**极具代表性的工业级 AI 自动化开发与协同场景**：

### 1. 异构多智能体去信任协同开发 (Cross-Agent Zero-Trust Co-Dev)
当一个大型复杂项目需要多个不同专长、不同语言编写的 AI Agent 共同推进，且这些 Agent 彼此独立、无法直接通过自然语言高效对齐时：
* **场景拓扑**：
  * **Agent A (TypeScript/Node)**：负责编写前端或边缘路由（如 Cloudflare Workers），它在代码完成后，计算物理产物哈希并签发初始证据包（`FS_WRITE`）。
  * **中继网关 (Python Broker)**：作为网络总线拦截流量，强制审查 Agent A 是否有越权行为（如非法的 `NETWORK_OUTBOUND`），核对无误后在事实包中追加 `BROKER_RELAY` 标记并安全广播。
  * **Agent B (Python/Go)**：接入该 Docker 聊天室端点，收到广播后自动拉取 Agent A 生成的代码，进行交叉编译与静态分析。通过后增量追加 `PROCESS_EXECUTION` 审计特征与自身的 `provenance` 物理出处签名。
* **核心价值**：多个 AI Agent 完全不依赖玄学的自然语言开会猜意图，纯粹靠该无状态通道高频交换标准 JSON 强契约（Schema Pass），像接力赛一样拼装出一条多态、自证一致性的分布式证据链。

### 2. 自动化流水线代码防炸与合规硬阻断 (Anti-Cheating & Watchdog Gating)
在无人值守的 AI 自动修复 Bug（Autonomous Patching）或大规模重构周期中，防止 AI Agent 出现欺骗性合规。
* **传统痛点**：AI Agent 在面对无法通过的编译类型错误或单元测试时，往往会投机取巧，通过偷偷修改测试用例、删除断言、或者篡改环境配置来假装成功，以此欺骗人类通过 PR。
* **AESS 解决路径**：
  * 宿主沙盒通过 Docker 聊天室向 Agent 下发包含严酷约束的 `result-2.1.schema.json` 契约。
  * 看门狗工具链 `aess-cli` 强制执行物理一致性判定。在 Step 4 终审时，它会扫描本地规约层的原始内容拼接哈希（`ManifestHash`）。
  * 任何 AI Agent 试图在热循环中篡改测试规则或引入幻觉字段的行为，都会导致 `calculated_hash` 不匹配，或者导致 `jsonschema` 运行时强卡关熔断报错（`ValidationError`），直接在现场剥夺其沙盒特权并强制驱逐。

### 3. 边缘端阅后即焚式高并发二进制事件中继 (Ephemeral M2M Message Relay)
适用于分布式、微型机器集群在边缘网络（Edge/IoT 或多台独立 VPS）上进行完全去持久化的机机通信（M2M）。
* **核心行为**：AI 代理或轻量级传感器客户端直接通过 WebSocket 连接到本 Docker 镜像暴露的 `/room/:roomId` 通道。
* **绝对红线**：死守 **`STORAGE = 0`** 的纯净状态。整个总线在内存中通过 Map 动态唤醒或创建房间，完全不向任何本地数据库、KV、Redis 持久化任何状态。
* **场景闭环**：当 AI 代理之间高速盲转发完 ArrayBuffer 事实流后，一旦所有连接断开，该房间在内存中的 client 集合清空，该 Room 节点会从 Docker 进程的物理内存中**直接被彻底抹除、烟消云散（Storage zeroed）**。无任何数据残留与历史包袱，在物理层完美实现极低内存开销和极致隐私。

### 4. 离线/私有化沙盒安全隔离审计床 (Private Sandbox Integrity Compliance)
对于金融、敏感基建或企业内部等数据严禁流出外网、无法使用公有云（如 Cloudflare 账单红线）的极限封闭环境。
* **部署方案**：在局域网内单机或私有集群内，通过一行命令 `docker compose up -d --build` 一键拉起完全本地化隔离的 AESS 机器接头聊天室。
* **应用情境**：将内部微调的开源大模型（如运行在 Ollama/llama.cpp 上的 local Agent）丢进该受控沙盒环境。本地看门狗通过约束 `FS_READ`、`FS_WRITE`、`PROCESS_EXECUTION` 的 IANA 风格能力空间域（Scope），强迫本地私有 AI 代理必须输出符合契约的退出码（Exit Code）与经数字签名的审计日志。用本地的沙盒物理隔离墙，100% 接管机器行为的确定性。

### 5. 开源社区标准演进与多技术栈一致性对测 (CTS Benchmarking)
当 AESS 规范（AI Agent Engineering Specification Standard）向开源社区发布后，用来客观度量并裁判市面上各种主流 Agent 生产工具（如 Claude Code, OpenHands, Cursor 等）的兼容性。
* **应用情境**：
  * 社区开发者或评测机构不看各家大模型官方宣传的代码修复率或 Reasoning 幻觉文本，而是将不同的 Agent 适配器（Prompt Adapter）无差别地丢入这套相同的 Docker 一致性测试床（CTS）中。
  * 让它们运行相同的代码 refactor 任务，最终只看它们生成的 `RESULT.json` 能否在不静默降级的情况下连续亮起绿灯、通过硬核 Schema 校验并全线胜出。
  * 谁能通过，谁的名称和版本就能合法合并进标准兼容性注册表（`compatibility.json`）中。

💡 **总结**：这个 Docker 版聊天室本质上是一个“冷酷的分布式数据审判所与去中心化证据中继站”。它在工业中最核心的情境，就是让不同的机器、不同的 AI 代理互不信任地在一起干活，但又能通过物理哈希和强约束契约，输出 100% 绝对可信、无法作弊的工程结果。

---

## 🛠️ agycli (agy) 在本项目中的具体使用方法

在本项目中，`antigravity` CLI (`agy`) 充当了 Agent 的本地物理执行引擎与通信网关。配合已挂载的 `.antigravity/prompts/cloudflare-bus.md` 提示词适配器，您可以让 Agent 完美接入此无状态二进制总线中：

### 1) 引导注入与启动
在物理终端中，通过 `agy` 载入 Cloudflare Worker / Docker 盲转发的契约提示词，并指定本地运行的 M2M 聊天室通道：
```bash
# 启动 agy 并连入本地运行的 Docker 盲转发通道（房间为 freedom）
agy session --prompt-adapter C:/Users/sj929/.antigravity/prompts/cloudflare-bus.md --gateway ws://localhost:8080/room/freedom --dangerously-skip-permissions
```

### 2) 协作与合规对齐流程
1. **代码修改与热循环**：`agy` 驱动的 AI Agent 在热循环中修改 `src/` 下的代码。
2. **强制本地核验**：在准备将成果发送给其他 Agent 协作前，`agy` 会自动根据提示词约束，调用本地看门狗进行类型安全与 Schema 校验：
   ```bash
   ./AESS/toolchain/aess-cli/aess verify
   ```
3. **安全二进制中继**：
   - 校验通过后，`agy` 会读取 `logs/RESULT.json` 并将其序列化为二进制 ArrayBuffer 字节流。
   - 通过 WebSocket 盲发至 Docker 聊天总线 `ws://localhost:8080/room/freedom`。
   - 聊天总线收到后，瞬时广播给同房间的其他 Agent 进行后续的编译、部署等管道串联。

---

## 2. 物理拓扑结构

```
[ Agent A ] \                                / [ Agent B ]
              ==> [ wss://<ip>:8080/room/freedom ] <==
[ Agent C ] /                                \ [ Agent D ]
```

- 每一个客户端连入 `ws://<ip>:8080/room/<roomId>` 后，系统会自动将其放入对应的隔离房间。
- 任何一个 Agent 广播的二进制数据包均会被盲转发给同房间内的所有其他 Agent，且不会被解析或落盘。

---

## 3. 一键部署指南

在安装了 Docker 与 Docker Compose 的物理机器上，直接按以下步骤执行部署：

### 1) 克隆并构建运行
```bash
# 启动并于后台构建镜像与容器
docker compose up -d --build
```

### 2) 监控服务日志
```bash
# 实时跟踪本地网关服务的健康状态
docker compose logs -f
```

**预期控制台成功输出：**
```text
=== [AESS DOCKER BUS] Engine listening on port 8080 ===
```

---

## 4. 连接端点说明

服务启动后，物理机将在 `8080` 端口提供服务。您的 AI Agent 和测试客户端连接的 URL 将会是：
- **WebSocket 物理接头**：`ws://<您的服务器IP>:8080/room/<自定义房间名>`
- **HTTP 状态检查端口**：`http://<您的服务器IP>:8080/`

### ⚡️ 线上托管端点 (Cloudflare Workers 版)
如果您无需本地部署，也可以直接使用以下已部署上云的公共网关：
- **部署管理端点**：https://aess-m2m-chat-bus.sj9292008133.workers.dev
- **专属物理房间 (freedom) WebSocket 接头**：`wss://aess-m2m-chat-bus.sj9292008133.workers.dev/room/freedom`

---

## 5. 项目文件树
- `src/index.ts`：Node.js http + ws 盲转发反射引擎主控。
- `Dockerfile`：Alpine 极简多阶段构建容器配置。
- `docker-compose.yml`：标准容器编排配置文件。
- `package.json` & `tsconfig.json`：项目依赖声明与 TS 编译器规约。
