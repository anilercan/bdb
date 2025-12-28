import json
import requests
from bs4 import BeautifulSoup
import time
import re
import urllib.parse

def slugify(title, author):
    """Convert book title and author to Goodreads search query"""
    query = f"{title} {author}"
    return urllib.parse.quote(query)

def fetch_book_data(title, author):
    """Fetch cover image and link from Goodreads for a book"""

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }

    try:
        # Search on Goodreads
        search_query = slugify(title, author)
        search_url = f"https://www.goodreads.com/search?q={search_query}"

        response = requests.get(search_url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the first book result
        book_link_elem = soup.select_one('a.bookTitle')
        if not book_link_elem:
            print(f"  ❌ No results found for {title}")
            return None

        book_path = book_link_elem.get('href')
        book_url = f"https://www.goodreads.com{book_path}"

        # Now fetch the book page to get the cover
        time.sleep(1)  # Be polite
        book_response = requests.get(book_url, headers=headers, timeout=15)
        book_response.raise_for_status()

        book_soup = BeautifulSoup(book_response.text, 'html.parser')

        # Try to find cover image
        cover_url = None

        # Method 1: Look for the main book cover image
        cover_img = book_soup.select_one('img.ResponsiveImage')
        if cover_img and cover_img.get('src'):
            cover_url = cover_img['src']

        # Method 2: Look in meta tags
        if not cover_url:
            og_image = book_soup.select_one('meta[property="og:image"]')
            if og_image and og_image.get('content'):
                cover_url = og_image['content']

        # Method 3: Look for BookCover class
        if not cover_url:
            cover_div = book_soup.select_one('.BookCover img')
            if cover_div and cover_div.get('src'):
                cover_url = cover_div['src']

        if cover_url:
            # Clean up the URL - get the higher quality version
            # Goodreads URLs often have size parameters we can modify
            cover_url = re.sub(r'\._S[XY]\d+_', '', cover_url)
            return {
                'cover': cover_url,
                'link': book_url
            }
        else:
            # Return just the link if we found the book but not cover
            return {
                'cover': '',
                'link': book_url
            }

    except Exception as e:
        print(f"  ❌ Error fetching {title}: {str(e)}")
        return None

def update_books_json(json_file='data/books.json'):
    """Update books.json with Goodreads links and cover images"""

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    items = data['items']
    total = len(items)
    updated = 0
    skipped = 0

    print(f"Processing {total} books...\n")

    for i, item in enumerate(items):
        title = item.get('title', '')
        author = item.get('author', '')
        current_cover = item.get('cover', '')
        current_link = item.get('link', '')

        # Skip if already has both cover and link
        if current_cover and current_link:
            print(f"[{i+1}/{total}] ⏭️  Skipping (already complete): {title}")
            skipped += 1
            continue

        print(f"[{i+1}/{total}] 🔍 Fetching: {title} by {author}")

        result = fetch_book_data(title, author)

        if result:
            if not current_cover and result.get('cover'):
                item['cover'] = result['cover']
            if not current_link and result.get('link'):
                item['link'] = result['link']
            print(f"  ✅ Updated: {title}")
            updated += 1
        else:
            skipped += 1

        # Be polite to the server
        time.sleep(1.5)

    # Write back to JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! Updated {updated} books, skipped {skipped} books")
    print(f"Total processed: {total}")

if __name__ == "__main__":
    import argparse
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description='Fetch book data from Goodreads')
    parser.add_argument('--file', '-f', default='data/books.json',
                        help='JSON file to update (default: data/books.json)')
    args = parser.parse_args()
    update_books_json(args.file)
