# Continuous browser walkthrough

One continuous recording is the visual source. Chapter labels and camera poses direct attention without replacing the application footage. Motion uses the viewport-change rule, with kicker/name/baseline entrances adapted from the lt-kicker-name registry block.

## Chapter 1: Graphline in action

Source: continuous assets/screen.mp4, 0.00 to 18.87 seconds.

This is Graphline, an ANTIINTERNS support agent built for Graph Hacks. It uses Falkor DB to connect customers, conversations, policies and teams. We will follow real local interactions, see the agent take action, and inspect the graph records behind those decisions.

## Chapter 2: 01 / The connected inbox

Source: continuous assets/screen.mp4, 18.87 to 38.21 seconds.

The inbox loads its conversations and record counts from Falkor DB. This workspace contains only synthetic sample data. We can search for Maya and open her conversation. The chat is in the center. On the right, the application will show the actual decision path and earlier customer context.

## Chapter 3: 02 / A policy-based response

Source: continuous assets/screen.mp4, 38.21 to 59.59 seconds.

Maya says her delivery is late and the tracking has not changed. The agent matches words against keyword nodes in the graph. It follows the selected delivery intent to the approved delivery policy and the Logistics team. The reply asks for an order number. The decision panel explains the path and identifies the reply source as graph policy.

## Chapter 4: 03 / The graph creates a ticket

Source: continuous assets/screen.mp4, 59.59 to 80.91 seconds.

Now Maya requests a refund. That matches a different intent. The connected returns policy requires a person, so the agent creates a ticket in Falkor DB and links it to the conversation, the intent and the Returns team. The ticket count updates from the live graph. This is a recorded action, not just a generated suggestion.

## Chapter 5: 04 / Explicit handoff and safe fallback

Source: continuous assets/screen.mp4, 80.91 to 99.84 seconds.

Ari asks to speak with a human agent. The graph routes the case to Support and creates a ticket. An unrecognized invoice question also falls back to human assistance. This prototype records the handoff and replies with that outcome. It does not simulate a support employee completing the case.

## Chapter 6: 05 / Memory across conversations

Source: continuous assets/screen.mp4, 99.84 to 123.85 seconds.

Next, we create a fresh conversation using the same synthetic customer name. Graphline links it to the existing customer record. After a new delivery message, the agent traverses that customer's earlier conversations and retrieves their messages. The memory panel shows the actual earlier exchange, including the refund request, across the conversation boundary.

## Chapter 7: 06 / Records survive a browser reload

Source: continuous assets/screen.mp4, 123.85 to 138.97 seconds.

Reloading the browser keeps the customer conversations and ticket counts. They are retrieved again from Falkor DB. The interface is a view over persistent graph records. It is not keeping the customer history only in browser memory.

## Chapter 8: 07 / Inspect the live graph

Source: continuous assets/screen.mp4, 138.97 to 158.37 seconds.

This read only presenter view runs Cypher directly against the same demonstration graph. The first query follows each intent to its policy and responsible team. The next query shows the tickets we just created, along with their assigned teams. These results are read from Falkor DB while this recording is running.

## Chapter 9: 08 / Prove the memory traversal

Source: continuous assets/screen.mp4, 158.37 to 181.64 seconds.

The memory query follows Maya's customer node to every connected conversation and message. The earlier and later messages appear together because the customer relationship connects them. The graph summary also shows the real node and relationship counts. Removing Falkor DB removes the records, routing context, policies and ticket actions this application depends on.

## Chapter 10: 09 / AI integration and honest scope

Source: continuous assets/screen.mp4, 181.64 to 206.82 seconds.

The source includes optional OpenRouter reply drafting. Without a configured key, as in this recording, the graph's stored response is used. A language model can help phrase an answer, but the graph still owns intent matching, memory, routing and ticket creation. This standalone prototype does not connect to WhatsApp or send external messages. A real channel adapter is future integration work.

## Chapter 11: 10 / Run it locally

Source: continuous assets/screen.mp4, 206.82 to 230.07 seconds.

The public repository contains the source, graph model, Cypher queries and local setup instructions. Start Falkor DB with Docker Compose, then run npm start. The README discloses Codex assistance and the project's scope. Graphline demonstrates connected data actions and persistent customer memory. ANTIINTERNS. We take work personally.
