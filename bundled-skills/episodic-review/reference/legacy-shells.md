# Legacy: the 3D shells

Before the map-and-diagram films, review films were staged in four three-dimensional shells: rooms (a dollhouse, one room per topic), rewind (a railway through a month), board (a cork board of cases) and castle. Their code and the catalogue of demo components are still in `assets/shells/` and `assets/demos/`, with their own notes.

They are not the default and are not chosen by this skill on its own initiative:

- they place content on screens and walls inside a scene, which conflicts with "content fills the frame";
- they render through software WebGL and take most of an hour per film where the current films take minutes.

Use one only when the user asks for it by name. Then follow the README inside that shell's folder, and still apply the content rules of this skill (whole topics, only what the notes say, retrieval). The older tools they rely on (`scripts/studio/render.cjs`, `farm.sh`, `plan_parts.py`, `join_parts.sh`, `keystills.py`) remain for that purpose.
