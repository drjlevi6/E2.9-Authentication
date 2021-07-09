const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;
mongoose.connect('mongodb://localhost:27017/myFlix', 
    { useNewURLParser: true, useUnifiedTopology: true }
);

//Add a user
/* We’ll expect JSON in this format
{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  Birthday: Date
}*/
app.post('/users', passport.authenticate('jwt', { session: false }), 
		(req, res) => {
    Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists.');
        } else {
          Users.create({
              Username: req.body.Username,
              Password: req.body.Password,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) =>{
                console.log("user", user);
                res.status(201).json(user)
            })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          })
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });
  
// Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), 
		(req, res) => {
    Users.find()
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });
 
// Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), 
		(req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

// Get all data about a specified movie
app.get('/movies/:name', passport.authenticate('jwt', { session: false }), 
		(req, res) => {
  Movies.findOne({ title:req.params.name }).then(movie => {
      res.json(movie);
  }).catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
})

// Get all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), 
		(req, res) => {
  Movies.find()
    .then((movies) => {
      console.log(movies);
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Get genre of a specific movie
app.get('/movies/genre/:itsTitle', passport.authenticate('jwt', 
		{ session: false }), (req, res) => { 
  Movies.findOne({ title:req.params.itsTitle }).select("genre")
  .then((genre) => {
    res.status(201).json(genre);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// Get info about a genre by its name
app.get('/movies/genre/name/:Name', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  Movies.findOne(
    { 'genre.name': req.params.Name },
    {genre: 1, _id: 0}).then((Genre) => {
      res.status(201).json( Genre );
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err)
    });
  });

// Get info about a director (by their name)
app.get('/movies/director/:Name', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  console.log(req.params);
  Movies.findOne(
    { 'director.name': req.params.Name },
    { director: 1, _id: 0 }).then((itsDirector) => {
      res.status(201).json( itsDirector ); 
    })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err)
  });
});

// Update a user's info, by username
/* We’ll expect JSON in this format
{
  Username: String,
  (required)
  Password: String,
  (required)
  Email: String,
  (required)
  Birthday: Date
}*/
app.put('/users/:Username', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Delete a movie from a user's list of favorites
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  console.log(req.params);
  Users.findOneAndUpdate({ Username:  req.params.Username }, {
    $pull: { FavoriteMovies: req.params.MovieID }
  }, { new: true})
  .then((user) => {
    if (!user) {
      res.status(400).send(req.params.Username + ' was not found');
    } else {
      //res.status(200).send(req.params.Username + ' was deleted.');
      res.json(user);
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  })
});

// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', 
		{ session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

app.listen(8080, () => {
    console.log('Your app is listening on port 8080.');
});
  