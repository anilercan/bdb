import json
import requests
import time
import sys

# Configure output encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

def search_jikan_manga(manga_title):
    """Search Jikan API (MyAnimeList) for manga"""
    url = f"https://api.jikan.moe/v4/manga"

    params = {
        'q': manga_title,
        'limit': 1
    }

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()

            if data.get('data') and len(data['data']) > 0:
                manga = data['data'][0]

                mal_id = manga.get('mal_id')
                title = manga.get('title', '')

                # Get cover image (use large or default to medium)
                images = manga.get('images', {}).get('jpg', {})
                cover = images.get('large_image_url') or images.get('image_url', '')

                # Construct MyAnimeList URL
                if mal_id:
                    mal_url = manga.get('url', f"https://myanimelist.net/manga/{mal_id}")

                    return {
                        'link': mal_url,
                        'cover': cover
                    }
                else:
                    print(f"  ⚠️  No MAL ID found for: {manga_title}")
                    return None
            else:
                print(f"  ⚠️  No results found for: {manga_title}")
                return None
        elif response.status_code == 429:
            print(f"  ⚠️  Rate limited, waiting 60 seconds...")
            time.sleep(60)
            return search_jikan_manga(manga_title)  # Retry
        else:
            print(f"  ❌ API error (status {response.status_code}): {manga_title}")
            return None

    except Exception as e:
        print(f"  ❌ Error searching {manga_title}: {str(e)}")
        return None

def update_manga_json():
    """Update manga.json with data from Jikan API"""

    # Read the JSON file
    with open('data/manga.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    total = len(items)
    updated = 0
    skipped = 0

    print(f"Processing {total} manga...\n")

    for i, item in enumerate(items, 1):
        title = item['title']

        # Skip if already has both link and cover
        if item.get('link') and item.get('cover'):
            print(f"[{i}/{total}] ⏭️  Skipping (already complete): {title}")
            skipped += 1
            continue

        print(f"[{i}/{total}] 🔍 Fetching: {title}")

        manga_data = search_jikan_manga(title)

        if manga_data:
            item['link'] = manga_data['link']
            item['cover'] = manga_data['cover']
            updated += 1
            print(f"  ✅ Updated: {title}")
        else:
            # Keep empty values if fetch failed
            if not item.get('link'):
                item['link'] = ''
            if not item.get('cover'):
                item['cover'] = ''

        # Save progress after each item
        with open('data/manga.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Jikan API rate limit: 3 requests per second, 60 per minute
        # Be conservative: wait 1 second between requests
        time.sleep(1)

    print(f"\n✅ Done! Updated {updated} manga, skipped {skipped} manga")
    print(f"Total processed: {total}")

if __name__ == "__main__":
    update_manga_json()
