---
created: 2026-07-20
status: researched
feasibility-study: conducted
blocked-by: pi-rpc-navigate-tree
---

# 支持 Pi Session Tree 导航（`/tree`）

## 目标

在 FrostPi 中提供与 Pi 交互式 `/tree` 等价的核心能力：

1. 查看当前 Pi session 的完整 entry tree；
2. 选择任意 entry，切换 active leaf；
3. 在同一 session 文件内继续对话；
4. 若选中用户消息，则恢复其文本到 Composer，供用户编辑后重新提交。

区别于 Fork。Fork 会创建新 session 文件并替换 live runtime；Tree 导航只在当前 session 内移动 leaf。

## 当前调研分析结论

**读 tree 已具备；改 leaf 缺 Pi RPC 入口。**

FrostPi 已有足够的投影、entry 身份、hydrate 和 Composer seed 基础设施来承接 `/tree`。真正阻塞正式实现的是：Pi RPC 没有暴露 `navigate_tree`。

### 与 Pi 交互式 `/tree` 的对照

Pi 交互式流程：

```text
A. 用户输入 /tree
B. 显示 Tree
C. 用户选择节点并确认
D. 询问是否生成 branch summary
E. 若需要，生成 summary
F. 切换 active leaf，并重建 agent context
G. 若选中用户消息，把文本放回 editor
```

职责边界：

| 步骤 | 谁能做 | 状态 |
|---|---|---|
| A 入口 `/tree` | FrostPi | 可实现 |
| B 获取并显示 tree | Pi `get_tree` + FrostPi UI | 已有读取能力 |
| C 选择节点 | FrostPi UI | 可实现 |
| D 询问 summary | FrostPi UI | 可实现 |
| E 生成 branch summary | Pi Core `navigateTree()` | Core 已实现，RPC 未暴露 |
| F 切换 leaf / 重建 context | Pi Core `navigateTree()` | Core 已实现，RPC 未暴露 |
| G 恢复 editorText | Pi Core 返回 + FrostPi Composer seed | Core 已实现，RPC 未暴露 |

因此不是 C–F 都做不到。C、D 是 FrostPi 侧工作；E、F、G 的核心能力在 Pi 内部已有，只差 RPC 暴露。

## 证据链

以下结论均基于 2026-07-20 对本地 Pi 与 upstream 源码的核验，不是推测。

### 已验证的 Pi 能力

1. **RPC 可读完整 tree**
   - 文档：`get_tree` 返回 `{ tree, leafId }`
   - 实现：`rpc-mode.js` 的 `case "get_tree"` 调用 `sessionManager.getTree()` 与 `getLeafId()`
   - 本地 Pi `0.80.6`、release `v0.80.10`、upstream `main` 均已具备

2. **RPC 可读 entries 与 leaf**
   - `get_entries` 返回 append-order entries 与 `leafId`
   - 支持 `since` 游标
   - FrostPi 已使用该接口做 Fork entry 绑定与 leaf 变化检测

3. **Pi Core 已实现 in-place 导航**
   - `AgentSession.navigateTree(targetId, options)`
   - 源码：`packages/coding-agent/src/core/agent-session.ts`（upstream main 约 L2827+）
   - 行为：
     - 校验 target
     - 计算 common ancestor 与待摘要分支
     - 触发 `session_before_tree`
     - 可选生成 branch summary
     - 用户消息：leaf 移到 parent，返回 `editorText`
     - 非用户消息：leaf 移到自身
     - `branch` / `branchWithSummary` / `resetLeaf`
     - `buildSessionContext()` 后写回 agent messages
     - 触发 `session_tree`
   - 与 Fork 不同：不创建新 session 文件，不替换 runtime

4. **RPC 模式已给 extension command 绑定 `ctx.navigateTree()`**
   - `rpc-mode.js` 的 `commandContextActions.navigateTree` 直接调用 `session.navigateTree`
   - 因此 extension command 可导航，但普通 RPC client 不能

5. **RPC 命令表里没有 `navigate_tree`**
   - `rpc-types.d.ts` / `rpc-types.ts` 有 `get_tree`、`fork`、`clone`、`get_entries`
   - 没有 `navigate_tree`
   - 本地 `0.80.6`、`v0.80.10`、2026-07-19 upstream main 均如此

### 已验证的 FrostPi 能力

消息级 Fork 已合并进 `main`。与 Tree 可复用的部分：

| 基础设施 | 位置 | Tree 用途 |
|---|---|---|
| stable Pi entry id | `sourceEntryId` / `get_entries` | 节点身份 |
| active path 提取 | `userEntryReferences.ts` | 导航后绑定用户消息 |
| leaf 变化检测 | `activeLeafContinues()` | 外部导航后 rehydrate |
| 完整历史重建 | `hydrateMessages()` | 切换 branch 后替换 conversation |
| Composer seed | `composerSeed` + `applyForkComposerSeed` | 恢复 user message 文本 |
| Extension UI bridge | `ExtensionUiCoordinator` | `session_before_tree` 交互 |
| idle/history/queue guards | `SessionRuntime` | 导航 preflight |
| 本地 slash 命令 | `/resume`、`/compact` | `/tree` 入口模式 |

不应复用的 Fork 机制：

- 新 FrostPi session id
- Runtime rebind
- temporary session staging
- 原 session stopped 保留
- draft 跨 session 迁移
- Fork 命名

原因：Tree 是 **同进程、同 JSONL 的 in-place leaf 变更**；Fork 是 **runtime/session replacement**。

### 关键源码锚点

Pi（upstream / 本地 dist 等价）：

- `docs/rpc.md`：`get_tree`、`get_entries`、`fork`、`clone`
- `docs/sessions.md`：`/tree` 与 `/fork`、`/clone` 语义对比
- `docs/session-format.md`：entry tree、`leaf`、`branch_summary`
- `docs/sdk.md`：`AgentSession.navigateTree()`
- `docs/extensions.md`：`session_before_tree` / `session_tree`、`ctx.navigateTree()`
- `dist/modes/rpc/rpc-types.d.ts`：RPC 命令联合类型
- `dist/modes/rpc/rpc-mode.js`：`get_tree` 与 extension `navigateTree` 绑定
- `dist/core/agent-session.js`：`navigateTree()` 完整实现
- `dist/modes/interactive/interactive-mode.js`：TUI `/tree` 流程与 summary 选择

FrostPi：

- `packages/pi-rpc/src/PiRpcApi.ts`
- `apps/vscode/src/extension/sessions/SessionRuntime.ts`
- `apps/vscode/src/extension/sessions/SessionRegistry.ts`
- `apps/vscode/src/extension/conversation/userEntryReferences.ts`
- `apps/vscode/src/extension/sessions/session-lifecycle.SPEC.md`
- `apps/vscode/src/extension/sessions/session-catalog.SPEC.md`（仍将 tree navigator 列为 non-goal）
- `docs/protocol/pi-rpc-compatibility.md`

## Pi 最小 GAP

### 正式方案：原生 RPC

建议 Pi 增加：

```ts
type NavigateTreeCommand = {
  id?: string;
  type: "navigate_tree";
  targetId: string;
  summarize?: boolean;
  customInstructions?: string;
  replaceInstructions?: boolean;
  label?: string;
};

type NavigateTreeResult = {
  cancelled: boolean;
  aborted?: boolean;
  editorText?: string;
  leafId: string | null;
  summaryEntry?: SessionEntry;
};
```

RPC handler 可近似为对已有 Core 的透传：

```ts
const result = await session.navigateTree(command.targetId, options);
return success(id, "navigate_tree", {
  ...result,
  leafId: session.sessionManager.getLeafId(),
});
```

若第一版支持 `summarize:true`，还需要取消 summarization 的能力：

- 新增 `abort_tree`；或
- 扩展现有 `abort`，使其调用 `session.abortBranchSummary()`。

若 FrostPi 第一版固定 `summarize:false`，则取消入口不是阻塞项。

### 兜底方案：Pi Extension 适配

可行，但不推荐作为长期边界。可复用独立的捆绑 extension 基础设施（见 `backlog/bundled-pi-extensions.md`），不必污染用户 `.pi` 配置。

```text
FrostPi 选择 entry
→ prompt("/frostpi.tree.navigate <entryId>")
→ bundled extension 内 ctx.navigateTree(...)
→ FrostPi 再 get_messages + get_entries 刷新
```

代价：

1. 仍是 extension 旁路，不是原生 RPC；
2. extension `ctx.navigateTree()` 公开返回值通常只有 `cancelled`，丢失 Core 的 `editorText` / `aborted` / `summaryEntry`；
3. 需要通过 `set_editor_text` 与后续轮询形成旁路协议；
4. slash 命令污染、命名冲突、`:1` 后缀风险；
5. 调试路径变长，责任边界模糊。

适合 upstream PR 合入前的原型，不适合正式产品协议。

## FrostPi 推荐实现形状

### Phase 1：最小正式实现

前置：Pi 提供 `navigate_tree`。

FrostPi：

1. Composer 本地命令 `/tree`，类似 `/resume`、`/compact`；
2. Host 调用 `get_tree`；
3. 用 VS Code QuickPick 展示 tree 行；
4. 用户选择 entry；
5. 调用 `navigate_tree({ targetId, summarize: false })`；
6. 成功后 `get_messages + get_entries` 全量 hydrate 当前 active branch；
7. 若返回 `editorText`，写入现有 Composer seed；
8. 不创建新 FrostPi session，不 rebind Runtime。

预计生产改动主要集中在：

```text
packages/pi-rpc/          getTree + navigateTree
SessionRuntime.ts         preflight + RPC + rehydrate
SessionRegistry.ts        编排
SessionTreePicker.ts      QuickPick 投影
frostPiCommands.ts        /tree completion
tests + SPECs
```

### Phase 2

- branch summary 与取消；
- custom summary instructions；
- labels；
- 更完整的 Webview tree explorer。

### Phase 3

- conversation 内 branch 标记；
- branch preview / diff；
- pruning 等高级能力。

## 已确认产品约束

1. Tree 导航必须由 Pi 拥有 leaf/context 语义，FrostPi 不解析 JSONL 后自行改写 session 文件。
2. Tree 与 Fork 保持不同生命周期：
   - Tree = in-place mutation
   - Fork = session/runtime replacement
3. 第一版可用 QuickPick，不必先做完整 Webview tree UI。
4. 第一版可不做 summary，以降低对 abort 能力的依赖。
5. 正式路径优先 Pi 原生 RPC；若临时使用 extension bridge，应建立在独立的捆绑 extension 基础设施上，而不是污染用户 `.pi` 配置。

## 未决问题

实现前需要确认：

1. 首版是否固定 `summarize:false`，还是要完整 summary 交互；
2. UI 入口是仅 `/tree`，还是同时提供消息级 “Go to this branch point”；
3. 选中用户消息时，是否恢复图片，还是只恢复文本（Pi Core 当前主要返回文本 `editorText`）；
4. 是否要把 `get_tree` 结果缓存到 session view，还是每次打开 selector 现取。

## 下一步

1. 向 Pi 提 issue/PR：RPC 增加 `navigate_tree`（可选附带 abort/summary 透传）。
2. 用 fake-Pi 先写 FrostPi 行为测试骨架：选择节点、导航成功、取消、失败、user message seed。
3. Pi 可用后实现 Phase 1 QuickPick 版本。
4. 更新：
   - `packages/pi-rpc/SPEC.md`
   - `docs/protocol/pi-rpc-compatibility.md`
   - `session-lifecycle.SPEC.md`
   - `session-catalog.SPEC.md` 的 non-goals
5. 仅在需要提前验证 UX 时，临时做 extension bridge；正式实现后删除。

## 验收标准

Phase 1 完成时：

- 用户可通过 `/tree` 看到当前 session tree；
- 选择非当前 leaf 的 entry 后，conversation 切换到对应 active branch；
- 原 session 文件不变，FrostPi session id 不变；
- 选择用户消息时，Composer 恢复其文本且该消息本身不留在已提交历史中（符合 Pi `/tree` 语义）；
- 导航失败/取消不破坏当前 session；
- 不依赖捆绑 extension。

---

## 附录 A：Extension 兜底方案通信可行性验证

> 记录时间：2026-07-21
> 验证范围：`summarize: true/false` 均覆盖，extension bridge 方案在 RPC 通信层面是否满足需求
> 验证方式：逐条结论附带 Pi 源码/类型锚点

### 前提

- Extension command 通过 RPC `prompt` 触发，handler 内同步 `await ctx.navigateTree()`
- `summarize` 参数由 FrostPi 在发起命令前通过 Tree Picker UI 收集，作为 slash command 参数传入
- 目标：选节点 →（可选 summary 确认）→ 导航 → 刷新 conversation → 恢复 editorText

### 1. 时序保证：`prompt` response 在 handler 完成后才发出

**证据**：`dist/core/agent-session.js:799-803`

```javascript
if (expandPromptTemplates && text.startsWith("/")) {
    const handled = await this._tryExecuteExtensionCommand(text);
    if (handled) {
        preflightResult?.(true);  // ← response 在此之后才发出
        return;
    }
}
```

`_tryExecuteExtensionCommand` 被 `await`，extension command handler **完全执行完毕后**（包括其内部的 `await ctx.navigateTree()`）`preflightResult(true)` 才触发，进而 `output(success(id, "prompt"))` 写入 stdout。

**结论**：`prompt` response 到达 = handler 已结束 = 导航已完成（成功或失败）。FrostPi 收到 response 后立即 `get_messages` + `get_entries` 即可拿到最新状态，无需轮询。

---

### 2. 关键类型损失：`ctx.navigateTree()` 在 RPC 下只返回 `{ cancelled }`

**证据 A**：`AgentSession.navigateTree()` 的完整返回类型

> `dist/core/agent-session.d.ts:588-595`

```typescript
navigateTree(targetId: string, options?: { ... }): Promise<{
    editorText?: string;
    cancelled: boolean;
    aborted?: boolean;
    summaryEntry?: BranchSummaryEntry;
}>;
```

**证据 B**：Extension 侧 `ExtensionCommandContext.navigateTree()` 的返回类型

> `dist/core/extensions/types.d.ts:267-273`

```typescript
navigateTree(targetId: string, options?: { ... }): Promise<{
    cancelled: boolean;  // ← 仅此字段
}>;
```

**证据 C**：RPC mode 的 `commandContextActions.navigateTree` 实现

> `dist/modes/rpc/rpc-mode.js:239-248`

```javascript
navigateTree: async (targetId, options) => {
    const result = await session.navigateTree(targetId, { ... });
    return { cancelled: result.cancelled };  // ← editorText/aborted/summaryEntry 全部丢弃
},
```

**影响**：Extension 无法从 `ctx.navigateTree()` 返回值拿到 `editorText`、`aborted`、`summaryEntry`。但这对 FrostPi **不是阻塞性问题**，因为：
- `editorText`：FrostPi 在调用导航前已通过 `get_tree` 持有目标 entry 的完整数据（含 message content），可自行写入 Composer seed
- `aborted`：FrostPi 可通过对比导航前后的 `leafId`（先 `get_entries` → 记 leafId → 导航 → 再 `get_entries` → 对比）推断是否成功
- `summaryEntry`：若启用 summary，生成的 `branchSummary` entry 会出现在 `get_messages` 返回的 active branch 中（见下文 §4）

---

### 3. `summarize: true` 的通信流

**证据**：`ctx.navigateTree()` 接受 `summarize` 参数

> `dist/core/extensions/types.d.ts:268-271`

```typescript
navigateTree(targetId: string, options?: {
    summarize?: boolean;
    customInstructions?: string;
    replaceInstructions?: boolean;
    label?: string;
}): Promise<{ cancelled: boolean }>;
```

**两种交互模式**：

| 模式 | 流程 | session_before_tree 行为 |
|------|------|--------------------------|
| `summarize: false` | FrostPi → prompt → handler(navigateTree) → response | 不触发 |
| `summarize: true`（默认 prompt） | FrostPi → prompt → handler(navigateTree) → LLM 生成 summary → response | 触发但无 UI 交互（除非其他 extension 的 handler 调用了 `ctx.ui.confirm()` 等） |
| `summarize: true`（自定义 instructions） | FrostPi Tree Picker 收集用户指令 → 拼入 slash command args → 同上 | 同上 |

两种模式共享同一时序保证（§1）：`navigateTree()` 内的 summary LLM 调用也是同步 await 的，response 在全部完成后才发出。

**残余风险**：
- 若 summary LLM 调用失败（网络错误等），`navigateTree()` 内部可能抛异常或返回 `aborted: true`。Extension 只拿到 `{ cancelled }`，无法区分「导航失败」和「summary 生成失败但导航成功」。FrostPi 需通过对比 `leafId` 判断实际导航结果。
- 无取消 summary LLM 的 RPC 入口（`abort` RPC 命令 abort 的是 agent turn，不是 summarization）

---

### 4. Branch Summary 消息可获取性

**证据**：`BranchSummaryMessage` 是 `AgentMessage` 联合类型的正式成员

> `docs/session-format.md`（Message Types 章节）

```typescript
interface BranchSummaryMessage {
    role: "branchSummary";
    summary: string;
    fromId: string;   // 从哪个 entry 分支出来的
    timestamp: number;
}

type AgentMessage = ... | BranchSummaryMessage | CompactionSummaryMessage;
```

**证据**：`get_messages` 返回 `AgentMessage[]`

> `dist/modes/rpc/rpc-types.d.ts`（`RpcResponse` 中 `get_messages` 分支）

```typescript
| {
    type: "response";
    command: "get_messages";
    success: true;
    data: { messages: AgentMessage[] };
}
```

**结构位置**：`navigateTree` + summary 后，branch summary entry 插入到新 active branch 上（branch point 的子节点，被废弃分支之前的位置），因此 `get_messages`（返回 active branch 上下文）会包含它。它和 `compactionSummary` 消息同级同构——一段 summary 文本，显示在 conversation 中作为上下文标记。

**结论**：两种模式（summary / no-summary）下，FrostPi 都可通过 `get_messages` + `get_entries` 拿到完整的最新状态。FrostPi 侧只需为 `branchSummary` role 增加渲染映射。

---

### 5. 总体结论

Extension bridge 方案在 RPC 通信层面**满足需求**（`summarize: true/false` 均覆盖），不需要等 Pi 原生 `navigate_tree` RPC 命令。

残余风险（非阻塞）：
- 无取消 summary 生成的 RPC 入口
- Extension 侧丢失 `aborted` / `summaryEntry` / `editorText`（可绕过）
- Slash 命令命名空间污染（可通过 bundled extension + 明确前缀规避）

---

## 附录 B：Tree 可视化布局要点

> 参考实现：`~/.pi/agent/projects/session-tree-web-tool/`（`lib/analyze_session.py` → `flatten_tree()`）

### 核心问题

Session tree 的「缩进」不等于「树深度」。直接用 `depth - 1` 做 indent 会产生错误布局：线性链（无分支）不应该增加缩进层级，只有分支点才产生视觉嵌套。

### 正确算法（`flatten_tree` 的 indent 规则）

```python
# 关键逻辑（简化自 analyze_session.py:451-636）

if multiple_children:
    child_indent = indent + 1       # 分支点：子节点缩进 +1
elif just_branched and indent > 0:
    child_indent = indent + 1       # 刚从分支点下来：继续缩进
else:
    child_indent = indent           # 线性链：保持同级
```

规则：
1. **单子节点**（无分支）：与父节点同 indent → 视觉上保持线性
2. **多子节点**（分支点）：子节点 indent = 父节点 indent + 1
3. **刚从分支点下来的单子节点**：仍然 indent + 1（过渡层）
4. **多根节点**：视为 virtual root 的子节点，起始 indent = 1

### 其他关键字段

| 字段 | 用途 |
|------|------|
| `indent` | 缩进级别（非深度），用于 CSS `padding-left` |
| `is_last` | 是否是其父的最后一个子节点 → 垂直引导线在此处截止 |
| `is_virtual_root_child` | 多根时标记为 virtual root 的直接子节点 |
| `just_branched` | 传播标记：父节点有多个子节点时，告知子节点「你处于分支上下文」 |

### Active path 排序

子节点排序：active path 上的节点始终排在最前（`sorted(children, key=lambda n: 0 if in_active else 1)`）。这确保 active branch 在树视图中连续可见。

### 过滤后重计算

当 filter 隐藏部分节点后，必须重新计算 indent / is_last（`recalculate_visual_structure()`）：
1. 对每个可见节点，找到最近的可见祖先
2. 以可见祖先为 parent 重建兄弟关系
3. 重新运行 indent 规则

### 前端渲染

该项目前端（Alpine.js）使用 `padding-left: (indent * 1.5 + 1.2)rem` 做缩进，并用 `node-indent-guide`（绝对定位的 `border-left` 竖线）绘制层级引导线。引导线通过 `is_last` 控制截止位置。

### 对 FrostPi 的启示

- 不要在后端返回嵌套 tree JSON 让前端自己算缩进——后端应返回 flat node list + 正确的 `indent` / `is_last` 字段
- 若用 RPC `get_tree`（返回嵌套结构），FrostPi 侧必须实现等价的 flatten + indent 算法
- 参考 `analyze_session.py` 的 `flatten_tree()` 是可移植的参考实现（纯 Python，逻辑清晰）
