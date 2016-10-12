const mongoose = require('mongoose');

//Create the Schema for the Questions
var questionSchema = new mongoose.Schema({
    question   : String,
	asker: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	forItem: {type: mongoose.Schema.Types.ObjectId, ref: 'Item'},
    comments : [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]
}, { timestamps: true });

//Create the Schema for the Comments
const commentSchema = new mongoose.Schema({
  text: {type: String},
  commenter: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  forQuestion: {type: mongoose.Schema.Types.ObjectId, ref: 'Question'}
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);
const Comment = mongoose.model('Comment', commentSchema);

exports.Question = Question;
exports.Comment = Comment;