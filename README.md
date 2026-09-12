# IncidentPilot

IncidentPilot is a Cloudflare AI agent system and not a chat wrapper. It must investigate simulated operational incidents using tool calling, persist conversation context across channels, require real human approval before mutations, run remediation through durable Workflows, and verify outcomes honestly.

The central design feature is the Context ID (NWE-016): a human-readable conversation reference that is separate from incidents (INC-42), workflows (WF-93), and internal UUIDs. Web and Slack are adapters only with one Agent, one tool set, one memory model, one workflow implementation.
