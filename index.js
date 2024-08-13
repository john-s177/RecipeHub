import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';

const app = express();

const port = 3000;

const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'recipes'
});

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render("home.ejs");    
});

app.get("/login", (req,res)=>{
    res.render("login.ejs")
});

app.get("/register", (req,res)=>{
    res.render("register.ejs")
});

app.post("/register", async (req,res) =>{
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    try{
        const [rows] = await db.execute("select * from users where email = ?", [email])
        if (rows.rows==0){
            await db.execute("insert into users (name, email, password) values (?,?,?)", [name, email, password]);
            res.render("index.ejs");
        }
        else{
            const message="Email Already Exists, Please Login"
            res.render("login.ejs", {message: message})
        }
    }
    catch(err){
        console.log(err)
    }
});

app.get("/recipes", async (req, res) => {
    const [results] = await db.execute('SELECT * FROM recipes');
    res.render("recipes.ejs", { recipesArray: results });
});

app.get("/add", (req, res) => {
    res.render("add.ejs");
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
    res.render("remove.ejs");
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
    const newRecipe = {
        name: name,
        ingredients: ingredients,
        instructions: instructions
    };
    await db.execute('INSERT INTO recipes (name, ingredients, instructions) VALUES (?, ?, ?)', [name, ingredients, instructions]);
    res.redirect("/recipes");
});

app.get("/response", (req, res) => {
    const message = req.query.message;
    res.render("response", { message: message });
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

