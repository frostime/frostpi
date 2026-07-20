---
created: 2026-07-20
status: idea
feasibility-study: not conducted
---

支持在同一个 VsCode 窗口中，在外部 worktree 里打开 PI Session

行为逻辑:

1. 只检测当前已经有的 Worktree
2. 在 New Session 的时候可以选择在 Worktree 中打开
3. 目的：在同一个 cwd / vscode windows 中，同时进行多个并行任务

尚未确认:
- PI 是否支持指定 cwd
- PI Session 要如何管理 —— 外部 dir session 存储位置会有所不同，要如何管理 session 文件?
  - Candidate:
    - 只负责 New Session 的时候创建，不需要 Resume
    - 自动检测 Worktree，Resume 的时候同时兼容 worktree Session
    - 直接放在 main dir 的 session dir 中 —— 缺点是，后续无法在 worktree 目录下看到本来应该存在的 session
