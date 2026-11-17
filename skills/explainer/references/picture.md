# A picture for the page

The plugin draws every form from your words, so those cannot come out wrong-looking. A picture is the
one part of a page you make yourself. Whether it is correct and whether it reads well are both yours to
check, and nothing downstream checks them for you.

## When a picture earns its place

A picture belongs on a page when seeing it gives the reader something the text and the drawn form leave
them to assemble in their head: how parts sit inside one another, where a boundary runs, what a thing
looks like, what depends on what, which of several things is the odd one, how an unfamiliar situation
matches a familiar one.

Before making anything, finish this sentence for the subject in front of you: "Seeing this, the reader
can tell ___." If the sentence only restates the title, or the form you chose already shows it, the page
is better without a picture. Most pages need none.

A picture also needs a tool that can make one well: image generation where your tool has it, or an SVG
you write yourself. If neither would give a result you would accept after the inspection below, leave
the picture out and say nothing about it on the page.

## Choose how to show it

What the reader should come to see decides the representation. A concept map, a structural breakdown, a
realistic scene, an analogy made visible, a side-by-side comparison, a few moments in sequence, a precise
chart, a close-up of one detail: these are possibilities, and you may combine them or use something else.
How realistic it is, how much depth it has, which objects appear, how many labels it carries, and the
order the eye should travel all follow from this subject and this reader, not from a house look.

An analogy has to hold part for part: each thing in the picture stands for one thing in the subject, and
the relationship between them is the same. An analogy that needs its own explanation costs the reader
more than it gives.

## Make it clear and well finished

Aim for a picture that could open a well-made course on the subject: clean, deliberate, easy to enter.

- **One focal point.** What the eye lands on first is what the page is about. Everything else is
  visibly secondary.
- **Structure before decoration.** Use hierarchy, grouping by proximity, alignment, space, and contrast
  between figure and ground so the reader knows where to start, what belongs together, and how the
  groups relate.
- **A disciplined palette.** One primary colour sets the tone and carries the core content and its main
  relationships. Supporting colours are quieter and separate groups or secondary information. An accent
  appears in few places, on the key fact, the difference, or the exception. Hold down the number of
  colours, their saturation, and the area each covers; many strong colours compete and the focal point
  disappears. A colour means the same thing everywhere in the picture.
- **Distinguish without adding hues.** Lighter and darker tones of one colour, line style, position, and
  labels separate things while the palette stays small.
- **Detail that helps recognition.** Material, light, volume, and texture stay when they help the reader
  recognise the object, the structure, or the setting, and go when they do not.
- **Labels that can be read.** Write them in the language of the page, keep them few, and give text
  strong contrast with what is behind it. The main idea should be readable when the picture is as narrow
  as a phone; the reader can enlarge it for fine detail, but should not have to for the point.
- **Its own light background.** The page shows the picture on a white panel in both light and dark
  themes, wider than it is tall.

## Inspect it twice

Open the finished image and look at it. A prompt or a description of the picture is not the picture.

1. **Is it right?** Every relationship, arrow direction, containment, label, condition, and analogy
   mapping matches the subject. Generated images often misspell or invent text, so read each label. Ask
   whether a reader could rebuild the explanation from the picture and its caption alone. A mistake in a
   picture is believed more readily than one in a sentence.
2. **Does it read?** The first glance lands on the focal point, the groups are evident, the colours help
   trace relationships, and the labels are legible at phone width.

These are separate judgements, so repair only the side that failed: a correct concept does not need
rethinking because the colours compete, and a handsome picture with a wrong arrow is still wrong. If it
still fails either check after revising, publish the page without it.

## Put it on the page

Save the file as `engram-quest/explainer/images/{id}.{png|jpg|webp|svg}`, under 3 MB, and add `image`
to the spec (fields in `spec-guide.md`). The page is drawn without the picture when the file is missing
or too large, so confirm the file is at that path under the name the spec gives.

Let the words and the picture share the work. The caption says what to read from the picture, something
its labels do not already say; the points do not narrate it again. A rewrite that keeps the picture keeps
the file, one that changes it replaces the file under the same name, and one that drops it deletes the
file.
