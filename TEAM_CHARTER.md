Team CharterTeam Creative

General rules:
We meet in Cloud Zoom room at 10:00am
We communicate any confusion or issues upfront
We take responsibility for our part of the project
We respect everyone in the team
Retro at 4:30pm

Workflow:

* If you work on a feature, you are responsible for the bare-bones front-end of it (can be just HTML)
* We leave all serious styling for the end to make it consistent and avoid wasting time


Git commit prefixes:
feat: feature
fix: fixes a bug
chore: documentation, file struture, everything else

Trello board:

* Red = MVP
* Blue = Beyond MVP
* Yellow = Bug

After the MVP Demo, we can assign Red to priority features

Tech stack:
MERN - MongoDB, Express, React, Node.js
Firebase - Auth, File Storage
MongoDB - database (schemas)
Express - routing
React - front-end js framework
Node.js - back-end runtime

Ticket workflow:

1. Fetch and pull from main
2. Verify dependencies in package.json, run npm install
3. Create your branch with git switch -c branch-name
4. Verify .gitignore includes your virtual environment directory (node_modules)
5. Stage with git add . then commit with git commit -m “prefix: what you did”
6. Push changes with 1. git push -u origin branch-name and from then on with git push
7. Go to GitHub Repo → Pull Requests → Create New → select our repo → compare main with your branch

