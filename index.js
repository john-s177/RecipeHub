import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import bcrypt from "bcrypt";
import session from "express-session";
import passport from 'passport';
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const saltRounds = 10;

const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'recipes'
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
    secret: "secretword",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
    }
}));

app.use(passport.initialize());
app.use(passport.session());




app.get("/", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("index.ejs");
    } else {
        res.render("home.ejs");
    }
});

app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("index.ejs");
    } else {
        res.render("login.ejs");
    }
});

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            console.log("Login failed:", info.message); // Log the message from `info`
            return res.render("login.ejs", { message: info.message }); // Pass the info message to the view
        }
        req.login(user, (err) => {
            if (err) {
                return next(err);
            }
            console.log("Login successful, redirecting to /index");
            return res.redirect("/index");
            
        });
    })(req, res, next);
});


app.get("/register", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("index.ejs");
    } else {
        res.render("register.ejs");
    }
});

app.post("/register", async (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
            const hash = await bcrypt.hash(password, saltRounds);
            await db.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hash]);

            const [newUser] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
            const user = newUser[0];

            req.login(user, (err) => {
                if (err) {
                    console.log("Login error: ", err);
                    return res.redirect("/login");
                }
                res.redirect("/index");
            });
        } else {
            const message = "Email already exists, please log in.";
            res.render("login.ejs", { message });
        }
    } catch (err) {
        console.log("Error during registration: ", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/recipes", async (req, res) => {
    if (req.isAuthenticated()) {
        const [results] = await db.execute('SELECT * FROM recipes');
        res.render("recipes.ejs", { recipesArray: results });
    } else {
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.get("/add", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("add.ejs");
    } else {
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.get("/index", (req, res, user) => {
    if (req.isAuthenticated()) {
        res.render("index.ejs", {name: req.user.name});
    } else {
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.get("/search", async (req, res) => {
    try {
        const recipeName = req.query.q;
        const [results] = await db.execute('SELECT * FROM recipes WHERE name LIKE ?', [`%${recipeName}%`]);

        if (results.length > 0) {
            res.render("search.ejs", { recipe: results });
        } else {
            res.render("search.ejs", { recipe: [] });
        }
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).send("Error fetching recipes. Please try again later.");
    }
});

app.get("/remove", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("remove.ejs");
    } else {
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.post("/removeRecipe", async (req, res) => {
    const recipeName = req.body.recipeName;
    const [result] = await db.execute('DELETE FROM recipes WHERE name = ?', [recipeName]);
    let response = result.affectedRows ? "Recipe removed successfully" : "Recipe Not Found!";
    console.log(response);
    res.redirect("/recipes");
});

app.post('/submitRecipe', async (req, res) => {
    const { name, ingredients, instructions } = req.body;
    await db.execute('INSERT INTO recipes (name, ingredients, instructions) VALUES (?, ?, ?)', [name, ingredients, instructions]);
    res.redirect("/recipes");
});

app.get("/response", (req, res) => {
    const message = req.query.message;
    res.render("response", { message: message });
});

passport.use(new Strategy({ usernameField: 'email' }, async function verify(email, password, cb) {
    try {
        // Log the email being used for login
        console.log("Attempting login with email:", email);

        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

        // Log the retrieved rows
        console.log("Database query result:", rows);

        if (rows.length > 0) {
            const user = rows[0];
            console.log("User found:", user);

            // Log the password comparison
            const result = await bcrypt.compare(password, user.password);
            console.log("Password comparison result:", result);

            if (result) {
                return cb(null, user);
            } else {
                console.log("Incorrect password");
                return cb(null, false, { message: "Incorrect password, try again." });
            }
        } else {
            console.log("Email doesn't exist");
            return cb(null, false, { message: "Email doesn't exist." });
        }
    } catch (err) {
        console.log("Error in authentication:", err);
        return cb(err);
    }
}));

passport.serializeUser((user, cb) => {
    console.log("Serializing user:", user); // Debugging line
    cb(null, user.id); // Serialize by user ID
});

passport.deserializeUser(async (id, cb) => {
    console.log("Deserializing user with ID:", id); // Debugging line
    try {
        const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
        if (rows.length > 0) {
            cb(null, rows[0]);
        } else {
            cb(new Error("User not found"));
        }
    } catch (err) {
        cb(err);
    }
});

app.use((req, res, next) => {
    console.log("Request received for:", req.url);
    next();
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

app.get("/edit", (req, res) => {
    res.render("edit.ejs");
});

app.post('/editRecipe/:id', async (req, res) => {
    const id = req.params.id;
    const { name, ingredients, instructions } = req.body;
    try {
        await db.execute('UPDATE recipes SET name = ?, ingredients = ?, instructions = ? WHERE id = ?', [name, ingredients, instructions, id]);
        res.redirect('/recipes');
    } catch (error) {
        console.error("Error updating recipe:", error);
        res.status(500).send("Error updating recipe. Please try again later.");
    }
});

app.post("/editRecipe", async (req, res) => {
    const recipeName = req.body.recipeName;
    try {
        const [rows] = await db.execute('SELECT * FROM recipes WHERE name = ?', [recipeName]);
        if (rows.length > 0) {
            const recipe = rows[0];
            res.render("editRecipe.ejs", { recipe: recipe });
        } else {
            res.render("edit.ejs", { error: "Recipe not found!" });
        }
    } catch (error) {
        console.error("Error finding recipe:", error);
        res.status(500).send("Error finding recipe. Please try again later.");
    }
});
