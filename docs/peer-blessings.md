# Peer Blessings

A peer Blessing means the frozen evidence reasonably satisfies the visible task requirements.

Default threshold: three Blessings.

The threshold is not reduced silently when reviewer supply is insufficient. Cerbanimo emits a shortage event/notification and attempts recovery. Policy timeout advancement may satisfy the gate only when the snapshotted policy and risk tier allow it.

Peer reviewers are selected deterministically from eligible project or community members, skill relevance, review load, recency, availability, and stable tie-breakers. LLMs do not select reviewers.

Conflicts exclude the contributor, bundle owner, evidence author, task assignee by default, task creator, project creator, PM reviewer, validation reviewer who overrode the result, automation actor, and already assigned reviewers.
