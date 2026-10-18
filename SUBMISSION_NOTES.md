# Submission and participant walkthrough

## Demo story

1. Open a seeded synthetic customer conversation.
2. Send: “My delivery is late and tracking has not changed.”
3. Show the path: graph keyword → delivery intent → delivery policy → Logistics team. The system replies from the policy stored in FalkorDB.
4. Send: “I returned my item and need a refund.” in a return conversation. The graph selects Returns, creates a ticket, and assigns it to the Returns team.
5. Send: “Please connect me with a human agent.” The graph creates and routes a Support ticket.
6. Create another conversation for the same customer and demonstrate customer history traversal across conversations.
7. In FalkorDB's query UI, show the linked graph nodes and relationships; explain how removing FalkorDB removes the application state and agent decisions.

## What to explain to judges

- **Graph as data model:** Customer, Conversation, Message, Intent, Keyword, Policy, Team and Ticket are graph entities. Relationships describe their meaning and allow multi-hop retrieval.
- **Agent decision:** The incoming message matches graph-connected keyword nodes; the best matching intent selects connected policy and team nodes. The `requiresHuman` property determines whether to create a ticket.
- **Memory:** Messages persist as graph nodes. A customer-to-conversation traversal gathers earlier conversation records without relying on a separate transcript database.
- **Coordination:** Team nodes represent destinations; tickets connect the active conversation, intent and assigned team.
- **Trade-off:** Keyword matching is deterministic and explainable, but limited. Production would need configurable vocabulary, ambiguity handling, proper access controls, delivery retries and a channel integration.
- **Optional language model:** With an OpenRouter key configured, a model drafts the reply using only the matched graph policy and retrieved customer history. Without a key, the graph's stored reply is used. The graph always owns routing, memory and ticket decisions.

## Authorship and timing

OpenAI Codex assisted with source code, UI, and documentation. The participant is responsible for reviewing, understanding, testing, and explaining the submitted work. The existing WhatsApp automation platform was not authored for this hackathon; this separate FalkorDB-first prototype was started on 18 October 2026. Keep the separate source directory and Git history intact to make the work boundary clear.

## Submission checklist

- [x] FalkorDB is the operational database for this prototype.
- [x] Graph data model and Cypher patterns documented.
- [x] Synthetic data only.
- [x] Track names included in README: Agents That Act on Connected Data; Agent Memory and Coordination.
- [x] Local setup instructions included.
- [x] Publish a public source repository: https://github.com/asintha1a/antiinterns-graphline.
- [x] Include a full narrated demo video with continuous browser recording of graph-backed actions and live read-only Cypher evidence.
- [ ] Confirm current event rules and entry eligibility with organizers before submitting.
