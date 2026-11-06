# Writing Systems · 文字專題

A feature site that gathers writing-system projects by script: input methods, fonts, datasets and tools. <https://moji.mkpo.li/>

## Develop

```sh
bun install
bun run build
bun run preview
bun run test
bun run check
```

`bun run build` writes one static HTML page per language to `dist/`: English at `/`, and `/ja/`, `/zh-Hans/`, `/zh-Hant/` and `/ko/`.

## Adding a project

Add it to `content/chapters.json`, its description to each file in `messages/`, and its screenshots to `public/shots/` as `<shot>-light.webp` and `<shot>-dark.webp`, 1280×800.

## Specimens

`content/specimens.json` holds outlines drawn by `scripts/specimens.py` from the fonts of the projects, which it expects side by side under one directory:

```sh
uv run scripts/specimens.py ~/projects
```

The fonts are under the SIL Open Font License; the code is MIT, see `LICENSE`.

## Sponsor

I build this site on my own, with no funding behind it, and it's free for everyone. If it's useful to you, a tip on [Ko-fi](https://ko-fi.com/mkpoli) or [OFUSE](https://ofuse.me/mkpoli) gives me time to keep improving it. Companies interested in sponsoring can write to mkpoli@mkpo.li.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/mkpoli)
