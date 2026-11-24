# Hasini Kovvuri – Portfolio

Personal portfolio: AI, machine learning and cloud projects, experience, certifications and contact.
Plain HTML, CSS and JavaScript, ready for GitHub Pages. No build step.

**Design:** "Midnight and aqua" dark palette, real project screenshots,
an interactive circuit-board skills map, page transitions, a screenshot lightbox and back navigation.
Everything respects the visitor's *reduce motion* setting and still works if the scripts don't load.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: hover-to-reveal portrait hero with rotating roles, intro, credentials marquee, projects, experience, skills map, lessons, spotlight, connect with FAQ |
| `about.html` | About, timeline, skills, certifications, education, coding profiles |
| `projects.html` | All projects |
| `projects/deepshield-ai.html` | DeepShield-AI case study |
| `projects/cohort-collab.html` | Cohort Collab case study |
| `projects/mediqueue.html` | MediQueue case study |
| `experience.html` | Internships and certifications |
| `contact.html` | Email, phone, LinkedIn, GitHub, resume |
| `404.html` | Page-not-found page (GitHub Pages uses it automatically) |

Shared files are in `assets/`: `css/style.css`, `js/main.js` (interactions, including the soft cursor glow), `js/board.js` (skills map), `js/bgfx.js` (interactive grid behind the Connect section),
`fonts/` (self-hosted Geist, OFL licence), `img/` (photo, favicon), `img/work/` (project screenshots) and `Hasini_Kovvuri_Resume.pdf`.

## Deploy on GitHub Pages

1. On GitHub, create a **new public repository** named exactly **`Hasini-kovvuri.github.io`**.
2. Open it, click **Add file → Upload files**, and drag in **everything inside this folder** (the `.html` files, the `projects` and `assets` folders, this README). `index.html` must sit at the top level.
3. Click **Commit changes**.
4. Go to **Settings → Pages** → **Source: Deploy from a branch** → branch **main**, folder **/ (root)** → **Save**.
5. After a minute or two, open `https://hasini-kovvuri.github.io/`.

Using another repository name (for example `portfolio`) puts the site at `https://hasini-kovvuri.github.io/portfolio/`. Everything works,
but change the two buttons in `404.html` from `/index.html` and `/projects.html` to `/portfolio/index.html` and `/portfolio/projects.html`.

## Updating

- **Resume:** replace `assets/Hasini_Kovvuri_Resume.pdf` with a new file of the same name.
- **Photo:** replace `assets/img/hasini-kovvuri.jpg` (portrait, 4:5, about 720 × 900 px). The hero uses `assets/img/hero-duo.webp` (aqua duotone, shown first) and `assets/img/hero-real.webp` (full colour, revealed on hover); both are cut-outs with a transparent background.
- **Screenshots:** replace files in `assets/img/work/` keeping the same names (`.webp`).
- **Text:** edit the `.html` files directly on GitHub (pencil icon) and commit.
- **Skills map:** skills and project links are the `CHIPS` and `SKILLS` lists at the top of `assets/js/board.js`.
- **Colours:** the palette is defined at the top of `assets/css/style.css`.

## Before sharing

- Set each certificate in Google Drive to **Share → General access → Anyone with the link**.
- Add the site link to your LinkedIn (Contact info → Website), your GitHub profile and your resume.
