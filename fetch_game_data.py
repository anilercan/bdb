import json
import requests
from urllib.parse import quote
import time
import re
import sys

# Configure output encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

def slugify(title):
    """Convert game title to backloggd slug format"""
    # Remove special characters and convert to lowercase
    slug = title.lower()
    # Replace special characters
    slug = slug.replace(':', '')
    slug = slug.replace("'", '')
    slug = slug.replace('.', '')
    slug = slug.replace(',', '')
    slug = slug.replace('!', '')
    slug = slug.replace('?', '')
    slug = slug.replace('&', 'and')
    slug = slug.replace(' - ', '-')
    slug = slug.replace('  ', ' ')
    slug = slug.strip()
    # Replace spaces with hyphens
    slug = slug.replace(' ', '-')
    # Remove multiple hyphens
    slug = re.sub(r'-+', '-', slug)
    return slug

def fetch_backloggd_data(game_title):
    """Fetch game data from Backloggd"""
    slug = slugify(game_title)
    url = f"https://backloggd.com/games/{slug}/"

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            html = response.text

            # Extract IGDB cover image URL
            # Look for pattern like: https://images.igdb.com/igdb/image/upload/t_cover_big_2x/
            cover_match = re.search(r'(https://images\.igdb\.com/igdb/image/upload/t_cover_big[^"\']*)', html)

            if cover_match:
                cover_url = cover_match.group(1)
                # Clean up the URL if needed
                cover_url = cover_url.split('"')[0].split("'")[0]
                return {
                    'link': url,
                    'cover': cover_url
                }
            else:
                print(f"  ⚠️  No cover found for: {game_title}")
                return {
                    'link': url,
                    'cover': ''
                }
        else:
            print(f"  ❌ Failed to fetch (status {response.status_code}): {game_title}")
            return None

    except Exception as e:
        print(f"  ❌ Error fetching {game_title}: {str(e)}")
        return None

def update_games_json():
    """Update storygames.json with Backloggd links and cover images"""

    # Read the JSON file
    with open('data/storygames.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    total = len(items)
    updated = 0
    skipped = 0

    print(f"Processing {total} games...\n")

    for i, item in enumerate(items, 1):
        title = item['title']

        # Skip if already has both link and cover
        if item.get('link') and item.get('cover'):
            print(f"[{i}/{total}] ⏭️  Skipping (already complete): {title}")
            skipped += 1
            continue

        print(f"[{i}/{total}] 🔍 Fetching: {title}")

        game_data = fetch_backloggd_data(title)

        if game_data:
            item['link'] = game_data['link']
            item['cover'] = game_data['cover']
            updated += 1
            print(f"  ✅ Updated: {title}")
        else:
            # Keep empty values if fetch failed
            if not item.get('link'):
                item['link'] = ''
            if not item.get('cover'):
                item['cover'] = ''

        # Be polite to the server - wait between requests
        time.sleep(1.5)

    # Write back to JSON file
    with open('data/storygames.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! Updated {updated} games, skipped {skipped} games")
    print(f"Total processed: {total}")

if __name__ == "__main__":
    update_games_json()
