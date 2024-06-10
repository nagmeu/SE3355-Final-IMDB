const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true if using HTTPS
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Nagme2122',
    database: 'imdb'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
    } else {
        console.log('MySQL bağlantısı başarılı');
    }
});

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

passport.use(new GoogleStrategy({
    clientID: '549366911753-4etshth6jptf69qk6hkc63ucji6bonhg.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    const { given_name: name, family_name: surname, email } = profile._json;
    const google_id = profile.id;

    db.query('SELECT * FROM google_users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return done(err);
        }
        if (results.length > 0) {
            return done(null, results[0]);
        } else {
            const newUser = { name, surname, email, google_id };
            db.query('INSERT INTO google_users SET ?', newUser, (err, result) => {
                if (err) {
                    return done(err);
                }
                newUser.id = result.insertId;
                return done(null, newUser);
            });
        }
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.query('SELECT * FROM google_users WHERE id = ?', [id], (err, results) => {
        if (err) {
            return done(err);
        }
        done(null, results[0]);
    });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Başarıyla kimlik doğrulandıktan sonra yönlendirilecek sayfa
        const { id, name, surname, email } = req.user; // Google ile giriş yapan kullanıcının bilgileri

        // Kullanıcı bilgilerini mevcut oturum yönetimi sistemine ekleyin
        req.session.user = { id, name, surname, email };

        res.redirect('/');
    }
);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/movies', (req, res) => {
    db.query('SELECT * FROM movies', (err, results) => {
        if (err) {
            console.error('Film verilerini alma hatası:', err);
            res.status(500).json({ error: 'Film verilerini alma hatası' });
        } else {
            res.json(results);
        }
    });
});

app.post('/signin', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (err) {
            console.error('Giriş hatası:', err);
            res.status(500).json({ error: 'Giriş hatası' });
        } else {
            if (results.length > 0) {
                const user = results[0];
                req.session.user = user;
                res.status(200).json({ message: 'Başarıyla giriş yapıldı', user });
                console.log('Signed in as:', user.name); // Kullanıcının adını konsola yazdır
            } else {
                res.status(401).json({ error: 'E-posta veya şifre yanlış' });
            }
        }
    });
});

app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ isLoggedIn: true, user: req.session.user });
    } else {
        res.status(200).json({ isLoggedIn: false });
    }
});

app.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    let category = req.query.category;

    const categoryMap = {
        'All': ['title', 'actors'],
        'Titles': 'title',
        'TV Episodes': 'tv_episodes',
        'Celebs': 'actors',
        'Companies': 'companies',
        'Keywords': 'keywords'
    };

    if (!categoryMap.hasOwnProperty(category)) {
        category = 'All';
    }

    let categoryFields = categoryMap[category];

    if (category === 'All') {
        categoryFields = ['title', 'actors'];
    }

    if (Array.isArray(categoryFields)) {
        const query = `SELECT * FROM movies WHERE ${categoryFields.map(field => `${field} LIKE ?`).join(' OR ')}`;
        db.query(query, categoryFields.map(() => `%${searchTerm}%`), (err, results) => {
            if (err) {
                console.error('Arama hatası:', err);
                res.status(500).json({ error: 'Arama hatası' });
            } else {
                res.json(results);
            }
        });
    } else {
        const categoryField = categoryFields;
        const query = `SELECT * FROM movies WHERE ${categoryField} LIKE ?`;
        db.query(query, [`%${searchTerm}%`], (err, results) => {
            if (err) {
                console.error('Arama hatası:', err);
                res.status(500).json({ error: 'Arama hatası' });
            } else {
                res.json(results);
            }
        });
    }
});

app.post('/rate/:id', (req, res) => {
    const movieId = req.params.id;
    const { rating } = req.body;

    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to be logged in to rate a movie' });
    }

    const userId = req.session.user.id;

    // Determine the user table based on the session data
    const userTable = req.session.user.google_id ? 'google_users' : 'users';

    // Insert the new rating into the database
    db.query(`INSERT INTO ratings (movie_id, user_id, rating) VALUES (?, ?, ?)`, [movieId, userId, rating], (err, result) => {
        if (err) {
            console.error('Failed to submit rating:', err);
            return res.status(500).json({ error: 'Failed to submit rating' });
        }

        console.log('Rating inserted successfully:', result);
        res.status(200).json({ success: true });
    });
});


app.post('/watchlist/:movieId', (req, res) => {
    // Ensure the user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to be logged in to add to watchlist' });
    }

    const userId = req.session.user.id; // Assuming the user ID is stored in req.session.user.id
    const movieId = req.params.movieId;

    // Insert the movie into the user's watchlist
    db.query('INSERT INTO watchlist (user_id, movie_id) VALUES (?, ?)', [userId, movieId], (err, result) => {
        if (err) {
            console.error('Failed to add to watchlist:', err);
            return res.status(500).json({ error: 'Failed to add to watchlist' });
        }

        console.log('Movie added to watchlist successfully:', result);
        res.status(200).json({ success: true });
    });
});


app.get('/movie/:id/comments', (req, res) => {
    const movieId = req.params.id;
    db.query('SELECT * FROM comments WHERE movie_id = ?', [movieId], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            res.status(500).json({ error: 'Error fetching comments' });
        } else {
            res.json(results);
        }
    });
});


// Add a new comment for a specific movie
app.post('/movie/:id/comment', (req, res) => {
    const movieId = req.params.id;
    const { comment } = req.body;

    // Ensure the user is logged in and has a valid session
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to be logged in to add a comment' });
    }

    // Insert the new comment into the database
    db.query('INSERT INTO comments (user_id, movie_id, comment) VALUES (?, ?, ?)', [req.session.user.id, movieId, comment], (err, result) => {
        if (err) {
            console.error('Error adding comment:', err);
            res.status(500).json({ error: 'Error adding comment' });
        } else {
            res.status(200).json({ success: true });
        }
    });
});


app.get('/watchlist', (req, res) => {    // Kullanıcının oturum açmış olup olmadığını kontrol edin
    if (!req.session.user) {
        return res.status(401).json({ error: 'Oturum açmış bir kullanıcı gereklidir' });
    }

    // Kullanıcının ID'sini alın
    const userId = req.session.user.id;

    // Kullanıcının watchlist'ini almak için sorgu yapın
    db.query('SELECT movies.* FROM watchlist JOIN movies ON watchlist.movie_id = movies.id WHERE watchlist.user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Watchlist alınamadı:', err);
            return res.status(500).json({ error: 'Watchlist alınamadı' });
        }

        res.status(200).json(results); // Bu satırı değiştirin
    });
});
app.post('/watchlist/:movieId', (req, res) => {
    // Ensure the user is logged in
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to be logged in to add to watchlist' });
    }

    const userId = req.session.user.id; // Assuming the regular user's ID is stored in req.session.user.id
    const movieId = req.params.movieId;

    // Insert the movie into the user's watchlist
    db.query('INSERT INTO watchlist (user_id, movie_id) VALUES (?, ?)', [userId, movieId], (err, result) => {
        if (err) {
            console.error('Watchlist ekleme hatası:', err);
            return res.status(500).json({ error: 'Watchlist ekleme hatası' });
        }

        console.log('Film watchlist\'e eklendi:', result);
        res.status(200).json({ success: true });
        
    });
});



app.get('/trailer/:id', (req, res) => {
    const movieId = req.params.id;
    db.query('SELECT trailer_url FROM movies WHERE id = ?', [movieId], (err, results) => {
        if (err) {
            console.error('Trailer URL alma hatası:', err);
            res.status(500).json({ error: 'Trailer URL alma hatası' });
        } else {
            if (results.length > 0) {
                res.json({ trailer_url: results[0].trailer_url });
            } else {
                res.status(404).json({ error: 'Trailer URL bulunamadı' });
            }
        }
    });
});

app.get('/movie/:id', (req, res) => {
    const movieId = req.params.id;
    db.query('SELECT * FROM movies WHERE id = ?', [movieId], (err, results) => {
        if (err) {
            console.error('Film detaylarını alma hatası:', err);
            res.status(500).json({ error: 'Film detaylarını alma hatası' });
        } else {
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.status(404).json({ error: 'Film bulunamadı' });
            }
        }
    });
});

app.post('/register', (req, res) => {
    const { name, surname, email, password, country, city } = req.body;
    const newUser = { name, surname, email, password, country, city };

    db.query('INSERT INTO users SET ?', newUser, (err, result) => {
        if (err) {
            console.error('Kullanıcı kaydetme hatası:', err);
            res.status(500).json({ error: 'Kullanıcı kaydetme hatası' });
        } else {
            console.log('Yeni kullanıcı eklendi:', result);
            res.status(200).json({ message: 'Kullanıcı başarıyla kaydedildi' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});