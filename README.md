# bdb
büyücü's database

A personalized media ratings website hosted on GitHub Pages.

## Structure

```
bdb/
├── index.html
├── style.css
├── script.js
└── data/
    ├── games.json
    ├── visualnovels.json
    ├── movies.json
    ├── tvseries.json
    ├── anime.json
    ├── manga.json
    └── books.json
```

## Adding Entries

Edit the JSON files in the `data/` folder. Each category has its own structure.

### Background Image (Optional)

Each JSON file can have an optional `background` field at the root level to set a custom background image for that category. Default is solid black.

```json
{
  "background": "https://example.com/your-background-image.jpg",
  "items": [...]
}
```

### Games & Visual Novels
```json
{
  "background": "",
  "items": [
    {
      "title": "Game Title",
      "cover": "https://images.igdb.com/...",
      "rating": 85,
      "details": "Optional notes",
      "dateCompleted": "2024-12-15"
    }
  ]
}
```
- `details`: Leave as `""` if not needed
- `dateCompleted`: Leave as `""` if unknown (will sort to bottom)

### Movies, Anime, Manga
```json
{
  "background": "",
  "items": [
    {
      "title": "Title",
      "cover": "https://...",
      "rating": 85
    }
  ]
}
```

### TV Series
```json
{
  "background": "",
  "items": [
    {
      "title": "Series Title",
      "cover": "https://...",
      "rating": 85,
      "seasonsWatched": 3
    }
  ]
}
```

### Books
```json
{
  "background": "",
  "items": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "cover": "https://...",
      "rating": 85
    }
  ]
}
```

## Rating Scale
- **0-100**: Your personal rating
- Colors: Green (75+), Yellow (50-74), Red (<50)

## Cover Images
Add cover image URLs manually. For games/visual novels, you can get them from IGDB:
1. Find the game on igdb.com
2. Right-click the cover image and copy image URL
