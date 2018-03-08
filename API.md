# list of API routes

| route | description |
| ---   | ---         |
| `GET /`                           | home page
| `GET /home`                       | main page for logged-in user
| `GET /login`                      | login page
| `POST /login`                     | handle login submission
| `GET /logout`                     | log a user out -> /home
| `GET /pages/:page`                | static content pages
| `GET /teams/`                     | list of all teams
| `GET /teams/:team`                | individual team, with matches and group table
| `GET /teams/table/:team`          | get a group table for a team
| `GET /venues/`                    | list of all venues
| `GET /venues/:venue`              | individual venue, with matches
| `GET /matches/`                   | list of all matches
| `GET /matches/:match`             | individual match, with goalmap and predictions
| `GET /matches/:match/goalmap`     | get score coordinates for goalmap
| `GET /predictions/`               | list of predictions for logged in user
| `POST /predictions/update`        | handle submitted prediction
| `GET /goals/`                     | list of all goals
| `GET /leagues/`                   | list of all user leagues, with admin list of pending new leagues
| `GET /leagues/:league`            | individual user league, with table admin/organiser list of plending users
| `GET /leagues/add`                | add league page
| `POST /leagues/add`               | submit a new league request
| `POST /leagues/:league/join`      | submit a request to join a private league
| `GET /users/`                     | show all users (main leaderboard)
| `GET /users/:user`                | individual user page (for user other than selected user)
| `GET /users/:user/leagues`        | get a list of all user leagues of which the user is a member (ajax)
| `GET /users/update`               | show the update details page
| `GET /users/invite`               | show the invite new user page
| `POST /users/invite`              | submit a new user invite
| `GET /users/confirm/:code`        | show the confirm new user page (with temporary code)
| `POST /users/confirm`             | handle a submitted confirmation
| `GET /users/available/:username`  | check if a username is available (ajax)
| `GET /users/forgot`               | show forgotten password screen
| `POST /users/forgot`              | submit a password reset request
| `GET /users/missing`              | return list of predictions not yet made by logged in user
| `GET /users/reset/:code`          | show a reset password screen
| `POST /users/reset/:code`         | handle a password reset request
| `POST /admin/result`              | handle a submitted match result
| `GET /admin/payment`              | show the handle payment screen
| `POST /admin/payment`             | mark a user as paid
| `POST /admin/league/request`      | handle a request for a new league
| `GET /admin/goals/:match`         | show the manage goals screen for match :match
| `POST /admin/goals/add`           | handle a new goal added
| `DELETE /admin/goals/:goal`       | delete a goal from match