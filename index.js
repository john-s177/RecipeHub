import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import bcrypt from "bcrypt";
import session from "express-session";
import passport from 'passport';
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = process.env.SALT_ROUNDS;
env.config();

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000*60*60*2
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
            const hash = bcrypt.hash(password, saltRounds);
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
        const [results] = await db.execute('SELECT * FROM recipes where user_id = ?', [req.user.id]);
        res.render("recipes.ejs", { recipesArray: results });
    } else {
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

app.get("/auth/google/RecipeHub", passport.authenticate("google", {
    successRedirect: "/index",
    failureRedirect: "/login",
}));

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
        const [results] = await db.execute('SELECT * FROM recipes WHERE name LIKE ? and user_id = ?', [`%${recipeName}%`, req.user.id]);

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
    const [result] = await db.execute('DELETE FROM recipes WHERE name = ? and user_id = ?', [recipeName, req.user.id]);
    let response = result.affectedRows// ? "Recipe removed successfully" : "Recipe Not Found!";
    if (response){
        res.redirect("/recipes")
    }
    else{
        res.render("remove.ejs", {message: "Recipe Not Found!"})
    }
});

app.post('/submitRecipe', async (req, res) => {
    const { name, ingredients, instructions } = req.body;
    await db.execute('INSERT INTO recipes (name, ingredients, instructions, user_id) VALUES (?, ?, ?, ?)', [name, ingredients, instructions, req.user.id]);
    res.redirect("/recipes");
});

app.get("/response", (req, res) => {
    const message = req.query.message;
    res.render("response", { message: message });
});

app.get("/logout", (req,res)=>{
    req.logout((err)=>{
        if (err) console.log(err);
        res.redirect("/")
    });
});

passport.use("local", new Strategy({ usernameField: 'email' }, async function verify(email, password, cb) {
    try {
        console.log("Attempting login with email:", email);

        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

        console.log("Database query result:", rows);

        if (rows.length > 0) {
            const user = rows[0];
            console.log("User found:", user);

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

passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/RecipeHub",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    }, async (accessToken, refreshToken, profile, cb)=>{
        console.log(profile);
        try{
            const [result]  = await db.execute("select * from users where email = ?", [profile.email]);
            if (result.length === 0){
                const newUser = await db.execute("insert into users (name, email, password) values (?,?,?)", [profile.name["givenName"], profile.email, "**Google**"]);
                cb(null, newUser[0])
            } 
            else{
                cb(null, result[0]);
            }
        }
        catch(err){
            cb(err);
        }
    }
));

passport.serializeUser((user, cb) => {
    console.log("Serializing user:", user); 
    cb(null, user.id); 
});

passport.deserializeUser(async (id, cb) => {
    console.log("Deserializing user with ID:", id);
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
    if (req.isAuthenticated()){
    try {
        await db.execute('UPDATE recipes SET name = ?, ingredients = ?, instructions = ? WHERE id = ? and user_id = ?', [name, ingredients, instructions, id, req.user.id]);
        res.redirect('/recipes');
    } catch (error) {
        console.error("Error updating recipe:", error);
        res.status(500).send("Error updating recipe. Please try again later.");
    }
    }
    else{
        res.render("login.ejs", { message: "Please Login to View the Requested Page" });
    }
});

app.post("/editRecipe", async (req, res) => {
    const recipeName = req.body.recipeName;
    try {
        const [rows] = await db.execute('SELECT * FROM recipes WHERE name = ? and user_id = ?', [recipeName, req.user.id]);
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
