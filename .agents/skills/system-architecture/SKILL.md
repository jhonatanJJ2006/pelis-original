---
name: system-architecture
description: Designs, reviews, and implements robust system architectures for agent-assisted development. Guides architecture tier selection (single call, workflow, agent), tool orchestration, permissions, error recovery, and Cursor collaboration patterns. Use when planning system architecture, agent workflows, or reviewing high-level design.
---

# System Architecture for Claude Code and Cursor

Help teams design, review, and implement robust system architectures for projects using agent-assisted development.

## Decision tree

Choose architecture tier:

1. **Single call** — Simple, one-shot tasks with minimal tool use
2. **Workflow** — Multi-step pipelines with defined stages and handoffs
3. **Agent** — Autonomous loops with tool orchestration, planning, and recovery

## Core areas

### Tool orchestration
- Configure Read, Write, Bash, Glob, Grep based on task needs
- Prefer minimal tool surface area; add tools only when justified
- Batch independent reads/searches in parallel

### Permissions and safety
- Use default/plan modes for exploratory work
- Use acceptEdits for controlled implementation
- Document when bypassPermissions is acceptable (never by default in production repos)

### Resiliency
- Plan error handling before implementation
- Support session resumption and checkpointing for long workflows
- Add verification steps after destructive or structural changes

### Cursor collaboration
- Use in-context editing for iterative UI and code refinement
- Run review loops: implement → audit (web-design-guidelines, accesslint) → fix
- Keep architecture decisions in ADRs or blueprint docs

## Workflow

1. Clarify project goals and team workflows
2. Select agent tier and tool set
3. Define permission model
4. Document error handling and resume strategy
5. Output: architecture proposal, permissions table, error workflow, collaboration plan

## Example prompts

- Design an architecture for a web app with integrated Cursor workflows
- Provide permission and safety recommendations for an agent build pipeline
- Set up error handling workflows for long agent sessions

## References

- Anthropic Agent SDK patterns: https://github.com/anthropics/skills/tree/main/skills/claude-api/python/agent-sdk
- Permission modes and workflow orchestration in agent SDK docs
