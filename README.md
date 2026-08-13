# Typeform Clone

A focused clone of Typeform’s core product: creators build forms, publish shareable links, respondents complete one question at a time, and creators review responses and aggregate insights.

## Setup instructions

Creator accounts use email/password authentication or Google OAuth. Public respondent links remain available without login.

Prerequisites:

- Python 3.11+
- Node.js 18.17+
- npm

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The SQLite database is created automatically as `backend/typeform.db`. It is ignored by Git. The seed command is idempotent and creates the default creator, two published demo forms, and eight sample responses per form.

After seeding locally, use `creator@example.com` / `password123` to view the demo workspace. Change this password or remove the demo account before using the deployment for real data.

### Google sign-in configuration

Set these backend variables after creating a Google OAuth Web application:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-api.example.com/api/auth/google/callback
FRONTEND_URL=https://your-frontend.example.com
JWT_SECRET=use-a-long-random-secret
```

Add the callback URL exactly to Google Cloud Console. Without these variables, the email/password flow still works and the Google button reports that Google sign-in is not configured.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000/forms](http://localhost:3000/forms). The frontend reads `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000`.

For a production frontend check:

```powershell
npm run build
npm run start
```

## Tech stack and why

- Next.js 14 App Router and TypeScript: route-based creator and respondent experiences with type-safe UI code.
- Tailwind CSS: fast, consistent responsive styling for the Typeform-inspired interface.
- Framer Motion: question-to-question transitions and the animated thank-you screen.
- `@dnd-kit/core`: accessible drag interactions for persisted question ordering.
- FastAPI: concise, typed HTTP APIs with automatic OpenAPI documentation.
- SQLAlchemy 2: explicit relational models and cascade behavior.
- Pydantic v2: request validation and response serialization.
- SQLite: zero-configuration file database suitable for this single-creator clone.

## Architecture overview

The frontend is a Next.js App Router application under `frontend/src/app`. Creator routes live under `/forms`; the public respondent route is `/f/[slug]`. A small typed API client centralizes backend calls.

The backend is a FastAPI application under `backend/app`. SQLAlchemy models map directly to the form, question, response, and answer tables. JSON columns hold theme, options, respondent metadata, and type-specific settings. Creator accounts authenticate with JWT bearer tokens; public respondent routes remain unauthenticated.

Respondent answers are saved incrementally as the user advances. Answer values are stored as strings, with JSON decoding used when returning aggregate and detail data. Publishing assigns a stable public slug and gates the public form endpoint.

## Full DB schema

```sql
CREATE TABLE creators (
    id INTEGER PRIMARY KEY,
    name TEXT DEFAULT 'Default Creator',
    email TEXT
);

CREATE TABLE forms (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER REFERENCES creators(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('draft','published')) DEFAULT 'draft',
    public_slug TEXT UNIQUE,
    theme JSON,
    thank_you_message TEXT DEFAULT 'Thanks for completing this form!',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
    id INTEGER PRIMARY KEY,
    form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('short_text','long_text','multiple_choice','dropdown','email','number','yes_no','rating')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT 0,
    order_index INTEGER NOT NULL,
    options JSON,
    settings JSON
);

CREATE TABLE responses (
    id INTEGER PRIMARY KEY,
    form_id INTEGER REFERENCES forms(id) ON DELETE CASCADE,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_complete BOOLEAN DEFAULT 0,
    respondent_meta JSON
);

CREATE TABLE answers (
    id INTEGER PRIMARY KEY,
    response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id),
    value TEXT NOT NULL
);
```

## API overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/forms` | List forms with response counts |
| POST | `/api/forms` | Create a draft form |
| GET | `/api/forms/{id}` | Get a form and ordered questions |
| PATCH | `/api/forms/{id}` | Update title, description, theme, or thank-you message |
| DELETE | `/api/forms/{id}` | Delete a form and cascaded data |
| POST | `/api/forms/{id}/duplicate` | Deep-copy a form and questions as a draft |
| POST | `/api/forms/{id}/publish` | Publish and generate a public slug |
| POST | `/api/forms/{id}/unpublish` | Return a form to draft status |
| POST | `/api/forms/{id}/questions` | Append a question |
| PATCH | `/api/questions/{id}` | Update question fields |
| DELETE | `/api/questions/{id}` | Delete and normalize question ordering |
| POST | `/api/forms/{id}/questions/reorder` | Persist a complete question order |
| GET | `/api/public/forms/{slug}` | Get a published form without answers |
| POST | `/api/public/forms/{slug}/responses` | Start a respondent response |
| PATCH | `/api/public/responses/{response_id}/answers` | Upsert one answer incrementally |
| POST | `/api/public/responses/{response_id}/complete` | Mark a response complete |
| GET | `/api/forms/{id}/responses` | Get paginated responses |
| GET | `/api/forms/{id}/responses/{rid}` | Get one response with question titles |
| GET | `/api/forms/{id}/summary` | Get per-question aggregate statistics |

## Assumptions made

- A default demo creator with ID `1` is seeded for local development; normal accounts are created through signup or Google OAuth.
- SQLite is the default database and is created on backend startup.
- JSON columns are used for flexible themes, options, settings, and respondent metadata.
- Answers are stored as text; JSON values such as numbers are stringified and normalized when read.
- A form must contain at least one question before publishing.
- Public response creation is available only while the form is published.
- Preview uses the form CRUD endpoint and local preview mode, so drafts can be tested without creating response records.
- A rating uses the configured integer `min` and `max`; a number uses the configured numeric range.
- Seeded sample response counts are preserved on later seed runs, so the command can be safely repeated.

## What's fully built

- Form list, creation, duplication, publishing, unpublishing, and deletion.
- Question builder with all eight requested question types.
- Question editing, required state, options, numeric/rating settings, and drag reorder.
- Theme accent color and thank-you message persistence.
- Public one-question-at-a-time respondent flow.
- Animated transitions, progress, keyboard navigation, choice shortcuts, and validation.
- Incremental response saving and completion tracking.
- Paginated responses, response detail modal, and summary statistics.
- Toasts, delete confirmation modals, empty states, loading states, and friendly unavailable-form handling.
- Idempotent seeded demo data.

## Stubbed or mocked

These are intentionally represented by a Coming Soon panel and are not implemented:

- Logic jumps and conditional branching.
- Integrations and webhooks.
- Team collaboration and sharing.
- Payment questions.
- File-upload questions.

## Bonus features attempted

The requested core product was prioritized first. No bonus feature was added beyond the requested scope; the implementation includes the core persisted theme color, preview mode, and completion statistics needed for the primary walkthrough.

## Manual walkthrough

1. Run the backend seed command and both servers.
2. Open `/forms` and open a seeded form or create a new one.
3. Add each of the eight question types and edit their settings.
4. Drag questions into a new order and refresh to confirm persistence.
5. Set the accent color and thank-you message.
6. Publish the form and copy its public link.
7. Open the public link, answer questions using both mouse and keyboard, and test invalid required/email/number/rating values.
8. Complete the form and confirm the thank-you screen.
9. Return to Results, inspect the response modal, paginate responses, and review Summary aggregates.

## Verification history

Each implementation phase was verified before proceeding. Backend endpoint smoke tests covered CRUD, reorder, publish state, public response lifecycle, pagination, detail, summary, and idempotent seed data. The frontend production build passes for all creator and respondent routes.
