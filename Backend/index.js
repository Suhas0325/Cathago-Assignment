const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const app = express();
const PORT = 8080;

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../Database.db');

app.use(express.json())
app.use(cors())


const ResetCredits = ()=>{
    db.run(
        'UPDATE users SET credits = 20, last_reset = CURRENT_TIMESTAMP WHERE DATE(last_reset) < DATE("now")',
        (err) => {
          if (err) console.error('Error resetting credits:', err);
        }
      );
}

setInterval(ResetCredits , 86400000); //Reset Credits

app.get('/' , (req,res)=>{
    res.send("Hello youre good to go");
})

app.post('/auth/register', async(req , res)=>{
    // logic for registration
    const {username ,  password} = req.body;
    const Hashedpassword = await bcrypt.hash(password , 10);

    db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, Hashedpassword],
        function (err) {
            if (err) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            res.json({ id: this.lastID, username });
        }
    );

    
})


app.post('/auth/login', async (req, res)=>{
    // logic for login(JWT Tokens)
    const {username  , password} = req.body;

    db.get(
        'SELECT * FROM USERS WHERE username  = ?'
        , [username] , 

        async (err ,  user) =>{
            if(err || !user) 
               return  res.status(400).json({message : "0"})

            const validpassword = await bcrypt.compare(password , user.password);
            if(!validpassword)
                return res.status(400).json({error: "Password Incorrect"});

            const jwtoken = jwt.sign({id : user.id , username : user.username} , 'suhas-assignment' , {
                expiresIn : '1h'
            });
            
            res.json({token : jwtoken})

        })    
})


app.get('/users/profile' , (req, res)=>{
     // Send a data base req to fetch details
     const token = req.headers.authorization?.split(' ')[1];

     if(!token){
        return res.status(401).json({error : "Unauthorized"});
     }

     jwt.verify(token , 'suhas-assignment' , (err , decoded)=>{
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        db.get(
            'SELECT id , username ,  credits , last_reset FROM users where id = ?' , [decoded.id] , 
            (err , user)=>{
                if(err || !user){
                    return res.status(400).json({error : "User not found"})
                }
                res.json(user)
            }
        )
     })
     
})


app.post('/scanupload' , (req , res)=>{
    // uses one credit (we need to deduct the credit)
    const userId = req.session.userId;
    const { filename, content } = req.body;

    // Deduct 1 credit
    db.run('UPDATE users SET credits = credits - 1 WHERE id = ?', [userId], function (err) {
        if (err || this.changes === 0) {
            return res.status(400).json({ error: 'Failed to deduct credit' });
        }

        // Save the document
        db.run(
            'INSERT INTO documents (user_id, filename, content) VALUES (?, ?, ?)',
            [userId, filename, content],
            function (err) {
                if (err) {
                    return res.status(400).json({ error: 'Failed to save document' });
                }
                res.json({ id: this.lastID });
            }
        );
    });
    
})

app.get('/matched/:docID' , async (req , res)=>{
    // retreives the document'

    const docId =  req.params;

    db.get(
        'SELECT * FROM documents where id = ?', [docId] ,
        async (err ,  doc) => {
            if(err || !doc){
                return res.status(400).json("Document Not found")
            }
            res.json(docId)
        })
})

app.post('/credits/request',(req, res)=>{
    // Request admin to add credits
    const userId = req.session.userId;
    const { amount } = req.body;

    db.run(
        'INSERT INTO credit_requests (user_id, amount) VALUES (?, ?)',
        [userId, amount],
        function (err) {
            if (err) {
                return res.status(400).json({ error: 'Failed to request credits' });
            }
            res.json({ id: this.lastID });
        }
    );
    
})


app.get('/admin/analytics',(reqc, res)=>{
    db.all(
        'SELECT users.username, COUNT(documents.id) AS scan_count FROM users LEFT JOIN documents ON users.id = documents.user_id GROUP BY users.id',
        (err, rows) => {
          if (err) {
            return res.status(400).json({ error: 'Failed to fetch analytics' });
          }
          res.json(rows);
        }
      );
})


app.listen(PORT , ()=>{
    console.log("Server started " + PORT)
})
