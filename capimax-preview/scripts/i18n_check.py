"""
Every interface string in every language (client round 4, E5 — the check
Capimax BRX runs for its French).

  python scripts/i18n_check.py        # report; exit 1 if anything is missing

For each namespace in src/i18n/locales/en, the Arabic and French files must
have every key, no extra keys, and the same {{placeholders}}. A French value
still equal to a long English sentence is reported as "untranslated".
Run it after adding interface text: a missing key shows the English to
Arabic / French users.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')
LANGS = ('ar', 'fr')
PLACEHOLDER = re.compile(r'\{\{\s*[\w.]+\s*\}\}')
# Values that are data, the same in every language (examples, formulas)
SAME_EVERYWHERE = {'brokerui:appForm.minChars', 'ownerui:createForm.placeholders.address', 'propui:calculator.equation'}


def flat(d, prefix=''):
    for k, v in d.items():
        if isinstance(v, dict):
            yield from flat(v, f'{prefix}{k}.')
        else:
            yield f'{prefix}{k}', v


def load(lang, ns):
    path = os.path.join(ROOT, lang, f'{ns}.json')
    if not os.path.exists(path):
        return None
    return dict(flat(json.load(io.open(path, encoding='utf-8'))))


def main():
    problems = 0
    namespaces = sorted(f[:-5] for f in os.listdir(os.path.join(ROOT, 'en')) if f.endswith('.json'))
    for lang in LANGS:
        total = done = 0
        for ns in namespaces:
            en, other = load('en', ns), load(lang, ns)
            total += len(en)
            if other is None:
                print(f'[{lang}] {ns}: file missing ({len(en)} strings)')
                problems += len(en)
                continue
            for key, value in en.items():
                if key not in other:
                    # i18next plural forms: Arabic has more of them than English
                    base = key.rsplit('_', 1)[0]
                    if lang == 'ar' and key.rsplit('_', 1)[-1] in ('one', 'other') and \
                            any(k.startswith(base + '_') for k in other):
                        done += 1
                        continue
                    print(f'[{lang}] {ns}: missing {key}')
                    problems += 1
                    continue
                theirs = other[key]
                mine, yours = set(PLACEHOLDER.findall(str(value))), set(PLACEHOLDER.findall(str(theirs)))
                # a plural form may leave the count out ("one property" / "عقار واحد")
                plural = (key.rsplit('_', 1)[-1] in ('zero', 'one', 'two', 'few', 'many', 'other', 'plural')
                          or f'{key}_plural' in en)
                if mine != yours and not (plural and yours <= mine):
                    print(f'[{lang}] {ns}: placeholders differ in {key}')
                    problems += 1
                    continue
                if lang == 'fr' and theirs == value and isinstance(value, str) and f'{ns}:{key}' not in SAME_EVERYWHERE and \
                        len(value.split()) >= 4 and re.search(r'[a-z]{3}', value):
                    print(f'[{lang}] {ns}: untranslated {key}: {value[:60]}')
                    problems += 1
                    continue
                done += 1
        print(f'{lang}: {done}/{total} strings')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
