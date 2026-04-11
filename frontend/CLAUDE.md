# Pre-completion checklist

Before marking any task complete, run these in order:

```
tsgo -p .          # type check
bun run lint       # oxlint
bun run fmt:check  # oxfmt
bun run test       # vitest
```

All four must pass with 0 errors before claiming completion.
If `fmt:check` fails, run `bun run fmt` to auto-fix then re-check.
