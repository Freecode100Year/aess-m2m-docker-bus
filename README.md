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

---

## 5. 项目文件树
- `src/index.ts`：Node.js http + ws 盲转发反射引擎主控。
- `Dockerfile`：Alpine 极简多阶段构建容器配置。
- `docker-compose.yml`：标准容器编排配置文件。
- `package.json` & `tsconfig.json`：项目依赖声明与 TS 编译器规约。
