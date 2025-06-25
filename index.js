const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');

app.use(express.json());
app.use(bodyParser.urlencoded({extended:false}));

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO)
// .then(console.log("Connected"))
// .catch(err => console.error(err));

const Schema = mongoose.Schema;
//create schema
  //user schema
const userSchema = new Schema({
  username:String
});
const User = mongoose.model('user',userSchema);
  //exercise schema
const exerciseSchema = new Schema({
  //add foreign key
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
    required: true
  },
  description:String,
  duration:Number,
  date:String
});
const Exercise = mongoose.model('exercise',exerciseSchema);

const addUsers = async (username) =>{  
  try{
    const user = await User.create({username});
    return user;
  }
  catch(err){
    console.error(err);
    return null;
  }
}
const checkValidDate = (date) =>{
  try{
    new Date(date);
    return true;
  }catch(err){
    return false;
  }
}

const addExercise = async (id,description,duration,date) =>{
  try{
    //check user
    const user = await User.findById(id);
    if(!user){
      return null;
    }
    //check date
    let newDate;
    if(!date || !checkValidDate(date)){
      newDate = new Date();
    }
    else{
      newDate = new Date(date);
    }
    //create and add exercise into the collection
    const exercise = await Exercise.create({
      userId: user._id,
      date: newDate.toDateString(),
      duration: duration,
      description: description
    });
    //console.log("Exercise added");
    return exercise;
  }
  catch(err){
    console.error(err);
    return null;
  }
}

//EDIT METHODS

app.post('/api/users',async (req,res) =>{

  const { username }= req.body;
  if(username){
    const user = await addUsers(username);
    return res.status(201).json({username:user.username,_id:user._id});
  }

})

app.get('/api/users',async (req,res) =>{

  const users = await User.find({},'username');
  res.status(200).json(users);

})

app.post('/api/users/:_id/exercises', async (req,res) =>{
  try{

    const {_id} = req.params;
    const {description,duration,date} = req.body;
    const user = await User.findById(_id);

    if(!user){
      return res.status(404).json({error:"User not found" });
    }

    const exercise = await addExercise(_id,description,duration,date);
    if(!exercise) return res.status(400).json({error:"Exercise creation failed"});
    
    res.json({
      username: user.username,
      description: exercise.description,
      duration:exercise.duration,
      date:exercise.date,
      _id:user._id
    });

  }
  catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
})

app.get('/api/users/:_id/logs',async (req,res) => {
  try{
    const {_id} = req.params;
    const {from,to,limit} = req.query;
    const user = await User.findById(_id);
    if(!user){
      return res.status(404).json({error:"User not found"});
    }
    let dateFilter = {};
    if(from && !isNaN(Date.parse(from))){
      dateFilter.$gte = new Date(from);
    }
    if(to && !isNaN(Date.parse(to))){
      dateFilter.$lte = new Date(to);
    }
    let query = {userId:_id};
    if(from || to){
      query.date = dateFilter;
    }
    const exercises = await Exercise.find(query,"description duration date -_id").limit(Number(limit) || 0);
    
    const formattedLogs = exercises.map(ex=>({
      description:ex.description,
      duration:ex.duration,
      date:new Date(ex.date).toDateString()
    })); 

    res.status(200).json({
      username: user.username,
      count:formattedLogs.length,
      _id:user._id,
      log: formattedLogs
    })
  }
  catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
})



app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
