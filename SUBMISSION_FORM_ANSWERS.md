# Graph Hacks submission form answers

Paste these into the WeMakeDevs form. The video field still needs a public or unlisted YouTube upload of `demo.mp4`.

## Project Details

### Project title

Graphline: Connected Memory for WhatsApp Support

### Description

Support teams often answer the same questions across many conversations, while important customer history and the reason behind a routing decision can be easy to miss. Graphline is a working support-agent prototype for teams that need clear, consistent answers and human handoffs.

When a customer sends a message, Graphline stores it in FalkorDB and follows graph relationships from matched keywords to an intent, its approved response policy, and the responsible team. If the case needs a person, it creates a ticket assigned to that team. It can also retrieve earlier conversations for the same customer, so the agent can use context from previous sessions. The interface shows the graph path behind each decision.

The project uses synthetic demonstration data and does not connect to WhatsApp or send messages externally. It is a standalone prototype inspired by a separate, pre-existing ANTIINTERNS WhatsApp platform. OpenAI Codex assisted with coding and documentation. The participant is responsible for reviewing and explaining the implementation.

### Tracks

- Agents That Act on Connected Data
- Agent Memory and Coordination

### Repository

https://github.com/asintha1a/antiinterns-graphline

### Demo video

Upload `demo.mp4` to YouTube as Public or Unlisted, then paste its YouTube watch link here. Do not paste a local file path. The MP4 is included in the repository and project ZIP.

### Live demo or deployment

Leave blank. This prototype is provided with complete local setup instructions in the repository README. Run `docker compose up -d`, then `npm start`, and open `http://localhost:4173`.

### How did you use FalkorDB in your project?

FalkorDB is the application's primary and only application database. It stores the customers, conversations, messages, intents, keywords, response policies, support teams, and tickets as connected graph data. The agent uses Cypher queries to match message keywords to an intent, traverse from that intent to its response policy and assigned team, and create a graph-linked ticket when a human handoff is needed. It retrieves a customer's earlier conversations by traversing customer, conversation, and message relationships across sessions. These graph queries determine the agent's routing, response source, memory, and handoff actions. Without FalkorDB, the application has no stored conversation state or decision context. The graph model and executable Cypher patterns are documented in the README and `docs/graph-queries.md`.

### Blog link

Leave blank unless you publish a blog post. This field is optional.

## Feedback

### What did you like about FalkorDB?

I liked being able to represent conversations, customer history, policies, and team ownership as connected data, then use Cypher traversals directly in the agent's decision flow. The Redis-compatible interface also made it practical to run the graph locally with Docker and keep the prototype setup small.

### What improvements would you like to see in FalkorDB?

I would like more beginner-friendly examples for production agent patterns, especially persistent conversation memory, explainable routing, and safe human handoffs. Clearer guidance for inspecting query plans and diagnosing slow or unexpected graph traversals would also help teams move from a hackathon prototype to a production service.

## Before clicking submit

- Replace the video placeholder with the actual YouTube link after uploading `demo.mp4`.
- Confirm that the project owner has reviewed the graph model and can explain the Cypher, architecture, and decisions.
- Confirm the current eligibility interpretation with the organizers if any code or design for this standalone prototype was created before October 15, 2026. The pre-existing WhatsApp platform is separate and is not the submission.
- Submit before 11:59 PM IST on October 18, 2026.
