var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var Schema = mongoose.Schema;
autoIncrement.initialize(mongoose.connection);

var redSchema = new mongoose.Schema({
  trust: Number,
  trust_context: String,
  happy: Number,
  gender: String,
  age: Number,
  color: String,
  img: String,
  created_at: Date,
  updated_at: Date
});

redSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

redSchema.plugin(autoIncrement.plugin, 'Red');

module.exports = mongoose.model('Red', redSchema);
