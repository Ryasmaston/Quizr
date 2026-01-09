



<div align="center">
  <img
    src="./frontend/src/assets/brain-logo.png"
    alt="Quiz.app logo"
    width="400"
     style="margin-bottom: 18px;"
  />
  
  <h1>📝✨ Quiz.app – Team Creative</h1>
  <br />
  <h3>👋✨ Hi there, welcome to our project!</h3>
</div>

## 📚✨ Project Overview
Quiz.app is a full-stack platform for creating and taking quizzes, built using the **MERN stack** (**MongoDB**, **Express**, **React + Vite**, **Node.js**) with **Firebase** authentication and file storage. We created this application in just **10 days** during the Makers Academy remote **Software Engineering** bootcamp in January 2026, working in a simulated software engineering team using Agile practices.

We worked individually and as a team with morning stand-ups, daily Slack communication, and end-of-day retros. We focused on collaboration, clear communication, and learning good **software engineering practices** and patterns.

We dealt with real engineering challenges like version control conflicts, debugging, testing, and delivering features under time pressure, while prioritising what mattered most (“keeping the most important things the most important things”).




## 🧠✨ Our Team of 5 Contributors  

- [Matt Kajdan](https://github.com/Matt-Kajdan)
- [Ryan Osmaston](https://github.com/Ryasmaston)
- [Dylan Scott](https://github.com/dylanscottvr11)
- [Dominik Nowak](https://github.com/DominikNowak-DN)
- [Emilia Furtan](https://github.com/EmilkaFn)


## 🧢✨ Our Coach 

- [Eóin](https://github.com/eoinbp)

## ☁️✨ Deployment 

- Deployment in progress (planned via Firebase Hosting) — live demo link coming soon

 ## 🤝✨ How We Worked as a Team  

- [Welcome to our Drawing Board with diagrams, retro and MVP 🎨 🖌️](https://app.diagrams.net/#G17S0vzclr3jfS2ZoSj4lJApLi3fK_iR20#%7B%22pageId%22%3A%22Hymm-zf7g9Td7m3pdbtD%22%7D)
- [Dive into our Team Charter & Process  📜✨](TEAM_CHARTER.md)

## 🛠️✨ Tech Stack

### 🔹 Frontend

![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=ffffff)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

### 🔹 Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=ffffff)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=ffffff)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=ffffff)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=ffffff)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=000000)

### 🔹 Tools · Collaboration · Debugging · Data / API

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=ffffff)
![GitHub](https://img.shields.io/badge/GitHub-121011?style=for-the-badge&logo=github&logoColor=ffffff)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=ffffff)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=ffffff)
![Chrome DevTools](https://img.shields.io/badge/Chrome_DevTools-4285F4?style=for-the-badge&logo=googlechrome&logoColor=ffffff)
<br />
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=ffffff)
![Miro](https://img.shields.io/badge/Miro-050038?style=for-the-badge&logo=miro&logoColor=ffd02f)
![Trello](https://img.shields.io/badge/Trello-0052CC?style=for-the-badge&logo=trello&logoColor=ffffff)
![draw.io](https://img.shields.io/badge/draw.io-F08705?style=for-the-badge&logo=diagramsdotnet&logoColor=ffffff)
---

## 📌✨ Features
Current core features include:

### ✅ Implemented Features
- **Authentication:** Firebase sign up / log in / log out
- **Authorisation:** protected routes + auth-aware navbar redirects
- **Navigation:** global navbar across the app
- **Home:** landing layout with a **Create Quiz** entry point
- **Create Quiz:** create a quiz title, add questions, add answer options, set the correct answer, save using the latest quiz schema
- **Quiz Discovery:** view public quizzes on user profile pages (Quizzes section)
- **Take Quiz:** dynamic question pages, back/next navigation, answers saved during the flow, submit attempt as one payload
- **Scoring:** server-side scoring + attempt saved per user
- **Profiles:** username display, own-profile edit button, quizzes taken, favourites/saved quizzes (where enabled)
- **Leaderboards:** per-quiz Top N leaderboard + your best score
- **Friends:** friend requests with status (pending/accepted) + friendship metadata (requestedBy, createdAt, acceptedAt)
- **Friends Access:** view quizzes within your friend network (where enabled)
- **Seed Data:** natural seed users/quizzes + Firebase user seeding (where required)
- **UI:** responsive Tailwind CSS styling across core pages (Home, Auth, Profile, Quizzes)
- **Profile linking:** link to user profiles from Friends and Quizzes views
- **Leaderboards:** friends-only leaderboard view
- **Deployment:** deploy the database
- **Multi-answer questions:** allow multiple correct answers + allow users to select more than one answer
- **Difficulty insights:** difficulty ratings + average completion rate
- **Profile stats:** show common quiz topics + average difficulty for created quizzes

### 🌱 Still in Development – paused due to project deadline
- **Media:** Firebase image upload + user profile picture
- **Quiz generation:** LLM-assisted quiz creation (auto-generate quizzes)
- **Mistake follow-up:** missed questions show a short explanation and/or a mini-quiz later
- **Adaptive difficulty:** questions adjust based on performance
- **Randomisation:** randomise question order during quiz creation/delivery
- **Streaks:** quiz completion streaks

## 🧩✨ Architecture

This repo contains two applications:

- `api/` – **Node + Express** backend (secured with **Firebase Admin**)  
- `frontend/` – **React + Vite** SPA, styled with **Tailwind CSS**  

They communicate via HTTP:

- The frontend reads the API base URL from `VITE_BACKEND_URL`  
- All API requests go through a custom `apiFetch(path, options)` helper  
- `apiFetch` attaches the current **Firebase ID token** as `Authorization: Bearer <token>`  
- The backend verifies this token with **Firebase Admin** and uses `req.user` for identity  
- Application data is stored in **MongoDB** (via Mongoose)

---

## 🏆✨ Our Achievements

Teamwork & delivery flow:
- We communicated clearly about tasks, progress and blockers ✅
- Took shared ownership and stayed focused on shipping a complete, working product ✅
- Supported each other from start to finish ✅

Minimum Viable Product delivered on time:
- We shipped a working MVP within the project timeline ✅
- With the core features implemented and stable ✅
- Stable enough for real users to use end-to-end. ✅

Functionality & UI leveled up:
- We iterated on both functionality and design ✅
- Refining layouts, improving usability ✅
- Making the interface more consistent and user-friendly over time✅

## 🐞✨ Our Challenges

Bugs & debugging - we improved by:
- Discussing issues as a team before making changes ✅
- Logging bugs in Trello board to make sure nothing was missed ✅
- Screen sharing on Zoom and testing before merging ✅

Git & merge conflicts - we improved by:
- Creating smaller pull requests ✅
- Merging to main more often ✅
- Communicating before touching the same files ✅

Time management - we improved by:
- Balancing learning new tech vs. actually shipping features ✅
- Had to drop/scale back some ideas to hit the deadline ✅
- Taking regular breaks for gym, run, walk in the park etc ✅

##  🏁✨ Getting Started  

- Set-up instructions were provided as a starting template for us to use
- We created our own seed project (the base version of the app) and extended it throughout development

## 🔑✨ Authentication

Our backend is locked by default. Firebase Auth proves who the user is (email, uid), and Express verifies that token once globally. If you’re not authenticated, nothing gets through.
### Frontend
##### Rules
- Never call `fetch()` directly for our API
- Always use: **`apiFetch(path, options)`** from `src/services/api.js`
- Auth is handled automatically by `apiFetch`

Import Firebase directly only on auth pages (done) and file storage features
For everything else, use this:
```jsx
import { apiFetch } from "../services/api";
```
And then:
```jsx
const res = await apiFetch("/quizzes");
```

Example `src/services/quizzes.js` file:
```jsx
import { apiFetch } from "./api";

export async function getQuizzes() {
  const res = await apiFetch("/quizzes");
  if (!res.ok) throw new Error("Failed to load quizzes");
  return res.json();
}

export async function createQuiz(data) {
  const res = await apiFetch("/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
```
No auth tokens passed, all of that is already handles by the api helper.
### Backend
##### Rules
- Auth is global by default, because `app.use(requireAuth)` is in `api/app.js`
- In controllers, the user identity is always **`req.user.uid`**
- Never accept `userId` from the client

##### In controllers, always use `req.user`
Example:
```js
function createQuiz(req, res) {
  const ownerUid = req.user.uid;
}
```
Never do:
```js
req.body.userId
req.params.userId
```
The user identity **always comes from Firebase**, never the client.
##### Mount the router normally
In `api/app.js`, for example `/quizzes` route:
```js
app.use("/quizzes", quizzesRouter);
```
No auth logic here. It’s already enforced globally.
### Files that make up the auth layer
##### Frontend
- `src/services/firebase.js` - Firebase client init (auth + storage)
- `src/services/authentication.js` - login/signup (Firebase Auth only)
- `src/services/api.js` - centralized authenticated fetch
- `pages/Login/*` - login UI + redirect logic
- `pages/Signup/*` - signup UI + redirect logic
- `pages/Home/*` - auth-guarded page (example)
##### Backend
- `api/middleware/requireAuth.js` - verifies Firebase ID token
- `api/lib/firebaseAdmin.js` - Firebase Admin init
- `api/app.js` - global auth gate
- `api/routes/*` - normal routers (no auth logic inside)
- `api/controllers/*` - always use `req.user.uid`
### Extra explainer
Internally, `apiFetch` retrieves the Firebase ID token from the current session and sends it as an `Authorization: Bearer <token>` header. The backend verifies this token once per request.
