const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const mongoose = require('mongoose');

const port = process.env.PORT || 5000;

// Pre-installed middlewares
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Custom middlewares
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

// Mongoose connection
mongoose.connect(process.env.DB_URI);

// Mongoose Schema for users 
const userSchema = new mongoose.Schema({
  email: String,
  displayName: String,
  photoURL: String,
  role: String,
  timestamp: { type: Date, default: Date.now },
});

// Mongoose Model for users
const usersModel = mongoose.model('users', userSchema);

// Mongoose Schema for camps
const campSchema = new mongoose.Schema({
  campName: String,
  image: String,
  scheduledDateTime: Date,
  venueLocation: String,
  specializedServices: String,
  healthcareProfessionals: String,
  targetAudience: String,
  campFees: Number,
  peopleAttended: Number,
});

// Mongoose Model for camps
const Camp = mongoose.model('camps', campSchema);

// Mongoose Schema for camps
const upcomingCampSchema = new mongoose.Schema({
  campName: String,
  image: String,
  scheduledDateTime: Date,
  venueLocation: String,
  specializedServices: String,
  healthcareProfessionals: String,
  targetAudience: String,
  campFees: Number,
  peopleAttended: Number,
});

// Mongoose Model for camps
const UpcomingCamp = mongoose.model('upcoming-camps', upcomingCampSchema);

// Mongoose Schema for testimonials
const testimonialSchema = new mongoose.Schema({
  campName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  feedback: { type: String, required: true },
  rating: { type: Number, required: true },
});

// Mongoose Model for testimonials
const Testimonial = mongoose.model('testimonials', testimonialSchema);

// Mongoose Schema for newsletter
const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
});

// Mongoose Model for newsletter
const Newsletter = mongoose.model('newsletters', newsletterSchema);

// Auth related API
app.post('/jwt', async (req, res) => {
  const user = req.body;
  console.log('I need a new jwt', user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d',
  });
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true });
});

// Logout
app.get('/logout', async (req, res) => {
  try {
    res
      .clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true });
    console.log('Logout successful');
  } catch (err) {
    res.status(500).send(err);
  }
});

// Save or modify user email, status in DB
app.put('/users/:email', async (req, res) => {
  const email = req.params.email;
  const user = req.body;
  const query = { email: email };
  const options = { upsert: true };
  const isExist = await usersModel.findOne(query);
  console.log('User found?----->', isExist);
  if (isExist) return res.send(isExist);
  const result = await usersModel.updateOne(
    query,
    {
      $set: { ...user, timestamp: Date.now() },
    },
    options
  );
  res.send(result);
});

// get all users
app.get('/users', async (req, res) => {
  const result = await usersModel.find();
  res.send(result);
});

// get all camps
app.get('/camps', async (req, res) => {
  try {
    const popularCamps = await Camp.find();

    res.json(popularCamps);
  } catch (error) {
    console.error('Error fetching all camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get 6 popular camps
app.get('/popular-camps', async (req, res) => {
  try {
    const popularCamps = await Camp.find()
      .sort({ peopleAttended: -1 })
      .limit(6);

    res.json(popularCamps);
  } catch (error) {
    console.error('Error fetching popular camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get 6 least popular camps
app.get('/least-popular-camps', async (req, res) => {
  try {
    const popularCamps = await Camp.find()
      .sort({ peopleAttended: 1 })
      .limit(6);

    res.json(popularCamps);
  } catch (error) {
    console.error('Error fetching popular camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get a single camp by ID
app.get('/camp-details/:campId', async (req, res) => {
  try {
    const campId = req.params.campId;

    if (!mongoose.Types.ObjectId.isValid(campId)) {
      return res.status(400).send('Invalid campId');
    }

    const camp = await Camp.findById(campId);

    if (!camp) {
      return res.status(404).send('Camp not found');
    }

    res.json(camp);
  } catch (error) {
    console.error('Error fetching camp details:', error);
    res.status(500).send('Internal Server Error');
  }
});


// get upcoming camps
app.get('/upcoming-camps', async (req, res) => {
  try {
    const upcomingCamps = await UpcomingCamp.find();
    console.log('Upcoming Camps:', upcomingCamps);
    res.json(upcomingCamps);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get 4 recent testimonials
app.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ date: -1 }).limit(4);
    res.json(testimonials);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// post in newsletter collection
app.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    const existingSubscriber = await Newsletter.findOne({ email });

    if (existingSubscriber) {
      return res.status(400).json({ error: 'Email Already Subscribed!' });
    }

    const newSubscriber = new Newsletter({ email });
    const result = await newSubscriber.save();

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// server health
app.get('/', (req, res) => {
  res.send('Hello from Health Hub Server..');
});

app.listen(port, () => {
  console.log(`Health Hub is running on port ${port}`);
});
