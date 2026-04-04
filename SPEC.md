## Overview
A web app for managing golf pickem competitions

## Authentication
- Users register and sign-in via magic links
- All signed-in users can submit their picks and participate in competitions
- Admins will also be able to create and manage competitions
- richie.morris@hotmail.com is seeded as an initial admin

## Workflow
All competitions will have the following lifecycle:

### 1) Draft
- Admins provide a name, and the field that users will pick from, including current betting odds for each golfer in the field (14/1, 20/1 etc.) 

### 2) Open for Picks
- Participants will be able to submit their picks 
- They pick 3 golfers from the field and the combined odds of these MUST be no less than 120

### 3) Live
- Admins can update the current stroke score for each golfer in the field and this will update the pickem leaderboard
- Admins will also be able to enter the cut line, once it's determined
- For the pickem leaderboard, each participant's score will be the sum of the strokes score for their 3 golfers
- If one or more of their picks don't make the cut, then they are eliminated from the competition

### 4) Complete
- The winner is announced

## Constraints
- Built using Nextjs and simple file storage
- Emails are written to a temp file for local dev 
