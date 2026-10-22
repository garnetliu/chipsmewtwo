---
name: task-loop
description: 按 TASKS/ 下的规则与批次文件逐条或逐批执行任务，每条走 implementer 写 → reviewer 查 → implementer 改的闭环，通过后再进下一条。
---

# 任务闭环

先读 `TASKS/00-rules.md`，里面有裁决规则、批次表和全局口径。
再按里面的批次表读同目录下对应的批次文件，一批一批做。

`00-rules.md` 的「全局口径」那节对所有任务生效，起 implementer 时要把它连同任务正文一起给过去，
不能只给任务那几行。

## 单条任务的流程

1. `Agent(subagent_type: "implementer")` 实现这条任务。prompt 里给全：
   - `00-rules.md` 的裁决规则和全局口径
   - 这条任务的完整三段（改哪里 / 达到什么效果 / 怎么算验证通过）
   - **这条任务允许写入的路径**
   - 前面任务定下的约定
2. `Agent(subagent_type: "reviewer")` 检查。prompt 里给任务原文和 implementer 的报告。
   任务的「怎么算验证通过」是逐条跑的，不是看一眼
3. reviewer 返回 PASS → 跳到第 6 步
4. 不通过 → `SendMessage` 发给第 1 步那个 implementer，带上完整问题清单

   **必须用 SendMessage，不能重新 Agent。** 重开的 implementer 没有上下文，
   要重读一遍代码，也不知道自己刚才为什么那么写
5. `SendMessage` 发给第 2 步那个 reviewer 复检，回到第 3 步。最多三轮，
   第三轮还不过就停下来，把分歧讲清楚问用户
6. 在批次文件里把这条勾上，向用户转述：做了什么、reviewer 查出过什么、最后怎么收的

subagent 的报告用户看不到，每条结束都要转述。

## 并行批次

每个批次文件开头写了这批能不能并发。能并发的那一批，任务的写入路径互斥 ——
那一段里有路径归属表。

起并发批：在一条消息里发多个 `Agent(implementer)`，每个 prompt 里写死
「你只能写这些路径，其他文件一律不碰，发现别处有问题写进报告」。
review 各管各的，一条任务配一个 reviewer，不要让一个 reviewer 同时审两条。

**并发批里任何人都不许跑这些**（它们改的是全局产物，并发会互相覆盖）：

- `pnpm codegen`、`prisma generate`
- `pnpm migrate`、`pnpm seed`
- 装依赖、改 `package.json`

需要这些的任务单独成条、单独成批。

批内全部 PASS 之后，**必须再跑一条集成检查**才算这批完成：
统一跑一次 `pnpm codegen`、`pnpm tsc --noEmit`、`pnpm lint`、`pnpm test`、`pnpm test:e2e`，
再让一个 reviewer 横着看一遍 —— 同一类东西是不是用了同一个组件、同一个参数名、
同一套错误语义。逐条审看不出横向分叉，这是并发批唯一真正的代价。

集成检查不过，把问题分回对应的 implementer（`SendMessage`，它们上下文还在）。

## 边界

- 任务之间有依赖就严格串行，哪怕路径不冲突
- 任务的三段有缺失、或者「怎么算验证通过」判定不了，先问用户，不要自己脑补一个标准
- 拿不准两条任务会不会写到同一个文件，就当会，串行跑
