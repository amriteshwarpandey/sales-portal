const mongoose = require('mongoose');

// Atomic sequence generator, used for sequential admin IDs.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(name, start = 1000) {
  // Make sure the counter exists and starts at `start` without racing the increment.
  await this.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
  const counter = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true });
  return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
