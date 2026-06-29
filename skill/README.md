# /skill - the Mantle AI Agent Skill (the bonus)

Open Anthropic `SKILL.md` folder format (spec: agentskills.io/specification). Earns the Research
Challenge's "AI Agent Skills" bonus.

```
skill/
└── mantleflow-distribution/
    ├── SKILL.md                       # name + description frontmatter + usage
    └── references/
        └── distribution-score.md      # methodology + ERC-8004 provenance
```

`mantleflow-distribution` wraps the MantleFlow MCP server (`@mantleflow/mcp`, stdio) so any
skills-aware agent can map RWA distribution on Mantle. To use it, point the agent at the MCP server
(see `mcp/README.md`) and load this skill folder.
