from pathlib import Path
import json

entries = {
    'activity': {
        'en': {
            'contributions.commands.verstak.activity.search.title': 'Search Activity',
            'contributions.searchProviders.verstak.activity.search-provider.label': 'Activity',
        },
        'ru': {
            'contributions.commands.verstak.activity.search.title': 'Искать в активности',
            'contributions.searchProviders.verstak.activity.search-provider.label': 'Активность',
        },
    },
    'browser-inbox': {
        'en': {
            'contributions.commands.verstak.browser-inbox.search.title': 'Search Browser Materials',
            'contributions.searchProviders.verstak.browser-inbox.search-provider.label': 'Browser',
        },
        'ru': {
            'contributions.commands.verstak.browser-inbox.search.title': 'Искать в материалах браузера',
            'contributions.searchProviders.verstak.browser-inbox.search-provider.label': 'Браузер',
        },
    },
    'journal': {
        'en': {
            'contributions.commands.verstak.journal.search.title': 'Search Journal',
            'contributions.searchProviders.verstak.journal.search-provider.label': 'Journal',
        },
        'ru': {
            'contributions.commands.verstak.journal.search.title': 'Искать в журнале',
            'contributions.searchProviders.verstak.journal.search-provider.label': 'Журнал',
        },
    },
}

for plugin, locales in entries.items():
    for locale, additions in locales.items():
        path = Path('plugins') / plugin / 'locales' / f'{locale}.json'
        data = json.loads(path.read_text())
        for key, value in additions.items():
            if key in data:
                raise SystemExit(f'{path}: key already exists: {key}')
            data[key] = value
        path.write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, indent=2) + '\n')

print('Search contribution locales added')
