## Overview
A web app for managing golf pickem competitions

## Authentication
- Admins will be required to login via username and password
- Participants don't need to login - they can just submit their name along with their picks

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
- Built using Nextjs
- Use Prisma ORM for data access
- Host the app on Vercel (free tier)
- Host the database on Supabase (free tier)
