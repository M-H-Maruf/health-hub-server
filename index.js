const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
const User = mongoose.model('users', userSchema);

// Mongoose Schema for payments 
const paymentSchema = new mongoose.Schema({
  email: String,
  price: Number,
  transactionId: String,
  date: Date,
  campId: String,
});

// Mongoose Model for payments
const Payment = mongoose.model('payments', paymentSchema);

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

// Mongoose Schema for registered participants
const participantSchema = new mongoose.Schema({
  campId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
  },
  name: String,
  age: Number,
  phone: String,
  gender: String,
  address: String,
  emergencyContact: String,
  healthInfo: String,
  confirmationStatus: String,
  paymentStatus: String,
  userEmail: String,
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

// Mongoose Model for registered participants
const Participant = mongoose.model('registered-participants', participantSchema);

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
  const isExist = await User.findOne(query);
  console.log('User found?----->', isExist);
  if (isExist) return res.send(isExist);
  const result = await User.updateOne(
    query,
    {
      $set: { ...user, timestamp: Date.now() },
    },
    options
  );
  res.send(result);
});

// create new user
app.post('/users', async (req, res) => {
  const userData = req.body;
  console.log(userData);
  try {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.send({ message: 'User already exists', insertedId: null });
    }

    const newUser = new User(userData);
    const result = await newUser.save();

    res.send({ message: 'User created successfully', insertedId: result._id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// get user
app.get('/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await User.findOne({ email });
    res.send(result);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// update user
app.put('/user/:email', async (req, res) => {
  const email = req.params.email;
  const updatedUserData = req.body.UserData;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.displayName = updatedUserData.displayName || user.name;
    user.photoURL = updatedUserData.photoURL || user.photoURL;

    await user.save();

    res.status(200).json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// get all users
app.get('/users', async (req, res) => {
  const result = await User.find();
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

// post registered camp
app.post('/participant', async (req, res) => {
  const { campId, participantData, campData, confirmationStatus,
    paymentStatus } = req.body;
  try {
    const participant = new Participant({
      campId, confirmationStatus: "pending",
      ...participantData, ...campData, paymentStatus: "pending",
    });

    await participant.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving participant data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// get registered camps
app.get('/participant/:email', async (req, res) => {
  const userEmail = req.params.email;

  try {
    const registeredCamps = await Participant.find({ userEmail })

    res.json(registeredCamps);
  } catch (error) {
    console.error('Error fetching registered camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get attended registered camps
app.get('/participant-attended/:email', async (req, res) => {
  const userEmail = req.params.email;
  const paymentStatus = "paid";

  try {
    const registeredCamps = await Participant.find({ userEmail, paymentStatus });

    res.json(registeredCamps);
  } catch (error) {
    console.error('Error fetching registered camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get specific registered camp
app.get('/registered/:id', async (req, res) => {
  const participantId = req.params.id;

  try {
    const registeredCamp = await Participant.findById(participantId);

    if (!registeredCamp) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    res.json(registeredCamp);
  } catch (error) {
    console.error('Error fetching registered camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get upcoming camps
app.get('/upcoming-camps', async (req, res) => {
  try {
    const upcomingCamps = await UpcomingCamp.find();
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

// payment intent
app.post('/create-payment-intent', async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, 'amount inside the intent')

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });
  res.send({
    clientSecret: paymentIntent.client_secret
  })
});

// create payment history and update payment status in db
app.post('/payments', async (req, res) => {
  try {
    const payment = req.body;

    const paymentResult = await Payment.create(payment);

    const participantId = new mongoose.Types.ObjectId(payment.campId); 
    const updateResult = await Participant.updateOne(
      { _id: participantId },
      { $set: { paymentStatus: 'paid' } }
    );

    res.send({ paymentResult, updateResult });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// get all payments
app.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find();

    res.json(payments);
  } catch (error) {
    console.error('Error fetching all camps:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get user specific all payments
app.get('/payments/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const payments = await Payment.find({ email });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).send('Internal Server Error');
  }
});

// server health
app.get('/', (req, res) => {
  res.send('Hello from Health Hub Server..');
});

app.listen(port, () => {
  console.log(`Health Hub is running on port ${port}`);
});
