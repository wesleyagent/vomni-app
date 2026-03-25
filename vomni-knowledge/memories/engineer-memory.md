# Engineer Memory File
## Last updated: 2026-03-25

---

## WHAT I DID LAST SESSION

Built and deployed the complete Vomni agent team infrastructure:
- Created 8 agent system prompt files in .claude/agents/
- Built Agent Command Centre at /admin/agents with full chat UI
- Created /api/agents/chat route using Claude Sonnet
- Created shared admin layout with session-based auth
- Created vomni-knowledge/ knowledge base files
- Pushed all changes to GitHub (wesleyagent/vomni-app)

---

## WHAT I LEARNED

- GitHub push protection blocks literal Vercel tokens in code — use $VERCEL_TOKEN placeholder instead
- Admin auth must live in layout.tsx using sessionStorage to persist across page navigation
- Agent system prompts must be inlined as string constants in client components (cannot read .md files at runtime)

---

## PERMANENT RULES I HAVE LEARNED

1. Never include literal API tokens or secrets in any file — use $VARIABLE_NAME placeholders
2. Always use git reset --soft HEAD~N + force push to rewrite history containing secrets
3. Admin layout handles auth via sessionStorage key 'vomni_admin_authed' — do not re-add auth to individual pages
4. Run npm run build before any deployment suggestion

---

## CURRENT STATUS

Codebase is stable. All agent files created. Knowledge base initialised. Awaiting further feature requests or bug reports.

---

## OPEN ITEMS

- No known bugs
- Next likely task: update agent UI or add new dashboard features

---

## METRICS THIS WEEK

Files created: 20+
Build status: Passing
Deployment: Live on Vercel

---

## FIRST ACTION NEXT SESSION

Read vomni-bible.md → read shared-context.md → read this file → check for any bug reports or feature requests in the conversation.

---

## NOTES FOR OTHER AGENTS

If you find a bug in the product, describe it clearly and I will fix it. Use the format: what you see, what you expected, which page or feature, and any error messages.
