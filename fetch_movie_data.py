import json
import requests
from urllib.parse import quote
import time
import re
import sys

# Configure output encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

def slugify(title):
    """Convert movie title to letterboxd slug format"""
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

def fetch_letterboxd_data(movie_title):
    """Fetch movie data from Letterboxd"""
    slug = slugify(movie_title)
    url = f"https://letterboxd.com/film/{slug}/"

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            html = response.text

            # Extract cover image URL - Letterboxd uses a specific pattern
            # Look for the poster image in the meta tags or img tags
            cover_match = re.search(r'<img[^>]+src="(https://a\.ltrbxd\.com/resized/[^"]+)"[^>]*class="[^"]*image[^"]*"', html)

            if not cover_match:
                # Try alternative pattern for og:image meta tag
                cover_match = re.search(r'<meta property="og:image" content="([^"]+)"', html)

            if cover_match:
                cover_url = cover_match.group(1)
                # Ensure we get the high-res version
                if 'resized' in cover_url and not '1000-0-1500' in cover_url:
                    # Convert to high-res poster format
                    cover_url = re.sub(r'-\d+-\d+-\d+-\d+-crop', '-0-1000-0-1500-crop', cover_url)

                return {
                    'link': url,
                    'cover': cover_url
                }
            else:
                print(f"  ⚠️  No cover found for: {movie_title}")
                return {
                    'link': url,
                    'cover': ''
                }
        else:
            print(f"  ❌ Failed to fetch (status {response.status_code}): {movie_title}")
            return None

    except Exception as e:
        print(f"  ❌ Error fetching {movie_title}: {str(e)}")
        return None

def update_movies_json():
    """Update movies.json with Letterboxd links and cover images"""

    # Read the JSON file
    with open('data/movies.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    total = len(items)
    updated = 0
    skipped = 0

    print(f"Processing {total} movies...\n")

    for i, item in enumerate(items, 1):
        title = item['title']

        # Skip if already has both link and cover
        if item.get('link') and item.get('cover'):
            print(f"[{i}/{total}] ⏭️  Skipping (already complete): {title}")
            skipped += 1
            continue

        print(f"[{i}/{total}] 🔍 Fetching: {title}")

        movie_data = fetch_letterboxd_data(title)

        if movie_data:
            item['link'] = movie_data['link']
            item['cover'] = movie_data['cover']
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
    with open('data/movies.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! Updated {updated} movies, skipped {skipped} movies")
    print(f"Total processed: {total}")

if __name__ == "__main__":
    update_movies_json()
