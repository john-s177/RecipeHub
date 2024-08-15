RecipeHub features:
A web application that allows users to store, view, add, delete, edit, and search for recipes. 
Integrated MySQL database to store recipes and user info.  Passwords are hashed and salted for advanced security.
Users are prompted to log in/register using email or Google OAuth. Sessions and cookies are created for users.
All confidential variables and keys are stored in an environment variable.

to run:
download project
cd to directory
run "npm i" in terminal
create database including 2 tables:
  recipes(name, ingredients, instructons, user_id)
  users(name, email, password)
store all (process.env) keys in an environment variable
set up Google OAuth and create a user
add user credentials to .env
