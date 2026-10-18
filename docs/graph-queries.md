# FalkorDB graph model and Cypher queries

The application persists data in the `antiinterns_support` FalkorDB graph. The web server issues each query with `GRAPH.QUERY` in [`server.js`](../server.js). These query shapes show the graph operations that make the product work.

## Seed business knowledge

For each intent, the seed creates a route, policy, and keyword nodes and connects them:

```cypher
UNWIND $intentRows AS row
MERGE (i:Intent {id: row.id})
SET i.name = row.name,
    i.route = row.route,
    i.reply = row.reply,
    i.requiresHuman = row.requiresHuman
MERGE (p:Policy {id: row.id + '-policy'})
SET p.title = row.policy,
    p.guidance = row.guidance
MERGE (t:Team {name: row.route})
MERGE (i)-[:GOVERNED_BY]->(p)
MERGE (i)-[:ROUTES_TO]->(t)
FOREACH (term IN row.terms |
  MERGE (k:Keyword {term: term})
  MERGE (i)-[:MATCHES]->(k)
)
```

The executable uses a literal `UNWIND` array in place of `$intentRows`; it uses the same relationships.

## Match an incoming message to connected intent keywords

```cypher
MATCH (i:Intent)-[:MATCHES]->(k:Keyword)
WHERE toLower($message) CONTAINS toLower(k.term)
WITH i, count(k) AS score
ORDER BY score DESC
LIMIT 1
RETURN i.id, i.name, i.requiresHuman, i.reply, score
```

The application quotes message strings as Cypher string literals before submitting them. If no keyword matches, it selects the graph's `human-help` intent as the safe fallback.

## Retrieve policy and routing team by traversing the intent

```cypher
MATCH (i:Intent {id: $intentId})-[:GOVERNED_BY]->(p:Policy),
      (i)-[:ROUTES_TO]->(t:Team)
RETURN i.name, p.title, p.guidance, t.name, i.reply, i.requiresHuman
```

The generated reply, route, handoff choice, and displayed explanation are read from this connected graph context.

## Create a ticket and assign it to the selected team

```cypher
MATCH (c:Conversation {id: $conversationId}),
      (t:Team {name: $teamName})
MERGE (ticket:Ticket {id: $ticketId})
SET ticket.status = 'open',
    ticket.reason = $intentName,
    ticket.createdAt = timestamp()
MERGE (c)-[:HAS_TICKET]->(ticket)
MERGE (ticket)-[:ASSIGNED_TO]->(t)
MERGE (ticket)-[:ABOUT_INTENT]->(i:Intent {id: $intentId})
```

Tickets only get created when the selected policy's intent is marked `requiresHuman`.

## Retrieve persistent customer conversation memory

```cypher
MATCH (current:Conversation {id: $conversationId})-[:FOR_CUSTOMER]->
      (u:Customer)-[:HAS_CONVERSATION]->
      (past:Conversation)-[:HAS_MESSAGE]->(m:Message)
WHERE past.id <> current.id
RETURN u.name, past.id, m.text, m.direction, m.createdAt
ORDER BY m.createdAt DESC
LIMIT 4
```

This is graph traversal across conversation boundaries, not a text search over a separate transcript store.

## Load inbox and graph-backed counts

```cypher
MATCH (c:Conversation)-[:FOR_CUSTOMER]->(u:Customer)
OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:Message)
RETURN c.id, u.id, u.name, c.status, c.updatedAt,
       m.id, m.text, m.direction, m.createdAt
ORDER BY c.updatedAt DESC, m.createdAt DESC
```

The UI also queries `MATCH (n:Label) RETURN count(n)` for its visible record counts.
