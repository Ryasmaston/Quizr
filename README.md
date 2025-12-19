## Authentication
Our backend is locked by default. Firebase Auth proves who the user is (email, uid), and Express verifies that token once globally. If you’re not authenticated, nothing gets through.
### Frontend
##### Rules
- Never call `fetch()` directly for our API
- Always use: **`apiFetch(path, options)`** from `src/services/api.js`
- Auth is handles automatically by `apiFetch`

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

