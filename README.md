# Vajeh (واژه)

A simple web app for practicing Persian (Farsi) vocabulary by typing words using the standard Iranian keyboard layout.

The goal is to make learning Persian vocabulary fast, simple, and enjoyable through repeated typing practice.

---

## Features

- 🇮🇷 Practice Persian vocabulary through typing
- ⌨️ Standard Iranian keyboard layout
- 📈 Words per minute (WPM) tracking
- 🎯 Accuracy and mistake tracking
- 📚 Multiple vocabulary levels (A1–C2 as the database grows)
- 🌙 Clean, distraction-free interface

---

## Try it

Visit:

**https://uxai.github.io/**

No account or installation required.

---

## Running Locally

Because the application loads vocabulary files, it must be served from a local web server rather than opening `index.html` directly.

For example:

```bash
python -m http.server
```

Then open:

```
http://localhost:8000
```

---

## Vocabulary

Vocabulary is stored as CSV files inside the repository.

Each CSV uses the following columns:

| farsi | english | pronunciation | level |
|--------|---------|---------------|-------|
| تحلیل | analysis | tahlil | C1 |
| پیامد | consequence | payâmad | C1 |
| استدلال | reasoning | estedlâl | C1 |

The CSV header is:

```csv
farsi,english,pronunciation,level
```

When contributing vocabulary:

- Keep the column order exactly as shown above.
- Use Modern Standard Persian (Iranian Farsi).
- Keep English translations concise and natural.
- Use consistent Latin transliteration.
- Assign the appropriate CEFR level (A1–C2).
- Avoid duplicate entries.
- Save the file as UTF-8.

---

## Contributing

Contributions of all sizes are welcome.

You can help by:

- Adding new Persian vocabulary
- Improving English translations
- Improving pronunciations/transliterations
- Fixing spelling mistakes
- Removing duplicate entries
- Correcting CEFR levels
- Reporting bugs
- Improving the interface or user experience
- Improving documentation

### Creating a Pull Request

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b my-feature
```

3. Make your changes.
4. Commit them with a clear commit message.

```bash
git commit -m "Add additional C1 vocabulary"
```

5. Push your branch.

```bash
git push origin my-feature
```

6. Open a Pull Request describing your changes.

If your PR updates vocabulary, please include:

- The CEFR level(s) you modified
- Approximately how many words were added or changed
- Whether translations or pronunciations were updated

---

## Roadmap

Future ideas include:

- Frequency-based vocabulary lists
- Example sentences
- Difficulty filtering
- More user statistics
- Category based words

Suggestions and feature requests are always welcome.

---

## License

This project is open source.

Feel free to use, modify, and contribute through pull requests.
