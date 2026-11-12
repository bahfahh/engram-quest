#!/usr/bin/env python3
"""Decide the language of a recall film and report what follows from it (JSON on stdout).

  python3 film_lang.py [--vault <vault root>] [--lang zh-tw|en|<language tag>]

Order: --lang > engram-quest/videos/settings.json narrationLang (zh-tw | en) > zh-tw with a note.
"follow" or an unset narrationLang means the language of the source notes, else the language the user writes in:
this script cannot read that, so pass it with --lang once the notes are read.

Output: lang, source, reading {unit, calibrated}, shellStrings (true when the film template has interface wording for it), voice, notes[].
A language with no tested setting still resolves: its gaps are listed in notes, nothing stops or falls back to Chinese.
"""
import argparse, json, os, re

SHELL_LANGS = ('zh-tw', 'en')
VOICES = {'zh-tw': 'zh-TW-HsiaoChenNeural', 'en': 'en-US-AndrewMultilingualNeural'}
WORD_UNITS = 1.75   # one word in a language written with spaces, in units of the 5-per-second character rule
CJK = '㐀-鿿぀-ヿ'
_WORD = rf"[^\W_{CJK}]+(?:['’.\-][^\W_{CJK}]+)*"
_TOKEN = re.compile(rf'[{CJK}]|{_WORD}')


def normalise(lang):
    """Lowercase tag; regional English and Traditional Chinese tags map to the sets the film template carries."""
    tag = lang.strip().replace('_', '-').lower()
    if tag.split('-')[0] == 'en':
        return 'en'
    return 'zh-tw' if tag.startswith('zh-hant') else tag


def per_word(lang):
    """Chinese and Japanese are read per character; languages written with spaces per word."""
    return not re.match(r'zh|ja', lang)


def word_units(s):
    """Reading units of text in a per-word language: a word = WORD_UNITS, a CJK character = 1, punctuation = 0."""
    return sum(1.0 if re.fullmatch(f'[{CJK}]', t) else WORD_UNITS for t in _TOKEN.findall(s))


def reading_note(lang):
    if lang in SHELL_LANGS:
        return None
    unit = 'word' if per_word(lang) else 'character'
    return f'reading rate for {lang} is not calibrated: counted per {unit}; confirm by reading the stills'


def resolve(vault, requested):
    notes = []
    settings_path = os.path.join(vault, 'engram-quest', 'videos', 'settings.json')
    if not os.path.isdir(os.path.join(vault, 'engram-quest')):
        notes.append(f'{vault} has no engram-quest folder, so settings.json was not read: pass --vault <vault root>')
    try:
        setting = json.load(open(settings_path, encoding='utf-8')).get('narrationLang')
    except (OSError, ValueError):
        setting = None
    if requested:
        lang, source = normalise(requested), '--lang'
    elif setting in SHELL_LANGS:
        lang, source = setting, 'settings.json narrationLang'
    else:
        lang, source = 'zh-tw', 'default'
        notes.append('narrationLang is "follow" or unset: re-run with --lang <language of the source notes, else of the user>')
    if lang not in SHELL_LANGS:
        notes.append(f'no interface strings for {lang}: write the fixed wording of the film (titles, prompts) in that language yourself')
        notes.append(f'no tested voice for {lang}: pick one from edge-tts --list-voices and check it by ear before any narration')
        notes.append(f'the fonts of the template cover Latin, Cyrillic, Vietnamese and Traditional Chinese: another script needs its own font in the project')
    if reading_note(lang):
        notes.append(reading_note(lang))
    return {'lang': lang, 'source': source,
            'reading': {'unit': 'word' if per_word(lang) else 'character', 'calibrated': lang in SHELL_LANGS},
            'shellStrings': lang in SHELL_LANGS, 'voice': VOICES.get(lang), 'notes': notes}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--vault', default='.')
    ap.add_argument('--lang')
    a = ap.parse_args()
    print(json.dumps(resolve(a.vault, a.lang), ensure_ascii=False, indent=2))
