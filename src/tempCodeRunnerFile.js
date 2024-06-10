

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