# RecipeHub

RecipeHub is a full-stack web application that allows users to **store**, **view**, **add**, **edit**, **delete**, and **search** for recipes.  
It features secure user authentication, a MySQL database integration, and a clean, user-friendly interface built with **Node.js** and **EJS**.

---

## Features

- User registration and login using **Email/Password** or **Google OAuth**.
- Passwords are securely **hashed and salted** for protection.
- Persistent **user sessions** using **cookies** and **session management**.
- Fully functional **CRUD** (Create, Read, Update, Delete) operations for recipes.
- Integrated **MySQL database** for storing user and recipe data.
- All sensitive information is managed securely using **environment variables**.

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   ```

2. **Navigate into the project directory:**

   ```bash
   cd RecipeHub
   ```

3. **Install the dependencies:**

   ```bash
   npm install
   ```

4. **Set up the MySQL database:**
   - Create a database (e.g., `recipehub_db`).
   - Create two tables:
     - **users**
       | id | name | email | password |
     - **recipes**
       | id | name | ingredients | instructions | user_id |

5. **Configure environment variables:**
   - Create a `.env` file in the root directory.
   - Include the following variables:

     ```plaintext
     DB_HOST=your_db_host
     DB_USER=your_db_user
     DB_PASSWORD=your_db_password
     DB_NAME=your_db_name
     
     SESSION_SECRET=your_session_secret
     
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     GOOGLE_CALLBACK_URL=your_google_callback_url
     ```

6. **Set up Google OAuth credentials:**
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable **OAuth 2.0**.
   - Set your redirect URI to something like:  
     `http://localhost:3000/auth/google/callback`
   - Add the generated credentials to your `.env` file.

7. **Start the application:**

   ```bash
   npm start
   ```

8. **Visit the app at:**  
   `http://localhost:3000`

---

## Technologies Used

- **Node.js**
- **Express.js**
- **EJS (Embedded JavaScript Templates)**
- **MySQL**
- **Passport.js** (for authentication)
- **bcrypt** (for password hashing)
- **dotenv** (for environment variable management)

---

## Notes

- Make sure your database is running before starting the server.
- Always keep your `.env` file out of version control by including it in `.gitignore`.
- Customize and expand the project with additional features like recipe images, categories, or user profiles!

---
