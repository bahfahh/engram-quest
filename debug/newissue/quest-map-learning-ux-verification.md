# Quest Map Learning UX Verification Standard

Date: 2026-05-19
Area: quest-map skill generation and runtime challenge feedback

This document is the acceptance standard for the quest-map optimization work. Final code review must use these user stories as the checklist. A change is not complete if it improves the parser or UI mechanics but fails the learning experience described here.

## Assumed Test Material

Use Agentic Testing material as the review fixture:

- Testcontainers lifecycle
- Integration tests across API, DB, service, and background jobs
- `truncate/reseed` vs transaction rollback
- Human gate / reviewer responsibilities
- Failure diagnosis beyond HTTP status code assertions

The exact source note can vary, but review examples should include realistic testing decisions and failure modes.

## User Story 1: Bad Cloze Prevention

As a learner, when I see a cloze challenge, I want the blank to target a meaningful memory object, not a random missing word, so that filling it strengthens understanding instead of guessing what the generator removed.

Review checks:

- Cloze blanks must target decision rules, core terms, critical differences, failure causes, or architecture nodes.
- Cloze blanks must not target random verbs, filler words, numbers, dates, names, or low-value nouns.
- Cloze challenges must display enough context before the sentence when the sentence alone is ambiguous.
- Wrong answers must reveal both the correct answer and why that blank matters.

Reject examples:

- `Docker should run in {{c1::beforeAll}}.` with no surrounding context.
- `FSRS has {{c1::17}} parameters.`
- Any cloze whose answer is only useful because the source sentence was memorized verbatim.

Accept example:

```yaml
challenge:
  type: cloze
  question: What condition makes transaction rollback reliable in integration tests?
  sentence: "Transaction rollback is reliable only when test and app writes stay inside the same {{c1::connection and transaction scope}}."
  answers: [connection and transaction scope, same connection, same transaction]
  explanation: Rollback only controls writes in its own transaction scope. API requests or background jobs can open separate DB connections, so truncate/reseed is safer there.
```

## User Story 2: Playable Learning Rhythm

As a learner, I want the quest to feel like a learning map with rising challenge, not a passive note followed by a test dump, so that each round builds on the previous one.

Review checks:

- The default rhythm should be short lesson -> challenge -> short lesson -> challenge -> recap -> boss.
- A challenge round must test the lesson immediately before it, unless it is the boss round testing the recap.
- Consecutive rounds should not feel identical. If the same challenge type repeats, the cognitive job must change.
- Boss must not become a wall of cloze/input questions.

Accept rhythm:

```text
Lesson: transaction scope basics
Round: truefalse/quiz recognition
Lesson: why API + background jobs escape rollback
Round: match symptoms to isolation strategy
Recap: decision rule for rollback vs truncate/reseed
Boss: scenario diagnosis + repair order + one keyword recall
```

## User Story 3: Deterministic Boss Judgment

As a learner, I want boss questions to test integrated judgment while still being fairly graded by the plugin, so that I can trust the result without needing an AI judge.

Review checks:

- Boss questions may be scenario-based, but the answer must be deterministic.
- Use quiz, match, order, chain, input keywords, cloze, auction, or countdown to grade the answer.
- Avoid free-form essay prompts unless the runtime later supports AI grading or explicit self-check mode.
- Every boss question should have an explanation that teaches the decision rule.

Reject example:

```yaml
question: API + DB + background job tests are flaky. What would you do and why?
```

Accept example:

```yaml
challenge:
  type: quiz
  question: API + DB + background job integration tests use transaction rollback, but data still leaks between tests. What is the most likely cause?
  options: [The test did not wait long enough, App code opened a DB connection outside the test transaction, The HTTP status assertion is wrong, Testcontainers starts too slowly]
  answer: 1
  explanation: Transaction rollback only reverts writes in the same connection and transaction scope. App requests and background jobs commonly use separate connections.
```

## User Story 4: Wrong Answer Learning Feedback

As a learner, when I answer incorrectly or reveal the answer, I want the quest to show what happened and teach the misconception, not mark the round as perfect.

Review checks:

- Round score must count first-try correct answers, not eventual completion after reveal.
- Round review must distinguish correct, missed, and revealed/recovered answers.
- Revealing an answer must not increment the first-try score.
- Review must show `explanation` or `explain` before falling back to `hint`.
- `truefalse`, `input`, `text`, `cloze`, and `image-quiz` keyword mode must all support understandable feedback.

Accept behavior:

- A learner types a wrong `input` answer.
- The UI offers `Show answer`.
- After reveal, the current question can proceed, but round summary marks it as missed/revealed and explains the rule.

## User Story 5: Fun Serves Memory

As a learner, I want the game mechanics to make the memory task more engaging and more precise, not just decorate a quiz, so that the quest feels playful while still improving recall.

Review checks:

- Use order/chain for process memory.
- Use match for concept-definition or symptom-strategy pairing.
- Use auction/countdown when confidence, pressure, or easily confused options matter.
- Use input/cloze sparingly for precise free recall.
- Across a normal quest, use at least two interaction styles unless the source note is tiny.
- Boss should test decision rules, tradeoffs, failure diagnosis, or synthesis.

Accept boss concept:

```text
Testing Incident Commander

1. Scenario quiz: diagnose why rollback leaks data.
2. Match: pair test shape to isolation strategy.
3. Order/chain: repair setup sequence.
4. Input: recall the one condition that makes rollback reliable.
```

## Final Review Checklist

Final code review must answer these five questions:

- Does this prevent bad cloze generation and display?
- Does this support a playable lesson/challenge rhythm?
- Are boss answers deterministic and plugin-gradable?
- Does wrong-answer feedback teach instead of hiding mistakes?
- Do fun mechanics serve memory and understanding?

If any answer is no, the work is not complete.
