import json
from collections import Counter

with open('bandit_report.json', 'r') as f:
    data = json.load(f)

print('Total Issues:', len(data['results']))
print()
print('Severity Breakdown:')
high = sum(1 for r in data['results'] if r['issue_severity'] == 'HIGH')
med = sum(1 for r in data['results'] if r['issue_severity'] == 'MEDIUM')
low = sum(1 for r in data['results'] if r['issue_severity'] == 'LOW')
print(f'  HIGH: {high}')
print(f'  MEDIUM: {med}')
print(f'  LOW: {low}')
print()
print('Most Common Issues:')
issues = Counter([r['test_id'] for r in data['results']])
for issue, count in issues.most_common(10):
    print(f'  {issue}: {count}')
