# Circuit Trainer — client

React 19 + Vite 6 + styled-components, installed with Yarn Berry (Plug'n'Play).
See the [root README](../README.md) for the whole project.

```bash
yarn install
yarn dev                                   # http://localhost:5173, API expected on :8080
VITE_API_URL=http://localhost:8081 yarn dev  # point at an API on another port
yarn lint
yarn build                                 # dist/
yarn deploy                                # build + rsync to DreamHost (needs .env.deploy.local
                                           # and .env.production.local with VITE_API_URL)
```

| File | Role |
|---|---|
| `api.js` | fetch wrapper: bearer token, problem-detail errors, slow-request (cold start) notice |
| `AuthProvider.jsx` / `AuthContext.js` | signed-in user, login/register/logout |
| `useWorkouts.js` | loads workouts and adapts them to the shape the timer screens use |
| `useStats.js` | `/stats` for list subtitles ("Week 2 of 4") and the Progress tiles |
| `sessionSync.js` | saves completed workouts; queues them offline and retries on start |
| `App.jsx` | the timer state machine (exercise → break → end) plus navigation |
| `CircuitTimer.jsx` / `ManualCircuitTimer.jsx` | timed and self-paced workout screens |
| `SetLogger.jsx` | end-of-workout reps/weight log |
| `ProgressScreen.jsx` | stats, goals, weight (with `WeightChart.jsx`), history, backup, account |
| `WorkoutEditor.jsx` | create and edit custom workouts |
