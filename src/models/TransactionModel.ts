import mongoose from "mongoose";

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    userId: { type: String, required: true },
    status: { type: String },
    amount: { type: Number, required: true },
    transactionType: { type: String, required: true },
    processed: { type: Boolean, required: true },
});

const Transaction = mongoose.model("transaction", transactionSchema);

export default Transaction;