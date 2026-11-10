# Designing the practice

How to get from an ability to a mission worth playing. Everything here is a way of thinking about
the design; none of it is a form to fill in. Subjects differ too much for one shape to fit, so
each section gives the aim and the questions that help reach it. A point that has nothing to
attach to in your subject is skipped, not forced.

## Contents

1. From an ability to a situation
2. The material on the desk
3. What the learner does
4. Committing, and what comes back
5. The score
6. Difficulty
7. The briefing
8. The boss
9. Before a mission stays

## 1. From an ability to a situation

An ability is something a person does, in some place, for some reason. Four questions find the
mission in it:

- **Where is this actually needed?** Who is the person, what is in front of them, what are they
  trying to get done, and what is pressing on them?
- **What do they look at?** The report, the instrument, the draft, the patient's chart, the
  half-built thing.
- **What do they do next?** The act that shows the ability.
- **What happens when they get it wrong, and when do they find out?**

A situation is right for a mission when the answers are concrete enough to draw. Choose one the
source did not use as its own example: the same idea with different numbers, a different
setting, or a complication the source only mentioned. One mission exercises one ability, or a
small cluster that is always used together.

When the source is thin on applied cases, build one from how the subject is practised. The
source is the authority for its own conventions (a house style, a team's process, the user's
own rules). Anything else the mission's judgment will rest on — typical values, what counts as
good practice, what a real instrument shows — is checked instead of trusted to memory, because
a mission that scores the learner against a wrong fact teaches the wrong fact.

The mission names the ability it exercises, in its header and in `mission_goal`. The learner
reads that line before playing, so it says what is being practised the way a course outline
would, and never lists what the score will check.

## 2. The material on the desk

The material is what the practitioner would have in front of them, shown the way they would see
it. It carries the mission: the learner should be able to tell what kind of work this is before
reading the instructions.

- **Show the thing, not a description of it.** A table of results, a drawing of the apparatus,
  the document with its real clauses, the timeline, the sound written as it is heard. Draw
  structure and data with HTML, CSS and inline SVG. When the thing has shape and texture that a
  drawing cannot give (anatomy, a posture, a specimen, a place) and image generation is
  available, generate it, and keep every word and number the learner must read exactly in HTML
  on or beside the image. Without image generation, draw what can be drawn; never leave a
  placeholder.
- **It contains what a real case contains**, including what is irrelevant. How much is
  irrelevant is one way to set difficulty.
- **It does not contain the answer.** If a summary, a highlighted cell or the order of the
  options points at the right decision, the learner is reading the hint, not the material.
  Things a practitioner would only learn after acting stay hidden until the learner acts.
- **Evidence can be looked for.** When a practitioner would go and check something, let the
  learner open it, at no cost unless looking has a real cost.
- **Invented data says so.** One quiet line is enough. Where a real decision of this kind could
  hurt someone (medicine, law, safety, money), the same line says the mission is a study
  simulation.

## 3. What the learner does

The action is the ability made visible. Take it from the work: marking what is wrong on the
material itself, adjusting a setting and running the thing, ordering, sorting, building an
answer from parts, estimating before a result is revealed, writing a short piece, choosing
where to look. A choice among written options fits when the real decision is a choice among
options; when it is not, a list of options turns the mission into a quiz and lets the learner
recognise an answer they could not have produced.

Whatever the action is:

- **The learner can always see what they have done so far**, and change it until they commit.
- **It works with a finger on a phone** as well as a pointer on a desktop. A gesture that only
  one of them can make needs an equal alternative.
- **Something that looks operable is operable, and nothing else is.**
- **Nothing gives the answer away by its form**: the longest option, the only specific one, the
  one that repeats the source's wording.

**When the learner produces something** — a number, a sentence, an arrangement — the page has
to judge it with no model and no network, and the mission is only as fair as that judgment.

- Ask for the work the ability is about, not for the arithmetic or typing around it. Keep
  numbers workable, or put the tool a practitioner would have on the desk, and accept the range
  a practitioner would call right.
- Give writing a form the page can judge truly: the missing clause, the order of the parts,
  the facts it has to agree with. Where the page can only look for features of a free text,
  say on the page that rules are reading it, show the learner's text with what was noticed,
  and set a strong version beside it. Score what the rules can stand behind; the comparison
  does the rest.

## 4. Committing, and what comes back

The learner decides when their work is ready, and says so with one clear action. Then:

1. **The material shows the consequence.** The same report with next month's figures, the
   mechanism running with their setting, their mark turned right or wrong and the place they
   should have marked. A learner who sees what their decision did remembers the reason for it.
2. **Each decision gets its reason**: why it holds or does not, and why the tempting
   alternative is weaker. A defensible-but-weaker decision is told what it cost.
3. **The learner moves on when they have read it.** The shared script shows the finish button
   with the verdict and sends the score only when it is pressed.

When a mission allows another try, the retry is part of the design: it costs something the
situation would really cost (time, material, a worse position), and the score reflects it.
When a mission has several stages, what is shown after one stage does not hand over the answer
to a later one.

## 5. The score

The plugin records one number from 0 to 100 per node. Make it mean something:

- **It is built from what the ability consists of.** Finding the problem and choosing the remedy
  are two things; so are the outcome and the way it was reached. Score them separately and show
  each part with its reason.
- **Partial credit follows the work.** A decision a practitioner would call acceptable earns
  part of the points; one that makes things worse earns none.
- **Guessing does not pay.** If a random learner would score well, the mission is measuring
  luck: ask for something that has to be produced, or score the reasoning as well as the result.
- **The same play always gives the same score.**

## 6. Difficulty

A quest is `easy`, `medium` or `hard`. The difference is in how much the learner has to do
unaided, not in how obscure the facts are:

- how much of the material is noise, and whether the relevant part is pointed at;
- how many things have to be weighed at once;
- whether the situation says what kind of problem it is;
- how costly a wrong step is, and whether there is room to recover.

## 7. The briefing

A briefing node is text the plugin draws itself: its `summary`, then each entry of `points` as a
titled paragraph (`html-first-contract.md`). Use it for what the learner needs before the first
mission — the setting, who they are in it, the terms the missions use — and stop. It is not a
recap of the lesson, and whatever a mission needs can also sit in that mission's own case
header.

## 8. The boss

The boss is the last node and the reason for the others: a situation that needs several of the
quest's abilities together, the way real work does.

- **It unfolds.** Several decisions in sequence, where an earlier one changes what the learner
  faces later: a different document arrives, an option is gone, a figure has moved. The change
  follows from the decision by a cause the learner can see, never as a penalty from nowhere.
- **The state of the situation is on the page**, and each decision visibly moves it. Keep it
  beside the decision in play; the house style has a surface for it.
- **Every choice is one a competent person might make.** The situation decides which is best.
- **The ending is the consequence** of the path taken, and the score shows where it was won or
  lost.

Match the tone to the subject. An incident, an examination, a performance, a negotiation and an
experiment each feel different, and none of them needs to look like an emergency.

## 9. Before a mission stays

- Could someone finish it well without the ability, by elimination, pattern or luck? What does
  the laziest play score: everything marked, every default left, every field the same?
- Is the action something a practitioner does, or something only a test asks for?
- If the material were removed, would the mission still make sense? Then the material is
  decoration.
- After committing, does the learner see what changed before they read why?
- Would a mission on a completely different subject come out with the same layout? Then the
  layout came from habit, not from this content.
- Is anything there because missions usually have it?
